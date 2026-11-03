'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const assert = require('assert');

const User = require('../modules/auth/auth.model');
const Hotel = require('../modules/hotels/hotelEntity.model');
const HotelStock = require('../modules/packages/stock/hotelStock.model');
const TicketStock = require('../modules/packages/stock/ticketStock.model');
const Offer = require('../modules/packages/offers/offer.model');
const Package = require('../modules/packages/models/package.model');
const HotelBooking = require('../modules/hotels/hotel.model');
const FlightBooking = require('../modules/flights/flight.model');
const PackageBooking = require('../modules/packages/models/packageBooking.model');
const Booking = require('../modules/bookings/booking.model');
const bookingService = require('../modules/bookings/booking.service');
const { sendOtpService, verifyOtpService } = require('../modules/auth/auth.service');

async function runVerification() {
  console.log('========================================================');
  console.log('   DEEP VERIFICATION SUITE: SYSTEM INTEGRATION TEST     ');
  console.log('========================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);
  console.log('✔ Connected to MongoDB Database\n');

  try {
    // -----------------------------------------------------------------
    // TEST 1: Phone Login with 9883250683 (Session Hydration & Dragon)
    // -----------------------------------------------------------------
    console.log('--- TEST 1: User Portal Phone Login with 9883250683 ---');
    const targetPhone = '9883250683';

    // 1a. Send OTP
    const otpRes = await sendOtpService(targetPhone);
    assert.strictEqual(otpRes.success, true, 'OTP dispatch should succeed');
    assert.ok(otpRes.otp, 'OTP code should be generated');
    console.log('  ✔ OTP successfully generated for phone:', targetPhone, '(Code: ' + otpRes.otp + ')');

    // 1b. Verify OTP and authenticate user
    const authRes = await verifyOtpService(targetPhone, otpRes.otp);
    assert.ok(authRes.accessToken, 'Access token should be issued');
    assert.ok(authRes.user, 'User object should be returned');
    assert.strictEqual(authRes.user.phone, targetPhone, 'User phone must match 9883250683');
    assert.strictEqual(authRes.user.firstName, 'Dragon', 'User firstName must be Dragon');
    console.log('  ✔ Session hydrated successfully:');
    console.log('    - User ID:', authRes.user.id);
    console.log('    - User Name:', authRes.user.firstName, authRes.user.lastName);
    console.log('    - Phone:', authRes.user.phone);
    console.log('    - Role:', authRes.user.role);
    console.log('    - AccessToken:', authRes.accessToken.slice(0, 25) + '...');

    // -----------------------------------------------------------------
    // TEST 2: Hotel -> Hotelier -> Room -> Offer -> Package "Makkha Ultra X"
    // -----------------------------------------------------------------
    console.log('\n--- TEST 2: Hotelier & "Makkha Ultra X" Package Integrity ---');

    // 2a. Verify Hotel
    const hotel = await Hotel.findOne({ name: 'Makkah Ultra Grand Palace' });
    assert.ok(hotel, 'Hotel "Makkah Ultra Grand Palace" must exist in DB');
    assert.strictEqual(hotel.isActive, true, 'Hotel must be active');
    assert.strictEqual(hotel.destination, 'Makkah', 'Hotel destination must be Makkah');
    console.log('  ✔ Hotel verified:', hotel.name, 'in', hotel.destination, '(ID: ' + hotel._id + ')');

    // 2b. Verify Hotelier User
    const hotelierUser = await User.findOne({ email: 'hotelier.makkah@maqamtravels.com' });
    assert.ok(hotelierUser, 'Hotelier user must exist');
    assert.strictEqual(hotelierUser.role, 'hotelier', 'User role must be "hotelier"');
    assert.strictEqual(hotelierUser.hotelId.toString(), hotel._id.toString(), 'Hotelier must be linked to hotel');
    console.log('  ✔ Hotelier role verified:', hotelierUser.email, 'Role:', hotelierUser.role, 'Linked Hotel ID:', hotelierUser.hotelId);

    // 2c. Verify Room Stock
    const roomStock = await HotelStock.findOne({ hotelId: hotel._id, reviewStatus: 'approved' });
    assert.ok(roomStock, 'Approved HotelStock must exist for hotel');
    assert.strictEqual(roomStock.reviewStatus, 'approved', 'Review status must be "approved"');
    assert.ok(roomStock.units.length > 0, 'Room stock must have units');
    console.log('  ✔ Room Stock verified:', roomStock.roomType, 'Available Units:', roomStock.units.length);

    // 2d. Verify Hotel Offer
    const hotelOffer = await Offer.findOne({ 'hotelRef.stock': roomStock._id });
    assert.ok(hotelOffer, 'Hotel Offer referencing room stock must exist');
    assert.strictEqual(hotelOffer.itemType, 'hotel', 'Offer itemType must be hotel');
    assert.strictEqual(hotelOffer.isActive, true, 'Hotel offer must be active');
    console.log('  ✔ Hotel Offer verified:', hotelOffer.title, 'Price:', hotelOffer.sellPrice);

    // 2e. Verify Package "Makkha Ultra X"
    const makkhaPackage = await Package.findOne({ title: 'Makkha Ultra X' }).populate('offerRefs.offer');
    assert.ok(makkhaPackage, 'Package "Makkha Ultra X" must exist in DB');
    assert.strictEqual(makkhaPackage.title, 'Makkha Ultra X', 'Package title must be exact: "Makkha Ultra X"');
    assert.strictEqual(makkhaPackage.isActive, true, 'Package must be active');
    assert.ok(makkhaPackage.offerRefs.length >= 2, 'Package must contain at least 2 components (Flight + Hotel)');

    const hasHotelComponent = makkhaPackage.offerRefs.some((ref) => ref.offer?.itemType === 'hotel');
    const hasFlightComponent = makkhaPackage.offerRefs.some((ref) => ref.offer?.itemType === 'flight');
    assert.ok(hasHotelComponent, 'Package must contain the hotel offer component');
    assert.ok(hasFlightComponent, 'Package must contain the flight offer component');
    console.log('  ✔ Package "Makkha Ultra X" verified:');
    console.log('    - Package ID:', makkhaPackage._id);
    console.log('    - Title:', makkhaPackage.title);
    console.log('    - Destination:', makkhaPackage.destination);
    console.log('    - Total Components:', makkhaPackage.offerRefs.length, '(Hotel:', hasHotelComponent, 'Flight:', hasFlightComponent + ')');
    console.log('    - Anchored Sell Price:', makkhaPackage.sellPrice);

    // -----------------------------------------------------------------
    // TEST 3: User Bookings View & Cancellation Option
    // -----------------------------------------------------------------
    console.log('\n--- TEST 3: User Bookings View & Cancellation Option ---');

    // 3a. Create a dedicated test booking for user Dragon
    const testHotelBooking = await HotelBooking.create({
      userId: authRes.user.id,
      hotelName: 'Makkah Ultra Grand Palace',
      destination: 'Makkah',
      searchId: 'search_verify_test_123',
      recheckId: 'recheck_verify_test_123',
      srdvHotelId: 'SRDV-MAK-999',
      hotelSnapshot: {
        name: 'Makkah Ultra Grand Palace',
        city: 'Makkah',
        address: 'Abraj Al Bait',
      },
      priceSnapshot: {
        totalPrice: 42500,
        currency: 'INR',
      },
      cancellationPolicySnapshot: {
        refundable: true,
        cancelPolicyText: 'Free cancellation up to 48 hours prior to check-in',
      },
      checkIn: new Date('2026-11-15'),
      checkOut: new Date('2026-11-20'),
      totalPrice: 42500,
      currency: 'INR',
      status: 'confirmed',
      bookingRefNo: 'TEST-MAK-9988',
      provider: 'srdv',
    });
    console.log('  ✔ Created test confirmed booking for Dragon:', testHotelBooking._id);

    // 3b. Fetch user bookings via aggregated service
    const userBookingsResult = await bookingService.getUserBookings(authRes.user.id, {
      status: 'all',
      page: 1,
      limit: 10,
    });
    assert.ok(userBookingsResult.bookings.length > 0, 'User bookings list must contain records');
    const retrieved = userBookingsResult.bookings.find((b) => b._id.toString() === testHotelBooking._id.toString());
    assert.ok(retrieved, 'Aggregated endpoint must return user Dragon\'s booking');
    assert.strictEqual(retrieved.status, 'confirmed', 'Booking status must be confirmed');
    assert.strictEqual(retrieved.canCancel, true, 'Booking canCancel flag must be true');
    console.log('  ✔ Retrieved aggregated bookings count for Dragon:', userBookingsResult.bookings.length);
    console.log('    - Matching booking title:', retrieved.title);
    console.log('    - Status:', retrieved.status);
    console.log('    - Can cancel:', retrieved.canCancel);

    // 3c. Test Cancellation Option
    console.log('  -> Executing cancellation for booking:', testHotelBooking._id);
    const cancelRes = await bookingService.cancelBooking(
      testHotelBooking._id,
      authRes.user.id,
      'User voluntarily cancelled via profile my bookings section'
    );
    assert.ok(cancelRes, 'Cancel response must exist');
    assert.strictEqual(cancelRes.status, 'cancelled', 'Status must transition to cancelled');

    const updatedBooking = await HotelBooking.findById(testHotelBooking._id);
    assert.strictEqual(updatedBooking.status, 'cancelled', 'DB document status must be cancelled');
    console.log('  ✔ Cancellation successful! Status is now:', updatedBooking.status, 'Reason:', updatedBooking.cancellationReason);

    // Clean up test booking
    await HotelBooking.findByIdAndDelete(testHotelBooking._id);
    console.log('  ✔ Test booking cleaned up cleanly.');

    console.log('\n========================================================');
    console.log('   ALL INTEGRATION & FUNCTIONAL VERIFICATIONS PASSED!  ');
    console.log('========================================================\n');
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runVerification().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
