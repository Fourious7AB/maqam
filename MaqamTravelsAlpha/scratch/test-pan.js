'use strict';

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../modules/auth/auth.model');
const HotelBooking = require('../modules/hotels/hotel.model');
const hotelSearchUseCase = require('../modules/hotels/application/hotel-search.usecase');
const hotelBookingUseCase = require('../modules/hotels/application/hotel-booking.usecase');
const { processSupplierBooking } = require('../workers/hotels/hotel-book.worker');

async function testWithDocPan() {
  console.log('====================================================');
  console.log('  TESTING SRDV /Book WITH DOCUMENTATION PAN (EXVPR5555M)');
  console.log('====================================================');

  await mongoose.connect(process.env.MONGO_URI);

  let user = await User.findOne({ email: 'test.hotel.user@example.com' });
  if (!user) {
    user = await User.create({
      firstName: 'MD',
      lastName: 'Rana',
      name: 'MD Rana',
      email: 'test.hotel.user@example.com',
      password: 'Password123!',
      phone: '9876543211',
      role: 'customer',
    });
  }

  const checkIn = '2026-11-20';
  const checkOut = '2026-11-22';

  console.log('\n1. Searching Jaipur...');
  const searchRes = await hotelSearchUseCase.searchHotels({
    cityId: '739239',
    countryCode: 'IN',
    cityName: 'JAIPUR',
    checkIn,
    checkOut,
    guestNationality: 'IN',
    currency: 'INR',
    rooms: [{ adults: 1, children: 0, childAges: [] }],
    correlationId: `test-pan-${Date.now()}`,
  });

  const hotel = searchRes.hotels[0];
  console.log(`   Hotel: ${hotel.name} (${hotel.id})`);

  console.log('\n2. Details & Rooms...');
  const details = await hotelSearchUseCase.getHotelDetails({
    searchId: searchRes.searchId,
    hotelId: hotel.id,
    correlationId: `test-pan-det-${Date.now()}`,
  });

  const room = details.rooms[0];
  console.log(`   Room: ${room.name}`);

  console.log('\n3. BlockRoom...');
  const recheckRes = await hotelSearchUseCase.recheck({
    searchId: searchRes.searchId,
    hotelId: hotel.id,
    selectedRooms: [{ roomId: room.id, quantity: 1 }],
    correlationId: `test-pan-rec-${Date.now()}`,
  });

  console.log(`   RecheckId: ${recheckRes.recheckId}`);

  console.log('\n4. Creating Booking with PAN = EXVPR5555M (from SRDV official docs)...');
  const booking = await hotelBookingUseCase.createBooking({
    userId: user._id,
    recheckId: recheckRes.recheckId,
    acceptChanges: true,
    guests: [
      {
        title: 'Mr',
        firstName: 'MD Rana',
        lastName: 'Hasan',
        type: 'adult',
        email: 'md.rana@example.com',
        phone: '+919876543210',
        pan: 'EXVPR5555M',
      },
    ],
    correlationId: `test-pan-bk-${Date.now()}`,
  });

  console.log(`   Booking Created: ${booking._id}`);

  console.log('\n5. Confirming Payment & calling SRDV /Book...');
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
  console.log('🏁 RESULT WITH PAN = EXVPR5555M:');
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

testWithDocPan().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
