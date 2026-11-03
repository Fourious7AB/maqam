'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const FlightRefundSchema = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'FlightBooking',
      required: true,
      index: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Airline & Supplier identifiers
    pnr: {
      type: String,
      trim: true,
      index: true,
    },
    srdvBookingId: {
      type: Number,
      index: true,
    },

    // Cancellation scope
    cancellationType: {
      type: String,
      enum: ['full', 'partial_passenger'],
      default: 'full',
    },
    cancelledPassengers: [
      {
        travellerId: { type: Schema.Types.ObjectId, ref: 'Traveller' },
        ticketNumber: String,
        firstName: String,
        lastName: String,
      },
    ],

    // Financial breakdown (in standard major units, e.g. INR / USD)
    totalBookingAmount: {
      type: Number,
      required: true,
      min: 0,
      description: 'Gross total amount originally paid by customer',
    },
    airlinePenalty: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Cancellation fee deducted by airline / supplier',
    },
    agencyFee: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Non-refundable agency markup retained by platform',
    },
    customerRefundAmount: {
      type: Number,
      required: true,
      min: 0,
      description: 'Net refund amount returned to customer (totalBookingAmount - airlinePenalty - agencyFee)',
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },

    // Gateway & Supplier Tracking
    gatewayRefundId: {
      type: String,
      trim: true,
      index: true,
      description: 'Refund transaction ID from PayPal or Razorpay',
    },
    supplierRefundReference: {
      type: String,
      trim: true,
      description: 'Change request reference or cancellation ARN from SRDV / Airline',
    },
    changeRequests: [
      {
        changeRequestId: String,
        ticketId: String,
        status: String,
        remarks: String,
        changeRequestStatus: String,
      },
    ],

    // State lifecycle
    status: {
      type: String,
      enum: ['requested', 'pending', 'processed', 'failed', 'rejected'],
      default: 'pending',
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    remark: {
      type: String,
      trim: true,
    },

    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.FlightRefund || mongoose.model('FlightRefund', FlightRefundSchema);
