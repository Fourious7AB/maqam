// tests/crm/crm_settings.test.js
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config();

const app = require('../../app');
const User = require('../../modules/auth/auth.model');
const Setting = require('../../modules/crm/settings.model');
const { generateTokens } = require('../../middleware/auth');

describe('CRM Settings API Suite', () => {
  let server;
  let baseUrl;
  let adminToken;
  let adminUser;
  let customerToken;
  let customerUser;

  before(async () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, { family: 4, serverSelectionTimeoutMS: 10000 });
    }

    // Clean up test section if existing
    await Setting.deleteOne({ section: 'general_test' });

    // Admin user for tests
    adminUser = await User.create({
      firstName: 'SettingsAdmin',
      lastName: 'Tester',
      email: `settings_admin_${Date.now()}@test.com`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'Password123!',
      role: 'admin',
    });
    adminToken = generateTokens(adminUser._id.toString(), adminUser.role).accessToken;

    // Customer user (should be forbidden on write)
    customerUser = await User.create({
      firstName: 'Customer',
      lastName: 'Tester',
      email: `settings_customer_${Date.now()}@test.com`,
      phone: `92${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'Password123!',
      role: 'customer',
    });
    customerToken = generateTokens(customerUser._id.toString(), customerUser.role).accessToken;

    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await Setting.deleteOne({ section: 'general_test' });
    if (adminUser) await User.findByIdAndDelete(adminUser._id);
    if (customerUser) await User.findByIdAndDelete(customerUser._id);
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  it('1. GET /api/v1/settings/general - should return default company settings matching target response', async () => {
    const res = await fetch(`${baseUrl}/api/v1/settings/general`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.companyName, 'Maqam Travels');
    assert.equal(json.supportEmail, 'support@maqam.com');
    assert.equal(json.supportPhone, '+911180808080');
    assert.equal(json.timezone, 'Asia/Kolkata');
    assert.equal(json.currency, 'INR');
  });

  it('2. GET /api/v1/crm/settings/general - should also return settings under CRM prefix', async () => {
    const res = await fetch(`${baseUrl}/api/v1/crm/settings/general`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.companyName, 'Maqam Travels');
    assert.equal(json.currency, 'INR');
  });

  it('3. GET /api/v1/settings/general?envelope=true - should support envelope format', async () => {
    const res = await fetch(`${baseUrl}/api/v1/settings/general?envelope=true`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.companyName, 'Maqam Travels');
  });

  it('4. PUT /api/v1/settings/general_test - should update/save custom section settings (Admin only)', async () => {
    const updatePayload = {
      companyName: 'Maqam Travels Elite',
      supportEmail: 'elite@maqam.com',
      supportPhone: '+919876543210',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    };

    const res = await fetch(`${baseUrl}/api/v1/settings/general_test`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(updatePayload),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.companyName, 'Maqam Travels Elite');
    assert.equal(json.supportEmail, 'elite@maqam.com');

    // Verify GET reflects the updated data
    const getRes = await fetch(`${baseUrl}/api/v1/settings/general_test`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const getJson = await getRes.json();
    assert.equal(getJson.companyName, 'Maqam Travels Elite');
    assert.equal(getJson.supportPhone, '+919876543210');
  });

  it('5. PUT /api/v1/settings/general_test - should reject non-admin users with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/v1/settings/general_test`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ companyName: 'Hacked' }),
    });

    assert.equal(res.status, 403);
  });

  it('6. GET /api/v1/settings/invalid!section - should fail validation with 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/v1/settings/invalid!section`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
  });
});
