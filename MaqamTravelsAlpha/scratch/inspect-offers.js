const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Offer = require('../modules/packages/offers/offer.model');
const User = require('../modules/auth/auth.model');
const HotelStock = require('../modules/packages/stock/hotelStock.model');
const TicketStock = require('../modules/packages/stock/ticketStock.model');

async function inspect() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  console.log('Connecting to:', mongoUri);
  await mongoose.connect(mongoUri);

  const usersCount = await User.countDocuments();
  const offers = await Offer.find({}).populate('flightRef.stock').populate('hotelRef.stock');
  console.log(`Found ${usersCount} users.`);
  console.log(`Found ${offers.length} offers:`);
  offers.forEach((o, i) => {
    console.log(`  [${i}] ID: ${o._id}, Title: "${o.title}", Type: ${o.itemType}, Active: ${o.isActive}, Price: ₹${o.sellPrice}`);
  });

  const hotelStocks = await HotelStock.find({});
  const ticketStocks = await TicketStock.find({});
  console.log(`Found ${hotelStocks.length} hotel stock batches, ${ticketStocks.length} ticket stock batches.`);

  await mongoose.disconnect();
}

inspect().catch(console.error);
