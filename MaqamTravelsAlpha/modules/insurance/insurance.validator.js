const { body, param, query } = require('express-validator');

/**
 * ─── INSURANCE VALIDATORS ────────────────────────────────────
 * Express validator chains for public, user, and admin endpoints
 */

const validatePlanId = () => [
  param('id')
    .isMongoId()
    .withMessage('Invalid insurance plan ID format'),
];

const validatePolicyId = () => [
  param('id')
    .isMongoId()
    .withMessage('Invalid insurance policy ID format'),
];

const validateGetPlans = () => [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('planType')
    .optional()
    .isIn([
      'comprehensive',
      'medical',
      'travel_delay',
      'cancellation',
      'student',
      'schengen',
      'senior_citizen',
      'custom',
    ])
    .withMessage('Invalid planType filter'),
  query('destinationScope')
    .optional()
    .isIn([
      'worldwide',
      'worldwide_excluding_usa_canada',
      'schengen',
      'asia',
      'middle_east',
      'domestic',
      'custom',
    ])
    .withMessage('Invalid destinationScope filter'),
  query('provider')
    .optional()
    .trim(),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('minPrice must be non-negative'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('maxPrice must be non-negative'),
  query('search')
    .optional()
    .trim(),
];

const validateQuote = () => [
  body('planId')
    .notEmpty()
    .withMessage('planId is required')
    .isMongoId()
    .withMessage('Invalid planId format'),
  body('startDate')
    .notEmpty()
    .withMessage('startDate is required')
    .isISO8601()
    .withMessage('startDate must be a valid ISO date (YYYY-MM-DD)'),
  body('endDate')
    .notEmpty()
    .withMessage('endDate is required')
    .isISO8601()
    .withMessage('endDate must be a valid ISO date (YYYY-MM-DD)'),
  body('travelers')
    .isArray({ min: 1 })
    .withMessage('travelers must be a non-empty array'),
  body('travelers.*.age')
    .notEmpty()
    .withMessage('Traveler age is required')
    .isInt({ min: 0, max: 120 })
    .withMessage('Traveler age must be an integer between 0 and 120'),
  body('addOnNames')
    .optional()
    .isArray()
    .withMessage('addOnNames must be an array of strings'),
  body('addOnNames.*')
    .optional()
    .isString()
    .trim(),
];

const validatePurchase = () => [
  body('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid userId format'),
  body('planId')
    .notEmpty()
    .withMessage('planId is required')
    .isMongoId()
    .withMessage('Invalid planId format'),
  body('tripDetails')
    .notEmpty()
    .withMessage('tripDetails is required')
    .isObject()
    .withMessage('tripDetails must be an object'),
  body('tripDetails.origin')
    .trim()
    .notEmpty()
    .withMessage('tripDetails.origin is required'),
  body('tripDetails.destination')
    .trim()
    .notEmpty()
    .withMessage('tripDetails.destination is required'),
  body('tripDetails.startDate')
    .notEmpty()
    .withMessage('tripDetails.startDate is required')
    .isISO8601()
    .withMessage('tripDetails.startDate must be a valid ISO date (YYYY-MM-DD)'),
  body('tripDetails.endDate')
    .notEmpty()
    .withMessage('tripDetails.endDate is required')
    .isISO8601()
    .withMessage('tripDetails.endDate must be a valid ISO date (YYYY-MM-DD)'),
  body('travelers')
    .isArray({ min: 1 })
    .withMessage('travelers must be a non-empty array'),
  body('travelers.*.name')
    .trim()
    .notEmpty()
    .withMessage('Traveler name is required'),
  body('travelers.*.age')
    .notEmpty()
    .withMessage('Traveler age is required')
    .isInt({ min: 0, max: 120 })
    .withMessage('Traveler age must be between 0 and 120'),
  body('travelers.*.passportNumber')
    .optional({ nullable: true })
    .trim(),
  body('travelers.*.gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be one of: male, female, other'),
  body('addOnNames')
    .optional()
    .isArray()
    .withMessage('addOnNames must be an array of strings'),
  body('addOnNames.*')
    .optional()
    .isString()
    .trim(),
  body('linkedTo')
    .optional({ nullable: true })
    .isObject()
    .withMessage('linkedTo must be an object'),
  body('linkedTo.type')
    .optional()
    .isIn(['flight', 'visa', 'package', 'hotel', 'none'])
    .withMessage('linkedTo.type must be one of: flight, visa, package, hotel, none'),
  body('linkedTo.refId')
    .optional({ nullable: true })
    .trim(),
  body('paymentReference')
    .optional({ nullable: true })
    .trim(),
];

const validateGetMyPolicies = () => [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['active', 'expired', 'cancelled', 'claimed'])
    .withMessage('Invalid status filter'),
];

