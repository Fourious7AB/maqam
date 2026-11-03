const express = require('express');
const crypto = require('crypto');
const razorpayService = require('./razorpay.service');
const Payment = require('../../payment.model');
const WebhookEvent = require('../../webhookEvent.model');
const { withLock } = require('../../distributedLock');
const logger = require('../../../../utils/logger');
const { PAYMENT_STATUS } = require('../../payment.constants');

const router = express.Router();

/**
 * Verifies Razorpay webhook signature using the raw request buffer to protect key formatting.
 */
const verifyWebhookSignature = (req) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      logger.warn('[Razorpay Webhook] Missing x-razorpay-signature header');
      return false;
    }

    // Capture byte buffer for cryptographic safety, fallback to stringification if buffer is empty
    const bodyContent = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      logger.error('[Razorpay Webhook] RAZORPAY_KEY_SECRET is not configured.');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(bodyContent)
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    logger.error(`[Razorpay Webhook] Signature verification failed: ${error.message}`);
    return false;
  }
};

/**
 * Handle payment.captured event
 */
const handlePaymentCaptured = async (event, correlationId) => {
  const paymentEntity = event.payload.payment.entity;
  const paymentId = paymentEntity.id; // Razorpay payment ID
  const orderId = paymentEntity.order_id;
  const status = paymentEntity.status;

  logger.info(`[Razorpay Webhook] Processing captured event for payment: ${paymentId}, Order: ${orderId}`, { correlationId });

  if (status !== 'captured') {
    logger.warn(`[Razorpay Webhook] Payment is not in captured status: ${status}`, { correlationId });
    return;
  }

  // Find target payment log record
  const payment = await Payment.findOne({ 'gatewayData.orderId': orderId });
  if (!payment) {
    throw new Error(`Orphaned Webhook: Payment record not found for Razorpay Order: ${orderId}`);
  }

  // Idempotent check
  if (payment.status === PAYMENT_STATUS.PAID) {
    logger.info(`[Razorpay Webhook] Payment already marked as PAID (idempotent skip): ${payment._id}`, { correlationId });
    return;
  }

  // Verify and process the payment (updates DB session, locks, and booking status)
  const result = await razorpayService.verifyAndProcessPayment(
    orderId,
    paymentId,
    paymentEntity.notes?.signature || '', // Pull verification signature if stored
    correlationId
  );

  // Trigger post-processing ticketing/invoicing steps
  await razorpayService.processSuccessfulPayment(result.paymentId, correlationId);
};

/**
 * Handle payment.failed event
 */
const handlePaymentFailed = async (event, correlationId) => {
  const paymentEntity = event.payload.payment.entity;
  const paymentId = paymentEntity.id;
  const orderId = paymentEntity.order_id;
  const description = paymentEntity.error_description || 'Razorpay payment execution failed';

  logger.warn(`[Razorpay Webhook] Processing failed event for payment: ${paymentId}, Order: ${orderId}`, { correlationId });

  const payment = await Payment.findOne({ 'gatewayData.orderId': orderId });
  if (!payment) return;

  if (payment.status !== PAYMENT_STATUS.FAILED) {
    payment.status = PAYMENT_STATUS.FAILED;
    payment.failureReason = description;
    payment.gatewayData.raw = paymentEntity;
    await payment.save();
    logger.warn(`[Razorpay Webhook] Payment status updated to FAILED: ${payment._id}`, { correlationId });
  }
};

/**
 * Handle refund.created / refund.processed event
 */
