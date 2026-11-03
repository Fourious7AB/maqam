'use strict';

/**
 * server/scripts/backfill-master-bookings.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Synchronizes existing domain bookings (Hotel, Flight, Package, Offer)
 * into the Master Booking (Booking) collection.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const Booking = require('../modules/bookings/booking.model');
const HotelBooking = require('../modules/hotels/hotel.model');
const FlightBooking = require('../modules/flights/flight.model');
const PackageBooking = require('../modules/packages/models/packageBooking.model');
const OfferBooking = require('../modules/packages/offers/offerBooking.model');
const { BOOKING_STATUS, BOOKING_TYPES } = require('../config/constants');

const mapHotelStatus = (status) => {
  if (['confirmed', 'completed'].includes(status)) return BOOKING_STATUS.CONFIRMED;
  if (['cancelled', 'cancellation_requested'].includes(status)) return BOOKING_STATUS.CANCELLED;
  if (['provider_failed', 'payment_failed'].includes(status)) return BOOKING_STATUS.FAILED;
  return BOOKING_STATUS.PENDING;
};

const mapFlightStatus = (status) => {
  if (['confirmed', 'ticketed'].includes(status)) return BOOKING_STATUS.CONFIRMED;
  if (['cancelled'].includes(status)) return BOOKING_STATUS.CANCELLED;
  if (['failed'].includes(status)) return BOOKING_STATUS.FAILED;
  return BOOKING_STATUS.PENDING;
};

const mapPackageStatus = (status) => {
  if (status === 'confirmed') return BOOKING_STATUS.CONFIRMED;
  if (status === 'cancelled') return BOOKING_STATUS.CANCELLED;
  return BOOKING_STATUS.PENDING;
};

async function backfill() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is missing from environment');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  let hotelCount = 0;
  let flightCount = 0;
  let packageCount = 0;
  let offerCount = 0;

  // 1. Hotel Bookings
  const hotelBookings = await HotelBooking.find().lean();
  console.log(`Found ${hotelBookings.length} HotelBookings...`);
  for (const h of hotelBookings) {
    if (!h.userId) continue;
    const dest = h.destination ? `${h.hotelName}, ${h.destination}` : h.hotelName;
    await Booking.findOneAndUpdate(
      { itemId: h._id, bookingType: BOOKING_TYPES.HOTEL },
      {
        $setOnInsert: { createdAt: h.createdAt || new Date() },
        $set: {
          userId: h.userId,
          bookingType: BOOKING_TYPES.HOTEL,
          itemId: h._id,
          details: {
            destination: dest,
            departureDate: h.checkIn,
            returnDate: h.checkOut,
            totalPrice: h.totalPrice || 0,
            currency: h.currency || 'INR',
            passengers: Array.isArray(h.guests) ? h.guests.length : 1,
          },
          status: mapHotelStatus(h.status),
          paymentId: h.paymentId || undefined,
          updatedAt: h.updatedAt || new Date(),
        },
      },
      { upsert: true, new: true }
    );
    hotelCount++;
  }

  // 2. Flight Bookings
  const flightBookings = await FlightBooking.find().lean();
  console.log(`Found ${flightBookings.length} FlightBookings...`);
  for (const f of flightBookings) {
    const userId = f.user || f.userId;
    if (!userId) continue;
    const itin = f.eTicketData || {};
    const segments = itin.Segments?.[0] || [];
    const firstSeg = segments[0] || {};
    const lastSeg = segments[segments.length - 1] || firstSeg;
    const origin = firstSeg?.Origin?.AirportCode || '';
    const destCode = lastSeg?.Destination?.AirportCode || '';
    const route = origin && destCode ? `${origin}-${destCode}` : (f.destination || 'Flight');

    await Booking.findOneAndUpdate(
      { itemId: f._id, bookingType: BOOKING_TYPES.FLIGHT },
      {
        $setOnInsert: { createdAt: f.createdAt || new Date() },
        $set: {
          userId,
          bookingType: BOOKING_TYPES.FLIGHT,
          itemId: f._id,
          details: {
            destination: route,
            departureDate: firstSeg?.Origin?.DepTime || f.createdAt,
            returnDate: segments.length > 1 ? lastSeg?.Destination?.ArrTime : null,
            totalPrice: f.totalAmount || 0,
            currency: 'INR',
            passengers: Array.isArray(f.passengers) ? f.passengers.length : 1,
          },
          status: mapFlightStatus(f.status),
          paymentId: f.paymentId || undefined,
          updatedAt: f.updatedAt || new Date(),
        },
      },
      { upsert: true, new: true }
    );
    flightCount++;
  }

  // 3. Package Bookings
  const packageBookings = await PackageBooking.find().lean();
  console.log(`Found ${packageBookings.length} PackageBookings...`);
  for (const p of packageBookings) {
    if (!p.userId) continue;
    const dest = p.packageSnapshot?.destination || p.packageSnapshot?.title || 'Package Trip';
    await Booking.findOneAndUpdate(
      { itemId: p._id, bookingType: BOOKING_TYPES.PACKAGE },
      {
        $setOnInsert: { createdAt: p.createdAt || new Date() },
        $set: {
          userId: p.userId,
          bookingType: BOOKING_TYPES.PACKAGE,
          itemId: p._id,
          details: {
            destination: dest,
            departureDate: p.packageSnapshot?.validity?.startDate || p.travelDates?.startDate,
            returnDate: p.packageSnapshot?.validity?.endDate || p.travelDates?.endDate,
            totalPrice: p.totalAmount || 0,
            currency: 'INR',
            passengers: Array.isArray(p.travellers) ? p.travellers.length : 1,
          },
          status: mapPackageStatus(p.status),
          paymentId: p.paymentId || undefined,
          updatedAt: p.updatedAt || new Date(),
        },
      },
      { upsert: true, new: true }
    );
    packageCount++;
  }

  // 4. Offer Bookings
  const offerBookings = await OfferBooking.find().lean();
  console.log(`Found ${offerBookings.length} OfferBookings...`);
  for (const o of offerBookings) {
    if (!o.userId) continue;
    const dest = o.offerSnapshot?.destination || o.offerSnapshot?.title || 'Offer Booking';
    await Booking.findOneAndUpdate(
      { itemId: o._id, bookingType: BOOKING_TYPES.OFFER },
      {
        $setOnInsert: { createdAt: o.createdAt || new Date() },
        $set: {
          userId: o.userId,
          bookingType: BOOKING_TYPES.OFFER,
          itemId: o._id,
          details: {
            destination: dest,
            departureDate: o.offerSnapshot?.startDate,
            returnDate: o.offerSnapshot?.endDate,
            totalPrice: o.totalAmount || 0,
            currency: 'INR',
            passengers: Array.isArray(o.travellers) ? o.travellers.length : 1,
          },
          status: mapPackageStatus(o.status),
          paymentId: o.paymentId || undefined,
          updatedAt: o.updatedAt || new Date(),
        },
      },
      { upsert: true, new: true }
    );
    offerCount++;
  }

  const totalMaster = await Booking.countDocuments();
  console.log('\n=======================================');
  console.log(`✔ Backfill complete!`);
  console.log(`  Hotels synced:    ${hotelCount}`);
  console.log(`  Flights synced:   ${flightCount}`);
  console.log(`  Packages synced:  ${packageCount}`);
  console.log(`  Offers synced:    ${offerCount}`);
  console.log(`  Total Master Bookings in DB: ${totalMaster}`);
  console.log('=======================================\n');

  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error('Backfill error:', err);
  process.exit(1);
});
