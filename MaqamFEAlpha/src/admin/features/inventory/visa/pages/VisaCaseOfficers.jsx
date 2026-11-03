import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Plus, ShieldCheck, UserPlus } from 'lucide-react';
import { useVisaStore } from '../visaStore';
import PageSearch from '../../../../components/common/PageSearch';

const ROLES = ['sales_agent', 'support_agent', 'admin', 'super_admin'];

const roleBadge = {
  sales_agent: 'bg-sky-50 text-sky-700',
  support_agent: 'bg-indigo-50 text-indigo-700',
  admin: 'bg-emerald-50 text-emerald-700',
  super_admin: 'bg-amber-50 text-amber-700',
};

const emptyForm = { firstName: '', lastName: '', phone: '', email: '', password: '', role: 'sales_agent' };

export default function VisaCaseOfficers() {
  const { caseOfficers, fetchCaseOfficers, createCaseOfficer, loading, error } = useVisaStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchCaseOfficers().catch(() => {}); }, [fetchCaseOfficers]);

  const needle = search.trim().toLowerCase();
  const visibleOfficers = needle
    ? caseOfficers.filter((officer) => [officer.firstName, officer.lastName, officer.email, officer.phone, officer.role]
        .some((field) => String(field ?? '').toLowerCase().includes(needle)))
    : caseOfficers;

  const save = async (event) => {
    event.preventDefault();
    try {
      await createCaseOfficer(form);
      toast.success(`Staff account created for ${form.firstName} (${form.role})`);
      setForm(emptyForm);
      setOpen(false);
    } catch (createError) {
      toast.error(createError?.response?.data?.message || 'Failed to create staff user');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">Visa Staff</p>
          <h1 className="mt-1 text-2xl font-black">Case Officers</h1>
          <p className="text-sm text-slate-500">Create staff users and assign them visa cases from the application queue.</p>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white">
          <Plus size={16} />Create staff
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <PageSearch value={search} onChange={setSearch} placeholder="Search officers by name, email, phone or role…" label="Search case officers" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading.caseOfficers && !caseOfficers.length ? (
          <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">Loading staff…</div>
        ) : visibleOfficers.length ? visibleOfficers.map((officer) => (
          <div key={officer._id} className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              {officer.avatar ? (
                <img src={officer.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-700"><UserPlus size={20} /></div>
              )}
              <div>
                <p className="font-extrabold">{officer.firstName} {officer.lastName}</p>
                <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${roleBadge[officer.role] || 'bg-slate-100 text-slate-600'}`}>
                  {officer.role}
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-1 text-sm text-slate-600">
              <p className="break-all">{officer.email}</p>
              <p>{officer.phone || '—'}</p>
            </div>
          </div>
        )) : (
          <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">
            {needle ? `No officers match “${search}”.` : 'No staff users yet. Create the first case officer to start assigning visa cases.'}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <form onSubmit={save} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-extrabold"><ShieldCheck size={18} className="text-emerald-700" />Create staff user</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-xl leading-none text-slate-400">×</button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">First name
                <input required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" />
              </label>
              <label className="text-sm font-semibold">Last name
                <input required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" />
              </label>
              <label className="text-sm font-semibold">Phone
                <input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" />
              </label>
              <label className="text-sm font-semibold">Email
                <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" />
              </label>
              <label className="text-sm font-semibold">Password
                <input required type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" />
              </label>
              <label className="text-sm font-semibold">Role
                <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm">
                  {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              </label>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              The staff user is created with the selected role and can then be assigned visa applications as a case officer.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border px-4 py-2.5 text-sm font-bold">Cancel</button>
              <button disabled={loading.caseOfficerMutation} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {loading.caseOfficerMutation ? 'Creating…' : 'Create staff'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