const handleRefundProcessed = async (event, correlationId) => {
  const refundEntity = event.payload.refund.entity;
  const refundId = refundEntity.id;
  const paymentId = refundEntity.payment_id;
  const amount = refundEntity.amount / 100; // paise to rupees conversion

  logger.info(`[Razorpay Webhook] Processing refund event - Refund: ${refundId}, Payment: ${paymentId}`, { correlationId });

  const payment = await Payment.findOne({ 'gatewayData.captureId': paymentId });
  if (!payment) return;

  // Idempotently check if refund is already registered
  const alreadyLogged = payment.refunds.some(r => r.refundId === refundId);
  if (alreadyLogged) {
    logger.info(`[Razorpay Webhook] Refund already logged (idempotent skip): ${refundId}`, { correlationId });
    return;
  }

  payment.refunds.push({
    refundId,
    amount,
    currency: payment.currency,
    reason: refundEntity.notes?.reason || 'Reconciled from Razorpay webhook',
    status: 'processed',
    processedAt: new Date(refundEntity.created_at * 1000),
    gatewayResponse: refundEntity,
  });

  payment.totalRefunded = parseFloat((payment.totalRefunded + amount).toFixed(2));
  payment.status = payment.totalRefunded >= payment.amount ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.PARTIALLY_REFUNDED;
  await payment.save();

  logger.info(`[Razorpay Webhook] Refund logged successfully. New status: ${payment.status}`, { correlationId });
};

/**
 * Main Webhook Routing Handler
 * POST /webhook/razorpay/events
 */
router.post('/events', async (req, res) => {
  const correlationId = req.correlationId;
  const rawEvent = req.body;
  
  // Synthetic unique identifier: event ID (or derived keys for old webhook schemas)
  const eventId = rawEvent.id || `rzp_evt_${rawEvent.payload?.payment?.entity?.id || rawEvent.payload?.refund?.entity?.id}_${rawEvent.event}_${rawEvent.created_at}`;

  try {
    logger.info(`[Razorpay Webhook] Event request received - ID: ${eventId}, Type: ${rawEvent.event}`, { correlationId });

    // 1. Verify cryptographic HMAC signature
    if (!verifyWebhookSignature(req)) {
      logger.warn('[Razorpay Webhook] Webhook signature verification failed', { correlationId });
      return res.status(403).json({ error: 'Signature check failed' });
    }

    // 2. Deduplicate: Record event receipt atomically in DB
    let webhookEventRecord;
    try {
      webhookEventRecord = await WebhookEvent.create({
        eventId,
        gateway: 'razorpay',
        eventType: rawEvent.event,
        payload: rawEvent,
        status: 'received',
      });
    } catch (err) {
      if (err.code === 11000) {
        logger.warn(`[Razorpay Webhook] Duplicate event ignored - ID: ${eventId}`, { correlationId });
        return res.status(200).send('Duplicate event bypassed');
      }
      throw err;
    }

    // 3. Lock execution and run event routing handlers
    const processLockKey = `webhook:razorpay:${eventId}`;
    await withLock(processLockKey, 15000, async () => {
      webhookEventRecord.status = 'processing';
      webhookEventRecord.attempts += 1;
      webhookEventRecord.lastAttemptAt = new Date();
      await webhookEventRecord.save();

      switch (rawEvent.event) {
        case 'payment.captured':
          await handlePaymentCaptured(rawEvent, correlationId);
          break;

        case 'payment.failed':
          await handlePaymentFailed(rawEvent, correlationId);
          break;

        case 'refund.created':
        case 'refund.processed':
          await handleRefundProcessed(rawEvent, correlationId);
          break;

        default:
          logger.info(`[Razorpay Webhook] Unhandled Event Type: ${rawEvent.event}`, { correlationId });
      }

      webhookEventRecord.status = 'processed';
      webhookEventRecord.processedAt = new Date();
      await webhookEventRecord.save();
    });

    return res.json({ success: true, event: rawEvent.event });
  } catch (error) {
    logger.error(`[Razorpay Webhook] Webhook process failure for event ${eventId}: ${error.message}`, { correlationId });
    
    // Log event fail to DB (DLQ)
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
        logger.error(`[Razorpay Webhook] DLQ write failure: ${dlqErr.message}`);
      }
    }

    // Return success to gateway to prevent retries
    return res.status(200).json({ success: false, message: 'Error Handled' });
  }
});

module.exports = router;
