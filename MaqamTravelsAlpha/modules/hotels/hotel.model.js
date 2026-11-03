const mongoose = require('mongoose');
const { HOTEL_BOOKING_STATUS } = require('./hotel.constants');

/**
 * HotelBooking Schema
 * ─────────────────────────────────────────────────────────────────────────────
 * Core domain model for a hotel booking lifecycle record.
 *
 * Booking Lifecycle (status field):
 *   awaiting_payment       → Created, payment not yet received
 *   payment_received       → Payment verified by webhook
 *   confirming_provider    → Async worker calling SRDV Book API
 *   confirmed              → Supplier confirmed reservation
 *   provider_pending       → Supplier returned pending status
 *   provider_failed        → Supplier rejected booking (refund initiated)
 *   cancellation_requested → User requested cancel, supplier call in-flight
 *   cancelled              → Cancellation confirmed
 *   payment_failed         → Payment gateway failure
 *   refund_pending         → Refund queued for gateway
 *   refunded               → Refund processed
 *   completed              → Stay completed
 *
 * Financial fields use minor units (paise for INR):
 *   supplierAmountMinor - Raw supplier cost
 *   markupMinor         - Applied markup amount
 *   feeMinor            - Flat convenience fee
 *   customerTotalMinor  - Final amount charged to customer
 *
 * DB Indices:
 *   - userId + createdAt (user booking history)
 *   - status + updatedAt (worker polling)
 *   - nextActionAt + status (scheduled action monitoring)
 *   - recheckId (unique — prevents duplicate bookings)
 *   - providerBookingId (supplier lookup)
 */
const hotelBookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider: { type: String, required: true, default: 'srdv' },
  status: { type: String, enum: Object.values(HOTEL_BOOKING_STATUS), default: HOTEL_BOOKING_STATUS.AWAITING_PAYMENT, index: true },
  searchId: { type: String, required: true, index: true },
  recheckId: { type: String, required: true, unique: true },
  traceId: String,
  srdvType: mongoose.Schema.Types.Mixed,
  srdvIndex: mongoose.Schema.Types.Mixed,
  resultIndex: mongoose.Schema.Types.Mixed,
  srdvHotelId: { type: String, required: true, index: true },
  hotelName: { type: String, required: true },
  destination: String,
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  hotelSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  roomSnapshots: { type: [mongoose.Schema.Types.Mixed], required: true },
  guests: { type: [mongoose.Schema.Types.Mixed], required: true },
  priceSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  cancellationPolicySnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  totalPrice: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true },

  // Financial minor-units breakdown
  supplierAmountMinor: { type: Number, required: true, default: 0 },
  customerTotalMinor: { type: Number, required: true, default: 0 },
  markupMinor: { type: Number, required: true, default: 0 },
  feeMinor: { type: Number, required: true, default: 0 },
  pricingVersion: { type: String, default: 'none' },

  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  providerBookingId: { type: String, index: true },
  bookingRefNo: String,
  confirmationNo: String,
  invoiceNumber: String,
  voucherStatus: Boolean,
  providerRawResponse: mongoose.Schema.Types.Mixed,
  failureReason: String,
  cancellationReference: String,
  cancellationReason: String,
  cancelledAt: Date,

  // Async workers controls
  nextActionAt: { type: Date, index: true },
  outboxPublished: { type: Boolean, default: false, index: true },
}, { timestamps: true, strict: 'throw' });

hotelBookingSchema.index({ userId: 1, createdAt: -1 });
hotelBookingSchema.index({ status: 1, updatedAt: 1 });
hotelBookingSchema.index({ nextActionAt: 1, status: 1 });

module.exports = mongoose.models.HotelBooking || mongoose.model('HotelBooking', hotelBookingSchema);
