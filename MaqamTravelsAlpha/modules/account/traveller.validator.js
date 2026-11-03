const { body, param } = require('express-validator');

const validateTravellerId = () => [
  param('travellerId')
    .isMongoId()
    .withMessage('Invalid traveller ID'),
];

const validateCreateTraveller = () => [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('passengerType')
    .isIn(['Adult', 'Child', 'Infant'])
    .withMessage('Please provide a valid passenger type'),
  body('title')
    .isIn(['Mr', 'Mrs', 'Ms', 'Miss', 'Mstr'])
    .withMessage('Please provide a valid title'),
  body('gender')
    .isIn(['Male', 'Female'])
    .withMessage('Please provide a valid gender'),
  body('dateOfBirth')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('Please provide a valid date of birth')
    .toDate(),
  body('passportNo')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage('Passport number must be between 5 and 20 characters'),
  body('passportExpiry')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('Please provide a valid passport expiry date')
    .toDate(),
  body('passportIssueDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('Please provide a valid passport issue date')
    .toDate(),
  body('cellCountryCode')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 1, max: 5 })
    .withMessage('Cell country code must be between 1 and 5 characters'),
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean'),
];

const validateUpdateTraveller = () => [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('passengerType')
    .optional()
    .isIn(['Adult', 'Child', 'Infant'])
    .withMessage('Please provide a valid passenger type'),
  body('title')
    .optional()
    .isIn(['Mr', 'Mrs', 'Ms', 'Miss', 'Mstr'])
    .withMessage('Please provide a valid title'),
  body('gender')
    .optional()
    .isIn(['Male', 'Female'])
    .withMessage('Please provide a valid gender'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth')
    .toDate(),
  body('passportNo')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage('Passport number must be between 5 and 20 characters'),
  body('passportExpiry')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('Please provide a valid passport expiry date')
    .toDate(),
  body('passportIssueDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('Please provide a valid passport issue date')
    .toDate(),
  body('cellCountryCode')
    .optional()
    .trim()
    .isLength({ min: 1, max: 5 })
    .withMessage('Cell country code must be between 1 and 5 characters'),
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean'),
];

module.exports = {
  validateTravellerId,
  validateCreateTraveller,
  validateUpdateTraveller,
};
