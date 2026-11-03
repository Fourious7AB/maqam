import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarDays,
  FileText,
  Mail,
  MessageSquare,
  MessageSquareQuote,
  Phone,
  Share2,
  UserRound,
  Users,
  Wallet
} from "lucide-react";
import LeadStatus from "./LeadStatus";
import formatCurrency from "../../utils/formatCurrency";

export default function LeadCard({
  lead,
  onOpen,
  compact = false,
}) {
  const safeLead = lead || {};

  const displayName =
    safeLead.name ||
    [safeLead.firstName, safeLead.lastName].filter(Boolean).join(" ") ||
    "Lead Enquiry";

  const travelerCount = Number(
    safeLead.travelers || safeLead.numberOfPeople || 1
  );

  const budget = Number(safeLead.budget || 0);

  const formattedFollowUp = safeLead.nextFollowUp
    ? new Date(safeLead.nextFollowUp).toLocaleDateString()
    : null;

  const handleOpen = () => {
    if (typeof onOpen === "function") {
      onOpen(safeLead);
    }
  };

  const getAgentName = () => {
    if (!safeLead.assignedTo) return "Unassigned";
    if (typeof safeLead.assignedTo === "object") {
      return (
        [safeLead.assignedTo.firstName, safeLead.assignedTo.lastName].filter(Boolean).join(" ") ||
        safeLead.assignedTo.name ||
        safeLead.assignedTo.email ||
        "Agent"
      );
    }
    return String(safeLead.assignedTo);
  };

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {/* Avatar */}
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 font-black text-emerald-800 text-sm border border-emerald-100">
            {displayName.charAt(0).toUpperCase()}
          </div>

          {/* Lead info */}
          <div className="min-w-0">
            <button
              type="button"
              onClick={handleOpen}
              className="block max-w-full truncate text-left text-sm font-bold text-slate-900 transition hover:text-emerald-700"
            >
              {displayName}
            </button>

            <p className="truncate text-xs text-slate-500 font-medium">
              {safeLead.destination || "Destination Flexible"}
              {safeLead.tripType ? ` · ${safeLead.tripType}` : ""}
            </p>
          </div>
        </div>

        {/* Lead status */}
        <div className="shrink-0">
          <LeadStatus status={safeLead.status || "new"} />
        </div>
      </div>

      {/* Source + Priority + Agent */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
        {safeLead.source && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200/80 px-2 py-0.5 font-semibold text-slate-600">
            <Share2 size={10} className="shrink-0" />
            {safeLead.source}
          </span>
        )}

        {safeLead.priority && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold uppercase tracking-wider text-[10px] ${
              safeLead.priority === "high"
                ? "bg-rose-50 text-rose-700 border border-rose-200"
                : safeLead.priority === "medium"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                safeLead.priority === "high"
                  ? "bg-rose-500"
                  : safeLead.priority === "medium"
                    ? "bg-amber-500"
                    : "bg-slate-400"
              }`}
            />
            {safeLead.priority}
          </span>
        )}

        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200/80 px-2 py-0.5 font-semibold text-slate-600">
          <UserRound size={10} className="shrink-0 text-slate-400" />
          {getAgentName()}
        </span>
      </div>

      {/* Customer Conversation & Enquiry Notes */}
      {(safeLead.conversationNote || safeLead.contactNotes) ? (
        <div className="mt-2.5 flex items-start gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-2.5 py-1.5 text-xs leading-relaxed text-emerald-950">
          <MessageSquare size={13} className="mt-0.5 shrink-0 text-emerald-700" />
          <div className="min-w-0">
            <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-800 block">
              {safeLead.conversationChannel === "Call" ? "📞" : safeLead.conversationChannel === "WhatsApp" ? "💬" : safeLead.conversationChannel === "Email" ? "✉️" : "📝"} Conversation Note:
            </span>
            <span className="line-clamp-2 italic font-medium">"{safeLead.conversationNote || safeLead.contactNotes}"</span>
          </div>
        </div>
      ) : null}

      {safeLead.customerResponse?.note && (
        <div className="mt-2 flex items-start gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs leading-relaxed text-sky-950">
          <MessageSquareQuote size={13} className="mt-0.5 shrink-0 text-sky-600" />
          <div className="min-w-0">
            <span className="font-bold text-[10px] uppercase tracking-wider text-sky-800 block">Customer Feedback:</span>
            <span className="line-clamp-2 italic">"{safeLead.customerResponse.note}"</span>
          </div>
        </div>
      )}

      {!(safeLead.conversationNote || safeLead.contactNotes) && !safeLead.customerResponse?.note && (safeLead.query || safeLead.specialRequests) && (
        <div className="mt-2.5 flex items-start gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs leading-relaxed text-slate-700">
          <MessageSquare size={13} className="mt-0.5 shrink-0 text-slate-400" />
          <div className="min-w-0">
            <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500 block">Customer Enquiry:</span>
            <span className="line-clamp-2">
              {safeLead.query || safeLead.specialRequests}
            </span>
          </div>
        </div>
      )}

      {/* Travelers + Budget */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-2.5">
        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
          <Users size={13} className="shrink-0 text-slate-400" />
          <span>
            {travelerCount} {travelerCount === 1 ? "traveler" : "travelers"}
          </span>
        </div>

        <div className="text-right font-extrabold text-slate-900 flex items-center justify-end gap-1">
          <Wallet size={12} className="text-emerald-600" />
          {budget > 0 ? formatCurrency(budget) : "Open budget"}
        </div>
      </div>

      {/* Contact details */}
      {!compact && (safeLead.phone || safeLead.email) && (
        <div className="mt-2.5 space-y-1.5 text-xs text-slate-500 border-t border-slate-100 pt-2">
          {safeLead.phone && (
            <div className="flex min-w-0 items-center gap-2">
              <Phone size={12} className="shrink-0 text-slate-400" />
              <a href={`tel:${safeLead.phone}`} className="truncate hover:text-emerald-700">
                {safeLead.phone}
              </a>
            </div>
          )}

          {safeLead.email && (
            <div className="flex min-w-0 items-center gap-2">
              <Mail size={12} className="shrink-0 text-slate-400" />
              <a href={`mailto:${safeLead.email}`} className="truncate hover:text-emerald-700">
                {safeLead.email}
              </a>
            </div>
          )}

          {formattedFollowUp && (
            <div className="flex min-w-0 items-center gap-2 text-[11px] text-slate-400">
              <CalendarDays size={12} className="shrink-0 text-slate-400" />
              <span className="truncate">Follow-up: {formattedFollowUp}</span>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handleOpen}
          className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
        >
          <span>View Details</span>
          <ArrowUpRight size={13} />
        </button>
        <Link
          to={`/admin/quotes?id=${safeLead.id || safeLead._id}`}
          className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 shadow-2xs"
          title="Open in Quotations Desk"
        >
          <FileText size={12} />
          <span>Quote</span>
        </Link>
      </div>
    </article>
  );
}
