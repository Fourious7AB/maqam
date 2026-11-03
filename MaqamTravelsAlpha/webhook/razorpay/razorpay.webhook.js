/**
 * ─── WEBHOOK ROUTER RE-EXPORT ───────────────────────────
 * 
 * This file serves as a compatibility layer.
 * The actual webhook implementation is now in:
 * modules/payments/gateways/razorpay/razorpay.webhook.js
 * 
 * app.js imports from this location for backwards compatibility
 */

// Re-export from new location
module.exports = require('../../modules/payments/gateways/razorpay/razorpay.webhook');
