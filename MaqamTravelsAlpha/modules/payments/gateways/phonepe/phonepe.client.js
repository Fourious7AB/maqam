/**
 * ─── PHONEPE CLIENT ──────────────────────────────────
 * Facade/Interface for PhonePe Gateway
 */

const phonePeAdapter = require('./phonepe.adapter');
const logger = require('../../../../utils/logger');

const client = {
    payments: {
        create: async (amount, bookingId, customerDetails) => {
            logger.info(`[PhonePe] Creating payment request: ${bookingId}`);
            return phonePeAdapter.createPaymentRequest(amount, bookingId, customerDetails);
        },

        verify: async (transactionId) => {
            logger.info(`[PhonePe] Verifying transaction: ${transactionId}`);
            return phonePeAdapter.verifyPayment(transactionId);
        },

        refund: async (transactionId, amount, reason) => {
            logger.info(`[PhonePe] Refunding transaction: ${transactionId}`);
            return phonePeAdapter.refundPayment(transactionId, amount, reason);
        },
    },
};

module.exports = client;
