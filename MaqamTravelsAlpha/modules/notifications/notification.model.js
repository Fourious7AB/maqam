const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationLogSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null,
    },
    recipient: {
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
    },
    channel: {
      type: String,
      enum: ['email', 'sms', 'whatsapp', 'push', 'in_app'],
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        'booking_confirmation',
        'booking_cancellation',
        'ticket_issued',
        'payment_success',
        'payment_failed',
        'refund_processed',
        'visa_status_updated',
        'otp_verification',
        'password_reset',
        'welcome_user',
        'admin_alert',
        'quote_request_received',
        'quote_ready',
        'quote_customer_response',
      ],
      index: true,
    },
    subject: { type: String, default: '' },
    bodyContent: { type: String, default: '' },
    templateName: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },

    status: {
      type: String,
      enum: ['queued', 'processing', 'sent', 'delivered', 'failed', 'bounced'],
      default: 'queued',
      index: true,
    },
    provider: {
      name: { type: String, default: null }, // 'nodemailer', 'sendgrid', 'meta_whatsapp', 'twilio', 'fast2sms'
      messageId: { type: String, default: null },
      response: { type: Schema.Types.Mixed, default: null },
    },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: null },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.NotificationLog || mongoose.model('NotificationLog', NotificationLogSchema);
