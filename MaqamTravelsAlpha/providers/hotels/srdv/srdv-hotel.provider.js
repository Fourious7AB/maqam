// 'use strict';

/**
 * providers/hotels/srdv/srdv-hotel.provider.js
 * ─────────────────────────────────────────────────────────────────────────────
 * SRDV Hotel Provider Adapter.
 * Adapts SRDV Hotel Client/Mapper to the Maqam Hotel Provider Contract.
 */

const client = require('./srdv-hotel.client');
const mapper = require('./srdv-hotel.mapper');
const logger = require('../../../utils/logger');
const {AppError} = require('../../../middleware/errorHandler')


/**
 * nightsBetween
 * ─────────────────────────────────────────────────────────────────────────────
 * Calculates the number of nights between two date strings.
 *
 * @param {string|Date} checkIn - Check-in date.
 * @param {string|Date} checkOut - Check-out date.
 * @returns {number} Number of nights (rounded).
 */
const nightsBetween = (checkIn, checkOut) => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
};

/**
 * stringifyDescription
 * ─────────────────────────────────────────────────────────────────────────────
 * Recursively converts a SRDV description value (string, number, array, or nested object)
 * to a flat string. Handles all SRDV response envelope variants.
 *
 * @param {*} value - Any SRDV field value.
 * @returns {string} Flattened string representation, or empty string.
 */
const stringifyDescription = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return value.map(stringifyDescription).filter(Boolean).join(' ');
  }
  if (typeof value === 'object') {
    const preferredText = [value.Name, value.Title, value.Heading, value.Label].filter(Boolean).join(' ');
    const detailText = stringifyDescription(
      value.Detail || value.Details || value.Description || value.HotelDescription || value.Text || value.Content || value.Value,
    );
    const combined = [preferredText, detailText].filter(Boolean).join(': ');
    if (combined) return combined;
    return Object.values(value).map(stringifyDescription).filter(Boolean).join(' ');
  }
  return '';
};

/**
 * extractHotelDescription
 * ─────────────────────────────────────────────────────────────────────────────
 * Attempts to extract a meaningful description from the SRDV HotelInfo result
 * using a prioritized list of candidate fields. Falls back to facilities text or
 * basic location info if all description fields are absent.
 *
 * @param {object} [infoResult={}] - SRDV GetHotelInfoResult response object.
 * @param {object} [hotelDetails={}] - `HotelDetails` sub-object from infoResult.
 * @param {object} [rawHotel={}] - Raw hotel object from the search cache.
 * @returns {string} Best available description string, or empty string.
 */
const extractHotelDescription = (infoResult = {}, hotelDetails = {}, rawHotel = {}) => {
  const candidates = [
    hotelDetails.Description,
    hotelDetails.HotelDescription,
    infoResult.Description,
    infoResult.HotelDescription,
    hotelDetails.Overview,
    hotelDetails.HotelOverview,
    hotelDetails.Summary,
    hotelDetails.HotelSummary,
    hotelDetails.About,
    hotelDetails.DescriptionText,
    hotelDetails.Details,
    hotelDetails.HotelDetailsDescription,
    hotelDetails.Description1,
    rawHotel.Description,
    rawHotel.HotelDescription,
    rawHotel.Overview,
    rawHotel.Summary,
    rawHotel.About,
  ];

  for (const candidate of candidates) {
    const value = stringifyDescription(candidate);
    if (value) return value;
  }

  const facilities = stringifyDescription(hotelDetails.HotelFacilities || hotelDetails.Facilities || hotelDetails.Amenities || rawHotel.HotelFacilities || rawHotel.Facilities);
  if (facilities) {
    return `Facilities: ${facilities}`;
  }

  const basic = stringifyDescription([
    hotelDetails.Address,
    hotelDetails.City,
    hotelDetails.CountryName,
    hotelDetails.HotelName,
    hotelDetails.HotelURL,
  ]);
  return basic || '';
};

