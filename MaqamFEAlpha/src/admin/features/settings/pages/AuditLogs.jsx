import { useEffect, useState } from 'react';
import { RefreshCw, Search, ShieldAlert, History, Filter } from 'lucide-react';
import Button from '../../../components/common/Button';
import InventoryTable from '../../../components/inventory/InventoryTable';
import StatusBadge from '../../../components/common/StatusBadge';
import { auditApi } from '../auditApi';

export default function AuditLogs() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const res = await auditApi.list({ search, severity });
      setRows(res?.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [search, severity]);

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            System Audit Logs
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Immutable tracking record of administrative changes, price updates, and access events.
          </p>
        </div>

        <Button variant="secondary" onClick={load} loading={loading} className="self-start sm:self-auto">
          <RefreshCw size={15} />
          Refresh Log
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <div className="relative">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, actor, entity ID, or description..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-950/40"
          />
        </div>

        <div className="relative">
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-950/40"
          >
            <option value="all">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm font-medium text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-emerald-600 dark:text-emerald-400" />
          Loading audit entries…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <History size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          No audit records found matching your filters.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <InventoryTable
            rows={rows}
            columns={[
              {
                key: 'timestamp',
                label: 'Timestamp',
                render: (r) => (
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                    {r.timestamp}
                  </span>
                ),
              },
              {
                key: 'actor',
                label: 'Actor / User',
                render: (r) => (
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      {r.actor}
                    </span>
                    <p className="text-[11px] text-slate-400 capitalize">{r.actorRole}</p>
                  </div>
                ),
              },
              {
                key: 'action',
                label: 'Action Code',
                render: (r) => (
                  <code className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                    {r.action}
                  </code>
                ),
              },
              {
                key: 'entity',
                label: 'Entity Target',
                render: (r) => (
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                    {r.entity}
                  </span>
                ),
              },
              {
                key: 'description',
                label: 'Description',
                render: (r) => (
                  <span className="text-xs text-slate-600 dark:text-slate-400">{r.description}</span>
                ),
              },
              {
                key: 'severity',
                label: 'Severity',
                render: (r) => (
                  <StatusBadge
                    status={r.severity}
                    variant={
                      r.severity === 'critical'
                        ? 'danger'
                        : r.severity === 'warning'
                        ? 'warning'
                        : 'info'
                    }
                  />
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
