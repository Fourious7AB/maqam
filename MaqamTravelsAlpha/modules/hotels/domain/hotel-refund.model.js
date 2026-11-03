'use strict';

const mongoose = require('mongoose');

const hotelRefundSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'HotelBooking', required: true, index: true },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
  gatewayRefundId: { type: String, index: true },
  idempotencyKey: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'processed', 'failed'], default: 'pending', index: true },
  customerAmountMinor: { type: Number, required: true }, // refund amount back to customer in paise
  currency: { type: String, required: true, default: 'INR' },
  reason: { type: String },
  supplierCancellationReference: { type: String },
}, { timestamps: true });

module.exports = mongoose.models.HotelRefund || mongoose.model('HotelRefund', hotelRefundSchema);
