const crypto = require('crypto');
const Idempotency = require('./idempotency.model');
const { sendError } = require('../../utils/apiResponse');
const logger = require('../../utils/logger');

/**
 * Computes a SHA-256 hash of the request body to verify payload integrity
 * @param {object} body 
 * @returns {string} SHA-256 hex string
 */
const getBodyHash = (body) => {
  const data = body ? JSON.stringify(body) : '';
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Express middleware to enforce request idempotency.
 * Checks for the presence of the 'Idempotency-Key' header, looks up cached responses
 * in MongoDB, and intercepts res.json to capture and store responses.
 */
const idempotency = async (req, res, next) => {
  const key = req.headers['idempotency-key'] || req.headers['Idempotency-Key'];
  if (!key) {
    return next(); // Key not present, continue normally
  }

  const userId = req.user?.id || req.user?._id;

  if (!userId) {
    return next(); // Requires authentication
  }

  try {
    const requestHash = getBodyHash(req.body);

    // Look up cached execution
    const cachedRecord = await Idempotency.findOne({ key, userId });

    if (cachedRecord) {
      // Anti-tamper verification: ensure the request body matches the original payload
      if (cachedRecord.requestHash !== requestHash) {
        return sendError(res, {
          message: 'Conflict: Idempotency Key is already in use for a different request payload.',
          statusCode: 409
        });
      }

      logger.info(`[Idempotency] Cache HIT. Returning cached response for key: ${key}`);
      return res.status(cachedRecord.statusCode).json(cachedRecord.responseBody);
    }

    // Intercept response serializer
    const originalJson = res.json;

    res.json = function (body) {

      res.json = originalJson; // Restore standard method

      // Cache client errors (4xx) and successful operations (2xx)
      // Do NOT cache server errors (5xx) to allow client-side retries of transient problems
      if (res.statusCode < 500) {
        Idempotency.create({
          key,
          userId,
          method: req.method,
          path: req.originalUrl,
          requestHash,
          statusCode: res.statusCode,
          responseBody: body,
        }).catch((err) => {
          if (err.code !== 11000) { // Ignore duplicate keys from concurrent thread writes
            logger.error(`[Idempotency] Failed to persist cached response: ${err.message}`);
          }
        });
      }

      return originalJson.call(this, body);
    };

    next();
  } catch (error) {
    logger.error(`[Idempotency] Processing failure: ${error.message}`);
    next(error);
  }
};

module.exports = idempotency;
