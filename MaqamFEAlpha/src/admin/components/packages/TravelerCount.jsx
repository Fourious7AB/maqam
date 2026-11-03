export default function TravelerCount({ value, onChange, min = 1, max = 100 }) {
  const set = (next) => onChange(Math.min(max, Math.max(min, Number(next) || min)));

  return (
    <div className="flex items-center rounded-xl border border-slate-200 bg-white">
      <button type="button" onClick={() => set(value - 1)} className="grid h-10 w-10 place-items-center text-slate-500 hover:bg-slate-50">−</button>
      <div className="min-w-12 text-center text-sm font-bold text-slate-800">{value}</div>
      <button type="button" onClick={() => set(value + 1)} className="grid h-10 w-10 place-items-center text-slate-500 hover:bg-slate-50">+</button>
    </div>
  );
}
