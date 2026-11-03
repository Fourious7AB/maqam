'use strict';

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const HotelBooking = require('../modules/hotels/hotel.model');
const hotelBookingUseCase = require('../modules/hotels/application/hotel-booking.usecase');
const { processSupplierBooking } = require('../workers/hotels/hotel-book.worker');

async function testConfirmPayment(bookingId) {
  console.log('====================================================');
  console.log('      HOTEL PAYMENT CONFIRMATION & SUPPLIER BOOK     ');
  console.log('====================================================');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const booking = await HotelBooking.findById(bookingId);
  if (!booking) {
    console.error(`Booking not found: ${bookingId}`);
    process.exit(1);
  }

  console.log(`Initial Status: ${booking.status}`);
  console.log(`Hotel: ${booking.hotelName}`);
  console.log(`Amount: ₹${booking.totalPrice}`);

  // Create a mock payment object
  const mockPayment = {
    _id: new mongoose.Types.ObjectId(),
    userId: booking.userId,
    bookingType: 'hotel',
    currency: booking.currency,
    amount: booking.totalPrice,
  };

  console.log('\n1. Advancing booking to PAYMENT_RECEIVED via confirmBookingAfterPayment()...');
  await hotelBookingUseCase.confirmBookingAfterPayment({
    bookingId: booking._id,
    payment: mockPayment,
  });

  const updatedBooking = await HotelBooking.findById(bookingId);
  console.log(`Status after payment confirmation: ${updatedBooking.status}`);

  console.log('\n2. Triggering processSupplierBooking() to call SRDV /Book...');
  await processSupplierBooking(booking._id);

  const finalBooking = await HotelBooking.findById(bookingId);
  console.log('\n====================================================');
  console.log('🎉 SUPPLIER BOOKING RESULT');
  console.log('====================================================');
  console.log(`Final Status:        ${finalBooking.status}`);
  console.log(`Provider Booking ID: ${finalBooking.providerBookingId}`);
  console.log(`Booking Ref No:      ${finalBooking.bookingRefNo}`);
  console.log(`Confirmation No:     ${finalBooking.confirmationNo}`);
  console.log(`Invoice No:          ${finalBooking.invoiceNumber}`);
  console.log(`Voucher Status:      ${finalBooking.voucherStatus}`);

  process.exit(0);
}

const bookingId = process.argv[2] || '6adc440a582fda740a0527a4';
testConfirmPayment(bookingId).catch((err) => {
  console.error('Error during payment confirmation & supplier book:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
