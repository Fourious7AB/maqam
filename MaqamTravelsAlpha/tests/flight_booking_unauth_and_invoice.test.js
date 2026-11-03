require('dotenv').config();
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../modules/auth/auth.model');
const FlightBooking = require('../modules/flights/flight.model');
const Traveller = require('../modules/account/traveller.model');
const { generateTokens } = require('../middleware/auth');

async function runFlightBookingAuthAndInvoiceTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING FLIGHT BOOKING UNAUTH & INVOICE DOWNLOAD VERIFICATION');
  console.log('================================================================\n');

  if (mongoose.connection.readyState === 0 && process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI, { family: 4 });
  }

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  let passed = 0;
  const testBookingId = new mongoose.Types.ObjectId('6ae8c48a1c8345a0089a5fe8');
  let createdUser = null;
  let createdTraveller = null;
  let createdBooking = null;

  try {
    // 1. Create test user and traveller
    createdUser = await User.create({
      phone: `99${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: '$2a$10$abcdefghijklmnopqrstuu',
      firstName: 'Rahul',
      lastName: 'Sharma',
      role: 'customer',
      isActive: true,
    });

    createdTraveller = await Traveller.create({
      userId: createdUser._id,
      firstName: 'Rahul',
      lastName: 'Sharma',
      title: 'Mr',
      passengerType: 'Adult',
      gender: 'Male',
      dateOfBirth: new Date('1990-01-01'),
      nationality: 'Indian',
      countryName: 'India',
      countryCode: 'IN',
      addressLine1: 'Delhi',
      city: 'Delhi',
    });

    // 2. Create test flight booking with the exact ID from user prompt
    // Clean up any existing booking with this ID first
    await FlightBooking.deleteOne({ _id: testBookingId });

    createdBooking = await FlightBooking.create({
      _id: testBookingId,
      user: createdUser._id,
      traceId: 'test-trace-123',
      isLCC: true,
      totalAmount: 5406,
      pnr: '6E9XYZ',
      status: 'confirmed',
      passengers: [
        {
          travellerId: createdTraveller._id,
          isLeadPax: true,
          ticketNumber: '6E9XYZ-1',
          ticketStatus: 'OK',
        },
      ],
      eTicketData: {
        PNR: '6E9XYZ',
        AirlineName: 'IndiGo',
        Segments: [
          {
            Airline: { AirlineCode: '6E', FlightNumber: '2501', AirlineName: 'IndiGo' },
            Origin: { AirportCode: 'DEL', AirportName: 'Delhi' },
            Destination: { AirportCode: 'BOM', AirportName: 'Mumbai' },
            DepTime: '2026-11-15T08:00:00',
            ArrTime: '2026-11-15T10:15:00',
            Duration: '135',
            CabinClass: 'Economy',
          },
        ],
      },
    });

    // Generate expired token
    const expiredToken = jwt.sign(
      { id: createdUser._id.toString(), role: 'customer' },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '-10s' }
    );

    // Generate valid token
    const { accessToken: validToken } = generateTokens(createdUser._id, 'customer');

    // TEST 1: Unauthenticated fetch to GET /api/v1/flights/bookings/:bookingId
    console.log('📌 [Test 1] GET /api/v1/flights/bookings/:bookingId without auth header...');
    const resUnauth = await fetch(`${baseUrl}/api/v1/flights/bookings/${testBookingId}`);
    assert.equal(resUnauth.status, 200, 'Unauthenticated request must succeed with 200 OK');
    const jsonUnauth = await resUnauth.json();
    assert.equal(jsonUnauth.success, true, 'Response envelope must indicate success');
    assert.equal(jsonUnauth.data._id, testBookingId.toString(), 'Response must return the booking');
    passed += 3;
    console.log('  ✔ Passed: 200 OK returned without auth.\n');

    // TEST 2: Fetch with EXPIRED token (the exact bug reported by user)
    console.log('📌 [Test 2] GET /api/v1/flights/bookings/:bookingId with EXPIRED access token...');
    const resExpired = await fetch(`${baseUrl}/api/v1/flights/bookings/${testBookingId}`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert.equal(resExpired.status, 200, 'Request with expired token must NOT return 401, but 200 OK');
    const jsonExpired = await resExpired.json();
    assert.equal(jsonExpired.success, true, 'Response must succeed');
    assert.equal(jsonExpired.data._id, testBookingId.toString(), 'Response must return the booking');
    passed += 3;
    console.log('  ✔ Passed: 200 OK returned with expired token (no 401!).\n');

    // TEST 3: Fetch with INVALID/GARBAGE token
    console.log('📌 [Test 3] GET /api/v1/flights/bookings/:bookingId with INVALID garbage token...');
    const resInvalid = await fetch(`${baseUrl}/api/v1/flights/bookings/${testBookingId}`, {
      headers: { Authorization: 'Bearer this.is.invalid.token' },
    });
    assert.equal(resInvalid.status, 200, 'Request with invalid token must return 200 OK');
    const jsonInvalid = await resInvalid.json();
    assert.equal(jsonInvalid.success, true, 'Response must succeed');
    passed += 2;
    console.log('  ✔ Passed: 200 OK returned with invalid token.\n');

    // TEST 4: Fetch with VALID token
    console.log('📌 [Test 4] GET /api/v1/flights/bookings/:bookingId with VALID token...');
    const resValid = await fetch(`${baseUrl}/api/v1/flights/bookings/${testBookingId}`, {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    assert.equal(resValid.status, 200, 'Request with valid token must return 200 OK');
    const jsonValid = await resValid.json();
    assert.equal(jsonValid.success, true, 'Response must succeed');
    passed += 2;
    console.log('  ✔ Passed: 200 OK returned with valid token.\n');

    // TEST 5: Convenience invoice download on /api/v1/flights/bookings/:bookingId/invoice/download
    console.log('📌 [Test 5] GET /api/v1/flights/bookings/:bookingId/invoice/download with expired token...');
    const resConvDl = await fetch(`${baseUrl}/api/v1/flights/bookings/${testBookingId}/invoice/download`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert.equal(resConvDl.status, 200, 'Invoice download via flight router must return 200 OK');
    const convDlDispo = resConvDl.headers.get('content-disposition');
    assert.ok(convDlDispo && convDlDispo.includes('attachment; filename='), 'Content-Disposition must be attachment');
    const convDlHtml = await resConvDl.text();
    assert.ok(convDlHtml.includes('MT-INV-LCC-'), 'Downloaded file must contain invoice number');
    assert.ok(convDlHtml.includes('IndiGo'), 'Downloaded file must contain airline name');
    passed += 4;
    console.log('  ✔ Passed: Flight convenience invoice download stream verified.\n');

    // TEST 6: Canonical invoice download on /api/v1/invoices/flight/:bookingId/download without auth
    console.log('📌 [Test 6] GET /api/v1/invoices/flight/:bookingId/download without auth header...');
    const resCanonDlUnauth = await fetch(`${baseUrl}/api/v1/invoices/flight/${testBookingId}/download`);
    assert.equal(resCanonDlUnauth.status, 200, 'Canonical invoice download without auth must return 200 OK');
    const canonDispo = resCanonDlUnauth.headers.get('content-disposition');
    assert.ok(canonDispo && canonDispo.includes('attachment; filename='), 'Must have attachment disposition');
    const canonHtml = await resCanonDlUnauth.text();
    assert.ok(canonHtml.includes('MT-INV-LCC-'), 'Must contain invoice number');
    passed += 3;
    console.log('  ✔ Passed: Canonical invoice download succeeded without auth.\n');

    // TEST 7: Canonical invoice download on /api/v1/invoices/flight/:bookingId/download with expired token
    console.log('📌 [Test 7] GET /api/v1/invoices/flight/:bookingId/download with EXPIRED token...');
    const resCanonDlExpired = await fetch(`${baseUrl}/api/v1/invoices/flight/${testBookingId}/download`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert.equal(resCanonDlExpired.status, 200, 'Canonical invoice download with expired token must return 200 OK');
    const canonExpHtml = await resCanonDlExpired.text();
    assert.ok(canonExpHtml.includes('6E9XYZ'), 'Must contain PNR');
    passed += 2;
    console.log('  ✔ Passed: Canonical invoice download succeeded with expired token.\n');

    // TEST 8: Non-existent booking returns 404 (not 401 or 500)
    console.log('📌 [Test 8] GET /api/v1/flights/bookings/:nonExistentId...');
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res404 = await fetch(`${baseUrl}/api/v1/flights/bookings/${nonExistentId}`);
    assert.equal(res404.status, 404, 'Non-existent booking must return 404');
    passed += 1;
    console.log('  ✔ Passed: 404 cleanly returned for non-existent booking.\n');

    // TEST 9: HTML invoice rendering on /api/v1/flights/bookings/:bookingId/invoice/html with expired token
    console.log('📌 [Test 9] GET /api/v1/flights/bookings/:bookingId/invoice/html with expired token...');
    const resHtmlExpired = await fetch(`${baseUrl}/api/v1/flights/bookings/${testBookingId}/invoice/html`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert.equal(resHtmlExpired.status, 200, 'HTML invoice endpoint must return 200 OK');
    const htmlExpText = await resHtmlExpired.text();
    assert.ok(htmlExpText.includes('MT-INV-LCC-'), 'HTML invoice must contain invoice number');
    passed += 2;
    console.log('  ✔ Passed: HTML invoice rendered successfully with expired token.\n');

    // TEST 10: Canonical HTML invoice rendering on /api/v1/invoices/flight/:bookingId/html without auth
    console.log('📌 [Test 10] GET /api/v1/invoices/flight/:bookingId/html without auth...');
    const resCanonHtml = await fetch(`${baseUrl}/api/v1/invoices/flight/${testBookingId}/html`);
    assert.equal(resCanonHtml.status, 200, 'Canonical HTML invoice must return 200 OK');
    const canonHtmlText = await resCanonHtml.text();
    assert.ok(canonHtmlText.includes('6E9XYZ'), 'HTML must contain PNR');
    passed += 2;
    console.log('  ✔ Passed: Canonical HTML invoice rendered successfully without auth.\n');

    // TEST 11: Flight booking lookup by PNR without auth
    console.log('📌 [Test 11] GET /api/v1/flights/bookings/6E9XYZ without auth (PNR lookup)...');
    const resPnr = await fetch(`${baseUrl}/api/v1/flights/bookings/6E9XYZ`);
    assert.equal(resPnr.status, 200, 'PNR lookup must return 200 OK');
    const jsonPnr = await resPnr.json();
    assert.equal(jsonPnr.data.pnr, '6E9XYZ', 'PNR must match');
    passed += 2;
    console.log('  ✔ Passed: Booking lookup by PNR succeeded without auth.\n');

    // TEST 12: Empty flight booking reference throws 400
    console.log('📌 [Test 12] getFlightBookingByIdService with empty reference...');
    const { getFlightBookingByIdService } = require('../modules/flights/flight.service');
    await assert.rejects(
      async () => {
        await getFlightBookingByIdService('');
      },
      { statusCode: 400 },
      'Empty reference must reject with 400'
    );
    passed += 1;
    console.log('  ✔ Passed: Empty booking reference rejected with 400.\n');

    console.log('================================================================');
    console.log(`🎉 ALL ${passed} VERIFICATION ASSERTIONS PASSED!`);
    console.log('================================================================');
  } finally {
    // Cleanup
    if (createdBooking) {
      await FlightBooking.deleteOne({ _id: testBookingId });
    }
    if (createdTraveller) {
      await Traveller.deleteOne({ _id: createdTraveller._id });
    }
    if (createdUser) {
      await User.deleteOne({ _id: createdUser._id });
    }
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

runFlightBookingAuthAndInvoiceTests().catch((err) => {
  console.error('\n❌ TEST RUNNER FAILED WITH ERROR:');
  console.error(err);
  process.exit(1);
});
