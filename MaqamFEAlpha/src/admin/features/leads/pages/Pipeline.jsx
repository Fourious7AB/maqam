import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, CheckCircle, Search, X,
  MapPin, Users, Wallet, Phone, Mail, UserRound, ArrowRight, FileText,
  MessageSquare, MessageSquareQuote
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../components/common/Button";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import formatCurrency from "../../../utils/formatCurrency";
import { leadsApi } from "../leadsApi";
import LeadsHeader from "../components/LeadsHeader";
import LeadsKpiCards from "../components/LeadsKpiCards";
import LeadDetailsDrawer from "../components/LeadDetailsDrawer";
import CreateLeadModal from "../../../components/leads/CreateLeadModal";
import ConvertLeadModal from "../../../components/leads/ConvertLeadModal";

const PIPELINE_COLUMNS = [
  {
    key: "new",
    title: "New Enquiries",
    subtitle: "Inbound leads",
    accent: "border-t-amber-500",
    badge: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
  },
  {
    key: "contacted",
    title: "Contacted",
    subtitle: "Initial reach-out",
    accent: "border-t-blue-500",
    badge: "bg-blue-100 text-blue-800",
    dot: "bg-blue-500",
  },
  {
    key: "qualified",
    title: "Qualified",
    subtitle: "Budget & dates confirmed",
    accent: "border-t-indigo-500",
    badge: "bg-indigo-100 text-indigo-800",
    dot: "bg-indigo-500",
  },
  {
    key: "proposal",
    title: "Proposal Sent",
    subtitle: "Package quotation shared",
    accent: "border-t-purple-500",
    badge: "bg-purple-100 text-purple-800",
    dot: "bg-purple-500",
  },
  {
    key: "negotiation",
    title: "Negotiation",
    subtitle: "Finalizing itinerary & price",
    accent: "border-t-rose-500",
    badge: "bg-rose-100 text-rose-800",
    dot: "bg-rose-500",
  },
  {
    key: "won",
    title: "Closed Won",
    subtitle: "Converted to booking",
    accent: "border-t-emerald-600",
    badge: "bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-600",
  },
  {
    key: "lost",
    title: "Closed Lost",
    subtitle: "Declined or inactive",
    accent: "border-t-slate-400",
    badge: "bg-slate-100 text-slate-700",
    dot: "bg-slate-400",
  },
];

const COLUMN_KEYS = PIPELINE_COLUMNS.map((c) => c.key);

