require('dotenv').config();
const axios = require('axios');

async function testAll() {
  const token = (process.env.SRDV_API_TOKEN || process.env.SRDV_API_KEY || '').replace(/['"]/g, '').replace(/\(.*\)/g, '').trim();
  const machineIp = '115.187.42.63';
  const envIp = process.env.SRDV_END_USER_IP || '115.187.42.133';

  console.log('--- Testing Flight Search ---');
  try {
    const flightRes = await axios.post((process.env.SRDV_API_BASE_FLIGHT_URL || 'https://api.srdvtest.com/flight/v8') + '/Search', {
      ClientId: process.env.SRDV_CLIENT_ID,
      UserName: process.env.SRDV_USERNAME,
      Password: process.env.SRDV_PASSWORD,
      AdultCount: 1,
      ChildCount: 0,
      InfantCount: 0,
      JourneyType: 1,
      DirectFlight: false,
      Segments: [{
        Origin: 'DEL',
        Destination: 'BOM',
        FlightCabinClass: 1,
        PreferredDepartureTime: '2026-11-20T00:00:00',
        PreferredArrivalTime: '2026-11-20T00:00:00',
      }],
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Api-Token': token,
        'X-API-Key': token,
      },
      timeout: 15000,
    });
    console.log('Flight Status:', flightRes.status);
    console.log('Flight Error field:', flightRes.data?.Error);
    console.log('Flight Results count:', flightRes.data?.Results?.length || 0);
    if (!flightRes.data?.Results?.length) {
      console.log('Flight Full Data:', JSON.stringify(flightRes.data).slice(0, 300));
    }
  } catch (err) {
    console.log('Flight Error:', err.response ? `${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message);
  }

  console.log('\n--- Testing Hotel with different EndUserIp ---');
  for (const ip of [envIp, machineIp, '1.1.1.1', '127.0.0.1']) {
    try {
      const res = await axios.post('https://api.srdvtest.com/hotel/v8/Search', {
        EndUserIp: ip,
        ClientId: process.env.SRDV_CLIENT_ID,
        UserName: process.env.SRDV_USERNAME,
        Password: process.env.SRDV_PASSWORD,
        BookingMode: 5,
        CheckInDate: '2026-11-10',
        NoOfNights: 2,
        CountryCode: 'IN',
        CityId: 130443,
        PreferredCurrency: 'INR',
        GuestNationality: 'IN',
        NoOfRooms: 1,
        RoomGuests: [{ NoOfAdults: 2, NoOfChild: 0, ChildAge: [] }]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Api-Token': token,
          'X-API-Key': token,
        },
        timeout: 10000,
      });
      console.log(`IP: ${ip} -> Status: ${res.status}, Error:`, res.data?.Error);
    } catch (err) {
      console.log(`IP: ${ip} -> Failed:`, err.response ? `${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message);
    }
  }

  console.log('\n--- Testing Other Hotel Endpoints (e.g. CountryList / CityList) ---');
  for (const ep of ['/CountryList', '/CityList', '/HotelCodeList', '/GetHotelInfo']) {
    try {
      const res = await axios.post(`https://api.srdvtest.com/hotel/v8${ep}`, {
        EndUserIp: machineIp,
        ClientId: process.env.SRDV_CLIENT_ID,
        UserName: process.env.SRDV_USERNAME,
        Password: process.env.SRDV_PASSWORD,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Api-Token': token,
          'X-API-Key': token,
        },
        timeout: 10000,
      });
      console.log(`Endpoint ${ep} -> Status: ${res.status}, Data:`, JSON.stringify(res.data).slice(0, 200));
    } catch (err) {
      console.log(`Endpoint ${ep} -> Failed:`, err.response ? `${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message);
    }
  }
}

testAll();
