// tests/crm/crm_leads_contract.test.js
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = require('../../app');
const User = require('../../modules/auth/auth.model');
const Lead = require('../../modules/crm/crm.model');

describe('CRM Leads API Contract Suite (Frontend Alignment)', () => {
  let server;
  let baseUrl;
  let adminToken;
  let adminUser;
  let createdLeadId;

  before(async () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, { family: 4, serverSelectionTimeoutMS: 10000 });
    }

    // Create an admin user for testing
    adminUser = await User.create({
      firstName: 'LeadAdmin',
      lastName: 'Tester',
      email: `lead_admin_${Date.now()}@test.com`,
      phone: `99${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'Password123!',
      role: 'admin',
    });

    const { generateTokens } = require('../../middleware/auth');
    adminToken = generateTokens(adminUser._id.toString(), adminUser.role).accessToken;

    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    if (createdLeadId) {
      await Lead.findByIdAndDelete(createdLeadId);
    }
    if (adminUser) {
      await User.findByIdAndDelete(adminUser._id);
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('1. POST /api/v1/crm/leads - should create lead with initial timeline entry', async () => {
    const payload = {
      firstName: 'Ahmed',
      lastName: 'Khan',
      email: `ahmed_${Date.now()}@example.com`,
      phone: '9876543210',
      destination: 'Makkah',
      travelDates: {
        from: '2026-09-21',
        to: '2026-09-28',
      },
      numberOfPeople: 4,
      budget: 250000,
      specialRequests: 'Wheelchair accessible room required',
    };

    const res = await fetch(`${baseUrl}/api/v1/crm/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.lead);
    assert.equal(json.data.lead.firstName, 'Ahmed');
    assert.equal(json.data.lead.name, 'Ahmed Khan');
    assert.equal(json.data.lead.travelers, 4);
    assert.equal(json.data.lead.query, 'Wheelchair accessible room required');
    assert.ok(Array.isArray(json.data.lead.timeline));
    assert.ok(json.data.lead.timeline.length >= 1);
    assert.equal(json.data.lead.timeline[0].type, 'created');

    createdLeadId = json.data.lead.id || json.data.lead._id;
  });

  it('2. GET /api/v1/crm/leads - should list leads with data.leads and data.pagination', async () => {
    const res = await fetch(`${baseUrl}/api/v1/crm/leads?search=Ahmed&page=1&limit=10`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data.leads));
    assert.ok(json.data.pagination);
    assert.equal(json.data.pagination.page, 1);
    assert.ok(json.data.leads.some((l) => l.id === createdLeadId || l._id === createdLeadId));
  });

  it('3. GET /api/v1/crm/leads/:id - should retrieve single lead in data.lead shape', async () => {
    const res = await fetch(`${baseUrl}/api/v1/crm/leads/${createdLeadId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.lead);
    assert.equal(json.data.lead.id, createdLeadId);
    assert.equal(json.data.lead.destination, 'Makkah');
  });

  it('4. PATCH /api/v1/crm/leads/:id - should update status and append timeline entry', async () => {
    const updatePayload = {
      status: 'negotiation',
      priority: 'high',
      assignedTo: 'Sourav Das',
      budget: 350000,
    };

    const res = await fetch(`${baseUrl}/api/v1/crm/leads/${createdLeadId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(updatePayload),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.lead);
    assert.equal(json.data.lead.status, 'negotiation');
    assert.equal(json.data.lead.priority, 'high');
    assert.equal(json.data.lead.assignedTo, 'Sourav Das');
    assert.equal(json.data.lead.budget, 350000);

    // Verify timeline recorded the status change
    const statusEntry = json.data.lead.timeline.find((t) => t.type === 'status');
    assert.ok(statusEntry);
    assert.match(statusEntry.detail, /Negotiation/i);
  });

  it('5. POST /api/v1/crm/leads/:id/notes - should add note to timeline and update notes field', async () => {
    const notePayload = {
      note: 'Called customer, he will confirm by Friday.',
    };

    const res = await fetch(`${baseUrl}/api/v1/crm/leads/${createdLeadId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(notePayload),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.lead);
    assert.equal(json.data.lead.notes, 'Called customer, he will confirm by Friday.');

    const noteTimelineItem = json.data.lead.timeline.find((t) => t.type === 'note');
    assert.ok(noteTimelineItem);
    assert.equal(noteTimelineItem.detail, 'Called customer, he will confirm by Friday.');
  });

  it('6. POST /api/v1/crm/leads/:id/convert - should convert lead, mark as won, and link customer', async () => {
    const convertPayload = {
      customerType: 'new',
    };

    const res = await fetch(`${baseUrl}/api/v1/crm/leads/${createdLeadId}/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(convertPayload),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.lead);
    assert.equal(json.data.lead.status, 'won');
    assert.ok(json.data.lead.convertedAt);

    const wonTimelineItem = json.data.lead.timeline.find((t) => t.type === 'won');
    assert.ok(wonTimelineItem);
  });
});
