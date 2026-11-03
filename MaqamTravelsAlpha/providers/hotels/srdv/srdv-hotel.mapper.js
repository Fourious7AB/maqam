'use strict';

/**
 * providers/hotels/srdv/srdv-hotel.mapper.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Request and Response Mappers for SRDV Hotel API v8.
 * Translates between Maqam domain objects and SRDV payload structures.
 */

const { resolveCityId, findCityById } = require('../../../utils/hotelCityMap');
const { AppError } = require('../../../middleware/errorHandler');

const nightsBetween = (checkIn, checkOut) => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
};

const findHotelArray = (response) => {
  if (!response || typeof response !== 'object') return [];

  const tryArray = (value) => (Array.isArray(value) ? value : null);
  const looksLikeHotelArray = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0 || typeof arr[0] !== 'object') return false;
    const first = arr[0];
    return (
      'HotelCode' in first ||
      'HotelName' in first ||
      'ResultIndex' in first ||
      'HotelAddress' in first
    );
  };

  // Try all known SRDV response envelope shapes, including root-level Results[]
  const direct =
    tryArray(response.Results) ||
    tryArray(response.HotelSearchResult?.HotelResults) ||
    tryArray(response.HotelSearchResult?.Hotels) ||
    tryArray(response.HotelSearchResult?.HotelList) ||
    tryArray(response.HotelSearchResult?.HotelResult) ||
    tryArray(response.HotelResults) ||
    tryArray(response.Hotels) ||
    tryArray(response.SearchResult?.HotelResults) ||
    tryArray(response.SearchResult?.Hotels) ||
    tryArray(response.SearchResult?.HotelList) ||
    tryArray(response.SearchResult?.HotelResult);

  if (direct && looksLikeHotelArray(direct)) return direct;

  // Recursive fallback for unknown envelope structures
  const recursiveFind = (obj, depth = 0) => {
    if (!obj || typeof obj !== 'object' || depth > 4) return null;
    for (const value of Object.values(obj)) {
      if (looksLikeHotelArray(value)) return value;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const found = recursiveFind(value, depth + 1);
        if (found) return found;
      }
    }
    return null;
  };
  return recursiveFind(response) || [];
};


