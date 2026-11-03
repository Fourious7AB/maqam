'use strict';

/**
 * modules/hotels/application/hotel-booking.usecase.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Clean Architecture Booking Use-cases for Hotels.
 * Handles Booking Creation, Outbox Events, and Async Payment Confirmation.
 */

const mongoose = require('mongoose');
const cache = require('../../../utils/cache');
const { AppError } = require('../../../middleware/errorHandler');
const HotelBooking = require('../hotel.model');
const HotelBookingEvent = require('../domain/hotel-booking-event.model');
const OutboxEvent = require('../../../modules/shared/outbox-event.model');
const { HOTEL_BOOKING_STATUS, QUEUES } = require('../hotel.constants');
const Booking = require('../../bookings/booking.model');
const { BOOKING_TYPES, BOOKING_STATUS } = require('../../../config/constants');
const logger = require('../../../utils/logger');

// Queue instance placeholder (wired up in the worker/init step)
let _hotelQueue = null;

const getQueue = () => {
  if (_hotelQueue) return _hotelQueue;
  const { Queue } = require('bullmq');
  const { getBullMQConnection } = require('../../../utils/redis');

  try {
    const connection = getBullMQConnection();
    _hotelQueue = new Queue(QUEUES.HOTEL_BOOK, { connection });
    logger.info('[BullMQ] Hotel booking queue initialized.');
    return _hotelQueue;
  } catch (err) {
    logger.error(`[BullMQ] Failed to initialize hotel booking queue: ${err.message}`);
    return null;
  }
};

/**
 * createBooking
 * ─────────────────────────────────────────────────────────────────────────────
 * Atomically consumes the single-use recheckId from Redis and creates a
 * HotelBooking record in AWAITING_PAYMENT status.
 *
 * Idempotency behaviour:
 *   If the recheckId is no longer in Redis (already consumed), it checks whether
 *   a booking for the same userId+recheckId already exists and returns it. This
 *   handles webhook retries and duplicate network requests.
 *
 * MongoDB transaction scope:
 *   - Creates `HotelBooking` document.
 *   - Creates `HotelBookingEvent` (sequence=1, awaiting_payment audit).
 *   - Creates `OutboxEvent` (BOOKING_CREATED).
 *
 * @async
 * @param {object} params
 * @param {import('mongoose').Types.ObjectId} params.userId - Authenticated user ID.
 * @param {string} params.recheckId - Single-use UUID from the recheck cache.
 * @param {object[]} params.guests - Guest passenger details array.
 * @param {boolean} [params.acceptChanges=false] - Must be true if price/policy changed.
 * @param {string} [params.idempotencyKey] - Optional idempotency key for dedup.
 * @param {string} [params.correlationId] - Correlation ID for distributed tracing.
 * @returns {Promise<import('mongoose').Document>} Created HotelBooking document.
 * @throws {AppError} 410 if recheckId is expired and no existing booking found.
 * @throws {AppError} 409 if price/policy changed and acceptChanges is falsy.
 */
