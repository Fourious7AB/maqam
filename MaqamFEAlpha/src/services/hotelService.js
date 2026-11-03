import api from "../components/stores/api.js";
import { HotelDetailsAPI } from "../configs/api.js";
import { hotels as mockHotels } from "../data/hotelData.js";
import { tokenService, getStoredAuthToken, getAuthHeaders } from "../admin/services/tokenService.js";
import paymentService from "./paymentService.js";

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Service for interacting with SRDV Hotels API (v8 REST) and Hotel Bookings.
 * Authenticated endpoints pass Bearer token via the Axios interceptor.
 */
export const hotelService = {
  /**
   * Destination & City Autocomplete
   * GET /api/v1/hotels/cities?q=Mumbai&countryCode=IN
   * @param {string} query - City search query
   * @param {string} [countryCode] - Optional ISO 2-letter country filter
   * @returns {Promise<Array<{ cityId: string, cityName: string, countryCode: string }>>}
   */
  async autocompleteCities(query, countryCode) {
    if (!query || typeof query !== "string" || query.trim().length === 0) return [];
    try {
      const params = { q: query.trim() };
      if (countryCode) params.countryCode = countryCode;
      const response = await api.get(HotelDetailsAPI.CitiesApi, { params });
      const raw = response?.data;
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.data)) return raw.data;
      return [];
    } catch (err) {
      console.warn("City autocomplete error:", err?.message || err);
      return [];
    }
  },

  /**
   * Hotel Search in destination city
   * POST /api/v1/hotels/search
   * @param {Object} payload - { cityId, checkIn, checkOut, adults, children, childAges, numRooms }
   * @returns {Promise<Object>} { searchId, hotels, total }
   */
  async searchHotels(payload) {
    const url = HotelDetailsAPI.HotelSearchApi || `${HotelDetailsAPI.HotelRoomAllDataApi}/search`;
    const response = await api.post(url, payload);
    return response?.data?.data || response?.data;
  },

  /**
   * Hotel Details & Live Room Rate Plans
   * GET /api/v1/hotels/:hotelId?searchId=<uuid>
   * @param {string} hotelId
   * @param {string} [searchId]
   * @returns {Promise<Object>} Hotel details and live rate plans
   */
  async getHotelDetails(hotelId, searchId) {
    if (!hotelId) throw new Error("hotelId is required");
    const params = {};
    if (searchId) params.searchId = searchId;
    const response = await api.get(`${HotelDetailsAPI.HotelDetailsApi}/${hotelId}`, { params });
    return response?.data?.data || response?.data;
  },

  /**
   * Rate Lock & Recheck (BlockRoom with SRDV)
   * POST /api/v1/hotels/recheck
   * Returns a 3-minute single-use token `recheckId`
   * @param {Object} payload - { searchId, hotelId, selectedRooms: [{ roomId, quantity }] }
   * @returns {Promise<Object>} { recheckId, priceChanged, policyChanged, totalPrice }
   */
  async recheckRoomRate(payload) {
    const headers = getAuthHeaders();

    const response = await api.post(HotelDetailsAPI.HotelRoomAvailabilityApi, payload, {
      headers,
    });
    return response?.data?.data || response?.data;
  },

  /**
   * Create Hotel Reservation (Status: awaiting_payment)
   * POST /api/v1/hotels/bookings
   * @param {Object} payload - { recheckId, acceptChanges, guests: [{ Title, FirstName, LastName, Phoneno, Email, PaxType, LeadPassenger, Age, PAN }] }
   * @param {string} [idempotencyKey]
   * @returns {Promise<Object>} { bookingId, status: "awaiting_payment", totalPrice, expiresInSeconds }
   */
  async createHotelBooking(payload, idempotencyKey) {
    const key =
      idempotencyKey || `htl_bk_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const bookingPayload = {
      ...(payload || {}),
      idempotencyKey: key,
    };

    let response;
    try {
      response = await api.post(HotelDetailsAPI.HotelRoomPreorderApi, bookingPayload, {
        headers: getAuthHeaders(),
      });
    } catch (err) {
      if (err?.response?.status === 404 || err?.response?.status === 405) {
        response = await api.post("/api/v1/hotels/book", bookingPayload, {
          headers: getAuthHeaders(),
        });
      } else {
        throw err;
      }
    }

    const raw = response?.data?.data || response?.data || {};
    const bookingId =
      raw.bookingId ||
      raw.id ||
      raw._id ||
      raw.data?.bookingId ||
      raw.data?.id ||
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
   * List customer's own hotel bookings
   * GET /api/v1/hotels/bookings/me
   * @param {Object} [params] - { page, limit }
   * @returns {Promise<Array>}
   */
  async getMyHotelBookings(params = {}) {
    try {
      const response = await api.get(HotelDetailsAPI.HotelBookingsMeApi, {
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
      console.warn("Failed to fetch customer hotel bookings:", err?.message || err);
      return [];
    }
  },

  /**
   * Get single hotel booking details
   * GET /api/v1/hotels/bookings/:id
   * @param {string} id
   * @returns {Promise<Object>} Full HotelBooking record
   */
  async getHotelBookingById(id) {
    if (!id) throw new Error("Hotel booking id is required");
    const response = await api.get(HotelDetailsAPI.HotelBookingDetailApi(id), {
      headers: getAuthHeaders(),
    });
    return response?.data?.data || response?.data;
  },

  /**
   * Cancel hotel booking
   * POST /api/v1/hotels/bookings/:id/cancel
   * @param {string} id
   * @returns {Promise<Object>} Cancellation confirmation from SRDV
   */
  async cancelHotelBooking(id) {
    if (!id) throw new Error("Hotel booking id is required");
    const response = await api.post(HotelDetailsAPI.HotelCancelApi(id), {}, {
      headers: getAuthHeaders(),
    });
    return response?.data?.data || response?.data;
  },

  /**
   * Create PayPal payment order for a hotel booking
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
      `${origin}/payment/paypal/success?type=hotel&bookingId=${options.bookingId}`;
    const cancelUrl =
      options.cancelUrl ||
      `${origin}/payment/paypal/cancel?type=hotel&bookingId=${options.bookingId}`;

    return paymentService.createPayPalOrder({
      bookingId: options.bookingId,
      bookingType: "hotel",
      amount: options.amount,
      returnUrl,
      cancelUrl,
    });
  },
};

// ─── BACKWARD COMPATIBLE EXPORTS FOR ADMIN/HOTELIER PORTAL ───
export async function getHotels() {
  await delay();
  return [...mockHotels];
}

export async function getHotelById(id) {
  await delay();
  return mockHotels.find((hotel) => hotel.id === id);
}

export async function createHotel(data) {
  await delay();
  const number = String(mockHotels.length + 1).padStart(5, "0");
  const hotelId = `HTL-2026-${number}`;
  const username = `hotel_${number}`;
  const temporaryPassword = Math.random().toString(36).slice(-8) + "@1";

  const newHotel = {
    ...data,
    id: hotelId,
    username,
    temporaryPassword,
    status: "Active",
    createdAt: new Date().toLocaleDateString(),
    updatedAt: new Date().toLocaleDateString(),
    rooms: data.rooms || [],
  };

  mockHotels.push(newHotel);
  return newHotel;
}

export async function updateHotel(id, data) {
  await delay();
  const index = mockHotels.findIndex((hotel) => hotel.id === id);
  if (index === -1) {
    throw new Error("Hotel not found");
  }
  mockHotels[index] = {
    ...mockHotels[index],
    ...data,
    updatedAt: new Date().toLocaleDateString(),
  };
  return mockHotels[index];
}

export default hotelService;