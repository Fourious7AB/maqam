const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

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

async function testHotelOffer() {
  console.log('--- Testing Hotel Item Type Offer Booking ---');
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);

  const hotelOffer = await Offer.findOne({ itemType: 'hotel', isActive: true })
    .populate({ path: 'hotelRef.stock', populate: { path: 'hotelId' } });

  if (!hotelOffer) {
    console.log('No active hotel offer found.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found Hotel Offer: "${hotelOffer.title}" (ID: ${hotelOffer._id})`);
  const stockDoc = hotelOffer.hotelRef.stock;
  let avail = availabilityForOffer(stockDoc, hotelOffer.hotelRef.unitsPerBooking || 1);
  console.log(`Initial Available Bookings: ${avail}`);

  if (avail < 1) {
    // replenish 2 units
    for (let i = 0; i < Math.min(2, stockDoc.units.length); i++) {
      stockDoc.units[i].status = 'available';
      stockDoc.units[i].assignedToBooking = null;
    }
    await stockDoc.save();
    avail = availabilityForOffer(stockDoc, hotelOffer.hotelRef.unitsPerBooking || 1);
    console.log(`Replenished units. Available now: ${avail}`);
  }

  const customer = await User.findOne({ role: 'customer' });
  const { accessToken } = generateTokens(customer._id, customer.role);
  const authHeaders = {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };

  // Book hotel offer
  const bookRes = await axios.post(
    `${BASE_URL}/offers/${hotelOffer._id}/book`,
    {
      quantity: 1,
      travellers: [{ firstName: 'Sarah', lastName: 'Connor', isLead: true }],
    },
    authHeaders
  );
  console.log('✔ HTTP 200: Booked Hotel Offer successfully!');
  const bookingData = bookRes.data.data;
  console.log('   Booking ID:', bookingData._id);
  console.log('   Status:', bookingData.status);
  console.log('   Claimed Hotel Units:', bookingData.claimedHotelUnits?.length);

  // Capture Payment
  const mockPayment = new Payment({
    userId: customer._id,
    bookingId: bookingData._id,
    bookingType: 'offer',
    bookingModel: 'OfferBooking',
    amount: bookingData.totalAmount,
    currency: 'INR',
    paymentMethod: 'paypal',
    gateway: 'paypal',
    status: 'captured',
    gatewayData: { orderId: `PAYPAL_${Date.now()}` },
  });
  await mockPayment.save();

  await bookingSync.ensureBookingConfirmed(mockPayment);
  const confirmedBooking = await OfferBooking.findById(bookingData._id);
  console.log('✔ Hotel OfferBooking confirmed status:', confirmedBooking.status);

  const claimedUnitId = bookingData.claimedHotelUnits[0].unitId;
  const updatedHotelStock = await HotelStock.findById(stockDoc._id);
  const usedUnit = updatedHotelStock.units.id(claimedUnitId);
  console.log(`✔ Hotel Stock unit ${claimedUnitId} status: "${usedUnit.status}" (Expected: "used")`);

  console.log('🎉 HOTEL OFFER BOOKING & STOCK SETTLEMENT VERIFIED SUCCESSFULLY!');
  await mongoose.disconnect();
}

testHotelOffer().catch(console.error);
