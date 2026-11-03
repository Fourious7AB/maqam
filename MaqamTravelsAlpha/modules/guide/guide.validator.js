const { body, param, query } = require('express-validator');

/**
 * ─── GUIDE VALIDATORS ──────────────────────────────────────
 * Request validation rules for User & Admin Guide endpoints
 */

const validateGuideId = () => [
  param('id')
    .isMongoId()
    .withMessage('Invalid guide ID format'),
];

const validateGetGuides = () => [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be in YYYY-MM-DD format'),
];

const validateGetSlots = () => [
  param('id')
    .isMongoId()
    .withMessage('Invalid guide ID format'),
  query('startDate')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('startDate must be in YYYY-MM-DD format'),
  query('endDate')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('endDate must be in YYYY-MM-DD format'),
  query('date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date must be in YYYY-MM-DD format'),
];

const validateCreateReview = () => [
  param('id')
    .isMongoId()
    .withMessage('Invalid guide ID format'),
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),
  body('comment')
    .trim()
    .notEmpty()
    .withMessage('Review comment is required')
    .isLength({ min: 5, max: 1000 })
    .withMessage('Comment must be between 5 and 1000 characters'),
  body('bookingId')
    .optional()
    .isMongoId()
    .withMessage('Invalid booking ID format'),
];

const validateCreateGuideAdmin = () => [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email address is required'),
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City / Destination is required'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required'),
  body('languages')
    .isArray({ min: 1 })
    .withMessage('At least one spoken language must be provided as an array'),
  body('hourlyRate')
    .notEmpty()
    .withMessage('Hourly rate is required')
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a non-negative number'),
  body('fullDayRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Full day rate must be a non-negative number'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Status must be one of: active, inactive, suspended'),
];

const validateUpdateGuideAdmin = () => [
  param('id')
    .isMongoId()
    .withMessage('Invalid guide ID format'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Status must be one of: active, inactive, suspended'),
  body('hourlyRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a non-negative number'),
  body('fullDayRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Full day rate must be a non-negative number'),
  body('languages')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Languages must be an array with at least one language'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email address is required'),
];

const validateSetSlotsAdmin = () => [
  param('id')
    .isMongoId()
    .withMessage('Invalid guide ID format'),
  body('slots')
    .isArray({ min: 1 })
    .withMessage('slots must be a non-empty array of slot objects'),
  body('slots.*.date')
    .notEmpty()
    .withMessage('Slot date is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Slot date must be in YYYY-MM-DD format'),
  body('slots.*.startTime')
    .notEmpty()
    .withMessage('Slot startTime is required'),
  body('slots.*.endTime')
    .notEmpty()
    .withMessage('Slot endTime is required'),
  body('slots.*.price')
    .notEmpty()
    .withMessage('Slot price is required')
    .isFloat({ min: 0 })
    .withMessage('Slot price must be a non-negative number'),
];

module.exports = {
  validateGuideId,
  validateGetGuides,
  validateGetSlots,
  validateCreateReview,
  validateCreateGuideAdmin,
  validateUpdateGuideAdmin,
  validateSetSlotsAdmin,
};
