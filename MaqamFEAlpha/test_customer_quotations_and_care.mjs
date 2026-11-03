// test_customer_quotations_and_care.mjs
// Comprehensive automated test suite for customer quotations and Customer Care feature

import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

// Mock localStorage and window environment for Node execution
class MockStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(String(key)) ? this.store.get(String(key)) : null;
  }
  setItem(key, value) {
    this.store.set(String(key), String(value));
  }
  removeItem(key) {
    this.store.delete(String(key));
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(i) {
    return Array.from(this.store.keys())[i] || null;
  }
}

globalThis.localStorage = new MockStorage();
globalThis.sessionStorage = new MockStorage();
globalThis.window = {
  location: { origin: "http://localhost:5069", protocol: "http:" },
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {},
};

// Import services and modules under test
const {
  quoteService,
  normalizeCustomerQuote,
  STAGE_CONFIG,
  saveLocalQuote,
  getLocalSavedQuotes,
} = await import("./src/services/quoteService.js");

const { QuoteAPI } = await import("./src/configs/api.js");
const { normalizeQuote, quotesApi } = await import("./src/admin/features/quotes/quotesApi.js");

console.log("=== Running Customer Care & Quotations Automated Test Suite ===");

// ─── Test Suite 1: Schema Normalization & Helpers ──────────────────────────

test("normalizeCustomerQuote: correctly parses raw lead/quote object", () => {
  const raw = {
    _id: "6ae2eedace46479b0c396fab",
    quoteReference: "QT-TEST-0001",
    destination: "Makkah & Madinah",
    tripType: "umrah",
    travelDates: { from: "2026-11-10T00:00:00.000Z", to: "2026-11-20T00:00:00.000Z" },
    numberOfPeople: 4,
    budget: 350000,
    specialRequests: "2 quad rooms near Haram",
    status: "new",
    stage: "under_review",
    contact: {
      firstName: "Ahmed",
      lastName: "Farooq",
      phone: "+919876543210",
      email: "ahmed@example.com",
    },
    quote: {
      price: 340000,
      currency: "INR",
      expiresAt: "2026-11-15T23:59:59.000Z",
    },
    timeline: [
      { type: "created", title: "Quotation requested", detail: "4 travellers", createdAt: "2026-10-29T10:00:00Z" },
    ],
  };

  const normalized = normalizeCustomerQuote(raw);
  assert.equal(normalized.id, "6ae2eedace46479b0c396fab");
  assert.equal(normalized.reference, "QT-TEST-0001");
  assert.equal(normalized.destination, "Makkah & Madinah");
  assert.equal(normalized.tripType, "umrah");
  assert.equal(normalized.numberOfPeople, 4);
  assert.equal(normalized.budget, 350000);
  assert.equal(normalized.quote.price, 340000);
  assert.equal(normalized.contact.name, "Ahmed Farooq");
  assert.equal(normalized.contact.phone, "+919876543210");
  assert.equal(normalized.timeline.length, 1);
});

test("normalizeCustomerQuote: raw.customerResponse with null action normalizes to null customerResponse and enables availableActions", () => {
  const rawWithNullResponse = {
    _id: "6ae2eedace46479b0c396fa1",
    quoteReference: "QT-TEST-0002",
    destination: "Makkah",
    tripType: "umrah",
    status: "proposal_sent",
    stage: "quote_ready",
    quote: {
      price: 300000,
      currency: "INR",
      expiresAt: "2026-12-01T00:00:00Z",
    },
    customerResponse: {
      action: null,
      note: "",
      respondedAt: null,
    },
  };

  const normalized = normalizeCustomerQuote(rawWithNullResponse);
  assert.equal(normalized.customerResponse, null, "customerResponse must be null if action is null");
  assert.equal(normalized.stage, "quote_ready");
  assert.deepEqual(
    normalized.availableActions,
    ["accepted", "rejected", "changes_requested"],
    "availableActions must be populated when proposal is ready and unresponded"
  );
});

