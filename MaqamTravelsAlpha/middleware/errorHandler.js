const logger = require('../utils/logger');
const { sendError } = require('../utils/apiResponse');

// Custom error class — throw this anywhere in the app
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);

    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // vs programming errors

    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handling middleware (must have 4 params for Express to treat it as error handler)
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Internal Server Error';
  let details    = err.details    || null;

  // Mongoose: duplicate key (e.g. email already exists)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message    = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    statusCode = 400;
    details    = { field, value: err.keyValue[field] };
  }

  // Mongoose: validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }));
    return sendError(res, { message: 'Validation failed', errors, statusCode: 400, error: 'Validation failed'});
  }

  // Mongoose: invalid ObjectId
  if (err.name === 'CastError') {
    message    = `Invalid ${err.path}: ${err.value}`;
    statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    message    = 'Invalid token';
    statusCode = 401;
  }
  if (err.name === 'TokenExpiredError') {
    message    = 'Token expired';
    statusCode = 401;
  }

  // Log client errors (4xx) so developers know why requests fail
  if (statusCode >= 400 && statusCode < 500) {
    logger.warn(`[HTTP ${statusCode}] ${req.method} ${req.originalUrl} - ${message}`, {
      details: details || undefined,
    });
  }

  // Log server errors (500+)
  if (statusCode >= 500) {
    logger.error(`${statusCode} - ${message}`, { stack: err.stack, url: req.originalUrl });
    if (!err.isOperational && statusCode === 500) {
      message = 'Internal Server Error';
    }
  }

  return sendError(res, { message, statusCode, details });
};

module.exports = { AppError, errorHandler };
