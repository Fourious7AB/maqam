const mongoose = require('mongoose');
const assert = require('assert');
require('dotenv').config({ path: __dirname + '/../.env' });

const Offer = require('../modules/packages/offers/offer.model');
const OfferBooking = require('../modules/packages/offers/offerBooking.model');
const TicketStock = require('../modules/packages/stock/ticketStock.model');
const { createOfferBooking, getOfferBookingById } = require('../modules/packages/offers/offerBooking.service');
const { ensureBookingConfirmed } = require('../modules/payments/bookingSync');
const Payment = require('../modules/payments/payment.model');

async function runTests() {
  console.log('--- Starting Featured Flight Offer Flow Verification ---');
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  // 1. Verify flight offers exist
  const offer = await Offer.findOne({ itemType: 'flight', isActive: true }).populate('flightRef.stock');
  assert(offer, 'Active flight offer must exist in DB');
  console.log('✓ Found active flight offer:', offer.title, 'Price:', offer.sellPrice);

  const stock = offer.flightRef?.stock;
  assert(stock, 'Flight offer must reference a valid TicketStock');
  const availableUnits = stock.units.filter((u) => u.status === 'available');
  assert(availableUnits.length > 0, 'TicketStock must have available units');
  console.log('✓ TicketStock PNR:', stock.pnr, 'Available units:', availableUnits.length);

  // 2. Test createOfferBooking
  const mockUserId = new mongoose.Types.ObjectId();
  const travellers = [
    {
      title: 'Mr',
      firstName: 'Ahmed',
      lastName: 'Al-Mansoor',
      gender: 'Male',
      email: 'ahmed@test.com',
      phone: '+919876543210',
      isLead: true,
    },
  ];

  const bookingRes = await createOfferBooking({
    userId: mockUserId,
    offerId: offer._id,
    travellers,
    quantity: 1,
  });

  assert(bookingRes._id, 'Booking response must have _id');
  assert.strictEqual(bookingRes.status, 'pending', 'Booking status must be pending upon reservation');
  assert.strictEqual(bookingRes.claimedFlightUnits.length, 1, 'Must claim exactly 1 flight unit');
  console.log('✓ createOfferBooking succeeded. Booking ID:', bookingRes._id, 'Status:', bookingRes.status);

  // 3. Verify stock unit status changed to assigned
  const updatedStock = await TicketStock.findById(stock._id);
  const assignedUnit = updatedStock.units.find(
    (u) => String(u._id) === String(bookingRes.claimedFlightUnits[0].unitId)
  );
  assert(assignedUnit, 'Claimed unit must exist on TicketStock');
  assert.strictEqual(assignedUnit.status, 'assigned', 'Claimed unit must be assigned');
  console.log('✓ TicketStock unit correctly transitioned to assigned:', assignedUnit._id);

  // 4. Test ensureBookingConfirmed (simulating PayPal capture)
  const mockPayment = await Payment.create({
    userId: mockUserId,
    bookingId: bookingRes._id,
    bookingType: 'offer',
    bookingModel: 'OfferBooking',
    amount: bookingRes.totalAmount,
    currency: 'INR',
    paymentMethod: 'paypal',
    status: 'paid',
    gatewayData: {
      orderId: 'MOCK-PAYPAL-' + Date.now(),
      captureId: 'CAPTURE-' + Date.now(),
    },
  });

  const syncResult = await ensureBookingConfirmed(mockPayment);
  assert(syncResult?.booking, 'Sync result must return confirmed booking');
  assert.strictEqual(syncResult.booking.status, 'confirmed', 'OfferBooking status must be confirmed');
  console.log('✓ ensureBookingConfirmed succeeded. Booking status:', syncResult.booking.status);

  // 5. Verify TicketStock unit changed to used
  const finalStock = await TicketStock.findById(stock._id);
  const usedUnit = finalStock.units.find(
    (u) => String(u._id) === String(bookingRes.claimedFlightUnits[0].unitId)
  );
  assert.strictEqual(usedUnit.status, 'used', 'TicketStock unit must be marked used upon payment confirmation');
  console.log('✓ TicketStock unit successfully marked used:', usedUnit._id);

  // 6. Test getOfferBookingById
  const fetched = await getOfferBookingById(bookingRes._id, mockUserId);
  assert.strictEqual(fetched.status, 'confirmed', 'Fetched booking must have status confirmed');
  assert.strictEqual(fetched.travellers[0].firstName, 'Ahmed', 'Traveller firstName must be preserved');
  assert.strictEqual(fetched.travellers[0].lastName, 'Al-Mansoor', 'Traveller lastName must be preserved');
  console.log('✓ getOfferBookingById verified passenger details:', fetched.travellers[0].title, fetched.travellers[0].firstName, fetched.travellers[0].lastName);

  // Clean up test records
  await OfferBooking.deleteOne({ _id: bookingRes._id });
  await Payment.deleteOne({ _id: mockPayment._id });
  // Release the unit back so stock remains clean
  await TicketStock.updateOne(
    { _id: stock._id, 'units._id': usedUnit._id },
    {
      $set: {
        'units.$.status': 'available',
        'units.$.assignedToBooking': null,
        'units.$.assignedToBookingModel': null,
      },
    }
  );
  console.log('✓ Test cleanup complete.');

  console.log('--- ALL OFFER FLIGHT FLOW TESTS PASSED! ---');
  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
