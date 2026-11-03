// Compact stat card used by the hotelier dashboard.

const ACCENTS = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  emerald: "bg-emerald-50 text-emerald-600",
  orange: "bg-orange-50 text-orange-600",
  violet: "bg-violet-50 text-violet-600",
  purple: "bg-violet-50 text-violet-600",
  red: "bg-red-50 text-red-500",
  amber: "bg-amber-50 text-amber-600",
  slate: "bg-slate-100 text-slate-600",
};

export default function StatCard({ label, value, icon: Icon, color = "blue" }) {
  const accent = ACCENTS[color] || ACCENTS.blue;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {Icon ? (
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${accent}`}>
          <Icon size={20} />
        </div>
      ) : null}

      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-[22px] font-bold leading-tight text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}
