const hotelSearchUseCase = require("./application/hotel-search.usecase");
const hotelBookingUseCase = require("./application/hotel-booking.usecase");
const hotelCancelUseCase = require("./application/hotel-cancel.usecase");
const hotelBookingService = require("./hotel-booking.service");
const { tryAuthenticate } = require("../../middleware/auth");
const { sendSuccess, sendCreated } = require("../../utils/apiResponse");
const {
  searchCities,
  searchCitiesAsync,
  getAllCities,
} = require("../../utils/hotelCityMap");

/**
 * normalizeSearchPayload
 * ─────────────────────────────────────────────────────────────────────────────
 * Converts the simplified user-facing payload into the full internal criteria
 * expected by the hotel search use-case and SRDV mapper.
 *
 * Auto-derives:
 *   countryCode     ← from city map when cityName is supplied
 *   guestNationality← defaults to 'IN' (or derived countryCode)
 *   currency        ← defaults to 'INR'
 *   rooms[]         ← built from top-level adults / children / childAges / numRooms
 *                     (when the caller does not pass a full rooms[] array)
 *
 * @param {object} body - Raw request body from the HTTP request.
 * @param {string} [body.countryCode] - Optional ISO 3166-1 alpha-2 country code.
 * @param {string} [body.cityName] - Human-readable city name (triggers city-map lookup).
 * @param {string} [body.guestNationality] - Defaults to 'IN'.
 * @param {string} [body.currency] - Defaults to 'INR'.
 * @param {object[]} [body.rooms] - Full rooms array; auto-built from shorthand if absent.
 * @param {number} [body.numRooms] - Number of rooms shorthand (default 1).
 * @param {number} [body.adults] - Adults per room shorthand (default 1).
 * @param {number} [body.children] - Children per room shorthand (default 0).
 * @param {number[]} [body.childAges] - Child ages array shorthand.
 * @returns {object} Normalized criteria object ready for the search use-case.
 */
const normalizeSearchPayload = (body) => {
  // ── 1. Resolve countryCode ───────────────────────────────────────────────
  let countryCode = (body.countryCode || "").trim().toUpperCase();
  if (!countryCode && body.cityName) {
    const match = searchCities(body.cityName, 1);
    if (match.length > 0) countryCode = match[0].countryCode;
  }
  // Only default to 'IN' if neither countryCode nor cityName was provided
  if (!countryCode && !body.cityName) {
    countryCode = "IN";
  }

  // ── 2. Guest nationality & currency defaults ─────────────────────────────
  const guestNationality = (body.guestNationality || "IN").trim().toUpperCase();
  const currency = (body.currency || "INR").trim().toUpperCase();

  // ── 3. Build rooms array from shorthand fields ────────────────────────────
  let rooms = body.rooms;
  if (!Array.isArray(rooms) || rooms.length === 0) {
    const numRooms = Math.max(1, parseInt(body.numRooms || 1, 10));
    const adults = Math.max(1, parseInt(body.adults || 1, 10));
    const children = Math.max(0, parseInt(body.children || 0, 10));
    const childAges = Array.isArray(body.childAges) ? body.childAges : [];
    rooms = Array.from({ length: numRooms }, () => ({
      adults,
      children,
      childAges,
    }));
  }

  // Return merged payload — original fields preserved, derived ones added/overridden
  return {
    ...body,
    countryCode,
    guestNationality,
    currency,
    rooms,
  };
};

/**
 * isDeveloperView
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns true when the authenticated user holds admin or super_admin role,
 * enabling the full financial breakdown in API responses.
 *
 * @param {object|null} user - Authenticated user document (or null for unauthenticated requests).
 * @returns {boolean} True if the user should see the developer / admin financial view.
 */
const isDeveloperView = (user) => {
  return user && ["admin", "super_admin"].includes(user.role);
};

/**
 * filterSearchResult
 * ─────────────────────────────────────────────────────────────────────────────
 * Strips internal financial breakdown fields from hotel search results for
 * standard users. Admin/developer tokens receive the full minor-unit breakdown.
 *
 * @param {object} result - Raw search use-case result with hotel cards.
 * @param {boolean} developerView - If true, returns result unmodified.
 * @returns {object} Filtered result with public-facing price fields only.
 */
