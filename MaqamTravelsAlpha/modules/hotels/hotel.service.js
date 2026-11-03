// Compatibility facade. New consumers should use hotel-search.service and hotel-booking.service.
const search = require('./hotel-search.service');
const booking = require('./hotel-booking.service');

module.exports = { ...search, ...booking };
