# ✈️ Flight Module — Developer & Frontend Integration Guide

> **Target Audience:** Backend Developers, Frontend/Mobile Engineers, QA Engineers, and Technical Leads.  
> **Scope:** Codebase architecture, data models, Redis caching, comprehensive API payloads, background workers, and step-by-step frontend UI/UX implementation workflows.  
> *(For visual sequence and architecture diagrams, refer to [flight_module_architecture.html](/docs/flight_module_architecture.html))*

---

## 1. Codebase Architecture & File Structure

The Flight Module is built with clean layer separation: **Routes ------> Controllers ----> Services ----> Adapters ----> HTTP Clients ----> Workers**.

```text
server/
├── modules/
│   ├── flights/
│   │   ├── flight.routes.js          # REST endpoints + OpenAPI documentation
│   │   ├── flight.controller.js      # Request parsing & HTTP response envelopes
│   │   ├── flight.service.js         # Core business logic, pricing, DB orchestration
│   │   ├── flight.model.js           # FlightBooking Mongoose schema
│   │   ├── flightRefund.model.js     # FlightRefund & ChangeRequests schema
│   │   ├── flight.validator.js       # Joi/Express validation schemas
│   │   └── flight.constants.js       # Status constants, queues, error codes
│   │
│   ├── account/
│   │   └── traveller.model.js        # Reusable passenger profile records
│   │
│   ├── bookings/
│   │   └── booking.model.js          # Unified Master Booking schema
│   │
│   ├── payments/
│   │   ├── payment.model.js          # Unified Payment transaction schema
│   │   ├── bookingSync.js            # Post-payment state machine (LCC vs GDS)
│   │   └── gateways/paypal/          # PayPal create, capture, and refund services
│   │
│   └── shared/
│       └── outbox-event.model.js     # Transactional Outbox pattern model
│
├── providers/
│   └── srdv/
│       ├── srdv.client.js            # Raw Axios HTTP client to SRDV API
│       └── srdv.adapter.js           # Data normalization, price sanitization, error mapping
│
└── workers/
    ├── index.js                      # Central worker bootloader (startAllWorkers)
    └── flights/
        └── flight-ticket-gds.worker.js # BullMQ worker: async GDS e-ticket issuance
```

---

### 1.1. Supplier Connectivity & Authentication (SRDV v8 Standard)

> [!IMPORTANT]
> **SRDV v8 Authentication Rules (Live Tested & Verified):**
> * **Header-Based Authentication:** All requests to SRDV v8 flight and hotel APIs now authenticate exclusively via the HTTP header:
>   ```http
>   API-TOKEN: <SRDV_API_TOKEN>
>   ```
> * **Deprecated Credentials Removed from Body:** Do **NOT** pass `ClientId`, `Username`, `Password`, or `EndUserIp` in any API request payloads. These legacy parameters have been removed from `providers/srdv/srdv.client.js` and `providers/hotels/srdv/srdv-hotel.client.js`.
> * **Environment Variables Required:**
>   * `SRDV_API_TOKEN`: Supplier API token configured in `.env`.
>   * `SRDV_API_BASE_FLIGHT_URL`: Base URL (e.g. `https://api.srdvtest.com/flight/v8/`).
>   * `SRDV_API_BASE_HOTEL_URL`: Base URL (e.g. `https://api.srdvtest.com/hotel/v8/`).

---

## 2. Database Models & Schema Specifications

### A. `FlightBooking` (`server/modules/flights/flight.model.js`)
Tracks the flight reservation, flight segments, passenger tickets, financial breakdown, and supplier references.

| Field | Type | Description |
|---|---|---|
| `user` | `ObjectId` (Ref: `User`) | ID of the user who booked the flight. |
| `traceId` | `String` | Unique session ID from SRDV flight search. |
| `resultIndex` | `[String]` | Array of result indices (1 for oneway, 2 for roundtrip). |
| `srdvType` | `String` | SRDV provider routing type (e.g. `MixAPI`, `mock`). |
| `srdvIndex` | `String` | SRDV internal engine index. |
| `isLCC` | `Boolean` | `true` = Low-Cost Carrier (IndiGo, SpiceJet); `false` = Full Service GDS (Air India). |
| `pnr` | `String` | Airline PNR (e.g. `6E7890`, `AI1234`). |
| `srdvBookingId` | `Number` | SRDV supplier booking ID (e.g. `213637`). |
| `status` | `String` | Enum: `'initiated'`, `'pending'`, `'confirmed'`, `'failed'`, `'aborted'`, `'cancelled'`. |
| `totalAmount` | `Number` | Total customer charged amount (Base + Tax + Ancillaries + Platform Markup). |
| `markupAmount` | `Number` | Platform profit fee retained by Maqam (`totalAmount * (FLIGHT_MARKUP_PERCENT / 100)`). |
| `currency` | `String` | ISO currency code (Default: `'INR'`). |
| `paymentId` | `ObjectId` (Ref: `Payment`) | Associated payment record. |
| `lastTicketDate` | `Date` | GDS hold expiration deadline. If unpaid before this time, hold expires. |
| `passengers` | `[Object]` | Array of travellers with `ticketNumber`, `ticketStatus`, `seat`, `meal`, `baggage`. |
| `fareSnapshot` | `Object` | Copy of fare breakdown and segments at time of booking. |

---

### B. `FlightRefund` (`server/modules/flights/flightRefund.model.js`)
Tracks cancellations, airline penalties, retained markup, gateway refund IDs, and supplier change requests.

