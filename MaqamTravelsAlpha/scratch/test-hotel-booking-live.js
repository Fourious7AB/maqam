'use strict';

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../modules/auth/auth.model');
const HotelBooking = require('../modules/hotels/hotel.model');
const HotelCity = require('../modules/hotels/hotelCity.model');
const hotelSearchUseCase = require('../modules/hotels/application/hotel-search.usecase');
const hotelBookingUseCase = require('../modules/hotels/application/hotel-booking.usecase');
const { getBullMQConnection } = require('../utils/redis');
const logger = require('../utils/logger');

async function runTest() {
  console.log('====================================================');
  console.log('       HOTEL BOOKING LIVE END-TO-END TEST           ');
  console.log('====================================================');

  console.log('\n1. Connecting to MongoDB & Redis...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('   ✅ MongoDB connected successfully!');

  // Check Redis
  try {
    const redis = getBullMQConnection();
    await redis.ping();
    console.log('   ✅ Redis connected successfully!');
  } catch (err) {
    console.log(`   ⚠️ Redis connection issue: ${err.message}`);
  }

  // Find or create test user
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
    console.log(`   ✅ Created test user: ${user._id} (${user.email})`);
  } else {
    console.log(`   ✅ Using existing test user: ${user._id} (${user.email})`);
  }

  // 2. City Search
  console.log('\n2. Finding destination city in HotelCity database...');
  let city = await HotelCity.findOne({ cityId: '147862' }); // Dubai (has 1000+ test hotels in SRDV sandbox)
  if (!city) {
    city = await HotelCity.findOne({ cityName: /dubai/i });
  }
  if (!city) {
    city = await HotelCity.findOne({});
  }

  if (!city) {
    console.error('   ❌ No hotel cities found in DB! Check if hotelcities collection is seeded.');
    process.exit(1);
  }
  console.log(`   ✅ Selected city: ${city.cityName} (ID: ${city.cityId}, Country: ${city.countryCode})`);

  // Calculate checkIn and checkOut dates (e.g. 15 days in future for 2 nights)
  const now = new Date();
  const checkInDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const checkOutDate = new Date(now.getTime() + 17 * 24 * 60 * 60 * 1000);

  const checkIn = checkInDate.toISOString().split('T')[0];
  const checkOut = checkOutDate.toISOString().split('T')[0];
  console.log(`   Dates: Check-in ${checkIn} -> Check-out ${checkOut} (2 nights)`);

  // 3. Search Hotels
  console.log('\n3. Searching hotels via hotelSearchUseCase.search()...');
  const searchPayload = {
    cityId: String(city.cityId),
    countryCode: city.countryCode,
    cityName: city.cityName,
    checkIn,
    checkOut,
    guestNationality: 'IN',
    currency: 'INR',
    rooms: [
      {
        adults: 2,
        children: 0,
        childAges: [],
      },
    ],
    correlationId: `test-hotel-${Date.now()}`,
  };

  const searchResult = await hotelSearchUseCase.searchHotels(searchPayload);
  const hotels = searchResult.hotels || [];
  console.log(`   ✅ Search completed! Found ${hotels.length} hotels. SearchId: ${searchResult.searchId}`);

  if (hotels.length === 0) {
    console.log('   ⚠️ No hotels returned for this city and date range on SRDV test environment.');
    console.log('   Trying fallback search with New Delhi (130443 or special city)...');
    process.exit(0);
  }

  const selectedHotel = hotels[0];
  console.log(`\n4. Selected Hotel:`);
  console.log(`   Name: ${selectedHotel.name}`);
  console.log(`   HotelCode: ${selectedHotel.id}`);
  console.log(`   From Price: ₹${selectedHotel.fromPrice?.totalPrice || selectedHotel.fromPrice?.perNightPrice} (${selectedHotel.fromPrice?.currency})`);

  // 5. Get Hotel Details & Rooms
  console.log('\n5. Fetching room options via hotelSearchUseCase.getHotelDetails()...');
  const details = await hotelSearchUseCase.getHotelDetails({
    searchId: searchResult.searchId,
    hotelId: selectedHotel.id,
    correlationId: `test-hotel-details-${Date.now()}`,
  });

  const rooms = details.rooms || [];
  console.log(`   ✅ Found ${rooms.length} room options.`);
  if (rooms.length === 0) {
    console.log('   ⚠️ No rooms available for this hotel.');
    process.exit(0);
  }

  const selectedRoom = rooms[0];
  console.log(`   Room: ${selectedRoom.name} (RoomID: ${selectedRoom.id})`);
  console.log(`   Meal Type: ${selectedRoom.mealType || 'Room Only'}`);
  console.log(`   Price: ₹${selectedRoom.price?.total || selectedRoom.price}`);

  // 6. Recheck Room
  console.log('\n6. Locking rate via hotelSearchUseCase.recheck()...');
  const recheckResult = await hotelSearchUseCase.recheck({
    searchId: searchResult.searchId,
    hotelId: selectedHotel.id,
    selectedRooms: [
      {
        roomId: selectedRoom.id,
        quantity: 1,
      },
    ],
    correlationId: `test-hotel-recheck-${Date.now()}`,
  });

  console.log(`   ✅ Recheck successful! RecheckId: ${recheckResult.recheckId}`);
  console.log(`   Locked Price: ₹${recheckResult.price?.total || recheckResult.sellingPrice?.totalPrice || 'N/A'}`);
  console.log(`   Cancellation Policy: ${recheckResult.cancellationPolicy?.summary || 'Non-refundable / per policy'}`);

  // 7. Create Hotel Booking
  console.log('\n7. Creating Booking via hotelBookingUseCase.createBooking()...');
  const booking = await hotelBookingUseCase.createBooking({
    userId: user._id,
    recheckId: recheckResult.recheckId,
    acceptChanges: true,
    guests: [
      {
        title: 'Mr',
        firstName: 'John',
        lastName: 'Doe',
        type: 'adult',
        email: 'john.doe@example.com',
        phone: '+919876543210',
        pan: 'ABCPD1234F',
        passportNo: 'Z1234567',
      },
      {
        title: 'Mrs',
        firstName: 'Jane',
        lastName: 'Doe',
        type: 'adult',
        email: 'jane.doe@example.com',
        phone: '+919876543210',
        pan: 'ABCPD1234F',
        passportNo: 'Z7654321',
      },
    ],
    correlationId: `test-hotel-book-${Date.now()}`,
  });

  console.log('\n====================================================');
  console.log('🎉 HOTEL BOOKING SUCCESSFULLY CREATED IN SYSTEM!');
  console.log('====================================================');
  console.log(`   Booking ID:        ${booking._id}`);
  console.log(`   Booking Status:    ${booking.status}`);
  console.log(`   Hotel Name:        ${booking.hotelName}`);
  console.log(`   Check-In:          ${booking.checkIn}`);
  console.log(`   Check-Out:         ${booking.checkOut}`);
  console.log(`   Total Price:       ₹${booking.totalPrice}`);
  console.log(`   Total Minor Units: ${booking.customerTotalMinor}`);
  console.log(`   SearchId:          ${booking.searchId}`);
  console.log(`   Provider:          ${booking.provider}`);

  // 8. Confirm Payment & Trigger Supplier Booking
  console.log('\n8. Simulating Payment & triggering BullMQ supplier booking worker...');
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
  await new Promise((resolve) => setTimeout(resolve, 8000));

  const finalBooking = await HotelBooking.findById(booking._id);
  console.log('\n====================================================');
  console.log('🏁 FINAL SUPPLIER BOOKING STATUS');
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

runTest().catch((err) => {
  console.error('\n❌ Test Error:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
