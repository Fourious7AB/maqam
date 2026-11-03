import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useVisaStore } from '../visaStore';
import PageSearch from '../../../../components/common/PageSearch';

const gs = ['', 'processing', 'completed', 'partially_approved', 'rejected'];
const ps = ['', 'pending', 'paid', 'failed'];

export default function VisaGroups() {
  const navigate = useNavigate();
  const { groups, groupsMeta, fetchGroups, loading, error } = useVisaStore();
  const [groupStatus, setGroupStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchGroups({ groupStatus, paymentStatus, page, limit: 10 }).catch(() => {});
  }, [fetchGroups, groupStatus, paymentStatus, page]);

  // Client-side filter of the current page (API has no text-search param here).
  const needle = search.trim().toLowerCase();
  const visibleGroups = needle
    ? groups.filter((group) => [group._id, group.visaType, group.paymentStatus, group.groupStatus, String(group.totalApplicants ?? ''), String(group.totalAmount ?? '')]
        .some((field) => String(field ?? '').toLowerCase().includes(needle)))
    : groups;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">Visa Groups</p>
          <h1 className="mt-1 text-2xl font-black">Group Batches</h1>
        </div>
        <button onClick={() => fetchGroups({ groupStatus, paymentStatus, page, limit: 10 })} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_200px_200px]">
        <PageSearch value={search} onChange={setSearch} placeholder="Search groups by id, visa type, amount or status…" label="Search visa groups" />
        <select value={groupStatus} onChange={(event) => { setPage(1); setGroupStatus(event.target.value); }} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <option value="">All group status</option>
          {gs.slice(1).map((option) => <option key={option}>{option}</option>)}
        </select>
        <select value={paymentStatus} onChange={(event) => { setPage(1); setPaymentStatus(event.target.value); }} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <option value="">All payment status</option>
          {ps.slice(1).map((option) => <option key={option}>{option}</option>)}
        </select>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[850px] w-full">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-400">
              <tr><th className="p-4">Group</th><th className="p-4">Visa</th><th className="p-4">Applicants</th><th className="p-4">Amount</th><th className="p-4">Payment</th><th className="p-4">Status</th></tr>
            </thead>
            <tbody className="divide-y">
              {loading.groups ? (
                <tr><td colSpan="6" className="p-10 text-center text-sm text-slate-500">Loading live groups…</td></tr>
              ) : visibleGroups.length ? visibleGroups.map((group) => (
                <tr key={group._id} onClick={() => navigate(`/admin/visa/groups/${group._id}`)} className="cursor-pointer hover:bg-slate-50">
                  <td className="p-4 font-bold">{group._id}</td>
                  <td className="p-4">{group.visaType}</td>
                  <td className="p-4">{group.totalApplicants}</td>
                  <td className="p-4">₹{Number(group.totalAmount || 0).toLocaleString('en-IN')}</td>
                  <td className="p-4">{group.paymentStatus}</td>
                  <td className="p-4">{group.groupStatus}</td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="p-10 text-center text-sm text-slate-500">{needle ? `No groups on this page match “${search}”.` : 'No live groups returned.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-slate-500">Total {groupsMeta.total || 0}</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button>
          <button disabled={!groupsMeta.totalPages || page >= groupsMeta.totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
