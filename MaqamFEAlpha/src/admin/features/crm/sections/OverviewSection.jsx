import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  UsersRound,
  CalendarDays,
  WalletCards,
  Boxes,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  PlaneTakeoff,
  Hotel,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { crmApi } from "../crmApi";
import { Pill } from "../crmUi";

const statusTone = {
  new: "amber",
  contacted: "blue",
  qualified: "purple",
  proposal: "blue",
  proposal_sent: "blue",
  negotiation: "blue",
  negotiating: "blue",
  won: "green",
  converted: "green",
  convertedBooking: "green",
  lost: "red",
  nurture: "slate",
};

const label = (key = "") =>
  String(key)
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

function formatINR(amount) {
  const num = Number(amount || 0);
  if (!Number.isFinite(num)) return "₹0";
  if (Math.abs(num) >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
  if (Math.abs(num) >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
  if (Math.abs(num) >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toLocaleString("en-IN")}`;
}

export default function OverviewSection() {
  const [stats, setStats] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [bookings, setBookings] = useState(null);
  const [finance, setFinance] = useState(null);
  const [stocks, setStocks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorNotice, setErrorNotice] = useState("");

  const loadData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setErrorNotice("");

      const [statsRes, pipeRes, bookRes, finRes, stockRes] = await Promise.allSettled([
        crmApi.agentStats(),
        crmApi.pipelineOverview(),
        crmApi.bookingsSummary(),
        crmApi.financeOverview(),
        crmApi.stocksOverview(),
      ]);

      if (statsRes.status === "fulfilled" && statsRes.value) {
        setStats(statsRes.value);
      }
      if (pipeRes.status === "fulfilled" && pipeRes.value) {
        setPipeline(pipeRes.value);
      }
      if (bookRes.status === "fulfilled" && bookRes.value) {
        setBookings(bookRes.value);
      }
      if (finRes.status === "fulfilled" && finRes.value) {
        setFinance(finRes.value);
      }
      if (stockRes.status === "fulfilled" && stockRes.value) {
        setStocks(stockRes.value);
      }
    } catch (err) {
      setErrorNotice(err?.message || "Failed to refresh some overview dimensions.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center p-8">
        <LoadingSpinner text="Loading CRM overview and live intelligence…" />
      </div>
    );
  }

  // Safe KPI computations
  const totalLeads = Number(pipeline?.totalLeads ?? stats?.totalLeads ?? 0);
  const newLeads = Number(pipeline?.byStatus?.new ?? stats?.new ?? 0);
  const wonLeads = Number(pipeline?.byStatus?.won ?? stats?.won ?? 0);
  const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : "0.0";

  const totalBookings = Number(bookings?.totalBookings ?? 0);
  const pendingBookings = Number(
    bookings?.pendingActions?.awaitingOperations ?? bookings?.byStatus?.pending ?? 0
  );
  const confirmedBookings = Number(bookings?.byStatus?.confirmed ?? 0);

  const grossRevenue = Number(
    finance?.grossRevenue ?? bookings?.financialSummary?.totalGrossRevenue ?? 0
  );
  const pendingPayment = Number(finance?.pendingPayment ?? 0);

  const availableFlightSeats = Number(stocks?.flights?.availableSeats ?? 0);
  const totalFlightSeats = Number(stocks?.flights?.totalSeats ?? 0);
  const availableHotelRooms = Number(stocks?.hotels?.availableRooms ?? 0);
  const totalHotelRooms = Number(stocks?.hotels?.totalRooms ?? 0);
  const totalAvailableStock = availableFlightSeats + availableHotelRooms;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">CRM Operations Pulse</h3>
          <p className="text-xs font-medium text-slate-500">
            Real-time pipeline flow, bookings status, wholesale capacity and financial telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin text-emerald-600" : "text-slate-500"} />
            {refreshing ? "Refreshing…" : "Sync Live Data"}
          </button>
        </div>
      </div>

      {errorNotice && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
          {errorNotice}
        </div>
      )}

      {/* 4 Core Executive KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Active Leads */}
        <div className="group relative rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-emerald-300 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sales Leads</span>
            <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
              <UsersRound size={18} />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">{totalLeads}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>
              <strong className="text-emerald-700">{newLeads} new</strong> · {wonLeads} won
            </span>
            <span className="font-semibold text-slate-600">{conversionRate}% win</span>
          </div>
          <Link
            to="/admin/crm/leads"
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            Open Leads Desk <ArrowRight size={12} />
          </Link>
        </div>

        {/* Total Bookings */}
        <div className="group relative rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-blue-300 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Bookings Queue</span>
            <span className="rounded-xl bg-blue-50 p-2 text-blue-700">
              <CalendarDays size={18} />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">{totalBookings}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>
              <strong className="text-blue-700">{confirmedBookings} confirmed</strong>
            </span>
            <span className="font-semibold text-amber-600">{pendingBookings} awaiting ops</span>
          </div>
          <Link
            to="/admin/crm/bookings"
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800"
          >
            Operate Bookings <ArrowRight size={12} />
          </Link>
        </div>

        {/* Gross Revenue */}
        <div className="group relative rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-purple-300 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Revenue</span>
            <span className="rounded-xl bg-purple-50 p-2 text-purple-700">
              <WalletCards size={18} />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">{formatINR(grossRevenue)}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>
              Pending: <strong className="text-slate-700">{formatINR(pendingPayment)}</strong>
            </span>
            <span className="font-semibold text-emerald-600">Active INR</span>
          </div>
          <Link
            to="/admin/finance"
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-800"
          >
            Finance Ledger <ArrowRight size={12} />
          </Link>
        </div>

        {/* Inventory Stock */}
        <div className="group relative rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-amber-300 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Stock on Hand</span>
            <span className="rounded-xl bg-amber-50 p-2 text-amber-700">
              <Boxes size={18} />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">{totalAvailableStock}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{availableFlightSeats} seats free</span>
            <span>{availableHotelRooms} rooms free</span>
          </div>
          <Link
            to="/admin/crm/stock"
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800"
          >
            Review Allotments <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* Sales Pipeline & Funnel Breakdown */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-700" />
            <h4 className="text-sm font-bold text-slate-900">Sales Pipeline Stages</h4>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {totalLeads} total leads
            </span>
          </div>
          <Link to="/admin/crm/leads" className="text-xs font-bold text-emerald-700 hover:underline">
            View Pipeline Board →
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {Object.entries(pipeline?.byStatus ?? {}).map(([stageKey, count]) => {
            const num = Number(count || 0);
            const percentage = totalLeads > 0 ? ((num / totalLeads) * 100).toFixed(0) : 0;
            return (
              <div key={stageKey} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">{label(stageKey)}</span>
                  <Pill tone={statusTone[stageKey] || "slate"}>{num}</Pill>
                </div>
                <div className="mt-2 text-lg font-bold text-slate-900">{num}</div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="mt-1 text-[10px] text-slate-400">{percentage}% of pipeline</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Grid: Operations Breakdown + Wholesale Capacity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bookings Distribution */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-sm font-bold text-slate-900">Bookings by Category</h4>
            <span className="text-xs font-semibold text-slate-500">{totalBookings} Total</span>
          </div>
          <div className="mt-4 space-y-3">
            {Object.entries(bookings?.byType ?? { packages: 0, offers: 0, flights: 0, hotels: 0 }).map(
              ([typeKey, count]) => {
                const countNum = Number(count || 0);
                const percent = totalBookings > 0 ? ((countNum / totalBookings) * 100).toFixed(0) : 0;
                return (
                  <div key={typeKey} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{label(typeKey)}</span>
                      <span className="font-bold text-slate-900">
                        {countNum} ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Wholesale Inventory Capacity */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-sm font-bold text-slate-900">Wholesale Stock Status</h4>
            <span className="text-xs font-semibold text-emerald-700">Active Contracts</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {/* Flights Batch */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex items-center gap-2 text-slate-700">
                <PlaneTakeoff size={16} className="text-blue-600" />
                <span className="text-xs font-bold">Flights Inventory</span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{availableFlightSeats}</p>
              <p className="text-xs text-slate-500">Seats Available / {totalFlightSeats} Total</p>
              <div className="mt-3 text-[11px] font-semibold text-slate-600">
                Batches: {stocks?.flights?.totalBatches ?? 0} · Held: {stocks?.flights?.heldSeats ?? 0}
              </div>
            </div>

            {/* Hotel Allotments */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex items-center gap-2 text-slate-700">
                <Hotel size={16} className="text-emerald-600" />
                <span className="text-xs font-bold">Hotels Inventory</span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{availableHotelRooms}</p>
              <p className="text-xs text-slate-500">Rooms Available / {totalHotelRooms} Total</p>
              <div className="mt-3 text-[11px] font-semibold text-slate-600">
                Allotments: {stocks?.hotels?.totalAllotments ?? 0} · Held: {stocks?.hotels?.heldRooms ?? 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Statistics Counters Grid */}
      {stats && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-700" />
              <h4 className="text-sm font-bold text-slate-900">Agent Performance Counters</h4>
            </div>
            <span className="text-xs font-medium text-slate-400">Assigned Leads & Conversions</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
            {Object.entries(stats).map(([k, val]) => {
              if (typeof val === "object" && val !== null) return null;
              return (
                <div key={k} className="rounded-xl bg-slate-50 p-3.5 text-center">
                  <p className="text-xl font-bold text-slate-900">{String(val)}</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">{label(k)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
