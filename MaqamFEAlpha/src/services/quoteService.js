import { QuoteAPI } from "../configs/api.js";
import { tokenService, getStoredAuthToken } from "../admin/services/tokenService.js";

const STORAGE_KEY = "maqam_customer_quotes";

/**
 * Stage configuration metadata for consistent UI representation
 */
export const STAGE_CONFIG = {
  under_review: {
    label: "Under Specialist Review",
    shortLabel: "Under Review",
    tone: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50",
    dotTone: "bg-amber-500",
    description: "Our travel specialist is tailoring your itinerary and pricing.",
  },
  quote_ready: {
    label: "Proposal Ready",
    shortLabel: "Proposal Ready",
    tone: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50",
    dotTone: "bg-purple-500",
    description: "A quote proposal has been issued! Please review price, inclusions and respond.",
  },
  accepted: {
    label: "Proposal Accepted",
    shortLabel: "Accepted",
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50",
    dotTone: "bg-emerald-500",
    description: "You accepted this proposal. Our team is finalizing your booking confirmation.",
  },
  revision_requested: {
    label: "Revision Requested",
    shortLabel: "Revision Requested",
    tone: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/50",
    dotTone: "bg-sky-500",
    description: "Your requested changes were forwarded to the specialist. An updated proposal will arrive shortly.",
  },
  expired: {
    label: "Proposal Expired",
    shortLabel: "Expired",
    tone: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
    dotTone: "bg-slate-400",
    description: "This proposal reached its expiry date. You can request a fresh revision.",
  },
  booked: {
    label: "Confirmed Booking",
    shortLabel: "Booked",
    tone: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-700",
    dotTone: "bg-emerald-600",
    description: "Booking confirmed! View your reservation under My Bookings.",
  },
  closed: {
    label: "Closed",
    shortLabel: "Closed",
    tone: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50",
    dotTone: "bg-rose-500",
    description: "This quotation request is closed.",
  },
};

/**
 * Normalizes customer-side quotation schema across API and cached formats
 */
export function normalizeCustomerQuote(raw) {
  if (!raw || typeof raw !== "object") return null;

  const id = raw.id || raw._id;
  const reference = raw.reference || raw.quoteReference || `QT-${String(id || "").slice(-6).toUpperCase()}`;

  // Contact info extraction
  const contact = raw.contact || {};
  const firstName = raw.firstName || contact.firstName || "";
  const lastName = raw.lastName || contact.lastName || "";
  const name =
    raw.name ||
    contact.name ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    "Customer";
  const email = raw.email || contact.email || "";
  const phone = raw.phone || contact.phone || "";

  // Pricing & quote offer extraction
  const quoteObj = raw.quote || {};
  const price = Number(quoteObj.price || raw.quotedPrice || raw.price || 0);
  const currency = quoteObj.currency || raw.currency || "INR";
  const expiresAt = quoteObj.expiresAt || raw.quoteExpiresAt || raw.expiresAt || null;
  const isExpired =
    quoteObj.isExpired !== undefined
      ? quoteObj.isExpired
      : Boolean(expiresAt && new Date(expiresAt).getTime() < Date.now());

  // Customer stage
  let stage = raw.stage || raw.status || "under_review";
  if (stage === "proposal_sent" || stage === "quoted" || stage === "proposal") {
    stage = isExpired ? "expired" : "quote_ready";
  } else if (stage === "won" || stage === "converted") {
    stage = "booked";
  } else if (stage === "lost") {
    stage = "closed";
  } else if (stage === "negotiation" || stage === "negotiating") {
    stage = "revision_requested";
  }

  // Customer response object (null if no valid action has been submitted)
  const customerResponse =
    raw.customerResponse && raw.customerResponse.action
      ? {
          action: raw.customerResponse.action,
          note: raw.customerResponse.note || "",
          respondedAt: raw.customerResponse.respondedAt || null,
        }
      : null;

  // Stage overrides based on customer response
  if (customerResponse?.action === "accepted") {
    stage = "accepted";
  } else if (customerResponse?.action === "changes_requested") {
    stage = "revision_requested";
  } else if (customerResponse?.action === "rejected") {
    stage = "closed";
  }

  // Available actions
  const availableActions = Array.isArray(raw.availableActions) && raw.availableActions.length > 0
    ? raw.availableActions
    : price > 0 && (stage === "quote_ready" || stage === "proposal_sent") && !customerResponse
    ? ["accepted", "rejected", "changes_requested"]
    : [];

  // Timeline
  const timeline = Array.isArray(raw.timeline)
    ? raw.timeline.map((item, idx) => ({
        id: item.id || `T${idx}`,
        type: item.type || "created",
        title: item.title || "Quotation update",
        detail: item.detail || "",
        createdAt: item.createdAt || new Date().toISOString(),
      }))
    : [];

  return {
    ...raw,
    id,
    _id: id,
    reference,
    stage,
    destination: raw.destination || "Makkah & Madinah",
    tripType: raw.tripType || "Umrah",
    travelDates: {
      from: raw.travelDates?.from || raw.travelFrom || null,
      to: raw.travelDates?.to || raw.travelTo || null,
    },
    numberOfPeople: Number(raw.numberOfPeople || raw.travelers || 2),
    budget: Number(raw.budget || 0),
    specialRequests: raw.specialRequests || raw.query || raw.notes || "",
    contact: {
      firstName,
      lastName,
      name,
      email,
      phone,
    },
    quote:
      price > 0
        ? {
            price,
            currency,
            expiresAt,
            isExpired,
            notes: raw.quoteNotes || quoteObj.notes || "",
          }
        : null,
    quotedPrice: price,
    quoteExpiresAt: expiresAt,
    customerResponse,
    availableActions,
    timeline,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

/**
 * Retrieve cached local quotes from localStorage
 */
export function getLocalSavedQuotes() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeCustomerQuote).filter(Boolean) : [];
  } catch (err) {
    console.warn("Could not read local quotes:", err);
    return [];
  }
}

