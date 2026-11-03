import { Search } from 'lucide-react';

// Shared list-page search input. Presentational only — pages own the state
// (and any debouncing for API-driven queries). Matches the icon-input pattern
// already used on Bookings/Customers/Users/AuditLogs.
export default function PageSearch({ value, onChange, placeholder = 'Search…', label = 'Search' }) {
  return (
    <div className="relative">
      <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-850 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-emerald-950/40"
      />
    </div>
  );
}
