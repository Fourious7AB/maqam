# 📝 Maqam Travels Alpha — Backend Daily Work Updates Log

> **Repository:** `MaqamTravelsAlpha`  
> **Author / Maintainer:** Joydeb  
> **Project Scope:** Backend APIs, CRM Operations, Booking Engine, Auth, Settings & Pricing Modules  
> **Last Updated:** 2026-10-30

---

## 📌 Daily Work Log (Date-Wise)

---

### 📅 2026-10-30
**Title:** Dedicated CRM Operations Admin Invoices Engine Across All Verticals & Customer Bookings/Cancellation API Specifications

#### 🚀 Key Highlights & Tasks:
- **CRM Operations & Finance Dedicated Admin Invoices Engine Deployment (`modules/invoices/`)**:
  - Implemented the complete CRM Operations Invoicing Desk according to the architectural implementation plan, providing unified administrative visibility, search, live preview, and download capabilities across all 5 operational verticals:
    - **Cross-Vertical Financial Overview & Summary (`GET /api/v1/crm/invoices/summary`)**: Aggregates real-time gross invoiced revenue, total invoice counts, and vertical-by-vertical breakdowns (`package`, `offer`, `visa`, `flight`, `hotel`) for top-level CRM KPI cards.
    - **1. Tour Packages (`/package` & `/packages`)**:
      - `GET /api/v1/crm/invoices/package`: Paginated listing with filtering by `status`, `search` (package title/destination), date range, pilgrim count, and 5% Agency Personal GST.
      - `GET /api/v1/crm/invoices/package/:id`: Normalized tax invoice dossier in structured JSON.
      - `GET /api/v1/crm/invoices/package/:id/html`: Direct printable HTML document preview for CRM modal iframes.
      - `GET /api/v1/crm/invoices/package/:id/download`: Direct file attachment download stream (`Content-Disposition`).
    - **2. Standalone Retail Offers (`/offer` & `/offers`)**:
      - `GET /api/v1/crm/invoices/offer`: Paginated wholesale deals with filtering by `itemType` (`flight` | `hotel`), `status`, and `search`.
      - `GET /api/v1/crm/invoices/offer/:id`: Structured JSON dossier with unit allocations.
      - `GET /api/v1/crm/invoices/offer/:id/html`: Rendered HTML preview.
      - `GET /api/v1/crm/invoices/offer/:id/download`: File download stream.
    - **3. In-House Visa Batches (`/visa` & `/visas`)**:
      - `GET /api/v1/crm/invoices/visa`: Paginated visa batch invoices with filtering by `paymentStatus`, `groupStatus`, and `search`.
      - `GET /api/v1/crm/invoices/visa/:id`: Structured JSON dossier with applicant manifest and SAC 998555 agency markup vs consular pass-through breakdown.
      - `GET /api/v1/crm/invoices/visa/:id/html`: Rendered HTML preview.
      - `GET /api/v1/crm/invoices/visa/:id/download`: File download stream.
    - **4. Live SRDV Flights (`/flight` & `/flights`)**:
      - `GET /api/v1/crm/invoices/flight`: Paginated GDS and LCC flight tax invoices with filtering by `isLCC`, `status`, and `search` (PNR, GDS PNR, SRDV Booking ID).
      - `GET /api/v1/crm/invoices/flight/:id`: Detailed JSON with segment routing, airline codes, and convenience fee GST.
      - `GET /api/v1/crm/invoices/flight/:id/html`: Rendered HTML preview.
      - `GET /api/v1/crm/invoices/flight/:id/download`: File download stream.
    - **5. Live SRDV Hotels (`/hotel` & `/hotels`)**:
      - `GET /api/v1/crm/invoices/hotel`: Paginated hotel accommodation invoices with filtering by `status` and `search` (hotel name, city, confirmation number).
      - `GET /api/v1/crm/invoices/hotel/:id`: Detailed JSON with room manifest, stay duration, and SAC 996311 lodging tax breakdown.
      - `GET /api/v1/crm/invoices/hotel/:id/html`: Rendered HTML preview.
      - `GET /api/v1/crm/invoices/hotel/:id/download`: File download stream.
  - **Dual-Authentication & Access Control Architecture**:
    - Standard `Authorization: Bearer <TOKEN>` header supported for programmatic frontend and API client calls.
    - Query parameter `?token=<TOKEN>` supported seamlessly via `invoiceAuth` middleware, enabling one-click browser tab opening, `<iframe src="...">` embedding, and native browser file downloads.
    - Enforced strict staff role authorization: `admin`, `super_admin`, `finance`, `sales_agent`, `support_agent`. Blocked customer role with `403 Forbidden` and unauthenticated requests with `401 Unauthorized`.
  - **Routing Architecture & Canonical Aliasing**:
    - Primary mount path: `app.use('/api/v1/crm/invoices', adminInvoiceRoutes)` in `app.js` (ordered before catch-all `/api/v1/crm`).
    - Canonical alias mount paths: `app.use('/api/v1/invoices/admin', adminInvoiceRoutes)` in `app.js` and `router.use('/admin', adminInvoiceRoutes)` in `modules/invoices/invoice.routes.js`.
  - **Swagger UI Isolation & Segregation**:
    - Indexed all CRM invoice endpoints (`@openapi`) in `modules/invoices/adminInvoice.routes.js` under tag `CRM - Invoices` exclusively for the CRM Swagger UI (`http://localhost:5000/api/crm-docs`).
    - Configured `swagger/crmSwagger.js` to scan `modules/invoices/adminInvoice.routes.js`.
    - Enforced strict path filtering in `swagger/swagger.js` to purge any `/api/v1/crm` and `/api/v1/invoices/admin` paths, ensuring the public/customer platform documentation (`/api/docs` and `/api/v1/invoices/docs`) remains clean and completely isolated from back-office operational controls.
  - **Comprehensive Master Documentation Updated (`INVOICE_DOWNLOAD_API_DOCUMENTATION.md`)**:
    - Updated [`docs/invoices/INVOICE_DOWNLOAD_API_DOCUMENTATION.md`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/docs/invoices/INVOICE_DOWNLOAD_API_DOCUMENTATION.md) with dedicated Section 2.2 and Section 5 covering all CRM Operations Invoicing Desk endpoints, parameters, responses, and RBAC policies.
  - **Automated Verification**:
    - Comprehensive integration test script `scratch/test-admin-invoice-routes.js` passed 100%: 401 unauthenticated check, 403 customer RBAC block, 200 admin /summary, 200 list on all 5 verticals, 200 single JSON dossier, 200 live HTML preview, 200 attachment download, and `?token=` query param auth.
    - Verified Swagger isolation test: 0 leakage in main Swagger (15 customer endpoints only), 21 administrative endpoints on CRM Swagger.

