const ROLES = { CUSTOMER: 'customer', SALES_AGENT: 'sales_agent', SUPPORT_AGENT: 'support_agent', FINANCE: 'finance', ADMIN: 'admin', SUPER_ADMIN: 'super_admin' };
const BOOKING_TYPES = { HOTEL: 'hotel', FLIGHT: 'flight', PACKAGE: 'package',OFFER: 'offer' };
const BOOKING_STATUS = { PENDING: 'pending', CONFIRMED: 'confirmed', CANCELLED: 'cancelled', COMPLETED: 'completed', FAILED: 'failed' };
const PAYMENT_STATUS = {
  CREATED: 'created', PENDING: 'pending', AUTHORIZED: 'authorized', CAPTURED: 'captured', PAID: 'paid',
  PARTIALLY_REFUNDED: 'partially_refunded', REFUNDED: 'refunded', FAILED: 'failed', EXPIRED: 'expired',
  CANCELLED: 'cancelled', CHARGEBACK: 'chargeback', DISPUTED: 'disputed',
};
const LEAD_STATUS = { NEW: 'new', CONTACTED: 'contacted', INTERESTED: 'interested', QUOTED: 'quoted', CONVERTED: 'converted', LOST: 'lost', NURTURE: 'nurture' };
const TICKET_STATUS = { OPEN: 'open', IN_PROGRESS: 'in_progress', RESOLVED: 'resolved', CLOSED: 'closed' };
const PAGINATION = { DEFAULT_PAGE: 1, DEFAULT_LIMIT: 10, MAX_LIMIT: 100 };

module.exports = { ROLES, BOOKING_TYPES, BOOKING_STATUS, PAYMENT_STATUS, LEAD_STATUS, TICKET_STATUS, PAGINATION };

