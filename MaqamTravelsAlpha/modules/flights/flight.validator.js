const { body, param } = require('express-validator');

/**
 * ─── FLIGHT VALIDATORS ────────────────────────────────
 * Validators for flight search and details
 */

const validateSearch = () => [
  body('origin')
    .trim()
    .notEmpty()
    .withMessage('Departure airport code is required'),
  body('destination')
    .trim()
    .notEmpty()
    .withMessage('Arrival airport code is required'),
  body('departureDate')
    .isISO8601()
    .withMessage('Departure date must be a valid date'),
  body('returnDate')
    .optional()
    .isISO8601()
    .withMessage('Return date must be a valid date'),
  
  body('tripType')
    .optional()
    .isIn(['oneway', 'roundtrip'])
    .withMessage('Trip type must be oneway or roundtrip'),
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be at least 1'),
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

const validateResultIndex = () => [
  body('resultIndex')
    .custom((value) => {
      if (typeof value === 'string' && value.trim().length > 0) return true;
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((v) => typeof v === 'string' && v.trim().length > 0)
      ) {
        return true;
      }
      throw new Error('Result index is required and must be a valid string or array of strings');
    }),
  body('traceId')
    .trim()
    .notEmpty()
    .withMessage('Trace ID is required'),
];

const validateCalendarFare = () => [
  body('origin')
    .trim()
    .notEmpty()
    .withMessage('Origin airport code is required'),
  body('destination')
    .trim()
    .notEmpty()
    .withMessage('Destination airport code is required'),
  body('departDate')
    .notEmpty()
    .withMessage('Departure date is required'),
];

const validateBooking = () => [
  ...validateResultIndex(),
  body('passengers')
    .isArray({ min: 1 })
    .withMessage('At least one passenger is required'),
];

module.exports = {
  validateSearch,
  validateResultIndex,
  validateCalendarFare,
  validateBooking,
};
