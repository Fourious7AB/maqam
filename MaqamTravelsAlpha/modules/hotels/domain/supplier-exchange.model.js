'use strict';

const mongoose = require('mongoose');

const supplierExchangeSchema = new mongoose.Schema({
  provider: { type: String, required: true, default: 'srdv', index: true },
  operation: { type: String, required: true, index: true }, // Search, BlockRoom, Book, Cancel, etc.
  correlationId: { type: String, index: true },
  idempotencyKey: { type: String, index: true },
  httpStatus: { type: Number },
  normalizedOutcome: { type: String }, // success, price_changed, policy_changed, pending, failed
  attemptNumber: { type: Number, default: 1 },
  requestedAt: { type: Date, required: true },
  respondedAt: { type: Date },
  durationMs: { type: Number },
  // Store redacted request/response
  requestPayload: { type: mongoose.Schema.Types.Mixed },
  responsePayload: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: { createdAt: true, updatedAt: false } });

supplierExchangeSchema.index({ createdAt: 1 });

module.exports = mongoose.models.SupplierExchange || mongoose.model('SupplierExchange', supplierExchangeSchema);
