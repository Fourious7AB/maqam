const mongoose = require('mongoose');
const { BOOKING_TYPES, BOOKING_STATUS } = require('../../config/constants');

/**
 * ─── BOOKING MODEL (Master Booking Schema) ────────────
 * Tracks all bookings (hotels, flights, offers, packages)
 * Individual details stored in respective domain models
 */

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // What kind of booking is this?
    bookingType: {
      type: String,
      enum: Object.values(BOOKING_TYPES),
      required: true,
    },
    // Reference to specific booking (hotelBookingId, flightBookingId, etc.)
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    // Generic details (flexible for different booking types)
    details: {
      destination: String,
      departureDate: Date,
      returnDate: Date,
      totalPrice: Number,
      currency: String,
      passengers: Number,
      hotelName: String,
      roomName: String,
      airline: String,
      flightNumber: String,
      origin: String,
    },
    // Booking status
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: 'pending',
    },
    // Cancellation info
    cancelledAt: Date,
    cancellationReason: String,
    refundAmount: Number,
    // Payment linked to this booking
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    // Operations / CRM handling agent
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    // Operational timeline remarks
    remarks: [
      {
        text: { type: String, required: true },
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
bookingSchema.index({ userId: 1 });
bookingSchema.index({ bookingType: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
