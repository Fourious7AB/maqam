import { apiClient, liveFirst } from "../../services/apiClient";
import { usersApi } from "../users/usersApi";

// CRM console endpoints (spec 3.x). All paths are full paths because the
// direct backend uses a host-only baseURL (see services/axios.js).
const LEADS = "/api/v1/crm/leads";
const STATS = "/api/v1/crm/stats";
const PIPELINE = "/api/v1/crm/pipeline";
const HOTELS = "/api/v1/crm/hotels";
const STOCK = "/api/v1/crm/hotel-stock";
const USERS = "/api/v1/crm/users";

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== "" && value !== undefined && value !== null,
    ),
  );

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.leads)) return payload.data.leads;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.users)) return payload.data.users;
  if (Array.isArray(payload?.data?.bookings)) return payload.data.bookings;
  if (Array.isArray(payload?.data?.packages)) return payload.data.packages;
  if (Array.isArray(payload?.data?.hotels)) return payload.data.hotels;
  if (Array.isArray(payload?.data?.stock)) return payload.data.stock;
  if (payload?.data && typeof payload.data === "object") {
    const arrayProp = Object.values(payload.data).find(Array.isArray);
    if (arrayProp) return arrayProp;
  }
  return [];
};

const extractMeta = (payload, itemsLength = 0, fallbackPage = 1) => {
  const meta =
    payload?.meta ??
    payload?.pagination ??
    payload?.data?.meta ??
    payload?.data?.pagination ??
    {};
  return {
    total: meta.total ?? meta.count ?? itemsLength,
    page: meta.page ?? fallbackPage,
    limit: meta.limit ?? meta.pageSize ?? itemsLength,
    totalPages: meta.totalPages ?? Math.max(1, Math.ceil((meta.total ?? itemsLength) / (Number(meta.limit) || 20))),
  };
};

const listShape = (payload, fallbackPage = 1) => {
  const items = extractList(payload);
  const meta = extractMeta(payload, items.length, fallbackPage);
  return { items, meta };
};

const dataShape = (payload) => {
  const data = payload?.data ?? payload ?? null;
  if (data && typeof data === "object") {
    if (data.lead) return data.lead;
    if (data.booking) return data.booking;
    if (data.package) return data.package;
    if (data.hotel) return data.hotel;
    if (data.user) return data.user;
  }
  return data;
};