- **Customer Bookings & Cancellation API Specification Authored (`CUSTOMER_BOOKINGS_AND_CANCELLATION_API_DOCUMENTATION.md`)**:
  - Authored complete, production-grade API documentation covering all customer-facing Booking retrieval and Cancellation endpoints across all 4 travel verticals, complete with file destinations, request headers, URL parameters, request body schemas, and complete JSON response body payloads (`200 OK`, `400`, `401`, `403`, `404`, `409`):
    - **Vertical 1: Live Flights (SRDV Aggregator)**:
      - `GET /api/v1/flights/bookings`: List paginated customer flight bookings.
      - `GET /api/v1/flights/bookings/:bookingId`: Single flight booking dossier with routing, terminals, airline PNR, and passenger ticket numbers.
      - `GET /api/v1/flights/bookings/:bookingId/cancellation-charges`: Live airline penalty and customer refund calculation pre-check.
      - `POST /api/v1/flights/bookings/:bookingId/cancel`: Flight booking cancellation flow with automated refund entry creation.
      - `POST /api/v1/flights/bookings/:bookingId/change-request`: Direct submission of passenger change/cancellation tickets to SRDV.
      - `GET /api/v1/flights/bookings/:bookingId/cancel-status`: Real-time cancellation processing and refund audit polling.
    - **Vertical 2: Standalone Retail Offers (In-House Flights & Hotels)**:
      - `GET /api/v1/offers/bookings/me`: Paginated customer offer bookings list.
      - `GET /api/v1/offers/bookings/:id`: Offer booking details with frozen snapshot and claimed units.
      - `POST /api/v1/offers/bookings/:id/cancel`: Cancellation with automatic atomic release of inventory units (`TicketStock` for flights or `HotelStock` for room allotments) back to warehouse stock.
    - **Vertical 3: Live Hotels (SRDV Aggregator)**:
      - `GET /api/v1/hotels/bookings/me`: Customer hotel booking history.
      - `GET /api/v1/hotels/bookings/:id`: Comprehensive hotel reservation dossier.
      - `POST /api/v1/hotels/bookings/:id/cancel`: Communicates with SRDV `/HotelCancel` endpoint, enforces cancellation policies, and initiates payment refund.
    - **Vertical 4: Bundled Tour Packages (In-House Packages)**:
      - `GET /api/v1/packages/bookings` *(alias: `/getAllBookingPackage`)*: Customer package bookings list.
      - `GET /api/v1/packages/bookings/:id`: Tour package booking details with inclusions and assigned agent.
      - `POST /api/v1/packages/bookings/:id/cancel`: Package cancellation with simultaneous restoration of all bundled flight and hotel inventory.
  - Published to [`docs/booking/CUSTOMER_BOOKINGS_AND_CANCELLATION_API_DOCUMENTATION.md`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/docs/booking/CUSTOMER_BOOKINGS_AND_CANCELLATION_API_DOCUMENTATION.md) and [`docs/CUSTOMER_BOOKINGS_AND_CANCELLATION_API_DOCUMENTATION.md`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/docs/CUSTOMER_BOOKINGS_AND_CANCELLATION_API_DOCUMENTATION.md).

#### 📂 Files Modified / Created:
- `modules/invoices/adminInvoice.service.js` (Created)
- `modules/invoices/adminInvoice.controller.js` (Created)
- `modules/invoices/adminInvoice.routes.js` (Created & OpenAPI Documented)
- `modules/invoices/index.js` (Updated)
- `modules/invoices/invoice.routes.js` (Updated)
- `swagger/crmSwagger.js` (Updated)
- `swagger/swagger.js` (Updated)
- `app.js` (Updated)
- `scratch/test-admin-invoice-routes.js` (Created & 100% Passed)
- `docs/invoices/INVOICE_DOWNLOAD_API_DOCUMENTATION.md` (Updated)
- `docs/booking/CUSTOMER_BOOKINGS_AND_CANCELLATION_API_DOCUMENTATION.md` (Created)
- `docs/CUSTOMER_BOOKINGS_AND_CANCELLATION_API_DOCUMENTATION.md` (Created)
- `my_backend_update.md` (Updated)

---

### 📅 2026-10-29
**Title:** Invoice System 404 Diagnosis & Customer-Facing Booking Endpoints Verification (Hotels & Retail Flight/Hotel Offers)

#### 🚀 Key Highlights & Tasks:
- **Invoice System 404 Not Found Root-Cause Investigation**:
  - Investigated API warning `[warn]: [HTTP 404] GET /api/v1/invoices/package/6ac4cc8fdd7f83ab2e5a4cd3/download - Package booking not found for reference: 6ac4cc8fdd7f83ab2e5a4cd3`.
  - Analyzed database lookup behavior in `modules/invoices/invoice.service.js` (`getPackageInvoiceData`): confirmed the 24-character hexadecimal string was recognized as a MongoDB ObjectId and queried via `PackageBooking.findOne({ _id: bookingId })`.
  - Identified common operational failure vectors for frontend and QA teams:
    - Calling the Package Invoice endpoint for a booking originating from another vertical (e.g. Flight, Hotel, Standalone Offer, or Visa).
    - Supplying a catalog `packageId` instead of an instantiated customer `PackageBooking._id`.
    - Querying a record created in another environment (local DB vs. Atlas cluster) or a deleted test booking.

- **Customer-Facing Hotel Booking Endpoints Audit (`modules/hotels/hotel.routes.js`)**:
  - Audited the live inventory hotel booking lifecycle from customer perspective:
    - **Room Availability & Rate Lock**: `POST /api/v1/hotels/recheck` revalidates live rate availability via SRDV `/BlockRoom` and issues a single-use `recheckId` token valid for 3 minutes (180s).
    - **Create Booking**: `POST /api/v1/hotels/bookings` requires JWT auth (`authenticate`), idempotency header support (`Idempotency-Key`), consumes `recheckId`, and instantiates `HotelBooking` in `AWAITING_PAYMENT` with a 15-minute payment expiration window.
    - **Customer Booking Management**:
      - `GET /api/v1/hotels/bookings/me`: Paginated booking history for authenticated user (`?page=1&limit=10`).
      - `GET /api/v1/hotels/bookings/:id`: Comprehensive booking details by document ID.
      - `POST /api/v1/hotels/bookings/:id/cancel`: Cancellation flow communicating with SRDV `/HotelCancel` with automated cancellation fee calculation.

- **Customer-Facing Retail Offer Booking Endpoints Audit (`modules/packages/offers/offer.routes.js`)**:
  - Audited customer booking endpoints for standalone retail offers covering both **Flight Offers** and **Hotel Offers**:
    - **Offer Discovery**: `GET /api/v1/offers` (filtered by `?itemType=flight` or `?itemType=hotel`) and `GET /api/v1/offers/:id` (live remaining warehouse stock).
    - **Unified Customer Booking Endpoint**: `POST /api/v1/offers/:id/book` requires JWT auth (`authenticate`), quantity, and passenger/guest details.
    - **Dual-Inventory Claiming Logic**: Verified that `offerBooking.service.js` automatically routes stock allocation based on `offer.itemType`:
      - `itemType: "flight"`: Atomically claims discrete seats from `TicketStock` (`claimedFlightUnits`).
      - `itemType: "hotel"`: Atomically claims room/bed allotments from `HotelStock` (`claimedHotelUnits`).
    - **Customer Booking Management & Cancellation**:
      - `GET /api/v1/offers/bookings/:id`: Fetches customer booking details, snapshot, and claimed units.
      - `POST /api/v1/offers/bookings/:id/cancel`: Cancels booking and atomically releases claimed flight or hotel units back to warehouse inventory.
    - **Downstream Fulfillment Endpoints**:
      - E-Tickets: `GET /api/v1/offers/bookings/:id/eticket` & `/download`.
      - Statutory Tax Invoices: `GET /api/v1/offers/bookings/:id/invoice` & `/download`.

