// Registry of every backend endpoint the admin console talks to, and whether
// its API module has a mock branch (i.e. it serves mock data while
// VITE_USE_MOCK_API is enabled). crmApi-only modules (hotels, hotel stock,
// CRM staff) have no mock branch and are always live.
export const dataSourceRegistry = [
  // --- Mock-capable modules (follow VITE_USE_MOCK_API) ---
  { section: "Leads & Pipeline", mock: true, method: "GET", endpoint: "/api/v1/crm/leads" },
  { section: "Leads & Pipeline", mock: true, method: "POST", endpoint: "/api/v1/crm/leads" },
  { section: "Leads & Pipeline", mock: true, method: "GET", endpoint: "/api/v1/crm/leads/{id}" },
  { section: "Leads & Pipeline", mock: true, method: "PATCH", endpoint: "/api/v1/crm/leads/{id}" },
  { section: "Leads & Pipeline", mock: true, method: "POST", endpoint: "/api/v1/crm/leads/{id}/notes" },
  { section: "Leads & Pipeline", mock: true, method: "POST", endpoint: "/api/v1/crm/leads/{id}/convert" },

  { section: "Dashboard", mock: true, method: "GET", endpoint: "/api/v1/admin/dashboard/overview" },
  { section: "Dashboard", mock: true, method: "GET", endpoint: "/api/v1/admin/dashboard/leads" },

  { section: "Customers", mock: true, method: "GET", endpoint: "/api/v1/customers" },
  { section: "Customers", mock: true, method: "GET", endpoint: "/api/v1/customers/{id}" },
  { section: "Customers", mock: true, method: "POST", endpoint: "/api/v1/customers" },
  { section: "Customers", mock: true, method: "PATCH", endpoint: "/api/v1/customers/{id}" },

  { section: "Packages", mock: true, method: "GET", endpoint: "/api/v1/crm/packages" },
  { section: "Packages", mock: true, method: "GET", endpoint: "/api/v1/crm/packages/{id}" },
  { section: "Packages", mock: true, method: "POST", endpoint: "/api/v1/crm/packages" },
  { section: "Packages", mock: true, method: "PATCH", endpoint: "/api/v1/crm/packages/{id}" },
  { section: "Packages", mock: true, method: "POST", endpoint: "/api/v1/crm/packages/book-for-customer" },

  { section: "Bookings", mock: true, method: "GET", endpoint: "/api/v1/bookings" },
  { section: "Bookings", mock: true, method: "GET", endpoint: "/api/v1/bookings/{id}" },
  { section: "Bookings", mock: true, method: "POST", endpoint: "/api/v1/bookings/draft" },
  { section: "Bookings", mock: true, method: "POST", endpoint: "/api/v1/bookings/confirm" },

  { section: "Finance", mock: true, method: "GET", endpoint: "/api/v1/finance/overview" },
  { section: "Finance", mock: true, method: "GET", endpoint: "/api/v1/finance/transactions" },
  { section: "Finance", mock: true, method: "GET", endpoint: "/api/v1/finance/refunds" },

  { section: "Users & Roles", mock: true, method: "GET", endpoint: "/api/v1/users" },
  { section: "Users & Roles", mock: true, method: "POST", endpoint: "/api/v1/users" },
  { section: "Users & Roles", mock: true, method: "PATCH", endpoint: "/api/v1/users/{id}" },
  { section: "Users & Roles", mock: true, method: "GET", endpoint: "/api/v1/roles" },

  { section: "Settings", mock: false, method: "GET/PUT/PATCH", endpoint: "/api/v1/settings/{section}" },
  { section: "Audit Logs", mock: true, method: "GET", endpoint: "/api/v1/audit-logs" },
  { section: "Reports", mock: true, method: "GET", endpoint: "/api/v1/reports/overview" },

  // --- Always live (crmApi / crm stocks have no mock branch) ---
  { section: "CRM · Hotels", mock: false, method: "GET", endpoint: "/api/v1/crm/hotels" },
  { section: "CRM · Hotels", mock: false, method: "POST", endpoint: "/api/v1/crm/hotels" },
  { section: "CRM · Hotels", mock: false, method: "GET/PATCH/DELETE", endpoint: "/api/v1/crm/hotels/{id}" },
  { section: "CRM · Hotel Stock", mock: false, method: "GET/POST", endpoint: "/api/v1/crm/stocks/hotels (+ /{id}, /overview)" },
  { section: "CRM · Hotelier Users", mock: false, method: "POST", endpoint: "/api/v1/crm/users (hotelId required)" },
  { section: "CRM · Stock Review", mock: false, method: "GET/PATCH", endpoint: "/api/v1/crm/hotel-stock (pending, approved, /{id}/review)" },

  // --- Hotel & Hotelier system (see hotel-and-hoteliers.md) ---
  { section: "Hotel · Team Users", mock: true, method: "GET/PATCH", endpoint: "/api/v1/crm/hotels/{id}/users" },
  { section: "Hotel · Charges (admin-only)", mock: false, method: "GET/PATCH", endpoint: "/api/v1/crm/hotels/{id}/charges" },
  { section: "Hotelier · Room Types", mock: true, method: "GET/POST/PATCH/DELETE", endpoint: "/api/v1/hotelier/room-types (+/{id})" },
  { section: "Hotelier · Facilities", mock: true, method: "GET/PUT", endpoint: "/api/v1/hotelier/facilities" },
  { section: "Hotelier · Services", mock: true, method: "GET/POST/PATCH/DELETE", endpoint: "/api/v1/hotelier/services (+/{id})" },
  { section: "Hotelier · Profile", mock: true, method: "GET", endpoint: "/api/v1/hotelier/profile" },
  { section: "Hotelier · Bookings", mock: true, method: "GET", endpoint: "/api/v1/hotelier/bookings (+/{id})" },
  { section: "Hotelier · Arrange Availability", mock: true, method: "PATCH", endpoint: "/api/v1/hotelier/bookings/{id}/arrange" },
  { section: "Hotel · Admin Bookings", mock: true, method: "GET", endpoint: "/api/v1/crm/hotels/{id}/bookings (full charges)" },
  { section: "Storefront · Booking", mock: false, method: "GET/POST", endpoint: "/api/v1/bookings (availability + create)" },

  // --- PACKAGE_OFFER_STOCK guide (Tiers 1-3) — all live ---
  { section: "Stocks · Overview", mock: false, method: "GET", endpoint: "/api/v1/crm/stocks/overview" },
  { section: "Stocks · Flights", mock: false, method: "GET/POST", endpoint: "/api/v1/crm/stocks/flights (+ /{id} seat dossier)" },
  { section: "Offers · CRM", mock: false, method: "GET/POST/PATCH", endpoint: "/api/v1/crm/offers (+ /{id}, /toggle-status)" },
  { section: "Offers · CRM Bookings", mock: false, method: "GET/POST", endpoint: "/api/v1/crm/offers/bookings (+ book-for-customer, /{id}/cancel)" },
  { section: "Offers · Cloudinary Upload", mock: false, method: "POST", endpoint: "/api/v1/crm/offers/upload-images (multipart 'images')" },
  { section: "Offers · Photos Management", mock: false, method: "POST/DELETE", endpoint: "/api/v1/crm/offers/{id}/images" },
  { section: "Packages · CRM", mock: false, method: "GET/POST/PATCH", endpoint: "/api/v1/crm/packages (+ /{id}, /deactivate)" },
  { section: "Packages · CRM Bookings", mock: false, method: "GET/PATCH/POST", endpoint: "/api/v1/crm/packages/bookings (dossier, assign, remark, cancel)" },
  { section: "Packages · Quote", mock: false, method: "POST", endpoint: "/api/v1/packages/{id}/quote (live customizer)" },
  { section: "Packages · Cloudinary Upload", mock: false, method: "POST", endpoint: "/api/v1/crm/packages/upload-images (multipart 'images')" },
  { section: "Packages · Photos Management", mock: false, method: "POST/DELETE", endpoint: "/api/v1/crm/packages/{id}/images" },
  { section: "Profile · Avatar Upload", mock: false, method: "PATCH", endpoint: "/api/v1/auth/me ({ avatar })" },

  // --- Served by backend but NOT consumed by this admin CRM (by design:
  //     customer-app parity). Listed with status "missing" ---
  { section: "Offers · Public detail", mock: false, method: "GET", endpoint: "/api/v1/offers/{id} (customer-app parity)", status: "missing" },
  { section: "Offers · Customer booking", mock: false, method: "POST/GET/POST", endpoint: "/api/v1/offers/{id}/book, /bookings/{id} (+cancel)", status: "missing" },
  { section: "Packages · Customer booking", mock: false, method: "POST/GET/POST", endpoint: "/api/v1/packages/book, /bookings/{id} (+cancel)", status: "missing" },
  { section: "Visa · Customer journey", mock: false, method: "GET/GET/POST", endpoint: "/api/v1/visa/types, /my-applications, /apply", status: "missing" },
];
