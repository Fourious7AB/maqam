const http = require('http');
const app = require('../app');
const mongoose = require('mongoose');
const User = require('../modules/auth/auth.model');
const { generateTokens } = require('../middleware/auth');

async function testOfferBookingsMe() {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`Server running on test port ${port}`);

  function makeRequest(path, headers = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method: 'GET',
          headers,
        },
        res => {
          let body = '';
          res.on('data', chunk => (body += chunk));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(body) });
            } catch (e) {
              resolve({ status: res.statusCode, body });
            }
          });
        }
      );
      req.on('error', reject);
      req.end();
    });
  }

  try {
    // 1. Unauthenticated request should return 401
    const unauthRes = await makeRequest('/api/v1/offers/bookings/me');
    console.log('1. Unauthenticated status:', unauthRes.status);
    if (unauthRes.status !== 401) {
      throw new Error(`Expected 401, got ${unauthRes.status}`);
    }

    // 2. Find an existing user or use a valid user ObjectId
    let user = await User.findOne({ role: 'customer' });
    if (!user) {
      user = await User.findOne();
    }
    console.log('Using test user id:', user ? user._id : 'None found');
    if (!user) {
      console.log('No user found in DB, test ends cleanly.');
      return;
    }

    const { accessToken } = generateTokens(user._id.toString(), user.role || 'customer');

    const authRes = await makeRequest('/api/v1/offers/bookings/me?page=1&limit=5', {
      Authorization: `Bearer ${accessToken}`,
    });

    console.log('2. Authenticated status:', authRes.status);
    console.log('   Response message:', authRes.body.message);
    console.log('   Data count:', authRes.body.data ? authRes.body.data.length : 'N/A');
    console.log('   Pagination meta:', authRes.body.meta);

    if (authRes.status === 200 && authRes.body.success === true && Array.isArray(authRes.body.data)) {
      console.log('SUCCESS: /api/v1/offers/bookings/me works as expected!');
    } else {
      throw new Error(`Unexpected body: ${JSON.stringify(authRes.body)}`);
    }

    // 3. Verify /bookings/:id does not hijack /bookings/me
    const dummyBookingId = new mongoose.Types.ObjectId();
    const singleBookingRes = await makeRequest(`/api/v1/offers/bookings/${dummyBookingId}`, {
      Authorization: `Bearer ${accessToken}`,
    });
    console.log('3. Single booking status (expected 404 for random ID):', singleBookingRes.status);
    if (singleBookingRes.status === 404) {
      console.log('SUCCESS: /bookings/:id correctly receives ID parameter and does not conflict with /bookings/me!');
    }
  } finally {
    server.close();
  }
}

testOfferBookingsMe()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