test("STAGE_CONFIG: defines all required lifecycle stages with labels and colors", () => {
  const expectedStages = [
    "under_review",
    "quote_ready",
    "accepted",
    "revision_requested",
    "expired",
    "booked",
    "closed",
  ];

  for (const st of expectedStages) {
    assert(STAGE_CONFIG[st], `STAGE_CONFIG missing stage: ${st}`);
    assert(STAGE_CONFIG[st].label, `Stage ${st} missing label`);
    assert(STAGE_CONFIG[st].tone, `Stage ${st} missing tone styling`);
    assert(STAGE_CONFIG[st].description, `Stage ${st} missing description`);
  }
});

test("saveLocalQuote & getLocalSavedQuotes: stores and persists quotations in localStorage", () => {
  localStorage.clear();
  assert.equal(getLocalSavedQuotes().length, 0);

  const sampleQuote = {
    id: "Q1001",
    reference: "QT-PERSIST-1",
    destination: "VIP Umrah",
    numberOfPeople: 2,
    budget: 200000,
  };

  saveLocalQuote(sampleQuote);
  const stored = getLocalSavedQuotes();
  assert.equal(stored.length, 1);
  assert.equal(stored[0].reference, "QT-PERSIST-1");

  // Updating same quote should not duplicate
  saveLocalQuote({ ...sampleQuote, budget: 220000 });
  const updated = getLocalSavedQuotes();
  assert.equal(updated.length, 1);
  assert.equal(updated[0].budget, 220000);
});

test("QuoteAPI configs: endpoints correctly defined", () => {
  assert(QuoteAPI.RequestQuoteApi.includes("/api/v1/quotes/request"));
  assert(QuoteAPI.TrackQuoteApi.includes("/api/v1/quotes/track"));
  assert(QuoteAPI.MyQuotesApi.includes("/api/v1/quotes/my"));
  assert(QuoteAPI.MyQuoteDetailApi("abc123").includes("/api/v1/quotes/my/abc123"));
  assert(QuoteAPI.MyQuoteRespondApi("abc123").includes("/api/v1/quotes/my/abc123/respond"));
  assert(QuoteAPI.CrmQuotesApi.includes("/api/v1/crm/quotes"));
});

test("admin normalizeQuote: maps customerResponse actions to appropriate pipeline status", () => {
  // 1. Accepted customer response
  const acceptedLead = {
    _id: "6ae2eedace46479b0c396fa9",
    reference: "QT-BCK-0099",
    contact: { firstName: "Fatima", lastName: "Zahra", email: "fatima@example.com", phone: "+919876543344" },
    quote: { price: 450000, expiresAt: "2026-11-20T00:00:00Z" },
    status: "proposal_sent",
    customerResponse: { action: "accepted", note: "Accepted terms", respondedAt: "2026-10-29T11:00:00Z" },
  };
  const normAccepted = normalizeQuote(acceptedLead);
  assert.equal(normAccepted.customerName, "Fatima Zahra");
  assert.equal(normAccepted.status, "won", "Accepted proposal should map to status won");
  assert.equal(normAccepted.customerResponse.action, "accepted");

  // 2. Changes requested customer response
  const changesLead = {
    _id: "6ae2eedace46479b0c396fa8",
    reference: "QT-BCK-0098",
    contact: { firstName: "Ali", lastName: "Raza" },
    quote: { price: 350000 },
    status: "proposal_sent",
    customerResponse: { action: "changes_requested", note: "Request Pullman hotel", respondedAt: "2026-10-29T11:30:00Z" },
  };
  const normChanges = normalizeQuote(changesLead);
  assert.equal(normChanges.status, "negotiation", "Changes requested proposal should map to status negotiation");
  assert.equal(normChanges.customerResponse.action, "changes_requested");

  // 3. Rejected customer response
  const rejectedLead = {
    _id: "6ae2eedace46479b0c396fa7",
    reference: "QT-BCK-0097",
    contact: { firstName: "Zayd", lastName: "Harith" },
    status: "proposal_sent",
    customerResponse: { action: "rejected", note: "Out of budget" },
  };
  const normRejected = normalizeQuote(rejectedLead);
  assert.equal(normRejected.status, "lost", "Rejected proposal should map to status lost");
});