| Field | Type | Description |
|---|---|---|
| `bookingId` | `ObjectId` (Ref: `FlightBooking`) | The flight booking being refunded. |
| `userId` | `ObjectId` (Ref: `User`) | Customer receiving refund. |
| `pnr` | `String` | Airline PNR reference. |
| `srdvBookingId` | `Number` | SRDV supplier booking ID. |
| `totalBookingAmount` | `Number` | Original total paid by customer. |
| `airlinePenalty` | `Number` | Cancellation fee charged by the airline (from SRDV). |
| `agencyFee` | `Number` | Non-refundable markup retained by Maqam. |
| `customerRefundAmount` | `Number` | Net refund amount sent to customer card/PayPal (`Total - Penalty - Markup`). |
| `gatewayRefundId` | `String` | PayPal / Razorpay refund transaction reference. |
| `status` | `String` | Enum: `'pending'`, `'processed'`, `'failed'`, `'rejected'`. |
| `changeRequests` | `[Object]` | Subdocuments tracking each passenger's `ChangeRequestId`, `status`, and remarks. |
| `supplierRefundReference` | `String` | Comma-separated list of SRDV `ChangeRequestId`s. |

---

## 3. Redis Cache Keys & Expirations

The backend uses Redis for fast lookups, price locking, and concurrency control.

| Redis Key Pattern | TTL | Purpose |
|---|---|---|
| `flight:search:<traceId>:<srdvIndex>:<resultIndex>` | 900s (15 min) | Caches flight search results per resultIndex. |
| `flight:farequote:<traceId>:<resultIndex>` | 600s (10 min) | Locks the live verified fare returned by SRDV `POST /FareQuote`. |
| `flight:ssr:<traceId>:<resultIndex>` | 600s (10 min) | Caches meals, extra baggage options, and prices for backend verification. |
| `flight:seatmap:<traceId>:<resultIndex>` | 600s (10 min) | Caches seat matrix and seat selection prices. |
| `flight:gds_lock:<bookingId>` | 30s | Distributed Redlock preventing double-ticketing of GDS flights. |

---

## 4. Complete API Reference

All protected endpoints require an `Authorization: Bearer <jwt_token>` header.

---

### 4.1. Search Flights
* **Endpoint:** `POST /api/v1/flights/search`
* **Access:** Public / Authenticated
* **Request Body:**
```json
{
  "origin": "DEL",
  "destination": "BOM",
  "departureDate": "2026-09-15",
  "returnDate": null,
  "journeyType": "oneway",
  "passengers": {
    "adults": 1,
    "children": 0,
    "infants": 0
  }
}
```
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Flights found",
  "data": {
    "traceId": "283594",
    "journeyType": "oneway",
    "outbound": [
      {
        "segments": [
          {
            "airline": "Alliance Air",
            "airlineCode": "9I",
            "flightNo": "11111",
            "origin": "Delhi",
            "originCode": "DEL",
            "destination": "Mumbai",
            "destinationCode": "BOM",
            "departure": "2026-09-15T12:00:00",
            "arrival": "2026-09-15T13:00:00",
            "duration": 60,
            "cabinClass": "Economy",
            "baggage": "15 Kg",
            "cabinBaggage": "7 Kg"
          }
        ],
        "fares": [
          {
            "resultIndex": "11-4598388194_2DELBOM9I11111~864484912641097",
            "srdvIndex": "2",
            "srdvType": "MixAPI",
            "isLCC": true,
            "isRefundable": true,
            "offeredFare": 5500,
            "publishedFare": 5500,
            "baseFare": 4500,
            "tax": 1000
          }
        ]
      }
    ]
  }
}
```

---

### 4.2. Get Calendar Fares (30-Day Lowest Price Matrix)
* **Endpoint:** `POST /api/v1/flights/calendar-fares`
* **Access:** Public / Authenticated
* **Request Body:**
```json
{
  "origin": "DEL",
  "destination": "BOM",
  "departDate": "2026-09-01",
  "journeyType": "oneway",
  "fareType": "all"
}
```
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Flights found",
  "data": {
    "traceId": "283595",
    "calendarFares": [
      { "date": "2026-09-01", "lowestFare": 4200, "airlineCode": "6E" },
      { "date": "2026-09-02", "lowestFare": 3950, "airlineCode": "9I" },
      { "date": "2026-09-03", "lowestFare": 4800, "airlineCode": "AI" }
    ]
  }
}
```

---

