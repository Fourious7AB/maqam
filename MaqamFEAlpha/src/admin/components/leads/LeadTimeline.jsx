import { CheckCircle2, CircleDot, FileText, MessageSquare, Phone, UserPlus } from "lucide-react";

const icons = {
  created: UserPlus,
  call: Phone,
  note: MessageSquare,
  quote: FileText,
  won: CheckCircle2,
};

export default function LeadTimeline({ events = [] }) {
  if (!events.length) {
    return <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No activity yet.</div>;
  }

  return (
    <div className="space-y-5">
      {events.map((event) => {
        const Icon = icons[event.type] || CircleDot;
        return (
          <div key={event.id} className="flex gap-3">
            <div className="relative flex w-9 shrink-0 justify-center">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Icon size={15} /></span>
            </div>
            <div className="min-w-0 flex-1 border-b border-slate-100 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">{event.title}</p>
                <span className="text-xs text-slate-400">{event.time}</span>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-500">{event.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
