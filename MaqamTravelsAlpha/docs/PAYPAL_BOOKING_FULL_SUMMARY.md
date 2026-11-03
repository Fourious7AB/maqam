 # PayPal Booking Flow Full Summary

This document captures the current PayPal booking and payment implementation across the MaqamTravelsAlpha project. It covers the architecture, request flow, data model, webhook behavior, booking sync logic, environment requirements, and testing guidance.

---

## 1. Overview

The project implements a multi-gateway payment system with PayPal support for booking payments across:

- Flights
- Hotels
- Tours
- Packages

The current PayPal integration is implemented through the payment module and is wired into the main Express app.

Primary implementation files:

- [modules/payments/gateways/paypal/paypal.service.js](../modules/payments/gateways/paypal/paypal.service.js)
- [modules/payments/gateways/paypal/paypal.controller.js](../modules/payments/gateways/paypal/paypal.controller.js)
- [modules/payments/gateways/paypal/paypal.adapter.js](../modules/payments/gateways/paypal/paypal.adapter.js)
- [modules/payments/gateways/paypal/paypal.webhook.js](../modules/payments/gateways/paypal/paypal.webhook.js)
- [modules/payments/payment.routes.js](../modules/payments/payment.routes.js)
- [modules/payments/payment.model.js](../modules/payments/payment.model.js)
- [modules/payments/bookingSync.js](../modules/payments/bookingSync.js)
- [modules/payments/bookingResolver.js](../modules/payments/bookingResolver.js)
- [app.js](../app.js)

---

## 2. High-Level Architecture

### 2.1 Payment Module Responsibilities

The payment system is responsible for:

- Creating PayPal checkout orders
- Capturing approved orders
- Tracking payment records and statuses
- Updating booking confirmation state
- Handling webhook events from PayPal
- Logging payment activity and refunds
- Preventing duplicate or race-condition charges

### 2.2 Major Building Blocks

- Payment controller: handles HTTP requests for create/capture/status/refund
- Payment service: holds business logic and orchestration
- PayPal adapter: sends REST requests to PayPal
- Booking resolver: maps booking type to the relevant domain model
- Booking sync helper: updates domain bookings and master booking records
- Webhook handler: processes PayPal events and completes booking confirmation
- Payment model: stores payment state and gateway details

---

## 3. Supported Booking Types

The PayPal flow supports the following booking types:

| Booking Type | Model Used    | Confirmation Behavior                          |
| ------------ | ------------- | ---------------------------------------------- |
| flight       | FlightBooking | Status becomes confirmed                       |
| hotel        | HotelBooking  | Status becomes confirmed                       |
| tour         | Tour          | Status becomes booked                          |
| package      | Package       | Treated as paid/confirmed through payment flow |

The system also creates or updates a master booking record in the generic Booking model for reconciliation and reporting.

---

## 4. PayPal Booking Lifecycle

### Step 1: Create Order

A client sends a request to:

- POST /api/v1/payments/paypal/create-order

The server:

1. Authenticates the user
2. Validates request body
3. Resolves the booking via the booking resolver
4. Verifies booking ownership
5. Prevents duplicate payment for already paid bookings
6. Reuses any existing active pending payment if present
7. Determines the booking amount
8. Converts INR amount to USD if needed
9. Calls PayPal to create an order
10. Persists a Payment record in MongoDB
11. Returns the approval redirect URL to the client

### Step 2: Redirect to PayPal

The response contains a PayPal approval URL. The frontend redirects the user to PayPal.

### Step 3: Capture Payment

After approval, the client sends:

- POST /api/v1/payments/paypal/capture

The server:

1. Finds the payment by PayPal order ID
2. Validates the request
3. Uses a distributed lock to prevent duplicate capture races
4. Calls PayPal capture endpoint
5. Marks the payment as paid
6. Updates the related booking status
7. Creates or updates the master booking record
8. Logs audit entries

### Step 4: Webhook Completion

PayPal may send webhook events such as:

- PAYMENT.CAPTURE.COMPLETED
- PAYMENT.CAPTURE.DENIED
- PAYMENT.CAPTURE.FAILED
- PAYMENT.CAPTURE.REFUNDED

The webhook route handles these and finalizes the payment state.
---


## 5. API Endpoints

### 5.1 Create PayPal Order

- Method: POST
- Route: /api/v1/payments/paypal/create-order
- Auth: Required
- Idempotency: Required via Idempotency-Key header

