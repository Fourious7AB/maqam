import { NavLink } from "react-router-dom";
import { UsersRound, GitBranch, Plus, RefreshCw, FileText } from "lucide-react";
import Button from "../../../components/common/Button";
import DataSourceBadge from "../../../components/common/DataSourceBadge";

export default function LeadsHeader({
  activeView = "leads", // "leads" | "pipeline" | "quotes"
  totalCount,
  onRefresh,
  onAddLead,
  refreshing = false,
}) {
  return (
    <header className="space-y-4">
      {/* Top row: Title + Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              {activeView === "quotes" ? "Website Quotations Desk" : "Leads & Sales"}
            </h1>
            {totalCount !== undefined && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-100">
                {totalCount} {activeView === "quotes" ? "website quotes" : "leads"}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
            {activeView === "quotes"
              ? "Review, assign, and issue proposals for quotation requests received directly from the website."
              : "Acquire enquiries, qualify travel requirements, and convert deals into bookings."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DataSourceBadge />
          {onRefresh && (
            <Button
              variant="secondary"
              onClick={onRefresh}
              disabled={refreshing}
              className="!h-9 !px-3 !text-xs !font-semibold"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin text-emerald-600" : "text-slate-500"} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}
          {onAddLead && (
            <Button
              onClick={onAddLead}
              className="!h-9 !px-3.5 !text-xs !font-bold !bg-emerald-700 hover:!bg-emerald-800 shadow-sm"
            >
              <Plus size={15} />
              <span>Add Lead</span>
            </Button>
          )}
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <nav className="-mb-px flex gap-2 sm:gap-4 overflow-x-auto scrollbar-none" aria-label="Views">
          <NavLink
            to="/admin/leads"
            className={({ isActive }) =>
              `group inline-flex items-center gap-2 border-b-2 py-2.5 px-3 text-xs sm:text-sm font-bold transition whitespace-nowrap ${
                isActive || activeView === "leads"
                  ? "border-emerald-700 text-emerald-800"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
              }`
            }
          >
            <UsersRound size={16} className={activeView === "leads" ? "text-emerald-700" : "text-slate-400 group-hover:text-slate-600"} />
            <span>All Leads (Table)</span>
          </NavLink>

          <NavLink
            to="/admin/pipeline"
            className={({ isActive }) =>
              `group inline-flex items-center gap-2 border-b-2 py-2.5 px-3 text-xs sm:text-sm font-bold transition whitespace-nowrap ${
                isActive || activeView === "pipeline"
                  ? "border-emerald-700 text-emerald-800"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
              }`
            }
          >
            <GitBranch size={16} className={activeView === "pipeline" ? "text-emerald-700" : "text-slate-400 group-hover:text-slate-600"} />
            <span>Sales Pipeline (Kanban)</span>
          </NavLink>

          <NavLink
            to="/admin/quotes"
            className={({ isActive }) =>
              `group inline-flex items-center gap-2 border-b-2 py-2.5 px-3 text-xs sm:text-sm font-bold transition whitespace-nowrap ${
                isActive || activeView === "quotes"
                  ? "border-emerald-700 text-emerald-800"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
              }`
            }
          >
            <FileText size={16} className={activeView === "quotes" ? "text-emerald-700" : "text-slate-400 group-hover:text-slate-600"} />
            <span>Quotations (Desk)</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