// ─── Test Suite 2: Codebase Static Integration Verification ────────────────

test("Profile.jsx: imports CustomerCareSection and configures customer-care menu item", () => {
  const profilePath = path.resolve("src/pages/Profile.jsx");
  const code = fs.readFileSync(profilePath, "utf-8");

  assert(code.includes("import CustomerCareSection from"), "Profile.jsx must import CustomerCareSection");
  assert(code.includes('{ key: "customer-care", label: "Customer Care", icon: Headphones }'), "PROFILE_MENU must contain customer-care");
  assert(code.includes('{activeTab === "customer-care" && <CustomerCareSection />}'), "Profile.jsx must render CustomerCareSection");
  assert(code.includes("useSearchParams"), "Profile.jsx must use useSearchParams for tab syncing");
});

test("CommonHeader.jsx: account dropdown contains Customer Care navigation", () => {
  const headerPath = path.resolve("src/components/CommonHeader.jsx");
  const code = fs.readFileSync(headerPath, "utf-8");

  assert(code.includes('label: "Customer Care"'), "CommonHeader dropdown must contain Customer Care link");
  assert(code.includes("/profile?tab=customer-care"), "CommonHeader must link to /profile?tab=customer-care");
});

test("App.jsx: includes redirects for /customer-care, /quotes, /track-quote, and /request-quote", () => {
  const appPath = path.resolve("src/App.jsx");
  const code = fs.readFileSync(appPath, "utf-8");

  assert(code.includes('path="/customer-care"'), "App.jsx must route /customer-care");
  assert(code.includes('path="/quotes"'), "App.jsx must route /quotes");
  assert(code.includes('path="/track-quote"'), "App.jsx must route /track-quote");
  assert(code.includes('path="/request-quote"'), "App.jsx must route /request-quote");
});

// ─── Test Suite 3: Complete Circular Live Backend Verification ──────────────

