const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
    },
    gateway: {
      type: String,
      required: true,
      enum: ['paypal', 'razorpay', 'phonepe'],
    },
    eventType: {
      type: String,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['received', 'processing', 'processed', 'failed', 'dead_letter'],
      default: 'received',
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
    },
    lastAttemptAt: {
      type: Date,
    },
    error: {
      type: String,
    },
    processedAt: {
      type: Date,
    },
    receivedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Clean up after 90 days
    },
  },
  {
    timestamps: true,
  }
);
// `eventId` field is already declared with `unique: true`.
// Redundant index creation removed to avoid duplicate-index warnings.

// TTL index for automated database purging
webhookEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.WebhookEvent || mongoose.model('WebhookEvent', webhookEventSchema);
