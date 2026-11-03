const { validationResult } = require('express-validator');
const { sendBadRequest }   = require('../utils/apiResponse');

/**
 * Run after express-validator chains.
 * Collects all errors and returns them in one shot
 * instead of letting broken data hit the controller.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field:   e.path,
      message: e.msg,
    }));
    return sendBadRequest(res, 'Validation failed', formatted);
  }
  next();
};

module.exports = validate;
