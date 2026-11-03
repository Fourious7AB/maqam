'use strict';

/**
 * modules/hotels/application/hotel-cancel.usecase.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Clean Architecture Hotel Cancellation Use-case.
 * Resolves supplier cancellation fee, creates Refund records, and schedules gateway refunds.
 */

const mongoose = require('mongoose');
const { AppError } = require('../../../middleware/errorHandler');
const HotelBooking = require('../hotel.model');
const HotelBookingEvent = require('../domain/hotel-booking-event.model');
const HotelRefund = require('../domain/hotel-refund.model');
const OutboxEvent = require('../../../modules/shared/outbox-event.model');
const { HOTEL_BOOKING_STATUS } = require('../hotel.constants');
const Booking = require('../../bookings/booking.model');
const { BOOKING_STATUS } = require('../../../config/constants');
const { getHotelProvider } = require('../hotel-provider.factory');
const crypto = require('crypto');
const logger = require('../../../utils/logger');

/**
 * cancelBooking
 * ─────────────────────────────────────────────────────────────────────────────
 * Initiates a hotel booking cancellation.
 *
 * Decision tree:
 *   • If already CANCELLED or PROVIDER_FAILED → returns early (idempotent).
 *   • If no providerBookingId (booking not yet confirmed with supplier) → local cancel only.
 *   • Otherwise → sets CANCELLATION_REQUESTED, calls SRDV HotelCancel, then:
 *       - On supplier success → sets CANCELLED, creates HotelRefund + REFUND_INITIATED outbox event.
 *       - On supplier failure → reverts to CONFIRMED and throws AppError.
 *
 * Error recovery note:
 *   If the supplier call throws an exception (network error, timeout, etc.), the booking
 *   status is **best-effort reverted to CONFIRMED**. This prevents the booking from
 *   being stuck in CANCELLATION_REQUESTED. However, if the supplier partially processed
 *   the cancellation before the error, the actual reservation state may differ from the
 *   local DB state. Operations should monitor for CANCELLATION_REQUESTED bookings older
 *   than ~5 minutes and reconcile manually.
 *
 * MongoDB transaction scope (on supplier success):
 *   - Updates `HotelBooking.status` → CANCELLED.
 *   - Creates `HotelBookingEvent` (sequence=4, cancelled audit).
 *   - Creates `HotelRefund` record (if refund amount > 0 and paymentId exists).
 *   - Creates `OutboxEvent` (REFUND_INITIATED).
 *
 * @async
 * @param {object} params
 * @param {string|import('mongoose').Types.ObjectId} params.bookingId - HotelBooking document ID.
 * @param {import('mongoose').Types.ObjectId} params.userId - Authenticated user ID (ownership check).
 * @param {string} [params.correlationId] - Correlation ID for distributed tracing.
 * @returns {Promise<import('mongoose').Document>} Updated HotelBooking document.
 * @throws {AppError} 404 if booking not found or belongs to another user.
 * @throws {AppError} 400 if supplier rejects the cancellation.
 */
