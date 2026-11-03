import { useEffect, useMemo, useState } from "react";
import {
  Phone, Mail, MapPin, Users,
  CheckCircle, ArrowUpDown, LayoutGrid, Table as TableIcon,
  Search, X, ExternalLink, FileText, MessageSquare, MessageSquareQuote
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import Button from "../../../components/common/Button";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import formatCurrency from "../../../utils/formatCurrency";
import { formatDate } from "../../../utils/formatDate";
import { leadsApi } from "../leadsApi";
import LeadsHeader from "../components/LeadsHeader";
import LeadsKpiCards from "../components/LeadsKpiCards";
import LeadDetailsDrawer from "../components/LeadDetailsDrawer";
import CreateLeadModal from "../../../components/leads/CreateLeadModal";
import ConvertLeadModal from "../../../components/leads/ConvertLeadModal";
import LeadCard from "../../../components/leads/LeadCard";

const STAGES = [
  { key: "all", label: "All Leads" },
  { key: "new", label: "New", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "contacted", label: "Contacted", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "qualified", label: "Qualified", tone: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { key: "proposal", label: "Proposal", tone: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "negotiation", label: "Negotiation", tone: "bg-rose-50 text-rose-700 border-rose-200" },
  { key: "won", label: "Won", tone: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  { key: "lost", label: "Lost", tone: "bg-slate-100 text-slate-600 border-slate-200" },
];

const STAGE_SELECT_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal Sent" },
  { value: "negotiation", label: "Negotiating" },
  { value: "won", label: "Won / Converted" },
  { value: "lost", label: "Lost" },
];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 25 });

  // Filters state
  const [search, setSearch] = useState("");
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [agents, setAgents] = useState([]);

  // UI state
  const [viewMode, setViewMode] = useState("table"); // "table" | "grid"
  const [inspectLead, setInspectLead] = useState(null);
  const [convertTarget, setConvertTarget] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Load leads from API
  const loadLeads = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const [leadsRes, agentsRes] = await Promise.all([
        leadsApi.list({
          status: selectedStage !== "all" ? selectedStage : undefined,
          priority: selectedPriority !== "all" ? selectedPriority : undefined,
          source: selectedSource !== "all" ? selectedSource : undefined,
          assignedTo: selectedAgent !== "all" ? selectedAgent : undefined,
          search: search.trim() || undefined,
          page,
          limit: 25,
        }),
        agents.length ? null : leadsApi.listAgents(),
      ]);

      setLeads(leadsRes.data || []);
      setMeta(leadsRes.meta || { total: (leadsRes.data || []).length, page, pageSize: 25 });
      if (agentsRes && Array.isArray(agentsRes)) {
        setAgents(agentsRes);
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to fetch leads.");
      toast.error("Could not load leads. Please check connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLeads(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [search, selectedStage, selectedPriority, selectedSource, selectedAgent]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadLeads(meta.page || 1);
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedStage("all");
    setSelectedPriority("all");
    setSelectedSource("all");
    setSelectedAgent("all");
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedStage !== "all" ||
    selectedPriority !== "all" ||
    selectedSource !== "all" ||
    selectedAgent !== "all";

  // In-row stage transition
  const handleInlineStageChange = async (lead, newStage) => {
    const leadId = lead.id || lead._id;
    if (lead.status === newStage) return;
    try {
      const updated = await leadsApi.updateStatus(leadId, newStage);
      setLeads((prev) =>
        prev.map((item) => ((item.id || item._id) === leadId ? { ...item, status: newStage } : item))
      );
      if (inspectLead && (inspectLead.id || inspectLead._id) === leadId) {
        setInspectLead((prev) => ({ ...prev, status: newStage }));
      }
      toast.success(`Updated stage to ${newStage.toUpperCase()}`);
    } catch {
      toast.error("Failed to update lead status");
    }
  };

  // Convert lead handler
  const handleConvertLead = async (payload) => {
    if (!convertTarget) return;
    const leadId = convertTarget.id || convertTarget._id;
    try {
      setConverting(true);
      await leadsApi.convertToCustomer(leadId, payload);
      toast.success("Lead converted to customer & booking record!");
      setConvertTarget(null);
      loadLeads(meta.page || 1);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Conversion failed");
    } finally {
      setConverting(false);
    }
  };

  // Sorted and filtered leads for display
  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === "budget") {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
      } else {
        valA = String(valA || "").toLowerCase();
        valB = String(valB || "").toLowerCase();
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [leads, sortField, sortOrder]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Extract agent name
  const getAgentLabel = (lead) => {
    if (!lead.assignedTo) return "Unassigned";
    if (typeof lead.assignedTo === "object") {
      return (
        [lead.assignedTo.firstName, lead.assignedTo.lastName].filter(Boolean).join(" ") ||
        lead.assignedTo.name ||
        lead.assignedTo.email ||
        "Agent"
      );
    }
    return String(lead.assignedTo);
  };

  return (
    <div className="space-y-5 animate-slide-in">
      {/* Shared Leads & Sales Header */}
      <LeadsHeader
        activeView="leads"
        totalCount={meta.total}
        onRefresh={handleRefresh}
        onAddLead={() => setCreateOpen(true)}
        refreshing={refreshing}
      />

      {/* KPI Metrics */}
      <LeadsKpiCards leads={leads} />

      {/* Filter and Control Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
        {/* Stage Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {STAGES.map((s) => {
            const isActive = selectedStage === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSelectedStage(s.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "border border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Search, Dropdown Filters & View Switcher */}
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between pt-1 border-t border-slate-100">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads, phone, email, dest…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-8 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-50"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            {/* Source Filter */}
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="all">All Sources</option>
              <option value="Website">Website</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Referral">Referral</option>
              <option value="Direct Call">Direct Call</option>
              <option value="Sales Agent">Sales Agent</option>
            </select>

            {/* Agent Filter */}
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="all">All Agents</option>
              {agents.map((agent) => (
                <option key={agent._id || agent.name} value={agent.name || agent._id}>
                  {agent.name || [agent.firstName, agent.lastName].filter(Boolean).join(" ") || agent.email}
                </option>
              ))}
            </select>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
              >
                <X size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Desktop View Switcher (Table vs Grid) */}
          <div className="hidden sm:flex items-center gap-1 rounded-xl border border-slate-200 p-1 bg-slate-50">
            <button
              onClick={() => setViewMode("table")}
              className={`rounded-lg p-1.5 transition ${
                viewMode === "table" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Table view"
              aria-label="Table view"
            >
              <TableIcon size={15} />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-lg p-1.5 transition ${
                viewMode === "grid" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Card grid view"
              aria-label="Card grid view"
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content State Handling */}
      {loading ? (
        <div className="py-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 space-y-3">
          <p className="font-semibold">{error}</p>
          <Button variant="secondary" onClick={() => loadLeads(1)}>
            Retry
          </Button>
        </div>
      ) : !sortedLeads.length ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Users size={22} />
          </div>
          <h3 className="text-base font-bold text-slate-800">No leads match your criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search terms, changing the stage filter, or create a new lead enquiry.
          </p>
          <div className="pt-2">
            <Button onClick={() => setCreateOpen(true)} className="!bg-emerald-700">
              Create New Lead
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Responsive Layout: Mobile gets clean Cards, Desktop gets high-density Table (or Card Grid if selected) */}
          <div className="block md:hidden">
            {/* Mobile Cards Feed */}
            <div className="grid gap-3 sm:grid-cols-2">
              {sortedLeads.map((lead) => (
                <LeadCard
                  key={lead.id || lead._id}
                  lead={lead}
                  onOpen={(item) => setInspectLead(item)}
                />
              ))}
            </div>
          </div>

          <div className="hidden md:block">
            {viewMode === "grid" ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sortedLeads.map((lead) => (
                  <LeadCard
                    key={lead.id || lead._id}
                    lead={lead}
                    onOpen={(item) => setInspectLead(item)}
                  />
                ))}
              </div>
            ) : (
              /* Enterprise Desktop Data Table */
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort("name")}>
                          <span className="flex items-center gap-1.5">
                            Lead Prospect <ArrowUpDown size={12} className="text-slate-400" />
                          </span>
                        </th>
                        <th className="px-4 py-3">Destination & Pax</th>
                        <th className="px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort("budget")}>
                          <span className="flex items-center gap-1.5">
                            Target Budget <ArrowUpDown size={12} className="text-slate-400" />
                          </span>
                        </th>
                        <th className="px-4 py-3">Priority / Source</th>
                        <th className="px-4 py-3 min-w-[200px]">Customer Notes & Dialogue</th>
                        <th className="px-4 py-3">Deal Stage</th>
                        <th className="px-4 py-3">Assigned Agent</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedLeads.map((lead) => {
                        const leadId = lead.id || lead._id;
                        const leadName = lead.name || [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Lead";
                        const currentStatus = lead.status || "new";
                        const isWon = ["won", "converted"].includes(currentStatus);

                        return (
                          <tr
                            key={leadId}
                            className="hover:bg-slate-50/70 transition group"
                          >
                            {/* Lead Prospect */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 font-bold text-emerald-800 text-xs border border-emerald-100/80">
                                  {leadName.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <button
                                    onClick={() => setInspectLead(lead)}
                                    className="font-bold text-slate-900 hover:text-emerald-700 transition block truncate text-left"
                                  >
                                    {leadName}
                                  </button>
                                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                    {lead.phone && (
                                      <a
                                        href={`tel:${lead.phone}`}
                                        className="hover:text-emerald-700 flex items-center gap-1"
                                      >
                                        <Phone size={11} className="text-slate-400" />
                                        {lead.phone}
                                      </a>
                                    )}
                                    {lead.email && (
                                      <a
                                        href={`mailto:${lead.email}`}
                                        className="hover:text-emerald-700 flex items-center gap-1 truncate max-w-[140px]"
                                      >
                                        <Mail size={11} className="text-slate-400" />
                                        {lead.email}
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Destination & Pax */}
                            <td className="px-4 py-3.5">
                              <div className="space-y-0.5">
                                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                                  <MapPin size={13} className="text-slate-400 shrink-0" />
                                  {lead.destination || "Not specified"}
                                </p>
                                <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                  <Users size={12} className="text-slate-400 shrink-0" />
                                  {lead.travelers || lead.numberOfPeople || 1} Pax
                                  {lead.tripType ? ` · ${lead.tripType}` : ""}
                                </p>
                              </div>
                            </td>

                            {/* Budget */}
                            <td className="px-4 py-3.5">
                              <p className="font-bold text-slate-900">
                                {lead.budget ? formatCurrency(lead.budget) : "—"}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium">
                                {lead.createdAt ? formatDate(lead.createdAt) : "Recent"}
                              </p>
                            </td>

                            {/* Priority / Source */}
                            <td className="px-4 py-3.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                    lead.priority === "high"
                                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                                      : lead.priority === "medium"
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {lead.priority || "Normal"}
                                </span>
                                {lead.source && (
                                  <span
                                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${
                                      String(lead.source).toLowerCase().includes("website")
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold"
                                        : "bg-slate-50 text-slate-500 border-slate-200/80"
                                    }`}
                                  >
                                    {String(lead.source).toLowerCase().includes("website") ? "🌐 Website" : lead.source}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Customer Notes & Conversation */}
                            <td className="px-4 py-3.5 max-w-[240px]">
                              {/* Dialogue / Conversation Note */}
                              {(lead.conversationNote || lead.contactNotes) ? (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-2 text-[11px] text-emerald-950 space-y-0.5">
                                  <div className="flex items-center justify-between text-[10px] font-bold text-emerald-900 uppercase tracking-wide">
                                    <span className="flex items-center gap-1">
                                      <MessageSquare size={11} className="text-emerald-700 shrink-0" />
                                      <span>{lead.conversationChannel === "Call" ? "📞" : lead.conversationChannel === "WhatsApp" ? "💬" : lead.conversationChannel === "Email" ? "✉️" : "📝"} Conversation Note</span>
                                    </span>
                                    {lead.conversationChannel && (
                                      <span className="rounded bg-emerald-100/90 px-1 py-0.2 text-[9px] font-bold text-emerald-800">
                                        {lead.conversationChannel}
                                      </span>
                                    )}
                                  </div>
                                  <p className="line-clamp-2 italic font-medium leading-tight" title={lead.conversationNote || lead.contactNotes}>
                                    &ldquo;{lead.conversationNote || lead.contactNotes}&rdquo;
                                  </p>
                                </div>
                              ) : null}

                              {/* Customer Feedback Note */}
                              {lead.customerResponse?.note && (
                                <div className={`rounded-xl border border-sky-200 bg-sky-50/70 p-2 text-[11px] text-sky-950 space-y-0.5 ${
                                  lead.conversationNote || lead.contactNotes ? "mt-1.5" : ""
                                }`}>
                                  <div className="flex items-center gap-1 font-bold text-sky-900 text-[10px] uppercase tracking-wide">
                                    <MessageSquareQuote size={11} className="text-sky-700 shrink-0" />
                                    <span>Customer Feedback</span>
                                  </div>
                                  <p className="line-clamp-2 italic leading-tight" title={lead.customerResponse.note}>
                                    &ldquo;{lead.customerResponse.note}&rdquo;
                                  </p>
                                </div>
                              )}

                              {/* Customer Inbound Enquiry Note (shown if no dialogue note yet) */}
                              {!(lead.conversationNote || lead.contactNotes) && (lead.query || lead.specialRequests) && (
                                <div className={`rounded-xl border border-slate-200 bg-slate-50/80 p-2 text-[11px] text-slate-700 space-y-0.5 ${
                                  lead.customerResponse?.note ? "mt-1.5" : ""
                                }`}>
                                  <div className="flex items-center gap-1 font-bold text-slate-600 text-[10px] uppercase tracking-wide">
                                    <MessageSquareQuote size={11} className="text-emerald-700 shrink-0" />
                                    <span>Inbound Enquiry</span>
                                  </div>
                                  <p className="line-clamp-2 italic leading-tight" title={lead.query || lead.specialRequests}>
                                    &ldquo;{lead.query || lead.specialRequests}&rdquo;
                                  </p>
                                </div>
                              )}

                              {/* No notes logged */}
                              {!(lead.conversationNote || lead.contactNotes) && !lead.customerResponse?.note && !(lead.query || lead.specialRequests) && (
                                <span className="text-[11px] text-slate-400 italic">No notes logged</span>
                              )}
                            </td>

                            {/* Deal Stage (Interactive Selector) */}
                            <td className="px-4 py-3.5">
                              <select
                                value={currentStatus}
                                onChange={(e) => handleInlineStageChange(lead, e.target.value)}
                                className={`rounded-xl border px-2.5 py-1 text-xs font-bold outline-none transition cursor-pointer ${
                                  currentStatus === "won" || currentStatus === "converted"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : currentStatus === "lost"
                                      ? "bg-slate-100 text-slate-600 border-slate-200"
                                      : currentStatus === "proposal"
                                        ? "bg-purple-50 text-purple-700 border-purple-200"
                                        : currentStatus === "negotiation"
                                          ? "bg-rose-50 text-rose-700 border-rose-200"
                                          : currentStatus === "qualified"
                                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                            : "bg-blue-50 text-blue-700 border-blue-200"
                                }`}
                              >
                                {STAGE_SELECT_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Assigned Agent */}
                            <td className="px-4 py-3.5">
                              <span className="text-slate-700 font-medium text-xs">
                                {getAgentLabel(lead)}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Link
                                  to={`/admin/quotes?id=${leadId}`}
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
                                  title="Open in Quotations Desk"
                                >
                                  <FileText size={11} className="text-emerald-700" />
                                  <span>Quote</span>
                                </Link>

                                <Button
                                  variant="secondary"
                                  onClick={() => setInspectLead(lead)}
                                  className="!h-7 !px-2.5 !text-[11px] !font-semibold"
                                >
                                  Inspect
                                </Button>

                                {!isWon && (
                                  <Button
                                    onClick={() => setConvertTarget(lead)}
                                    className="!h-7 !px-2.5 !text-[11px] !font-bold !bg-emerald-700 hover:!bg-emerald-800 text-white"
                                  >
                                    <CheckCircle size={12} />
                                    <span>Convert</span>
                                  </Button>
                                )}

                                <Link
                                  to={`/admin/leads/${leadId}`}
                                  title="Full dossier page"
                                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                                >
                                  <ExternalLink size={14} />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {meta.total > meta.pageSize && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-2 text-xs text-slate-500 font-medium">
              <span>
                Showing {(meta.page - 1) * meta.pageSize + 1} to{" "}
                {Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total} enquiries
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  disabled={meta.page <= 1}
                  onClick={() => loadLeads(meta.page - 1)}
                  className="!h-8 !px-3 !text-xs"
                >
                  Previous
                </Button>
                <span className="text-xs font-bold text-slate-700">
                  Page {meta.page} of {Math.ceil(meta.total / meta.pageSize)}
                </span>
                <Button
                  variant="secondary"
                  disabled={meta.page >= Math.ceil(meta.total / meta.pageSize)}
                  onClick={() => loadLeads(meta.page + 1)}
                  className="!h-8 !px-3 !text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Slide-over Inspection Drawer */}
      <LeadDetailsDrawer
        lead={inspectLead}
        open={Boolean(inspectLead)}
        onClose={() => setInspectLead(null)}
        agents={agents}
        onUpdateLead={(updated) => {
          setLeads((prev) =>
            prev.map((item) => ((item.id || item._id) === (updated.id || updated._id) ? updated : item))
          );
        }}
        onOpenConvert={(target) => {
          setInspectLead(null);
          setConvertTarget(target);
        }}
      />

      {/* Convert Lead Modal */}
      <ConvertLeadModal
        open={Boolean(convertTarget)}
        lead={convertTarget}
        loading={converting}
        onClose={() => setConvertTarget(null)}
        onConvert={handleConvertLead}
      />

      {/* Create Lead Modal */}
      <CreateLeadModal
        open={createOpen}
        agents={agents}
        onClose={() => setCreateOpen(false)}
        onCreated={() => loadLeads(1)}
      />
    </div>
  );
}
