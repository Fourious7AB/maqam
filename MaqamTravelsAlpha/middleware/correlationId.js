const crypto = require('crypto');

/**
 * Middleware to track requests using Correlation IDs.
 * Inspects incoming request headers for a correlation ID and propagates it.
 * Generates a new cryptographically secure UUID if none is present.
 */
const correlationIdMiddleware = (req, res, next) => {
  const headerName = 'x-correlation-id';
  // Check for lowercase and camelcase variants
  const correlationId = req.headers[headerName] || req.headers['X-Correlation-ID'] || crypto.randomUUID();
  
  // Attach correlation ID to request object for downstream usage (logging, adapters)
  req.correlationId = correlationId;
  
  // Respond with the correlation ID for client-side diagnostics
  res.setHeader('X-Correlation-ID', correlationId);
  
  next();
};

module.exports = correlationIdMiddleware;
