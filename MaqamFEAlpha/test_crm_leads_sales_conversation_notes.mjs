import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { leadsApi, normalizeLead } from "./src/admin/features/leads/leadsApi.js";
import { quotesApi, normalizeQuote } from "./src/admin/features/quotes/quotesApi.js";

async function runTests() {
  console.log("=== CRM Leads & Sales Customer Conversation Notes & Workflow Verification ===");

  // Test 1: Lead Normalization preserves customer conversation notes & response notes
  console.log("\n[Test 1] Verify normalizeLead preserves customer dialogue & response notes");
  const rawLead = {
    _id: "lead-test-101",
    name: "Tariq Mansoor",
    phone: "+919876543210",
    email: "tariq@example.com",
    query: "Looking for 15-day family package with Kaaba view hotel",
    customerResponse: {
      action: "changes_requested",
      note: "Please revise to include wheelchair assistance at airport",
      respondedAt: "2026-10-28T10:00:00.000Z",
    },
    contactNotes: "Customer preferred evening calls via WhatsApp",
  };

  const normalized = normalizeLead(rawLead);
  assert.strictEqual(normalized.query, "Looking for 15-day family package with Kaaba view hotel");
  assert.strictEqual(normalized.customerResponse?.note, "Please revise to include wheelchair assistance at airport");
  assert.strictEqual(normalized.customerResponse?.action, "changes_requested");
  assert.strictEqual(normalized.contactNotes, "Customer preferred evening calls via WhatsApp");
  console.log("✓ Test 1 Passed: normalizeLead preserves query, response notes, and contact notes.");

  // Test 2: Logging conversation notes in Leads with multiple channels
  console.log("\n[Test 2] Verify leadsApi.addNote logs dialogue across channels (Call, WhatsApp, Email, Note)");
  const leadsListRes = await leadsApi.list({ limit: 5 });
  const sampleLead = leadsListRes.data[0];
  assert.ok(sampleLead, "Sample lead exists in mock data");
  const sampleLeadId = sampleLead.id || sampleLead._id;

  const callResult = await leadsApi.addNote(sampleLeadId, {
    note: "Customer confirmed travel dates: 10 Nov - 24 Nov.",
    channel: "Call",
    author: "Sales Advisor",
  });
  assert.ok(callResult, "Lead returned from addNote");
  const callNote = callResult.timeline?.find((t) => t.detail?.includes("travel dates"));
  assert.ok(callNote, "Call note found in timeline");
  assert.strictEqual(callNote.channel, "Call");

  const waResult = await leadsApi.addNote(sampleLeadId, {
    note: "Sent hotel photo options via WhatsApp catalog.",
    channel: "WhatsApp",
    author: "Sales Advisor",
  });
  assert.ok(waResult, "Lead returned from addNote");
  const waNote = waResult.timeline?.find((t) => t.detail?.includes("WhatsApp catalog"));
  assert.ok(waNote, "WhatsApp note found in timeline");
  assert.strictEqual(waNote.channel, "WhatsApp");
  console.log("✓ Test 2 Passed: leadsApi.addNote logs channel-specific dialogue into lead timeline.");

  // Test 3: Quote Normalization preserves customer feedback & requests
  console.log("\n[Test 3] Verify normalizeQuote preserves customer dialogue & enquiry notes");
  const rawQuote = {
    _id: "quote-test-202",
    firstName: "Amina",
    lastName: "Begum",
    destination: "Ramadan Deluxe Umrah",
    specialRequests: "Ground floor room preferred for senior parents",
    customerResponse: {
      action: "accepted",
      note: "Happy with the itinerary, proceed with booking",
      respondedAt: "2026-10-27T15:30:00.000Z",
    },
  };
  const normQuote = normalizeQuote(rawQuote);
  assert.strictEqual(normQuote.specialRequests, "Ground floor room preferred for senior parents");
  assert.strictEqual(normQuote.customerResponse?.note, "Happy with the itinerary, proceed with booking");
  assert.strictEqual(normQuote.status, "won");
  console.log("✓ Test 3 Passed: normalizeQuote preserves dialogue and correctly maps status.");

  // Test 4: Logging conversation notes in Quotes Desk
  console.log("\n[Test 4] Verify quotesApi.addNote logs customer conversation notes");
  const quoteListRes = await quotesApi.list({ limit: 10 });
  const sampleQuote = quoteListRes.quotations[0];
  assert.ok(sampleQuote, "Sample quote exists in mock data");

  const quoteNoteRes = await quotesApi.addNote(sampleQuote._id, {
    note: "Discussed budget adjustment down by ₹15,000 on phone call.",
    channel: "Call",
    author: "Quota Manager",
  });
  assert.ok(quoteNoteRes.quotation, "Updated quotation returned");
  const loggedNote = quoteNoteRes.quotation.timeline?.find((t) => t.detail?.includes("₹15,000"));
  assert.ok(loggedNote, "Conversation note recorded in quote timeline");
  assert.strictEqual(loggedNote.channel, "Call");
  console.log("✓ Test 4 Passed: quotesApi.addNote records channel-specific dialogue in quote timeline.");

  // Test 5: Verify getById in quotesApi
  console.log("\n[Test 5] Verify quotesApi.getById retrieves quotation");
  const fetched = await quotesApi.getById(sampleQuote._id);
  assert.ok(fetched.quotation, "Quotation retrieved");
  assert.strictEqual(fetched.quotation._id, sampleQuote._id);
  console.log("✓ Test 5 Passed: quotesApi.getById returns quotation by ID.");

  // Test 6: Verify no duplicate quotedPrice inline edit in LeadsSection.jsx
  console.log("\n[Test 6] Verify elimination of duplicate quoting field in LeadsSection.jsx");
  const leadsSectionFile = fs.readFileSync(
    path.resolve("./src/admin/features/crm/sections/LeadsSection.jsx"),
    "utf-8"
  );
  assert.ok(
    !leadsSectionFile.includes('value={edit.quotedPrice}'),
    "LeadsSection must NOT have edit.quotedPrice input field"
  );
  assert.ok(
    leadsSectionFile.includes("/admin/quotes"),
    "LeadsSection must direct users to /admin/quotes"
  );
  assert.ok(
    leadsSectionFile.includes("Customer Notes & Dialogue"),
    "LeadsSection must display Customer Notes & Dialogue column"
  );
  console.log("✓ Test 6 Passed: Duplicate quoting field removed; centralized to Quotations Desk.");

  // Test 7: Verify customer conversation notes in Pipeline.jsx, Leads.jsx, LeadCard.jsx, QuoteDetailsDrawer.jsx
  console.log("\n[Test 7] Verify customer notes & quotation handshake across all Leads & Sales views");
  const pipelineFile = fs.readFileSync(path.resolve("./src/admin/features/leads/pages/Pipeline.jsx"), "utf-8");
  assert.ok(pipelineFile.includes("lead.customerResponse?.note"), "Pipeline cards must render customer feedback notes");
  assert.ok(pipelineFile.includes("/admin/quotes?id="), "Pipeline cards must link to Quotations Desk");

  const leadCardFile = fs.readFileSync(path.resolve("./src/admin/components/leads/LeadCard.jsx"), "utf-8");
  assert.ok(leadCardFile.includes("customerResponse?.note"), "LeadCard must render customer feedback note");
  assert.ok(leadCardFile.includes("/admin/quotes?id="), "LeadCard must link to Quotations Desk");

  const quoteDrawerFile = fs.readFileSync(
    path.resolve("./src/admin/features/quotes/components/QuoteDetailsDrawer.jsx"),
    "utf-8"
  );
  assert.ok(
    quoteDrawerFile.includes("Customer Conversation & Dialogue Notes"),
    "QuoteDetailsDrawer must have Customer Conversation & Dialogue Notes section"
  );
  assert.ok(
    quoteDrawerFile.includes("quotesApi.addNote"),
    "QuoteDetailsDrawer must call quotesApi.addNote"
  );

  // Test 8: Non-website quotes appear in quotesApi.list (No restrictive filtering)
  console.log("\n[Test 8] Verify quotesApi.list includes all leads regardless of source (no website restriction)");
  const newLeadRes = await leadsApi.create({
    firstName: "Farhan",
    lastName: "Qureshi",
    email: "farhan@example.com",
    phone: "+919123456789",
    source: "Phone Enquiry",
    destination: "Jeddah & Makkah",
    budget: 350000,
  });
  const createdDraft = quotesApi.createFromLead(newLeadRes);
  assert.ok(createdDraft, "Draft created from offline lead");

  const listAfterOffline = await quotesApi.list({ limit: 100 });
  const foundOffline = listAfterOffline.quotations.find(
    (q) => q._id === createdDraft._id || q.id === createdDraft.id || q.leadId === newLeadRes.id
  );
  assert.ok(foundOffline, "Non-website lead quotation must be visible in quotesApi.list");
  console.log("✓ Test 8 Passed: quotesApi.list includes all quotes regardless of channel/source.");

  // Test 9: sendProposal on unquoted lead synchronizes lead in leadsApi
  console.log("\n[Test 9] Verify quotesApi.sendProposal for unquoted lead updates lead quotedPrice & status");
  const proposalRes = await quotesApi.sendProposal(createdDraft._id, {
    quotedPrice: 340000,
    quoteExpiresAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    notes: "Includes VIP private transfers between airports and 5-star hotels",
  });
  assert.ok(proposalRes.quotation, "Quotation proposal returned");
  assert.strictEqual(proposalRes.quotation.status, "proposal_sent");
  assert.strictEqual(proposalRes.quotation.quotedPrice, 340000);

  const updatedLeadInLeads = await leadsApi.getById(newLeadRes.id);
  assert.strictEqual(updatedLeadInLeads.quotedPrice, 340000, "Lead quotedPrice must sync to 340000");
  assert.strictEqual(updatedLeadInLeads.status, "proposal", "Lead status must move to proposal");
  console.log("✓ Test 9 Passed: sendProposal synchronizes proposal price and status back to leadsApi.");

  // Test 10: leadsApi.update re-normalizes and keeps conversationNote in sync
  console.log("\n[Test 10] Verify leadsApi.update maintains conversationNote synchronization");
  const updatedViaApi = await leadsApi.update(newLeadRes.id, {
    contactNotes: "Customer requested evening call after Maghrib",
  });
  assert.strictEqual(updatedViaApi.contactNotes, "Customer requested evening call after Maghrib");
  assert.strictEqual(updatedViaApi.conversationNote, "Customer requested evening call after Maghrib");
  console.log("✓ Test 10 Passed: leadsApi.update synchronizes conversationNote.");

  // Test 11: Verify QuoteDetailsDrawer active conversation note card & LeadsSection channel badge
  console.log("\n[Test 11] Verify QuoteDetailsDrawer active note card & LeadsSection channel badge");
  assert.ok(
    quoteDrawerFile.includes("Active Customer Conversation Note"),
    "QuoteDetailsDrawer must have Active Customer Conversation Note card"
  );
  assert.ok(
    leadsSectionFile.includes('lead.conversationChannel === "Call" ? "📞"'),
    "LeadsSection must render channel indicator in Customer Notes & Dialogue column"
  );
  console.log("✓ Test 11 Passed: QuoteDetailsDrawer and LeadsSection render channel-aware notes.");

  console.log("\nALL 11 TESTS PASSED SUCCESSFULLY! 🚀");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
