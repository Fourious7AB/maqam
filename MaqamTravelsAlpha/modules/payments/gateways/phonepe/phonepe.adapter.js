/**
 * ─── PHONEPE ADAPTER ──────────────────────────────────
 * Handles all PhonePe API calls
 * 
 * PhonePe is popular for UPI payments in India
 * Integration: Payment initiation -> Callback notification
 * Production-level gateway adapter
 */

const axios = require('axios');
const crypto = require('crypto');
const logger = require('../../../../utils/logger');
const { AppError } = require('../../../../middleware/errorHandler');

// Initialize PhonePe client
const phonePeClient = axios.create({
    baseURL: process.env.PHONEPE_MODE === 'production'
        ? 'https://api.phonepe.com/apis/hermes'
        : 'https://api-sandbox.phonepe.com/apis/hermes',
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Generate PhonePe checksum (X-VERIFY) header for POST requests
 * @param {string} payloadBase64 - Base64 encoded payload JSON string
 * @param {string} endpoint - API endpoint (e.g. /pg/v1/pay)
 * @param {string} saltKey - Salt key from PhonePe dashboard
 * @param {string} saltIndex - Salt index from PhonePe dashboard
 * @returns {string} Checksum header value
 */
const buildXVerifyHeader = (payloadBase64, endpoint, saltKey, saltIndex) => {
    const stringToHash = payloadBase64 + endpoint + saltKey;
    const hash = crypto.createHash('sha256').update(stringToHash).digest('hex');
    return `${hash}###${saltIndex}`;
};

/**
 * Generate PhonePe checksum (X-VERIFY) header for GET/Status requests
 * @param {string} merchantId - PhonePe Merchant ID
 * @param {string} transactionId - PhonePe Merchant Transaction ID
 * @param {string} saltKey - Salt key from PhonePe dashboard
 * @param {string} saltIndex - Salt index from PhonePe dashboard
 * @returns {string} Checksum header value
 */
const buildStatusXVerifyHeader = (merchantId, transactionId, saltKey, saltIndex) => {
    const endpoint = `/pg/v1/status/${merchantId}/${transactionId}`;
    const stringToHash = endpoint + saltKey;
    const hash = crypto.createHash('sha256').update(stringToHash).digest('hex');
    return `${hash}###${saltIndex}`;
};

/**
 * Generate PhonePe transaction ID
 * @returns {string} Unique transaction ID
 */
const generateTransactionId = () => {
    return `MT_${Date.now()}_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
};

/**
 * Create PhonePe Payment Request
 * @param {number} amount - Amount in rupees
 * @param {string} bookingId - Internal booking ID reference
 * @param {object} customerDetails - { name, email, phone }
 * @returns {Promise<object>} Redirect payment details
 */
const createPaymentRequest = async (amount, bookingId, customerDetails = {}) => {
    try {
        logger.info(`[PhonePe Adapter] Creating payment request for booking: ${bookingId}, amount: ₹${amount}`);

        const merchantId = process.env.PHONEPE_MERCHANT_ID;
        const saltKey = process.env.PHONEPE_SALT_KEY;
        const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
        const callbackUrl = process.env.PHONEPE_CALLBACK_URL || 'https://yourdomain.com/webhook/phonepe/callback';
        const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/phonepe/status?bookingId=${bookingId}`;

        if (!merchantId || !saltKey) {
            throw new AppError('PhonePe credentials (PHONEPE_MERCHANT_ID, PHONEPE_SALT_KEY) are not configured in environment variables.', 500);
        }

        const transactionId = generateTransactionId();
        // PhonePe expects amount in paise (1 INR = 100 paise)
        const amountInPaise = Math.round(amount * 100);

        const payload = {
            merchantId,
            merchantTransactionId: transactionId,
            merchantUserId: customerDetails.email ? customerDetails.email.replace(/[^a-zA-Z0-9]/g, '_') : `user_${Date.now()}`,
            amount: amountInPaise,
            redirectUrl,
            redirectMode: 'REDIRECT',
            callbackUrl,
            mobileNumber: customerDetails.phone || '9999999999',
            paymentInstrument: {
                type: 'PAY_PAGE'
            }
        };

        const payloadString = JSON.stringify(payload);
        const payloadBase64 = Buffer.from(payloadString).toString('base64');
        const xVerify = buildXVerifyHeader(payloadBase64, '/pg/v1/pay', saltKey, saltIndex);

        const response = await phonePeClient.post('/pg/v1/pay', 
            { request: payloadBase64 },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-VERIFY': xVerify,
                }
            }
        );

        if (response.data?.success && response.data?.data?.instrumentResponse?.redirectInfo?.url) {
            logger.info(`[PhonePe Adapter] Payment initiated. URL: ${response.data.data.instrumentResponse.redirectInfo.url}`);
            return {
                transactionId,
                redirectUrl: response.data.data.instrumentResponse.redirectInfo.url,
                amount,
                status: response.data.code,
            };
        } else {
            throw new AppError(response.data?.message || 'Failed to initiate PhonePe payment request', 400);
        }
    } catch (error) {
        logger.error(`[PhonePe Adapter] Create payment request failed: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
        throw new AppError(
            `Failed to create PhonePe payment request: ${error.response?.data?.message || error.message}`,
            error.response?.status || 500
        );
    }
};

/**
 * Verify PhonePe Payment transaction status
 * @param {string} transactionId - PhonePe Transaction ID
 * @returns {Promise<object>} Status verification details
 */
const verifyPayment = async (transactionId) => {
    try {
        logger.info(`[PhonePe Adapter] Checking status for transaction: ${transactionId}`);

        const merchantId = process.env.PHONEPE_MERCHANT_ID;
        const saltKey = process.env.PHONEPE_SALT_KEY;
        const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';

        if (!merchantId || !saltKey) {
            throw new AppError('PhonePe credentials are not configured in environment variables.', 500);
        }

        const endpoint = `/pg/v1/status/${merchantId}/${transactionId}`;
        const xVerify = buildStatusXVerifyHeader(merchantId, transactionId, saltKey, saltIndex);

        const response = await phonePeClient.get(endpoint, {
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': xVerify,
                'X-MERCHANT-ID': merchantId,
            }
        });

        const success = response.data?.success && response.data?.code === 'PAYMENT_SUCCESS';
        logger.info(`[PhonePe Adapter] Transaction verification result: ${response.data?.code} (Success: ${success})`);

        return {
            success,
            transactionId: response.data?.data?.merchantTransactionId,
            amount: response.data?.data?.amount ? response.data.data.amount / 100 : null,
            status: response.data?.code,
            paymentState: response.data?.data?.state, // COMPLETED, FAILED, PENDING
            paymentDetails: response.data?.data?.paymentInstrument || {}
        };
    } catch (error) {
        logger.error(`[PhonePe Adapter] Verify payment failed: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
        throw new AppError(
            `Failed to verify PhonePe payment status: ${error.response?.data?.message || error.message}`,
            error.response?.status || 500
        );
    }
};

