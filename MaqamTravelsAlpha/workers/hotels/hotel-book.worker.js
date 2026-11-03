'use strict';

/**
 * workers/hotels/hotel-book.worker.js
 * ─────────────────────────────────────────────────────────────────────────────
 * BullMQ Worker for Async Supplier Booking (hotel-book).
 * Performs the actual API call to SRDV, updates database models, and routes outcomes.
 */

const { Worker, Queue } = require('bullmq');
const mongoose = require('mongoose');
const { getBullMQConnection } = require('../../utils/redis');
const { withLock } = require('../../modules/payments/distributedLock');
const HotelBooking = require('../../modules/hotels/hotel.model');
const HotelBookingEvent = require('../../modules/hotels/domain/hotel-booking-event.model');
const SupplierExchange = require('../../modules/hotels/domain/supplier-exchange.model');
const OutboxEvent = require('../../modules/shared/outbox-event.model');
const { HOTEL_BOOKING_STATUS, QUEUES } = require('../../modules/hotels/hotel.constants');
const { getHotelProvider } = require('../../modules/hotels/hotel-provider.factory');
const logger = require('../../utils/logger');
const crypto = require('crypto');

// Setup separate poll queue connection
let _pollQueue = null;
const getPollQueue = () => {
  if (_pollQueue) return _pollQueue;
  try {
    const connection = getBullMQConnection();
    _pollQueue = new Queue(QUEUES.HOTEL_POLL_STATUS, { connection });
    return _pollQueue;
  } catch (err) {
    logger.warn(`[Book Worker] Failed to init poll queue: ${err.message}`);
    return null;
  }
};

/**
 * processSupplierBooking
 * ─────────────────────────────────────────────────────────────────────────────
 * Core business logic for the hotel-book BullMQ worker.
 * Acquires a distributed lock on `hotel-book:{bookingId}` (45-second TTL)
 * to prevent concurrent double-booking race conditions.
 *
 * State machine transitions:
 *   PAYMENT_RECEIVED → CONFIRMING_PROVIDER (on start)
 *   CONFIRMING_PROVIDER → CONFIRMED (supplier success)
 *   CONFIRMING_PROVIDER → PROVIDER_PENDING (supplier pending → enqueues poll job)
 *   CONFIRMING_PROVIDER → PROVIDER_FAILED (supplier failure → initiates refund)
 *
 * Each state transition:
 *   1. Updates HotelBooking.status in a MongoDB transaction.
 *   2. Writes a HotelBookingEvent audit record.
 *   3. Writes to the OutboxEvent collection.
 *   4. On CONFIRMED → calls createOrUpdateMasterBooking for reconciliation.
 *   5. On PROVIDER_FAILED → creates HotelRefund + REFUND_INITIATED outbox event.
 *   6. Logs a SupplierExchange record for every API call.
 *
 * @async
 * @param {string|import('mongoose').Types.ObjectId} bookingId - HotelBooking document ID.
 * @returns {Promise<void>}
 */
