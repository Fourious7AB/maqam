import { getCachedCrmUser, extractUserId } from '../crm/crmUserResolver';

const STATUS_LABELS = {
  all: 'All statuses',
  pending: 'Pending',
  payment_pending: 'Payment pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  visa_review: 'Visa review',
  documents_missing: 'Documents missing',
};

const STATUS_TONES = {
  confirmed: 'good',
  pending: 'warn',
  payment_pending: 'warn',
  cancelled: 'alert',
  rejected: 'alert',
  visa_review: 'info',
  documents_missing: 'alert',
};

export const STATUS_OPTIONS = [
  { value: 'all', label: STATUS_LABELS.all },
  { value: 'pending', label: STATUS_LABELS.pending },
  { value: 'payment_pending', label: STATUS_LABELS.payment_pending },
  { value: 'confirmed', label: STATUS_LABELS.confirmed },
  { value: 'cancelled', label: STATUS_LABELS.cancelled },
  { value: 'rejected', label: STATUS_LABELS.rejected },
];

export function toArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.rows)) return value.data.rows;
  if (Array.isArray(value?.data?.data)) return value.data.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.bookings)) return value.bookings;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

export function countOf(result) {
  return Number(result?.meta?.total ?? result?.pagination?.total ?? toArray(result).length ?? 0);
}

export function formatCount(value) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('en-IN') : '—';
}

