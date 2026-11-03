const { body, param, query, check } = require('express-validator');
const { LEAD_STATUS } = require('../../config/constants');
const { PAYMENT_STATUS, SUPPORTED_CURRENCIES } = require('../payments/payment.constants');

const mongoose = require('mongoose');

const validateListLeads = () => [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim(),
  query('stage').optional().trim(),
  query('status').optional().trim(),
  query('priority').optional().isIn(['high', 'medium', 'low']).withMessage('Invalid priority filter'),
  query('source').optional().trim(),
  query('assignedTo').optional().trim(),
];

const validateLeadId = () => [
  (req, res, next) => {
    const id = req.params.id || req.params.leadId;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid lead ID' });
    }
    req.leadId = id;
    next();
  },
];

const validateCreateLead = () => [
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('firstName').optional().trim(),
  body('lastName').optional().trim(),
  body('name').optional().trim(),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('destination').optional().trim(),
  body('travelDates').optional().isObject().withMessage('Travel dates must be an object'),
  body('numberOfPeople').optional().isInt({ min: 1 }).withMessage('Number of people must be at least 1'),
  body('travelers').optional().isInt({ min: 1 }).withMessage('Travelers must be at least 1'),
  body('budget').optional().isNumeric().withMessage('Budget must be a number'),
  body('specialRequests').optional().trim(),
  body('query').optional().trim(),
  body('priority').optional().isIn(['high', 'medium', 'low']).withMessage('Invalid priority'),
  body('source').optional().trim(),
  body('tripType').optional().trim(),
  body('company').optional().trim(),
  body('notes').optional().trim(),
  body('assignedTo').optional().trim(),
];

const validateUpdateLead = () => [
  (req, res, next) => {
    const id = req.params.id || req.params.leadId;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid lead ID' });
    }
    req.leadId = id;
    next();
  },
  body('status').optional().trim(),
  body('stage').optional().trim(),
  body('priority').optional().isIn(['high', 'medium', 'low']).withMessage('Invalid priority'),
  body('budget').optional().isNumeric().withMessage('Budget must be a number'),
  body('numberOfPeople').optional().isInt({ min: 1 }),
  body('travelers').optional().isInt({ min: 1 }),
];

const validateAddLeadNote = () => [
  (req, res, next) => {
    const id = req.params.id || req.params.leadId;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid lead ID' });
    }
    req.leadId = id;
    next();
  },
  body('note').trim().notEmpty().withMessage('Note content is required'),
];

const validateConvertLead = () => [
  (req, res, next) => {
    const id = req.params.id || req.params.leadId;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid lead ID' });
    }
    req.leadId = id;
    next();
  },
  body('customerType').optional().isIn(['new', 'existing']).withMessage('customerType must be new or existing'),
];


