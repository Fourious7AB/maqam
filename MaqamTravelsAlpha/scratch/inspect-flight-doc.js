const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const FlightBooking = require('../modules/flights/flight.model');

async function inspectDoc() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);

  const docs = await FlightBooking.find({}).sort({ createdAt: -1 }).lean();
  console.log(JSON.stringify(docs, null, 2));

  await mongoose.disconnect();
}

inspectDoc().catch(console.error);
