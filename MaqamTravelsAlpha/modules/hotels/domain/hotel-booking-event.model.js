'use strict';

const mongoose = require('mongoose');

const hotelBookingEventSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'HotelBooking', required: true, index: true },
  sequence: { type: Number, required: true },
  fromStatus: { type: String, required: true },
  toStatus: { type: String, required: true },
  actor: { type: String, required: true, default: 'system' }, // system, user, admin
  reason: { type: String },
  correlationId: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: { createdAt: true, updatedAt: false } });

hotelBookingEventSchema.index({ bookingId: 1, sequence: 1 }, { unique: true });

module.exports = mongoose.models.HotelBookingEvent || mongoose.model('HotelBookingEvent', hotelBookingEventSchema);
