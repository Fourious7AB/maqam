#!/usr/bin/env node
/**
 * compare-farequote.js
 *
 * Diagnostic tool: runs Search, picks one fare per unique airline,
 * calls FareQuote on each, and saves the RAW SRDV response as JSON files
 * in testing/raw/ for side-by-side comparison.
 *
 * Usage:
 *   node compare-farequote.js
 *   node compare-farequote.js --origin BOM --dest DEL --date 2026-09-01
 *   node compare-farequote.js --airlines SG,9I,6E   # only compare these
 *   node compare-farequote.js --all                  # pick ALL options, not just one per airline
 */

require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { setTimeout: sleep } = require("timers/promises");

// Go directly to the SRDV client + adapter internals — we need raw responses
const {fareQuote} = require("../../../providers/srdv/srdv.client");
const {
  searchFlightsService,
  getCachedSearchEntryService,
} = require("../flight.service");

// ── CLI ──
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const val = process.argv[i + 1];
  return val && !val.startsWith("--") ? val : true;
}
const hasFlag = (name) => process.argv.includes(`--${name}`);

const ORIGIN = arg("origin", "DEL");
const DESTINATION = arg("dest", "BOM");
const DEPART_DATE = arg("date", "2026-08-15");
const AIRLINE_FILTER = arg("airlines", null); // comma-separated: "SG,9I,6E"
const PICK_ALL = hasFlag("all");

const RAW_DIR = path.join(__dirname, "raw");

// ── Colors ──
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

const ok = (msg) => console.log(`  ${c.green}✅ ${msg}${c.reset}`);
const fail = (msg) => console.log(`  ${c.red}❌ ${msg}${c.reset}`);
const warn = (msg) => console.log(`  ${c.yellow}⚠️  ${msg}${c.reset}`);
const info = (msg) => console.log(`  ${c.cyan}ℹ  ${msg}${c.reset}`);
const heading = (msg) =>
  console.log(`\n${c.bold}${c.magenta}═══ ${msg} ═══${c.reset}`);