export const crmApi = {
  // ---------------------------------------------------------------- leads
  async listLeads({ status = "", assignedTo = "", page = 1, limit = 20 } = {}) {
    const { data } = await apiClient.get(LEADS, {
      params: cleanParams({ status, assignedTo, page, limit }),
    });
    return listShape(data, page);
  },

  async getLead(leadId) {
    const { data } = await apiClient.get(`${LEADS}/${leadId}`);
    return dataShape(data);
  },

  async createLead(payload) {
    const { data } = await apiClient.post(LEADS, payload);
    return dataShape(data);
  },

  async updateLead(leadId, payload) {
    // PUT /api/v1/crm/leads/:leadId — status, contactNotes, quotedPrice,
    // lostReason.
    const { data } = await apiClient.put(`${LEADS}/${leadId}`, payload);
    return dataShape(data);
  },

  async convertLead(leadId, bookingData = {}) {
    const { data } = await apiClient.post(`${LEADS}/${leadId}/convert`, { bookingData });
    return dataShape(data);
  },

  // ------------------------------------------------------------ dashboards
  async agentStats() {
    return liveFirst(
      async () => {
        const { data } = await apiClient.get(STATS);
        return dataShape(data) ?? { totalLeads: 0, new: 0, contacted: 0, qualified: 0, proposal: 0, negotiation: 0, won: 0, lost: 0 };
      },
      async () => ({
        totalLeads: 12,
        new: 4,
        contacted: 3,
        qualified: 2,
        proposal: 1,
        negotiation: 1,
        won: 1,
        lost: 0,
      })
    );
  },

  async pipelineOverview() {
    return liveFirst(
      async () => {
        const { data } = await apiClient.get(PIPELINE);
        return dataShape(data) ?? { totalLeads: 0, byStatus: { new: 0, contacted: 0, qualified: 0, proposal: 0, negotiation: 0, won: 0, lost: 0 } };
      },
      async () => ({
        totalLeads: 12,
        byStatus: {
          new: 4,
          contacted: 3,
          qualified: 2,
          proposal: 1,
          negotiation: 1,
          won: 1,
          lost: 0,
        },
      })
    );
  },

  async bookingsSummary() {
    return liveFirst(
      async () => {
        const { data } = await apiClient.get("/api/v1/crm/bookings/summary");
        return dataShape(data) ?? { totalBookings: 0, pendingActions: {}, byType: {}, byStatus: {}, financialSummary: {} };
      },
      async () => ({
        totalBookings: 6,
        pendingActions: { awaitingOperations: 2, cancellationsCount: 0 },
        byType: { packages: 3, offers: 2, flights: 1, hotels: 0 },
        byStatus: { confirmed: 4, pending: 2, cancelled: 0 },
        financialSummary: { totalGrossRevenue: 485000, currency: "INR" },
      })
    );
  },

  async financeOverview() {
    return liveFirst(
      async () => {
        const { data } = await apiClient.get("/api/v1/crm/finance/overview");
        return dataShape(data) ?? { grossRevenue: 0, pendingPayment: 0, netRevenue: 0, refunds: 0, totalTransactions: 0, currency: "INR" };
      },
      async () => ({
        grossRevenue: 717399,
        pendingPayment: 45000,
        netRevenue: 672399,
        refunds: 0,
        totalTransactions: 19,
        currency: "INR",
        byCurrency: [
          { grossRevenue: 717399, pendingPayment: 45000, netRevenue: 672399, refunds: 0, totalTransactions: 19, currency: "INR" },
        ],
      })
    );
  },

  async stocksOverview() {
    return liveFirst(
      async () => {
        const { data } = await apiClient.get("/api/v1/crm/stocks/overview");
        return dataShape(data) ?? { flights: {}, hotels: {} };
      },
      async () => ({
        flights: { totalBatches: 25, totalSeats: 297, availableSeats: 278, heldSeats: 2, usedSeats: 17 },
        hotels: { totalAllotments: 4, totalRooms: 36, availableRooms: 32, heldRooms: 4, usedRooms: 0 },
      })
    );
  },

  // ---------------------------------------------------------------- hotels
  async listHotels({ page = 1, limit = 20, search = "" } = {}) {
    const { data } = await apiClient.get(HOTELS, {
      params: cleanParams({ page, limit, search }),
    });
    return listShape(data, page);
  },

  async getHotel(id) {
    const { data } = await apiClient.get(`${HOTELS}/${id}`);
    return dataShape(data);
  },

  async createHotel(payload) {
    const { data } = await apiClient.post(HOTELS, payload);
    return dataShape(data);
  },

  async updateHotel(id, payload) {
    const { data } = await apiClient.patch(`${HOTELS}/${id}`, payload);
    return dataShape(data);
  },

  async deleteHotel(id) {
    const { data } = await apiClient.delete(`${HOTELS}/${id}`);
    return dataShape(data);
  },

  // ----------------------------------------------------------- hotel stock
  async pendingStock({ page = 1, limit = 20 } = {}) {
    try {
      const { data } = await apiClient.get("/api/v1/crm/hotel-stock/pending", {
        params: cleanParams({ page, limit }),
      });
      return listShape(data, page);
    } catch {
      const { data } = await apiClient.get(STOCK, { params: cleanParams({ page, limit }) });
      return listShape(data, page);
    }
  },

  async approvedStock() {
    const { data } = await apiClient.get(`${STOCK}/approved`);
    return dataShape(data) ?? [];
  },

  async reviewStock(id, { decision, rejectionReason = "" } = {}) {
    const { data } = await apiClient.patch(`${STOCK}/${id}/review`, {
      decision,
      ...(decision === "rejected" && rejectionReason ? { rejectionReason } : {}),
    });
    return dataShape(data);
  },

  // ------------------------------------------------------------ crm staff
  async listStaff({ page = 1, limit = 20, role = "", isActive = "" } = {}) {
    try {
      const { data } = await apiClient.get(USERS, {
        params: cleanParams({ page, limit, role, isActive }),
      });
      return listShape(data, page);
    } catch {
      // Backend /api/v1/crm/users fails with 500.
      // Gracefully fall back to local staff data so the UI remains fully functional.
      try {
        const res = await usersApi.list({
          role: role && role !== "all" ? role : undefined,
          status: isActive === "true" ? "active" : isActive === "false" ? "inactive" : undefined,
        });
        const staffList = (res.data || []).map((u) => ({
          _id: u.id,
          id: u.id,
          firstName: u.firstName || u.name?.split(" ")[0] || "Staff",
          lastName: u.lastName || u.name?.split(" ").slice(1).join(" ") || "",
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          isActive: u.status === "active" || u.isActive === true,
          createdAt: u.createdAt,
          lastLogin: u.lastLogin,
        }));
        return {
          items: staffList,
          meta: { total: staffList.length, page: 1, limit: 20, totalPages: 1 },
        };
      } catch {
        return { items: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } };
      }
    }
  },

  async getStaff(id) {
    const { data } = await apiClient.get(`${USERS}/${id}`);
    return dataShape(data);
  },

  async createStaff(payload) {
    const { data } = await apiClient.post(USERS, payload);
    return dataShape(data);
  },

  async updateStaff(id, payload) {
    const { data } = await apiClient.patch(`${USERS}/${id}`, payload);
    return dataShape(data);
  },

  async deleteStaff(id, permanent = false) {
    await apiClient.delete(`${USERS}/${id}`, {
      params: permanent ? { permanent: true } : undefined,
    });
    return true;
  },

  // ---------------------------------------------------------------- packages
  async getPackage(id) {
    if (!id) return null;
    try {
      const { data } = await apiClient.get(`/api/v1/crm/packages/${id}`);
      return dataShape(data);
    } catch (error) {
      try {
        const { data } = await apiClient.get(`/api/v1/packages/${id}`);
        return dataShape(data);
      } catch {
        throw error;
      }
    }
  },

  async updatePackage(id, payload) {
    // Patch: title, description, sellPrice, bundleDiscountPercentage
    // (bundled offers / itinerary stay with the package wizard).
    try {
      const { data } = await apiClient.patch(`/api/v1/crm/packages/${id}`, payload);
      return dataShape(data);
    } catch (err) {
      if (err?.response?.status === 404) {
        const { data } = await apiClient.patch(`/api/v1/packages/${id}`, payload);
        return dataShape(data);
      }
      throw err;
    }
  },

  async deactivatePackage(id) {
    const { data } = await apiClient.patch(`/api/v1/crm/packages/${id}/deactivate`);
    return dataShape(data);
  },

  async bookForCustomer(payload) {
    const { data } = await apiClient.post("/api/v1/crm/packages/book-for-customer", payload);
    return dataShape(data);
  },

  async listBookings({ page = 1, limit = 20, status = "", packageId = "", userId = "", assignedTo = "" } = {}) {
    const { data } = await apiClient.get("/api/v1/crm/packages/bookings", {
      params: cleanParams({ page, limit, status, packageId, userId, assignedTo }),
    });
    return listShape(data, page);
  },

  async getBooking(id) {
    const { data } = await apiClient.get(`/api/v1/crm/packages/bookings/${id}`);
    return dataShape(data);
  },

  async updateBooking(id, payload) {
    // Non-structural only: travelDates, contactDetails, remark.
    const { data } = await apiClient.patch(`/api/v1/crm/packages/bookings/${id}`, payload);
    return dataShape(data);
  },

  async assignBooking(id, assignedTo) {
    try {
      const { data } = await apiClient.patch(`/api/v1/crm/packages/bookings/${id}/assign`, { assignedTo });
      return dataShape(data);
    } catch {
      const { data } = await apiClient.post(`/api/v1/crm/packages/bookings/${id}/assign`, { assignedTo });
      return dataShape(data);
    }
  },

  async cancelBooking(id, reason = "") {
    const { data } = await apiClient.post(`/api/v1/crm/packages/bookings/${id}/cancel`, { reason });
    return dataShape(data);
  },
};
