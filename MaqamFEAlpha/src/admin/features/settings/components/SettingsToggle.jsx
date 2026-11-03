export default function SettingsToggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  badge,
}) {
  return (
    <label
      className={`flex items-start justify-between gap-4 rounded-xl border p-4 transition select-none ${
        disabled
          ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-800/40'
          : checked
          ? 'cursor-pointer border-emerald-200 bg-emerald-50/30 hover:border-emerald-300 dark:border-emerald-800/50 dark:bg-emerald-950/20'
          : 'cursor-pointer border-slate-200 bg-slate-50/50 hover:border-slate-300 dark:border-slate-700/80 dark:bg-slate-800/30'
      }`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</span>
          {badge}
        </div>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      </div>

      <div className="relative inline-flex shrink-0 items-center">
        <input
          type="checkbox"
          checked={Boolean(checked)}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={`h-6 w-11 rounded-full transition-colors ${
            checked ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <div
            className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              checked ? 'translate-x-5.5' : 'translate-x-0.5'
            } mt-0.5`}
          />
        </div>
      </div>
    </label>
  );
}