const validateCreateHotel = () => [
  body('name').trim().notEmpty().withMessage('Hotel name is required'),
  body('destination').trim().notEmpty().withMessage('Destination is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
];

const validateUpdateHotel = () => [
  param('id').isMongoId().withMessage('Invalid hotel ID'),
  body('name').optional().trim().notEmpty().withMessage('Hotel name cannot be empty'),
  body('destination').optional().trim().notEmpty().withMessage('Destination cannot be empty'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

const validateHotelId = () => [
  param('id').isMongoId().withMessage('Invalid hotel ID'),
];

const validateCreateCrmUser = () => [
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('role')
    .isIn(['customer', 'sales_agent', 'support_agent', 'admin', 'super_admin', 'hotelier'])
    .withMessage('Invalid role'),
  body('hotelId')
    .if(body('role').equals('hotelier'))
    .isMongoId()
    .withMessage('hotelId is required and must be a valid MongoId when role is hotelier'),
];

const validateReviewStock = () => [
  param('id').isMongoId().withMessage('Invalid stock batch ID'),
  body('decision')
    .isIn(['approved', 'rejected'])
    .withMessage("decision must be either 'approved' or 'rejected'"),
];

const validateListUsers = () => [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('role')
    .optional()
    .isIn(['customer', 'sales_agent', 'support_agent', 'admin', 'super_admin', 'hotelier', 'staff'])
    .withMessage('Invalid role filter'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  query('isVerified').optional().isBoolean().withMessage('isVerified must be a boolean'),
  query('isPhoneVerified').optional().isBoolean().withMessage('isPhoneVerified must be a boolean'),
  query('search').optional().trim(),
  query('sortBy').optional().trim(),
  query('sortOrder').optional().isIn(['asc', 'desc', '1', '-1']).withMessage('sortOrder must be asc or desc'),
];

const validateUserId = () => [
  param('id').isMongoId().withMessage('Invalid user ID'),
];

const validateUpdateUser = () => [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('phone').optional().trim().notEmpty().withMessage('Phone cannot be empty'),
  body('role')
    .optional()
    .isIn(['customer', 'sales_agent', 'support_agent', 'admin', 'super_admin', 'hotelier'])
    .withMessage('Invalid role'),
  body('hotelId')
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage('hotelId must be a valid MongoId'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('isVerified').optional({ nullable: true }).isBoolean().withMessage('isVerified must be a boolean'),
  body('isPhoneVerified').optional({ nullable: true }).isBoolean().withMessage('isPhoneVerified must be a boolean'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const validateFinanceOverview = () => [
  check('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO8601 date string (e.g. YYYY-MM-DD)'),
  check('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO8601 date string (e.g. YYYY-MM-DD)')
    .custom((endDate, { req }) => {
      const start = req.body?.startDate || req.query?.startDate;
      if (start && endDate && new Date(endDate) < new Date(start)) {
        throw new Error('endDate cannot be earlier than startDate');
      }
      return true;
    }),
  check('currency')
    .optional()
    .isString()
    .customSanitizer((v) => (typeof v === 'string' ? v.toUpperCase() : v))
    .isIn(SUPPORTED_CURRENCIES)
    .withMessage(`currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`),
];

const validateListTransactions = () => [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(Object.values(PAYMENT_STATUS))
    .withMessage(`Invalid status. Must be one of: ${Object.values(PAYMENT_STATUS).join(', ')}`),
  query('paymentMethod')
    .optional()
    .isIn(['razorpay', 'phonepe', 'paypal', 'stripe', 'bank_transfer'])
    .withMessage('Invalid paymentMethod'),
  query('bookingType')
    .optional()
    .isIn(['flight', 'hotel', 'package', 'offer', 'visa'])
    .withMessage('Invalid bookingType'),
  query('currency')
    .optional()
    .isString()
    .customSanitizer((v) => (typeof v === 'string' ? v.toUpperCase() : v))
    .isIn(SUPPORTED_CURRENCIES)
    .withMessage(`currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO8601 date string (e.g. YYYY-MM-DD)'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO8601 date string (e.g. YYYY-MM-DD)')
    .custom((endDate, { req }) => {
      const start = req.query?.startDate || req.body?.startDate;
      if (start && endDate && new Date(endDate) < new Date(start)) {
        throw new Error('endDate cannot be earlier than startDate');
      }
      return true;
    }),
  query('search').optional().trim(),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'amount', 'paidAt', 'updatedAt'])
    .withMessage('sortBy must be one of: createdAt, amount, paidAt, updatedAt'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc', '1', '-1'])
    .withMessage('sortOrder must be asc or desc'),
];

const validateTransactionId = () => [
  param('id').isMongoId().withMessage('Invalid transaction ID'),
];

const validateListRefunds = () => [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['pending', 'processed', 'failed'])
    .withMessage('status must be one of: pending, processed, failed'),
  query('paymentMethod')
    .optional()
    .isIn(['razorpay', 'phonepe', 'paypal', 'stripe', 'bank_transfer'])
    .withMessage('Invalid paymentMethod'),
  query('bookingType')
    .optional()
    .isIn(['flight', 'hotel', 'package', 'offer', 'visa'])
    .withMessage('Invalid bookingType'),
  query('currency')
    .optional()
    .isString()
    .customSanitizer((v) => (typeof v === 'string' ? v.toUpperCase() : v))
    .isIn(SUPPORTED_CURRENCIES)
    .withMessage(`currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO8601 date string (e.g. YYYY-MM-DD)'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO8601 date string (e.g. YYYY-MM-DD)')
    .custom((endDate, { req }) => {
      const start = req.query?.startDate || req.body?.startDate;
      if (start && endDate && new Date(endDate) < new Date(start)) {
        throw new Error('endDate cannot be earlier than startDate');
      }
      return true;
    }),
  query('search').optional().trim(),
  query('sortBy')
    .optional()
    .isIn(['requestedAt', 'processedAt', 'amount'])
    .withMessage('sortBy must be one of: requestedAt, processedAt, amount'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc', '1', '-1'])
    .withMessage('sortOrder must be asc or desc'),
];

const validateUpdateRefundStatus = () => [
  body('status')
    .notEmpty()
    .withMessage('status is required')
    .isIn(['pending', 'processed', 'failed'])
    .withMessage('status must be one of: pending, processed, failed'),
  body('reason').optional().trim(),
  body('gatewayResponse').optional().isObject().withMessage('gatewayResponse must be an object'),
];

const validateListCustomers = () => [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim(),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean (true/false)'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'firstName', 'lastName', 'updatedAt'])
    .withMessage('sortBy must be one of: createdAt, firstName, lastName, updatedAt'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc', '1', '-1'])
    .withMessage('sortOrder must be asc or desc'),
];

const validateCustomerId = () => [
  param('id').isMongoId().withMessage('Invalid customer ID format'),
];

const validateSettingsSection = () => [
  param('section')
    .trim()
    .notEmpty()
    .withMessage('Settings section parameter is required')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Section must contain only alphanumeric characters, dashes, or underscores'),
];

const validateUpdateSettings = () => [
  param('section')
    .trim()
    .notEmpty()
    .withMessage('Settings section parameter is required')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Section must contain only alphanumeric characters, dashes, or underscores'),
  body()
    .isObject()
    .withMessage('Settings payload must be a JSON object')
    .custom((val) => {
      if (!val || typeof val !== 'object' || Array.isArray(val) || Object.keys(val).length === 0) {
        throw new Error('Settings payload must be a non-empty JSON object');
      }
      return true;
    }),
];

const validateUpdateMarkup = () => [
  body()
    .isObject()
    .withMessage('Markup payload must be a JSON object')
    .custom((val) => {
      if (!val || typeof val !== 'object' || Array.isArray(val) || Object.keys(val).length === 0) {
        throw new Error('Markup payload must be a non-empty JSON object');
      }
      return true;
    }),
  body('flightMarkupPercent').optional().isNumeric().withMessage('flightMarkupPercent must be a number'),
  body('hotelMarkupPercent').optional().isNumeric().withMessage('hotelMarkupPercent must be a number'),
  body('defaultMarkupPercent').optional().isNumeric().withMessage('defaultMarkupPercent must be a number'),
  body('markPercent').optional().isNumeric().withMessage('markPercent must be a number'),
  body('markupPercent').optional().isNumeric().withMessage('markupPercent must be a number'),
  body('currency').optional().isString().trim().withMessage('currency must be a string'),
];

module.exports = {
  validateListLeads,
  validateLeadId,
  validateCreateLead,
  validateUpdateLead,
  validateAddLeadNote,
  validateConvertLead,
  validateCreateHotel,
  validateUpdateHotel,
  validateHotelId,
  validateCreateCrmUser,
  validateReviewStock,
  validateListUsers,
  validateUserId,
  validateUpdateUser,
  validateFinanceOverview,
  validateListTransactions,
  validateTransactionId,
  validateListRefunds,
  validateUpdateRefundStatus,
  validateListCustomers,
  validateCustomerId,
  validateSettingsSection,
  validateUpdateSettings,
  validateUpdateMarkup,
};




