import api from "../components/stores/api.js";
import { BookingAPI } from "../configs/api.js";
import { getAuthHeaders } from "../admin/services/tokenService.js";

/**
 * Service for interacting with Master Customer Bookings API endpoints.
 * Provides unified queries across Flights, Hotels, and Packages.
 * All requests authenticate via Bearer token in the Axios interceptor.
 */
export const bookingService = {
  /**
   * List unified master bookings for the authenticated customer.
   * GET /api/v1/bookings
   * @param {Object} [params] - { page, limit, status, type }
   * @returns {Promise<Array>} List of master booking objects
   */
  async getMasterBookings(params = {}) {
    try {
      const response = await api.get(BookingAPI.CustomerBookingsApi, {
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
      console.warn("Failed to fetch master bookings:", err?.message || err);
      return [];
    }
  },

  /**
   * Get full details of a specific master booking.
   * GET /api/v1/bookings/:bookingId
   * @param {string} bookingId
   * @returns {Promise<Object>} Master Booking document
   */
  async getMasterBookingById(bookingId) {
    if (!bookingId) throw new Error("bookingId is required");
    const response = await api.get(BookingAPI.CustomerBookingDetailApi(bookingId), {
      headers: getAuthHeaders(),
    });
    return response?.data?.data || response?.data;
  },

  /**
   * Unified cancel request for a master booking.
   * POST /api/v1/bookings/:bookingId/cancel
   * @param {string} bookingId
   * @param {Object} [payload] - Optional cancellation reason/remarks
   * @returns {Promise<Object>} Updated status 'cancelled'
   */
  async cancelMasterBooking(bookingId, payload = {}) {
    if (!bookingId) throw new Error("bookingId is required");
    const response = await api.post(BookingAPI.CustomerBookingCancelApi(bookingId), payload, {
      headers: getAuthHeaders(),
    });
    return response?.data?.data || response?.data;
  },
};

export default bookingService;
