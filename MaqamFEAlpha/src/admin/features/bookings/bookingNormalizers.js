// Single normalization layer for the whole CRM bookings desk.
//
// The backend speaks MongoDB documents (`_id`, `bookingReference`,
// `customer.name`, `financials.totalAmount`, `packageSnapshot.validity`, ...)
// while every booking component in this app reads a flat UI shape
// (`id`, `bookingNumber`, `customerName`, `totalAmount`, `travelDates`).
// Normalizing in one place is why the same row can be rendered from either
// the package-module list (`/crm/packages/bookings`) or the master index
// (`/crm/bookings`) without special cases in the components.
//
// Contract evidence: findings.md (captured from the live backend).

import { formatDate } from '../../utils/formatDate';
import { getCachedCrmUser } from '../crm/crmUserResolver';

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

export const isObjectId = (value) => OBJECT_ID.test(String(value ?? '').trim());

export const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

// `_id`, nested documents, MongoDB $oid, and plain strings are all valid references in the
// real payloads.
export const pickId = (value) => {
  if (!value) return '';
  if (typeof value === 'object') return String(value.$oid ?? value._id ?? value.id ?? '');
  return String(value);
};

export const formatDateTime = (value) => (value ? formatDate(value, { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export const formatDateRange = (travelDates) => {
  if (!travelDates?.startDate && !travelDates?.endDate) return '—';
  return `${formatDateTime(travelDates.startDate)} → ${formatDateTime(travelDates.endDate)}`;
};

export const formatAmount = (value, currency = 'INR') => {
  const amount = toNumber(value);
  const suffix = currency && currency !== 'INR' ? ` ${currency}` : '';
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}${suffix}`;
};

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export const normalizePerson = (value) => {
  if (!value) return null;
  const id = pickId(value);
  if (typeof value === 'string') {
    if (!isObjectId(value)) return null;
    const cached = getCachedCrmUser(id);
    if (cached) {
      return {
        id,
        name: cached.name || '',
        email: cached.email || '',
        phone: cached.phone || '',
        role: cached.role || '',
        avatar: cached.avatar || '',
      };
    }
    return { id: value, name: '', email: '', phone: '', role: '', avatar: '' };
  }
  const cached = id ? getCachedCrmUser(id) : null;
  const name = value.fullName
    || value.name
    || [value.firstName, value.lastName].filter(Boolean).join(' ')
    || cached?.name
    || '';
  return {
    id,
    name,
    email: value.email || cached?.email || '',
    phone: value.phone || cached?.phone || '',
    role: value.role || cached?.role || '',
    avatar: value.avatar || cached?.avatar || '',
  };
};

export const normalizeCustomer = (row = {}) => {
  const person = normalizePerson(row.customer)
    || normalizePerson(row.userId)
    || normalizePerson(row.user)
    || null;
  const userId = pickId(row.userId || row.customerId || row.customer || row.user);
  const cached = userId ? getCachedCrmUser(userId) : null;
  if (person) {
    return {
      id: person.id || userId,
      name: (person.name && person.name !== 'Customer') ? person.name : (cached?.name || 'Customer'),
      email: person.email || cached?.email || '',
      phone: person.phone || cached?.phone || '',
    };
  }
  if (cached) {
    return {
      id: cached.id || userId,
      name: cached.name || 'Customer',
      email: cached.email || '',
      phone: cached.phone || '',
    };
  }
  return { id: userId || '', name: 'Customer', email: '', phone: '' };
};


export const normalizeAgent = (value) => normalizePerson(value);

// --- Agent directory -------------------------------------------------------
// `GET /api/v1/crm/users` (list) returns 500 on this backend build, so the
// picker is assembled from real user objects that already appear in the CRM
// data (booking assignees, lead assignees) plus the signed-in session user.
export const collectAgents = ({ bookings = [], leads = [], sessionUser = null } = {}) => {
  const map = new Map();
  const push = (user) => {
    const person = normalizePerson(user);
    if (!person?.id || !isObjectId(person.id)) return;
    const existing = map.get(person.id) || {};
    map.set(person.id, { ...existing, ...person, name: person.name || existing.name || 'Staff' });
  };

  bookings.forEach((row) => push(row.assignedTo));
  leads.forEach((lead) => {
    push(lead.assignedAgent);
    push(lead.assignedTo);
  });
  push(sessionUser);

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
};

// --- Customer directory ----------------------------------------------------
// No customer endpoint exists in this build (`GET /api/v1/customers` -> 404),
// so the picker is built from the real customer records that appear in the
// CRM booking index.
export const collectCustomers = ({ masterRows = [], packageRows = [] } = {}) => {
  const map = new Map();
  const push = (customer) => {
    if (!customer?.id || !isObjectId(customer.id)) return;
    const existing = map.get(customer.id) || {};
    map.set(customer.id, {
      ...existing,
      ...customer,
      name: customer.name && customer.name !== 'Customer' ? customer.name : existing.name || 'Customer',
      email: customer.email || existing.email || '',
      phone: customer.phone || existing.phone || '',
    });
  };

  masterRows.forEach((row) => push(normalizeCustomer(row)));
  packageRows.forEach((row) => push(normalizeCustomer(row)));

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
};

// --- Traveller discovery ---------------------------------------------------
// The backend requires `travellers: [{ travellerId, isLead }]` and rejects
// inline traveller objects. Traveller ids are therefore discovered from the
// customer's existing bookings in the CRM (there is no traveller directory
// endpoint in this build).
export const collectTravellers = ({ packageRows = [], customerId = '' } = {}) => {
  const map = new Map();
  packageRows
    .filter((row) => !customerId || pickId(row.userId) === customerId)
    .forEach((row) => {
      (row.travellers ?? []).forEach((traveller) => {
        const travellerId = pickId(traveller?.travellerId) || pickId(traveller);
        if (!isObjectId(travellerId)) return;
        const existing = map.get(travellerId);
        map.set(travellerId, {
          travellerId,
          isLead: Boolean(traveller?.isLead) || Boolean(existing?.isLead),
          sourceBooking: existing?.sourceBooking || pickId(row._id),
        });
      });
    });
  return Array.from(map.values());
};

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

const firstOf = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const firstArray = (...values) => values.find((value) => Array.isArray(value) && value.length > 0) ?? [];

export const normalizeRemark = (remark, index = 0) => {
  if (typeof remark === 'string') {
    return { id: `remark-${index}`, text: remark, author: 'System', createdAt: null };
  }
  return {
    id: pickId(remark?._id || remark?.id) || `remark-${index}`,
    text: remark?.text ?? remark?.remark ?? remark?.note ?? '',
    author: normalizePerson(remark?.author)?.name || remark?.authorName || 'System',
    createdAt: remark?.createdAt ?? null,
  };
};

// The package booking document keeps an audit trail in `remarks` and a
// legacy single-string `remark` (used by the stock-claim failure note).
export const normalizeRemarks = (row = {}) => {
  const remarks = (Array.isArray(row.remarks) ? row.remarks : []).map(normalizeRemark);
  if (row.remark && typeof row.remark === 'string') {
    remarks.push({
      id: 'legacy-remark',
      text: row.remark,
      author: 'System',
      createdAt: row.updatedAt ?? row.createdAt ?? null,
    });
  }
  return remarks;
};

export const normalizeTravelDates = (row = {}) => {
  const dates = row.travelDates
    ?? row.details?.travelDates
    ?? row.rawBookingDetails?.travelDates
    ?? row.packageSnapshot?.travelDates;
  if (dates?.startDate || dates?.endDate) {
    return { startDate: dates.startDate ?? null, endDate: dates.endDate ?? null };
  }
  // Package bookings carry the package validity window instead of explicit
  // travel dates until the desk edits them.
  const validity = row.packageSnapshot?.validity ?? row.rawBookingDetails?.packageSnapshot?.validity;
  if (validity?.from || validity?.to) {
    return { startDate: validity.from ?? null, endDate: validity.to ?? null };
  }
  return { startDate: null, endDate: null };
};

const SERVICE_BUCKETS = { flight: 'flight', hotel: 'hotel', cab: 'transport', transport: 'transport', transfer: 'transport', visa: 'other', meal: 'other', guide: 'other' };

// Flight / hotel / transport components actually bundled into the booking.
// Source: `packageSnapshot.items` (list + detail) or the rawBookingDetails
// snapshot in the master dossier.
export const normalizeServices = (row = {}) => {
  const snapshot = row.packageSnapshot ?? row.rawBookingDetails?.packageSnapshot ?? row.details?.packageSnapshot ?? {};
  const buckets = { flight: [], hotel: [], transport: [], other: [] };
  const items = Array.isArray(snapshot.items) ? snapshot.items : [];
  items
    .filter((item) => item?.isIncluded !== false)
    .forEach((item, index) => {
      const bucket = SERVICE_BUCKETS[String(item?.type ?? '').toLowerCase()] ?? 'other';
      buckets[bucket].push({
        id: pickId(item?.id) || `item-${index}`,
        name: item?.name || item?.title || 'Service',
        type: item?.type || bucket,
        units: toNumber(item?.units ?? 1),
        retailPrice: toNumber(item?.retailPrice),
      });
    });
  return buckets;
};

export const normalizeClaimedUnits = (row = {}) => ({
  flights: Array.isArray(row.claimedFlightUnits) ? row.claimedFlightUnits : [],
  hotels: Array.isArray(row.claimedHotelUnits) ? row.claimedHotelUnits : [],
});


// One row shape for every source: the package module list
// (/crm/packages/bookings), the master index (/crm/bookings) and a dossier.
export const normalizeBookingRow = (row = {}, { source = 'package' } = {}) => {
  const id = pickId(row._id ?? row.id ?? row.itemId ?? row.bookingId);
  const customer = normalizeCustomer(row);
  const packageRef = row.packageId;
  const packageName = firstOf(
    typeof packageRef === 'object' ? (packageRef?.title ?? packageRef?.name) : '',
    row.packageSnapshot?.title,
    row.details?.packageName,
    row.packageName,
    row.packageTitle,
  ) || '—';
  const destination = firstOf(
    row.destination,
    typeof packageRef === 'object' ? packageRef?.destination : '',
    row.packageSnapshot?.destination,
    row.details?.destination,
  ) || '—';
  const travellers = Array.isArray(row.travellers)
    ? row.travellers.map((traveller) => ({
        travellerId: pickId(traveller?.travellerId) || pickId(traveller),
        isLead: Boolean(traveller?.isLead),
      }))
    : [];

  return {
    id,
    source,
    bookingNumber: firstOf(row.bookingReference, row.bookingNumber, row.reference) || `#${String(id).slice(-6).toUpperCase()}`,
    bookingType: row.bookingType || 'package',
    origin: row.origin || (source === 'package' ? 'in_house' : ''),
    status: String(row.status || 'pending').toLowerCase(),
    paymentStatus: firstOf(row.paymentStatus, row.financials?.payment?.status, row.payment?.status) || 'unknown',
    customerId: customer.id,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    packageId: pickId(packageRef) || pickId(row.package),
    packageName,
    destination,
    travelDates: normalizeTravelDates(row),
    paxCount: toNumber(firstOf(row.paxCount, row.quantity, row.details?.passengers, travellers.length, 0)),
    totalAmount: toNumber(firstOf(
      row.totalAmount,
      row.financials?.totalAmount,
      row.details?.totalPrice,
      row.packageSnapshot?.finalSellPrice,
      row.packageSnapshot?.basePackageSellPrice,
      row.amount,
      0,
    )),
    currency: row.currency || row.details?.currency || row.financials?.currency || 'INR',
    assignedTo: normalizeAgent(row.assignedTo),
    userId: pickId(row.userId || row.customerId || row.customer || row.user) || null,
    travellers,
    remarks: normalizeRemarks(row),
    services: normalizeServices(row),
    inclusions: firstArray(row.packageSnapshot?.inclusions, row.inclusions, row.details?.inclusions),
    itinerary: firstArray(row.packageSnapshot?.itinerary, row.itinerary),
    contactDetails: row.contactDetails ?? {},
    claimed: normalizeClaimedUnits(row),
    createdAt: row.createdAt?.$date || row.createdAt || null,
    updatedAt: row.updatedAt?.$date || row.updatedAt || null,
    raw: row,
  };
};


export const normalizeDossier = (data = {}, { bookingType = 'package', id = '' } = {}) => {
  const row = normalizeBookingRow(data, { source: 'dossier' });
  const financials = data.financials ?? {};
  const payment = financials.payment ?? data.payment ?? null;
  const cancellation = data.cancellation ?? {};

  return {
    ...row,
    id: row.id || id,
    bookingType: data.bookingType || bookingType,
    masterBookingId: data.masterBookingId ?? '',
    customer: normalizeCustomer(data),
    financials: {
      totalAmount: toNumber(firstOf(financials.totalAmount, data.totalAmount, 0)),
      currency: financials.currency || data.currency || 'INR',
      payment: payment
        ? {
            status: payment.status ?? 'unknown',
            amount: toNumber(payment.amount),
            method: payment.method ?? '',
            gatewayOrderId: payment.gatewayOrderId ?? '',
            gatewayPaymentId: payment.gatewayPaymentId ?? '',
            paidAt: payment.paidAt ?? null,
          }
        : null,
    },
    cancellation: {
      isCancelled: Boolean(cancellation.isCancelled) || String(row.status) === 'cancelled',
      cancelledAt: cancellation.cancelledAt ?? null,
      reason: cancellation.cancellationReason ?? '',
      refundAmount: toNumber(cancellation.refundAmount),
    },
    rawBookingDetails: data.rawBookingDetails ?? null,
    details: data.details ?? null,
  };
};

export const normalizeSummary = (data = {}) => ({
  totalBookings: toNumber(data.totalBookings),
  awaitingOperations: toNumber(data.pendingActions?.awaitingOperations),
  cancellationsCount: toNumber(data.pendingActions?.cancellationsCount),
  confirmed: toNumber(data.byStatus?.confirmed),
  pending: toNumber(data.byStatus?.pending),
  cancelled: toNumber(data.byStatus?.cancelled),
  failed: toNumber(data.byStatus?.failed),
  completed: toNumber(data.byStatus?.completed),
  byType: {
    packages: toNumber(data.byType?.packages),
    offers: toNumber(data.byType?.offers),
    flights: toNumber(data.byType?.flights),
    hotels: toNumber(data.byType?.hotels),
  },
  totalRevenue: toNumber(data.financialSummary?.totalGrossRevenue),
  currency: data.financialSummary?.currency || 'INR',
});



export const normalizePackageOption = (pkg = {}) => {
  const breakdown = Array.isArray(pkg.priceBreakdown) && pkg.priceBreakdown.length
    ? pkg.priceBreakdown
    : (Array.isArray(pkg.offerRefs) ? pkg.offerRefs : []).map((ref) => ({
        id: ref?.offer?._id,
        title: ref?.offer?.title,
        itemType: ref?.offer?.itemType,
        retailPrice: ref?.offer?.sellPrice,
        unitsPerBooking: ref?.unitsPerBooking,
      }));

  const components = breakdown.map((item, index) => ({
    id: pickId(item?.id ?? item?.refId ?? item?._id) || `component-${index}`,
    name: item?.title || item?.name || 'Component',
    type: String(item?.itemType || item?.type || 'other').toLowerCase(),
    units: toNumber(item?.unitsPerBooking ?? item?.units ?? 1),
    retailPrice: toNumber(item?.retailPrice ?? item?.totalRetail ?? 0),
  }));

  return {
    id: pickId(pkg._id ?? pkg.id),
    title: pkg.title || pkg.name || 'Package',
    destination: pkg.destination || '—',
    description: pkg.description || '',
    sellPrice: toNumber(pkg.sellPrice),
    availableSlots: toNumber(pkg.availableSlots),
    isActive: pkg.isActive !== false,
    inclusions: Array.isArray(pkg.inclusions) ? pkg.inclusions : [],
    itinerary: Array.isArray(pkg.itinerary) ? pkg.itinerary : [],
    validity: pkg.validity ?? null,
    components,
    raw: pkg,
  };
};

// The package module list and the master index describe the same bookings
// from different angles (module rows carry the package snapshot, master rows
// carry reference/payment/travel dates). Merge them by id so the operations
// table shows every real column without inventing data.
export const mergeBookingRows = ({ packageRows = [], masterRows = [] } = {}) => {
  const byId = new Map();

  masterRows.forEach((row) => {
    const normalized = normalizeBookingRow(row, { source: 'master' });
    if (normalized.id) byId.set(normalized.id, normalized);
  });

  packageRows.forEach((row) => {
    const normalized = normalizeBookingRow(row, { source: 'package' });
    if (!normalized.id) return;
    const existing = byId.get(normalized.id);
    if (!existing) {
      byId.set(normalized.id, normalized);
      return;
    }
    byId.set(normalized.id, {
      ...existing,
      ...normalized,
      source: 'package',
      bookingNumber: existing.bookingNumber?.startsWith('BK-') ? existing.bookingNumber : normalized.bookingNumber,
      customerName: existing.customerName !== 'Customer' ? existing.customerName : normalized.customerName,
      customerEmail: existing.customerEmail || normalized.customerEmail,
      customerPhone: existing.customerPhone || normalized.customerPhone,
      destination: normalized.destination !== '—' ? normalized.destination : existing.destination,
      packageName: normalized.packageName !== '—' ? normalized.packageName : existing.packageName,
      travelDates: normalized.travelDates.startDate || normalized.travelDates.endDate
        ? normalized.travelDates
        : existing.travelDates,
      paymentStatus: normalized.paymentStatus !== 'unknown' ? normalized.paymentStatus : existing.paymentStatus,
      remarks: normalized.remarks.length ? normalized.remarks : existing.remarks,
      bookingType: 'package',
    });
  });

  return Array.from(byId.values()).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
};


export const dedupeBookings = (rows = []) => {
  const map = new Map();
  rows.forEach((row) => {
    if (!row) return;
    const id = row.id || row._id;
    if (id && !map.has(id)) {
      map.set(id, row);
    }
  });
  return Array.from(map.values());
};

