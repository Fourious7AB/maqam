'use strict';

const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');

const validateListQuotations = () => [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim(),
  query('status').optional().trim(),
  query('agentId').optional().trim(),
  query('assignedTo').optional().trim(),
  query('fromDate').optional().trim(),
  query('toDate').optional().trim(),
];

const validateQuotationId = () => [
  param('id').isMongoId().withMessage('Invalid quotation ID format'),
];

const validateAssignQuotation = () => [
  param('id').isMongoId().withMessage('Invalid quotation ID format'),
  body().custom((val) => {
    const target = val?.agentId || val?.assignedTo || val?.specialistId;
    if (!target || typeof target !== 'string' || !mongoose.Types.ObjectId.isValid(target.trim())) {
      throw new Error('agentId or assignedTo must be a valid Mongo ObjectId of a travel specialist');
    }
    return true;
  }),
];

const validateSendQuotation = () => [
  param('id').isMongoId().withMessage('Invalid quotation ID format'),
  body().custom((val) => {
    const price = val?.quotedPrice ?? val?.price;
    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) <= 0) {
      throw new Error('quotedPrice must be a number greater than 0');
    }
    return true;
  }),
  body('quoteExpiresAt').optional().isISO8601().withMessage('quoteExpiresAt must be a valid ISO 8601 date string'),
  body('notes').optional().trim(),
];

module.exports = {
  validateListQuotations,
  validateQuotationId,
  validateAssignQuotation,
  validateSendQuotation,
};
