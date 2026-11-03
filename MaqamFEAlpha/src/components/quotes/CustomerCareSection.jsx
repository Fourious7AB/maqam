import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Search,
  Plus,
  RefreshCw,
  Clock,
  Tag,
  CheckCircle2,
  RotateCcw,
  Calendar,
  Users,
  Wallet,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  X,
  FileText,
  AlertCircle,
  Headphones,
  LifeBuoy,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-toastify";
import { quoteService, STAGE_CONFIG } from "../../services/quoteService";
import formatCurrency from "../../admin/utils/formatCurrency";
import RequestQuoteModal from "./RequestQuoteModal";
import QuoteResponseModal from "./QuoteResponseModal";
import QuoteTimeline from "./QuoteTimeline";
import TrackQuoteCard from "./TrackQuoteCard";

const FAQ_ITEMS = [
  {
    q: "How long does it take to receive a quotation proposal?",
    a: "Our dedicated travel specialists review custom enquiries within 2 to 4 business hours. You will receive an instant notification on WhatsApp and Email once the tailored proposal and pricing are ready.",
  },
  {
    q: "Can I request changes or negotiate the price?",
    a: "Yes! Simply click 'Request Changes' on any issued proposal. You can ask for hotel room upgrades, alternate flight airlines, or adjusted pricing. Your specialist will issue a revised proposal immediately.",
  },
  {
    q: "What happens when I accept a quotation?",
    a: "When you accept, the package terms are locked in. Your specialist will prepare the verified booking invoice and guide you through secure payment via credit card, bank transfer, or net banking.",
  },
  {
    q: "Can I track a quotation requested as a guest?",
    a: "Yes! Use the 'Track with Reference' feature above. Enter your quotation reference (e.g. QT-A1B2C3D4) and registered phone number to view real-time status and respond to proposals.",
  },
];