const validateCreateClaim = () => [
  param('id')
    .isMongoId()
    .withMessage('Invalid policy ID format'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Claim description is required')
    .isLength({ min: 5, max: 2000 })
    .withMessage('Description must be between 5 and 2000 characters'),
  body('amountClaimed')
    .notEmpty()
    .withMessage('amountClaimed is required')
    .isFloat({ min: 0.01 })
    .withMessage('amountClaimed must be a positive number'),
  body('documents')
    .optional()
    .isArray()
    .withMessage('documents must be an array of URLs or file paths'),
  body('documents.*')
    .optional()
    .isString()
    .trim(),
];

const validateCreatePlanAdmin = () => [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Plan name is required')
    .isLength({ min: 3, max: 150 })
    .withMessage('Plan name must be between 3 and 150 characters'),
  body('provider')
    .trim()
    .notEmpty()
    .withMessage('Provider is required'),
  body('planType')
    .optional()
    .isIn([
      'comprehensive',
      'medical',
      'travel_delay',
      'cancellation',
      'student',
      'schengen',
      'senior_citizen',
      'custom',
    ])
    .withMessage('Invalid planType'),
  body('destinationScope')
    .optional()
    .isIn([
      'worldwide',
      'worldwide_excluding_usa_canada',
      'schengen',
      'asia',
      'middle_east',
      'domestic',
      'custom',
    ])
    .withMessage('Invalid destinationScope'),
  body('basePrice')
    .notEmpty()
    .withMessage('basePrice is required')
    .isFloat({ min: 0 })
    .withMessage('basePrice must be non-negative'),
  body('currency')
    .optional()
    .trim(),
  body('coverageDetails')
    .optional()
    .isArray()
    .withMessage('coverageDetails must be an array'),
  body('coverageDetails.*.title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Coverage title is required'),
  body('coverageDetails.*.coverageAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('coverageAmount must be a non-negative number'),
  body('durationOptions')
    .optional()
    .isArray()
    .withMessage('durationOptions must be an array'),
  body('durationOptions.*.minDays')
    .optional()
    .isInt({ min: 1 })
    .withMessage('minDays must be >= 1'),
  body('durationOptions.*.maxDays')
    .optional()
    .isInt({ min: 1 })
    .withMessage('maxDays must be >= 1'),
  body('durationOptions.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Duration price must be >= 0'),
  body('addOns')
    .optional()
    .isArray()
    .withMessage('addOns must be an array'),
  body('addOns.*.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Add-on name is required'),
  body('addOns.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Add-on price must be >= 0'),
];

const validateUpdatePlanAdmin = () => [
  param('id')
    .isMongoId()
    .withMessage('Invalid plan ID format'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Plan name cannot be empty'),
  body('provider')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Provider cannot be empty'),
  body('planType')
    .optional()
    .isIn([
      'comprehensive',
      'medical',
      'travel_delay',
      'cancellation',
      'student',
      'schengen',
      'senior_citizen',
      'custom',
    ])
    .withMessage('Invalid planType'),
  body('destinationScope')
    .optional()
    .isIn([
      'worldwide',
      'worldwide_excluding_usa_canada',
      'schengen',
      'asia',
      'middle_east',
      'domestic',
      'custom',
    ])
    .withMessage('Invalid destinationScope'),
  body('description')
    .optional()
    .trim(),
  body('basePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('basePrice must be non-negative'),
  body('currency')
    .optional()
    .trim(),
  body('coverageDetails')
    .optional()
    .isArray()
    .withMessage('coverageDetails must be an array'),
  body('coverageDetails.*.title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Coverage title is required'),
  body('coverageDetails.*.coverageAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('coverageAmount must be a non-negative number'),
  body('coverageDetails.*.currency')
    .optional()
    .trim(),
  body('coverageDetails.*.description')
    .optional()
    .trim(),
  body('coverageDetails.*.deductible')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('deductible must be non-negative'),
  body('durationOptions')
    .optional()
    .isArray()
    .withMessage('durationOptions must be an array'),
  body('durationOptions.*.minDays')
    .optional()
    .isInt({ min: 1 })
    .withMessage('minDays must be >= 1'),
  body('durationOptions.*.maxDays')
    .optional()
    .isInt({ min: 1 })
    .withMessage('maxDays must be >= 1'),
  body('durationOptions.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Duration price must be >= 0'),
  body('addOns')
    .optional()
    .isArray()
    .withMessage('addOns must be an array'),
  body('addOns.*.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Add-on name is required'),
  body('addOns.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Add-on price must be >= 0'),
  body('addOns.*.description')
    .optional()
    .trim(),
  body('minAge')
    .optional()
    .isInt({ min: 0, max: 120 })
    .withMessage('minAge must be an integer between 0 and 120'),
  body('maxAge')
    .optional()
    .isInt({ min: 0, max: 120 })
    .withMessage('maxAge must be an integer between 0 and 120'),
  body('termsUrl')
    .optional({ nullable: true })
    .trim(),
  body('policyDocumentTemplateUrl')
    .optional({ nullable: true })
    .trim(),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

const validateGetAdminPolicies = () => [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['active', 'expired', 'cancelled', 'claimed'])
    .withMessage('Invalid status filter'),
  query('paymentStatus')
    .optional()
    .isIn(['pending', 'paid', 'failed', 'refunded'])
    .withMessage('Invalid paymentStatus filter'),
  query('search')
    .optional()
    .trim(),
];

const validateUpdatePolicyStatusAdmin = () => [
  param('id')
    .isMongoId()
    .withMessage('Invalid policy ID format'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['active', 'expired', 'cancelled', 'claimed'])
    .withMessage('Status must be one of: active, expired, cancelled, claimed'),
];

const validateResolveClaimAdmin = () => [
  param('policyId')
    .isMongoId()
    .withMessage('Invalid policyId format'),
  param('claimId')
    .isMongoId()
    .withMessage('Invalid claimId format'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['pending', 'under_review', 'approved', 'rejected', 'paid'])
    .withMessage('Status must be one of: pending, under_review, approved, rejected, paid'),
  body('amountApproved')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('amountApproved must be a non-negative number'),
  body('adminNotes')
    .optional()
    .trim(),
];

module.exports = {
  validatePlanId,
  validatePolicyId,
  validateGetPlans,
  validateQuote,
  validatePurchase,
  validateGetMyPolicies,
  validateCreateClaim,
  validateCreatePlanAdmin,
  validateUpdatePlanAdmin,
  validateGetAdminPolicies,
  validateUpdatePolicyStatusAdmin,
  validateResolveClaimAdmin,
};
