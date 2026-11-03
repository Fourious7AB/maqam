export default function BookingSnapshot({snapshot,price}){
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 className="font-bold text-slate-900">Booking Snapshot</h3>
    <p className="mt-1 text-xs text-slate-500">Immutable package details captured at confirmation.</p>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {[
        ["Package",snapshot?.title],["Destination",snapshot?.destination],["Duration",snapshot?.durationDays?`${snapshot.durationDays} days`:"—"],["Package Price",price!=null?`₹${Number(price).toLocaleString("en-IN")}`:"—"]
      ].map(([label,value])=><div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-800">{value||"—"}</p></div>)}
    </div>
  </section>
}
