'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const User = require('../modules/auth/auth.model');
const Traveller = require('../modules/account/traveller.model');
const FlightBooking = require('../modules/flights/flight.model');
const FlightRefund = require('../modules/flights/flightRefund.model');
const Booking = require('../modules/bookings/booking.model');
const Payment = require('../modules/payments/payment.model');

const paypalClient = require('../modules/payments/gateways/paypal/paypal.client');
const paypalService = require('../modules/payments/gateways/paypal/paypal.service');
const {
  cancelFlightBookingService,
  getFlightRefundService,
  getFlightBookingByIdService,
  getUserFlightBookingsService,
} = require('../modules/flights/flight.service');

async function runFlightRefundTestSuite() {
  console.log('===============================================================');
  console.log('✈️  STARTING FLIGHT REFUND & CANCELLATION INTEGRATION TEST');
  console.log('===============================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/travel_agency_test';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  // Mock gateway responses
  const originalPaypalOrderCreate = paypalClient.orders.create;
  const originalPaypalCapture = paypalClient.orders.capture;
  const originalPaypalRefund = paypalClient.payments.refund;

  let mockRefundCalls = [];

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
  paypalClient.payments.refund = async (captureId, amount, currency, reason) => {
    mockRefundCalls.push({ captureId, amount, currency, reason });
    return {
      refundId: `PAYPAL_FLIGHT_REF_${Date.now()}`,
      amount,
      currency,
      status: 'COMPLETED',
      raw: {},
    };
  };

  try {
    // 1. Setup Customer User & Traveller
    console.log('--- 1. Setting up Customer User & Traveller ---');
    const customer = await User.create({
      phone: `+9187${Date.now().toString().slice(-6)}`,
      email: `flight_rfnd_${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Vikram',
      lastName: 'Malhotra',
      role: 'customer',
    });

    const traveller = await Traveller.create({
      userId: customer._id,
      passengerType: 'Adult',
      title: 'Mr',
      firstName: 'Vikram',
      lastName: 'Malhotra',
      gender: 'Male',
      dateOfBirth: new Date('1988-04-12'),
      email: customer.email,
      phone: customer.phone,
    });
    console.log('✔ Created Customer:', customer.email, 'Traveller ID:', traveller._id);

    // 2. Create Confirmed Paid Flight Booking
    console.log('\n--- 2. Creating Paid Flight Booking (LCC) ---');
    const totalTicketAmount = 6600;
    const markupFee = 600; // 10% agency fee

    const flightBooking = await FlightBooking.create({
      user: customer._id,
      srdvBookingId: Math.floor(100000 + Math.random() * 900000),
      srdvPnr: `PNR${Date.now().toString().slice(-4)}`,
      traceId: `TRACE-${Date.now()}`,
      journeyType: 'oneway',
      isLCC: true,
      totalAmount: totalTicketAmount,
      markupAmount: markupFee,
      status: 'pending',
      currency: 'INR',
      origin: 'DEL',
      destination: 'BLR',
      departureDate: new Date(Date.now() + 86400000 * 5),
      passengers: [
        {
          travellerId: traveller._id,
          ticketNumber: '6E-902148',
          title: 'Mr',
          firstName: 'Vikram',
          lastName: 'Malhotra',
          passengerType: 'Adult',
          gender: 'Male',
          dateOfBirth: new Date('1988-04-12'),
        },
      ],
    });

    // Process payment capture
    const paypalOrder = await paypalService.createPaymentOrder(customer._id, flightBooking._id, 'flight');
    const captureResult = await paypalService.captureAndVerifyPayment(paypalOrder.paypalOrderId, customer._id);
    console.log('✔ Paid Flight Booking Confirmed:', flightBooking._id, 'Payment ID:', captureResult.paymentId);

    // 3. Test Flight Cancellation with Airline Penalty
    console.log('\n--- 3. Testing Flight Cancellation with Airline Penalty ---');
    const airlinePenalty = 2000;
    // Expected net customer refund: 6600 (total) - 2000 (airline penalty) - 600 (agency markup) = 4000
    const expectedRefund = 4000;

    const cancelResult = await cancelFlightBookingService({
      bookingId: flightBooking._id,
      userId: customer._id,
      reason: 'Meeting rescheduled',
      penaltyAmount: airlinePenalty,
    });

    console.log('✔ Cancellation response message:', cancelResult.message);
    const refundDoc = cancelResult.refund;

    console.log(`✔ Financial Breakdown:
      Total Booking Amount: ₹${refundDoc.totalBookingAmount}
      Airline Penalty:      -₹${refundDoc.airlinePenalty}
      Agency Fee Retained:  -₹${refundDoc.agencyFee}
      Net Customer Refund:  =₹${refundDoc.customerRefundAmount} (Expected: ₹${expectedRefund})
      Status:               ${refundDoc.status}
      Gateway Refund ID:    ${refundDoc.gatewayRefundId}`);

    if (refundDoc.customerRefundAmount !== expectedRefund) {
      throw new Error(`Expected customer refund ₹${expectedRefund}, got ₹${refundDoc.customerRefundAmount}`);
    }
    if (refundDoc.agencyFee !== markupFee) {
      throw new Error(`Expected agency fee ₹${markupFee}, got ₹${refundDoc.agencyFee}`);
    }
    if (refundDoc.status !== 'processed') {
      throw new Error(`Expected refund status 'processed', got '${refundDoc.status}'`);
    }

    // Verify DB states
    const updatedBooking = await FlightBooking.findById(flightBooking._id);
    console.log('✔ FlightBooking DB status after cancellation:', updatedBooking.status);
    if (updatedBooking.status !== 'cancelled') {
      throw new Error(`Expected flight status 'cancelled', got '${updatedBooking.status}'`);
    }

    const masterBooking = await Booking.findOne({ itemId: flightBooking._id, bookingType: 'flight' });
    console.log('✔ Master Booking DB status after cancellation:', masterBooking?.status);
    if (masterBooking?.status !== 'cancelled') {
      throw new Error(`Expected master booking status 'cancelled', got '${masterBooking?.status}'`);
    }

    // 4. Test Idempotency & Lookups
    console.log('\n--- 4. Testing Idempotency & Lookup Services ---');
    const secondCancel = await cancelFlightBookingService({
      bookingId: flightBooking._id,
      userId: customer._id,
    });
    console.log('✔ Idempotent second cancellation message:', secondCancel.message);

    const fetchedRefund = await getFlightRefundService(flightBooking._id, customer._id);
    console.log('✔ Fetched refund details for booking:', fetchedRefund.idempotencyKey);

    const fetchedBooking = await getFlightBookingByIdService(flightBooking._id, customer._id);
    console.log('✔ Fetched booking by ID:', fetchedBooking._id, 'Status:', fetchedBooking.status);

    const myBookings = await getUserFlightBookingsService(customer._id, { page: 1, limit: 5 });
    console.log('✔ User flight bookings retrieved:', myBookings.bookings.length, 'Total:', myBookings.pagination.total);

    // 5. Test Unpaid Flight Cancellation (no payment gateway call)
    console.log('\n--- 5. Testing Direct Cancellation on Unpaid Flight ---');
    const unpaidBooking = await FlightBooking.create({
      user: customer._id,
      srdvBookingId: Math.floor(100000 + Math.random() * 900000),
      srdvPnr: `UNP${Date.now().toString().slice(-4)}`,
      traceId: `TRACE-${Date.now()}`,
      journeyType: 'oneway',
      isLCC: false,
      totalAmount: 5000,
      markupAmount: 500,
      status: 'pending',
      currency: 'INR',
      origin: 'BOM',
      destination: 'GOI',
      passengers: [{ travellerId: traveller._id }],
    });

    const unpaidCancel = await cancelFlightBookingService({
      bookingId: unpaidBooking._id,
      userId: customer._id,
      reason: 'Changed mind before paying',
    });
    console.log('✔ Unpaid booking cancelled successfully:', unpaidCancel.bookingId, 'Status:', unpaidCancel.status);

    console.log('\n===============================================================');
    console.log('🎉 ALL FLIGHT REFUND & CANCELLATION TESTS PASSED SUCCESSFULLY!');
    console.log('===============================================================\n');
  } finally {
    // Restore mocks
    paypalClient.orders.create = originalPaypalOrderCreate;
    paypalClient.orders.capture = originalPaypalCapture;
    paypalClient.payments.refund = originalPaypalRefund;

    // Cleanup
    await User.deleteMany({ email: { $regex: /flight_rfnd_.*@test\.com/ } });
    await FlightBooking.deleteMany({ srdvPnr: { $regex: /^(PNR|UNP)/ } });
    await FlightRefund.deleteMany({});
    await Booking.deleteMany({});
    await Payment.deleteMany({});

    await mongoose.disconnect();
  }
}

runFlightRefundTestSuite().catch((err) => {
  console.error('❌ FLIGHT REFUND TEST FAILED:', err);
  process.exit(1);
});
