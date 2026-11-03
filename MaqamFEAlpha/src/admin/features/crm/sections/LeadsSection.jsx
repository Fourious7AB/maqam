import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, ArrowRight, MessageSquare, MessageSquareQuote } from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../components/common/Button";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { formatDate } from "../../../utils/formatDate";
import formatCurrency from "../../../utils/formatCurrency";
import { crmApi } from "../crmApi";
import { leadsApi } from "../../leads/leadsApi.js";
import {
  PanelBar, SearchInput, ChipGroup, Pill, TableWrap, EmptyState,
  Field, inputClass, FormActions,
} from "../crmUi";

const statusOptions = [
  { value: "", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "negotiating", label: "Negotiating" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

const tone = {
  converted: "green",
  new: "amber",
  qualified: "blue",
  proposal_sent: "blue",
  negotiating: "blue",
  contacted: "blue",
  lost: "red",
};

const emptyCreate = {
  firstName: "", lastName: "", email: "", phone: "",
  destination: "", numberOfPeople: "2", budget: "",
  specialRequests: "", travelFrom: "", travelTo: "",
};

const emptyEdit = { status: "new", contactNotes: "", lostReason: "" };

const agentName = (lead) => {
  const a = lead.assignedAgent;
  if (!a && lead.assignedTo) {
    return typeof lead.assignedTo === "object"
      ? [lead.assignedTo.firstName, lead.assignedTo.lastName].filter(Boolean).join(" ") || lead.assignedTo.email || "Agent"
      : String(lead.assignedTo);
  }
  if (!a) return "Unassigned";
  if (typeof a === "string") return a;
  return [a.firstName, a.lastName].filter(Boolean).join(" ") || a.email || "Agent";
};

const titleCase = (value) =>
  String(value || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function LeadsSection() {
  const [leads, setLeads] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [search, setSearch] = useState("");

  const [stats, setStats] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [agents, setAgents] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [create, setCreate] = useState(emptyCreate);
  const [saving, setSaving] = useState(false);

  const [editLead, setEditLead] = useState(null);
  const [edit, setEdit] = useState(emptyEdit);
  const [converting, setConverting] = useState(false);

  const load = async (page = 1) => {
    try {
      setLoading(true);
      const result = await crmApi.listLeads({ status, assignedTo, page, limit: 20 });
      setLeads(result.items);
      setMeta(result.meta);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Unable to load leads.");
    } finally {
      setLoading(false);
    }
  };

  // Analytics & pipeline (GET /crm/stats + /crm/pipeline) — loaded once per
  // session and refreshed after mutations or via the refresh button.
  const loadAnalytics = async () => {
    try {
      const [s, p] = await Promise.all([crmApi.agentStats(), crmApi.pipelineOverview()]);
      setStats(s);
      setPipeline(p);
    } catch {
      // Analytics are non-critical; keep previous values on failure.
    }
  };

  // Agent options for the assignedTo filter — loaded once.
  const loadAgents = async () => {
    try {
      const result = await crmApi.listStaff({ role: "sales_agent", limit: 100 });
      setAgents(result.items || []);
    } catch {
      setAgents([]);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => load(1), 200);
    return () => window.clearTimeout(timer);
  }, [status, assignedTo]);

  useEffect(() => {
    loadAnalytics();
    loadAgents();
  }, []);

  const refreshAll = () => {
    load(1);
    loadAnalytics();
  };

  const leadList = Array.isArray(leads) ? leads : [];
  const visible = search.trim()
    ? leadList.filter((lead) =>
        `${lead.firstName || ""} ${lead.lastName || ""} ${lead.name || ""} ${lead.email || ""} ${lead.phone || ""} ${lead.destination || ""}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      )
    : leadList;

  const fullName = (lead) =>
    [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim() || lead.name || "Lead";

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!create.firstName.trim() || !create.phone.trim()) {
      toast.error("First name and phone are required");
      return;
    }
    try {
      setSaving(true);
      await crmApi.createLead({
        firstName: create.firstName.trim(),
        lastName: create.lastName.trim(),
        email: create.email.trim() || undefined,
        phone: create.phone.trim(),
        destination: create.destination.trim() || undefined,
        numberOfPeople: Number(create.numberOfPeople || 1),
        budget: create.budget === "" ? undefined : Number(create.budget),
        specialRequests: create.specialRequests.trim() || undefined,
        travelDates:
          create.travelFrom && create.travelTo
            ? { from: create.travelFrom, to: create.travelTo }
            : undefined,
      });
      toast.success("Lead created");
      setCreateOpen(false);
      setCreate(emptyCreate);
      load();
      loadAnalytics();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to create lead");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (lead) => {
    setEditLead(lead);
    setEdit({
      status: lead.status || "new",
      contactNotes: lead.contactNotes || lead.notes || "",
      lostReason: lead.lostReason || "",
    });
  };

  const handleEdit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await crmApi.updateLead(editLead._id, {
        status: edit.status,
        contactNotes: edit.contactNotes,
        lostReason: edit.lostReason,
      });
      await leadsApi
        .update(editLead._id, {
          status: edit.status,
          contactNotes: edit.contactNotes,
          lostReason: edit.lostReason,
        })
        .catch(() => {});
      if (edit.contactNotes && edit.contactNotes.trim()) {
        await leadsApi
          .addNote(editLead._id, {
            note: edit.contactNotes.trim(),
            channel: "Note",
            author: "CRM Staff",
          })
          .catch(() => {});
      }
      toast.success("Lead updated");
      setEditLead(null);
      load();
      loadAnalytics();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update lead");
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async (lead) => {
    if (!window.confirm(`Convert "${fullName(lead)}" to a booking?`)) return;
    try {
      setConverting(true);
      await crmApi.convertLead(lead._id);
      toast.success("Lead converted to booking");
      load();
      loadAnalytics();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to convert lead");
    } finally {
      setConverting(false);
    }
  };

  const goPage = (page) => {
    if (!meta || page < 1 || page > meta.totalPages) return;
    load(page);
  };

  return (
    <div className="space-y-4">
      {/* Logical Workspaces Quick Navigation (Eliminates disjointed route navigation) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-800 font-bold">
            <FileText size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 leading-tight">Leads & Sales Core Modules</p>
            <p className="text-[11px] text-slate-500">Access specialized desks without duplicated workflows</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/leads"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            <span>All Leads Directory</span>
            <ArrowRight size={12} />
          </Link>
          <Link
            to="/admin/pipeline"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            <span>Pipeline Kanban</span>
            <ArrowRight size={12} />
          </Link>
          <Link
            to="/admin/quotes"
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
          >
            <FileText size={12} />
            <span>Quotations Desk</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      <PanelBar
        title="Leads"
        count={meta?.total}
        onRefresh={refreshAll}
        onAdd={() => setCreateOpen(true)}
        addLabel="Add Lead"
      >
        <div className="flex flex-wrap items-center gap-3">
          <ChipGroup options={statusOptions} value={status} onChange={setStatus} />
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
          >
            <option value="">All Agents</option>
            {agents.map((agent) => (
              <option key={agent._id} value={agent._id}>
                {[agent.firstName, agent.lastName].filter(Boolean).join(" ") || agent.email}
              </option>
            ))}
          </select>
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, phone…" />
        </div>
      </PanelBar>

      {/* CRM Analytics & Pipeline — read-only live values */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            Agent Statistics
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { key: "totalLeads", label: "Total Leads", val: stats?.totalLeads ?? 0 },
              { key: "new", label: "New", val: stats?.new ?? 0 },
              { key: "contacted", label: "Contacted", val: stats?.contacted ?? 0 },
              { key: "interested", label: "Interested", val: stats?.interested ?? stats?.negotiation ?? 0 },
              { key: "quoted", label: "Quoted", val: stats?.quoted ?? stats?.proposal ?? 0 },
              { key: "converted", label: "Converted", val: stats?.converted ?? stats?.won ?? 0 },
              { key: "lost", label: "Lost", val: stats?.lost ?? 0 },
            ].map((item) => (
              <div key={item.key} className="rounded-xl bg-slate-50 p-3">
                <p className="text-lg font-bold text-slate-900">{item.val}</p>
                <p className="text-[11px] font-semibold text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            Pipeline
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { key: "totalLeads", label: "Total Leads", val: pipeline?.totalLeads ?? 0 },
              { key: "new", label: "New", val: pipeline?.byStatus?.new ?? 0 },
              { key: "contacted", label: "Contacted", val: pipeline?.byStatus?.contacted ?? 0 },
              { key: "interested", label: "Interested", val: pipeline?.byStatus?.interested ?? pipeline?.byStatus?.negotiation ?? 0 },
              { key: "quoted", label: "Quoted", val: pipeline?.byStatus?.quoted ?? pipeline?.byStatus?.proposal ?? 0 },
              { key: "converted", label: "Converted", val: pipeline?.byStatus?.converted ?? pipeline?.byStatus?.won ?? 0 },
              { key: "lost", label: "Lost", val: pipeline?.byStatus?.lost ?? 0 },
              { key: "nurture", label: "Nurture", val: pipeline?.byStatus?.nurture ?? 0 },
            ].map((item) => (
              <div key={item.key} className="rounded-xl bg-emerald-50/60 p-3">
                <p className="text-lg font-bold text-emerald-900">{item.val}</p>
                <p className="text-[11px] font-semibold text-emerald-700/80">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : visible.length ? (
        <TableWrap>
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3 min-w-[200px]">Customer Notes & Dialogue</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Pax</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sales Agent</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((lead) => (
                <tr key={lead._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{fullName(lead)}</p>
                    <p className="text-xs text-slate-500">{lead.email || "—"} · {lead.phone || "—"}</p>
                  </td>
                  <td className="px-4 py-3 min-w-[240px]">
                    {/* Active Conversation Note */}
                    {(lead.conversationNote || lead.contactNotes || (lead.notes && lead.notes !== lead.specialRequests)) ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-2 text-xs mb-1.5">
                        <div className="flex items-center justify-between font-semibold text-emerald-900 mb-0.5">
                          <span className="flex items-center gap-1">
                            <MessageSquare size={13} className="text-emerald-700 shrink-0" />
                            <span>
                              {lead.conversationChannel === "Call" ? "📞" : lead.conversationChannel === "WhatsApp" ? "💬" : lead.conversationChannel === "Email" ? "✉️" : "📝"} Conversation Note
                            </span>
                          </span>
                          {lead.conversationChannel && (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                              {lead.conversationChannel}
                            </span>
                          )}
                        </div>
                        <p className="text-emerald-950 font-medium line-clamp-2">"{lead.conversationNote || lead.contactNotes || lead.notes}"</p>
                      </div>
                    ) : null}

                    {/* Customer Response Feedback */}
                    {lead.customerResponse?.note && (
                      <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-2 text-xs mb-1.5">
                        <div className="flex items-center gap-1 font-semibold text-sky-900 mb-0.5">
                          <MessageSquareQuote size={13} className="text-sky-600 shrink-0" />
                          <span>Customer Response</span>
                        </div>
                        <p className="text-sky-950 font-medium line-clamp-2">"{lead.customerResponse.note}"</p>
                      </div>
                    )}

                    {/* Initial Customer Enquiry */}
                    {!(lead.conversationNote || lead.contactNotes || (lead.notes && lead.notes !== lead.specialRequests)) && (lead.query || lead.specialRequests) && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2 text-xs">
                        <div className="flex items-center gap-1 font-semibold text-slate-700 mb-0.5">
                          <MessageSquareQuote size={13} className="text-slate-500 shrink-0" />
                          <span>Customer Enquiry</span>
                        </div>
                        <p className="text-slate-800 line-clamp-2">{lead.query || lead.specialRequests}</p>
                      </div>
                    )}

                    {!(lead.conversationNote || lead.contactNotes || (lead.notes && lead.notes !== lead.specialRequests)) && !lead.customerResponse?.note && !(lead.query || lead.specialRequests) && (
                      <span className="text-xs text-slate-400 italic">No notes logged</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{lead.destination || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{lead.numberOfPeople ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(lead.budget)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(lead.createdAt)}</td>
                  <td className="px-4 py-3"><Pill tone={tone[lead.status] || "slate"}>{titleCase(lead.status)}</Pill></td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {agentName(lead)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end items-center gap-1.5">
                      <Link
                        to={`/admin/quotes?id=${lead._id}`}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 transition"
                        title="Open Quotations Desk"
                      >
                        <FileText size={12} className="text-emerald-600" />
                        <span>Quote</span>
                      </Link>
                      <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => openEdit(lead)}>Update</Button>
                      {lead.status !== "converted" && (
                        <Button
                          variant="secondary"
                          className="!px-3 !py-1.5 !text-xs !text-emerald-700 !border-emerald-200"
                          disabled={converting}
                          onClick={() => handleConvert(lead)}
                        >
                          Convert
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : (
        <EmptyState message="No leads match the selected filters." />
      )}

      {meta?.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => goPage(meta.page - 1)}>Prev</Button>
          <span className="text-xs font-semibold text-slate-500">Page {meta.page} of {meta.totalPages}</span>
          <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => goPage(meta.page + 1)}>Next</Button>
        </div>
      )}

      {/* Create form */}
      {createOpen && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h4 className="mb-4 text-sm font-bold text-slate-900">Add Lead</h4>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="First Name *">
                <input className={inputClass} required placeholder="Ahmed" value={create.firstName} onChange={(e) => setCreate({ ...create, firstName: e.target.value })} />
              </Field>
              <Field label="Last Name">
                <input className={inputClass} placeholder="Khan" value={create.lastName} onChange={(e) => setCreate({ ...create, lastName: e.target.value })} />
              </Field>
              <Field label="Phone *">
                <input className={inputClass} required placeholder="9876543210" value={create.phone} onChange={(e) => setCreate({ ...create, phone: e.target.value })} />
              </Field>
              <Field label="Email">
                <input type="email" className={inputClass} placeholder="ahmed@example.com" value={create.email} onChange={(e) => setCreate({ ...create, email: e.target.value })} />
              </Field>
              <Field label="Destination">
                <input className={inputClass} placeholder="Makkah" value={create.destination} onChange={(e) => setCreate({ ...create, destination: e.target.value })} />
              </Field>
              <Field label="Number of People">
                <input type="number" min={1} className={inputClass} value={create.numberOfPeople} onChange={(e) => setCreate({ ...create, numberOfPeople: e.target.value })} />
              </Field>
              <Field label="Budget (₹)">
                <input type="number" min={0} className={inputClass} placeholder="250000" value={create.budget} onChange={(e) => setCreate({ ...create, budget: e.target.value })} />
              </Field>
              <Field label="Travel From">
                <input type="date" className={inputClass} value={create.travelFrom} onChange={(e) => setCreate({ ...create, travelFrom: e.target.value })} />
              </Field>
              <Field label="Travel To">
                <input type="date" className={inputClass} value={create.travelTo} onChange={(e) => setCreate({ ...create, travelTo: e.target.value })} />
              </Field>
              <div className="md:col-span-2 xl:col-span-3">
                <Field label="Special Requests">
                  <textarea rows={2} className={inputClass} placeholder="Wheelchair accessible room" value={create.specialRequests} onChange={(e) => setCreate({ ...create, specialRequests: e.target.value })} />
                </Field>
              </div>
            </div>
            <FormActions onCancel={() => setCreateOpen(false)} saving={saving} label="Create Lead" />
          </form>
        </div>
      )}

      {/* Update form */}
      {editLead && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h4 className="mb-1 text-sm font-bold text-slate-900">Update — {fullName(editLead)}</h4>
          <p className="mb-4 text-xs text-slate-500">Update stage status and customer conversation notes. Proposals and pricing are managed via Quotations Desk.</p>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Status">
                <select className={inputClass} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                  {statusOptions.filter((option) => option.value).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Lost Reason">
                <input className={inputClass} placeholder="Price sensitivity, decided on another agency, etc." value={edit.lostReason} onChange={(e) => setEdit({ ...edit, lostReason: e.target.value })} />
              </Field>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 flex flex-col justify-between gap-1.5 md:col-span-2">
                <div>
                  <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <FileText size={13} className="text-emerald-700" />
                    <span>Quotations Desk Integration</span>
                  </p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Pricing quotes are generated and managed through the Quotations Desk to prevent duplicate entries.
                  </p>
                </div>
                <div>
                  <Link
                    to={`/admin/quotes?id=${editLead._id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 shadow-2xs transition"
                  >
                    <span>Open Quotations Desk</span>
                    <ArrowRight size={11} />
                  </Link>
                </div>
              </div>
              <div className="md:col-span-2 xl:col-span-4">
                <Field label="Customer Conversation & Follow-up Notes">
                  <textarea rows={3} placeholder="Customer requested deluxe 5-star package with private transfers..." className={inputClass} value={edit.contactNotes} onChange={(e) => setEdit({ ...edit, contactNotes: e.target.value })} />
                </Field>
              </div>
            </div>
            <FormActions onCancel={() => setEditLead(null)} saving={saving} label="Save Changes" />
          </form>
        </div>
      )}
    </div>
  );
}
