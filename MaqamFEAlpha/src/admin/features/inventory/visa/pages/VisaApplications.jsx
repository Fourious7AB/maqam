import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Search } from 'lucide-react';
import { useVisaStore } from '../visaStore';
import { VISA_STATUSES, visaStatusBadgeClass, visaStatusLabel } from '../visaStatus';

const PAGE_SIZE = 10;

export default function VisaApplications() {
  const navigate = useNavigate();
  const { applications, applicationsMeta, fetchApplications, loading, error } = useVisaStore();
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Debounce search so typing does not spam the API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchApplications({ status, search, page, limit: PAGE_SIZE }).catch(() => {});
  }, [fetchApplications, status, search, page]);

  const meta = applicationsMeta || {};
  const from = meta.total ? (meta.page - 1) * (meta.limit || PAGE_SIZE) + 1 : 0;
  const to = Math.min((meta.page || 1) * (meta.limit || PAGE_SIZE), meta.total || 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">Visa Applications</p>
          <h1 className="mt-1 text-2xl font-black">Application Queue</h1>
          <p className="mt-1 text-sm text-slate-500">Filter by status, search by traveller name, email or passport.</p>
        </div>
        <button
          onClick={() => fetchApplications({ status, search, page, limit: PAGE_SIZE }).catch(() => {})}
          className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold"
        >
          <RefreshCw size={16} className={loading.applications ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Status filter buttons */}
      <div className="flex flex-wrap gap-2 rounded-2xl border bg-white p-4">
        <button
          onClick={() => { setPage(1); setStatus(''); }}
          className={`rounded-full px-4 py-2 text-xs font-bold transition ${
            status === '' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All
        </button>
        {VISA_STATUSES.map((item) => (
          <button
            key={item.value}
            onClick={() => { setPage(1); setStatus(item.value); }}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${
              status === item.value ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm"
            placeholder="Search by traveller name, email, or passport number…"
          />
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-4">Traveller</th>
                <th className="p-4">Passport</th>
                <th className="p-4">Nationality</th>
                <th className="p-4">Officer</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading.applications ? (
                <tr><td colSpan="6" className="p-10 text-center text-sm text-slate-500">Loading applications…</td></tr>
              ) : applications.length ? applications.map((item) => (
                <tr
                  key={item._id}
                  onClick={() => navigate(`/admin/visa/applications/${item._id}`)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="p-4 font-bold">
                    {item.travelerDetails?.firstName} {item.travelerDetails?.lastName}
                    <p className="text-xs font-normal text-slate-400">
                      {item.groupId?.destinationCountry || '—'} · {item.groupId?.visaType || '—'}
                    </p>
                  </td>
                  <td className="p-4 font-mono text-sm text-slate-600">{item.travelerDetails?.passportNumber || '—'}</td>
                  <td className="p-4 text-sm">{item.travelerDetails?.nationality || '—'}</td>
                  <td className="p-4 text-sm text-slate-600">
                    {item.assignedAgent
                      ? `${item.assignedAgent.firstName || ''} ${item.assignedAgent.lastName || ''}`.trim() || item.assignedAgent.email
                      : <span className="text-slate-400">Unassigned</span>}
                  </td>
                  <td className="p-4">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${visaStatusBadgeClass(item.status)}`}>
                      {visaStatusLabel(item.status)}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-500">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="p-10 text-center text-sm text-slate-500">No applications found for these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-slate-500">
          Showing {from}–{to} of {meta.total || 0} · Page {meta.page || page} of {meta.totalPages || 0}
        </span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button>
          <button disabled={!meta.totalPages || page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
