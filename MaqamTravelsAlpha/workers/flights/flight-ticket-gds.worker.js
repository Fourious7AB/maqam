'use strict';

/**
 * workers/flights/flight-ticket-gds.worker.js
 * ─────────────────────────────────────────────────────────────────────────────
 * BullMQ Worker for Async GDS Flight Ticketing (flight-ticket-gds).
 * Performs POST /TicketGDS to issue live e-tickets after payment capture,
 * updates flight and master booking models, and logs Outbox events.
 */

const { Worker, Queue } = require('bullmq');
const mongoose = require('mongoose');
const { getBullMQConnection } = require('../../utils/redis');
const { withLock } = require('../../modules/payments/distributedLock');
const FlightBooking = require('../../modules/flights/flight.model');
const OutboxEvent = require('../../modules/shared/outbox-event.model');
const Payment = require('../../modules/payments/payment.model');
const { FLIGHT_QUEUES, FLIGHT_BOOKING_STATUS } = require('../../modules/flights/flight.constants');
const srdvAdapter = require('../../providers/srdv/srdv.adapter');
const { createOrUpdateMasterBooking } = require('../../modules/payments/bookingSync');
const logger = require('../../utils/logger');
const crypto = require('crypto');

let _flightGDSQueue = null;

/**
 * Returns a singleton Queue instance for enqueuing GDS ticketing jobs.
 * @returns {import('bullmq').Queue|null}
 */
const getFlightGDSQueue = () => {
  if (_flightGDSQueue) return _flightGDSQueue;
  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    const connection = getBullMQConnection();
    _flightGDSQueue = new Queue(FLIGHT_QUEUES.FLIGHT_TICKET_GDS, { connection });
    return _flightGDSQueue;
  } catch (err) {
    logger.warn(`[Flight GDS Worker] Could not initialize BullMQ queue: ${err.message}`);
    return null;
  }
};

/**
 * processGDSTicketing
 * ─────────────────────────────────────────────────────────────────────────────
 * Core business logic for issuing GDS e-tickets after payment.
 * Acquires a distributed lock on `flight-ticket-gds:${bookingId}` (45-second TTL)
 * to prevent duplicate ticketing requests.
 *
 * @async
 * @param {string|import('mongoose').Types.ObjectId} bookingId - FlightBooking document ID.
 * @returns {Promise<import('mongoose').Document|null>}
 */
