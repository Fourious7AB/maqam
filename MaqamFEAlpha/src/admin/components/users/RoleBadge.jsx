const map={
  super_admin:["Super Admin","bg-purple-50 text-purple-700"],
  admin:["Admin","bg-emerald-50 text-emerald-700"],
  sales_agent:["Sales Agent","bg-blue-50 text-blue-700"],
  finance:["Finance","bg-amber-50 text-amber-700"],
  hotelier:["Hotelier","bg-slate-100 text-slate-700"],
};
export default function RoleBadge({role}){const [label,cls]=map[role]||[role,"bg-slate-100 text-slate-600"];return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}>{label}</span>}
