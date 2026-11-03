import { ChevronRight } from "lucide-react";
import { pricingItems } from "../../data/dashboardData";

export default function PricingOverview() {
  return (
    <div className="dashboard-card overflow-hidden">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-[14px] font-bold text-slate-900">
          Pricing Control Overview
        </h2>
        <button className="text-[11px] font-semibold text-blue-600">
          View All
        </button>
      </div>

      {pricingItems.map(([name, description, Icon, status, iconClass]) => (
        <button
          key={name}
          className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
        >
          <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${iconClass}`}>
            <Icon size={15} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-slate-800">
              {name}
            </div>
            <div className="mt-0.5 truncate text-[9px] text-slate-500">
              {description}
            </div>
          </div>

          <span className="hidden rounded bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-600 sm:block">
            {status}
          </span>

          <ChevronRight size={14} className="text-slate-400" />
        </button>
      ))}
    </div>
  );
}
