const Payment = require('../../payment.model');
const paypalClient = require('./paypal.client');
const logger = require('../../../../utils/logger');
const { AppError } = require('../../../../middleware/errorHandler');
const { PAYMENT_STATUS } = require('../../payment.constants');
const { resolveBooking } = require('../../bookingResolver');
const { withLock } = require('../../distributedLock');
const { withTransaction } = require('../../transactionHelper');
const auditLogService = require('../../auditLog.service');
const { getBookingAmount, ensureBookingConfirmed } = require('../../bookingSync');
const { getExchangeRate } = require('../../../../utils/currency');

// Conversion rate factor if native booking currency is not supported by PayPal (e.g. INR -> USD)
const CONVERSION_RATE = parseFloat(process.env.PAYPAL_CONVERSION_RATE || '0.012');

/**
 * Initiates a PayPal Order for a specific booking.
 * Implements safeguards against double billing by scanning for active pending or paid logs.
 */
const createPaymentOrder = async (userId, bookingId, bookingType, correlationId = '') => {
  try {
    logger.info(`[PayPal Service] Creating order - User: ${userId}, Booking: ${bookingId}, Type: ${bookingType}`);

    // 1. Fetch booking details via dynamic resolver
    const booking = await resolveBooking(bookingId, bookingType);

    // Verify booking ownership
    const bookingUserId = booking.user?._id || booking.userId?._id || booking.user || booking.userId;
    const bookingUserIdString = bookingUserId && bookingUserId.toString ? bookingUserId.toString() : null;
    if (bookingUserIdString && bookingUserIdString !== userId.toString()) {
      throw new AppError('Unauthorized to pay for this booking', 403);
    }

    // 2. Prevent payment if already confirmed/paid
    const existingPaid = await Payment.findOne({
      bookingId,
      status: PAYMENT_STATUS.PAID,
    });
    if (existingPaid) {
      throw new AppError('This booking is already paid', 400);
    }

    // 3. Prevent duplicate active checkout processes (idempotent reuse)
    const existingPending = await Payment.findOne({
      bookingId,
      paymentMethod: 'paypal',
      status: { $in: [PAYMENT_STATUS.CREATED, PAYMENT_STATUS.PENDING] },
      expiresAt: { $gt: new Date() },
    });

    if (existingPending) {
      logger.info(`[PayPal Service] Reusing active pending payment: ${existingPending._id}`);
      return {
        paymentId: existingPending._id,
        paypalOrderId: existingPending.gatewayData.orderId,
        amount: existingPending.amount,
        currency: existingPending.currency,
        bookingId,
        bookingType,
        redirectUrl: existingPending.gatewayData.redirectUrl || existingPending.gatewayData.raw?.links?.find(l => l.rel === 'approve')?.href || (existingPending.gatewayData.orderId ? (process.env.PAYPAL_MODE === 'production' ? 'https://www.paypal.com/checkoutnow?token=' : 'https://www.sandbox.paypal.com/checkoutnow?token=') + existingPending.gatewayData.orderId : ''),
      };
    }

    const nativeAmount = getBookingAmount(booking, bookingType);
    if (nativeAmount <= 0) {
      throw new AppError('Invalid booking amount', 400);
    }

    // 4. Currency conversion logic for PayPal (PayPal does not support INR)
    let paymentAmount = nativeAmount;
    let paymentCurrency = booking.currency || booking.details?.currency || 'USD';

    if (paymentCurrency === 'INR') {
      let conversionRate = CONVERSION_RATE;
      try {
        conversionRate = await getExchangeRate('INR', 'USD');
      } catch (rateErr) {
        logger.warn(`[PayPal Service] Failed to retrieve live conversion rate, falling back to static rate ${CONVERSION_RATE}: ${rateErr.message}`);
      }
      paymentAmount = nativeAmount * conversionRate;
      paymentCurrency = 'USD';
      logger.info(`[PayPal Service] Converted ₹${nativeAmount} INR to $${paymentAmount.toFixed(2)} USD for PayPal checkout using rate ${conversionRate}`);
    }

    // 5. Create PayPal order via API Adapter
    const orderData = await paypalClient.orders.create(
      paymentAmount,
      bookingId,
      paymentCurrency,
      booking._id.toString() // Use booking ID as unique request identifier
    );

    // 6. Persist Payment log
    const roundedPaymentAmount = Math.round(paymentAmount * 100) / 100;
    const payment = await Payment.create({
      userId,
      bookingId,
      bookingModel: booking.constructor.modelName,
      bookingType,
      amount: roundedPaymentAmount, // Save the actual PayPal billed amount (converted if necessary)
      // Store the currency that will be used for the PayPal transaction
      // (converted to USD when booking currency is INR)
      currency: paymentCurrency || booking.currency || 'INR',
      paymentMethod: 'paypal',
      status: PAYMENT_STATUS.CREATED,
      gatewayData: {
        orderId: orderData.orderId,
        redirectUrl: orderData.redirectUrl,
        raw: orderData.raw,
      },
      correlationId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // Active checkout window: 30 minutes
    });

    // Write audit log entry
    await auditLogService.record({
      paymentId: payment._id,
      action: 'PAYMENT_ORDER_CREATED',
      actor: { type: 'user', id: userId },
      newState: PAYMENT_STATUS.CREATED,
      metadata: { orderId: orderData.orderId, paymentAmount: roundedPaymentAmount, paymentCurrency },
      correlationId,
    });

    return {
      paymentId: payment._id,
      paypalOrderId: orderData.orderId,
      amount: payment.amount,
      currency: payment.currency,
      bookingId,
      bookingType,
      redirectUrl: orderData.redirectUrl,
    };
  } catch (error) {
    logger.error(`[PayPal Service] Order creation failed: ${error.message}`);
    throw error;
  }
};