/**
 * Save / Update quote in localStorage cache
 */
export function saveLocalQuote(quote) {
  if (typeof window === "undefined" || !quote) return;
  try {
    const normalized = normalizeCustomerQuote(quote);
    if (!normalized?.id && !normalized?.reference) return;

    const list = getLocalSavedQuotes();
    const existingIndex = list.findIndex(
      (q) =>
        (normalized.id && (q.id === normalized.id || q._id === normalized.id)) ||
        (normalized.reference && q.reference === normalized.reference)
    );

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...normalized };
    } else {
      list.unshift(normalized);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
  } catch (err) {
    console.warn("Could not save quote locally:", err);
  }
}

/**
 * Helper to get active auth token
 */
function getAuthHeaders() {
  const token = getStoredAuthToken() || tokenService.getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const quoteService = {
  /**
   * 1. Submit a Trip Quotation Request (Public or Authenticated)
   * POST /api/v1/quotes/request
   */
  async requestQuote(quoteData) {
    const payload = {
      firstName: quoteData.firstName?.trim() || "",
      lastName: quoteData.lastName?.trim() || "",
      email: quoteData.email?.trim() || "",
      phone: quoteData.phone?.trim() || "",
      destination: quoteData.destination?.trim() || "Makkah & Madinah",
      tripType: quoteData.tripType || "umrah",
      travelDates: {
        from: quoteData.travelDates?.from || quoteData.from || null,
        to: quoteData.travelDates?.to || quoteData.to || null,
      },
      numberOfPeople: Number(quoteData.numberOfPeople || quoteData.travelers || 2),
      budget: Number(quoteData.budget || 0),
      specialRequests: quoteData.specialRequests || quoteData.notes || "",
    };

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...getAuthHeaders(),
    };

    const res = await fetch(QuoteAPI.RequestQuoteApi, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg =
        data?.message ||
        data?.errors?.[0]?.message ||
        "Failed to submit quotation request. Please check all required fields.";
      throw new Error(errorMsg);
    }

    const rawQuote = data?.data?.quote || data?.quote || data?.data;
    const quote = normalizeCustomerQuote(rawQuote || { ...payload, createdAt: new Date().toISOString() });
    if (quote) {
      saveLocalQuote(quote);
    }

    return {
      success: true,
      message: data?.message || "Quotation request submitted successfully",
      quote,
    };
  },

  /**
   * 2. Track Quotation Status (Public Guest Lookup)
   * POST /api/v1/quotes/track
   */
  async trackQuote({ reference, phone }) {
    if (!reference?.trim()) {
      throw new Error("Quotation reference number is required (e.g. QT-A1B2C3D4)");
    }
    if (!phone?.trim()) {
      throw new Error("Registered phone number is required to track quotation");
    }

    const res = await fetch(QuoteAPI.TrackQuoteApi, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        reference: reference.trim().toUpperCase(),
        phone: phone.trim(),
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg =
        data?.message ||
        "Quotation not found. Please verify your reference number and registered phone number.";
      throw new Error(errorMsg);
    }

    const rawQuote = data?.data?.quote || data?.quote || data?.data;
    const quote = normalizeCustomerQuote(rawQuote);
    if (quote) {
      saveLocalQuote(quote);
    }

    return {
      success: true,
      message: data?.message || "Quotation status retrieved successfully",
      quote,
    };
  },

  /**
   * 3. List Customer's Quotations (Authenticated with fallback to cached quotes)
   * GET /api/v1/quotes/my
   */
  async getMyQuotes({ page = 1, limit = 10 } = {}) {
    const token = getStoredAuthToken() || tokenService.getAccessToken();

    if (token) {
      try {
        const query = new URLSearchParams({ page: String(page), limit: String(limit) });
        const res = await fetch(`${QuoteAPI.MyQuotesApi}?${query}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            ...getAuthHeaders(),
          },
        });

        if (res.ok) {
          const data = await res.json();
          const remoteList = Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.data?.quotes)
            ? data.data.quotes
            : [];

          const normalizedRemote = remoteList.map(normalizeCustomerQuote).filter(Boolean);

          // Merge and sync to local cache
          normalizedRemote.forEach((q) => saveLocalQuote(q));

          // Also merge any local quotes not yet on remote (e.g. guest submissions before login)
          const localList = getLocalSavedQuotes();
          const mergedMap = new Map();
          const knownIds = new Set();
          const knownRefs = new Set();

          normalizedRemote.forEach((q) => {
            if (q.id) knownIds.add(String(q.id));
            if (q.reference) knownRefs.add(String(q.reference).toUpperCase());
            mergedMap.set(q.id || q.reference, q);
          });

          localList.forEach((q) => {
            const hasId = q.id && knownIds.has(String(q.id));
            const hasRef = q.reference && knownRefs.has(String(q.reference).toUpperCase());
            if (!hasId && !hasRef) {
              if (q.id) knownIds.add(String(q.id));
              if (q.reference) knownRefs.add(String(q.reference).toUpperCase());
              mergedMap.set(q.id || q.reference, q);
            }
          });

          const allQuotes = Array.from(mergedMap.values());

          return {
            quotes: allQuotes,
            meta: data?.meta || {
              total: allQuotes.length,
              page: Number(page),
              limit: Number(limit),
              totalPages: Math.ceil(allQuotes.length / Number(limit)) || 1,
            },
          };
        }
      } catch (err) {
        console.warn("Remote quotes fetch failed, fallback to local:", err.message);
      }
    }

    // Unauthenticated or offline fallback
    const local = getLocalSavedQuotes();
    return {
      quotes: local,
      meta: {
        total: local.length,
        page: 1,
        limit: local.length || 10,
        totalPages: 1,
      },
    };
  },

  /**
   * 4. Get Single Quotation by ID (Authenticated)
   * GET /api/v1/quotes/my/:id
   */
  async getMyQuoteById(id) {
    if (!id) throw new Error("Quotation ID is required");

    const token = getStoredAuthToken() || tokenService.getAccessToken();
    if (token) {
      try {
        const res = await fetch(QuoteAPI.MyQuoteDetailApi(id), {
          method: "GET",
          headers: {
            Accept: "application/json",
            ...getAuthHeaders(),
          },
        });

        if (res.ok) {
          const data = await res.json();
          const raw = data?.data?.quote || data?.quote || data?.data;
          const quote = normalizeCustomerQuote(raw);
          if (quote) {
            saveLocalQuote(quote);
            return { quote };
          }
        }
      } catch (err) {
        console.warn("Remote quote detail fetch failed, checking local:", err.message);
      }
    }

    const localList = getLocalSavedQuotes();
    const found = localList.find((q) => q.id === id || q._id === id || q.reference === id);
    if (found) {
      return { quote: found };
    }

    throw new Error("Quotation details could not be found.");
  },

  /**
   * 5. Respond to a Quotation Proposal
   * POST /api/v1/quotes/my/:id/respond
   * action: 'accepted' | 'rejected' | 'changes_requested'
   */
  async respondToQuote(id, { action, note = "" }) {
    if (!id) throw new Error("Quotation ID is required");

    const validActions = ["accepted", "rejected", "changes_requested"];
    if (!validActions.includes(action)) {
      throw new Error(`Action must be one of: ${validActions.join(", ")}`);
    }

    const token = getStoredAuthToken() || tokenService.getAccessToken();

    if (token) {
      const res = await fetch(QuoteAPI.MyQuoteRespondApi(id), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          action,
          note: note?.trim() || "",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errorMsg =
          data?.message ||
          data?.errors?.[0]?.message ||
          "Failed to record your response. Please try again or contact customer care.";
        throw new Error(errorMsg);
      }

      const raw = data?.data?.quote || data?.quote || data?.data;
      const quote = normalizeCustomerQuote(raw);
      if (quote) {
        saveLocalQuote(quote);
      }

      return {
        success: true,
        message: data?.message || "Your response has been sent to your travel specialist.",
        quote,
      };
    }

    // Guest response fallback (updates local state so user can track it)
    const localList = getLocalSavedQuotes();
    const idx = localList.findIndex((q) => q.id === id || q._id === id || q.reference === id);
    if (idx >= 0) {
      const target = localList[idx];
      let newStage = "revision_requested";
      if (action === "accepted") newStage = "accepted";
      if (action === "rejected") newStage = "closed";

      const updated = {
        ...target,
        stage: newStage,
        customerResponse: {
          action,
          note: note?.trim() || "",
          respondedAt: new Date().toISOString(),
        },
        timeline: [
          ...(target.timeline || []),
          {
            id: `T${Date.now()}`,
            type: "customer_response",
            title: `Customer responded: ${action.replace("_", " ")}`,
            detail: note || `Customer responded with ${action}.`,
            createdAt: new Date().toISOString(),
          },
        ],
        updatedAt: new Date().toISOString(),
      };

      saveLocalQuote(updated);
      return {
        success: true,
        message: "Your response has been saved.",
        quote: updated,
      };
    }

    throw new Error("Unable to submit response. Please sign in or track the quotation.");
  },
};

export default quoteService;
