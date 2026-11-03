const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const API_BASE = 'http://127.0.0.1:5000/api/v1';

async function testHttpFlightBook() {
  console.log('=== FULL END-TO-END HTTP TEST OF /book ===\n');

  // Step 1: Connect to DB to get test user & sign token
  await mongoose.connect(process.env.MONGO_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  let user = await User.findOne({ role: 'customer' });
  if (!user) user = await User.findOne({});
  const userId = user._id.toString();
  const token = jwt.sign({ id: userId, role: user.role || 'customer' }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
  console.log(`1. Test user authenticated: ${user.email || userId}`);

  // Step 2: HTTP Search
  console.log('\n2. Calling HTTP POST /api/v1/flights/search...');
  const searchRes = await axios.post(`${API_BASE}/flights/search`, {
    origin: 'DEL',
    destination: 'BOM',
    departureDate: '2026-11-25',
    journeyType: 'oneway',
    passengers: { adults: 1, children: 0, infants: 0 }
  });

  const traceId = searchRes.data.data.traceId;
  const firstFlight = searchRes.data.data.outbound[0];
  const resultIndex = firstFlight.fares[0].resultIndex;
  const airline = firstFlight.segments[0].airline;
  console.log(`✔ Search 200 OK: TraceId=${traceId}, Airline=${airline}, ResultIndex=${resultIndex}`);

  // Step 3: HTTP FareQuote
  console.log('\n3. Calling HTTP POST /api/v1/flights/farequote...');
  const fareRes = await axios.post(`${API_BASE}/flights/farequote`, {
    traceId,
    resultIndex
  });
  console.log(`✔ Farequote 200 OK! Locked fare: ₹${fareRes.data.data?.fare?.PublishedFare || fareRes.data.data?.fare?.OfferedFare}`);

  // Step 4: HTTP /book with Authorization Bearer token
  console.log('\n4. Calling HTTP POST /api/v1/flights/book...');
  const bookPayload = {
    traceId,
    resultIndex,
    passengers: [
      {
        travellerDetails: {
          title: 'Mr',
          firstName: 'Rahul',
          lastName: 'Sharma',
          passengerType: 'Adult',
          gender: 'Male',
          dateOfBirth: '1992-05-15',
          email: 'rahul.test@example.com',
          phone: '9876543210',
          cellCountryCode: '+91',
          addressLine1: 'Flat 402 Sunshine Tower',
          city: 'Mumbai',
          countryCode: 'IN',
          countryName: 'INDIA'
        },
        isLeadPax: true,
        saveToProfile: false,
        meals: [],
        baggage: [],
        seats: []
      }
    ]
  };

  const bookRes = await axios.post(`${API_BASE}/flights/book`, bookPayload, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('\n======================================================');
  console.log(`🎉 HTTP POST /book STATUS: ${bookRes.status} Created`);
  console.log('RESPONSE DATA:');
  console.log(JSON.stringify(bookRes.data, null, 2));
  console.log('======================================================');

  await mongoose.disconnect();
}

testHttpFlightBook().catch(err => {
  console.error('\n❌ Test failed:');
  if (err.response) {
    console.error(`Status ${err.response.status}:`, JSON.stringify(err.response.data, null, 2));
  } else {
    console.error(err.message);
  }
  process.exit(1);
});
