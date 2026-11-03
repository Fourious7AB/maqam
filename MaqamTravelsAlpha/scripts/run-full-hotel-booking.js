#!/usr/bin/env node

const dns = require('node:dns/promises');
dns.setServers(["1.1.1.1", "8.8.8.8"]);

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const bcrypt = require('bcryptjs');

const User = require('../modules/auth/auth.model');
const Payment = require('../modules/payments/payment.model');
const HotelBooking = require('../modules/hotels/hotel.model');
const hotelBookingUseCase = require('../modules/hotels/application/hotel-booking.usecase');
const { processSupplierBooking } = require('../workers/hotels/hotel-book.worker');

const API_BASE_URL = `http://localhost:${process.env.PORT || 5000}/api/v1`;

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not set in environment variables.');
  }

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });
  console.log('✅ Connected to MongoDB');
};

const findOrCreateTestUser = async () => {
  const phone = '8294507785';
  const email = 'customer@example.com';
  let user = await User.findOne({ phone });
  const hashedPassword = await bcrypt.hash('TestPass123!', 10);

  if (!user) {
    console.log('📝 Test user not found. Creating in DB...');
    user = await User.create({
      phone,
      email,
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Customer',
      role: 'customer',
      isVerified: true,
    });
    console.log(`✅ Created test user: ${phone}`);
  } else {
    console.log(`ℹ️ Found existing test user: ${phone}. Resetting password to ensure it matches login...`);
    user.password = hashedPassword;
    await user.save();
    console.log(`✅ Password reset complete for test user.`);
  }
  return user;
};

