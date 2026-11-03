import { useEffect, useState } from "react";
import {
  X,
  Phone,
  Mail,
  MapPin,
  Users,
  Calendar,
  Wallet,
  UserCheck,
  Send,
  MessageCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  FileText,
  DollarSign,
  AlertCircle,
  Tag,
  MessageSquare,
  MessageSquareQuote,
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../components/common/Button";
import formatCurrency from "../../../utils/formatCurrency";
import { quotesApi } from "../quotesApi";

const STATUS_CONFIG = {
  new: { label: "New Lead", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  unhandled: { label: "Unhandled", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  proposal_sent: { label: "Proposal Sent", tone: "bg-purple-50 text-purple-700 border-purple-200" },
  negotiation: { label: "Negotiating", tone: "bg-rose-50 text-rose-700 border-rose-200" },
  won: { label: "Won / Booked", tone: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  lost: { label: "Lost", tone: "bg-slate-100 text-slate-600 border-slate-200" },
};

export default function QuoteDetailsDrawer({
  quote,
  open,
  onClose,
  onUpdateQuote,
  onOpenAssign,
  onOpenSendProposal,
}) {
  const [activeQuote, setActiveQuote] = useState(quote);
  const [loading, setLoading] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [channel, setChannel] = useState("Call");
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    setActiveQuote(quote);
    if (quote?._id && open) {
      // Fetch fresh details with timeline
      quotesApi
        .getById(quote._id)
        .then((res) => {
          if (res?.quotation) setActiveQuote(res.quotation);
        })
        .catch(() => {});
    }
  }, [quote, open]);

  const handleAddConversationNote = async (e) => {
    e?.preventDefault?.();
    if (!noteText.trim()) return;
    const targetId = activeQuote?._id || activeQuote?.id;
    if (!targetId) return;

    try {
      setAddingNote(true);
      const res = await quotesApi.addNote(targetId, {
        note: noteText.trim(),
        channel,
        author: activeQuote.assignedAgent?.firstName || "Travel Specialist",
      });
      if (res?.quotation) {
        setActiveQuote(res.quotation);
        onUpdateQuote?.(res.quotation);
      }
      setNoteText("");
      toast.success("Customer conversation note logged successfully");
    } catch (err) {
      toast.error(err?.message || "Failed to log conversation note");
    } finally {
      setAddingNote(false);
    }
  };

  // Keyboard Escape listener
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !activeQuote) return null;

  const quoteId = activeQuote._id || activeQuote.id;
  const statusInfo = STATUS_CONFIG[activeQuote.status] || {
    label: activeQuote.status || "Unknown",
    tone: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const isUnhandled =
    activeQuote.status === "unhandled" ||
    (!activeQuote.assignedTo && activeQuote.status === "new");

  const handleStatusChange = async (newStatus) => {
    if (newStatus === activeQuote.status) return;
    try {
      setLoading(true);
      const res = await quotesApi.updateStatus(quoteId, newStatus);
      setActiveQuote(res.quotation);
      onUpdateQuote?.(res.quotation);
      toast.success(`Quote moved to ${newStatus.toUpperCase()}`);
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      {/* Blurred Backdrop Click-to-Dismiss */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-4 sm:pl-10 pointer-events-none">
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-screen max-w-xl bg-white shadow-2xl flex flex-col pointer-events-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-base font-black text-emerald-800 border border-emerald-100">
                {activeQuote.customerName?.charAt(0)?.toUpperCase() || "Q"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 leading-none">
                    {activeQuote.customerName}
                  </h2>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-700">
                    {activeQuote.quoteReference}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  {activeQuote.source || "Website Quote Lead"}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              aria-label="Close quote drawer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Contact & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-6 py-3">
            {activeQuote.phone && (
              <a
                href={`tel:${activeQuote.phone}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
              >
                <Phone size={13} className="text-slate-500" />
                <span>Call</span>
              </a>
            )}
            {activeQuote.phone && (
              <a
                href={`https://wa.me/${activeQuote.phone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition"
              >
                <MessageCircle size={13} className="text-emerald-600" />
                <span>WhatsApp</span>
              </a>
            )}
            {activeQuote.email && (
              <a
                href={`mailto:${activeQuote.email}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
              >
                <Mail size={13} className="text-slate-500" />
                <span>Email</span>
              </a>
            )}

            <div className="!ml-auto flex items-center gap-2">
              <Button
                onClick={() => onOpenSendProposal?.(activeQuote)}
                className="!h-8 !px-3 !text-xs !font-bold !bg-emerald-700 hover:!bg-emerald-800 shadow-2xs"
              >
                <Send size={12} />
                <span>Send Proposal</span>
              </Button>
            </div>
          </div>

          {/* Body Content (scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Status & Unhandled Alert */}
            {isUnhandled && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-900">
                <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-600" />
                <div className="space-y-1 flex-1">
                  <p className="font-bold text-amber-950">Unhandled Quotation Lead</p>
                  <p className="text-amber-800 leading-relaxed">
                    This lead is awaiting specialist assignment. Assign a travel consultant to prepare and send the proposal.
                  </p>
                  <button
                    onClick={() => onOpenAssign?.(activeQuote)}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-amber-900 underline hover:text-amber-950"
                  >
                    <span>Assign specialist now</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* Quick Status Progression */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Quotation Status
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusInfo.tone}`}
                >
                  {statusInfo.label}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                  const isCurrent = activeQuote.status === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleStatusChange(key)}
                      disabled={loading}
                      className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                        isCurrent
                          ? `${config.tone} shadow-xs ring-2 ring-emerald-500/20`
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Financial Overview (Budget vs Quoted Price) */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Financial Breakdown
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-1">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5 text-[11px]">
                    <Wallet size={13} className="text-slate-500" /> Customer Budget
                  </span>
                  <p className="font-extrabold text-slate-900 text-base">
                    {activeQuote.budget ? formatCurrency(activeQuote.budget) : "Open"}
                  </p>
                  <span className="text-[10px] text-slate-400">Target customer budget</span>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 space-y-1">
                  <span className="text-emerald-700 font-medium flex items-center gap-1.5 text-[11px]">
                    <Tag size={13} className="text-emerald-700" /> Quoted Price
                  </span>
                  <p className="font-extrabold text-emerald-900 text-base">
                    {activeQuote.quotedPrice ? formatCurrency(activeQuote.quotedPrice) : "Not Quoted Yet"}
                  </p>
                  <span className="text-[10px] text-emerald-700/80">
                    {activeQuote.quoteExpiresAt
                      ? `Valid until ${new Date(activeQuote.quoteExpiresAt).toLocaleDateString()}`
                      : "No active quote proposal"}
                  </span>
                </div>
              </div>
            </div>

            {/* Travel Requirements */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Travel Requirements
              </span>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-1">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5 text-[11px]">
                    <MapPin size={13} className="text-slate-500" /> Destination
                  </span>
                  <p className="font-bold text-slate-900 text-sm">
                    {activeQuote.destination || "Not specified"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-1">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5 text-[11px]">
                    <Users size={13} className="text-slate-500" /> Travelers
                  </span>
                  <p className="font-bold text-slate-900 text-sm">
                    {activeQuote.numberOfPeople || 2} Traveller(s)
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-1">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5 text-[11px]">
                    <Sparkles size={13} className="text-slate-500" /> Trip Type
                  </span>
                  <p className="font-bold text-slate-900 text-sm capitalize">
                    {activeQuote.tripType || "Umrah"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-1">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5 text-[11px]">
                    <Calendar size={13} className="text-slate-500" /> Travel Dates
                  </span>
                  <p className="font-bold text-slate-900 text-xs truncate">
                    {activeQuote.travelDates?.from
                      ? `${new Date(activeQuote.travelDates.from).toLocaleDateString()} → ${
                          activeQuote.travelDates.to
                            ? new Date(activeQuote.travelDates.to).toLocaleDateString()
                            : ""
                        }`
                      : "Flexible"}
                  </p>
                </div>
              </div>
            </div>

            {/* Special Requests */}
            {activeQuote.specialRequests && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Special Requests & Notes
                </span>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 leading-relaxed">
                  {activeQuote.specialRequests}
                </div>
              </div>
            )}

            {/* Assigned Specialist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Assigned Travel Specialist
                </span>
                <button
                  onClick={() => onOpenAssign?.(activeQuote)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition"
                >
                  {activeQuote.assignedAgent ? "Change" : "+ Assign"}
                </button>
              </div>

              {activeQuote.assignedAgent ? (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 font-bold text-slate-700 text-xs">
                      {activeQuote.assignedAgent.firstName?.charAt(0) || "A"}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs">
                        {[activeQuote.assignedAgent.firstName, activeQuote.assignedAgent.lastName]
                          .filter(Boolean)
                          .join(" ") || "Travel Specialist"}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {activeQuote.assignedAgent.email || "travel.specialist@maqamtravels.com"}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-100">
                    Active
                  </span>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-3.5 text-center text-xs text-slate-400">
                  No travel specialist assigned yet.
                </div>
              )}
            </div>

            {/* Customer Response */}
            {activeQuote.customerResponse?.action && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Customer Response & Decision
                </span>
                <div
                  className={`rounded-2xl border p-4 text-xs space-y-2 ${
                    activeQuote.customerResponse.action === "accepted"
                      ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
                      : activeQuote.customerResponse.action === "changes_requested"
                      ? "border-sky-200 bg-sky-50/70 text-sky-950"
                      : "border-rose-200 bg-rose-50/70 text-rose-950"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold flex items-center gap-1.5 text-sm">
                      {activeQuote.customerResponse.action === "accepted" ? (
                        <>
                          <Sparkles size={16} className="text-emerald-700" />
                          <span>Proposal Accepted!</span>
                        </>
                      ) : activeQuote.customerResponse.action === "changes_requested" ? (
                        <>
                          <AlertCircle size={16} className="text-sky-700" />
                          <span>Revision Requested</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert size={16} className="text-rose-700" />
                          <span>Proposal Declined</span>
                        </>
                      )}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {activeQuote.customerResponse.respondedAt
                        ? new Date(activeQuote.customerResponse.respondedAt).toLocaleDateString()
                        : ""}
                    </span>
                  </div>

                  {activeQuote.customerResponse.note && (
                    <div className="rounded-xl bg-white/70 p-3 text-xs italic border border-black/5 leading-relaxed">
                      &ldquo;{activeQuote.customerResponse.note}&rdquo;
                    </div>
                  )}

                  {activeQuote.customerResponse.action === "changes_requested" && (
                    <div className="pt-1 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => onOpenSendProposal?.(activeQuote)}
                        className="rounded-xl bg-sky-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-sky-800 transition cursor-pointer"
                      >
                        Revise Proposal Now
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dedicated Customer Conversation & Dialogue Notes */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-emerald-600" />
                  <span>Customer Conversation & Dialogue Notes</span>
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-100">
                  CRM Communication Desk
                </span>
              </div>

              {/* Active Customer Conversation Note */}
              {(activeQuote.conversationNote || activeQuote.quoteNotes) && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <MessageSquare size={13} className="text-emerald-700" />
                      <span>Active Customer Conversation Note</span>
                    </span>
                    {activeQuote.conversationChannel && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        {activeQuote.conversationChannel === "Call"
                          ? "📞 Call"
                          : activeQuote.conversationChannel === "WhatsApp"
                          ? "💬 WhatsApp"
                          : activeQuote.conversationChannel === "Email"
                          ? "✉️ Email"
                          : "📝 Note"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-emerald-950 italic bg-white/80 p-2.5 rounded-lg border border-emerald-100 font-medium">
                    &ldquo;{activeQuote.conversationNote || activeQuote.quoteNotes}&rdquo;
                  </p>
                </div>
              )}

              {/* Inbound Customer Inquiry Note Highlight */}
              {(activeQuote.specialRequests || activeQuote.query) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <MessageSquareQuote size={13} className="text-slate-600" />
                      <span>Customer Inbound Enquiry Note</span>
                    </span>
                    <span className="text-[10px] font-medium text-slate-500">Initial Request</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 italic bg-white/70 p-2.5 rounded-lg border border-slate-200/60">
                    &ldquo;{activeQuote.specialRequests || activeQuote.query}&rdquo;
                  </p>
                </div>
              )}

              {/* Log Conversation Note Form */}
              <form onSubmit={handleAddConversationNote} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Log Dialogue Note with Customer
                  </label>
                  {/* Channel selector */}
                  <div className="flex items-center gap-1 text-[10px]">
                    {["Call", "WhatsApp", "Email", "Note"].map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setChannel(ch)}
                        className={`rounded-lg px-2 py-0.5 font-bold transition ${
                          channel === ch
                            ? "bg-slate-900 text-white shadow-2xs"
                            : "bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200"
                        }`}
                      >
                        {ch === "Call" ? "📞 Call" : ch === "WhatsApp" ? "💬 WhatsApp" : ch === "Email" ? "✉️ Email" : "📝 Note"}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={`Log details of customer ${channel.toLowerCase()} (e.g. discussed itinerary adjustments, confirmed hotel preference, budget revision)...`}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50"
                />

                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[10px] text-slate-400">
                    Logged as {channel} note in CRM timeline
                  </span>
                  <Button
                    type="submit"
                    loading={addingNote}
                    disabled={!noteText.trim() || addingNote}
                    className="!h-7 !px-3 !text-[11px] !bg-emerald-700 hover:!bg-emerald-800 font-bold"
                  >
                    <Send size={11} />
                    <span>Save Note</span>
                  </Button>
                </div>
              </form>
            </div>

            {/* Timeline Feed */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock size={13} /> Activity Timeline
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {activeQuote.timeline?.length || 0} events
                </span>
              </div>

              <div className="space-y-2.5">
                {activeQuote.timeline?.length ? (
                  activeQuote.timeline
                    .slice()
                    .reverse()
                    .map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800">
                            {item.title || "Timeline event"}
                          </span>
                          <span className="text-slate-400 font-medium">
                            {item.time || (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "")}
                          </span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">
                          {item.detail || item.notes}
                        </p>
                      </div>
                    ))
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                    No timeline history recorded yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-3.5 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-mono">
              Ref: {activeQuote.quoteReference}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={onClose} className="!h-8 !px-3 !text-xs">
                Close
              </Button>
              <Button
                onClick={() => onOpenSendProposal?.(activeQuote)}
                className="!h-8 !px-3 !text-xs !bg-emerald-700 hover:!bg-emerald-800"
              >
                {activeQuote.customerResponse?.action === "changes_requested"
                  ? "Revise & Resend Proposal"
                  : activeQuote.quotedPrice > 0
                  ? "Update Proposal"
                  : "Send Proposal"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
