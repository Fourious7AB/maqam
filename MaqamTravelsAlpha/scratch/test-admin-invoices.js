const http = require('http');
const app = require('../app');
const mongoose = require('mongoose');
const { generateTokens } = require('../middleware/auth');
const User = require('../modules/auth/auth.model');

async function testAdminInvoices() {
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
    // 1. Unauthenticated request -> 401
    const unauth = await makeRequest('/api/v1/invoices/admin/package');
    console.log('1. Unauthenticated /admin/package:', unauth.status);
    if (unauth.status !== 401) throw new Error(`Expected 401, got ${unauth.status}`);

    // Find admin user and customer user or mock
    const adminUser = await User.findOne({ role: { $in: ['admin', 'super_admin'] } });
    const customerUser = await User.findOne({ role: 'customer' });

    if (!adminUser) {
      console.log('No admin user found in database, testing route mounting only.');
      return;
    }

    // 2. Customer user request -> 403 Forbidden
    if (customerUser) {
      const { accessToken: custToken } = generateTokens(customerUser._id.toString(), 'customer');
      const custRes = await makeRequest('/api/v1/invoices/admin/package', {
        Authorization: `Bearer ${custToken}`,
      });
      console.log('2. Customer /admin/package (expected 403):', custRes.status);
      if (custRes.status !== 403) throw new Error(`Expected 403, got ${custRes.status}`);
    }

    // 3. Admin user request -> 200 OK for all 5 verticals
    const { accessToken: adminToken } = generateTokens(adminUser._id.toString(), adminUser.role || 'admin');

    const verticals = ['package', 'flight', 'hotel', 'offer', 'visa'];
    for (const vert of verticals) {
      const res = await makeRequest(`/api/v1/invoices/admin/${vert}?page=1&limit=5`, {
        Authorization: `Bearer ${adminToken}`,
      });
      console.log(`3. Admin /admin/${vert}: status = ${res.status}, success = ${res.body.success}, count = ${res.body.data?.length}`);
      if (res.status !== 200 || !res.body.success || !Array.isArray(res.body.data) || !res.body.meta) {
        throw new Error(`Failed for vertical ${vert}: ${JSON.stringify(res.body)}`);
      }
    }

    console.log('ALL TIER 2 ADMIN INVOICE ENDPOINTS VERIFIED SUCCESSFULLY!');
  } finally {
    server.close();
  }
}

testAdminInvoices()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  });

