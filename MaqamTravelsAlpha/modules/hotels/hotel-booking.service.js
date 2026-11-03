'use strict';

/**
 * modules/hotels/hotel-booking.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin facade compatibility layer for the Hotel Booking Service.
 * Delegates to Clean Architecture use cases and workers.
 */

const HotelBooking = require('./hotel.model');
const { AppError } = require('../../middleware/errorHandler');
const hotelBookingUseCase = require('./application/hotel-booking.usecase');
const hotelCancelUseCase = require('./application/hotel-cancel.usecase');
const { pollPendingBookingStatus } = require('../../workers/hotels/hotel-poll-status.worker');

const toPublicBooking = (booking) => booking.toObject ? booking.toObject() : booking;

/**
 * Delegated to Use Case
 */
const createBooking = async ({ userId, recheckId, guests, acceptChanges }) => {
  return hotelBookingUseCase.createBooking({ userId, recheckId, guests, acceptChanges });
};

const getBookingForUser = async (bookingId, userId) => {
  const booking = await HotelBooking.findById(bookingId);
  if (!booking) throw new AppError('Hotel booking not found.', 404);
  const bookingUid = booking.userId?._id ? String(booking.userId._id) : String(booking.userId || '');
  const targetUid = userId?._id ? String(userId._id) : String(userId || '');
  if (targetUid && bookingUid && bookingUid !== targetUid) {
    throw new AppError('Unauthorized access to this booking.', 403);
  }
  return booking;
};

const listBookings = async (userId, { page = 1, limit = 20 } = {}) => {
  const [bookings, total] = await Promise.all([
    HotelBooking.find({ userId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    HotelBooking.countDocuments({ userId }),
  ]);
  return { bookings, total, page, limit };
};

/**
 * Delegated to Use Case (Enqueues BullMQ Job)
 */
const confirmBookingAfterPayment = async ({ bookingId, payment, session = null }) => {
  return hotelBookingUseCase.confirmBookingAfterPayment({ bookingId, payment, session });
};

/**
 * Delegated to Use Case
 */
const cancelBooking = async ({ bookingId, userId, correlationId }) => {
  return hotelCancelUseCase.cancelBooking({ bookingId, userId, correlationId });
};

/**
 * Reconciles/polls status via worker method
 */
const refreshPendingBooking = async (bookingId) => {
  await pollPendingBookingStatus(bookingId, 1);
  return HotelBooking.findById(bookingId);
};

module.exports = {
  createBooking,
  getBookingForUser,
  listBookings,
  confirmBookingAfterPayment,
  cancelBooking,
  refreshPendingBooking,
};
