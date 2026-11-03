const Payment = require('../../payment.model');
const razorpayClient = require('./razorpay.client');
const logger = require('../../../../utils/logger');
const { AppError } = require('../../../../middleware/errorHandler');
const { PAYMENT_STATUS } = require('../../payment.constants');
const { resolveBooking } = require('../../bookingResolver');
const { withLock } = require('../../distributedLock');
const { withTransaction } = require('../../transactionHelper');
const auditLogService = require('../../auditLog.service');
const { getBookingAmount, ensureBookingConfirmed } = require('../../bookingSync');

/**
 * ─── RAZORPAY SERVICE ──────────────────────────────────
 * Razorpay-specific payment business logic.
 * Aligned with PayPal patterns for locks, transactions, and state machine validation.
 */

/**
 * Create Razorpay Order for a booking
 */
const createPaymentOrder = async (userId, bookingId, bookingType, correlationId = '') => {
  try {
    logger.info(`[Razorpay Service] Creating order - User: ${userId}, Booking: ${bookingId}, Type: ${bookingType}`);

    // 1. Fetch booking details
    const booking = await resolveBooking(bookingId, bookingType);

    // Verify booking ownership
    const bookingUserId = booking.user?._id || booking.userId?._id || booking.user || booking.userId;
    if (bookingUserId && bookingUserId.toString() !== userId.toString()) {
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
      paymentMethod: 'razorpay',
      status: { $in: [PAYMENT_STATUS.CREATED, PAYMENT_STATUS.PENDING] },
      expiresAt: { $gt: new Date() },
    });

    if (existingPending) {
      logger.info(`[Razorpay Service] Reusing active pending payment: ${existingPending._id}`);
      return {
        paymentId: existingPending._id,
        razorpayOrderId: existingPending.gatewayData.orderId,
        amount: existingPending.amount,
        currency: existingPending.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        bookingId,
        bookingType,
      };
    }

    const amount = getBookingAmount(booking, bookingType);
    if (amount <= 0) {
      throw new AppError('Invalid booking amount', 400);
    }

    // 4. Create Razorpay order
    const customerName = booking.user?.name || booking.userId?.name || booking.guestName || 'Customer';
    const customerEmail = booking.user?.email || booking.userId?.email || booking.guestEmail || '';
    const customerPhone = booking.user?.phone || booking.userId?.phone || booking.guestPhone || '';

    const orderData = await razorpayClient.orders.create(
      amount,
      bookingId,
      {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      }
    );

    // 5. Create Payment record in DB
    const payment = await Payment.create({
      userId,
      bookingId,
      bookingModel: booking.constructor.modelName,
      bookingType,
      amount,
      currency: 'INR',
      paymentMethod: 'razorpay',
      status: PAYMENT_STATUS.CREATED,
      gatewayData: {
        orderId: orderData.orderId,
        raw: orderData,
      },
      correlationId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30-minute expiry window
    });

    // Write audit log entry
    await auditLogService.record({
      paymentId: payment._id,
      action: 'PAYMENT_ORDER_CREATED',
      actor: { type: 'user', id: userId },
      newState: PAYMENT_STATUS.CREATED,
      metadata: { orderId: orderData.orderId, amount, currency: 'INR' },
      correlationId,
    });

    logger.info(`[Razorpay Service] Payment order created - ID: ${payment._id}, Razorpay Order: ${orderData.orderId}`);

    return {
      paymentId: payment._id,
      razorpayOrderId: orderData.orderId,
      amount: orderData.amountInINR,
      currency: orderData.currency,
      keyId: process.env.RAZORPAY_KEY_ID, // Send to frontend for checkout
      bookingId,
      bookingType,
      customerDetails: {
        name: booking.user.name,
        email: booking.user.email,
        phone: booking.user.phone,
      },
    };
  } catch (error) {
    logger.error(`[Razorpay Service] Payment order creation failed: ${error.message}`);
    throw error;
  }
};

/**
 * Verify and Process Payment (called from webhook or verification callback)
 */
