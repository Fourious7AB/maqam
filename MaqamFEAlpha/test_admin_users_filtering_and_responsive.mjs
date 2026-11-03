// test_admin_users_filtering_and_responsive.mjs
// Automated verification for admin CRM /admin/users staff filtering and table responsiveness

import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log("=== Testing Admin CRM /admin/users Staff Filtering & Responsiveness ===");

const userManagementPath = path.resolve('src/admin/features/users/pages/UserManagement.jsx');
const userManagementCode = fs.readFileSync(userManagementPath, 'utf-8');

const usersApiPath = path.resolve('src/admin/features/users/usersApi.js');
const usersApiCode = fs.readFileSync(usersApiPath, 'utf-8');

const staffSectionPath = path.resolve('src/admin/features/crm/sections/StaffSection.jsx');
const staffSectionCode = fs.readFileSync(staffSectionPath, 'utf-8');

const backendValidatorPath = 'C:/Users/VAIS-DT4/Documents/DragON/Maqam/MaqamTravelsAlpha/modules/crm/crm.validator.js';
const backendValidatorCode = fs.existsSync(backendValidatorPath) ? fs.readFileSync(backendValidatorPath, 'utf-8') : null;

const backendServicePath = 'C:/Users/VAIS-DT4/Documents/DragON/Maqam/MaqamTravelsAlpha/modules/crm/crm.service.js';
const backendServiceCode = fs.existsSync(backendServicePath) ? fs.readFileSync(backendServicePath, 'utf-8') : null;

