// Create Package Booking — CRM operations wizard.
//
// Every step reads/writes the LIVE backend contract (see findings.md):
//   customer  -> real customer records from the CRM booking index
//   package   -> GET /api/v1/crm/packages
//   travellers-> traveller ids discovered from the customer's real bookings
//                (the backend requires [{travellerId, isLead}] and rejects
//                inline traveller objects)
//   dates     -> travelDates {startDate,endDate}
//   services  -> flight/hotel/transport bundled in the selected package
//   payment   -> payment {method, referenceNumber, notes}
//   confirm   -> POST /api/v1/crm/packages/book-for-customer
//
// There is no mock data and no fabricated flight/hotel inventory: the wizard
// shows exactly what the package contains and lets the backend claim it.

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowLeft, ArrowRight, Bus, Check, CheckCircle2, Hotel, Info, Plane,
  Plus, Search, Trash2, UserRound,
} from 'lucide-react';

import PageHeader from '../../../components/layout/PageHeader';
import Button from '../../../components/common/Button';
import { bookingsApi } from '../bookingsApi';
import { bookingKeys, REFERENCE_QUERY_OPTIONS, OPERATIONAL_QUERY_OPTIONS } from '../bookingQueryKeys';
import {
  collectCustomers, collectTravellers, formatAmount, formatDateRange, isObjectId,
} from '../bookingNormalizers';
import { ErrorState, InlineError } from '../components/BookingStates';

const STEPS = [
  { key: 'customer', label: 'Customer' },
  { key: 'package', label: 'Package' },
  { key: 'travellers', label: 'Travellers' },
  { key: 'travel', label: 'Travel Details' },
  { key: 'services', label: 'Included Services' },
  { key: 'payment', label: 'Payment' },
  { key: 'review', label: 'Review & Confirm' },
];

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer (NEFT/RTGS)' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
];

const fieldClass = 'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500';

const SERVICE_ICONS = { flight: Plane, hotel: Hotel, transport: Bus, other: Info };

function StepCard({ title, hint, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </header>
      {children}
    </section>
  );
}

function ChoiceCard({ selected, onClick, title, subtitle, meta, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        selected ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-200' : 'border-slate-200 bg-white hover:border-emerald-300'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{title}</p>
          {subtitle && <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>}
        </div>
        {selected && <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />}
      </div>
      {meta && <div className="mt-2 flex flex-wrap gap-2">{meta}</div>}
    </button>
  );
}

