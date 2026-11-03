import { apiClient, liveFirst } from "../../services/apiClient.js";
import { leadsApi } from "../leads/leadsApi.js";

const CRM_QUOTES = "/api/v1/crm/quotes";
const ADMIN_QUOTES = "/api/v1/quotes/admin";

// Normalizes quote data to guarantee all required fields are present
export function normalizeQuote(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const id = raw._id || raw.id;
  const contact = raw.contact || {};
  const firstName = raw.firstName || contact.firstName || "";
  const lastName = raw.lastName || contact.lastName || "";
  const customerName =
    raw.name ||
    contact.name ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    "Customer";
  const email = raw.email || contact.email || "";
  const phone = raw.phone || contact.phone || "";

  const quoteObj = raw.quote || {};
  const quotedPrice = Number(
    raw.quotedPrice !== undefined && raw.quotedPrice !== null
      ? raw.quotedPrice
      : quoteObj.price !== undefined && quoteObj.price !== null
      ? quoteObj.price
      : raw.price || 0
  );
  const quoteExpiresAt =
    raw.quoteExpiresAt || quoteObj.expiresAt || raw.expiresAt || null;

  // Timeline & dialogue notes
  const timeline = Array.isArray(raw.timeline) ? raw.timeline : [];
  const dialogueEvents = timeline.filter(
    (t) => t.type === "conversation_note" || t.type === "note" || t.type === "call" || t.channel
  );
  const latestDialogue = dialogueEvents.length > 0 ? dialogueEvents[dialogueEvents.length - 1] : null;

  const quoteNotes =
    raw.conversationNote ||
    raw.quoteNotes ||
    (raw.notes && raw.notes !== raw.specialRequests ? raw.notes : "") ||
    quoteObj.notes ||
    latestDialogue?.detail ||
    latestDialogue?.notes ||
    "";
  const conversationChannel = raw.conversationChannel || latestDialogue?.channel || (quoteNotes ? "Call" : null);

  // Customer response extraction
  const rawCustomerResponse = raw.customerResponse || {};
  const customerResponse = rawCustomerResponse.action
    ? {
        action: rawCustomerResponse.action,
        note: rawCustomerResponse.note || "",
        respondedAt: rawCustomerResponse.respondedAt || null,
      }
    : null;

  // Status mapping from stage / status / customerResponse
  let status = raw.status || raw.stage || (raw.assignedTo ? "proposal_sent" : "new");
  if (customerResponse?.action === "accepted") {
    status = "won";
  } else if (
    customerResponse?.action === "changes_requested" ||
    customerResponse?.action === "requested_discount" ||
    customerResponse?.action === "revision_requested"
  ) {
    status = "negotiation";
  } else if (customerResponse?.action === "rejected") {
    status = "lost";
  } else if (status === "under_review") {
    status = raw.assignedTo ? "proposal_sent" : "new";
  } else if (status === "quote_ready") {
    status = "proposal_sent";
  } else if (status === "revision_requested") {
    status = "negotiation";
  } else if (status === "booked") {
    status = "won";
  } else if (status === "closed") {
    status = "lost";
  }

  const quoteReference =
    raw.quoteReference || raw.reference || `QT-${String(id || "").slice(-6).toUpperCase()}`;

  const specialRequests = raw.specialRequests || raw.query || "";
  const query = raw.query || raw.specialRequests || "";

  return {
    ...raw,
    _id: id,
    id,
    customerName,
    firstName,
    lastName,
    email,
    phone,
    source: raw.source || "Website - Quote Request",
    tripType: raw.tripType || "umrah",
    destination: raw.destination || "Makkah & Madinah",
    travelDates: raw.travelDates || {
      from: raw.travelFrom || null,
      to: raw.travelTo || null,
    },
    numberOfPeople: Number(raw.numberOfPeople || raw.travelers || 2),
    budget: Number(raw.budget || 0),
    quotedPrice,
    quoteExpiresAt,
    quoteNotes,
    conversationNote: quoteNotes,
    conversationChannel,
    status,
    priority: raw.priority || "medium",
    quoteReference,
    reference: quoteReference,
    specialRequests,
    query,
    assignedAgent: raw.assignedAgent || null,
    assignedTo:
      typeof raw.assignedTo === "object"
        ? raw.assignedTo?._id
        : raw.assignedTo || (raw.assignedAgent?._id ?? null),
    customerResponse: customerResponse || {
      action: null,
      note: "",
      respondedAt: null,
    },
    timeline,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}


// Seed quotes representing realistic production leads matching the API contract
let localQuotes = [
  {
    _id: "66f1a2b3c4d5e6f7a8b9c0d1",
    firstName: "Bilal",
    lastName: "Habashi",
    email: "bilal.habashi@example.com",
    phone: "+919876543222",
    source: "Website - Quote Request",
    tripType: "umrah",
    destination: "Madinah Deluxe",
    travelDates: {
      from: "2026-11-10T00:00:00.000Z",
      to: "2026-11-20T00:00:00.000Z",
    },
    numberOfPeople: 2,
    budget: 200000,
    specialRequests: "Near Haram hotel, direct flights from Mumbai",
    status: "new",
    priority: "medium",
    quoteReference: "QT-UNH-8A9B",
    quotedPrice: 0,
    quoteExpiresAt: null,
    assignedAgent: null,
    assignedTo: null,
    customer: null,
    customerResponse: {
      action: null,
      note: "",
      respondedAt: null,
    },
    timeline: [
      {
        id: "T1728144000abc1",
        type: "created",
        title: "Quotation requested",
        detail: "Customer requested a quotation for Madinah Deluxe (2 traveller(s)). Ref QT-UNH-8A9B.",
        time: "5 Oct, 16:00",
        createdAt: "2026-10-05T16:00:00.000Z",
      },
    ],
    createdAt: "2026-10-05T16:00:00.000Z",
    updatedAt: "2026-10-05T16:00:00.000Z",
  },
  {
    _id: "66f1a2b3c4d5e6f7a8b9c0d2",
    firstName: "Tariq",
    lastName: "Ziyad",
    email: "tariq.ziyad@example.com",
    phone: "+919876543211",
    source: "Website - Quote Request",
    tripType: "umrah",
    destination: "Makkah & Madinah",
    travelDates: {
      from: "2026-11-10T00:00:00.000Z",
      to: "2026-11-20T00:00:00.000Z",
    },
    numberOfPeople: 4,
    budget: 350000,
    specialRequests: "2 quadruple rooms near Clock Tower, private transfers",
    status: "proposal_sent",
    priority: "high",
    quoteReference: "QT-ADM-7F3A",
    quotedPrice: 340000,
    quoteExpiresAt: "2026-11-12T23:59:59.000Z",
    assignedAgent: {
      _id: "651234567890abcdef123456",
      firstName: "TravelSpecialist",
      lastName: "Agent",
      email: "travel.specialist@maqamtravels.com",
      phone: "+919200000000",
      role: "sales_agent",
    },
    assignedTo: "651234567890abcdef123456",
    customer: null,
    customerResponse: {
      action: null,
      note: "",
      respondedAt: null,
    },
    timeline: [
      {
        id: "T1728144000abc1",
        type: "created",
        title: "Quotation requested",
        detail: "Customer requested a quotation for Makkah & Madinah (4 traveller(s)). Ref QT-ADM-7F3A.",
        time: "5 Oct, 16:00",
        createdAt: "2026-10-05T16:00:00.000Z",
      },
      {
        id: "T1728144300def2",
        type: "assigned",
        title: "Assigned to travel specialist",
        detail: "Quotation lead assigned to travel specialist TravelSpecialist Agent.",
        time: "5 Oct, 16:05",
        createdAt: "2026-10-05T16:05:00.000Z",
      },
      {
        id: "T1728144600ghi3",
        type: "quote_sent",
        title: "Quotation sent to customer",
        detail: "Quotation proposal issued to customer for INR 3,40,000.00. Notes: Includes 5-star hotel near Haram and private VIP transfers.",
        time: "5 Oct, 16:10",
        createdAt: "2026-10-05T16:10:00.000Z",
      },
    ],
    createdAt: "2026-10-05T16:00:00.000Z",
    updatedAt: "2026-10-05T16:10:00.000Z",
  },
  {
    _id: "66f1a2b3c4d5e6f7a8b9c0d3",
    firstName: "Fatima",
    lastName: "Al-Zahra",
    email: "fatima.zahra@example.com",
    phone: "+919876543344",
    source: "Website - Quote Request",
    tripType: "umrah",
    destination: "VIP Ramadan Umrah",
    travelDates: {
      from: "2026-12-01T00:00:00.000Z",
      to: "2026-12-15T00:00:00.000Z",
    },
    numberOfPeople: 3,
    budget: 450000,
    specialRequests: "Kaaba view suites, direct business class flights",
    status: "negotiation",
    priority: "high",
    quoteReference: "QT-NEG-3C9D",
    quotedPrice: 435000,
    quoteExpiresAt: "2026-11-20T23:59:59.000Z",
    assignedAgent: {
      _id: "651234567890abcdef123456",
      firstName: "TravelSpecialist",
      lastName: "Agent",
      email: "travel.specialist@maqamtravels.com",
      phone: "+919200000000",
      role: "sales_agent",
    },
    assignedTo: "651234567890abcdef123456",
    customer: null,
    customerResponse: {
      action: "requested_discount",
      note: "Customer requested 5% group discount for direct booking",
      respondedAt: "2026-10-06T11:00:00.000Z",
    },
    timeline: [
      {
        id: "T1728200000a1",
        type: "created",
        title: "Quotation requested",
        detail: "Customer requested VIP Ramadan Umrah package for 3 pax.",
        time: "6 Oct, 09:30",
        createdAt: "2026-10-06T09:30:00.000Z",
      },
      {
        id: "T1728200500b2",
        type: "quote_sent",
        title: "Proposal dispatched",
        detail: "Quotation proposal issued for INR 4,35,000.00.",
        time: "6 Oct, 10:15",
        createdAt: "2026-10-06T10:15:00.000Z",
      },
    ],
    createdAt: "2026-10-06T09:30:00.000Z",
    updatedAt: "2026-10-06T11:00:00.000Z",
  },
  {
    _id: "66f1a2b3c4d5e6f7a8b9c0d4",
    firstName: "Omar",
    lastName: "Farooq",
    email: "omar.farooq@example.com",
    phone: "+919876543455",
    source: "Website - Custom Package Quote",
    tripType: "hajj",
    destination: "Executive Hajj & Umrah",
    travelDates: {
      from: "2027-05-15T00:00:00.000Z",
      to: "2027-06-05T00:00:00.000Z",
    },
    numberOfPeople: 6,
    budget: 900000,
    specialRequests: "All family suite, elderly wheelchair assistance",
    status: "won",
    priority: "high",
    quoteReference: "QT-WON-5E1B",
    quotedPrice: 875000,
    quoteExpiresAt: "2026-10-01T23:59:59.000Z",
    assignedAgent: {
      _id: "651234567890abcdef123456",
      firstName: "TravelSpecialist",
      lastName: "Agent",
      email: "travel.specialist@maqamtravels.com",
      phone: "+919200000000",
      role: "sales_agent",
    },
    assignedTo: "651234567890abcdef123456",
    customer: {
      _id: "66f1a2b3c4d5e6f7a8b9c999",
      name: "Omar Farooq",
      email: "omar.farooq@example.com",
    },
    customerResponse: {
      action: "accepted",
      note: "Accepted quotation terms and paid booking advance.",
      respondedAt: "2026-10-04T14:30:00.000Z",
    },
    timeline: [
      {
        id: "T1728000000w1",
        type: "created",
        title: "Quotation requested",
        detail: "Family group inquiry for 6 pax.",
        time: "3 Oct, 11:00",
        createdAt: "2026-10-03T11:00:00.000Z",
      },
      {
        id: "T1728010000w2",
        type: "quote_sent",
        title: "Proposal issued",
        detail: "Quotation proposal issued for INR 8,75,000.00.",
        time: "3 Oct, 15:00",
        createdAt: "2026-10-03T15:00:00.000Z",
      },
      {
        id: "T1728050000w3",
        type: "won",
        title: "Deal closed (Won)",
        detail: "Customer accepted proposal and confirmed booking.",
        time: "4 Oct, 14:30",
        createdAt: "2026-10-04T14:30:00.000Z",
      },
    ],
    createdAt: "2026-10-03T11:00:00.000Z",
    updatedAt: "2026-10-04T14:30:00.000Z",
  },
  {
    _id: "66f1a2b3c4d5e6f7a8b9c0d5",
    firstName: "Zainab",
    lastName: "Khatun",
    email: "zainab.khatun@example.com",
    phone: "+919876543566",
    source: "Website - Quote Request",
    tripType: "umrah",
    destination: "Economy Umrah Express",
    travelDates: {
      from: "2026-11-25T00:00:00.000Z",
      to: "2026-12-05T00:00:00.000Z",
    },
    numberOfPeople: 2,
    budget: 150000,
    specialRequests: "Affordable 3-star hotel within 10 min walk",
    status: "unhandled",
    priority: "low",
    quoteReference: "QT-UNH-4A7C",
    quotedPrice: 0,
    quoteExpiresAt: null,
    assignedAgent: null,
    assignedTo: null,
    customer: null,
    customerResponse: {
      action: null,
      note: "",
      respondedAt: null,
    },
    timeline: [
      {
        id: "T1728250000u1",
        type: "created",
        title: "Quotation requested",
        detail: "Customer requested economy quote for 2 travellers.",
        time: "6 Oct, 18:20",
        createdAt: "2026-10-06T18:20:00.000Z",
      },
    ],
    createdAt: "2026-10-06T18:20:00.000Z",
    updatedAt: "2026-10-06T18:20:00.000Z",
  },
  {
    _id: "66f1a2b3c4d5e6f7a8b9c0d6",
    firstName: "Mansur",
    lastName: "Ali",
    email: "mansur.ali@example.com",
    phone: "+919876543677",
    source: "Website - Quote Request",
    tripType: "umrah",
    destination: "Standard 10-Day Umrah",
    travelDates: {
      from: "2026-10-20T00:00:00.000Z",
      to: "2026-10-30T00:00:00.000Z",
    },
    numberOfPeople: 1,
    budget: 90000,
    specialRequests: "Single sharing room",
    status: "lost",
    priority: "low",
    quoteReference: "QT-LST-2F8A",
    quotedPrice: 105000,
    quoteExpiresAt: "2026-10-10T23:59:59.000Z",
    assignedAgent: {
      _id: "651234567890abcdef123456",
      firstName: "TravelSpecialist",
      lastName: "Agent",
      email: "travel.specialist@maqamtravels.com",
      phone: "+919200000000",
      role: "sales_agent",
    },
    assignedTo: "651234567890abcdef123456",
    customer: null,
    customerResponse: {
      action: "declined",
      note: "Price exceeded client budget limit. Booked alternative.",
      respondedAt: "2026-10-05T12:00:00.000Z",
    },
    timeline: [
      {
        id: "T1728100000l1",
        type: "created",
        title: "Quotation requested",
        detail: "Single traveller inquiry.",
        time: "4 Oct, 10:00",
        createdAt: "2026-10-04T10:00:00.000Z",
      },
      {
        id: "T1728110000l2",
        type: "lost",
        title: "Deal closed (Lost)",
        detail: "Quotation declined by client.",
        time: "5 Oct, 12:00",
        createdAt: "2026-10-05T12:00:00.000Z",
      },
    ],
    createdAt: "2026-10-04T10:00:00.000Z",
    updatedAt: "2026-10-05T12:00:00.000Z",
  },
].map(normalizeQuote);

function delay(ms = 120) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const quotesApi = {
  /**
   * 1. List All Quotations with Search, Filters & Pagination
   * GET /api/v1/crm/quotes or /api/v1/quotes/admin
   */
  async list(params = {}) {
    return liveFirst(
      async () => {
        let response;
        const liveParams = { ...params };
        // Clean empty/all filters so backend receives only valid criteria
        Object.keys(liveParams).forEach((k) => {
          if (liveParams[k] === "" || liveParams[k] === "all" || liveParams[k] === null || liveParams[k] === undefined) {
            delete liveParams[k];
          }
        });

        try {
          response = await apiClient.get(CRM_QUOTES, { params: liveParams });
        } catch (err) {
          if (err?.response?.status === 404) {
            response = await apiClient.get(ADMIN_QUOTES, { params: liveParams });
          } else {
            throw err;
          }
        }

        const data = response?.data?.data || response?.data || {};
        const rawList = Array.isArray(data.quotations)
          ? data.quotations
          : Array.isArray(data)
          ? data
          : [];

        const quotations = rawList.map(normalizeQuote);
        const pagination = data.pagination || {
          total: quotations.length,
          page: Number(params.page || 1),
          limit: Number(params.limit || 20),
          totalPages: Math.ceil(quotations.length / Number(params.limit || 20)) || 1,
        };

        return {
          quotations,
          pagination,
        };
      },
      async () => {
        await delay();
        const {
          status,
          agentId,
          assignedTo,
          fromDate,
          toDate,
          search = "",
          page = 1,
          limit = 20,
        } = params;

        const q = String(search || "").trim().toLowerCase();
        const agentFilter = agentId || assignedTo;

        const filtered = localQuotes.filter((item) => {
          // Status filter
          if (status && status !== "all") {
            if (status === "unhandled") {
              if (item.status !== "unhandled" && item.assignedTo) return false;
            } else if (item.status !== status) {
              return false;
            }
          }

          // Agent filter
          if (agentFilter && agentFilter !== "all") {
            if (agentFilter === "unhandled" || agentFilter === "unassigned") {
              if (item.assignedTo) return false;
            } else {
              const currentAgentId =
                typeof item.assignedTo === "object"
                  ? item.assignedTo?._id
                  : item.assignedTo;
              if (currentAgentId !== agentFilter) return false;
            }
          }

          // Date filters
          if (fromDate) {
            const itemDate = (item.createdAt || "").slice(0, 10);
            if (itemDate < fromDate) return false;
          }
          if (toDate) {
            const itemDate = (item.createdAt || "").slice(0, 10);
            if (itemDate > toDate) return false;
          }

          // Search in customer name, email, phone, destination, quoteReference
          if (q) {
            const haystack = `${item.customerName} ${item.firstName} ${item.lastName} ${item.email} ${item.phone} ${item.destination} ${item.quoteReference}`.toLowerCase();
            if (!haystack.includes(q)) return false;
          }

          return true;
        });

        // Pagination
        const p = Math.max(1, Number(page));
        const l = Math.min(100, Math.max(1, Number(limit)));
        const startIndex = (p - 1) * l;
        const paged = filtered.slice(startIndex, startIndex + l);

        return {
          quotations: paged,
          pagination: {
            total: filtered.length,
            page: p,
            limit: l,
            totalPages: Math.ceil(filtered.length / l) || 1,
          },
        };
      }
    );
  },

  /**
   * Helper: Locate local quote index by ID or linked lead ID
   */
  findQuoteIndex(id) {
    if (!id) return -1;
    const cleanId = String(id).replace(/^quote-lead-/, "");
    return localQuotes.findIndex(
      (q) =>
        q._id === id ||
        q.id === id ||
        q.leadId === id ||
        q.lead?._id === id ||
        q._id === cleanId ||
        q.id === cleanId ||
        q.leadId === cleanId ||
        q.lead?._id === cleanId
    );
  },

  /**
   * Helper: Ensure quotation exists locally or generate from lead
   */
  async ensureLocalQuote(id) {
    let idx = this.findQuoteIndex(id);
    if (idx !== -1) return idx;

    const cleanId = String(id).replace(/^quote-lead-/, "");
    try {
      const lead = await leadsApi.getById(cleanId);
      if (lead) {
        const draft = normalizeQuote({
          _id: `quote-lead-${lead._id || lead.id}`,
          id: `quote-lead-${lead._id || lead.id}`,
          leadId: lead._id || lead.id,
          customerName: lead.name || [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Customer",
          firstName: lead.firstName || "",
          lastName: lead.lastName || "",
          phone: lead.phone || "",
          email: lead.email || "",
          source: lead.source || "CRM Lead",
          tripType: lead.tripType || "umrah",
          destination: lead.destination || "Makkah & Madinah",
          travelDates: lead.travelDates || {
            from: lead.travelFrom || null,
            to: lead.travelTo || null,
          },
          numberOfPeople: Number(lead.travelers || lead.numberOfPeople || 2),
          budget: Number(lead.budget || 0),
          quotedPrice: Number(lead.quotedPrice || 0),
          status: lead.status === "proposal" || lead.status === "proposal_sent" ? "proposal_sent" : "new",
          specialRequests: lead.query || lead.specialRequests || "",
          quoteNotes: lead.contactNotes || lead.notes || "",
          customerResponse: lead.customerResponse,
          assignedTo: typeof lead.assignedTo === "object" ? lead.assignedTo?._id : lead.assignedTo,
          timeline: Array.isArray(lead.timeline) ? [...lead.timeline] : [],
          createdAt: lead.createdAt || new Date().toISOString(),
        });
        localQuotes.unshift(draft);
        return 0;
      }
    } catch {
      // Lead lookup failed
    }
    return -1;
  },

  /**
   * Create or register quotation directly from Lead
   */
  createFromLead(lead) {
    if (!lead) throw new Error("Lead data is required");
    const leadId = lead._id || lead.id;
    const existingIdx = this.findQuoteIndex(leadId);
    if (existingIdx !== -1) {
      return localQuotes[existingIdx];
    }

    const draft = normalizeQuote({
      _id: `quote-lead-${leadId}`,
      id: `quote-lead-${leadId}`,
      leadId,
      customerName: lead.name || [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Customer",
      firstName: lead.firstName || "",
      lastName: lead.lastName || "",
      phone: lead.phone || "",
      email: lead.email || "",
      source: lead.source || "CRM Lead",
      tripType: lead.tripType || "umrah",
      destination: lead.destination || "Makkah & Madinah",
      travelDates: lead.travelDates || {
        from: lead.travelFrom || null,
        to: lead.travelTo || null,
      },
      numberOfPeople: Number(lead.travelers || lead.numberOfPeople || 2),
      budget: Number(lead.budget || 0),
      quotedPrice: Number(lead.quotedPrice || 0),
      status: lead.status === "proposal" || lead.status === "proposal_sent" ? "proposal_sent" : "new",
      specialRequests: lead.query || lead.specialRequests || "",
      quoteNotes: lead.contactNotes || lead.notes || "",
      customerResponse: lead.customerResponse,
      assignedTo: typeof lead.assignedTo === "object" ? lead.assignedTo?._id : lead.assignedTo,
      timeline: Array.isArray(lead.timeline) ? [...lead.timeline] : [],
      createdAt: lead.createdAt || new Date().toISOString(),
    });
    localQuotes.unshift(draft);
    return draft;
  },

  /**
   * 2. Get Single Quotation Details
   * GET /api/v1/crm/quotes/:id or /api/v1/quotes/admin/:id
   */
  async getById(id) {
    if (!id) throw new Error("Quotation ID is required");
    return liveFirst(
      async () => {
        let response;
        try {
          response = await apiClient.get(`${CRM_QUOTES}/${id}`);
        } catch (err) {
          if (err?.response?.status === 404) {
            try {
              response = await apiClient.get(`${ADMIN_QUOTES}/${id}`);
            } catch {
              // Try resolving via lead
              const cleanId = String(id).replace(/^quote-lead-/, "");
              const lead = await leadsApi.getById(cleanId);
              if (lead) {
                return { quotation: this.createFromLead(lead) };
              }
              throw err;
            }
          } else {
            throw err;
          }
        }
        const data = response?.data?.data || response?.data || {};
        const quotation = normalizeQuote(data.quotation || data);
        return { quotation };
      },
      async () => {
        await delay(80);
        const idx = await this.ensureLocalQuote(id);
        if (idx === -1) throw new Error("Quotation not found");
        return { quotation: { ...localQuotes[idx] } };
      }
    );
  },

  /**
   * 3. Assign Unhandled Quotation to Specialist
   * POST /api/v1/crm/quotes/:id/assign
   */
  async assign(id, { agentId, agentName, agentEmail }) {
    if (!id) throw new Error("Quotation ID is required");
    if (!agentId) throw new Error("agentId is required to assign quotation");

    return liveFirst(
      async () => {
        let response;
        const payload = { agentId, assignedTo: agentId };
        try {
          response = await apiClient.post(`${CRM_QUOTES}/${id}/assign`, payload);
        } catch (err) {
          if (err?.response?.status === 404) {
            try {
              response = await apiClient.patch(`${CRM_QUOTES}/${id}/assign`, payload);
            } catch {
              response = await apiClient.post(`${ADMIN_QUOTES}/${id}/assign`, payload);
            }
          } else {
            throw err;
          }
        }
        const data = response?.data?.data || response?.data || {};
        const quotation = normalizeQuote(data.quotation || data);
        return { quotation };
      },
      async () => {
        await delay(120);
        const idx = await this.ensureLocalQuote(id);
        if (idx === -1) throw new Error("Quotation not found");

        const target = localQuotes[idx];
        const assignedAgentObj = {
          _id: agentId,
          firstName: (agentName || "Specialist").split(" ")[0] || "Specialist",
          lastName: (agentName || "Specialist").split(" ").slice(1).join(" ") || "Agent",
          email: agentEmail || "travel.specialist@maqamtravels.com",
          phone: "+919200000000",
          role: "sales_agent",
        };

        const newTimelineItem = {
          id: `T${Date.now()}`,
          type: "assigned",
          title: "Assigned to travel specialist",
          detail: `Quotation lead assigned to travel specialist ${agentName || "Travel Specialist"}.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: new Date().toISOString(),
        };

        const updated = {
          ...target,
          assignedAgent: assignedAgentObj,
          assignedTo: agentId,
          status: target.status === "unhandled" || target.status === "new" ? "proposal_sent" : target.status,
          timeline: [...(target.timeline || []), newTimelineItem],
          updatedAt: new Date().toISOString(),
        };

        localQuotes[idx] = updated;

        // Sync assignment to lead record if applicable
        if (target.leadId) {
          leadsApi.update(target.leadId, { assignedTo: agentId }).catch(() => {});
        }

        return { quotation: { ...updated } };
      }
    );
  },

  /**
   * 4. Send Quotation Proposal to Customer
   * POST /api/v1/crm/quotes/:id/send
   */
  async sendProposal(id, { quotedPrice, quoteExpiresAt, notes }) {
    if (!id) throw new Error("Quotation ID is required");
    const numPrice = Number(quotedPrice);
    if (!numPrice || numPrice <= 0) {
      throw new Error("A valid quotedPrice greater than 0 is required");
    }

    const payload = {
      quotedPrice: numPrice,
      price: numPrice,
      quoteExpiresAt: quoteExpiresAt || new Date(Date.now() + 7 * 86400000).toISOString(),
      notes: notes || "",
      sendEmail: true,
      sendWhatsapp: true,
    };

    return liveFirst(
      async () => {
        let response;
        try {
          response = await apiClient.post(`${CRM_QUOTES}/${id}/send`, payload);
        } catch (err) {
          if (err?.response?.status === 404) {
            try {
              response = await apiClient.put(`${CRM_QUOTES}/${id}/send`, payload);
            } catch {
              try {
                response = await apiClient.post(`${ADMIN_QUOTES}/${id}/send`, payload);
              } catch {
                // If it's a lead without a quote document, create quote or update lead
                const cleanId = String(id).replace(/^quote-lead-/, "");
                await leadsApi.update(cleanId, { quotedPrice: numPrice, status: "proposal" });
                response = await apiClient.post(`${CRM_QUOTES}`, {
                  leadId: cleanId,
                  quotedPrice: numPrice,
                  quoteExpiresAt: payload.quoteExpiresAt,
                  notes: payload.notes,
                });
              }
            }
          } else {
            throw err;
          }
        }
        const data = response?.data?.data || response?.data || {};
        const quotation = normalizeQuote(data.quotation || data);
        return { quotation };
      },
      async () => {
        await delay(150);
        const idx = await this.ensureLocalQuote(id);
        if (idx === -1) throw new Error("Quotation not found");

        const target = localQuotes[idx];
        const newTimelineItem = {
          id: `T${Date.now()}`,
          type: "quote_sent",
          title: "Quotation sent to customer",
          detail: `Quotation proposal issued to customer for INR ${numPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}. Notes: ${notes || "Standard package inclusions"}.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: new Date().toISOString(),
        };

        const updated = {
          ...target,
          status: "proposal_sent",
          quotedPrice: numPrice,
          quoteExpiresAt: payload.quoteExpiresAt,
          quoteNotes: notes || target.quoteNotes || "",
          timeline: [...(target.timeline || []), newTimelineItem],
          updatedAt: new Date().toISOString(),
        };

        localQuotes[idx] = updated;

        // Sync proposal price and stage back to lead in Leads & Sales
        const leadTargetId = target.leadId || (String(id).startsWith("quote-lead-") ? String(id).replace(/^quote-lead-/, "") : null);
        if (leadTargetId) {
          leadsApi
            .update(leadTargetId, { quotedPrice: numPrice, status: "proposal" })
            .catch(() => {});
        }

        return { quotation: { ...updated } };
      }
    );
  },

  /**
   * Helper: Update Quote Status (won / lost / negotiation)
   */
  async updateStatus(id, newStatus) {
    if (!id) throw new Error("Quotation ID is required");
    return liveFirst(
      async () => {
        const { data } = await apiClient.patch(`${CRM_QUOTES}/${id}`, { status: newStatus });
        return { quotation: normalizeQuote(data?.data?.quotation || data?.data || data) };
      },
      async () => {
        await delay(100);
        const idx = await this.ensureLocalQuote(id);
        if (idx === -1) throw new Error("Quotation not found");
        const target = localQuotes[idx];

        const updated = {
          ...target,
          status: newStatus,
          timeline: [
            ...(target.timeline || []),
            {
              id: `T${Date.now()}`,
              type: newStatus,
              title: `Status changed to ${newStatus}`,
              detail: `Quotation status updated to ${newStatus.toUpperCase()}.`,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              createdAt: new Date().toISOString(),
            },
          ],
          updatedAt: new Date().toISOString(),
        };
        localQuotes[idx] = updated;

        // Sync status to lead record if applicable
        if (target.leadId) {
          const leadStageMap = {
            won: "won",
            lost: "lost",
            negotiation: "negotiation",
            proposal_sent: "proposal",
            new: "new",
          };
          leadsApi
            .updateStatus(target.leadId, leadStageMap[newStatus] || newStatus)
            .catch(() => {});
        }

        return { quotation: { ...updated } };
      }
    );
  },

  /**
   * Add Conversation / Follow-up Note to Quotation
   * POST /api/v1/crm/quotes/:id/notes
   */
  async addNote(id, { note, channel = "Call", author = "Travel Specialist" }) {
    if (!id) throw new Error("Quotation ID is required");
    if (!note || !note.trim()) throw new Error("Note content is required");

    const cleanNote = note.trim();
    const cleanId = String(id).replace(/^quote-lead-/, "");
    return liveFirst(
      async () => {
        let response;
        try {
          response = await apiClient.post(`${CRM_QUOTES}/${id}/notes`, { note: cleanNote, channel, author });
        } catch (err) {
          if (err?.response?.status === 404) {
            try {
              response = await apiClient.post(`/api/v1/crm/leads/${cleanId}/notes`, { note: cleanNote, channel, author });
            } catch {
              response = await apiClient.patch(`${CRM_QUOTES}/${id}`, { quoteNotes: cleanNote });
            }
          } else {
            throw err;
          }
        }
        if (cleanId !== id) {
          apiClient.post(`/api/v1/crm/leads/${cleanId}/notes`, { note: cleanNote, channel, author }).catch(() => {});
        }
        const data = response?.data?.data || response?.data || {};
        const quotation = normalizeQuote(data.quotation || data.lead || data);
        return { quotation };
      },
      async () => {
        await delay(100);
        const idx = await this.ensureLocalQuote(id);
        if (idx === -1) throw new Error("Quotation not found");
        const target = localQuotes[idx];

        const newTimelineItem = {
          id: `T${Date.now()}`,
          type: "conversation_note",
          channel,
          author,
          title: `${channel} note logged`,
          detail: cleanNote,
          notes: cleanNote,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: new Date().toISOString(),
        };

        const updated = {
          ...target,
          quoteNotes: cleanNote,
          conversationNote: cleanNote,
          conversationChannel: channel,
          timeline: [...(target.timeline || []), newTimelineItem],
          updatedAt: new Date().toISOString(),
        };
        localQuotes[idx] = updated;

        // Sync note to lead timeline if applicable
        const leadTargetId = target.leadId || (String(id).startsWith("quote-lead-") ? cleanId : null);
        if (leadTargetId) {
          leadsApi
            .addNote(leadTargetId, { note: cleanNote, channel, author })
            .catch(() => {});
        }

        return { quotation: { ...updated } };
      }
    );
  },

  /**
   * Compute Summary KPIs
   */
  async getKpis() {
    return liveFirst(
      async () => {
        const { quotations } = await this.list({ limit: 100 });
        return this.computeKpisFromList(quotations);
      },
      async () => {
        await delay(50);
        return this.computeKpisFromList(localQuotes);
      }
    );
  },

  computeKpisFromList(quotes) {
    const list = Array.isArray(quotes) ? quotes : [];
    const total = list.length;
    const unhandled = list.filter(
      (q) => q.status === "unhandled" || (!q.assignedTo && q.status === "new")
    ).length;
    const proposalSent = list.filter((q) => q.status === "proposal_sent").length;
    const negotiation = list.filter((q) => q.status === "negotiation").length;
    const won = list.filter((q) => q.status === "won").length;
    const totalPipelineValue = list
      .filter((q) => !["lost"].includes(q.status))
      .reduce((sum, q) => sum + (q.quotedPrice || q.budget || 0), 0);

    return {
      total,
      unhandled,
      proposalSent,
      negotiation,
      won,
      totalPipelineValue,
    };
  },
};
