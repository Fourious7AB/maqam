import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft, FileCheck2, UserRound } from 'lucide-react';
import { useVisaStore } from '../visaStore';
import { VISA_STATUSES, visaStatusBadgeClass, visaStatusLabel } from '../visaStatus';
import { getDocumentUrl } from '../../../../../utils/documentUrl';

export default function VisaApplicationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { application, caseOfficers, fetchApplication, fetchCaseOfficers, assignApplication, updateApplicationStatus, loading, error } = useVisaStore();
  const [officerId, setOfficerId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState('');
  const [syncedId, setSyncedId] = useState(null);

  useEffect(() => {
    fetchApplication(id).catch(() => {});
    fetchCaseOfficers().catch(() => {});
  }, [fetchApplication, fetchCaseOfficers, id]);

  // Sync local form state when a different application is loaded (render-time sync).
  if (application && application._id !== syncedId) {
    setSyncedId(application._id);
    setOfficerId(application.assignedAgent?._id || '');
    setStatus(application.status || '');
    setRemarks(application.adminNotes || '');
  }

  if (loading.application && !application) return <div className="p-10 text-center">Loading application…</div>;
  if (!application) return <div className="rounded-2xl bg-white p-10 text-center">{error || 'Application not found.'}</div>;

  const traveler = application.travelerDetails || {};
  const docs = application.documents || {};
  const group = application.groupId || {};

  const submitAssign = async () => {
    if (!officerId) return;
    try {
      await assignApplication(id, { caseOfficerId: officerId, adminRemarks: remarks });
      toast.success('Case officer assigned successfully');
      fetchApplication(id).catch(() => {});
    } catch (mutationError) {
      toast.error(mutationError?.response?.data?.message || 'Failed to assign case officer');
    }
  };

  const submitStatus = async () => {
    try {
      await updateApplicationStatus(id, { status, adminRemarks: remarks });
      toast.success(`Status updated to ${visaStatusLabel(status)}`);
      fetchApplication(id).catch(() => {});
    } catch (mutationError) {
      toast.error(mutationError?.response?.data?.message || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
        <ArrowLeft size={16} />Back
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">Visa Application</p>
          <h1 className="mt-1 text-2xl font-black">{traveler.firstName} {traveler.lastName}</h1>
          <p className="text-sm text-slate-500">{application._id}</p>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${visaStatusBadgeClass(application.status)}`}>
          {visaStatusLabel(application.status)}
        </span>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="flex items-center gap-2 font-extrabold"><UserRound size={18} className="text-emerald-700" />Traveller</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info l="First name" v={traveler.firstName} />
              <Info l="Last name" v={traveler.lastName} />
              <Info l="Passport" v={traveler.passportNumber} />
              <Info l="Date of birth" v={traveler.dateOfBirth ? new Date(traveler.dateOfBirth).toLocaleDateString() : '—'} />
              <Info l="Nationality" v={traveler.nationality} />
              <Info l="Gender" v={traveler.gender} />
            </div>
          </section>
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="flex items-center gap-2 font-extrabold"><FileCheck2 size={18} className="text-emerald-700" />Documents</h2>
            <div className="mt-4 space-y-3">
              <Doc label="Passport scan" url={docs.passportScan} />
              <Doc label="Photo" url={docs.photo} />
              {(docs.additionalDocs || []).map((doc, index) => (
                <Doc key={index} label={`Additional document ${index + 1}`} url={typeof doc === 'string' ? doc : doc?.url} />
              ))}
            </div>
          </section>
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="font-extrabold">Group & applicant source</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info l="Group ID" v={group._id} />
              <Info l="Visa type" v={group.visaType} />
              <Info l="Destination" v={group.destinationCountry} />
              <Info l="Payment status" v={group.paymentStatus} />
              <Info l="Submitted by" v={application.submittedBy?.email || (application.submittedBy?.firstName ? `${application.submittedBy.firstName} ${application.submittedBy.lastName || ''}` : '—')} />
              <Info l="Assigned agent" v={application.assignedAgent ? (application.assignedAgent.email || `${application.assignedAgent.firstName || ''} ${application.assignedAgent.lastName || ''}`) : 'Unassigned'} />
            </div>
          </section>
        </div>
        <aside className="space-y-5">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-extrabold">Assign case officer</h2>
            <select value={officerId} onChange={(event) => setOfficerId(event.target.value)} className="mt-4 w-full rounded-xl border px-3 py-2.5 text-sm">
              <option value="">Select case officer</option>
              {caseOfficers.map((officer) => (
                <option key={officer._id} value={officer._id}>{officer.firstName} {officer.lastName} · {officer.role}</option>
              ))}
            </select>
            <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} className="mt-3 min-h-24 w-full rounded-xl border px-3 py-2.5 text-sm" placeholder="Admin remarks" />
            <button disabled={!officerId || loading.applicationMutation} onClick={submitAssign} className="mt-3 w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {loading.applicationMutation ? 'Saving…' : 'Assign officer'}
            </button>
          </section>
          <section className="rounded-2xl bg-slate-900 p-5 text-white">
            <h2 className="font-extrabold">Update status</h2>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-4 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm">
              <option className="text-slate-900" value="">Select status</option>
              {VISA_STATUSES.map((item) => (
                <option className="text-slate-900" key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <button disabled={!status || loading.applicationMutation} onClick={submitStatus} className="mt-3 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 disabled:opacity-50">
              {loading.applicationMutation ? 'Updating…' : 'Update status'}
            </button>
            <p className="mt-3 text-xs text-slate-300">Current: {visaStatusLabel(application.status)}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Info({ l, v }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{l}</p>
      <p className="mt-1 break-all text-sm font-bold text-slate-800">{v || '—'}</p>
    </div>
  );
}

function Doc({ label, url }) {
  const documentUrl = getDocumentUrl(url);

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
      <span className="text-sm font-semibold">{label}</span>
      {documentUrl ? (
        <a href={documentUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">Open</a>
      ) : (
        <span className="text-xs text-slate-400">Unavailable</span>
      )}
    </div>
  );
}
