import { CheckCircle2, CircleDot } from "lucide-react";
export default function BookingTimeline({items=[]}){
  return <div className="space-y-4">{items.length?items.map(item=><div key={item.id} className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 size={15}/></span><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-slate-800">{item.title}</p><span className="text-[11px] text-slate-400">{item.time}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p></div></div>):<div className="text-sm text-slate-500">No booking activity yet.</div>}</div>
}