const verifyAndProcessPayment = async (orderId, paymentId, signature, correlationId = '') => {
  const lockKey = `capture:${orderId}`;

  return await withLock(lockKey, 20000, async () => {
    logger.info(`[Razorpay Service] Lock acquired for verification - Order: ${orderId}, Payment: ${paymentId}`);

    // Retrieve payment document first
    const initialPayment = await Payment.findOne({ 'gatewayData.orderId': orderId });
    if (!initialPayment) {
      throw new AppError('Payment record not found', 404);
    }

    // Idempotent bypass: If status is already PAID, return cached completion details immediately
    if (initialPayment.status === PAYMENT_STATUS.PAID) {
      logger.info(`[Razorpay Service] Payment already captured and PAID (Idempotent skip): ${initialPayment._id}`);
      return {
        paymentId: initialPayment._id,
        razorpayPaymentId: initialPayment.gatewayData.captureId,
        status: initialPayment.status,
        bookingId: initialPayment.bookingId,
        bookingType: initialPayment.bookingType,
        alreadyProcessed: true,
      };
    }

    // 1. Verify signature using local credentials
    const isValid = razorpayClient.payments.verify(orderId, paymentId, signature);
    if (!isValid) {
      logger.warn(`[Razorpay Service] Invalid payment signature for order: ${orderId}`);
      throw new AppError('Payment verification signature check failed', 400);
    }

    // 2. Fetch transaction details from Razorpay to verify amount capture status
    const paymentDetails = await razorpayClient.payments.fetch(paymentId);

    // 3. Process database adjustments inside transaction session
    return await withTransaction(async (session) => {
      // Refresh record inside transaction session
      const payment = await Payment.findById(initialPayment._id).session(session);

      const previousState = payment.status;

      // Update payment record details
      payment.status = PAYMENT_STATUS.PAID;
      payment.gatewayData.captureId = paymentId;
      payment.gatewayData.transactionId = paymentId;
      payment.paidAt = new Date();
      payment.verifiedAt = new Date();
      payment.gatewayData.raw = paymentDetails;

      await payment.save({ session });

      // Resolve and update target Booking status and master Booking if present
      await ensureBookingConfirmed(payment, session);

      // Record Audit trail
      await auditLogService.record({
        paymentId: payment._id,
        action: 'PAYMENT_CAPTURE_COMPLETED',
        actor: { type: 'system', id: 'razorpay_verification_worker' },
        previousState,
        newState: PAYMENT_STATUS.PAID,
        metadata: { razorpayPaymentId: paymentId, orderId },
        gatewayResponse: paymentDetails,
        correlationId,
      });

      logger.info(`[Razorpay Service] Payment verified and booking confirmed - ID: ${payment._id}`);

      return {
        paymentId: payment._id,
        razorpayPaymentId: paymentId,
        orderId,
        amount: payment.amount,
        status: payment.status,
        bookingId: payment.bookingId,
        bookingType: payment.bookingType,
        verifiedAt: payment.verifiedAt,
        alreadyProcessed: false,
      };
    });
  });
};

/**
 * Process successful payment (post-capture orchestration)
 */
const processSuccessfulPayment = async (paymentId, correlationId = '') => {
  try {
    logger.info(`[Razorpay Service] Executing post-payment orchestration for ID: ${paymentId}`);

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new AppError('Payment not found for post-capture processing', 404);
    }

    // Call flight ticketing orchestrator if applicable
    if (payment.bookingType === 'flight') {
      try {
        const bookingOrchestrator = require('../../../../utils/bookingOrchestrator');
        const FlightBooking = require('../../../flights/flight.model');
        const booking = await FlightBooking.findById(payment.bookingId);

        if (booking && !booking.isLCC) {
          logger.info(`[Razorpay Service] Initiating GDS Ticketing for flight booking: ${booking._id}`);
          await bookingOrchestrator.processTicketing(booking._id);
        }
      } catch (err) {
        logger.error(`[Razorpay Service] Post-capture GDS auto-ticketing failed: ${err.message}`);
      }
    }

    // TODO: Enqueue transactional messaging tasks (SMS/Mail)
    logger.info(`[Razorpay Service] Triggered async communications and invoicing flows`);

    return { success: true };
  } catch (error) {
    logger.error(`[Razorpay Service] Post-capture orchestration failed: ${error.message}`);
    throw error;
  }
};

/**
 * Refund a Razorpay payment (supports partial/full refunds)
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

      const razorpayPaymentId = payment.gatewayData.captureId;
      if (!razorpayPaymentId) {
        throw new AppError('No payment capture reference found on this payment record', 400);
      }

      // Check remaining balances
      const remainingRefundable = payment.amount - payment.totalRefunded;
      const refundAmount = amount !== null ? amount : remainingRefundable;

      if (refundAmount <= 0) {
        throw new AppError('Invalid refund amount', 400);
      }
      if (refundAmount > remainingRefundable) {
        throw new AppError(`Refund amount of ${refundAmount} exceeds remaining refundable balance of ${remainingRefundable}`, 400);
      }

      // Trigger Razorpay API Refund
      const refundData = await razorpayClient.payments.refund(
        razorpayPaymentId,
        refundAmount,
        reason
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
        gatewayResponse: refundData,
      });

      payment.totalRefunded = parseFloat((payment.totalRefunded + refundAmount).toFixed(2));

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
        actor: actorId ? { type: 'user', id: actorId } : { type: 'system', id: 'razorpay_refund_worker' },
        previousState,
        newState: payment.status,
        metadata: { refundId: refundData.refundId, amount: refundAmount },
        gatewayResponse: refundData,
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

/**
 * Get payment status details
 */
const getPaymentStatus = async (paymentId) => {
  try {
    const payment = await Payment.findById(paymentId).populate('bookingId');
    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    return {
      paymentId: payment._id,
      razorpayOrderId: payment.gatewayData?.orderId,
      razorpayPaymentId: payment.gatewayData?.captureId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      bookingStatus: payment.bookingId?.status,
      refunds: payment.refunds,
      totalRefunded: payment.totalRefunded,
      verifiedAt: payment.verifiedAt,
      createdAt: payment.createdAt,
    };
  } catch (error) {
    logger.error(`[Razorpay Service] Get payment status failed: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createPaymentOrder,
  verifyAndProcessPayment,
  processSuccessfulPayment,
  refundPayment,
  getPaymentStatus,
};
