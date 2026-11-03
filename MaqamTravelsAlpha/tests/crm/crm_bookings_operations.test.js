// tests/crm/crm_bookings_operations.test.js
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config();

const app = require('../../app');
const User = require('../../modules/auth/auth.model');
const Booking = require('../../modules/bookings/booking.model');
const PackageBooking = require('../../modules/packages/models/packageBooking.model');
const Package = require('../../modules/packages/models/package.model');
const FlightBooking = require('../../modules/flights/flight.model');

describe('CRM Master Bookings & Operations Desk Test Suite', () => {
  let server;
  let baseUrl;
  let adminToken;
  let adminUser;
  let customerUser;
  let testPackage;
  let testPackageBooking;
  let testMasterBookingPackage;
  let testFlightBooking;
  let testMasterBookingFlight;

  before(async () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, { family: 4, serverSelectionTimeoutMS: 10000 });
    }

    // 1. Create an admin user for testing
    adminUser = await User.create({
      firstName: 'BookingAdmin',
      lastName: 'Tester',
      email: `booking_admin_${Date.now()}@test.com`,
      phone: `99${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'Password123!',
      role: 'admin',
    });

    // 2. Create customer user
    customerUser = await User.create({
      firstName: 'Fatima',
      lastName: 'Zahra',
      email: `customer_${Date.now()}@test.com`,
      phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'Password123!',
      role: 'customer',
    });

    const { generateTokens } = require('../../middleware/auth');
    adminToken = generateTokens(adminUser._id.toString(), adminUser.role).accessToken;

    // 3. Create dummy package
    testPackage = await Package.create({
      title: '7D Umrah Delights',
      slug: `7d-umrah-${Date.now()}`,
      destination: 'Makkah',
      basePrice: 120000,
      sellPrice: 135000,
      isActive: true,
      isPublic: true,
      durationDays: 7,
      createdBy: adminUser._id,
      offerRefs: [
        { offer: new mongoose.Types.ObjectId(), unitsPerBooking: 1, isIncluded: true },
        { offer: new mongoose.Types.ObjectId(), unitsPerBooking: 1, isIncluded: true },
      ],
    });

    // 4. Create PackageBooking & MasterBooking
    testPackageBooking = await PackageBooking.create({
      userId: customerUser._id,
      packageId: testPackage._id,
      totalAmount: 135000,
      quantity: 1,
      status: 'pending',
      travelDates: {
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-11-08'),
      },
    });

    testMasterBookingPackage = await Booking.create({
      userId: customerUser._id,
      bookingType: 'package',
      itemId: testPackageBooking._id,
      details: {
        destination: 'Makkah',
        departureDate: new Date('2026-11-01'),
        returnDate: new Date('2026-11-08'),
        totalPrice: 135000,
        currency: 'INR',
        passengers: 2,
      },
      status: 'pending',
    });

    // 5. Create FlightBooking & MasterBooking
    testFlightBooking = await FlightBooking.create({
      user: customerUser._id,
      traceId: `TRACE-${Date.now()}`,
      isLCC: true,
      totalAmount: 45000,
      pnr: 'DELJED789',
      status: 'pending',
    });

    testMasterBookingFlight = await Booking.create({
      userId: customerUser._id,
      bookingType: 'flight',
      itemId: testFlightBooking._id,
      details: {
        destination: 'DEL-JED',
        departureDate: new Date('2026-12-01'),
        totalPrice: 45000,
        currency: 'INR',
        passengers: 1,
      },
      status: 'pending',
    });

    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    if (testMasterBookingPackage) await Booking.findByIdAndDelete(testMasterBookingPackage._id);
    if (testMasterBookingFlight) await Booking.findByIdAndDelete(testMasterBookingFlight._id);
    if (testPackageBooking) await PackageBooking.findByIdAndDelete(testPackageBooking._id);
    if (testFlightBooking) await FlightBooking.findByIdAndDelete(testFlightBooking._id);
    if (testPackage) await Package.findByIdAndDelete(testPackage._id);
    if (customerUser) await User.findByIdAndDelete(customerUser._id);
    if (adminUser) await User.findByIdAndDelete(adminUser._id);

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('1. GET /api/v1/crm/bookings - lists all bookings across types with pagination', async () => {
    const res = await fetch(`${baseUrl}/api/v1/crm/bookings?page=1&limit=10`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data), 'Expected json.data to be an array');
    assert.ok(json.meta, 'Expected json.meta pagination');
    assert.ok(json.data.length >= 2, 'Should return at least 2 test bookings');

    const first = json.data[0];
    assert.ok(first._id);
    assert.ok(first.bookingReference);
    assert.ok(first.bookingType);
    assert.ok(first.customer);
  });

  it('2. GET /api/v1/crm/bookings?bookingType=package - filters by booking type', async () => {
    const res = await fetch(`${baseUrl}/api/v1/crm/bookings?bookingType=package`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.length >= 1);
    for (const b of json.data) {
      assert.equal(b.bookingType, 'package');
      assert.equal(b.origin, 'in_house');
    }
  });

  it('3. GET /api/v1/crm/bookings/summary - returns queue counters and metrics', async () => {
    const res = await fetch(`${baseUrl}/api/v1/crm/bookings/summary`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.totalBookings >= 2);
    assert.ok(json.data.byType);
    assert.ok(json.data.byStatus);
  });

  it('4. GET /api/v1/crm/bookings/:bookingType/:id - returns 360 dossier of single booking', async () => {
    const res = await fetch(
      `${baseUrl}/api/v1/crm/bookings/package/${testPackageBooking._id}`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.bookingType, 'package');
    assert.equal(json.data.origin, 'in_house');
    assert.ok(json.data.customer);
    assert.equal(json.data.financials.totalAmount, 135000);
  });

  it('5. PATCH /api/v1/crm/bookings/:bookingType/:id/status - overrides status & logs remark', async () => {
    const payload = {
      status: 'confirmed',
      internalRemark: 'Customer payment verified via NEFT bank transfer',
    };

    const res = await fetch(
      `${baseUrl}/api/v1/crm/bookings/package/${testPackageBooking._id}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      }
    );

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.status, 'confirmed');

    // Verify remarks array includes the internal remark
    const remarkFound = json.data.remarks.some((r) =>
      r.text.includes('Customer payment verified via NEFT')
    );
    assert.ok(remarkFound, 'Should find newly added operational remark');
  });

  it('6. PATCH /api/v1/crm/bookings/:bookingType/:id/assign - assigns handling agent', async () => {
    const payload = {
      assignedTo: adminUser._id.toString(),
    };

    const res = await fetch(
      `${baseUrl}/api/v1/crm/bookings/package/${testPackageBooking._id}/assign`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      }
    );

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.assignedTo);
    assert.equal(json.data.assignedTo._id.toString(), adminUser._id.toString());
  });

  it('7. POST /api/v1/crm/bookings/:bookingType/:id/remarks - adds timeline operational remark', async () => {
    const payload = {
      remark: 'Followed up with customer regarding visa document upload',
    };

    const res = await fetch(
      `${baseUrl}/api/v1/crm/bookings/package/${testPackageBooking._id}/remarks`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      }
    );

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    const remarkFound = json.data.remarks.some((r) =>
      r.text.includes('Followed up with customer regarding visa document upload')
    );
    assert.ok(remarkFound, 'Should find the added remark in booking remarks');
  });
});
