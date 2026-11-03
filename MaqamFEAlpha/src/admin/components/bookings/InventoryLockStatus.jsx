import { CheckCircle2, Clock3, LockKeyhole, XCircle } from "lucide-react";
export default function InventoryLockStatus({lock}){
  if(!lock)return <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">Inventory has not been locked yet.</div>;
  const expiry=lock.expiresAt?new Date(lock.expiresAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"—";
  return <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><LockKeyhole size={18} className="text-emerald-700"/><h3 className="font-bold text-slate-800">Inventory Locked</h3></div><span className="flex items-center gap-1 text-xs font-semibold text-slate-500"><Clock3 size={13}/>Until {expiry}</span></div>
    <div className="mt-4 grid gap-2 md:grid-cols-2">{lock.claims?.map((c,i)=><div key={i} className="flex items-center justify-between rounded-xl bg-white p-3"><div><p className="text-sm font-semibold text-slate-700">{c.label}</p><p className="text-xs text-slate-400">{c.quantity} {c.unit||"units"}</p></div>{c.status==="locked"?<CheckCircle2 size={17} className="text-emerald-600"/>:<XCircle size={17} className="text-slate-300"/>}</div>)}</div>
  </div>
}
