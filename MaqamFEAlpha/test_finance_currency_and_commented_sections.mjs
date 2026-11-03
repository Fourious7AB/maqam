import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("=== RUNNING ADMIN FINANCE TESTS ===");

// 1. Verify OverviewKpiCards.jsx content and exports
const kpiCardsPath = path.join(__dirname, "src/admin/features/finance/components/OverviewKpiCards.jsx");
const kpiCardsSrc = fs.readFileSync(kpiCardsPath, "utf-8");

// Test 1: selectedCurrency prop accepted
assert(
  kpiCardsSrc.includes("selectedCurrency = \"ALL\""),
  "Test 1 Failed: OverviewKpiCards must accept selectedCurrency prop"
);
console.log("✔ Test 1 Passed: OverviewKpiCards accepts selectedCurrency prop");

// Test 2: selectedCurrency prioritized over fallback INR
assert(
  kpiCardsSrc.includes("selectedCurrency && selectedCurrency !== \"ALL\""),
  "Test 2 Failed: OverviewKpiCards must prioritize selectedCurrency over data.currency fallback"
);
console.log("✔ Test 2 Passed: OverviewKpiCards prioritizes selectedCurrency over data.currency fallback");

// Test 3 & 4: Pending Payment and Settled Refunds cards are commented out (not in active code)
const uncommentedSrc = kpiCardsSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");

assert(
  !uncommentedSrc.includes("Pending Payment"),
  "Test 3 Failed: 'Pending Payment' card must not be in active code"
);
assert(
  kpiCardsSrc.includes("Pending Payment"),
  "Test 3b Failed: 'Pending Payment' code should remain commented out, not deleted"
);
console.log("✔ Test 3 Passed: 'Pending Payment' card is cleanly commented out");

assert(
  !uncommentedSrc.includes("Settled Refunds"),
  "Test 4 Failed: 'Settled Refunds' card must not be in active code"
);
assert(
  kpiCardsSrc.includes("Settled Refunds"),
  "Test 4b Failed: 'Settled Refunds' code should remain commented out, not deleted"
);
console.log("✔ Test 4 Passed: 'Settled Refunds' card is cleanly commented out");

// Test 5: Grid updated to 3 columns for balanced UI
assert(
  kpiCardsSrc.includes("grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"),
  "Test 5 Failed: OverviewKpiCards grid should be 3 columns"
);
console.log("✔ Test 5 Passed: OverviewKpiCards grid uses 3 columns for balanced presentation");

// 2. Verify FinanceDashboard.jsx
const dashboardPath = path.join(__dirname, "src/admin/features/finance/pages/FinanceDashboard.jsx");
const dashboardSrc = fs.readFileSync(dashboardPath, "utf-8");

// Test 6: baseCurr prioritizes selected currency
assert(
  dashboardSrc.includes("const baseCurr = currency !== \"ALL\" ? currency : (data?.currency || \"INR\");"),
  "Test 6 Failed: baseCurr must prioritize currency !== 'ALL'"
);
console.log("✔ Test 6 Passed: FinanceDashboard baseCurr prioritizes selected currency");

// Test 7: selectedCurrency passed to OverviewKpiCards
assert(
  dashboardSrc.includes("selectedCurrency={currency}"),
  "Test 7 Failed: OverviewKpiCards must receive selectedCurrency={currency}"
);
console.log("✔ Test 7 Passed: OverviewKpiCards receives selectedCurrency={currency}");

// Test 8: setData retains selected currency
assert(
  dashboardSrc.includes("currency: activeCurr"),
  "Test 8 Failed: setData must preserve active selected currency"
);
console.log("✔ Test 8 Passed: setData preserves active selected currency");

// Test 9: Manage Refunds Queue button commented out
assert(
  dashboardSrc.includes("{/* Commented out per user request: Manage Refunds Queue") ||
  dashboardSrc.includes("{/* Commented out per user request: Refunds Desk navigation button"),
  "Test 9 Failed: 'Manage Refunds Queue' button must be commented out"
);
console.log("✔ Test 9 Passed: 'Manage Refunds Queue' button is commented out");

// Test 10: Refund Incidence card commented out
assert(
  dashboardSrc.includes("{/* Commented out per user request: Refund Incidence metric card"),
  "Test 10 Failed: 'Refund Incidence' metric card must be commented out"
);
console.log("✔ Test 10 Passed: 'Refund Incidence' card is commented out");

