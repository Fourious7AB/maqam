export default function Input({ label, error, className='', ...props }) {
  return <label className="block space-y-1.5">
    {label && <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>}
    <input className={`w-full rounded-xl border bg-white px-3.5 py-2.75 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-emerald-950/40 ${error ? 'border-red-400 dark:border-red-500' : 'border-slate-200'} ${className}`} {...props} />
    {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
  </label>;
}