const filterSearchResult = (result, developerView) => {
  if (developerView) return result;
  return {
    ...result,
    hotels: result.hotels.map((hotel) => ({
      ...hotel,
      fromPrice: {
        // ── Show this on the hotel search card ────────────────────────────────
        perNightPrice: hotel.fromPrice?.perNightPrice, // e.g. 4520.09  → "₹4,520 / night"
        // ── Show this on the checkout / booking summary page ─────────────────
        totalPrice: hotel.fromPrice?.totalPrice, // e.g. 9040.18  → "₹9,040 for 2 nights"
        nights: hotel.fromPrice?.nights, // e.g. 2
        currency: hotel.fromPrice?.currency, // "INR"
      },
    })),
  };
};

/**
 * filterHotelDetailsResult
 * ─────────────────────────────────────────────────────────────────────────────
 * Strips priceSnapshot and srdvRoomDetails from room results for standard users.
 *
 * @param {object} result - Raw hotel details use-case result.
 * @param {boolean} developerView - If true, returns result unmodified.
 * @returns {object} Filtered result suitable for public consumption.
 */
const filterHotelDetailsResult = (result, developerView) => {
  if (developerView) return result;
  return {
    ...result,
    rooms: result.rooms.map(
      ({ priceSnapshot, srdvRoomDetails, ...room }) => room,
    ),
  };
};

/**
 * filterRecheckResult
 * ─────────────────────────────────────────────────────────────────────────────
 * Strips internal financial breakdown and raw SRDV room details from recheck
 * results for standard users.
 *
 * @param {object} result - Raw recheck use-case result.
 * @param {boolean} developerView - If true, returns result unmodified.
 * @returns {object} Filtered recheck result with public price fields only.
 */
const filterRecheckResult = (result, developerView) => {
  if (developerView) return result;

  return {
    ...result,
    hotel: {
      ...result.hotel,
      fromPrice: result.hotel.fromPrice
        ? {
            totalPrice: result.hotel.fromPrice?.totalPrice,
            perNightPrice: result.hotel.fromPrice?.perNightPrice,
            nights: result.hotel.fromPrice?.nights,
            currency: result.hotel.fromPrice?.currency,
          }
        : undefined,
    },
    roomSnapshots: result.roomSnapshots.map(
      ({ priceSnapshot, srdvRoomDetails, ...room }) => room,
    ),
  };
};

/**
 * filterBookingResult
 * ─────────────────────────────────────────────────────────────────────────────
 * Maps the internal `status` enum to a public-facing external status string
 * and returns a clean booking summary DTO for standard users.
 * Admin/developer tokens receive the full Mongoose document.
 *
 * Status mapping:
 *   awaiting_payment      → PAYMENT_PENDING
 *   payment_received      → PAYMENT_RECEIVED
 *   confirming_provider   → CONFIRMING
 *   provider_pending      → CONFIRMING
 *   confirmed             → CONFIRMED
 *   provider_failed       → FAILED
 *   cancelled             → CANCELLED
 *   cancellation_requested→ CANCELLATION_PENDING
 *   payment_failed        → FAILED
 *   refund_pending        → REFUND_PENDING
 *   refunded              → REFUNDED
 *   completed             → COMPLETED
 *
 * @param {object|null} booking - HotelBooking Mongoose document.
 * @param {boolean} developerView - If true, returns booking unmodified.
 * @returns {object|null} Public booking DTO or null.
 */
