import { ArrowRight } from "lucide-react";
import { destinations } from "../../data/dashboardData";

export default function TopDestinations() {
  const max = Math.max(...destinations.map((item) => item[1]));

  return (
    <div className="dashboard-card overflow-hidden">
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <h2 className="text-[14px] font-bold text-slate-900">
          Top Holy Destinations
        </h2>

        <select className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-700 outline-none">
          <option>By Bookings</option>
          <option>By Revenue</option>
        </select>
      </div>

      {/* <div className="space-y-4 px-4 pb-4">
        {destinations.map(([city, count]) => (
          <div key={city}>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="grid h-4 w-5 place-items-center rounded bg-emerald-50 text-[8px] font-bold text-emerald-700">
                SA
              </span>

              <span className="flex-1 text-[10px] font-medium text-slate-700">
                {city}
              </span>

              <span className="text-[10px] font-semibold text-slate-700">
                {count}
              </span>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div> */}

      <button className="flex w-full items-center justify-center gap-2 border-t border-slate-100 py-3 text-[11px] font-semibold text-blue-600 hover:bg-blue-50/50">
        View All Destinations
        <ArrowRight size={14} />
      </button>
    </div>
  );
}
