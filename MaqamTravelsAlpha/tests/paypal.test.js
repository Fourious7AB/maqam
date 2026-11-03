const assert = require('assert');

// Set mock JWT secrets for test runner if not set
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'test_access_token_secret_32_bytes_long';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test_refresh_token_secret_32_bytes_long';

// 1. Test optionalAuthenticate middleware
const { optionalAuthenticate } = require('../middleware/auth');

async function testOptionalAuthenticate() {
  console.log('Testing optionalAuthenticate middleware...');
  
  // Case A: Missing auth header -> should proceed without error, req.user remains undefined
  const reqNoAuth = { headers: {} };
  let nextCalledNoAuth = false;
  await optionalAuthenticate(reqNoAuth, {}, (err) => {
    assert.strictEqual(err, undefined);
    nextCalledNoAuth = true;
  });
  assert.strictEqual(nextCalledNoAuth, true);
  assert.strictEqual(reqNoAuth.user, undefined);
  console.log('  ✓ optionalAuthenticate passes gracefully when Authorization header is absent');

  // Case B: Invalid/malformed auth header -> should proceed without error, req.user remains undefined
  const reqBadAuth = { headers: { authorization: 'Bearer invalid.jwt.token' } };
  let nextCalledBadAuth = false;
  await optionalAuthenticate(reqBadAuth, {}, (err) => {
    assert.strictEqual(err, undefined);
    nextCalledBadAuth = true;
  });
  assert.strictEqual(nextCalledBadAuth, true);
  assert.strictEqual(reqBadAuth.user, undefined);
  console.log('  ✓ optionalAuthenticate passes gracefully when Authorization token is expired/invalid');
}

// 2. Test app.js redirect behavior
function testAppRedirect() {
  console.log('Testing app.js PayPal landing redirects...');
  const app = require('../app');

  const routes = app._router.stack
    .filter(r => r.route)
    .map(r => ({ path: r.route.path, methods: r.route.methods, handler: r.route.stack[0].handle }));

  const successRoute = routes.find(r => r.path === '/payment/paypal/success');
  assert.ok(successRoute, 'GET /payment/paypal/success route must exist on app');

  const cancelRoute = routes.find(r => r.path === '/payment/paypal/cancel');
  assert.ok(cancelRoute, 'GET /payment/paypal/cancel route must exist on app');

  // Test redirect response on /payment/paypal/success
  let redirectUrl = null;
  const mockResSuccess = {
    redirect: (url) => {
      redirectUrl = url;
    }
  };
  const mockReqSuccess = {
    query: {
      token: '20T92884RM8006343',
      PayerID: 'PAYER123',
      bookingId: '65a123456789'
    }
  };

  successRoute.handler(mockReqSuccess, mockResSuccess);
  assert.ok(redirectUrl, 'redirect must be called');
  assert.ok(redirectUrl.includes('localhost:5069/payment/paypal/success'), `Redirect URL must land on port 5069: got ${redirectUrl}`);
  assert.ok(redirectUrl.includes('token=20T92884RM8006343'), `Redirect URL must preserve token: got ${redirectUrl}`);
  assert.ok(redirectUrl.includes('PayerID=PAYER123'), `Redirect URL must preserve PayerID: got ${redirectUrl}`);
  assert.ok(redirectUrl.includes('bookingId=65a123456789'), `Redirect URL must preserve bookingId: got ${redirectUrl}`);
  console.log(`  ✓ GET /payment/paypal/success successfully 302-redirects to: ${redirectUrl}`);

  // Test redirect response on /payment/paypal/cancel
  let cancelRedirectUrl = null;
  const mockResCancel = {
    redirect: (url) => {
      cancelRedirectUrl = url;
    }
  };
  const mockReqCancel = {
    query: {
      bookingId: '65a123456789'
    }
  };

  cancelRoute.handler(mockReqCancel, mockResCancel);
  assert.ok(cancelRedirectUrl, 'cancel redirect must be called');
  assert.ok(cancelRedirectUrl.includes('localhost:5069/payment/paypal/cancel'), `Cancel redirect must land on port 5069: got ${cancelRedirectUrl}`);
  assert.ok(cancelRedirectUrl.includes('bookingId=65a123456789'), `Cancel redirect must preserve bookingId: got ${cancelRedirectUrl}`);
  console.log(`  ✓ GET /payment/paypal/cancel successfully 302-redirects to: ${cancelRedirectUrl}`);
}

