'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const http = require('http');

const app = require('../app');
const srdvFlightClient = require('../providers/srdv/srdv.client');
const srdvHotelClient = require('../providers/hotels/srdv/srdv-hotel.client');
const { searchFlightsService, getFareQuoteService } = require('../modules/flights/flight.service');
const { searchHotels } = require('../modules/hotels/application/hotel-search.usecase');

async function runVerification() {
  console.log('\n================================================================');
  console.log('🚀 COMPREHENSIVE E2E VERIFICATION OF SRDV TEST SANDBOX INTEGRATION');
  console.log('================================================================\n');

  console.log('1. Checking Database Connectivity...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('   ✅ MongoDB connected successfully.');

  const departDate = new Date(Date.now() + 86400000 * 20).toISOString().split('T')[0];
  const hotelCheckIn = new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0];
  const hotelCheckOut = new Date(Date.now() + 86400000 * 17).toISOString().split('T')[0];

  console.log(`\n2. Direct Provider Call: SRDV Flight Search (DEL -> BOM on ${departDate})...`);
  const flightRaw = await srdvFlightClient.searchFlights({
    origin: 'DEL',
    destination: 'BOM',
    departDate: departDate,
    passengers: { AdultCount: 1, ChildCount: 0, InfantCount: 0 },
    journeyType: 'oneway',
  });
  if (flightRaw?.Error && flightRaw.Error.ErrorCode !== 0) {
    throw new Error(`Flight search failed: ${JSON.stringify(flightRaw.Error)}`);
  }
  const flightCount = flightRaw?.Results?.[0]?.length || 0;
  console.log(`   ✅ Direct Flight Search SUCCESS! TraceId: ${flightRaw.TraceId}, Available Flights: ${flightCount}`);

  const sampleFare = flightRaw?.Results?.[0]?.[0]?.FareDataMultiple?.[0];
  if (sampleFare) {
    console.log(`\n3. Direct Provider Call: SRDV FareQuote (TraceId: ${flightRaw.TraceId}, ResultIndex: ${sampleFare.ResultIndex})...`);
    const fqRaw = await srdvFlightClient.fareQuote({
      srdvType: flightRaw.SrdvType || 'MixAPI',
      traceId: flightRaw.TraceId,
      srdvIndex: sampleFare.SrdvIndex,
      resultIndex: sampleFare.ResultIndex,
    });
    if (fqRaw?.Error && fqRaw.Error.ErrorCode !== 0) {
      throw new Error(`FareQuote failed: ${JSON.stringify(fqRaw.Error)}`);
    }
    console.log(`   ✅ Direct FareQuote SUCCESS! Quoted BaseFare: ₹${fqRaw.Results?.Fare?.BaseFare || fqRaw.Results?.OfferedFare}`);
  }

  console.log(`\n4. Direct Provider Call: SRDV Hotel Search (Dubai CityId 2922700, ${hotelCheckIn} to ${hotelCheckOut})...`);
  const hotelRaw = await srdvHotelClient.search({
    CheckInDate: hotelCheckIn,
    CheckOutDate: hotelCheckOut,
    NoOfNights: '2',
    BookingMode: '5',
    CountryCode: 'AE',
    CityId: '2922700',
    ResultCount: '10',
    PreferredCurrency: 'INR',
    GuestNationality: 'IN',
    RequestType: 'International',
    NoOfRooms: '1',
    RoomGuests: [{ NoOfAdults: '1', NoOfChild: '0', ChildAge: [] }],
    PreferredHotel: '',
    MaxRating: '5',
    MinRating: '0',
    ReviewScore: null,
    IsNearBySearchAllowed: false,
  });
  if (hotelRaw?.Error && hotelRaw.Error.ErrorCode !== 0) {
    throw new Error(`Hotel search failed: ${JSON.stringify(hotelRaw.Error)}`);
  }
  const hotelList = hotelRaw?.Results || hotelRaw?.HotelResult || [];
  console.log(`   ✅ Direct Hotel Search SUCCESS! Found ${hotelList.length} hotels in Dubai.`);

  console.log('\n5. Business Layer Call: Flight Service (searchFlightsService)...');
  const serviceFlightRes = await searchFlightsService({
    origin: 'DEL',
    destination: 'BOM',
    departDate: departDate,
    passengers: { adults: 1, children: 0, infants: 0 },
    journeyType: 'oneway',
  });
  console.log(`   ✅ Flight Service SUCCESS! TraceId: ${serviceFlightRes.traceId}, Outbound options: ${serviceFlightRes.outbound?.length}`);

  console.log('\n6. Business Layer Call: Hotel UseCase (searchHotels with cityName "dubai")...');
  const serviceHotelRes = await searchHotels({
    cityName: 'dubai',
    checkIn: `${hotelCheckIn}T00:00:00.000Z`,
    checkOut: `${hotelCheckOut}T00:00:00.000Z`,
    guestNationality: 'IN',
    currency: 'INR',
    rooms: [{ adults: 1, children: 0, childAges: [] }],
    minRating: 1,
    maxRating: 5,
  });
  console.log(`   ✅ Hotel UseCase SUCCESS! SearchId: ${serviceHotelRes.searchId}, Mapped Hotels: ${serviceHotelRes.hotels?.length}`);

  console.log('\n7. Live Express HTTP API Call via Localhost Port...');
  const testPort = 5098;
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(testPort, resolve));
  console.log(`   ✅ Express server listening on http://localhost:${testPort}`);

  try {
    console.log('   Testing HTTP POST /api/v1/flights/search...');
    const httpFlightRes = await axios.post(`http://localhost:${testPort}/api/v1/flights/search`, {
      origin: 'DEL',
      destination: 'BOM',
      departureDate: departDate,
      journeyType: 'oneway',
      passengers: { adults: 1, children: 0, infants: 0 },
    }, { timeout: 60000 });
    console.log(`   ✅ HTTP Flight Search: Status ${httpFlightRes.status}, Received TraceId: ${httpFlightRes.data.data?.traceId}`);

    console.log('   Testing HTTP POST /api/v1/hotels/search...');
    const httpHotelRes = await axios.post(`http://localhost:${testPort}/api/v1/hotels/search`, {
      cityName: 'dubai',
      checkIn: `${hotelCheckIn}T00:00:00.000Z`,
      checkOut: `${hotelCheckOut}T00:00:00.000Z`,
      guestNationality: 'IN',
      currency: 'INR',
      rooms: [{ adults: 1, children: 0, childAges: [] }],
      minRating: 1,
      maxRating: 5,
    }, { timeout: 60000 });
    console.log(`   ✅ HTTP Hotel Search: Status ${httpHotelRes.status}, Received SearchId: ${httpHotelRes.data.data?.searchId}, Hotels Count: ${httpHotelRes.data.data?.hotels?.length}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    console.log('   ✅ Express test server closed.');
  }

  await mongoose.disconnect();
  console.log('\n================================================================');
  console.log('🎉 ALL E2E VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
  console.log('================================================================\n');
  process.exit(0);
}

runVerification().catch((err) => {
  console.error('\n❌ E2E VERIFICATION FAILED:', err);
  process.exit(1);
});