export default function Pipeline() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [agents, setAgents] = useState([]);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedAgent, setSelectedAgent] = useState("all");

  // Mobile active column selector
  const [mobileActiveStage, setMobileActiveStage] = useState("new");

  // Modals & Drawer
  const [inspectLead, setInspectLead] = useState(null);
  const [convertTarget, setConvertTarget] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [converting, setConverting] = useState(false);

  const loadPipeline = async () => {
    try {
      setLoading(true);
      setError("");
      const [leadsRes, agentsRes] = await Promise.all([
        leadsApi.list({ limit: 100 }),
        agents.length ? null : leadsApi.listAgents(),
      ]);
      setLeads(leadsRes.data || []);
      if (agentsRes && Array.isArray(agentsRes)) {
        setAgents(agentsRes);
      }
    } catch (e) {
      setError(e?.message || "Failed to load pipeline data");
      toast.error("Could not load pipeline data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPipeline();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPipeline();
  };

  // Move lead to previous or next stage
  const moveLeadDelta = async (lead, delta) => {
    const leadId = lead.id || lead._id;
    const currentIndex = COLUMN_KEYS.indexOf(lead.status || "new");
    if (currentIndex === -1) return;
    const targetIndex = currentIndex + delta;
    if (targetIndex < 0 || targetIndex >= COLUMN_KEYS.length) return;

    const newStage = COLUMN_KEYS[targetIndex];
    try {
      await leadsApi.updateStatus(leadId, newStage);
      setLeads((prev) =>
        prev.map((item) => ((item.id || item._id) === leadId ? { ...item, status: newStage } : item))
      );
      toast.success(`Moved to ${newStage.toUpperCase()}`);
    } catch {
      toast.error("Failed to move lead");
    }
  };

  // Set lead status directly
  const moveLeadDirect = async (lead, newStage) => {
    const leadId = lead.id || lead._id;
    if (lead.status === newStage) return;
    try {
      await leadsApi.updateStatus(leadId, newStage);
      setLeads((prev) =>
        prev.map((item) => ((item.id || item._id) === leadId ? { ...item, status: newStage } : item))
      );
      toast.success(`Moved to ${newStage.toUpperCase()}`);
    } catch {
      toast.error("Failed to update status");
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
      loadPipeline();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Conversion failed");
    } finally {
      setConverting(false);
    }
  };

  // Filtered leads
  const visibleLeads = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return leads.filter((lead) => {
      const leadName = lead.name || [lead.firstName, lead.lastName].filter(Boolean).join(" ");
      const matchesSearch =
        !needle ||
        [leadName, lead.phone, lead.email, lead.destination, lead.source, String(lead.budget ?? "")]
          .some((field) => String(field ?? "").toLowerCase().includes(needle));

      const matchesPriority = selectedPriority === "all" || lead.priority === selectedPriority;
      const matchesSource = selectedSource === "all" || lead.source === selectedSource;
      const matchesAgent =
        selectedAgent === "all" ||
        (typeof lead.assignedTo === "object"
          ? lead.assignedTo?._id === selectedAgent || lead.assignedTo?.name === selectedAgent
          : lead.assignedTo === selectedAgent);

      return matchesSearch && matchesPriority && matchesSource && matchesAgent;
    });
  }, [leads, search, selectedPriority, selectedSource, selectedAgent]);

  const resetFilters = () => {
    setSearch("");
    setSelectedPriority("all");
    setSelectedSource("all");
    setSelectedAgent("all");
  };

  const hasActiveFilters = search.trim() !== "" || selectedPriority !== "all" || selectedSource !== "all" || selectedAgent !== "all";

  return (
    <div className="space-y-5 animate-slide-in">
      {/* Shared Header */}
      <LeadsHeader
        activeView="pipeline"
        totalCount={leads.length}
        onRefresh={handleRefresh}
        onAddLead={() => setCreateOpen(true)}
        refreshing={refreshing}
      />

      {/* KPI Cards */}
      <LeadsKpiCards leads={leads} />

      {/* Pipeline Filter Bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pipeline leads…"
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

          {/* Priority */}
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

          {/* Source */}
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

          {/* Agent */}
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
      </div>

      {/* Mobile Stage Selector Tabs (renders on small screens < 768px for clean UX) */}
      <div className="block md:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {PIPELINE_COLUMNS.map((col) => {
            const count = visibleLeads.filter((l) => (l.status || "new") === col.key).length;
            const isActive = mobileActiveStage === col.key;
            return (
              <button
                key={col.key}
                onClick={() => setMobileActiveStage(col.key)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                <span>{col.title}</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="py-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 space-y-3">
          <p className="font-semibold">{error}</p>
          <Button variant="secondary" onClick={loadPipeline}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          {/* Mobile Single Column View */}
          <div className="block md:hidden">
            {(() => {
              const currentCol = PIPELINE_COLUMNS.find((c) => c.key === mobileActiveStage) || PIPELINE_COLUMNS[0];
              const items = visibleLeads.filter((l) => (l.status || "new") === currentCol.key);
              const totalVal = items.reduce((sum, l) => sum + Number(l.budget || 0), 0);

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{currentCol.title}</h3>
                      <p className="text-xs text-slate-500">{currentCol.subtitle}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-slate-900 text-sm">{formatCurrency(totalVal)}</span>
                      <p className="text-[11px] text-slate-400">{items.length} deals</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {items.length ? (
                      items.map((lead) => (
                        <PipelineCard
                          key={lead.id || lead._id}
                          lead={lead}
                          onInspect={() => setInspectLead(lead)}
                          onMovePrev={() => moveLeadDelta(lead, -1)}
                          onMoveNext={() => moveLeadDelta(lead, 1)}
                          onMoveDirect={(stage) => moveLeadDirect(lead, stage)}
                          onConvert={() => setConvertTarget(lead)}
                          canMovePrev={COLUMN_KEYS.indexOf(lead.status || "new") > 0}
                          canMoveNext={COLUMN_KEYS.indexOf(lead.status || "new") < COLUMN_KEYS.length - 1}
                        />
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
                        No leads currently in {currentCol.title}.
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Desktop & Tablet Full Kanban Board */}
          <div className="hidden md:block">
            <div className="flex gap-3 overflow-x-auto pb-4 items-start scrollbar-thin">
              {PIPELINE_COLUMNS.map((column) => {
                const items = visibleLeads.filter((lead) => (lead.status || "new") === column.key);
                const totalStageValue = items.reduce((sum, lead) => sum + Number(lead.budget || 0), 0);
                const colIndex = COLUMN_KEYS.indexOf(column.key);

                return (
                  <div
                    key={column.key}
                    className="w-72 shrink-0 rounded-2xl border border-slate-200 bg-slate-50/70 shadow-2xs flex flex-col max-h-[calc(100vh-220px)]"
                  >
                    {/* Column Header */}
                    <div className={`p-3.5 border-t-3 ${column.accent} border-b border-slate-200 bg-white rounded-t-2xl space-y-1`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />
                          <h3 className="font-black text-xs text-slate-800 tracking-tight">
                            {column.title}
                          </h3>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${column.badge}`}>
                          {items.length}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium truncate">{column.subtitle}</span>
                        <span className="font-bold text-slate-700">{formatCurrency(totalStageValue)}</span>
                      </div>
                    </div>

                    {/* Column Scrollable Cards Feed */}
                    <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 scrollbar-thin">
                      {items.length ? (
                        items.map((lead) => (
                          <PipelineCard
                            key={lead.id || lead._id}
                            lead={lead}
                            onInspect={() => setInspectLead(lead)}
                            onMovePrev={() => moveLeadDelta(lead, -1)}
                            onMoveNext={() => moveLeadDelta(lead, 1)}
                            onMoveDirect={(stage) => moveLeadDirect(lead, stage)}
                            onConvert={() => setConvertTarget(lead)}
                            canMovePrev={colIndex > 0}
                            canMoveNext={colIndex < COLUMN_KEYS.length - 1}
                          />
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-400 space-y-1">
                          <p className="font-semibold text-slate-500">Empty Stage</p>
                          <p className="text-[11px]">No leads currently here.</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
        onCreated={loadPipeline}
      />
    </div>
  );
}

// Kanban Lead Card Component
function PipelineCard({
  lead,
  onInspect,
  onMovePrev,
  onMoveNext,
  onMoveDirect,
  onConvert,
  canMovePrev,
  canMoveNext,
}) {
  const leadName = lead.name || [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Lead";
  const pax = lead.travelers || lead.numberOfPeople || 1;
  const currentStatus = lead.status || "new";
  const isWon = ["won", "converted"].includes(currentStatus);

  const getAgentShort = (item) => {
    if (!item.assignedTo) return "Unassigned";
    if (typeof item.assignedTo === "object") {
      return item.assignedTo.firstName || item.assignedTo.name || "Agent";
    }
    return String(item.assignedTo).split(" ")[0];
  };

  return (
    <article className="group rounded-xl border border-slate-200 bg-white p-3 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition space-y-2">
      {/* Top: Avatar, Name, Priority */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-[11px] font-bold text-emerald-800 border border-emerald-100">
            {leadName.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={onInspect}
            className="font-bold text-xs text-slate-900 hover:text-emerald-700 transition truncate text-left"
          >
            {leadName}
          </button>
          {String(lead.source || "").toLowerCase().includes("website") && (
            <span className="rounded-md bg-emerald-50 px-1 py-0.2 text-[9px] font-bold text-emerald-800 border border-emerald-100 shrink-0">
              Web
            </span>
          )}
        </div>

        {lead.priority === "high" && (
          <span className="shrink-0 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-rose-200" title="High priority" />
        )}
      </div>

      {/* Destination & Pax */}
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1 truncate max-w-[140px]">
          <MapPin size={11} className="text-slate-400 shrink-0" />
          {lead.destination || "Flexible"}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <Users size={11} className="text-slate-400" />
          {pax} Pax
        </span>
      </div>

      {/* Customer Conversation & Enquiry Notes */}
      {(lead.conversationNote || lead.contactNotes) ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-2 text-[11px] text-emerald-950 flex items-start gap-1.5">
          <MessageSquare size={12} className="mt-0.5 text-emerald-700 shrink-0" />
          <div className="min-w-0">
            <span className="font-bold text-[9px] uppercase tracking-wider text-emerald-800 block">
              {lead.conversationChannel === "Call" ? "📞" : lead.conversationChannel === "WhatsApp" ? "💬" : lead.conversationChannel === "Email" ? "✉️" : "📝"} Conversation Note:
            </span>
            <p className="line-clamp-2 leading-tight italic font-medium">"{lead.conversationNote || lead.contactNotes}"</p>
          </div>
        </div>
      ) : null}

      {lead.customerResponse?.note && (
        <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-2 text-[11px] text-sky-950 flex items-start gap-1.5">
          <MessageSquareQuote size={12} className="mt-0.5 text-sky-600 shrink-0" />
          <div className="min-w-0">
            <span className="font-bold text-[9px] uppercase tracking-wider text-sky-800 block">Customer Feedback:</span>
            <p className="line-clamp-2 leading-tight italic">"{lead.customerResponse.note}"</p>
          </div>
        </div>
      )}

      {!(lead.conversationNote || lead.contactNotes) && !lead.customerResponse?.note && (lead.query || lead.specialRequests) && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2 text-[11px] text-slate-700 flex items-start gap-1.5">
          <MessageSquare size={12} className="mt-0.5 text-slate-400 shrink-0" />
          <div className="min-w-0">
            <span className="font-bold text-[9px] uppercase tracking-wider text-slate-500 block">Customer Enquiry:</span>
            <p className="line-clamp-2 leading-tight">
              {lead.query || lead.specialRequests}
            </p>
          </div>
        </div>
      )}

      {/* Budget & Agent */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
        <span className="font-extrabold text-slate-900 flex items-center gap-1">
          <Wallet size={11} className="text-emerald-600" />
          {lead.budget ? formatCurrency(lead.budget) : "Open"}
        </span>

        <span className="text-slate-400 font-medium flex items-center gap-1">
          <UserRound size={11} />
          {getAgentShort(lead)}
        </span>
      </div>

      {/* Quick Stage Controls & Actions */}
      <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-50">
        <div className="flex items-center gap-1">
          <button
            onClick={onMovePrev}
            disabled={!canMovePrev}
            title="Move to previous stage"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={onMoveNext}
            disabled={!canMoveNext}
            title="Move to next stage"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <Link
            to={`/admin/quotes?id=${lead.id || lead._id}`}
            className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
            title="Open in Quotations Desk"
          >
            <FileText size={10} className="text-emerald-700" />
            <span>Quote</span>
          </Link>

          {!isWon && ["qualified", "proposal", "negotiation"].includes(currentStatus) && (
            <button
              onClick={onConvert}
              title="Convert to booking"
              className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 transition"
            >
              <CheckCircle size={10} />
              <span>Convert</span>
            </button>
          )}

          <button
            onClick={onInspect}
            className="text-[11px] font-semibold text-slate-500 hover:text-emerald-700 transition"
          >
            Details
          </button>
        </div>
      </div>
    </article>
  );
}
