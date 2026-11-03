export default function RevenueChart() {
  const bars=[28,42,36,54,48,66,58,78,63,88,71,96];
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Revenue Overview</h3><p className="text-xs text-slate-400">Demo data for Phase 1</p></div><span className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">Last 12 months</span></div><div className="mt-6 flex h-52 items-end gap-2">{bars.map((h,i)=><div key={i} className="flex-1 rounded-t-lg bg-emerald-200" style={{height:`${h}%`}} />)}</div></div>;
}
