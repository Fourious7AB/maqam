import { quickActions } from "../../data/dashboardData";

export default function QuickActions() {
  return (
    <div className="dashboard-card p-4">
      <div className="mb-3 text-[14px] font-bold text-slate-900">
        Quick Actions
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {quickActions.map(([label, Icon, iconClass]) => (
          <button
            key={label}
            className="flex min-h-[58px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-blue-200 hover:bg-blue-50/40 sm:flex-col sm:justify-center sm:text-center"
          >
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${iconClass}`}
            >
              <Icon size={16} />
            </span>
            <span className="text-[10px] font-medium text-slate-700">
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
