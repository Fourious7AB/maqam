import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-emerald-700 text-white hover:bg-emerald-800 focus:ring-emerald-300 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:focus:ring-emerald-500/40',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800 dark:focus:ring-slate-700',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-200 dark:focus:ring-red-500/40',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-200 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:ring-slate-700'
};

export default function Button({ children, variant='primary', loading=false, className='', ...props }) {
  return <button disabled={loading || props.disabled} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`} {...props}>
    {loading && <Loader2 size={16} className="animate-spin" />}
    {children}
  </button>;
}
