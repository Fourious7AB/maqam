const mongoose = require('mongoose');
require('dotenv').config();
const HotelCity = require('../modules/hotels/hotelCity.model');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const cities = await HotelCity.find({
    cityName: { $in: ['New Delhi', 'Delhi', 'Mumbai', 'Goa', 'Jaipur', 'Bangalore'] },
    countryCode: 'IN'
  });
  console.log(cities.map(c => ({ id: c.cityId, name: c.cityName, code: c.countryCode })));
  process.exit(0);
})();
