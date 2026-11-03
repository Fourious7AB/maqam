const { body, param, query } = require('express-validator');
const { BOOKING_TYPES, BOOKING_STATUS } = require('../../config/constants');

/**
 * ─── BOOKING VALIDATORS ───────────────────────────────
 * Validators for booking endpoints
 */

const validateBookingId = () => [
  param('bookingId')
    .isMongoId()
    .withMessage('Invalid booking ID'),
];

const validateCreateBooking = () => [
  body('bookingType')
    .isIn(Object.values(BOOKING_TYPES))
    .withMessage('Invalid booking type'),
  body('itemId')
    .isMongoId()
    .withMessage('Invalid item ID'),
  body('details')
    .isObject()
    .withMessage('Details must be an object'),
];

const validateUpdateBooking = () => [
  param('bookingId')
    .isMongoId()
    .withMessage('Invalid booking ID'),
  body('status')
    .optional()
    .isIn(Object.values(BOOKING_STATUS))
    .withMessage('Invalid booking status'),
];

module.exports = {
  validateBookingId,
  validateCreateBooking,
  validateUpdateBooking,
};
