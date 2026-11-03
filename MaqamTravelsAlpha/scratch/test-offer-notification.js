'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const User = require('../modules/auth/auth.model');
const Hotel = require('../modules/hotels/hotelEntity.model');
const HotelStock = require('../modules/packages/stock/hotelStock.model');
const TicketStock = require('../modules/packages/stock/ticketStock.model');
const Offer = require('../modules/packages/offers/offer.model');
const OfferBooking = require('../modules/packages/offers/offerBooking.model');
const Booking = require('../modules/bookings/booking.model');
const Payment = require('../modules/payments/payment.model');
const NotificationLog = require('../modules/notifications/notification.model');

const offerBookingService = require('../modules/packages/offers/offerBooking.service');
const paypalClient = require('../modules/payments/gateways/paypal/paypal.client');
const paypalService = require('../modules/payments/gateways/paypal/paypal.service');
const { ensureBookingConfirmed } = require('../modules/payments/bookingSync');

async function testOfferNotification() {
  console.log('===============================================================');
  console.log('🎯 TESTING OFFER BOOKING NOTIFICATION PIPELINE');
  console.log('===============================================================\n');

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/travel_agency_test';
  await mongoose.connect(mongoUri);
  console.log('✔ Connected to MongoDB successfully.');

  // Mock PayPal Client capture to simulate successful payment
  const originalPaypalCapture = paypalClient.orders.capture;
  paypalClient.orders.capture = async (orderId) => ({
    transactionId: `PAYPAL_OFFER_TEST_${Date.now()}`,
    amount: 4500,
    status: 'COMPLETED',
    raw: { status: 'COMPLETED' },
  });

  try {
    const testEmail = 'vaisdt81@gmail.com';

    // 1. Find or create the user with vaisdt81@gmail.com
    let user = await User.findOne({ email: testEmail });
    if (!user) {
      user = await User.create({
        firstName: 'Vais',
        lastName: 'Customer',
        email: testEmail,
        phone: '+919876543210',
        password: 'Password@123',
        role: 'customer',
      });
      console.log(`✔ Created test user: ${user.firstName} ${user.lastName} (${user.email})`);
    } else {
      console.log(`✔ Found existing user: ${user.firstName} ${user.lastName} (${user.email})`);
    }

    // 2. Set up Hotel & Stock & Offer
    const hotel = await Hotel.create({
      name: 'Goa Grand Resort',
      destination: 'Goa',
      address: 'Calangute Beach',
      isActive: true,
      createdBy: user._id,
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
      ],
      createdBy: user._id,
    });

    const offer = await Offer.create({
      title: 'Exclusive Goa Beach Getaway (Special Offer)',
      description: 'Exclusive 40% discount for luxury suite in Goa',
      destination: 'Goa, India',
      itemType: 'hotel',
      hotelRef: { stock: hotelStock._id, unitsPerBooking: 1 },
      sellPrice: 4500,
      startDate: new Date(Date.now() + 86400000 * 5),
      endDate: new Date(Date.now() + 86400000 * 8),
      isActive: true,
      createdBy: user._id,
    });
    console.log(`✔ Created Offer: "${offer.title}" (ID: ${offer._id})`);

    // 3. Create Offer Booking for this user
    console.log('\n--- Step 1: Creating Offer Booking ---');
    const bookingResult = await offerBookingService.createOfferBooking({
      userId: user._id,
      offerId: offer._id,
      travellers: [{ travellerId: new mongoose.Types.ObjectId(), isLead: true }],
      quantity: 1,
    });
    console.log('✔ Offer Booking created:', bookingResult.bookingId, 'Status:', bookingResult.status, 'Total: ₹' + bookingResult.totalAmount);

    // 4. Create PayPal Order
    console.log('\n--- Step 2: Creating Payment Order ---');
    const paypalOrder = await paypalService.createPaymentOrder(user._id, bookingResult.bookingId, 'offer');
    console.log('✔ PayPal Payment Order created:', paypalOrder.paypalOrderId);

    // 5. Capture Payment (Triggers bookingSync.js -> notificationService.sendBookingConfirmation)
    console.log('\n--- Step 3: Capturing Payment & Synchronizing Booking ---');
    const captureResult = await paypalService.captureAndVerifyPayment(paypalOrder.paypalOrderId, user._id);
    console.log('✔ Payment Captured. Status:', captureResult.status, 'PaymentId:', captureResult.paymentId);

    // 6. Verify OfferBooking & Master Booking
    const confirmedBooking = await OfferBooking.findById(bookingResult.bookingId);
    console.log('✔ OfferBooking Status:', confirmedBooking.status);

    const masterBooking = await Booking.findOne({ itemId: confirmedBooking._id, bookingType: 'offer' });
    console.log('✔ Master Booking Status:', masterBooking?.status, 'Reference:', masterBooking?.bookingReference);

    // 7. Poll for NotificationLog record for vaisdt81@gmail.com
    console.log(`\n--- Step 4: Checking Notification Pipeline for ${testEmail} ---`);
    const { processNotificationJob } = require('../workers/notifications/notification.worker');
    let notifDoc = null;
    for (let i = 0; i < 15; i++) {
      await new Promise((res) => setTimeout(res, 1000));
      notifDoc = await NotificationLog.findOne({
        'recipient.email': testEmail,
        channel: 'email',
        eventType: 'booking_confirmation',
      }).sort({ createdAt: -1 });

      if (notifDoc) {
        if (notifDoc.status === 'queued') {
          console.log(`  Processing queued job ${notifDoc._id}...`);
          await processNotificationJob(notifDoc._id);
          notifDoc = await NotificationLog.findById(notifDoc._id);
        }
        if (notifDoc.status === 'sent') {
          break;
        }
      }
      console.log(`  Waiting for notification worker... (Current status: ${notifDoc?.status || 'none yet'})`);
    }

    if (!notifDoc) {
      console.error('❌ NotificationLog record was not created!');
    } else {
      console.log('\n===============================================================');
      console.log('🎉 NOTIFICATION DISPATCH RESULT:');
      console.log('  Recipient:', notifDoc.recipient.email);
      console.log('  Event:', notifDoc.eventType);
      console.log('  Subject:', notifDoc.subject);
      console.log('  Status:', notifDoc.status);
      console.log('  Provider:', notifDoc.provider?.name);
      console.log('  Message ID:', notifDoc.provider?.messageId);
      if (notifDoc.provider?.response?.previewUrl) {
        console.log('  🔗 Preview Link:', notifDoc.provider.response.previewUrl);
      }
      console.log('===============================================================\n');
    }
  } finally {
    paypalClient.orders.capture = originalPaypalCapture;
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

testOfferNotification().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