export default function CustomerCareSection() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [responseModalQuote, setResponseModalQuote] = useState(null);
  const [selectedDetailQuote, setSelectedDetailQuote] = useState(null);
  const [showTrackBox, setShowTrackBox] = useState(false);
  const [copiedRef, setCopiedRef] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  const fetchQuotes = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const res = await quoteService.getMyQuotes({ page: 1, limit: 50 });
      setQuotes(res.quotes || []);
    } catch (err) {
      console.warn("Error fetching customer quotes:", err);
      toast.error("Could not load your quotations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleCopy = (ref) => {
    if (!ref) return;
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    toast.success(`Copied ${ref} to clipboard`);
    setTimeout(() => setCopiedRef(null), 2500);
  };

  // Proposal readiness helper
  const isQuoteProposalReady = (q) => {
    const hasPrice = Boolean(q.quote?.price || (q.quotedPrice && q.quotedPrice > 0));
    const hasResponded = Boolean(q.customerResponse?.action);
    const isCompleted = q.stage === "accepted" || q.stage === "booked" || q.stage === "closed";
    return (q.stage === "quote_ready" || hasPrice) && !hasResponded && !isCompleted;
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = quotes.length;
    const ready = quotes.filter(isQuoteProposalReady).length;
    const inReview = quotes.filter(
      (q) => (q.stage === "under_review" || q.stage === "revision_requested") && !isQuoteProposalReady(q)
    ).length;
    const accepted = quotes.filter(
      (q) => q.stage === "accepted" || q.stage === "booked" || q.customerResponse?.action === "accepted"
    ).length;
    return { total, ready, inReview, accepted };
  }, [quotes]);

  // Filtered quotes
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      // Tab filter
      if (filterTab === "ready") {
        if (!isQuoteProposalReady(q)) return false;
      } else if (filterTab === "in_review") {
        if (q.stage !== "under_review" && q.stage !== "revision_requested") return false;
      } else if (filterTab === "accepted") {
        if (q.stage !== "accepted" && q.stage !== "booked" && q.customerResponse?.action !== "accepted") return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const haystack = `${q.reference} ${q.destination} ${q.tripType} ${q.contact?.firstName} ${q.contact?.lastName}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [quotes, filterTab, searchQuery]);

  return (
    <div className="space-y-6 font-poppins">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-[#0f6b7b] via-[#0d7c89] to-[#0b5b73] p-5 sm:p-7 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-teal-100 backdrop-blur-xs">
              <Headphones size={13} />
              <span>Customer Care & Trip Quotations Desk</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Your Customized Journeys
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed">
              Track your custom Umrah & Hajj quotation requests, review specialist pricing proposals, negotiate or accept with 1-click, and access 24/7 dedicated assistance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsRequestModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-[#0f6b7b] shadow-sm hover:bg-teal-50 transition cursor-pointer active:scale-95"
            >
              <Plus size={16} />
              <span>Request New Quote</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTrackBox(!showTrackBox)}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/25 transition cursor-pointer border border-white/20"
            >
              <Search size={15} />
              <span>{showTrackBox ? "Hide Tracker" : "Track Reference"}</span>
            </button>

            <button
              type="button"
              onClick={() => fetchQuotes(true)}
              disabled={refreshing}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer border border-white/15"
              title="Refresh Quotations"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1527] p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Quotes
          </span>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            {kpis.total}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Enquiries created</span>
        </div>

        <div className="rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
              Proposals Ready
            </span>
            {kpis.ready > 0 && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600" />
              </span>
            )}
          </div>
          <p className="mt-1 text-2xl font-black text-purple-950 dark:text-purple-200">
            {kpis.ready}
          </p>
          <span className="text-[10px] text-purple-700/80 dark:text-purple-300/80 font-semibold">
            Action needed (Review/Accept)
          </span>
        </div>

        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
            Under Review
          </span>
          <p className="mt-1 text-2xl font-black text-amber-950 dark:text-amber-200">
            {kpis.inReview}
          </p>
          <span className="text-[10px] text-amber-700/80 dark:text-amber-300/80">Specialist preparing options</span>
        </div>

        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
            Accepted / Booked
          </span>
          <p className="mt-1 text-2xl font-black text-emerald-950 dark:text-emerald-200">
            {kpis.accepted}
          </p>
          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80">Confirmed travel deals</span>
        </div>
      </div>

      {/* Track Box Drawer */}
      {showTrackBox && (
        <TrackQuoteCard
          onQuoteFound={(found) => {
            fetchQuotes(true);
            setSelectedDetailQuote(found);
          }}
        />
      )}

      {/* Main Quotations Panel */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1527] p-4 sm:p-6 shadow-xs space-y-5">
        {/* Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: `All Quotes (${kpis.total})` },
              { id: "ready", label: `Proposals Ready (${kpis.ready})` },
              { id: "in_review", label: `In Review (${kpis.inReview})` },
              { id: "accepted", label: `Accepted (${kpis.accepted})` },
            ].map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  filterTab === tab.id
                    ? "bg-[#0f6b7b] text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, city..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9 pr-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f6b7b] dark:focus:border-teal-400 focus:bg-white"
            />
          </div>
        </div>

        {/* Quotations List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw size={24} className="animate-spin mx-auto text-[#0f6b7b]" />
            <p className="text-xs font-semibold">Loading your quotations...</p>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-[#0f6b7b] dark:text-teal-400">
              <Sparkles size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                No quotations found
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {filterTab === "all"
                  ? "You haven't requested any custom trip quotations yet. Submit a request to receive tailored Umrah proposals from our specialists."
                  : `No quotations currently match the '${filterTab}' filter.`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsRequestModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0f6b7b] to-[#0d7c89] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:from-[#0d5f6f] hover:to-[#0a6572] transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Request a Custom Quote</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredQuotes.map((quote) => {
              const stageMeta =
                STAGE_CONFIG[quote.stage] || {
                  label: quote.stage || "Under Review",
                  tone: "bg-slate-100 text-slate-700 border-slate-200",
                  dotTone: "bg-slate-400",
                };

              const hasProposal = Boolean(
                quote.quote?.price || (quote.quotedPrice && quote.quotedPrice > 0)
              );
              const quotedPrice = quote.quote?.price || quote.quotedPrice;
              const isProposalReady = isQuoteProposalReady(quote);
              const hasResponse = Boolean(quote.customerResponse?.action);

              return (
                <div
                  key={quote.id || quote.reference}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] p-4 sm:p-5 shadow-xs hover:border-teal-300 dark:hover:border-teal-800 transition-all space-y-4"
                >
                  {/* Top Bar: Reference & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-black tracking-wider text-slate-800 dark:text-slate-100 font-mono">
                        {quote.reference}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(quote.reference)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                        title="Copy Reference"
                      >
                        {copiedRef === quote.reference ? (
                          <Check size={14} className="text-emerald-600" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                      <span className="text-[11px] text-slate-400">
                        {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : ""}
                      </span>
                    </div>

                    {/* Stage Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold ${stageMeta.tone}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${stageMeta.dotTone || "bg-teal-500"}`} />
                      {stageMeta.label}
                    </span>
                  </div>

                  {/* Main Grid: Details & Proposal Price */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Destination & Travellers */}
                    <div className="md:col-span-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-[#0f6b7b] dark:text-teal-400 shrink-0" />
                        <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                          {quote.destination}
                        </h4>
                        <span className="rounded-md bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 text-[10px] font-bold text-teal-800 dark:text-teal-300 border border-teal-100 dark:border-teal-900/60 uppercase">
                          {quote.tripType || "Umrah"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Users size={13} className="text-slate-400" />
                          <strong>{quote.numberOfPeople || 2}</strong> Traveller(s)
                        </span>

                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          {quote.travelDates?.from ? (
                            <span>
                              {new Date(quote.travelDates.from).toLocaleDateString()}
                              {quote.travelDates?.to && ` → ${new Date(quote.travelDates.to).toLocaleDateString()}`}
                            </span>
                          ) : (
                            <span>Dates Flexible</span>
                          )}
                        </span>

                        <span className="flex items-center gap-1.5">
                          <Wallet size={13} className="text-slate-400" />
                          Target Budget: <strong>{quote.budget ? formatCurrency(quote.budget) : "Open"}</strong>
                        </span>
                      </div>

                      {quote.specialRequests && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 italic bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 border border-slate-100 dark:border-slate-800">
                          &ldquo;{quote.specialRequests}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Financial / Proposal Box */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3.5 flex flex-col justify-between space-y-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Quotation Proposal
                        </span>
                        {hasProposal ? (
                          <div className="mt-0.5">
                            <span className="text-xl font-black text-purple-950 dark:text-purple-200">
                              {formatCurrency(quotedPrice)}
                            </span>
                            <span className="text-[10px] text-purple-700 dark:text-purple-300 block">
                              Total package price for {quote.numberOfPeople} pax
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-500 mt-1 block">
                            Calculating custom tariff...
                          </span>
                        )}
                      </div>

                      {quote.quote?.expiresAt && (
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock size={11} /> Valid until {new Date(quote.quote.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer Response Status Banner if already answered */}
                  {hasResponse && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          {quote.customerResponse.action === "accepted" ? (
                            <CheckCircle2 size={15} className="text-emerald-600" />
                          ) : quote.customerResponse.action === "changes_requested" ? (
                            <RotateCcw size={15} className="text-sky-600" />
                          ) : (
                            <AlertCircle size={15} className="text-rose-600" />
                          )}
                          Your Decision:{" "}
                          <span className="capitalize text-slate-900 dark:text-white font-extrabold">
                            {quote.customerResponse.action.replace("_", " ")}
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {quote.customerResponse.respondedAt
                            ? new Date(quote.customerResponse.respondedAt).toLocaleDateString()
                            : ""}
                        </span>
                      </div>
                      {quote.customerResponse.note && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                          Notes: &ldquo;{quote.customerResponse.note}&rdquo;
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDetailQuote(quote)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0f6b7b] dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 transition cursor-pointer"
                    >
                      <FileText size={14} />
                      <span>View Details & Timeline</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {isProposalReady && (
                        <button
                          type="button"
                          onClick={() => setResponseModalQuote(quote)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:from-purple-700 hover:to-indigo-700 transition cursor-pointer"
                        >
                          <Tag size={13} />
                          <span>Review & Respond</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Support & Assistance Center */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1527] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/60 text-[#0f6b7b] dark:text-teal-300">
            <LifeBuoy size={18} />
          </div>
          <div>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
              24/7 Specialist Customer Care
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Need assistance modifying your package or speaking directly with a travel specialist?
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <a
            href="tel:+919876543210"
            className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3.5 hover:border-teal-400 transition group"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              <Phone size={16} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Direct Hotline
              </span>
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-[#0f6b7b]">
                +91 98765 43210
              </span>
            </div>
          </a>

          <a
            href="https://wa.me/919876543210"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3.5 hover:border-teal-400 transition group"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400">
              <MessageCircle size={16} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                WhatsApp Chat
              </span>
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-green-600">
                Live Specialist Desk
              </span>
            </div>
          </a>

          <a
            href="mailto:support@maqam.com"
            className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3.5 hover:border-teal-400 transition group"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
              <Mail size={16} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Email Desk
              </span>
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-blue-600">
                support@maqam.com
              </span>
            </div>
          </a>
        </div>

        {/* FAQs */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Frequently Asked Questions
          </span>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between p-3 text-left text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      size={15}
                      className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-2">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Request Modal */}
      <RequestQuoteModal
        isOpen={isRequestModalOpen}
        onClose={() => {
          setIsRequestModalOpen(false);
          fetchQuotes(true);
        }}
        onSuccess={() => fetchQuotes(true)}
      />

      {/* Response Modal */}
      <QuoteResponseModal
        isOpen={Boolean(responseModalQuote)}
        quote={responseModalQuote}
        onClose={() => setResponseModalQuote(null)}
        onResponded={(updated) => {
          fetchQuotes(true);
          setSelectedDetailQuote(updated);
        }}
      />

      {/* Detailed Quote View Modal */}
      {selectedDetailQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in font-poppins">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white dark:bg-[#0d1527] shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0f6b7b] to-[#0d7c89] px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <FileText size={20} />
                <div>
                  <h3 className="text-base font-extrabold">
                    Quotation Details — {selectedDetailQuote.reference}
                  </h3>
                  <p className="text-xs text-teal-100">
                    {selectedDetailQuote.destination}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailQuote(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
              {/* Proposal Box if ready */}
              {selectedDetailQuote.quotedPrice > 0 && (
                <div className="rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/70 dark:bg-purple-950/40 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
                      Official Proposal Tariff
                    </span>
                    {selectedDetailQuote.quoteExpiresAt && (
                      <span className="text-[11px] text-purple-700 dark:text-purple-300">
                        Expires {new Date(selectedDetailQuote.quoteExpiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-purple-950 dark:text-purple-100">
                      {formatCurrency(selectedDetailQuote.quotedPrice)}
                    </span>
                    <span className="text-xs text-purple-700 dark:text-purple-300">
                      All inclusive package for {selectedDetailQuote.numberOfPeople} person(s)
                    </span>
                  </div>
                </div>
              )}

              {/* Travel Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">Destination</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{selectedDetailQuote.destination}</span>
                </div>
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">Travellers</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{selectedDetailQuote.numberOfPeople} Person(s)</span>
                </div>
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">Trip Type</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 capitalize">{selectedDetailQuote.tripType}</span>
                </div>
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">Target Budget</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{formatCurrency(selectedDetailQuote.budget)}</span>
                </div>
                <div className="sm:col-span-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">Travel Dates</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {selectedDetailQuote.travelDates?.from
                      ? `${new Date(selectedDetailQuote.travelDates.from).toLocaleDateString()} → ${
                          selectedDetailQuote.travelDates.to
                            ? new Date(selectedDetailQuote.travelDates.to).toLocaleDateString()
                            : ""
                        }`
                      : "Flexible dates"}
                  </span>
                </div>
              </div>

              {/* Special Requests */}
              {selectedDetailQuote.specialRequests && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Special Requests & Preferences
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedDetailQuote.specialRequests}
                  </p>
                </div>
              )}

              {/* Timeline */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Quotation Timeline & Status
                </span>
                <QuoteTimeline quote={selectedDetailQuote} />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setSelectedDetailQuote(null)}
                className="rounded-xl bg-slate-200 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition cursor-pointer"
              >
                Close
              </button>

              {selectedDetailQuote.stage === "quote_ready" && (
                <button
                  type="button"
                  onClick={() => {
                    setResponseModalQuote(selectedDetailQuote);
                    setSelectedDetailQuote(null);
                  }}
                  className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white hover:bg-purple-700 transition cursor-pointer"
                >
                  Respond to Proposal
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
