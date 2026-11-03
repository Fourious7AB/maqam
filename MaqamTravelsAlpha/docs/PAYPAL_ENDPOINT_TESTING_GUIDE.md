# PayPal Integration Endpoint Testing Guide

This document summarizes the PayPal integration points implemented in the codebase and the data you need to verify when testing the endpoints.

## 1. Implementation Summary

The PayPal gateway is implemented across the following files:

- [modules/payments/gateways/paypal/paypal.controller.js](../modules/payments/gateways/paypal/paypal.controller.js) — HTTP handlers for create, capture, status, refund
- [modules/payments/gateways/paypal/paypal.service.js](../modules/payments/gateways/paypal/paypal.service.js) — business logic, payment state updates, booking confirmation
- [modules/payments/gateways/paypal/paypal.adapter.js](../modules/payments/gateways/paypal/paypal.adapter.js) — direct PayPal REST API calls
- [modules/payments/gateways/paypal/paypal.webhook.js](../modules/payments/gateways/paypal/paypal.webhook.js) — webhook verification and event processing
- [modules/payments/payment.routes.js](../modules/payments/payment.routes.js) — route wiring
- [modules/payments/payment.validator.js](../modules/payments/payment.validator.js) — request validation rules
- [app.js](../app.js) — mounts webhook route at /webhook/paypal

## 2. Base URL

- Local API base: http://localhost:5000/api/v1/payments
- Webhook base: http://localhost:5000/webhook/paypal
- If running behind another host, replace accordingly.

## 3. Required Environment Variables

Ensure these are present before testing:

```env
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
PAYPAL_WEBHOOK_ID=your_webhook_id
PAYPAL_CONVERSION_RATE=0.012
CLIENT_URL=http://localhost:3000
```

### Notes

- `PAYPAL_MODE` controls whether requests use sandbox or production endpoints.
- `PAYPAL_WEBHOOK_ID` is required for webhook signature verification.
- `PAYPAL_CONVERSION_RATE` is used when converting INR bookings to USD for PayPal checkout.
- `CLIENT_URL` is used for PayPal return and cancel URLs.

## 4. PayPal REST API Endpoints Used by the App

The adapter uses these PayPal API endpoints:

- OAuth token: `POST /v1/oauth2/token`
- Create order: `POST /v2/checkout/orders`
- Capture order: `POST /v2/checkout/orders/{order_id}/capture`
- Refund capture: `POST /v2/payments/captures/{capture_id}/refund`
- Webhook signature verification: `POST /v1/notifications/verify-webhook-signature`

## 5. Application Endpoints to Test

### 5.1 Create PayPal Order

- Method: `POST`
- Path: `/api/v1/payments/paypal/create-order`
- Auth: Required
- Rate limit: Enabled
- Idempotency: Required via `Idempotency-Key` header

#### Required headers

```http
Authorization: Bearer <jwt>
Content-Type: application/json
Idempotency-Key: <unique-string>
```

#### Request body

```json
{
  "bookingId": "<mongo_id>",
  "bookingType": "flight"
}
```

#### Allowed values for `bookingType`

- `flight`
- `hotel`
- `tour`
- `package`

#### Validation rules

- `bookingId` must be a valid MongoDB ObjectId
- `bookingType` must be one of the supported values above

#### Expected behavior

- Resolves the booking using the booking resolver
- Verifies that the authenticated user owns the booking
- Prevents duplicate charges for already paid bookings
- Reuses an active pending payment if one exists
- Converts INR to USD before creating the PayPal order
- Creates a payment record and returns a PayPal approval redirect URL

#### Success response shape

```json
{
  "success": true,
  "message": "PayPal order created successfully",
  "data": {
    "paymentId": "<payment_id>",
    "paypalOrderId": "<paypal_order_id>",
    "amount": 1000,
    "currency": "INR",
    "bookingId": "<booking_id>",
    "bookingType": "flight",
    "redirectUrl": "<paypal_approval_url>"
  }
}
```

#### Example curl

```bash
curl -X POST http://localhost:3000/api/v1/payments/paypal/create-order \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: paypal-create-order-001" \
  -d '{
    "bookingId": "<mongo_id>",
    "bookingType": "flight"
  }'
```

---

### 5.2 Capture Approved PayPal Order

- Method: `POST`
- Path: `/api/v1/payments/paypal/capture`
- Auth: Required
- Rate limit: Enabled
- Idempotency: Required via `Idempotency-Key` header

#### Required headers

```http
Authorization: Bearer <jwt>
Content-Type: application/json
Idempotency-Key: <unique-string>
```

#### Request body

```json
{
  "orderId": "<paypal_order_id>"
}
```