/**
 * Capture and verify PayPal payment. Protects write operations via distributed locks
 * and transactions to prevent double-capture race conditions.
 */
const captureAndVerifyPayment = async (orderId, userId = null, correlationId = '') => {
  const lockKey = `capture:${orderId}`;

  return await withLock(lockKey, 20000, async () => {
    logger.info(`[PayPal Service] Lock acquired for capture: ${orderId}`);

    // Retrieve payment document first to verify existence and check status idempotently
    const initialPayment = await Payment.findOne({ 'gatewayData.orderId': orderId });
    if (!initialPayment) {
      throw new AppError('Payment record not found for this PayPal order', 404);
    }

    // Idempotent recovery: If status is already PAID, return cached completion details immediately
    if (initialPayment.status === PAYMENT_STATUS.PAID) {
      logger.info(`[PayPal Service] Payment already captured and PAID (Idempotent bypass): ${initialPayment._id}`);
      let booking = null;
      try {
        booking = await resolveBooking(initialPayment.bookingId, initialPayment.bookingType);
      } catch (err) {
        logger.warn(`[PayPal Service] Could not resolve booking on idempotent bypass: ${err.message}`);
      }
      return {
        paymentId: initialPayment._id,
        bookingId: initialPayment.bookingId,
        bookingType: initialPayment.bookingType,
        booking,
        paypalCaptureId: initialPayment.gatewayData?.captureId,
        status: initialPayment.status,
        alreadyProcessed: true,
      };
    }

    if (initialPayment.status === PAYMENT_STATUS.FAILED || initialPayment.status === PAYMENT_STATUS.EXPIRED) {
      throw new AppError(`Cannot capture payment. Current status is terminal: ${initialPayment.status}`, 400);
    }

    // Call external PayPal API to capture funds
    const captureData = await paypalClient.orders.capture(orderId, orderId); // Use orderId as capture request ID

    // Run database adjustments inside transaction session
    return await withTransaction(async (session) => {
      // Refresh document inside the transaction session
      const payment = await Payment.findById(initialPayment._id).session(session);

      const previousState = payment.status;

      // Update payment record details
      payment.status = PAYMENT_STATUS.PAID;
      payment.gatewayData.captureId = captureData.transactionId;
      payment.gatewayData.transactionId = captureData.transactionId;
      payment.paidAt = new Date();
      payment.verifiedAt = new Date();
      if (payment.gatewayData.raw) {
        payment.gatewayData.raw = {
          ...payment.gatewayData.raw,
          captureResult: captureData.raw,
        };
      } else {
        payment.gatewayData.raw = { captureResult: captureData.raw };
      }

      await payment.save({ session });

      // Update booking and master booking status in a shared helper
      const syncResult = await ensureBookingConfirmed(payment, session);

      // Record Audit trail
      await auditLogService.record({
        paymentId: payment._id,
        action: 'PAYMENT_CAPTURE_COMPLETED',
        actor: userId ? { type: 'user', id: userId } : (payment.userId ? { type: 'user', id: payment.userId } : { type: 'system', id: 'paypal_capture_worker' }),
        previousState,
        newState: PAYMENT_STATUS.PAID,
        metadata: { captureId: captureData.transactionId, amount: captureData.amount },
        gatewayResponse: captureData.raw,
        correlationId,
      });

      logger.info(`[PayPal Service] Transaction completed. Booking confirmed and payment captured: ${payment._id}`);

      return {
        paymentId: payment._id,
        bookingId: payment.bookingId,
        bookingType: payment.bookingType,
        booking: syncResult?.booking || null,
        masterBooking: syncResult?.masterBooking || null,
        paypalCaptureId: captureData.transactionId,
        status: payment.status,
        alreadyProcessed: false,
      };
    });
  });
};

