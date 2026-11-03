// scratch/test-bookings-health.js
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config();

const app = require('../app');
const User = require('../modules/auth/auth.model');
const Booking = require('../modules/bookings/booking.model');
const { generateTokens } = require('../middleware/auth');

describe('Health & Functionality Verification of /api/v1/bookings', () => {
  let server;
  let baseUrl;
  let testUser;
  let testToken;
  let testBooking;

  before(async () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, { family: 4, serverSelectionTimeoutMS: 10000 });
    }

    testUser = await User.create({
      firstName: 'BookingHealth',
      lastName: 'Tester',
      email: `booking_health_${Date.now()}@test.com`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'Password123!',
      role: 'customer',
    });

    testToken = generateTokens(testUser._id.toString(), testUser.role).accessToken;

    testBooking = await Booking.create({
      userId: testUser._id,
      bookingType: 'hotel',
      itemId: new mongoose.Types.ObjectId().toString(),
      status: 'pending',
      totalAmount: 15000,
      currency: 'INR',
      bookingDetails: { hotelName: 'Grand Test Hotel', roomType: 'Deluxe Suite' },
    });

    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    if (testBooking) await Booking.findByIdAndDelete(testBooking._id);
    if (testUser) await User.findByIdAndDelete(testUser._id);
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  it('1. GET /api/v1/bookings without Auth Token -> 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/v1/bookings`);
    assert.equal(res.status, 401);
  });

  it('2. GET /api/v1/bookings with Auth Token -> 200 OK (List user bookings)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/bookings`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.equal(json.data.length, 1);
    assert.ok(json.meta);
  });

  it('3. GET /api/v1/bookings/:bookingId with invalid Mongo ID -> 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/v1/bookings/invalid-id-123`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });
    assert.equal(res.status, 400);
  });

  it('4. GET /api/v1/bookings/:bookingId with valid ID -> 200 OK', async () => {
    const res = await fetch(`${baseUrl}/api/v1/bookings/${testBooking._id}`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data._id.toString(), testBooking._id.toString());
  });

  it('5. POST /api/v1/bookings with invalid body payload -> 400 Validation Error', async () => {
    const res = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({ bookingType: 'invalid_type' }),
    });
    assert.equal(res.status, 400);
  });

  it('6. POST /api/v1/bookings with valid payload -> 201 Created', async () => {
    const res = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        bookingType: 'flight',
        itemId: new mongoose.Types.ObjectId().toString(),
        details: { origin: 'DEL', destination: 'JED', amount: 35000 },
      }),
    });
    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data._id);

    // cleanup created booking
    await Booking.findByIdAndDelete(json.data._id);
  });

  it('7. PUT /api/v1/bookings/:bookingId with valid updates -> 200 OK', async () => {
    const res = await fetch(`${baseUrl}/api/v1/bookings/${testBooking._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        status: 'confirmed',
      }),
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.status, 'confirmed');
  });

  it('8. POST /api/v1/bookings/:bookingId/cancel -> 200 OK (Booking Cancelled)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/bookings/${testBooking._id}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${testToken}`,
      },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.status, 'cancelled');
  });
});