test("Live Backend: Full end-to-end circular quotation workflow", async (t) => {
  const base = "http://192.168.1.104:5000";
  let isBackendUp = false;

  try {
    const ping = await fetch(base + "/api/v1/quotes/request", { method: "HEAD" }).catch(() => null);
    isBackendUp = ping !== null;
  } catch {
    isBackendUp = false;
  }

  if (!isBackendUp) {
    console.log("  ⚠️ Live backend is not reachable right now, skipping live HTTP assertions.");
    return;
  }

  // 1. Customer Registration
  const randNum = Math.floor(1000000000 + Math.random() * 9000000000);
  const testPhone = "9" + String(randNum).slice(1);
  const testEmail = `live_customer_${randNum}@example.com`;

  const regRes = await fetch(base + "/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Fatima",
      lastName: "Customer",
      email: testEmail,
      phone: testPhone,
      password: "Password123!",
    }),
  });
  assert.equal(regRes.status, 201, "Customer registration must succeed");
  const regData = await regRes.json();
  const customerToken = regData.data.accessToken;

  // 2. Admin Registration to test CRM endpoints
  const randAdmin = Math.floor(1000000000 + Math.random() * 9000000000);
  const adminRes = await fetch(base + "/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Tariq",
      lastName: "Specialist",
      email: `live_admin_${randAdmin}@example.com`,
      phone: "9" + String(randAdmin).slice(1),
      password: "Password123!",
      role: "admin",
    }),
  });
  assert.equal(adminRes.status, 201, "Admin registration must succeed");
  const adminData = await adminRes.json();
  const adminToken = adminData.data.accessToken;
  const adminUser = adminData.data.user;

  // 3. Customer submits a quote request
  const reqRes = await fetch(base + "/api/v1/quotes/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      firstName: "Fatima",
      lastName: "Customer",
      email: testEmail,
      phone: testPhone,
      destination: "Makkah & Madinah Deluxe",
      tripType: "umrah",
      travelDates: { from: "2026-11-15", to: "2026-11-25" },
      numberOfPeople: 4,
      budget: 350000,
      specialRequests: "Kaaba view suite, direct flights",
    }),
  });
  assert.equal(reqRes.status, 201, "POST /api/v1/quotes/request must return 201");
  const reqData = await reqRes.json();
  const createdQuote = reqData.data.quote;
  const quoteId = createdQuote.id || createdQuote._id;
  assert(quoteId, "Created quote must have an ID");
  assert(createdQuote.reference, "Created quote must have a reference");

  // 4. Guest tracking test via POST /api/v1/quotes/track
  const trackRes = await fetch(base + "/api/v1/quotes/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reference: createdQuote.reference,
      phone: testPhone,
    }),
  });
  assert.equal(trackRes.status, 200, "POST /api/v1/quotes/track must return 200");
  const trackData = await trackRes.json();
  assert.equal(trackData.data.quote.reference, createdQuote.reference);

  // 5. CRM retrieves the quotation details
  const crmDetailRes = await fetch(`${base}/api/v1/crm/quotes/${quoteId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(crmDetailRes.status, 200, "CRM GET /api/v1/crm/quotes/:id must return 200");
  const crmDetailData = await crmDetailRes.json();
  assert.equal(crmDetailData.success, true);
  const fetchedQuotation = crmDetailData.data.quotation;
  assert.equal(fetchedQuotation.quoteReference, createdQuote.reference);

  // 6. CRM assigns the quote to travel specialist
  const assignRes = await fetch(`${base}/api/v1/crm/quotes/${quoteId}/assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ agentId: adminUser._id || adminUser.id }),
  });
  assert.equal(assignRes.status, 200, "CRM POST /api/v1/crm/quotes/:id/assign must return 200");

  // 7. CRM sends proposal to customer
  const sendRes = await fetch(`${base}/api/v1/crm/quotes/${quoteId}/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      price: 335000,
      quotedPrice: 335000,
      quoteExpiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      notes: "Kaaba view suite in Fairmont Clock Royal Tower with private luxury transport",
      sendEmail: true,
      sendWhatsapp: true,
    }),
  });
  assert.equal(sendRes.status, 200, "CRM POST /api/v1/crm/quotes/:id/send must return 200");

  // 8. Customer views proposal via GET /api/v1/quotes/my/:id
  const custViewRes = await fetch(`${base}/api/v1/quotes/my/${quoteId}`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert.equal(custViewRes.status, 200, "Customer GET /api/v1/quotes/my/:id must return 200");
  const custViewData = await custViewRes.json();
  const readyQuote = custViewData.data.quote;
  assert.equal(readyQuote.stage, "quote_ready", "Quote stage must be quote_ready after proposal sent");
  assert.equal(readyQuote.quote.price, 335000, "Proposal price must match issued price");

  // 9. Customer responds: Accepted
  const respondRes = await fetch(`${base}/api/v1/quotes/my/${quoteId}/respond`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      action: "accepted",
      note: "Accepted! Please proceed with flight and hotel booking.",
    }),
  });
  assert.equal(respondRes.status, 200, "Customer response (accepted) must return 200");
  const respondData = await respondRes.json();
  assert.equal(respondData.data.quote.stage, "accepted");
  assert.equal(respondData.data.quote.customerResponse.action, "accepted");

  // 10. Verify CRM reflects accepted customer response and won status
  const finalCrmRes = await fetch(`${base}/api/v1/crm/quotes/${quoteId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(finalCrmRes.status, 200);
  const finalCrmData = await finalCrmRes.json();
  const normalizedFinal = normalizeQuote(finalCrmData.data.quotation);
  assert.equal(normalizedFinal.status, "won", "Accepted quotation must be normalized as won in CRM pipeline");
  assert.equal(normalizedFinal.customerResponse.action, "accepted");
  assert.equal(normalizedFinal.customerResponse.note, "Accepted! Please proceed with flight and hotel booking.");
});