function Pill({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    sky: 'bg-sky-100 text-sky-700',
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}


// Keeps exactly one lead traveller (the backend stores `isLead` per entry).
const ensureSingleLead = (list) => {
  if (!list.length) return list;
  const leadIndex = list.findIndex((item) => item.isLead);
  const safeLead = leadIndex === -1 ? 0 : leadIndex;
  return list.map((item, index) => ({ ...item, isLead: index === safeLead }));
};

export default function CreateBooking() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [customerId, setCustomerId] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [manualCustomerId, setManualCustomerId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [packageQuery, setPackageQuery] = useState('');
  const [travellers, setTravellers] = useState([]);
  const [manualTravellerId, setManualTravellerId] = useState('');
  const [travel, setTravel] = useState({ startDate: '', endDate: '' });
  const [contact, setContact] = useState({ email: '', phone: '', emergencyContact: '' });
  const [payment, setPayment] = useState({ method: 'bank_transfer', referenceNumber: '', notes: '' });
  const [error, setError] = useState(null);

  // Customer index + traveller discovery, built from the customer records that
  // really exist in the CRM. (`GET /api/v1/customers` returns 404 on this
  // backend build, so no directory endpoint can be used here.)
  const indexQuery = useQuery({
    queryKey: bookingKeys.customerIndex(),
    ...REFERENCE_QUERY_OPTIONS,
    queryFn: async () => {
      const [master, packageRows] = await Promise.all([
        bookingsApi.list({ limit: 100 }),
        bookingsApi.listPackageBookings({ limit: 100 }),
      ]);
      return {
        customers: collectCustomers({ masterRows: master.rows, packageRows: packageRows.rows }),
        packageRows: packageRows.rows,
      };
    },
  });

  const catalogQuery = useQuery({
    queryKey: bookingKeys.packageCatalog({ limit: 100, for: 'wizard' }),
    ...REFERENCE_QUERY_OPTIONS,
    queryFn: () => bookingsApi.getPackageCatalog({ limit: 100 }),
  });

  const customers = indexQuery.data?.customers ?? [];
  const packages = catalogQuery.data?.packages ?? [];

  const selectedCustomer = useMemo(() => {
    const fromIndex = customers.find((item) => item.id === customerId);
    if (fromIndex) return fromIndex;
    if (isObjectId(manualCustomerId)) {
      return { id: manualCustomerId.trim(), name: 'Customer (id supplied manually)', email: '', phone: '' };
    }
    return null;
  }, [customers, customerId, manualCustomerId]);

  const selectedPackage = useMemo(
    () => packages.find((item) => item.id === packageId) ?? null,
    [packages, packageId],
  );

  // Documented contract for traveller discovery. Absent in this build (404),
  // which the API layer maps to an empty list instead of mock travellers.
  const directoryQuery = useQuery({
    queryKey: ['crm', 'customers', selectedCustomer?.id ?? 'none', 'travellers'],
    ...REFERENCE_QUERY_OPTIONS,
    enabled: Boolean(selectedCustomer?.id),
    queryFn: () => bookingsApi.listCustomerTravellers(selectedCustomer.id),
  });

  const knownTravellers = useMemo(() => {
    const fromBookings = collectTravellers({
      packageRows: indexQuery.data?.packageRows ?? [],
      customerId: selectedCustomer?.id ?? '',
    });
    const fromDirectory = (directoryQuery.data ?? [])
      .map((traveller) => ({
        travellerId: traveller?.travellerId ?? traveller?._id ?? traveller?.id ?? '',
        isLead: Boolean(traveller?.isLead),
      }))
      .filter((traveller) => isObjectId(traveller.travellerId));

    const map = new Map();
    [...fromBookings, ...fromDirectory].forEach((traveller) => {
      const existing = map.get(traveller.travellerId);
      map.set(traveller.travellerId, {
        travellerId: traveller.travellerId,
        isLead: Boolean(traveller.isLead) || Boolean(existing?.isLead),
      });
    });
    return Array.from(map.values());
  }, [indexQuery.data, directoryQuery.data, selectedCustomer?.id]);


  // Prefill contact details and the customer's known travellers once the
  // customer is chosen.
  useEffect(() => {
    if (!selectedCustomer) return;
    setContact((current) => ({
      email: current.email || selectedCustomer.email || '',
      phone: current.phone || selectedCustomer.phone || '',
      emergencyContact: current.emergencyContact || '',
    }));
  }, [selectedCustomer?.id]);

  useEffect(() => {
    if (!selectedCustomer) return;
    setTravellers((current) => {
      if (current.length) return current;
      if (!knownTravellers.length) return current;
      return ensureSingleLead(knownTravellers.map((traveller, index) => ({
        travellerId: traveller.travellerId,
        isLead: traveller.isLead || index === 0,
      })));
    });
  }, [selectedCustomer?.id, knownTravellers.length]);

  const toggleTraveller = (travellerId) => {
    setTravellers((current) => {
      const exists = current.some((item) => item.travellerId === travellerId);
      if (exists) {
        const next = current.filter((item) => item.travellerId !== travellerId);
        return next.some((item) => item.isLead) ? next : ensureSingleLead(next);
      }
      return ensureSingleLead([...current, { travellerId, isLead: false }]);
    });
  };

  const setLead = (travellerId) => {
    setTravellers((current) => current.map((item) => ({
      ...item,
      isLead: item.travellerId === travellerId,
    })));
  };

  const addManualTraveller = () => {
    const travellerId = manualTravellerId.trim();
    if (!isObjectId(travellerId)) {
      setError(new Error('A traveller id must be a 24-character MongoDB ObjectId.'));
      return;
    }
    setError(null);
    setTravellers((current) => (current.some((item) => item.travellerId === travellerId)
      ? current
      : ensureSingleLead([...current, { travellerId, isLead: false }])));
    setManualTravellerId('');
  };

  const estimatedTotal = selectedPackage ? selectedPackage.sellPrice : 0;

  const dateError = travel.startDate && travel.endDate && new Date(travel.endDate) < new Date(travel.startDate)
    ? 'The travel end date cannot be before the start date.'
    : '';

  const stepValid = [
    Boolean(selectedCustomer),
    Boolean(selectedPackage),
    travellers.length > 0 && travellers.some((item) => item.isLead),
    Boolean(travel.startDate && travel.endDate && (contact.email.trim() || contact.phone.trim())) && !dateError,
    true,
    Boolean(payment.method),
    true,
  ][step];

  const createMutation = useMutation({
    mutationFn: () => bookingsApi.bookForCustomer({
      customerId: selectedCustomer.id,
      packageId: selectedPackage.id,
      quantity: 1,
      travellers: ensureSingleLead(travellers).map((item) => ({
        travellerId: item.travellerId,
        isLead: item.isLead,
      })),
      travelDates: {
        startDate: new Date(`${travel.startDate}T00:00:00.000Z`).toISOString(),
        endDate: new Date(`${travel.endDate}T00:00:00.000Z`).toISOString(),
      },
      contactDetails: {
        email: contact.email.trim(),
        phone: contact.phone.trim(),
        emergencyContact: contact.emergencyContact.trim(),
      },
      payment: {
        method: payment.method,
        referenceNumber: payment.referenceNumber.trim(),
        notes: payment.notes.trim() || `CRM booking for ${selectedPackage.title}`,
      },
    }),
    onSuccess: async (created) => {
      const createdId = created?._id ?? created?.id ?? created?.booking?._id ?? '';
      toast.success('Package booking created successfully');
      queryClient.invalidateQueries({ queryKey: bookingKeys.bookingsRoot() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.customerIndex() });
      navigate(createdId ? `/admin/bookings/${createdId}` : '/admin/bookings');
    },
    onError: (mutationError) => setError(mutationError),
  });

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers.filter((item) => (
      item.name.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      item.phone.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q)
    )).slice(0, 10);
  }, [customers, customerQuery]);

  const filteredPackages = useMemo(() => {
    const q = packageQuery.trim().toLowerCase();
    if (!q) return packages.slice(0, 8);
    return packages.filter((item) => (
      item.title.toLowerCase().includes(q) ||
      item.destination.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q)
    )).slice(0, 10);
  }, [packages, packageQuery]);



  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Create Package Booking"
        subtitle="Claim wholesale stock and issue an in-house package booking for a customer"
        action={{
          label: 'Back to Bookings',
          icon: ArrowLeft,
          variant: 'secondary',
          onClick: () => navigate('/admin/bookings'),
        }}
      />

      {/* Stepper bar */}
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {STEPS.map((s, index) => {
          const isDone = index < step;
          const isCurrent = index === step;
          return (
            <li
              key={s.key}
              className={`flex items-center gap-2 rounded-2xl border p-3 text-xs transition ${
                isCurrent
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold'
                  : isDone
                  ? 'border-slate-200 bg-white text-slate-700'
                  : 'border-slate-100 bg-slate-50 text-slate-400'
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  isDone
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isDone ? <Check size={12} /> : index + 1}
              </span>
              <span className="truncate">{s.label}</span>
            </li>
          );
        })}
      </ol>

      {/* Wizard layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <main className="space-y-6 lg:col-span-2">
          {step === 0 && (
            <StepCard
              title="1. Select Customer"
              hint="Pick a known customer from CRM booking records, or supply a valid 24-character customer ObjectId."
            >
              <div className="space-y-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="search"
                    value={customerQuery}
                    onChange={(event) => setCustomerQuery(event.target.value)}
                    placeholder="Search by customer name, email or phone…"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  {filteredCustomers.map((c) => (
                    <ChoiceCard
                      key={c.id}
                      selected={selectedCustomer?.id === c.id}
                      onClick={() => {
                        setCustomerId(c.id);
                        setManualCustomerId('');
                      }}
                      title={c.name}
                      subtitle={[c.email, c.phone].filter(Boolean).join(' • ') || 'No contact details on file'}
                      meta={[
                        <Pill key="source" tone="slate">Source: {c.source}</Pill>,
                        <Pill key="id" tone="slate">ID: {c.id.slice(0, 8)}…</Pill>,
                      ]}
                    />
                  ))}
                  {filteredCustomers.length === 0 && (
                    <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                      No matching customers found in the local booking index.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-dashed border-slate-200 p-4">
                  <p className="text-xs font-bold text-slate-700">Or supply a customer ObjectId manually</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Use this when booking for an externally-created customer not yet present in existing bookings.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={manualCustomerId}
                      onChange={(event) => {
                        setManualCustomerId(event.target.value);
                        setCustomerId('');
                      }}
                      placeholder="24-character hex ID (e.g. 64b7f...)"
                      className={fieldClass}
                    />
                  </div>
                </div>
              </div>
            </StepCard>
          )}



          {step === 1 && (
            <StepCard
              title="2. Select Package"
              hint="Choose an active package from wholesale inventory. Claims are validated by the backend."
            >
              <div className="space-y-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="search"
                    value={packageQuery}
                    onChange={(event) => setPackageQuery(event.target.value)}
                    placeholder="Search by package name or destination…"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  {filteredPackages.map((pkg) => (
                    <ChoiceCard
                      key={pkg.id}
                      selected={selectedPackage?.id === pkg.id}
                      onClick={() => setPackageId(pkg.id)}
                      title={pkg.title}
                      subtitle={`${pkg.destination || 'Unspecified destination'} • ${pkg.durationDays ? `${pkg.durationDays} days` : 'Flexible duration'}`}
                      meta={[
                        <Pill key="price" tone="emerald">
                          {formatAmount(pkg.sellPrice, pkg.currency)}
                        </Pill>,
                        <Pill key="type" tone="sky">{pkg.packageType || 'Standard'}</Pill>,
                        <Pill key="services" tone="slate">
                          {pkg.includedServices?.length || 0} services bundled
                        </Pill>,
                      ]}
                    />
                  ))}
                  {filteredPackages.length === 0 && (
                    <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                      No packages found matching that query.
                    </p>
                  )}
                </div>
              </div>
            </StepCard>
          )}



          {step === 2 && (
            <StepCard
              title="3. Travellers"
              hint="The backend accepts an array of {travellerId, isLead}. Travellers must be valid MongoDB ObjectIds."
            >
              <div className="space-y-4">
                {knownTravellers.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-700">Discovered travellers for this customer</p>
                    <div className="mt-2 space-y-2">
                      {knownTravellers.map((item) => {
                        const inBooking = travellers.some((t) => t.travellerId === item.travellerId);
                        const isLead = travellers.find((t) => t.travellerId === item.travellerId)?.isLead;
                        return (
                          <div
                            key={item.travellerId}
                            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs"
                          >
                            <div>
                              <p className="font-bold text-slate-800">Traveller ID: {item.travellerId}</p>
                              <p className="text-[11px] text-slate-400">
                                Discovered from previous package bookings
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {inBooking && (
                                <button
                                  type="button"
                                  onClick={() => setLead(item.travellerId)}
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                    isLead
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                  }`}
                                >
                                  {isLead ? 'Lead Traveller' : 'Make Lead'}
                                </button>
                              )}
                              <Button
                                size="sm"
                                variant={inBooking ? 'danger' : 'secondary'}
                                onClick={() => toggleTraveller(item.travellerId)}
                              >
                                {inBooking ? 'Remove' : 'Add'}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-dashed border-slate-200 p-4">
                  <p className="text-xs font-bold text-slate-700">Add traveller by ObjectId</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Enter the traveller's 24-character hexadecimal MongoDB ID.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={manualTravellerId}
                      onChange={(event) => setManualTravellerId(event.target.value)}
                      placeholder="e.g. 64b7f9..."
                      className={fieldClass}
                    />
                    <Button type="button" onClick={addManualTraveller} disabled={!manualTravellerId.trim()}>
                      <Plus size={16} /> Add
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-700">Currently assigned ({travellers.length})</p>
                  <div className="mt-2 divide-y rounded-2xl border border-slate-200 bg-white">
                    {travellers.map((t) => (
                      <div key={t.travellerId} className="flex items-center justify-between p-3 text-xs">
                        <div className="flex items-center gap-2">
                          <UserRound size={16} className="text-slate-400" />
                          <span className="font-mono text-[11px] font-semibold text-slate-800">
                            {t.travellerId}
                          </span>
                          {t.isLead && <Pill tone="emerald">Lead</Pill>}
                        </div>
                        <div className="flex items-center gap-2">
                          {!t.isLead && (
                            <button
                              type="button"
                              onClick={() => setLead(t.travellerId)}
                              className="text-[11px] font-semibold text-emerald-600 hover:underline"
                            >
                              Make Lead
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleTraveller(t.travellerId)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {travellers.length === 0 && (
                      <p className="p-4 text-center text-xs text-rose-500">
                        At least one traveller is required to create a booking.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </StepCard>
          )}



          {step === 3 && (
            <StepCard
              title="4. Travel Dates & Contact Details"
              hint="Set the departure/return dates and primary contact details for operational comms."
            >
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Departure / Check-in date *
                    </label>
                    <input
                      type="date"
                      value={travel.startDate}
                      onChange={(event) => setTravel({ ...travel, startDate: event.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Return / Check-out date *
                    </label>
                    <input
                      type="date"
                      value={travel.endDate}
                      onChange={(event) => setTravel({ ...travel, endDate: event.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Contact email (at least email or phone required)
                    </label>
                    <input
                      type="email"
                      value={contact.email}
                      onChange={(event) => setContact({ ...contact, email: event.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Contact phone
                    </label>
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(event) => setContact({ ...contact, phone: event.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Emergency contact
                    </label>
                    <input
                      value={contact.emergencyContact}
                      onChange={(event) => setContact({ ...contact, emergencyContact: event.target.value })}
                      className={fieldClass}
                    />
                  </div>
                </div>

                {dateError && (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-600">
                    {dateError}
                  </p>
                )}
              </div>
            </StepCard>
          )}

          {step === 4 && (
            <StepCard
              title="5. Included Services"
              hint="Services bundled with the selected package. These reflect wholesale stock claimed upon booking."
            >
              <div className="space-y-3">
                {(!selectedPackage?.includedServices || selectedPackage.includedServices.length === 0) && (
                  <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                    This package does not list bundled services.
                  </p>
                )}
                {selectedPackage?.includedServices?.map((svc, index) => {
                  const SvcIcon = SERVICE_ICONS[svc.type] || Info;
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                        <SvcIcon size={18} className="text-slate-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{svc.type}</p>
                          <Pill tone="emerald">Included in package</Pill>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{svc.title}</p>
                        {svc.details && <p className="mt-0.5 text-xs text-slate-500">{svc.details}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </StepCard>
          )}



          {step === 5 && (
            <StepCard
              title="6. Payment Record"
              hint="Record initial payment method and reference number for this booking."
            >
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Payment method *
                  </label>
                  <select
                    value={payment.method}
                    onChange={(event) => setPayment({ ...payment, method: event.target.value })}
                    className={fieldClass}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Payment reference / UTR / transaction ID
                  </label>
                  <input
                    value={payment.referenceNumber}
                    onChange={(event) => setPayment({ ...payment, referenceNumber: event.target.value })}
                    placeholder="e.g. UTR12345678 or Bank ref"
                    className={fieldClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Payment notes (optional)
                  </label>
                  <textarea
                    value={payment.notes}
                    onChange={(event) => setPayment({ ...payment, notes: event.target.value })}
                    placeholder="e.g. 50% advance received via HDFC bank transfer"
                    className="h-20 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </StepCard>
          )}

          {step === 6 && (
            <StepCard
              title="7. Review & Confirm Booking"
              hint="Verify all booking details before committing. Claimed stock will be reserved immediately upon confirmation."
            >
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Customer</span>
                    <span className="font-bold text-slate-900">{selectedCustomer?.name}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Customer ID</span>
                    <span className="font-mono text-[11px] text-slate-800">{selectedCustomer?.id}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Package</span>
                    <span className="font-bold text-slate-900">{selectedPackage?.title}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Destination</span>
                    <span className="font-semibold text-slate-800">{selectedPackage?.destination || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Travel dates</span>
                    <span className="font-semibold text-slate-800">
                      {travel.startDate} to {travel.endDate}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Travellers ({travellers.length})</span>
                    <span className="font-mono text-[11px] text-slate-800">
                      {travellers.find((t) => t.isLead)?.travellerId.slice(0, 8)}… (Lead)
                      {travellers.length > 1 && ` + ${travellers.length - 1} more`}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Contact email / phone</span>
                    <span className="font-semibold text-slate-800">
                      {[contact.email, contact.phone].filter(Boolean).join(' • ') || 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Payment method</span>
                    <span className="font-semibold text-slate-800 uppercase">
                      {payment.method} {payment.referenceNumber ? `(${payment.referenceNumber})` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 text-sm font-bold">
                    <span className="text-slate-900">Total amount</span>
                    <span className="text-emerald-700">
                      {formatAmount(estimatedTotal, selectedPackage?.currency)}
                    </span>
                  </div>
                </div>

                <InlineError error={error} />
              </div>
            </StepCard>
          )}



          {/* Stepper navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="secondary"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0 || createMutation.isPending}
            >
              <ArrowLeft size={16} /> Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep((current) => Math.min(STEPS.length - 1, current + 1))}
                disabled={!stepValid}
              >
                Continue <ArrowRight size={16} />
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setError(null);
                  createMutation.mutate();
                }}
                loading={createMutation.isPending}
                disabled={!stepValid}
              >
                <Check size={16} /> Confirm & Create Booking
              </Button>
            )}
          </div>
        </main>

        {/* Sidebar recap */}
        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Booking Summary</h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer</span>
                <p className="mt-0.5 font-semibold text-slate-800">
                  {selectedCustomer?.name || 'Not selected'}
                </p>
                {selectedCustomer?.id && (
                  <p className="font-mono text-[10px] text-slate-400 truncate">{selectedCustomer.id}</p>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Package</span>
                <p className="mt-0.5 font-semibold text-slate-800">
                  {selectedPackage?.title || 'Not selected'}
                </p>
                {selectedPackage?.destination && (
                  <p className="text-[11px] text-slate-500">{selectedPackage.destination}</p>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Travellers</span>
                <p className="mt-0.5 font-semibold text-slate-800">
                  {travellers.length} selected {travellers.some((t) => t.isLead) ? '(lead set)' : '(no lead)'}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Travel dates</span>
                <p className="mt-0.5 font-semibold text-slate-800">
                  {travel.startDate && travel.endDate ? `${travel.startDate} to ${travel.endDate}` : 'Not set'}
                </p>
              </div>

              <div className="border-t pt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estimated Total</span>
                <p className="mt-0.5 text-lg font-black text-emerald-600">
                  {formatAmount(estimatedTotal, selectedPackage?.currency)}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
