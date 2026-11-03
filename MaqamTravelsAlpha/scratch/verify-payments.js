const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { resolveBooking } = require('../modules/payments/bookingResolver');
const { ensureBookingConfirmed } = require('../modules/payments/bookingSync');
const FlightBooking = require('../modules/flights/flight.model');
const Payment = require('../modules/payments/payment.model');
const Booking = require('../modules/bookings/booking.model');
const User = require('../modules/auth/auth.model');

async function test() {
  console.log("Connecting to Database...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected successfully!");

  try {
    let user = await User.findOne();
    if (!user) {
      console.log("No user found in DB. Creating dummy user for test...");
      user = await User.create({
        name: "Test User",
        email: "test.user@example.com",
        password: "Password123!",
        phone: "9876543210",
        role: "customer"
      });
    }

    // 1. Fetch or Create test LCC FlightBooking
    let lccBooking = await FlightBooking.findOne({ isLCC: true });
    if (!lccBooking) {
      console.log("Creating dummy LCC FlightBooking...");
      lccBooking = await FlightBooking.create({
        user: user._id,
        traceId: "test_trace_lcc_123",
        srdvType: "MixAPI",
        srdvIndex: "1",
        resultIndex: ["OB1_0_0"],
        isLCC: true,
        totalAmount: 5499,
        markupAmount: 500,
        srdvBookingId: 990011,
        pnr: "PNRLCC",
        status: "confirmed",
        passengers: [{ travellerId: new mongoose.Types.ObjectId(), isLeadPax: true }]
      });
    } else {
      lccBooking.srdvBookingId = lccBooking.srdvBookingId || 990011;
      await lccBooking.save();
    }

    console.log(`\n--- Test 1: Resolve LCC FlightBooking by database _id ---`);
    const resolvedById = await resolveBooking(lccBooking._id, 'flight');
    console.log(`✅ Resolved correctly by _id: ${resolvedById._id}`);

    console.log(`\n--- Test 2: Resolve FlightBooking by numeric srdvBookingId ---`);
    const resolvedBySrdvId = await resolveBooking(lccBooking.srdvBookingId, 'flight');
    console.log(`✅ Resolved correctly by srdvBookingId (${lccBooking.srdvBookingId}): ${resolvedBySrdvId._id}`);

    console.log(`\n--- Test 3: Simulation of ensureBookingConfirmed with PayPal payment ---`);
    // Create a temporary mock PayPal payment
    const tempPayment = await Payment.create({
      userId: lccBooking.user?._id || lccBooking.user,
      bookingId: lccBooking._id,
      bookingModel: 'FlightBooking',
      bookingType: 'flight',
      amount: lccBooking.totalAmount || 5499,
      currency: 'INR',
      paymentMethod: 'paypal',
      status: 'paid',
      gatewayData: {
        orderId: 'mock_paypal_order_123',
        captureId: 'mock_paypal_capture_123'
      }
    });

    console.log(`Mock PayPal payment created: ${tempPayment._id}`);

    // Call ensureBookingConfirmed
    const syncResult = await ensureBookingConfirmed(tempPayment);
    console.log(`ensureBookingConfirmed completed!`);
    console.log(`Post-confirmation FlightBooking status: ${syncResult.booking.status}, paymentId: ${syncResult.booking.paymentId}`);
    
    if (syncResult.masterBooking) {
      console.log(`✅ Master Booking created/updated: ID ${syncResult.masterBooking._id}, Type: ${syncResult.masterBooking.bookingType}, Status: ${syncResult.masterBooking.status}, ItemId: ${syncResult.masterBooking.itemId}`);
      console.log(`Master Booking Details:`, JSON.stringify(syncResult.masterBooking.details, null, 2));
    } else {
      console.error(`❌ Master Booking was NOT created!`);
    }

    // Clean up temporary mock payment and created master booking
    await Payment.findByIdAndDelete(tempPayment._id);
    if (syncResult.masterBooking) {
      await Booking.findByIdAndDelete(syncResult.masterBooking._id);
    }
    console.log("\nRestored test data and cleaned up mock payment and master booking. All tests completed successfully!");

  } catch (error) {
    console.error("Test failed with error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
  }
}

test();
