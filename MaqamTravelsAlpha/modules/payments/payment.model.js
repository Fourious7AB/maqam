const mongoose = require('mongoose');
const { PAYMENT_STATUS, SUPPORTED_CURRENCIES } = require('./payment.constants');
const { validateTransition } = require('./payment.stateMachine');

/**
 * ─── PAYMENT MODEL (Payment Schema) ────────────────────
 * Tracks all payments for flight, hotel, tour, and package bookings.
 * Employs dynamic references (refPath) to support clean multi-module integration.
 */

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Dynamic reference to support multiple booking models (FlightBooking, HotelBooking, etc.)
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'bookingModel',
      required: true,
    },
    bookingModel: {
      type: String,
      required: true,
      enum: ['FlightBooking', 'HotelBooking', 'PackageBooking', "OfferBooking",'Booking'],
    },
    bookingType: {
      type: String,
      enum: ['flight', 'hotel', 'package', 'offer'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Payment amount must be greater than 0'],
    },
    currency: {
      type: String,
      required: true,
      enum: SUPPORTED_CURRENCIES,
      default: 'INR',
    },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'phonepe', 'paypal', 'stripe', 'bank_transfer'],
      required: true,
    },
    // Normalized gateway identifiers and raw payloads
    gatewayData: {
      orderId: {
        type: String,
        index: true,
      },
      captureId: {
        type: String,
        index: true,
      },
      transactionId: {
        type: String,
        index: true,
      },
      redirectUrl: String,
      raw: mongoose.Schema.Types.Mixed,
    },
    // Support for multiple partial refunds
    refunds: [
      {
        refundId: { type: String, required: true },
        amount: { type: Number, required: true },
        currency: { type: String, required: true, enum: SUPPORTED_CURRENCIES },
        reason: { type: String },
        status: {
          type: String,
          enum: ['pending', 'processed', 'failed'],
          default: 'pending',
        },
        requestedAt: { type: Date, default: Date.now },
        processedAt: Date,
        gatewayResponse: mongoose.Schema.Types.Mixed,
      },
    ],
    totalRefunded: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.CREATED,
      index: true,
    },
    failureReason: String,
    failureCode: String,
    
    // Audit & tracking keys
    idempotencyKey: {
      type: String,
      index: true,
    },
    correlationId: {
      type: String,
      index: true,
    },
    
    // Status timestamps
    paidAt: Date,
    verifiedAt: Date,
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 60 * 1000), // Default 30-minute expiry
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
paymentSchema.index({ bookingId: 1, status: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });

// Cache original status on document load/init to track state changes
paymentSchema.post('init', function (doc) {
  doc._originalStatus = doc.status;
});

// Pre-save hook: Enforce state machine transitions
paymentSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    try {
      const prevStatus = this.isNew ? null : this._originalStatus;
      validateTransition(prevStatus, this.status);
      this._originalStatus = this.status; // Update original cache
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
