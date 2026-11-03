'use strict';

/**
 * workers/hotels/hotel-poll-status.worker.js
 * ─────────────────────────────────────────────────────────────────────────────
 * BullMQ Worker for Polling Pending Supplier Booking (hotel-poll-status).
 * Bounded retries: 5 min -> 10 min -> 20 min -> 30 min.
 */

const { Worker, Queue } = require('bullmq');
const mongoose = require('mongoose');
const { getBullMQConnection } = require('../../utils/redis');
const HotelBooking = require('../../modules/hotels/hotel.model');
const HotelBookingEvent = require('../../modules/hotels/domain/hotel-booking-event.model');
const SupplierExchange = require('../../modules/hotels/domain/supplier-exchange.model');
const OutboxEvent = require('../../modules/shared/outbox-event.model');
const { HOTEL_BOOKING_STATUS, QUEUES } = require('../../modules/hotels/hotel.constants');
const { getHotelProvider } = require('../../modules/hotels/hotel-provider.factory');
const logger = require('../../utils/logger');
const crypto = require('crypto');

// Retry backoff delay mapping: index is (attempt - 1)
const RETRY_DELAY_MS = [
  5 * 60 * 1000,   // Attempt 1 -> 2: 5 min
  10 * 60 * 1000,  // Attempt 2 -> 3: 10 min
  20 * 60 * 1000,  // Attempt 3 -> 4: 20 min
  30 * 60 * 1000,  // Attempt 4 -> 5: 30 min
];
const MAX_POLLING_ATTEMPTS = 5;

let _pollQueue = null;
const getPollQueue = () => {
  if (_pollQueue) return _pollQueue;
  const connection = getBullMQConnection();
  _pollQueue = new Queue(QUEUES.HOTEL_POLL_STATUS, { connection });
  return _pollQueue;
};

/**
 * pollPendingBookingStatus
 * ─────────────────────────────────────────────────────────────────────────────
 * Polls SRDV HotelBookingDetail to reconcile a PROVIDER_PENDING booking.
 * Called by the `hotel-poll-status` BullMQ queue at progressive backoff intervals:
 *   Attempt 1 → 2: 5 min delay
 *   Attempt 2 → 3: 10 min delay
 *   Attempt 3 → 4: 20 min delay
 *   Attempt 4 → 5: 30 min delay
 *   Attempt 5: SLA breach — sets nextActionAt +1 hour for manual ops review.
 *
 * Outcome routing:
 *   confirmed → Sets CONFIRMED, triggers createOrUpdateMasterBooking, OutboxEvent.
 *   failed    → Sets PROVIDER_FAILED, creates HotelRefund + REFUND_INITIATED outbox event.
 *   pending   → Enqueues next attempt (if under MAX_POLLING_ATTEMPTS=5); else SLA breach.
 *
 * Also logs a SupplierExchange record for every API call.
 *
 * @async
 * @param {string|import('mongoose').Types.ObjectId} bookingId - HotelBooking document ID.
 * @param {number} [attempt=1] - Current polling attempt number (1-indexed).
 * @returns {Promise<void>}
 */
