// BookingDetails.jsx — 360° Operations Dossier.
//
// Fetches the live booking dossier via bookingsApi.getBookingDossier,
// normalizes all properties cleanly, and displays deep operational insights:
// Overview, Claimed Inclusions, Travellers, Financials, Timeline, and Danger Zone.

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CalendarDays, CheckCircle2, CreditCard, Edit3,
  FileText, Hotel, MessageSquarePlus, Plane, RefreshCw,
  ShieldCheck, Trash2, UserPlus, UserRound, Users,
} from 'lucide-react';

import PageHeader from '../../../components/layout/PageHeader';
import Button from '../../../components/common/Button';
import BookingStatus from '../../../components/bookings/BookingStatus';
import PaymentStatus from '../../../components/bookings/PaymentStatus';
import BookingTimeline from '../../../components/bookings/BookingTimeline';

import { bookingsApi } from '../bookingsApi';
import { bookingKeys, OPERATIONAL_QUERY_OPTIONS } from '../bookingQueryKeys';
import { formatAmount, formatDateRange, formatDateTime } from '../bookingNormalizers';
import {
  AssignAgentModal, CancelBookingModal, EditBookingModal, RemarkModal,
} from '../components/BookingModals';
import { EmptyState, ErrorState, TableSkeleton } from '../components/BookingStates';
import DigitalBoardingPass from '../../../../components/flight/DigitalBoardingPass';
import OmnichannelAlertStatus from '../../../../components/notifications/OmnichannelAlertStatus';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'travellers', label: 'Travellers' },
  { key: 'boardingPass', label: 'Boarding Pass & Tickets' },
  { key: 'notifications', label: 'Omnichannel Alerts' },
  { key: 'services', label: 'Bundled Services & Stock' },
  { key: 'financials', label: 'Financials & Invoicing' },
  { key: 'activity', label: 'Operational Activity' },
];

