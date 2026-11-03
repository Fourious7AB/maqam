import api from "../components/stores/api.js";
import { PackageAPI, PaymentAPI } from "../configs/api.js";
import paymentService from "./paymentService.js";
import { getAuthHeaders } from "../admin/services/tokenService.js";

/**
 * Service for interacting with customer packages API endpoints.
 */
export const packageService = {
  /**
   * Browse and search packages catalog.
   * @param {Object} params - { destination, sellPriceMin, sellPriceMax, page, limit }
   */
  async getPackages(params = {}) {
    try {
      const response = await api.get(PackageAPI.PackagesApi, { params });
      const raw = response.data || {};
      const packages =
        raw.data?.packages ||
        raw.packages ||
        (Array.isArray(raw.data) ? raw.data : []) ||
        (Array.isArray(raw) ? raw : []);
      return {
        ...raw,
        packages,
        data: packages,
        meta: raw.data?.meta || raw.meta || {},
      };
    } catch (err) {
      console.warn("Failed to fetch packages from API:", err);
      return { packages: [], data: [], meta: {} };
    }
  },

  /**
   * Get full package details, including default flight/hotel components and swappable alternatives.
   * @param {string} id - Package ID
   */
  async getPackageDetail(id) {
    const response = await api.get(PackageAPI.PackageDetailApi(id));
    return response.data?.package || response.data?.data || response.data;
  },

  /**
   * Browse and query public retail offers (flights, hotels) for component swapping.
   * @param {Object} params - { itemType, destination, page, limit }
   */
  async getOffers(params = {}) {
    try {
      const response = await api.get(PackageAPI.OffersApi, { params });
      return (
        response.data?.offers ||
        response.data?.data?.offers ||
        response.data?.data ||
        response.data ||
        []
      );
    } catch (err) {
      console.warn("Failed to fetch offers from API:", err);
      return [];
    }
  },

  /**
   * Get public offer details & live stock.
   * @param {string} id - Offer ID
   */
  async getOfferDetail(id) {
    const response = await api.get(PackageAPI.OfferDetailApi(id));
    return response.data?.offer || response.data?.data || response.data;
  },

  /**
   * Calculate live dynamic customizer quote (Option A Pricing).
   * @param {string} id - Package ID
   * @param {Object} customSelections - { quantity, selectedFlightId, selectedHotelId, selectedAddOnIds, roomType }
   */
  async getPackageQuote(id, customSelections = {}) {
    const response = await api.post(PackageAPI.PackageQuoteApi(id), customSelections);
    return response.data?.quote || response.data?.data?.quote || response.data?.data || response.data;
  },

  /**
   * Book a customized package.
   * @param {Object} payload - { packageId, travellers, quantity, customSelections, swappedOffers, excludedOfferIds }
   */
  async bookPackage(payload) {
    let response;
    try {
      response = await api.post(PackageAPI.PackageBookApi, payload, {
        headers: getAuthHeaders(),
      });
    } catch (err) {
      if (err?.response?.status === 404 || err?.response?.status === 405) {
        if (payload?.packageId) {
          try {
            response = await api.post(`/api/v1/packages/${payload.packageId}/book`, payload, {
              headers: getAuthHeaders(),
            });
          } catch (secondErr) {
            if (secondErr?.response?.status === 404 || secondErr?.response?.status === 405) {
              response = await api.post("/api/v1/packages/bookings", payload, {
                headers: getAuthHeaders(),
              });
            } else {
              throw secondErr;
            }
          }
        } else {
          response = await api.post("/api/v1/packages/bookings", payload, {
            headers: getAuthHeaders(),
          });
        }
      } else {
        throw err;
      }
    }
    const raw =
      response.data?.data?.data ||
      response.data?.data ||
      response.data ||
      {};
    const bookingId =
      raw.bookingId ||
      raw._id ||
      raw.id ||
      raw.booking?.bookingId ||
      raw.booking?._id ||
      raw.booking?.id ||
      response.data?.data?.bookingId ||
      response.data?.bookingId ||
      response.data?._id;
    return {
      ...raw,
      bookingId,
      _id: bookingId,
      id: bookingId,
    };
  },

  /**
   * Cancel an existing package booking and release claimed inventory units.
   * @param {string} id - Booking ID
   * @param {string} reason - Cancellation reason
   */
  async cancelPackageBooking(id, reason = "Cancelled by user") {
    try {
      const response = await api.post(PackageAPI.PackageCancelApi(id), { reason });
      return response.data?.data || response.data;
    } catch (err) {
      try {
        const altRes = await api.post(`/api/v1/packages/${id}/cancel`, { reason });
        return altRes.data?.data || altRes.data;
      } catch {
        throw err;
      }
    }
  },

  /**
   * Get package booking status and snapshot details.
   * @param {string} id - Booking ID
   */
  async getPackageBooking(id) {
    try {
      const response = await api.get(PackageAPI.PackageBookingApi(id), {
        headers: getAuthHeaders(),
      });
      return (
        response.data?.booking ||
        response.data?.data?.booking ||
        response.data?.data ||
        response.data
      );
    } catch (err) {
      try {
        const alt = await api.get(`/api/v1/packages/booking/${id}`, {
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
   * Get all customized package bookings for the authenticated user profile.
   * Gracefully tries primary and alternative customer bookings endpoints.
   * @param {Object} params - { page, limit, status }
   */
  async getUserPackageBookings(params = {}) {
    const endpoints = [
      PackageAPI.PackageUserBookingsApi,
      "/api/v1/packages/bookings",
      "/api/v1/packages/my-bookings",
      "/api/v1/bookings/my-bookings",
    ];

    for (const ep of endpoints) {
      try {
        const response = await api.get(ep, {
          params,
          headers: getAuthHeaders(),
        });
        const data =
          response.data?.data?.bookings ||
          response.data?.data ||
          response.data?.bookings ||
          response.data ||
          [];
        if (Array.isArray(data)) {
          return data;
        }
      } catch (err) {
        if (err?.response?.status !== 404) {
          console.warn(`User package bookings call to ${ep} error:`, err?.message);
        }
      }
    }
    return [];
  },

  /**
   * Create PayPal payment order for a package booking.
   * @param {string|Object} bookingIdOrOptions - Package Booking ID or options object
   */
  async createPayPalOrder(bookingIdOrOptions) {
    const options =
      typeof bookingIdOrOptions === "object"
        ? bookingIdOrOptions
        : { bookingId: bookingIdOrOptions };

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const returnUrl =
      options.returnUrl ||
      `${origin}/payment/paypal/success?type=package&bookingId=${options.bookingId}`;
    const cancelUrl =
      options.cancelUrl ||
      `${origin}/payment/paypal/cancel?type=package&bookingId=${options.bookingId}`;

    return paymentService.createPayPalOrder({
      bookingId: options.bookingId,
      bookingType: "package",
      amount: options.amount,
      returnUrl,
      cancelUrl,
    });
  },
};

export default packageService;