const pollPendingBookingStatus = async (bookingId, attempt = 1) => {
  const correlationId = `worker-poll-${crypto.randomUUID().substring(0, 8)}`;
  logger.info(`[Poll Worker] [${correlationId}] Polling status for booking ID: ${bookingId}. Attempt: ${attempt}`);

  const booking = await HotelBooking.findById(bookingId);
  if (!booking) {
    logger.error(`[Poll Worker] [${correlationId}] Booking ${bookingId} not found.`);
    return;
  }

  if (booking.status !== HOTEL_BOOKING_STATUS.PROVIDER_PENDING) {
    logger.warn(`[Poll Worker] [${correlationId}] Booking ${bookingId} has status ${booking.status} — polling aborted.`);
    return;
  }

  const requestedAt = new Date();
  let rawResult;
  let errorOccured = false;
  let durationMs = 0;

  try {
    rawResult = await getHotelProvider().getBookingStatus({
      providerBookingId: booking.providerBookingId,
      bookingRefNo: booking.bookingRefNo,
      correlationId,
    });
    durationMs = Date.now() - requestedAt.getTime();
  } catch (apiErr) {
    durationMs = Date.now() - requestedAt.getTime();
    errorOccured = true;
    rawResult = { status: 'pending', failureReason: apiErr.message };
  }

  // Log Supplier Exchange
  try {
    await SupplierExchange.create({
      provider: 'srdv',
      operation: 'HotelBookingDetail',
      correlationId,
      idempotencyKey: `srdv-poll-${booking._id}-${attempt}`,
      httpStatus: errorOccured ? 502 : 200,
      normalizedOutcome: rawResult.status,
      requestedAt,
      respondedAt: new Date(),
      durationMs,
      requestPayload: { providerBookingId: booking.providerBookingId },
      responsePayload: rawResult,
    });
  } catch (logErr) {
    logger.error(`[Poll Worker] [${correlationId}] Failed to log SupplierExchange: ${logErr.message}`);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const originalStatus = booking.status;
    booking.providerRawResponse = {
      ...booking.providerRawResponse,
      pollStatus: rawResult.raw || rawResult,
    };

    if (rawResult.status === 'confirmed') {
      booking.status = HOTEL_BOOKING_STATUS.CONFIRMED;
      booking.confirmationNo = rawResult.confirmationNo || booking.confirmationNo;
      booking.voucherStatus = rawResult.voucherStatus;
      await booking.save({ session });

      await HotelBookingEvent.create([{
        bookingId: booking._id,
        sequence: 4 + attempt,
        fromStatus: originalStatus,
        toStatus: HOTEL_BOOKING_STATUS.CONFIRMED,
        actor: 'worker',
        reason: `Polling confirmed booking. Attempt ${attempt}.`,
        correlationId,
      }], { session });

      // Trigger Master Booking confirmation
      const { createOrUpdateMasterBooking } = require('../../modules/payments/bookingSync');
      const mockPaymentDoc = { _id: booking.paymentId, userId: booking.userId, bookingType: 'hotel', currency: booking.currency, amount: booking.totalPrice };
      await createOrUpdateMasterBooking(mockPaymentDoc, booking, session);

      // Outbox BOOKING_CONFIRMED
      await OutboxEvent.create([{
        aggregateType: 'HotelBooking',
        aggregateId: booking._id,
        eventType: 'BOOKING_CONFIRMED',
        payload: { bookingId: booking._id, confirmationNo: booking.confirmationNo },
      }], { session });

      await session.commitTransaction();
      session.endSession();
      logger.info(`[Poll Worker] [${correlationId}] Pending booking ${booking._id} confirmed on attempt ${attempt}.`);
    } 
    else if (rawResult.status === 'failed') {
      booking.status = HOTEL_BOOKING_STATUS.PROVIDER_FAILED;
      booking.failureReason = rawResult.failureReason || 'Supplier booking was rejected.';
      await booking.save({ session });

      const Booking = require('../../modules/bookings/booking.model');
      const { BOOKING_STATUS } = require('../../config/constants');
      await Booking.updateOne(
        { itemId: booking._id, bookingType: 'hotel' },
        { $set: { status: BOOKING_STATUS.FAILED } },
        { session }
      );

      await HotelBookingEvent.create([{
        bookingId: booking._id,
        sequence: 4 + attempt,
        fromStatus: originalStatus,
        toStatus: HOTEL_BOOKING_STATUS.PROVIDER_FAILED,
        actor: 'worker',
        reason: `Polling marked booking failed: ${booking.failureReason}. Attempt ${attempt}.`,
        correlationId,
      }], { session });

      // Outbox BOOKING_FAILED
      await OutboxEvent.create([{
        aggregateType: 'HotelBooking',
        aggregateId: booking._id,
        eventType: 'BOOKING_FAILED',
        payload: { bookingId: booking._id, reason: booking.failureReason },
      }], { session });

      // Create Refund
      const HotelRefund = require('../../modules/hotels/domain/hotel-refund.model');
      const refundIdempotencyKey = crypto.randomUUID();
      await HotelRefund.create([{
        bookingId: booking._id,
        paymentId: booking.paymentId,
        idempotencyKey: refundIdempotencyKey,
        status: 'pending',
        customerAmountMinor: booking.customerTotalMinor,
        currency: booking.currency,
        reason: `Pending booking failed on poll check: ${booking.failureReason}`,
      }], { session });

      // Outbox REFUND_INITIATED
      await OutboxEvent.create([{
        aggregateType: 'HotelBooking',
        aggregateId: booking._id,
        eventType: 'REFUND_INITIATED',
        payload: {
          bookingId: booking._id,
          paymentId: booking.paymentId,
          refundAmountMinor: booking.customerTotalMinor,
          idempotencyKey: refundIdempotencyKey,
        },
      }], { session });

      await session.commitTransaction();
      session.endSession();
      logger.error(`[Poll Worker] [${correlationId}] Pending booking ${booking._id} failed check on attempt ${attempt}. Refund initiated.`);
    } 
    else {
      // STILL PENDING
      await session.commitTransaction();
      session.endSession();

      if (attempt < MAX_POLLING_ATTEMPTS) {
        // Enqueue next polling job with progressive backoff delay
        const nextAttempt = attempt + 1;
        const delay = RETRY_DELAY_MS[attempt - 1] || 15 * 60 * 1000;
        
        const pollQueue = getPollQueue();
        if (pollQueue) {
          const pollJobId = `hotel-poll-${booking._id}-${nextAttempt}`;
          await pollQueue.add(
            'poll',
            { bookingId: booking._id, attempt: nextAttempt },
            { jobId: pollJobId, delay }
          );
          logger.info(`[Poll Worker] [${correlationId}] Booking ${booking._id} still pending. Scheduled attempt ${nextAttempt} in ${delay / 1000}s.`);
        }
      } else {
        // Exhausted max attempts -> alert operations for manual review
        logger.error(`[Poll Worker] [${correlationId}] Booking ${booking._id} remained pending after ${MAX_POLLING_ATTEMPTS} attempts. Manual review required.`);
        
        // Mark next action for manual monitoring
        booking.nextActionAt = new Date(Date.now() + 60 * 60 * 1000); // Check again in 1 hour
        await booking.save();

        await HotelBookingEvent.create({
          bookingId: booking._id,
          sequence: 4 + attempt,
          fromStatus: originalStatus,
          toStatus: HOTEL_BOOKING_STATUS.PROVIDER_PENDING,
          actor: 'worker',
          reason: `SLA Breached: Polling reached max attempts ${MAX_POLLING_ATTEMPTS} but booking is still pending with supplier.`,
          correlationId,
        });
      }
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error(`[Poll Worker] [${correlationId}] Transaction aborted during status poll: ${error.message}`);
    throw error;
  }
};

/**
 * initWorker
 * ─────────────────────────────────────────────────────────────────────────────
 * Initialises the BullMQ Worker listening on the `hotel-poll-status` queue.
 * No-op (returns null) when REDIS_URL is not configured.
 * Worker concurrency is set to 5.
 *
 * @returns {import('bullmq').Worker|null} Active BullMQ Worker instance, or null.
 */
const initWorker = () => {
  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn('[Poll Worker] REDIS_URL not configured. Async BullMQ worker is disabled.');
    return null;
  }

  const connection = getBullMQConnection();
  const worker = new Worker(QUEUES.HOTEL_POLL_STATUS, async (job) => {
    await pollPendingBookingStatus(job.data.bookingId, job.data.attempt);
  }, { connection, concurrency: 5 });

  worker.on('completed', (job) => logger.info(`[Poll Worker] Job ${job.id} completed.`));
  worker.on('failed', (job, err) => logger.error(`[Poll Worker] Job ${job.id} failed: ${err.message}`));

  return worker;
};

module.exports = { pollPendingBookingStatus, initWorker };
