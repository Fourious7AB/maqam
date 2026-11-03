/**
 * ─── PAYPAL CLIENT ──────────────────────────────────
 * Facade/Interface for PayPal Gateway
 */

const paypalAdapter = require('./paypal.adapter');
const logger = require('../../../../utils/logger');

const client = {
    orders: {
        create: async (amount, bookingId, currency = 'USD', idempotencyKey = '') => {
            logger.info(`[PayPal] Creating order: ${bookingId}`);
            return paypalAdapter.createOrder(amount, bookingId, currency, idempotencyKey);
        },

        details: async (orderId) => {
            logger.info(`[PayPal] Fetching order: ${orderId}`);
            return paypalAdapter.getPaymentDetails(orderId);
        },

        capture: async (orderId, idempotencyKey = '') => {
            logger.info(`[PayPal] Capturing order: ${orderId}`);
            return paypalAdapter.capturePayment(orderId, idempotencyKey);
        },
    },

    payments: {
        refund: async (captureId, amount = null, currency = 'USD', reason = 'Booking cancelled', idempotencyKey = '') => {
            logger.info(`[PayPal] Refunding capture: ${captureId}`);
            return paypalAdapter.refundPayment(captureId, amount, currency, reason, idempotencyKey);
        },
    },
};

module.exports = client;