// 3. Verify AppRoutes.jsx
const appRoutesPath = path.join(__dirname, "src/admin/routes/AppRoutes.jsx");
const appRoutesSrc = fs.readFileSync(appRoutesPath, "utf-8");

// Test 11: Route finance/refunds commented out
assert(
  appRoutesSrc.includes("{/* <Route path=\"finance/refunds\" element={<Refunds />} /> */}") ||
  appRoutesSrc.includes("// <Route path=\"finance/refunds\""),
  "Test 11 Failed: Route path='finance/refunds' must be commented out in AppRoutes.jsx"
);
console.log("✔ Test 11 Passed: Route path='finance/refunds' is commented out in AppRoutes.jsx");

// Test 12: Refunds import commented out
assert(
  appRoutesSrc.includes("// import Refunds from") ||
  !appRoutesSrc.match(/^import Refunds from/m),
  "Test 12 Failed: Refunds import must be commented out in AppRoutes.jsx"
);
console.log("✔ Test 12 Passed: Refunds import is commented out in AppRoutes.jsx");

// 4. Verify FinanceHeader.jsx
const headerPath = path.join(__dirname, "src/admin/features/finance/components/FinanceHeader.jsx");
const headerSrc = fs.readFileSync(headerPath, "utf-8");

// Test 13: Refunds Desk tab commented out in FinanceHeader
assert(
  headerSrc.includes("// { label: \"Refunds Desk\", to: \"/admin/finance/refunds\"") ||
  !headerSrc.match(/\{\s*label:\s*["']Refunds Desk["']/),
  "Test 13 Failed: Refunds Desk tab must be commented out in FinanceHeader.jsx"
);
console.log("✔ Test 13 Passed: Refunds Desk tab is commented out in FinanceHeader.jsx");

// 5. Verify navigation.js
const navPath = path.join(__dirname, "src/admin/config/navigation.js");
const navSrc = fs.readFileSync(navPath, "utf-8");

// Test 14: Refunds item commented out in navigation.js
assert(
  navSrc.includes("// { label: 'Refunds', to: '/admin/finance/refunds'") ||
  !navSrc.match(/\{\s*label:\s*['"]Refunds['"],\s*to:\s*['"]\/admin\/finance\/refunds['"]/),
  "Test 14 Failed: Refunds item must be commented out in navigation.js"
);
console.log("✔ Test 14 Passed: Refunds item is commented out in navigation.js");

// 6. Test financeApi getOverview logic for currency and date range
import { financeApi } from "./src/admin/features/finance/financeApi.js";

// Test 15: USD selection returns USD currency even in fallback
const resUSD = await financeApi.getOverview({ currency: "USD" });
assert.strictEqual(resUSD.currency, "USD", "Test 15 Failed: res.currency must be USD");
console.log("✔ Test 15 Passed: financeApi.getOverview({ currency: 'USD' }) returns currency='USD'");

// Test 16: Today preset with USD returns USD currency and scaled metrics
const todayStr = new Date().toISOString().split("T")[0];
const resTodayUSD = await financeApi.getOverview({
  startDate: todayStr,
  endDate: todayStr,
  currency: "USD",
});
assert.strictEqual(resTodayUSD.currency, "USD", "Test 16 Failed: resTodayUSD.currency must be USD");
assert(resTodayUSD.grossRevenue > 0, "Test 16b Failed: grossRevenue should be valid");
console.log("✔ Test 16 Passed: financeApi.getOverview with Today filter + USD returns currency='USD'");

// Test 17: Today preset with EUR returns EUR currency
const resTodayEUR = await financeApi.getOverview({
  startDate: todayStr,
  endDate: todayStr,
  currency: "EUR",
});
assert.strictEqual(resTodayEUR.currency, "EUR", "Test 17 Failed: resTodayEUR.currency must be EUR");
console.log("✔ Test 17 Passed: financeApi.getOverview with Today filter + EUR returns currency='EUR'");

// Test 18: Today preset with AED returns AED currency
const resTodayAED = await financeApi.getOverview({
  startDate: todayStr,
  endDate: todayStr,
  currency: "AED",
});
assert.strictEqual(resTodayAED.currency, "AED", "Test 18 Failed: resTodayAED.currency must be AED");
console.log("✔ Test 18 Passed: financeApi.getOverview with Today filter + AED returns currency='AED'");

console.log("\nALL 18 TESTS PASSED SUCCESSFULLY! 🎉\n");
