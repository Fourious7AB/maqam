import * as Icons from 'lucide-react';
export default function StatCard({ title, value, change, note, icon }) {
  const Icon = Icons[icon] || Icons.BarChart3;
  const down = String(change).startsWith('-');
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{title}</p><p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{value}</p></div><div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={19}/></div></div><p className="mt-3 text-xs"><span className={`font-bold ${down ? 'text-red-600' : 'text-emerald-700'}`}>{change}</span><span className="ml-1 text-slate-400">{note}</span></p></div>;
}