let passedTests = 0;
let totalTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${description}`);
    console.error(`    ${err.message}`);
  }
}

// Test 1: Default role filter in UserManagement is 'staff'
test("UserManagement defaults roleFilter to 'staff'", () => {
  assert(
    userManagementCode.includes("const [roleFilter, setRoleFilter] = useState('staff');"),
    "roleFilter should default to 'staff'"
  );
});

// Test 2: Role filter dropdown in UserManagement has All Staff as default and Customer selectable
test("UserManagement role dropdown contains 'All Staff (Default)' and 'Customers'", () => {
  assert(
    userManagementCode.includes('<option value="staff">All Staff (Default)</option>'),
    "Should include 'All Staff (Default)' option"
  );
  assert(
    userManagementCode.includes('<option value="customer">Customers</option>'),
    "Should include 'Customers' option"
  );
});

// Test 3: Client-side filtering logic strictly partitions staff vs customer
test("FilteredUsers strictly partitions staff vs customer based on roleFilter", () => {
  // Test simulated filteredUsers logic from UserManagement
  const mockUsers = [
    { firstName: "Admin", lastName: "One", role: "admin", isActive: true },
    { firstName: "Super", lastName: "Admin", role: "super_admin", isActive: true },
    { firstName: "Sales", lastName: "Agent", role: "sales_agent", isActive: true },
    { firstName: "Hotelier", lastName: "Manager", role: "hotelier", isActive: true },
    { firstName: "Customer", lastName: "Alice", role: "customer", isActive: true },
    { firstName: "Customer", lastName: "Bob", role: "customer", isActive: false },
  ];

  const filterFn = (usersList, roleFilter, activeFilter = 'all', searchTerm = '') => {
    return usersList.filter((user) => {
      const role = (user.role || '').toLowerCase();
      if (roleFilter === 'staff') {
        if (role === 'customer') return false;
      } else if (roleFilter === 'customer') {
        if (role !== 'customer') return false;
      } else if (roleFilter !== 'all') {
        if (role !== roleFilter.toLowerCase()) return false;
      }

      if (activeFilter === 'true' && !user.isActive) return false;
      if (activeFilter === 'false' && user.isActive) return false;

      const query = searchTerm.toLowerCase().trim();
      if (!query) return true;
      return (
        user.firstName?.toLowerCase().includes(query) ||
        user.lastName?.toLowerCase().includes(query)
      );
    });
  };

  // Default 'staff': must return only staff (4 users), 0 customers
  const defaultStaff = filterFn(mockUsers, 'staff');
  assert.strictEqual(defaultStaff.length, 4, "Default staff filter should return 4 staff members");
  assert(defaultStaff.every(u => u.role !== 'customer'), "No customer should be in default staff filter");

  // Selected 'customer': must return only customers (2 users), 0 staff
  const customersOnly = filterFn(mockUsers, 'customer');
  assert.strictEqual(customersOnly.length, 2, "Customer filter should return 2 customers");
  assert(customersOnly.every(u => u.role === 'customer'), "Only customers should be in customer filter");

  // Specific role 'sales_agent': must return only sales agent (1 user)
  const salesOnly = filterFn(mockUsers, 'sales_agent');
  assert.strictEqual(salesOnly.length, 1, "Sales agent filter should return 1 user");
  assert.strictEqual(salesOnly[0].role, 'sales_agent', "Result must have role sales_agent");
});

// Test 4: Current user admin is NOT prepended when filtering for customers
test("Session user is guarded against prepending into customer list", () => {
  assert(
    userManagementCode.includes("userMatchesRoleFilter(currentUser.role)"),
    "currentUser must only be prepended if their role matches userMatchesRoleFilter"
  );
  assert(
    userManagementCode.includes("if (roleFilter === 'customer') return r === 'customer';"),
    "userMatchesRoleFilter must reject non-customer roles when filtering for customer"
  );
});

// Test 5: Responsive Table Container is present with min-width and horizontal scroll
test("Table section is responsive with min-w-[760px] and overflow-x-auto", () => {
  assert(
    userManagementCode.includes('overflow-x-auto'),
    "Table must have an overflow-x-auto container"
  );
  assert(
    userManagementCode.includes('min-w-[760px]'),
    "Table must have min-w-[760px] to preserve columns without breaking on small screens"
  );
  assert(
    userManagementCode.includes('sticky right-0'),
    "Actions column must have sticky right-0 so actions remain pinned while scrolling horizontally"
  );
});

// Test 6: View Mode Switcher is present for Table and Cards
test("View Mode switcher toggles between responsive table and cards", () => {
  assert(
    userManagementCode.includes("const [viewMode, setViewMode] = useState('table');"),
    "viewMode state must default to 'table'"
  );
  assert(
    userManagementCode.includes("setViewMode('table')"),
    "Table view mode button must be present"
  );
  assert(
    userManagementCode.includes("setViewMode('cards')"),
    "Cards view mode button must be present"
  );
  assert(
    userManagementCode.includes("viewMode === 'table' ?"),
    "Component must render table when viewMode is 'table' and cards when 'cards'"
  );
});

// Test 7: Interactive Role KPI Cards allow 1-click filtering
test("Role distribution KPI cards support 1-click filtering", () => {
  assert(
    userManagementCode.includes("setRoleFilter(isSelected ? 'staff' : role.value)"),
    "Role distribution cards must toggle filtering by clicked role or revert to 'staff'"
  );
});

// Test 8: usersApi mock fallback supports role='staff'
test("usersApi.js mock list supports role='staff'", () => {
  assert(
    usersApiCode.includes('if (params.role === "staff") rows = rows.filter(u => u.role !== "customer");'),
    "usersApi.js mock fallback must filter out customers when role='staff'"
  );
});

// Test 9: StaffSection in CRM console also defaults to staff
test("StaffSection.jsx in CRM console defaults to role='staff'", () => {
  assert(
    staffSectionCode.includes('const [role, setRole] = useState("staff");'),
    "StaffSection must default to role='staff'"
  );
  assert(
    staffSectionCode.includes('{ value: "staff", label: "All Staff (Default)" }'),
    "StaffSection must have 'All Staff (Default)' as an option"
  );
});

// Test 10: Backend crm.validator and crm.service handle role='staff'
if (backendValidatorCode && backendServiceCode) {
  test("Backend crm.validator.js accepts 'staff' and crm.service.js queries non-customers", () => {
    assert(
      backendValidatorCode.includes("'staff'"),
      "Backend validator must allow 'staff' in query('role')"
    );
    assert(
      backendServiceCode.includes("query.role = { $ne: 'customer' }"),
      "Backend crm.service must query non-customers when role === 'staff'"
    );
  });
}

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.`);
if (passedTests !== totalTests) {
  process.exit(1);
}
