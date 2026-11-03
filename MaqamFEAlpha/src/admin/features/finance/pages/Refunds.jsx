import { useEffect, useState, useCallback } from "react";
import {
  RotateCcw,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  CreditCard,
  Building,
  Plane,
  Sparkles,
  Download,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import FinanceHeader from "../components/FinanceHeader";
import FinanceFilters from "../components/FinanceFilters";
import UpdateRefundModal from "../components/UpdateRefundModal";
import TransactionDetailsDrawer from "../components/TransactionDetailsDrawer";
import { RefundStatusBadge, PaymentStatusBadge } from "../components/FinanceStatusBadge";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { financeApi } from "../financeApi";
import {
  formatMoney,
  formatFinanceDate,
  getPaymentMethodMeta,
} from "../financeUtils";

export default function Refunds() {
  // Data State
  const [refunds, setRefunds] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [currency, setCurrency] = useState("ALL");
  const [paymentMethod, setPaymentMethod] = useState("ALL");
  const [bookingType, setBookingType] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("requestedAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Modals & Drawers
  const [selectedRefundForEdit, setSelectedRefundForEdit] = useState(null);
  const [selectedPaymentTxId, setSelectedPaymentTxId] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Debounced Search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 280);
    return () => clearTimeout(handler);
  }, [search]);

  // Load Refunds
  const loadRefunds = useCallback(
    async (isManual = false) => {
      try {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res = await financeApi.listRefunds({
          page,
          limit,
          search: debouncedSearch,
          status,
          currency,
          paymentMethod,
          bookingType,
          startDate,
          endDate,
          sortBy,
          sortOrder,
        });

        setRefunds(res.data || []);
        setMeta(
          res.meta || {
            total: res.data?.length || 0,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil((res.data?.length || 0) / limit)),
          }
        );
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to retrieve payment refunds."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      page,
      limit,
      debouncedSearch,
      status,
      currency,
      paymentMethod,
      bookingType,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    ]
  );

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  const handleRefresh = () => {
    loadRefunds(true);
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatus("ALL");
    setCurrency("ALL");
    setPaymentMethod("ALL");
    setBookingType("ALL");
    setStartDate("");
    setEndDate("");
    setSortBy("requestedAt");
    setSortOrder("desc");
    setPage(1);
  };

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Called when a refund is updated in UpdateRefundModal
  const handleRefundUpdated = (updated) => {
    // Update local state immediately
    setRefunds((prev) =>
      prev.map((r) =>
        (r.refundId || r._id) === (updated.refundId || updated._id)
          ? { ...r, ...updated }
          : r
      )
    );
    // Background refresh for fresh data
    loadRefunds(true);
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (!refunds.length) return;
    const headers = [
      "Refund ID",
      "Payment ID",
      "Customer",
      "Amount",
      "Currency",
      "Status",
      "Reason",
      "Requested Date",
      "Processed Date",
      "Gateway Reference",
    ];

    const rows = refunds.map((r) => [
      r.refundId || r._id,
      r.payment?.paymentId || "",
      r.customer?.name || "",
      r.amount,
      r.currency,
      r.status,
      r.reason || "",
      r.requestedAt || "",
      r.processedAt || "",
      r.gatewayResponse?.acquirer_reference || r.gatewayResponse?.bank_reference_number || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join(
        "\n"
      );

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payment_refunds_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Count pending refunds in current list
  const pendingCount = refunds.filter((r) => r.status === "pending").length;

  const startItem = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const endItem = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <FinanceHeader
        title="Payment Refunds Desk"
        subtitle="Review, audit, and process customer refunds with automated gateway reconciliation."
        onRefresh={handleRefresh}
        refreshing={refreshing}
        actions={
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!refunds.length}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <Download size={14} className="text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        }
      />

      {/* Status Segment Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: "ALL", label: "All Refunds" },
          { id: "pending", label: "Pending Review", badge: pendingCount > 0 ? pendingCount : null },
          { id: "processed", label: "Processed" },
          { id: "failed", label: "Failed / Rejected" },
        ].map((tab) => {
          const isSelected = status === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatus(tab.id);
                setPage(1);
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                isSelected
                  ? "bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="grid h-4 min-w-4 place-items-center rounded-full bg-amber-500 px-1 text-[10px] text-white font-black">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <FinanceFilters
        type="refunds"
        search={search}
        onSearchChange={setSearch}
        currency={currency}
        onCurrencyChange={(c) => {
          setCurrency(c);
          setPage(1);
        }}
        status={status}
        onStatusChange={(s) => {
          setStatus(s);
          setPage(1);
        }}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={(pm) => {
          setPaymentMethod(pm);
          setPage(1);
        }}
        bookingType={bookingType}
        onBookingTypeChange={(bt) => {
          setBookingType(bt);
          setPage(1);
        }}
        startDate={startDate}
        onStartDateChange={(sd) => {
          setStartDate(sd);
          setPage(1);
        }}
        endDate={endDate}
        onEndDateChange={(ed) => {
          setEndDate(ed);
          setPage(1);
        }}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        onReset={handleResetFilters}
      />

      {/* Count & Page info */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing{" "}
          <span className="font-bold text-slate-800 dark:text-white">
            {startItem}–{endItem}
          </span>{" "}
          of{" "}
          <span className="font-bold text-slate-800 dark:text-white">
            {meta.total}
          </span>{" "}
          refund records
        </div>

        <div className="flex items-center gap-1.5">
          <span>Rows:</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="h-7 rounded-lg border border-slate-200 bg-white px-2 font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <LoadingSpinner />
          <span className="text-xs font-semibold text-slate-400">
            Fetching payment refunds history...
          </span>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle size={18} />
            Failed to Load Refunds
          </div>
          <p className="mt-1 text-xs">{error}</p>
          <button
            type="button"
            onClick={() => loadRefunds()}
            className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : refunds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
            <RotateCcw size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            No refunds found
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            There are currently no refund records matching your search or status filter.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* Refunds Table */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5 font-bold">Refund ID</th>
                  <th className="px-4 py-3.5 font-bold">Customer</th>
                  <th className="px-4 py-3.5 font-bold">Payment Context</th>
                  <th className="px-4 py-3.5 font-bold">Refund Amount</th>
                  <th className="px-4 py-3.5 font-bold">Status</th>
                  <th className="px-4 py-3.5 font-bold">Reason & Gateway ARN</th>
                  <th className="px-4 py-3.5 font-bold">Timestamps</th>
                  <th className="px-4 py-3.5 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {refunds.map((row) => {
                  const refundId = row.refundId || row._id;
                  const payment = row.payment || {};
                  const currency = row.currency || payment.currency || "INR";
                  const methodMeta = getPaymentMethodMeta(payment.paymentMethod);
                  const arn =
                    row.gatewayResponse?.acquirer_reference ||
                    row.gatewayResponse?.bank_reference_number;

                  return (
                    <tr
                      key={row._id}
                      className="group transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/60"
                    >
                      {/* Refund ID */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-white">
                          <span title={refundId}>
                            {refundId.length > 16
                              ? `${refundId.slice(0, 14)}...`
                              : refundId}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(refundId, refundId)}
                            className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy Refund ID"
                          >
                            {copiedKey === refundId ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800 dark:text-white">
                          {row.customer?.name || "Customer"}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                          {row.customer?.email || row.customer?.phone || "—"}
                        </div>
                      </td>

                      {/* Payment Context */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {payment.bookingType || "Payment"}
                          </span>
                          <span className="capitalize text-[11px] font-semibold text-slate-500">
                            {methodMeta.name}
                          </span>
                        </div>
                        {payment.paymentId && (
                          <button
                            type="button"
                            onClick={() => setSelectedPaymentTxId(payment.paymentId)}
                            className="mt-1 flex items-center gap-1 font-mono text-[10px] text-emerald-600 hover:underline"
                            title="Inspect parent transaction"
                          >
                            <span>Tx: {payment.paymentId.slice(-8)}</span>
                            <ExternalLink size={10} />
                          </button>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5">
                        <div className="font-black text-sm text-slate-900 dark:text-white">
                          {formatMoney(row.amount, currency)}
                        </div>
                        {payment.amount && (
                          <div className="text-[10px] text-slate-400">
                            of {formatMoney(payment.amount, currency)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <RefundStatusBadge status={row.status} />
                      </td>

                      {/* Reason & ARN */}
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <div className="truncate text-slate-700 dark:text-slate-300" title={row.reason}>
                          {row.reason || "—"}
                        </div>
                        {arn && (
                          <div className="font-mono text-[10px] text-slate-400 truncate" title={arn}>
                            ARN: {arn}
                          </div>
                        )}
                      </td>

                      {/* Timestamps */}
                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap text-[11px]">
                        <div>Req: {formatFinanceDate(row.requestedAt, false)}</div>
                        {row.processedAt && (
                          <div className="text-emerald-600 dark:text-emerald-400">
                            Proc: {formatFinanceDate(row.processedAt, false)}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedRefundForEdit(row)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
                          >
                            <span>Update Status</span>
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
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-200/80 pt-4 dark:border-slate-800">
          <div className="text-xs text-slate-400">
            Page {meta.page} of {meta.totalPages} ({meta.total} refunds total)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            <button
              type="button"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Update Refund Status Modal */}
      {selectedRefundForEdit && (
        <UpdateRefundModal
          refund={selectedRefundForEdit}
          onClose={() => setSelectedRefundForEdit(null)}
          onSuccess={handleRefundUpdated}
        />
      )}

      {/* Parent Payment Dossier Drawer */}
      {selectedPaymentTxId && (
        <TransactionDetailsDrawer
          transactionId={selectedPaymentTxId}
          onClose={() => setSelectedPaymentTxId(null)}
        />
      )}
    </div>
  );
}
