/**
 * ─── RAZORPAY CLIENT ──────────────────────────────────
 * Facade/Interface for Razorpay Gateway
 * 
 * This provides a clean, organized interface to the Razorpay adapter.
 * Makes it easy to:
 * - Mock for testing
 * - Switch to a different provider
 * - Add retry logic centrally
 * - Add request/response logging
 */

const razorpayAdapter = require('./razorpay.adapter');
const logger = require('../../../../utils/logger');

/**
 * Razorpay Client - Organized interface
 */
const client = {
    /**
     * Orders API
     */
    orders: {
        /**
         * Create a new order
         * @param {number} amount - Amount in rupees
         * @param {string} bookingId - Booking reference
         * @param {object} customerDetails - { name, email, phone }
         * @returns {Promise}
         */
        create: async (amount, bookingId, customerDetails) => {
            logger.info(`[Razorpay] Creating order: ${bookingId}`);
            return razorpayAdapter.createOrder(amount, bookingId, customerDetails);
        },
    },

    /**
     * Payments API
     */
    payments: {
        /**
         * Verify payment signature
         * @param {string} orderId
         * @param {string} paymentId
         * @param {string} signature
         * @returns {boolean}
         */
        verify: (orderId, paymentId, signature) => {
            logger.info(`[Razorpay] Verifying payment: ${paymentId}`);
            return razorpayAdapter.verifyPaymentSignature(orderId, paymentId, signature);
        },

        /**
         * Get payment details
         * @param {string} paymentId
         * @returns {Promise}
         */
        fetch: async (paymentId) => {
            logger.info(`[Razorpay] Fetching payment: ${paymentId}`);
            return razorpayAdapter.getPaymentDetails(paymentId);
        },

        /**
         * Capture payment
         * @param {string} paymentId
         * @param {number} amount - Amount in rupees
         * @returns {Promise}
         */
        capture: async (paymentId, amount) => {
            logger.info(`[Razorpay] Capturing payment: ${paymentId}`);
            return razorpayAdapter.capturePayment(paymentId, amount);
        },

        /**
         * Refund payment
         * @param {string} paymentId
         * @param {number} amount - Amount in rupees (optional)
         * @param {string} reason
         * @returns {Promise}
         */
        refund: async (paymentId, amount, reason) => {
            logger.info(`[Razorpay] Refunding payment: ${paymentId}`);
            return razorpayAdapter.refundPayment(paymentId, amount, reason);
        },
    },

    /**
     * Customers API (for recurring payments)
     */
    customers: {
        /**
         * Create customer
         * @param {object} details - { name, email, phone }
         * @returns {Promise}
         */
        create: async (details) => {
            logger.info(`[Razorpay] Creating customer: ${details.email}`);
            return razorpayAdapter.createCustomer(details);
        },
    },
};

module.exports = client;