const filterBookingResult = (booking, developerView) => {
  if (developerView) return booking;
  if (!booking) return null;

  let externalStatus = "PAYMENT_PENDING";
  let paymentStatus = "PENDING";

  switch (booking.status) {
    case "awaiting_payment":
      externalStatus = "PAYMENT_PENDING";
      paymentStatus = "PENDING";
      break;
    case "payment_received":
      externalStatus = "PAYMENT_RECEIVED";
      paymentStatus = "PAID";
      break;
    case "confirming_provider":
    case "provider_pending":
      externalStatus = "CONFIRMING";
      paymentStatus = "PAID";
      break;
    case "confirmed":
      externalStatus = "CONFIRMED";
      paymentStatus = "PAID";
      break;
    case "provider_failed":
      externalStatus = "FAILED";
      paymentStatus = "PAID";
      break;
    case "cancelled":
      externalStatus = "CANCELLED";
      paymentStatus = booking.paymentId ? "REFUNDED" : "PENDING";
      break;
    case "cancellation_requested":
      externalStatus = "CANCELLATION_PENDING";
      paymentStatus = "PAID";
      break;
    case "payment_failed":
      externalStatus = "FAILED";
      paymentStatus = "FAILED";
      break;
    case "refund_pending":
      externalStatus = "REFUND_PENDING";
      paymentStatus = "REFUND_PENDING";
      break;
    case "refunded":
      externalStatus = "REFUNDED";
      paymentStatus = "REFUNDED";
      break;
    case "completed":
      externalStatus = "COMPLETED";
      paymentStatus = "PAID";
      break;
    default:
      externalStatus = booking.status
        ? booking.status.toUpperCase()
        : "UNKNOWN";
      paymentStatus = "UNKNOWN";
  }

  // Calculate expiresInSeconds: based on createdAt, 15 minutes max
  const lifespanSeconds = 900;
  const elapsedSeconds = Math.floor(
    (Date.now() - new Date(booking.createdAt).getTime()) / 1000,
  );
  const expiresInSeconds = Math.max(0, lifespanSeconds - elapsedSeconds);

  const roomName = booking.roomName || booking.roomSnapshots?.[0]?.roomName || booking.roomSnapshots?.[0]?.name || null;
  const voucherRef = booking.providerBookingId || booking.bookingRefNo || booking.confirmationNo || null;

  return {
    id: booking._id.toString(),
    _id: booking._id.toString(),
    hotelName: booking.hotelName,
    destination: booking.destination,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    roomSnapshots: booking.roomSnapshots,
    roomName,
    guests: booking.guests,
    totalPrice: booking.totalPrice || (booking.customerTotalMinor ? booking.customerTotalMinor / 100 : 0),
    currency: booking.currency,
    status: externalStatus,
    rawStatus: booking.status,
    providerBookingId: booking.providerBookingId || null,
    bookingRefNo: booking.bookingRefNo || null,
    confirmationNo: booking.confirmationNo || null,
    voucherStatus: booking.voucherStatus || false,
    voucherRef,
    paymentId: booking.paymentId || null,
    paymentStatus,
    amountMinor: booking.customerTotalMinor,
    expiresInSeconds:
      booking.status === "awaiting_payment" ? expiresInSeconds : 0,
  };
};

/**
 * filterBookingsList
 * ─────────────────────────────────────────────────────────────────────────────
 * Maps an array of HotelBooking documents to public booking summary DTOs.
 *
 * @param {object[]} bookings - Array of HotelBooking Mongoose documents.
 * @param {boolean} developerView - If true, returns bookings unmodified.
 * @returns {object[]} Array of public booking summary objects.
 */
const filterBookingsList = (bookings, developerView) => {
  if (developerView) return bookings;
  if (!Array.isArray(bookings)) return [];
  return bookings.map((booking) => {
    let externalStatus = "PAYMENT_PENDING";
    switch (booking.status) {
      case "awaiting_payment":
        externalStatus = "PAYMENT_PENDING";
        break;
      case "payment_received":
        externalStatus = "PAYMENT_RECEIVED";
        break;
      case "confirming_provider":
      case "provider_pending":
        externalStatus = "CONFIRMING";
        break;
      case "confirmed":
        externalStatus = "CONFIRMED";
        break;
      case "provider_failed":
        externalStatus = "FAILED";
        break;
      case "cancelled":
        externalStatus = "CANCELLED";
        break;
      case "cancellation_requested":
        externalStatus = "CANCELLATION_PENDING";
        break;
      case "payment_failed":
        externalStatus = "FAILED";
        break;
      case "refund_pending":
        externalStatus = "REFUND_PENDING";
        break;
      case "refunded":
        externalStatus = "REFUNDED";
        break;
      case "completed":
        externalStatus = "COMPLETED";
        break;
      default:
        externalStatus = booking.status
          ? booking.status.toUpperCase()
          : "UNKNOWN";
    }

    const roomName = booking.roomName || booking.roomSnapshots?.[0]?.roomName || booking.roomSnapshots?.[0]?.name || null;
    const voucherRef = booking.providerBookingId || booking.bookingRefNo || booking.confirmationNo || null;

    return {
      id: booking._id.toString(),
      _id: booking._id.toString(),
      hotelName: booking.hotelName,
      destination: booking.destination,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      roomSnapshots: booking.roomSnapshots,
      roomName,
      guests: booking.guests,
      totalPrice: booking.totalPrice || (booking.customerTotalMinor ? booking.customerTotalMinor / 100 : 0),
      status: externalStatus,
      rawStatus: booking.status,
      voucherRef,
      providerBookingId: booking.providerBookingId || null,
      bookingRefNo: booking.bookingRefNo || null,
      confirmationNo: booking.confirmationNo || null,
      voucherStatus: booking.voucherStatus || false,
      paymentId: booking.paymentId || null,
      totalAmountMinor: booking.customerTotalMinor,
      currency: booking.currency,
    };
  });
};

