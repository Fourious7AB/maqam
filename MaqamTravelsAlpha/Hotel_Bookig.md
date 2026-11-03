# Hotel Booking API Guide

This document explains the hotel booking flow in this project and gives the exact API endpoints, headers, request bodies, and expected response behavior for testing.

Base URL:

- Local: http://localhost:5000
- API prefix: /api/v1

## 1. Hotel booking flow in this project

The hotel booking flow is implemented in the hotel module and follows this sequence:

1. Authenticate the user.
2. Search hotels using /api/v1/hotels/search.
3. Fetch room options with /api/v1/hotels/:hotelId?searchId=... .
4. Recheck price and cancellation policy with /api/v1/hotels/recheck.
5. Create a booking with /api/v1/hotels/bookings.
6. Pay for the booking using the payment endpoints.
7. View or cancel the booking using the booking detail endpoints.

The backend stores the booking in MongoDB and uses Redis cache for the search/recheck state.

---

## 2. Common headers

Every authenticated request should include:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
x-correlation-id: <optional-uuid-or-string>
```

For booking/payment creation, you can also send:

```http
Idempotency-Key: <unique-string>
```

---

## 3. Authentication endpoints

### 3.1 Register user

Method: POST

Path:

```http
/api/v1/auth/register
```

Body:

```json
{
  "phone": "+919999999999",
  "password": "Test@1234",
  "firstName": "John",
  "lastName": "Doe"
}
```

Optional:

```json
{
  "avatar": "avatar-1"
}
```

### 3.2 Login user

Method: POST

Path:

```http
/api/v1/auth/login
```

Body:

```json
{
  "phone": "+919999999999",
  "password": "Test@1234"
}
```

Expected response includes an access token that you should use for hotel APIs.

---

## 4. Hotel endpoints

### 4.1 Search hotels

Method: POST

Path:

```http
/api/v1/hotels/search
```

Auth: No (public route)

Body:

```json
{
  "cityId": "DEL",
  "countryCode": "IN",
  "checkIn": "2026-08-01T00:00:00.000Z",
  "checkOut": "2026-08-03T00:00:00.000Z",
  "guestNationality": "IN",
  "currency": "INR",
  "rooms": [
    {
      "adults": 2,
      "children": 0,
      "childAges": []
    }
  ],
  "minRating": 3,
  "maxRating": 5
}
```

Required fields:

- cityId: required
- countryCode: 2-letter country code
- checkIn: ISO date string
- checkOut: ISO date string; must be after checkIn
- guestNationality: 2-letter country code
- rooms: array with at least one room
- rooms[].adults: integer between 1 and 8
- rooms[].children: optional integer between 0 and 6
- rooms[].childAges: optional array, must match child count

Response contains:

- searchId
- expiresInSeconds
- hotels[]

Example response:

```json
{
  "success": true,
  "message": "Hotels found",
  "data": {
    "searchId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "expiresInSeconds": 900,
    "hotels": [
      {
        "hotelCode": "1001",
        "hotelName": "Sample Hotel",
        "fromPrice": {
          "amountMinor": 250000,
          "currency": "INR"
        }
      }
    ]
  }
}
```

---

### 4.2 Get hotel details and room options

Method: GET

Path:

```http
/api/v1/hotels/:hotelId?searchId=<searchId>
```

Auth: No

Example:

```http
GET /api/v1/hotels/1001?searchId=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Required query param:

- searchId: UUID returned from hotel search

No body is required.

Response includes hotel detail and room options.

---

### 4.3 Recheck selected rooms

Method: POST

Path:

```http
/api/v1/hotels/recheck
```

Auth: No

Body:

```json
{
  "searchId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "hotelId": "1001",
  "selectedRooms": [
    {
      "roomId": "0",
      "quantity": 1
    }
  ]
}
```

Required fields:

- searchId: UUID from hotel search
- hotelId: hotel code returned by search
- selectedRooms: array of selected room options
- selectedRooms[].roomId: room ID from hotel details response
- selectedRooms[].quantity: optional, default 1

Response includes:

- recheckId
- price
- cancellationPolicy
- roomSnapshots

Example:

```json
{
  "success": true,
  "message": "Hotel room rechecked",
  "data": {
    "recheckId": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
    "expiresInSeconds": 600,
    "priceChanged": false,
    "policyChanged": false,
    "price": {
      "currency": "INR",
      "total": 1250
    }
  }
}
```

---

### 4.4 Create hotel booking

Method: POST

Path:

```http
/api/v1/hotels/bookings
```

Auth: Required

Headers:

```http
Authorization: Bearer <accessToken>
Idempotency-Key: <unique-string>
```

Body:

```json
{
  "recheckId": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
  "acceptChanges": true,
  "guests": [
    {
      "title": "Mr",
      "firstName": "John",
      "lastName": "Doe",
      "type": "adult",
      "email": "john@example.com",
      "phone": "+919999999999"
    }
  ]
}
```

