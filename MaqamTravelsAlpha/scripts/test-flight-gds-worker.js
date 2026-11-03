'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const User = require('../modules/auth/auth.model');
const Traveller = require('../modules/account/traveller.model');
const FlightBooking = require('../modules/flights/flight.model');
const Booking = require('../modules/bookings/booking.model');
const Payment = require('../modules/payments/payment.model');
const OutboxEvent = require('../modules/shared/outbox-event.model');

const paypalClient = require('../modules/payments/gateways/paypal/paypal.client');
const paypalService = require('../modules/payments/gateways/paypal/paypal.service');
const srdvAdapter = require('../providers/srdv/srdv.adapter');
const { processGDSTicketing } = require('../workers/flights/flight-ticket-gds.worker');

async function runFlightGDSWorkerTestSuite() {
  console.log('===============================================================');
  console.log('✈️  STARTING FLIGHT GDS TICKETING WORKER INTEGRATION TEST');
  console.log('===============================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/travel_agency_test';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  // Mock gateway and SRDV responses
  const originalPaypalOrderCreate = paypalClient.orders.create;
  const originalPaypalCapture = paypalClient.orders.capture;
  const originalTicketGDSAdapter = srdvAdapter.ticketGDSAdapter;

  paypalClient.orders.create = async (amount, bookingId, currency) => ({
    orderId: `PAYPAL_GDS_ORDER_${Date.now()}`,
    redirectUrl: 'https://sandbox.paypal.com/checkoutnow?token=mock_gds',
    currency,
    raw: {},
  });
  paypalClient.orders.capture = async (orderId) => ({
    transactionId: `PAYPAL_GDS_CAP_${Date.now()}`,
    amount: 180,
    status: 'COMPLETED',
    raw: { status: 'COMPLETED' },
  });

  srdvAdapter.ticketGDSAdapter = async (params) => {
    console.log('   [SRDV Mock] ticketGDSAdapter called with PNR:', params.pnr);
    return {
      ticketStatus: 'Ticketed',
      invoiceNo: `INV-GDS-${Date.now()}`,
      invoiceStatus: 'Issued',
      eTicketData: { confirmation: 'AI-SUCCESS-2026' },
      passengers: [
        {
          ticketNumber: '098-2341908721',
          ticketId: 881234,
          ticketIssueDate: new Date().toISOString(),
          ticketStatus: 'Ticketed',
        },
      ],
    };
  };

  try {
    // 1. Setup Customer User & Traveller
    console.log('--- 1. Setting up Customer User & Traveller ---');
    const customer = await User.create({
      phone: `+9198${Date.now().toString().slice(-6)}`,
      email: `gds_test_${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Rohan',
      lastName: 'Kapoor',
      role: 'customer',
    });

    const traveller = await Traveller.create({
      userId: customer._id,
      passengerType: 'Adult',
      title: 'Mr',
      firstName: 'Rohan',
      lastName: 'Kapoor',
      gender: 'Male',
      dateOfBirth: new Date('1990-06-15'),
      email: customer.email,
      phone: customer.phone,
    });
    console.log('✔ Created Customer:', customer.email, 'Traveller ID:', traveller._id);

    // 2. Create GDS Flight Booking on Hold
    console.log('\n--- 2. Creating GDS Flight Booking (Air India - Held PNR) ---');
    const totalTicketAmount = 8800;
    const markupFee = 800;

    const gdsBooking = await FlightBooking.create({
      user: customer._id,
      srdvBookingId: Math.floor(100000 + Math.random() * 900000),
      pnr: `AI${Date.now().toString().slice(-4)}`,
      srdvType: 'SRDVGDS',
      srdvIndex: 1,
      resultIndex: 'RES-GDS-001',
      traceId: `TRACE-GDS-${Date.now()}`,
      journeyType: 'oneway',
      isLCC: false,
      totalAmount: totalTicketAmount,
      markupAmount: markupFee,
      status: 'pending',
      currency: 'INR',
      origin: 'DEL',
      destination: 'DXB',
      lastTicketDate: new Date(Date.now() + 86400000 * 2), // 2 days in future
      passengers: [
        {
          travellerId: traveller._id,
          isLeadPax: true,
        },
      ],
    });
    console.log('✔ GDS Booking created on hold. Status:', gdsBooking.status, 'PNR:', gdsBooking.pnr);

    // 3. Process Payment Capture
    console.log('\n--- 3. Processing Payment Capture for GDS Booking ---');
    const paypalOrder = await paypalService.createPaymentOrder(customer._id, gdsBooking._id, 'flight');
    const captureResult = await paypalService.captureAndVerifyPayment(paypalOrder.paypalOrderId, customer._id);
    console.log('✔ PayPal Payment Captured. Payment ID:', captureResult.paymentId);

    // Verify Outbox PAYMENT_RECEIVED event
    const outboxPaymentReceived = await OutboxEvent.findOne({
      aggregateId: gdsBooking._id,
      eventType: 'PAYMENT_RECEIVED',
    });
    if (!outboxPaymentReceived) {
      throw new Error('Expected OutboxEvent PAYMENT_RECEIVED was not found');
    }
    console.log('✔ Verified OutboxEvent PAYMENT_RECEIVED recorded for booking ID:', gdsBooking._id);

    // 4. Run processGDSTicketing Worker logic
    console.log('\n--- 4. Executing GDS Ticketing Worker Logic ---');
    const ticketedBooking = await processGDSTicketing(gdsBooking._id);

    console.log('✔ GDS Booking Status after worker execution:', ticketedBooking.status);
    console.log('✔ Ticket Status:', ticketedBooking.ticketStatus);
    console.log('✔ Invoice No:', ticketedBooking.invoiceNo);
    console.log('✔ Passenger Ticket Number:', ticketedBooking.passengers[0].ticketNumber);

    if (ticketedBooking.status !== 'confirmed') {
      throw new Error(`Expected booking status 'confirmed', got '${ticketedBooking.status}'`);
    }
    if (!ticketedBooking.passengers[0].ticketNumber) {
      throw new Error('Expected passenger ticketNumber to be populated');
    }

    // Verify Master Booking
    const masterBooking = await Booking.findOne({ itemId: gdsBooking._id, bookingType: 'flight' });
    console.log('✔ Master Booking created in DB:', masterBooking?._id, 'Status:', masterBooking?.status);
    if (masterBooking?.status !== 'confirmed') {
      throw new Error(`Expected master booking status 'confirmed', got '${masterBooking?.status}'`);
    }

    // Verify Outbox TICKET_GDS_SUCCESS
    const outboxTicketSuccess = await OutboxEvent.findOne({
      aggregateId: gdsBooking._id,
      eventType: 'TICKET_GDS_SUCCESS',
    });
    if (!outboxTicketSuccess) {
      throw new Error('Expected OutboxEvent TICKET_GDS_SUCCESS was not found');
    }
    console.log('✔ Verified OutboxEvent TICKET_GDS_SUCCESS recorded');

    // 5. Test Expiry Guard (lastTicketDate passed)
    console.log('\n--- 5. Testing Ticketing Guard on Expired Hold ---');
    const expiredBooking = await FlightBooking.create({
      user: customer._id,
      srdvBookingId: Math.floor(100000 + Math.random() * 900000),
      pnr: `EXP${Date.now().toString().slice(-4)}`,
      srdvType: 'SRDVGDS',
      traceId: `TRACE-EXP-${Date.now()}`,
      journeyType: 'oneway',
      isLCC: false,
      totalAmount: 9000,
      status: 'pending',
      lastTicketDate: new Date(Date.now() - 3600000), // 1 hour in the past!
      passengers: [{ travellerId: traveller._id }],
    });

    const expiredResult = await processGDSTicketing(expiredBooking._id);
    console.log('✔ Expired Booking Status:', expiredResult.status, 'Remark:', expiredResult.remark);
    if (expiredResult.status !== 'failed') {
      throw new Error(`Expected expired hold status 'failed', got '${expiredResult.status}'`);
    }

    const outboxExpired = await OutboxEvent.findOne({
      aggregateId: expiredBooking._id,
      eventType: 'TICKET_GDS_EXPIRED',
    });
    if (!outboxExpired) {
      throw new Error('Expected OutboxEvent TICKET_GDS_EXPIRED was not found');
    }
    console.log('✔ Verified OutboxEvent TICKET_GDS_EXPIRED recorded');

    console.log('\n===============================================================');
    console.log('🎉 ALL FLIGHT GDS WORKER & OUTBOX TESTS PASSED SUCCESSFULLY!');
    console.log('===============================================================\n');
  } finally {
    // Restore mocks
    paypalClient.orders.create = originalPaypalOrderCreate;
    paypalClient.orders.capture = originalPaypalCapture;
    srdvAdapter.ticketGDSAdapter = originalTicketGDSAdapter;

    // Cleanup
    await User.deleteMany({ email: { $regex: /gds_test_.*@test\.com/ } });
    await FlightBooking.deleteMany({ pnr: { $regex: /^(AI|EXP)/ } });
    await Booking.deleteMany({});
    await Payment.deleteMany({});
    await OutboxEvent.deleteMany({ aggregateType: 'FlightBooking' });

    await mongoose.disconnect();
  }
}

runFlightGDSWorkerTestSuite().catch((err) => {
  console.error('❌ FLIGHT GDS WORKER TEST FAILED:', err);
  process.exit(1);
});