#### Expected behavior

- Finds the payment record by PayPal order ID
- Prevents double capture via lock + payment state checks
- Calls PayPal capture API
- Updates payment status to `paid`
- Updates the related booking to confirmed status
- Returns capture details

#### Success response shape

```json
{
  "success": true,
  "message": "PayPal payment captured and processed successfully",
  "data": {
    "paymentId": "<payment_id>",
    "paypalCaptureId": "<paypal_capture_id>",
    "status": "paid"
  }
}
```

#### Example curl

```bash
curl -X POST http://localhost:3000/api/v1/payments/paypal/capture \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: paypal-capture-001" \
  -d '{
    "orderId": "<paypal_order_id>"
  }'
```

---

### 5.3 Get Payment Status

- Method: `GET`
- Path: `/api/v1/payments/paypal/:paymentId`
- Auth: Required

#### Required headers

```http
Authorization: Bearer <jwt>
```

#### Expected behavior

- Returns payment details if the user owns the payment or is an admin/super admin

#### Response shape

```json
{
  "success": true,
  "message": "Payment details retrieved successfully",
  "data": {
    "paymentId": "<payment_id>",
    "paypalOrderId": "<paypal_order_id>",
    "paypalCaptureId": "<paypal_capture_id>",
    "amount": 1000,
    "currency": "INR",
    "status": "paid",
    "refunds": [],
    "totalRefunded": 0,
    "verifiedAt": "<date>",
    "paidAt": "<date>",
    "createdAt": "<date>"
  }
}
```

#### Example curl

```bash
curl -X GET http://localhost:3000/api/v1/payments/paypal/<payment_id> \
  -H "Authorization: Bearer <jwt>"
```

---

### 5.4 Refund Payment

- Method: `POST`
- Path: `/api/v1/payments/paypal/:paymentId/refund`
- Auth: Required
- Roles allowed: `finance`, `admin`, `super_admin`

#### Required headers

```http
Authorization: Bearer <jwt>
Content-Type: application/json
```

#### Request body

```json
{
  "amount": 10.5,
  "reason": "Booking cancelled"
}
```

#### Notes

- `amount` is optional; if omitted, the refund defaults to the full remaining refundable amount.
- `reason` is optional.

#### Example curl

```bash
curl -X POST http://localhost:3000/api/v1/payments/paypal/<payment_id>/refund \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10.5,
    "reason": "Booking cancelled"
  }'
```

---

## 6. Webhook Endpoint to Test

### 6.1 Receive PayPal Webhooks

- Method: `POST`
- Path: `/webhook/paypal/ipn`
- Auth: Not required
- Purpose: Receives PayPal webhook events after capture or refund events

#### Required headers from PayPal

PayPal sends these headers for webhook verification:

```http
paypal-auth-algo: <algo>
paypal-cert-url: <url>
paypal-transmission-id: <id>
paypal-transmission-sig: <sig>
paypal-transmission-time: <timestamp>
```

#### Expected behavior

- Verifies webhook signature using PayPal’s verification endpoint
- Rejects stale or invalid payloads
- Stores the event in the webhook event collection
- Processes supported events:
  - `PAYMENT.CAPTURE.COMPLETED`
  - `PAYMENT.CAPTURE.DENIED`
  - `PAYMENT.CAPTURE.FAILED`
  - `PAYMENT.CAPTURE.REFUNDED`

#### Example webhook payload

```json
{
  "id": "evt_123",
  "event_type": "PAYMENT.CAPTURE.COMPLETED",
  "resource": {
    "id": "capture_123",
    "status": "COMPLETED",
    "supplementary_data": {
      "related_ids": {
        "order_id": "<paypal_order_id>"
      }
    },
    "custom_id": "<booking_id>"
  }
}
```

## 7. Payment State Handling

The system uses the following payment statuses:

- `created`
- `pending`
- `authorized`
- `captured`
- `paid`
- `partially_refunded`
- `refunded`
- `failed`
- `expired`
- `cancelled`

## 8. Important Integration Notes

- The current implementation creates PayPal orders using the `CAPTURE` intent.
- For INR bookings, the system converts the amount to USD before creating the PayPal order.
- The service uses locking and idempotency-aware logic to reduce duplicate capture and race-condition issues.
- The app is expected to handle PayPal return/cancel URLs through the configured `CLIENT_URL`.
- Webhook events must be verified before processing to avoid spoofed requests.

## 9. Quick Validation Checklist

Use this checklist while testing:

