const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const FlightBooking = require('../modules/flights/flight.model');
const Booking = require('../modules/bookings/booking.model');

async function findBookings() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);

  console.log('--- Checking FlightBooking Collection ---');
  const flightBookings = await FlightBooking.find({}).sort({ createdAt: -1 }).limit(10).lean();
  console.log(`Total FlightBookings found (latest 10): ${flightBookings.length}`);
  flightBookings.forEach((b, i) => {
    console.log(`[${i}] ID: ${b._id}, Status: ${b.status}, PNR: ${b.pnr}, SRDV Booking ID: ${b.srdvBookingId}, isLCC: ${b.isLCC}, Amount: ₹${b.totalAmount}, Created: ${b.createdAt}`);
  });

  console.log('\n--- Checking Master Booking Collection for flight ---');
  const masterBookings = await Booking.find({ bookingType: 'flight' }).sort({ createdAt: -1 }).limit(10).lean();
  console.log(`Total Master Bookings found (latest 10): ${masterBookings.length}`);
  masterBookings.forEach((b, i) => {
    console.log(`[${i}] ID: ${b._id}, ItemId: ${b.itemId}, Status: ${b.status}, Destination: ${b.details?.destination}, Amount: ₹${b.details?.totalPrice}, Created: ${b.createdAt}`);
  });

  await mongoose.disconnect();
}

findBookings().catch(console.error);