/**
 * filterCancelResult
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds a public cancellation result DTO. Queries the HotelRefund collection
 * to compute the penalty (difference between total paid and refund amount).
 *
 * @async
 * @param {object} booking - HotelBooking Mongoose document after cancellation.
 * @param {boolean} developerView - If true, returns booking unmodified.
 * @returns {Promise<object>} Public cancel result with status, reference, and penalty.
 */
const filterCancelResult = async (booking, developerView) => {
  if (developerView) return booking;
  const HotelRefund = require("./domain/hotel-refund.model");
  const refund = await HotelRefund.findOne({ bookingId: booking._id });

  const penalty = refund
    ? (booking.customerTotalMinor - refund.customerAmountMinor) / 100
    : 0;

  return {
    status: "cancelled",
    cancellationReference: booking.cancellationReference || "LOCAL_CANCEL",
    penalty: Math.max(0, penalty),
  };
};

/**
 * searchHotels
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles POST /api/v1/hotels/search.
 * Normalizes the incoming payload, calls the search use-case, and returns
 * role-filtered hotel cards with selling prices.
 *
 * @async
 * @param {import('express').Request} req - Express request (body: search criteria).
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<void>}
 */
const searchHotels = async (req, res) => {
  const correlationId =
    req.correlationId || req.headers["x-correlation-id"] || "";
  const user = await tryAuthenticate(req);
  const developerView = isDeveloperView(user);
  // Normalize simplified payload → full internal criteria before forwarding
  const criteria = normalizeSearchPayload(req.body);
  const result = await hotelSearchUseCase.searchHotels({
    ...criteria,
    correlationId,
  });
  const filtered = filterSearchResult(result, developerView);
  const hasHotels =
    Array.isArray(filtered.hotels) && filtered.hotels.length > 0;
  const message = hasHotels
    ? "Hotels found"
    : `No hotels currently available in ${req.body.cityName || req.body.cityId || "selected city"}. Please try different dates or nearby cities.`;
  return sendSuccess(res, { message, data: filtered });
};

/**
 * debugSearchSession
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles GET /api/v1/hotels/debug/search/:searchId (non-production only).
 * Returns the full raw server-side Redis search session for diagnostics.
 * Returns HTTP 403 in production environments.
 *
 * @async
 * @param {import('express').Request} req - Express request (params.searchId).
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<void>}
 */
const debugSearchSession = async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  const cache = require("../../utils/cache");
  const searchId = req.params.searchId;
  if (!searchId)
    return res
      .status(400)
      .json({ success: false, message: "searchId required" });
  const session = await cache.get(`hotel:search:${searchId}`);
  if (!session)
    return res
      .status(404)
      .json({ success: false, message: "Search session not found" });
  return sendSuccess(res, { message: "Search session", data: session });
};

/**
 * getHotelDetails
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles GET /api/v1/hotels/:hotelId?searchId=.
 * Fetches hotel info and available room rates for a hotel within an active
 * search session. Strips admin-only fields for standard users.
 *
 * @async
 * @param {import('express').Request} req - Express request (params.hotelId, query.searchId).
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<void>}
 */
const getHotelDetails = async (req, res) => {
  const correlationId =
    req.correlationId || req.headers["x-correlation-id"] || "";
  const user = await tryAuthenticate(req);
  const developerView = isDeveloperView(user);
  const result = await hotelSearchUseCase.getHotelDetails({
    searchId: req.query.searchId,
    hotelId: req.params.hotelId,
    correlationId,
  });
  const filtered = filterHotelDetailsResult(result, developerView);
  return sendSuccess(res, { message: "Hotel details", data: filtered });
};

/**
 * recheck
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles POST /api/v1/hotels/recheck.
 * Calls SRDV BlockRoom to revalidate live pricing and cancellation policy,
 * caches a single-use recheckId token (3-minute TTL), and returns the
 * locked price quote.
 *
 * @async
 * @param {import('express').Request} req - Express request (body: searchId, hotelId, selectedRooms).
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<void>}
 */
const recheck = async (req, res) => {
  const correlationId =
    req.correlationId || req.headers["x-correlation-id"] || "";
  const user = await tryAuthenticate(req);
  const developerView = isDeveloperView(user);
  const result = await hotelSearchUseCase.recheck({
    ...req.body,
    correlationId,
  });
  const filtered = filterRecheckResult(result, developerView);
  return sendSuccess(res, { message: "Hotel room rechecked", data: filtered });
};

