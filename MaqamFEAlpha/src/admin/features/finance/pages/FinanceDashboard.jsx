import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  RotateCcw,
  ArrowRight,
  Receipt,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Building,
  Plane,
  Calendar,
  Sparkles,
  Percent,
  Hotel,
  PackageCheck,
  FileCheck,
  Layers,
  Filter,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  Download,
} from "lucide-react";
import FinanceHeader from "../components/FinanceHeader";
import OverviewKpiCards from "../components/OverviewKpiCards";
import CurrencyBreakdownCard from "../components/CurrencyBreakdownCard";
import TransactionDetailsDrawer from "../components/TransactionDetailsDrawer";
import { PaymentStatusBadge } from "../components/FinanceStatusBadge";
import { financeApi } from "../financeApi";
import {
  SUPPORTED_CURRENCIES,
  formatMoney,
  formatFinanceDate,
  getPaymentMethodMeta,
} from "../financeUtils";

export default function FinanceDashboard() {
  const navigate = useNavigate();

  // State
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters for Overview
  const [currency, setCurrency] = useState("ALL");
  const [dateRangePreset, setDateRangePreset] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Recent transactions preview
  const [recentTx, setRecentTx] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState(null);

  // Date range presets calculator
  const handlePresetChange = (preset) => {
    setDateRangePreset(preset);
    const today = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const toYMD = (d) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === "all") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "today") {
      const ymd = toYMD(today);
      setStartDate(ymd);
      setEndDate(ymd);
    } else if (preset === "7days") {
      const s = new Date(today);
      s.setDate(today.getDate() - 7);
      setStartDate(toYMD(s));
      setEndDate(toYMD(today));
    } else if (preset === "thisMonth") {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      const e = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(toYMD(s));
      setEndDate(toYMD(e));
    } else if (preset === "thisYear") {
      const s = new Date(today.getFullYear(), 0, 1);
      const e = new Date(today.getFullYear(), 11, 31);
      setStartDate(toYMD(s));
      setEndDate(toYMD(e));
    }
  };

  // Load overview
  const loadOverview = useCallback(
    async (isManual = false) => {
      try {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res = await financeApi.getOverview({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          currency: currency && currency !== "ALL" ? currency : undefined,
        });
        const activeCurr = currency && currency !== "ALL" ? currency : (res?.currency || "INR");
        setData({
          ...res,
          currency: activeCurr,
        });
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to load financial revenue overview."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currency, startDate, endDate]
  );

  // Load recent transactions synchronized with active currency and date boundary
  const loadRecentTransactions = useCallback(async () => {
    setLoadingTx(true);
    try {
      const res = await financeApi.listTransactions({
        limit: 8,
        currency: currency && currency !== "ALL" ? currency : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      setRecentTx(res.data || []);
    } catch {
      // Non-blocking
    } finally {
      setLoadingTx(false);
    }
  }, [currency, startDate, endDate]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadRecentTransactions();
  }, [loadRecentTransactions]);

  const handleRefresh = () => {
    loadOverview(true);
    loadRecentTransactions();
  };

  const gross = Number(data?.grossRevenue ?? 0);
  const net = Number(data?.netRevenue ?? 0);
  const refunds = Number(data?.refunds ?? 0);
  const pending = Number(data?.pendingPayment ?? 0);
  const totalTx = Number(data?.totalTransactions ?? 0);
  const baseCurr = currency !== "ALL" ? currency : (data?.currency || "INR");

  const avgTxValue = totalTx > 0 ? gross / totalTx : 0;
  const netRetentionRate = gross > 0 ? ((net / gross) * 100).toFixed(1) : 100;
  const refundRate = gross > 0 ? ((refunds / gross) * 100).toFixed(1) : 0;

  // Travel category breakdown derived dynamically from transactions
  const categoryStats = useMemo(() => {
    const categories = {
      flight: {
        label: "Flight Bookings",
        count: 0,
        amount: 0,
        color: "bg-blue-500",
        badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800",
        icon: Plane,
      },
      package: {
        label: "Umrah & Packages",
        count: 0,
        amount: 0,
        color: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
        icon: PackageCheck,
      },
      hotel: {
        label: "Hotel Reservations",
        count: 0,
        amount: 0,
        color: "bg-amber-500",
        badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800",
        icon: Hotel,
      },
      visa: {
        label: "Visas & Other",
        count: 0,
        amount: 0,
        color: "bg-purple-500",
        badge: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800",
        icon: FileCheck,
      },
    };

    recentTx.forEach((tx) => {
      const rawType = (tx.bookingType || "flight").toLowerCase();
      const catKey = categories[rawType] ? rawType : "visa";
      categories[catKey].count += 1;
      categories[catKey].amount += Number(tx.amount || 0);
    });

    const totalAmount = Object.values(categories).reduce((sum, c) => sum + c.amount, 0) || 1;

    return Object.entries(categories).map(([key, cat]) => ({
      key,
      ...cat,
      pct: Math.round((cat.amount / totalAmount) * 100),
    }));
  }, [recentTx]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Shared Executive Header */}
      <FinanceHeader
        title="Finance Overview"
        subtitle="Gross revenue, net settlement inflows, category distributions, and multi-currency metrics."
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {/* Date & Currency Context Controls Bar */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <Filter size={14} className="text-emerald-600 dark:text-emerald-400" />
              Scope Filter:
            </span>

            {/* Currency Switcher */}
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-9.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 pr-8 text-xs font-bold text-slate-800 shadow-2xs transition focus:border-emerald-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="ALL">All Currencies (Portfolio)</option>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c} Ledger Scope
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Date Presets Segmented Pills */}
            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100/80 p-1 dark:bg-slate-800/80">
              {[
                { id: "all", label: "All Time" },
                { id: "today", label: "Today" },
                { id: "7days", label: "7D" },
                { id: "thisMonth", label: "This Month" },
                { id: "thisYear", label: "YTD" },
              ].map((p) => {
                const isActive = dateRangePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePresetChange(p.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      isActive
                        ? "bg-white text-emerald-700 shadow-xs ring-1 ring-slate-200/80 dark:bg-slate-900 dark:text-emerald-400 dark:ring-slate-700"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date Boundary Inputs */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800/50">
              <Calendar size={13} className="text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-400">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setDateRangePreset("custom");
                  setStartDate(e.target.value);
                }}
                className="border-0 bg-transparent p-0 text-xs font-semibold text-slate-800 focus:outline-hidden dark:text-slate-200"
              />
            </div>
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800/50">
              <Calendar size={13} className="text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-400">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setDateRangePreset("custom");
                  setEndDate(e.target.value);
                }}
                className="border-0 bg-transparent p-0 text-xs font-semibold text-slate-800 focus:outline-hidden dark:text-slate-200"
              />
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => handlePresetChange("all")}
                className="rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle size={18} />
            Unable to fetch Finance Overview
          </div>
          <p className="mt-1 text-xs">{error}</p>
          <button
            type="button"
            onClick={() => loadOverview()}
            className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
          >
            Retry Request
          </button>
        </div>
      ) : (
        <>
          {/* Executive KPI Cards */}
          <OverviewKpiCards
            data={data || {}}
            loading={loading}
            selectedCurrency={currency}
          />

          {/* Multi-Currency Portfolio Breakdown (if multiple currencies present) */}
          {Array.isArray(data?.byCurrency) && data.byCurrency.length > 1 && (
            <CurrencyBreakdownCard
              byCurrency={data.byCurrency}
              activeCurrency={currency}
              onSelectCurrency={(cur) => setCurrency(cur)}
            />
          )}

          {/* Inflow Health & Retention Analytics Row */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Travel Category Revenue Distribution */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs lg:col-span-2 dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Revenue by Travel Category
                  </h3>
                  <p className="text-xs text-slate-400">
                    Distribution of inflows across Flights, Umrah Packages, Hotels & Visas
                  </p>
                </div>
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
                  {netRetentionRate}% Net Retention
                </span>
              </div>

              {/* Stacked Multi-Segment Progress Bar */}
              <div className="space-y-2">
                <div className="h-3.5 w-full overflow-hidden rounded-full bg-slate-100 flex dark:bg-slate-800">
                  {categoryStats.map((cat) => (
                    <div
                      key={cat.key}
                      style={{ width: `${Math.max(cat.count > 0 ? 8 : 0, cat.pct)}%` }}
                      className={`h-full ${cat.color} transition-all duration-500 first:rounded-l-full last:rounded-r-full`}
                      title={`${cat.label}: ${formatMoney(cat.amount, baseCurr)} (${cat.pct}%)`}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-4">
                  {categoryStats.map((cat) => {
                    const CatIcon = cat.icon;
                    return (
                      <div
                        key={cat.key}
                        className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                      >
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          <CatIcon size={14} className="text-slate-400" />
                          <span className="truncate">{cat.label}</span>
                        </div>
                        <div className="mt-1.5 text-sm font-black text-slate-900 dark:text-white">
                          {formatMoney(cat.amount, baseCurr)}
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-400">
                          {cat.count} bookings ({cat.pct}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Metric Breakdown Cards */}
              <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2 border-t border-slate-100 dark:border-slate-800">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="block text-slate-400">Average Transaction</span>
                  <span className="mt-1 block text-base font-bold text-slate-800 dark:text-white">
                    {formatMoney(avgTxValue, baseCurr)}
                  </span>
                </div>
                {/* Commented out per user request: Refund Incidence metric card
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="block text-slate-400">Refund Incidence</span>
                  <span className="mt-1 block text-base font-bold text-slate-800 dark:text-white">
                    {refundRate}% of Inflow
                  </span>
                </div>
                */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="block text-slate-400">Completed Transactions</span>
                  <span className="mt-1 block text-base font-bold text-slate-800 dark:text-white">
                    {totalTx} Records
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Operations Actions Panel */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Financial Quick Access
                </h3>
                <p className="text-xs text-slate-400">
                  Direct workflows into financial reconciliation & ledger
                </p>

                <div className="mt-4 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => navigate("/admin/finance/transactions")}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
                  >
                    <span className="flex items-center gap-2">
                      <Receipt size={16} className="text-emerald-600 dark:text-emerald-400" />
                      Browse Full Transactions Ledger
                    </span>
                    <ArrowRight size={14} />
                  </button>

                  {/* Commented out per user request: Manage Refunds Queue
                  <button
                    type="button"
                    onClick={() => navigate("/admin/finance/refunds")}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs font-bold text-slate-700 transition hover:border-purple-300 hover:bg-purple-50/50 hover:text-purple-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-purple-500/50 dark:hover:bg-purple-950/40 dark:hover:text-purple-300"
                  >
                    <span className="flex items-center gap-2">
                      <RotateCcw size={16} className="text-purple-600 dark:text-purple-400" />
                      Manage Refunds Queue
                    </span>
                    <ArrowRight size={14} />
                  </button>
                  */}
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Reconciliation Note:
                </span>{" "}
                Payment ledger updates automatically whenever bookings are confirmed, captured via gateways, or refunded.
              </div>
            </div>
          </div>

          {/* Recent Transactions Feed */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Recent Ledger Transactions
                </h3>
                <p className="text-xs text-slate-400">
                  Latest recorded payment transactions matching active scope & date boundary
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/admin/finance/transactions")}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
              >
                <span>View All ({totalTx})</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {loadingTx ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                <p className="mt-2">Loading transactions ledger...</p>
              </div>
            ) : recentTx.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 dark:border-slate-800">
                No transactions recorded for the selected filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    <tr>
                      <th className="pb-2.5 font-bold">Transaction / Booking</th>
                      <th className="pb-2.5 font-bold">Customer</th>
                      <th className="pb-2.5 font-bold">Gateway / Method</th>
                      <th className="pb-2.5 font-bold">Amount</th>
                      <th className="pb-2.5 font-bold">Status</th>
                      <th className="pb-2.5 font-bold">Date</th>
                      <th className="pb-2.5 text-right font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentTx.map((tx) => {
                      const methodMeta = getPaymentMethodMeta(tx.paymentMethod);
                      const customerName = tx.customer?.name || "Customer";
                      const initials = customerName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();

                      return (
                        <tr
                          key={tx._id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 font-mono">
                            <span className="font-bold text-slate-800 dark:text-white">
                              {tx.gatewayData?.transactionId || tx._id.slice(-8)}
                            </span>
                            <span className="block text-[10px] text-slate-400 uppercase">
                              {tx.bookingType || "Service"}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                                {initials || "U"}
                              </span>
                              <div>
                                <div className="font-bold text-slate-800 dark:text-white">
                                  {customerName}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {tx.customer?.email || "—"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className="inline-flex items-center rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 capitalize dark:border-slate-700 dark:text-slate-300">
                              {methodMeta.name}
                            </span>
                          </td>
                          <td className="py-3 font-black text-slate-900 dark:text-white">
                            {formatMoney(tx.amount, tx.currency)}
                          </td>
                          <td className="py-3">
                            <PaymentStatusBadge status={tx.status} />
                          </td>
                          <td className="py-3 text-slate-500 text-[11px]">
                            {formatFinanceDate(tx.paidAt || tx.createdAt, false)}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedTxId(tx._id)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white cursor-pointer"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
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
