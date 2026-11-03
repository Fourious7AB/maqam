#!/usr/bin/env node
/**
 * BookingTesting.js — LCC / GDS end-to-end flight booking test
 *
 * Runs IN-PROCESS against the real service layer (not over HTTP) so that
 * internal-only fields like `isLCC` are visible per option.
 *
 * Usage:
 *   node BookingTesting.js                          # test all LCC fares, stop after first success
 *   node BookingTesting.js --dry-run                # stop after FareQuote, never call Book
 *   node BookingTesting.js --book-all               # try booking every matching option
 *   node BookingTesting.js --airline SG             # only test SpiceJet
 *   node BookingTesting.js --airline 9I --with-docs # test Alliance Air with Aadhaar doc attached
 *   node BookingTesting.js --mode gds               # test GDS fares only
 *   node BookingTesting.js --mode both              # test LCC + GDS
 *   node BookingTesting.js --origin BOM --dest DEL  # custom route
 *   node BookingTesting.js --date 2026-09-01        # custom departure date
 *   node BookingTesting.js --user-id <id>           # override test user ObjectId
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { setTimeout: sleep } = require("timers/promises");
const {
  searchFlightsService,
  getCachedSearchEntryService,
  getFareQuoteService,
  bookFlightService,
} = require("../flight.service");

// ──────────────────────────────────────────────
// CLI helpers
// ──────────────────────────────────────────────
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const val = process.argv[i + 1];
  return val && !val.startsWith("--") ? val : true;
}
const hasFlag = (name) => process.argv.includes(`--${name}`);

// ──────────────────────────────────────────────
// Config — override via CLI flags
// ──────────────────────────────────────────────
const ORIGIN = arg("origin", "DEL");
const DESTINATION = arg("dest", "BOM");
const DEPART_DATE = arg("date", "2026-08-15");
const RETURN_DATE = arg("return-date", null);
const JOURNEY_TYPE = RETURN_DATE ? "roundtrip" : "oneway";
const USER_ID = arg("user-id", "6a6726b36243d9d5387a79aa");
const DRY_RUN = hasFlag("dry-run");
const BOOK_ALL = hasFlag("book-all");
const WITH_DOCS = hasFlag("with-docs");
const AIRLINE_FILTER = arg("airline", null); // e.g. "SG", "9I", "6E"
const MODE = arg("mode", "lcc"); // "lcc" | "gds" | "both"
const WAIT_MS = Number(arg("wait", 3000)); // ms to wait after search for cache to settle

// ──────────────────────────────────────────────
// Test passenger data
// ──────────────────────────────────────────────
const TEST_TRAVELLER_DETAILS = {
  title: "Mr",
  firstName: "Rahul",
  lastName: "poor",
  passengerType: "Adult",
  gender: "Male",
  dateOfBirth: "1992-08-15",
  email: "rahul.sharma@example.com",
  phone: "9876543210",
  cellCountryCode: "+91",
  addressLine1: "Flat 402 Sunshine Apartments",
  city: "Mumbai",
  countryCode: "IN",
  countryName: "INDIA",
  // Document fields — only populated when --with-docs is passed
  ...(WITH_DOCS && {
    documentType: "Aadhaar",
    documentId: "123456789012",
  }),
};

const TEST_GST_DETAILS = {
  gstNumber: "22AAAAA0000A1Z5",
  companyName: "Example Pvt Ltd",
  address: "123 Main Street",
  contactNumber: "9876543210",
  email: "gst@example.com",
};

// ──────────────────────────────────────────────
// Pretty output helpers
// ──────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  bgGreen: "\x1b[42m",
  bgRed: "\x1b[41m",
  bgYellow: "\x1b[43m",
};

const ok = (msg) => console.log(`  ${c.green}✅ ${msg}${c.reset}`);
const fail = (msg) => console.log(`  ${c.red}❌ ${msg}${c.reset}`);
const warn = (msg) => console.log(`  ${c.yellow}⚠️  ${msg}${c.reset}`);
const info = (msg) => console.log(`  ${c.cyan}ℹ  ${msg}${c.reset}`);
const heading = (msg) =>
  console.log(`\n${c.bold}${c.magenta}═══ ${msg} ═══${c.reset}`);
const subheading = (msg) =>
  console.log(`\n${c.bold}--- ${msg} ---${c.reset}`);

function elapsed(startMs) {
  const ms = Date.now() - startMs;
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
async function main() {
  // ── Print config ──
  heading("FLIGHT BOOKING TEST");
  console.log(`  Route:     ${c.bold}${ORIGIN} → ${DESTINATION}${c.reset}`);
  console.log(`  Date:      ${DEPART_DATE}${RETURN_DATE ? ` / return ${RETURN_DATE}` : ""}`);
  console.log(`  Journey:   ${JOURNEY_TYPE}`);
  console.log(`  Mode:      ${MODE.toUpperCase()} fares`);
  console.log(`  User ID:   ${USER_ID}`);
  console.log(`  Dry run:   ${DRY_RUN ? "YES — will NOT book" : "no"}`);
  console.log(`  Book all:  ${BOOK_ALL ? "YES" : "no — stop after first success"}`);
  console.log(`  Airline:   ${AIRLINE_FILTER || "all"}`);
  console.log(`  With docs: ${WITH_DOCS ? `YES (${TEST_TRAVELLER_DETAILS.documentType})` : "no"}`);

  if (!USER_ID || USER_ID === true) {
    fail("Need a userId — pass --user-id <id>");
    process.exit(1);
  }

  // ── Connect ──
  await mongoose.connect(process.env.MONGO_URI);
  ok("Connected to MongoDB");

  // ── Search ──
  heading("SEARCH");
  const t0 = Date.now();
  const search = await searchFlightsService({
    origin: ORIGIN,
    destination: DESTINATION,
    departDate: DEPART_DATE,
    returnDate: RETURN_DATE,
    passengers: 1,
    journeyType: JOURNEY_TYPE,
  });
  ok(`Search complete in ${elapsed(t0)} — traceId: ${c.bold}${search.traceId}${c.reset}`);
  console.log(`  ${search.outbound.length} outbound options returned`);
  if (search.inbound) {
    console.log(`  ${search.inbound.length} inbound options returned`);
  }

  // Wait for cache to settle (Redis write may be async)
  info(`Waiting ${WAIT_MS}ms for cache to settle...`);
  await sleep(WAIT_MS);

  // ── Enrich with internal fields ──
  subheading("Enriching options with cache data (isLCC, airline)");
  const enriched = [];
  for (const group of search.outbound) {
    const segments = group.segments || [];
    const airlineCode = segments[0]?.airlineCode || "??";
    const airlineName = segments[0]?.airline || "Unknown";
    for (const fare of group.fares || []) {
      try {
        const entry = await getCachedSearchEntryService(search.traceId, fare.resultIndex);
        enriched.push({
          resultIndex: fare.resultIndex,
          totalAmount: fare.totalAmount,
          isRefundable: fare.isRefundable,
          segments,
          isLCC: entry.isLCC,
          airlineCode,
          airlineName,
        });
      } catch (err) {
        warn(`Could not enrich resultIndex ${fare.resultIndex}: ${err.message}`);
      }
    }
  }

  // ── Filter by mode + airline ──
  let candidates = enriched;

  if (MODE === "lcc") {
    candidates = candidates.filter((o) => o.isLCC);
  } else if (MODE === "gds") {
    candidates = candidates.filter((o) => !o.isLCC);
  }
  // "both" = no isLCC filter

  if (AIRLINE_FILTER) {
    const filter = AIRLINE_FILTER.toUpperCase();
    candidates = candidates.filter(
      (o) => o.airlineCode.toUpperCase() === filter
    );
  }

  // ── Print candidate summary ──
  subheading(`Candidates: ${candidates.length} of ${enriched.length} options`);
  if (candidates.length === 0) {
    warn("No options match your filters. Try different --mode, --airline, or route.");
    return;
  }

  // Group by airline for a quick summary
  const byAirline = {};
  for (const o of candidates) {
    const key = `${o.airlineCode} (${o.airlineName})`;
    if (!byAirline[key]) byAirline[key] = { count: 0, lcc: 0, gds: 0 };
    byAirline[key].count++;
    if (o.isLCC) byAirline[key].lcc++;
    else byAirline[key].gds++;
  }
  for (const [airline, stats] of Object.entries(byAirline)) {
    console.log(
      `  ${c.bold}${airline}${c.reset}: ${stats.count} option(s) — ` +
        `${stats.lcc} LCC, ${stats.gds} GDS`
    );
  }

  // ── FareQuote + Book loop ──
  heading("FARE QUOTE → BOOK");
  const results = []; // { resultIndex, airline, fareQuote, book, error }

  for (const option of candidates) {
    const label = `${option.airlineCode} | ${option.resultIndex} | ₹${option.totalAmount} | ${option.isLCC ? "LCC" : "GDS"}`;
    subheading(label);

    const result = {
      resultIndex: option.resultIndex,
      airline: option.airlineCode,
      type: option.isLCC ? "LCC" : "GDS",
      fare: option.totalAmount,
      fareQuote: null,
      book: null,
      error: null,
    };

    try {
      // ── FareQuote ──
      const tFQ = Date.now();
      const fq = await getFareQuoteService(search.traceId, option.resultIndex);

      if (fq.priceChanged) {
        warn(`Price/time changed at FareQuote — skipping`);
        result.error = "Price changed";
        results.push(result);
        continue;
      }

      console.log("\n Fare Quote: \n",fq)
      result.fareQuote = {
        confirmedFare: fq.confirmedFare,
        isGstMandatory: fq.isGstMandatory,
        required: fq.required,
      };

      ok(`FareQuote OK (${elapsed(tFQ)}) — fare: ₹${fq.confirmedFare}`);

      // Log any non-default requirements (helps diagnose carrier-specific issues)
      const reqs = fq.required || {};
      const activeReqs = Object.entries(reqs)
        .filter(([, v]) => v === true)
        .map(([k]) => k);
      if (activeReqs.length > 0) {
        warn(`Active requirements: ${activeReqs.join(", ")}`);
      } else {
        info("No special requirements flagged");
      }

      if (fq.isGstMandatory) {
        warn("GST is mandatory for this fare — will include test GST details");
      }

      // ── Book ──
      if (DRY_RUN) {
        info("--dry-run: stopping before Book");
        result.book = "DRY_RUN";
        results.push(result);
        continue;
      }

      // Auto-enrich traveller with passport/DOB if the carrier requires it
      const travellerForBook = { ...TEST_TRAVELLER_DETAILS };
      if (reqs.passport || reqs.passportFullDetail) {
        travellerForBook.passportNo = travellerForBook.passportNo || "J1234567";
        travellerForBook.passportExpiry = travellerForBook.passportExpiry || "2032-12-31";
        travellerForBook.passportIssueDate = travellerForBook.passportIssueDate || "2022-01-15";
        travellerForBook.passportIssueCountryCode = travellerForBook.passportIssueCountryCode || "IN";
        warn("Auto-added passport details for this carrier's requirements");
      }

      info("Calling Book...");
      const tBook = Date.now();
      const bookResult = await bookFlightService({
        userId: USER_ID,
        traceId: search.traceId,
        resultIndex: option.resultIndex,
        passengers: [
          {
            isLeadPax: true,
            saveToProfile: false,
            travellerDetails: travellerForBook,
          },
        ],
        gstDetails: fq.isGstMandatory ? TEST_GST_DETAILS : null,
      });

      ok(`BOOKED in ${elapsed(tBook)}`);
      console.log(`    bookingId:      ${c.bold}${bookResult.bookingId}${c.reset}`);
      console.log(`    paymentOrderId: ${bookResult.paymentOrderId}`);
      console.log(`    amount:         ₹${bookResult.amount}`);

      result.book = bookResult;
      results.push(result);

      if (!BOOK_ALL) {
        info("Stopping after first successful booking. Use --book-all to continue.");
        break;
      }
    } catch (err) {
      fail(`${err.message}`);
      result.error = err.message;
      results.push(result);
      // Keep trying next candidate
    }
  }

  // ── Final summary ──
  heading("RESULTS SUMMARY");
  const colW = { idx: 18, airline: 8, type: 5, fare: 10, status: 40 };
  const pad = (s, w) => String(s).padEnd(w);

  console.log(
    `  ${c.bold}${pad("ResultIndex", colW.idx)} ${pad("Airline", colW.airline)} ${pad("Type", colW.type)} ${pad("Fare", colW.fare)} Status${c.reset}`
  );
  console.log(`  ${"─".repeat(colW.idx + colW.airline + colW.type + colW.fare + colW.status)}`);

  let successCount = 0;
  let failCount = 0;

  for (const r of results) {
    let status;
    if (r.book === "DRY_RUN") {
      status = `${c.yellow}DRY RUN (FQ OK)${c.reset}`;
    } else if (r.book) {
      status = `${c.green}✅ BOOKED — ${r.book.bookingId}${c.reset}`;
      successCount++;
    } else {
      status = `${c.red}❌ ${(r.error || "Unknown error").slice(0, 50)}${c.reset}`;
      failCount++;
    }

    console.log(
      `  ${pad(r.resultIndex, colW.idx)} ${pad(r.airline, colW.airline)} ${pad(r.type, colW.type)} ${pad("₹" + r.fare, colW.fare)} ${status}`
    );
  }

  console.log();
  console.log(`  ${c.green}Succeeded: ${successCount}${c.reset}  |  ${c.red}Failed: ${failCount}${c.reset}  |  Total: ${results.length}`);

  if (WITH_DOCS) {
    info(`DocumentType/DocumentId were included in the passenger payload`);
  }
}

main()
  .catch((err) => {
    console.error(`\n${c.red}${c.bold}Script crashed:${c.reset}`, err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
