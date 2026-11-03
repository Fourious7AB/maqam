'use strict';

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../modules/auth/auth.model');
const HotelBooking = require('../modules/hotels/hotel.model');
const hotelSearchUseCase = require('../modules/hotels/application/hotel-search.usecase');
const hotelBookingUseCase = require('../modules/hotels/application/hotel-booking.usecase');
const { processSupplierBooking } = require('../workers/hotels/hotel-book.worker');

async function testJaipur() {
  console.log('====================================================');
  console.log('    TESTING DOMESTIC HOTEL BOOKING (JAIPUR, IN)     ');
  console.log('====================================================');

  await mongoose.connect(process.env.MONGO_URI);

  let user = await User.findOne({ email: 'test.hotel.user@example.com' });
  if (!user) {
    user = await User.create({
      firstName: 'Hotel',
      lastName: 'Tester',
      name: 'Hotel Tester',
      email: 'test.hotel.user@example.com',
      password: 'Password123!',
      phone: '9876543211',
      role: 'customer',
    });
  }

  const checkIn = '2026-11-15';
  const checkOut = '2026-11-17';

  console.log('\n1. Searching Hotels in Jaipur (CityId: 739239)...');
  const searchRes = await hotelSearchUseCase.searchHotels({
    cityId: '739239',
    countryCode: 'IN',
    cityName: 'JAIPUR',
    checkIn,
    checkOut,
    guestNationality: 'IN',
    currency: 'INR',
    rooms: [{ adults: 2, children: 0, childAges: [] }],
    correlationId: `test-jaipur-${Date.now()}`,
  });

  console.log(`   Found ${searchRes.hotels.length} hotels in Jaipur.`);
  const hotel = searchRes.hotels[0];
  console.log(`   Selected Hotel: ${hotel.name} (Code: ${hotel.id})`);

  console.log('\n2. Fetching Hotel Details & Rooms...');
  const details = await hotelSearchUseCase.getHotelDetails({
    searchId: searchRes.searchId,
    hotelId: hotel.id,
    correlationId: `test-jaipur-details-${Date.now()}`,
  });

  const room = details.rooms[0];
  console.log(`   Selected Room: ${room.name} (Price: ₹${room.price?.total || room.price})`);

  console.log('\n3. Rechecking Room (BlockRoom)...');
  const recheckRes = await hotelSearchUseCase.recheck({
    searchId: searchRes.searchId,
    hotelId: hotel.id,
    selectedRooms: [{ roomId: room.id, quantity: 1 }],
    correlationId: `test-jaipur-recheck-${Date.now()}`,
  });

  console.log(`   RecheckId: ${recheckRes.recheckId}`);

  console.log('\n4. Creating Hotel Booking (WITHOUT PAN to test domestic policy)...');
  const booking = await hotelBookingUseCase.createBooking({
    userId: user._id,
    recheckId: recheckRes.recheckId,
    acceptChanges: true,
    guests: [
      {
        title: 'Mr',
        firstName: 'Rahul',
        lastName: 'Sharma',
        type: 'adult',
        email: 'rahul.sharma@example.com',
        phone: '+919876543210',
      },
      {
        title: 'Mrs',
        firstName: 'Priya',
        lastName: 'Sharma',
        type: 'adult',
        email: 'priya.sharma@example.com',
        phone: '+919876543210',
      },
    ],
    correlationId: `test-jaipur-book-${Date.now()}`,
  });

  console.log(`   Booking ID Created: ${booking._id}`);
  console.log(`   Initial Status: ${booking.status}`);

  console.log('\n5. Advancing to PAYMENT_RECEIVED and calling SRDV /Book...');
  const mockPayment = {
    _id: new mongoose.Types.ObjectId(),
    userId: user._id,
    bookingType: 'hotel',
    currency: booking.currency,
    amount: booking.totalPrice,
  };

  await hotelBookingUseCase.confirmBookingAfterPayment({
    bookingId: booking._id,
    payment: mockPayment,
  });

  console.log('   Waiting 8 seconds for background worker to call SRDV /Book...');
  await new Promise((res) => setTimeout(res, 8000));

  const finalBooking = await HotelBooking.findById(booking._id);
  console.log('\n====================================================');
  console.log('🏁 FINAL SUPPLIER BOOKING RESULT FOR JAIPUR');
  console.log('====================================================');
  console.log(`   Status:              ${finalBooking.status}`);
  console.log(`   Provider Booking ID: ${finalBooking.providerBookingId || 'N/A'}`);
  console.log(`   Booking Ref No:      ${finalBooking.bookingRefNo || 'N/A'}`);
  console.log(`   Confirmation No:     ${finalBooking.confirmationNo || 'N/A'}`);
  console.log(`   Invoice No:          ${finalBooking.invoiceNumber || 'N/A'}`);
  console.log(`   Voucher Status:      ${finalBooking.voucherStatus || 'N/A'}`);
  if (finalBooking.failureReason) {
    console.log(`   Failure Reason:      ${finalBooking.failureReason}`);
  }

  process.exit(0);
}

testJaipur().catch((err) => {
  console.error('Error during Jaipur test:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