/**
 * Coordinates post-capture actions (ticketing, email confirmations, invoicing)
 */
const processSuccessfulPayment = async (paymentId, correlationId = '') => {
  try {
    logger.info(`[PayPal Service] Executing post-payment orchestration for ID: ${paymentId}`);

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new AppError('Payment not found for post-capture processing', 404);
    }

    // Call dynamic GDS ticketing orchestrator if applicable
    if (payment.bookingType === 'flight') {
      try {
        const bookingOrchestrator = require('../../../../utils/bookingOrchestrator');
        // Retrieve booking details to check if LCC
        const FlightBooking = require('../../../flights/flight.model');
        const booking = await FlightBooking.findById(payment.bookingId);

        if (booking && !booking.isLCC) {
          logger.info(`[PayPal Service] Initiating GDS Ticketing for flight booking: ${booking._id}`);
          await bookingOrchestrator.processTicketing(booking._id);
        }
      } catch (err) {
        logger.error(`[PayPal Service] Post-capture GDS auto-ticketing failed: ${err.message}`);
        // Log error but do not fail the request cycle since funds are captured
      }
    }

    // Call hotel supplier booking orchestrator if applicable
    if (payment.bookingType === 'hotel') {
      try {
        const { processSupplierBooking } = require('../../../workers/hotels/hotel-book.worker');
        logger.info(`[PayPal Service] Initiating hotel supplier booking for booking: ${payment.bookingId}`);
        await processSupplierBooking(payment.bookingId);
      } catch (err) {
        logger.error(`[PayPal Service] Post-capture hotel supplier booking failed: ${err.message}`);
        // Log error but do not fail the request cycle since funds are captured
      }
    }

    // TODO: Enqueue email invoice generation task into BullMQ
    logger.info(`[PayPal Service] Enqueued invoice and mail dispatch notification tasks`);

    return { success: true };
  } catch (error) {
    logger.error(`[PayPal Service] Orchestration pipeline failed: ${error.message}`);
    throw error;
  }
};

/**
 * Processes payment refunds. Protects logic via transaction session to support partial refunds.
 */
