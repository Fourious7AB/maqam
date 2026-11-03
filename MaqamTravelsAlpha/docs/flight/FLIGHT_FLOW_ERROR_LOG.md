# 🛑 Flight Booking Flow — Error Log & Resolution Tracker

> **Purpose:** Centralized log to capture all detected discrepancies, contract mismatches, runtime errors, and configuration flaws discovered during the phased testing of the Flight Booking flow.
> **Rule:** Every error identified must be assigned a unique ID (`ERR-xxx`), severity level, root cause, proposed fix, and resolution status.

---

## 📊 Summary of Issues

| Issue ID | Severity | Phase | Category | Description | Status |
|---|---|---|---|---|---|
| `ERR-001` | Low | Phase 2 | Configuration | Missing newline/comment indicator on line 7 of `MaqamFEAlpha/.env` (`AI Planner API EndpointVITE_AI_API_URL`) | ✅ Resolved |
| `ERR-002` | Low | Phase 2 | Environment | `VITE_API_BASE_URL` in `MaqamFEAlpha/.env` points to LAN IP (`192.168.1.106:5000`). Verified server `corsOptions` has `origin: true` & `credentials: true`. | ✅ Verified (Compatible) |
| `ERR-003` | Low | Phase 1 | Contract Parity | `flightService.js` references `/calendar-fare` while doc references `/calendar-fares`. | ✅ Resolved (Route alias added) |
| `ERR-004` | High | Phase 2 | Server Boot Crash | `modules/eticket/eticket.routes.js` exported `{ router }` instead of `router`, causing `app.use('/api/v1/eticket', eticketRoutes)` to crash with `TypeError: Router.use() requires a middleware function but got a Object`. | ✅ Resolved |
| `ERR-005` | High | Phase 3 | Backend Payment | `MissingSchemaError: Schema hasn't been registered for model "User"` in `server/modules/payments/bookingResolver.js` when populating `user` on `FlightBooking`. | ✅ Resolved |
| `ERR-006` | Medium | Phase 3 | Payment Currency | `FlightBookingSchema` was missing `currency` field, causing PayPal order to default to USD without converting native INR amounts. | ✅ Resolved |
| `ERR-007` | Medium | Phase 3 | Payment Schema | `PaymentSchema.gatewayData` stripped `redirectUrl`, causing idempotent order reuse to return `redirectUrl: undefined`. | ✅ Resolved |
| `ERR-008` | High | Phase 3 | Frontend Flow | `TravellerDetails.jsx` prematurely routed to `/flight-booking-success?status=pending` when PayPal order creation failed, and `FlightBookingSuccess.jsx` rendered confirmed boarding pass without verified payment capture. | ✅ Resolved |
| `ERR-009` | High | Phase 3 | Frontend Auth Flow | Phone-only OTP users (e.g. `9874561235`) triggered `isPhoneOnlyIncompleteUser` guard which halted "Proceed to Payment" with a profile edit modal instead of redirecting to PayPal. | ✅ Resolved |
| `ERR-010` | High | Phase 3 | CORS Preflight | `server/app.js` CORS `allowedHeaders` omitted `Idempotency-Key` and `idempotency-key`. The browser rejected the OPTIONS preflight for `POST /api/v1/payments/paypal/create-order` with a network error (`Referrer Policy: strict-origin-when-cross-origin`). | ✅ Resolved |
| `ERR-011` | High | Phase 3 | SRDV Ancillary SSR | SRDV `TicketLCC` rejected with `{"Error":{"ErrorCode":"2","ErrorMessage":"Invalid seat ssr data"}}` because empty `Seat: []`, `Baggage: []`, `MealDynamic: []` arrays were serialized in the passenger payload. | ✅ Resolved |

---

## 🔍 Detailed Issue Log

### `ERR-010`: CORS Preflight Block on `POST /api/v1/payments/paypal/create-order`
* **File:** `server/app.js`
* **Severity:** High
* **Symptom:** Browser console showed:
  ```text
  Network Error: Request URL http://localhost:5000/api/v1/payments/paypal/create-order
  Referrer policy: strict-origin-when-cross-origin
  ```
  Immediately after `POST /api/v1/flights/book 201 Created`.
* **Root Cause:**
  `paymentService.js` transmits the required `"Idempotency-Key": idempotencyKey` HTTP header. The browser sends an HTTP `OPTIONS` preflight with `Access-Control-Request-Headers: authorization,content-type,idempotency-key`. In `server/app.js`, `corsOptions.allowedHeaders` only allowed standard headers (`Origin, Content-Type, Accept, Authorization, X-Requested-With, Cookie, X-Refresh-Token`), omitting `Idempotency-Key`. Because of this omission, the browser blocked the subsequent `POST` request.
* **Fix Applied:**
  Added `'Idempotency-Key'`, `'idempotency-key'`, `'X-Correlation-ID'`, `'x-correlation-id'`, and `'PayPal-Request-Id'` to `allowedHeaders` in `server/app.js`. Verified via live `curl OPTIONS` check that the server responds with `Access-Control-Allow-Headers: ...Idempotency-Key,idempotency-key...`.
* **Status:** ✅ Resolved.

### `ERR-011`: SRDV `TicketLCC` Rejection — "Invalid seat ssr data"
* **File:** `server/providers/srdv/srdv.client.js` & `server/modules/flights/flight.service.js`
* **Severity:** High
* **Symptom:**
  ```text
  Hi here is your res from SRDV ticketLLC:{"Error":{"ErrorCode":"2","ErrorMessage":"Invalid seat ssr data"},"BookingId":2620352}
  2026-11-02 17:26:22 [error]: SRDV adapter ticket LCC failed: SRDV [2]: Invalid seat ssr data
  ```
* **Root Cause:**
  1. In `server/providers/srdv/srdv.client.js` (`buildPassenger`), `passenger.Seat`, `passenger.Baggage`, and `passenger.MealDynamic` were initialized as empty arrays `[]` when no ancillaries were chosen. When serialized to JSON, sending `"Seat": []` triggers SRDV's SSR validator which expects either valid seat objects or the key to be omitted entirely.
  2. Additionally, in `server/modules/flights/flight.service.js`, the catch block for `TicketLCC` guarded the retry with `if (isAncillaryError && hasAncillaries)`. When the user had not selected seats (`hasAncillaries === false`), but SRDV threw `"Invalid seat ssr data"` due to `"Seat": []`, the retry logic was bypassed and threw an uncaught error.
* **Fix Applied:**
  1. In `server/providers/srdv/srdv.client.js`, modified `buildPassenger` so `passenger.Seat`, `passenger.Baggage`, and `passenger.MealDynamic` are only attached to the passenger object if the respective array contains at least 1 valid item (`length > 0`). When empty, the properties are omitted. Also enforced `IsBooked: false` on seat mappings.
  2. In `server/modules/flights/flight.service.js`, relaxed the catch block condition to `if (isAncillaryError)` so that any SSR/ancillary rejection automatically triggers a clean retry with all ancillary fields stripped.
* **Status:** ✅ Resolved.
