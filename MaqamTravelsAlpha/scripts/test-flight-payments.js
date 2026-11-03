'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const User = require('../modules/auth/auth.model');
const FlightBooking = require('../modules/flights/flight.model');
const Booking = require('../modules/bookings/booking.model');
const Payment = require('../modules/payments/payment.model');

const paypalClient = require('../modules/payments/gateways/paypal/paypal.client');
const paypalService = require('../modules/payments/gateways/paypal/paypal.service');
const razorpayClient = require('../modules/payments/gateways/razorpay/razorpay.client');
const razorpayService = require('../modules/payments/gateways/razorpay/razorpay.service');

async function runFlightPaymentTest() {
  console.log('===============================================================');
  console.log('✈️  STARTING FLIGHT PAYMENT & SYNC INTEGRATION TEST SUITE');
  console.log('===============================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/travel_agency_test';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  // Mock gateway responses
  const originalPaypalOrderCreate = paypalClient.orders.create;
  const originalPaypalCapture = paypalClient.orders.capture;
  const originalPaypalRefund = paypalClient.payments.refund;

  paypalClient.orders.create = async (amount, bookingId, currency) => ({
    orderId: `PAYPAL_FLIGHT_ORDER_${Date.now()}`,
    redirectUrl: 'https://sandbox.paypal.com/checkoutnow?token=mock_flight',
    currency,
    raw: {},
  });
  paypalClient.orders.capture = async (orderId) => ({
    transactionId: `PAYPAL_FLIGHT_CAP_${Date.now()}`,
    amount: 150,
    status: 'COMPLETED',
    raw: { status: 'COMPLETED' },
  });
  paypalClient.payments.refund = async (captureId, amount, currency, reason) => ({
    refundId: `PAYPAL_FLIGHT_REF_${Date.now()}`,
    amount,
    currency,
    status: 'COMPLETED',
    raw: {},
  });

  try {
    // 1. Setup Customer User & Traveller
    console.log('--- 1. Setting up Test Customer ---');
    const customer = await User.create({
      phone: `+9188${Date.now().toString().slice(-6)}`,
      email: `flight_cust_${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Aarav',
      lastName: 'Sharma',
      role: 'customer',
    });
    console.log('✔ Created Customer User:', customer._id, customer.email);

    const Traveller = require('../modules/account/traveller.model');
    const traveller = await Traveller.create({
      userId: customer._id,
      passengerType: 'Adult',
      title: 'Mr',
      firstName: 'Aarav',
      lastName: 'Sharma',
      gender: 'Male',
      dateOfBirth: new Date('1990-01-01'),
      email: customer.email,
      phone: customer.phone,
    });

    // 2. Create Sample Flight Booking (LCC Booking)
    console.log('\n--- 2. Creating Sample LCC Flight Booking ---');
    const lccBooking = await FlightBooking.create({
      user: customer._id,
      srdvBookingId: Math.floor(100000 + Math.random() * 900000),
      srdvPnr: `LCC${Date.now().toString().slice(-4)}`,
      traceId: `TRACE-${Date.now()}`,
      journeyType: 'oneway',
      isLCC: true,
      totalAmount: 6500,
      status: 'pending',
      currency: 'INR',
      origin: 'DEL',
      destination: 'BOM',
      departureDate: new Date(Date.now() + 86400000 * 3),
      passengers: [
        {
          travellerId: traveller._id,
          title: 'Mr',
          firstName: 'Aarav',
          lastName: 'Sharma',
          passengerType: 'Adult',
          gender: 'Male',
          dateOfBirth: new Date('1990-01-01'),
        },
      ],
      eTicketData: {
        Segments: [
          [
            {
              Origin: { AirportCode: 'DEL', DepTime: new Date(Date.now() + 86400000 * 3).toISOString() },
              Destination: { AirportCode: 'BOM', ArrTime: new Date(Date.now() + 86400000 * 3 + 7200000).toISOString() },
            },
          ],
        ],
      },
    });

    console.log('✔ Created LCC FlightBooking:', lccBooking._id, 'PNR:', lccBooking.srdvPnr, 'Status:', lccBooking.status);

    // 3. Initiate PayPal Order for Flight Booking
    console.log('\n--- 3. Testing PayPal Order Creation for Flight ---');
    const paypalOrder = await paypalService.createPaymentOrder(customer._id, lccBooking._id, 'flight');
    console.log('✔ PayPal Flight Payment Order created:', paypalOrder.paypalOrderId, 'Billed Amount: $' + paypalOrder.amount, paypalOrder.currency);

    // 4. Capture PayPal Payment for Flight Booking
    console.log('\n--- 4. Testing PayPal Payment Capture for Flight ---');
    const captureResult = await paypalService.captureAndVerifyPayment(paypalOrder.paypalOrderId, customer._id);
    console.log('✔ PayPal Payment Captured. Status:', captureResult.status);

    // Verify FlightBooking is updated to confirmed
    const confirmedFlightBooking = await FlightBooking.findById(lccBooking._id);
    console.log('✔ FlightBooking status after capture:', confirmedFlightBooking.status);
    if (confirmedFlightBooking.status !== 'confirmed') {
      throw new Error(`Expected flight status 'confirmed', got '${confirmedFlightBooking.status}'`);
    }

    // Verify Master Booking Record
    const masterBooking = await Booking.findOne({ itemId: confirmedFlightBooking._id, bookingType: 'flight' });
    console.log('✔ Master Booking Record found:', masterBooking._id, 'Status:', masterBooking.status, 'Route:', masterBooking.details?.destination);
    if (!masterBooking || masterBooking.status !== 'confirmed') {
      throw new Error('Master Booking was not created or confirmed for flight');
    }
    if (masterBooking.details?.destination !== 'DEL-BOM') {
      throw new Error(`Expected destination 'DEL-BOM', got '${masterBooking.details?.destination}'`);
    }

    // 5. Test Full Refund on Flight Booking
    console.log('\n--- 5. Testing Flight Payment Full Refund ---');
    const refundResult = await paypalService.refundPayment(captureResult.paymentId, null, 'Flight cancelled by passenger');
    console.log('✔ Refund Processed. Status:', refundResult.status, 'Refund ID:', refundResult.refundId);

    const refundedBooking = await FlightBooking.findById(lccBooking._id);
    console.log('✔ FlightBooking status after refund:', refundedBooking.status);
    if (refundedBooking.status !== 'cancelled') {
      throw new Error(`Expected flight status 'cancelled', got '${refundedBooking.status}'`);
    }

    console.log('\n===============================================================');
    console.log('🎉 ALL FLIGHT PAYMENT INTEGRATION TESTS PASSED SUCCESSFULLY!');
    console.log('===============================================================\n');
  } finally {
    // Restore original functions
    paypalClient.orders.create = originalPaypalOrderCreate;
    paypalClient.orders.capture = originalPaypalCapture;
    paypalClient.payments.refund = originalPaypalRefund;

    // Cleanup test data
    await User.deleteMany({ email: { $regex: /flight_cust_.*@test\.com/ } });
    await FlightBooking.deleteMany({ srdvPnr: { $regex: /^LCC/ } });
    await Booking.deleteMany({});
    await Payment.deleteMany({});

    await mongoose.disconnect();
  }
}

runFlightPaymentTest().catch((err) => {
  console.error('❌ FLIGHT TEST FAILED:', err);
  process.exit(1);
});
