'use strict';

const { body, query } = require('express-validator');

const validateRequestQuote = () => [
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('firstName').optional().trim(),
  body('lastName').optional().trim(),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('destination').trim().notEmpty().withMessage('Destination is required'),
  body('travelDates').optional().isObject().withMessage('Travel dates must be an object'),
  body('numberOfPeople').optional().isInt({ min: 1 }).withMessage('Number of people must be at least 1'),
  body('budget').optional().isNumeric().withMessage('Budget must be a number'),
  body('specialRequests').optional().trim(),
  body('tripType').optional().trim(),
];

const validateTrackQuote = () => [     
  body('reference').trim().notEmpty().withMessage('Quotation reference number is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
];

const validateRespondToQuote = () => [
  body('action')
    .trim()
    .isIn(['accepted', 'rejected', 'changes_requested'])
    .withMessage('Action must be one of: accepted, rejected, changes_requested'),
  body('note').optional().trim(),
];

const validateListQuotes = () => [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
];

module.exports = {
  validateRequestQuote,
  validateTrackQuote,
  validateRespondToQuote,
  validateListQuotes,
};
