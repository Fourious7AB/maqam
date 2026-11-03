import api from "../components/stores/api.js";
import { OfferAPI } from "../configs/api.js";
import paymentService from "./paymentService.js";
import { getAuthHeaders } from "../admin/services/tokenService.js";

/**
 * Service for interacting with customer standalone retail offers (flights & hotels).
 * Independent of SRDV external flight and hotel suppliers — internal wholesale inventory.
 */
export const offerService = {
  /**
   * Browse and query public retail offers (flights & hotels).
   * @param {Object} params - { itemType: "flight"|"hotel", destination, page, limit }
   */
  async getOffers(params = {}) {
    const response = await api.get(OfferAPI.OffersApi, { params });
    return (
      response.data?.offers ||
      response.data?.data?.offers ||
      response.data?.data ||
      response.data ||
      []
    );
  },

  /**
   * Get public offer details & live stock.
   * @param {string} id - Offer ID
   */
  async getOfferDetail(id) {
    if (!id) throw new Error("Offer ID is required.");
    const response = await api.get(OfferAPI.OfferDetailApi(id));
    return response.data?.offer || response.data?.data?.offer || response.data?.data || response.data;
  },

  /**
   * Book an offer (holds stock for 30 min pending payment).
   * Takes payload: { quantity, travellers: [{ travellerId, isLead }] }
   * @param {string} id - Offer ID
   * @param {Object} payload - { quantity, travellers }
   */
  async bookOffer(id, payload) {
    if (!id) throw new Error("Offer ID is required for booking.");
    const cleanId = String(id).trim();
    const cleanPayload = {
      offerId: cleanId,
      quantity: Number(payload?.quantity) || 1,
      travellers: Array.isArray(payload?.travellers) ? payload.travellers : [],
    };

    let response;
    const endpointsToTry = [
      OfferAPI.OfferBookApi(cleanId),
      OfferAPI.OfferBookDirectApi || "/api/v1/offers/book",
      OfferAPI.OfferBookingsApi || "/api/v1/offers/bookings",
      "/offers/book",
    ];

    let lastError;
    for (const url of endpointsToTry) {
      try {
        response = await api.post(url, cleanPayload, {
          headers: getAuthHeaders(),
        });
        if (response?.data) break;
      } catch (err) {
        lastError = err;
        if (err?.response?.status === 404 || err?.response?.status === 405) {
          continue;
        }
        throw err;
      }
    }

    if (!response && lastError) {
      throw lastError;
    }

    const raw = response.data?.data || response.data || {};
    const booking = raw.booking || raw;
    const bookingId =
      booking._id ||
      booking.id ||
      raw.bookingId ||
      raw._id ||
      raw.id ||
      response.data?.bookingId;

    return {
      ...raw,
      booking,
      bookingId,
      _id: bookingId,
      id: bookingId,
    };
  },

  /**
   * Get customer offer booking status and snapshot details.
   * GET /api/v1/offers/bookings/:id
   * @param {string} id - Booking ID
   */
  async getBooking(id) {
    if (!id) throw new Error("Booking ID is required.");
    const cleanId = String(id).trim();

    try {
      const response = await api.get(OfferAPI.OfferBookingApi(cleanId), {
        headers: getAuthHeaders(),
      });
      return (
        response.data?.booking ||
        response.data?.data?.booking ||
        response.data?.data ||
        response.data
      );
    } catch (err) {
      // Fallback try alternative path if exists
      try {
        const alt = await api.get(`/api/v1/offers/booking/${cleanId}`, {
          headers: getAuthHeaders(),
        });
        return (
          alt.data?.booking ||
          alt.data?.data?.booking ||
          alt.data?.data ||
          alt.data
        );
      } catch {
        throw err;
      }
    }
  },

  /**
   * Poll offer booking until payment is confirmed by backend or max retries reached.
   * @param {string} id - Booking ID
   * @param {Object} options - { maxAttempts, intervalMs }
   * @returns {Promise<Object>} Confirmed booking object
   */
  async pollBookingConfirmation(id, { maxAttempts = 12, intervalMs = 1500 } = {}) {
    if (!id) throw new Error("Booking ID is required for polling.");

    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        const booking = await offerService.getBooking(id);
        const b = booking?.booking || booking?.data?.booking || booking?.data || booking;
        const status = (b?.status || b?.bookingStatus || "").toLowerCase();
        const payStatus = (b?.paymentStatus || b?.payment?.status || "").toUpperCase();

        if (
          status === "confirmed" ||
          status === "completed" ||
          payStatus === "COMPLETED" ||
          payStatus === "CAPTURED" ||
          payStatus === "PAID" ||
          payStatus === "SUCCESS"
        ) {
          return b;
        }

        if (status === "cancelled" || status === "failed" || payStatus === "FAILED") {
          return b;
        }
      } catch (err) {
        console.warn(`[offerService] Polling attempt ${attempts + 1} error:`, err?.message);
      }

      attempts++;
      if (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    // Final attempt check
    return await offerService.getBooking(id);
  },

  /**
   * Self-cancel an existing offer booking and auto-release held stock unit.
   * POST /api/v1/offers/bookings/:id/cancel
   * @param {string} id - Booking ID
   * @param {string} reason - Cancellation reason
   */
  async cancelBooking(id, reason = "Cancelled by customer") {
    if (!id) throw new Error("Booking ID is required for cancellation.");
    const cleanId = String(id).trim();

    try {
      const response = await api.post(
        OfferAPI.OfferCancelApi(cleanId),
        { reason },
        { headers: getAuthHeaders() }
      );
      return response.data?.booking || response.data?.data || response.data;
    } catch (err) {
      try {
        const alt = await api.post(
          `/api/v1/offers/${cleanId}/cancel`,
          { reason },
          { headers: getAuthHeaders() }
        );
        return alt.data?.booking || alt.data?.data || alt.data;
      } catch {
        throw err;
      }
    }
  },

  /**
   * Create PayPal payment order for an offer booking.
   * Initiates payment via POST /api/v1/payments/paypal/create-order with bookingType: "offer"
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
      `${origin}/payment/paypal/success?type=offer&bookingId=${options.bookingId}`;
    const cancelUrl =
      options.cancelUrl ||
      `${origin}/payment/paypal/cancel?type=offer&bookingId=${options.bookingId}`;

    return paymentService.createPayPalOrder({
      bookingId: options.bookingId,
      bookingType: "offer",
      amount: options.amount,
      returnUrl,
      cancelUrl,
    });
  },

  /**
   * Get user's own offer bookings across customer endpoints.
   * @param {Object} params - { page, limit, status }
   */
  async getUserOfferBookings(params = {}) {
    const endpoints = [
      OfferAPI.OfferBookingsApi,
      "/api/v1/offers/bookings/me",
      "/api/v1/offers/bookings",
      "/api/v1/offers/my-bookings",
      "/api/v1/bookings/my-bookings",
      "/api/v1/bookings",
    ];

    for (const ep of endpoints) {
      try {
        const response = await api.get(ep, {
          params,
          headers: getAuthHeaders(),
        });
        const list =
          response.data?.bookings ||
          response.data?.data?.bookings ||
          response.data?.data ||
          response.data ||
          [];
        if (Array.isArray(list) && list.length > 0) {
          return list.filter(
            (b) =>
              ep.startsWith("/api/v1/offers") ||
              (b.bookingType || b.type || "").toLowerCase() === "offer" ||
              b.offer ||
              b.offerId ||
              b.offerSnapshot
          );
        }
      } catch (err) {
        if (err?.response?.status !== 404) {
          console.warn(`[offerService] Call to ${ep} error:`, err?.message);
        }
      }
    }
    return [];
  },
};

export default offerService;