### 4.3. FareQuote (Price Lock & Rule Verification)
* **Endpoint:** `POST /api/v1/flights/fare-quote`
* **Access:** Authenticated
* **Request Body:**
```json
{
  "traceId": "283594",
  "resultIndex": "11-4598388194_2DELBOM9I11111~864484912641097"
}
```
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Flight details",
  "data": {
    "traceId": "283594",
    "resultIndex": "11-4598388194_2DELBOM9I11111~864484912641097",
    "isPriceChanged": false,
    "isLCC": true,
    "isRefundable": true,
    "isGstMandatory": false,
    "totalAmount": 6050,
    "fare": {
      "BaseFare": 4500,
      "Tax": 1000,
      "OfferedFare": 5500,
      "PublishedFare": 5500
    },
    "required": {
      "passport": false,
      "passportExpiry": false,
      "adultDob": false,
      "childDob": true,
      "infantDob": true,
      "hold": false,
      "seatSelect": true
    }
  }
}
```

#### 💡 Frontend Dynamic Form Rules (`data.required`):
The `required` object dynamically instructs the Frontend which form fields to render for this specific flight:
* **`required.passport === true`** (Typical for International flights e.g. DEL $\rightarrow$ DXB): Show **Passport Number**, **Passport Expiry Date**, and **Issuing Country** fields for all passengers.
* **`required.passport === false`** (Typical for Domestic flights e.g. DEL $\rightarrow$ BOM): Hide passport inputs. Only Name, Gender & DOB are required.
* **`required.childDob` / `required.infantDob`**: When `true`, Date of Birth is strictly mandatory for Child / Infant passenger cards.
* **`required.adultDob`**: When `true`, Date of Birth is required for Adult passengers (some international carriers require it).
* **`required.hold === true`**: Indicates a GDS flight that allows an unpaid seat reservation hold before payment.

---

### 4.4. Special Service Requests (SSR — Meals & Extra Baggage)
* **Endpoint:** `POST /api/v1/flights/ssr`
* **Access:** Authenticated
* **Request Body:**
```json
{
  "traceId": "283594",
  "resultIndex": "11-4598388194_2DELBOM9I11111~864484912641097"
}
```
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "SSR details",
  "data": {
    "traceId": "283594",
    "resultIndex": "11-4598388194_2DELBOM9I11111~864484912641097",
    "baggage": [
      {
        "code": "BAG5",
        "description": "5 Kg Additional Baggage",
        "weight": "5",
        "price": 1800,
        "currency": "INR",
        "airlineCode": "6E",
        "flightNumber": "204",
        "origin": "DEL",
        "destination": "BOM",
        "wayType": 1
      },
      {
        "code": "BAG10",
        "description": "10 Kg Additional Baggage",
        "weight": "10",
        "price": 3500,
        "currency": "INR",
        "airlineCode": "6E",
        "flightNumber": "204",
        "origin": "DEL",
        "destination": "BOM",
        "wayType": 1
      }
    ],
    "meals": [
      {
        "code": "VGML",
        "description": "Vegetarian Hot Meal Combo",
        "airlineDescription": "Vegetarian Meal Box",
        "quantity": "1",
        "price": 450,
        "currency": "INR",
        "airlineCode": "6E",
        "flightNumber": "204",
        "origin": "DEL",
        "destination": "BOM",
        "wayType": 1
      },
      {
        "code": "NVML",
        "description": "Non-Veg Chicken Biryani Combo",
        "airlineDescription": "Chicken Biryani Box",
        "quantity": "1",
        "price": 550,
        "currency": "INR",
        "airlineCode": "6E",
        "flightNumber": "204",
        "origin": "DEL",
        "destination": "BOM",
        "wayType": 1
      }
    ],
    "standardMeals": []
  }
}
```

> 💡 **Frontend Implementation Note for SSR:**  
> When a user selects a meal or baggage option, preserve its catalog `code` and `price` (and `weight` for baggage). These values are sent in `passengers[].meals` and `passengers[].baggage` during the `/book` call. The backend verifies the price against the Redis SSR cache to prevent client-side price tampering.

---

