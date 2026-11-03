import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  Eye,
  CreditCard,
  Layers,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  LayoutGrid,
  List,
  AlertCircle,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import FinanceHeader from "../components/FinanceHeader";
import FinanceFilters from "../components/FinanceFilters";
import TransactionDetailsDrawer from "../components/TransactionDetailsDrawer";
import { PaymentStatusBadge } from "../components/FinanceStatusBadge";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { financeApi } from "../financeApi";
import {
  formatMoney,
  formatFinanceDate,
  getPaymentMethodMeta,
} from "../financeUtils";

export default function Transactions() {
  // Data state
  const [transactions, setTransactions] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currency, setCurrency] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [paymentMethod, setPaymentMethod] = useState("ALL");
  const [bookingType, setBookingType] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // View & Drawer
  const [viewMode, setViewMode] = useState("table"); // "table" | "grid"
  const [selectedTxId, setSelectedTxId] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 280);
    return () => clearTimeout(handler);
  }, [search]);

  // Load Transactions
  const loadTransactions = useCallback(
    async (isManual = false) => {
      try {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res = await financeApi.listTransactions({
          page,
          limit,
          search: debouncedSearch,
          currency,
          status,
          paymentMethod,
          bookingType,
          startDate,
          endDate,
          sortBy,
          sortOrder,
        });

        setTransactions(res.data || []);
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
            "Unable to retrieve transactions ledger."
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
      currency,
      status,
      paymentMethod,
      bookingType,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    ]
  );

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleRefresh = () => {
    loadTransactions(true);
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setCurrency("ALL");
    setStatus("ALL");
    setPaymentMethod("ALL");
    setBookingType("ALL");
    setStartDate("");
    setEndDate("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (!transactions.length) return;
    const headers = [
      "Transaction ID",
      "Gateway Order ID",
      "Customer Name",
      "Customer Email",
      "Booking Type",
      "Amount",
      "Currency",
      "Method",
      "Status",
      "Date",
    ];

    const rows = transactions.map((t) => [
      t.gatewayData?.transactionId || t._id,
      t.gatewayData?.orderId || "",
      t.customer?.name || "",
      t.customer?.email || "",
      t.bookingType || "",
      t.amount,
      t.currency,
      t.paymentMethod,
      t.status,
      t.paidAt || t.createdAt || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join(
        "\n"
      );

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `financial_transactions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination bounds
  const startItem = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const endItem = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <FinanceHeader
        title="Financial Transactions Ledger"
        subtitle="Complete ledger of payments across flights, hotels, packages, offers, and visas."
        onRefresh={handleRefresh}
        refreshing={refreshing}
        actions={
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!transactions.length}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
            title="Export filtered records to CSV"
          >
            <Download size={14} className="text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        }
      />

      {/* Filter Toolbar */}
      <FinanceFilters
        type="transactions"
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

      {/* Ledger Stats Summary & View Switcher */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
        <div>
          Showing{" "}
          <span className="font-bold text-slate-800 dark:text-white">
            {startItem}–{endItem}
          </span>{" "}
          of{" "}
          <span className="font-bold text-slate-800 dark:text-white">
            {meta.total}
          </span>{" "}
          transactions
        </div>

        <div className="flex items-center gap-2">
          {/* Limit selector */}
          <div className="flex items-center gap-1.5">
            <span>Per page:</span>
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

          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded-md p-1 transition ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              title="Table View"
            >
              <List size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded-md p-1 transition ${
                viewMode === "grid"
                  ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              title="Card Grid View"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <LoadingSpinner />
          <span className="text-xs font-semibold text-slate-400">
            Querying live transactions ledger...
          </span>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle size={18} />
            Failed to Load Transactions
          </div>
          <p className="mt-1 text-xs">{error}</p>
          <button
            type="button"
            onClick={() => loadTransactions()}
            className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
            <CreditCard size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            No transactions match criteria
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search terms, date boundaries, or filter presets.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            Clear All Filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* Card Grid View for Tablet / Mobile */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {transactions.map((tx) => {
            const methodMeta = getPaymentMethodMeta(tx.paymentMethod);
            const displayId = tx.gatewayData?.transactionId || tx._id;
            return (
              <div
                key={tx._id}
                onClick={() => setSelectedTxId(tx._id)}
                className="group relative cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-emerald-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-500/50 dark:hover:bg-slate-850"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {tx.bookingType}
                  </span>
                  <PaymentStatusBadge status={tx.status} />
                </div>

                <div className="mt-3">
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {formatMoney(tx.amount, tx.currency)}
                  </div>
                  <div className="mt-1 flex items-center gap-1 font-mono text-[11px] text-slate-400">
                    <span>{displayId.slice(0, 16)}...</span>
                  </div>
                </div>

                <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800 space-y-1 text-xs">
                  <div className="font-bold text-slate-800 dark:text-white">
                    {tx.customer?.name || "Customer"}
                  </div>
                  <div className="text-slate-400 truncate">{tx.customer?.email || "—"}</div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-400 dark:border-slate-800">
                  <span className="capitalize">{methodMeta.name}</span>
                  <span>{formatFinanceDate(tx.paidAt || tx.createdAt, false)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Full Table Ledger View */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5 font-bold">Transaction / Ref</th>
                  <th className="px-4 py-3.5 font-bold">Customer Profile</th>
                  <th className="px-4 py-3.5 font-bold">Booking Link</th>
                  <th className="px-4 py-3.5 font-bold">Gateway / Method</th>
                  <th className="px-4 py-3.5 font-bold">Amount</th>
                  <th className="px-4 py-3.5 font-bold">Status</th>
                  <th className="px-4 py-3.5 font-bold">Date & Time</th>
                  <th className="px-4 py-3.5 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {transactions.map((tx) => {
                  const methodMeta = getPaymentMethodMeta(tx.paymentMethod);
                  const txKey = tx._id;
                  const displayId =
                    tx.gatewayData?.transactionId || tx._id;

                  return (
                    <tr
                      key={tx._id}
                      className="group transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/60"
                    >
                      {/* Transaction ID */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-white">
                          <span title={displayId}>
                            {displayId.length > 16
                              ? `${displayId.slice(0, 14)}...`
                              : displayId}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(displayId, txKey)}
                            className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy Transaction ID"
                          >
                            {copiedKey === txKey ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                        {tx.gatewayData?.orderId && (
                          <div className="font-mono text-[10px] text-slate-400 truncate max-w-[130px]" title={tx.gatewayData.orderId}>
                            Ord: {tx.gatewayData.orderId}
                          </div>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800 dark:text-white">
                          {tx.customer?.name || "Customer"}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                          {tx.customer?.email || tx.customer?.phone || "—"}
                        </div>
                      </td>

                      {/* Booking */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {tx.bookingType}
                        </span>
                        {tx.bookingId && (
                          <div className="mt-0.5 font-mono text-[10px] text-slate-400 truncate max-w-[100px]">
                            {tx.bookingId.slice(-8)}
                          </div>
                        )}
                      </td>

                      {/* Gateway / Method */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold capitalize ${methodMeta.badge}`}
                        >
                          {methodMeta.name}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5">
                        <div className="font-black text-sm text-slate-900 dark:text-white">
                          {formatMoney(tx.amount, tx.currency)}
                        </div>
                        {tx.totalRefunded > 0 && (
                          <div className="text-[10px] text-purple-600 font-semibold dark:text-purple-400">
                            Refunded: {formatMoney(tx.totalRefunded, tx.currency)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <PaymentStatusBadge status={tx.status} />
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                        {formatFinanceDate(tx.paidAt || tx.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedTxId(tx._id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-emerald-400"
                        >
                          <Eye size={13} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {meta.totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-200/80 pt-4 dark:border-slate-800">
          <div className="text-xs text-slate-400">
            Page {meta.page} of {meta.totalPages} ({meta.total} records total)
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

            {/* Numeric page chips */}
            {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
              let pNum = i + 1;
              if (meta.totalPages > 5 && page > 3) {
                pNum = page - 3 + i;
                if (pNum > meta.totalPages) pNum = meta.totalPages - (4 - i);
              }
              return (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setPage(pNum)}
                  className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-bold transition ${
                    page === pNum
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
                  }`}
                >
                  {pNum}
                </button>
              );
            })}

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

      {/* Transaction Details Modal/Drawer */}
      {selectedTxId && (
        <TransactionDetailsDrawer
          transactionId={selectedTxId}
          onClose={() => setSelectedTxId(null)}
        />
      )}
    </div>
  );
}
