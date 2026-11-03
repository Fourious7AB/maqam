import { apiClient } from "../../services/apiClient";
import { addEntityImages, deleteEntityImage } from "../../../services/upload";

// CRM admin operations target /api/v1/crm/packages; the public customer
// detail endpoint /api/v1/packages/:id returns the itemized breakdown and
// swap alternatives. All methods hit the live API unconditionally.
const CRM_ROOT = "/api/v1/crm/packages";
const PUBLIC_ROOT = "/api/v1/packages";

const qs = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== "" && value !== undefined && value !== null,
    ),
  );

// Backend documents are keyed by _id (MongoDB); the UI works with id.
const withId = (pkg) => {
  if (!pkg) return pkg;
  return { ...pkg, id: pkg._id ?? pkg.id ?? pkg.packageId };
};

export const packagesApi = {
  async list(params = {}) {
    // GET /api/v1/crm/packages — list with margin analytics. Query contract:
    // page (default 1), limit (default 10). The UI speaks pageSize, so map
    // it to the backend's limit before the request.
    // Shape: { success, data: [...], meta: { total, page, limit, totalPages } }
    const { data } = await apiClient.get(CRM_ROOT, {
      params: qs({ ...params, limit: params.limit ?? params.pageSize }),
    });
    const packages = (data?.data ?? data?.packages ?? []).map(withId);
    const pagination = data?.meta ?? data?.pagination ?? {};
    return {
      data: packages,
      meta: {
        total: pagination.total ?? packages.length,
        page: pagination.page ?? params.page ?? 1,
        pageSize: pagination.limit ?? params.limit ?? params.pageSize ?? packages.length,
        totalPages: pagination.totalPages ?? 1,
      },
    };
  },

  async getById(id) {
    if (!id) return null;
    // GET /api/v1/packages/:id — public detail with priceBreakdown and
    // availableAlternatives for the customizer. Falls back to the CRM
    // detail route for packages the public endpoint does not expose.
    try {
      const { data } = await apiClient.get(`${PUBLIC_ROOT}/${id}`);
      return withId(data?.package ?? data?.data ?? data);
    } catch (error) {
      if (error?.response?.status && error.response.status >= 500) throw error;
      const { data } = await apiClient.get(`${CRM_ROOT}/${id}`);
      return withId(data?.package ?? data?.data ?? data);
    }
  },

  async create(payload) {
    // POST /api/v1/crm/packages — requires >= 2 offerRefs; sellPrice is
    // server-computed when omitted. Guide bundle config (guideActive,
    // guideLocation, guidePrice) travels in the same body — spec A.
    const { data } = await apiClient.post(CRM_ROOT, payload);
    return withId(data?.package ?? data?.data ?? data);
  },

  async update(id, payload) {
    if (!id) throw new Error("Package ID is required for update");
    const { data } = await apiClient.patch(`${CRM_ROOT}/${id}`, payload);
    const updated = data?.package ?? data?.data ?? data;
    return withId({ ...payload, ...(typeof updated === "object" ? updated : {}), id: updated?._id ?? updated?.id ?? id });
  },

  // PATCH /api/v1/crm/packages/:id/deactivate — soft-delete / deactivate a
  // curated package. Softly deactivates without deleting inventory history.
  async deactivate(id) {
    const { data } = await apiClient.patch(`${CRM_ROOT}/${id}/deactivate`);
    return withId(data?.package ?? data?.data ?? data);
  },

  // PATCH /api/v1/crm/packages/:id with { isActive: true } — re-activate a
  // previously deactivated package (the guide only documents deactivate;
  // activation goes through the regular patch route).
  async activate(id) {
    return this.update(id, { isActive: true });
  },

  // ------------------------------------------------------------------
  // Custom quote with guide — spec B
  // POST /api/v1/packages/:packageId/quote
  // Three mutually exclusive guide options:
  //   { quantity, includeGuide: true }                      — package guide
  //   { quantity, guideId }                                 — catalog guide
  //   { quantity, guideSelected, guideLocation, guidePrice } — agent override
  // ------------------------------------------------------------------
  async getQuote(packageId, { quantity = 1, includeGuide = false, guideId = "", guideSelected = "", guideLocation = [], guidePrice = 0 } = {}) {
    const body = { quantity: Number(quantity || 1) };
    if (guideSelected && String(guideSelected).trim()) {
      // Option 3 — travel agent custom override.
      body.guideSelected = String(guideSelected).trim();
      const locations = (Array.isArray(guideLocation) ? guideLocation : String(guideLocation || "").split(","))
        .map((item) => item.trim())
        .filter(Boolean);
      if (locations.length) body.guideLocation = locations;
      if (Number(guidePrice) > 0) body.guidePrice = Number(guidePrice);
    } else if (guideId) {
      // Option 2 — guide picked from the catalog by profile id.
      body.guideId = guideId;
    } else if (includeGuide) {
      // Option 1 — the package's own default guide.
      body.includeGuide = true;
    }
    const { data } = await apiClient.post(`${PUBLIC_ROOT}/${packageId}/quote`, body);
    return data?.data ?? data ?? null;
  },

  // ------------------------------------------------------------------
  // Package bookings — CRM operations (spec 3.7–3.13)
  // ------------------------------------------------------------------

  // POST /api/v1/crm/packages/book-for-customer
  // Offline/bank-transfer bookings: confirms immediately, marks stock used,
  // records payment and syncs a MasterBooking.
  async bookForCustomer(payload) {
    const { data } = await apiClient.post(`${CRM_ROOT}/book-for-customer`, payload);
    return data;
  },

  // GET /api/v1/crm/packages/bookings
  // Real backend params (verified): page, limit, status, packageId, userId,
  // assignedTo. Rows come back in `data` and pagination in `meta`.
  async listBookings({ page = 1, limit = 20, status = "", packageId = "", userId = "", assignedTo = "", pkg = "", customer = "" } = {}) {
    const { data } = await apiClient.get(`${CRM_ROOT}/bookings`, {
      params: qs({
        page,
        limit,
        status,
        packageId: packageId || pkg,
        userId: userId || customer,
        assignedTo,
      }),
    });
    return {
      bookings: data?.data ?? data?.bookings ?? [],
      pagination: data?.meta ?? data?.pagination ?? { total: 0, page, limit, totalPages: 1 },
    };
  },

  // GET /api/v1/crm/packages/bookings/:id — full operational dossier.
  async getBooking(id) {
    const { data } = await apiClient.get(`${CRM_ROOT}/bookings/${id}`);
    return data?.booking ?? data?.data ?? data;
  },

  // PATCH /api/v1/crm/packages/bookings/:id/assign
  async assignBooking(id, assignedTo) {
    const { data } = await apiClient.patch(`${CRM_ROOT}/bookings/${id}/assign`, { assignedTo });
    return data?.booking ?? data?.data ?? data;
  },

  // PATCH /api/v1/crm/packages/bookings/:id
  // Non-structural updates only (travel dates, contact details); structural
  // changes on confirmed bookings are rejected by the backend.
  async updateBooking(id, payload) {
    const { data } = await apiClient.patch(`${CRM_ROOT}/bookings/${id}`, payload);
    return data?.booking ?? data?.data ?? data;
  },

  // PATCH /api/v1/crm/packages/bookings/:id/remark — audit trail remark.
  async addBookingRemark(id, remark) {
    const { data } = await apiClient.patch(`${CRM_ROOT}/bookings/${id}/remark`, { remark });
    return data?.booking ?? data?.data ?? data;
  },

  // POST /api/v1/crm/packages/bookings/:id/cancel — releases all stock units.
  async cancelBooking(id, reason = "") {
    const { data } = await apiClient.post(`${CRM_ROOT}/bookings/${id}/cancel`, { reason });
    return data;
  },

  // POST /api/v1/crm/packages/:id/images — upload & append photos to existing package
  async addImages(id, files) {
    return addEntityImages("packages", id, files);
  },

  // DELETE /api/v1/crm/packages/:id/images — delete specific photo from package
  async deleteImage(id, imageUrl) {
    return deleteEntityImage("packages", id, imageUrl);
  },
};
