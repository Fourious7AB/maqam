import {
  TrendingUp,
  DollarSign,
  Clock,
  RotateCcw,
  Receipt,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { formatMoney } from "../financeUtils";

export default function OverviewKpiCards({
  data = {},
  loading = false,
  selectedCurrency = "ALL",
}) {
  // Selected filter currency takes precedence over backend fallback currency when filtered
  const currency =
    selectedCurrency && selectedCurrency !== "ALL"
      ? selectedCurrency
      : data.currency || "INR";

  const gross = Number(data.grossRevenue ?? 0);
  const net = Number(data.netRevenue ?? 0);
  const pending = Number(data.pendingPayment ?? 0);
  const refunds = Number(data.refunds ?? 0);
  const totalTx = Number(data.totalTransactions ?? 0);

  const retentionPct = gross > 0 ? Math.round((net / gross) * 100) : 100;
  const refundRatePct = gross > 0 ? ((refunds / gross) * 100).toFixed(1) : 0;
  const avgTxValue = totalTx > 0 ? gross / totalTx : 0;

  // Modern SaaS skeleton loader with actual card context (eliminates generic "---" dashes)
  if (loading) {
    const skeletonHeaders = [
      {
        label: "Gross Revenue",
        icon: TrendingUp,
        iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
      },
      {
        label: "Net Revenue",
        icon: DollarSign,
        iconBg: "bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400",
      },
      {
        label: "Transactions Volume",
        icon: Receipt,
        iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
      },
    ];

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {skeletonHeaders.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {c.label}
                </span>
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${c.iconBg}`}>
                  <Icon size={18} className="animate-pulse" />
                </span>
              </div>
              <div className="mt-4">
                <div className="h-8 w-36 rounded-lg bg-slate-200/70 dark:bg-slate-800 animate-pulse" />
                <div className="mt-2.5 h-3.5 w-28 rounded bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800/80">
                <div className="h-4 w-24 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-3 w-16 rounded bg-slate-50 dark:bg-slate-800/40 animate-pulse" />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const cards = [
    {
      label: "Gross Revenue",
      value: formatMoney(gross, currency),
      subtext: totalTx > 0 ? `${totalTx} completed inflows` : "No completed transactions in window",
      badge: `${totalTx} ledger txns`,
      badgeColor:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60",
      pill: avgTxValue > 0 ? `Avg ${formatMoney(avgTxValue, currency)}` : `Base: ${currency}`,
      pillColor: "text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/30",
      icon: TrendingUp,
      iconBg:
        "bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 dark:from-emerald-950/40 dark:to-teal-950/40 dark:text-emerald-400 ring-1 ring-emerald-500/20",
      borderHover:
        "hover:border-emerald-300 dark:hover:border-emerald-600/60 dark:hover:bg-slate-800/60",
      accentGlow: "group-hover:opacity-100 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent",
    },
    {
      label: "Net Revenue",
      value: formatMoney(net, currency),
      subtext: refunds > 0 ? `Gross inflow minus ${formatMoney(refunds, currency)} returns` : "Gross inflow minus refunds",
      badge: `${retentionPct}% retained`,
      badgeColor:
        "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800/60",
      pill: "Net Yield",
      pillColor: "text-teal-700 dark:text-teal-400 bg-teal-50/80 dark:bg-teal-950/30",
      icon: DollarSign,
      iconBg:
        "bg-gradient-to-br from-teal-50 to-cyan-50 text-teal-600 dark:from-teal-950/40 dark:to-cyan-950/40 dark:text-teal-400 ring-1 ring-teal-500/20",
      borderHover:
        "hover:border-teal-300 dark:hover:border-teal-600/60 dark:hover:bg-slate-800/60",
      accentGlow: "group-hover:opacity-100 bg-gradient-to-r from-teal-500/10 via-transparent to-transparent",
    },
    /*
    // Commented out per user request: Pending Payment & Settled Refunds
    {
      label: "Pending Payment",
      value: formatMoney(pending, currency),
      subtext: "In-flight / uncaptured auth",
      badge: pending > 0 ? "Awaiting settle" : "Clear",
      badgeColor: pending > 0 ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60" : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
      icon: Clock,
      iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
      borderHover: "hover:border-amber-300 dark:hover:border-amber-600/60 dark:hover:bg-slate-800/60",
    },
    {
      label: "Settled Refunds",
      value: formatMoney(refunds, currency),
      subtext: "Total disbursed returns",
      badge: `${refundRatePct}% of gross`,
      badgeColor: refunds > 0 ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/60" : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
      icon: RotateCcw,
      iconBg: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
      borderHover: "hover:border-purple-300 dark:hover:border-purple-600/60 dark:hover:bg-slate-800/60",
    },
    */
    {
      label: "Transactions Volume",
      value: totalTx.toLocaleString(),
      subtext: "Payment records count",
      badge: `Base: ${currency}`,
      badgeColor:
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60",
      pill: "Audited Ledger",
      pillColor: "text-blue-700 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/30",
      icon: Receipt,
      iconBg:
        "bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 dark:from-blue-950/40 dark:to-indigo-950/40 dark:text-blue-400 ring-1 ring-blue-500/20",
      borderHover:
        "hover:border-blue-300 dark:hover:border-blue-600/60 dark:hover:bg-slate-800/60",
      accentGlow: "group-hover:opacity-100 bg-gradient-to-r from-blue-500/10 via-transparent to-transparent",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className={`group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${c.borderHover}`}
          >
            {/* Subtle glow top border accent */}
            <div
              className={`pointer-events-none absolute inset-x-0 top-0 h-1 opacity-0 transition-opacity duration-300 ${c.accentGlow}`}
            />

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {c.label}
              </span>
              <span className={`grid h-10 w-10 place-items-center rounded-xl shadow-2xs ${c.iconBg}`}>
                <Icon size={19} />
              </span>
            </div>

            <div className="mt-3">
              <div
                className="truncate text-3xl font-black tracking-tight text-slate-900 dark:text-white"
                title={c.value}
              >
                {c.value}
              </div>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                {c.subtext}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800/80">
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${c.badgeColor}`}
              >
                {c.badge}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${c.pillColor}`}
              >
                <Zap size={10} />
                {c.pill}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
