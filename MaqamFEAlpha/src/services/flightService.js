import api from "../components/stores/api.js";
import { FlightAPI } from "../configs/api.js";
import { getAuthHeaders } from "../admin/services/tokenService.js";
import paymentService from "./paymentService.js";

/**
 * Service for interacting with SRDV Flights API endpoints and Flight Bookings.
 * Authenticated endpoints pass Bearer token via the Axios interceptor.
 */
export const flightService = {
  /**
   * Search available flights
   * POST /api/v1/flights/search
   * @param {Object} searchPayload - { origin, destination, departureDate, returnDate, passengers, journeyType }
   * @returns {Promise<Object>} { traceId, results, ... }
   */
  async searchFlights(searchPayload) {
    const response = await api.post(FlightAPI.FlightSearchApi, searchPayload);
    return response?.data?.data || response?.data;
  },

  /**
   * Lowest fares across the month
   * POST /api/v1/flights/calendar-fare
   * @param {Object} payload - { origin, destination, departDate, journeyType }
   * @returns {Promise<Object>}
   */
  async getCalendarFare(payload) {
    const response = await api.post(FlightAPI.FlightCalendarFareApi, payload);
    return response?.data?.data || response?.data;
  },

  /**
   * Revalidate price & lock fare rules
   * POST /api/v1/flights/farequote
   * @param {Object} payload - { traceId, resultIndex }
   * @returns {Promise<Object>} { isLCC, isGstMandatory, isPassportMandatory, fareBreakdown, ... }
   */
  async getFareQuote({ traceId, resultIndex }) {
    if (!traceId || !resultIndex) {
      throw new Error("traceId and resultIndex are required for fare quote verification.");
    }
    const response = await api.post(FlightAPI.FlightFareQuoteApi, {
      traceId: String(traceId).trim(),
      resultIndex: String(resultIndex).trim(),
    });
    return response?.data?.data || response?.data;
  },

  /**
   * Get baggage & meals options (SSR)
   * POST /api/v1/flights/ssr
   * @param {Object} payload - { traceId, resultIndex }
   * @returns {Promise<Object>} { meals: [...], baggage: [...] }
   */
  async getSSR({ traceId, resultIndex }) {
    try {
      const response = await api.post(FlightAPI.FlightSsrApi, {
        traceId: String(traceId).trim(),
        resultIndex: String(resultIndex).trim(),
      });
      return response?.data?.data || response?.data;
    } catch (err) {
      console.warn("Flight SSR notice:", err?.response?.data?.message || err?.message);
      return { baggage: [], meals: [], standardMeals: [], isAvailable: false };
    }
  },

  /**
   * Get 2D aircraft seat map
   * POST /api/v1/flights/seatmap
   * @param {Object} payload - { traceId, resultIndex }
   * @returns {Promise<Object>} { seatLayout: [...] }
   */
  async getSeatMap({ traceId, resultIndex }) {
    try {
      const response = await api.post(FlightAPI.FlightSeatMapApi, {
        traceId: String(traceId).trim(),
        resultIndex: String(resultIndex).trim(),
      });
      return response?.data?.data || response?.data;
    } catch (err) {
      console.warn("Flight seat map notice:", err?.response?.data?.message || err?.message);
      return { seatLayout: [], segments: [], isAvailable: false };
    }
  },

  /**
   * Create flight booking & hold PNR
   * POST /api/v1/flights/book
   * @param {Object} bookingPayload - { traceId, resultIndex, passengers, gstDetails }
   * @param {string} [idempotencyKey]
   * @returns {Promise<Object>} { bookingId, pnr, totalAmount, status }
   */
  async bookFlight(bookingPayload, idempotencyKey) {
    const key = idempotencyKey || `flt_bk_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const payload = {
      ...(bookingPayload || {}),
      idempotencyKey: key,
    };
    let response;
    try {
      response = await api.post(FlightAPI.FlightBookApi, payload, {
        headers: getAuthHeaders(),
      });
    } catch (err) {
      if (err?.response?.status === 404 || err?.response?.status === 405) {
        response = await api.post("/api/v1/flights/bookings", payload, {
          headers: getAuthHeaders(),
        });
      } else {
        throw err;
      }
    }

    const raw = response?.data?.data || response?.data || {};
    const bookingId =
      raw.bookingId ||
      raw._id ||
      raw.id ||
      raw.data?.bookingId ||
      raw.data?._id ||
      response?.data?.bookingId;

    return {
      ...raw,
      bookingId,
      _id: bookingId,
      id: bookingId,
    };
  },

  /**
   * List authenticated user's flight bookings
   * GET /api/v1/flights/bookings
   * @param {Object} [params] - { page, limit, status }
   * @returns {Promise<Array>} List of flight booking objects
   */
  async getMyFlightBookings(params = {}) {
    try {
      const response = await api.get(FlightAPI.FlightBookingsApi, {
        params,
        headers: getAuthHeaders(),
      });
      const raw = response?.data;
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.data)) return raw.data;
      if (Array.isArray(raw?.bookings)) return raw.bookings;
      if (Array.isArray(raw?.data?.bookings)) return raw.data.bookings;
      return [];
    } catch (err) {
      if (err?.response?.status === 404) return [];
      console.warn("Failed to fetch flight bookings:", err?.message || err);
      return [];
    }
  },

  /**
   * Get full details of a single flight booking
   * GET /api/v1/flights/bookings/:bookingId
   * @param {string} bookingId
   * @returns {Promise<Object>} Full flight booking record with e-tickets
   */
  async getFlightBookingById(bookingId) {
    if (!bookingId) throw new Error("bookingId is required");
    const response = await api.get(FlightAPI.FlightBookingDetailApi(bookingId), {
      headers: getAuthHeaders(),
    });
    return response?.data?.data || response?.data;
  },

  /**
   * Check airline cancellation fee / penalty
   * GET /api/v1/flights/bookings/:bookingId/cancellation-charges?requestType=1
   * @param {string} bookingId
   * @param {number|string} [requestType=1] - 1=Full cancellation, 2=Partial
   * @returns {Promise<Object>}
   */
  async getCancellationCharges(bookingId, requestType = 1) {
    const response = await api.get(FlightAPI.FlightCancellationChargesApi(bookingId), {
      params: { requestType },
      headers: getAuthHeaders(),
    });
    return response?.data?.data || response?.data;
  },

  /**
   * Submit change/cancel request
   * POST /api/v1/flights/bookings/:bookingId/change-request
   * @param {string} bookingId
   * @param {Object} payload - { requestType, remarks }
   * @returns {Promise<Object>}
   */
  async submitChangeRequest(bookingId, payload) {
    const response = await api.post(FlightAPI.FlightChangeRequestApi(bookingId), payload, {
      headers: getAuthHeaders(),
    });
    return response?.data?.data || response?.data;
  },

  /**
   * Poll status of cancellation request
   * GET /api/v1/flights/bookings/:bookingId/cancel-status
   * @param {string} bookingId
   * @returns {Promise<Object>}
   */
  async getChangeRequestStatus(bookingId) {
    const response = await api.get(FlightAPI.FlightCancelStatusApi(bookingId), {
      headers: getAuthHeaders(),
    });
    return response?.data?.data || response?.data;
  },

  /**
   * Direct booking cancellation
   * POST /api/v1/flights/bookings/:bookingId/cancel
   * @param {string} bookingId
   * @returns {Promise<Object>}
   */
  async cancelFlightBooking(bookingId) {
    const response = await api.post(FlightAPI.FlightCancelApi(bookingId), {}, {
      headers: getAuthHeaders(),
    });
    return response?.data?.data || response?.data;
  },

  /**
   * Resolve SRDV flight status callback
   * POST /api/v1/flights/callback
   * @param {Object} callbackPayload
   * @returns {Promise<Object>}
   */
  async processFlightCallback(callbackPayload) {
    const response = await api.post(FlightAPI.FlightCallbackApi, callbackPayload);
    return response?.data?.data || response?.data;
  },

  /**
   * Create PayPal payment order for a flight booking
   * POST /api/v1/payments/paypal/create-order
   * @param {string|Object} bookingIdOrOptions
   */
  async createPayPalOrder(bookingIdOrOptions) {
    const options =
      typeof bookingIdOrOptions === "object"
        ? bookingIdOrOptions
        : { bookingId: bookingIdOrOptions };

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const returnUrl =
      options.returnUrl ||
      `${origin}/payment/paypal/success?type=flight&bookingId=${options.bookingId}`;
    const cancelUrl =
      options.cancelUrl ||
      `${origin}/payment/paypal/cancel?type=flight&bookingId=${options.bookingId}`;

    return paymentService.createPayPalOrder({
      bookingId: options.bookingId,
      bookingType: "flight",
      amount: options.amount,
      returnUrl,
      cancelUrl,
    });
  },
};

export default flightService;
