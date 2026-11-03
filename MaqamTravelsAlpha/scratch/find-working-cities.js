'use strict';

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const HotelCity = require('../modules/hotels/hotelCity.model');
const hotelSearchUseCase = require('../modules/hotels/application/hotel-search.usecase');

async function findWorkingCities() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  // Let's find cities in India
  const cityNames = ['Mumbai', 'Goa', 'Jaipur', 'Bangalore', 'Kolkata', 'Chennai', 'Hyderabad', 'Agra', 'Udaipur', 'Shimla'];
  
  const checkIn = '2026-11-10';
  const checkOut = '2026-11-12';

  for (const name of cityNames) {
    const city = await HotelCity.findOne({ cityName: new RegExp(`^${name}$`, 'i'), countryCode: 'IN' });
    if (!city) {
      console.log(`City not found in DB: ${name}`);
      continue;
    }

    try {
      console.log(`\nTesting ${city.cityName} (ID: ${city.cityId}, Country: ${city.countryCode})...`);
      const res = await hotelSearchUseCase.searchHotels({
        cityId: String(city.cityId),
        countryCode: city.countryCode,
        cityName: city.cityName,
        checkIn,
        checkOut,
        guestNationality: 'IN',
        currency: 'INR',
        rooms: [{ adults: 2, children: 0, childAges: [] }],
        correlationId: `test-${city.cityId}`,
      });

      console.log(`  -> Result: ${res.hotels?.length || 0} hotels found!`);
      if (res.hotels && res.hotels.length > 0) {
        console.log(`  🏆 WORKING DOMESTIC CITY: ${city.cityName} (${city.cityId}) with ${res.hotels.length} hotels!`);
        break;
      }
    } catch (err) {
      console.log(`  -> Error: ${err.message}`);
    }
  }

  process.exit(0);
}

findWorkingCities().catch(console.error);
