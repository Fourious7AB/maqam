import { Link, useLocation } from 'react-router-dom';

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean).slice(1);
  return <div className="mb-4 flex flex-wrap items-center gap-1 text-xs text-slate-400 dark:text-slate-500"><Link to="/admin/dashboard" className="hover:text-emerald-700 dark:hover:text-emerald-400">Admin</Link>{parts.map((part, i) => <span key={`${part}-${i}`} className="flex items-center gap-1"><span>/</span><span className="capitalize text-slate-500 dark:text-slate-400">{part.replaceAll('-', ' ')}</span></span>)}</div>;
}
