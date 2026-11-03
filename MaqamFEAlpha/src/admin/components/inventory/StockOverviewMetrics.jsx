import { Plane, Hotel } from "lucide-react";

import { useStocksOverview } from "../../features/inventory/stocks/useStocksOverview";

function MetricCard({ icon, label, value, hint, tone = "slate" }) {
  const tones = {
    slate: "text-slate-900",
    emerald: "text-emerald-700",
    amber: "text-amber-600",
    sky: "text-sky-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-slate-100 p-1.5 text-slate-500">
          {icon}
        </span>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
      </div>
      <p className={`mt-2 text-2xl font-extrabold ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// Renders the live overview metrics for one side of the stocks section.
// Data comes from GET /api/v1/crm/stocks/overview which is polled in
// the background every 15s (see useStocksOverview).
export default function StockOverviewMetrics({ side = "flights" }) {
  const { data: overview, isLoading, isFetching } =
    useStocksOverview();

  const liveDot = (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
      <span className="relative flex h-2 w-2">
        <span
          className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 ${
            isFetching ? "animate-ping" : ""
          }`}
        />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      Live
    </span>
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div
            key={key}
            className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white"
          />
        ))}
      </div>
    );
  }

  if (side === "flights") {
    const flights = overview?.flights;

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-slate-700">
            Flight stock overview
          </p>
          {liveDot}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<Plane size={15} />}
            label="Total seats"
            value={flights?.totalSeats ?? 0}
            hint={`${flights?.totalBatches ?? 0} batches`}
          />

          <MetricCard
            icon={<Plane size={15} />}
            label="Available seats"
            value={flights?.availableSeats ?? 0}
            tone="emerald"
          />

          <MetricCard
            icon={<Plane size={15} />}
            label="Held seats"
            value={flights?.heldSeats ?? 0}
            tone="amber"
          />

          <MetricCard
            icon={<Plane size={15} />}
            label="Used seats"
            value={flights?.usedSeats ?? 0}
            tone="sky"
          />
        </div>
      </div>
    );
  }

  const hotels = overview?.hotels;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-700">
          Hotel stock overview
        </p>
        {liveDot}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Hotel size={15} />}
          label="Total rooms"
          value={hotels?.totalRooms ?? 0}
          hint={`${hotels?.totalAllotments ?? 0} allotments`}
        />

        <MetricCard
          icon={<Hotel size={15} />}
          label="Available rooms"
          value={hotels?.availableRooms ?? 0}
          tone="emerald"
        />

        <MetricCard
          icon={<Hotel size={15} />}
          label="Held rooms"
          value={hotels?.heldRooms ?? 0}
          tone="amber"
        />

        <MetricCard
          icon={<Hotel size={15} />}
          label="Used rooms"
          value={hotels?.usedRooms ?? 0}
          tone="sky"
        />
      </div>
    </div>
  );
}
