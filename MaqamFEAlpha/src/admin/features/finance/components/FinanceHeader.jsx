import { NavLink, useLocation } from "react-router-dom";
import { RefreshCw, LayoutDashboard, ArrowUpRight, RotateCcw, ShieldCheck } from "lucide-react";
import DataSourceBadge from "../../../components/common/DataSourceBadge";

export default function FinanceHeader({
  title = "Finance & Revenue Desk",
  subtitle = "Real-time revenue metrics, transactions ledger, payment gateway reconciliations & refunds queue.",
  onRefresh,
  refreshing = false,
  actions,
}) {
  const location = useLocation();
  const currentPath = location.pathname;

  const tabs = [
    { label: "Overview", to: "/admin/finance", icon: LayoutDashboard, exact: true },
    { label: "Transactions Ledger", to: "/admin/finance/transactions", icon: ArrowUpRight },
    // { label: "Refunds Desk", to: "/admin/finance/refunds", icon: RotateCcw }, // Commented out per user request
  ];

  const isTabActive = (tab) => {
    if (tab.exact) {
      return currentPath === "/admin/finance" || currentPath === "/admin/finance/";
    }
    return currentPath.startsWith(tab.to);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 shadow-2xs dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Ledger
            </span>
            <DataSourceBadge />
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {actions}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              title="Refresh live data from server"
            >
              <RefreshCw
                size={14}
                className={refreshing ? "animate-spin text-emerald-600" : "text-slate-400"}
              />
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-px text-sm font-semibold dark:border-slate-800">
        {tabs.map((tab) => {
          const active = isTabActive(tab);
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-t-xl px-4 py-2.5 text-xs font-bold transition-all sm:text-sm ${
                active
                  ? "border-b-2 border-emerald-600 bg-white text-emerald-700 shadow-sm dark:bg-slate-800 dark:text-emerald-400"
                  : "text-slate-500 hover:border-b-2 hover:border-slate-300 hover:bg-slate-50/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200"
              }`}
            >
              <Icon size={16} className={active ? "text-emerald-600" : "text-slate-400"} />
              {tab.label}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
