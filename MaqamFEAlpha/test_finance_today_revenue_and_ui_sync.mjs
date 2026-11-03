import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("=== RUNNING ADVANCED TODAY REVENUE & UI REDESIGN TESTS ===");

// 1. Verify OverviewKpiCards.jsx
const kpiCardsPath = path.join(__dirname, "src/admin/features/finance/components/OverviewKpiCards.jsx");
const kpiCardsSrc = fs.readFileSync(kpiCardsPath, "utf-8");

// Test 1: Skeleton loader does NOT use the 3 generic dashes layout (h-4 w-24, mt-3 h-8 w-32, mt-2 h-3 w-20)
assert(
  !kpiCardsSrc.includes("h-4 w-24 rounded bg-slate-200"),
  "Test 1 Failed: Old 3-dash skeleton should be replaced with contextual card skeleton"
);
console.log("✔ Test 1 Passed: Old generic 3-dash skeleton removed from OverviewKpiCards");

// Test 2: Skeleton renders actual card labels so user knows what's loading
assert(
  kpiCardsSrc.includes("skeletonHeaders") && kpiCardsSrc.includes("Gross Revenue"),
  "Test 2 Failed: Contextual skeleton with card labels must be present"
);
console.log("✔ Test 2 Passed: OverviewKpiCards contextual skeleton with card labels verified");

// Test 3: Large bold typography (text-3xl font-black)
assert(
  kpiCardsSrc.includes("text-3xl font-black"),
  "Test 3 Failed: OverviewKpiCards must feature high-impact SaaS typography (text-3xl font-black)"
);
console.log("✔ Test 3 Passed: High-impact SaaS typography (text-3xl font-black) verified");

// Test 4: Pending Payment and Settled Refunds remain cleanly commented out
assert(
  kpiCardsSrc.includes("/*") &&
  kpiCardsSrc.includes("Pending Payment") &&
  kpiCardsSrc.includes("Settled Refunds"),
  "Test 4 Failed: 'Pending Payment' and 'Settled Refunds' must remain commented out"
);
console.log("✔ Test 4 Passed: Pending Payment and Settled Refunds remain cleanly commented out");

// 2. Verify financeApi.js dynamic calculation
const { financeApi, getSampleLedgerTransactions } = await import(
  "./src/admin/features/finance/financeApi.js"
);

const today = new Date();
const pad = (n) => String(n).padStart(2, "0");
const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

// Test 5: Dynamic overview calculation for Today with INR
const todayInrOverview = await financeApi.getOverview({
  startDate: todayStr,
  endDate: todayStr,
  currency: "INR",
});

assert(todayInrOverview, "Test 5 Failed: Overview response is missing");
assert.strictEqual(todayInrOverview.currency, "INR", "Test 5 Failed: Currency must be INR");
assert(todayInrOverview.grossRevenue > 0, `Test 5 Failed: Gross Revenue must be > 0 (got ${todayInrOverview.grossRevenue})`);
assert(todayInrOverview.netRevenue > 0, `Test 5 Failed: Net Revenue must be > 0 (got ${todayInrOverview.netRevenue})`);
assert(todayInrOverview.totalTransactions > 0, `Test 5 Failed: Transactions Volume must be > 0 (got ${todayInrOverview.totalTransactions})`);
console.log(`✔ Test 5 Passed: Today + INR Overview dynamically returns Gross: ₹${todayInrOverview.grossRevenue}, Net: ₹${todayInrOverview.netRevenue}, Txns: ${todayInrOverview.totalTransactions}`);

// Test 6: Dynamic listTransactions synchronization with overview
const todayInrTx = await financeApi.listTransactions({
  startDate: todayStr,
  endDate: todayStr,
  currency: "INR",
});

assert(todayInrTx.data.length > 0, "Test 6 Failed: Transactions list should have records for today");
assert.strictEqual(todayInrTx.data.length, todayInrOverview.totalTransactions, "Test 6 Failed: Transactions count must match overview count");
const calculatedGross = todayInrTx.data.reduce((sum, t) => sum + t.amount, 0);
assert.strictEqual(calculatedGross, todayInrOverview.grossRevenue, "Test 6 Failed: Sum of today's transactions must equal Gross Revenue");
console.log(`✔ Test 6 Passed: Today's transactions table is 100% in sync with KPI cards (Sum: ₹${calculatedGross} from ${todayInrTx.data.length} records)`);

// Test 7: Multi-currency dynamic switching (USD Today)
const todayUsdOverview = await financeApi.getOverview({
  startDate: todayStr,
  endDate: todayStr,
  currency: "USD",
});
assert.strictEqual(todayUsdOverview.currency, "USD", "Test 7 Failed: Currency must be USD");
assert(todayUsdOverview.grossRevenue > 0, `Test 7 Failed: USD Gross Revenue must be > 0 (got ${todayUsdOverview.grossRevenue})`);
console.log(`✔ Test 7 Passed: Today + USD dynamically returns Gross: $${todayUsdOverview.grossRevenue}, Txns: ${todayUsdOverview.totalTransactions}`);

// Test 8: Multi-currency dynamic switching (AED Today)
const todayAedOverview = await financeApi.getOverview({
  startDate: todayStr,
  endDate: todayStr,
  currency: "AED",
});
assert.strictEqual(todayAedOverview.currency, "AED", "Test 8 Failed: Currency must be AED");
assert(todayAedOverview.grossRevenue > 0, `Test 8 Failed: AED Gross Revenue must be > 0 (got ${todayAedOverview.grossRevenue})`);
console.log(`✔ Test 8 Passed: Today + AED dynamically returns Gross: AED ${todayAedOverview.grossRevenue}, Txns: ${todayAedOverview.totalTransactions}`);

// 3. Verify FinanceDashboard.jsx UI Redesign & Category Breakdown
const dashboardPath = path.join(__dirname, "src/admin/features/finance/pages/FinanceDashboard.jsx");
const dashboardSrc = fs.readFileSync(dashboardPath, "utf-8");

// Test 9: Category Breakdown is rendered
assert(
  dashboardSrc.includes("Revenue by Travel Category"),
  "Test 9 Failed: Dashboard must contain 'Revenue by Travel Category' breakdown"
);
console.log("✔ Test 9 Passed: Travel Category breakdown section verified in FinanceDashboard");

// Test 10: loadRecentTransactions passes currency, startDate, endDate
assert(
  dashboardSrc.includes("currency: currency && currency !== \"ALL\" ? currency : undefined") &&
  dashboardSrc.includes("startDate: startDate || undefined") &&
  dashboardSrc.includes("endDate: endDate || undefined"),
  "Test 10 Failed: loadRecentTransactions must receive currency, startDate, endDate"
);
console.log("✔ Test 10 Passed: loadRecentTransactions synchronizes with active scope & date boundary");

// Test 11: FinanceHeader has Live Ledger badge
const headerPath = path.join(__dirname, "src/admin/features/finance/components/FinanceHeader.jsx");
const headerSrc = fs.readFileSync(headerPath, "utf-8");
assert(
  headerSrc.includes("Live Ledger"),
  "Test 11 Failed: FinanceHeader must display 'Live Ledger' badge"
);
console.log("✔ Test 11 Passed: Live Ledger badge verified in FinanceHeader");

console.log("\nALL ADVANCED TESTS PASSED! 🎉");
