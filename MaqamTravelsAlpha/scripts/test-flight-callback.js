'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

// Ensure SRDV test credentials exist in environment
process.env.SRDV_CLIENT_ID = process.env.SRDV_CLIENT_ID || '12345';
process.env.SRDV_USERNAME = process.env.SRDV_USERNAME || 'test_user';
process.env.SRDV_PASSWORD = process.env.SRDV_PASSWORD || 'test_pass';

const User = require('../modules/auth/auth.model');
const Traveller = require('../modules/account/traveller.model');
const FlightBooking = require('../modules/flights/flight.model');
const FlightRefund = require('../modules/flights/flightRefund.model');
const Booking = require('../modules/bookings/booking.model');
const Payment = require('../modules/payments/payment.model');

const paypalClient = require('../modules/payments/gateways/paypal/paypal.client');
const paypalService = require('../modules/payments/gateways/paypal/paypal.service');
const { processFlightCallbackService } = require('../modules/flights/flight.service');

async function runFlightCallbackTestSuite() {
  console.log('===============================================================');
  console.log('✈️  STARTING SRDV FLIGHT BOOKING CALLBACK INTEGRATION TEST');
  console.log('===============================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/travel_agency_test';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  // Mock gateway calls
  const originalPaypalOrderCreate = paypalClient.orders.create;
  const originalPaypalCapture = paypalClient.orders.capture;
  const originalPaypalRefund = paypalClient.payments.refund;

  let mockRefundCalls = [];

  paypalClient.orders.create = async (amount, bookingId, currency) => ({
    orderId: `PAYPAL_CB_ORDER_${Date.now()}`,
    redirectUrl: 'https://sandbox.paypal.com/checkoutnow?token=mock_flight_cb',
    currency,
    raw: {},
  });
  paypalClient.orders.capture = async (orderId) => ({
    transactionId: `PAYPAL_CB_CAP_${Date.now()}`,
    amount: 150,
    status: 'COMPLETED',
    raw: { status: 'COMPLETED' },
  });
  paypalClient.payments.refund = async (captureId, amount, currency, reason) => {
    mockRefundCalls.push({ captureId, amount, currency, reason });
    return {
      refundId: `PAYPAL_CB_REF_${Date.now()}`,
      amount,
      currency,
      status: 'COMPLETED',
      raw: {},
    };
  };

  try {
    // 1. Setup Customer & Traveller
    console.log('--- 1. Setting up Customer & Traveller ---');
    const customer = await User.create({
      phone: `+9198${Date.now().toString().slice(-6)}`,
      email: `flight_cb_${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Rahul',
      lastName: 'Sharma',
      role: 'customer',
    });

    const traveller = await Traveller.create({
      userId: customer._id,
      passengerType: 'Adult',
      title: 'Mr',
      firstName: 'Rahul',
      lastName: 'Sharma',
      gender: 'Male',
      dateOfBirth: new Date('1990-05-15'),
      email: customer.email,
      phone: customer.phone,
    });
    console.log('✔ Created Customer:', customer.email, 'Traveller ID:', traveller._id);

    // 2. Test Credential Verification Failure
    console.log('\n--- 2. Testing Credential Verification Failure ---');
    const badCredsResult = await processFlightCallbackService({
      ClientId: 999999, // wrong
      UserName: 'wrong_user',
      Password: 'wrong_password',
      BookingId: '123456',
      Status: 'Success',
      PNR: 'FAKEPNR',
      Passengers: [],
    });
    console.log('✔ Bad credentials response:', badCredsResult);
    if (badCredsResult.success !== false || badCredsResult.error?.ErrorCode !== 1) {
      throw new Error(`Expected ErrorCode 1 for bad credentials, got ${JSON.stringify(badCredsResult)}`);
    }

    // 3. Test Missing Mandatory Fields
    console.log('\n--- 3. Testing Missing Mandatory Fields ---');
    const missingFieldsResult = await processFlightCallbackService({
      ClientId: process.env.SRDV_CLIENT_ID,
      UserName: process.env.SRDV_USERNAME,
      Password: process.env.SRDV_PASSWORD,
      // Missing BookingId and Status
    });
    console.log('✔ Missing fields response:', missingFieldsResult);
    if (missingFieldsResult.success !== false || missingFieldsResult.error?.ErrorCode !== 2) {
      throw new Error(`Expected ErrorCode 2 for missing fields, got ${JSON.stringify(missingFieldsResult)}`);
    }

    // 4. Test Success Callback: Ticket & PNR Updates
    console.log('\n--- 4. Testing "Success" Callback (Ticket Number & PNR Update) ---');
    const srdvBookingIdSuccess = Math.floor(200000 + Math.random() * 700000);
    const flightBookingSuccess = await FlightBooking.create({
      user: customer._id,
      srdvBookingId: srdvBookingIdSuccess,
      traceId: `TRACE-${Date.now()}`,
      journeyType: 'oneway',
      isLCC: false,
      totalAmount: 5500,
      markupAmount: 500,
      status: 'pending',
      currency: 'INR',
      origin: 'DEL',
      destination: 'BOM',
      passengers: [
        {
          travellerId: traveller._id,
          ticketNumber: '',
          ticketStatus: '',
        },
      ],
    });

    const masterBookingSuccess = await Booking.create({
      userId: customer._id,
      bookingType: 'flight',
      itemId: flightBookingSuccess._id,
      status: 'pending',
      totalPrice: 5500,
      currency: 'INR',
    });

    const successCallbackPayload = {
      ClientId: process.env.SRDV_CLIENT_ID,
      UserName: process.env.SRDV_USERNAME,
      Password: process.env.SRDV_PASSWORD,
      EndUserIp: '127.0.0.1',
      TraceId: flightBookingSuccess.traceId,
      BookingId: srdvBookingIdSuccess,
      PNR: 'AI2026X',
      GdsPNR: 'GDS9988',
      Status: 'Success',
      Remark: 'Ticketed on Air India',
      Passengers: [
        {
          Title: 'Mr',
          FirstName: 'Rahul',
          LastName: 'Sharma',
          TicketNumber: '098-2345678901',
        },
      ],
    };

    const successResult = await processFlightCallbackService(successCallbackPayload);
    console.log('✔ Success Callback Response:', successResult);
    if (!successResult.success || successResult.error?.ErrorCode !== 0) {
      throw new Error(`Expected ErrorCode 0, got ${JSON.stringify(successResult)}`);
    }

    // Verify updated FlightBooking document
    const updatedSuccessFlight = await FlightBooking.findById(flightBookingSuccess._id);
    console.log(`✔ Updated Flight Document:
      Status:       ${updatedSuccessFlight.status} (Expected: confirmed)
      PNR:          ${updatedSuccessFlight.pnr} (Expected: AI2026X)
      GdsPNR:       ${updatedSuccessFlight.gdsPnr} (Expected: GDS9988)
      TicketNumber: ${updatedSuccessFlight.passengers[0].ticketNumber} (Expected: 098-2345678901)
      TicketStatus: ${updatedSuccessFlight.passengers[0].ticketStatus} (Expected: OK)`);

    if (updatedSuccessFlight.status !== 'confirmed') {
      throw new Error(`Expected status 'confirmed', got '${updatedSuccessFlight.status}'`);
    }
    if (updatedSuccessFlight.pnr !== 'AI2026X') {
      throw new Error(`Expected pnr 'AI2026X', got '${updatedSuccessFlight.pnr}'`);
    }
    if (updatedSuccessFlight.passengers[0].ticketNumber !== '098-2345678901') {
      throw new Error(`Expected ticketNumber '098-2345678901', got '${updatedSuccessFlight.passengers[0].ticketNumber}'`);
    }

    // Verify Master Booking updated
    const updatedMasterBooking = await Booking.findById(masterBookingSuccess._id);
    console.log('✔ Master Booking Status:', updatedMasterBooking.status, 'PNR:', updatedMasterBooking.pnr);
    if (updatedMasterBooking.status !== 'confirmed') {
      throw new Error(`Expected master booking status 'confirmed', got '${updatedMasterBooking.status}'`);
    }

    // 5. Test Idempotency Guard (duplicate delivery)
    console.log('\n--- 5. Testing Idempotency Guard (Duplicate Delivery) ---');
    const duplicateResult = await processFlightCallbackService(successCallbackPayload);
    console.log('✔ Duplicate delivery acknowledged safely:', duplicateResult);
    if (!duplicateResult.success || duplicateResult.error?.ErrorCode !== 0) {
      throw new Error('Duplicate delivery failed');
    }

    // 6. Test Failed / Aborted Callback -> 100% Full Automated Refund
    console.log('\n--- 6. Testing "Failed" Callback -> 100% Full Automated Refund ---');
    const srdvBookingIdFailed = Math.floor(200000 + Math.random() * 700000);
    const totalAmount = 7200;
    const markupFee = 700;

    const flightBookingFailed = await FlightBooking.create({
      user: customer._id,
      srdvBookingId: srdvBookingIdFailed,
      traceId: `TRACE-${Date.now()}`,
      journeyType: 'oneway',
      isLCC: true,
      totalAmount,
      markupAmount: markupFee,
      status: 'pending',
      currency: 'INR',
      origin: 'BOM',
      destination: 'BLR',
      passengers: [
        {
          travellerId: traveller._id,
          ticketNumber: '',
        },
      ],
    });

    // Create and capture payment
    const paypalOrder = await paypalService.createPaymentOrder(customer._id, flightBookingFailed._id, 'flight');
    const captureResult = await paypalService.captureAndVerifyPayment(paypalOrder.paypalOrderId, customer._id);
    console.log('✔ Paid Flight Booking Created. Payment ID:', captureResult.paymentId);

    // Send Failed callback from SRDV
    const failedCallbackPayload = {
      ClientId: process.env.SRDV_CLIENT_ID,
      UserName: process.env.SRDV_USERNAME,
      Password: process.env.SRDV_PASSWORD,
      EndUserIp: '127.0.0.1',
      TraceId: flightBookingFailed.traceId,
      BookingId: srdvBookingIdFailed,
      PNR: 'UNCONFIRMED',
      Status: 'Failed',
      Remark: 'Inventory no longer available on airline seat map',
      Passengers: [
        {
          Title: 'Mr',
          FirstName: 'Rahul',
          LastName: 'Sharma',
        },
      ],
    };

    const failedResult = await processFlightCallbackService(failedCallbackPayload);
    console.log('✔ Failed Callback Response:', failedResult);
    if (!failedResult.success || failedResult.error?.ErrorCode !== 0) {
      throw new Error(`Expected ErrorCode 0 for failed callback, got ${JSON.stringify(failedResult)}`);
    }

    // Verify 100% Full Refund in FlightRefund
    const refundDoc = await FlightRefund.findOne({ bookingId: flightBookingFailed._id });
    if (!refundDoc) {
      throw new Error('FlightRefund record was not created for Failed callback!');
    }

    console.log(`✔ 100% Full Refund Details:
      Total Booking Amount: ₹${refundDoc.totalBookingAmount}
      Airline Penalty:      ₹${refundDoc.airlinePenalty} (Expected: 0)
      Agency Fee Retained:  ₹${refundDoc.agencyFee} (Expected: 0)
      Net Customer Refund:  ₹${refundDoc.customerRefundAmount} (Expected: ₹${totalAmount})
      Refund Status:        ${refundDoc.status} (Expected: processed)
      Gateway Refund ID:    ${refundDoc.gatewayRefundId}`);

    if (refundDoc.customerRefundAmount !== totalAmount) {
      throw new Error(`Expected full 100% refund of ₹${totalAmount}, got ₹${refundDoc.customerRefundAmount}`);
    }
    if (refundDoc.airlinePenalty !== 0) {
      throw new Error(`Expected airline penalty 0, got ${refundDoc.airlinePenalty}`);
    }
    if (refundDoc.agencyFee !== 0) {
      throw new Error(`Expected agency fee 0 for supplier failure, got ${refundDoc.agencyFee}`);
    }
    if (refundDoc.status !== 'processed') {
      throw new Error(`Expected refund status 'processed', got '${refundDoc.status}'`);
    }

    const updatedFailedFlight = await FlightBooking.findById(flightBookingFailed._id);
    console.log('✔ Failed FlightBooking DB status:', updatedFailedFlight.status);
    if (updatedFailedFlight.status !== 'failed') {
      throw new Error(`Expected status 'failed', got '${updatedFailedFlight.status}'`);
    }

    console.log('\n===============================================================');
    console.log('🎉 ALL SRDV FLIGHT CALLBACK TESTS PASSED (100% GREEN)!');
    console.log('===============================================================\n');
  } finally {
    // Restore mocks
    paypalClient.orders.create = originalPaypalOrderCreate;
    paypalClient.orders.capture = originalPaypalCapture;
    paypalClient.payments.refund = originalPaypalRefund;

    // Cleanup
    await User.deleteMany({ email: { $regex: /flight_cb_.*@test\.com/ } });
    await FlightBooking.deleteMany({ traceId: { $regex: /^TRACE-/ } });
    await FlightRefund.deleteMany({});
    await Booking.deleteMany({});
    await Payment.deleteMany({});

    await mongoose.disconnect();
  }
}

runFlightCallbackTestSuite().catch((err) => {
  console.error('❌ FLIGHT CALLBACK TEST SUITE FAILED:', err);
  process.exit(1);
});
