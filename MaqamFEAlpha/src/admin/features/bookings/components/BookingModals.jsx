// Operational modals for the bookings desk: assign agent, cancel booking,
// edit booking, add remark. Each one calls the real endpoint for its booking
// type and refreshes only the bookings queries afterwards.
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { UserPlus, Trash2, Save, MessageSquareText } from 'lucide-react';

import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import { bookingsApi } from '../bookingsApi';
import { invalidateBookingData } from '../bookingQueryKeys';
import { formatAmount, formatDateRange, isObjectId } from '../bookingNormalizers';
import { InlineError } from './BookingStates';

const fieldClass = 'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500';

const SummaryRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
    <span className="text-right text-sm font-semibold text-slate-800">{value || '—'}</span>
  </div>
);

// ---------------------------------------------------------------------------
// Assign agent — POST for packages is wrong; the real route is
// PATCH /crm/packages/bookings/:id/assign (and PATCH for the master desk).
// ---------------------------------------------------------------------------
export function AssignAgentModal({ open, onClose, booking, agents = [] }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState('');
  const [manualId, setManualId] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setSelected(booking?.assignedTo?.id || '');
    setManualId('');
    setError(null);
  }, [open, booking?.assignedTo?.id]);

  const mutation = useMutation({
    mutationFn: (assignedTo) => (booking.bookingType === 'package'
      ? bookingsApi.assignPackageBooking(booking.id, assignedTo)
      : bookingsApi.assignAgent(booking.bookingType, booking.id, assignedTo)),
    onSuccess: () => {
      invalidateBookingData(queryClient);
      toast.success('Agent assigned successfully');
      onClose();
    },
    onError: (mutationError) => setError(mutationError),
  });

  const targetId = manualId.trim() || selected;

  const submit = () => {
    if (!isObjectId(targetId)) {
      setError(new Error('Select an agent, or paste a valid 24-character user id.'));
      return;
    }
    setError(null);
    mutation.mutate(targetId);
  };

  if (!booking) return null;

  return (
    <Modal open={open} title="Assign Operations Agent" onClose={onClose} size="md">
      <div className="space-y-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <SummaryRow label="Booking" value={booking.bookingNumber} />
          <SummaryRow label="Customer" value={booking.customerName} />
          <SummaryRow label="Currently assigned" value={booking.assignedTo?.name || 'Unassigned'} />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Operations staff</label>
          <select value={selected} onChange={(event) => { setSelected(event.target.value); setManualId(''); }} className={fieldClass}>
            <option value="">Select an agent…</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}{agent.email ? ` · ${agent.email}` : ''}{agent.role ? ` (${agent.role})` : ''}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">
            The list is built from real CRM staff seen on bookings and leads (the backend user-list route currently returns 500).
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Or paste a user id</label>
          <input
            value={manualId}
            onChange={(event) => { setManualId(event.target.value); setSelected(''); }}
            placeholder="e.g. 66ce08f0e944f7b6b199e810"
            className={fieldClass}
          />
        </div>

        <InlineError error={error} />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={submit} loading={mutation.isPending} disabled={!targetId}>
            <UserPlus size={16} /> Assign Agent
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Cancel booking. In-house packages must go through the package module's
// dedicated cancellation route (it releases claimed stock); offers have their
// own route; everything else uses the master status override.
// ---------------------------------------------------------------------------
export function CancelBookingModal({ open, onClose, booking }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setReason('');
    setError(null);
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => {
      if (booking.bookingType === 'package') return bookingsApi.cancelPackageBooking(booking.id, reason.trim());
      if (booking.bookingType === 'offer') return bookingsApi.cancelOfferBooking(booking.id, reason.trim());
      return bookingsApi.updateStatus(booking.bookingType, booking.id, {
        status: 'cancelled',
        internalRemark: reason.trim() || 'Cancelled from the CRM operations desk',
      });
    },
    onSuccess: () => {
      invalidateBookingData(queryClient);
      toast.success('Booking cancelled and claimed stock released');
      onClose();
    },
    onError: (mutationError) => setError(mutationError),
  });

  if (!booking) return null;

  const isPackage = booking.bookingType === 'package';

  return (
    <Modal open={open} title="Cancel Booking" onClose={onClose} size="md">
      <div className="space-y-4">
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
          <SummaryRow label="Reference" value={booking.bookingNumber} />
          <SummaryRow label="Customer" value={booking.customerName} />
          <SummaryRow label="Package" value={booking.packageName} />
          <SummaryRow label="Destination" value={booking.destination} />
          <SummaryRow label="Amount" value={formatAmount(booking.totalAmount, booking.currency)} />
        </div>

        <p className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          {isPackage
            ? 'Cancelling an in-house package immediately releases all claimed hotel rooms and flight seats back to wholesale stock.'
            : 'This booking is not an in-house package, so the cancellation is applied through the master CRM status override.'}
        </p>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cancellation reason</label>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Customer medical emergency"
            className="h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <InlineError error={error} />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>Keep booking</Button>
          <Button variant="danger" onClick={() => mutation.mutate()} loading={mutation.isPending}>
            <Trash2 size={16} /> Confirm cancellation
          </Button>
        </div>
      </div>
    </Modal>
  );
}



