---
sidebar_position: 2
---

# Flights Module

The `flights` module coordinates airline searches, real-time fare quoting, seat selections, and ticketing.

## Component Map

* **Controller:** [flight.controller.js](file:///d:/Shashi/MaqamTravelsAlpha/modules/flights/flight.controller.js)
* **Routes:** [flight.routes.js](file:///d:/Shashi/MaqamTravelsAlpha/modules/flights/flight.routes.js)
* **Validator:** [flight.validator.js](file:///d:/Shashi/MaqamTravelsAlpha/modules/flights/flight.validator.js)
* **Service:** [flight.service.js](file:///d:/Shashi/MaqamTravelsAlpha/modules/flights/flight.service.js)

---

## Core Flows

### 1. Flight Search (`POST /search`)
* **Rate Limiting:** Wrapped with `searchLimiter` to protect external GDS API calls (which charge per query).
* **Payload:** Accepts `origin`, `destination`, `departureDate`, `returnDate` (optional), and passenger metrics.
* **GDS Integration:** Requests cache/live feeds from providers (e.g. Amadeus or Sabrev2).
* **Output:** Returns a list of standardized flight options, transit details, and a temporary flight identifier.

### 2. Fare Quoting (`POST /farequote`)
* **Purpose:** Validates that the selected flight is still available at the advertised price before taking payment.
* **Logic:** Takes the temporary flight ID, queries GDS in real-time, updates prices/taxes, and returns a secure, signed quote hash valid for 15 minutes.

### 3. Flight Booking (`POST /book`)
* **Requirements:** Requires authentication.
* **Flow:** Validates the GDS flight ID and pricing. Connects to `bookingService` to create a `pending_payment` booking state. Once payment is captured via webhooks, GDS is instructed to issue the electronic ticket (e-ticket).
