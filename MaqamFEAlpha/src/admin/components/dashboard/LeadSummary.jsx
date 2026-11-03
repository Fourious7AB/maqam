import { Users, TrendingUp, DollarSign } from "lucide-react";
import LeadStatus from "../leads/LeadStatus";
import formatCurrency from "../../utils/formatCurrency";

export default function LeadSummary({ leads = [] }) {
  const statuses = [
    { key: "new", label: "New" },
    { key: "contacted", label: "Contacted" },
    { key: "qualified", label: "Qualified" },
    { key: "proposal", label: "Proposal" },
    { key: "negotiation", label: "Negotiation" },
    { key: "won", label: "Won" },
  ];

  const total = leads.length || 0;
  const wonCount = leads.filter((lead) => ["won", "converted"].includes(lead.status)).length;
  const activeCount = leads.filter((lead) => !["won", "lost", "converted"].includes(lead.status)).length;
  const conversionRate = total > 0 ? Math.round((wonCount / total) * 100) : 0;
  const pipelineValue = leads
    .filter((lead) => !["won", "lost", "converted"].includes(lead.status))
    .reduce((sum, lead) => sum + Number(lead.budget || 0), 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900">Lead Overview</h2>
          <p className="mt-1 text-xs text-slate-500">Sales funnel breakdown & stage distribution</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
          <Users size={18} />
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {statuses.map(({ key }) => {
          const count = leads.filter((lead) => lead.status === key).length;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const width = `${Math.max(count > 0 ? 8 : 0, pct)}%`;
          return (
            <div key={key}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <LeadStatus status={key} />
                <span className="text-xs font-bold text-slate-600">
                  {count} <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 text-xs">
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5">
          <TrendingUp size={16} className="text-emerald-600 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Win Rate</span>
            <span className="font-bold text-slate-900 text-sm">{conversionRate}%</span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5">
          <DollarSign size={16} className="text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Active Pipeline</span>
            <span className="font-bold text-slate-900 text-xs truncate block">{formatCurrency(pipelineValue)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
