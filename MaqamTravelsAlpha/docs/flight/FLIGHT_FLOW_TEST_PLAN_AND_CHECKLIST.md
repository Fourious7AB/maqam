# 📋 Flight Booking Flow — End-to-End Test Plan & Phased Checklist

> **Purpose:** Phased verification of the complete Flight Booking flow from Search to E-Ticket issuance and Cancellation/Refund, tracking frontend-to-backend integrity, API contracts, and edge cases.
> **Date Initiated:** 2026-11-02  
> **Status:** Phase 1 (Understanding) & Phase 2 (Soft Test) In Progress

---

## 🗺️ High-Level Flow Architecture

```text
[Step 1: Search Form] 
       │ (POST /api/v1/flights/search)
       ▼
[Step 2: Results & Filtering] 
       │ (Select Flight: traceId + resultIndex)
       ▼
[Step 3: Fare Quote & Verification] 
       │ (POST /api/v1/flights/fare-quote)
       ├─► (POST /api/v1/flights/ssr - Meals & Extra Baggage)
       └─► (POST /api/v1/flights/seat-map - Interactive Seat Layout)
       ▼
[Step 4: Passenger Information & Form Validation]
       │ (Format single lead passenger, validate DOB & Passports, clean empty arrays)
       ▼
[Step 5: Booking Order Creation]
       │ (POST /api/v1/flights/book)
       ├─► LCC: Instant pending order
       └─► GDS: Real airline PNR held (lastTicketDate)
       ▼
[Step 6: Payment Execution (PayPal)]
       │ (POST /api/v1/payments/paypal/create-order)
       │ (User approves PayPal modal)
       ▼
[Step 7: Capture & Ticketing Synchronization]
       │ (POST /api/v1/payments/paypal/capture)
       ├─► LCC: Synchronous SRDV /TicketLCC issuance
       └─► GDS: Async BullMQ background worker + Redlock
       ▼
[Step 8: Booking Success & Boarding Pass View]
       │ (GET /api/v1/flights/bookings/:id)
       │ (Digital Boarding Pass, E-Ticket PDF Download)
       ▼
[Step 9: Post-Booking / Cancellation & Refund Flow]
       │ (GET /api/v1/flights/bookings/:id/cancellation-charges)
       │ (POST /api/v1/flights/bookings/:id/change-request)
       │ (POST /api/v1/flights/bookings/:id/cancel)
       └─► (GET /api/v1/flights/bookings/:id/cancel-status)
```

---

## 📌 Phased Test Plan

### Phase 1: Understanding & Contract Review (FE & BE)
- [x] Read and inspect `server/docs/flight/FLIGHT_MODULE_DEVELOPER_AND_FRONTEND_GUIDE.md`.
- [x] Review Backend Routes (`flight.routes.js`), Controllers (`flight.controller.js`), Services (`flight.service.js`), and Adapters (`srdv.adapter.js`).
- [x] Review Frontend Routes (`App.jsx`), Services (`flightService.js`, `paymentService.js`), and Pages (`Flight.jsx`, `FareQuoteDetails.jsx`, `TravellerDetails.jsx`, `FlightBookingSuccess.jsx`, `PaymentSuccessPage.jsx`).
- [x] Verify API endpoint parity between Frontend `FlightAPI` and Backend routes.
- [x] Verify Ancillary payloads (empty `[]` arrays vs placeholder objects `{}`).

### Phase 2: Soft Test & Health Check (Diagnostics without heavy execution)
- [x] Inspect environment configurations (`server/.env` vs `MaqamFEAlpha/.env`).
- [x] Test MongoDB connection (Atlas shard connected).
- [x] Test Redis server connectivity (`redis://localhost:6379/0` responded with PONG).
- [x] Test live SRDV v8 Flight API connectivity with header `API-TOKEN` (DEL -> BOM returned 192 flights, TraceId 2624104).
- [x] Test PayPal Sandbox connectivity & authentication tokens (OAuth2 token acquired, 32400s validity).
- [x] Log all warnings, typos, or mismatches in `FLIGHT_FLOW_ERROR_LOG.md`.

### Phase 3: Incremental Error Fixes
- [x] Fix `ERR-001`: Added comment delimiter to `MaqamFEAlpha/.env` line 7.
- [x] Fix `ERR-002`: Verified server CORS allows origin: true for seamless LAN/localhost access.
- [x] Fix `ERR-003`: Mounted `['/calendar-fare', '/calendar-fares']` alias in `flight.routes.js`.
- [x] Fix `ERR-004`: Fixed `modules/eticket/eticket.routes.js` export (`module.exports = router`) resolving server boot crash.
- [x] Fix `ERR-005`: Preloaded `auth.model.js` in `bookingResolver.js`, eliminating `MissingSchemaError: User`.
- [x] Fix `ERR-006`: Added `currency: 'INR'` to `FlightBooking` schema & service for proper PayPal conversion.
- [x] Fix `ERR-007`: Added `redirectUrl` to `payment.model.js` and fallback resolution in `paypal.service.js`.
- [x] Fix `ERR-008`: Overhauled `TravellerDetails.jsx` and `FlightBookingSuccess.jsx` so uncaptured payments never show confirmed boarding passes.
- [x] Fix `ERR-009`: Seamless profile auto-sync for phone OTP users in `TravellerDetails.jsx`.
- [x] Fix `ERR-010`: Added `Idempotency-Key` and `idempotency-key` to CORS `allowedHeaders` in `server/app.js`, eliminating the browser network error on `/payments/paypal/create-order`.
- [x] Fix `ERR-011`: Removed empty ancillary arrays (`Seat: []`, `Baggage: []`, `MealDynamic: []`) in `server/providers/srdv/srdv.client.js` and relaxed fallback retry in `server/modules/flights/flight.service.js`, resolving SRDV `[2]: Invalid seat ssr data`.

### Phase 4: Full End-to-End Soft Verification Run
- [x] Step 1: Run Search API (DEL -> BOM & CCU -> DEL) & verify response contract.
- [x] Step 2: Run Fare Quote API with live TraceId & verify fare locking.
- [x] Step 3: Run SSR & SeatMap queries & verify data normalization.
- [x] Step 4: Validate lead passenger rules, DOB validations, and ancillary arrays.
- [x] Step 5: Test Booking creation (`/book`) and inspect MongoDB `FlightBooking` record (Successfully created confirmed ticket `6ae87f0b24dcdad35239fb85`, PNR: `H8WM8U`, SRDV Booking ID: `2620353`).
- [x] Step 6: Test PayPal order initialization (`/payments/paypal/create-order`) — generated Sandbox order `0M653838NM1394849` with `redirectUrl` to PayPal checkout.
- [ ] Step 7: Test payment capture mock / sync state machine (`bookingSync.js`).
- [ ] Step 8: Test Cancellation Charges calculation formula (`Total - AirlinePenalty - PlatformMarkup`).
- [ ] Step 9: Test Change Request & live cancellation status polling.

### Phase 5: Final Verification & Hand-off
- [ ] Full regression test.
- [ ] Documentation update and status sign-off.
