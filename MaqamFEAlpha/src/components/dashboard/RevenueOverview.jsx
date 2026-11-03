import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUp } from "lucide-react";
import { revenueData } from "../../data/dashboardData";

export default function RevenueOverview() {
  return (
    <div className="dashboard-card overflow-hidden">
      {/* <div className="flex items-center justify-between px-4 pb-1 pt-4">
        <h2 className="text-[14px] font-bold text-slate-900">Revenue Overview</h2>

        <select className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-700 outline-none">
          <option>This Week</option>
          <option>This Month</option>
          <option>This Year</option>
        </select>
      </div>

      <div className="px-4">
        <div className="mt-1 flex flex-wrap items-end gap-2">
          <span className="text-[20px] font-bold text-slate-900">$186,540</span>
          <span className="mb-1 flex items-center text-[10px] font-semibold text-emerald-600">
            <ArrowUp size={10} />
            22.4%
          </span>
          <span className="mb-1 text-[9px] text-slate-500">vs last week</span>
        </div>
      </div> */}

      {/* <div className="h-[225px] w-full px-2 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={revenueData}
            margin={{ top: 10, right: 12, left: -15, bottom: 10 }}
          >
            <defs>
              <linearGradient id="maqamRevenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.03} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} stroke="#eef2f7" />

            <XAxis
              dataKey="day"
              tick={{ fontSize: 9, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tick={{ fontSize: 9, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}K`}
              domain={[0, 250]}
            />

            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                fontSize: 11,
              }}
              formatter={(value) => [`$${value}K`, "Revenue"]}
            />

            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#2563eb"
              strokeWidth={2}
              fill="url(#maqamRevenueFill)"
              dot={{
                r: 2.5,
                strokeWidth: 1.5,
                fill: "#fff",
                stroke: "#2563eb",
              }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div> */}
    </div>
  );
}
