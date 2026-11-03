import { apiClient } from "../../services/apiClient.js";

export const DEFAULT_SETTINGS = {
  general: {
    companyName: "Maqam Travels",
    supportEmail: "support@maqam.com",
    supportPhone: "+911180808080",
    timezone: "Asia/Kolkata",
    currency: "INR",
  },
  markup: {
    flightMarkupPercent: 2.5,
    hotelMarkupPercent: 5.0,
    defaultMarkupPercent: 5.0,
    taxPercentage: 5.0,
    currency: "INR",
  },
  agencyGst: {
    agencyPersonalGst: 5,
    isPersonalGstApplied: true,
    currency: "INR",
  },
  financial: {
    currency: "INR",
    flightMarkupPercent: 2.5,
    hotelMarkupPercent: 5.0,
    defaultMarkupPercent: 5.0,
    agencyPersonalGst: 5,
    isPersonalGstApplied: true,
  },
  booking: {
    holdDeadlineMinutes: 60,
    cancellationGraceHours: 24,
    autoVoucherEnabled: true,
  },
  notifications: {
    emailSenderName: "Maqam Travels Support",
    replyToEmail: "support@maqam.com",
    smsAlertsEnabled: true,
  },
};

const unwrapPayload = (response, section = "general") => {
  const raw = response?.data;
  // If response has envelope .data property
  const payload = raw?.data !== undefined ? raw.data : raw;
  if (payload && typeof payload === "object" && Object.keys(payload).length > 0) {
    return { ...(DEFAULT_SETTINGS[section] || {}), ...payload };
  }
  return DEFAULT_SETTINGS[section] || {};
};

// In-memory cache for fast checkout/pricing lookups
let cachedMarkup = null;
let lastMarkupFetch = 0;
const CACHE_TTL_MS = 30000;

export const getStoredTaxPercentage = () => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const val = localStorage.getItem("platform_tax_percentage");
      if (val !== null && !isNaN(Number(val))) return Number(val);
    } catch {}
  }
  return 5;
};

export const getStoredMarkupSettings = () => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const val = localStorage.getItem("platform_markup_settings");
      if (val) return JSON.parse(val);
    } catch {}
  }
  return DEFAULT_SETTINGS.markup;
};

const persistMarkupToStorage = (data) => {
  if (typeof window !== "undefined" && window.localStorage && data) {
    try {
      if (data.agencyPersonalGst !== undefined) {
        localStorage.setItem("platform_tax_percentage", String(data.agencyPersonalGst));
      } else if (data.taxPercentage !== undefined) {
        localStorage.setItem("platform_tax_percentage", String(data.taxPercentage));
      }
      localStorage.setItem("platform_markup_settings", JSON.stringify(data));
    } catch {}
  }
};

