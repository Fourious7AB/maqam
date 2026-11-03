const razorpayService = require('./razorpay.service');
const Payment = require('../../payment.model');
const { sendSuccess, sendCreated, sendBadRequest, sendNotFound } = require('../../../../utils/apiResponse');
const { validationResult } = require('express-validator');
const logger = require('../../../../utils/logger');

/**
 * ─── RAZORPAY PAYMENT CONTROLLER ──────────────────────
 * Endpoints for Razorpay payment operations
 */

/**
 * POST /api/v1/payments/razorpay/create-order
 * Create a Razorpay order for a booking
 */
const createPaymentOrder = async (req, res, next) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendBadRequest(res, 'Validation failed', errors.array());
        }

        const userId = req.user?.id;
        const { bookingId, bookingType } = req.body;

        logger.info(`[Razorpay Controller] Creating payment order for user: ${userId}, booking: ${bookingId}`);

        const orderData = await razorpayService.createPaymentOrder(userId, bookingId, bookingType);

        return sendCreated(res, {
            message: 'Payment order created successfully',
            data: orderData,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/payments/razorpay/verify
 * Verify payment signature and process payment
 * Called from frontend after Razorpay checkout
 */
// 
const verifyPayment = async (req, res, next) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendBadRequest(res, 'Validation failed', errors.array());
        }

        const { orderId, paymentId, signature } = req.body;

        logger.info(`[Razorpay Controller] Verifying payment - Order: ${orderId}, Payment: ${paymentId}`);

        const paymentData = await razorpayService.verifyAndProcessPayment(
            orderId,
            paymentId,
            signature
        );

        // Process successful payment
        const result = await razorpayService.processSuccessfulPayment(paymentData.paymentId);

        return sendSuccess(res, {
            message: 'Payment verified and processed successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/payments/razorpay/:paymentId
 * Get payment status
 */
const getPaymentStatus = async (req, res, next) => {
    try {
        const { paymentId } = req.params;
        const userId = req.user?.id;

        logger.info(`[Razorpay Controller] Fetching payment status: ${paymentId}`);

        const payment = await Payment.findById(paymentId);

        if (!payment) {
            return sendNotFound(res, 'Payment not found');
        }

        // Verify ownership
        if (payment.userId.toString() !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        return sendSuccess(res, {
            message: 'Payment status retrieved',
            data: {
                paymentId: payment._id,
                razorpayOrderId: payment.razorpayOrderId,
                razorpayPaymentId: payment.razorpayPaymentId,
                amount: payment.amount,
                status: payment.status,
                verifiedAt: payment.verifiedAt,
                createdAt: payment.createdAt,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/payments/razorpay/:paymentId/refund
 * Refund a payment
 */
const refundPayment = async (req, res, next) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendBadRequest(res, 'Validation failed', errors.array());
        }

        const { paymentId } = req.params;
        const { amount, reason } = req.body;
        const userId = req.user?.id;

        logger.info(`[Razorpay Controller] Processing refund for payment: ${paymentId}`);

        // Verify ownership first
        const payment = await Payment.findById(paymentId);

        if (!payment) {
            return sendNotFound(res, 'Payment not found');
        }

        if (payment.userId.toString() !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const refundData = await razorpayService.refundPayment(
            paymentId,
            amount,
            reason
        );

        return sendSuccess(res, {
            message: 'Refund processed successfully',
            data: refundData,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createPaymentOrder,
    verifyPayment,
    getPaymentStatus,
    refundPayment,
};
