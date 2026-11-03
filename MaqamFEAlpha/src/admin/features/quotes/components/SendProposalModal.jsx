import { useState, useEffect } from "react";
import { Send, Tag, Calendar, FileText, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "react-toastify";
import Modal from "../../../components/common/Modal";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import formatCurrency from "../../../utils/formatCurrency";
import { quotesApi } from "../quotesApi";

export default function SendProposalModal({
  open,
  quote,
  onClose,
  onSent,
}) {
  const [quotedPrice, setQuotedPrice] = useState("");
  const [quoteExpiresAt, setQuoteExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && quote) {
      setQuotedPrice(
        quote.quotedPrice && quote.quotedPrice > 0
          ? String(quote.quotedPrice)
          : quote.budget && quote.budget > 0
          ? String(quote.budget)
          : ""
      );

      // Default expiry: 7 days from now formatted YYYY-MM-DD
      const nextWeek = new Date(Date.now() + 7 * 86400000);
      const formattedDate = nextWeek.toISOString().slice(0, 10);
      setQuoteExpiresAt(
        quote.quoteExpiresAt
          ? new Date(quote.quoteExpiresAt).toISOString().slice(0, 10)
          : formattedDate
      );

      // Proposal note must be empty every time the modal is opened
      setNotes("");
    }
  }, [open, quote]);

  if (!open || !quote) return null;

  const quoteId = quote._id || quote.id;
  const quoteRef = quote.quoteReference || "Quote";
  const customerName = quote.customerName || "Customer";

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numPrice = Number(quotedPrice);
    if (!numPrice || numPrice <= 0) {
      toast.warning("Please provide a valid quoted price greater than ₹0");
      return;
    }

    try {
      setLoading(true);
      const isoExpires = quoteExpiresAt
        ? new Date(`${quoteExpiresAt}T23:59:59.000Z`).toISOString()
        : new Date(Date.now() + 7 * 86400000).toISOString();

      const res = await quotesApi.sendProposal(quoteId, {
        quotedPrice: numPrice,
        quoteExpiresAt: isoExpires,
        notes: notes.trim(),
      });

      toast.success(`Proposal issued to ${customerName} for ${formatCurrency(numPrice)}`);
      setNotes("");
      onSent?.(res.quotation);
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to send proposal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={`Send Proposal — ${quoteRef}`}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-purple-100 bg-purple-50/80 p-3.5 text-xs text-purple-950">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-purple-600" />
          <div className="space-y-1">
            <p className="font-bold text-purple-950">Issue Quotation Proposal</p>
            <p className="text-purple-900/90 leading-relaxed">
              Issuing this proposal moves the lead to <strong>Proposal Sent</strong> stage and records the quotation pricing. Automated WhatsApp and Email notifications will deliver the proposal link directly to <strong>{customerName}</strong> ({quote.phone || quote.email}).
            </p>
          </div>
        </div>

        {/* Customer Travel Specs Summary */}
        <div className="grid grid-cols-3 gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
          <div>
            <span className="text-[11px] text-slate-400 block">Customer</span>
            <span className="font-bold text-slate-900 truncate block">{customerName}</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Destination</span>
            <span className="font-bold text-slate-900 truncate block">
              {quote.destination || "Umrah"} ({quote.numberOfPeople || 2} Pax)
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Target Budget</span>
            <span className="font-bold text-slate-900 block">
              {quote.budget ? formatCurrency(quote.budget) : "Open"}
            </span>
          </div>
        </div>

        {/* Customer Revision Request Banner if feedback provided */}
        {quote.customerResponse?.note && (
          <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50/80 p-3 text-xs text-sky-950">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-sky-600" />
            <div>
              <span className="font-bold block">Customer Feedback / Revision Request:</span>
              <p className="mt-0.5 italic text-sky-900 leading-relaxed">
                &ldquo;{quote.customerResponse.note}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="quote-price-input"
              className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5"
            >
              <Tag size={13} className="text-emerald-700" /> Quoted Price (INR ₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                ₹
              </span>
              <input
                id="quote-price-input"
                type="number"
                min="1000"
                step="500"
                required
                value={quotedPrice}
                onChange={(e) => setQuotedPrice(e.target.value)}
                placeholder="e.g. 340000"
                className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            {Number(quotedPrice) > 0 && (
              <p className="text-[11px] font-semibold text-emerald-700">
                Display: {formatCurrency(Number(quotedPrice))}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="quote-expiry-input"
              className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5"
            >
              <Calendar size={13} /> Proposal Expiry Date *
            </label>
            <input
              id="quote-expiry-input"
              type="date"
              required
              value={quoteExpiresAt}
              onChange={(e) => setQuoteExpiresAt(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            <p className="text-[11px] text-slate-400">
              Quotation holds inventory & rate until 23:59 on this date.
            </p>
          </div>
        </div>

        {/* Proposal Inclusions & Notes */}
        <div className="space-y-1.5">
          <label
            htmlFor="quote-notes-textarea"
            className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5"
          >
            <FileText size={13} /> Itinerary Inclusions & Quotation Notes (Optional)
          </label>
          <textarea
            id="quote-notes-textarea"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter custom proposal notes or inclusions (optional)..."
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setNotes("");
              onClose();
            }}
            className="!h-9 !px-3.5 !text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={!quotedPrice || loading}
            className="!h-9 !px-4 !text-xs !bg-emerald-700 hover:!bg-emerald-800"
          >
            <Send size={13} />
            <span>Issue & Send Proposal</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
