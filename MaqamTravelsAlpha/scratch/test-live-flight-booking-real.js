const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
process.env.SRDV_TIMEOUT = '60000';

const User = require('../modules/auth/auth.model');
const Traveller = require('../modules/account/traveller.model');
const FlightBooking = require('../modules/flights/flight.model');
const Booking = require('../modules/bookings/booking.model');
const { getBullMQConnection } = require('../utils/redis');

const {
  searchFlightsService,
  getFareQuoteService,
  bookFlightService,
} = require('../modules/flights/flight.service');

async function testFlightBooking() {
  console.log('================================================================');
  console.log('✈️  LIVE SRDV FLIGHT BOOKING TEST WITH FRESH SEARCH & FAREQUOTE');
  console.log('================================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  console.log('1. Connecting to MongoDB & Redis...');
  await mongoose.connect(mongoUri);
  console.log('✔ MongoDB connected.');

  const redis = getBullMQConnection();
  await redis.ping();
  console.log('✔ Redis connected.\n');

  try {
    // 1. Get existing Customer & Traveller
    let customer = await User.findOne({ role: 'customer' });
    if (!customer) {
      const uPhone = '9' + Date.now().toString().slice(-9);
      customer = await User.create({
        firstName: 'Vais',
        lastName: 'Das',
        email: `flight.tester.${Date.now()}@example.com`,
        phone: uPhone,
        password: 'Password123!',
        role: 'customer',
        isVerified: true,
      });
      console.log('✔ Created test user:', customer.email);
    } else {
      console.log('✔ Using existing test user:', customer.email, `(ID: ${customer._id})`);
    }

    let traveller = await Traveller.findOne({ userId: customer._id });
    if (!traveller) {
      traveller = await Traveller.create({
        userId: customer._id,
        passengerType: 'Adult',
        title: 'Mr',
        firstName: 'Vais',
        lastName: 'Das',
        gender: 'Male',
        dateOfBirth: new Date('1995-04-12'),
        email: customer.email,
        phone: customer.phone,
        addressLine1: 'Flat 101, Lake View',
        city: 'Mumbai',
        countryCode: 'IN',
        countryName: 'INDIA',
        cellCountryCode: '+91',
      });
      console.log('✔ Created traveller profile:', traveller._id);
    } else {
      traveller.email = traveller.email || 'vaisdas99@gmail.com';
      traveller.phone = traveller.phone || '9876543210';
      await traveller.save();
      console.log('✔ Using existing traveller profile:', traveller._id, 'Email:', traveller.email);
    }

    // 2. Perform Fresh Flight Search
    const departureDate = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];
    console.log(`\n2. Searching live flights for DEL -> BOM on ${departureDate}...`);
    const searchRes = await searchFlightsService({
      origin: 'DEL',
      destination: 'BOM',
      departDate: departureDate,
      passengers: { adults: 1, children: 0, infants: 0 },
      journeyType: 'oneway',
    });

    const traceId = searchRes.traceId;
    console.log(`✔ Search successful! Live TraceId: ${traceId}`);
    const flights = searchRes.outbound || [];
    console.log(`✔ Found ${flights.length} available flight options.`);

    if (flights.length === 0) {
      throw new Error('No flights returned by SRDV search.');
    }

    const chosenFlight = flights[0];
    const fareOption = chosenFlight.fares[0];
    const resultIndex = fareOption.resultIndex;
    const isLCC = fareOption.isLCC;

    console.log(`   Selected Flight: ${chosenFlight.segments?.[0]?.airline} (${chosenFlight.segments?.[0]?.flightNo})`);
    console.log(`   ResultIndex: ${resultIndex}`);
    console.log(`   Type: ${isLCC ? 'LCC' : 'GDS'}`);
    console.log(`   Offered Fare: ₹${fareOption.offeredFare}`);

    // 3. Fare Quote
    console.log(`\n3. Calling Live FareQuote to verify and lock pricing...`);
    const fqRes = await getFareQuoteService(traceId, resultIndex);
    console.log(`✔ FareQuote successful! Locked Total: ₹${fqRes.totalAmount || fqRes.fare?.OfferedFare}`);

    // 4. Book Flight
    console.log(`\n4. Calling bookFlightService with clean passenger payload (no dummy SSR)...`);
    const bookingPayload = {
      userId: customer._id,
      traceId,
      resultIndex,
      passengers: [
        {
          travellerId: traveller._id,
          isLeadPax: true,
          meals: [],
          baggage: [],
          seats: [],
        },
      ],
    };

    const bookResult = await bookFlightService(bookingPayload);
    console.log('\n================================================================');
    console.log('🎉 LIVE FLIGHT BOOKING RESPONSE RECEIVED:');
    console.log('================================================================');
    console.log('Booking ID:     ', bookResult.bookingId);
    console.log('PNR:            ', bookResult.pnr);
    console.log('SRDV Booking ID:', bookResult.srdvBookingId);
    console.log('Status:         ', bookResult.status);
    console.log('isLCC:          ', bookResult.isLCC);
    console.log('Total Amount:   ', '₹' + bookResult.totalAmount);
    console.log('LastTicketDate: ', bookResult.lastTicketDate);
    console.log('================================================================\n');

    // 5. Inspect database record
    const savedDoc = await FlightBooking.findById(bookResult.bookingId).lean();
    console.log('5. Saved FlightBooking Document in MongoDB:');
    console.log(JSON.stringify(savedDoc, null, 2));

    const masterDoc = await Booking.findOne({ itemId: bookResult.bookingId, bookingType: 'flight' }).lean();
    if (masterDoc) {
      console.log('\nMaster Booking Record in MongoDB:');
      console.log(JSON.stringify(masterDoc, null, 2));
    }
  } catch (err) {
    console.error('\n❌ FLIGHT BOOKING FAILED:');
    console.error('Message:', err.message);
    if (err.response?.data) console.error('API Response Data:', err.response.data);
  } finally {
    await mongoose.disconnect();
  }
}

testFlightBooking().catch(console.error);
