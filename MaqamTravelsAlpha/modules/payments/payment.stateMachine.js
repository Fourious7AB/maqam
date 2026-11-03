const { STATE_TRANSITIONS } = require('./payment.constants');
const { AppError } = require('../../middleware/errorHandler');

/**
 * Checks if a transition from current status to target status is valid.
 * @param {string} fromStatus 
 * @param {string} toStatus 
 * @returns {boolean}
 */
const canTransition = (fromStatus, toStatus) => {
  if (!fromStatus) return true; // Initial state check
  if (fromStatus === toStatus) return true; // Re-entrant transitions are idempotent
  const allowed = STATE_TRANSITIONS[fromStatus];
  return allowed ? allowed.includes(toStatus) : false;
};

/**
 * Validates a transition and returns updated status or throws AppError.
 * @param {string} fromStatus 
 * @param {string} toStatus 
 * @returns {string} The target status if valid
 */
const validateTransition = (fromStatus, toStatus) => {
  if (!canTransition(fromStatus, toStatus)) {
    throw new AppError(`Invalid payment status transition from '${fromStatus}' to '${toStatus}'`, 400);
  }
  return toStatus;
};

module.exports = {
  canTransition,
  validateTransition,
};
