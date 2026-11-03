const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Ensure all Mongoose models are registered
const User = require('../modules/auth/auth.model');
const Hotel = require('../modules/hotels/hotelEntity.model');
const HotelStock = require('../modules/packages/stock/hotelStock.model');
const TicketStock = require('../modules/packages/stock/ticketStock.model');
const Offer = require('../modules/packages/offers/offer.model');
const OfferBooking = require('../modules/packages/offers/offerBooking.model');
const Booking = require('../modules/bookings/booking.model');
const Payment = require('../modules/payments/payment.model');

const { generateTokens } = require('../middleware/auth');
const { availabilityForOffer } = require('../modules/packages/core/availability.service');
const bookingSync = require('../modules/payments/bookingSync');

const BASE_URL = 'http://localhost:5000/api/v1';

async function runOfferBookingTests() {
  console.log('===============================================================');
  console.log('🏖️  OFFERS BOOKING END-TO-END TEST SUITE');
  console.log('===============================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  console.log('1. Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✔ Connected to MongoDB.\n');

  try {
    // ─── STEP 1: Find Customer & Generate JWT ───
    let customer = await User.findOne({ role: 'customer' });
    if (!customer) {
      customer = await User.create({
        firstName: 'Test',
        lastName: 'Customer',
        email: `test_offer_cust_${Date.now()}@example.com`,
        phone: '9876543210',
        password: 'Password123!',
        role: 'customer',
        isVerified: true,
      });
      console.log('✔ Created test customer:', customer.email);
    } else {
      console.log('✔ Using existing customer:', customer.email, `(ID: ${customer._id})`);
    }

    const { accessToken } = generateTokens(customer._id, customer.role);
    const authHeaders = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    // ─── STEP 2: Find Active Offer with Available Stock ───
    console.log('\n2. Finding an active offer with available stock...');
    const allOffers = await Offer.find({ isActive: true })
      .populate('flightRef.stock')
      .populate('hotelRef.stock');

    let targetOffer = null;
    let targetStockDoc = null;
    let targetRef = null;

    for (const off of allOffers) {
      const isFlight = off.itemType === 'flight';
      const ref = isFlight ? off.flightRef : off.hotelRef;
      const stockDoc = ref?.stock;
      if (!stockDoc) continue;

      const avail = availabilityForOffer(stockDoc, ref.unitsPerBooking || 1);
      if (avail >= 2) {
        targetOffer = off;
        targetStockDoc = stockDoc;
        targetRef = ref;
        break;
      }
    }

    if (!targetOffer) {
      console.log('⚠️ No existing offer has >= 2 available units. Let us inspect what exists or seed a fresh stock batch...');
      // If none has >= 2, pick any with >= 1 or reset some units
      for (const off of allOffers) {
        const isFlight = off.itemType === 'flight';
        const ref = isFlight ? off.flightRef : off.hotelRef;
        const stockDoc = ref?.stock;
        if (stockDoc) {
          // Reset 5 units to available for testing
          let resetCount = 0;
          for (const u of stockDoc.units) {
            if (u.status !== 'available' && resetCount < 5) {
              u.status = 'available';
              u.claimedBy = null;
              resetCount++;
            }
          }
          await stockDoc.save();
          targetOffer = off;
          targetStockDoc = stockDoc;
          targetRef = ref;
          console.log(`✔ Replenished ${resetCount} units for offer "${off.title}".`);
          break;
        }
      }
    }

    if (!targetOffer) {
      throw new Error('No active offer found with valid stock in database.');
    }

    const initialAvail = availabilityForOffer(targetStockDoc, targetRef.unitsPerBooking || 1);
    console.log(`✔ Selected Offer: "${targetOffer.title}"`);
    console.log(`   Type: ${targetOffer.itemType.toUpperCase()}`);
    console.log(`   Offer ID: ${targetOffer._id}`);
    console.log(`   Price: ₹${targetOffer.sellPrice}`);
    console.log(`   Destination: ${targetOffer.destination}`);
    console.log(`   Current Available Bookings: ${initialAvail}`);

    // ─── STEP 3: Test GET /api/v1/offers (Public Browse) ───
    console.log('\n3. Testing GET /api/v1/offers (Public Browse API)...');
    const listRes = await axios.get(`${BASE_URL}/offers`);
    console.log(`✔ HTTP ${listRes.status}: Retrieved ${listRes.data.offers?.length ?? listRes.data.data?.length ?? 0} offers.`);

    // ─── STEP 4: Test GET /api/v1/offers/:id (Public Details) ───
    console.log(`\n4. Testing GET /api/v1/offers/${targetOffer._id} (Public Offer Details)...`);
    const detailRes = await axios.get(`${BASE_URL}/offers/${targetOffer._id}`);
    console.log(`✔ HTTP ${detailRes.status}: Retrieved offer details. Title: "${detailRes.data.offer?.title}"`);

    // ─── STEP 5: Test POST /api/v1/offers/:id/book (Customer Booking) ───
    console.log(`\n5. Testing POST /api/v1/offers/${targetOffer._id}/book (Create Offer Booking)...`);
    const bookingPayload = {
      quantity: 1,
      travellers: [
        {
          firstName: 'John',
          lastName: 'Doe',
          isLead: true,
          dateOfBirth: '1990-01-01',
        },
      ],
    };

    const bookRes = await axios.post(
      `${BASE_URL}/offers/${targetOffer._id}/book`,
      bookingPayload,
      authHeaders
    );

    console.log(`✔ HTTP ${bookRes.status}: Offer booking response received:`);
    const bookingData = bookRes.data.data || bookRes.data.booking;
    const bookingId = bookingData._id || bookingData.bookingId;
    console.log(`   Booking ID: ${bookingId}`);
    console.log(`   Status: ${bookingData.status}`);
    console.log(`   Total Amount: ₹${bookingData.totalAmount}`);

    // Verify claimed units
    const claimedUnits = (bookingData.claimedFlightUnits || []).concat(bookingData.claimedHotelUnits || []);
    console.log(`   Claimed Units Count: ${claimedUnits.length}`);
    if (claimedUnits.length === 0) {
      throw new Error('Expected at least 1 claimed stock unit!');
    }

    // ─── STEP 6: Verify MongoDB State for Booking 1 ───
    console.log('\n6. Verifying database state for created booking...');
    const offerBookingInDb = await OfferBooking.findById(bookingId);
    console.log(`✔ OfferBooking in DB: Status = "${offerBookingInDb.status}", Quantity = ${offerBookingInDb.quantity}`);

    const masterBookingInDb = await Booking.findOne({ itemId: bookingId, bookingType: 'offer' });
    if (!masterBookingInDb) {
      throw new Error('Master Booking record was NOT created in DB!');
    }
    console.log(`✔ Master Booking in DB: ID = ${masterBookingInDb._id}, Status = "${masterBookingInDb.status}", Destination = "${masterBookingInDb.details?.destination}"`);

    // Verify unit status in Stock document is 'locked'
    const StockModel = targetOffer.itemType === 'flight' ? TicketStock : HotelStock;
    const stockBatch = await StockModel.findById(targetStockDoc._id);
    const claimedUnitId = claimedUnits[0].unitId;
    const unitInBatch = stockBatch.units.id(claimedUnitId);
    console.log(`✔ Stock Unit ${claimedUnitId} status in DB: "${unitInBatch.status}" (Expected: "assigned")`);
    if (unitInBatch.status !== 'assigned') {
      throw new Error(`Expected unit status to be "assigned", got "${unitInBatch.status}"`);
    }

    // ─── STEP 7: Test GET /api/v1/offers/bookings/:id ───
    console.log(`\n7. Testing GET /api/v1/offers/bookings/${bookingId} (Customer fetch)...`);
    const getBookingRes = await axios.get(`${BASE_URL}/offers/bookings/${bookingId}`, authHeaders);
    console.log(`✔ HTTP ${getBookingRes.status}: Booking fetched successfully. Status: ${getBookingRes.data.data?.status}`);

    // ─── STEP 8: Test Payment Capture & Transition to 'confirmed' & 'used' ───
    console.log('\n8. Testing Payment Capture (Syncing to "confirmed" and stock to "used")...');
    const mockPayment = new Payment({
      userId: customer._id,
      bookingId: bookingId,
      bookingType: 'offer',
      bookingModel: 'OfferBooking',
      amount: offerBookingInDb.totalAmount,
      currency: 'INR',
      paymentMethod: 'paypal',
      gateway: 'paypal',
      status: 'captured',
      gatewayData: {
        orderId: `PAYPAL_ORDER_${Date.now()}`,
        captureId: `PAYPAL_CAP_${Date.now()}`,
        transactionId: `TXN_${Date.now()}`,
      },
    });
    await mockPayment.save();
    console.log(`✔ Created Payment record: ${mockPayment._id}`);

    // Call bookingSync to simulate post-payment state machine (same as PayPal/Razorpay capture)
    await bookingSync.ensureBookingConfirmed(mockPayment);

    // Verify OfferBooking is now confirmed
    const confirmedBooking = await OfferBooking.findById(bookingId);
    console.log(`✔ OfferBooking Status after payment: "${confirmedBooking.status}" (Expected: "confirmed")`);
    if (confirmedBooking.status !== 'confirmed') {
      throw new Error(`Expected OfferBooking status to be "confirmed", got "${confirmedBooking.status}"`);
    }

    // Verify MasterBooking is now confirmed
    const confirmedMasterBooking = await Booking.findOne({ itemId: bookingId, bookingType: 'offer' });
    console.log(`✔ Master Booking Status after payment: "${confirmedMasterBooking.status}" (Expected: "confirmed")`);
    if (confirmedMasterBooking.status !== 'confirmed') {
      throw new Error(`Expected Master Booking status to be "confirmed", got "${confirmedMasterBooking.status}"`);
    }

    // Verify stock unit is now 'used'
    const updatedStockBatch = await StockModel.findById(targetStockDoc._id);
    const usedUnit = updatedStockBatch.units.id(claimedUnitId);
    console.log(`✔ Stock Unit ${claimedUnitId} status after payment: "${usedUnit.status}" (Expected: "used")`);
    if (usedUnit.status !== 'used') {
      throw new Error(`Expected unit status to be "used", got "${usedUnit.status}"`);
    }

    // ─── STEP 9: Test Booking Cancellation & Stock Release ───
    console.log('\n9. Testing Booking Cancellation & Stock Release back to "available"...');
    // Create a 2nd booking specifically to test cancellation
    console.log('   Creating second offer booking to cancel...');
    const bookRes2 = await axios.post(
      `${BASE_URL}/offers/${targetOffer._id}/book`,
      {
        quantity: 1,
        travellers: [{ firstName: 'Jane', lastName: 'Smith', isLead: true }],
      },
      authHeaders
    );
    const bookingData2 = bookRes2.data.data || bookRes2.data.booking;
    const bookingId2 = bookingData2._id || bookingData2.bookingId;
    const claimedUnits2 = (bookingData2.claimedFlightUnits || []).concat(bookingData2.claimedHotelUnits || []);
    const claimedUnitId2 = claimedUnits2[0].unitId;
    console.log(`✔ Second Booking Created: ${bookingId2}, Claimed Unit: ${claimedUnitId2}`);

    // Cancel via HTTP API POST /api/v1/offers/bookings/:id/cancel
    console.log(`   Calling POST /api/v1/offers/bookings/${bookingId2}/cancel...`);
    const cancelRes = await axios.post(
      `${BASE_URL}/offers/bookings/${bookingId2}/cancel`,
      { reason: 'Customer changed travel dates' },
      authHeaders
    );
    console.log(`✔ HTTP ${cancelRes.status}: Cancel response received. Status: ${cancelRes.data.data?.status}`);

    // Verify in DB that booking status is 'cancelled'
    const cancelledBookingDoc = await OfferBooking.findById(bookingId2);
    console.log(`✔ Second OfferBooking status in DB: "${cancelledBookingDoc.status}" (Expected: "cancelled")`);
    if (cancelledBookingDoc.status !== 'cancelled') {
      throw new Error(`Expected status "cancelled", got "${cancelledBookingDoc.status}"`);
    }

    // Verify master booking status is 'cancelled'
    const cancelledMasterDoc = await Booking.findOne({ itemId: bookingId2, bookingType: 'offer' });
    console.log(`✔ Second Master Booking status in DB: "${cancelledMasterDoc.status}" (Expected: "cancelled")`);
    if (cancelledMasterDoc.status !== 'cancelled') {
      throw new Error(`Expected Master Booking status "cancelled", got "${cancelledMasterDoc.status}"`);
    }

    // Verify stock unit was released back to 'available'
    const stockAfterCancel = await StockModel.findById(targetStockDoc._id);
    const releasedUnit = stockAfterCancel.units.id(claimedUnitId2);
    console.log(`✔ Stock Unit ${claimedUnitId2} status in DB: "${releasedUnit.status}" (Expected: "available")`);
    if (releasedUnit.status !== 'available') {
      throw new Error(`Expected unit status to be restored to "available", got "${releasedUnit.status}"`);
    }

    console.log('\n===============================================================');
    console.log('🎉 ALL OFFER BOOKING TESTS PASSED FLAWLESSLY!');
    console.log('===============================================================\n');
  } finally {
    await mongoose.disconnect();
  }
}

runOfferBookingTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err.response?.data || err.message);
  process.exit(1);
});