const processGDSTicketing = async (bookingId) => {
  const correlationId = `gds-ticket-${crypto.randomUUID().substring(0, 8)}`;

  return withLock(`flight-ticket-gds:${bookingId}`, 45000, async () => {
    logger.info(`[Flight GDS Worker] [${correlationId}] Starting GDS ticketing for booking ID: ${bookingId}`);

    const flightBooking = await FlightBooking.findById(bookingId);
    if (!flightBooking) {
      logger.error(`[Flight GDS Worker] [${correlationId}] FlightBooking ${bookingId} not found in DB.`);
      return null;
    }

    // Guard: already confirmed (idempotency)
    if (flightBooking.status === FLIGHT_BOOKING_STATUS.CONFIRMED) {
      logger.info(`[Flight GDS Worker] [${correlationId}] Booking ${bookingId} is already confirmed — skipping.`);
      return flightBooking;
    }

    // Guard: LCC bookings do not use TicketGDS
    if (flightBooking.isLCC) {
      logger.info(`[Flight GDS Worker] [${correlationId}] Booking ${bookingId} is LCC — skipping TicketGDS.`);
      return flightBooking;
    }

    // Guard: check lastTicketDate expiry
    if (flightBooking.lastTicketDate && new Date() > new Date(flightBooking.lastTicketDate)) {
      logger.error(`[Flight GDS Worker] [${correlationId}] Hold expired for booking ${bookingId} (lastTicketDate passed).`);
      flightBooking.status = FLIGHT_BOOKING_STATUS.FAILED;
      flightBooking.remark = 'Hold expired before ticketing (lastTicketDate passed)';
      await flightBooking.save();

      await OutboxEvent.create([{
        aggregateType: 'FlightBooking',
        aggregateId: flightBooking._id,
        eventType: 'TICKET_GDS_EXPIRED',
        payload: { bookingId: flightBooking._id, lastTicketDate: flightBooking.lastTicketDate },
      }]);

      return flightBooking;
    }

    try {
      // Execute TicketGDS via SRDV adapter
      const result = await srdvAdapter.ticketGDSAdapter({
        srdvType: flightBooking.srdvType,
        traceId: flightBooking.traceId,
        srdvIndex: flightBooking.srdvIndex,
        resultIndex: flightBooking.resultIndex,
        pnr: flightBooking.pnr,
        bookingId: flightBooking.srdvBookingId,
      });

      // Update FlightBooking with confirmed e-ticket data
      flightBooking.set({
        ticketStatus: result.ticketStatus,
        invoiceNo: result.invoiceNo,
        invoiceStatus: result.invoiceStatus,
        eTicketData: result.eTicketData,
        status: FLIGHT_BOOKING_STATUS.CONFIRMED,
      });

      if (Array.isArray(flightBooking.passengers) && Array.isArray(result.passengers)) {
        flightBooking.passengers = flightBooking.passengers.map((p, i) => ({
          ...p.toObject(),
          ticketNumber: result.passengers[i]?.ticketNumber || p.ticketNumber,
          ticketId: result.passengers[i]?.ticketId || p.ticketId,
          ticketIssueDate: result.passengers[i]?.ticketIssueDate || p.ticketIssueDate,
          ticketStatus: result.passengers[i]?.ticketStatus || p.ticketStatus,
        }));
      }

      await flightBooking.save();

      // Update Master Booking record for customer dashboard
      if (flightBooking.paymentId) {
        const payment = await Payment.findById(flightBooking.paymentId);
        if (payment) {
          await createOrUpdateMasterBooking(payment, flightBooking);
        }
      }

      // Record successful OutboxEvent
      await OutboxEvent.create([{
        aggregateType: 'FlightBooking',
        aggregateId: flightBooking._id,
        eventType: 'TICKET_GDS_SUCCESS',
        payload: {
          bookingId: flightBooking._id,
          pnr: flightBooking.pnr,
          ticketStatus: result.ticketStatus,
          invoiceNo: result.invoiceNo,
        },
      }]);

      logger.info(`[Flight GDS Worker] [${correlationId}] Booking ${bookingId} successfully ticketed with PNR ${flightBooking.pnr}.`);
      return flightBooking;
    } catch (err) {
      logger.error(`[Flight GDS Worker] [${correlationId}] TicketGDS failed for booking ${bookingId}: ${err.message}`);
      
      await OutboxEvent.create([{
        aggregateType: 'FlightBooking',
        aggregateId: flightBooking._id,
        eventType: 'TICKET_GDS_FAILED_ATTEMPT',
        payload: {
          bookingId: flightBooking._id,
          error: err.message,
        },
      }]);

      throw err; // Rethrow so BullMQ triggers automatic exponential retry
    }
  });
};

/**
 * initWorker
 * ─────────────────────────────────────────────────────────────────────────────
 * Initialises the BullMQ Worker listening on the `flight-ticket-gds` queue.
 * Concurrency is set to 5 parallel ticketing jobs.
 *
 * @returns {import('bullmq').Worker|null} Active BullMQ Worker instance, or null.
 */
const initWorker = () => {
  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn('[Flight GDS Worker] REDIS_URL not configured. Async BullMQ flight worker is disabled.');
    return null;
  }

  const connection = getBullMQConnection();
  const worker = new Worker(FLIGHT_QUEUES.FLIGHT_TICKET_GDS, async (job) => {
    await processGDSTicketing(job.data.bookingId);
  }, { connection, concurrency: 5 });

  worker.on('completed', (job) => logger.info(`[Flight GDS Worker] Job ${job.id} completed.`));
  worker.on('failed', (job, err) => logger.error(`[Flight GDS Worker] Job ${job.id} failed: ${err.message}`));

  return worker;
};

module.exports = {
  processGDSTicketing,
  initWorker,
  getFlightGDSQueue,
};
