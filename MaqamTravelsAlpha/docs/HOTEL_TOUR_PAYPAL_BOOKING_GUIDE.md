# Hotel & Tour PayPal Booking Guide

This guide describes the hotel and tour PayPal booking flow for the current codebase.
It uses the actual model fields found in `modules/hotels/hotel.model.js`, `modules/tours/tour.model.js`, and the PayPal service implementation.

---

## 1. High-level flow

1. Create or use an existing hotel or tour domain booking record.
2. Call PayPal order creation with the domain booking ID and bookingType.
3. Receive PayPal approval redirect URL.
4. Approve the payment in the PayPal sandbox.
5. Capture the order using PayPal capture endpoint.
6. Verify payment status.

---

## 2. Model field reference

### 2.1 Hotel booking model

From `modules/hotels/hotel.model.js`:

- `_id`
- `userId`
- `srdvHotelId`
- `hotelName`
- `destination`
- `checkIn`
- `checkOut`
- `roomType`
- `pricePerNight`
- `totalNights`
- `totalPrice`
- `currency`
- `status`
- `srdvBookingRef`
- `guestName`
- `guestEmail`
- `guestPhone`
- `specialRequests`
- `cancellationPolicy`
- `paymentId`

### 2.2 Tour model

From `modules/tours/tour.model.js`:

- `_id`
- `userId`
- `title`
- `destination`
- `startDate`
- `endDate`
- `duration`
- `budget`
- `currency`
- `itinerary`
- `accommodationType`
- `meals`
- `specialRequests`
- `transportationPreference`
- `status`
- `submittedAt`
- `assignedAgentId`
- `quotedPrice`
- `quotedAt`
- `quotedExpiresAt`
- `bookingId`
- `cancelledAt`
- `cancellationReason`

### 2.3 Master booking model

From `modules/bookings/booking.model.js`:

- `_id`
- `userId`
- `bookingType`
- `itemId`
- `details`
  - `destination`
  - `departureDate`
  - `returnDate`
  - `totalPrice`
  - `currency`
  - `passengers`
- `status`
- `cancelledAt`
- `cancellationReason`
- `refundAmount`
- `paymentId`

Note: The system maintains both domain booking records (HotelBooking, FlightBooking, Tour, Package) and a lightweight master `Booking` record. Recent changes add an automatic reconciliation step during payment capture: if a master `Booking` does not exist for a captured payment, the service will create one and populate `details` (destination, totalPrice, currency, dates, passengers) to keep a canonical, gateway-agnostic booking record.

---

## 3. PayPal booking rules for hotel and tour

### 3.1 Booking ID and bookingType

The PayPal create-order endpoint expects:

- `bookingId`: the domain booking record ID
- `bookingType`: one of `flight`, `hotel`, `tour`, `package`

For hotel PayPal checkout, `bookingType` must be `hotel` and `bookingId` should be the HotelBooking `_id`.
For tour PayPal checkout, `bookingType` must be `tour` and `bookingId` should be the Tour `_id`.

Important: the current implementation resolves the booking using the domain model mapping (see `modules/payments/bookingResolver.js`). Payment flows resolve the correct domain model first (FlightBooking, HotelBooking, Tour, Package) and use that record to derive amount and customer details. A master `Booking` is then created/updated later as part of reconciliation.

### 3.2 Amount source

The PayPal service (and other gateway services) use a shared amount resolver (`modules/payments/bookingSync.js`) which maps booking types to the most appropriate native amount fields:

- `hotel` → `booking.totalPrice` or `booking.details?.totalPrice`
- `tour` → `booking.budget` or `booking.quotedPrice` or `booking.totalPrice`
- `flight` → `booking.totalAmount` or `booking.details?.totalPrice`
- `package` → `booking.price` or `booking.totalPrice` or `booking.details?.price`

If the resolved native amount is <= 0 the service rejects the checkout with `Invalid booking amount` — make sure domain bookings contain the expected price fields.

If your hotel or tour payment is failing with `Invalid booking amount`, you must ensure the order creation uses the correct field or the service is updated accordingly.

### 3.3 Currency handling

- If the booking currency is `INR`, the service converts the amount to USD using `PAYPAL_CONVERSION_RATE`.
- PayPal transaction currency is therefore `USD` for INR bookings.
- The saved payment record still retains the native amount and currency in `amount` and `currency`.

Gateway notes:

- PayPal: INR amounts are converted to USD for checkout using `PAYPAL_CONVERSION_RATE`. The local payment record retains the native amount and records the currency used for the gateway.
- Razorpay / PhonePe: these gateways operate in INR and use the native booking amount directly. The services now populate fallback customer details (name/email/phone) from `booking.user`, `booking.userId`, or guest fields to support guest/anonymous bookings.

