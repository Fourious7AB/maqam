import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, CheckCircle2, Clock3, FileText, IndianRupee, Users, XCircle } from 'lucide-react';
import { useVisaStore } from '../visaStore';

const cards = [
  ['totalApplications','Applications'], ['totalGroups','Groups'], ['submitted','Submitted'], ['assigned','Assigned'],
  ['inReview','In Review'], ['approved','Approved'], ['rejected','Rejected'], ['unassigned','Unassigned'],
];

export default function VisaDashboard() {
  const { dashboard, fetchDashboard, loading, error } = useVisaStore();
  useEffect(() => { fetchDashboard().catch(() => {}); }, [fetchDashboard]);
  // Keep metrics live: poll the dashboard endpoint every 30s, even in background.
  useEffect(() => {
    const timer = setInterval(() => { fetchDashboard().catch(() => {}); }, 30_000);
    return () => clearInterval(timer);
  }, [fetchDashboard]);
  const data = dashboard || {};
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">Visa Administration</p><h1 className="mt-1 text-2xl font-black text-slate-900">Visa Operations Dashboard</h1><p className="mt-1 text-sm text-slate-500">Live metrics from the Visa Admin API {loading.dashboard && dashboard ? '· refreshing…' : '· auto-refreshes every 30s'}.</p></div><div className="flex gap-2"><Link to="/admin/inventory/visa" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">Visa Catalogue</Link><Link to="/admin/visa/applications" className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white">Applications</Link></div></div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {loading.dashboard && !dashboard ? <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">Loading live visa metrics…</div> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([key,label]) => <div key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">{label}</span><Activity size={19} className="text-emerald-700"/></div><div className="mt-4 text-3xl font-black text-slate-900">{Number(data[key] || 0).toLocaleString('en-IN')}</div></div>)}</div>
      <div className="grid gap-4 lg:grid-cols-3"><div className="rounded-2xl bg-emerald-900 p-6 text-white"><p className="text-sm text-emerald-200">Total Revenue</p><div className="mt-2 flex items-center gap-1 text-3xl font-black"><IndianRupee size={25}/>{Number(data.totalRevenue || 0).toLocaleString('en-IN')}</div><p className="mt-4 text-sm text-emerald-200">Active visa types: {data.activeVisaTypes ?? 0}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-6"><p className="text-sm font-bold text-slate-500">Groups Processing</p><div className="mt-2 text-3xl font-black">{data.groupsProcessing || 0}</div><div className="mt-4 text-xs text-slate-500">Completed {data.groupsCompleted || 0} · Partial {data.groupsPartiallyApproved || 0} · Rejected {data.groupsRejected || 0}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-6"><p className="text-sm font-bold text-slate-500">Recent Applications</p><div className="mt-2 text-3xl font-black">{data.recentApplications?.length || 0}</div><p className="mt-4 text-xs text-slate-500">Open Applications to inspect live traveller, payment and officer data.</p></div></div>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-extrabold">Recent applications</h2></div>{data.recentApplications?.length ? <div className="divide-y divide-slate-100">{data.recentApplications.map((item)=><Link key={item._id} to={`/admin/visa/applications/${item._id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50"><div><p className="font-bold">{item.travelerDetails?.firstName} {item.travelerDetails?.lastName}</p><p className="text-xs text-slate-500">{item._id} · {item.status}</p></div><span className="text-xs font-bold text-emerald-700">View</span></Link>)}</div> : <div className="p-8 text-center text-sm text-slate-500">No recent applications returned by the backend.</div>}</div>
    </>}
  </div>;
}