Request body:

```json
{
  "bookingId": "<mongo_object_id>",
  "bookingType": "flight"
}
```

Allowed booking types:

- flight
- hotel
- tour
- package

Expected response:

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

### 5.2 Capture Approved Order

- Method: POST
- Route: /api/v1/payments/paypal/capture
- Auth: Required
- Idempotency: Required via Idempotency-Key header

Request body:

```json
{
  "orderId": "<paypal_order_id>"
}
```

Expected response:

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

### 5.3 Get Payment Status by Payment ID

- Method: GET
- Route: /api/v1/payments/paypal/:paymentId

### 5.4 Get Payment Status by PayPal Order ID

- Method: GET
- Route: /api/v1/payments/paypal/order/:orderId

### 5.5 Refund Payment

- Method: POST
- Route: /api/v1/payments/paypal/:paymentId/refund
- Restricted to finance/admin roles

---

## 6. Payment Data Model

The main payment record is stored in [modules/payments/payment.model.js](../modules/payments/payment.model.js).

### 6.1 Key Fields

- userId: owner of the payment record
- bookingId: reference to the original booking document
- bookingModel: dynamic model name such as FlightBooking, HotelBooking, Tour, Package, or Booking
- bookingType: booking category
- amount: local billing amount
- currency: payment currency used by the system
- paymentMethod: paypal
- gatewayData.orderId: PayPal order ID
- gatewayData.captureId: PayPal capture ID
- gatewayData.transactionId: normalized transaction ID
- gatewayData.raw: raw gateway payload
- status: current payment status
- refunds: partial/full refund history
- totalRefunded
- paidAt, verifiedAt, expiresAt
- correlationId

### 6.2 Supported Payment Statuses

The system uses the following statuses:

- created
- pending
- authorized
- captured
- paid
- partially_refunded
- refunded
- failed
- expired
- cancelled
- chargeback
- disputed

---

## 7. Booking Sync and Confirmation Logic

A critical part of the PayPal flow is booking confirmation.

The booking sync logic is implemented in [modules/payments/bookingSync.js](../modules/payments/bookingSync.js).

### 7.1 What Happens After Payment Capture

After a successful PayPal capture, the system:

- Updates the original booking status
- Updates the master Booking document
- Stores the payment reference on the booking
- Ensures the booking is marked as confirmed or booked depending on type

### 7.2 Booking Type Mapping

- Flights and hotels use confirmed
- Tours use booked
- Packages use confirmed through the shared payment flow

### 7.3 Master Booking Record

The system also creates or updates a generic Booking document with:

- userId
- bookingType
- itemId
- details
- status
- paymentId

This provides a unified booking record for reporting and reconciliation.

---

## 8. Booking Resolver

The dynamic booking resolver is implemented in [modules/payments/bookingResolver.js](../modules/payments/bookingResolver.js).

It maps a booking type to the appropriate model:

- flight -> FlightBooking
- hotel -> HotelBooking
- tour -> Tour
- package -> Package

It also normalizes the user reference so the service can validate ownership reliably.

---

## 9. PayPal Adapter and API Calls

The adapter in [modules/payments/gateways/paypal/paypal.adapter.js](../modules/payments/gateways/paypal/paypal.adapter.js) handles the direct PayPal REST calls.

### 9.1 PayPal Endpoints Used

- OAuth token: POST /v1/oauth2/token
- Create order: POST /v2/checkout/orders
- Capture order: POST /v2/checkout/orders/{order_id}/capture
- Refund capture: POST /v2/payments/captures/{capture_id}/refund
- Webhook signature verification: POST /v1/notifications/verify-webhook-signature

### 9.2 Important Adapter Behaviors

- Uses OAuth2 access tokens
- Retries order creation safely
- Stores approval links for client redirect
- Uses custom IDs and references for booking tracking
- Supports refund requests with partial/full amounts

---

## 10. Currency Handling

PayPal is configured to support checkout using USD in the current implementation.

### Currency Policy

- If the booking currency is INR, the service converts the booking amount using the configured conversion rate
- The converted amount is used for the PayPal order
- The original booking amount is preserved in the local Payment record

Configured via:

- PAYPAL_CONVERSION_RATE

Default conversion factor:

- 0.012

Example:

- Native booking amount: 1000 INR
- Converted PayPal amount: 12 USD

---

## 11. Security and Protection Mechanisms

