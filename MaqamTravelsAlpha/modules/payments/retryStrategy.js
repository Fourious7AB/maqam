const logger = require('../../utils/logger');

/**
 * Checks if an error is transient and safe to retry.
 * Handles common network connection exceptions and HTTP status codes: 429, 500, 502, 503, 504.
 * 
 * @param {Error} error 
 * @returns {boolean}
 */
const isTransientError = (error) => {
  // Network failures/timeouts
  if (
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ENOTFOUND' ||
    error.code === 'EADDRINUSE' ||
    error.code === 'ECONNREFUSED' ||
    error.message?.includes('timeout') ||
    error.message?.includes('Network Error')
  ) {
    return true;
  }

  // HTTP response statuses
  if (error.response) {
    const status = error.response.status;
    // 429 Too Many Requests, or 500/502/503/504 server failures
    return status === 429 || (status >= 500 && status <= 504);
  }

  return false;
};

/**
 * Wraps an async task in a retry mechanism with exponential backoff and jitter.
 * 
 * @param {function} fn - Async operation to execute
 * @param {object} options - retry configuration
 * @returns {Promise<any>}
 */
const retryWithBackoff = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    factor = 2,
    jitter = true,
  } = options;

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      
      const isTransient = isTransientError(error);
      
      if (attempt > maxRetries || !isTransient) {
        throw error; // Propagate permanent failure
      }

      let delay = baseDelayMs * Math.pow(factor, attempt - 1);
      delay = Math.min(delay, maxDelayMs);
      
      if (jitter) {
        // Add random jitter between 0% and 25% of the calculated delay
        delay = delay + Math.random() * (delay * 0.25);
      }

      logger.warn(`[Retry Strategy] Attempt ${attempt} failed. Retrying in ${Math.round(delay)}ms... Error: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

module.exports = {
  retryWithBackoff,
  isTransientError,
};
