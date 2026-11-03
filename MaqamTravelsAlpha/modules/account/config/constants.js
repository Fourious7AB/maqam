// ─── User Roles ───────────────────────────────────────────
const ROLES = {
  CUSTOMER:      'customer',
  SALES_AGENT:   'sales_agent',
  SUPPORT_AGENT: 'support_agent',
  FINANCE:       'finance',
  ADMIN:         'admin',
  SUPER_ADMIN:   'super_admin',
};

// ─── Booking Types ────────────────────────────────────────
const BOOKING_TYPES = {
  HOTEL:   'hotel',
  FLIGHT:  'flight',
  PACKAGE: 'package',
};

// ─── Booking Statuses ─────────────────────────────────────
const BOOKING_STATUS = {
  PENDING:   'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  FAILED:    'failed',
};

// ─── Payment Statuses ─────────────────────────────────────
const PAYMENT_STATUS = {
  CREATED: 'created',
  PENDING: 'pending',
  AUTHORIZED: 'authorized',
  CAPTURED: 'captured',
  PAID: 'paid',
  PARTIALLY_REFUNDED: 'partially_refunded',
  REFUNDED: 'refunded',
  FAILED: 'failed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  CHARGEBACK: 'chargeback',
  DISPUTED: 'disputed',
};

// ─── Lead Statuses (CRM) ──────────────────────────────────
const LEAD_STATUS = {
  NEW:        'new',
  CONTACTED:  'contacted',
  INTERESTED: 'interested',
  QUOTED:     'quoted',
  CONVERTED:  'converted',  // became a booking
  LOST:       'lost',
  NURTURE:    'nurture',    // follow up later
};

// ─── Support Ticket Statuses ──────────────────────────────
const TICKET_STATUS = {
  OPEN:        'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED:    'resolved',
  CLOSED:      'closed',
};

// ─── Pagination defaults ──────────────────────────────────
const PAGINATION = {
  DEFAULT_PAGE:  1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT:     100,
};

module.exports = {
  ROLES,
  BOOKING_TYPES,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  LEAD_STATUS,
  TICKET_STATUS,
  PAGINATION,
};
