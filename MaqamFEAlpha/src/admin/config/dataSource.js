/**
 * dataSource.js â€” Data Source Registry (single source of truth)
 * ---------------------------------------------------------------
 * Documents every data slice in the CRM: what the data is, where it is
 * used (end use), which endpoints back it, and its status.
 *
 *   status: "live"    -> fully wired to the real backend API (always live data)
 *           "mock"    -> real API backed by a local mock fallback
 *                        (live by default; mock is used only when the backend
 *                        call fails. VITE_USE_MOCK_API=true forces mock mode)
 *           "missing" -> planned but not implemented yet; must be added
 *                        to complete the CRM surface
 *
 * Consumed by: src/admin/components/common/DataSourceBadge.jsx
 * (the bottom-left "Mock data / Live data" button renders this table).
 */

export const dataSourceMeta = {
  updatedAt: "2026-09-23",
  mockFlag: "VITE_USE_MOCK_API",
  guide: "docs/hotel-and-hoteliers.md",
};

export const dataSourceRegistry = [
  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  CRM CONSOLE (agent workspace, live)  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  {
    key: "crm-leads",
    group: "CRM Console",
    feature: "Leads â€” agent workspace",
    data: "Lead records: name, contact, destination, travellers, quoted price, source, status, timeline notes",
    endUse: "CRM console Leads tab â€” browse/search, create, edit, add notes, convert to booking",
    file: "src/admin/features/leads/leadsApi.js",
    status: "live",
    endpoints: [
      { method: "GET", path: "/api/v1/crm/leads", note: "List leads (paginated, filters)" },
      { method: "POST", path: "/api/v1/crm/leads", note: "Create lead" },
      { method: "GET", path: "/api/v1/crm/leads/:id", note: "Lead details" },
      { method: "PUT", path: "/api/v1/crm/leads/:id", note: "Update lead" },
      { method: "POST", path: "/api/v1/crm/leads/:id/convert", note: "Convert lead to booking" },
    ],
  },
  {
    key: "crm-overview",
    group: "CRM Console",
    feature: "Agent stats & pipeline board",
    data: "Agent KPIs (leads, conversions, revenue) and pipeline columns with lead cards by stage",
    endUse: "CRM console Overview tab (OverviewSection) â€” KPI cards + pipeline board",
    file: "src/admin/features/crm/crmApi.js",
    status: "live",
    endpoints: [
      { method: "GET", path: "/api/v1/crm/stats", note: "Agent KPI counters" },
      { method: "GET", path: "/api/v1/crm/pipeline", note: "Pipeline stage metrics & cards" },
      { method: "GET", path: "/api/v1/crm/bookings/summary", note: "Live bookings status & category distribution" },
      { method: "GET", path: "/api/v1/crm/finance/overview", note: "Financial telemetry & revenue metrics" },
      { method: "GET", path: "/api/v1/crm/stocks/overview", note: "Wholesale flight seats & hotel rooms capacity" },
    ],
  },
  {
    key: "crm-users",
    group: "CRM Console",
    feature: "CRM staff & roles",
    data: "Staff accounts: name, email, role, permissions, active flag (incl. hotelier user creation)",
    endUse: "CRM console Users tab â€” list staff, create (hotelId links a hotelier user), edit role, deactivate",
    file: "src/admin/features/crm/crmApi.js",
    status: "live",
    endpoints: [
      { method: "GET", path: "/api/v1/crm/users", note: "Staff list" },
      { method: "POST", path: "/api/v1/crm/users", note: "Create staff (hotelId => hotelier user)" },
      { method: "GET", path: "/api/v1/crm/users/:id", note: "Staff details" },
      { method: "PATCH", path: "/api/v1/crm/users/:id", note: "Update role/permissions" },
      { method: "DELETE", path: "/api/v1/crm/users/:id", note: "Deactivate staff" },
    ],
  },
  {
    key: "crm-packages",
    group: "CRM Console",
    feature: "Packages catalogue management",
    data: "Package definitions: title, destination, itinerary, pricing tiers, media, active flag",
    endUse: "CRM console Packages tab â€” browse, create, edit, deactivate",
    file: "src/admin/features/packages/packagesApi.js",
    status: "live",
    endpoints: [
      { method: "GET", path: "/api/v1/crm/packages", note: "Packages list (filters)" },
      { method: "POST", path: "/api/v1/crm/packages", note: "Create package" },
      { method: "GET", path: "/api/v1/crm/packages/:id", note: "Package details (CRM view)" },
      { method: "PATCH", path: "/api/v1/crm/packages/:id", note: "Update package" },
      { method: "PATCH", path: "/api/v1/crm/packages/:id/deactivate", note: "Toggle availability" },
      { method: "POST", path: "/api/v1/crm/packages/upload-images", note: "Upload images to Cloudinary (key 'images', max 5MB)" },
      { method: "POST", path: "/api/v1/crm/packages/:id/images", note: "Add photos to existing package" },
      { method: "DELETE", path: "/api/v1/crm/packages/:id/images", note: "Delete photo from package ({ imageUrl })" },
    ],
  },
  {
    key: "crm-package-bookings",
    group: "CRM Console",
    feature: "Package bookings (book-for-customer lifecycle)",
    data: "Agent-created bookings: customer, package, travel dates, travellers, assignee, remarks, status",
    endUse: "CRM console Packages bookings â€” book for customer, assign agent, add remarks, cancel",
    file: "src/admin/features/packages/packagesApi.js",
    status: "live",
    endpoints: [
      { method: "POST", path: "/api/v1/crm/packages/book-for-customer", note: "Create booking on behalf of customer" },
      { method: "GET", path: "/api/v1/crm/packages/bookings", note: "Bookings list" },
      { method: "GET", path: "/api/v1/crm/packages/bookings/:id", note: "Booking details" },
      { method: "PATCH", path: "/api/v1/crm/packages/bookings/:id", note: "Update booking" },
      { method: "POST", path: "/api/v1/crm/packages/bookings/:id/assign", note: "Assign agent" },
      { method: "PATCH", path: "/api/v1/crm/packages/bookings/:id", note: "Non-structural update: travelDates, contactDetails, remark" },
      { method: "POST", path: "/api/v1/crm/packages/bookings/:id/cancel", note: "Cancel booking" },
    ],
  },
  {
    key: "crm-hotels",
    group: "CRM Console",
    feature: "Hotels management",
    data: "Hotel records: name, city, star rating, facilities, media, teams, active flag",
    endUse: "CRM console Hotels tab â€” list, create, edit, deactivate",
    file: "src/admin/features/inventory/stocks/stocksApi.js",
    status: "live",
    endpoints: [
      { method: "GET", path: "/api/v1/crm/hotels", note: "Hotels list" },
      { method: "GET", path: "/api/v1/crm/hotels/:id", note: "Hotel details" },
      { method: "POST", path: "/api/v1/crm/hotels", note: "Create hotel" },
      { method: "PATCH", path: "/api/v1/crm/hotels/:id", note: "Update hotel" },
      { method: "DELETE", path: "/api/v1/crm/hotels/:id", note: "Remove hotel" },
    ],
  },
  {
    key: "crm-hotel-stock",
    group: "CRM Console",
    feature: "Hotel stock (wholesale batch review)",
    data: "Hoteliers' submitted stock batches: rooms, allocations, pricing; approve/reject decisions",
    endUse: "CRM console Hotel stock â€” review pending batches, view approved history",
    file: "src/admin/features/inventory/stocks/stocksApi.js",
    status: "live",
    endpoints: [
      { method: "GET", path: "/api/v1/crm/hotel-stock", note: "Pending batches (filters)" },
      { method: "GET", path: "/api/v1/crm/hotel-stock/approved", note: "Approved history" },
      { method: "PATCH", path: "/api/v1/crm/hotel-stock/:id/review", note: "Approve / reject batch" },
    ],
  },
  {
    key: "crm-offers",
    group: "CRM Console",
    feature: "Offers management & offer bookings",
    data: "Offers: title, destination, discount, validity window, media, active flag; offer bookings",
    endUse: "CRM console Offers tab â€” CRUD offers, toggle status, book for customer, cancel bookings",
    file: "src/admin/features/offers/offersApi.js",
    status: "live",
    endpoints: [
      { method: "GET", path: "/api/v1/crm/offers", note: "Offers list (filters)" },
      { method: "POST", path: "/api/v1/crm/offers", note: "Create offer" },
      { method: "GET", path: "/api/v1/crm/offers/:id", note: "Offer details" },
      { method: "PATCH", path: "/api/v1/crm/offers/:id", note: "Update offer" },
      { method: "PATCH", path: "/api/v1/crm/offers/:id/toggle-status", note: "Activate / deactivate" },
      { method: "POST", path: "/api/v1/crm/offers/book-for-customer", note: "Book offer for customer" },
      { method: "GET", path: "/api/v1/crm/offers/bookings", note: "Offer bookings list" },
      { method: "POST", path: "/api/v1/crm/offers/bookings/:id/cancel", note: "Cancel offer booking" },
      { method: "POST", path: "/api/v1/crm/offers/upload-images", note: "Upload images to Cloudinary (key 'images', max 5MB)" },
      { method: "POST", path: "/api/v1/crm/offers/:id/images", note: "Add photos to existing offer" },
      { method: "DELETE", path: "/api/v1/crm/offers/:id/images", note: "Delete photo from offer ({ imageUrl })" },
    ],
  },
  {
    key: "crm-cloudinary-media",
    group: "CRM Console",
    feature: "Cloudinary media & photos management",
    data: "Direct Cloudinary image uploads, photo staging, photos management on existing packages & offers, and profile avatar upload",
    endUse: "Package wizard, offers drawers, package details gallery manager, admin profile avatar",
    file: "src/services/upload.js",
    status: "live",
    endpoints: [
      { method: "POST", path: "/api/v1/crm/packages/upload-images", note: "Upload package images (multipart, key 'images', max 5MB)" },
      { method: "POST", path: "/api/v1/crm/offers/upload-images", note: "Upload offer images (multipart, key 'images', max 5MB)" },
      { method: "POST", path: "/api/v1/crm/packages/:id/images", note: "Append photos to existing package" },
      { method: "DELETE", path: "/api/v1/crm/packages/:id/images", note: "Delete photo from package ({ imageUrl })" },
      { method: "POST", path: "/api/v1/crm/offers/:id/images", note: "Append photos to existing offer" },
      { method: "DELETE", path: "/api/v1/crm/offers/:id/images", note: "Delete photo from offer ({ imageUrl })" },
      { method: "PATCH", path: "/api/v1/auth/me", note: "Update authenticated user avatar & profile credentials" },
    ],
  },
  {
    key: "crm-stocks-flights",
    group: "CRM Console",
    feature: "Flight seat inventory",
    data: "Seat blocks: airline, route, class, dossier, seats allocated vs sold",
    endUse: "CRM console Flight seats â€” overview + create/edit/delete blocks + seat dossier",
    file: "src/admin/features/inventory/stocks/stocksApi.js",
    status: "live",
    endpoints: [
      { method: "GET", path: "/api/v1/crm/stocks/overview", note: "Inventory KPIs" },
      { method: "GET", path: "/api/v1/crm/stocks/flights", note: "Seat blocks list" },
      { method: "POST", path: "/api/v1/crm/stocks/flights", note: "Create seat block" },
      { method: "GET", path: "/api/v1/crm/stocks/flights/:id", note: "Block details + dossier" },
      { method: "PUT", path: "/api/v1/crm/stocks/flights/:id", note: "Update block" },
      { method: "DELETE", path: "/api/v1/crm/stocks/flights/:id", note: "Remove block" },
    ],
  },

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  STOREFRONT CATALOG (public, live)  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  {
    key: "catalog-packages",
    group: "Storefront Catalog",
    feature: "Public packages catalogue & customizer",
    data: "Published packages with itinerary, tiers, gallery; live quote calculation",
    endUse: "Storefront pages + booking customizer (quote POST used by console quote flows)",
    file: "src/admin/features/packages/packagesApi.js",
    status: "live",
    endpoints: [
      { method: "GET", path: "/api/v1/packages", note: "Public catalogue" },
      { method: "GET", path: "/api/v1/packages/:id", note: "Public package details" },
      { method: "POST", path: "/api/v1/packages/:id/quote", note: "Live quote from customizer selections" },
    ],
  },
  {
    key: "catalog-offers",
    group: "Storefront Catalog",
    feature: "Public offers listing",
    data: "Active public offers (discounted deals)",
    endUse: "Storefront offers section",
    file: "src/admin/features/offers/offersApi.js",
    status: "live",
    endpoints: [
      { method: "GET", path: "/api/v1/offers", note: "Active public offers" },
    ],
  },

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  ADMIN CONSOLE (mock fallback via VITE_USE_MOCK_API)  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  {
    key: "admin-dashboard",
    group: "Admin Console",
    feature: "Dashboard overview",
    data: "KPI counters (leads, bookings, revenue, users) and recent leads feed",
    endUse: "Admin dashboard page â€” overview cards + recent leads list",
    file: "src/admin/features/dashboard/dashboardApi.js",
    status: "mock",
    mockData: "src/admin/mocks/mockData.js â€” dashboardMock",
    endpoints: [
      { method: "GET", path: "/api/v1/admin/dashboard/overview", note: "Overview KPIs" },
      { method: "GET", path: "/api/v1/admin/dashboard/leads", note: "Recent leads feed" },
    ],
  },
  {
    key: "admin-leads",
    group: "Admin Console",
    feature: "Leads management",
    data: "Lead records with notes, source, status, conversion",
    endUse: "Admin Leads page â€” browse, create, edit, notes, convert",
    file: "src/admin/features/leads/leadsApi.js",
    status: "mock",
    mockData: "src/admin/mocks/mockData.js â€” mockLeads, mockPipelineColumns",
    endpoints: [
      { method: "GET", path: "/api/v1/admin/dashboard/leads", note: "Dashboard leads feed" },
      { method: "GET", path: "/api/v1/crm/leads", note: "Leads list (same backend as CRM console)" },
      { method: "POST", path: "/api/v1/crm/leads", note: "Create / update / notes / convert" },
    ],
  },
  {
    key: "admin-customers",
    group: "CRM Console",
    feature: "Customers & Travellers (360° Visibility)",
    data: "Enriched customer profiles with aggregated lifetime metrics (totalTravellers, bookedOffersCount, totalMoneySpent, currency breakdown, recent bookings) and saved passenger roster",
    endUse: "CRM Customers directory, 360° Customer Profile view, and Travellers dossier",
    file: "src/admin/features/customers/customersApi.js",
    status: "live",
    endpoints: [
      { method: "GET", path: "/api/v1/crm/customers", note: "List customers (paginated, metrics, search, isActive, sort) — also /api/v1/ops-crm/customers" },
      { method: "GET", path: "/api/v1/crm/customers/:id", note: "Customer 360° details, lifetime spend breakdown, booking counts, recent reservations" },
      { method: "GET", path: "/api/v1/crm/customers/:id/travellers", note: "Saved family members & travellers, passports, passenger types, defaults" },
    ],
  },
  {
    key: "admin-bookings",
    group: "Admin Console",
    feature: "Booking journey (draft â†’ travelers â†’ payment â†’ confirm)",
    data: "Booking drafts, traveler validation, inventory locks, customer OTP, payments, confirmations",
    endUse: "Package booking wizard â€” assisted checkout steps (travel, inventory, OTP, payment, confirmation)",
    file: "src/admin/features/bookings/bookingsApi.js",
    status: "mock",
    endpoints: [
      { method: "GET", path: "/api/v1/customers", note: "Customer picker" },
      { method: "GET", path: "/api/v1/packages", note: "Package picker (active only)" },
      { method: "POST", path: "/api/v1/packages/:packageId/quote", note: "Live quote (spec B: guide default/catalog/override)" },
      { method: "POST", path: "/api/v1/bookings/validate-travelers", note: "Traveler validation" },
      { method: "POST", path: "/api/v1/bookings/inventory-lock", note: "Atomically lock flight/hotel/guide/visa (10-min expiry)" },
      { method: "POST", path: "/api/v1/bookings/inventory-lock/:lockId/release", note: "Release lock (rollback)" },
      { method: "POST", path: "/api/v1/auth/send-otp", note: "Customer OTP (purpose: booking_confirmation)" },
      { method: "POST", path: "/api/v1/auth/verify-otp", note: "Verify OTP" },
      { method: "POST", path: "/api/v1/payments/create-intent", note: "Legacy payment intent" },
      { method: "POST", path: "/api/v1/payments/confirm", note: "Legacy payment confirm" },
      { method: "POST", path: "/api/v1/crm/packages/book-for-customer", note: "Final: confirm + payment + MasterBooking in one transaction (spec C)" },
      { method: "POST", path: "/api/v1/bookings/confirm", note: "Direct confirm (non-CRM path)" },
    ],
  },
  {
    key: "single-service-booking",
    group: "Admin Console",
    feature: "Book a Service (standalone service booking: flight / hotel / cab / meal / visa)",
    data: "Bookable single-service catalog (id, type, provider, providerType, retailPrice, discountPercentage, unitLabel), service quotes, service bookings with snapshot",
    endUse: "Book a Service wizard (ServiceBooking.jsx) â€” pick type -> pick service -> customer + quantity -> quote -> travelers -> payment -> instant confirmation (one transaction, same spec C contract as packages)",
    file: "src/admin/features/bookings/bookingsApi.js (single-service methods)",
    status: "mock",
    endpoints: [
      { method: "GET", path: "/api/v1/services", note: "Single-service catalog (?search=&type=)" },
      { method: "GET", path: "/api/v1/services/:serviceId", note: "Single service details" },
      { method: "POST", path: "/api/v1/services/quote", note: "Quote {serviceId, units} -> breakdown {retail, discount, taxes} + total" },
      { method: "POST", path: "/api/v1/services/book", note: "Final: confirm + payment + MasterBooking in one transaction (mirrors /api/v1/crm/packages/book-for-customer spec C)" },
    ],
  },
  {
    key: "admin-finance",
    group: "CRM Console",
    feature: "Finance Overview, Transactions & Refunds",
    data: "Gross revenue, pending payments, net revenue, refunds, transaction counts, multi-currency breakdown, complete transactions ledger with gateway metadata, and refunds history queue with live reconciliation",
    endUse: "CRM Finance console — Executive overview cards, multi-currency breakdown, transaction ledger with filters & detail drawer, refunds management with live status transitions",
    file: "src/admin/features/finance/financeApi.js",
    status: "live",
    endpoints: [
      { method: "GET/POST", path: "/api/v1/crm/finance/overview", note: "Finance revenue & KPI overview (filters: date range, currency)" },
      { method: "GET", path: "/api/v1/crm/finance/transactions", note: "Financial transactions ledger (paginated, multi-filter, search, sort)" },
      { method: "GET", path: "/api/v1/crm/finance/transactions/:id", note: "Single transaction details with gateway data & refunds" },
      { method: "GET", path: "/api/v1/crm/finance/refunds", note: "Payment refunds history queue (paginated, filters, search, sort)" },
      { method: "PATCH", path: "/api/v1/crm/finance/refunds/:refundId/status", note: "Update refund status (pending/processed/failed) & reconcile parent payment" },
    ],
  },
  {
    key: "admin-users",
    group: "Admin Console",
    feature: "Platform users, roles & permissions",
    data: "User accounts, role definitions, permission catalog",
    endUse: "Users page â€” directory, roles, permissions matrix",
    file: "src/admin/features/users/usersApi.js",
    status: "mock",
    endpoints: [
      { method: "GET", path: "/api/v1/users", note: "Users list" },
      { method: "POST", path: "/api/v1/users", note: "Create / update / delete" },
      { method: "GET", path: "/api/v1/roles", note: "Role definitions" },
      { method: "GET", path: "/api/v1/permissions", note: "Permission catalog" },
      { method: "POST", path: "/api/v1/crm/users", note: "CRM-side creation (same backend)" },
    ],
  },
  {
    key: "admin-settings",
    group: "Admin Console",
    feature: "System settings",
    data: "Settings per section: general, financial, booking, notifications, otp",
    endUse: "Settings page — section forms",
    file: "src/admin/features/settings/settingsApi.js",
    status: "live",
    endpoints: [
      { method: "GET", path: "/api/v1/settings/:section", note: "Load section settings (dual mount /api/v1/crm/settings/:section)" },
      { method: "PUT", path: "/api/v1/settings/:section", note: "Upsert section settings" },
      { method: "PATCH", path: "/api/v1/settings/:section", note: "Partial update section settings" },
    ],
  },
  {
    key: "audit-logs",
    group: "Admin Console",
    feature: "Audit logs",
    data: "System activity log: user, action, entity, timestamp",
    endUse: "Audit log page â€” filterable activity table",
    file: "src/admin/features/settings/auditApi.js",
    status: "mock",
    endpoints: [
      { method: "GET", path: "/api/v1/audit-logs", note: "Activity log (filters)" },
    ],
  },
  {
    key: "reports",
    group: "Admin Console",
    feature: "Reports & exports",
    data: "Report datasets and export file generation",
    endUse: "Reports page â€” run reports, export",
    file: "src/admin/features/reports/reportsApi.js",
    status: "mock",
    endpoints: [
      { method: "GET", path: "/api/v1/reports/overview", note: "Available reports + summaries" },
      { method: "GET", path: "/api/v1/reports/:report/export", note: "Export (CSV/PDF)" },
    ],
  },

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  INVENTORY â€” VISA (live)  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  {
    key: "visa-admin",
    group: "Inventory â€” Visa",
    feature: "Visa admin (applications, groups, case officers, inventory)",
    data: "Visa dashboard KPIs, applications with assignment/status, groups, case officers, visa inventory with stock",
    endUse: "Admin Visa console â€” KPI cards, application list/detail, groups, officers, inventory CRUD + stock adjust",
    file: "src/admin/features/inventory/visa/visaApi.js",
    status: "live",
    endpoints: [
      { method: "GET", path: "/api/v1/visa/admin/dashboard", note: "Console KPIs" },
      { method: "GET", path: "/api/v1/visa/admin/applications", note: "Applications (filters, paginated)" },
      { method: "GET", path: "/api/v1/visa/admin/applications/:id", note: "Application details" },
      { method: "POST", path: "/api/v1/visa/admin/applications/:id/assign", note: "Assign agent" },
      { method: "PATCH", path: "/api/v1/visa/admin/applications/:id/status", note: "Update status" },
      { method: "GET", path: "/api/v1/visa/admin/groups", note: "Groups list" },
      { method: "GET", path: "/api/v1/visa/admin/groups/:id", note: "Group details" },
      { method: "GET", path: "/api/v1/visa/admin/case-officers", note: "Officers list" },
      { method: "POST", path: "/api/v1/visa/admin/case-officers", note: "Create officer" },
      { method: "GET", path: "/api/v1/visa/admin/inventory", note: "Visa inventory (filters)" },
      { method: "POST", path: "/api/v1/visa/admin/inventory", note: "Create (multipart with images)" },
      { method: "PUT", path: "/api/v1/visa/admin/inventory/:id", note: "Update (multipart)" },
      { method: "DELETE", path: "/api/v1/visa/admin/inventory/:id", note: "Delete (soft/permanent)" },
      { method: "PATCH", path: "/api/v1/visa/admin/inventory/:id/stock", note: "Adjust stock" },
    ],
  },

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  MISSING â€” TO COMPLETE THE CRM  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  {
    key: "missing-offer-details",
    group: "Missing â€” To Complete",
    feature: "Public offer details",
    data: "Single public offer details data",
    endUse: "Storefront offer details page â€” endpoint not consumed anywhere yet",
    file: "â€”",
    status: "missing",
    endpoints: [
      { method: "GET", path: "/api/v1/offers/:id", note: "Planned â€” details for offer page" },
    ],
  },
  {
    key: "missing-storefront-checkout",
    group: "Missing â€” To Complete",
    feature: "Customer self-service checkout (packages/offers)",
    data: "Customer-side booking flow: draft â†’ travelers â†’ OTP â†’ payment â†’ confirmation",
    endUse: "Storefront checkout for logged-in customers â€” assisted wizard exists, customer journey missing",
    file: "â€”",
    status: "missing",
    endpoints: [
      { method: "POST", path: "/bookings/draft", note: "Planned â€” customer-initiated draft" },
      { method: "POST", path: "/bookings/validate-travelers", note: "Planned â€” reuse backend" },
      { method: "POST", path: "/bookings/confirm", note: "Planned â€” reuse backend" },
    ],
  },
  {
    key: "missing-visa-public",
    group: "Missing â€” To Complete",
    feature: "Customer visa application intake (public side)",
    data: "Customer visa application form + document upload",
    endUse: "Storefront visa page â€” admin console is complete, public intake missing",
    file: "â€”",
    status: "missing",
    endpoints: [
      { method: "POST", path: "/api/v1/visa/applications", note: "Planned â€” public application submission" },
      { method: "GET", path: "/api/v1/visa/admin/inventory", note: "Existing â€” list visa products on page" },
    ],
  },
  {
    key: "missing-hotelier-settlement",
    group: "Missing â€” To Complete",
    feature: "Hotelier settlement view",
    data: "Payout/settlement statements for sold allocations",
    endUse: "Hotelier portal â€” admin hotel charges endpoints are live, hotelier-side settlement view missing",
    file: "â€”",
    status: "missing",
    endpoints: [
      { method: "GET", path: "/hotelier/settlements", note: "Planned â€” payouts for sold stock" },
    ],
  },
];

/* Simple totals for the header badges. */
export function getDataSourceTotals() {
  const totals = { slices: 0, live: 0, mock: 0, missing: 0, endpoints: 0 };
  for (const item of dataSourceRegistry) {
    totals.slices += 1;
    totals.endpoints += (item.endpoints || []).length;
    if (item.status === "live") totals.live += 1;
    else if (item.status === "mock") totals.mock += 1;
    else totals.missing += 1;
  }
  return totals;
}

export default dataSourceRegistry;


