import { useState } from "react";
import { X, CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";
import { financeApi } from "../financeApi";
import { formatMoney } from "../financeUtils";
import { RefundStatusBadge } from "./FinanceStatusBadge";
import Button from "../../../components/common/Button";

export default function UpdateRefundModal({ refund, onClose, onSuccess }) {
  const [status, setStatus] = useState(
    refund?.status === "pending" ? "processed" : refund?.status || "processed"
  );
  const [reason, setReason] = useState(
    refund?.reason ? `Reconciled: ${refund.reason}` : ""
  );
  const [bankRef, setBankRef] = useState(
    refund?.gatewayResponse?.bank_reference_number ||
      refund?.gatewayResponse?.acquirer_reference ||
      ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!refund) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const gatewayResponse = bankRef.trim()
      ? {
          bank_reference_number: bankRef.trim(),
          acquirer_reference: bankRef.trim(),
          settled_at: new Date().toISOString(),
        }
      : undefined;

    try {
      const res = await financeApi.updateRefundStatus(refund.refundId || refund._id, {
        status,
        reason: reason.trim() || undefined,
        gatewayResponse,
      });

      toast.success(
        res?.message ||
          `Refund ${refund.refundId || refund._id} transitioned to ${status}!`
      );
      if (onSuccess) onSuccess(res?.data || { ...refund, status, reason });
      onClose();
    } catch (err) {
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        err?.message ||
        "Failed to update refund status.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const refundId = refund.refundId || refund._id;
  const currency = refund.currency || refund.payment?.currency || "INR";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <ShieldCheck size={18} />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Reconcile & Update Refund
              </h3>
              <p className="text-xs text-slate-400">
                Update status and trigger automated parent payment recalculation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {/* Refund Details Banner */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 text-xs space-y-2 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Refund Reference</span>
              <span className="font-mono font-bold text-slate-800 dark:text-white">
                {refundId}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Refund Amount</span>
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {formatMoney(refund.amount, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Customer</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {refund.customer?.name || refund.customer?.email || "Customer"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Current Status</span>
              <RefundStatusBadge status={refund.status} />
            </div>
          </div>

          {/* New Status Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Target Settlement Status <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                {
                  id: "processed",
                  label: "Processed",
                  sub: "Settled successfully",
                  icon: CheckCircle2,
                  activeColor: "border-emerald-600 bg-emerald-50/60 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
                },
                {
                  id: "failed",
                  label: "Failed",
                  sub: "Bank/gateway error",
                  icon: XCircle,
                  activeColor: "border-rose-600 bg-rose-50/60 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300",
                },
                {
                  id: "pending",
                  label: "Pending",
                  sub: "Awaiting review",
                  icon: AlertTriangle,
                  activeColor: "border-amber-600 bg-amber-50/60 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = status === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStatus(opt.id)}
                    className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                      isSelected
                        ? `${opt.activeColor} ring-2 ring-emerald-600/20 font-bold`
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                    }`}
                  >
                    <Icon size={16} className="mb-1" />
                    <span className="text-xs font-bold capitalize">{opt.label}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{opt.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audit Reason / Settlement Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Audit Reason / Reconciliation Notes
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Reconciled with bank settlement batch #4019"
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Gateway Reference Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Bank Reference Number / Acquirer ARN (Optional)
            </label>
            <input
              type="text"
              value={bankRef}
              onChange={(e) => setBankRef(e.target.value)}
              placeholder="e.g. ARN987654321098 or BRN_829104820"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Automated Lifecycle Note */}
          <div className="rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-500 leading-relaxed dark:bg-slate-800/40">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Side-Effect Notice:
            </span>{" "}
            Transitioning to <code className="font-mono text-emerald-700 dark:text-emerald-400">processed</code> automatically recalculates the parent payment's total refunded sum and updates its status to <code className="font-mono text-indigo-700 dark:text-indigo-400">refunded</code> or <code className="font-mono text-purple-700 dark:text-purple-400">partially_refunded</code>.
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? "Updating..." : "Confirm & Update Live"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
