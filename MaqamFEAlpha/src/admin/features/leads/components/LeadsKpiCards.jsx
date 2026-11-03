import { Users, TrendingUp, IndianRupee, Flame, CheckCircle2 } from "lucide-react";
import formatCurrency from "../../../utils/formatCurrency";

export default function LeadsKpiCards({ leads = [], stats = null }) {
  const total = stats?.totalLeads ?? leads.length;
  const won = stats?.won ?? leads.filter((l) => ["won", "converted"].includes(l.status)).length;
  const highPriority = stats?.highPriority ?? leads.filter((l) => l.priority === "high").length;
  const activeLeads = leads.filter((l) => !["won", "lost", "converted"].includes(l.status));
  const activeCount = stats?.active ?? activeLeads.length;

  const pipelineValue = stats?.pipelineValue ??
    activeLeads.reduce((sum, l) => sum + Number(l.budget || 0), 0);

  const winRate = total > 0 ? ((won / total) * 100).toFixed(0) : 0;

  const cards = [
    {
      label: "Total Enquiries",
      value: total,
      subtext: `${won} converted deals`,
      icon: Users,
      iconBg: "bg-blue-50 text-blue-600",
      border: "border-blue-100/60",
    },
    {
      label: "Active Pipeline",
      value: activeCount,
      subtext: "In qualification & proposal",
      icon: TrendingUp,
      iconBg: "bg-indigo-50 text-indigo-600",
      border: "border-indigo-100/60",
    },
    {
      label: "Pipeline Value",
      value: formatCurrency(pipelineValue),
      subtext: "Active deal volume",
      icon: IndianRupee,
      iconBg: "bg-emerald-50 text-emerald-700",
      border: "border-emerald-100/60",
    },
    {
      label: "Conversion Rate",
      value: `${winRate}%`,
      subtext: `${won} of ${total} closed won`,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 text-emerald-600",
      border: "border-emerald-100/60",
    },
    {
      label: "High Priority",
      value: highPriority,
      subtext: "Requires fast follow-up",
      icon: Flame,
      iconBg: "bg-rose-50 text-rose-600",
      border: "border-rose-100/60",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`flex flex-col justify-between rounded-2xl border ${card.border} bg-white p-3.5 sm:p-4 shadow-xs transition hover:shadow-sm`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {card.label}
              </span>
              <span className={`grid h-8 w-8 place-items-center rounded-xl ${card.iconBg}`}>
                <Icon size={16} />
              </span>
            </div>

            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                {card.value}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500 truncate">
                {card.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
