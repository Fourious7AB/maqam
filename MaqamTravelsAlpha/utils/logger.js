const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf, colorize, errors } = format;

// Helper function to recursively redact sensitive fields to meet PCI/PII regulations
const redactSensitiveData = (val) => {
  if (!val || typeof val !== 'object') return val;
  
  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'cvv', 'cvc',
    'cardnumber', 'card_number', 'pan', 'pin', 'signature',
    'authorization', 'auth', 'pass', 'client_secret', 'clientsecret'
  ];

  if (Array.isArray(val)) {
    return val.map(redactSensitiveData);
  }

  const redacted = {};
  for (const [k, v] of Object.entries(val)) {
    if (sensitiveKeys.some(sk => k.toLowerCase().includes(sk))) {
      redacted[k] = '[REDACTED_SENSITIVE_DATA]';
    } else if (typeof v === 'object') {
      redacted[k] = redactSensitiveData(v);
    } else {
      redacted[k] = v;
    }
  }
  return redacted;
};

// Winston format to intercept and redact logging metadata
const redactFormat = format((info) => {
  // Traverse log details and redact matching fields
  for (const key of Object.keys(info)) {
    if (key !== 'level' && key !== 'message' && key !== 'timestamp' && key !== 'stack') {
      info[key] = redactSensitiveData(info[key]);
    }
  }
  return info;
});

const devFormat = printf(({ level, message, timestamp, stack, correlationId }) => {
  const correlationPrefix = correlationId ? ` [CID: ${correlationId}]` : '';
  return `${timestamp}${correlationPrefix} [${level}]: ${stack || message}`;
});

const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    redactFormat(), // Redact sensitive keys BEFORE formatting/writing
    process.env.NODE_ENV === "production"
      ? format.json()
      : combine(colorize(), devFormat)
  ),
  transports: [
    new transports.Console(),
    // Keep optional file transports for production debugging
    ...(process.env.NODE_ENV === "production" ? [
      new transports.File({ filename: 'logs/error.log', level: 'error' }),
      new transports.File({ filename: 'logs/combined.log' })
    ] : [])
  ],
});

module.exports = logger;
