'use strict';

/**
 * modules/flights/flight.constants.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Flight Module Constants (Statuses, Queue Names, Retry Limits).
 */

const FLIGHT_BOOKING_STATUS = Object.freeze({
  INITIATED: 'initiated',
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
  ABORTED: 'aborted',
});

const FLIGHT_QUEUES = Object.freeze({
  FLIGHT_TICKET_GDS: 'flight-ticket-gds',
});

module.exports = {
  FLIGHT_BOOKING_STATUS,
  FLIGHT_QUEUES,
};