- **Live Flight Booking Comparison (`modules/flights/flight.routes.js`)**:
  - Delineated architectural differences between standalone wholesale retail offers (`/api/v1/offers/:id/book`) vs live GDS/LCC flight bookings (`POST /api/v1/flights/book`, `GET /api/v1/flights/bookings/my`, `GET /api/v1/flights/bookings/:bookingId`, `POST /api/v1/flights/bookings/:bookingId/cancel`).

#### 📂 Files Audited & Referenced:
- `modules/invoices/invoice.service.js`
- `modules/invoices/invoice.routes.js`
- `modules/hotels/hotel.routes.js`
- `modules/packages/offers/offer.routes.js`
- `modules/packages/offers/offerBooking.service.js`
- `modules/packages/offers/offerBooking.controller.js`
- `modules/flights/flight.routes.js`
- `my_backend_update.md`

---

### 📅 2026-10-28
**Title:** Standalone Retail Offers API Documentation, Dual-Service E-Ticketing Engine (Live & In-House Services) & Client-Side Architecture Integration

#### 🚀 Key Highlights & Tasks:
- **Standalone Retail Offers API Documentation Overhaul (`OFFER_USER_API_DOCUMENTATION.md`)**:
  - Authored comprehensive developer API documentation for `modules/packages/offers/offer.routes.js`:
    - `GET /api/v1/offers`: Public browsing, regex text search, min/max price range filters, and live warehouse inventory stock calculations.
    - `GET /api/v1/offers/:id`: Single offer deep-dive with live `availableBookings` recalculated from `TicketStock` / `HotelStock`.
    - `POST /api/v1/offers/:id/book`: Authenticated customer booking with atomic stock claims, snapshot freezing, and automatic Master Booking synchronization (`bookingType: "offer"`).
    - `POST /api/v1/offers/bookings/:id/cancel`: Booking cancellation with automated inventory unit restoration back to warehouse stock.
    - `GET /api/v1/offers/bookings/:id`: Customer single booking retrieval with claimed unit IDs.
  - Documented complete JSON request/response payloads (`200 OK`, `400`, `401`, `404`, `409 Conflict`), stock claiming race-condition handling, TypeScript interfaces, and downstream payment integration (PayPal & Razorpay).
  - Saved in both [`docs/packageAndOffer/OFFER_USER_API_DOCUMENTATION.md`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/docs/packageAndOffer/OFFER_USER_API_DOCUMENTATION.md) and [`docs/OFFER_USER_API_DOCUMENTATION.md`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/docs/OFFER_USER_API_DOCUMENTATION.md).

