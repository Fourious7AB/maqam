export default function StatCard({ title, value, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>

      <div
        className={`mt-3 inline-flex rounded-lg px-3 py-1 text-2xl font-bold ${colors[color]}`}
      >
        {value}
      </div>
    </div>
  );
}