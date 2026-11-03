import { useEffect, useState } from "react";
import {
  X,
  Copy,
  Check,
  CreditCard,
  User,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  FileCode,
  RotateCcw,
  Plane,
  Hotel,
  Package,
  Sparkles,
  TicketCheck,
} from "lucide-react";
import { financeApi } from "../financeApi";
import {
  formatMoney,
  formatFinanceDate,
  getPaymentMethodMeta,
} from "../financeUtils";
import { PaymentStatusBadge, RefundStatusBadge } from "./FinanceStatusBadge";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

export default function TransactionDetailsDrawer({ transactionId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [showRawJson, setShowRawJson] = useState(false);

  useEffect(() => {
    if (!transactionId) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    financeApi
      .getTransactionDetails(transactionId)
      .then((res) => {
        if (isMounted) setData(res.data);
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Failed to load transaction details."
          );
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [transactionId]);

  useEffect(() => {
    if (!transactionId) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [transactionId, onClose]);

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  if (!transactionId) return null;

  const bookingTypeIcons = {
    flight: Plane,
    hotel: Hotel,
    package: Package,
    offer: Sparkles,
    visa: TicketCheck,
  };

  const BookingIcon =
    (data?.bookingType && bookingTypeIcons[data.bookingType.toLowerCase()]) ||
    Layers;

  const methodMeta = getPaymentMethodMeta(data?.paymentMethod);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Blurred Backdrop click target */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-4 sm:pl-10 pointer-events-none">
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-screen max-w-xl border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 pointer-events-auto"
        >
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                <CreditCard size={18} />
              </span>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Transaction Dossier
                </h2>
                <p className="text-xs text-slate-400">
                  Audit ledger record & payment settlement details
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="h-[calc(100vh-4rem)] overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3">
                <LoadingSpinner />
                <span className="text-xs font-semibold text-slate-400">
                  Retrieving transaction from ledger...
                </span>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle size={16} />
                  Error Loading Transaction
                </div>
                <p className="mt-1 text-xs">{error}</p>
              </div>
            ) : !data ? (
              <div className="text-center text-sm text-slate-400">
                Transaction not found.
              </div>
            ) : (
              <>
                {/* Amount & Status Card */}
                <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-800/40 dark:to-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Amount Settled
                    </span>
                    <PaymentStatusBadge status={data.status} />
                  </div>

                  <div className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    {formatMoney(data.amount, data.currency)}
                  </div>

                  {data.totalRefunded > 0 && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
                      <RotateCcw size={12} />
                      Total Refunded: {formatMoney(data.totalRefunded, data.currency)}
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200/80 pt-3 text-xs text-slate-500 dark:border-slate-800">
                    <div>
                      <span className="block text-[11px] font-semibold text-slate-400">
                        Paid At
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {formatFinanceDate(data.paidAt || data.createdAt)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] font-semibold text-slate-400">
                        Method / Gateway
                      </span>
                      <span className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-white">
                        <span className="capitalize">{methodMeta.name}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Identifiers */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 text-xs dark:border-slate-800 dark:bg-slate-900">
                  <h4 className="font-bold text-slate-800 dark:text-white">
                    Ledger Reference
                  </h4>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400">Record ID</span>
                    <div className="flex items-center gap-1 font-mono font-medium text-slate-700 dark:text-slate-300">
                      <span>{data._id}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(data._id, "id")}
                        className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Copy Record ID"
                      >
                        {copiedKey === "id" ? (
                          <Check size={12} className="text-emerald-600" />
                        ) : (
                          <Copy size={12} className="text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 text-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 dark:text-white">
                      Customer Profile
                    </h4>
                    {data.customer?.role && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {data.customer.role}
                      </span>
                    )}
                  </div>

                  {data.customer ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        {data.customer.avatar ? (
                          <img
                            src={data.customer.avatar}
                            alt=""
                            className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                          />
                        ) : (
                          <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 font-bold text-slate-600">
                            {data.customer.name?.charAt(0) || "C"}
                          </span>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {data.customer.name}
                          </div>
                          <div className="text-slate-400">{data.customer.email}</div>
                          {data.customer.phone && (
                            <div className="text-slate-400">{data.customer.phone}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400">No customer metadata linked.</p>
                  )}
                </div>

                {/* Booking Connection */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 text-xs dark:border-slate-800 dark:bg-slate-900">
                  <h4 className="font-bold text-slate-800 dark:text-white">
                    Booking Linkage
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="block text-slate-400">Product Line</span>
                      <span className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-bold text-slate-800 capitalize dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                        <BookingIcon size={13} className="text-emerald-600" />
                        {data.bookingType || "Standard"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Booking Model</span>
                      <span className="mt-1 block font-mono font-medium text-slate-700 dark:text-slate-300">
                        {data.bookingModel || "—"}
                      </span>
                    </div>
                  </div>

                  {data.bookingId && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
                      <span className="text-slate-400">Booking Reference</span>
                      <div className="flex items-center gap-1 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        <span>{data.bookingId}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(data.bookingId, "bId")}
                          className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {copiedKey === "bId" ? (
                            <Check size={12} className="text-emerald-600" />
                          ) : (
                            <Copy size={12} className="text-slate-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Gateway Specific Data */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 text-xs dark:border-slate-800 dark:bg-slate-900">
                  <h4 className="font-bold text-slate-800 dark:text-white">
                    Gateway Settlement Identifiers
                  </h4>

                  <div className="space-y-2 font-mono">
                    {data.gatewayData?.orderId && (
                      <div className="flex items-center justify-between py-1">
                        <span className="font-sans text-slate-400">Gateway Order ID</span>
                        <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          <span>{data.gatewayData.orderId}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(data.gatewayData.orderId, "gwOrder")}
                            className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            {copiedKey === "gwOrder" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-slate-400" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {data.gatewayData?.transactionId && (
                      <div className="flex items-center justify-between py-1">
                        <span className="font-sans text-slate-400">Gateway Transaction ID</span>
                        <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          <span>{data.gatewayData.transactionId}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(data.gatewayData.transactionId, "gwTx")}
                            className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            {copiedKey === "gwTx" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-slate-400" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {data.gatewayData?.captureId && (
                      <div className="flex items-center justify-between py-1">
                        <span className="font-sans text-slate-400">Gateway Capture ID</span>
                        <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          <span>{data.gatewayData.captureId}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(data.gatewayData.captureId, "gwCap")}
                            className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            {copiedKey === "gwCap" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-slate-400" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Linked Refunds */}
                {Array.isArray(data.refunds) && data.refunds.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 text-xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-800 dark:text-white">
                        Linked Refunds ({data.refunds.length})
                      </h4>
                    </div>

                    <div className="space-y-2">
                      {data.refunds.map((rf, idx) => (
                        <div
                          key={rf._id || idx}
                          className="rounded-lg border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-slate-800 dark:text-white">
                              {rf.refundId || rf._id}
                            </span>
                            <RefundStatusBadge status={rf.status} />
                          </div>

                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-slate-400">Amount</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatMoney(rf.amount, rf.currency || data.currency)}
                            </span>
                          </div>

                          {rf.reason && (
                            <p className="mt-1 text-[11px] text-slate-500 italic">
                              "{rf.reason}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit JSON */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs dark:border-slate-800 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="flex w-full items-center justify-between font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300"
                  >
                    <span className="flex items-center gap-1.5">
                      <FileCode size={14} className="text-slate-400" />
                      Auditor Raw Gateway Payload
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600">
                      {showRawJson ? "Hide JSON" : "Inspect Raw"}
                    </span>
                  </button>

                  {showRawJson && (
                    <div className="mt-3 relative">
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            JSON.stringify(data.gatewayData?.raw || data, null, 2),
                            "raw"
                          )
                        }
                        className="absolute right-2 top-2 z-10 rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                      >
                        {copiedKey === "raw" ? "Copied" : "Copy JSON"}
                      </button>
                      <pre className="max-h-60 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[11px] text-slate-300">
                        {JSON.stringify(data.gatewayData?.raw || data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