- [ ] PayPal credentials are configured correctly
- [ ] PayPal sandbox mode is active
- [ ] Webhook ID is available
- [ ] A valid booking exists for the authenticated user
- [ ] The booking is not already marked paid
- [ ] The create-order endpoint returns an approval URL
- [ ] The capture endpoint marks the payment as `paid`
- [ ] The booking becomes confirmed after capture
- [ ] The webhook endpoint accepts and processes events correctly
- [ ] Refund flow works for finance/admin accounts

## 10. Thunder Client Flow

### Step 1 — Seed test data

Run this once in the project root:

```bash
npm run seed
```

This creates:

- test user: `customer@example.com` / `TestPass123!`
- sample flight, hotel, and tour data

### Step 2 — Start the backend

```bash
npm start
```

The API should be available at:

- `http://localhost:5000/api/v1/...`

### Step 3 — Login

Create a request in Thunder Client:

- Method: `POST`
- URL: `http://localhost:5000/api/v1/auth/login`
- Body:

```json
{
  "phone": "8294507785",
  "password": "TestPass123!"
}
```

Copy the `accessToken` from the response.

### Step 4 — Create a booking

Use the token from step 3.

- Method: `POST`
- URL: `http://localhost:5000/api/v1/bookings`
- Headers:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

- Body:

```json
{
  "bookingType": "flight",
  "itemId": "<flight_id_or_any_valid_mongo_id>",
  "details": {
    "destination": "Mumbai",
    "departureDate": "2024-12-25T00:00:00.000Z",
    "returnDate": "2024-12-26T00:00:00.000Z",
    "totalPrice": 5000,
    "currency": "INR",
    "passengers": 1
  }
}
```

> If you want to use a seeded flight instead of a generic Mongo ID, first query the flights collection or use the admin/seeded data available in your database.

### Step 5 — Create PayPal order

- Method: `POST`
- URL: `http://localhost:5000/api/v1/payments/paypal/create-order`

- Headers:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
Idempotency-Key: paypal-create-order-001
```

- Body:

```json
{
  "bookingId": "<booking_id_from_step_4>",
  "bookingType": "flight"
}
```

You should receive a `redirectUrl` that points to PayPal approval.

> Important: You must open the `redirectUrl`, sign in with a PayPal sandbox buyer account, and approve the payment before calling the capture endpoint. A `422` is expected if the order has not been approved yet.

### Step 6 — Capture the PayPal payment

After approving the PayPal payment in the browser, call:

- Method: `POST`
- URL: `http://localhost:5000/api/v1/payments/paypal/capture`
- Headers:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
Idempotency-Key: paypal-capture-001
```

> Note: If the previous capture request failed, use a new unique `Idempotency-Key` instead of reusing the same one. The middleware caches non-server responses, so reusing the same key may return `409 Conflict` for different payloads.

- Body:

```json
{
  "orderId": "<paypal_order_id_from_step_5>"
}
```

### Step 7 — Verify payment status

- Method: `GET`
- URL: `http://localhost:5000/api/v1/payments/paypal/<payment_id>`
- Headers:

```http
Authorization: Bearer <accessToken>
```

## 11. PayPal Webhook Dashboard

If you want to see webhook events in the PayPal sandbox dashboard, do the following:

1. Open https://developer.paypal.com and sign in to your Sandbox business account.
2. Go to `Apps & Credentials` and select your sandbox app.
3. Under `Webhooks`, add or verify a webhook URL that points to your app, for example:

```text
http://<your-public-url>/webhook/paypal/ipn
```

If you are running locally, expose your server using a tunnel service like ngrok, then use the forwarded URL:

```bash
ngrok http 5000
```

And set the webhook URL to:

```text
https://<your-ngrok-id>.ngrok.io/webhook/paypal/ipn
```

4. Copy the PayPal Webhook ID and set `PAYPAL_WEBHOOK_ID` in `.env`.
5. Trigger a payment capture, then check the PayPal dashboard under `Event Logs` → `Webhook Events`.

### Why you may see no webhook events

- No webhook is configured for your sandbox app.
- Your sandbox webhook URL is invalid or not reachable from PayPal.
- `PAYPAL_WEBHOOK_ID` is not set in `.env`, so the app will reject webhook verification.
- Events only appear after a successful delivery attempt.

### Quick validation

- Use `developer.paypal.com` → `Webhook Events` to inspect logs.
- Use `developer.paypal.com` → `Apps & Credentials` → `Webhooks` to view configured webhooks.
- If using ngrok, make sure the tunnel is running before sending PayPal events.

## 12. Useful Verification Script

The repository already includes a helper script:

- [verify-paypal-config.js](../verify-paypal-config.js)

Run it with:

```bash
node verify-paypal-config.js
```

This validates the credential configuration and tests the PayPal authentication flow.