### 4.5. Seat Map Layout
* **Endpoint:** `POST /api/v1/flights/seat-map`
* **Access:** Authenticated
* **Request Body:**
```json
{
  "traceId": "283594",
  "resultIndex": "11-4598388194_2DELBOM9I11111~864484912641097"
}
```
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Seat map details",
  "data": {
    "traceId": "283594",
    "resultIndex": "11-4598388194_2DELBOM9I11111~864484912641097",
    "segments": [
      {
        "fromAirportCode": "DEL",
        "toAirportCode": "BOM",
        "airlineName": "Alliance Air",
        "airlineCode": "9I",
        "airlineNumber": "11111",
        "totalRow": 30,
        "totalColumn": 6
      }
    ],
    "seatLayout": [
      {
        "rowNumber": 1,
        "seats": [
          {
            "seatNumber": "1A",
            "code": "1ASeKey12",
            "amount": 600,
            "isBooked": false,
            "isLegroom": true,
            "isAisle": false,
            "airlineCode": "9I",
            "flightNumber": "11111",
            "origin": "DEL",
            "destination": "BOM"
          },
          {
            "seatNumber": "1B",
            "code": "1BSeKey13",
            "amount": 400,
            "isBooked": false,
            "isLegroom": true,
            "isAisle": false,
            "airlineCode": "9I",
            "flightNumber": "11111",
            "origin": "DEL",
            "destination": "BOM"
          },
          {
            "seatNumber": "1C",
            "code": "1CSeKey14",
            "amount": 600,
            "isBooked": true,
            "isLegroom": true,
            "isAisle": true,
            "airlineCode": "9I",
            "flightNumber": "11111",
            "origin": "DEL",
            "destination": "BOM"
          }
        ]
      }
    ]
  }
}
```

> ⚠️ **CRITICAL SEAT IDENTIFIERS:**  
> When the user selects a seat on the frontend UI, you **MUST save both `seatNumber` (e.g. `"1A"`) AND `code` (e.g. `"1ASeKey12"`)**. Both identifiers are required by airline reservation engines to lock and issue the seat during booking.

---

### 4.6. Book Flight (`/book`)
 
> 🌟 **UNIVERSAL PAYLOAD NOTICE FOR FRONTEND:**  
> The Frontend sends the **EXACT SAME JSON PAYLOAD** for all airlines and flight types (IndiGo, Air India, Emirates, SpiceJet, Akasa, etc.).  
> The Frontend does **NOT** need different payload formats for different airlines or GDS vs LCC. The backend adapter (`srdv.adapter.js`) automatically converts this single standard JSON into the complex vendor-specific supplier payload.

* **Endpoint:** `POST /api/v1/flights/book`
* **Access:** Authenticated (`Authorization: Bearer <jwt_token>`)
* **Headers:** `Content-Type: application/json`

#### Root Request Schema:
| Field | Type | Required | Description |
|---|---|---|---|
| `traceId` | `String` | **Yes** | Session identifier returned by `/search` and `/fare-quote`. |
| `resultIndex` | `String` | **Yes** | Unique itinerary index for the chosen flight. |
| `passengers` | `Array` | **Yes** | List of passenger objects. Must contain at least 1 passenger. Exactly **one** passenger must have `isLeadPax: true`. |
| `gstDetails` | `Object` | Optional | Corporate GST invoice details (or `null` / omitted for non-business bookings). |

#### Passenger Object Specification:
Each passenger in `passengers[]` can be specified via either:
1. **Saved Profile (`travellerId`):** Pass the MongoDB ID of an existing traveller record.
2. **Inline Form (`travellerDetails`):** Pass complete passenger details directly from the checkout form (including `title`, `firstName`, `lastName`, `passengerType`, `gender`, `dateOfBirth`, `email`, `phone`, `cellCountryCode`, `addressLine1`, `city`, `countryCode`, `countryName`, and passport details for international routes). Optional `"saveToProfile": true/false`.

#### Ancillaries Schema (`meals`, `baggage`, `seats`):
* `meals`: Array of meal objects selected from `/ssr` (`[{ "code": "VGML", "price": 450 }]`).
* `baggage`: Array of baggage objects selected from `/ssr` (`[{ "code": "BAG5", "weight": 5, "price": 1800 }]`).
* `seats`: Array of seat objects selected from `/seat-map` (`[{ "seatNumber": "8C", "code": "8CSeKey33", "amount": 600 }]`).

---

### 🚨 CRITICAL FRONTEND INTEGRATION RULES (Live Verified)

> [!IMPORTANT]
> #### 1. Lead Passenger Validation:
> - Exactly **one** passenger must have `"isLeadPax": true` (as boolean, not `1`).
> - The lead passenger **must** have a valid `email` and `phone` (`ContactNo`). If omitted, airline validation fails with:  
>   `"Please provide the details of the lead passenger. Set 'IsLeadPax' to true in the passenger details for the lead passenger."`

> [!CAUTION]
> #### 2. DO NOT SEND EMPTY PLACEHOLDER OBJECTS!
> If a passenger does **NOT** select a meal, extra baggage, or seat:
> - ✅ **CORRECT:** Pass clean empty arrays: `"meals": []`, `"baggage": []`, `"seats": []` (or omit the properties entirely).
> - ❌ **NEVER DO THIS (ANTI-PATTERNS):**
>   - ❌ `"baggage": [{}]` or `"baggage": [{ "code": "", "price": 0 }]`
>   - ❌ `"meals": [{}]` or `"meals": [{ "code": "" }]`
>   - ❌ `"seats": [{}]` or `"seats": [{ "seatNumber": "", "code": "" }]`
>   - ❌ `"seat": {}` or `"baggage": null`
>
> **Why?** When placeholder objects like `{}` or `{ "code": "" }` are sent, the backend and airline PSS receive an empty code string (`Code: ""`). Because `""` is not a valid catalog code in the airline's reservation inventory, the supplier **fails the entire booking immediately** with errors such as:
> - `SRDV adapter ticket LCC failed: Baggage Code Metching Issue, Please contact support team`
> - `SRDV adapter ticket LCC failed: Invalid seat ssr data`

> [!NOTE]
> #### 3. Protected Route & CORS Preflight (OPTIONS) in Browsers:
> - **Public vs Authenticated:** Unlike `/search` and `/fare-quote` (which are public), `/book` requires an authenticated session (`Authorization: Bearer <jwt_token>`).
> - **Browser Preflight:** Browsers automatically issue an HTTP `OPTIONS` preflight request before sending `POST /book` because `Authorization` is a non-simple header.
> - **Dev Mode / Mobile Testing (`http://<LAN_IP>:5000`):**
>   - If testing from an IP address like `http://192.168.x.x:5000`, ensure the frontend is **not** hosted on `https://` (which triggers browser `blocked:mixed-content`).
>   - Ensure your booking form button uses `e.preventDefault()`. If omitted, default `<form>` submission reloads the page and cancels the pending request (`(canceled)` in DevTools).
>   - If `book` fails to hit the backend, inspect the DevTools **Console tab** for CORS header rejection or client-side auth interceptor errors.

---

#### 📋 Scenario 1: Standard Flight Booking — NO SSR and NO Seat Selected (Most Common)

When the passenger simply books the flight without purchasing paid meals, extra baggage, or seat selection:

```json
{
  "traceId": "283594",
  "resultIndex": "11-4598388194_2DELBOM9I11111~864484912641097",
  "passengers": [
    {
      "travellerDetails": {
        "title": "Mr",
        "firstName": "Rahul",
        "lastName": "Sharma",
        "passengerType": "Adult",
        "gender": "Male",
        "dateOfBirth": "1992-08-15",
        "email": "rahul.sharma@example.com",
        "phone": "9876543210",
        "cellCountryCode": "+91",
        "addressLine1": "Flat 402, Sunshine Heights",
        "city": "Mumbai",
        "countryCode": "IN",
        "countryName": "INDIA"
      },
      "isLeadPax": true,
      "saveToProfile": true,
      "meals": [],
      "baggage": [],
      "seats": []
    }
  ]
}
```
*(Notice: `meals`, `baggage`, and `seats` are cleanly empty `[]`. You can also omit them from the JSON entirely).*

---

#### 📋 Scenario 2: Flight Booking WITH Ancillaries Selected (Meals + Baggage + Seat)

When the passenger selects an add-on meal, 5 Kg excess baggage, and seat `8C`:

