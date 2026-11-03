'use strict';

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../modules/auth/auth.model');
const Hotel = require('../modules/hotels/hotelEntity.model');
const HotelStock = require('../modules/packages/stock/hotelStock.model');
const TicketStock = require('../modules/packages/stock/ticketStock.model');
const Package = require('../modules/packages/models/package.model');
const PackageBooking = require('../modules/packages/models/packageBooking.model');
const Offer = require('../modules/packages/offers/offer.model');
const OfferBooking = require('../modules/packages/offers/offerBooking.model');
const Booking = require('../modules/bookings/booking.model');
const Payment = require('../modules/payments/payment.model');

const packageBookingService = require('../modules/packages/core/packageBooking.service');
const offerBookingService = require('../modules/packages/offers/offerBooking.service');
const { availabilityForStock, availabilityForPackage } = require('../modules/packages/core/availability.service');

const razorpayClient = require('../modules/payments/gateways/razorpay/razorpay.client');
const razorpayService = require('../modules/payments/gateways/razorpay/razorpay.service');

const paypalClient = require('../modules/payments/gateways/paypal/paypal.client');
const paypalService = require('../modules/payments/gateways/paypal/paypal.service');

async function runTest() {
  console.log('===============================================================');
  console.log('🚀 STARTING PACKAGES & OFFERS PAYMENT INTEGRATION TEST SUITE');
  console.log('===============================================================\n');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/travel_agency_test';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  // Mock Razorpay & PayPal network client calls so tests run without real internet API credentials
  const originalRzpVerify = razorpayClient.payments.verify;
  const originalRzpFetch = razorpayClient.payments.fetch;
  const originalRzpRefund = razorpayClient.payments.refund;
  const originalRzpOrderCreate = razorpayClient.orders.create;

  const originalPaypalOrderCreate = paypalClient.orders.create;
  const originalPaypalCapture = paypalClient.orders.capture;
  const originalPaypalRefund = paypalClient.payments.refund;

  razorpayClient.orders.create = async (amount, bookingId, customerDetails) => ({
    orderId: `order_rzp_mock_${Date.now()}`,
    amount: amount * 100,
    amountInINR: amount,
    currency: 'INR',
    status: 'created',
  });
  razorpayClient.payments.verify = () => true;
  razorpayClient.payments.fetch = async (paymentId) => ({
    id: paymentId,
    status: 'captured',
    amount: 100000,
    currency: 'INR',
  });
  razorpayClient.payments.refund = async (paymentId, amount, reason) => ({
    refundId: `rfnd_rzp_${Date.now()}`,
    amount,
    status: 'processed',
  });

  paypalClient.orders.create = async (amount, bookingId, currency) => ({
    orderId: `PAYPAL_MOCK_ORDER_${Date.now()}`,
    redirectUrl: 'https://sandbox.paypal.com/checkoutnow?token=mock',
    currency,
    raw: {},
  });
  paypalClient.orders.capture = async (orderId) => ({
    transactionId: `PAYPAL_MOCK_CAP_${Date.now()}`,
    amount: 100,
    status: 'COMPLETED',
    raw: { status: 'COMPLETED' },
  });
  paypalClient.payments.refund = async (captureId, amount, currency, reason) => ({
    refundId: `PAYPAL_MOCK_REF_${Date.now()}`,
    amount,
    currency,
    status: 'COMPLETED',
    raw: {},
  });

  try {
    // ─── 1. SETUP BASE DATA (Users, Hotel, TicketStock, HotelStock, Package, Offer) ───
    console.log('--- 1. Setting up Inventory & Users ---');
    const customer = await User.create({
      phone: `+9199${Date.now().toString().slice(-6)}`,
      email: `pkg_cust_${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Package',
      lastName: 'Customer',
      name: 'Package Test Customer',
      role: 'customer',
    });

    const hotel = await Hotel.create({
      name: 'Goa Grand Resort',
      destination: 'Goa',
      address: 'Calangute Beach',
      isActive: true,
      createdBy: customer._id,
    });

    const hotelStock = await HotelStock.create({
      hotelId: hotel._id,
      hotelName: hotel.name,
      destination: 'Goa',
      roomType: 'Deluxe Suite',
      checkIn: new Date(Date.now() + 86400000 * 5),
      checkOut: new Date(Date.now() + 86400000 * 8),
      pricePerNight: 2000,
      meals: ['breakfast', 'dinner'],
      reservationRef: `RES-PKG-${Date.now()}`,
      nameAdditionDeadline: new Date(Date.now() + 86400000 * 4),
      reviewStatus: 'approved',
      units: [
        { status: 'available' },
        { status: 'available' },
        { status: 'available' },
        { status: 'available' },
      ],
      createdBy: customer._id,
    });

    const ticketStock = await TicketStock.create({
      airline: 'IndiGo',
      flightNumber: '6E-202',
      pnr: `PNR${Date.now().toString().slice(-4)}`,
      origin: 'DEL',
      destination: 'GOI',
      departureDate: new Date(Date.now() + 86400000 * 5),
      arrivalDate: new Date(Date.now() + 86400000 * 5 + 3600000 * 2),
      cabinClass: 'economy',
      costPerUnit: 3500,
      nameAdditionDeadline: new Date(Date.now() + 86400000 * 4),
      units: [
        { status: 'available' },
        { status: 'available' },
        { status: 'available' },
        { status: 'available' },
      ],
      createdBy: customer._id,
    });

    const pkg = await Package.create({
      title: 'Goa 4D3N Bliss Package',
      destination: 'Goa',
      sellPrice: 12000,
      costPrice: 8000,
      inclusions: ['Flight', '5-Star Hotel', 'Breakfast'],
      itinerary: [{ day: 1, title: 'Arrival & Beach Sunset', activities: ['Check-in', 'Dinner'] }],
      validity: {
        startDate: new Date(Date.now() + 86400000 * 5),
        endDate: new Date(Date.now() + 86400000 * 8),
      },
      flightRefs: [{ stock: ticketStock._id, unitsPerBooking: 1 }],
      hotelRefs: [{ stock: hotelStock._id, unitsPerBooking: 1 }],
      isActive: true,
      createdBy: customer._id,
    });

    const offer = await Offer.create({
      title: 'Flash Sale: Goa Hotel Luxury Stay',
      description: 'Exclusive 30% off luxury hotel room',
      destination: 'Goa',
      itemType: 'hotel',
      hotelRef: { stock: hotelStock._id, unitsPerBooking: 1 },
      sellPrice: 4500,
      startDate: new Date(Date.now() + 86400000 * 5),
      endDate: new Date(Date.now() + 86400000 * 8),
      isActive: true,
      createdBy: customer._id,
    });

    console.log('✔ Created Hotel, HotelStock (4 units), TicketStock (4 units), Package, and Offer.');

    // ─── 2. TEST PACKAGE BOOKING CREATION & RAZORPAY PAYMENT ───
    console.log('\n--- 2. Testing Package Booking + Razorpay Payment Capture ---');
    const pkgBookingResult = await packageBookingService.createBooking({
      userId: customer._id,
      packageId: pkg._id,
      travellers: [{ travellerId: new mongoose.Types.ObjectId(), isLead: true }],
      quantity: 1,
    });

    console.log('✔ Package Booking created:', pkgBookingResult.bookingId, 'Status:', pkgBookingResult.status);
    if (pkgBookingResult.status !== 'pending') throw new Error('Expected booking status pending');

    // Verify stock is assigned
    let hStockDoc = await HotelStock.findById(hotelStock._id);
    let tStockDoc = await TicketStock.findById(ticketStock._id);
    const assignedHotelUnits = hStockDoc.units.filter((u) => u.status === 'assigned');
    const assignedFlightUnits = tStockDoc.units.filter((u) => u.status === 'assigned');
    console.log(`✔ Stock status after booking: ${assignedHotelUnits.length} hotel unit & ${assignedFlightUnits.length} flight unit assigned.`);
    if (assignedHotelUnits.length !== 1 || assignedFlightUnits.length !== 1) {
      throw new Error('Stock units were not properly assigned on package booking');
    }

    // Create Razorpay payment order
    const rzpOrder = await razorpayService.createPaymentOrder(customer._id, pkgBookingResult.bookingId, 'package');
    console.log('✔ Razorpay Payment Order created:', rzpOrder.razorpayOrderId, 'Amount: ₹' + rzpOrder.amount);

    // Verify & Process Razorpay payment
    const rzpPaymentResult = await razorpayService.verifyAndProcessPayment(
      rzpOrder.razorpayOrderId,
      'pay_mock_rzp_123',
      'valid_dummy_signature'
    );
    console.log('✔ Razorpay Payment Processed. Status:', rzpPaymentResult.status);

    // Check PackageBooking status
    const confirmedPkgBooking = await PackageBooking.findById(pkgBookingResult.bookingId);
    console.log('✔ Package Booking Status after payment capture:', confirmedPkgBooking.status);
    if (confirmedPkgBooking.status !== 'confirmed') throw new Error('PackageBooking is not confirmed!');

    // Check Stock unit status is now 'used'
    hStockDoc = await HotelStock.findById(hotelStock._id);
    tStockDoc = await TicketStock.findById(ticketStock._id);
    const usedHotelUnits = hStockDoc.units.filter((u) => u.status === 'used');
    const usedFlightUnits = tStockDoc.units.filter((u) => u.status === 'used');
    console.log(`✔ Stock status after payment: ${usedHotelUnits.length} hotel unit & ${usedFlightUnits.length} flight unit marked as 'used'.`);
    if (usedHotelUnits.length !== 1 || usedFlightUnits.length !== 1) {
      throw new Error('Stock units were not transitioned to used after payment capture');
    }

    // Check Master Booking collection record
    const masterBooking = await Booking.findOne({ itemId: confirmedPkgBooking._id, bookingType: 'package' });
    console.log('✔ Master Booking Record found:', masterBooking._id, 'Status:', masterBooking.status, 'Destination:', masterBooking.details?.destination);
    if (!masterBooking || masterBooking.status !== 'confirmed') {
      throw new Error('Master Booking record was not created or confirmed');
    }

    // ─── 3. TEST FULL REFUND & STOCK RELEASE ───
    console.log('\n--- 3. Testing Razorpay Full Refund & Stock Unit Release ---');
    const refundResult = await razorpayService.refundPayment(rzpPaymentResult.paymentId, null, 'Customer changed plans');
    console.log('✔ Razorpay Refund Result:', refundResult.status, 'Refund ID:', refundResult.refundId);

    const refundedPkgBooking = await PackageBooking.findById(pkgBookingResult.bookingId);
    console.log('✔ Package Booking status after refund:', refundedPkgBooking.status);
    if (refundedPkgBooking.status !== 'cancelled') throw new Error('PackageBooking was not marked cancelled on full refund');

    // Verify stock units released back to 'available'
    hStockDoc = await HotelStock.findById(hotelStock._id);
    tStockDoc = await TicketStock.findById(ticketStock._id);
    const availHotelUnits = hStockDoc.units.filter((u) => u.status === 'available');
    const availFlightUnits = tStockDoc.units.filter((u) => u.status === 'available');
    console.log(`✔ Restored Stock availability after refund: Hotel units available = ${availHotelUnits.length} (out of 4), Flight units available = ${availFlightUnits.length} (out of 4).`);
    if (availHotelUnits.length !== 4 || availFlightUnits.length !== 4) {
      throw new Error('Stock units were not released back to available upon refund');
    }

    // ─── 4. TEST OFFER BOOKING + PAYPAL PAYMENT FLOW ───
    console.log('\n--- 4. Testing Offer Booking + PayPal Payment Capture ---');
    const offerBookingResult = await offerBookingService.createOfferBooking({
      userId: customer._id,
      offerId: offer._id,
      travellers: [{ travellerId: new mongoose.Types.ObjectId(), isLead: true }],
      quantity: 1,
    });
    console.log('✔ Offer Booking created:', offerBookingResult.bookingId, 'Status:', offerBookingResult.status, 'Total: ₹' + offerBookingResult.totalAmount);

    // Create PayPal order
    const paypalOrder = await paypalService.createPaymentOrder(customer._id, offerBookingResult.bookingId, 'offer');
    console.log('✔ PayPal Payment Order created:', paypalOrder.paypalOrderId, 'Billed Amount: $' + paypalOrder.amount, paypalOrder.currency);

    // Capture PayPal payment
    const paypalCaptureResult = await paypalService.captureAndVerifyPayment(paypalOrder.paypalOrderId, customer._id);
    console.log('✔ PayPal Payment Captured. Status:', paypalCaptureResult.status);

    // Check OfferBooking status
    const confirmedOfferBooking = await OfferBooking.findById(offerBookingResult.bookingId);
    console.log('✔ Offer Booking status after PayPal capture:', confirmedOfferBooking.status);
    if (confirmedOfferBooking.status !== 'confirmed') throw new Error('OfferBooking is not confirmed!');

    // Check Master Booking for Offer
    const offerMasterBooking = await Booking.findOne({ itemId: confirmedOfferBooking._id, bookingType: 'offer' });
    console.log('✔ Offer Master Booking found:', offerMasterBooking._id, 'Status:', offerMasterBooking.status, 'Destination:', offerMasterBooking.details?.destination);
    if (!offerMasterBooking || offerMasterBooking.status !== 'confirmed') {
      throw new Error('Offer Master Booking was not created or confirmed');
    }

    // ─── 5. TEST USER CANCEL ENDPOINT ON UNPAID BOOKING ───
    console.log('\n--- 5. Testing Direct Booking Cancellation on Unpaid Booking ---');
    const unpaidOfferBooking = await offerBookingService.createOfferBooking({
      userId: customer._id,
      offerId: offer._id,
      travellers: [{ travellerId: new mongoose.Types.ObjectId(), isLead: true }],
      quantity: 1,
    });
    console.log('✔ Created second unpaid Offer Booking:', unpaidOfferBooking.bookingId);

    const cancelledDoc = await offerBookingService.cancelOfferBooking(unpaidOfferBooking.bookingId, customer._id, 'User cancelled before pay');
    console.log('✔ Cancelled unpaid booking status:', cancelledDoc.status, 'Reason:', cancelledDoc.cancellationReason);
    if (cancelledDoc.status !== 'cancelled') throw new Error('Booking was not cancelled');

    console.log('\n===============================================================');
    console.log('🎉 ALL PACKAGE & OFFER PAYMENT TESTS PASSED SUCCESSFULLY!');
    console.log('===============================================================\n');
  } finally {
    // Restore original mock functions
    razorpayClient.payments.verify = originalRzpVerify;
    razorpayClient.payments.fetch = originalRzpFetch;
    razorpayClient.payments.refund = originalRzpRefund;
    razorpayClient.orders.create = originalRzpOrderCreate;

    paypalClient.orders.create = originalPaypalOrderCreate;
    paypalClient.orders.capture = originalPaypalCapture;
    paypalClient.payments.refund = originalPaypalRefund;

    // Cleanup test data
    await User.deleteMany({ email: { $regex: /pkg_cust_.*@test\.com/ } });
    await Hotel.deleteMany({ name: 'Goa Grand Resort' });
    await HotelStock.deleteMany({ destination: 'Goa' });
    await TicketStock.deleteMany({ origin: 'DEL', destination: 'GOI' });
    await Package.deleteMany({ title: 'Goa 4D3N Bliss Package' });
    await Offer.deleteMany({ title: 'Flash Sale: Goa Hotel Luxury Stay' });
    await PackageBooking.deleteMany({});
    await OfferBooking.deleteMany({});
    await Booking.deleteMany({});
    await Payment.deleteMany({});

    await mongoose.disconnect();
  }
}

runTest().catch((err) => {
  console.error('❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
