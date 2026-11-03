const AuditLog = require('./auditLog.model');
const logger = require('../../utils/logger');

/**
 * Traverses an object or array recursively to replace sensitive patterns with a placeholder.
 * Prevents secrets, tokens, card details, and auth headers from leaking into DB logs.
 * 
 * @param {any} obj 
 * @returns {any}
 */
const redactSensitiveData = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'cvv', 'cvc',
    'cardnumber', 'card_number', 'pan', 'pin', 'signature',
    'authorization', 'auth', 'pass', 'client_secret', 'clientsecret'
  ];

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item));
  }

  const redacted = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      redacted[key] = '[REDACTED_SENSITIVE_DATA]';
    } else if (typeof value === 'object') {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
};

/**
 * Records an immutable log entry in the audit database.
 * Never throws exceptions upward to avoid blocking key payment flows.
 */
const record = async ({
  paymentId,
  action,
  actor,
  previousState,
  newState,
  metadata,
  gatewayRequest,
  gatewayResponse,
  correlationId,
  ip,
  userAgent,
}) => {
  try {
    const sanitizedRequest = gatewayRequest ? redactSensitiveData(gatewayRequest) : undefined;
    const sanitizedResponse = gatewayResponse ? redactSensitiveData(gatewayResponse) : undefined;
    const sanitizedMeta = metadata ? redactSensitiveData(metadata) : undefined;

    const logEntry = await AuditLog.create({
      paymentId,
      action,
      actor,
      previousState,
      newState,
      metadata: sanitizedMeta,
      gatewayRequest: sanitizedRequest,
      gatewayResponse: sanitizedResponse,
      correlationId,
      ip,
      userAgent,
    });

    logger.info(`[Audit Service] Recorded action '${action}' for payment ID: ${paymentId || 'system_event'}`);
    return logEntry;
  } catch (error) {
    logger.error(`[Audit Service] Write failed for action '${action}': ${error.message}`);
    // Fault-tolerant: non-blocking to payments
  }
};

module.exports = {
  record,
  redactSensitiveData,
};