module.exports = {
  /**
   * Maps Maqam search criteria to SRDV Search payload.
   * Accepts either criteria.cityId (numeric string) or criteria.cityName (free text).
   * When only cityName is supplied, it is resolved against the internal city map.
   */
  mapSearchRequest: (criteria) => {
    const nights = nightsBetween(criteria.checkIn, criteria.checkOut);

    // ── City ID resolution ────────────────────────────────────────────────────
    let resolvedCityId = criteria.cityId;

    if (!resolvedCityId && criteria.cityName) {
      resolvedCityId = resolveCityId(criteria.cityName);
      if (!resolvedCityId) {
        throw new AppError(
          `City "${criteria.cityName}" was not found in the destination list. ` +
          'Use GET /api/v1/hotels/cities?q=<name> to search for a valid city name.',
          400,
        );
      }
    }

    if (!resolvedCityId) {
      throw new AppError('Either cityId or cityName must be provided.', 400);
    }

    return {
      BookingMode: 5, // Sandbox/Test booking mode
      CheckInDate: new Date(criteria.checkIn).toISOString().split('T')[0],
      CheckOutDate: new Date(criteria.checkOut).toISOString().split('T')[0],
      NoOfNights: nights,
      CountryCode: criteria.countryCode || 'SA',
      CityId: Number(resolvedCityId),
      PreferredCurrency: criteria.currency || 'INR',
      GuestNationality: criteria.guestNationality || 'IN',
      NoOfRooms: criteria.rooms.length,
      RoomGuests: criteria.rooms.map((room) => ({
        NoOfAdults: room.adults,
        NoOfChild: room.children || 0,
        ChildAge: room.childAges || [],
      })),
      MinRating: criteria.minRating || 1,
      MaxRating: criteria.maxRating || 5,
    };
  },

  /**
   * Normalizes SRDV Search response to Maqam public hotel DTO.
   *
   * Price fix: amountMinor here is the PER-NIGHT supplier price in minor units
   * (paise for INR). The nights multiplier is applied later in the use-case
   * display layer so that markup is calculated on the per-night base first.
   */
  mapSearchResponse: (srdvResponse, criteria) => {
    const rawHotels = findHotelArray(srdvResponse);

    const hotels = rawHotels.map((hotel) => {
      // ── Price extraction ────────────────────────────────────────────────────
      // SRDV sends prices in major units (e.g. 366.18 INR).
      // We convert to minor units (paise) here WITHOUT multiplying by nights.
      // The use-case handles nights * markup in the display layer.
      const priceSource = hotel.Price || hotel.MinPrice || {};
      const supplierPriceMajor = parseFloat(
        priceSource.OfferedPrice ||
        priceSource.OfferedPriceRoundedOff ||
        priceSource.PublishedPrice ||
        priceSource.PublishedPriceRoundedOff ||
        priceSource.RoomPrice ||
        hotel.OfferedFare ||
        hotel.MinPrice ||
        0,
      ) || 0;

      // Collect per-room prices from Facilities[] if present (some SRDV variants)
      const facilitiesPrice = Array.isArray(hotel.Facilities)
        ? hotel.Facilities.reduce((sum, f) => sum + (parseFloat(f.RoomPrice) || 0), 0)
        : 0;

      const finalPriceMajor = supplierPriceMajor || facilitiesPrice;
      const currency = priceSource.CurrencyCode || hotel.CurrencyCode || criteria.currency || 'INR';

      // Convert to minor units (paise) — NO nights multiplication here
      const supplierAmountMinor = Math.round(finalPriceMajor * 100);

      // ── Star rating ─────────────────────────────────────────────────────────
      // SRDV uses StarRating (integer 1–5). Rating/HotelRating are fallbacks.
      const rating = Number(
        hotel.StarRating ||
        hotel.HotelStarRating ||
        hotel.Rating ||
        hotel.HotelRating ||
        hotel.HotelCategory?.match(/^(\d)/)?.[1] ||
        0,
      );

      // ── Images ──────────────────────────────────────────────────────────────
      const imageUrls = [];
      if (hotel.HotelPicture) imageUrls.push(hotel.HotelPicture.replace('_b.jpg', '_z.jpg'));
      if (Array.isArray(hotel.Images)) imageUrls.push(...hotel.Images);
      if (Array.isArray(hotel.HotelImages)) imageUrls.push(...hotel.HotelImages.map((img) => img.url || img.Url || img));

      // ── Amenities/Facilities ─────────────────────────────────────────────────
      const amenities = [];
      if (Array.isArray(hotel.Amenities)) amenities.push(...hotel.Amenities);
      if (Array.isArray(hotel.Facilities)) {
        hotel.Facilities.forEach((f) => {
          if (Array.isArray(f.FacilitiesNames)) amenities.push(...f.FacilitiesNames);
        });
      }

      // ── Description ──────────────────────────────────────────────────────────
      // SRDV HotelDescription is often blank in search results.
      // Fall back to building a description from Facilities (e.g. "Facilities: Breakfast 366.18")
      // which mirrors the format returned by the hotel-details endpoint.
      let description = hotel.HotelDescription || hotel.HotelPromotion || hotel.HotelPolicy || '';
      if (!description && Array.isArray(hotel.Facilities) && hotel.Facilities.length > 0) {
        const facilityParts = [];
        hotel.Facilities.forEach((f) => {
          if (Array.isArray(f.FacilitiesNames)) {
            f.FacilitiesNames.forEach((name) => {
              facilityParts.push(name);
            });
          }
        });
        if (facilityParts.length > 0) description = `Facilities: ${facilityParts.join(', ')}`;
      }

      return {
        id: String(hotel.HotelCode || hotel.ResultIndex || ''),
        resultIndex: hotel.ResultIndex || '',
        srdvIndex: hotel.SrdvIndex || 1,
        name: hotel.HotelName || '',
        category: hotel.HotelCategory || '',
        rating,
        description,
        address: hotel.HotelAddress || hotel.Address || '',
        city: hotel.City || '',
        state: hotel.State || '',
        country: hotel.Country || '',
        pinCode: hotel.PinCode || '',
        latitude: hotel.Latitude || null,
        longitude: hotel.Longitude || null,
        contactNo: hotel.HotelContactNo || '',
        mapLink: hotel.HotelMap || '',
        amenities: [...new Set(amenities)],   // deduplicate
        imageUrls,
        fromPrice: {
          // Supplier price per night in minor units — markup applied in use-case
          amountMinor: supplierAmountMinor,
          currency,
        },
        priceDisclosure: {
          includesTaxes: true,
          includesFees: true,
        },
      };
    });

    return {
      provider: 'srdv',
      traceId: srdvResponse.HotelSearchResult?.TraceId || srdvResponse.TraceId,
      srdvType: srdvResponse.HotelSearchResult?.SrdvType || srdvResponse.SrdvType,
      hotels,
      // We retain the raw details for server-side mapping in the cache
      _raw: rawHotels,
    };
  },

  /**
   * Maps Maqam details/room request to SRDV HotelRoom payload
   */
  mapHotelRoomRequest: (cachedHotel, searchSession) => {
    return {
      SrdvType: searchSession.srdvType,
      SrdvIndex: cachedHotel.SrdvIndex || cachedHotel.srdvIndex || 1,
      TraceId: searchSession.traceId,
      ResultIndex: cachedHotel.ResultIndex || cachedHotel.resultIndex,
      HotelCode: cachedHotel.HotelCode || cachedHotel.hotelCode || cachedHotel.id,
      HotelName: cachedHotel.HotelName || cachedHotel.hotelName || cachedHotel.name,
    };
  },

  /**
   * Normalizes SRDV HotelRoom response to Maqam room list DTO.
   * `nights` = number of stay nights (used for totalPrice display only — markup is per-night).
   */
  mapHotelRoomResponse: (srdvResponse, nights) => {
    const hotelRoomsDetails =
      srdvResponse.GetHotelRoomResult?.HotelRoomsDetails ||
      srdvResponse.GetHotelRoomResult?.hotelRoomsDetails ||
      srdvResponse.GetHotelRoomResult ||
      srdvResponse.HotelRoomResult?.HotelRoomsDetails ||
      srdvResponse.HotelRoomResult?.hotelRoomsDetails ||
      srdvResponse.HotelRoomResult ||
      srdvResponse.HotelRoomsDetails ||
      srdvResponse.hotelRoomsDetails ||
      [];

    const rooms = (Array.isArray(hotelRoomsDetails) ? hotelRoomsDetails : [hotelRoomsDetails]).flatMap((category) => {
      const categoryName = category?.CategoryName || category?.RoomTypeName || category?.Category || 'Standard Room';
      const roomsArray = Array.isArray(category?.Rooms)
        ? category.Rooms
        : Array.isArray(category?.Room)
          ? category.Room
          : Array.isArray(category?.RoomList)
            ? category.RoomList
            : [];
      return roomsArray.map((room) => {
        // offeredPrice is the per-night supplier price in major units (e.g. 4184.34 INR)
        const offeredPrice = parseFloat(
          room.Price?.OfferedPrice ||
          room.Price?.OfferedPriceRoundedOff ||
          room.Price?.PublishedPrice ||
          room.OfferedPrice ||
          0,
        );

        // cancellationPolicy: return parsed array when possible, human-readable string otherwise
        let cancellationPolicy;
        if (Array.isArray(room.CancellationPolicies) && room.CancellationPolicies.length > 0) {
          cancellationPolicy = room.CancellationPolicies.map((cp) => ({
            fromDate: cp.FromDate || cp.fromDate || null,
            toDate: cp.ToDate || cp.toDate || null,
            charge: parseFloat(cp.Charge || cp.charge || 0),
            chargeType: cp.ChargeType || cp.chargeType || 1,
            currency: cp.Currency || cp.currency || room.Price?.CurrencyCode || 'INR',
          }));
        } else if (room.CancellationPolicy && typeof room.CancellationPolicy === 'string') {
          cancellationPolicy = room.CancellationPolicy;
        } else {
          cancellationPolicy = 'Standard cancellation policy applies.';
        }

        return {
          id: room.RoomIndex || room.RoomId || `${room.RatePlanCode || room.RatePlan || categoryName}`,
          name: room.RoomTypeName || room.RoomName || categoryName,
          board: room.MealType || room.Meal || 'No meals included',
          capacity: room.MaxOccupancy || room.AdultCount || 2,
          // price = per-night supplier price in major units (markup applied in use-case)
          price: offeredPrice,
          // totalPrice = per-night × nights (before markup — use-case recalculates with markup)
          totalPrice: parseFloat((offeredPrice * nights).toFixed(2)),
          currency: room.Price?.CurrencyCode || 'INR',
          refundable: !!room.IsRefundable,
          cancellationPolicy,
          // Retain SRDV specific details needed for BlockRoom / Book
          srdvRoomDetails: room,
        };
      });
    });

    const rawRooms = rooms.map((room) => room.srdvRoomDetails);

    return {
      rooms,
      _raw: rawRooms,
    };
  },

  /**
   * Maps Maqam recheck request to SRDV BlockRoom payload
   */
  mapBlockRoomRequest: (cachedRoomDetails, cachedHotel, searchSession, guests = []) => {
    let passengers = [];
    if (Array.isArray(guests) && guests.length > 0) {
      passengers = guests.map((g, index) => {
        const pax = {
          Title: g.Title || g.title || 'Mr',
          FirstName: g.FirstName || g.firstName || 'Guest',
          LastName: g.LastName || g.lastName || 'Passenger',
          Phoneno: String(g.Phoneno || g.phone || '9999999999'),
          Email: g.Email || g.email || 'guest@maqam.com',
          PaxType: g.PaxType || (g.type === 'child' ? 2 : 1),
          LeadPassenger: index === 0,
          Age: Number(g.Age || g.age) || (g.type === 'child' ? 10 : 30),
        };
        if (g.PAN || g.pan) pax.PAN = g.PAN || g.pan;
        if (g.PassportNo || g.passportNo) pax.PassportNo = g.PassportNo || g.passportNo;
        return pax;
      });
    }

    if (passengers.length === 0) {
      passengers = [
        {
          Title: 'Mr',
          FirstName: 'Guest',
          LastName: 'Passenger',
          Phoneno: '9999999999',
          Email: 'guest@maqam.com',
          PaxType: 1,
          LeadPassenger: true,
          Age: 30,
        },
      ];
    }

    return {
      SrdvType: searchSession.srdvType,
      SrdvIndex: cachedHotel.SrdvIndex || cachedHotel.srdvIndex || 1,
      TraceId: searchSession.traceId,
      ResultIndex: cachedHotel.ResultIndex || cachedHotel.resultIndex,
      HotelCode: cachedHotel.HotelCode || cachedHotel.hotelCode || cachedHotel.id,
      HotelName: cachedHotel.HotelName || cachedHotel.hotelName || cachedHotel.name,
      GuestNationality: searchSession.criteria?.guestNationality || 'IN',
      NoOfRooms: String(cachedRoomDetails.length),
      ClientReferenceNo: String(Date.now()),
      IsVoucherBooking: true,
      // BlockRoom requires the exact selected rooms array structure with HotelPassenger inside each room
      HotelRoomsDetails: cachedRoomDetails.map((r) => {
        const room =
          (r.srdvRoomDetails?.toObject ? r.srdvRoomDetails.toObject() : r.srdvRoomDetails) ||
          (r.toObject ? r.toObject() : r) ||
          { ...r };
        return {
          ...room,
          HotelPassenger: room.HotelPassenger && room.HotelPassenger.length ? room.HotelPassenger : passengers,
        };
      }),
    };
  },

  /**
   * Normalizes SRDV BlockRoom response to Maqam block/recheck DTO
   */

  mapBlockRoomResponse: (srdvResponse, hotelCard, nights) => {
    const result = srdvResponse.BlockRoomResult || srdvResponse;
    const roomDetails = result.HotelRoomsDetails || [];

    const roomSnapshots = roomDetails.map((room) => {
      const offeredPrice = parseFloat(room.Price?.OfferedPrice || room.OfferedPrice || 0);
      return {
        id: room.RoomIndex || String(room.RoomIndex),
        name: room.RoomTypeName || room.RoomName || 'Standard Room',
        board: room.MealType || room.Meal || 'No meals included',
        capacity: room.MaxOccupancy || 2,
        price: offeredPrice,
        totalPrice: Math.round(offeredPrice * nights),
        currency: room.Price?.CurrencyCode || 'INR',
        refundable: !!room.IsRefundable,
        cancellationPolicy: room.CancellationPolicy || 'Standard cancellation policy applies.',
        srdvRoomDetails: room,
      };
    });

    const totalOfferedPrice = roomSnapshots.reduce((sum, r) => sum + r.totalPrice, 0);

    return {
      provider: 'srdv',
      providerReference: result.BookingRefNo || result.TraceId,
      hotel: hotelCard,
      roomSnapshots,
      price: {
        currency: roomSnapshots[0]?.currency || 'INR',
        total: totalOfferedPrice,
      },
      cancellationPolicy: roomSnapshots.map((r) => r.cancellationPolicy),
      priceChanged: !!result.IsPriceChanged,
      policyChanged: !!result.IsCancellationPolicyChanged,
      _raw: result,
    };
  },

  /**
   * Maps Maqam book request to SRDV Book payload
   */
  mapBookRequest: (bookingDoc, recheckSnapshot = null) => {
    const rawRecheck = recheckSnapshot ? (recheckSnapshot._raw || {}) : {};
    const traceId = bookingDoc.traceId;
    const srdvType = bookingDoc.srdvType;
    const resultIndex = bookingDoc.resultIndex;
    const srdvIndex = bookingDoc.srdvIndex;

    // Convert guests to SRDV Passenger structure
    const passengers = bookingDoc.guests.map((g, index) => {
      const pax = {
        Title: g.title || 'Mr',
        FirstName: g.firstName,
        LastName: g.lastName,
        Phoneno: String(g.phone || bookingDoc.guests[0]?.phone || '0000000000'),
        Email: g.email || bookingDoc.guests[0]?.email || 'guest@maqam.com',
        PaxType: g.type === 'child' ? 2 : 1,
        LeadPassenger: index === 0,
        Age: Number(g.age) || (g.type === 'child' ? 10 : 30),
      };
      if (g.passportNo) pax.PassportNo = g.passportNo;
      if (g.pan) pax.PAN = g.pan;
      return pax;
    });

    const rooms = recheckSnapshot ? recheckSnapshot.roomSnapshots : bookingDoc.roomSnapshots;

    const hotelRoomsDetails = rooms.map((r) => {
      const details = (r.srdvRoomDetails?.toObject ? r.srdvRoomDetails.toObject() : r.srdvRoomDetails) || (r.toObject ? r.toObject() : r) || { ...r };
      return {
        ...details,
        HotelPassenger: passengers,
      };
    });

    return {
      SrdvType: srdvType,
      SrdvIndex: srdvIndex || 1,
      TraceId: String(traceId),
      ResultIndex: resultIndex,
      HotelCode: bookingDoc.srdvHotelId,
      HotelName: bookingDoc.hotelName,
      GuestNationality: bookingDoc.guestNationality || bookingDoc.guests?.[0]?.nationality || 'IN',
      NoOfRooms: String(hotelRoomsDetails.length),
      ClientReferenceNo: bookingDoc._id ? String(bookingDoc._id) : String(Date.now()),
      IsVoucherBooking: true, // Auto-voucher upon success
      HotelRoomsDetails: hotelRoomsDetails,
      HotelPassenger: passengers,
    };
  },

  /**
   * Normalizes SRDV Book response to Maqam book DTO
   */
  mapBookResponse: (srdvResponse) => {
    const result = srdvResponse.BookResult || srdvResponse;

    const rawStatus = String(result.HotelBookingStatus || result.BookingStatus || result.Status || '').toLowerCase();
    const isSuccess =
      rawStatus === 'confirmed' ||
      rawStatus === 'vouchered' ||
      rawStatus === 'booked' ||
      rawStatus === 'success' ||
      result.VoucherStatus === true ||
      result.VoucherStatus === 'true' ||
      Boolean(result.ConfirmationNo && (!result.Error || result.Error.ErrorCode === 0));

    const isPending =
      rawStatus === 'pending' ||
      rawStatus === 'in_progress';

    let status = 'failed';
    if (isSuccess) status = 'confirmed';
    else if (isPending) status = 'pending';

    const ref = result.BookingRefNo || result.ConfirmationNo || null;
    const conf = result.ConfirmationNo || result.BookingRefNo || null;

    return {
      status,
      providerBookingId: result.BookingId ? String(result.BookingId) : (ref ? String(ref).replace(/\D/g, '') || null : null),
      bookingRefNo: ref,
      confirmationNo: conf,
      invoiceNumber: result.InvoiceNumber || null,
      voucherStatus: isSuccess || !!result.VoucherStatus,
      failureReason: result.Error?.ErrorMessage || result.ErrorMessage || null,
      raw: result,
    };
  },

  /**
   * Normalizes SRDV HotelBookingDetail response
   */
  mapBookingDetailResponse: (srdvResponse) => {
    const result = srdvResponse.BookingDetailResult || srdvResponse;

    const rawStatus = String(result.HotelBookingStatus || result.BookingStatus || result.Status || '').toLowerCase();
    const isSuccess =
      rawStatus === 'confirmed' ||
      rawStatus === 'vouchered' ||
      rawStatus === 'booked' ||
      rawStatus === 'success' ||
      result.VoucherStatus === true ||
      result.VoucherStatus === 'true' ||
      Boolean(result.ConfirmationNo && (!result.Error || result.Error.ErrorCode === 0));

    const isFailed =
      rawStatus === 'cancelled' ||
      rawStatus === 'rejected' ||
      rawStatus === 'failed';

    let status = 'pending';
    if (isSuccess) status = 'confirmed';
    else if (isFailed) status = 'failed';

    const ref = result.BookingRefNo || result.ConfirmationNo || null;
    const conf = result.ConfirmationNo || result.BookingRefNo || null;

    return {
      status,
      providerBookingId: result.BookingId ? String(result.BookingId) : (ref ? String(ref).replace(/\D/g, '') || null : null),
      bookingRefNo: ref,
      confirmationNo: conf,
      invoiceNumber: result.InvoiceNumber || null,
      voucherStatus: isSuccess || !!result.VoucherStatus,
      failureReason: result.Error?.ErrorMessage || result.ErrorMessage || null,
      raw: result,
    };
  },

  /**
   * Maps Maqam cancel request to SRDV HotelCancel payload
   */
  mapCancelRequest: (bookingDoc) => {
    return {
      BookingId: Number(bookingDoc.providerBookingId),
      BookingRefNo: bookingDoc.bookingRefNo,
      CancelRequestType: 3, // Full cancellation
    };
  },

  /**
   * Normalizes SRDV HotelCancel response
   */
  mapCancelResponse: (srdvResponse) => {
    const result = srdvResponse.CancelResult || srdvResponse;

    const isCancelled = result.RefundStatus === 'Processed' || result.RefundStatus === 'Refunded' || result.Status === 'Cancelled' || result.CancellationStatus === 'Cancelled';

    return {
      status: isCancelled ? 'cancelled' : 'failed',
      cancellationReference: result.ChangeRequestId || result.CancellationRefNo || null,
      penalty: parseFloat(result.CancellationCharges || result.CancellationCharge || 0),
      raw: result,
    };
  },
};
