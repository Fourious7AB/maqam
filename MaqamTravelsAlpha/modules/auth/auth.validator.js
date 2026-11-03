const { body } = require('express-validator');
const User = require('./auth.model');
const avatarOptions = User.AVATAR_OPTIONS || [];

/**
 * ─── AUTH VALIDATORS ──────────────────────────────────
 * express-validator chains for auth endpoints
 * Used in routes before controller is called
 */

const validateRegister = () => [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters and contain uppercase, lowercase, and number'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required'),
  body('avatar')
    .optional({nullable:true, checkFalsy:true})
    .isString()
    .withMessage('Avatar must be a string')
    .isIn(avatarOptions)
    .withMessage('Avatar selection is invalid'),

  body('hotelId')
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage('hotelId must be a valid MongoId'),
];

const validateLogin = () => [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const validateForgotPassword = () => [
  body('phone')
    .trim()
    .notEmpty()
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number is required'), 
];

// const validateResetPassword = () => [
//   body('password')
//     .isLength({ min: 8 })
//     .contains('(?=.*[A-Z])', 'i')
//     .contains('(?=.*[a-z])', 'i')
//     .contains('(?=.*[0-9])', 'i')
//     .withMessage('Password must be at least 8 characters and contain uppercase, lowercase, and number'),
// ];


const validateResetPassword = () => [
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
    .withMessage(
      "Password must contain uppercase, lowercase and number"
    ),
];

const validateUpdateProfile = () => [
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty'),
  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10 and 15 digits'),
  body('avatar')
    .optional()
    .isString()
    .withMessage('Avatar must be a string')
    .isIn(avatarOptions)
    .withMessage('Avatar selection is invalid'),
];

module.exports = {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateUpdateProfile,
};



