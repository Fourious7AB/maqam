'use strict';

/**
 * modules/hotels/hotelCity.model.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mongoose model for SRDV hotel city codes.
 *
 * Seeded from SRDV's official city code lists (hotel_city_code_special.json +
 * hotel_city_code.json). Contains ~139,000 cities across 195+ countries.
 *
 * Indexes:
 *   - text index on cityName   → fast case-insensitive substring search
 *   - unique index on cityId   → deduplication guarantee
 *   - index on countryCode     → fast country-filtered queries
 */

const mongoose = require('mongoose');

const hotelCitySchema = new mongoose.Schema({
  cityId:       { type: String, required: true, unique: true, index: true },
  cityName:     { type: String, required: true, trim: true },
  countryCode:  { type: String, required: true, uppercase: true, trim: true, index: true },
  country:      { type: String, trim: true, default: '' },
  stateName:    { type: String, trim: true, default: '' },
  districtName: { type: String, trim: true, default: '' },
  fullName:     { type: String, trim: true, default: '' },
  type:         { type: String, trim: true, default: 'CITY' },
  hotelCount:   { type: Number, default: 0, index: true },
  source:       { type: String, default: 'international' },
}, {
  timestamps: false,
  collection: 'hotelcities',
});

// Text index for cityName — enables fast $text search and substring matching
hotelCitySchema.index({ cityName: 'text' });

// Compound index for autocomplete: country-filtered name search
hotelCitySchema.index({ countryCode: 1, cityName: 1 });

module.exports = mongoose.models.HotelCity
  || mongoose.model('HotelCity', hotelCitySchema);
