import { apiClient } from "../../services/apiClient";

// CRM Customers endpoints (Spec Section 1 & 3).
// Primary route: /api/v1/crm/customers (also accessible under /api/v1/ops-crm/customers).
// Fully live data: no mock data fallback.
const CRM_CUSTOMERS_ROOT = "/api/v1/crm/customers";
const OPS_CUSTOMERS_ROOT = "/api/v1/ops-crm/customers";

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== "" && value !== undefined && value !== null,
    ),
  );

/**
 * Normalizes customer summary data for consistent UI consumption.
 */
export function normalizeCustomer(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const id = raw._id || raw.id;
  const firstName = raw.firstName || "";
  const lastName = raw.lastName || "";
  const name =
    raw.name ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    raw.email ||
    "Customer";

  return {
    ...raw,
    _id: id,
    id,
    name,
    firstName,
    lastName,
    phone: raw.phone || "",
    email: raw.email || "",
    avatar: raw.avatar || null,
    totalTravellers: Number(raw.totalTravellers ?? 0),
    bookedOffersCount: Number(raw.bookedOffersCount ?? 0),
    totalBookingsCount: Number(raw.totalBookingsCount ?? 0),
    totalMoneySpent: Number(raw.totalMoneySpent ?? 0),
    isActive: raw.isActive !== false,
    isVerified: Boolean(raw.isVerified),
    isPhoneVerified: Boolean(raw.isPhoneVerified),
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  };
}

/**
 * Normalizes individual traveller profile.
 */
export function normalizeTraveller(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const id = raw._id || raw.id;
  const title = raw.title || "";
  const firstName = raw.firstName || "";
  const lastName = raw.lastName || "";
  const middleName = raw.middleName || null;
  const fullName =
    raw.fullName ||
    [title, firstName, middleName, lastName].filter(Boolean).join(" ").trim() ||
    "Traveller";

  return {
    ...raw,
    _id: id,
    id,
    title,
    firstName,
    lastName,
    middleName,
    fullName,
    passengerType: raw.passengerType || "Adult",
    gender: raw.gender || "Not specified",
    dateOfBirth: raw.dateOfBirth || null,
    nationality: raw.nationality || "Not specified",
    email: raw.email || null,
    phone: raw.phone || null,
    cellCountryCode: raw.cellCountryCode || "",
    passportNo: raw.passportNo || raw.passport || null,
    passportExpiry: raw.passportExpiry || null,
    passportIssueCountryCode: raw.passportIssueCountryCode || null,
    passportIssueDate: raw.passportIssueDate || null,
    address: raw.address || null,
    documentType: raw.documentType || "Passport",
    documentId: raw.documentId || null,
    isDefault: Boolean(raw.isDefault),
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  };
}

/**
 * Execute request against primary CRM route with automatic fallback to ops-crm route.
 */
async function fetchWithFallback(pathSuffix = "", config = {}) {
  try {
    return await apiClient.get(`${CRM_CUSTOMERS_ROOT}${pathSuffix}`, config);
  } catch (error) {
    if (error?.response?.status === 404) {
      // Retry once against the ops-crm route
      return await apiClient.get(`${OPS_CUSTOMERS_ROOT}${pathSuffix}`, config);
    }
    throw error;
  }
}

export const customersApi = {
  /**
   * GET /api/v1/crm/customers
   * Retrieves paginated list of customers with computed metrics.
   * Query params: page, limit, search, isActive, sortBy, sortOrder
   */
  async list({
    page = 1,
    limit = 20,
    search = "",
    isActive,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = {}) {
    const params = cleanParams({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      search: search?.trim() || undefined,
      isActive: typeof isActive === "boolean" ? isActive : undefined,
      sortBy: sortBy || "createdAt",
      sortOrder: sortOrder || "desc",
    });

    const response = await fetchWithFallback("", { params });
    const payload = response?.data;

    // Handles standard { success: true, data: [...], meta: {...} } or alternative shapes
    const rawList =
      payload?.data?.customers ??
      payload?.customers ??
      (Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []);

    const meta = payload?.meta ?? payload?.pagination ?? {
      total: rawList.length,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      totalPages: Math.max(1, Math.ceil(rawList.length / (Number(limit) || 20))),
    };

    return {
      success: payload?.success !== false,
      message: payload?.message || "Customers retrieved successfully",
      data: rawList.map(normalizeCustomer),
      meta: {
        total: Number(meta.total ?? rawList.length),
        page: Number(meta.page ?? page),
        limit: Number(meta.limit ?? limit),
        totalPages: Number(meta.totalPages ?? Math.max(1, Math.ceil((meta.total || rawList.length) / (meta.limit || 20)))),
      },
    };
  },

  /**
   * GET /api/v1/crm/customers/:id
   * Retrieves 360° customer profile including lifetime spend, currency breakdown, and recent reservations.
   */
  async getById(id) {
    if (!id) throw new Error("Customer ID is required");

    const response = await fetchWithFallback(`/${id}`);
    const payload = response?.data;
    const rawData = payload?.data ?? payload?.customer ?? payload;

    if (!rawData) {
      throw new Error("Customer record not found.");
    }

    const normalized = normalizeCustomer(rawData);

    return {
      ...normalized,
      role: rawData.role || "customer",
      currencyBreakdown: Array.isArray(rawData.currencyBreakdown)
        ? rawData.currencyBreakdown.map((cb) => ({
            currency: cb.currency || "INR",
            spent: Number(cb.spent ?? 0),
            transactions: Number(cb.transactions ?? 0),
          }))
        : [],
      recentBookings: Array.isArray(rawData.recentBookings)
        ? rawData.recentBookings.map((b) => ({
            _id: b._id || b.id,
            id: b._id || b.id,
            bookingType: b.bookingType || "package",
            status: b.status || "confirmed",
            amount: b.amount ? Number(b.amount) : undefined,
            createdAt: b.createdAt || null,
          }))
        : [],
    };
  },

  /**
   * GET /api/v1/crm/customers/:id/travellers
   * Retrieves all saved family members and passengers for the customer.
   */
  async getTravellers(id) {
    if (!id) throw new Error("Customer ID is required");

    const response = await fetchWithFallback(`/${id}/travellers`);
    const payload = response?.data;
    const dataObj = payload?.data ?? payload ?? {};

    const rawCustomer = dataObj.customer || null;
    const rawTravellers = Array.isArray(dataObj.travellers)
      ? dataObj.travellers
      : Array.isArray(dataObj)
      ? dataObj
      : [];

    return {
      customer: rawCustomer ? normalizeCustomer(rawCustomer) : null,
      totalTravellers: Number(dataObj.totalTravellers ?? rawTravellers.length),
      travellers: rawTravellers.map(normalizeTraveller),
    };
  },

  /**
   * Backward compatibility alias
   */
  async listTravelers(id) {
    return this.getTravellers(id);
  },

  /**
   * Update customer profile if mutation is needed
   */
  async update(id, payload) {
    const { data } = await apiClient.patch(`${CRM_CUSTOMERS_ROOT}/${id}`, payload);
    return data?.data ? normalizeCustomer(data.data) : data;
  },

  /**
   * Create customer if needed
   */
  async create(payload) {
    const { data } = await apiClient.post(CRM_CUSTOMERS_ROOT, payload);
    return data?.data ? normalizeCustomer(data.data) : data;
  },
};

export default customersApi;