// 3. Test validatePayPalApprove validator
const { validationResult } = require('express-validator');
const paymentValidator = require('../modules/payments/payment.validator');

async function testValidatorPayPalApprove() {
  console.log('Testing validatePayPalApprove validator...');
  const middlewares = paymentValidator.validatePayPalApprove;

  // Case A: { orderId: "20T92884RM8006343" } -> passes
  const reqOrderId = { body: { orderId: '20T92884RM8006343' } };
  for (const m of middlewares) await m.run(reqOrderId);
  const errorsOrderId = validationResult(reqOrderId);
  assert.strictEqual(errorsOrderId.isEmpty(), true);
  assert.strictEqual(reqOrderId.body.orderId, '20T92884RM8006343');
  console.log('  ✓ validatePayPalApprove passes with { orderId: "20T92884RM8006343" }');

  // Case B: { token: "20T92884RM8006343" } -> passes & normalizes into req.body.orderId
  const reqToken = { body: { token: '20T92884RM8006343' } };
  for (const m of middlewares) await m.run(reqToken);
  const errorsToken = validationResult(reqToken);
  assert.strictEqual(errorsToken.isEmpty(), true);
  assert.strictEqual(reqToken.body.orderId, '20T92884RM8006343');
  console.log('  ✓ validatePayPalApprove passes and normalizes with { token: "20T92884RM8006343" }');

  // Case C: { paypalOrderId: "20T92884RM8006343" } -> passes & normalizes
  const reqPaypalOrderId = { body: { paypalOrderId: '20T92884RM8006343' } };
  for (const m of middlewares) await m.run(reqPaypalOrderId);
  const errorsPaypalOrderId = validationResult(reqPaypalOrderId);
  assert.strictEqual(errorsPaypalOrderId.isEmpty(), true);
  assert.strictEqual(reqPaypalOrderId.body.orderId, '20T92884RM8006343');
  console.log('  ✓ validatePayPalApprove passes and normalizes with { paypalOrderId: "20T92884RM8006343" }');

  // Case D: {} (empty body) -> fails
  const reqEmpty = { body: {} };
  for (const m of middlewares) await m.run(reqEmpty);
  const errorsEmpty = validationResult(reqEmpty);
  assert.strictEqual(errorsEmpty.isEmpty(), false);
  console.log('  ✓ validatePayPalApprove rejects empty payload');
}