```json
{
  "traceId": "283594",
  "resultIndex": "11-4598388194_2DELBOM9I11111~864484912641097",
  "passengers": [
    {
      "travellerDetails": {
        "title": "Mr",
        "firstName": "Rahul",
        "lastName": "Sharma",
        "passengerType": "Adult",
        "gender": "Male",
        "dateOfBirth": "1992-08-15",
        "email": "rahul.sharma@example.com",
        "phone": "9876543210",
        "cellCountryCode": "+91",
        "addressLine1": "Flat 402, Sunshine Heights",
        "city": "Mumbai",
        "countryCode": "IN",
        "countryName": "INDIA"
      },
      "isLeadPax": true,
      "saveToProfile": false,
      "meals": [
        {
          "code": "VGML",
          "price": 450
        }
      ],
      "baggage": [
        {
          "code": "BAG5",
          "weight": 5,
          "price": 1800
        }
      ],
      "seats": [
        {
          "seatNumber": "8C",
          "code": "8CSeKey33",
          "amount": 600
        }
      ]
    }
  ],
  "gstDetails": {
    "gstNumber": "07AAAAA0000A1Z5",
    "companyName": "Maqam Travels Private Limited",
    "companyAddress": "New Delhi, India",
    "companyEmail": "billing@maqam.com",
    "companyPhone": "9876543210"
  }
}
```

---

#### 📋 Scenario 3: Partial Ancillary Selection (e.g., Seat Selected, but NO Meals or Extra Baggage)

When the passenger only selects a seat and does not want any meal or baggage:

```json
{
  "traceId": "283594",
  "resultIndex": "11-4598388194_2DELBOM9I11111~864484912641097",
  "passengers": [
    {
      "travellerId": "64f0b5c2d2b6e3b4c5d6e7f8",
      "isLeadPax": true,
      "meals": [],
      "baggage": [],
      "seats": [
        {
          "seatNumber": "12A",
          "code": "12ASeKey99",
          "amount": 350
        }
      ]
    }
  ]
}
```

---

#### 📋 Scenario 4: Multi-Passenger Booking (Mixed Ancillary Selections)

When booking for 1 Adult and 1 Child, where Passenger 1 chose a meal and seat, but Passenger 2 (Child) has no add-ons:

```json
{
  "traceId": "283594",
  "resultIndex": "11-4598388194_2DELBOM9I11111~864484912641097",
  "passengers": [
    {
      "travellerDetails": {
        "title": "Mr",
        "firstName": "Vikram",
        "lastName": "Mehta",
        "passengerType": "Adult",
        "gender": "Male",
        "dateOfBirth": "1988-04-12",
        "email": "vikram.mehta@example.com",
        "phone": "9811223344",
        "cellCountryCode": "+91",
        "addressLine1": "45 Green Park",
        "city": "New Delhi",
        "countryCode": "IN",
        "countryName": "INDIA"
      },
      "isLeadPax": true,
      "meals": [
        { "code": "VGML", "price": 450 }
      ],
      "baggage": [],
      "seats": [
        { "seatNumber": "4A", "code": "4ASeKey21", "amount": 600 }
      ]
    },
    {
      "travellerDetails": {
        "title": "Mstr",
        "firstName": "Aarav",
        "lastName": "Mehta",
        "passengerType": "Child",
        "gender": "Male",
        "dateOfBirth": "2018-09-20",
        "email": "vikram.mehta@example.com",
        "phone": "9811223344",
        "cellCountryCode": "+91",
        "addressLine1": "45 Green Park",
        "city": "New Delhi",
        "countryCode": "IN",
        "countryName": "INDIA"
      },
      "isLeadPax": false,
      "meals": [],
      "baggage": [],
      "seats": []
    }
  ]
}
```

---

#### 📋 Scenario 5: International Flight (With Mandatory Passport Details)

When `FareQuote` returns `required.passport === true`, passenger cards must include passport fields:

```json
{
  "traceId": "283594",
  "resultIndex": "11-4598388194_2DELDXBAI101~998877665544332",
  "passengers": [
    {
      "travellerDetails": {
        "title": "Mrs",
        "firstName": "Priya",
        "lastName": "Verma",
        "passengerType": "Adult",
        "gender": "Female",
        "dateOfBirth": "1994-11-05",
        "email": "priya.verma@example.com",
        "phone": "9898989898",
        "cellCountryCode": "+91",
        "addressLine1": "22 Park Street",
        "city": "Kolkata",
        "countryCode": "IN",
        "countryName": "INDIA",
        "passportNo": "Z9876543",
        "passportExpiry": "2032-05-15",
        "passportIssueDate": "2022-05-16",
        "passportIssueCountryCode": "IN"
      },
      "isLeadPax": true,
      "meals": [],
      "baggage": [],
      "seats": []
    }
  ]
}
```

---

* **Success Response (`201 Created` / Confirmed LCC Example):**
```json
{
  "success": true,
  "message": "Booking initiated, proceed to payment",
  "data": {
    "bookingId": "6adeeaae77b335799b9d0f4d",
    "status": "confirmed",
    "pnr": "TESTPNR",
    "srdvBookingId": 214383,
    "isLCC": true,
    "totalAmount": 3056.24,
    "currency": "INR",
    "lastTicketDate": null,
    "paymentRequired": true
  }
}
```

---

### 4.7. Payment Order Creation & Capture (PayPal)
* **Create Order:** `POST /api/v1/payments/paypal/create-order`
  * Body: `{ "bookingId": "6a92aa90936ae73040a7dcff", "bookingType": "flight" }`
  * Response: `{ "success": true, "data": { "paypalOrderId": "PAYPAL_ORD_123", "redirectUrl": "https://www.sandbox.paypal.com/checkoutnow?token=..." } }`