/**
 * createBooking
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles POST /api/v1/hotels/bookings.
 * Atomically consumes the recheckId token and creates a HotelBooking record
 * in AWAITING_PAYMENT status inside a MongoDB transaction.
 * Requires authentication (Bearer JWT).
 *
 * @async
 * @param {import('express').Request} req - Express request (body: recheckId, guests, acceptChanges).
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<void>}
 * @throws {AppError} 409 if price/policy changed and acceptChanges is falsy.
 * @throws {AppError} 410 if recheckId is expired or already consumed.
 */
const createBooking = async (req, res) => {
  const correlationId =
    req.correlationId || req.headers["x-correlation-id"] || "";
  const idempotencyKey = req.headers["idempotency-key"] || "";

  const result = await hotelBookingUseCase.createBooking({
    userId: req.user._id,
    recheckId: req.body.recheckId,
    guests: req.body.guests,
    acceptChanges: req.body.acceptChanges,
    idempotencyKey,
    correlationId,
  });

  const developerView = isDeveloperView(req.user);
  const filtered = filterBookingResult(result, developerView);
  return sendCreated(res, filtered, "Hotel booking is awaiting payment");
};

/**
 * getMyBookings
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles GET /api/v1/hotels/bookings/me.
 * Returns paginated hotel booking history for the authenticated user.
 *
 * @async
 * @param {import('express').Request} req - Express request (query: page, limit).
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<void>}
 */
const getMyBookings = async (req, res) => {
  const result = await hotelBookingService.listBookings(
    req.user._id,
    req.query,
  );
  const developerView = isDeveloperView(req.user);
  const filtered = filterBookingsList(result.bookings, developerView);
  return sendSuccess(res, {
    message: "Hotel bookings found",
    data: filtered,
    meta: { total: result.total, page: result.page, limit: result.limit },
  });
};

/**
 * getBooking
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles GET /api/v1/hotels/bookings/:id.
 * Returns full details for a single hotel booking belonging to the authenticated user.
 *
 * @async
 * @param {import('express').Request} req - Express request (params.id: MongoDB booking ID).
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<void>}
 * @throws {AppError} 404 if booking not found or belongs to another user.
 */
const getBooking = async (req, res) => {
  const result = await hotelBookingService.getBookingForUser(
    req.params.id,
    req.user._id,
  );
  const developerView = isDeveloperView(req.user);
  const filtered = filterBookingResult(result, developerView);
  return sendSuccess(res, { message: "Hotel booking found", data: filtered });
};

/**
 * cancelBooking
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles POST /api/v1/hotels/bookings/:id/cancel.
 * Initiates the cancellation flow for a confirmed booking:
 * calls SRDV HotelCancel, records the supplier cancellation reference,
 * creates a HotelRefund record if a refund is due, and publishes a
 * REFUND_INITIATED outbox event.
 *
 * @async
 * @param {import('express').Request} req - Express request (params.id: booking ID).
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<void>}
 * @throws {AppError} 404 if booking not found.
 * @throws {AppError} 400 if supplier rejects the cancellation.
 */
const cancelBooking = async (req, res) => {
  const correlationId =
    req.correlationId || req.headers["x-correlation-id"] || "";
  const result = await hotelCancelUseCase.cancelBooking({
    bookingId: req.params.id,
    userId: req.user._id,
    correlationId,
  });
  const developerView = isDeveloperView(req.user);
  const filtered = await filterCancelResult(result, developerView);
  return sendSuccess(res, {
    message: "Hotel cancellation processed",
    data: filtered,
  });
};

/**
 * searchHotelCities
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles GET /api/v1/hotels/cities?q=&countryCode=.
 * Returns up to 20 city suggestions matching the search prefix.
 * Queries the 136k-city MongoDB collection first, falls back to static list.
 *
 * @async
 * @param {import('express').Request} req - Express request (query.q, query.countryCode).
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<void>}
 */
const searchHotelCities = async (req, res) => {
  const query = (req.query.q || "").trim();
  const countryCode =
    (req.query.countryCode || "").trim().toUpperCase() || null;

  if (!query || query.length < 1) {
    return sendSuccess(res, { message: "City suggestions", data: [] });
  }

  // Try DB first (139k cities), falls back to static list automatically
  const suggestions = await searchCitiesAsync(query, 20, countryCode);
  return sendSuccess(res, { message: "City suggestions", data: suggestions });
};

module.exports = {
  searchHotels,
  searchHotelCities,
  getHotelDetails,
  recheck,
  createBooking,
  getMyBookings,
  getBooking,
  cancelBooking,
  debugSearchSession,
  filterBookingResult,
  filterBookingsList,
};
