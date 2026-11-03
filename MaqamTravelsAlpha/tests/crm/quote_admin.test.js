// tests/crm/quote_admin.test.js
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config();

const app = require('../../app');
const User = require('../../modules/auth/auth.model');
const Lead = require('../../modules/crm/crm.model');
const { generateTokens } = require('../../middleware/auth');

describe('Admin Quotations Operations API Suite', () => {
  let server;
  let baseUrl;
  let adminToken;
  let adminUser;
  let agentToken;
  let agentUser;
  let testLead;
  let unhandledLead;

  before(async () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, { family: 4, serverSelectionTimeoutMS: 10000 });
    }

    // Create Admin user
    adminUser = await User.create({
      firstName: 'QuoteAdmin',
      lastName: 'Tester',
      email: `quote_admin_${Date.now()}@test.com`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'Password123!',
      role: 'admin',
    });
    adminToken = generateTokens(adminUser._id.toString(), adminUser.role).accessToken;

    // Create Sales Agent user
    agentUser = await User.create({
      firstName: 'TravelSpecialist',
      lastName: 'Agent',
      email: `travel_specialist_${Date.now()}@test.com`,
      phone: `92${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'Password123!',
      role: 'sales_agent',
    });
    agentToken = generateTokens(agentUser._id.toString(), agentUser.role).accessToken;

    // Create test lead (handled)
    testLead = await Lead.create({
      firstName: 'Tariq',
      lastName: 'Ziyad',
      email: 'tariq.ziyad@example.com',
      phone: '+919876543211',
      destination: 'Makkah & Madinah',
      numberOfPeople: 4,
      status: 'new',
      quoteReference: `QT-ADM-${Date.now().toString(16).toUpperCase()}`,
      assignedAgent: agentUser._id,
      assignedTo: agentUser._id.toString(),
    });

    // Create unhandled lead (no agent assigned)
    unhandledLead = await Lead.create({
      firstName: 'Bilal',
      lastName: 'Habashi',
      email: 'bilal.habashi@example.com',
      phone: '+919876543222',
      destination: 'Madinah Deluxe',
      numberOfPeople: 2,
      status: 'new',
      quoteReference: `QT-UNH-${Date.now().toString(16).toUpperCase()}`,
      assignedAgent: null,
      assignedTo: null,
    });

    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    if (testLead) await Lead.findByIdAndDelete(testLead._id);
    if (unhandledLead) await Lead.findByIdAndDelete(unhandledLead._id);
    if (adminUser) await User.findByIdAndDelete(adminUser._id);
    if (agentUser) await User.findByIdAndDelete(agentUser._id);
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  it('1. GET /api/v1/crm/quotes - should list quotations with pagination', async () => {
    const res = await fetch(`${baseUrl}/api/v1/crm/quotes?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data.quotations));
    assert.ok(json.data.pagination);
  });

  it('2. GET /api/v1/crm/quotes?agentId=unhandled - should filter unhandled quotations', async () => {
    const res = await fetch(`${baseUrl}/api/v1/crm/quotes?agentId=unhandled`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    const unhandled = json.data.quotations.find((q) => q._id.toString() === unhandledLead._id.toString());
    assert.ok(unhandled);
    assert.equal(unhandled.assignedAgent, null);
  });

  it('3. GET /api/v1/crm/quotes?search=Bilal - should search by customer name', async () => {
    const res = await fetch(`${baseUrl}/api/v1/crm/quotes?search=Bilal`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.quotations.length >= 1);
    assert.equal(json.data.quotations[0].firstName, 'Bilal');
  });

  it('4. GET /api/v1/crm/quotes/:id - should get single quotation by ID', async () => {
    const res = await fetch(`${baseUrl}/api/v1/crm/quotes/${testLead._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.quotation._id.toString(), testLead._id.toString());
    assert.equal(json.data.quotation.destination, 'Makkah & Madinah');
  });

  it('5. POST /api/v1/crm/quotes/:id/assign - should assign unhandled quotation to specialist', async () => {
    const res = await fetch(`${baseUrl}/api/v1/crm/quotes/${unhandledLead._id}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ agentId: agentUser._id.toString() }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.quotation.assignedAgent);
    assert.equal(json.data.quotation.assignedAgent._id.toString(), agentUser._id.toString());
  });

  it('6. POST /api/v1/crm/quotes/:id/send - should issue quotation and send proposal to customer', async () => {
    const payload = {
      quotedPrice: 340000,
      quoteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Includes 5-star hotel near Haram and private VIP transfers.',
    };

    const res = await fetch(`${baseUrl}/api/v1/crm/quotes/${testLead._id}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.quotation.quotedPrice, 340000);
    assert.equal(json.data.quotation.status, 'proposal_sent');
  });
});
