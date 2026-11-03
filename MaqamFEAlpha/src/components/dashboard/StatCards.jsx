import { ArrowDown, ArrowUp } from "lucide-react";
import { stats } from "../../data/dashboardData";

export default function StatCards() {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.label}
            className="dashboard-card flex min-w-0 items-center gap-3 p-4 sm:p-5"
          >
            <div
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${stat.iconClass}`}
            >
              <Icon size={23} />
            </div>

            <div className="min-w-0">
              <div className="truncate text-[10px] font-medium text-slate-600 sm:text-[11px]">
                {stat.label}
              </div>

              <div className="mt-1 text-[20px] font-bold tracking-tight text-slate-900 sm:text-[22px]">
                {stat.value}
              </div>

              {/* <div
                className={`mt-1 flex items-center gap-1 text-[10px] ${
                  stat.positive ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {stat.positive ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                <span className="font-semibold">{stat.change}</span>
                <span className="text-slate-500">vs last month</span>
              </div> */}
            </div>
          </div>
        );
      })}
    </section>
  );
}
