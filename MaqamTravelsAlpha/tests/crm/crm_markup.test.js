// tests/crm/crm_markup.test.js
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config();

const app = require('../../app');
const User = require('../../modules/auth/auth.model');
const Setting = require('../../modules/crm/settings.model');
const { generateTokens } = require('../../middleware/auth');
const settingsService = require('../../modules/crm/settings.service');

describe('CRM Markup Endpoints Suite', () => {
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

    // Clean up settings for clean test state
    await Setting.deleteMany({ section: { $in: ['markup', 'financial'] } });

    // Admin user for test
    adminUser = await User.create({
      firstName: 'MarkupAdmin',
      lastName: 'Tester',
      email: `markup_admin_${Date.now()}@test.com`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'Password123!',
      role: 'admin',
    });
    adminToken = generateTokens(adminUser._id.toString(), adminUser.role).accessToken;

    // Customer user (non-admin)
    customerUser = await User.create({
      firstName: 'Customer',
      lastName: 'Tester',
      email: `markup_customer_${Date.now()}@test.com`,
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
    await Setting.deleteMany({ section: { $in: ['markup', 'financial'] } });
    if (adminUser) await User.findByIdAndDelete(adminUser._id);
    if (customerUser) await User.findByIdAndDelete(customerUser._id);
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  it('1. GET /api/v1/crm/markup - should return current markup settings', async () => {
    const res = await fetch(`${baseUrl}/api/v1/crm/markup`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data);
    assert.equal(typeof json.data.flightMarkupPercent, 'number');
    assert.equal(typeof json.data.hotelMarkupPercent, 'number');
  });

  it('2. PUT /api/v1/crm/markup - admin should be able to update markup settings', async () => {
    const payload = {
      flightMarkupPercent: 12.5,
      hotelMarkupPercent: 10.0,
      markPercent: 12.5,
    };

    const res = await fetch(`${baseUrl}/api/v1/crm/markup`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.flightMarkupPercent, 12.5);
    assert.equal(json.data.hotelMarkupPercent, 10.0);
    assert.equal(json.data.markPercent, 12.5);
  });

  it('3. GET /api/v1/crm/markup - should reflect updated markup', async () => {
    const res = await fetch(`${baseUrl}/api/v1/crm/markup`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.flightMarkupPercent, 12.5);
    assert.equal(json.data.hotelMarkupPercent, 10.0);
  });

  it('4. POST /api/v1/crm/markup - should allow set markup via POST endpoint', async () => {
    const res = await fetch(`${baseUrl}/api/v1/crm/markup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ markPercent: 15.0 }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.flightMarkupPercent, 15.0);
    assert.equal(json.data.hotelMarkupPercent, 15.0);
    assert.equal(json.data.markPercent, 15.0);
  });

  it('5. PUT /api/v1/crm/markup - non-admin user should receive 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/v1/crm/markup`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ markPercent: 50.0 }),
    });

    assert.equal(res.status, 403);
  });

  it('6. settingsService.getMarkupSettings() - should return the configured markup for modules', async () => {
    const currentMarkup = await settingsService.getMarkupSettings();
    assert.equal(currentMarkup.markPercent, 15.0);
    assert.equal(currentMarkup.flightMarkupPercent, 15.0);
  });
});
