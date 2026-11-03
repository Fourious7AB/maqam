const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/apiResponse');

const handler = (req, res) =>
  sendError(res, { message: 'Too many requests, please try again later.', statusCode: 429 });

// General API limiter — applies to all routes
const apiLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              1000,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler,
});

// Stricter limiter for auth routes (login/register)
const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              30, // only 10 attempts per 15 min
  standardHeaders:  true,
  legacyHeaders:    false,
  handler,
  skipSuccessfulRequests: true, // don't count successful logins
});

// Search limiter — SRDV calls are expensive so limit them
const searchLimiter = rateLimit({
  windowMs:        1 * 60 * 1000, // 1 minute
  max:             30,
  standardHeaders: true,
  legacyHeaders:   false,
  handler,
});

// Payment limiter — prevent brute force or payment creation abuse
const paymentLimiter = rateLimit({
  windowMs:        1 * 60 * 1000, // 1 minute
  max:             10,            // 10 payments per minute
  standardHeaders: true,
  legacyHeaders:   false,
  handler,
});

// Quote request limiter — public form, prevent lead spam
const quoteRequestLimiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  handler,
});  

// Quote tracking limiter — guests look up by reference + phone, slow down guessing
const quoteTrackLimiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             30,
  standardHeaders: true,
  legacyHeaders:   false,
  handler,
});

module.exports = {
  apiLimiter,
  authLimiter,
  searchLimiter,
  paymentLimiter,
  quoteRequestLimiter,
  quoteTrackLimiter,
};