// 4. Test paypalController.capturePayment response format
async function testCapturePaymentController() {
  console.log('Testing paypalController.capturePayment response payload...');
  const paypalController = require('../modules/payments/gateways/paypal/paypal.controller');
  const paypalService = require('../modules/payments/gateways/paypal/paypal.service');

  // Mock service captureAndVerifyPayment and processSuccessfulPayment
  const origCapture = paypalService.captureAndVerifyPayment;
  const origProcess = paypalService.processSuccessfulPayment;

  try {
    paypalService.captureAndVerifyPayment = async (orderId) => ({
      paymentId: '65a999999999',
      bookingId: '65b888888888',
      bookingType: 'flight',
      booking: {
        _id: '65b888888888',
        pnr: '6E-ABC123',
        status: 'confirmed',
        airline: 'IndiGo',
        flightNumber: '6E-204',
        origin: 'DEL',
        destination: 'JED',
        passengers: [{ name: 'Ahmad Khan', ticketNumber: '6E-902148' }],
      },
      masterBooking: { _id: '65c777777777', status: 'confirmed' },
      paypalCaptureId: 'CAP-20T92884',
      status: 'paid',
    });

    paypalService.processSuccessfulPayment = async () => ({ success: true });

    let jsonResponse = null;
    let statusCode = null;

    const mockRes = {
      status: (code) => {
        statusCode = code;
        return mockRes;
      },
      json: (data) => {
        jsonResponse = data;
        return mockRes;
      },
    };

    const mockReq = {
      body: { orderId: '20T92884RM8006343' },
      user: null,
      correlationId: 'test-corr-1',
    };

    await paypalController.capturePayment(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(statusCode, 200);
    assert.strictEqual(jsonResponse.success, true);
    assert.strictEqual(jsonResponse.data.bookingId, '65b888888888');
    assert.strictEqual(jsonResponse.data.bookingType, 'flight');
    assert.strictEqual(jsonResponse.data.booking.pnr, '6E-ABC123');
    assert.strictEqual(jsonResponse.data.booking.status, 'confirmed');
    assert.strictEqual(jsonResponse.data.booking.passengers[0].ticketNumber, '6E-902148');
    assert.strictEqual(jsonResponse.data.paypalCaptureId, 'CAP-20T92884');
    assert.strictEqual(jsonResponse.data.status, 'paid');
    console.log('  ✓ capturePayment returns HTTP 200 with complete booking details & ticket numbers for flight');

    // Test Hotel booking capture
    paypalService.captureAndVerifyPayment = async (orderId) => ({
      paymentId: '65a999999999',
      bookingId: '65b777777777',
      bookingType: 'hotel',
      booking: {
        _id: '65b777777777',
        hotelName: 'Grand Hyatt Dubai',
        destination: 'Dubai',
        roomName: 'Deluxe Suite',
        voucherRef: 'TJS206501794071',
        status: 'confirmed',
        rawStatus: 'payment_received',
        totalPrice: 15400,
        currency: 'INR',
        guests: [{ title: 'Mr', firstName: 'Sameer', lastName: 'Khan' }],
      },
      masterBooking: {
        _id: '65c666666666',
        status: 'confirmed',
        details: {
          hotelName: 'Grand Hyatt Dubai',
          roomName: 'Deluxe Suite',
          destination: 'Grand Hyatt Dubai, Dubai',
          totalPrice: 15400,
          currency: 'INR',
          passengers: 1,
        },
      },
      paypalCaptureId: 'CAP-HOTEL-12345',
      status: 'paid',
    });

    statusCode = null;
    jsonResponse = null;
    await paypalController.capturePayment(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(statusCode, 200);
    assert.strictEqual(jsonResponse.success, true);
    assert.strictEqual(jsonResponse.data.bookingId, '65b777777777');
    assert.strictEqual(jsonResponse.data.bookingType, 'hotel');
    assert.strictEqual(jsonResponse.data.booking.hotelName, 'Grand Hyatt Dubai');
    assert.strictEqual(jsonResponse.data.booking.roomName, 'Deluxe Suite');
    assert.strictEqual(jsonResponse.data.booking.voucherRef, 'TJS206501794071');
    assert.strictEqual(jsonResponse.data.booking.status, 'confirmed');
    assert.strictEqual(jsonResponse.data.masterBooking.details.hotelName, 'Grand Hyatt Dubai');
    assert.strictEqual(jsonResponse.data.status, 'paid');
    console.log('  ✓ capturePayment returns HTTP 200 with complete hotel details & voucherRef for hotel');
  } finally {
    paypalService.captureAndVerifyPayment = origCapture;
    paypalService.processSuccessfulPayment = origProcess;
  }
}

async function run() {
  try {
    await testOptionalAuthenticate();
    testAppRedirect();
    await testValidatorPayPalApprove();
    await testCapturePaymentController();
    console.log('\nAll PayPal integration tests PASSED successfully!\n');
    process.exit(0);
  } catch (err) {
    console.error('\nTest failed:', err);
    process.exit(1);
  }
}

run();
