const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const redisOps = require('../utils/cache');
const { bookFlightService } = require('../modules/flights/flight.service');
const paypalService = require('../modules/payments/gateways/paypal/paypal.service');
const { ensureBookingConfirmed } = require('../modules/payments/bookingSync');
const FlightBooking = require('../modules/flights/flight.model');
const Payment = require('../modules/payments/payment.model');
const Booking = require('../modules/bookings/booking.model');
const User = require('../modules/auth/auth.model');
const Traveller = require('../modules/account/traveller.model');
const srdvAdapter = require('../providers/srdv/srdv.adapter');

async function testFlightBookAndPaymentFlow() {
  console.log("==================================================");
  console.log("STARTING FLIGHT /book & PAYPAL PAYMENT FLOW TEST");
  console.log("==================================================");

  console.log("\n1. Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Database connected successfully!");

  try {
    // Step A: Ensure test User & Traveller exist
    let user = await User.findOne({ email: "test.flight.user@example.com" });
    if (!user) {
      user = await User.create({
        firstName: "Flight",
        lastName: "Tester",
        name: "Flight Tester",
        email: "test.flight.user@example.com",
        password: "Password123!",
        phone: "9876543210",
        role: "customer"
      });
    }

    let traveller = await Traveller.findOne({ userId: user._id });
    if (!traveller) {
      traveller = await Traveller.create({
        userId: user._id,
        title: "Mr",
        firstName: "Rahul",
        lastName: "Sharma",
        dateOfBirth: new Date("1992-08-15"),
        gender: "Male",
        passengerType: "Adult",
        email: "rahul.sharma@example.com",
        phone: "9876543210",
        countryCode: "IN",
        countryName: "INDIA"
      });
    }

    const traceId = `test_trace_${Date.now()}`;
    const resultIndex = "OB1_TEST_INDEX";

    // Step B: Set up Redis cached fare quote snapshot (mimicking GET /fare-quote)
    console.log("\n2. Setting up cached FareQuote in Redis...");
    const fareQuoteCacheKey = `flight:farequote:${traceId}:${resultIndex}`;
    const mockFareQuote = {
      entries: [
        {
          srdvType: "MixAPI",
          resultIndex: resultIndex,
          srdvIndex: "1",
          isLCC: true,
          fare: {
            OfferedFare: 4500,
            BaseFare: 3500,
            Tax: 1000
          }
        }
      ],
      isGstMandatory: false,
      required: {}
    };

    await redisOps.set(fareQuoteCacheKey, mockFareQuote, 30 * 60 * 1000);
    console.log(`✅ Cached FareQuote key set: ${fareQuoteCacheKey}`);

    // Mock srdvAdapter.ticketLCCAdapter to avoid calling real external SRDV API with mock traceId
    const originalTicketLCC = srdvAdapter.ticketLCCAdapter;
    srdvAdapter.ticketLCCAdapter = async () => ({
      traceId,
      srdvType: "MixAPI",
      pnr: "PNR_MOCK_TEST",
      srdvBookingId: 887766,
      ticketStatus: "OK",
      invoiceNo: "INV_MOCK_123",
      invoiceStatus: "COMPLETED",
      passengers: [
        {
          title: "Mr",
          firstName: "Rahul",
          lastName: "Sharma",
          paxType: "1",
          ticketNumber: "TICK_123456",
          ticketId: "TID_123",
          ticketIssueDate: new Date(),
          ticketStatus: "OK"
        }
      ],
      eTicketData: {
        FlightItinerary: {
          Origin: "DEL",
          Destination: "BOM",
          Segments: [
            [{ Origin: { AirportCode: "DEL", DepTime: new Date() }, Destination: { AirportCode: "BOM", ArrTime: new Date() } }]
          ]
        }
      },
      status: "confirmed"
    });

    // Step C: Execute bookFlightService (/book endpoint logic)
    console.log("\n3. Executing bookFlightService (POST /api/v1/flights/book)...");
    const bookResult = await bookFlightService({
      userId: user._id,
      traceId,
      resultIndex,
      passengers: [
        {
          travellerId: traveller._id,
          isLeadPax: true
        }
      ]
    });

    console.log("✅ Flight /book Result returned to frontend:");
    console.log(JSON.stringify(bookResult, null, 2));

    // Verify key fields in /book output
    if (!bookResult.bookingId || !bookResult.amount || !bookResult.totalAmount || bookResult.paymentRequired !== true) {
      throw new Error("❌ /book response missing required amount or bookingId fields!");
    }
    console.log(`✅ Verified amount: ₹${bookResult.amount}, totalAmount: ₹${bookResult.totalAmount}, bookingId: ${bookResult.bookingId}`);

    // Step D: Simulate PayPal Payment Order Creation
    console.log("\n4. Creating PayPal Payment Order (POST /api/v1/payments/paypal/create-order)...");
    const paypalClient = require('../modules/payments/gateways/paypal/paypal.client');
    const originalCreateOrder = paypalClient.orders.create;
    paypalClient.orders.create = async (amount, bookingId, currency) => ({
      orderId: `PAYPAL_ORDER_TEST_${Date.now()}`,
      redirectUrl: "https://www.sandbox.paypal.com/checkoutnow?token=mock_token",
      raw: {}
    });

    const paypalOrderResult = await paypalService.createPaymentOrder(user._id, bookResult.bookingId, 'flight');
    console.log("✅ PayPal Order Created:");
    console.log(JSON.stringify(paypalOrderResult, null, 2));

    // Restore original client create method
    paypalClient.orders.create = originalCreateOrder;

    // Step E: Simulate PayPal Payment Capture & Synchronization
    console.log("\n5. Capturing PayPal Payment & Synchronizing Booking...");
    const payment = await Payment.findById(paypalOrderResult.paymentId);
    payment.status = 'paid';
    payment.gatewayData.captureId = `PAYPAL_CAPTURE_${Date.now()}`;
    payment.paidAt = new Date();
    await payment.save();

    const syncResult = await ensureBookingConfirmed(payment);
    console.log("✅ Post-payment sync completed!");
    console.log(`FlightBooking status: ${syncResult.booking.status}, paymentId: ${syncResult.booking.paymentId}`);
    
    if (syncResult.masterBooking) {
      console.log(`✅ Master Booking created: ID ${syncResult.masterBooking._id}`);
      console.log(`Master Booking ItemId: ${syncResult.masterBooking.itemId} (matches FlightBooking _id: ${syncResult.booking._id.equals(syncResult.masterBooking.itemId)})`);
      console.log(`Master Booking Details:`, JSON.stringify(syncResult.masterBooking.details, null, 2));
    } else {
      throw new Error("❌ Master Booking was NOT created!");
    }

    // Clean up test data
    console.log("\n6. Cleaning up test documents from database...");
    await Payment.findByIdAndDelete(payment._id);
    if (syncResult.masterBooking) await Booking.findByIdAndDelete(syncResult.masterBooking._id);
    await FlightBooking.findByIdAndDelete(bookResult.bookingId);
    await redisOps.del(fareQuoteCacheKey);

    // Restore adapter
    srdvAdapter.ticketLCCAdapter = originalTicketLCC;

    console.log("\n==================================================");
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
    console.log("==================================================");

  } catch (error) {
    console.error("❌ Test failed with error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
  }
}

testFlightBookAndPaymentFlow();
