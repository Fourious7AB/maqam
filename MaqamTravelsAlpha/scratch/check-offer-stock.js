const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Offer = require('../modules/packages/offers/offer.model');
const { availabilityForOffer } = require('../modules/packages/core/availability.service');

async function checkStock() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);

  const offers = await Offer.find({ isActive: true })
    .populate('flightRef.stock')
    .populate('hotelRef.stock');

  for (const o of offers) {
    const isFlight = o.itemType === 'flight';
    const ref = isFlight ? o.flightRef : o.hotelRef;
    const stockDoc = ref?.stock;
    if (!stockDoc) {
      console.log(`Offer ${o._id} (${o.title}) -> NO stockDoc found!`);
      continue;
    }
    const avail = availabilityForOffer(stockDoc, ref.unitsPerBooking || 1);
    const unitStatuses = (stockDoc.units || []).reduce((acc, u) => {
      acc[u.status] = (acc[u.status] || 0) + 1;
      return acc;
    }, {});
    console.log(`Offer [${o.itemType}]: "${o.title}" (ID: ${o._id})`);
    console.log(`  UnitsPerBooking: ${ref.unitsPerBooking}, AvailableBookings: ${avail}`);
    console.log(`  Unit Statuses:`, unitStatuses);
  }

  await mongoose.disconnect();
}

checkStock().catch(console.error);
