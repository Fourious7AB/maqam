'use strict';

/**
 * modules/shared/outbox-event.model.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared Transactional Outbox Event Model.
 * Used by Hotels, Flights, Packages, and any future domain that needs
 * reliable async event delivery with at-least-once guarantees.
 *
 * Consumers: hotel workers, flight workers, bookingSync.js, usecases.
 */

const mongoose = require('mongoose');

const outboxEventSchema = new mongoose.Schema({
  aggregateType: { type: String, required: true, index: true }, // 'HotelBooking', 'FlightBooking', etc.
  aggregateId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  eventType: { type: String, required: true, index: true }, // 'PAYMENT_RECEIVED', 'TICKET_GDS_SUCCESS', etc.
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['pending', 'published', 'failed'], default: 'pending', index: true },
  attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date, index: true },
  error: String,
}, { timestamps: true });

outboxEventSchema.index({ status: 1, nextAttemptAt: 1 });

module.exports = mongoose.models.OutboxEvent || mongoose.model('OutboxEvent', outboxEventSchema);
