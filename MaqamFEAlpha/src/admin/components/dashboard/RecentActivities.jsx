import { Activity, CheckCircle2, Package, UsersRound } from "lucide-react";

const icons = {
  lead: UsersRound,
  booking: CheckCircle2,
  package: Package,
};

export default function RecentActivities({ activities = [] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600"><Activity size={18} /></span>
        <div>
          <h2 className="font-bold text-slate-900">Recent Activities</h2>
          <p className="mt-1 text-xs text-slate-500">Latest CRM events</p>
        </div>
      </div>

      <div className="mt-4 divide-y divide-slate-100">
        {activities.map((item) => {
          const Icon = icons[item.type] || Activity;
          return (
            <div key={item.id} className="flex gap-3 py-4 first:pt-1 last:pb-1">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Icon size={15} /></span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
                <p className="mt-1 text-[11px] text-slate-400">{item.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