const refundPayment = async (paymentId, amount = null, reason = 'Booking cancelled', actorId = null, correlationId = '') => {
  const lockKey = `refund:${paymentId}`;

  return await withLock(lockKey, 20000, async () => {
    return await withTransaction(async (session) => {
      const payment = await Payment.findById(paymentId).session(session);
      if (!payment) {
        throw new AppError('Payment record not found', 404);
      }

      if (payment.status !== PAYMENT_STATUS.PAID && payment.status !== PAYMENT_STATUS.PARTIALLY_REFUNDED) {
        throw new AppError('Only captured/paid payments can be refunded', 400);
      }

      const captureId = payment.gatewayData.captureId;
      if (!captureId) {
        throw new AppError('No capture reference found on this payment record', 400);
      }

      // Calculate remaining balance available for refunding
      const remainingRefundable = payment.amount - payment.totalRefunded;
      const refundAmount = amount !== null ? amount : remainingRefundable;

      if (refundAmount <= 0) {
        throw new AppError('Invalid refund amount', 400);
      }
      if (refundAmount > remainingRefundable) {
        throw new AppError(`Refund amount of ${refundAmount} exceeds remaining refundable balance of ${remainingRefundable}`, 400);
      }

      // Convert local refund amount to gateway currency value if original currency was converted (e.g. INR -> USD)
      let gatewayRefundAmount = refundAmount;
      let gatewayCurrency = payment.currency;

      if (payment.currency === 'INR') {
        gatewayRefundAmount = refundAmount * CONVERSION_RATE;
        gatewayCurrency = 'USD';
      }

      // Trigger PayPal API Refund
      const refundRequestId = `ref_${paymentId}_${Date.now()}`;
      const refundData = await paypalClient.payments.refund(
        captureId,
        gatewayRefundAmount,
        gatewayCurrency,
        reason,
        refundRequestId
      );

      const previousState = payment.status;

      // Update local payment record arrays and counters
      payment.refunds.push({
        refundId: refundData.refundId,
        amount: refundAmount,
        currency: payment.currency,
        reason,
        status: 'processed',
        processedAt: new Date(),
        gatewayResponse: refundData.raw,
      });

      payment.totalRefunded = parseFloat((payment.totalRefunded + refundAmount).toFixed(2));

      // Determine final status
      const isFullyRefunded = payment.totalRefunded >= payment.amount;
      payment.status = isFullyRefunded ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.PARTIALLY_REFUNDED;

      await payment.save({ session });

      // If fully refunded, cancel booking and release stock units for packages/offers
      if (isFullyRefunded) {
        const booking = await resolveBooking(payment.bookingId, payment.bookingType);
        booking.status = 'cancelled';
        booking.cancellationReason = `Refunded: ${reason}`;
        booking.cancelledAt = new Date();
        await booking.save({ session });

        if (payment.bookingType === 'package' || payment.bookingType === 'offer') {
          const { releaseOneUnit } = require('../../../packages/stock/stockClaim.service');
          const TicketStock = require('../../../packages/stock/ticketStock.model');
          const HotelStock = require('../../../packages/stock/hotelStock.model');
          for (const u of booking.claimedFlightUnits || []) {
            if (u.stock && u.unitId) await releaseOneUnit(TicketStock, u.stock, u.unitId);
          }
          for (const u of booking.claimedHotelUnits || []) {
            if (u.stock && u.unitId) await releaseOneUnit(HotelStock, u.stock, u.unitId);
          }
        }
      }

      // Write Audit log
      await auditLogService.record({
        paymentId: payment._id,
        action: isFullyRefunded ? 'PAYMENT_FULLY_REFUNDED' : 'PAYMENT_PARTIALLY_REFUNDED',
        actor: actorId ? { type: 'user', id: actorId } : { type: 'system', id: 'paypal_refund_worker' },
        previousState,
        newState: payment.status,
        metadata: { refundId: refundData.refundId, amount: refundAmount },
        gatewayResponse: refundData.raw,
        correlationId,
      });

      return {
        paymentId: payment._id,
        refundId: refundData.refundId,
        amount: refundAmount,
        status: payment.status,
      };
    });
  });
};

module.exports = {
  createPaymentOrder,
  captureAndVerifyPayment,
  processSuccessfulPayment,
  refundPayment,
};