module.exports = {
  /**
   * searchHotels
   * ─────────────────────────────────────────────────────────────────────────────
   * Executes SRDV hotel availability search.
   * Maps Maqam criteria → SRDV Search request, calls client, maps response to public hotel cards.
   * Returns empty result instead of throwing when SRDV signals "no results" (ErrorCode 100).
   *
   * @async
   * @param {object} criteria - Normalized Maqam search criteria (post `normalizeSearchPayload`).
   * @returns {Promise<{ provider: string, traceId: string|null, srdvType: any, hotels: object[], _raw: object[] }>}
   * @throws {AppError} On non-result-related SRDV or network errors.
   */
  searchHotels: async (criteria) => {
    try {
      const payload = mapper.mapSearchRequest(criteria);
      const rawResult = await client.search(payload, criteria.correlationId);
      // Temporary debug: log raw SRDV response to help diagnose empty results
      logger.info(`[SRDV Provider] raw search response: ${JSON.stringify(rawResult)}`);
      const normalized = mapper.mapSearchResponse(rawResult, criteria);
      return normalized;
    } catch (error) {
      // If SRDV returns ErrorCode 100 ("No Results from Super API" / "Result not found")
      // return clean empty result list instead of bubbling an unhandled 502 Bad Gateway to the user.
      const msg = error && error.message ? error.message : '';
      const srdvCode = String(
        error?.srdvErrorCode ||
        error?.details?.srdvErrorCode ||
        error?.rawError?.ErrorCode ||
        error?.details?.rawError?.ErrorCode ||
        ''
      );
      const isNoResults =
        srdvCode === '100' ||
        /error\s*\[100\]/i.test(msg) ||
        /ErrorCode\s*["':=]?\s*100/i.test(msg) ||
        /no results/i.test(msg) ||
        /result not found/i.test(msg) ||
        /no hotel/i.test(msg);

      if (isNoResults) {
        logger.info(`[SRDV Provider] Search returned no results for given segment (ErrorCode 100 / "${msg}"). Returning clean empty list.`);
        return {
          provider: 'srdv',
          traceId: null,
          srdvType: null,
          hotels: [],
          _raw: [],
        };
      }

      logger.error(`[SRDV Provider] searchHotels failed: ${error.message}`);
      throw error;
    }
  },

  /**
   * getHotelDetails
   * ─────────────────────────────────────────────────────────────────────────────
   * Fetches combined hotel info (description, images, address) and room rates from SRDV.
   * Sequential calls: GetHotelInfo first, then GetHotelRoom.
   * Returns partial data with empty strings/arrays when info fields are missing.
   *
   * @async
   * @param {object} params
   * @param {object} params.cachedHotel - Hotel entry from search session cache.
   * @param {object} params.searchSession - Full search session from Redis.
   * @param {string} [params.correlationId] - Correlation ID for tracing.
   * @returns {Promise<{ id, name, rating, address, description, imageUrls, currency, rooms, _rawRooms }>}
   * @throws {AppError} 502 if SRDV hotel info returns a non-zero error code.
   */


  getHotelDetails: async (params) => {
    try {
      const { cachedHotel, searchSession, correlationId } = params;
      const nights = nightsBetween(searchSession.criteria.checkIn, searchSession.criteria.checkOut);


      // Fetch hotel info first, as SRDV requires hotel details before room details.
      let info = { description: '', images: [], address: cachedHotel.HotelAddress || cachedHotel.address || '' };
      const infoPayload = {
        SrdvType: searchSession.srdvType,
        SrdvIndex: cachedHotel.SrdvIndex || cachedHotel.srdvIndex || 1,
        TraceId: searchSession.traceId,
        ResultIndex: cachedHotel.ResultIndex || cachedHotel.resultIndex,
        HotelCode: cachedHotel.HotelCode || cachedHotel.hotelCode || cachedHotel.id,
      };

      const rawInfo = await client.hotelInfo(infoPayload, correlationId);
      const infoResult = rawInfo.GetHotelInfoResult || rawInfo.HotelInfoResult || rawInfo;
      if (infoResult?.Error && infoResult.Error.ErrorCode !== 0) {
        logger.error(`[SRDV Provider] hotelInfo failed: ${JSON.stringify(infoResult.Error)}`);
        throw new AppError(`SRDV Hotel API error: ${infoResult.Error.ErrorMessage || JSON.stringify(infoResult.Error)}`, 502);
      }
      if (infoResult) {
        const rawHotel = cachedHotel.raw || {};
        const hotelDetails = infoResult.HotelDetails || {};
        info.description = extractHotelDescription(infoResult, hotelDetails, rawHotel) || info.description;

        info.address =
          infoResult.Address ||
          hotelDetails.Address ||
          hotelDetails.AddressLine1 ||
          [hotelDetails.City, hotelDetails.CountryName].filter(Boolean).join(', ') ||
          info.address;

        info.images =
          infoResult.Images ||
          infoResult.HotelDetails?.Images ||
          (infoResult.HotelDetails?.HotelPicture ? ([]).concat(infoResult.HotelDetails.HotelPicture) : []) ||
          info.images;

        // Debug log when key fields are still missing to aid diagnosis in production
        if (!info.description || !info.address || !info.images.length) {
          logger.info(`[SRDV Provider] hotelInfo partial/missing fields for HotelCode=${infoPayload.HotelCode} trace=${infoPayload.TraceId} — descriptionPresent=${!!info.description} addressPresent=${!!info.address} images=${info.images.length}`);
          try {
            logger.debug(`[SRDV Provider] rawInfo snippet: ${JSON.stringify({ HotelDetails: infoResult.HotelDetails || null, Address: infoResult.Address || null, Images: infoResult.Images || null }, null, 2)}`);
          } catch (e) {
            logger.debug('[SRDV Provider] rawInfo snippet unavailable for logging');
          }
        }
      }

      // Fetch rates & rooms after hotel info succeeds.
      const roomPayload = mapper.mapHotelRoomRequest(cachedHotel, searchSession);
      const rawRooms = await client.hotelRoom(roomPayload, correlationId);
      const normalizedRooms = mapper.mapHotelRoomResponse(rawRooms, nights);

      // If no rooms were mapped, log the raw response to help debug missing room data
      if (!normalizedRooms.rooms || normalizedRooms.rooms.length === 0) {
        logger.info(`[SRDV Provider] No rooms returned for HotelCode=${infoPayload.HotelCode} (searchId=${searchSession?.criteria?.searchId || 'n/a'})`);
        try {
          logger.debug(`[SRDV Provider] rawRooms for HotelCode=${infoPayload.HotelCode}: ${JSON.stringify(rawRooms)}`);
        } catch (e) {
          logger.debug('[SRDV Provider] rawRooms unavailable for logging');
        }
      }

      const rawHotel = cachedHotel.raw || {};
      const hotelDetails = infoResult?.HotelDetails || {};
      const descriptionFallback = extractHotelDescription(infoResult, hotelDetails, rawHotel);

      return {
        id: cachedHotel.HotelCode || cachedHotel.id,
        name: cachedHotel.HotelName || cachedHotel.name,
        rating: Number(
          infoResult?.HotelRating ||
          infoResult?.Rating ||
          hotelDetails.StarRating ||
          hotelDetails.Rating ||
          cachedHotel.Rating ||
          cachedHotel.rating ||
          0
        ),
        address: info.address || rawHotel.Address || rawHotel.HotelAddress || rawHotel.address || cachedHotel.Address || cachedHotel.HotelAddress || cachedHotel.address || '',
        description: info.description || stringifyDescription(descriptionFallback) || '',
        imageUrls: info.images.length ? info.images : (cachedHotel.imageUrls || []),
        currency: cachedHotel.currency || 'INR',
        rooms: normalizedRooms.rooms,
        _rawRooms: normalizedRooms._raw,
      };
    } catch (error) {
      logger.error(`[SRDV Provider] getHotelDetails failed: ${error.message}`);
      throw error;
    }
  },

  /**
   * getHotelRooms
   * ─────────────────────────────────────────────────────────────────────────────
   * Alias for `getHotelDetails`. Unified room rates + info display.
   * Called by the search use-case hotel details flow.
   *
   * @async
   * @param {object} params - Same as `getHotelDetails` params.
   * @returns {Promise<object>} Same as `getHotelDetails` result.
   */
  getHotelRooms: async (params) => {
    return module.exports.getHotelDetails(params);
  },

  /**
   * blockRoom
   * ─────────────────────────────────────────────────────────────────────────────
   * Performs SRDV BlockRoom to lock a rate and validate cancellation policy.
   * Also attempts a supplementary GetHotelInfo call to enrich the hotel card
   * with fresh description/images/address (failure is non-fatal, logged as info).
   *
   * @async
   * @param {object} params
   * @param {object[]} params.cachedRoomDetails - Selected rooms with raw SRDV details.
   * @param {object} params.cachedHotel - Hotel entry from search session cache.
   * @param {object} params.searchSession - Full search session from Redis.
   * @param {string} [params.correlationId] - Correlation ID for tracing.
   * @returns {Promise<{ provider, providerReference, hotel, roomSnapshots, price, cancellationPolicy, priceChanged, policyChanged, _raw }>}
   * @throws {AppError} On SRDV BlockRoom failure.
   */
  blockRoom: async (params) => {
    try {
      const { cachedRoomDetails, cachedHotel, searchSession, guests, correlationId } = params;
      const nights = nightsBetween(searchSession.criteria.checkIn, searchSession.criteria.checkOut);

      const payload = mapper.mapBlockRoomRequest(cachedRoomDetails, cachedHotel, searchSession, guests);
      const rawResult = await client.blockRoom(payload, correlationId);

      // Enrich hotelCard with latest supplier info (hotel description/address/rating/images)
      const hotelCard = {
        id: cachedHotel.HotelCode || cachedHotel.id,
        name: cachedHotel.HotelName || cachedHotel.name,
        rating: Number(cachedHotel.Rating || cachedHotel.rating || 0),
        address: cachedHotel.HotelAddress || cachedHotel.address || '',
      };

      try {
        const infoPayload = {
          SrdvType: searchSession.srdvType,
          SrdvIndex: cachedHotel.SrdvIndex || cachedHotel.srdvIndex || 1,
          TraceId: searchSession.traceId,
          ResultIndex: cachedHotel.ResultIndex || cachedHotel.resultIndex,
          HotelCode: cachedHotel.HotelCode || cachedHotel.hotelCode || cachedHotel.id,
        };
        const rawInfo = await client.hotelInfo(infoPayload, correlationId);
        const infoResult = rawInfo.GetHotelInfoResult || rawInfo.HotelInfoResult || rawInfo;
        if (infoResult && !(infoResult?.Error && infoResult.Error.ErrorCode !== 0)) {
          const hotelDetails = infoResult.HotelDetails || {};
          const rawDescription = hotelDetails.Description || hotelDetails.HotelDescription || infoResult.Description || infoResult.HotelDescription;
          const description = stringifyDescription(rawDescription);
          const address = infoResult.Address || hotelDetails.Address || hotelDetails.AddressLine1 || [hotelDetails.City, hotelDetails.CountryName].filter(Boolean).join(', ');
          const images = infoResult.Images || hotelDetails.Images || (hotelDetails.HotelPicture ? ([]).concat(hotelDetails.HotelPicture) : []);
          const rating = Number(infoResult.HotelRating || infoResult.Rating || hotelDetails.StarRating || hotelDetails.Rating || hotelCard.rating || 0);

          hotelCard.description = description || hotelCard.description;
          hotelCard.address = address || hotelCard.address;
          hotelCard.imageUrls = images.length ? images : (cachedHotel.imageUrls || []);
          hotelCard.rating = rating;

          // attempt to set a fromPrice if available in cached raw hotel
          const rawHotel = cachedHotel.raw || {};
          const minPriceMajor = parseFloat(
            rawHotel.MinPrice?.OfferedPrice || rawHotel.Price?.OfferedPrice || rawHotel.OfferedPrice || rawHotel.MinPrice || rawHotel.Price || 0,
          ) || 0;
          if (minPriceMajor > 0) {
            hotelCard.fromPrice = { amountMinor: Math.round(minPriceMajor * 100), currency: rawHotel.CurrencyCode || cachedHotel.currency || 'INR' };
          }
        }
      } catch (e) {
        logger.info(`[SRDV Provider] hotelInfo enrichment failed during blockRoom for ${cachedHotel?.HotelCode || cachedHotel?.id}: ${e.message}`);
      }

      const normalized = mapper.mapBlockRoomResponse(rawResult, hotelCard, nights);
      return normalized;
    } catch (error) {
      logger.error(`[SRDV Provider] blockRoom failed: ${error.message}`);
      throw error;
    }
  },

  /**
   * book
   * ─────────────────────────────────────────────────────────────────────────────
   * Submits the booking to SRDV and confirms the reservation.
   * Includes automatic Trace ID refresh: if SRDV rejects with 'Invalid Trace ID',
   * automatically re-runs BlockRoom to get a fresh TraceId and retries the Book call.
   *
   * @async
   * @param {object} params
   * @param {object} params.booking - HotelBooking document (as plain object).
   * @param {object|null} [params.recheckSnapshot] - Optional recheck raw snapshot for room details.
   * @param {string} [params.correlationId] - Correlation ID for tracing.
   * @returns {Promise<{ status: 'confirmed'|'pending'|'failed', providerBookingId, bookingRefNo, confirmationNo, invoiceNumber, voucherStatus, failureReason, raw }>}
   * @throws {AppError} On unrecoverable SRDV booking error.
   */
  book: async (params) => {
    try {
      const { booking, recheckSnapshot, correlationId } = params;
      const payload = mapper.mapBookRequest(booking, recheckSnapshot);
      let rawResult;
      try {
        rawResult = await client.book(payload, correlationId);
      } catch (bookErr) {
        const errMsg = String(bookErr.message || '');
        const isDuplicateError =
          /duplicate\s+booking/i.test(errMsg) ||
          bookErr.details?.srdvErrorCode === '2' ||
          bookErr.details?.rawError?.ErrorCode === 2 ||
          bookErr.details?.rawError?.ErrorCode === '2';

        if (isDuplicateError) {
          const match =
            /duplicate booking of\s+([A-Za-z0-9_-]+)/i.exec(errMsg) ||
            /(TJS\d+)/i.exec(errMsg) ||
            /(TJS\d+)/i.exec(JSON.stringify(bookErr.details || {}));
          const dupRef = match ? match[1] : (payload.ClientReferenceNo || 'DUP-' + Date.now());
          const numericId = dupRef.replace(/\D/g, '') || dupRef;
          logger.warn(
            `[SRDV Provider] Duplicate hotel booking reported by supplier: ${dupRef}. Auto-reconciling reservation as confirmed.`,
            { correlationId }
          );
          return {
            status: 'confirmed',
            providerBookingId: String(numericId),
            bookingRefNo: String(dupRef),
            confirmationNo: String(dupRef),
            invoiceNumber: '',
            voucherStatus: true,
            failureReason: null,
            raw: { duplicateReconciled: true, bookingRefNo: dupRef, bookingId: numericId },
          };
        }

        const isTraceError = errMsg.includes('Invalid Trace ID') || errMsg.includes('Trace ID') || errMsg.includes('400');
        if (isTraceError) {
          logger.warn(`[SRDV Provider] Trace ID expired for Hotel=${payload.HotelCode}. Attempting automatic trace refresh via BlockRoom...`, { correlationId });
          const blockPayload = {
            SrdvType: payload.SrdvType,
            SrdvIndex: payload.SrdvIndex,
            TraceId: payload.TraceId,
            ResultIndex: payload.ResultIndex,
            HotelCode: payload.HotelCode,
            HotelName: payload.HotelName,
            GuestNationality: payload.GuestNationality,
            NoOfRooms: payload.NoOfRooms,
            ClientReferenceNo: payload.ClientReferenceNo,
            IsVoucherBooking: true,
            HotelRoomsDetails: payload.HotelRoomsDetails,
          };
          const freshBlock = await client.blockRoom(blockPayload, correlationId);
          const freshBlockResult = freshBlock.BlockRoomResult || freshBlock;
          const freshTraceId = freshBlockResult.TraceId || freshBlockResult.BookingRefNo;
          if (freshTraceId) {
            logger.info(`[SRDV Provider] Trace session refreshed to TraceId=${freshTraceId}. Retrying SRDV /Book...`, { correlationId });
            payload.TraceId = String(freshTraceId);
            if (freshBlockResult.ResultIndex) payload.ResultIndex = freshBlockResult.ResultIndex;
            rawResult = await client.book(payload, correlationId);
          } else {
            throw bookErr;
          }
        } else {
          throw bookErr;
        }
      }
      const normalized = mapper.mapBookResponse(rawResult);
      return normalized;
    } catch (error) {
      logger.error(`[SRDV Provider] book failed: ${error.message}`);
      throw error;
    }
  },

  /**
   * getBookingStatus
   * ─────────────────────────────────────────────────────────────────────────────
   * Polls SRDV HotelBookingDetail to check the status of a pending reservation.
   * Called by the `hotel-poll-status` BullMQ worker at progressive backoff intervals.
   *
   * @async
   * @param {object} params
   * @param {string} params.providerBookingId - Numeric SRDV BookingId as string.
   * @param {string} params.bookingRefNo - SRDV BookingRefNo from the original Book response.
   * @param {string} [params.correlationId] - Correlation ID for tracing.
   * @returns {Promise<{ status: 'confirmed'|'pending'|'failed', providerBookingId, bookingRefNo, confirmationNo, invoiceNumber, voucherStatus, failureReason, raw }>}
   * @throws {AppError} On SRDV API error.
   */
  getBookingStatus: async (params) => {
    try {
      const { providerBookingId, bookingRefNo, correlationId } = params;
      const payload = {
        BookingId: Number(providerBookingId),
        BookingRefNo: bookingRefNo,
      };
      const rawResult = await client.hotelBookingDetail(payload, correlationId);
      const normalized = mapper.mapBookingDetailResponse(rawResult);
      return normalized;
    } catch (error) {
      logger.error(`[SRDV Provider] getBookingStatus failed: ${error.message}`);
      throw error;
    }
  },

  /**
   * cancelBooking
   * ─────────────────────────────────────────────────────────────────────────────
   * Submits a full cancellation request to SRDV HotelCancel.
   *
   * @async
   * @param {object} params
   * @param {object} params.booking - HotelBooking document (as plain object).
   * @param {string} [params.correlationId] - Correlation ID for tracing.
   * @returns {Promise<{ status: 'cancelled'|'failed', cancellationReference: string|null, penalty: number, raw: object }>}
   * @throws {AppError} On SRDV API error.
   */
  cancelBooking: async (params) => {
    try {
      const { booking, correlationId } = params;
      const payload = mapper.mapCancelRequest(booking);
      const rawResult = await client.hotelCancel(payload, correlationId);
      const normalized = mapper.mapCancelResponse(rawResult);
      return normalized;
    } catch (error) {
      logger.error(`[SRDV Provider] cancelBooking failed: ${error.message}`);
      throw error;
    }
  },
};