---

## 4. PayPal endpoints

### 4.1 Create PayPal order

- Method: `POST`
- URL: `/api/v1/payments/paypal/create-order`
- Auth: required
- Headers:
  - `Authorization: Bearer <jwt>`
  - `Content-Type: application/json`
  - `Idempotency-Key: <unique-string>`

#### Body example for hotel

```json
{
  "bookingId": "<hotelBooking_id>",
  "bookingType": "hotel"
}
```

#### Body example for tour

```json
{
  "bookingId": "<tour_id>",
  "bookingType": "tour"
}
```

#### Success response shape

```json
{
  "success": true,
  "message": "PayPal order created successfully",
  "data": {
    "paymentId": "<payment_id>",
    "paypalOrderId": "<paypal_order_id>",
    "amount": 30000,
    "currency": "USD",
    "bookingId": "<booking_id>",
    "bookingType": "hotel",
    "redirectUrl": "<paypal_approval_url>"
  }
}
```

> If `redirectUrl` is empty, the service may be returning an existing pending payment record without the stored approval link.

Note about pending payments and idempotency:

- The payment services prevent duplicate concurrent checkouts by reusing an active pending payment record if it exists. Recent changes scope this reuse per gateway to avoid cross-gateway collisions — i.e., PayPal reuses only PayPal-created pending payments, Razorpay reuses only Razorpay-created pending payments.

---

### 4.2 Capture PayPal order

- Method: `POST`
- URL: `/api/v1/payments/paypal/capture`
- Auth: required
- Headers:
  - `Authorization: Bearer <jwt>`
  - `Content-Type: application/json`
  - `Idempotency-Key: <unique-string>`

#### Body

```json
{
  "orderId": "<paypal_order_id>"
}
```

#### Success response

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

---

### 4.3 Get PayPal payment status

- Method: `GET`
- URL: `/api/v1/payments/paypal/:paymentId`
- Auth: required

---

### 4.4 Refund PayPal payment

- Method: `POST`
- URL: `/api/v1/payments/paypal/:paymentId/refund`
- Auth: required
- Roles allowed: `finance`, `admin`, `super_admin`

#### Refund Request Body

```json
{
  "amount": 10.5,
  "reason": "Booking cancelled"
}
```

---

### 4.5 Webhook endpoint

- Method: `POST`
- URL: `/webhook/paypal/ipn`
- Auth: not required

#### Notes