* **Capture Payment:** `POST /api/v1/payments/paypal/capture`
  * Body: `{ "orderId": "PAYPAL_ORD_123" }`
  * Response: `{ "success": true, "message": "Payment captured successfully", "data": { "paymentId": "6a92aa90936ae73040a7dd21", "status": "paid" } }`

---

### 4.8. Get Pre-Cancellation Charges Preview
* **Endpoint:** `GET /api/v1/flights/bookings/:bookingId/cancellation-charges?requestType=1`
* **Access:** Authenticated (Owner / Admin)
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Cancellation charges retrieved successfully",
  "data": {
    "bookingId": "6a92aa90936ae73040a7dcff",
    "pnr": "6E5544",
    "traceId": "283594",
    "cancellationType": "FullCancellation",
    "totalBookingAmount": 8900,
    "airlinePenalty": 2500,
    "agencyFee": 890,
    "expectedCustomerRefund": 5510,
    "currency": "INR"
  }
}
```

---

### 4.9. Submit Change Request / Cancellation to SRDV
* **Endpoint:** `POST /api/v1/flights/bookings/:bookingId/change-request`
* **Access:** Authenticated (Owner / Admin)
* **Request Body:**
```json
{
  "requestType": "1",
  "cancellationType": "3",
  "remarks": "Customer requested voluntary cancellation",
  "paxIds": []
}
```
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Change request submitted successfully",
  "data": {
    "bookingId": "6a92aa90936ae73040a7dcff",
    "pnr": "6E5544",
    "srdvBookingId": 213637,
    "changeRequests": [
      {
        "changeRequestId": "CR_RAHUL_1787996815544",
        "ticketId": "098-9988776655",
        "status": "Pending",
        "remarks": "Submitted to airline for cancellation"
      }
    ]
  }
}
```

---

### 4.10. Full Booking Cancellation & Gateway Refund (`/cancel`)
* **Endpoint:** `POST /api/v1/flights/bookings/:bookingId/cancel`
* **Access:** Authenticated (Owner / Admin)
* **Request Body:**
```json
{
  "reason": "Personal medical emergency",
  "penaltyAmount": 2500,
  "idempotencyKey": "FLIGHT_CANCEL_USER1_6a92aa90"
}
```
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Flight booking cancelled successfully",
  "data": {
    "bookingId": "6a92aa90936ae73040a7dcff",
    "status": "cancelled",
    "refund": {
      "refundId": "6a92aa92936ae73040a7dd49",
      "totalBookingAmount": 8900,
      "airlinePenalty": 2500,
      "agencyFee": 890,
      "customerRefundAmount": 5510,
      "gatewayRefundId": "PAYPAL_REF_9988771122",
      "supplierRefundReference": "CR_RAHUL_1787996815544",
      "status": "processed"
    }
  }
}
```

---

### 4.11. Check Live Cancellation & Supplier Status
* **By Booking ID:** `GET /api/v1/flights/bookings/:bookingId/cancel-status`
* **By Change Request ID:** `GET /api/v1/flights/change-requests/:changeRequestId/status`
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Cancellation status retrieved successfully",
  "data": {
    "bookingId": "6a92aa90936ae73040a7dcff",
    "pnr": "6E5544",
    "refundStatus": "processed",
    "totalBookingAmount": 8900,
    "airlinePenalty": 2500,
    "agencyFee": 890,
    "customerRefundAmount": 5510,
    "gatewayRefundId": "PAYPAL_REF_9988771122",
    "supplierRefundReference": "CR_RAHUL_1787996815544",
    "changeRequestStatuses": [
      {
        "changeRequestId": "CR_RAHUL_1787996815544",
        "paxName": "Rahul Sharma",
        "pnr": "6E5544",
        "cancelStatus": "Cancelled",
        "refundStatus": "Processed",
        "refundAmount": 5510,
        "cancellationCharge": 2500,
        "adminRemark": "Refund credited to agency SRDV wallet"
      }
    ],
    "isFullyProcessedByAirline": true
  }
}
```

---

### 4.12. SRDV Webhook Inbound Status Callback
* **Endpoint:** `POST /api/v1/flights/callback`
* **Direction:** SRDV $\rightarrow$ Backend Webhook
* **SRDV Payload:**
```json
{
  "ClientId": "180174",
  "UserName": "MaqamHds",
  "Password": "...",
  "BookingId": 213637,
  "PNR": "6E5544",
  "Status": "Success",
  "Passengers": [
    {
      "FirstName": "Rahul",
      "LastName": "Sharma",
      "Ticket": { "TicketNumber": "098-2341908721", "TicketStatus": "OK" }
    }
  ]
}
```
* **Behavior:**
  * If `Status == "Success"`: Updates DB ticket numbers, marks `FlightBooking` and Master `Booking` as `"confirmed"`.
  * If `Status == "Failed"` or `"Aborted"`: Automatically executes **100% full refund** to customer via PayPal/Razorpay with zero penalty deductions.

---

## 5. Frontend Implementation Guide (Step-by-Step UI/UX Engineering)

This section provides the exact technical steps for frontend engineers building the web or mobile user interface.

```text
[1. Search Form] ──> [2. Flight Results & Filters] ──> [3. Fare Quote & Add-ons]
                                                                │
[6. E-Ticket View] <── [5. Payment Gateway (PayPal)] <── [4. Passenger Form]
       │
[7. Cancel & Refund Tracker]
```

---

### Step 1: Flight Search Screen
* **Inputs:**
  * Journey Type Tabs: `One-Way` vs `Round-Trip`.
  * Origin (`DEL`) & Destination (`BOM`) with Autocomplete Airport Dropdowns.
  * Departure Date & Return Date (if Round-Trip).
  * Passenger Count Counter: Adults (12+), Children (2–12), Infants (under 2).
