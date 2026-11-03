import { Check, RotateCcw, Save, ShieldAlert } from 'lucide-react';
import Button from '../../../components/common/Button';
import { useAuthStore } from '../../../store/authStore';

export default function SettingsHeader({
  title,
  subtitle,
  isDirty = false,
  isSaving = false,
  onSave,
  onReset,
  saveLabel = 'Save Changes',
}) {
  const user = useAuthStore((state) => state.user);
  const userRole = String(user?.role || '').toLowerCase().trim();
  const canEdit = !userRole || ['admin', 'super_admin', 'superadmin', 'administrator', 'manager', 'owner', 'staff'].includes(userRole);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4 dark:border-slate-800">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            {title}
          </h2>
          {isDirty && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Unsaved changes
            </span>
          )}
          {!canEdit && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <ShieldAlert size={12} />
              Read-only mode
            </span>
          )}
        </div>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2.5 self-start sm:self-auto">
        {onReset && (
          <Button
            type="button"
            variant="secondary"
            onClick={onReset}
            disabled={!isDirty || isSaving || !canEdit}
            className="text-xs sm:text-sm"
          >
            <RotateCcw size={15} />
            Discard
          </Button>
        )}

        {onSave && (
          <Button
            type="button"
            variant="primary"
            onClick={onSave}
            loading={isSaving}
            disabled={!isDirty || isSaving || !canEdit}
            className="text-xs sm:text-sm shadow-sm"
          >
            <Save size={15} />
            {saveLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
