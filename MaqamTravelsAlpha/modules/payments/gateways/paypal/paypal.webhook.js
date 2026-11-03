const express = require('express');
const axios = require('axios');
const paypalService = require('./paypal.service');
const Payment = require('../../payment.model');
const WebhookEvent = require('../../webhookEvent.model');
const { getAccessToken } = require('./paypal.adapter');
const { withLock } = require('../../distributedLock');
const logger = require('../../../../utils/logger');
const { PAYMENT_STATUS } = require('../../payment.constants');

const router = express.Router();

/**
 * Verifies PayPal webhook headers using PayPal's signature check API.
 */
const verifyWebhookSignature = async (req) => {
  try {
    if (process.env.PAYPAL_BYPASS_WEBHOOK_VERIFY === 'true') {
      logger.info('[PayPal Webhook] Signature verification bypassed via PAYPAL_BYPASS_WEBHOOK_VERIFY=true');
      return true;
    }

    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      logger.error('[PayPal Webhook] PAYPAL_WEBHOOK_ID is not configured in env variables.');
      return false;
    }

    const token = await getAccessToken();
    const isProd = process.env.PAYPAL_MODE === 'production';
    const verifyUrl = isProd
      ? 'https://api.paypal.com/v1/notifications/verify-webhook-signature'
      : 'https://api.sandbox.paypal.com/v1/notifications/verify-webhook-signature';

    const response = await axios.post(
      verifyUrl,
      {
        auth_algo: req.headers['paypal-auth-algo'],
        cert_url: req.headers['paypal-cert-url'],
        transmission_id: req.headers['paypal-transmission-id'],
        transmission_sig: req.headers['paypal-transmission-sig'],
        transmission_time: req.headers['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: req.body, // The parsed JSON body of the webhook
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      }
    );

    const status = response.data?.verification_status;
    if (status !== 'SUCCESS') {
      logger.warn(`[PayPal Webhook] Signature verification status returned: ${status}`);
    }

    return status === 'SUCCESS';
  } catch (error) {
    logger.error(`[PayPal Webhook] Signature verification request failed: ${error.message}`);
    return false;
  }
};

/**
 * PAYMENT.CAPTURE.COMPLETED Handler
 */
const handleCaptureCompleted = async (event, correlationId) => {
  const resource = event.resource;
  const captureId = resource.id;
  const orderId = resource.supplementary_data?.related_ids?.order_id;
  const bookingId = resource.custom_id;

  logger.info(`[PayPal Webhook] Processing capture.completed event - Capture: ${captureId}, Order: ${orderId}`, { correlationId });

  // Fallback lookup: search by PayPal Order ID, then by Mongoose bookingId
  const query = orderId 
    ? { 'gatewayData.orderId': orderId } 
    : { bookingId, paymentMethod: 'paypal' };

  const payment = await Payment.findOne(query);
  if (!payment) {
    throw new Error(`Orphaned Webhook: Payment record not found for Order ID: ${orderId || 'N/A'}, Booking ID: ${bookingId}`);
  }

  // If already processed as PAID, complete idempotently
  if (payment.status === PAYMENT_STATUS.PAID) {
    logger.info(`[PayPal Webhook] Payment already marked as PAID (idempotent skip): ${payment._id}`, { correlationId });
    return;
  }

  // Reuse service capture logic (enforces database transaction, locks, and booking updates)
  // Since lock key is derived from orderId, this serializes correctly with concurrent API threads
  await paypalService.captureAndVerifyPayment(payment.gatewayData.orderId, null, correlationId);
  
  // Trigger post-processing operations asynchronously
  paypalService.processSuccessfulPayment(payment._id, correlationId)
    .catch(err => logger.error(`[PayPal Webhook] Successful capture post-processing fail: ${err.message}`));
};

/**
 * PAYMENT.CAPTURE.DENIED / FAILED Handler
 */
const handleCaptureFailed = async (event, correlationId) => {
  const resource = event.resource;
  const orderId = resource.supplementary_data?.related_ids?.order_id;
  
  const payment = await Payment.findOne({ 'gatewayData.orderId': orderId });
  if (!payment) return;

  if (payment.status !== PAYMENT_STATUS.FAILED) {
    payment.status = PAYMENT_STATUS.FAILED;
    payment.failureReason = resource.status_details?.reason || 'PayPal Capture Denied';
    await payment.save();
    logger.warn(`[PayPal Webhook] Payment failed: ${payment._id}, Reason: ${payment.failureReason}`, { correlationId });
  }
};

/**
 * PAYMENT.CAPTURE.REFUNDED Handler
 */
