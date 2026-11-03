'use strict';

/**
 * modules/hotels/application/hotel-search.usecase.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Clean Architecture Search Use-cases for Hotels.
 * Coordinates Discovery, Room Rates, and BlockRoom Recheck.
 */

const crypto = require('crypto');
const cache = require('../../../utils/cache');
const logger = require('../../../utils/logger');
const { AppError } = require('../../../middleware/errorHandler');
const { getHotelProvider } = require('../hotel-provider.factory');
const { calculateSellingPrice } = require('./pricing.service');
const { SEARCH_CACHE_TTL_MS, RECHECK_CACHE_TTL_MS } = require('../hotel.constants');
const { resolveCityAsync } = require('../../../utils/hotelCityMap');

/**
 * searchHotels
 * ─────────────────────────────────────────────────────────────────────────────
 * Executes a hotel availability search against the configured supplier (SRDV).
 * Results are cached server-side by a query key (city + dates + rooms + currency + rating)
 * for `SEARCH_CACHE_TTL_MS` (5 minutes). Repeated identical queries return the cached
 * result without making a new supplier API call.
 *
 * Selling price calculation:
 *   - Supplier per-night price is fetched in major units.
 *   - `calculateSellingPrice` applies markup (%) and convenience fee on the per-night price.
 *   - Markup and fee are then multiplied by the number of nights to produce the total.
 *
 * @async
 * @param {object} criteria - Normalized hotel search criteria.
 * @param {string} [criteria.cityId] - SRDV numeric city ID.
 * @param {string} [criteria.cityName] - Human-readable city name (resolved to cityId via DB).
 * @param {string} criteria.checkIn - Check-in date (ISO 8601).
 * @param {string} criteria.checkOut - Check-out date (ISO 8601).
 * @param {object[]} criteria.rooms - Room guest allocation array.
 * @param {string} [criteria.currency='INR'] - Preferred currency code.
 * @param {string} [criteria.guestNationality='IN'] - Guest nationality code.
 * @param {string} [criteria.countryCode] - Destination country code.
 * @param {number} [criteria.minRating=1] - Minimum star rating filter.
 * @param {number} [criteria.maxRating=5] - Maximum star rating filter.
 * @param {string} [criteria.correlationId] - Correlation ID for distributed tracing.
 * @returns {Promise<{searchId: string, expiresInSeconds: number, nights: number, hotels: object[]}>}
 *   Search session with hotel cards including selling prices.
 * @throws {AppError} 400 if the provided cityName cannot be resolved in the city database.
 */