const cancelBooking = async ({ bookingId, userId, correlationId }) => {
  const booking = await HotelBooking.findOne({ _id: bookingId, userId });
  if (!booking) throw new AppError('Hotel booking not found.', 404);

  // If already cancelled or failed, return early
  if ([HOTEL_BOOKING_STATUS.CANCELLED, HOTEL_BOOKING_STATUS.PROVIDER_FAILED].includes(booking.status)) {
    return booking;
  }

  // If not confirmed with supplier yet (payment received but book not done or failed),
  // we can cancel locally directly
  if (!booking.providerBookingId) {
    booking.status = HOTEL_BOOKING_STATUS.CANCELLED;
    await booking.save();
    await Booking.updateOne(
      { itemId: booking._id, bookingType: 'hotel' },
      { $set: { status: BOOKING_STATUS.CANCELLED, cancelledAt: new Date() } }
    );
    return booking;
  }

  // Start cancellation process
  booking.status = HOTEL_BOOKING_STATUS.CANCELLATION_REQUESTED;
  await booking.save();

  // Audit event: cancellation_requested
  await HotelBookingEvent.create({
    bookingId: booking._id,
    sequence: 3,
    fromStatus: HOTEL_BOOKING_STATUS.CONFIRMED,
    toStatus: HOTEL_BOOKING_STATUS.CANCELLATION_REQUESTED,
    actor: 'user',
    reason: 'Customer requested cancellation',
    correlationId,
  });

  const provider = getHotelProvider();

  // Track whether the supplier has confirmed the cancellation.
  // If true, we must NOT revert to CONFIRMED on a DB error — the reservation
  // is already cancelled on the supplier side and needs manual reconciliation.
  let supplierCancelled = false;

  try {
    // Call SRDV cancellation
    const result = await provider.cancelBooking({
      booking: booking.toObject(),
      correlationId,
    });

    if (result.status === 'cancelled') {
      supplierCancelled = true; // Supplier confirmed — do not revert on DB failure

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Calculate penalty in minor units (paise)
        const penaltyMinor = Math.round(result.penalty * 100);
        
        // Customer refund calculation: Total paid minus supplier penalty
        let customerRefundMinor = booking.customerTotalMinor - penaltyMinor;
        if (customerRefundMinor < 0) customerRefundMinor = 0;

        booking.status = HOTEL_BOOKING_STATUS.CANCELLED;
        booking.cancellationReference = result.cancellationReference;
        booking.providerRawResponse = {
          ...booking.providerRawResponse,
          cancellationResult: result.raw,
        };
        await booking.save({ session });
        await Booking.updateOne(
          { itemId: booking._id, bookingType: 'hotel' },
          { $set: { status: BOOKING_STATUS.CANCELLED, cancelledAt: new Date() } },
          { session }
        );

        // Audit event: cancelled
        await HotelBookingEvent.create([{
          bookingId: booking._id,
          sequence: 4,
          fromStatus: HOTEL_BOOKING_STATUS.CANCELLATION_REQUESTED,
          toStatus: HOTEL_BOOKING_STATUS.CANCELLED,
          actor: 'system',
          reason: `Supplier cancellation success. Penalty: ${result.penalty} ${booking.currency}`,
        }], { session });

        // Create explicit refund entry if money is due back
        if (customerRefundMinor > 0 && booking.paymentId) {
          const idempotencyKey = crypto.randomUUID();
          await HotelRefund.create([{
            bookingId: booking._id,
            paymentId: booking.paymentId,
            idempotencyKey,
            status: 'pending',
            customerAmountMinor: customerRefundMinor,
            currency: booking.currency,
            reason: 'Booking cancelled by user',
            supplierCancellationReference: result.cancellationReference,
          }], { session });

          // Transactional Outbox: REFUND_INITIATED (picked up by gateway refund worker)
          await OutboxEvent.create([{
            aggregateType: 'HotelBooking',
            aggregateId: booking._id,
            eventType: 'REFUND_INITIATED',
            payload: {
              bookingId: booking._id,
              paymentId: booking.paymentId,
              refundAmountMinor: customerRefundMinor,
              idempotencyKey,
            },
          }], { session });
        }

        await session.commitTransaction();
        session.endSession();
        
        logger.info(`[Cancel Use Case] Booking ${bookingId} cancelled successfully. Refund due: ${customerRefundMinor / 100}`);
      } catch (dbErr) {
        await session.abortTransaction();
        session.endSession();
        // Re-throw without reverting — booking is cancelled at supplier; needs reconciliation
        throw dbErr;
      }
    } else {
      // Supplier rejected cancellation — revert to CONFIRMED and surface error.
      // Throw directly so the outer catch does not attempt a second status overwrite.
      booking.status = HOTEL_BOOKING_STATUS.CONFIRMED;
      await booking.save();
      
      logger.error(`[Cancel Use Case] Supplier rejected cancellation for booking ${bookingId}`);
      throw new AppError('Supplier could not cancel the booking. Contact support.', 400);
    }

    return booking;
  } catch (error) {
    // Only revert to CONFIRMED for pre-supplier errors (network timeout, etc.).
    // If the supplier already confirmed cancellation, the reservation is gone on
    // their end — reverting locally would create a data inconsistency.
    // AppErrors from the supplier-rejection branch already have status saved; skip revert.
    if (!supplierCancelled && !(error instanceof AppError)) {
      logger.error(`[Cancel Use Case] Cancellation execution failed: ${error.message}`);
      booking.status = HOTEL_BOOKING_STATUS.CONFIRMED;
      await booking.save();
    } else if (supplierCancelled) {
      logger.error(`[Cancel Use Case] DB commit failed after supplier cancellation for booking ${bookingId}. Manual reconciliation required. Error: ${error.message}`);
    }
    throw error;
  }
};

module.exports = { cancelBooking };