const handleRefundCompleted = async (event, correlationId) => {
  const resource = event.resource;
  const captureId = resource.capture_id;
  const refundId = resource.id;
  const refundAmount = parseFloat(resource.amount?.value || '0');

  logger.info(`[PayPal Webhook] Processing refund.completed event - Refund ID: ${refundId}, Capture ID: ${captureId}`, { correlationId });

  const payment = await Payment.findOne({ 'gatewayData.captureId': captureId });
  if (!payment) return;

  // Check if refund is already logged in refunds array
  const alreadyLogged = payment.refunds.some(r => r.refundId === refundId);
  if (alreadyLogged) {
    logger.info(`[PayPal Webhook] Refund event already logged (idempotent skip): ${refundId}`, { correlationId });
    return;
  }

  // Push refund logs and update total amount
  payment.refunds.push({
    refundId,
    amount: refundAmount,
    currency: payment.currency,
    reason: resource.note_to_payer || 'Reconciled from gateway webhook',
    status: 'processed',
    processedAt: new Date(resource.create_time),
    gatewayResponse: resource,
  });

  payment.totalRefunded = parseFloat((payment.totalRefunded + refundAmount).toFixed(2));
  payment.status = payment.totalRefunded >= payment.amount ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.PARTIALLY_REFUNDED;
  await payment.save();

  logger.info(`[PayPal Webhook] Refund synchronized successfully. Status: ${payment.status}`, { correlationId });
};

/**
 * Main Webhook Handler Endpoint
 * POST /webhook/paypal/ipn (or mounts globally on /webhook/paypal)
 */
router.post('/ipn', async (req, res) => {
  const correlationId = req.correlationId;
  const eventId = req.body?.id;
  
  try {
    logger.info(`[PayPal Webhook] Webhook request received. Event ID: ${eventId}`, { correlationId });

    // 1. Replay attack verification / Stale timestamp check
    // We log stale timestamps for auditing, but do not hard-block with HTTP 400
    // so PayPal retries and manual webhook resends from developer dashboard succeed safely.
    // Unique event ID recording (step 3) acts as the primary idempotent replay guard.
    const transmissionTime = req.headers['paypal-transmission-time'];
    if (transmissionTime) {
      const transmissionDate = new Date(transmissionTime);
      const isStale = (Date.now() - transmissionDate.getTime()) > (24 * 60 * 60 * 1000); // 24 hours
      if (isStale) {
        logger.warn(`[PayPal Webhook] Stale request timestamp received: ${transmissionTime}`, { correlationId });
      }
    }

    // 2. Cryptographic signature check via PayPal's endpoints
    const isValid = await verifyWebhookSignature(req);
    if (!isValid) {
      logger.warn('[PayPal Webhook] Invalid cryptographic signature verification.', { correlationId });
      return res.status(403).json({ error: 'Signature verification check failed' });
    }

    // 3. Deduplication check: Record event receipt atomically
    let webhookEventRecord;
    try {
      webhookEventRecord = await WebhookEvent.create({
        eventId,
        gateway: 'paypal',
        eventType: req.body.event_type,
        payload: req.body,
        status: 'received',
      });
    } catch (err) {
      if (err.code === 11000) {
        logger.warn(`[PayPal Webhook] Duplicate event rejected. Event ID: ${eventId}`, { correlationId });
        return res.status(200).send('Duplicate event bypassed');
      }
      throw err;
    }

    // 4. Lock resource and process payload
    // Lock key is derived from the event ID to serialize processing
    const processLockKey = `webhook:paypal:${eventId}`;
    await withLock(processLockKey, 15000, async () => {
      webhookEventRecord.status = 'processing';
      webhookEventRecord.attempts += 1;
      webhookEventRecord.lastAttemptAt = new Date();
      await webhookEventRecord.save();

      const eventType = req.body.event_type;
      
      switch (eventType) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          await handleCaptureCompleted(req.body, correlationId);
          break;

        case 'CHECKOUT.ORDER.APPROVED':
          logger.info(`[PayPal Webhook] Order approved by buyer - Order ID: ${req.body.resource?.id}`, { correlationId });
          break;

        case 'CHECKOUT.ORDER.COMPLETED':
          logger.info(`[PayPal Webhook] Checkout order completed - Order ID: ${req.body.resource?.id}`, { correlationId });
          break;

        case 'PAYMENT.CAPTURE.DENIED':
        case 'PAYMENT.CAPTURE.FAILED':
          await handleCaptureFailed(req.body, correlationId);
          break;

        case 'PAYMENT.CAPTURE.REFUNDED':
          await handleRefundCompleted(req.body, correlationId);
          break;

        default:
          logger.info(`[PayPal Webhook] Unhandled Webhook Event Type: ${eventType}`, { correlationId });
      }

      webhookEventRecord.status = 'processed';
      webhookEventRecord.processedAt = new Date();
      await webhookEventRecord.save();
    });

    // Webhooks must ALWAYS return a success status to prevent retries
    return res.status(200).send('Webhook Received');
  } catch (error) {
    logger.error(`[PayPal Webhook] Failed to process event ${eventId}: ${error.message}`, { correlationId });
    
    // Dead Letter Queue (DLQ) integration: Update event record to failed state
    if (eventId) {
      try {
        await WebhookEvent.findOneAndUpdate(
          { eventId },
          {
            status: 'failed',
            error: error.message,
            lastAttemptAt: new Date(),
          }
        );
      } catch (dlqErr) {
        logger.error(`[PayPal Webhook] Failed to write to Webhook Event DLQ: ${dlqErr.message}`);
      }
    }

    // Return 200 OK so PayPal doesn't repeat the webhook indefinitely
    return res.status(200).send('Webhook Error Managed');
  }
});

module.exports = router;