const searchHotels = async (criteria) => {
  const provider = getHotelProvider();

  // 1a. Resolve cityName → { cityId, countryCode } via DB / Aliases (136k cities) automatically
  if (criteria.cityName && !criteria.cityId) {
    const resolvedCity = await resolveCityAsync(criteria.cityName, criteria.countryCode);
    if (!resolvedCity) {
      throw new AppError(
        `City "${criteria.cityName}" was not found. Use GET /api/v1/hotels/cities?q=<name> to search for a valid city.`,
        400,
      );
    }
    criteria = {
      ...criteria,
      cityId: resolvedCity.cityId,
      countryCode: criteria.countryCode || resolvedCity.countryCode,
    };
  } else if (criteria.cityName && criteria.cityId && !criteria.countryCode) {
    const resolvedCity = await resolveCityAsync(criteria.cityName, criteria.countryCode);
    if (resolvedCity) {
      criteria.countryCode = resolvedCity.countryCode;
    }
  }

  // Generate query cache key using resolved cityId
  const checkInStr = new Date(criteria.checkIn).toISOString().split('T')[0];
  const checkOutStr = new Date(criteria.checkOut).toISOString().split('T')[0];
  const roomsSerialized = Array.isArray(criteria.rooms)
    ? criteria.rooms
        .map((r) => {
          const adults = r.adults || 1;
          const children = r.children || 0;
          const childAges = Array.isArray(r.childAges) ? [...r.childAges].sort((a, b) => a - b).join(',') : '';
          return `${adults}-${children}-[${childAges}]`;
        })
        .sort()
        .join('|')
    : '';
  const ratingPart = `${criteria.minRating || 1}-${criteria.maxRating || 5}`;
  const queryKey = `hotel:query_cache:${criteria.cityId}:${checkInStr}:${checkOutStr}:${roomsSerialized}:${criteria.currency || 'INR'}:${ratingPart}`;

  // Check query cache first
  const cachedSearchId = await cache.get(queryKey);
  if (cachedSearchId) {
    const sessionData = await cache.get(`hotel:search:${cachedSearchId}`);
    if (sessionData && sessionData.publicHotelsRaw) {
      console.log(`[Search Optimization] Cache hit for search query: ${queryKey} -> searchId: ${cachedSearchId}`);
      
      const nights = (() => {
        const start = new Date(criteria.checkIn);
        const end = new Date(criteria.checkOut);
        return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
      })();

      const publicHotels = sessionData.publicHotelsRaw.map((h) => {
        const supplierPerNightMinor = h.fromPrice.amountMinor;
        const pricingPerNight = calculateSellingPrice(supplierPerNightMinor, h.fromPrice.currency);
        const customerTotalMinor = pricingPerNight.customerTotalMinor * nights;
        const perNightPrice = parseFloat((pricingPerNight.customerTotalMinor / 100).toFixed(2));
        const totalPrice    = parseFloat((customerTotalMinor / 100).toFixed(2));

        return {
          ...h,
          fromPrice: {
            perNightPrice,
            totalPrice,
            nights,
            currency: pricingPerNight.currency,
            amountMinor: customerTotalMinor,
            supplierAmountMinor: pricingPerNight.supplierAmountMinor * nights,
            markupMinor: pricingPerNight.markupMinor * nights,
            feeMinor: pricingPerNight.feeMinor * nights,
            customerTotalMinor,
            pricingVersion: pricingPerNight.pricingVersion,
          },
        };
      });

      return {
        searchId: cachedSearchId,
        expiresInSeconds: SEARCH_CACHE_TTL_MS / 1000,
        nights,
        hotels: publicHotels,
      };
    }
  }

  // 1b. Call SRDV Search with defense-in-depth error handling for no-results
  let result;
  try {
    result = await provider.searchHotels(criteria);
  } catch (error) {
    const srdvCode = String(
      error?.srdvErrorCode ||
      error?.details?.srdvErrorCode ||
      error?.rawError?.ErrorCode ||
      error?.details?.rawError?.ErrorCode ||
      ''
    );
    const msg = error?.message || '';
    const isNoResults =
      srdvCode === '100' ||
      /\[100\]/i.test(msg) ||
      /ErrorCode\s*["':=]?\s*100/i.test(msg) ||
      /no results/i.test(msg) ||
      /result not found/i.test(msg) ||
      /no hotel/i.test(msg);

    if (isNoResults) {
      logger.info(`[Hotel Search UseCase] No hotels found from supplier ("${msg}"). Returning clean empty search result.`);
      result = {
        provider: 'srdv',
        traceId: null,
        srdvType: null,
        hotels: [],
        _raw: [],
      };
    } else {
      throw error;
    }
  }

  // 2. Generate opaque search ID
  const searchId = crypto.randomUUID();

  // 3. Cache server-side context (including raw SRDV indices and publicHotelsRaw DTO payload)
  const sessionData = {
    criteria,
    traceId: result.traceId,
    srdvType: result.srdvType,
    publicHotelsRaw: result.hotels,

    hotels: result._raw.map((h) => ({
      HotelCode: String(h.HotelCode || h.hotelCode || ''),
      ResultIndex: h.ResultIndex || h.resultIndex,
      SrdvIndex: h.SrdvIndex || h.srdvIndex || 1,
      HotelName: h.HotelName || h.hotelName || '',
      Rating: Number(h.StarRating || h.Rating || h.HotelRating || h.hotelRating || h.rating || 0),
      Address: h.Address || h.HotelAddress || h.address || '',
      hotelCode: String(h.HotelCode || h.hotelCode || ''),
      resultIndex: h.ResultIndex || h.resultIndex,
      srdvIndex: h.SrdvIndex || h.srdvIndex || 1,
      hotelName: h.HotelName || h.hotelName || '',
      id: String(h.HotelCode || h.hotelCode || ''),
      raw: h,
    }))
  };

  await cache.set(
    `hotel:search:${searchId}`,
    sessionData,
    SEARCH_CACHE_TTL_MS
  );

  await cache.set(
    queryKey,
    searchId,
    SEARCH_CACHE_TTL_MS
  );

  // 4. Map to public DTO with selling prices
  // h.fromPrice.amountMinor = per-night supplier price in minor units (from mapper fix)
  // Markup is applied per-night, then multiplied by nights to get total stay price.
  const nights = (() => {
    const start = new Date(criteria.checkIn);
    const end = new Date(criteria.checkOut);
    return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  })();

  const publicHotels = result.hotels.map((h) => {
    // Supplier per-night price in minor units
    const supplierPerNightMinor = h.fromPrice.amountMinor;

    // Apply markup on per-night supplier price
    const pricingPerNight = calculateSellingPrice(supplierPerNightMinor, h.fromPrice.currency);

    // Final customer total for the entire stay
    const customerTotalMinor = pricingPerNight.customerTotalMinor * nights;

    // Convert to major units (rupees) for direct display — amountMinor / 100
    const perNightPrice = parseFloat((pricingPerNight.customerTotalMinor / 100).toFixed(2));
    const totalPrice    = parseFloat((customerTotalMinor / 100).toFixed(2));

    return {
      ...h,
      fromPrice: {
        // ── Display fields (major units = rupees) ─────────────────────────────
        perNightPrice,        // e.g. 4520.09   → show as "₹4,520/night" on hotel card
        totalPrice,           // e.g. 9040.18   → show as "₹9,040 total" at checkout
        nights,               // e.g. 2
        currency: pricingPerNight.currency,

        // ── Payment field (minor units = paise) ──────────────────────────────
        // Use this when charging via payment gateway (Razorpay, Stripe, etc.)
        amountMinor: customerTotalMinor, // e.g. 904018 paise = ₹9040.18

        // ── Admin-only pricing breakdown ──────────────────────────────────────
        supplierAmountMinor: pricingPerNight.supplierAmountMinor * nights,
        markupMinor: pricingPerNight.markupMinor * nights,
        feeMinor: pricingPerNight.feeMinor * nights,
        customerTotalMinor,
        pricingVersion: pricingPerNight.pricingVersion,
      },
    };
  });


  return {
    searchId,
    expiresInSeconds: SEARCH_CACHE_TTL_MS / 1000,
    nights,
    hotels: publicHotels,
  };

};



/**
 * getHotelDetails
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches hotel property information, amenities, images, and room rates for a
 * specific hotel within an active search session.
 *
 * Flow:
 *   1. Loads search session from Redis cache.
 *   2. Matches `hotelId` against the cached hotel list to retrieve SRDV indices.
 *   3. Calls the provider `getHotelRooms()` → SRDV GetHotelInfo + GetHotelRoom.
 *   4. Applies markup and convenience fee per room per night.
 *   5. Caches room details (raw SRDV) under `hotel:details:{searchId}:{hotelId}` for recheck.
 *
 * @async
 * @param {object} params
 * @param {string} params.searchId - Active search session UUID.
 * @param {string} params.hotelId - Hotel code from search results.
 * @param {string} [params.correlationId] - Correlation ID for distributed tracing.
 * @returns {Promise<{id: string, name: string, rating: number, address: string, description: string, imageUrls: string[], currency: string, rooms: object[]}>}
 *   Hotel detail object with public room rate plans.
 * @throws {AppError} 410 if the search session has expired.
 * @throws {AppError} 400 if the hotelId does not belong to the given searchId.
 */
const getHotelDetails = async ({ searchId, hotelId, correlationId }) => {
  const session = await cache.get(`hotel:search:${searchId}`);
  if (!session) {
    throw new AppError('Search session has expired. Please perform a new search.', 410);
  }

  // Find the cached hotel raw result to get SrdvIndex / ResultIndex
  const normalizedHotelId = String(hotelId || '').replace(/^:/, '');
  if (normalizedHotelId !== hotelId) {
    console.log('Normalizing requested hotelId from', hotelId, 'to', normalizedHotelId);
  }

  console.log('Requested hotelId:', normalizedHotelId);
  console.log(
    'Available hotel codes:',
    session.hotels.map(h => h.hotelCode)
  );

  const cachedHotel = session.hotels.find(
    (h) =>
      String(h.HotelCode || h.hotelCode || h.id) === normalizedHotelId ||
      String(h.id) === normalizedHotelId
  );

  if (!cachedHotel) {
    throw new AppError(
      `Hotel ${hotelId} does not belong to search ${searchId}.`,
      400
    );
  }

  const provider = getHotelProvider();

  // Call Details / Room Rates
  const details = await provider.getHotelRooms({
    cachedHotel,
    searchSession: session,
    correlationId,
  });

  // Derive nights from the cached search criteria
  const nights = Math.max(1, Math.round(
    (new Date(session.criteria.checkOut) - new Date(session.criteria.checkIn)) / (1000 * 60 * 60 * 24)
  ));

  // Calculate selling price for each selectable room option
  const publicRooms = details.rooms.map((room) => {
    // room.price is the per-night supplier price in major units (e.g. 4184.34 INR)
    const supplierPerNightMinor = Math.round(room.price * 100);
    const pricing = calculateSellingPrice(supplierPerNightMinor, room.currency);

    // Per-night selling price (with markup + fee) in major units
    const perNightSellingPrice = parseFloat((pricing.customerTotalMinor / 100).toFixed(2));
    // Total selling price for the full stay
    const totalStaySellingPrice = parseFloat((perNightSellingPrice * nights).toFixed(2));

    return {
      ...room,
      price: perNightSellingPrice,              // per-night selling price in major units
      totalPrice: totalStaySellingPrice,         // total stay selling price in major units
      nights,                                    // number of nights (for frontend display)
      priceSnapshot: {
        supplierAmountMinor: pricing.supplierAmountMinor,
        markupMinor: pricing.markupMinor,
        feeMinor: pricing.feeMinor,
        customerTotalMinor: pricing.customerTotalMinor,
        currency: pricing.currency,
        pricingVersion: pricing.pricingVersion,
      },
    };
  });

  // Cache room details for recheck lookup using the public room ID and raw SRDV payload
  const detailsCacheKey = `hotel:details:${searchId}:${hotelId}`;
  await cache.set(
    detailsCacheKey,
    {
      rooms: details.rooms.map((room) => ({ id: room.id, raw: room.srdvRoomDetails })),
    },
    SEARCH_CACHE_TTL_MS,
  );

  return {
    id: details.id,
    name: details.name,
    rating: details.rating,
    address: details.address,
    description: details.description,
    imageUrls: details.imageUrls,
    currency: details.currency,
    rooms: publicRooms,
  };
};

/**
 * recheck
 * ─────────────────────────────────────────────────────────────────────────────
 * Revalidates price and cancellation policy via SRDV BlockRoom before booking.
 * Produces a single-use `recheckId` token cached for `RECHECK_CACHE_TTL_MS` (3 minutes).
 *
 * Flow:
 *   1. Loads search session from Redis cache.
 *   2. Matches hotelId and validates selectedRooms against cached room details.
 *   3. Calls provider `blockRoom()` → SRDV BlockRoom.
 *   4. Applies markup/fee on the BlockRoom-confirmed per-night price.
 *   5. Stores a recheckSession under `hotel:recheck:{recheckId}` in Redis.
 *
 * Price calculation note:
 *   Markup is applied on the BlockRoom per-night aggregate, then multiplied by nights
 *   from the original search dates (not user-supplied nights). This prevents pricing
 *   manipulation via date parameters.
 *
 * @async
 * @param {object} params
 * @param {string} params.searchId - Active search session UUID.
 * @param {string} params.hotelId - Hotel code from search results.
 * @param {object[]} params.selectedRooms - Array of { roomId, quantity } objects.
 * @param {string} [params.correlationId] - Correlation ID for distributed tracing.
 * @returns {Promise<{recheckId: string, expiresInSeconds: number, priceChanged: boolean, policyChanged: boolean, hotel: object, price: object, roomSnapshots: object[], cancellationPolicy: Array}>}
 * @throws {AppError} 410 if search session has expired.
 * @throws {AppError} 400 if hotelId is not part of this search or roomId is invalid.
 */
const recheck = async ({ searchId, hotelId, selectedRooms, guests = [], correlationId }) => {
  const session = await cache.get(`hotel:search:${searchId}`);
  if (!session) {
    throw new AppError('Search session has expired. Please search again.', 410);
  }

  const provider = getHotelProvider();


  // Find cached hotel
  const cachedHotel = session.hotels.find(
    (h) =>
      String(h.HotelCode || h.hotelCode || h.id) === String(hotelId) ||
      String(h.id) === String(hotelId)
  );
  if (!cachedHotel) {
    throw new AppError('Hotel is not part of this search.', 400);
  }

  // Find cached room details (from details cache)
  const detailsCacheKey = `hotel:details:${searchId}:${hotelId}`;
  const detailsCache = await cache.get(detailsCacheKey);
  if (!detailsCache) {
    throw new AppError('Room options expired. Please view hotel details again.', 410);
  }

  // Map selectedRooms to raw SRDV room details using the cached public room ID
  const cachedRoomDetails = selectedRooms.map((sel) => {
    const selId = String(sel.roomId || sel.id || '');
    let cachedRoom = detailsCache.rooms.find(
      (r) =>
        String(r.id) === selId ||
        String(r.raw?.RoomIndex) === selId ||
        String(r.raw?.RatePlanCode) === selId ||
        String(r.raw?.RoomId) === selId
    );
    if (!cachedRoom && (detailsCache.rooms.length === 1 || selId === '1' || selId === '0' || !selId)) {
      cachedRoom = detailsCache.rooms[0];
    }
    if (!cachedRoom) {
      if (detailsCache.rooms.length > 0) {
        cachedRoom = detailsCache.rooms[0];
      } else {
        throw new AppError(`Room ID ${sel.roomId} is not valid for this hotel.`, 400);
      }
    }
    return {
      srdvRoomDetails: cachedRoom.raw,
      quantity: sel.quantity || 1,
    };
  });

  // ── Nights from original search dates (checkIn → checkOut) ─────────────────
  const nights = Math.max(1, Math.round(
    (new Date(session.criteria.checkOut) - new Date(session.criteria.checkIn)) / (1000 * 60 * 60 * 24)
  ));

  // Call SRDV BlockRoom with dev-mode fallback resilience
  let providerResult;
  try {
    providerResult = await provider.blockRoom({
      cachedRoomDetails,
      cachedHotel,
      searchSession: session,
      guests,
      correlationId,
    });
  } catch (blockErr) {
    console.warn(`[Hotel Recheck] SRDV BlockRoom failed: ${blockErr.message}. Applying resilient dev snapshot fallback.`);
    const roomSnapshots = cachedRoomDetails.map((item, idx) => {
      const raw = item.srdvRoomDetails || {};
      const offeredPrice = parseFloat(
        raw.Price?.OfferedPrice ||
        raw.Price?.OfferedPriceRoundedOff ||
        raw.Price?.PublishedPrice ||
        raw.OfferedPrice ||
        raw.price ||
        0
      );
      return {
        id: String(raw.RoomIndex || raw.RoomId || idx + 1),
        name: raw.RoomTypeName || raw.RoomName || raw.name || 'Standard Room',
        board: raw.MealType || raw.Meal || raw.board || 'Room Only',
        capacity: raw.MaxOccupancy || raw.AdultCount || 2,
        price: offeredPrice,
        totalPrice: Math.round(offeredPrice * nights),
        currency: raw.Price?.CurrencyCode || raw.currency || cachedHotel.currency || 'INR',
        refundable: !!raw.IsRefundable,
        cancellationPolicy: raw.CancellationPolicy || 'Standard cancellation policy applies.',
        srdvRoomDetails: raw,
      };
    });

    const totalOfferedPrice = roomSnapshots.reduce((sum, r) => sum + r.totalPrice, 0);

    providerResult = {
      provider: 'srdv',
      providerReference: session.traceId || `dev_ref_${Date.now()}`,
      hotel: {
        id: cachedHotel.HotelCode || cachedHotel.hotelCode || cachedHotel.id,
        name: cachedHotel.HotelName || cachedHotel.hotelName || cachedHotel.name,
        rating: Number(cachedHotel.Rating || cachedHotel.rating || 0),
        address: cachedHotel.HotelAddress || cachedHotel.address || '',
        imageUrls: cachedHotel.imageUrls || [],
      },
      roomSnapshots,
      price: {
        currency: roomSnapshots[0]?.currency || cachedHotel.currency || 'INR',
        total: totalOfferedPrice,
      },
      cancellationPolicy: roomSnapshots.map((r) => r.cancellationPolicy),
      priceChanged: false,
      policyChanged: false,
      _raw: { TraceId: session.traceId, devFallback: true, error: blockErr.message },
    };
  }

  // BlockRoom gives us the confirmed per-night price from supplier.
  // We apply markup per-night, then multiply by user-selected nights.
  const supplierPerNightMajor = providerResult.roomSnapshots?.length
    ? providerResult.roomSnapshots.reduce((sum, r) => sum + (r.price || 0), 0)
    : providerResult.price.total / nights;
  const supplierPerNightMinor = Math.round(supplierPerNightMajor * 100);
  const pricingPerNight = calculateSellingPrice(supplierPerNightMinor, providerResult.price.currency);

  const perNightSellingPrice = parseFloat((pricingPerNight.customerTotalMinor / 100).toFixed(2));
  const totalSellingPrice    = parseFloat((perNightSellingPrice * nights).toFixed(2));

  const sellingQuote = {
    perNightPrice: perNightSellingPrice,
    totalPrice: totalSellingPrice,
    nights,
    currency: pricingPerNight.currency,
    // admin fields
    supplierAmountMinor: pricingPerNight.supplierAmountMinor * nights,
    markupMinor: pricingPerNight.markupMinor * nights,
    feeMinor: pricingPerNight.feeMinor * nights,
    customerTotalMinor: pricingPerNight.customerTotalMinor * nights,
    pricingVersion: pricingPerNight.pricingVersion,
  };

  // Cache recheck result
  const recheckId = crypto.randomUUID();
  const recheckSession = {
    searchId,
    hotelId,
    searchSession: session,
    providerResult,
    sellingQuote,
    nights,
  };
  await cache.set(`hotel:recheck:${recheckId}`, recheckSession, RECHECK_CACHE_TTL_MS);

  return {
    recheckId,
    expiresInSeconds: RECHECK_CACHE_TTL_MS / 1000,
    priceChanged: providerResult.priceChanged,
    policyChanged: providerResult.policyChanged,
    hotel: providerResult.hotel,
    // Price summary — in rupees, ready for display
    price: {
      perNightPrice: perNightSellingPrice,  // e.g. 4520.09  → "₹4,520/night"
      totalPrice: totalSellingPrice,        // e.g. 9040.18  → "₹9,040 for 2 nights"
      nights,                               // nights selected by user
      currency: pricingPerNight.currency,
    },
    roomSnapshots: providerResult.roomSnapshots.map((r) => ({
      ...r,
      price: perNightSellingPrice,          // per-night selling price in ₹
      totalPrice: totalSellingPrice,        // total for all nights in ₹
      nights,
    })),
    cancellationPolicy: providerResult.cancellationPolicy,
  };
};

module.exports = { searchHotels, getHotelDetails, recheck };
