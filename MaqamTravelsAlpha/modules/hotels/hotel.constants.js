const HOTEL_BOOKING_STATUS = {
  AWAITING_PAYMENT: 'awaiting_payment',
  PAYMENT_RECEIVED: 'payment_received',
  CONFIRMING_PROVIDER: 'confirming_provider',
  CONFIRMED: 'confirmed',
  PROVIDER_PENDING: 'provider_pending',
  PROVIDER_FAILED: 'provider_failed',
  CANCELLATION_REQUESTED: 'cancellation_requested',
  CANCELLED: 'cancelled',
  PAYMENT_FAILED: 'payment_failed',
  REFUND_PENDING: 'refund_pending',
  REFUNDED: 'refunded',
  COMPLETED: 'completed',
};

const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const RECHECK_CACHE_TTL_MS = 3 * 60 * 1000;

const QUEUES = {
  HOTEL_BOOK: 'hotel-book',
  HOTEL_POLL_STATUS: 'hotel-poll-status',
  HOTEL_CANCEL: 'hotel-cancel',
};

module.exports = { HOTEL_BOOKING_STATUS, SEARCH_CACHE_TTL_MS, RECHECK_CACHE_TTL_MS, QUEUES };