The implementation uses several safety controls:

### 11.1 Authentication

Payment endpoints require authentication.

### 11.2 Validation

Incoming requests are validated by the payment validator before hitting the controller.

### 11.3 Idempotency

The payment routes use an Idempotency-Key header to prevent duplicate requests from causing duplicate charges or duplicate booking updates.

### 11.4 Distributed Locks

Capture operations use a lock keyed by PayPal order ID to prevent race conditions and double capture.

### 11.5 Ownership Checks

The service validates that the authenticated user is allowed to pay for the booking.

### 11.6 Webhook Verification

PayPal webhook requests are verified using the PayPal signature verification API.

---

## 12. Webhook Behavior

Webhook handling is implemented in [modules/payments/gateways/paypal/paypal.webhook.js](../modules/payments/gateways/paypal/paypal.webhook.js).

### 12.1 Route

The webhook is mounted at:

- /webhook/paypal/ipn

It is also mounted through the main app at:

- /webhook/paypal

### 12.2 Event Types Handled

- PAYMENT.CAPTURE.COMPLETED
- PAYMENT.CAPTURE.DENIED
- PAYMENT.CAPTURE.FAILED
- PAYMENT.CAPTURE.REFUNDED

### 12.3 Processing Behavior

- Verifies signature using PayPal endpoint
- Checks for duplicate events using WebhookEvent collection
- Uses a lock to serialize processing
- Reuses the same capture logic as the normal API flow
- Updates bookings and payment status

### 12.4 Important Note

The webhook logic includes a replay protection window. Stale webhook timestamps older than the configured threshold are rejected.

This can cause valid delayed webhooks to be skipped if the timestamp is too old.

---

## 13. Environment Variables

The PayPal integration depends on these environment variables:

```env
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
PAYPAL_WEBHOOK_ID=your_webhook_id
PAYPAL_CONVERSION_RATE=0.012
CLIENT_URL=http://localhost:3000
```

### Notes

- PAYPAL_MODE controls sandbox versus production endpoints
- PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required for PayPal OAuth authentication
- PAYPAL_WEBHOOK_ID is required for verifying webhook signatures
- PAYPAL_CONVERSION_RATE is used for INR to USD conversion
- CLIENT_URL is used for redirect URLs

---

## 14. Request and Response Example Flow

### Create Order Example

```bash
curl -X POST http://localhost:5000/api/v1/payments/paypal/create-order \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: paypal-create-order-001" \
  -d '{
    "bookingId": "<mongo_object_id>",
    "bookingType": "hotel"
  }'
```

### Capture Example

```bash
curl -X POST http://localhost:5000/api/v1/payments/paypal/capture \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: paypal-capture-001" \
  -d '{
    "orderId": "<paypal_order_id>"
  }'
```

---

## 15. Common Operational Notes

### 15.1 Duplicate Payment Protection

The service prevents:

- Double capture
- Repeated create-order requests for an already paid booking
- Multiple active pending payments for the same booking

### 15.2 Booking Confirmation

Once payment is successfully completed:

- The booking becomes confirmed or booked
- The master Booking document is created or updated
- The payment reference is stored on the booking

### 15.3 Refund Handling

Refunds are supported through the PayPal adapter and payment service. Refunds are tracked in the payment record and can be partial or full.

---

## 16. Known Implementation Considerations

- PayPal checkout uses a conversion layer for INR-based bookings
- PayPal webhooks are sensitive to timestamp freshness and stale requests may be rejected
- The system uses a generic master Booking document in addition to domain booking models
- The flow is designed to support flights, hotels, tours, and packages through a shared payment architecture

---

## 17. Quick Testing Checklist

Use this checklist when testing the PayPal booking flow:

1. Create a supported booking record
2. Ensure the user owns the booking
3. Call create-order with a valid Idempotency-Key
4. Verify a Payment record is created
5. Redirect to PayPal approval URL
6. Capture the payment after approval
7. Confirm the booking status changes
8. Verify the master Booking is updated
9. Test webhook handling for capture completed and failure events
10. Validate refund flow for fully or partially refunded payments

---

## 18. Summary

The current PayPal booking implementation is a production-oriented multi-step payment flow that integrates with the project’s booking modules, persists payment records, updates booking state, and processes webhook events. It is designed to support real-world booking scenarios with safeguards against duplicate charges, race conditions, and incomplete payment confirmation.
