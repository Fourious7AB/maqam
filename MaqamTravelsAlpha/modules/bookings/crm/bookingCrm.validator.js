const { query, param, body } = require('express-validator');
const mongoose = require('mongoose');
const { BOOKING_TYPES, BOOKING_STATUS } = require('../../../config/constants');

const VALID_BOOKING_TYPES = [...Object.values(BOOKING_TYPES), 'visa'];
const VALID_BOOKING_STATUSES = Object.values(BOOKING_STATUS);

const validateListBookings = () => [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('bookingType')
    .optional()
    .custom((val) => {
      if (val === 'all' || VALID_BOOKING_TYPES.includes(val.toLowerCase())) {
        return true;
      }
      throw new Error(`Invalid bookingType. Allowed: all, ${VALID_BOOKING_TYPES.join(', ')}`);
    }),
  query('status').optional().trim(),
  query('paymentStatus').optional().trim(),
  query('search').optional().trim(),
  query('startDate').optional().isISO8601().withMessage('Invalid startDate ISO format'),
  query('endDate').optional().isISO8601().withMessage('Invalid endDate ISO format'),
  query('assignedTo').optional().trim(),
];

const validateBookingParams = () => [
  param('bookingType')
    .trim()
    .toLowerCase()
    .isIn(VALID_BOOKING_TYPES)
    .withMessage(`Invalid bookingType. Must be one of: ${VALID_BOOKING_TYPES.join(', ')}`),
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Booking ID is required')
    .custom((val) => {
      if (mongoose.Types.ObjectId.isValid(val) || !isNaN(Number(val))) {
        return true;
      }
      throw new Error('Invalid booking ID format');
    }),
];

const validateUpdateStatus = () => [
  ...validateBookingParams(),
  body('status')
    .trim()
    .toLowerCase()
    .isIn(VALID_BOOKING_STATUSES)
    .withMessage(`Status must be one of: ${VALID_BOOKING_STATUSES.join(', ')}`),
  body('pnr').optional().trim(),
  body('ticketNumber').optional().trim(),
  body('internalRemark').optional().trim(),
];

const validateAssignAgent = () => [
  ...validateBookingParams(),
  body().custom((value) => {
    const agentId = value.assignedTo || value.agentId || value.caseOfficerId;
    if (!agentId || !mongoose.Types.ObjectId.isValid(agentId)) {
      throw new Error('A valid agent ID (assignedTo or agentId) is required');
    }
    return true;
  }),
];

const validateAddRemark = () => [
  ...validateBookingParams(),
  body().custom((value) => {
    const remark = value.remark || value.text;
    if (!remark || typeof remark !== 'string' || !remark.trim()) {
      throw new Error('Remark text is required');
    }
    return true;
  }),
];

module.exports = {
  validateListBookings,
  validateBookingParams,
  validateUpdateStatus,
  validateAssignAgent,
  validateAddRemark,
};