export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return `₹${number.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatCompactCurrency(value) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  if (Math.abs(number) >= 100000) return `₹${(number / 100000).toFixed(1)}L`;
  if (Math.abs(number) >= 1000) return `₹${(number / 1000).toFixed(1)}K`;
  return formatCurrency(number);
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getInitials(value) {
  const words = String(value || 'Unassigned').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '—';
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}

export function getProgress(value, total) {
  const numerator = Number(value);
  const denominator = Number(total);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)));
}

export function normalizeStatus(value) {
  const status = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (status.includes('payment') && status.includes('pending')) return 'payment_pending';
  if (status.includes('document') && (status.includes('missing') || status.includes('required'))) return 'documents_missing';
  if (status.includes('visa') || status.includes('review')) return 'visa_review';
  if (status.includes('confirm') || status === 'paid' || status === 'success') return 'confirmed';
  if (status.includes('cancel')) return 'cancelled';
  if (status.includes('reject')) return 'rejected';
  if (status.includes('pending') || status.includes('draft') || status.includes('new')) return 'pending';
  return status || 'pending';
}

export function getStatusLabel(value) {
  const status = normalizeStatus(value);
  return STATUS_LABELS[status] || status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getStatusTone(value) {
  return STATUS_TONES[normalizeStatus(value)] || 'info';
}

export function normalizeBooking(raw = {}, index = 0) {
  const userId = extractUserId(raw.userId || raw.customerId || raw.customer || raw.user);
  const cachedUser = userId ? getCachedCrmUser(userId) : null;
  const traveler = raw.traveler?.fullName
    || raw.traveler?.name
    || (raw.userId?.firstName ? `${raw.userId.firstName} ${raw.userId.lastName || ""}`.trim() : null)
    || raw.userId?.name
    || raw.customer?.fullName
    || raw.customer?.name
    || cachedUser?.name
    || raw.customerName
    || raw.travelerName
    || raw.name
    || 'Unassigned traveler';
  const owner = raw.owner?.fullName
    || raw.owner?.name
    || (raw.assignedTo?.firstName ? `${raw.assignedTo.firstName} ${raw.assignedTo.lastName || ""}`.trim() : null)
    || raw.assignedTo?.fullName
    || raw.assignedTo?.name
    || (typeof raw.assignedTo === 'string' ? raw.assignedTo : null)
    || raw.agent?.fullName
    || raw.agent?.name
    || raw.ownerName
    || raw.agentName
    || 'Unassigned';
  const packageName = raw.packageSnapshot?.title
    || raw.packageId?.title
    || raw.package?.name
    || raw.package?.title
    || raw.details?.destination
    || raw.destination
    || raw.packageName
    || raw.packageTitle
    || raw.package
    || 'Custom itinerary';
  const status = normalizeStatus(raw.status || raw.bookingStatus || raw.paymentStatus);
  const id = raw.id || raw._id || raw.bookingId || raw.bookingNumber || `dashboard-booking-${index}`;
  const travelers = raw.travelers
    ?? raw.travelerCount
    ?? raw.passengerCount
    ?? raw.paxCount
    ?? raw.details?.passengers
    ?? (Array.isArray(raw.passengers) ? raw.passengers.length : null)
    ?? (Array.isArray(raw.travellers) ? raw.travellers.length : null);

  let nextAction = 'Open booking';
  let nextActionTo = raw.id || raw._id ? `/admin/bookings/${raw.id || raw._id}` : '/admin/bookings';
  if (status === 'payment_pending') nextAction = 'Review payment';
  if (status === 'visa_review') {
    nextAction = 'Open case';
    nextActionTo = '/admin/visa/applications';
  }
  if (status === 'documents_missing') nextAction = 'Request docs';
  if (status === 'confirmed') nextAction = 'View itinerary';

  const departureRaw = raw.travelDates?.startDate || raw.departureDate || raw.departure || raw.travelDate || raw.startDate || raw.checkIn || null;
  const departure = departureRaw?.$date || departureRaw;

  return {
    id: String(id),
    bookingNumber: raw.bookingReference || raw.bookingNumber || raw.bookingNo || raw.reference || `BK${String(index + 1).padStart(3, '0')}`,
    traveler,
    packageName,
    departure,
    status,
    owner,
    nextAction,
    nextActionTo,
    travelers: Number.isFinite(Number(travelers)) ? Number(travelers) : null,
    source: raw.source || raw.channel || raw.bookingSource || null,
    price: raw.totalAmount ?? raw.details?.totalPrice ?? raw.grandTotal ?? raw.amount ?? raw.package?.sellPrice ?? null,
  };
}

// Snapshot-explorer card normalizers. Each returns the shape consumed by
// SnapshotExplorer: { id, title, subtitle, price, details, to, editTo }.

export function normalizeBookingCard(raw = {}, index = 0) {
  const booking = normalizeBooking(raw, index);
  return {
    id: booking.id,
    title: `${booking.bookingNumber} · ${booking.traveler}`,
    subtitle: booking.packageName,
    price: booking.price,
    status: booking.status,
    details: [
      booking.departure ? `Departs ${formatDate(booking.departure)}` : null,
      booking.travelers ? `${booking.travelers} traveler${booking.travelers > 1 ? 's' : ''}` : null,
      booking.source,
    ].filter(Boolean),
    to: `/admin/bookings/${booking.id}`,
    editTo: `/admin/bookings/${booking.id}`,
  };
}

export function normalizeFlightStock(raw = {}, index = 0) {
  const id = raw.id || raw._id || `flight-${index}`;
  return {
    id: String(id),
    title: `${raw.airline || 'Airline'} ${raw.flightNumber || ''}`.trim(),
    subtitle: [raw.origin, raw.destination].filter(Boolean).join(' → ') || raw.cabinClass || 'Flight stock',
    price: raw.costPerUnit,
    details: [
      raw.pnr ? `PNR ${raw.pnr}` : null,
      `${raw.availableUnits ?? raw.availableSeats ?? raw.seats ?? 0} seats`,
      raw.cabinClass,
    ].filter(Boolean),
    to: '/admin/inventory/flights',
    editTo: '/admin/inventory/flights',
  };
}

export function normalizeHotelStock(raw = {}, index = 0) {
  const id = raw.id || raw._id || `hotel-${index}`;
  const rooms = raw.availableUnits ?? raw.availableRooms ?? raw.rooms ?? raw.roomCount;
  return {
    id: String(id),
    title: raw.hotelName || raw.name || 'Hotel stock',
    subtitle: [raw.destination, raw.roomType].filter(Boolean).join(' · ') || 'Hotel inventory',
    price: raw.pricePerNight,
    details: [
      rooms != null ? `${rooms} rooms` : null,
      raw.checkIn ? `From ${formatDate(raw.checkIn)}` : null,
    ].filter(Boolean),
    to: '/admin/inventory/hotels',
    editTo: '/admin/inventory/hotels',
  };
}

export function normalizeVisaInventory(raw = {}, index = 0) {
  const id = raw.id || raw._id || `visa-${index}`;
  return {
    id: String(id),
    title: raw.title || `${raw.country || 'Visa'} ${raw.visaType || ''}`.trim(),
    subtitle: [raw.country, raw.visaType, raw.entryType].filter(Boolean).join(' · ') || 'Visa catalogue',
    price: raw.fees?.totalPrice,
    details: [
      raw.validity,
      raw.inventory?.isUnlimited ? 'Unlimited stock' : `${raw.inventory?.availableStock ?? 0}/${raw.inventory?.totalStock ?? 0} stock`,
      raw.processingTime,
    ].filter(Boolean),
    to: `/admin/inventory/visa/${id}`,
    editTo: `/admin/inventory/visa/${id}/edit`,
  };
}

export function normalizePackageCard(raw = {}, index = 0) {
  const id = raw.id || raw._id || `package-${index}`;
  return {
    id: String(id),
    title: raw.title || raw.name || 'Package',
    subtitle: raw.destination || 'Package',
    price: raw.sellPrice,
    details: [
      raw.status,
      raw.availableSlots != null ? `${raw.availableSlots} slots left` : null,
      raw.duration ? `${raw.duration} days` : null,
    ].filter(Boolean),
    to: `/admin/packages/${id}`,
    editTo: `/admin/packages/${id}/edit`,
  };
}

export function normalizeRevenue(value) {
  const points = toArray(value?.revenue ?? value?.data?.revenue ?? value);
  return points
    .map((point, index) => ({
      label: point?.label || point?.month || point?.name || `M${index + 1}`,
      value: Number(point?.value ?? point?.amount ?? point?.revenue ?? 0),
    }))
    .filter((point) => Number.isFinite(point.value))
    .slice(-6);
}

export function getDisplayName(user) {
  return user?.fullName || user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Admin User';
}