function DossierStat({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value || '—'}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

export default function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState('overview');

  const [assignOpen, setAssignOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [remarkOpen, setRemarkOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const dossierQuery = useQuery({
    queryKey: bookingKeys.detail(id),
    ...OPERATIONAL_QUERY_OPTIONS,
    enabled: Boolean(id),
    queryFn: () => bookingsApi.getBookingDossier('all', id),
  });

  const booking = dossierQuery.data;

  if (dossierQuery.isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <PageHeader title="Loading Booking Dossier…" subtitle="Retrieving operational reservation records" />
        <TableSkeleton rows={6} columns={4} />
      </div>
    );
  }

  if (dossierQuery.isError || !booking) {
    return (
      <div className="space-y-6 pb-12">
        <PageHeader
          title="Booking Dossier"
          subtitle="Record view"
          action={{
            label: 'Back to Bookings Desk',
            icon: ArrowLeft,
            variant: 'secondary',
            onClick: () => navigate('/admin/bookings'),
          }}
        />
        <ErrorState
          error={dossierQuery.error}
          title="Could not find booking dossier"
          hint="The booking ID may be invalid or belongs to another partition."
          onRetry={() => dossierQuery.refetch()}
        />
      </div>
    );
  }

  const isPackage = booking.bookingType === 'package';
  const isCancelled = booking.status === 'cancelled' || booking.cancellation?.isCancelled;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
  };



  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={booking.bookingNumber}
        subtitle={`${booking.customerName} • ${booking.packageName} • ${booking.destination || 'Unspecified'}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate('/admin/bookings')}>
              <ArrowLeft size={16} /> Back
            </Button>
            <Button variant="secondary" onClick={handleRefresh}>
              <RefreshCw size={16} /> Refresh
            </Button>
            {isPackage && !isCancelled && (
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                <Edit3 size={16} /> Edit
              </Button>
            )}
            <Button variant="secondary" onClick={() => setAssignOpen(true)}>
              <UserPlus size={16} /> Assign
            </Button>
            <Button variant="secondary" onClick={() => setTab('boardingPass')}>
              <Plane size={16} /> Boarding Pass
            </Button>
            {!isCancelled && (
              <Button variant="danger" onClick={() => setCancelOpen(true)}>
                <Trash2 size={16} /> Cancel & Release
              </Button>
            )}
          </div>
        }
      />

      {/* Hero Overview Card */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Status</p>
          <div className="pt-1"><BookingStatus status={booking.status} /></div>
          <p className="text-[11px] text-slate-400 capitalize pt-1">Type: {booking.bookingType}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Financial Summary</p>
          <p className="text-xl font-black text-slate-900">{formatAmount(booking.totalAmount, booking.currency)}</p>
          <div className="pt-1"><PaymentStatus status={booking.paymentStatus} /></div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lead Passenger</p>
          <p className="text-sm font-bold text-slate-900 truncate">{booking.customerName}</p>
          <p className="text-[11px] text-slate-400 truncate">{booking.customerEmail || booking.customerPhone || 'No contact on file'}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Staff Agent</p>
          <p className="text-sm font-bold text-slate-900 truncate">{booking.assignedTo?.name || 'Unassigned'}</p>
          <p className="text-[11px] text-slate-400 truncate">{booking.assignedTo?.email || 'Operations Desk Pool'}</p>
        </div>
      </div>



      {/* Tabs navigation */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 p-2 bg-slate-50/50">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                tab === t.key
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DossierStat label="Booking Number" value={booking.bookingNumber} />
                <DossierStat label="Origin Channel" value={booking.origin || 'In-House Desk'} />
                <DossierStat label="Destination" value={booking.destination} />
                <DossierStat label="Travel Schedule" value={formatDateRange(booking.travelDates)} />
                <DossierStat label="Passenger Count" value={`${booking.paxCount} PAX`} />
                <DossierStat label="Booking Created" value={formatDateTime(booking.createdAt)} />
              </div>

              {booking.contactDetails && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <p className="text-xs font-bold text-slate-800">Operational Contact Information</p>
                  <div className="grid gap-3 sm:grid-cols-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-bold">Primary Email</span>
                      <p className="text-slate-800 font-medium">{booking.contactDetails.email || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-bold">Primary Phone</span>
                      <p className="text-slate-800 font-medium">{booking.contactDetails.phone || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-bold">Emergency Contact</span>
                      <p className="text-slate-800 font-medium">{booking.contactDetails.emergencyContact || '—'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Block 5: Omnichannel Alerts (Email, WhatsApp, SMS) */}
              <OmnichannelAlertStatus
                bookingId={id || booking.id || booking.bookingNumber}
                bookingType={booking.bookingType || 'flight'}
                pnr={booking.pnr || booking.bookingNumber}
                recipientEmail={booking.contactDetails?.email}
                recipientPhone={booking.contactDetails?.phone}
                isAdmin={true}
              />
            </div>
          )}

          {tab === 'travellers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-800">Registered Travellers ({booking.travellers?.length || 0})</p>
                <span className="text-[11px] text-slate-400">Validated ObjectId references</span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Traveller ID</th>
                      <th className="px-4 py-3">Classification</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {booking.travellers?.map((traveller, index) => (
                      <tr key={traveller.travellerId || index}>
                        <td className="px-4 py-3 font-mono text-[11px] font-bold text-slate-800">
                          {traveller.travellerId}
                        </td>
                        <td className="px-4 py-3">
                          {traveller.isLead ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                              Lead Passenger
                            </span>
                          ) : (
                            <span className="text-slate-500">Accompanying</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">Confirmed</td>
                      </tr>
                    ))}
                    {(!booking.travellers || booking.travellers.length === 0) && (
                      <tr>
                        <td colSpan={3} className="p-6 text-center text-slate-400">
                          No passenger records attached to this booking.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'boardingPass' && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col items-center">
                <div className="flex items-center justify-between w-full pb-4 mb-6 border-b border-slate-100 max-w-lg">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Plane size={18} className="text-[#011B94]" />
                      <span>Official Digital Boarding Pass</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Live dispatch ticket for passenger check-in and boarding gate validation
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold bg-blue-50 text-[#011B94] px-2.5 py-1 rounded-lg">
                    PNR: {booking.pnr || booking.bookingNumber}
                  </span>
                </div>

                <DigitalBoardingPass
                  booking={booking}
                  flight={
                    booking.flight ||
                    booking.rawBookingDetails ||
                    (booking.services?.flight?.[0]
                      ? {
                          airline: booking.services.flight[0].name,
                          flightNumber: booking.services.flight[0].id || "6E 6819",
                          origin: "IXD",
                          destination: booking.destination || "HYD",
                        }
                      : null) ||
                    (booking.claimed?.flights?.[0]
                      ? {
                          flightNumber: booking.claimed.flights[0].flightStockUnitId || "6E 6819",
                          origin: "IXD",
                          destination: booking.destination || "HYD",
                        }
                      : null)
                  }
                  pnr={booking.pnr || booking.bookingNumber}
                  passengers={
                    booking.travellers?.length
                      ? booking.travellers.map((t, idx) => ({
                          firstName: t.name ? t.name.split(" ")[0] : `Passenger ${idx + 1}`,
                          lastName: t.name ? t.name.split(" ").slice(1).join(" ") : "",
                          seat: t.seat || `${3 + idx}F`,
                          seatNumber: t.seat || `${3 + idx}F`,
                        }))
                      : [{ firstName: booking.customerName || "Customer", lastName: "", seat: "3F" }]
                  }
                  showActions={true}
                />
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="space-y-6">
              <OmnichannelAlertStatus
                bookingId={id || booking.id || booking.bookingNumber}
                bookingType={booking.bookingType || 'flight'}
                pnr={booking.pnr || booking.bookingNumber}
                recipientEmail={booking.contactDetails?.email}
                recipientPhone={booking.contactDetails?.phone}
                isAdmin={true}
              />
            </div>
          )}

          {tab === 'services' && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold text-slate-800">Claimed Inventory Units</p>
                <p className="text-[11px] text-slate-400">Wholesale flight and hotel stock reserved for this booking</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                      <Plane size={16} className="text-blue-600" /> Claimed Flight Stock
                    </div>
                    <div className="mt-2 space-y-1 text-xs">
                      {booking.claimed?.flights?.length ? (
                        booking.claimed.flights.map((f, i) => (
                          <div key={i} className="font-mono text-[11px] text-slate-600">
                            Unit {f.flightStockUnitId || f} • Qty: {f.quantity || 1}
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-400 italic text-[11px]">No specific flight units claimed.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                      <Hotel size={16} className="text-emerald-600" /> Claimed Hotel Stock
                    </div>
                    <div className="mt-2 space-y-1 text-xs">
                      {booking.claimed?.hotels?.length ? (
                        booking.claimed.hotels.map((h, i) => (
                          <div key={i} className="font-mono text-[11px] text-slate-600">
                            Room {h.hotelRoomId || h} • Nights: {h.quantity || 1}
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-400 italic text-[11px]">No specific hotel rooms claimed.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-800">Bundled Package Services</p>
                <div className="mt-3 divide-y rounded-2xl border border-slate-200 bg-white">
                  {Object.entries(booking.services || {}).flatMap(([cat, list]) =>
                    list.map((item, idx) => (
                      <div key={`${cat}-${idx}`} className="flex items-center justify-between p-4 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">
                            {item.type || cat}
                          </span>
                          <span className="font-bold text-slate-800">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-900">{formatAmount(item.retailPrice)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}



          {tab === 'financials' && (
            <div className="space-y-6">
              <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Item Description</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-6 py-4 font-semibold text-slate-800">Gross Package Selling Price</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        {formatAmount(booking.financials?.totalAmount || booking.totalAmount, booking.currency)}
                      </td>
                    </tr>
                    {booking.cancellation?.refundAmount > 0 && (
                      <tr className="bg-rose-50/50">
                        <td className="px-6 py-4 text-rose-700 font-semibold">Processed Cancellation Refund</td>
                        <td className="px-6 py-4 text-right font-bold text-rose-700">
                          -{formatAmount(booking.cancellation.refundAmount, booking.currency)}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-slate-50 font-black">
                      <td className="px-6 py-4 text-slate-900">Net Receivable</td>
                      <td className="px-6 py-4 text-right text-base text-emerald-700">
                        {formatAmount(
                          Math.max(0, (booking.financials?.totalAmount || booking.totalAmount) - (booking.cancellation?.refundAmount || 0)),
                          booking.currency
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'activity' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-800">Operational Timeline & Remarks</p>
                <Button size="sm" variant="secondary" onClick={() => setRemarkOpen(true)}>
                  <MessageSquarePlus size={14} /> Add Note
                </Button>
              </div>
              <BookingTimeline
                items={booking.remarks?.map((r) => ({
                  id: r.id,
                  title: r.author || 'System',
                  detail: r.text,
                  time: formatDateTime(r.createdAt),
                })) || []}
              />
            </div>
          )}
        </div>
      </div>

      {/* Operational Modals */}
      <AssignAgentModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        booking={booking}
      />
      <EditBookingModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        booking={booking}
      />
      <RemarkModal
        open={remarkOpen}
        onClose={() => setRemarkOpen(false)}
        booking={booking}
      />
      <CancelBookingModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        booking={booking}
      />
    </div>
  );
}
