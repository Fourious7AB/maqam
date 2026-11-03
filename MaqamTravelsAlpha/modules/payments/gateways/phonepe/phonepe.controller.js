const phonePeService = require('./phonepe.service');
const Payment = require('../../payment.model');
const { sendSuccess, sendCreated, sendBadRequest, sendNotFound } = require('../../../../utils/apiResponse');
const { validationResult } = require('express-validator');
const logger = require('../../../../utils/logger');

/**
 * ─── PHONEPE PAYMENT CONTROLLER ───────────────────────
 * Endpoints for PhonePe payment operations
 */

/**
 * POST /api/v1/payments/phonepe/create-order
 * Create a PhonePe payment request for a booking
 */
const createPaymentOrder = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendBadRequest(res, 'Validation failed', errors.array());
        }

        const userId = req.user?.id;
        const { bookingId, bookingType } = req.body;

        logger.info(`[PhonePe Controller] Creating payment request for user: ${userId}, booking: ${bookingId}`);

        const paymentData = await phonePeService.createPaymentRequest(userId, bookingId, bookingType);

        return sendCreated(res, {
            message: 'PhonePe payment request created successfully',
            data: paymentData,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/payments/phonepe/verify
 * Verify PhonePe transaction status
 * Called from frontend after redirect back to client
 */
const verifyPayment = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendBadRequest(res, 'Validation failed', errors.array());
        }

        const { transactionId, paymentId } = req.body;

        logger.info(`[PhonePe Controller] Verifying payment status - Transaction ID: ${transactionId}, Payment ID: ${paymentId}`);

        const verificationData = await phonePeService.verifyPaymentCallback(transactionId, paymentId);

        // Process successful payment (confirm booking, GDS ticketing, etc.)
        const result = await phonePeService.processSuccessfulPayment(verificationData.paymentId);

        return sendSuccess(res, {
            message: 'PhonePe payment verified successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/payments/phonepe/:paymentId
 * Get payment status
 */
const getPaymentStatus = async (req, res, next) => {
    try {
        const { paymentId } = req.params;
        const userId = req.user?.id;

        logger.info(`[PhonePe Controller] Fetching payment status for payment: ${paymentId}`);

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
                phonePeTransactionId: payment.phonePeTransactionId,
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
 * POST /api/v1/payments/phonepe/:paymentId/refund
 * Refund a PhonePe payment
 */
const refundPayment = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendBadRequest(res, 'Validation failed', errors.array());
        }

        const { paymentId } = req.params;
        const { amount, reason } = req.body;
        const userId = req.user?.id;

        logger.info(`[PhonePe Controller] Processing refund for payment: ${paymentId}`);

        // Verify ownership first
        const payment = await Payment.findById(paymentId);

        if (!payment) {
            return sendNotFound(res, 'Payment not found');
        }

        if (payment.userId.toString() !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const refundData = await phonePeService.refundPayment(
            paymentId,
            amount,
            reason
        );

        return sendSuccess(res, {
            message: 'PhonePe refund processed successfully',
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
