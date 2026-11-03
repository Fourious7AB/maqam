import { Search, X } from "lucide-react";

export default function LeadFilters({ filters, onChange, onReset, assignedUsers = [] }) {
  const update = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.5fr)_repeat(4,minmax(130px,1fr))_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            placeholder="Search leads..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"
          />
        </div>

        <select value={filters.status} onChange={(e) => update("status", e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <option value="all">All status</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="proposal">Proposal</option>
          <option value="negotiation">Negotiation</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>

        <select value={filters.priority} onChange={(e) => update("priority", e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <option value="all">All priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select value={filters.source} onChange={(e) => update("source", e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <option value="all">All source</option>
          <option value="Website">Website</option>
          <option value="Referral">Referral</option>
          <option value="WhatsApp">WhatsApp</option>
          <option value="Facebook">Facebook</option>
          <option value="Sales Agent">Sales Agent</option>
        </select>

        <select value={filters.assignedTo} onChange={(e) => update("assignedTo", e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <option value="all">All agents</option>
          {assignedUsers.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>

        <button onClick={onReset} title="Reset filters" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
