const axios = require('axios');
const crypto = require('crypto');
const logger = require('../../../../utils/logger');
const { AppError } = require('../../../../middleware/errorHandler');

/**
 * ─── RAZORPAY ADAPTER ──────────────────────────────────
 * Handles all Razorpay API calls
 * Production-level gateway adapter
 * 
 * This is the SINGLE POINT OF INTEGRATION with Razorpay API
 * If Razorpay changes their API, only this file needs updating
 */

const razorpayClient = axios.create({
    baseURL: 'https://api.razorpay.com/v1',
    auth: {
        username: process.env.RAZORPAY_KEY_ID,
        password: process.env.RAZORPAY_KEY_SECRET,
    },
    timeout: 10000,
});

/**
 * Create Razorpay Order
 * @param {number} amount - Amount in rupees
 * @param {string} bookingId - Internal booking ID
 * @param {object} customerDetails - { name, email, phone }
 * @returns {Promise} Order object
 */
const createOrder = async (amount, bookingId, customerDetails = {}) => {
    try {
        logger.info(`[Razorpay] Creating order for booking: ${bookingId}, amount: ₹${amount}`);

        const response = await razorpayClient.post('/orders', {
            amount: Math.round(amount * 100), // Convert rupees to paise
            currency: 'INR',
            receipt: `booking_${bookingId}`,
            description: 'Flight Booking Payment',
            customer_notify: 1,
            notes: {
                bookingId,
                purpose: 'flight_booking',
                createdAt: new Date().toISOString(),
            },
        });

        logger.info(`[Razorpay] Order created: ${response.data.id}`);

        return {
            orderId: response.data.id,
            amount: response.data.amount,
            amountInINR: response.data.amount / 100,
            currency: response.data.currency,
            status: response.data.status,
            createdAt: new Date(response.data.created_at * 1000),
        };
    } catch (error) {
        logger.error(`[Razorpay] Order creation failed: ${error.message}`);
        throw new AppError(
            `Failed to create payment order: ${error.response?.data?.description || error.message}`,
            error.response?.status || 500
        );
    }
};

/**
 * Verify Payment Signature (CRITICAL - Security Check)
 * @param {string} orderId
 * @param {string} paymentId
 * @param {string} signature
 * @returns {boolean} True if signature is valid
 */
const verifyPaymentSignature = (orderId, paymentId, signature) => {
    try {
        const message = `${orderId}|${paymentId}`;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(message)
            .digest('hex');

        const isValid = expectedSignature === signature;

        if (!isValid) {
            logger.warn(`[Razorpay] Invalid signature for payment: ${paymentId}`);
        } else {
            logger.info(`[Razorpay] Signature verified for payment: ${paymentId}`);
        }

        return isValid;
    } catch (error) {
        logger.error(`[Razorpay] Signature verification error: ${error.message}`);
        return false;
    }
};

/**
 * Get Payment Details from Razorpay
 * @param {string} paymentId
 * @returns {Promise} Payment details
 */
const getPaymentDetails = async (paymentId) => {
    try {
        logger.info(`[Razorpay] Fetching payment details: ${paymentId}`);

        const response = await razorpayClient.get(`/payments/${paymentId}`);

        return {
            paymentId: response.data.id,
            orderId: response.data.order_id,
            amount: response.data.amount,
            amountInINR: response.data.amount / 100,
            currency: response.data.currency,
            status: response.data.status, // 'authorized', 'captured', 'failed'
            method: response.data.method,
            email: response.data.email,
            contact: response.data.contact,
            description: response.data.description,
            createdAt: new Date(response.data.created_at * 1000),
            capturedAt: response.data.captured_at ? new Date(response.data.captured_at * 1000) : null,
            notes: response.data.notes,
        };
    } catch (error) {
        logger.error(`[Razorpay] Fetch payment failed: ${error.message}`);
        throw new AppError('Failed to fetch payment details', error.response?.status || 500);
    }
};

/**
 * Capture Payment (if not auto-captured)
 * @param {string} paymentId
 * @param {number} amount - in rupees
 * @returns {Promise}
 */
const capturePayment = async (paymentId, amount) => {
    try {
        logger.info(`[Razorpay] Capturing payment: ${paymentId}, amount: ₹${amount}`);

        const response = await razorpayClient.post(`/payments/${paymentId}/capture`, {
            amount: Math.round(amount * 100),
        });

        return {
            paymentId: response.data.id,
            status: response.data.status,
            amount: response.data.amount / 100,
            capturedAt: new Date(response.data.captured_at * 1000),
        };
    } catch (error) {
        logger.error(`[Razorpay] Capture failed: ${error.message}`);
        throw new AppError('Failed to capture payment', error.response?.status || 500);
    }
};

/**
 * Refund Payment (full or partial)
 * @param {string} paymentId
 * @param {number} amount - Optional, in rupees
 * @param {string} reason
 * @returns {Promise}
 */
const refundPayment = async (paymentId, amount, reason = 'Booking cancelled') => {
    try {
        logger.info(`[Razorpay] Processing refund for payment: ${paymentId}`);

        const response = await razorpayClient.post(`/payments/${paymentId}/refund`, {
            ...(amount && { amount: Math.round(amount * 100) }),
            notes: {
                reason,
                processedAt: new Date().toISOString(),
            },
        });

        return {
            refundId: response.data.id,
            paymentId: response.data.payment_id,
            amount: response.data.amount / 100,
            status: response.data.status,
            createdAt: new Date(response.data.created_at * 1000),
        };
    } catch (error) {
        logger.error(`[Razorpay] Refund failed: ${error.message}`);
        throw new AppError('Failed to process refund', error.response?.status || 500);
    }
};

// payments -> gateway -> razorpay there is razorpay no razorpay.client.js file is this nacessary..? 
// if yes then add razorpay.client.js in payments -> gateway -> razorpay folder and also check all payment related file 
// structure . and if providers/razorpay is not nacessary then delete it.. I want to add payple payment gateway also..
/**
 * Create Customer (for recurring payments)
 * @param {object} details - { name, email, phone }
 * @returns {Promise}
 */
const createCustomer = async ({ name, email, phone }) => {
    try {
        logger.info(`[Razorpay] Creating customer: ${email}`);

        const response = await razorpayClient.post('/customers', {
            name,
            email,
            contact: phone,
        });

        return {
            customerId: response.data.id,
            name: response.data.name,
            email: response.data.email,
            contact: response.data.contact,
        };
    } catch (error) {
        logger.error(`[Razorpay] Customer creation failed: ${error.message}`);
        throw new AppError('Failed to create customer', error.response?.status || 500);
    }
};

module.exports = {
    createOrder,
    verifyPaymentSignature,
    getPaymentDetails,
    capturePayment,
    refundPayment,
    createCustomer,
};