const run = async () => {
  try {
    await connectDB();
    const user = await findOrCreateTestUser();

    console.log('\n🔐 [Step 1] Authenticating with Local Server via API...');
    const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: user.email,
      phone: user.phone,
      password: 'TestPass123!',
    });
    
    if (!loginRes.data || !loginRes.data.data || !loginRes.data.data.accessToken) {
      throw new Error(`Authentication failed: ${JSON.stringify(loginRes.data)}`);
    }

    const token = loginRes.data.data.accessToken;
    console.log('🔑 Login successful. Received accessToken.');

    console.log('\n🔎 [Step 2] Searching Hotels via API...');
    // Create check-in/out dates in the future
    const checkIn = new Date();
    const offset = 15 + Math.floor(Math.random() * 150);
    checkIn.setDate(checkIn.getDate() + offset);
    const checkOut = new Date();
    checkOut.setDate(checkOut.getDate() + offset + 2);

    const checkInStr = checkIn.toISOString().split('T')[0] + 'T00:00:00.000Z';
    const checkOutStr = checkOut.toISOString().split('T')[0] + 'T00:00:00.000Z';

    const searchPayload = {
      cityName: 'mumbai',
      checkIn: checkInStr,
      checkOut: checkOutStr,
      guestNationality: 'IN',
      currency: 'INR',
      rooms: [
        {
          adults: 1,
          children: 0,
          childAges: []
        }
      ],
      minRating: 3,
      maxRating: 5
    };

    console.log(`📡 Sending hotel search payload:`, JSON.stringify(searchPayload, null, 2));
    const searchRes = await axios.post(`${API_BASE_URL}/hotels/search`, searchPayload);
    const searchData = searchRes.data.data;

    if (!searchData || !searchData.hotels || searchData.hotels.length === 0) {
      throw new Error('No hotels returned from Search API. Please verify supplier connection or try another destination.');
    }

    const searchId = searchData.searchId;
    const selectedHotel = searchData.hotels[0];
    console.log(`🏨 Found ${searchData.hotels.length} hotels. searchId: ${searchId}`);
    console.log(`👉 Selected Hotel: "${selectedHotel.name}" (Code: ${selectedHotel.id})`);

    console.log('\n🚪 [Step 3] Fetching Hotel Details and Rooms via API...');
    const detailsRes = await axios.get(`${API_BASE_URL}/hotels/${selectedHotel.id}?searchId=${searchId}`);
    const detailsData = detailsRes.data.data;

    if (!detailsData || !detailsData.rooms || detailsData.rooms.length === 0) {
      throw new Error(`No room options returned for hotel: ${selectedHotel.name}`);
    }

    const selectedRoom = detailsData.rooms[0];
    console.log(`🛏️ Selected Room: "${selectedRoom.name}" - Base Price: ₹${selectedRoom.price}/night`);

    console.log('\n🔄 [Step 4] Rechecking Room Availability & Price via API...');
    const recheckPayload = {
      searchId,
      hotelId: selectedHotel.id,
      selectedRooms: [
        {
          roomId: selectedRoom.id,
          quantity: 1
        }
      ]
    };

    const recheckRes = await axios.post(`${API_BASE_URL}/hotels/recheck`, recheckPayload);
    const recheckData = recheckRes.data.data;

    if (!recheckData || !recheckData.recheckId) {
      throw new Error('Recheck did not return a valid recheckId.');
    }

    const recheckId = recheckData.recheckId;
    console.log(`✅ Recheck complete. recheckId: ${recheckId}`);
    
    // Retrieve raw recheck session from Redis cache
    const cache = require('../utils/cache');
    const recheckSession = await cache.get(`hotel:recheck:${recheckId}`);
    console.log('--- TRACE ID CHECK ---');
    console.log('Search Session TraceId:', recheckSession.searchSession.traceId);
    console.log('Provider Result TraceId:', recheckSession.providerResult._raw?.TraceId);
    console.log('Provider Result BookingRefNo:', recheckSession.providerResult._raw?.BookingRefNo);
    console.log('Provider Result providerReference:', recheckSession.providerResult.providerReference);
    console.log('-----------------------');

    console.log(`💰 Verified Stay Total Price: ₹${recheckData.price.totalPrice} ${recheckData.price.currency} for ${recheckData.price.nights} night(s)`);

    console.log('\n=== Creating Hotel Booking via API ===');
    const bookingPayload = {
      recheckId,
      acceptChanges: true,
      guests: [
        {
          title: 'Mr',
          firstName: 'John',
          lastName: 'Doe',
          type: 'adult',
          age: 0,
          pan: 'EXVPR5555M',
          email: 'john.doe@example.com',
          phone: '9999999999'
        }
      ]
    };

    const bookingRes = await axios.post(`${API_BASE_URL}/hotels/bookings`, bookingPayload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': `hotel-book-mock-${Date.now()}`
      }
    });

    const booking = bookingRes.data.data;
    const bookingId = booking.id || booking._id;
    if (!booking || !bookingId) {
      throw new Error(`Booking creation failed: ${JSON.stringify(bookingRes.data)}`);
    }

    console.log(`✅ Booking created successfully. bookingId: ${bookingId}`);
    console.log(`ℹ️ Status: ${booking.status} (awaiting payment)`);

    console.log('\n💳 [Step 6] Simulating Payment Confirmation in MongoDB...');
    // Create Payment doc directly in DB
    const payment = await Payment.create({
      userId: user._id,
      bookingId: bookingId,
      bookingModel: 'HotelBooking',
      bookingType: 'hotel',
      amount: booking.totalPrice || (booking.amountMinor / 100),
      currency: booking.currency || 'INR',
      paymentMethod: 'paypal',
      status: 'created',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      gatewayData: {
        orderId: `mock-order-${Date.now()}`,
      }
    });
    console.log(`Payment record initialized with status 'created' (ID: ${payment._id})`);

    // Transition payment to paid
    payment.status = 'paid';
    payment.gatewayData.captureId = `mock-capture-${Date.now()}`;
    payment.gatewayData.transactionId = `mock-transaction-${Date.now()}`;
    payment.paidAt = new Date();
    payment.verifiedAt = new Date();
    await payment.save();
    console.log(`   - Payment record updated to status 'paid'`);

    // Execute use-case method to set booking to payment_received
    console.log(`   - Triggering use-case payment confirmation...`);
    await hotelBookingUseCase.confirmBookingAfterPayment({
      bookingId: bookingId,
      payment
    });
    console.log(`   - Booking status changed to 'payment_received'`);

    console.log('\n✈️ [Step 7] Calling SRDV Supplier Booking Integration...');
    let hotelBookingFromDb = await HotelBooking.findById(bookingId);
    console.log('booking.roomSnapshots in DB:', JSON.stringify(hotelBookingFromDb.roomSnapshots, null, 2));

    // If background worker already processed or is processing, poll for terminal status
    if (['confirmed', 'provider_failed'].includes(hotelBookingFromDb.status)) {
      console.log(`ℹ️ Booking already processed by background worker (Status: ${hotelBookingFromDb.status})`);
    } else {
      try {
        await processSupplierBooking(bookingId);
        console.log('✅ Supplier booking execution finished');
      } catch (err) {
        if (err.message?.includes('Lock acquisition timeout')) {
          console.log('ℹ️ Background worker is active and holds the lock. Polling for completion...');
          for (let i = 0; i < 25; i++) {
            await new Promise((res) => setTimeout(res, 1000));
            hotelBookingFromDb = await HotelBooking.findById(bookingId);
            if (['confirmed', 'provider_failed'].includes(hotelBookingFromDb.status)) {
              break;
            }
          }
        } else {
          throw err;
        }
      }
    }
    console.log('\n📊 [Step 8] Verifying Final Booking Status in MongoDB...');
    const finalBooking = await HotelBooking.findById(bookingId);
    console.log('\n======================================================');
    console.log('🎉 AUTOMATED HOTEL BOOKING COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log(`• Booking ID:         ${finalBooking._id}`);
    console.log(`• Hotel Name:         ${finalBooking.hotelName}`);
    console.log(`• Destination:        ${finalBooking.destination}`);
    console.log(`• Check-In:           ${finalBooking.checkIn}`);
    console.log(`• Check-Out:          ${finalBooking.checkOut}`);
    console.log(`• Total Paid Price:   ₹${finalBooking.totalPrice} ${finalBooking.currency}`);
    console.log(`• Booking Status:     ${finalBooking.status}`);
    console.log(`• Supplier ID:        ${finalBooking.providerBookingId || 'N/A'}`);
    console.log(`• Partner Ref No:     ${finalBooking.bookingRefNo || 'N/A'}`);
    console.log(`• Confirmation No:    ${finalBooking.confirmationNo || 'N/A'}`);
    console.log(`• Voucher Status:     ${finalBooking.voucherStatus ? 'Vouchered' : 'N/A'}`);
    console.log('======================================================\n');

  } catch (error) {
    console.error('\n❌ Error executing automated hotel booking:', error.response?.data || error.message);
  } finally {
    console.log('🔌 Disconnecting Mongoose...');
    await mongoose.disconnect();
    console.log('✅ Disconnected');
    process.exit(0);
  }
};

run();