- **Dual-Service Flight E-Ticket Architecture & Backend Engine Implementation**:
  - Implemented the universal E-Ticket normalizer engine in [`modules/eticket/eticket.service.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/eticket/eticket.service.js) serving both Live Flights and In-House Services without altering database schemas:
    - **Live Flight Services (Online GDS & LCC)**: Queries `FlightBooking`, resolves real airline PNR, GDS PNR, normalized itinerary segments (airports, terminals, schedules, baggage), and passengers with official 13-digit airline ticket numbers (`098-...`).
    - **In-House Retail Offers**: Queries `OfferBooking`, resolves wholesale series schedule from `TicketStock`, and pairs individual passengers to their claimed discrete seat units.
    - **In-House Tour Packages**: Queries `PackageBooking`, resolves bundled flight inventory from `TicketStock`, and maps all travelers to their allocated flight units.
  - Implemented the **Dual-PNR Architecture** for all In-House flights:
    - **Customer PNR** (`MQM-XXXXXX`): Derived from the booking ID for user self-service.
    - **Master Airline Group PNR** (`TicketStock.pnr`): Wholesale series PNR registered with the operating carrier for airport check-in desk and manifest lookup.
  - Implemented Public 2-Factor Ticket Verification (`verifyTicket`) allowing airport ground staff or travelers to verify ticket validity by matching PNR and passenger last name without logging in.

- **E-Ticket Controller & Route Layer Deployment**:
  - Built controller in [`modules/eticket/eticket.controller.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/eticket/eticket.controller.js) providing both `get` (JSON payload) and `download` (`Content-Disposition: attachment; filename="ETicket-..."` JSON file stream).
  - Enforced strict architectural division: **Zero server-side HTML templates**. All visual styling, boarding pass cards, and PDF generation are implemented on the frontend client.
  - Mounted centralized routes in [`modules/eticket/eticket.routes.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/eticket/eticket.routes.js) on `/api/v1/eticket` in `app.js`.
  - Hooked domain-level e-ticket endpoints into:
    - Live Flights: `GET /api/v1/flights/bookings/:bookingId/eticket` & `/download` in `modules/flights/flight.routes.js`.
    - In-House Offers: `GET /api/v1/offers/bookings/:id/eticket` & `/download` in `modules/packages/offers/offer.routes.js`.
    - In-House Packages: `GET /api/v1/packages/bookings/:id/eticket` & `/download` in `modules/packages/user/packageUser.routes.js`.
  - Protected endpoints with standard JWT authentication (`authenticate`).

- **Flight E-Ticket API Documentation Synchronization**:
  - Authored comprehensive frontend integration guides in [`docs/flight/FLIGHT_ETICKET_API_DOCUMENTATION.md`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/docs/flight/FLIGHT_ETICKET_API_DOCUMENTATION.md) and [`docs/FLIGHT_ETICKET_API_DOCUMENTATION.md`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/docs/FLIGHT_ETICKET_API_DOCUMENTATION.md).
  - Outlined all endpoints, query parameters, complete JSON response schemas, dual-PNR mechanics, and React / Next.js client-side print-to-PDF / download implementation recipes.

- **Invoice System API Documentation Enhancement (`INVOICE_DOWNLOAD_API_DOCUMENTATION.md`)**:
  - Upgraded [`docs/invoices/INVOICE_DOWNLOAD_API_DOCUMENTATION.md`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/docs/invoices/INVOICE_DOWNLOAD_API_DOCUMENTATION.md) to Version 2.0.0 covering both JSON data retrieval and file attachment downloads across all travel verticals.
  - Documented complete JSON request specs, query parameters, path resolvers, and verified realistic `200 OK` JSON response payloads for:
    - **Package Invoice Retrieval:** `GET /api/v1/invoices/package/:bookingId` (Pilgrim manifest, inclusions, 5% agency personal GST, payment details).
    - **Flight Invoice Retrieval:** `GET /api/v1/invoices/flight/:bookingId` (LCC & GDS classifications, airline PNR, flight segments, SSR ancillaries, corporate B2B GST, SAC 996411/996412, and 18% GST).
    - **Hotel Invoice Retrieval:** `GET /api/v1/invoices/hotel/:bookingId` (Stay nights, room snapshots, meal plan boards, guest manifest, SAC 998555, and 18% GST on service fee).
    - **In-Browser HTML Views:** `GET /api/v1/invoices/:vertical/:bookingId/html` (Live browser preview, modal iframes, and `window.print()` automation).

- **In-House Standalone Offer & Visa Batch Tax Invoice Implementation**:
  - Engineered zero-schema-change invoice generation for **In-House Retail Offers** (`OfferBooking` backed by `TicketStock` flight inventory or `HotelStock` room allotments) and **In-House Visa Services** (`VisaGroup` + `VisaApplication`).
  - Added executive branded HTML templates:
    - [`modules/invoices/templates/offer-invoice.html`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/invoices/templates/offer-invoice.html): Dynamic flight schedule vs hotel stay details, passenger/guest manifests, wholesale consideration vs agency markup, and A4 print stylesheet.
    - [`modules/invoices/templates/visa-invoice.html`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/invoices/templates/visa-invoice.html): Visa application batch header, applicant manifests with masked passport numbers, and statutory two-bucket tax itemization.
  - Implemented core business logic in [`modules/invoices/invoice.service.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/invoices/invoice.service.js):
    - `getOfferInvoiceData(bookingId, currentUser)`: Resolves offer booking, validates RBAC ownership, dynamically formats flight routing vs. hotel stay, computes deterministic `MT-INV-OFR-[FLT|HTL]-YYYYMM-XXXXXX`, and calculates statutory tax math.
    - `renderOfferInvoiceHtml(data, rawToken)` & `getOfferInvoiceHtml(bookingId, currentUser, rawToken)`.
    - `getVisaInvoiceData(groupId, currentUser)`: Resolves `VisaGroup` and related `VisaApplication` documents, validates customer authorization, computes deterministic `MT-INV-VSA-YYYYMM-XXXXXX`, and itemizes non-taxable consular pass-through fees vs. taxable 18% GST agency processing fees under SAC `998555`.
    - `renderVisaInvoiceHtml(data, rawToken)` & `getVisaInvoiceHtml(groupId, currentUser, rawToken)`.
  - Added controller methods in [`modules/invoices/invoice.controller.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/invoices/invoice.controller.js):
    - `getOfferInvoiceData`, `getOfferInvoiceHtml`, `downloadOfferInvoice`
    - `getVisaInvoiceData`, `getVisaInvoiceHtml`, `downloadVisaInvoice`
  - Registered canonical routes in [`modules/invoices/invoice.routes.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/invoices/invoice.routes.js) with full OpenAPI annotations:
    - `GET /api/v1/invoices/offer/:bookingId` (JSON)
    - `GET /api/v1/invoices/offer/:bookingId/html` (HTML Document)
    - `GET /api/v1/invoices/offer/:bookingId/download` (File Attachment)
    - `GET /api/v1/invoices/visa/:groupId` (JSON)
    - `GET /api/v1/invoices/visa/:groupId/html` (HTML Document)
    - `GET /api/v1/invoices/visa/:groupId/download` (File Attachment)
  - Mounted invoice router directly in [`app.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/app.js) (`app.use('/api/v1/invoices', invoiceRoutes)`).
  - Added convenience domain-level alias routes:
    - In-House Offers: `GET /api/v1/offers/bookings/:id/invoice` (and `/html`, `/download`) in [`modules/packages/offers/offer.routes.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/packages/offers/offer.routes.js).
    - In-House Visa: `GET /api/v1/visa/user/groups/:id/invoice` (and `/html`, `/download`) in [`modules/visa/user/visa.routes.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/visa/user/visa.routes.js).
  - Verified comprehensive test suite in `scratch/test-offer-visa-invoice.js` with 100% assertions passing for Express routing, HTML generation, and 403 Forbidden RBAC enforcement.

#### 📂 Files Modified / Created:
- `modules/invoices/templates/offer-invoice.html` (Created)
- `modules/invoices/templates/visa-invoice.html` (Created)
- `modules/invoices/invoice.service.js`
- `modules/invoices/invoice.controller.js`
- `modules/invoices/invoice.routes.js`
- `modules/packages/offers/offer.routes.js`
- `modules/visa/user/visa.routes.js`
- `app.js`
- `scratch/test-offer-visa-invoice.js` (Created)
- `modules/eticket/eticket.service.js` (Created)
- `modules/eticket/eticket.controller.js` (Created)
- `modules/eticket/eticket.routes.js` (Created)
- `modules/flights/flight.routes.js`
- `modules/packages/user/packageUser.routes.js`
- `docs/flight/FLIGHT_ETICKET_API_DOCUMENTATION.md` (Created)
- `docs/FLIGHT_ETICKET_API_DOCUMENTATION.md` (Created)
- `docs/packageAndOffer/OFFER_USER_API_DOCUMENTATION.md` (Created)
- `docs/OFFER_USER_API_DOCUMENTATION.md` (Created)
- `docs/invoices/INVOICE_DOWNLOAD_API_DOCUMENTATION.md` (Streamlined to Mode A JSON & Mode B File Attachment Download; purged `/html` endpoints)
- `tests/all-invoices.test.js` (Created comprehensive test suite across all 5 invoice verticals)
- `my_backend_update.md`

---

### 📅 2026-10-27
**Title:** Package Customization `includedOfferIds` Lifecycle Resolution, In-House Services Tax Invoicing Architecture & Flight E-Ticket Engineering Blueprint

#### 🚀 Key Highlights & Tasks:
- **Package Customization `includedOfferIds` Root-Cause Diagnosis & Bug Resolution**:
  - Investigated issue where base package default components (Hotel `6abe105ae33c12a898c02ea1` and Flight `6abba3790d38868cbc2e389c` of the `"Zam-zam"` package) were repeatedly written into `customizedSelections.includedOfferIds` on every booking, even when no customization took place.
  - Pinpointed root cause in `modules/packages/core/packageBooking.service.js` where `allIncludedOfferIds` from `quote.items` was unconditionally overwriting user-selected options instead of capturing explicit client customization deltas.
  - Resolved `[TypeError: Cannot read properties of undefined (reading 'map')]` on `POST /api/v1/packages/book` caused by evaluating array checks against `allIncludedOfferIds` rather than the incoming request body parameter `includedOfferIds`.
  - Diagnosed `[HTTP 400] Offer '...' is mandatory and must be included in includedOfferIds` thrown by `calculateCustomQuote` in `package.service.js`, explaining the strict whitelist mechanics when `includedOfferIds` is supplied.
  - Formulated the exact request payload patterns enabling customers to simultaneously combine existing mandatory offers, swapped replacements, and extra optional bundled offers.

- **Auth Refresh Token Expiration Restructuring**:
  - Re-adjusted `REFRESH_TOKEN_SECRET` lifespan in `middleware/auth.js` (`generateTokens`), updating expiration from testing value (`'1m'`) back to standard production retention (`'30d'`).

- **In-House Services Architecture & Tax Invoicing Specification**:
  - Analyzed and documented the core architectural distinction between In-House wholesale inventory (`TicketStock`, `HotelStock`, `Hotelier` partner portal with `origin: in_house`) vs. live third-party aggregator feeds (`origin: third_party`).
  - Defined statutory GST and travel regulatory compliance rules for in-house flight and hotel invoicing:
    - **SAC 996411 / 996412**: Passenger air transport tax rates (5% economy, 12% business).
    - **SAC 998555**: Travel agency commission & service margin (18% GST).
    - **SAC 996311**: Hotel room accommodation (12% for tariff $\le$ ₹7,500/night; 18% for tariff $>$ ₹7,500/night).
    - **Place of Supply (PoS)**: Rules governing Intra-State (`CGST + SGST`) vs Inter-State (`IGST`) tax accounting.

- **Flight E-Ticket Architecture & Complete Implementation Guide Creation**:
  - Designed the complete Flight E-Ticket architecture, defining the industry-standard division of responsibilities (Backend handles data authority, PNRs, ticket numbers, security, and download streams; Frontend handles visual boarding pass UI and client-side PDF export via `window.print()`).
  - Solved in-house group PNR privacy by formulating the **Dual-PNR Hierarchy**: Master Airline Group PNR (`TicketStock.pnr` for airport check-in) + Customer Booking Locator (e.g. `MQM-7K9P2W` for traveler self-service).
  - Authored comprehensive, from-scratch, code-free architectural specification:
    - Created: [`docs/flight/FLIGHT_ETICKET_ARCHITECTURE_AND_IMPLEMENTATION_GUIDE.md`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/docs/flight/FLIGHT_ETICKET_ARCHITECTURE_AND_IMPLEMENTATION_GUIDE.md).
    - Details the 4-layer backend implementation plan, operational flight data dictionaries, and multi-tenant security isolation.
  - Demonstrated how existing online flight booking endpoints (`GET /api/v1/flights/bookings/:bookingId`) can immediately be utilized by frontend applications to render E-tickets using already populated `eTicketData`, `pnr`, and passenger `ticketNumber` fields.

#### 📂 Files Modified / Created:
- `modules/packages/core/packageBooking.service.js`
- `middleware/auth.js`
- `docs/flight/FLIGHT_ETICKET_ARCHITECTURE_AND_IMPLEMENTATION_GUIDE.md`
- `my_backend_update.md`

---

### 📅 2026-10-26
**Title:** Package Module Customer API Documentation Sync, `includedOfferIds` Request Payload Architecture & Stock Claiming Validation

#### 🚀 Key Highlights & Tasks:
- **Package User API Documentation Overhaul (`PACKAGE_USER_API_DOCUMENTATION.md` & `.html`)**:
  - Fully synchronized customer-facing package documentation with active backend implementation across all 7 endpoints:
    - `GET /api/v1/packages`: Browse & search packages with live lowest stock calculation and pagination metadata.
    - `GET /api/v1/packages/getAllBookingPackage` (alias `/bookings`): Retrieve authenticated customer's booking history.
    - `GET /api/v1/packages/:id`: Retrieve package details, itinerary, and eligible swappable alternatives.
    - `POST /api/v1/packages/:id/quote`: Live dynamic customizer quote recalculation (Option A formula).
    - `POST /api/v1/packages/book`: Customer package booking with atomic stock reservation (`TicketStock`, `HotelStock`).
    - `GET /api/v1/packages/bookings/:id`: Retrieve single booking details with claimed stock units and ops assignment.
    - `POST /api/v1/packages/bookings/:id/cancel`: Cancel booking, release inventory units, and sync Master Booking.
  - Added dedicated architectural section **4.1 Component Selection Mechanics: `includedOfferIds` vs `excludedOfferIds`** defining key value sources (`priceBreakdown[].id` vs subdocument `refId`), opt-out rules, stock claim impacts, and safety guardrails.
  - Updated paired interactive HTML documentation (`PACKAGE_USER_API_DOCUMENTATION.html`) with modern dark theme styling, Mermaid interactive workflow diagram, responsive sidebar navigation, copy buttons, and mechanics comparison cards.

- **Debugging & Resolution of Package Booking Validation Errors (`HTTP 400`)**:
  - Investigated and diagnosed `[HTTP 400] POST /api/v1/packages/book - swappedOffers[2].originalOfferId must be a valid ObjectId`.
  - Pinpointed root cause: client sent an empty or non-hex string in `swappedOffers` array at index 2 instead of a 24-character hexadecimal MongoDB ObjectId.
  - Provided defensive validation and sanitization guidelines for client applications and Postman tests.

- **Full End-to-End Implementation of `includedOfferIds` in Request Payloads**:
  - **Validator (`modules/packages/core/package.validator.js`)**:
    - Added validation logic in `validateQuotePreview` ensuring `includedOfferIds`, if passed, is a valid array of 24-character hex MongoDB ObjectIds.
    - Leveraged validation chaining so `validateBookCustomizedPackage` automatically enforces valid `includedOfferIds` on booking creation.
  - **Package Service & Quote Engine (`modules/packages/core/package.service.js`)**:
    - Enhanced `calculateCustomQuote` to accept `includedOfferIds`.
    - Automatically marks any optional bundled component omitted from `includedOfferIds` as excluded (`isIncluded: false, isOptedOut: true`) and calculates retail deductions.
    - Enforced mandatory component guardrails (throwing `400 Bad Request` if a mandatory flight/hotel is omitted from `includedOfferIds`).
    - Handled swapped replacement mapping so replacements listed in `includedOfferIds` are correctly recognized as active.
    - Added `includedOfferIds` and `excludedOfferIds` to the returned quote payload.
  - **Booking Service & Stock Reservation (`modules/packages/core/packageBooking.service.js`)**:
    - Updated `createBooking` and `bookPackageForCustomer` to accept `includedOfferIds` and forward them to quote calculation.
    - Ensured `TicketStock` and `HotelStock` physical inventory units are claimed exclusively for active components.
    - Populated `customizedSelections.includedOfferIds` with the active included offer manifest.
  - **Controllers (`modules/packages/user/packageBookingUser.controller.js` & `modules/packages/admin/packageBookingAdmin.controller.js`)**:
    - Forwarded `includedOfferIds: req.body.includedOfferIds` from user and admin booking requests to core booking services.

- **Database Audit & Offer Component Manifest Clarification**:
  - Investigated user inquiry regarding multiple ObjectIds appearing in `customizedSelections.includedOfferIds` (`ObjectId('6abe105ae33c12a898c02ea1')` and `ObjectId('6abba3790d38868cbc2e389c')`).
  - Executed database inspection verifying that these two ObjectIds are distinct bundled components of the `"Zam-zam"` package (`6ac4cc8fdd7f83ab2e5a4cd3`):
    - `6abe105ae33c12a898c02ea1`: **Hotel Offer** (*InterContinental Durrat Al Riyadh Resort & Spa — Executive Suite*).
    - `6abba3790d38868cbc2e389c`: **Flight Offer** (*Emirates EK-512 DEL → DXB*).
  - Clarified that these represent the required multi-component manifest (Flight + Hotel) mandatory for inventory stock claims and immutable snapshot isolation, rather than duplicate entries.

#### 📂 Files Modified / Created:
- `modules/packages/core/package.validator.js`
- `modules/packages/core/package.service.js`
- `modules/packages/core/packageBooking.service.js`
- `modules/packages/user/packageBookingUser.controller.js`
- `modules/packages/admin/packageBookingAdmin.controller.js`
- `docs/packageAndOffer/PACKAGE_USER_API_DOCUMENTATION.md`
- `docs/packageAndOffer/PACKAGE_USER_API_DOCUMENTATION.html`
- `my_backend_update.md`

---

### 📅 2026-10-24
**Title:** CMS Hero Banner Management (PUT/DELETE), Hotel Invoice PDF Download Flow via Swagger UI & CGST/SGST Tax Architecture

#### 🚀 Key Highlights & Tasks:
- **CMS Hero Banner CRUD Expansion (`PUT & DELETE /api/v1/cms/heroPic`)**:
  - Implemented `editHeroPic` (`PUT /api/v1/cms/heroPic`) allowing administrators to update hero banner title, subtitle, publishing status, and replace binary images via Multer/Cloudinary or external image URLs.
  - Implemented automatic cleanup of old Cloudinary assets by `publicId` whenever an image is replaced or updated.
  - Implemented `deleteHeroPic` (`DELETE /api/v1/cms/heroPic`) to permanently remove the Cloudinary picture asset and delete the hero banner record from MongoDB.
  - Added request validation schemas in `modules/cms/cms.validator.js` (`validateEditHeroPic`) ensuring valid image URLs, title length bounds, and boolean casts.
  - Documented OpenAPI / Swagger definitions for both `PUT` and `DELETE` endpoints in `modules/cms/cms.routes.js`.

- **Hotel Invoice PDF Download Flow via Swagger UI**:
  - Analyzed and documented the end-to-end user workflow to download confirmed hotel booking invoices in PDF format using Swagger UI (`/api/v1/invoices/docs` and `/api/docs`).
  - Detailed dual-authentication handling via Swagger UI `Authorize` modal (Bearer JWT) and alternative query parameter (`?token=`).
  - Provided two operational workflows:
    - **Direct Render & Print:** `GET /api/v1/invoices/hotel/{bookingId}/html` — opens print-ready A4 document in the browser with embedded "Print / Save PDF" button calling `window.print()`.
    - **File Attachment Stream:** `GET /api/v1/invoices/hotel/{bookingId}/download` — delivers `MT-INV-HTL-YYYYMM-XXXX.html` file attachment via `Content-Disposition`.
  - Verified dynamic identifier resolution supporting MongoDB ObjectIds (`24-hex`), confirmation numbers (`confirmationNo`), booking references (`bookingRefNo`), and provider booking IDs (`providerBookingId`).

- **Hotel Invoice CGST & SGST Tax Calculation & Template Mapping**:
  - Conducted an in-depth code audit of the hotel invoice tax pipeline across database models, service calculations, and HTML templates.
  - Mapped out the exact file locations:
    - **Calculation:** `modules/invoices/invoice.service.js` (`getHotelInvoiceData`) calculating statutory 18% GST (CGST 9% + SGST 9% or IGST 18%) on the agency markup and convenience fee.
    - **HTML Table Row Generation:** `modules/invoices/invoice.service.js` (`renderHotelInvoiceHtml`) generating `<tr>` elements for `{{gstTaxRows}}`.
    - **Template Placement:** `modules/invoices/templates/hotel-invoice.html` inside the financial fare breakdown table.
  - Diagnosed conditional tax display behavior when bookings have zero markup/service fees and provided architectural recommendations for hotel room tariff GST vs. service fee GST.

- **Omnichannel Package Booking Invoice Notification Sync**:
  - Integrated package invoice download dispatch into `modules/payments/bookingSync.js` upon payment verification to automatically send booking confirmation notifications with direct invoice download links (`/api/v1/invoices/package/:bookingId/download`).

#### 📂 Files Modified / Created:
- `modules/cms/cms.controller.js`
- `modules/cms/cms.routes.js`
- `modules/cms/cms.service.js`
- `modules/cms/cms.validator.js`
- `modules/payments/bookingSync.js`
- `modules/invoices/invoice.service.js`
- `modules/invoices/templates/hotel-invoice.html`
- `docs/invoices/INVOICE_DOWNLOAD_API_DOCUMENTATION.md`
- `my_backend_update.md`

---

### 📅 2026-10-23
**Title:** CMS API Specification, CRM Settings & Tax Documentation, and Invoice Download Architecture

#### 🚀 Key Highlights & Tasks:
- **Comprehensive CMS API Specification (`docs/cms/CMS_API_DOCUMENTATION.md`)**:
  - Authored complete, production-grade technical documentation for the platform's Content Management System (CMS) API endpoints (`/api/v1/cms`).
  - Documented complete route mapping across Pages, Sections, Dynamic Banners, FAQs, Testimonials, Media Gallery, and SEO Metadata.
  - Specified request payloads, Joi validation schemas, query filters, multipart file upload fields, and standardized JSON success/error envelopes (`sendSuccess` / `sendError`).
  - Documented role-based authorization requirements (public read access vs. staff/admin write permissions) and Swagger UI integration.

- **CRM Settings & Agency Taxation Documentation (`docs/settings/CRM_SETTINGS_API_DOCUMENTATION.md`)**:
  - Created exhaustive API documentation for platform-wide settings (`/api/v1/crm/setting`), detailing commercial markups (`/markup`), agency personal GST (`/agency-gst` and alias `/gst`), and polymorphic configuration sections (`/:section`).
  - Specified request bodies, query options (`?envelope=true`), validation rules, and response envelopes.
  - **Zero-Code Frontend Implementation Blueprint**: Added a dedicated architectural guide explaining step-by-step how frontend engineers should implement Markup (GET, POST, PATCH) and Agency Personal GST (GET, POST) controls without writing code (form state tracking, pristine baselines, button loading states, optimistic UI feedback, and error toasts).
  - **Statutory Tax & Markup Itemization on Invoices**: Formulated the comprehensive statutory tax breakdown across Flights, Hotels, and In-House Tour/Umrah Packages:
    - Detailed the pure-agent pass-through cost principle for wholesale airline fares and hotel room tariffs.
    - Documented statutory 18% GST (CGST 9% + SGST 9% or IGST 18%) applied strictly to agency convenience and service fees.
    - Documented the unified 5% Agency Personal GST applied as a single branded line item on tour packages without legacy split tax conflicts.
    - Itemized official SAC codes: Domestic Air (`996411`), International Air (`996412`), Hotel Accommodations (`996311`), and Travel Agency Services (`998555`).

- **In-House Services & Package Booking Logic Analysis**:
  - Analyzed the end-to-end booking flow and API endpoints for in-house tour and pilgrimage packages from both the customer checkout experience and back-office CRM operations without modifying the codebase.
  - Verified booking state transitions, Razorpay payment verification, and automated invoice trigger integration.

- **Dedicated Invoice Download API Documentation (`docs/invoices/INVOICE_DOWNLOAD_API_DOCUMENTATION.md`)**:
  - Created a specialized documentation file focusing **strictly on invoice file download endpoints** across all three booking verticals:
    - Package Booking: `GET /api/v1/invoices/package/:bookingId/download`
    - Flight Booking: `GET /api/v1/invoices/flight/:bookingId/download`
    - Hotel Booking: `GET /api/v1/invoices/hotel/:bookingId/download`
  - Documented HTTP `GET` parameter handling (URL path `:bookingId` and query `?token=`) and confirmed empty request body input (`None / N/A`).
  - Detailed response headers (`Content-Type: text/html; charset=utf-8`, `Content-Disposition: attachment; filename="<INVOICE_NUM>.html"`) and standard error JSON envelopes (400, 401, 403, 404, 500).
  - **Zero-Code Frontend Implementation Guide**: Authored a complete architectural and procedural guide for frontend developers without programming code:
    - Touchpoint placement across Post-Booking Thank You screens, "My Bookings" cards, CRM drawers, and accounting tables.
    - Two download integration strategies: In-Memory Fetch & Blob Pipeline (for modern SPAs) vs. Direct Anchor Link with Query Token (`?token=`).
    - Defensive Anti-Corruption Gate: inspecting response status and `Content-Type` before file generation to prevent saving error JSON into `.html` files.
    - Dynamic filename extraction from `Content-Disposition` header with deterministic fallback naming.
    - In-memory Blob creation, temporary Object URL creation, virtual anchor click, and immediate memory cleanup via Object URL revocation.
    - Role-based UI visibility (customers limited to own bookings; admin/operations unrestricted).
    - Explaining the end-user document experience (instant, lightweight HTML file with embedded `@media print` A4 styles converted to PDF via `Ctrl + P`).

- **Swagger UI Interactive Download Testing Guidance**:
  - Provided testing procedures to verify live invoice downloads directly in Swagger UI (`/api/v1/invoices/docs`) using active MongoDB records (`6ab751247fecf3dd5b6c1192` for packages, `789123` / `PNR90757` for flights, and `6aba186d6479de9e23668e1f` for hotels) with dual-token authorization.

#### 📂 Files Modified / Created:
- `docs/invoices/INVOICE_DOWNLOAD_API_DOCUMENTATION.md` *(Created)*
- `docs/settings/CRM_SETTINGS_API_DOCUMENTATION.md` *(Created & Expanded)*
- `docs/cms/CMS_API_DOCUMENTATION.md` *(Created & Expanded)*
- `my_backend_update.md` *(Updated)*

---

### 📅 2026-10-22
**Title:** Dedicated Agency Personal GST (5%) Route in CRM Settings

#### 🚀 Key Highlights & Tasks:
- **Dedicated Agency Personal GST Route**:
  - Added dedicated route in `modules/crm/settings.routes.js` (`POST /api/v1/crm/setting/agency-gst` and alias `/gst`) to apply agency personal GST (5%).
  - Also added `GET /api/v1/crm/setting/agency-gst` to retrieve active agency personal GST rate and tax configuration.
- **Refined to Exclusive Agency Personal GST Tax**:
  - Removed `taxPercentage: 5` (default tax) from `DEFAULT_SETTINGS.financial`.
  - Stripped other split taxes (`cgstPercent`, `sgstPercent`, `igstPercent`) and default tax from both `applyAgencyGst` and `getAgencyGstSettings`.
  - The endpoint now exclusively applies and returns `agencyPersonalGst` (personal GST tax) without other taxes.
- **Package Booking Invoice Engine**:
  - Implemented on-the-fly, zero-database-migration invoice engine for **Umrah & Tour Packages** (`PackageBooking`).
  - Added deterministic numbering: `MT-INV-PKG-YYYYMM-XXXX`.
  - Created branded executive HTML template [`modules/invoices/templates/package-invoice.html`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/invoices/templates/package-invoice.html) with pilgrim manifest, travel dates, inclusions tags, tour guide addon, personal GST, and `@media print` A4 rules.
  - Added JSON, HTML preview, and attachment download endpoints with flexible auth (`invoiceAuth`):
    - `GET /api/v1/invoices/package/:bookingId`
    - `GET /api/v1/invoices/package/:bookingId/html`
    - `GET /api/v1/invoices/package/:bookingId/download`
  - Integrated with `modules/payments/bookingSync.js` to dispatch omnichannel confirmation notification with invoice download link on package payment completion.
  - Verified 100% test pass rate with `scratch/test-package-invoice.js`.

#### 📂 Files Modified / Created:
- `modules/invoices/templates/package-invoice.html`
- `modules/invoices/invoice.service.js`
- `modules/invoices/invoice.controller.js`
- `modules/invoices/invoice.routes.js`
- `modules/payments/bookingSync.js`
- `scratch/test-package-invoice.js`
- `INVOICE_SYSTEM_DOCUMENTATION.md`
- `modules/crm/settings.routes.js`
- `modules/crm/settings.controller.js`
- `modules/crm/settings.service.js`

---

### 📅 2026-10-16
**Title:** Flight & Hotel Invoice Generation Engine, Tax & GST Calculation Architecture

#### 🚀 Key Highlights & Tasks:
- **Zero-Migration Invoice Engine**:
  - Implemented modular invoice service and controller in `modules/invoices/` supporting **LCC & GDS flights** as well as **Hotel bookings** directly on existing database schemas.
  - Added deterministic, collision-free invoice numbering: `MT-INV-LCC-YYYYMM-XXXX`, `MT-INV-GDS-YYYYMM-XXXX`, and `MT-INV-HTL-YYYYMM-XXXX`.
- **Rigorous Tax & GST Calculation**: 
  - **Flights:** Evaluates Base Fare, Airline Statutory Taxes (Tax + YQ Fuel Surcharge), SSR Ancillaries (Baggage, Meals, Seats), Agency Service/Markup Fee, and 18% GST (CGST 9% + SGST 9% or IGST 18%).
  - **Hotels:** Converts minor currency units (paise) to major units, itemizes wholesale room tariffs, agency markup, and platform convenience fees with 18% GST on agency services.
  - **SAC Code Compliance:** Configured official SAC classification: Domestic Air (`996411`), International Air (`996412`), Hotel Stay (`996311`), Agency Services (`998555`).
- **Corporate B2B GST Invoicing**: 
  - Integrated corporate tax invoicing when `wantsInvoice: true`, capturing Buyer GSTIN, Company Name, Address, and contact details.
- **Branded Print-Ready HTML & PDF Engine**:
  - Designed responsive HTML templates with `@media print` rules, A4 pagination, clean color schemes, and no external dependencies.
- **Multi-Format Delivery & Dual Authentication**:
  - Endpoints support JSON data, rendered HTML view, and file attachment downloads (`.html`).
  - Added flexible authentication supporting both `Authorization: Bearer <token>` and `?token=` query param (for iframes, downloads, and new browser tabs).
- **Swagger Documentation**:
  - Registered dedicated interactive Swagger documentation on `/api/v1/invoices/docs`.
- **Comprehensive Documentation**:
  - Authored full technical architecture and integration guide in `INVOICE_SYSTEM_DOCUMENTATION.md` and `docs/invoices/INVOICE_SYSTEM_DOCUMENTATION.md`.
- **Testing & Verification**:
  - `scratch/test-invoice.js`: 100% passed (LCC & GDS fare breakdown, SSR ancillaries, corporate GST).
  - `scratch/test-hotel-invoice.js`: 100% passed (stay duration diffing, multi-room manifests, guest list, 18% GST, RBAC customer ownership guards).

#### 📂 Files Modified / Created:
- `modules/invoices/index.js`
- `modules/invoices/invoice.controller.js`
- `modules/invoices/invoice.routes.js`
- `modules/invoices/invoice.service.js`
- `modules/invoices/templates/flight-invoice.html`
- `modules/invoices/templates/hotel-invoice.html`
- `app.js`
- `INVOICE_SYSTEM_DOCUMENTATION.md`
- `docs/invoices/INVOICE_SYSTEM_DOCUMENTATION.md`
- `scratch/test-invoice.js`
- `scratch/test-hotel-invoice.js`

---

### 📅 2026-10-15
**Title:** CRM Settings Route Transfer, Markup Configuration & Auth Enhancements

#### 🚀 Key Highlights & Tasks:
- **Transferred CRM Settings Routes**:
  - Moved settings and markup route handlers from `modules/crm/crm.routes.js` into dedicated `modules/crm/settings.routes.js`.
  - Configured the official API endpoint prefix as `/api/v1/crm/setting`.
- **Markup Routes Consolidation**:
  - Transferred `GET`, `POST`, `PUT`, and `PATCH` markup endpoints into `settings.routes.js`.
  - Maintained backward compatibility in `crm.routes.js` via `router.all('/markup*', ...)` delegation.
  - Added route fallback aliases in `app.js` (`/crm/setting` and `/crm`) to handle requests without the `/api/v1` prefix.
- **Authentication & Token Handling**:
  - Updated auth model and services for token management and validation.
- **Testing & Verification**:
  - `tests/crm/crm_settings.test.js`: 8/8 tests passed (covering section retrieval, update, root endpoint, markup and permission guards).
  - `tests/crm/crm_markup.test.js`: Verified markup retrieval and update flows.
- **commit some files**
  - `visaStock.model.js`
  - `success.yaml`
  - `app.js`
  - `auth.model.js, auth.service.js, crm.routes.js, crm.validator.js, settings.routes.js`

#### 📂 Files Modified:
- `modules/crm/crm.routes.js`
- `modules/crm/settings.routes.js`
- `modules/crm/settings.service.js`
- `modules/crm/crm.validator.js`
- `app.js`
- `modules/auth/auth.model.js`
- `modules/auth/auth.service.js`
- `tests/crm/crm_settings.test.js`

---

### 📅 2026-10-09
**Title:** Refresh Token Problem Resolution

#### 🚀 Key Highlights & Tasks:
- Resolved refresh token verification and expiration edge cases.
- Handled refresh token rotation conflicts during simultaneous client requests.
- Added structured error responses for expired / invalid refresh tokens.

#### 📂 Files Modified:
- `modules/auth/auth.service.js`
- `modules/auth/auth.controller.js`
- `middleware/auth.js`
- `tests/refreshTokenAuth.test.js`

---

### 📅 2026-10-08
**Title:** Refresh Token Strategy & Fix Implementation

#### 🚀 Key Highlights & Tasks:
- Designed and structured cookie and header-based refresh token exchange mechanism.
- Enhanced token storage, revocation, and active user session checks.

#### 📂 Files Modified:
- `modules/auth/auth.model.js`
- `modules/auth/auth.service.js`
- `modules/auth/auth.validator.js`

---

### 📅 2026-10-06
**Title:** Quotes Module, Master Booking Sync, Notification Modules & Hotel Pricing Markup

#### 🚀 Key Highlights & Tasks:
- **Quotes Module**:
  - Created initial quotes module (`modules/quotes/`) with Admin and User quote management endpoints.
- **Master Booking Sync**:
  - Integrated package and offer bookings into the CRM operations desk.
  - Added live status overrides, handling agent assignment, and operational remarks timeline.
- **Notification Multi-Channel Engine**:
  - Created notification service integrations for SMS, WhatsApp, and Email alerts.
- **Hotel Dynamic Pricing Markup**:
  - Injected dynamic CRM markup percentage calculations into the hotel search and room price aggregation pipeline.
- **CRM Settings Model**:
  - Implemented initial polymorphic setting model (`Setting`) for section-based configurations (`general`, `financial`, `booking`, `notifications`, `markup`).

#### 📂 Files Modified:
- `modules/quotes/quote.routes.js`
- `modules/quotes/quoteAdmin.routes.js`
- `modules/bookings/crm/bookingCrm.routes.js`
- `modules/bookings/crm/bookingCrm.service.js`
- `modules/packages/offers/offerAdmin.routes.js`
- `modules/packages/stock/stockAdmin.routes.js`
- `modules/hotels/hotel.service.js`
- `modules/crm/settings.model.js`
- `modules/crm/settings.service.js`

---

### 📅 2026-10-03
**Title:** Initial CRM Settings Route & Notification System Documentation

#### 🚀 Key Highlights & Tasks:
- Registered CRM site settings endpoints under `/api/v1/crm/settings`.
- Authored technical documentation for the notification architecture.
- Improved refresh token rotation with single-use token invalidation.

#### 📂 Files Modified:
- `modules/crm/crm.routes.js`
- `modules/auth/auth.service.js`
- `docs/notification_system_documentation.md`

---

### 📅 2026-09-26
**Title:** Customer Booking Endpoints & Refresh Token Foundation

#### 🚀 Key Highlights & Tasks:
- Implemented customer booking retrieval endpoints with pagination and status filters.
- Created Mongoose schema and models for storing refresh tokens with TTL expiration.
- Added Express validators for token renewal and customer booking queries.

#### 📂 Files Modified:
- `modules/auth/refreshToken.model.js`
- `modules/auth/auth.validator.js`
- `modules/bookings/booking.routes.js`
- `modules/bookings/booking.service.js`

---

## 📋 Daily Log Entry Template (For Future Updates)

```markdown
### 📅 YYYY-MM-DD
**Title:** Short Summary of the Feature / Task

#### 🚀 Key Highlights & Tasks:
- Task 1 description
- Task 2 description
- Task 3 description

#### 📂 Files Modified:
- `path/to/file1.js`
- `path/to/file2.js`
```


## 📋 TOMORROW WORKING LIST 

```markdown
### 📅 2026-10-25
**Title:** Hotel Invoice GST Customization, Automated PDF Dispatch & Frontend Integration

#### 🚀 Key Highlights & Tasks:
- Task 1: Finalize hotel invoice GST configuration to support configurable statutory tax on room accommodation charges vs. agency service markup.
- Task 2: Implement direct email dispatcher delivering branded invoice PDFs/HTML upon hotel and flight booking confirmation.
- Task 3: Support multi-currency invoice rendering and tax localization for international guests.
```


