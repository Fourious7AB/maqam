import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  RotateCcw,
  XCircle,
  Tag,
  Calendar,
  AlertCircle,
  Send,
} from "lucide-react";
import { toast } from "react-toastify";
import { quoteService } from "../../services/quoteService";
import formatCurrency from "../../admin/utils/formatCurrency";

export default function QuoteResponseModal({
  isOpen,
  onClose,
  quote,
  onResponded,
}) {
  const [selectedAction, setSelectedAction] = useState("accepted");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !quote) return null;

  const quoteId = quote.id || quote._id;
  const price = quote.quote?.price || quote.quotedPrice;
  const expiresAt = quote.quote?.expiresAt || quote.quoteExpiresAt;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedAction === "changes_requested" && !note.trim()) {
      toast.warning("Please describe what changes or adjustments you require");
      return;
    }

    try {
      setLoading(true);
      const res = await quoteService.respondToQuote(quoteId, {
        action: selectedAction,
        note: note.trim(),
      });

      toast.success(res.message || "Your response has been sent to your travel specialist!");
      onResponded?.(res.quote);
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to record quotation response");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in font-poppins">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white dark:bg-[#0d1527] shadow-2xl border border-slate-100 dark:border-slate-800 transition-all">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#0f6b7b] via-[#0d7c89] to-[#0b5b73] px-5 sm:px-6 py-5 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white">
              <Tag size={20} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold tracking-tight">
                Respond to Proposal — {quote.reference}
              </h3>
              <p className="text-xs text-teal-100/90 mt-0.5">
                {quote.destination} ({quote.numberOfPeople} Travellers)
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Proposal Summary Card */}
          <div className="rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/60 dark:bg-purple-950/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
                Issued Quotation Proposal
              </span>
              {expiresAt && (
                <span className="text-[11px] text-purple-700 dark:text-purple-300 flex items-center gap-1">
                  <Calendar size={12} /> Valid till {new Date(expiresAt).toLocaleDateString()}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-purple-950 dark:text-purple-200">
                {price ? formatCurrency(price) : "Custom Package"}
              </span>
              <span className="text-xs text-purple-700 dark:text-purple-300">
                Total for {quote.numberOfPeople} person(s)
              </span>
            </div>

            {quote.quote?.notes && (
              <p className="text-xs text-purple-900/80 dark:text-purple-200/80 italic border-t border-purple-200/60 dark:border-purple-900/50 pt-2">
                &ldquo;{quote.quote.notes}&rdquo;
              </p>
            )}
          </div>

          {/* Action Choice Pills */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Your Decision
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedAction("accepted")}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition cursor-pointer ${
                  selectedAction === "accepted"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 shadow-xs ring-2 ring-emerald-500/30"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                }`}
              >
                <CheckCircle2 size={20} className="text-emerald-600 mb-1" />
                <span className="text-xs font-bold">Accept Proposal</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Proceed to booking</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction("changes_requested")}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition cursor-pointer ${
                  selectedAction === "changes_requested"
                    ? "border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-300 shadow-xs ring-2 ring-sky-500/30"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                }`}
              >
                <RotateCcw size={20} className="text-sky-600 mb-1" />
                <span className="text-xs font-bold">Request Changes</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Negotiate or adjust</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction("rejected")}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition cursor-pointer ${
                  selectedAction === "rejected"
                    ? "border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-300 shadow-xs ring-2 ring-rose-500/30"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                }`}
              >
                <XCircle size={20} className="text-rose-600 mb-1" />
                <span className="text-xs font-bold">Decline</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Not suitable</span>
              </button>
            </div>
          </div>

          {/* Response Note Textarea */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {selectedAction === "accepted"
                ? "Special Instructions / Contact Preference (Optional)"
                : selectedAction === "changes_requested"
                ? "Describe Changes / Negotiation Terms *"
                : "Reason for Declining (Optional)"}
            </label>
            <textarea
              rows="3"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f6b7b] dark:focus:border-teal-400 focus:bg-white"
              placeholder={
                selectedAction === "accepted"
                  ? "e.g. Please call me on WhatsApp after 3 PM to finalize flight names."
                  : selectedAction === "changes_requested"
                  ? "e.g. We would like to stay in Pullman Zamzam instead, and can our budget be adjusted to ₹3,20,000?"
                  : "e.g. Price exceeded our planned family budget."
              }
              required={selectedAction === "changes_requested"}
            />
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold text-white shadow-sm transition disabled:opacity-60 cursor-pointer ${
                selectedAction === "accepted"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : selectedAction === "changes_requested"
                  ? "bg-sky-600 hover:bg-sky-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {loading ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <Send size={14} />
                  <span>
                    {selectedAction === "accepted"
                      ? "Confirm & Accept"
                      : selectedAction === "changes_requested"
                      ? "Send Revision Request"
                      : "Decline Proposal"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