const createBooking = async ({ userId, recheckId, guests, acceptChanges }) => {
  // 1. Atomically consume recheckId from Redis (single-use token enforcement)
  const recheck = await cache.consume(`hotel:recheck:${recheckId}`);
  if (!recheck) {
    // Check if booking already exists for this recheckId (idempotency check)
    const existing = await HotelBooking.findOne({ userId, recheckId });
    if (existing) {
      return existing;
    }
    throw new AppError('Booking quote expired or already processed. Please recheck and try again.', 410);
  }

  const { providerResult, searchSession, hotelId, sellingQuote } = recheck;

  // 2. Validate price/policy changes approval
  if ((providerResult.priceChanged || providerResult.policyChanged) && !acceptChanges) {
    throw new AppError('Price or cancellation policy has changed. Please confirm and accept the new terms.', 409);
  }

  // 3. Perform database operations in transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find SrdvIndex & ResultIndex for mapping Book request later
    const cachedHotel =
      (searchSession.hotels || []).find(
        (h) =>
          String(h.HotelCode || h.hotelCode || h.id) === String(hotelId) ||
          String(h.id) === String(hotelId)
      ) || {};

    const bookingData = {
      userId,
      provider: 'srdv',
      status: HOTEL_BOOKING_STATUS.AWAITING_PAYMENT,
      searchId: recheck.searchId,
      recheckId,
      traceId: providerResult._raw?.TraceId || providerResult.providerReference || searchSession.traceId,
      srdvType: searchSession.srdvType,
      srdvIndex: cachedHotel.SrdvIndex || cachedHotel.srdvIndex || 1,
      resultIndex: cachedHotel.ResultIndex || cachedHotel.resultIndex || 0,
      srdvHotelId: hotelId,
      hotelName: providerResult.hotel.name,
      destination: providerResult.hotel.address,
      checkIn: searchSession.criteria.checkIn,
      checkOut: searchSession.criteria.checkOut,
      hotelSnapshot: providerResult.hotel,
      roomSnapshots: providerResult.roomSnapshots,
      guests,
      priceSnapshot: sellingQuote,
      cancellationPolicySnapshot: providerResult.cancellationPolicy,
      totalPrice: sellingQuote.customerTotalMinor / 100, // major unit for backward compat
      currency: sellingQuote.currency,

      // Minor units
      supplierAmountMinor: sellingQuote.supplierAmountMinor,
      customerTotalMinor: sellingQuote.customerTotalMinor,
      markupMinor: sellingQuote.markupMinor,
      feeMinor: sellingQuote.feeMinor,
      pricingVersion: sellingQuote.pricingVersion,
    };

    const [booking] = await HotelBooking.create([bookingData], { session });

    // Create Master Booking (status: pending) for CRM pipeline & unified user dashboard
    await Booking.create([{
      userId,
      bookingType: BOOKING_TYPES.HOTEL,
      itemId: booking._id,
      details: {
        destination: booking.destination ? `${booking.hotelName}, ${booking.destination}` : booking.hotelName,
        departureDate: booking.checkIn,
        returnDate: booking.checkOut,
        totalPrice: booking.totalPrice,
        currency: booking.currency,
        passengers: Array.isArray(booking.guests) ? booking.guests.length : 1,
      },
      status: BOOKING_STATUS.PENDING,
    }], { session });

    // Sequence 1: awaiting_payment audit event
    await HotelBookingEvent.create([{
      bookingId: booking._id,
      sequence: 1,
      fromStatus: 'none',
      toStatus: HOTEL_BOOKING_STATUS.AWAITING_PAYMENT,
      actor: 'user',
      reason: 'Booking initiated by customer',
      correlationId: searchSession.traceId,
    }], { session });

    // Write to Transactional Outbox
    await OutboxEvent.create([{
      aggregateType: 'HotelBooking',
      aggregateId: booking._id,
      eventType: 'BOOKING_CREATED',
      payload: { bookingId: booking._id, userId, totalPrice: booking.totalPrice },
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return booking;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error(`[Booking Use Case] Transaction aborted during createBooking: ${error.message}`);
    throw error;
  }
};

/**
 * confirmBookingAfterPayment
 * ─────────────────────────────────────────────────────────────────────────────
 * Advances a booking from AWAITING_PAYMENT to PAYMENT_RECEIVED and enqueues
 * an async BullMQ `hotel-book` job to perform the supplier API call.
 *
 * This is called by the payment webhook handler after payment verification.
 * It is idempotent — if the booking is already in a state other than
 * AWAITING_PAYMENT, it returns the booking without modification.
 *
 * MongoDB transaction scope:
 *   - Updates `HotelBooking.status` → PAYMENT_RECEIVED.
 *   - Creates `HotelBookingEvent` (sequence=2, payment_received audit).
 *   - Creates `OutboxEvent` (PAYMENT_RECEIVED).
 *
 * After commit:
 *   - Enqueues BullMQ `hotel-book` job with 3 attempts (exponential backoff).
 *   - Falls back to direct synchronous call if Redis/BullMQ is unavailable.
 *
 * @async
 * @param {object} params
 * @param {string|import('mongoose').Types.ObjectId} params.bookingId - HotelBooking document ID.
 * @param {object} params.payment - Payment Mongoose document.
 * @param {import('mongoose').ClientSession|null} [params.session=null] - Optional parent DB session.
 * @returns {Promise<import('mongoose').Document>} Updated HotelBooking document.
 * @throws {AppError} 404 if booking not found.
 */
const confirmBookingAfterPayment = async ({ bookingId, payment, session: parentSession = null }) => {
  const query = HotelBooking.findById(bookingId);
  if (parentSession) query.session(parentSession);
  const booking = await query;
  if (!booking) throw new AppError('Hotel booking not found.', 404);

  // Guard: If the booking status is not awaiting_payment, it has already been processed
  if (booking.status !== HOTEL_BOOKING_STATUS.AWAITING_PAYMENT) {
    logger.info(`[Booking Use Case] Booking ${bookingId} has status ${booking.status} — skipping payment confirmation.`);
    return booking;
  }

  const useSession = parentSession || (await mongoose.startSession());
  const localTransaction = !parentSession;

  if (localTransaction) {
    useSession.startTransaction();
  }

  let committed = false;
  try {
    const originalStatus = booking.status;
    booking.paymentId = payment._id;
    booking.status = HOTEL_BOOKING_STATUS.PAYMENT_RECEIVED;
    await booking.save({ session: useSession });

    // Sequence 2: payment_received audit event
    await HotelBookingEvent.create([{
      bookingId: booking._id,
      sequence: 2,
      fromStatus: originalStatus,
      toStatus: HOTEL_BOOKING_STATUS.PAYMENT_RECEIVED,
      actor: 'system',
      reason: `Payment verified. ID: ${payment._id}`,
    }], { session: useSession });

    // Outbox: PAYMENT_RECEIVED
    await OutboxEvent.create([{
      aggregateType: 'HotelBooking',
      aggregateId: booking._id,
      eventType: 'PAYMENT_RECEIVED',
      payload: { bookingId: booking._id, paymentId: payment._id },
    }], { session: useSession });

    if (localTransaction) {
      await useSession.commitTransaction();
      useSession.endSession();
      committed = true;
    }

    // 4. Dispatch supplier booking asynchronously (never block or abort payment transaction on Redis error)
    const triggerBookingProcess = () => {
      let enqueued = false;
      try {
        const queue = getQueue();
        if (queue) {
          const jobId = `hotel-book-${booking._id}`;
          queue.add('book', { bookingId: booking._id }, { jobId, attempts: 3, backoff: { type: 'exponential', delay: 5000 } })
            .then(() => {
              logger.info(`[Booking Use Case] Enqueued async book job ${jobId} on BullMQ.`);
            })
            .catch((queueErr) => {
              logger.warn(`[Booking Use Case] BullMQ enqueue failed (${queueErr.message}).`);
              if (localTransaction) {
                setTimeout(async () => {
                  try {
                    const { processSupplierBooking } = require('../../../workers/hotels/hotel-book.worker');
                    await processSupplierBooking(booking._id);
                  } catch (err) {
                    logger.error(`[Booking Use Case] In-process supplier book fallback failed: ${err.message}`);
                  }
                }, 200);
              }
            });
          enqueued = true;
        }
      } catch (queueErr) {
        logger.warn(`[Booking Use Case] BullMQ queue unavailable: ${queueErr.message}`);
      }

      if (!enqueued && localTransaction) {
        logger.warn(`[Booking Use Case] Supplying booking synchronous/in-process fallback.`);
        setTimeout(async () => {
          try {
            const { processSupplierBooking } = require('../../../workers/hotels/hotel-book.worker');
            await processSupplierBooking(booking._id);
          } catch (err) {
            logger.error(`[Booking Use Case] Synchronous book fallback failed: ${err.message}`);
          }
        }, 200);
      }
    };

    triggerBookingProcess();

    return booking;
  } catch (error) {
    if (localTransaction && !committed) {
      await useSession.abortTransaction();
      useSession.endSession();
    }
    logger.error(`[Booking Use Case] Transaction aborted during confirmBookingAfterPayment: ${error.message}`);
    throw error;
  }
};

module.exports = { createBooking, confirmBookingAfterPayment };
