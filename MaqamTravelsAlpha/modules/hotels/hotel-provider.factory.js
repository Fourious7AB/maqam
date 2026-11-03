const { assertHotelProvider } = require('../../providers/hotels/contracts/hotel-provider.contract');

const providers = {
  srdv: () => require('../../providers/hotels/srdv/srdv-hotel.provider'),
};

const getHotelProvider = () => {
  const name = (process.env.HOTEL_PROVIDER || 'srdv').toLowerCase();
  if (!providers[name]) {
    throw new Error(`Unsupported HOTEL_PROVIDER: ${name}. Mock provider was deleted; configure HOTEL_PROVIDER=srdv in .env.`);
  }
  return assertHotelProvider(providers[name](), name);
};

module.exports = { getHotelProvider };
