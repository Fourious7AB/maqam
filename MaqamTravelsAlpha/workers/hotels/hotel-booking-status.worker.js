'use strict';

const HotelBooking = require('../../modules/hotels/hotel.model');
const { pollPendingBookingStatus } = require('./hotel-poll-status.worker');
const { HOTEL_BOOKING_STATUS } = require('../../modules/hotels/hotel.constants');
const logger = require('../../utils/logger');

/**
 * Reconciles any hotel bookings that are stranded in PROVIDER_PENDING status.
 * Can be triggered via cron or admin maintenance scripts.
 */
const reconcilePendingHotelBookings = async ({ limit = 50 } = {}) => {
  const pending = await HotelBooking.find({ status: HOTEL_BOOKING_STATUS.PROVIDER_PENDING })
    .sort({ updatedAt: 1 })
    .limit(limit)
    .select('_id');
    
  const results = await Promise.allSettled(pending.map(({ _id }) => pollPendingBookingStatus(_id, 1)));
  const failed = results.filter((result) => result.status === 'rejected');
  failed.forEach((result) => logger.error(`Hotel pending-status reconciliation failed: ${result.reason.message}`));
  
  return { processed: results.length, failed: failed.length };
};

module.exports = { reconcilePendingHotelBookings };
