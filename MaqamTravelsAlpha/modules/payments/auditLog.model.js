const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    actor: {
      type: {
        type: String,
        enum: ['user', 'system', 'webhook', 'admin', 'cron'],
        required: true,
      },
      id: {
        type: String,
        required: true,
      },
    },
    previousState: {
      type: String,
    },
    newState: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    gatewayRequest: {
      type: mongoose.Schema.Types.Mixed,
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
    correlationId: {
      type: String,
      index: true,
    },
    ip: String,
    userAgent: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable append-only log record
  }
);

// Prevent edits to existing log entries to guarantee ledger audit safety
auditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Audit log entries are immutable and cannot be updated.'));
  }
  next();
});

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
