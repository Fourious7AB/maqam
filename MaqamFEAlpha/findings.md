# Findings: Root Cause Analysis of PayPal 400 & SRDV Booking Redirect

## Executive Summary
Two distinct, compounding issues in the frontend cause both errors:

1. **SRDV Booking Routing to `/api/v1/offers/3887816/book` (400 Bad Request: "Invalid _id: 3887816")**:
   - The user intended to book a live SRDV flight (`resultIndex: 3887816`).
   - The frontend's `FareQuoteDetails.jsx` and `TravellerDetails.jsx` incorrectly coerced `isOffer = true` because `cachedBooking` or `flight_booking_form_draft` in `sessionStorage` contained residual offer flags from a previous session or draft.
   - Crucially, `TravellerDetails.jsx` lacked an `ObjectId` validation guard (`/^[0-9a-fA-F]{24}$/`). It treated the numeric SRDV supplier ID `3887816` as an offer ID and called `POST /api/v1/offers/3887816/book`.
   - The backend offer endpoint strictly validates that `:id` is a 24-character hexadecimal MongoDB ObjectId, rejecting `3887816` with HTTP 400 (`Invalid _id: 3887816`).

2. **PayPal Order Creation `POST /api/v1/payments/paypal/create-order` (400 Bad Request)**:
   - When tested against the active backend server (`http://localhost:5000`, running from `Maqam-Frontend/MaqamTravelsAlpha`), the `validateCreatePayPalOrder` middleware enforces:
     1. **Required Header**: `Idempotency-Key` (Trimmed, non-empty, 1-128 characters). If missing, backend returns:
        `"Idempotency-Key header is required for safe retries"` (HTTP 400).
     2. **Required Body Field**: `bookingId` must be a valid 24-character hex MongoDB ObjectId (`.isMongoId()`). If a supplier numeric ID (`3887816`) or invalid string is passed, backend returns:
        `"Valid booking ID is required"` (HTTP 400).
   - In `src/services/paymentService.js`, `createPayPalOrder` was previously sending `idempotencyKey` only in the request body JSON, without attaching the `"Idempotency-Key"` HTTP header in `headers: { ... }`.
   - Because `bookingId` was either invalid or the reservation hadn't completed to yield a MongoDB `ObjectId`, `createPayPalOrder` was doomed to fail with 400.

---

## 2. Swagger Specification vs Actual Code Reality

### Swagger Endpoint at `http://192.168.1.100:5000/api/docs/`
- **SRDV Flight Booking (`POST /api/v1/flights/book`)**:
  - Swagger Path: `/api/v1/flights/book`
  - Security: `BearerAuth` (JWT Token)
  - Headers: `Authorization: Bearer <token>`
  - Request Body:
    ```json
    {
      "traceId": "1734567890123",
      "resultIndex": "3887816",
      "passengers": [
        {
          "isLeadPax": true,
          "saveToProfile": false,
          "travellerDetails": {
            "title": "Mr",
            "firstName": "Ahmed",
            "lastName": "Khan",
            "passengerType": "Adult",
            "gender": "Male",
            "dateOfBirth": "1992-08-15",
            "email": "ahmed@example.com",
            "phone": "9876543210",
            "cellCountryCode": "+91"
          }
        }
      ]
    }
    ```
  - Response (201 Created):
    ```json
    {
      "success": true,
      "message": "Booking initiated, proceed to payment",
      "data": {
        "bookingId": "65f0b5c2d2b6e3b4c5d6e7f8", // 24-hex Mongo ObjectId
        "pnr": "6E-XYZ123",
        "srdvBookingId": 3887816,
        "isLCC": true,
        "status": "confirmed",
        "amount": 4500
      }
    }
    ```

- **Offer Booking (`POST /api/v1/offers/{id}/book`)**:
  - Swagger Path: `/api/v1/offers/{id}/book`
  - Parameter `{id}`: Must be a 24-hex MongoDB `ObjectId`.
  - Body: `{ quantity: 1, travellers: [...] }`
  - If called with `3887816`, backend rejects with `Invalid _id: 3887816`.

- **PayPal Create Order (`POST /api/v1/payments/paypal/create-order`)**:
  - Note: Swagger `/api/docs/` omits `@openapi` comments for payment routes, but the active backend validator (`modules/payments/payment.validator.js`) strictly defines the contract:
    - **Header**: `Idempotency-Key` (required string, 1-128 chars)
    - **Body**:
      ```json
      {
        "bookingId": "65f0b5c2d2b6e3b4c5d6e7f8", // MUST be 24-hex Mongo ObjectId
        "bookingType": "flight" // or "hotel", "package", "offer"
      }
      ```
    - **Response**: `{ success: true, orderId: "PAYPAL_ORDER_ID", approveUrl: "https://www.sandbox.paypal.com/checkoutnow?token=..." }`

---

## 3. Reproduction Test Results on Live Server (`http://localhost:5000`)

| Test Case | Request Payload / Headers | Result |
|-----------|---------------------------|--------|
| `POST /api/v1/offers/3887816/book` | Valid JWT, body with travellers | **HTTP 400** `{"success":false,"message":"Invalid _id: 3887816"}` |
| `POST /api/v1/payments/paypal/create-order` | No `Idempotency-Key` header, `bookingId: "3887816"` | **HTTP 400** `{"field":"idempotency-key","message":"Idempotency-Key header is required"}` & `{"field":"bookingId","message":"Valid booking ID is required"}` |
| `POST /api/v1/payments/paypal/create-order` | With `Idempotency-Key` header, `bookingId: "3887816"` | **HTTP 400** `{"field":"bookingId","message":"Valid booking ID is required"}` |
| `POST /api/v1/payments/paypal/create-order` | With `Idempotency-Key` header, `bookingId: "65f0b5c2d2b6e3b4c5d6e7f8"` | **Validation Passed** (Proceeded to MongoDB lookup) |
