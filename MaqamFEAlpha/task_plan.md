# Task Plan: SRDV Flight Booking, Hotel Booking & PayPal Payment Resolution

## Overview
Comprehensive resolution and end-to-end verification of all 5 booking verticals (Live SRDV Flight, Live SRDV Hotel, In-House Retail Flight Offer, In-House Retail Hotel Offer, and In-House Custom Package), PayPal Sandbox buyer authorization and settlement capture, traveler-user CRM relationships, and `.env` environment hygiene.

---

## Phases

### Phase 1: Investigation & Empirical Reproduction <!-- id: 0 -->
- [x] Investigate why `/api/v1/payments/paypal/create-order` returned 400 Bad Request.
- [x] Investigate why live SRDV flight bookings routed to `/api/v1/offers/3887816/book`.
- [x] Investigate why SRDV hotel bookings were misfiring into in-house hotel endpoints.
- [x] Compare against Swagger endpoint contracts at `http://192.168.1.100:5000/api/docs/` and backend express-validator rules.

### Phase 2: Planning & Analysis Artifact Generation <!-- id: 1 -->
- [x] Documented findings in `findings.md` and detailed remediation plan in `task_plan.md`.
- [x] Published deep analysis artifact `srdv_and_paypal_deep_analysis_and_plan.md`.

### Phase 3: Frontend Implementation <!-- id: 2 -->
- [x] **`src/services/paymentService.js`**: Injected `"Idempotency-Key": idempotencyKey` in request headers for `createPayPalOrder` and `capturePayPalOrder`; added 24-character hex MongoDB ObjectId validation.
- [x] **`src/pages/FareQuoteDetails.jsx`**: Isolated live SRDV flights (`traceId` & `resultIndex`) from cached offer drafts; forced `isOffer = false` when booking live supplier flights.
- [x] **`src/components/farequotedetails/TravellerDetails.jsx`**: Added `isMongoId` regex validation (`/^[0-9a-fA-F]{24}$/`) to `isOfferBooking`; routed live SRDV flights strictly to `flightService.bookFlight` (`POST /api/v1/flights/book`); extracted returned 24-hex Mongo `bookingId` for PayPal.
- [x] **`src/pages/SelectedRoomInformation.jsx`**: Added `isExplicitOffer` discriminator; prevented stale `localStorage.getItem("searchId")` from polluting in-house hotel offers vs SRDV hotel reservations; implemented auto-refresh on rate lock expiry (HTTP 410).
- [x] **`src/components/stores/api.js`**: Removed custom header stripping so `Idempotency-Key` headers pass cleanly in both proxy mode and direct cross-origin mode.
- [x] **`MaqamTravelsAlpha/app.js`**: Added `'Idempotency-Key'` and `'idempotency-key'` to CORS `allowedHeaders` on the active backend.
- [x] **`MaqamFEAlpha/.env`**: Cleaned up obsolete and unused variables.

### Phase 4: Verification, Automated Testing & Documentation <!-- id: 3 -->
- [x] Executed frontend integration suite (`test_all_services_frontend_integration.mjs`): 10/10 passed.
- [x] Executed frontend production build (`npm run build`): 0 errors, built in 6.07s.
- [x] Executed comprehensive backend E2E multi-flow suite (`tests/e2e_user_all_flows_and_paypal.test.js`):
  - Step 1: Registered fresh customer user.
  - Step 2: Created and verified saved traveller profile linked to user.
  - Step 3: Flow 1 (Live SRDV Flight) booked + PayPal order created.
  - Step 4: Flow 2 (Live SRDV Hotel) booked + PayPal order created.
  - Step 5: Flow 3 (In-House Flight Offer) booked + PayPal order created.
  - Step 6: Flow 4 (In-House Hotel Offer) booked + PayPal order created.
  - Step 7: Flow 5 (In-House Custom Package) booked + PayPal order created.
  - Step 8: Headless browser automation logged in with PayPal Sandbox credentials (`sb-4wdvz51986119@personal.example.com` / `?n83$CMl`) and approved order.
  - Step 9: Captured payment via `POST /api/v1/payments/paypal/capture` (Capture ID: `1PV37851PT549671R`, status: `paid`, booking status: `confirmed`, master CRM booking synchronized).
  - Step 10: Negative edge cases verified (missing header 400, malformed ID 400, cross-user 403).
- [x] Generated comprehensive test verification report artifact.

---

## Status
- **Current Phase:** Phase 4 (Verification & Documentation)
- **Status:** Complete <!-- GOAL_COMPLETE -->