const processSupplierBooking = async (bookingId) => {
  const correlationId = `worker-book-${crypto.randomUUID().substring(0, 8)}`;
  
  return withLock(`hotel-book:${bookingId}`, 45000, async () => {
    logger.info(`[Book Worker] [${correlationId}] Starting booking confirmation process for ID: ${bookingId}`);

    const booking = await HotelBooking.findById(bookingId);
    if (!booking) {
      logger.error(`[Book Worker] [${correlationId}] Hotel booking ${bookingId} not found in DB.`);
      return;
    }

    // Guard: ensure booking is in correct state to prevent double bookings
    if (booking.status !== HOTEL_BOOKING_STATUS.PAYMENT_RECEIVED) {
      logger.warn(`[Book Worker] [${correlationId}] Booking ${bookingId} has status ${booking.status} — skipping.`);
      return;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      booking.status = HOTEL_BOOKING_STATUS.CONFIRMING_PROVIDER;
      await booking.save({ session });

      await HotelBookingEvent.create([{
        bookingId: booking._id,
        sequence: 3,
        fromStatus: HOTEL_BOOKING_STATUS.PAYMENT_RECEIVED,
        toStatus: HOTEL_BOOKING_STATUS.CONFIRMING_PROVIDER,
        actor: 'worker',
        reason: 'Async worker began provider call',
        correlationId,
      }], { session });

      await session.commitTransaction();
      session.endSession();
    } catch (dbErr) {
      await session.abortTransaction();
      session.endSession();
      logger.error(`[Book Worker] [${correlationId}] DB transition to confirming failed: ${dbErr.message}`);
      throw dbErr;
    }

    // Call SRDV provider
    const requestedAt = new Date();
    const idempotencyKey = `srdv-book-${booking._id}`;
    let rawResult;
    let errorOccured = false;
    let durationMs = 0;

    try {
      rawResult = await getHotelProvider().book({
        booking: booking.toObject(),
        correlationId,
      });
      durationMs = Date.now() - requestedAt.getTime();
    } catch (apiErr) {
      durationMs = Date.now() - requestedAt.getTime();
      errorOccured = true;
      rawResult = { status: 'failed', failureReason: apiErr.message };
    }

    // Log the raw supplier exchange
    try {
      await SupplierExchange.create({
        provider: 'srdv',
        operation: 'Book',
        correlationId,
        idempotencyKey,
        httpStatus: errorOccured ? 502 : 200,
        normalizedOutcome: rawResult.status,
        requestedAt,
        respondedAt: new Date(),
        durationMs,
        requestPayload: { bookingId: booking._id }, // Keep request payload concise
        responsePayload: rawResult,
      });
    } catch (logErr) {
      logger.error(`[Book Worker] [${correlationId}] Failed to log SupplierExchange: ${logErr.message}`);
    }

    // Handle SRDV outcome routing
    const finalSession = await mongoose.startSession();
    finalSession.startTransaction();

    try {
      const originalStatus = HOTEL_BOOKING_STATUS.CONFIRMING_PROVIDER;
      
      booking.providerRawResponse = rawResult.raw || rawResult;
      booking.providerBookingId = rawResult.providerBookingId;
      booking.bookingRefNo = rawResult.bookingRefNo;
      booking.confirmationNo = rawResult.confirmationNo;
      booking.invoiceNumber = rawResult.invoiceNumber;
      booking.voucherStatus = rawResult.voucherStatus;

      if (rawResult.status === 'confirmed') {
        booking.status = HOTEL_BOOKING_STATUS.CONFIRMED;
        await booking.save({ session: finalSession });

        // Audit confirmed
        await HotelBookingEvent.create([{
          bookingId: booking._id,
          sequence: 4,
          fromStatus: originalStatus,
          toStatus: HOTEL_BOOKING_STATUS.CONFIRMED,
          actor: 'worker',
          reason: 'Supplier successfully confirmed booking.',
          correlationId,
        }], { session: finalSession });

        // Trigger Master Booking update/reconciliation
        const { createOrUpdateMasterBooking } = require('../../modules/payments/bookingSync');
        const mockPaymentDoc = { _id: booking.paymentId, userId: booking.userId, bookingType: 'hotel', currency: booking.currency, amount: booking.totalPrice };
        await createOrUpdateMasterBooking(mockPaymentDoc, booking, finalSession);

        // Outbox BOOKING_CONFIRMED
        await OutboxEvent.create([{
          aggregateType: 'HotelBooking',
          aggregateId: booking._id,
          eventType: 'BOOKING_CONFIRMED',
          payload: { bookingId: booking._id, confirmationNo: booking.confirmationNo },
        }], { session: finalSession });

        logger.info(`[Book Worker] [${correlationId}] Booking ${booking._id} confirmed successfully.`);
      } 
      else if (rawResult.status === 'pending') {
        booking.status = HOTEL_BOOKING_STATUS.PROVIDER_PENDING;
        await booking.save({ session: finalSession });

        await HotelBookingEvent.create([{
          bookingId: booking._id,
          sequence: 4,
          fromStatus: originalStatus,
          toStatus: HOTEL_BOOKING_STATUS.PROVIDER_PENDING,
          actor: 'worker',
          reason: 'Supplier booking is pending.',
          correlationId,
        }], { session: finalSession });

        // Outbox BOOKING_PENDING
        await OutboxEvent.create([{
          aggregateType: 'HotelBooking',
          aggregateId: booking._id,
          eventType: 'BOOKING_PENDING',
          payload: { bookingId: booking._id },
        }], { session: finalSession });

        // Enqueue Poller job (hotel-poll-status worker) in 5 minutes
        try {
          const pollQueue = getPollQueue();
          if (pollQueue) {
            const pollJobId = `hotel-poll-${booking._id}-1`;
            await pollQueue.add(
              'poll',
              { bookingId: booking._id, attempt: 1 },
              { jobId: pollJobId, delay: 5 * 60 * 1000 } // 5 minutes delay
            );
            logger.info(`[Book Worker] [${correlationId}] Enqueued pending status polling job.`);
          }
        } catch (pollErr) {
          logger.warn(`[Book Worker] [${correlationId}] Could not enqueue poll job: ${pollErr.message}`);
        }
      } 
      else {
        // BOOKING FAILED
        booking.status = HOTEL_BOOKING_STATUS.PROVIDER_FAILED;
        booking.failureReason = rawResult.failureReason || 'Supplier booking failed.';
        await booking.save({ session: finalSession });

        const Booking = require('../../modules/bookings/booking.model');
        const { BOOKING_STATUS } = require('../../config/constants');
        await Booking.updateOne(
          { itemId: booking._id, bookingType: 'hotel' },
          { $set: { status: BOOKING_STATUS.FAILED } },
          { session: finalSession }
        );

        await HotelBookingEvent.create([{
          bookingId: booking._id,
          sequence: 4,
          fromStatus: originalStatus,
          toStatus: HOTEL_BOOKING_STATUS.PROVIDER_FAILED,
          actor: 'worker',
          reason: `Supplier booking failed: ${booking.failureReason}`,
          correlationId,
        }], { session: finalSession });

        // Outbox BOOKING_FAILED
        await OutboxEvent.create([{
          aggregateType: 'HotelBooking',
          aggregateId: booking._id,
          eventType: 'BOOKING_FAILED',
          payload: { bookingId: booking._id, reason: booking.failureReason },
        }], { session: finalSession });

        // Create HotelRefund record directly in finalSession
        const HotelRefund = require('../../modules/hotels/domain/hotel-refund.model');
        const refundIdempotencyKey = crypto.randomUUID();
        await HotelRefund.create([{
          bookingId: booking._id,
          paymentId: booking.paymentId,
          idempotencyKey: refundIdempotencyKey,
          status: 'pending',
          customerAmountMinor: booking.customerTotalMinor,
          currency: booking.currency,
          reason: `Booking failed due to supplier rejection: ${booking.failureReason}`,
        }], { session: finalSession });

        // Outbox: REFUND_INITIATED
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
        }], { session: finalSession });

        logger.error(`[Book Worker] [${correlationId}] Booking ${booking._id} failed with supplier. Refund initialized.`);
      }

      await finalSession.commitTransaction();
      finalSession.endSession();
    } catch (finalErr) {
      await finalSession.abortTransaction();
      finalSession.endSession();
      logger.error(`[Book Worker] [${correlationId}] Final routing commit failed: ${finalErr.message}`);
      throw finalErr;
    }
  });
};

/**
 * initWorker
 * ─────────────────────────────────────────────────────────────────────────────
 * Initialises the BullMQ Worker listening on the `hotel-book` queue.
 * No-op (returns null) when REDIS_URL is not configured.
 * Worker concurrency is set to 5 (five concurrent booking jobs).
 *
 * @returns {import('bullmq').Worker|null} Active BullMQ Worker instance, or null.
 */
const initWorker = () => {
  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn('[Book Worker] REDIS_URL not configured. Async BullMQ worker is disabled.');
    return null;
  }

  const connection = getBullMQConnection();
  const worker = new Worker(QUEUES.HOTEL_BOOK, async (job) => {
    await processSupplierBooking(job.data.bookingId);
  }, { connection, concurrency: 5 });

  worker.on('completed', (job) => logger.info(`[Book Worker] Job ${job.id} completed.`));
  worker.on('failed', (job, err) => logger.error(`[Book Worker] Job ${job.id} failed: ${err.message}`));

  return worker;
};

module.exports = { processSupplierBooking, initWorker };
