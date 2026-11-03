import { apiClient, liveFirst } from "../../services/apiClient.js";
import { cloneLeads } from "../../mocks/mockData.js";

// CRM lead management (spec Section 4). Real endpoints live under
// /api/v1/crm/leads with stage-based filtering; conversion creates a
// confirmed package booking. Mock branch stays as a live-failure fallback.
const CRM_ROOT = "/api/v1/crm/leads";

// Backend leads use the confirmed format (LEADS_API_GUIDE.md #2): firstName /
// lastName, travelDates, numberOfPeople, specialRequests. Normalize into the
// display shape (name, travelers, query, nextFollowUp) while keeping every
// original field, so mock and live data flow through the UI identically.
export function normalizeLead(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const id = raw.id || raw._id;
  const name =
    raw.name ||
    [raw.firstName, raw.lastName].filter(Boolean).join(" ").trim() ||
    "Lead Prospect";

  const specialRequests = raw.specialRequests || raw.query || "";
  const query = raw.query || raw.specialRequests || "";

  // Extract timeline dialogue events
  const timeline = Array.isArray(raw.timeline) ? raw.timeline : [];
  const dialogueEvents = timeline.filter(
    (t) =>
      t.type === "note" ||
      t.type === "conversation_note" ||
      t.type === "call" ||
      t.channel
  );
  const latestDialogue =
    dialogueEvents.length > 0 ? dialogueEvents[dialogueEvents.length - 1] : null;

  const contactNotes =
    raw.contactNotes ||
    (raw.notes && raw.notes !== specialRequests ? raw.notes : "") ||
    latestDialogue?.detail ||
    latestDialogue?.notes ||
    "";
  const conversationChannel =
    latestDialogue?.channel || (contactNotes ? "Call" : null);

  const rawCustomerResponse = raw.customerResponse || {};
  const customerResponse = rawCustomerResponse.action
    ? {
        action: rawCustomerResponse.action,
        note: rawCustomerResponse.note || "",
        respondedAt: rawCustomerResponse.respondedAt || null,
      }
    : raw.customerResponse || null;

  return {
    ...raw,
    id,
    _id: id,
    name,
    travelers: raw.travelers ?? raw.numberOfPeople,
    query,
    specialRequests,
    contactNotes,
    conversationNote: contactNotes,
    conversationChannel,
    customerResponse,
    notes: contactNotes || specialRequests || raw.notes || "",
    nextFollowUp: raw.nextFollowUp ?? raw.travelDates?.from ?? null,
    timeline,
  };
}

let localLeads = cloneLeads().map(normalizeLead);