export const settingsApi = {
  /**
   * Universal section fetcher
   * Endpoints: /api/v1/crm/setting/:section -> /api/v1/crm/settings/:section -> /api/v1/settings/:section
   */
  async get(section = "general") {
    const canonical = `/api/v1/crm/setting/${section}`;
    const alias1 = `/api/v1/crm/settings/${section}`;
    const alias2 = `/api/v1/settings/${section}`;

    try {
      const response = await apiClient.get(canonical);
      return unwrapPayload(response, section);
    } catch {
      try {
        const res1 = await apiClient.get(alias1);
        return unwrapPayload(res1, section);
      } catch {
        try {
          const res2 = await apiClient.get(alias2);
          return unwrapPayload(res2, section);
        } catch {
          return DEFAULT_SETTINGS[section] || {};
        }
      }
    }
  },

  /**
   * Full upsert for a section (PUT)
   */
  async update(section, payload) {
    const canonical = `/api/v1/crm/setting/${section}`;
    const alias1 = `/api/v1/crm/settings/${section}`;
    const alias2 = `/api/v1/settings/${section}`;

    let response;
    try {
      response = await apiClient.put(canonical, payload);
    } catch {
      try {
        response = await apiClient.put(alias1, payload);
      } catch {
        response = await apiClient.put(alias2, payload);
      }
    }
    return unwrapPayload(response, section);
  },

  /**
   * Partial update for a section (PATCH)
   */
  async patch(section, payload) {
    const canonical = `/api/v1/crm/setting/${section}`;
    const alias1 = `/api/v1/crm/settings/${section}`;
    const alias2 = `/api/v1/settings/${section}`;

    let response;
    try {
      response = await apiClient.patch(canonical, payload);
    } catch {
      try {
        response = await apiClient.patch(alias1, payload);
      } catch {
        response = await apiClient.patch(alias2, payload);
      }
    }
    return unwrapPayload(response, section);
  },

  /**
   * Dedicated Commercial Markup Fetcher
   * Endpoint: GET /api/v1/crm/setting/markup
   */
  async getMarkup(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && cachedMarkup && now - lastMarkupFetch < CACHE_TTL_MS) {
      return cachedMarkup;
    }

    try {
      const response = await apiClient.get("/api/v1/crm/setting/markup");
      const data = unwrapPayload(response, "markup");
      cachedMarkup = { ...DEFAULT_SETTINGS.markup, ...data };
      lastMarkupFetch = now;
      persistMarkupToStorage(cachedMarkup);
      return cachedMarkup;
    } catch {
      try {
        const alt = await apiClient.get("/api/v1/crm/settings/markup");
        const data = unwrapPayload(alt, "markup");
        cachedMarkup = { ...DEFAULT_SETTINGS.markup, ...data };
        lastMarkupFetch = now;
        persistMarkupToStorage(cachedMarkup);
        return cachedMarkup;
      } catch {
        try {
          const leg = await apiClient.get("/api/v1/crm/markup");
          const data = unwrapPayload(leg, "markup");
          cachedMarkup = { ...DEFAULT_SETTINGS.markup, ...data };
          lastMarkupFetch = now;
          persistMarkupToStorage(cachedMarkup);
          return cachedMarkup;
        } catch {
          return getStoredMarkupSettings();
        }
      }
    }
  },

  /**
   * Dedicated Commercial Markup Updater (POST/PUT)
   * Endpoint: POST / PUT /api/v1/crm/setting/markup
   */
  async updateMarkup(payload) {
    const body = {
      flightMarkupPercent: Math.min(100, Math.max(0, Number(payload.flightMarkupPercent ?? 2.5))),
      hotelMarkupPercent: Math.min(100, Math.max(0, Number(payload.hotelMarkupPercent ?? 5.0))),
      defaultMarkupPercent: Math.min(100, Math.max(0, Number(payload.defaultMarkupPercent ?? 5.0))),
      currency: String(payload.currency || "INR").trim().toUpperCase(),
    };

    let updated = null;
    try {
      const response = await apiClient.post("/api/v1/crm/setting/markup", body);
      updated = unwrapPayload(response, "markup");
    } catch {
      try {
        const putRes = await apiClient.put("/api/v1/crm/setting/markup", body);
        updated = unwrapPayload(putRes, "markup");
      } catch {
        try {
          const altRes = await apiClient.post("/api/v1/crm/settings/markup", body);
          updated = unwrapPayload(altRes, "markup");
        } catch {
          // fallback
        }
      }
    }

    cachedMarkup = { ...DEFAULT_SETTINGS.markup, ...body, ...(updated || {}) };
    lastMarkupFetch = Date.now();
    persistMarkupToStorage(cachedMarkup);

    if (typeof window !== "undefined" && window.dispatchEvent) {
      try {
        window.dispatchEvent(new CustomEvent("maqam:markup-updated", { detail: cachedMarkup }));
      } catch {}
    }

    return cachedMarkup;
  },

  /**
   * Dedicated Commercial Markup Partial Updater (PATCH)
   * Endpoint: PATCH /api/v1/crm/setting/markup
   */
  async patchMarkup(payload) {
    let updated = null;
    try {
      const response = await apiClient.patch("/api/v1/crm/setting/markup", payload);
      updated = unwrapPayload(response, "markup");
    } catch {
      try {
        const altRes = await apiClient.patch("/api/v1/crm/settings/markup", payload);
        updated = unwrapPayload(altRes, "markup");
      } catch {}
    }

    cachedMarkup = { ...(cachedMarkup || DEFAULT_SETTINGS.markup), ...(updated || payload) };
    lastMarkupFetch = Date.now();
    persistMarkupToStorage(cachedMarkup);
    return cachedMarkup;
  },

  /**
   * Dedicated Agency Personal GST Fetcher
   * Endpoint: GET /api/v1/crm/setting/agency-gst (or /gst)
   */
  async getAgencyGst() {
    try {
      const response = await apiClient.get("/api/v1/crm/setting/agency-gst");
      return unwrapPayload(response, "agencyGst");
    } catch {
      try {
        const aliasRes = await apiClient.get("/api/v1/crm/setting/gst");
        return unwrapPayload(aliasRes, "agencyGst");
      } catch {
        return DEFAULT_SETTINGS.agencyGst;
      }
    }
  },

  /**
   * Dedicated Agency Personal GST Applier (POST)
   * Endpoint: POST /api/v1/crm/setting/agency-gst (or /gst)
   * Deactivates legacy split taxes and applies clean 5% Personal GST.
   */
  async applyAgencyGst(rate = 5) {
    const body = {
      agencyPersonalGst: Math.min(100, Math.max(0, Number(rate) || 5)),
    };

    let response;
    try {
      response = await apiClient.post("/api/v1/crm/setting/agency-gst", body);
    } catch {
      try {
        response = await apiClient.post("/api/v1/crm/setting/gst", body);
      } catch {
        try {
          response = await apiClient.post("/api/v1/crm/settings/agency-gst", body);
        } catch {
          // fallback
        }
      }
    }

    const unwrapped = unwrapPayload(response, "agencyGst");
    const result = {
      agencyPersonalGst: Number(unwrapped.agencyPersonalGst ?? body.agencyPersonalGst),
      isPersonalGstApplied: true,
      currency: unwrapped.currency || "INR",
    };

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem("platform_tax_percentage", String(result.agencyPersonalGst));
        window.dispatchEvent(new CustomEvent("maqam:gst-updated", { detail: result }));
      } catch {}
    }

    return result;
  },
};
