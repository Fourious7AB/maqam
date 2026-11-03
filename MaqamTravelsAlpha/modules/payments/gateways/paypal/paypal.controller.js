const paypalService = require('./paypal.service');
const Payment = require('../../payment.model');
const { sendSuccess, sendCreated, sendNotFound, sendForbidden } = require('../../../../utils/apiResponse');
const logger = require('../../../../utils/logger');
const { PAYMENT_STATUS } = require('../../payment.constants');

/**
 * ─── PAYPAL PAYMENT CONTROLLER ───────────────────────
 * Handlers for incoming HTTP requests targeting PayPal checkout.
 * Redundant validationResult checks are removed since the global `validate` 
 * middleware handles Express-Validator rule failures.
 */

/**
 * POST /api/v1/payments/paypal/create-order
 * Create a PayPal order for a booking
 */
const createPaymentOrder = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { bookingId, bookingType } = req.body;
    const correlationId = req.correlationId;

    logger.info(`[PayPal Controller] Creating payment order for user: ${userId}, booking: ${bookingId}`, { correlationId });

    const orderData = await paypalService.createPaymentOrder(userId, bookingId, bookingType, correlationId);

    return sendCreated(res, orderData, 'PayPal order created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/payments/paypal/capture
 * Capture an approved PayPal order (called from frontend after user signs in/approves)
 */
const capturePayment = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const orderId = req.body.orderId || req.body.token || req.body.paypalOrderId;
    const correlationId = req.correlationId;

    logger.info(`[PayPal Controller] Initiating capture for order: ${orderId}`, { correlationId });

    // Capture payment and verify user ownership of the targeted booking
    const captureData = await paypalService.captureAndVerifyPayment(orderId, userId, correlationId);

    // Trigger asynchronous post-capture operations (e.g. ticketing, invoicing, notifications)
    // Run asynchronously to return prompt responses to frontend
    paypalService.processSuccessfulPayment(captureData.paymentId, correlationId)
      .catch(err => logger.error(`[PayPal Controller] Post-capture process failed for payment ${captureData.paymentId}: ${err.message}`));

    return sendSuccess(res, {
      message: 'PayPal payment captured and processed successfully',
      data: {
        paymentId: captureData.paymentId,
        bookingId: captureData.bookingId,
        bookingType: captureData.bookingType,
        booking: captureData.booking,
        masterBooking: captureData.masterBooking,
        paypalCaptureId: captureData.paypalCaptureId,
        status: captureData.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/payments/paypal/:paymentId
 * Get payment status details
 */
const getPaymentStatus = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user?.id || req.user?._id;
    const correlationId = req.correlationId;

    logger.info(`[PayPal Controller] Fetching payment status: ${paymentId}`, { correlationId });

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return sendNotFound(res, 'Payment not found');
    }

    // Access control: Ensure user owns this payment record or holds administrator privileges
    const isOwner = payment.userId.toString() === userId.toString();
    const isAdmin = ['admin', 'super_admin'].includes(req.user?.role);

    if (!isOwner && !isAdmin) {
      return sendForbidden(res, 'Unauthorized access to this payment resource');
    }

    return sendSuccess(res, {
      message: 'Payment details retrieved successfully',
      data: {
        paymentId: payment._id,
        paypalOrderId: payment.gatewayData?.orderId,
        paypalCaptureId: payment.gatewayData?.captureId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        refunds: payment.refunds,
        totalRefunded: payment.totalRefunded,
        verifiedAt: payment.verifiedAt,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/payments/paypal/order/:orderId
 * Get payment status details by PayPal order ID
 */
const getPaymentStatusByOrderId = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id || req.user?._id;
    const correlationId = req.correlationId;

    logger.info(`[PayPal Controller] Fetching payment status by orderId: ${orderId}`, { correlationId });

    const payment = await Payment.findOne({ 'gatewayData.orderId': orderId });
    if (!payment) {
      return sendNotFound(res, 'Payment not found for the provided PayPal order ID');
    }

    if (userId) {
      const isOwner = payment.userId?.toString() === userId.toString();
      const isAdmin = ['admin', 'super_admin'].includes(req.user?.role);
      if (!isOwner && !isAdmin) {
        return sendForbidden(res, 'Unauthorized access to this payment resource');
      }
    }

    let booking = null;
    try {
      const { resolveBooking } = require('../../bookingResolver');
      booking = await resolveBooking(payment.bookingId, payment.bookingType);
    } catch (err) {
      logger.warn(`[PayPal Controller] Could not resolve booking for payment ${payment._id}: ${err.message}`);
    }

    return sendSuccess(res, {
      message: 'Payment details retrieved successfully',
      data: {
        paymentId: payment._id,
        bookingId: payment.bookingId,
        bookingType: payment.bookingType,
        booking,
        paypalOrderId: payment.gatewayData?.orderId,
        paypalCaptureId: payment.gatewayData?.captureId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        refunds: payment.refunds,
        totalRefunded: payment.totalRefunded,
        verifiedAt: payment.verifiedAt,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/payments/paypal/:paymentId/refund
 * Refund a PayPal payment (finance or admin only, or owner if allowed)
 */
const refundPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;
    const userId = req.user?.id || req.user?._id;
    const correlationId = req.correlationId;

    logger.info(`[PayPal Controller] Processing refund request for payment: ${paymentId}`, { correlationId });

    // Access control: Only finance agents, administrators or super_admins can issue refunds
    const allowedRoles = ['finance', 'admin', 'super_admin'];
    if (!allowedRoles.includes(req.user?.role)) {
      return sendForbidden(res, 'Unauthorized to initiate refunds');
    }

    const refundData = await paypalService.refundPayment(
      paymentId,
      amount || null, // null defaults to full remaining balance refund
      reason || 'Booking cancelled',
      userId,
      correlationId
    );

    return sendSuccess(res, {
      message: 'PayPal refund processed successfully',
      data: refundData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPaymentOrder,
  capturePayment,
  getPaymentStatus,
  getPaymentStatusByOrderId,
  refundPayment,
};