// ---------------------------------------------------------------------------
// Edit booking — PATCH /crm/packages/bookings/:id accepts travel dates,
// contact details and a remark. Structural changes are rejected by the backend
// (and other booking types have no update route at all).
// ---------------------------------------------------------------------------
export function EditBookingModal({ open, onClose, booking }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ startDate: '', endDate: '', email: '', phone: '', emergencyContact: '', remark: '' });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !booking) return;
    setForm({
      startDate: booking.travelDates?.startDate ? String(booking.travelDates.startDate).slice(0, 10) : '',
      endDate: booking.travelDates?.endDate ? String(booking.travelDates.endDate).slice(0, 10) : '',
      email: booking.contactDetails?.email || booking.customerEmail || '',
      phone: booking.contactDetails?.phone || booking.customerPhone || '',
      emergencyContact: booking.contactDetails?.emergencyContact || '',
      remark: '',
    });
    setError(null);
  }, [open, booking]);

  const mutation = useMutation({
    mutationFn: (payload) => bookingsApi.updatePackageBooking(booking.id, payload),
    onSuccess: () => {
      invalidateBookingData(queryClient);
      toast.success('Booking updated successfully');
      onClose();
    },
    onError: (mutationError) => setError(mutationError),
  });

  if (!booking) return null;

  const isPackage = booking.bookingType === 'package';

  const submit = () => {
    const payload = {};
    if (form.startDate || form.endDate) {
      payload.travelDates = {
        ...(form.startDate ? { startDate: new Date(`${form.startDate}T00:00:00.000Z`).toISOString() } : {}),
        ...(form.endDate ? { endDate: new Date(`${form.endDate}T00:00:00.000Z`).toISOString() } : {}),
      };
    }
    payload.contactDetails = {
      email: form.email.trim(),
      phone: form.phone.trim(),
      emergencyContact: form.emergencyContact.trim(),
    };
    if (form.remark.trim()) payload.remark = form.remark.trim();
    setError(null);
    mutation.mutate(payload);
  };

  return (
    <Modal open={open} title="Edit Booking" onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <SummaryRow label="Reference" value={booking.bookingNumber} />
          <SummaryRow label="Customer" value={booking.customerName} />
          <SummaryRow label="Current travel dates" value={formatDateRange(booking.travelDates)} />
        </div>

        {!isPackage ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
            Travel-date and contact edits are served by the in-house package module
            (PATCH /crm/packages/bookings/:id). This is a {booking.bookingType} booking, so only status,
            remarks and assignment are editable here.
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Travel start date</label>
                <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className={fieldClass} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Travel end date</label>
                <input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} className={fieldClass} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact email</label>
                <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={fieldClass} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact phone</label>
                <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={fieldClass} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Emergency contact</label>
                <input value={form.emergencyContact} onChange={(event) => setForm({ ...form, emergencyContact: event.target.value })} className={fieldClass} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Change note (optional, appended to the timeline)</label>
              <textarea
                value={form.remark}
                onChange={(event) => setForm({ ...form, remark: event.target.value })}
                className="h-20 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </>
        )}

        <InlineError error={error} />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={submit} loading={mutation.isPending} disabled={!isPackage}>
            <Save size={16} /> Save changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Timeline remark — packages use PATCH /crm/packages/bookings/:id/remark,
// every other type uses POST /crm/bookings/:bookingType/:id/remarks.
// ---------------------------------------------------------------------------
export function RemarkModal({ open, onClose, booking }) {
  const queryClient = useQueryClient();
  const [remark, setRemark] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setRemark('');
    setError(null);
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => (booking.bookingType === 'package'
      ? bookingsApi.addPackageRemark(booking.id, remark.trim())
      : bookingsApi.addRemark(booking.bookingType, booking.id, remark.trim())),
    onSuccess: () => {
      invalidateBookingData(queryClient);
      toast.success('Remark added to the timeline');
      onClose();
    },
    onError: (mutationError) => setError(mutationError),
  });

  if (!booking) return null;

  return (
    <Modal open={open} title="Add Operational Remark" onClose={onClose} size="md">
      <div className="space-y-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <SummaryRow label="Booking" value={booking.bookingNumber} />
          <SummaryRow label="Customer" value={booking.customerName} />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Remark</label>
          <textarea
            value={remark}
            onChange={(event) => setRemark(event.target.value)}
            placeholder="Log a customer request, supplier delay note or internal action…"
            className="h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <InlineError error={error} />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!remark.trim()}>
            <MessageSquareText size={16} /> Add remark
          </Button>
        </div>
      </div>
    </Modal>
  );
}