* **API Trigger:** Call `POST /api/v1/flights/search`.
* **Optional Enhancement:** Call `POST /api/v1/flights/calendar-fares` to render a 30-day horizontal date picker strip displaying the cheapest day to fly.

---

### Step 2: Flight Results & Filtering Screen
* **Display Elements:**
  * Airline logo & name (e.g. IndiGo, Air India).
  * Departure time, arrival time, duration, and stops (Non-stop vs 1-stop).
  * Baggage allowance badges (e.g. `15 Kg Check-in`, `7 Kg Cabin`).
  * Price in INR: Display `fares[0].offeredFare` (which already includes Maqam platform markup).
  * Fare Type Badge: `LCC` (IndiGo) vs `GDS` (Air India).
* **Action:** When user clicks **"Select Flight"**, store `traceId` and `resultIndex`.

---

### Step 3: Fare Confirmation & Ancillary Selection
* **API Trigger:** Call `POST /api/v1/flights/fare-quote` with `{ traceId, resultIndex }`.
* **Verification Checks:**
  * Check `data.isPriceChanged`: If true, show a toast alert: *"Airline price updated from ₹X to ₹Y"*.
  * Inspect `data.required`: Check if passport details or infant DOB are required.
* **Ancillary Options (Optional Tabs):**
  * **Meals & Baggage:** Call `POST /api/v1/flights/ssr` $\rightarrow$ Render meals cards and baggage weight buttons with prices. When selected, save the item's `code` and `price` (and `weight` for baggage).
  * **Seat Selection:** Call `POST /api/v1/flights/seat-map` $\rightarrow$ Render interactive airplane seat matrix (`1A`, `1B`, `1C`), coloring available seats vs occupied seats. When a seat is clicked, save both its `seatNumber` and `code`.

---

### Step 4: Passenger Information, Ancillaries Assembly & GST Details
* **Form Inputs:**
  * For each passenger: Title (`Mr`, `Mrs`, `Ms`), First Name, Last Name, Gender, Date of Birth.
  * If `required.passport === true`: Passport Number, Country of Issue, Expiry Date.
  * Lead Passenger checkbox (must select exactly one).
  * Optional: **"Use GST Invoice for Business"** toggle $\rightarrow$ Expand inputs for GST Number, Company Name, and Company Email.

#### 💡 Best-Practice Frontend State Construction (React / Vue / Mobile):
To prevent airline supplier rejections (such as `"Baggage Code Metching Issue"` or `"Provide details of lead passenger"`), follow this state pattern:

```javascript
// State per passenger (React / Vue / Mobile)
const [selectedSeat, setSelectedSeat] = useState(null);       // e.g. { seatNumber: "8C", code: "8CSeKey33", amount: 600 }
const [selectedMeal, setSelectedMeal] = useState(null);       // e.g. { code: "VGML", price: 450 }
const [selectedBaggage, setSelectedBaggage] = useState(null); // e.g. { code: "BAG5", weight: 5, price: 1800 }

// When preparing passenger object for POST /api/v1/flights/book:
const passengerObject = {
  travellerDetails: {
    title: formData.title,
    firstName: formData.firstName,
    lastName: formData.lastName,
    passengerType: formData.passengerType, // "Adult" | "Child" | "Infant"
    gender: formData.gender,               // "Male" | "Female"
    dateOfBirth: formData.dateOfBirth,     // "YYYY-MM-DD"
    email: formData.email,                 // ⚠️ MANDATORY for lead passenger
    phone: formData.phone,                 // ⚠️ MANDATORY for lead passenger
    cellCountryCode: formData.cellCountryCode || "+91",
    addressLine1: formData.addressLine1 || "Address Line 1",
    city: formData.city || "City",
    countryCode: formData.countryCode || "IN",
    countryName: formData.countryName || "INDIA",
    ...(requiresPassport && {
      passportNo: formData.passportNo,
      passportExpiry: formData.passportExpiry,
      passportIssueDate: formData.passportIssueDate,
      passportIssueCountryCode: formData.passportIssueCountryCode || "IN"
    })
  },
  // Exactly ONE passenger in the array must have isLeadPax: true
  isLeadPax: isFirstPassenger,
  saveToProfile: formData.saveToProfile || false,

  // ⚠️ CRITICAL: Always fallback to empty array [] — NEVER pass [{}] or [{ code: "" }]!
  seats: selectedSeat 
    ? [{ seatNumber: selectedSeat.seatNumber, code: selectedSeat.code, amount: selectedSeat.amount }] 
    : [],
  meals: selectedMeal 
    ? [{ code: selectedMeal.code, price: selectedMeal.price }] 
    : [],
  baggage: selectedBaggage 
    ? [{ code: selectedBaggage.code, weight: selectedBaggage.weight, price: selectedBaggage.price }] 
    : []
};
```

---

### Step 5: Booking & Payment Execution
1. Call `POST /api/v1/flights/book` $\rightarrow$ Receive `bookingId`, `status`, `isLCC`, `lastTicketDate`, and `totalAmount`.
2. **Initiate Payment:**
   * Call `POST /api/v1/payments/paypal/create-order` with `{ bookingId, bookingType: "flight" }`.
   * Receive `paypalOrderId` and `redirectUrl`.
3. **PayPal Checkout Modal:**
   * Open the PayPal popup or redirect user to `redirectUrl`.
   * When user approves on PayPal, capture payment by calling `POST /api/v1/payments/paypal/capture` with `{ orderId: paypalOrderId }`.

---

### 5.1. LCC vs. GDS: Detailed Frontend Implementation Matrix

Frontend engineers must understand the architectural difference between **Low-Cost Carriers (LCC)** and **Global Distribution Systems (GDS)**:

