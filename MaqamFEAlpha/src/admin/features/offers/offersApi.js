import { apiClient } from "../../services/apiClient";
import { addEntityImages, deleteEntityImage } from "../../../services/upload";

// Section 2 — Standalone Retail Offers.
// CRM admin management lives under /api/v1/crm/offers; the public customer
// portal under /api/v1/offers. Admin pages only use the CRM paths plus the
// public browse endpoint for read-only previews.
const CRM_ROOT = "/api/v1/crm/offers";
const PUBLIC_ROOT = "/api/v1/offers";

const qs = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== "" && value !== undefined && value !== null,
    ),
  );

export const offersApi = {
  // GET /api/v1/crm/offers
  // Retail offers with margin analytics (sellPrice, costPrice, grossProfit,
  // profitMarginPercentage, availableBookings).
  async list({ page = 1, limit = 20, itemType = "", destination = "", isActive = "" } = {}) {
    const { data } = await apiClient.get(CRM_ROOT, {
      params: qs({ page, limit, itemType, destination, isActive }),
    });
    return {
      offers: data?.offers ?? data?.data ?? [],
      pagination: data?.pagination ?? { total: 0, page, limit, totalPages: 1 },
    };
  },

  // POST /api/v1/crm/offers
  // Links a TicketStock (flightRef.stock) or HotelStock (hotelRef.stock);
  // the backend computes costPrice and profit margin from wholesale cost.
  async create(payload) {
    const { data } = await apiClient.post(CRM_ROOT, payload);
    return data?.offer ?? data?.data ?? null;
  },

  // PATCH /api/v1/crm/offers/:id — update price, dates, inclusions.
  async update(id, payload) {
    const { data } = await apiClient.patch(`${CRM_ROOT}/${id}`, payload);
    return data?.offer ?? data?.data ?? null;
  },

  // GET /api/v1/crm/offers/:id — single offer detail with live stock metrics
  // (availableBookings, costPrice, margin). Used to load an offer before editing.
  async getSingle(id) {
    const { data } = await apiClient.get(`${CRM_ROOT}/${id}`);
    return data?.offer ?? data?.data?.offer ?? data?.data ?? data ?? null;
  },

  // PATCH /api/v1/crm/offers/:id/toggle-status — activate / deactivate.
  async toggleStatus(id) {
    const { data } = await apiClient.patch(`${CRM_ROOT}/${id}/toggle-status`);
    return data?.offer ?? data?.data ?? null;
  },

  // POST /api/v1/crm/offers/book-for-customer
  // Walk-in / phone clients paying via bank deposit or cash: confirms the
  // booking, records the payment and marks stock units used immediately.
  async bookForCustomer(payload) {
    const { data } = await apiClient.post(`${CRM_ROOT}/book-for-customer`, payload);
    return data;
  },

  // GET /api/v1/crm/offers/bookings?status=confirmed
  async listBookings({ page = 1, limit = 20, status = "" } = {}) {
    const { data } = await apiClient.get(`${CRM_ROOT}/bookings`, {
      params: qs({ page, limit, status }),
    });
    return {
      bookings: data?.bookings ?? data?.data ?? [],
      pagination: data?.pagination ?? { total: 0, page, limit, totalPages: 1 },
    };
  },

  // POST /api/v1/crm/offers/bookings/:id/cancel
  // Admin cancellation — atomically releases the reserved stock unit.
  async cancelBooking(id, reason = "") {
    const { data } = await apiClient.post(`${CRM_ROOT}/bookings/${id}/cancel`, { reason });
    return data;
  },

  // GET /api/v1/offers — public browse (customer portal parity).
  async listPublic({ page = 1, limit = 10, itemType = "", destination = "", minPrice = "", maxPrice = "" } = {}) {
    const { data } = await apiClient.get(PUBLIC_ROOT, {
      params: qs({ page, limit, itemType, destination, minPrice, maxPrice }),
    });
    return {
      offers: data?.offers ?? data?.data ?? [],
      pagination: data?.pagination ?? { total: 0, page, limit, totalPages: 1 },
    };
  },

  // POST /api/v1/crm/offers/:id/images — upload & append photos to existing offer
  async addImages(id, files) {
    return addEntityImages("offers", id, files);
  },

  // DELETE /api/v1/crm/offers/:id/images — delete specific photo from offer
  async deleteImage(id, imageUrl) {
    return deleteEntityImage("offers", id, imageUrl);
  },
};
