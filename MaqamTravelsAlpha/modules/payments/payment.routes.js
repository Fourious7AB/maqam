const express = require('express');
const razorpayController = require("./gateways/razorpay/razorpay.controller");
const paypalController = require("./gateways/paypal/paypal.controller");
const phonepeController = require("./gateways/phonepe/phonepe.controller");

const paymentValidator = require('./payment.validator');
const validate = require('../../middleware/validate');
const { authenticate, optionalAuthenticate } = require('../../middleware/auth');
const { paymentLimiter } = require('../../middleware/rateLimiter');
const idempotency = require('./idempotency.middleware');

const router = express.Router();

/**
 * ─── PAYMENT ROUTES ────────────────────────────────────
 * Unified multi-gateway payment endpoints.
 * Mounts standard rate-limiting and request idempotency safeguards.
 */

// ─── RAZORPAY ROUTES ───────────────────────────────────
router.post(
  '/razorpay/create-order',
  authenticate,
  paymentLimiter,
  idempotency,
  paymentValidator.validateCreatePaymentOrder,
  validate,
  razorpayController.createPaymentOrder
);

router.post(
  '/razorpay/verify',
  authenticate,
  paymentLimiter,
  paymentValidator.validateVerifyPayment,
  validate,
  razorpayController.verifyPayment
);

router.get(
  '/razorpay/:paymentId',
  authenticate,
  paymentValidator.validatePaymentId,
  validate,
  razorpayController.getPaymentStatus
);

router.post(
  '/razorpay/:paymentId/refund',
  authenticate,
  paymentLimiter,
  paymentValidator.validateRefundRequest,
  validate,
  razorpayController.refundPayment
);



// ─── PAYPAL ROUTES ─────────────────────────────────────
router.post(
  '/paypal/create-order',
  authenticate,
  paymentLimiter,
  idempotency,
  paymentValidator.validateCreatePayPalOrder,
  validate,
  paypalController.createPaymentOrder
);

router.post(
  '/paypal/capture',
  optionalAuthenticate,
  paymentLimiter,
  idempotency,
  paymentValidator.validatePayPalApprove,
  validate,
  paypalController.capturePayment
);

router.get(
  '/paypal/order/:orderId',
  optionalAuthenticate,
  paymentValidator.validatePayPalOrderId,
  validate,
  paypalController.getPaymentStatusByOrderId
);

router.get(
  '/paypal/:paymentId',
  authenticate,
  paymentValidator.validatePaymentId,
  validate,
  paypalController.getPaymentStatus
);

router.post(
  '/paypal/:paymentId/refund',
  authenticate,
  paymentLimiter,
  paymentValidator.validateRefundRequest,
  validate,
  paypalController.refundPayment
);




// ─── PHONEPE ROUTES ────────────────────────────────────
router.post(
  '/phonepe/create-order',
  authenticate,
  paymentLimiter,
  idempotency,
  paymentValidator.validateCreatePhonePeOrder,
  validate,
  phonepeController.createPaymentOrder
);

router.post(
  '/phonepe/verify',
  authenticate,
  paymentLimiter,
  paymentValidator.validatePhonePeCallback,
  validate,
  phonepeController.verifyPayment
);

router.get(
  '/phonepe/:paymentId',
  authenticate,
  paymentValidator.validatePaymentId,
  validate,
  phonepeController.getPaymentStatus
);

router.post(
  '/phonepe/:paymentId/refund',
  authenticate,
  paymentLimiter,
  paymentValidator.validateRefundRequest,
  validate,
  phonepeController.refundPayment
);

module.exports = router;