/**
 * Refund PhonePe Payment
 * @param {string} transactionId - Original PhonePe Transaction ID to refund
 * @param {number} amount - Amount in rupees to refund
 * @param {string} reason - Refund reason
 * @returns {Promise<object>} Refund response details
 */
const refundPayment = async (transactionId, amount, reason = 'Refund requested') => {
    try {
        logger.info(`[PhonePe Adapter] Processing refund for transaction: ${transactionId}, amount: ₹${amount}`);

        const merchantId = process.env.PHONEPE_MERCHANT_ID;
        const saltKey = process.env.PHONEPE_SALT_KEY;
        const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';

        if (!merchantId || !saltKey) {
            throw new AppError('PhonePe credentials are not configured in environment variables.', 500);
        }

        const refundTransactionId = `REF_${Date.now()}`;
        const amountInPaise = Math.round(amount * 100);

        const payload = {
            merchantId,
            merchantTransactionId: refundTransactionId,
            originalTransactionId: transactionId,
            amount: amountInPaise,
            callbackUrl: process.env.PHONEPE_CALLBACK_URL || 'https://yourdomain.com/webhook/phonepe/callback',
        };

        const payloadString = JSON.stringify(payload);
        const payloadBase64 = Buffer.from(payloadString).toString('base64');
        const xVerify = buildXVerifyHeader(payloadBase64, '/pg/v1/refund', saltKey, saltIndex);

        const response = await phonePeClient.post('/pg/v1/refund', 
            { request: payloadBase64 },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-VERIFY': xVerify,
                }
            }
        );

        if (response.data?.success) {
            logger.info(`[PhonePe Adapter] Refund initiated successfully. ID: ${response.data.data.merchantTransactionId}`);
            return {
                refundId: response.data.data.merchantTransactionId,
                status: response.data.code,
                amount: response.data.data.amount / 100,
            };
        } else {
            throw new AppError(response.data?.message || 'PhonePe refund failed', 400);
        }
    } catch (error) {
        logger.error(`[PhonePe Adapter] Refund failed: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
        throw new AppError(
            `Failed to process PhonePe refund: ${error.response?.data?.message || error.message}`,
            error.response?.status || 500
        );
    }
};

module.exports = {
    createPaymentRequest,
    verifyPayment,
    refundPayment,
    generateTransactionId,
    buildXVerifyHeader,
    buildStatusXVerifyHeader
};



 