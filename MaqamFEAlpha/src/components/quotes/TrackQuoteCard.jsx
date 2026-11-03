import React, { useState } from "react";
import { Search, Hash, Phone, ArrowRight, Loader2, Sparkles, Tag, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import { quoteService, STAGE_CONFIG } from "../../services/quoteService";
import formatCurrency from "../../admin/utils/formatCurrency";

export default function TrackQuoteCard({ onQuoteFound }) {
  const [reference, setReference] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [trackedQuote, setTrackedQuote] = useState(null);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!reference.trim()) {
      toast.warning("Please enter your quotation reference number (e.g. QT-A1B2C3D4)");
      return;
    }
    if (!phone.trim()) {
      toast.warning("Please enter the registered phone number");
      return;
    }

    try {
      setLoading(true);
      const res = await quoteService.trackQuote({
        reference: reference.trim().toUpperCase(),
        phone: phone.trim(),
      });

      setTrackedQuote(res.quote);
      toast.success("Quotation found!");
      onQuoteFound?.(res.quote);
    } catch (err) {
      setTrackedQuote(null);
      toast.error(err.message || "Quotation not found. Please verify details.");
    } finally {
      setLoading(false);
    }
  };

  const stageInfo = trackedQuote
    ? STAGE_CONFIG[trackedQuote.stage] || {
        label: trackedQuote.stage,
        tone: "bg-slate-100 text-slate-700 border-slate-200",
      }
    : null;

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1527] p-5 sm:p-6 shadow-sm transition-all space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
        <div>
          <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Search size={18} className="text-[#0f6b7b] dark:text-teal-400" />
            Track Trip Quotation
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Enter your quotation reference number & registered phone to view real-time status.
          </p>
        </div>
      </div>

      <form onSubmit={handleTrack} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <div className="sm:col-span-2 relative">
          <Hash size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value.toUpperCase())}
            placeholder="Reference (e.g. QT-A1B2C3D4)"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9 pr-3 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f6b7b] dark:focus:border-teal-400 focus:bg-white"
          />
        </div>

        <div className="sm:col-span-2 relative">
          <Phone size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Registered Phone (e.g. 9876543210)"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f6b7b] dark:focus:border-teal-400 focus:bg-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="sm:col-span-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0f6b7b] to-[#0d7c89] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:from-[#0d5f6f] hover:to-[#0a6572] transition disabled:opacity-60 cursor-pointer"
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <>
              <span>Track</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>

      {/* Result Preview if found */}
      {trackedQuote && stageInfo && (
        <div className="rounded-2xl border border-teal-200 dark:border-teal-800/60 bg-teal-50/50 dark:bg-teal-950/30 p-4 animate-fade-in space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300">
                {trackedQuote.reference}
              </span>
              <h5 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {trackedQuote.destination}
              </h5>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${stageInfo.tone}`}
            >
              <span className={`h-2 w-2 rounded-full ${stageInfo.dotTone || "bg-teal-500"}`} />
              {stageInfo.label}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-300">
            <div>
              <span className="text-[10px] text-slate-400 block">Travellers:</span>
              <span className="font-bold">{trackedQuote.numberOfPeople} Person(s)</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Budget:</span>
              <span className="font-bold">{formatCurrency(trackedQuote.budget)}</span>
            </div>
            {trackedQuote.quote?.price && (
              <div>
                <span className="text-[10px] text-purple-700 dark:text-purple-300 block font-bold">
                  Quoted Proposal:
                </span>
                <span className="font-black text-purple-900 dark:text-purple-200">
                  {formatCurrency(trackedQuote.quote.price)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
