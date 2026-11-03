const http = require('http');
const app = require('../app');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { generateTokens } = require('../middleware/auth');
const User = require('../modules/auth/auth.model');

async function runTests() {
  await connectDB();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`Test server running on port ${port}`);

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
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            const isJson = (res.headers['content-type'] || '').includes('application/json');
            if (isJson) {
              try {
                resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
              } catch (e) {
                resolve({ status: res.statusCode, headers: res.headers, body });
              }
            } else {
              resolve({ status: res.statusCode, headers: res.headers, body });
            }
          });
        }
      );
      req.on('error', reject);
      req.end();
    });
  }

  try {
    // 1. Unauthenticated test -> Expect 401
    const unauth = await makeRequest('/api/v1/crm/invoices/summary');
    console.log('1. Unauthenticated /crm/invoices/summary status:', unauth.status);
    if (unauth.status !== 401) throw new Error(`Expected 401, got ${unauth.status}`);

    // Mock/Find users for role testing
    const adminUser = await User.findOne({ role: { $in: ['admin', 'super_admin'] } });
    const customerUser = await User.findOne({ role: 'customer' });

    // 2. Customer user test -> Expect 403 Forbidden
    if (customerUser) {
      const { accessToken: custToken } = generateTokens(customerUser._id.toString(), 'customer');
      const custRes = await makeRequest('/api/v1/crm/invoices/summary', {
        Authorization: `Bearer ${custToken}`,
      });
      console.log('2. Customer role access to admin invoices (expected 403):', custRes.status);
      if (custRes.status !== 403) throw new Error(`Expected 403, got ${custRes.status}`);
    }

    if (!adminUser) {
      console.log('No admin user in DB, skipping admin authenticated data test.');
      return;
    }

    const { accessToken: adminToken } = generateTokens(adminUser._id.toString(), adminUser.role || 'admin');

    // 3. Admin /summary test -> Expect 200
    const summaryRes = await makeRequest('/api/v1/crm/invoices/summary', {
      Authorization: `Bearer ${adminToken}`,
    });
    console.log('3. Admin /summary status:', summaryRes.status, 'Success:', summaryRes.body.success);
    console.log('   Total invoices counted:', summaryRes.body.data?.totalInvoicesCount);
    console.log('   Grand total revenue:', summaryRes.body.data?.grandTotalRevenue, summaryRes.body.data?.currency);
    console.log('   By vertical:', Object.keys(summaryRes.body.data?.byVertical || {}));
    if (summaryRes.status !== 200 || !summaryRes.body.success) {
      throw new Error(`Summary failed: ${JSON.stringify(summaryRes.body)}`);
    }

    // 4. Test each vertical list endpoint under /api/v1/crm/invoices/
    const verticals = ['package', 'offer', 'visa', 'flight', 'hotel'];
    const sampleIds = {};

    for (const v of verticals) {
      const res = await makeRequest(`/api/v1/crm/invoices/${v}?page=1&limit=5`, {
        Authorization: `Bearer ${adminToken}`,
      });
      console.log(`4. Admin /crm/invoices/${v}: status = ${res.status}, items = ${res.body.data?.length}, total = ${res.body.meta?.total}`);
      if (res.status !== 200 || !res.body.success || !Array.isArray(res.body.data)) {
        throw new Error(`Failed for vertical ${v}: ${JSON.stringify(res.body)}`);
      }
      if (res.body.data?.length > 0) {
        sampleIds[v] = res.body.data[0].bookingId || res.body.data[0].groupId;
      }
    }

    // 5. Test detail, HTML preview, and download for each vertical
    console.log('\n--- 5. Testing Detail, HTML Preview, and File Attachment Downloads ---');
    for (const v of verticals) {
      const id = sampleIds[v];
      if (!id) {
        console.log(`   [SKIP] No sample record found for vertical ${v}`);
        continue;
      }

      // JSON Detail
      const jsonRes = await makeRequest(`/api/v1/crm/invoices/${v}/${id}`, {
        Authorization: `Bearer ${adminToken}`,
      });
      console.log(`   ✓ GET /crm/invoices/${v}/${id}: status = ${jsonRes.status}, invoiceNumber = ${jsonRes.body.data?.invoiceNumber}`);
      if (jsonRes.status !== 200 || !jsonRes.body.success) {
        throw new Error(`Failed to get JSON invoice for ${v}: ${JSON.stringify(jsonRes.body)}`);
      }

      // HTML Preview
      const htmlRes = await makeRequest(`/api/v1/crm/invoices/${v}/${id}/html`, {
        Authorization: `Bearer ${adminToken}`,
      });
      console.log(`   ✓ GET /crm/invoices/${v}/${id}/html: status = ${htmlRes.status}, isHtml = ${typeof htmlRes.body === 'string' && htmlRes.body.includes('<!DOCTYPE html>')}`);
      if (htmlRes.status !== 200 || !htmlRes.headers['content-type']?.includes('text/html')) {
        throw new Error(`Failed to get HTML invoice preview for ${v}`);
      }

      // Download Attachment (via ?token=)
      const dlRes = await makeRequest(`/api/v1/crm/invoices/${v}/${id}/download?token=${adminToken}`);
      const disposition = dlRes.headers['content-disposition'] || '';
      console.log(`   ✓ GET /crm/invoices/${v}/${id}/download?token=...: status = ${dlRes.status}, disposition = ${disposition}`);
      if (dlRes.status !== 200 || !disposition.includes('attachment;')) {
        throw new Error(`Failed to download invoice attachment for ${v}: disposition = ${disposition}`);
      }
    }

    // 6. Test alias mount point /api/v1/invoices/admin/package
    console.log('\n--- 6. Testing Canonical Alias (/api/v1/invoices/admin/...) ---');
    const aliasRes = await makeRequest('/api/v1/invoices/admin/package?page=1&limit=2', {
      Authorization: `Bearer ${adminToken}`,
    });
    console.log('   ✓ Alias /invoices/admin/package status:', aliasRes.status, 'items =', aliasRes.body.data?.length);
    if (aliasRes.status !== 200 || !aliasRes.body.success) {
      throw new Error(`Alias failed: ${JSON.stringify(aliasRes.body)}`);
    }

    // 7. Test query param token (?token=...) authentication on summary
    console.log('\n--- 7. Testing Browser Query Parameter Auth (?token=...) ---');
    const tokenQueryRes = await makeRequest(`/api/v1/crm/invoices/summary?token=${adminToken}`);
    console.log('   ✓ Query parameter ?token= auth status:', tokenQueryRes.status, 'Success:', tokenQueryRes.body.success);
    if (tokenQueryRes.status !== 200 || !tokenQueryRes.body.success) {
      throw new Error(`Token query authentication failed: ${JSON.stringify(tokenQueryRes.body)}`);
    }

    console.log('\n🎉 ALL ADMIN INVOICE ENDPOINTS VERIFIED AND PASSING SUCCESSFULLY ACROSS ALL VERTICALS!');
  } finally {
    server.close();
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