| Step / Feature | **LCC Flights (IndiGo, SpiceJet, Akasa)** | **GDS Flights (Air India, Emirates, Singapore Airlines)** |
|---|---|---|
| **Carrier Identifier** | `isLCC === true` | `isLCC === false` |
| **At `/book` (Before Payment)** | No airline hold allowed. Backend creates internal pending booking order (`status: 'pending'`). | Airline seat is **held** on GDS. Real PNR created immediately. Backend returns `lastTicketDate`. |
| **Pre-Payment Countdown Timer** | Standard payment session timer (e.g. 15 mins). | Dynamic hold timer: Display `lastTicketDate` (e.g. *"Seat held until 2:45 PM. Pay before expiration."*). |
| **Post-Payment Ticketing** | **Synchronous:** `capture` immediately calls SRDV ticket API. E-ticket issued on the spot. | **Asynchronous:** `capture` queues ticketing in background (`BullMQ` worker). Official e-ticket issued in 2–5 seconds. |
| **Frontend Post-Payment Screen** | Immediately display confirmed ticket screen with PNR & Ticket numbers. | Display: *"Payment received! We are issuing your official airline e-ticket..."* $\rightarrow$ **Poll `GET /bookings/:id`**. |

#### 🔄 Frontend Polling Implementation for GDS:
When `isLCC === false`, execute a simple 2-second polling loop after payment capture:

```javascript
// Example Frontend Polling Function (React / Next.js / Vue)
async function waitForGDSTicket(bookingId) {
  const maxRetries = 10;
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(`/api/v1/flights/bookings/${bookingId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const { data } = await res.json();
    
    // Once status is confirmed and ticket numbers exist
    if (data.status === "confirmed" && data.passengers[0]?.ticketNumber) {
      return data; // Transition to Ticket Success Screen
    }
    
    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  // Fallback: If still pending after 20s, show "Ticket Processing - We will email your e-ticket shortly"
}
```

---

### Step 6: Confirmation & Ticket Management
* Call `GET /api/v1/flights/bookings/:bookingId`.
* Render:
  * Official Airline PNR (e.g. `6E-5544` for LCC or `AI-102` for GDS).
  * Passenger E-Ticket Numbers (e.g. `098-2341908721`).
  * Segment Departure/Arrival airport terminals and flight numbers.
  * Download PDF / Print Ticket button.

---

### Step 7: Cancellation & Refund Management
1. **Pre-Cancellation Preview:**
   * When user clicks *"Cancel Ticket"*, open a modal and call:
     `GET /api/v1/flights/bookings/:bookingId/cancellation-charges`.
   * Display the financial quote clearly:
     ```text
     Total Amount Paid:      ₹8,900
     Airline Cancellation Fee: -₹2,500
     Platform Agency Fee:     -₹890
     --------------------------------
     Expected Refund to Card:  ₹5,510
     ```
2. **Confirm Cancellation:**
   * User clicks **"Confirm & Cancel Flight"** $\rightarrow$ Call `POST /api/v1/flights/bookings/:bookingId/cancel`.
   * Backend cancels ticket with airline, credits customer card/PayPal, and updates status to `"cancelled"`.
3. **Live Refund Status Tracker:**
   * Call `GET /api/v1/flights/bookings/:bookingId/cancel-status` to show progress bars:
     * `[✓] Flight Cancelled with Airline`
     * `[✓] PayPal Refund Processed (ID: PAYPAL_REF_123)`
     * `[✓] Airline Credit Settled`

---

## 6. Testing & Quality Assurance Reference

To run automated test suites for the Flight module:

| Test Script | Command | Purpose |
|---|---|---|
| **E2E Full Lifecycle** | `node scripts/test-flight-full-lifecycle.js` | Tests Search $\rightarrow$ Hold $\rightarrow$ PayPal Capture $\rightarrow$ GDS Worker $\rightarrow$ Cancel Quote $\rightarrow$ Change Request $\rightarrow$ PayPal Refund $\rightarrow$ Live Status. |
| **Live SRDV API Flow** | `node scripts/test-live-srdv-flight-flow.js` | Direct calls to live `flight.srdvtest.com` sandbox endpoints. |
| **GDS Ticketing Worker** | `node scripts/test-flight-gds-worker.js` | Tests BullMQ queue, distributed redlock, retry backoff, and Outbox events. |
| **Cancellation Charges** | `node scripts/test-flight-cancellation-charges.js` | Tests SRDV `GetCancellationCharges` and financial formula accuracy. |
| **Change Request Flow** | `node scripts/test-flight-change-request.js` | Tests per-passenger cancellation loop and multi-traveller change requests. |
| **Cancel Status Polling** | `node scripts/test-flight-cancel-status.js` | Tests `GetCancelStatus` polling and MongoDB `FlightRefund` synchronization. |
| **Flight Refund & Gateway** | `node scripts/test-flight-refund.js` | Tests idempotency and PayPal refund gateway triggers. |

### 6.1. Verified Live Test Execution (`test-live-srdv-flight-flow.js`)
* **Environment:** Live sandbox connection to SRDV API v8 with `API-TOKEN` header authentication.
* **Verification Results:**
  * **Search:** Successfully queried DEL $\rightarrow$ BOM; received 189 live flight results; assigned live `TraceId`.
  * **Fare Quote:** Locked real-time supplier fare on Alliance Air (`9I-11111`).
  * **TicketLCC Booking:** Successfully generated live confirmed booking (`status: confirmed`, `PNR: TESTPNR`, `srdvBookingId: 2620310`) with no `ClientId`, `Username`, or `EndUserIp` in payload.