- Ensure PayPal webhook is configured to this exact URL.
- The webhook verifies `PAYPAL_WEBHOOK_ID`.
- Supported events: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.FAILED`, `PAYMENT.CAPTURE.REFUNDED`.

---

## 5. Booking endpoints

### 5.1 Create master booking record

- Method: `POST`
- URL: `/api/v1/bookings`
- Auth: required

#### Master Booking Body

```json
{
  "bookingType": "hotel",
  "itemId": "<hotelBooking_id>",
  "details": {
    "destination": "Mumbai",
    "totalPrice": 30000,
    "currency": "INR"
  }
}
```

#### Master Booking Notes

- `itemId` should reference the specific hotel/tour domain booking record.
- This route creates a generic master booking record, but PayPal order creation currently resolves directly from the domain booking model.

---

### 5.2 Get booking details

- Method: `GET`
- URL: `/api/v1/bookings/:bookingId`
- Auth: required

---

### 5.3 Update booking

- Method: `PUT`
- URL: `/api/v1/bookings/:bookingId`
- Auth: required

#### Body example

```json
{
  "status": "confirmed"
}
```

---

### 5.4 Cancel booking

- Method: `POST`
- URL: `/api/v1/bookings/:bookingId/cancel`
- Auth: required

---

## 6. Tour endpoints

### 6.1 Create tour

- Method: `POST`
- URL: `/api/v1/tours`
- Auth: required

#### Tour Body

```json
{
  "title": "Mumbai Highlights Package",
  "destination": "Mumbai",
  "startDate": "2024-12-25T00:00:00.000Z",
  "endDate": "2024-12-28T00:00:00.000Z",
  "duration": 3,
  "budget": 25000,
  "currency": "INR",
  "itinerary": [
    {
      "day": 1,
      "activity": "Arrive in Mumbai",
      "notes": "Check-in and evening at Marine Drive"
    },
    {
      "day": 2,
      "activity": "City tour",
      "notes": "Gateway of India and local markets"
    },
    {
      "day": 3,
      "activity": "Cultural day",
      "notes": "Elephanta Caves and departure"
    }
  ],
  "accommodationType": "Hotel",
  "meals": "Breakfast included",
  "specialRequests": "Vegetarian meals",
  "transportationPreference": "Private car"
}
```

### 6.2 Get tour details

- Method: `GET`
- URL: `/api/v1/tours/:tourId`
- Auth: required

### 6.3 Update tour

- Method: `PUT`
- URL: `/api/v1/tours/:tourId`
- Auth: required

### 6.4 Submit tour

- Method: `POST`
- URL: `/api/v1/tours/:tourId/submit`
- Auth: required

### 6.5 Cancel tour

- Method: `POST`
- URL: `/api/v1/tours/:tourId/cancel`
- Auth: required

---

## 7. Example hotel PayPal booking flow

### 7.1 Sample hotel record from seed data

```json
{
  "_id": "<hotelBooking_id>",
  "userId": "<user_id>",
  "srdvHotelId": "TEST_HOTEL_001",
  "hotelName": "Test Hotel Mumbai",
  "destination": "Mumbai",
  "checkIn": "2024-12-25T14:00:00.000Z",
  "checkOut": "2024-12-27T12:00:00.000Z",
  "roomType": "Deluxe",
  "pricePerNight": 15000,
  "totalNights": 2,
  "totalPrice": 30000,
  "currency": "INR",
  "status": "pending"
}
```

### 7.2 Create PayPal order

```json
{
  "bookingId": "<hotelBooking_id>",
  "bookingType": "hotel"
}
```

---

## 8. Example tour PayPal booking flow

### 8.1 Sample tour record from seed data

```json
{
  "_id": "<tour_id>",
  "userId": "<user_id>",
  "title": "Mumbai Highlights Package",
  "destination": "Mumbai",
  "startDate": "2024-12-25T00:00:00.000Z",
  "endDate": "2024-12-28T00:00:00.000Z",
  "duration": 3,
  "budget": 25000,
  "currency": "INR",
  "status": "submitted"
}
```

### 8.2 Create PayPal order

```json
{
  "bookingId": "<tour_id>",
  "bookingType": "tour"
}
```

> Note: the service should use `budget` for tour booking amount. If the order fails with `Invalid booking amount`, the PayPal service needs a code fix.

Update: the shared amount resolver already checks `budget`, `quotedPrice`, and `totalPrice` for `tour` bookings. If you still see `Invalid booking amount` for a tour, confirm the tour document contains one of those fields and that `currency` is set.

Package booking behavior:

- For `package` bookings, the services currently prefer creating/updating the master `Booking` record as the authoritative booking record during payment capture. The code intentionally avoids mutating domain `Package` records' `status` directly for package flows — the master `Booking` is used to represent confirmed state and store `paymentId`.

---

## 9. Troubleshooting

- `Invalid booking amount` for hotel: use `HotelBooking.totalPrice` rather than `booking.totalAmount`.
- `Invalid booking amount` for tour: use `Tour.budget` rather than `booking.details.totalPrice`.
- Blank `redirectUrl`: the service may return an existing pending payment record without the stored approval URL.
- Webhook failures: verify the PayPal webhook URL is set to `/webhook/paypal/ipn` and `PAYPAL_WEBHOOK_ID` is configured.

Additional troubleshooting tips:

- Ownership errors (`Unauthorized to pay for this booking`) may be caused by differing user reference fields across domain models. The booking resolver normalizes `user` and `userId` fields, but ensure the booking's user reference matches the caller's user id unless it's a `package` flow that allows different ownership patterns.
- If booking confirmation doesn't appear after capture, check `modules/payments/bookingSync.js` — it performs `ensureBookingConfirmed()` inside the capture transaction and will create a master `Booking` if missing.
- If a webhook event doesn't reconcile a payment, inspect the corresponding webhook DLQ record in `WebhookEvent` collection (the webhook handler writes failed events for later inspection).

## 11. Seeding test data (recommended)

To quickly create test flights, hotels, tours and packages in your local/dev database, run the included seed script which now creates domain and package catalog entries used by the payment flows:

Run from the project root:

```bash
node scripts/create-test-bookings.js
```

What the script does:

- Creates/returns a test `User` and `Traveller`.
- Creates three `FlightBooking` records under that user (used for flight payment tests).
- Creates two `HotelBooking` records for PayPal hotel checkout tests.
- Creates two `Tour` records (Mumbai and Goa) that can be used for PayPal tour checkout tests.
- Creates two `Package` records (Goa Family Escape, Rajasthan Heritage Trail) for package checkout/coverage tests.

The script is idempotent: it reuses existing records if the seed data already exists.

-- End of updates --

---

## 10. Quick reference

### Hotel PayPal order body

```json
{
  "bookingId": "<hotelBooking_id>",
  "bookingType": "hotel"
}
```

### Tour PayPal order body

```json
{
  "bookingId": "<tour_id>",
  "bookingType": "tour"
}
```

### PayPal capture body

```json
{
  "orderId": "<paypal_order_id>"
}
```
