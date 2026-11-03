const { body, param, header } = require('express-validator');
const { BOOKING_MODEL_MAP, SUPPORTED_CURRENCIES } = require('./payment.constants');

/**
 * ─── PAYMENT VALIDATORS ────────────────────────────────
 * Input validation for payment API endpoints.
 * Amount and currency fields are removed to prevent tampering.
 */

// General Validators
const validatePaymentId = [
  param('paymentId')
    .isMongoId()
    .withMessage('Invalid payment ID'),
];

// Verify that the required Idempotency-Key is passed in header
const validateIdempotencyKey = [
  header('Idempotency-Key')
    .trim()
    .notEmpty()
    .withMessage('Idempotency-Key header is required for safe retries')
    .isLength({ min: 1, max: 128 })
    .withMessage('Invalid Idempotency-Key length'),
];

// Unified Create Payment validator (Stripe or general gateway)
const validateCreatePayment = [
  ...validateIdempotencyKey,
  body('bookingId')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid booking ID is required'),
  body('bookingType')
    .notEmpty()
    .isIn(Object.keys(BOOKING_MODEL_MAP))
    .withMessage('Invalid booking type'),
  body('paymentMethod')
    .notEmpty()
    .isIn(['razorpay', 'phonepe', 'paypal', 'stripe', 'bank_transfer'])
    .withMessage('Invalid payment method'),
];

// Razorpay Order Creation
const validateCreatePaymentOrder = [
  ...validateIdempotencyKey,
  body('bookingId')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid booking ID is required'),
  body('bookingType')
    .notEmpty()
    .isIn(Object.keys(BOOKING_MODEL_MAP))
    .withMessage('Invalid booking type'),
];

// Razorpay Signature verification (Callback check)
const validateVerifyPayment = [
  body('orderId')
    .trim()
    .notEmpty()
    .withMessage('Order ID is required'),
  body('paymentId')
    .trim()
    .notEmpty()
    .withMessage('Payment ID is required'),
  body('signature')
    .trim()
    .notEmpty()
    .isLength({ min: 64, max: 64 })
    .withMessage('Invalid signature format'),
];

// Gateway Refund Request
const validateRefundRequest = [
  ...validatePaymentId,
  body('reason')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Reason must be a valid string up to 500 characters'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Refund amount must be a positive number greater than 0'),
];

const validatePayPalOrderId = [
  param('orderId')
    .trim()
    .notEmpty()
    .withMessage('PayPal Order ID is required'),
];

// PayPal Order Creation
const validateCreatePayPalOrder = [
  ...validateIdempotencyKey,
  body('bookingId')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid booking ID is required'),
  body('bookingType')
    .notEmpty()
    .isIn(Object.keys(BOOKING_MODEL_MAP))
    .withMessage('Invalid booking type'),
];

// PayPal Approve / Capture
const validatePayPalApprove = [
  body('orderId')
    .optional()
    .trim(),
  body('token')
    .optional()
    .trim(),
  body('paypalOrderId')
    .optional()
    .trim(),
  body().custom((value, { req }) => {
    const orderId = req.body.orderId || req.body.token || req.body.paypalOrderId;
    if (!orderId || !String(orderId).trim()) {
      throw new Error('PayPal Order ID or token is required in request body');
    }
    req.body.orderId = String(orderId).trim();
    return true;
  }),
];

// PhonePe Order Creation
const validateCreatePhonePeOrder = [
  ...validateIdempotencyKey,
  body('bookingId')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid booking ID is required'),
  body('bookingType')
    .notEmpty()
    .isIn(Object.keys(BOOKING_MODEL_MAP))
    .withMessage('Invalid booking type'),
  body('phoneNumber')
    .notEmpty()
    .isMobilePhone('any')
    .withMessage('Valid phone number is required'),
];

// PhonePe Callback handling
const validatePhonePeCallback = [
  body('transactionId')
    .trim()
    .notEmpty()
    .withMessage('Transaction ID is required'),
  body('status')
    .notEmpty()
    .isIn(['SUCCESS', 'FAILED', 'PENDING'])
    .withMessage('Invalid status'),
];

module.exports = {
  validatePaymentId,
  validateIdempotencyKey,
  validateCreatePayment,
  validateCreatePaymentOrder,
  validateVerifyPayment,
  validateRefundRequest,
  validateCreatePayPalOrder,
  validatePayPalApprove,
  validatePayPalOrderId,
  validateCreatePhonePeOrder,
  validatePhonePeCallback,
};