function delay(ms = 180) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const leadsApi = {
  async list(params = {}) {
    return liveFirst(
      async () => {
        // GET /api/v1/crm/leads?stage=quoted — stage: new | contacted | quoted |
        // converted | lost. Map the UI "status" filter onto the stage param.
        const { stage, ...rest } = params;
        const { data } = await apiClient.get(CRM_ROOT, {
          params: { ...rest, stage: stage ?? (rest.status !== "all" ? rest.status : "") },
        });
        const rawList =
          data?.data?.leads ??
          data?.leads ??
          (Array.isArray(data?.data) ? data.data : []);
        const leads = rawList.map(normalizeLead);
        const pagination = data?.data?.pagination ?? data?.pagination ?? data?.meta ?? {};
        return {
          data: leads,
          meta: {
            total: pagination.total ?? leads.length,
            page: pagination.page ?? 1,
            pageSize: pagination.limit ?? leads.length,
          },
        };
      },
      async () => {
        await delay();
        const { search = "", status = "all", priority = "all", source = "all", assignedTo = "all" } = params;
        const q = search.trim().toLowerCase();

        const data = localLeads.filter((lead) => {
          const haystack = `${lead.name} ${lead.email} ${lead.phone} ${lead.destination} ${lead.tripType}`.toLowerCase();
          return (
            (!q || haystack.includes(q)) &&
            (status === "all" || lead.status === status) &&
            (priority === "all" || lead.priority === priority) &&
            (source === "all" || lead.source === source) &&
            (assignedTo === "all" || lead.assignedTo === assignedTo)
          );
        });

        return {
          data,
          meta: { total: data.length, page: 1, pageSize: data.length },
        };
      }
    );
  },

  async getById(id) {
    return liveFirst(
      async () => {
        const { data } = await apiClient.get(`${CRM_ROOT}/${id}`);
        return normalizeLead(data?.data?.lead ?? data?.lead ?? data?.data ?? data);
      },
      async () => {
        await delay();
        const lead = localLeads.find((item) => item.id === id);
        if (!lead) throw new Error("Lead not found.");
        return lead;
      }
    );
  },

  async create(payload) {
    return liveFirst(
      async () => {
        // POST /api/v1/crm/leads
        const { data } = await apiClient.post(CRM_ROOT, payload);
        return normalizeLead(data?.data?.lead ?? data?.lead ?? data?.data ?? data);
      },
      async () => {
        await delay();
        // Mock stores the lead in the real backend request format, then
        // normalizes it exactly like the live branch does.
        const lead = normalizeLead({
          _id: `LD-${1000 + localLeads.length + 1}`,
          createdAt: new Date().toISOString(),
          timeline: [],
          status: "new",
          priority: "medium",
          source: "Manual",
          ...payload,
        });
        localLeads = [lead, ...localLeads];
        return lead;
      }
    );
  },

  async update(id, payload) {
    return liveFirst(
      async () => {
        try {
          const { data } = await apiClient.patch(`${CRM_ROOT}/${id}`, payload);
          return normalizeLead(data?.data?.lead ?? data?.lead ?? data?.data ?? data);
        } catch (patchErr) {
          if (patchErr?.response?.status === 404 || patchErr?.response?.status === 405) {
            const { data } = await apiClient.put(`${CRM_ROOT}/${id}`, payload);
            return normalizeLead(data?.data?.lead ?? data?.lead ?? data?.data ?? data);
          }
          throw patchErr;
        }
      },
      async () => {
        await delay();
        let updated;
        localLeads = localLeads.map((lead) => {
          if (lead.id !== id && lead._id !== id) return lead;
          updated = normalizeLead({
            ...lead,
            ...payload,
            conversationNote: payload.contactNotes || payload.conversationNote || lead.conversationNote,
            contactNotes: payload.contactNotes || payload.conversationNote || lead.contactNotes,
          });
          return updated;
        });
        if (!updated) throw new Error("Lead not found.");
        return updated;
      }
    );
  },

  async updateStatus(id, status) {
    return this.update(id, { status });
  },

  async addNote(id, note) {
    const noteText = typeof note === "object" ? note.note : String(note || "");
    const channel = typeof note === "object" && note.channel ? note.channel : "Call";
    const author = typeof note === "object" && note.author ? note.author : "Sales Agent";

    return liveFirst(
      async () => {
        const payload = typeof note === "object" ? note : { note: noteText, channel, author };
        const { data } = await apiClient.post(`${CRM_ROOT}/${id}/notes`, payload);
        return normalizeLead(data?.data?.lead ?? data?.lead ?? data?.data ?? data);
      },
      async () => {
        await delay();
        const lead = localLeads.find((item) => item.id === id || item._id === id);
        if (!lead) throw new Error("Lead not found.");

        const entry = {
          id: `T-${Date.now()}`,
          type: "note",
          channel,
          author,
          title: `${channel} note logged`,
          detail: noteText,
          notes: noteText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: new Date().toISOString(),
        };

        lead.timeline = [...(lead.timeline || []), entry];
        lead.notes = noteText;
        lead.contactNotes = noteText;
        lead.conversationNote = noteText;
        lead.conversationChannel = channel;
        return lead;
      }
    );
  },

  async convertToCustomer(id, payload = {}) {
    return liveFirst(
      async () => {
        const { data } = await apiClient.post(`${CRM_ROOT}/${id}/convert`, payload);
        return normalizeLead(data?.data?.lead ?? data?.lead ?? data?.data ?? data);
      },
      async () => {
        await delay();
        return this.update(id, {
          status: "won",
          convertedAt: new Date().toISOString(),
          conversion: payload,
        });
      }
    );
  },

  async getStats() {
    return liveFirst(
      async () => {
        const { data } = await apiClient.get("/api/v1/crm/stats");
        return data?.data ?? data;
      },
      async () => {
        await delay(50);
        const total = localLeads.length;
        const won = localLeads.filter((l) => l.status === "won" || l.status === "converted").length;
        const newCount = localLeads.filter((l) => l.status === "new").length;
        const highPriority = localLeads.filter((l) => l.priority === "high").length;
        const activeLeads = localLeads.filter((l) => !["won", "lost", "converted"].includes(l.status));
        const pipelineValue = activeLeads.reduce((sum, l) => sum + Number(l.budget || 0), 0);
        return {
          totalLeads: total,
          new: newCount,
          active: activeLeads.length,
          won,
          highPriority,
          pipelineValue,
          conversionRate: total > 0 ? ((won / total) * 100).toFixed(1) : "0",
        };
      }
    );
  },

  async getPipeline() {
    return liveFirst(
      async () => {
        const { data } = await apiClient.get("/api/v1/crm/pipeline");
        return data?.data ?? data;
      },
      async () => {
        await delay(50);
        const byStatus = {};
        for (const lead of localLeads) {
          const s = lead.status || "new";
          byStatus[s] = (byStatus[s] || 0) + 1;
        }
        return {
          totalLeads: localLeads.length,
          byStatus,
        };
      }
    );
  },

  async listAgents() {
    return liveFirst(
      async () => {
        try {
          const { data } = await apiClient.get("/api/v1/crm/users", { params: { role: "sales_agent", limit: 100 } });
          const list = data?.data?.users ?? data?.users ?? (Array.isArray(data?.data) ? data.data : []);
          return list;
        } catch {
          return [];
        }
      },
      async () => {
        return [
          { _id: "agent-1", name: "Tariq Mansoor", email: "tariq@maqam.com", role: "sales_agent" },
          { _id: "agent-2", name: "Fatima Al-Zahra", email: "fatima@maqam.com", role: "sales_agent" },
          { _id: "agent-3", name: "Zaid Qureshi", email: "zaid@maqam.com", role: "sales_agent" },
          { _id: "agent-4", name: "Maryam Siddiqui", email: "maryam@maqam.com", role: "sales_agent" },
        ];
      }
    );
  },
};
