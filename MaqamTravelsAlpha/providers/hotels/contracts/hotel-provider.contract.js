const REQUIRED_METHODS = [
  'searchHotels',
  'getHotelDetails',
  'getHotelRooms',
  'blockRoom',
  'book',
  'getBookingStatus',
  'cancelBooking',
];

const assertHotelProvider = (provider, name) => {
  const missing = REQUIRED_METHODS.filter((method) => typeof provider?.[method] !== 'function');
  if (missing.length) {
    throw new Error(`Hotel provider ${name} is missing: ${missing.join(', ')}`);
  }
  return provider;
};

module.exports = { REQUIRED_METHODS, assertHotelProvider };
