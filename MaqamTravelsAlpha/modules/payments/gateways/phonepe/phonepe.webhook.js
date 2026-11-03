const express = require('express');
const crypto = require('crypto');
const phonePeService = require('./phonepe.service');
const Payment = require('../../payment.model');
const logger = require('../../../../utils/logger');

const router = express.Router();

/**
 * ─── PHONEPE WEBHOOK HANDLER ──────────────────────────
 * S2S (Server-to-Server) callback from PhonePe
 * 
 * This is a public endpoint for PhonePe to send notifications
 * Security: Verify checksum using salt key
 */

/**
 * Verify PhonePe callback checksum
 * @param {string} base64Payload - Decoded payload string
 * @param {string} checksum - Checksum header value (X-VERIFY)
 * @returns {boolean} True if checksum is valid
 */
const verifyChecksum = (base64Payload, checksum) => {
    try {
        logger.info('[PhonePe Webhook] Verifying callback checksum');

        const saltKey = process.env.PHONEPE_SALT_KEY;
        const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';

        if (!saltKey) {
            logger.error('[PhonePe Webhook] Salt Key is not configured in env variables');
            return false;
        }

        const stringToHash = base64Payload + saltKey;
        const hash = crypto.createHash('sha256').update(stringToHash).digest('hex');
        const expectedChecksum = `${hash}###${saltIndex}`;

        return expectedChecksum === checksum;
    } catch (error) {
        logger.error(`[PhonePe Webhook] Checksum verification error: ${error.message}`);
        return false;
    }
};

/**
 * Handle success callback
 * @param {object} callbackData - Decoded PhonePe payload data
 */
const handleSuccessCallback = async (callbackData) => {
    try {
        const { merchantTransactionId, transactionId } = callbackData;
        logger.info(`[PhonePe Webhook] Processing success callback for: ${merchantTransactionId}`);

        // Find payment by merchant transaction ID
        const payment = await Payment.findOne({ phonePeTransactionId: merchantTransactionId });

        if (!payment) {
            logger.warn(`[PhonePe Webhook] Payment record not found for transaction: ${merchantTransactionId}`);
            return;
        }

        if (payment.status !== 'paid') {
            // Verify and process payment callback
            await phonePeService.verifyPaymentCallback(merchantTransactionId, payment._id);

            // Process successful booking activation, ticketing, and notifications
            await phonePeService.processSuccessfulPayment(payment._id);

            logger.info(`[PhonePe Webhook] Payment successfully processed for Booking: ${payment.bookingId}`);
        } else {
            logger.info(`[PhonePe Webhook] Payment already marked as paid for: ${merchantTransactionId}`);
        }
    } catch (error) {
        logger.error(`[PhonePe Webhook] Handle success callback error: ${error.message}`);
    }
};

/**
 * Handle failure callback
 * @param {object} callbackData - Decoded PhonePe payload data
 * @param {string} reasonCode - Failure reason code
 */
const handleFailureCallback = async (callbackData, reasonCode = 'PAYMENT_FAILED') => {
    try {
        const { merchantTransactionId, transactionId } = callbackData;
        logger.info(`[PhonePe Webhook] Processing failure callback for: ${merchantTransactionId}`);

        // Find and update payment
        const payment = await Payment.findOne({ phonePeTransactionId: merchantTransactionId });

        if (payment && payment.status !== 'failed') {
            payment.status = 'failed';
            payment.failureReason = reasonCode;
            await payment.save();
            logger.warn(`[PhonePe Webhook] Payment status set to failed for: ${merchantTransactionId}. Reason: ${reasonCode}`);
        }
    } catch (error) {
        logger.error(`[PhonePe Webhook] Handle failure callback error: ${error.message}`);
    }
};

/**
 * Main callback endpoint
 * POST /webhook/phonepe/callback
 */
router.post('/callback', async (req, res) => {
    try {
        logger.info('[PhonePe Webhook] S2S Callback received');

        const { response } = req.body;
        const checksum = req.headers['x-verify'] || req.headers['x-phonepe-checksum'];

        if (!response || !checksum) {
            logger.warn('[PhonePe Webhook] Missing payload response or checksum header');
            return res.status(400).json({ success: false, error: 'Missing response payload or checksum' });
        }

        // Verify checksum using base64 payload response
        if (!verifyChecksum(response, checksum)) {
            logger.warn('[PhonePe Webhook] Checksum verification failed');
            return res.status(401).json({ success: false, error: 'Invalid checksum' });
        }

        // Decode base64 payload to JSON
        const decodedPayloadString = Buffer.from(response, 'base64').toString('utf-8');
        const payload = JSON.parse(decodedPayloadString);

        logger.info(`[PhonePe Webhook] Decoded event: ${payload.code} (Success: ${payload.success})`);

        const { success, code, data } = payload;

        // Route callback based on transaction success/failure
        if (success && code === 'PAYMENT_SUCCESS') {
            await handleSuccessCallback(data);
        } else {
            await handleFailureCallback(data, code);
        }

        // Always return success 200 to acknowledge callback receipt
        res.status(200).json({ success: true });
    } catch (error) {
        logger.error(`[PhonePe Webhook] Callback processing error: ${error.message}`);
        // Return 200 to stop retry storms from PhonePe API
        res.status(200).json({ success: false, error: error.message });
    }
});

module.exports = router;
