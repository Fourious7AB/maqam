const axios = require('axios');
const https = require('https');
const logger = require('../../../../utils/logger');
const { AppError } = require('../../../../middleware/errorHandler');
const { retryWithBackoff } = require('../../retryStrategy');

// Establish high-performance connection pool with HTTP Keep-Alive
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  keepAliveMsecs: 10000,
});

const getBaseUrl = () => {
  return process.env.PAYPAL_MODE === 'production'
    ? 'https://api.paypal.com'
    : 'https://api.sandbox.paypal.com';
};

// Create raw axios client (we will configure auth dynamically per request)
const paypalClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
  httpsAgent,
  headers: {
    'Content-Type': 'application/json',
  },
});

let tokenCache = {
  token: null,
  expiresAt: null,
  pendingPromise: null // Deduplicate concurrent token requests
};

/**
 * Fetch OAuth2 Access Token. Deduplicates concurrent requests using a shared promise.
 * @returns {Promise<string>}
 */
const getAccessToken = async () => {
  if (tokenCache.token && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  // If a request is already fetching a token, reuse the promise
  if (tokenCache.pendingPromise) {
    return tokenCache.pendingPromise;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new AppError('PayPal API credentials are not configured in environment variables.', 500);
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const url = `${getBaseUrl()}/v1/oauth2/token`;

  tokenCache.pendingPromise = axios.post(url, 'grant_type=client_credentials', {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    httpsAgent,
    timeout: 10000,
  })
    .then((response) => {
      tokenCache.token = response.data.access_token;
      // Expire 5 minutes early to avoid transient race conditions
      tokenCache.expiresAt = Date.now() + (response.data.expires_in - 300) * 1000;
      tokenCache.pendingPromise = null;
      return tokenCache.token;
    })
    .catch((error) => {
      tokenCache.pendingPromise = null;
      const errMsg = error.response?.data?.error_description || error.message;
      logger.error(`[PayPal Adapter] Authentication failed: ${errMsg}`);
      throw new AppError(`PayPal Authentication failed: ${errMsg}`, 500);
    });

  return tokenCache.pendingPromise;
};

/**
 * Create PayPal Order
 * @param {number} amount
 * @param {string} bookingId
 * @param {string} currency - Passed from booking
 * @param {string} idempotencyKey - Scoped requestId for transaction safety
 * @returns {Promise<object>}
 */
const createOrder = async (amount, bookingId, currency = 'USD', idempotencyKey = '') => {
  try {
    logger.info(`[PayPal Adapter] Creating order for booking: ${bookingId}, amount: ${amount} ${currency}`);

    const token = await getAccessToken();

    // Use a wrapper retry execution ONLY for this network attempt, if safe
    const executePost = async () => {
      return await paypalClient.post('/v2/checkout/orders',
        {
          intent: 'CAPTURE',
          purchase_units: [{
            amount: {
              currency_code: currency,
              value: amount.toFixed(2),
            },
            description: `Travel Booking #${bookingId}`,
            custom_id: bookingId,
            reference_id: `booking_${bookingId}`,
          }],
          application_context: {
            brand_name: 'Maqam Travels',
            user_action: 'PAY_NOW',
            return_url: `${process.env.PAYPAL_RETURN_URL_BASE || process.env.CLIENT_URL || 'http://localhost:5069'}/payment/paypal/success?bookingId=${bookingId}`,
            cancel_url: `${process.env.PAYPAL_RETURN_URL_BASE || process.env.CLIENT_URL || 'http://localhost:5069'}/payment/paypal/cancel?bookingId=${bookingId}`,
          }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            // PayPal custom idempotency identifier
            ...(idempotencyKey && { 'PayPal-Request-Id': idempotencyKey }),
          },
        }
      );
    };

    // Safe to retry order creation since PayPal-Request-Id protects against duplicate charges
    const response = await retryWithBackoff(executePost, { maxRetries: 2 });
    logger.info(`[PayPal Adapter] Order created successfully: ${response.data.id}`);

    const approveLink = response.data.links.find(link => link.rel === 'approve')?.href;

    return {
      orderId: response.data.id,
      amount,
      currency,
      status: response.data.status,
      redirectUrl: approveLink || '',
      links: response.data.links,
      raw: response.data,
    };
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message;
    logger.error(`[PayPal Adapter] Create order failed: ${errMsg}`, { error: error.response?.data });
    throw new AppError(
      `Failed to create PayPal payment order: ${errMsg}`,
      error.response?.status || 500
    );
  }
};

/**
 * Capture Authorized PayPal Payment Order
 * @param {string} orderId
 * @param {string} idempotencyKey - Capture action identifier
 * @returns {Promise<object>}
 */
const capturePayment = async (orderId, idempotencyKey = '') => {
  try {
    logger.info(`[PayPal Adapter] Capturing order: ${orderId}`);

    const token = await getAccessToken();

    // POST captures are NOT safe to blindly retry without an idempotency key header
    const response = await paypalClient.post(`/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(idempotencyKey && { 'PayPal-Request-Id': idempotencyKey }),
        },
      }
    );

    logger.info(`[PayPal Adapter] Order captured: ${orderId}, response status: ${response.data.status}`);

    const purchaseUnit = response.data.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];

    if (!capture) {
      throw new AppError('No capture found in PayPal capture response', 500);
    }

    return {
      transactionId: capture.id,
      status: response.data.status,
      amount: parseFloat(capture.amount.value),
      currency: capture.amount.currency_code,
      raw: response.data,
    };
  } catch (error) {
    // If order was already captured on PayPal, retrieve order details to obtain the existing capture reference
    const isAlreadyCaptured =
      error.response?.data?.details?.some((d) => d.issue === 'ORDER_ALREADY_CAPTURED') ||
      /ORDER_ALREADY_CAPTURED/i.test(error.response?.data?.message || '') ||
      error.response?.status === 422;

    if (isAlreadyCaptured) {
      logger.info(`[PayPal Adapter] Order ${orderId} already captured on PayPal. Fetching existing details...`);
      try {
        const orderDetails = await getPaymentDetails(orderId);
        const purchaseUnit = orderDetails?.purchase_units?.[0];
        const capture = purchaseUnit?.payments?.captures?.[0];
        if (capture) {
          return {
            transactionId: capture.id,
            status: orderDetails.status || 'COMPLETED',
            amount: parseFloat(capture.amount?.value || 0),
            currency: capture.amount?.currency_code || 'USD',
            raw: orderDetails,
          };
        }
      } catch (fetchErr) {
        logger.warn(`[PayPal Adapter] Could not fetch details for already-captured order: ${fetchErr.message}`);
      }
    }

    const errMsg = error.response?.data?.message || error.message;
    logger.error(`[PayPal Adapter] Capture failed: ${errMsg}`, { error: error.response?.data });
    throw new AppError(
      `Failed to capture PayPal payment: ${errMsg}`,
      error.response?.status || 500
    );
  }
};

/**
 * Refund Captured PayPal Payment (Supports partial and full refunds)
 * @param {string} captureId
 * @param {number} amount - Cents/INR formatted. Null represents full refund.
 * @param {string} currency - Currency code
 * @param {string} reason
 * @param {string} idempotencyKey
 * @returns {Promise<object>}
 */
const refundPayment = async (captureId, amount, currency = 'USD', reason = 'Booking cancelled', idempotencyKey = '') => {
  try {
    logger.info(`[PayPal Adapter] Processing refund for capture: ${captureId}, amount: ${amount || 'FULL'}`);

    const token = await getAccessToken();
    const payload = {};

    if (amount) {
      payload.amount = {
        value: amount.toFixed(2),
        currency_code: currency,
      };
    }
    if (reason) {
      payload.note_to_payer = reason.substring(0, 255); // PayPal notes length limit
    }

    const response = await paypalClient.post(`/v2/payments/captures/${captureId}/refund`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(idempotencyKey && { 'PayPal-Request-Id': idempotencyKey }),
        },
      }
    );

    logger.info(`[PayPal Adapter] Refund created successfully: ${response.data.id}`);

    return {
      refundId: response.data.id,
      status: response.data.status,
      amount: response.data.amount ? parseFloat(response.data.amount.value) : amount,
      raw: response.data,
    };
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message;
    logger.error(`[PayPal Adapter] Refund failed: ${errMsg}`, { error: error.response?.data });
    throw new AppError(
      `Failed to process PayPal refund: ${errMsg}`,
      error.response?.status || 500
    );
  }
};

/**
 * Get Order Details from PayPal (safe to retry)
 * @param {string} orderId
 * @returns {Promise<object>}
 */
const getPaymentDetails = async (orderId) => {
  try {
    logger.info(`[PayPal Adapter] Fetching details for order: ${orderId}`);

    const token = await getAccessToken();

    const fetchDetails = async () => {
      const response = await paypalClient.get(`/v2/checkout/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    };

    // Safe to retry since it is a GET call
    return await retryWithBackoff(fetchDetails, { maxRetries: 3 });
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message;
    logger.error(`[PayPal Adapter] Fetch details failed: ${errMsg}`);
    throw new AppError(
      `Failed to fetch PayPal order details: ${errMsg}`,
      error.response?.status || 500
    );
  }
};

module.exports = {
  createOrder,
  capturePayment,
  refundPayment,
  getPaymentDetails,
  getAccessToken,
};
