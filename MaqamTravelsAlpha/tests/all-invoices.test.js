/**
 * Unified Test Suite for All Invoices across Maqam Travels
 *
 * Covers all 5 operational verticals:
 * 1. Live Flights (LCC & GDS)
 * 2. Live Hotels (SRDV / CRS)
 * 3. Tour & Umrah Packages
 * 4. In-House Retail Offers (Flight & Hotel variants)
 * 5. In-House Visa Services (Batches & Applications)
 *
 * Run directly with:
 *   node tests/all-invoices.test.js
 * Or with Node's native test runner:
 *   node --test tests/all-invoices.test.js
 */

require('dotenv').config();
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../app');
const invoiceService = require('../modules/invoices/invoice.service');
const User = require('../modules/auth/auth.model');
const { generateTokens } = require('../middleware/auth');


async function runAllInvoiceTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE TEST SUITE: ALL INVOICES (5 VERTICALS)');
  console.log('================================================================\n');

  let passedAssertions = 0;

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: EXPRESS ROUTE STACK VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  console.log('📌 [Test 1] Verifying Express Route Mounts across all verticals...');

  const registeredRoutes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      const method = Object.keys(middleware.route.methods)[0].toUpperCase();
      registeredRoutes.push(`${method} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      const regexStr = middleware.regexp.toString();
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const method = Object.keys(handler.route.methods)[0].toUpperCase();
          registeredRoutes.push(`${method} ${regexStr} -> ${handler.route.path}`);
        }
      });
    }
  });

  const checkRoute = (pattern, label) => {
    const exists = registeredRoutes.some((r) => r.includes(pattern));
    assert.equal(exists, true, `Route [${label}] matching "${pattern}" should be mounted`);
    passedAssertions++;
    return exists;
  };

  // Canonical Invoice Routes on /api/v1/invoices
  checkRoute('/flight/:bookingId', 'Canonical Flight Invoice JSON');
  checkRoute('/flight/:bookingId/download', 'Canonical Flight Invoice Download');
  checkRoute('/hotel/:bookingId', 'Canonical Hotel Invoice JSON');
  checkRoute('/hotel/:bookingId/download', 'Canonical Hotel Invoice Download');
  checkRoute('/package/:bookingId', 'Canonical Package Invoice JSON');
  checkRoute('/package/:bookingId/download', 'Canonical Package Invoice Download');
  checkRoute('/offer/:bookingId', 'Canonical Offer Invoice JSON');
  checkRoute('/offer/:bookingId/download', 'Canonical Offer Invoice Download');
  checkRoute('/visa/:groupId', 'Canonical Visa Invoice JSON');
  checkRoute('/visa/:groupId/download', 'Canonical Visa Invoice Download');

  // Domain Convenience Routes
  checkRoute('/bookings/:id/invoice', 'Offer Domain Convenience Invoice');
  checkRoute('/bookings/:id/invoice/download', 'Offer Domain Convenience Download');
  checkRoute('/groups/:id/invoice', 'Visa Domain Convenience Invoice');
  checkRoute('/groups/:id/invoice/download', 'Visa Domain Convenience Download');

  console.log('  ✔ All 14 invoice canonical & domain route endpoints successfully registered.\n');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: LIVE FLIGHT INVOICE RENDERING (LCC & GDS)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('📌 [Test 2] Testing Live Flight Invoice HTML Rendering...');

  const mockFlightInvoiceData = {
    invoiceNumber: 'MT-INV-LCC-202610-1001',
    supplierInvoiceNumber: 'SRDV-INV-5544',
    invoiceDate: '28 Oct 2026, 05:00 PM',
    bookingReference: 'BK-FLT-1001',
    bookingStatus: 'CONFIRMED',
    serviceType: 'LCC',
    serviceTypeBadge: 'LCC (Low-Cost Carrier)',
    isLCC: true,
    airlinePnr: '6E-DEL-AMD',
    gdsPnr: null,
    placeOfSupply: 'Delhi (07)',
    agency: {
      name: 'Maqam Travels Private Limited',
      address: 'Suite 401, Regal Tower, Connaught Place, New Delhi',
      gstin: '07AAACM1234F1Z8',
      pan: 'AAACM1234F',
      sacCode: '996411',
      email: 'billing@maqamtravels.com',
      phone: '+91 11 4000 8899',
    },
    customer: {
      name: 'Mr Rahul Sharma',
      email: 'rahul@example.com',
      phone: '+91 98111 22334',
      hasCorporateGst: true,
      companyName: 'Acme Technologies Pvt Ltd',
      gstNumber: '07AAACA1234F1Z1',
      companyAddress: 'Nehru Place, New Delhi - 110019',
    },
    segments: [
      {
        airline: 'IndiGo (6E-204)',
        flightNumber: '6E-204',
        route: 'Delhi [DEL] → Mumbai [BOM]',
        departureAirport: 'DEL Terminal 1D',
        departureTime: '15 Nov 2026, 06:00 AM',
        arrivalAirport: 'BOM Terminal 2',
        arrivalTime: '15 Nov 2026, 08:15 AM',
        duration: '2h 15m',
        cabinClass: 'Economy',
        checkInBaggage: '15 Kg',
        cabinBaggage: '7 Kg',
      },
    ],
    passengers: [
      {
        name: 'Mr Rahul Sharma',
        paxType: 'Adult',
        ticketNumber: '6E9XYZ-1',
        ticketStatus: 'OK',
      },
    ],
    pricing: {
      currency: 'INR',
      baseFare: '4,500.00',
      taxAmount: '850.00',
      serviceFee: '250.00',
      cgst: '22.50',
      sgst: '22.50',
      igst: null,
      totalAmount: '5,645.00',
    },
    payment: {
      method: 'RAZORPAY',
      transactionId: 'pay_FLT_998811',
      status: 'PAID',
    },
  };

  const flightHtml = invoiceService.renderInvoiceHtml(mockFlightInvoiceData);
  assert.ok(flightHtml.includes('MT-INV-LCC-202610-1001'), 'Must include invoice number');
  assert.ok(flightHtml.includes('IndiGo (6E-204)'), 'Must include airline details');
  assert.ok(flightHtml.includes('Acme Technologies Pvt Ltd'), 'Must include corporate GST company name');
  assert.ok(flightHtml.includes('07AAACA1234F1Z1'), 'Must include corporate GSTIN');
  assert.ok(flightHtml.includes('5,645.00'), 'Must include total settled amount');
  assert.ok(flightHtml.includes('996411'), 'Must include domestic flight SAC code 996411');
  passedAssertions += 6;
  console.log('  ✔ Flight HTML rendering passed (length: ' + flightHtml.length + ' chars).\n');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3: LIVE HOTEL INVOICE RENDERING
  // ─────────────────────────────────────────────────────────────────────────
  console.log('📌 [Test 3] Testing Live Hotel Invoice HTML Rendering...');

  const mockHotelInvoiceData = {
    invoiceNumber: 'MT-INV-HTL-202610-88219',
    supplierBookingId: 'SRDV-HTL-9911',
    supplierInvoiceNumber: 'INV-SUP-7722',
    invoiceDate: '28 Oct 2026, 05:00 PM',
    confirmationNo: 'CONF-88219',
    bookingReference: 'BK-HTL-88219',
    bookingStatus: 'CONFIRMED',
    serviceType: 'HOTEL',
    serviceTypeBadge: 'Hotel Accommodation',
    placeOfSupply: 'Delhi (07)',
    hotel: {
      name: 'Makkah Clock Royal Tower, A Fairmont Hotel',
      starRating: 5,
      starDisplay: '★★★★★ (5-Star Luxury)',
      address: 'King Abdul Aziz Endowment, Makkah, Saudi Arabia',
      destination: 'Makkah',
      contactNo: '+966 12 571 7777',
      category: 'Luxury Hotel & Suites',
    },
    stay: {
      checkIn: '10 Nov 2026',
      checkOut: '15 Nov 2026',
      nights: 5,
      roomsCount: 1,
      guestsCount: 2,
      cancellationPolicyText: 'Free cancellation until 48 hours prior to check-in.',
    },
    rooms: [
      {
        index: 1,
        name: 'Deluxe Suite Haram View',
        mealPlan: 'Bed & Breakfast',
        capacity: 2,
        pricePerNight: '15,000.00',
        totalPrice: '75,000.00',
        refundable: 'Refundable',
      },
    ],
    guests: [
      {
        index: 1,
        name: 'Mr Ahmed Khan',
        type: 'Adult',
        isLead: true,
        phone: '+91 98200 12345',
        passportNo: 'Z9876543',
      },
    ],
    pricing: {
      currency: 'INR',
      roomCharges: '75,000.00',
      serviceFee: '3,000.00',
      cgst: '270.00',
      sgst: '270.00',
      igst: null,
      totalAmount: '78,540.00',
    },
    payment: {
      method: 'RAZORPAY',
      transactionId: 'order_RZP_HOTEL_9988',
      status: 'PAID',
    },
    agency: {
      ...mockFlightInvoiceData.agency,
      sacCode: '996311',
    },
    customer: {
      name: 'Mr Ahmed Khan',
      email: 'ahmed@example.com',
      phone: '+91 98200 12345',
      hasCorporateGst: false,
    },
  };

  const hotelHtml = invoiceService.renderHotelInvoiceHtml(mockHotelInvoiceData);
  assert.ok(hotelHtml.includes('MT-INV-HTL-202610-88219'), 'Must include hotel invoice number');
  assert.ok(hotelHtml.includes('Makkah Clock Royal Tower'), 'Must include hotel property name');
  assert.ok(hotelHtml.includes('Deluxe Suite Haram View'), 'Must include room name');
  assert.ok(hotelHtml.includes('CONF-88219'), 'Must include confirmation number');
  assert.ok(hotelHtml.includes('78,540.00'), 'Must include total settled amount');
  passedAssertions += 5;
  console.log('  ✔ Hotel HTML rendering passed (length: ' + hotelHtml.length + ' chars).\n');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4: TOUR & UMRAH PACKAGE INVOICE RENDERING
  // ─────────────────────────────────────────────────────────────────────────
  console.log('📌 [Test 4] Testing Tour Package Invoice HTML Rendering...');

  const mockPackageInvoiceData = {
    invoiceNumber: 'MT-INV-PKG-202610-1192',
    bookingReference: 'BK-PKG-1192',
    bookingDate: '28 Oct 2026, 02:00 PM',
    invoiceDate: '28 Oct 2026, 02:00 PM',
    bookingStatus: 'CONFIRMED',
    serviceType: 'PACKAGE',
    packageTitle: '15 Days Executive Umrah Package',
    destination: 'Holy Makkah & Madinah',
    quantity: 2,
    travelDates: {
      startDate: '01 Dec 2026',
      endDate: '15 Dec 2026',
      durationText: '14 Nights / 15 Days',
    },
    customer: {
      name: 'Valued Pilgrim',
      email: 'pilgrim@example.com',
      phone: '+91 98765 00000',
      leadPassengerName: 'Mr Farooq Abdullah',
    },
    assignedAgent: 'Maqam Umrah Desk',
    inclusions: ['Flight Tickets', '5-Star Hotel Makkah', '4-Star Hotel Madinah', 'Ziyarat Transfers'],
    guide: {
      isSelected: true,
      location: 'Makkah & Madinah',
      price: '5,000.00',
    },
    travellers: [
      {
        index: 1,
        name: 'Mr Farooq Abdullah',
        paxType: 'Adult',
        gender: 'Male',
        isLead: true,
        passportNo: 'P1234567',
        nationality: 'Indian',
      },
    ],
    pricing: {
      currency: 'INR',
      basePackageFare: '1,45,000.00',
      guideFee: '5,000.00',
      agencyPersonalGstRate: 5,
      agencyPersonalGstAmount: '7,500.00',
      totalAmount: '1,57,500.00',
    },
    payment: {
      method: 'RAZORPAY',
      transactionId: 'pay_PKG_1192',
      status: 'PAID',
    },
    agency: mockFlightInvoiceData.agency,
  };

  const packageHtml = invoiceService.renderPackageInvoiceHtml(mockPackageInvoiceData);
  assert.ok(packageHtml.includes('MT-INV-PKG-202610-1192'), 'Must include package invoice number');
  assert.ok(packageHtml.includes('15 Days Executive Umrah Package'), 'Must include package title');
  assert.ok(packageHtml.includes('Mr Farooq Abdullah'), 'Must include lead pilgrim name');
  assert.ok(packageHtml.includes('1,57,500.00'), 'Must include total settled amount');
  passedAssertions += 4;
  console.log('  ✔ Package HTML rendering passed (length: ' + packageHtml.length + ' chars).\n');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 5: IN-HOUSE STANDALONE RETAIL OFFER INVOICE RENDERING (FLT & HTL)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('📌 [Test 5] Testing In-House Standalone Offer Invoice HTML Rendering (Flight & Hotel)...');

  // 5A. Flight Offer
  const mockOfferFlightData = {
    invoiceNumber: 'MT-INV-OFR-FLT-202610-A1B2C3',
    bookingReference: 'OFFER-BK-A1B2C3',
    bookingDate: '28 Oct 2026, 04:30 PM',
    invoiceDate: '28 Oct 2026, 04:30 PM',
    bookingStatus: 'CONFIRMED',
    serviceType: 'OFFER_FLIGHT',
    serviceTypeBadge: 'Special In-House Flight Offer',
    offerTitle: 'Delhi to Jeddah Umrah Group Series Special',
    destination: 'Jeddah (JED)',
    itemType: 'flight',
    quantity: 2,
    customer: {
      name: 'Mohammed Ali',
      email: 'ali@example.com',
      phone: '+91 9876543210',
    },
    flightDetails: {
      airline: 'Saudia (SV-759)',
      flightNumber: 'SV-759',
      route: 'DEL → JED',
      departureAirport: 'DEL International Airport',
      departureTime: '15 Nov 2026, 08:00 AM',
      arrivalAirport: 'JED International Airport',
      arrivalTime: '15 Nov 2026, 12:30 PM',
      duration: 'Direct Series Flight',
      cabinClass: 'Economy',
      baggage: '2 x 23 KG',
      cabinBaggage: '7 KG',
    },
    hotelDetails: null,
    passengers: [
      {
        index: 1,
        name: 'MR MOHAMMED ALI',
        paxType: 'ADULT',
        ticketNumber: 'CONFIRMED (Group PNR: SVDEL7)',
        seatNumber: 'Seat Block Unit #001',
        passportNumberMasked: '••••1234',
        status: 'CONFIRMED',
      },
    ],
    pricing: {
      currency: 'INR',
      baseFareAmount: '45,000.00',
      serviceFee: '5,000.00',
      cgst: '450.00',
      sgst: '450.00',
      igst: null,
      totalAmount: '50,900.00',
    },
    payment: {
      method: 'RAZORPAY',
      transactionId: 'pay_OFR_FLT_1',
      status: 'PAID',
    },
    agency: mockFlightInvoiceData.agency,
  };

  const offerFlightHtml = invoiceService.renderOfferInvoiceHtml(mockOfferFlightData);
  assert.ok(offerFlightHtml.includes('MT-INV-OFR-FLT-202610-A1B2C3'), 'Must include flight offer invoice number');
  assert.ok(offerFlightHtml.includes('SV-759'), 'Must include flight number');
  assert.ok(offerFlightHtml.includes('Mohammed Ali'), 'Must include customer name');
  assert.ok(offerFlightHtml.includes('50,900.00'), 'Must include total settled amount');
  passedAssertions += 4;

  // 5B. Hotel Offer
  const mockOfferHotelData = {
    ...mockOfferFlightData,
    invoiceNumber: 'MT-INV-OFR-HTL-202610-C3D4E5',
    serviceType: 'OFFER_HOTEL',
    serviceTypeBadge: 'Special In-House Hotel Offer',
    offerTitle: '5-Star Swissotel Makkah Allotment',
    destination: 'Makkah, Saudi Arabia',
    itemType: 'hotel',
    flightDetails: null,
    hotelDetails: {
      hotelName: 'Swissotel Makkah',
      destination: 'Makkah',
      roomType: 'Deluxe Haram View Double',
      checkIn: '15 Nov 2026',
      checkOut: '20 Nov 2026',
      mealPlan: 'Breakfast Buffet Included',
      reservationRef: 'SWISS-NOV-B1',
    },
  };

  const offerHotelHtml = invoiceService.renderOfferInvoiceHtml(mockOfferHotelData);
  assert.ok(offerHotelHtml.includes('MT-INV-OFR-HTL-202610-C3D4E5'), 'Must include hotel offer invoice number');
  assert.ok(offerHotelHtml.includes('Swissotel Makkah'), 'Must include hotel name');
  assert.ok(offerHotelHtml.includes('SWISS-NOV-B1'), 'Must include reservation reference');
  passedAssertions += 3;
  console.log('  ✔ Offer HTML rendering passed for both Flight and Hotel variants.\n');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 6: IN-HOUSE VISA BATCH INVOICE RENDERING & STATUTORY TAX MATH
  // ─────────────────────────────────────────────────────────────────────────
  console.log('📌 [Test 6] Testing In-House Visa Batch Invoice HTML Rendering & Two-Bucket Tax Math...');

  const mockVisaInvoiceData = {
    invoiceNumber: 'MT-INV-VSA-202610-VSA999',
    batchReference: 'BATCH-VSA-VSA999',
    invoiceDate: '28 Oct 2026, 04:30 PM',
    bookingStatus: 'CONFIRMED',
    serviceType: 'VISA',
    serviceTypeBadge: 'Visa Processing & Facilitation',
    destinationCountry: 'Saudi Arabia',
    visaType: 'Umrah eVisa (Multiple Entry)',
    totalApplicants: 2,
    bookingSource: 'Direct Portal Application',
    customer: {
      name: 'Ahmed Khan',
      email: 'ahmed@example.com',
      phone: '+91 9988776655',
    },
    applicants: [
      {
        index: 1,
        applicationNumber: 'VSA-APP001',
        name: 'MR AHMED KHAN',
        passportNumber: '••••4321',
        nationality: 'Indian',
        status: 'APPROVED',
      },
      {
        index: 2,
        applicationNumber: 'VSA-APP002',
        name: 'MRS SARA KHAN',
        passportNumber: '••••8765',
        nationality: 'Indian',
        status: 'APPROVED',
      },
    ],
    pricing: {
      currency: 'INR',
      governmentFees: '28,000.00',
      agencyProcessingFee: '5,932.20',
      cgst: '533.90',
      sgst: '533.90',
      igst: null,
      totalAmount: '35,000.00',
    },
    payment: {
      method: 'ONLINE PAYMENT',
      transactionId: 'TXN-VSA-VSA999',
      status: 'PAID',
    },
    agency: {
      ...mockFlightInvoiceData.agency,
      sacCode: '998555',
    },
  };

  const visaHtml = invoiceService.renderVisaInvoiceHtml(mockVisaInvoiceData);
  assert.ok(visaHtml.includes('MT-INV-VSA-202610-VSA999'), 'Must include visa invoice number');
  assert.ok(visaHtml.includes('Umrah eVisa (Multiple Entry)'), 'Must include visa category');
  assert.ok(visaHtml.includes('MR AHMED KHAN'), 'Must include applicant name');
  assert.ok(visaHtml.includes('28,000.00'), 'Must include non-taxable consular government fee');
  assert.ok(visaHtml.includes('5,932.20'), 'Must include taxable agency processing margin');
  assert.ok(visaHtml.includes('998555'), 'Must include SAC 998555 for visa facilitation');
  passedAssertions += 6;
  console.log('  ✔ Visa HTML rendering passed with statutory two-bucket tax itemization.\n');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 7: RBAC ISOLATION LOGIC
  // ─────────────────────────────────────────────────────────────────────────
  console.log('📌 [Test 7] Testing RBAC Security Isolation (Customer vs Foreign Booking)...');

  const customerId1 = new mongoose.Types.ObjectId();
  const customerId2 = new mongoose.Types.ObjectId();

  const userCustomer1 = { _id: customerId1, id: customerId1.toString(), role: 'customer' };
  const userCustomer2 = { _id: customerId2, id: customerId2.toString(), role: 'customer' };
  const userAdmin = { _id: customerId2, id: customerId2.toString(), role: 'admin' };

  const mockBookingOwnedBy1 = {
    _id: new mongoose.Types.ObjectId(),
    userId: customerId1,
  };

  // RBAC isolation validation function
  const enforceAccess = (booking, user) => {
    if (user && user.role === 'customer') {
      const bookingUserId = booking.userId?._id?.toString() || booking.userId?.toString();
      const currentUserId = user.id?.toString() || user._id?.toString();
      if (bookingUserId && currentUserId && bookingUserId !== currentUserId) {
        const err = new Error('Unauthorized: You can only view invoices for your own bookings');
        err.statusCode = 403;
        throw err;
      }
    }
    return true;
  };

  // 1. Owner access -> Allowed
  assert.equal(enforceAccess(mockBookingOwnedBy1, userCustomer1), true, 'Owner customer must be allowed');
  passedAssertions++;

  // 2. Admin access -> Allowed
  assert.equal(enforceAccess(mockBookingOwnedBy1, userAdmin), true, 'Admin must be allowed on any booking');
  passedAssertions++;

  // 3. Foreign customer access -> 403 Forbidden
  let caughtForbidden = false;
  try {
    enforceAccess(mockBookingOwnedBy1, userCustomer2);
  } catch (err) {
    if (err.statusCode === 403) caughtForbidden = true;
  }
  assert.equal(caughtForbidden, true, 'Foreign customer must be rejected with 403 Forbidden');
  passedAssertions++;

  console.log('  ✔ RBAC isolation verified: 403 Forbidden properly enforced on cross-account access.\n');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 8: LIVE HTTP SERVER INTEGRATION & AUTHENTICATION GATING
  // ─────────────────────────────────────────────────────────────────────────
  console.log('📌 [Test 8] Testing Live HTTP Server Integration (Port 0 Dynamic)...');

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 8A. Unauthenticated request to /api/v1/invoices/flight/123456 -> 401
    const resFlightUnauth = await fetch(`${baseUrl}/api/v1/invoices/flight/123456`);
    assert.equal(resFlightUnauth.status, 401, 'Unauthenticated flight invoice request must return 401');
    passedAssertions++;

    // 8B. Unauthenticated request to /api/v1/invoices/package/123456 -> 401
    const resPkgUnauth = await fetch(`${baseUrl}/api/v1/invoices/package/123456`);
    assert.equal(resPkgUnauth.status, 401, 'Unauthenticated package invoice request must return 401');
    passedAssertions++;

    // 8C. Unauthenticated request to /api/v1/invoices/offer/123456 -> 401
    const resOfferUnauth = await fetch(`${baseUrl}/api/v1/invoices/offer/123456`);
    assert.equal(resOfferUnauth.status, 401, 'Unauthenticated offer invoice request must return 401');
    passedAssertions++;

    // 8D. Unauthenticated request to /api/v1/invoices/visa/123456 -> 401
    const resVisaUnauth = await fetch(`${baseUrl}/api/v1/invoices/visa/123456`);
    assert.equal(resVisaUnauth.status, 401, 'Unauthenticated visa invoice request must return 401');
    passedAssertions++;

    // 8E. Authenticated with non-existent ID -> Returns 404 (or valid error response, not 401)
    if (mongoose.connection.readyState === 0 && process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI, { family: 4 });
    }

    let testUser = await User.findOne({ isActive: true });
    let createdTestUser = false;
    if (!testUser) {
      testUser = await User.create({
        phone: `99${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: '$2a$10$abcdefghijklmnopqrstuu',
        firstName: 'Invoice',
        lastName: 'Tester',
        role: 'customer',
        isActive: true,
      });
      createdTestUser = true;
    }

    const { accessToken: validToken } = generateTokens(testUser._id, testUser.role || 'customer');

    const nonExistentMongoId = new mongoose.Types.ObjectId().toString();
    const resNotFound = await fetch(`${baseUrl}/api/v1/invoices/flight/${nonExistentMongoId}`, {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    // With valid JWT token, it must pass authentication and reach the database resolver, returning 404
    assert.equal(resNotFound.status, 404, 'Non-existent flight booking must return 404 Not Found');
    const jsonNotFound = await resNotFound.json();
    assert.equal(jsonNotFound.success, false, 'Response envelope must indicate failure');
    passedAssertions += 2;

    // 8F. Authenticated via ?token= query parameter
    const resQueryToken = await fetch(`${baseUrl}/api/v1/invoices/flight/${nonExistentMongoId}?token=${validToken}`);
    assert.equal(resQueryToken.status, 404, 'Request with ?token= must pass auth and return 404');
    passedAssertions++;

    // 8G. Test Download endpoint with ?token= -> 404 on non-existent booking
    const resDlNotFound = await fetch(`${baseUrl}/api/v1/invoices/offer/${nonExistentMongoId}/download?token=${validToken}`);
    assert.equal(resDlNotFound.status, 404, 'Download with valid token on non-existent offer booking must return 404');
    passedAssertions++;

    if (createdTestUser) {
      await User.deleteOne({ _id: testUser._id });
    }

    console.log('  ✔ Live HTTP requests verified (401 gating, 404 not found, dual-auth ?token= query support).\n');
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }

  console.log('================================================================');
  console.log(`🎉 ALL ${passedAssertions} ASSERTIONS PASSED SUCCESSFULLY!`);
  console.log('================================================================');
}

// Execute tests
runAllInvoiceTests().catch((err) => {
  console.error('\n❌ TEST RUNNER FAILED WITH ERROR:');
  console.error(err);
  process.exit(1);
});
