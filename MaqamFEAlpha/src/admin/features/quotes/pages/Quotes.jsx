import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  X,
  FileText,
  UserRound,
  Calendar,
  Wallet,
  Phone,
  Mail,
  MessageCircle,
  Send,
  UserCheck,
  ShieldAlert,
  ArrowUpDown,
  Filter,
  CheckCircle,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Tag,
  AlertCircle,
  RotateCcw,
  MessageSquare,
  MessageSquareQuote,
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../components/common/Button";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import formatCurrency from "../../../utils/formatCurrency";
import { quotesApi, normalizeQuote } from "../quotesApi";
import { leadsApi } from "../../leads/leadsApi";
import LeadsHeader from "../../leads/components/LeadsHeader";
import QuoteDetailsDrawer from "../components/QuoteDetailsDrawer";
import AssignQuoteModal from "../components/AssignQuoteModal";
import SendProposalModal from "../components/SendProposalModal";

const STATUS_TABS = [
  { key: "all", label: "All Quotes" },
  { key: "unhandled", label: "Unhandled", tone: "bg-amber-50 text-amber-800 border-amber-200" },
  { key: "new", label: "New", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "proposal_sent", label: "Proposal Sent", tone: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "negotiation", label: "Negotiating", tone: "bg-rose-50 text-rose-700 border-rose-200" },
  { key: "won", label: "Won", tone: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  { key: "lost", label: "Lost", tone: "bg-slate-100 text-slate-600 border-slate-200" },
];

const STATUS_BADGES = {
  new: { label: "New", className: "bg-blue-50 text-blue-700 border-blue-200" },
  unhandled: { label: "Unhandled", className: "bg-amber-50 text-amber-800 border-amber-200" },
  proposal_sent: { label: "Proposal Sent", className: "bg-purple-50 text-purple-700 border-purple-200" },
  negotiation: { label: "Negotiating", className: "bg-rose-50 text-rose-700 border-rose-200" },
  won: { label: "Won", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  lost: { label: "Lost", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

export default function Quotes() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Quotations and KPI state
  const [quotations, setQuotations] = useState([]);
  const [kpis, setKpis] = useState({
    total: 0,
    unhandled: 0,
    proposalSent: 0,
    negotiation: 0,
    won: 0,
    totalPipelineValue: 0,
  });
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters state
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // Modal & Drawer state
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [proposalTarget, setProposalTarget] = useState(null);

  // Fetch agents list
  useEffect(() => {
    leadsApi
      .listAgents()
      .then((res) => {
        if (Array.isArray(res)) setAgents(res);
      })
      .catch(() => {});
  }, []);

  // Main data loader
  const loadQuotations = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const params = {
        page,
        limit,
        search: search.trim() || undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        agentId: selectedAgent !== "all" ? selectedAgent : undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      };

      const [res, kpiRes] = await Promise.all([
        quotesApi.list(params),
        quotesApi.getKpis(),
      ]);

      setQuotations(res.quotations || []);
      setPagination(res.pagination || { total: res.quotations?.length || 0, page: 1, limit: 20, totalPages: 1 });
      if (kpiRes) setKpis(kpiRes);
    } catch (err) {
      setError(err.message || "Failed to load quotations");
      toast.error("Could not retrieve quotations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, [page, limit, selectedStatus, selectedAgent, fromDate, toDate]);

  // Handle live search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadQuotations();
    }, 280);
    return () => clearTimeout(timer);
  }, [search]);

  // Open drawer if query param ?id= is present
  useEffect(() => {
    const targetId = searchParams.get("id");
    if (!targetId) return;

    const activateQuote = (quote) => {
      if (!quote) return;
      setSelectedQuote(quote);
      setDrawerOpen(true);
      const quoteId = quote._id || quote.id;
      setQuotations((prev) => {
        const exists = prev.some(
          (q) => (q._id || q.id) === quoteId || (quote.leadId && (q.leadId === quote.leadId || q._id === quote.leadId))
        );
        if (exists) return prev;
        return [quote, ...prev];
      });
    };

    if (quotations.length) {
      const match = quotations.find(
        (q) => q._id === targetId || q.id === targetId || q.leadId === targetId || q.lead?._id === targetId
      );
      if (match) {
        activateQuote(match);
        return;
      }
    }

    const fallbackToLead = (id) => {
      leadsApi
        .getById(id)
        .then((lead) => {
          if (lead) {
            const draft = quotesApi.createFromLead(lead);
            activateQuote(draft);
          }
        })
        .catch(() => {});
    };

    quotesApi
      .getById(targetId)
      .then((res) => {
        const quote = res?.quotation || res;
        if (quote && (quote._id || quote.id)) {
          activateQuote(quote);
        } else {
          fallbackToLead(targetId);
        }
      })
      .catch(() => {
        fallbackToLead(targetId);
      });
  }, [searchParams, quotations]);

  // Actions
  const handleOpenDrawer = (quote) => {
    setSelectedQuote(quote);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedQuote(null);
    if (searchParams.get("id")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("id");
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleQuoteUpdated = (updatedQuote) => {
    if (!updatedQuote) return;
    const targetId = updatedQuote._id || updatedQuote.id;
    setQuotations((prev) => {
      const exists = prev.some(
        (q) =>
          (q._id || q.id) === targetId ||
          (updatedQuote.leadId && (q.leadId === updatedQuote.leadId || q._id === updatedQuote.leadId))
      );
      if (exists) {
        return prev.map((q) =>
          (q._id || q.id) === targetId ||
          (updatedQuote.leadId && (q.leadId === updatedQuote.leadId || q._id === updatedQuote.leadId))
            ? updatedQuote
            : q
        );
      }
      return [updatedQuote, ...prev];
    });

    if (
      selectedQuote &&
      ((selectedQuote._id || selectedQuote.id) === targetId ||
        (updatedQuote.leadId && selectedQuote.leadId === updatedQuote.leadId))
    ) {
      setSelectedQuote(updatedQuote);
    }
    quotesApi.getKpis().then((res) => res && setKpis(res));
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedStatus("all");
    setSelectedAgent("all");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(search) ||
    selectedStatus !== "all" ||
    selectedAgent !== "all" ||
    Boolean(fromDate) ||
    Boolean(toDate);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with View Switcher */}
      <LeadsHeader
        activeView="quotes"
        totalCount={pagination.total}
        refreshing={refreshing}
        onRefresh={() => loadQuotations(true)}
      />

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Total Website Quotes */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Website Quotes
            </span>
            <span className="rounded-xl bg-slate-100 p-2 text-slate-700">
              <FileText size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{kpis.total}</p>
          <span className="text-[11px] font-medium text-slate-400">Inbound website requests</span>
        </div>

        {/* Unhandled / Action Required */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Unhandled Leads
            </span>
            <span className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <ShieldAlert size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-950">{kpis.unhandled}</p>
          <span className="text-[11px] font-semibold text-amber-700">Awaiting specialist assignment</span>
        </div>

        {/* Proposals Sent */}
        <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-800">
              Proposals Sent
            </span>
            <span className="rounded-xl bg-purple-100 p-2 text-purple-700">
              <Send size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-purple-950">{kpis.proposalSent}</p>
          <span className="text-[11px] font-semibold text-purple-700">Quotes in customer review</span>
        </div>

        {/* Converted / Won Deals */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Won / Booked
            </span>
            <span className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <CheckCircle size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-950">{kpis.won}</p>
          <span className="text-[11px] font-semibold text-emerald-700">Deals converted to booking</span>
        </div>

        {/* Pipeline Value */}
        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Quoted Pipeline
            </span>
            <span className="rounded-xl bg-emerald-100 p-2 text-emerald-800">
              <Wallet size={16} />
            </span>
          </div>
          <p className="mt-2 text-xl font-black text-slate-900 truncate">
            {formatCurrency(kpis.totalPipelineValue)}
          </p>
          <span className="text-[11px] font-medium text-slate-400">Total active proposal value</span>
        </div>
      </div>

      {/* 3. Filter Toolbar & Search Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3.5">
        {/* Top search & quick selects */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search box */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, email, phone, destination, or ref (QT-XXXX)..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 py-2 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-50"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Agent Filter + Date Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Website Inbound Filter Indicator */}
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Website Enquiries</span>
            </span>

            {/* Agent Dropdown */}
            <select
              value={selectedAgent}
              onChange={(e) => {
                setSelectedAgent(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="all">All Specialists</option>
              <option value="unhandled">Unhandled / Unassigned</option>
              {agents.map((agent) => {
                const id = agent._id || agent.id;
                const name =
                  agent.name ||
                  [agent.firstName, agent.lastName].filter(Boolean).join(" ") ||
                  agent.email;
                return (
                  <option key={id} value={id}>
                    {name}
                  </option>
                );
              })}
            </select>

            {/* From Date */}
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500"
              title="Filter from date"
            />

            {/* To Date */}
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500"
              title="Filter to date"
            />

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                title="Reset filters"
              >
                <X size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Chips Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1 border-t border-slate-100">
          {STATUS_TABS.map((tab) => {
            const isActive = selectedStatus === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setSelectedStatus(tab.key);
                  setPage(1);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Quotations Content Area */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <LoadingSpinner text="Retrieving quotations..." />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800 space-y-2">
          <p className="font-bold text-sm">Failed to load quotations</p>
          <p className="text-xs text-rose-600">{error}</p>
          <Button variant="secondary" onClick={() => loadQuotations(true)} className="!h-8 !text-xs !mt-2">
            Try Again
          </Button>
        </div>
      ) : quotations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-800">
            <FileText size={24} />
          </div>
          <h3 className="font-bold text-slate-900 text-base">No Quotations Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {hasActiveFilters
              ? "No quotations match your active search or filters. Try resetting the filters."
              : "No customer quote requests recorded yet."}
          </p>
          {hasActiveFilters && (
            <Button variant="secondary" onClick={handleResetFilters} className="!h-8 !text-xs !mx-auto">
              Clear All Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View (lg+) */}
          <div className="hidden lg:block overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Reference & Lead</th>
                    <th className="px-5 py-3.5">Destination & Pax</th>
                    <th className="px-5 py-3.5">Budget / Quoted</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-4 py-3.5 min-w-[200px]">Customer Notes & Dialogue</th>
                    <th className="px-5 py-3.5">Specialist</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {quotations.map((quote) => {
                    const id = quote._id || quote.id;
                    const badge = STATUS_BADGES[quote.status] || {
                      label: quote.status,
                      className: "bg-slate-100 text-slate-600 border-slate-200",
                    };
                    const isUnh =
                      quote.status === "unhandled" ||
                      (!quote.assignedTo && quote.status === "new");

                    return (
                      <tr
                        key={id}
                        className="group hover:bg-slate-50/70 transition cursor-pointer"
                        onClick={() => handleOpenDrawer(quote)}
                      >
                        {/* Reference & Customer */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-sm font-black text-emerald-800 border border-emerald-100">
                              {quote.customerName?.charAt(0)?.toUpperCase() || "Q"}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition">
                                  {quote.customerName}
                                </span>
                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-600">
                                  {quote.quoteReference}
                                </span>
                                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-100">
                                  Website
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 truncate">
                                {quote.phone || quote.email || "No contact"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Destination & Pax */}
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-900">{quote.destination}</p>
                          <p className="text-[11px] text-slate-500">
                            {quote.numberOfPeople || 2} Pax · <span className="capitalize">{quote.tripType || "Umrah"}</span>
                          </p>
                        </td>

                        {/* Budget vs Quoted Price */}
                        <td className="px-5 py-3.5">
                          {quote.quotedPrice > 0 ? (
                            <div>
                              <span className="font-extrabold text-emerald-700 text-xs">
                                {formatCurrency(quote.quotedPrice)}
                              </span>
                              <p className="text-[10px] text-slate-400">
                                Budget: {quote.budget ? formatCurrency(quote.budget) : "Open"}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <span className="font-bold text-slate-700 text-xs">
                                {quote.budget ? formatCurrency(quote.budget) : "Open"}
                              </span>
                              <p className="text-[10px] text-amber-600 font-semibold">Not quoted</p>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                            {quote.customerResponse?.action && (
                              <div className="flex items-center gap-1">
                                {quote.customerResponse.action === "accepted" && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-200">
                                    <CheckCircle size={10} /> Accepted
                                  </span>
                                )}
                                {quote.customerResponse.action === "changes_requested" && (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold text-sky-800 border border-sky-200"
                                    title={quote.customerResponse.note || "Changes requested"}
                                  >
                                    <RotateCcw size={10} /> Revision Req
                                  </span>
                                )}
                                {quote.customerResponse.action === "rejected" && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-800 border border-rose-200">
                                    <X size={10} /> Declined
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Customer Notes & Conversation */}
                        <td className="px-4 py-3.5 max-w-[240px]">
                          {/* Dialogue / Conversation Note */}
                          {(quote.conversationNote || quote.quoteNotes) ? (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-2 text-[11px] text-emerald-950 space-y-0.5">
                              <div className="flex items-center justify-between text-[10px] font-bold text-emerald-900 uppercase tracking-wide">
                                <span className="flex items-center gap-1">
                                  <MessageSquare size={11} className="text-emerald-700 shrink-0" />
                                  <span>{quote.conversationChannel === "Call" ? "📞" : quote.conversationChannel === "WhatsApp" ? "💬" : quote.conversationChannel === "Email" ? "✉️" : "📝"} Conversation Note</span>
                                </span>
                                {quote.conversationChannel && (
                                  <span className="rounded bg-emerald-100/90 px-1 py-0.2 text-[9px] font-bold text-emerald-800">
                                    {quote.conversationChannel}
                                  </span>
                                )}
                              </div>
                              <p className="line-clamp-2 italic font-medium leading-tight" title={quote.conversationNote || quote.quoteNotes}>
                                &ldquo;{quote.conversationNote || quote.quoteNotes}&rdquo;
                              </p>
                            </div>
                          ) : null}

                          {/* Customer Feedback Note */}
                          {quote.customerResponse?.note && (
                            <div className={`rounded-xl border border-sky-200 bg-sky-50/70 p-2 text-[11px] text-sky-950 space-y-0.5 ${
                              quote.conversationNote || quote.quoteNotes ? "mt-1.5" : ""
                            }`}>
                              <div className="flex items-center gap-1 font-bold text-sky-900 text-[10px] uppercase tracking-wide">
                                <MessageSquareQuote size={11} className="text-sky-700 shrink-0" />
                                <span>Customer Feedback</span>
                              </div>
                              <p className="line-clamp-2 italic leading-tight" title={quote.customerResponse.note}>
                                &ldquo;{quote.customerResponse.note}&rdquo;
                              </p>
                            </div>
                          )}

                          {/* Customer Inbound Enquiry Note (shown if no dialogue note yet) */}
                          {!(quote.conversationNote || quote.quoteNotes) && (quote.specialRequests || quote.query) && (
                            <div className={`rounded-xl border border-slate-200 bg-slate-50/80 p-2 text-[11px] text-slate-700 space-y-0.5 ${
                              quote.customerResponse?.note ? "mt-1.5" : ""
                            }`}>
                              <div className="flex items-center gap-1 font-bold text-slate-600 text-[10px] uppercase tracking-wide">
                                <MessageSquareQuote size={11} className="text-emerald-700 shrink-0" />
                                <span>Inbound Enquiry</span>
                              </div>
                              <p className="line-clamp-2 italic leading-tight" title={quote.specialRequests || quote.query}>
                                &ldquo;{quote.specialRequests || quote.query}&rdquo;
                              </p>
                            </div>
                          )}

                          {/* No notes logged */}
                          {!(quote.conversationNote || quote.quoteNotes) && !quote.customerResponse?.note && !(quote.specialRequests || quote.query) && (
                            <span className="text-[11px] text-slate-400 italic">No notes logged</span>
                          )}
                        </td>

                        {/* Specialist */}
                        <td className="px-5 py-3.5">
                          {quote.assignedAgent ? (
                            <div className="flex items-center gap-2">
                              <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 font-bold text-[10px] text-slate-700">
                                {quote.assignedAgent.firstName?.charAt(0) || "A"}
                              </span>
                              <span className="font-semibold text-slate-800 truncate max-w-[120px]">
                                {[quote.assignedAgent.firstName, quote.assignedAgent.lastName]
                                  .filter(Boolean)
                                  .join(" ") || "Specialist"}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                              <ShieldAlert size={11} /> Unassigned
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {isUnh ? (
                              <button
                                onClick={() => setAssignTarget(quote)}
                                className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 transition"
                              >
                                Assign
                              </button>
                            ) : (
                              <button
                                onClick={() => setProposalTarget(quote)}
                                className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                                  quote.customerResponse?.action === "changes_requested"
                                    ? "border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                }`}
                              >
                                {quote.customerResponse?.action === "changes_requested"
                                  ? "Revise Quote"
                                  : quote.quotedPrice > 0
                                  ? "Update Quote"
                                  : "Send Quote"}
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenDrawer(quote)}
                              className="rounded-lg border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition"
                              title="View dossier"
                            >
                              <ExternalLink size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile / Tablet Cards View (<lg) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 lg:hidden">
            {quotations.map((quote) => {
              const id = quote._id || quote.id;
              const badge = STATUS_BADGES[quote.status] || {
                label: quote.status,
                className: "bg-slate-100 text-slate-600 border-slate-200",
              };
              const isUnh =
                quote.status === "unhandled" ||
                (!quote.assignedTo && quote.status === "new");

              return (
                <div
                  key={id}
                  onClick={() => handleOpenDrawer(quote)}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3 cursor-pointer hover:border-emerald-300 transition"
                >
                  {/* Top: Customer & Ref & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-sm font-black text-emerald-800 border border-emerald-100">
                        {quote.customerName?.charAt(0)?.toUpperCase() || "Q"}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-tight">
                          {quote.customerName}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[11px] text-slate-400">
                            {quote.quoteReference}
                          </span>
                          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-100">
                            {quote.source || "Website"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      {quote.customerResponse?.action && (
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold border ${
                            quote.customerResponse.action === "accepted"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : quote.customerResponse.action === "changes_requested"
                              ? "bg-sky-50 text-sky-800 border-sky-200"
                              : "bg-rose-50 text-rose-800 border-rose-200"
                          }`}
                        >
                          {quote.customerResponse.action === "accepted"
                            ? "✓ Accepted"
                            : quote.customerResponse.action === "changes_requested"
                            ? "⟲ Revision Req"
                            : "Declined"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Trip Details & Financials */}
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50/70 p-2.5 text-xs text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Destination</span>
                      <span className="font-bold truncate block">{quote.destination}</span>
                      <span className="text-[10px] text-slate-500">{quote.numberOfPeople || 2} Pax</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Quoted Price</span>
                      {quote.quotedPrice > 0 ? (
                        <span className="font-extrabold text-emerald-700 block">
                          {formatCurrency(quote.quotedPrice)}
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold block">Not quoted yet</span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        Budget: {quote.budget ? formatCurrency(quote.budget) : "Open"}
                      </span>
                    </div>
                  </div>

                  {/* Customer Conversation & Dialogue Note Snippet */}
                  {(quote.conversationNote || quote.quoteNotes) && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5 text-xs text-emerald-950 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-emerald-900 uppercase">
                        <span className="flex items-center gap-1">
                          <MessageSquare size={12} className="text-emerald-700 shrink-0" />
                          <span>{quote.conversationChannel === "Call" ? "📞" : quote.conversationChannel === "WhatsApp" ? "💬" : quote.conversationChannel === "Email" ? "✉️" : "📝"} Conversation Note</span>
                        </span>
                        {quote.conversationChannel && (
                          <span className="rounded bg-emerald-100 px-1 py-0.2 text-[9px] text-emerald-800">
                            {quote.conversationChannel}
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-2 italic text-[11px] font-medium leading-relaxed" title={quote.conversationNote || quote.quoteNotes}>
                        &ldquo;{quote.conversationNote || quote.quoteNotes}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Customer Feedback Snippet */}
                  {quote.customerResponse?.note && (
                    <div className="rounded-xl border border-sky-200 bg-sky-50 p-2.5 text-xs text-sky-950 space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-sky-900 uppercase">
                        <MessageSquareQuote size={12} className="text-sky-700 shrink-0" />
                        <span>Customer Feedback</span>
                      </div>
                      <p className="line-clamp-2 italic text-[11px] leading-relaxed" title={quote.customerResponse.note}>
                        &ldquo;{quote.customerResponse.note}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Inbound Enquiry (if no dialogue note yet) */}
                  {!(quote.conversationNote || quote.quoteNotes) && !quote.customerResponse?.note && (quote.specialRequests || quote.query) && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700 space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 uppercase">
                        <MessageSquareQuote size={12} className="text-slate-500 shrink-0" />
                        <span>Inbound Enquiry</span>
                      </div>
                      <p className="line-clamp-2 italic text-[11px] leading-relaxed" title={quote.specialRequests || quote.query}>
                        &ldquo;{quote.specialRequests || quote.query}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Specialist & Quick Actions */}
                  <div
                    className="flex items-center justify-between pt-1 border-t border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {quote.assignedAgent ? (
                      <span className="text-[11px] font-medium text-slate-600">
                        Specialist: <strong>{quote.assignedAgent.firstName}</strong>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                        <ShieldAlert size={12} /> Unassigned
                      </span>
                    )}

                    <div className="flex items-center gap-1.5">
                      {isUnh ? (
                        <Button
                          onClick={() => setAssignTarget(quote)}
                          className="!h-7 !px-2.5 !text-[11px] !bg-amber-600 hover:!bg-amber-700"
                        >
                          Assign
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setProposalTarget(quote)}
                          className={`!h-7 !px-2.5 !text-[11px] ${
                            quote.customerResponse?.action === "changes_requested"
                              ? "!bg-sky-700 hover:!bg-sky-800"
                              : "!bg-emerald-700 hover:!bg-emerald-800"
                          }`}
                        >
                          {quote.customerResponse?.action === "changes_requested"
                            ? "Revise"
                            : quote.quotedPrice > 0
                            ? "Update"
                            : "Send Quote"}
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        onClick={() => handleOpenDrawer(quote)}
                        className="!h-7 !px-2.5 !text-[11px]"
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 5. Responsive Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-3 text-xs shadow-2xs">
            <span className="text-slate-500">
              Showing{" "}
              <strong>
                {Math.min(
                  (pagination.page - 1) * pagination.limit + 1,
                  pagination.total
                )}
              </strong>{" "}
              to{" "}
              <strong>
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </strong>{" "}
              of <strong>{pagination.total}</strong> quotes
            </span>

            <div className="flex items-center gap-2">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="rounded-xl border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2 font-bold text-slate-700">
                  {pagination.page} / {pagination.totalPages || 1}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="rounded-xl border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quote Details Slide-Over Drawer with Backdrop Click Dismiss */}
      <QuoteDetailsDrawer
        quote={selectedQuote}
        open={drawerOpen}
        onClose={handleCloseDrawer}
        onUpdateQuote={handleQuoteUpdated}
        onOpenAssign={(q) => setAssignTarget(q)}
        onOpenSendProposal={(q) => setProposalTarget(q)}
      />

      {/* Assign Quote Modal with Backdrop Click Dismiss */}
      <AssignQuoteModal
        open={Boolean(assignTarget)}
        quote={assignTarget}
        agents={agents}
        onClose={() => setAssignTarget(null)}
        onAssigned={handleQuoteUpdated}
      />

      {/* Send Proposal Modal with Backdrop Click Dismiss */}
      <SendProposalModal
        open={Boolean(proposalTarget)}
        quote={proposalTarget}
        onClose={() => setProposalTarget(null)}
        onSent={handleQuoteUpdated}
      />
    </div>
  );
}