Required fields:

- recheckId: UUID returned by recheck
- guests: array with at least one guest
- guests[].title: required string
- guests[].firstName: required string
- guests[].lastName: required string
- guests[].type: must be adult or child
- guests[].email: optional valid email
- guests[].phone: optional string

Optional:

- acceptChanges: boolean; required if price/policy changed during recheck

Response:

- Booking is created with status awaiting_payment

Example:

```json
{
  "success": true,
  "message": "Hotel booking is awaiting payment",
  "data": {
    "_id": "64f2...",
    "status": "awaiting_payment",
    "totalPrice": 1250,
    "currency": "INR"
  }
}
```

---

### 4.5 Get my bookings

Method: GET

Path:

```http
/api/v1/hotels/bookings/me?page=1&limit=20
```

Auth: Required

No body required.

Query params:

- page: optional integer, default 1
- limit: optional integer, default 20

---

### 4.6 Get booking details

Method: GET

Path:

```http
/api/v1/hotels/bookings/:id
```

Auth: Required

No body required.

Example:

```http
GET /api/v1/hotels/bookings/64f2...
```

---

### 4.7 Cancel booking

Method: POST

Path:

```http
/api/v1/hotels/bookings/:id/cancel
```

Auth: Required

No body required.

---

## 5. Payment endpoints (required to complete booking)

After the booking is created, you should create a payment order and verify it.

### 5.1 Create Razorpay order

Method: POST

Path:

```http
/api/v1/payments/razorpay/create-order
```

Auth: Required

Body:

```json
{
  "bookingId": "64f2...",
  "bookingType": "hotel"
}
```

### 5.2 Verify Razorpay payment

Method: POST

Path:

```http
/api/v1/payments/razorpay/verify
```

Auth: Required

Body:

```json
{
  "orderId": "order_123",
  "paymentId": "pay_123",
  "signature": "signature_here"
}
```

### 5.3 PayPal order creation

Method: POST

Path:

```http
/api/v1/payments/paypal/create-order
```

Body:

```json
{
  "bookingId": "64f2...",
  "bookingType": "hotel"
}
```

### 5.4 Capture PayPal payment

Method: POST

Path:

```http
/api/v1/payments/paypal/capture
```

Body:

```json
{
  "orderId": "paypal-order-id"
}
```

### 5.5 PhonePe order creation

Method: POST

Path:

```http
/api/v1/payments/phonepe/create-order
```

Body:

```json
{
  "bookingId": "64f2...",
  "bookingType": "hotel",
  "phoneNumber": "+919999999999"
}
```

---

## 6. Booking status values

The hotel booking model supports these statuses:

- awaiting_payment
- payment_received
- confirming_provider
- confirmed
- provider_pending
- provider_failed
- cancellation_requested
- cancelled
- payment_failed
- refund_pending
- refunded
- completed

---

## 7. Common error cases

- 400: invalid input, invalid hotel ID, invalid room selection
- 401: missing or invalid access token
- 404: booking or payment not found
- 409: price or cancellation policy changed and acceptChanges was not sent
- 410: search or recheck expired

---

## 8. Example full test flow with curl

### Step 1: login

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919999999999",
    "password": "Test@1234"
  }'
```

### Step 2: search hotels

```bash
curl -X POST http://localhost:5000/api/v1/hotels/search \
  -H "Content-Type: application/json" \
  -d '{
    "cityId": "DEL",
    "countryCode": "IN",
    "checkIn": "2026-08-01T00:00:00.000Z",
    "checkOut": "2026-08-03T00:00:00.000Z",
    "guestNationality": "IN",
    "currency": "INR",
    "rooms": [{"adults": 2, "children": 0, "childAges": []}]
  }'
```

### Step 3: get hotel details

```bash
curl "http://localhost:5000/api/v1/hotels/1001?searchId=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Step 4: recheck rooms

```bash
curl -X POST http://localhost:5000/api/v1/hotels/recheck \
  -H "Content-Type: application/json" \
  -d '{
    "searchId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "hotelId": "1001",
    "selectedRooms": [{"roomId": "0", "quantity": 1}]
  }'
```

### Step 5: create booking

```bash
curl -X POST http://localhost:5000/api/v1/hotels/bookings \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: hotel-booking-001" \
  -d '{
    "recheckId": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
    "acceptChanges": true,
    "guests": [{
      "title": "Mr",
      "firstName": "John",
      "lastName": "Doe",
      "type": "adult",
      "email": "john@example.com",
      "phone": "+919999999999"
    }]
  }'
```

---

## 9. Recommended testing order

1. Register or login.
2. Search hotels.
3. Open a hotel and inspect room options.
4. Recheck room selection.
5. Create a booking.
6. Create a payment order.
7. Verify payment.
8. Retrieve booking details.

If you want, I can also create a Postman collection JSON file next so you can import the hotel booking APIs directly into Postman.
