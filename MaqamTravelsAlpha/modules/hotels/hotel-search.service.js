'use strict';

/**
 * modules/hotels/hotel-search.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin facade compatibility layer for Hotel Search Service.
 * Delegates to Clean Architecture use cases.
 */

const hotelSearchUseCase = require('./application/hotel-search.usecase');

const searchHotels = async (criteria) => {
  return hotelSearchUseCase.searchHotels(criteria);
};

const getHotelDetails = async ({ searchId, hotelId, correlationId }) => {
  return hotelSearchUseCase.getHotelDetails({ searchId, hotelId, correlationId });
};

const recheck = async ({ searchId, hotelId, selectedRooms, correlationId }) => {
  return hotelSearchUseCase.recheck({ searchId, hotelId, selectedRooms, correlationId });
};

module.exports = {
  searchHotels,
  getHotelDetails,
  recheck,
};