async function main() {
  heading("FAREQUOTE RAW COMPARISON");
  console.log(`  Route: ${ORIGIN} → ${DESTINATION} on ${DEPART_DATE}`);

  // Ensure raw output directory exists
  if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });

  await mongoose.connect(process.env.MONGO_URI);
  ok("Connected to MongoDB");

  // ── Search ──
  heading("SEARCH");
  const search = await searchFlightsService({
    origin: ORIGIN,
    destination: DESTINATION,
    departDate: DEPART_DATE,
    passengers: 1,
    journeyType: "oneway",
  });
  ok(`traceId: ${search.traceId} — ${search.outbound.length} options`);

  info("Waiting 3s for cache...");
  await sleep(3000);

  // ── Enrich with cache data (need srdvType, srdvIndex, isLCC) ──
  const enriched = [];
  for (const o of search.outbound) {
    try {
      const entry = await getCachedSearchEntryService(search.traceId, o.resultIndex);
      enriched.push({
        resultIndex: o.resultIndex,
        srdvIndex: entry.srdvIndex,
        srdvType: entry.srdvType,
        isLCC: entry.isLCC,
        airlineCode: o.segments?.[0]?.airlineCode || "??",
        airlineName: o.segments?.[0]?.airline || "Unknown",
        fare: o.totalAmount,
      });
    } catch (err) {
      warn(`Skip ${o.resultIndex}: ${err.message}`);
    }
  }

  // ── Filter by airline if specified ──
  let candidates = enriched;
  if (AIRLINE_FILTER) {
    const wanted = AIRLINE_FILTER.toUpperCase().split(",").map((s) => s.trim());
    candidates = candidates.filter((o) => wanted.includes(o.airlineCode.toUpperCase()));
  }

  // ── Pick one per airline (unless --all) ──
  let picks;
  if (PICK_ALL) {
    picks = candidates;
  } else {
    const seen = new Set();
    picks = [];
    for (const o of candidates) {
      if (!seen.has(o.airlineCode)) {
        seen.add(o.airlineCode);
        picks.push(o);
      }
    }
  }

  info(`${picks.length} FareQuote call(s) to make (${[...new Set(picks.map((p) => p.airlineCode))].join(", ")})`);

  // ── Call FareQuote for each and save raw response ──
  heading("FAREQUOTE CALLS");

  const comparison = []; // { airline, file, fareKeys, requiredFlags, ... }

  for (const pick of picks) {
    const label = `${pick.airlineCode} (${pick.airlineName}) — ₹${pick.fare} — ${pick.isLCC ? "LCC" : "GDS"}`;
    console.log(`\n  ${c.bold}→ ${label}${c.reset}`);

    try {
      // Call the raw SRDV client directly — no normalization
      const rawResponse = await fareQuote({
        srdvType: pick.srdvType,
        traceId: search.traceId,
        srdvIndex: pick.srdvIndex,
        resultIndex: pick.resultIndex,
      });

      // Save to file
      const filename = `${pick.airlineCode}_${pick.isLCC ? "LCC" : "GDS"}_farequote.json`;
      const filepath = path.join(RAW_DIR, filename);
      fs.writeFileSync(filepath, JSON.stringify(rawResponse, null, 2));
      ok(`Raw response saved → raw/${filename}`);

      // Extract key fields for comparison table
      const results = rawResponse.Results || {};
      const fare = results.Fare || {};
      const fareKeys = Object.keys(fare).sort();
      const seg = results.Segments?.[0]?.[0] || {};

      const entry = {
        airline: pick.airlineCode,
        airlineName: pick.airlineName,
        isLCC: pick.isLCC,
        file: filename,
        error: rawResponse.Error?.ErrorCode !== "0" ? rawResponse.Error : null,
        // Key fields that might differ between carriers
        fareKeys,
        fareFieldCount: fareKeys.length,
        isPassportRequired: results.IsPassportRequiredAtBook,
        isPassportFullDetail: results.IsPassportFullDetailRequiredAtBook,
        passportExpiry: results.IsPassportExpiryRequired,
        passportIssueDate: results.IsPassportIssueDateRequired,
        adultDob: results.AdultDobRequired,
        childDob: results.ChildDobRequired,
        infantDob: results.InfantDobRequired,
        holdAllowed: results.HoldAllowed,
        seatSelect: results.SeatSelectAllowed,
        isGstMandatory: results.IsGSTMandatory,
        isRefundable: results.IsRefundable,
        // Fare amounts
        baseFare: fare.BaseFare,
        tax: fare.Tax,
        offeredFare: fare.OfferedFare,
        publishedFare: fare.PublishedFare,
        transactionFee: fare.TransactionFee,
        transactionFeeType: typeof fare.TransactionFee,
        airTransFee: fare.AirTransFee,
        airTransFeeType: typeof fare.AirTransFee,
        // Segment info
        segAirlineCode: seg.Airline?.AirlineCode,
        segFlightNo: seg.Airline?.FlightNumber,
        // Any extra top-level keys we might be missing
        topLevelKeys: Object.keys(results).sort(),
      };

      comparison.push(entry);
    } catch (err) {
      fail(`FareQuote failed: ${err.message}`);
      comparison.push({
        airline: pick.airlineCode,
        airlineName: pick.airlineName,
        isLCC: pick.isLCC,
        error: err.message,
      });
    }
  }

  // ── Comparison table ──
  heading("COMPARISON");

  // Print side-by-side differences
  if (comparison.length >= 2) {
    console.log(`\n  ${c.bold}Field differences between carriers:${c.reset}\n`);

    // Collect all unique top-level keys across all carriers
    const allTopKeys = [...new Set(comparison.flatMap((c) => c.topLevelKeys || []))].sort();
    const allFareKeys = [...new Set(comparison.flatMap((c) => c.fareKeys || []))].sort();

    // Print requirement flags comparison
    const reqFields = [
      "isPassportRequired",
      "isPassportFullDetail",
      "passportExpiry",
      "passportIssueDate",
      "adultDob",
      "childDob",
      "infantDob",
      "holdAllowed",
      "seatSelect",
      "isGstMandatory",
      "isRefundable",
    ];

    // Header
    const airlineHeaders = comparison.map((c) => c.airline.padEnd(12)).join("");
    console.log(`  ${"Field".padEnd(30)} ${airlineHeaders}`);
    console.log(`  ${"─".repeat(30 + comparison.length * 12)}`);

    for (const field of reqFields) {
      const values = comparison.map((c) => {
        const v = c[field];
        if (v === undefined || v === null) return "—".padEnd(12);
        return String(v).padEnd(12);
      });

      // Highlight if values differ across airlines
      const uniqueVals = [...new Set(comparison.map((c) => String(c[field])))];
      const prefix = uniqueVals.length > 1 ? `${c.yellow}⚡` : "  ";
      const suffix = uniqueVals.length > 1 ? c.reset : "";

      console.log(`${prefix} ${field.padEnd(30)} ${values.join("")}${suffix}`);
    }

    // Fare keys comparison
    console.log(`\n  ${c.bold}Fare object keys:${c.reset}`);
    for (const entry of comparison) {
      console.log(`  ${c.cyan}${entry.airline}${c.reset}: [${entry.fareKeys?.join(", ") || "N/A"}]`);
    }

    // Fare field types (the TransactionFee string/number issue)
    console.log(`\n  ${c.bold}Fare field types (TransactionFee/AirTransFee):${c.reset}`);
    for (const entry of comparison) {
      console.log(
        `  ${c.cyan}${entry.airline}${c.reset}: TransactionFee=${entry.transactionFee} (${entry.transactionFeeType}) | AirTransFee=${entry.airTransFee} (${entry.airTransFeeType})`
      );
    }

    // Top-level Results keys comparison
    console.log(`\n  ${c.bold}Top-level Results keys per carrier:${c.reset}`);
    for (const entry of comparison) {
      console.log(`  ${c.cyan}${entry.airline}${c.reset}: [${entry.topLevelKeys?.join(", ") || "N/A"}]`);
    }

    // Highlight keys that exist in one carrier but not another
    if (comparison.length === 2) {
      const [a, b] = comparison;
      const onlyInA = (a.topLevelKeys || []).filter((k) => !(b.topLevelKeys || []).includes(k));
      const onlyInB = (b.topLevelKeys || []).filter((k) => !(a.topLevelKeys || []).includes(k));
      if (onlyInA.length) warn(`Keys only in ${a.airline}: ${onlyInA.join(", ")}`);
      if (onlyInB.length) warn(`Keys only in ${b.airline}: ${onlyInB.join(", ")}`);

      const fareOnlyInA = (a.fareKeys || []).filter((k) => !(b.fareKeys || []).includes(k));
      const fareOnlyInB = (b.fareKeys || []).filter((k) => !(a.fareKeys || []).includes(k));
      if (fareOnlyInA.length) warn(`Fare keys only in ${a.airline}: ${fareOnlyInA.join(", ")}`);
      if (fareOnlyInB.length) warn(`Fare keys only in ${b.airline}: ${fareOnlyInB.join(", ")}`);
    }
  }

  // Final file listing
  heading("SAVED FILES");
  for (const entry of comparison) {
    if (entry.file) {
      console.log(`  ${c.green}raw/${entry.file}${c.reset}`);
    }
  }
  console.log(`\n  Compare with: ${c.dim}diff raw/SG_LCC_farequote.json raw/9I_LCC_farequote.json${c.reset}`);
  console.log(`  Or open both in VS Code and use the built-in diff viewer.`);
}

main()
  .catch((err) => {
    console.error(`\n${c.red}Script crashed:${c.reset}`, err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
