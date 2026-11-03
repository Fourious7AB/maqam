# Complete Documentation: Markup System & Pricing Architecture

This document provides a comprehensive technical reference for the **Markup System** implemented in `MaqamTravelsAlpha`, explaining how it functions today across the CRM, Flight, and Hotel modules, followed by an architectural blueprint for **how to build an enterprise-grade, perfect markup engine**.

---

## Table of Contents

1. [Executive Summary: What is Markup in Travel OTAs?](#1-executive-summary-what-is-markup-in-travel-otas)
2. [Current Architecture in MaqamTravelsAlpha](#2-current-architecture-in-maqamtravelsalpha)
   - [Data Model & Storage (`Setting` Model)](#data-model--storage-setting-model)
   - [CRM Endpoints & Permissions](#crm-endpoints--permissions)
   - [Fallback & Synchronization Hierarchy](#fallback--synchronization-hierarchy)
   - [Downstream Consumption: Flights & Hotels](#downstream-consumption-flights--hotels)
3. [End-to-End Workflow & Pricing Lifecycle](#3-end-to-end-workflow--pricing-lifecycle)
4. [API Reference & Payload Specifications](#4-api-reference--payload-specifications)
5. [Evaluation: Strengths & Limitations of the Current Build](#5-evaluation-strengths--limitations-of-the-current-build)
6. [Blueprint: How to Build the Perfect Enterprise Markup Engine](#6-blueprint-how-to-build-the-perfect-enterprise-markup-engine)
   - [1. Multi-Tiered Dynamic Rule Matrix (B2C, B2B, Route, Airline)](#1-multi-tiered-dynamic-rule-matrix)
   - [2. Calculation Types (Percentage, Fixed, Min/Max Caps)](#2-calculation-types)
   - [3. Sub-Millisecond Redis Caching & Invalidation](#3-sub-millisecond-redis-caching--invalidation)
   - [4. Audit Logging & Financial Versioning](#4-audit-logging--financial-versioning)
   - [5. Zero-Leakage Customer vs. Backoffice Transparency](#5-zero-leakage-customer-vs-backoffice-transparency)
7. [Implementation Roadmap](#7-implementation-roadmap)

---

## 1. Executive Summary: What is Markup in Travel OTAs?

In Online Travel Agencies (OTAs), flights and hotels are sourced from third-party wholesale suppliers (e.g., SRDV, Amadeus, HotelBeds, TBO) at **Net B2B Rates**. 

**Markup** is the commercial profit margin added by the agency to the net supplier fare before publishing the price to the end customer.

$$\text{Customer Selling Price} = \text{Supplier Net Fare} + \text{Markup} + \text{Taxes / Convenience Fees}$$

### Primary Objectives of the Markup Engine:
1. **Confidentiality:** Supplier net fares and markup amounts must **never be exposed** to the customer browser or frontend API responses.
2. **Dynamic Admin Control:** Commercial managers can adjust profit margins from the CRM dashboard in real-time without modifying code or restarting servers.
3. **Financial Precision:** Currency roundings and tax calculations must be consistent to avoid minor-unit accounting discrepancies.

---

## 2. Current Architecture in MaqamTravelsAlpha

### Data Model & Storage (`Setting` Model)
**File**: [`modules/crm/settings.model.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/crm/settings.model.js)

Markup settings are stored in MongoDB in the `settings` collection using a flexible document-per-section schema:

```javascript
{
  section: "markup", // lowercase, unique, indexed
  data: {
    flightMarkupPercent: 2.5,
    hotelMarkupPercent: 5.0,
    defaultMarkupPercent: 5.0,
    markPercent: 2.5,
    updatedAt: ISODate("...")
  },
  updatedBy: ObjectId("..."), // Reference to Admin User
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

---

#### CRM Endpoints & Permissions
**Route File**: [`modules/crm/settings.routes.js:L25-L164`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/crm/settings.routes.js#L25-L164)  
**Controller**: [`modules/crm/settings.controller.js:L77-L105`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/crm/settings.controller.js#L77-L105)  
**Validator**: [`modules/crm/crm.validator.js:L347-L363`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/crm/crm.validator.js#L347-L363) (`validateUpdateMarkup`)  
**Service Layer**: [`modules/crm/settings.service.js:L101-L232`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/crm/settings.service.js#L101-L232)  
**Mount Points (`app.js`)**: Mounted directly at `/api/v1/crm/setting`, with backward-compatible aliases via `/api/v1/crm/settings` and `/api/v1/crm/markup*` delegation in [`modules/crm/crm.routes.js:L22-L29`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/crm/crm.routes.js#L22-L29).

| Method | Canonical Endpoint | Compatibility Aliases | Allowed Roles | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/crm/setting/markup` | `/api/v1/crm/settings/markup`<br/>`/api/v1/crm/markup` | `admin`, `super_admin`, `sales_agent`, `support_agent` | Returns current markup percentages and operating currency |
| `POST` | `/api/v1/crm/setting/markup` | `/api/v1/crm/settings/markup`<br/>`/api/v1/crm/markup` | `admin`, `super_admin` | Sets/updates markup configuration |
| `PUT` | `/api/v1/crm/setting/markup` | `/api/v1/crm/settings/markup`<br/>`/api/v1/crm/markup` | `admin`, `super_admin` | Full update / overwrite of markup parameters |
| `PATCH`| `/api/v1/crm/setting/markup` | `/api/v1/crm/settings/markup`<br/>`/api/v1/crm/markup` | `admin`, `super_admin` | Partial update of specific markup fields |
| `GET/PUT`| `/api/v1/crm/setting/:section` | `/api/v1/crm/settings/:section` | `admin`, `super_admin` | Polymorphic section endpoint (`section = "markup"`) |

---

### Fallback & Synchronization Hierarchy
**File**: [`modules/crm/settings.service.js:L101-L228`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/crm/settings.service.js#L101-L228)

When the system retrieves markup settings (`getMarkupSettings()`), it executes an exhaustive fallback chain to guarantee a valid numeric percentage:

```
[1. Check 'markup' Section in DB]
        │
        ├─▶ Found? Use flightMarkupPercent / hotelMarkupPercent / defaultMarkupPercent
        │
        ▼ (Missing or unconfigured)
[2. Check 'financial' Section in DB]
        │
        ├─▶ Found? Use financial.flightMarkupPercent / financial.hotelMarkupPercent
        │
        ▼ (Missing)
[3. Built-In Hardcoded Defaults (DEFAULT_SETTINGS)]
        │
        ├─▶ Flight: 2.5% | Hotel: 5.0% | Default: 5.0% | Currency: "USD"
        │
        ▼ (If service call fails)
[4. Environment Variable Fallback]
        │
        └─▶ process.env.FLIGHT_MARKUP_PERCENT (default: 10)
        └─▶ process.env.HOTEL_MARKUP_PERCENT  (default: 8)
```

**Bi-directional Sync:** When an admin updates markup, `updateMarkupSettings()` updates **both** the `markup` section and the legacy `financial` section simultaneously in MongoDB to prevent discrepancies across older modules.

---

### Downstream Consumption: Flights, Hotels & Invoices

#### 1. Flights Module
**File**: [`modules/flights/flight.service.js:L14-L25`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/flights/flight.service.js#L14-L25) and [`L108-L109`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/flights/flight.service.js#L108-L109)
* **Search Step:** When flights are fetched from the supplier (SRDV), raw `offeredFare` is cached internally in Redis for verification during booking.
* **Markup Application:** Before sending results to the client, the price is dynamically marked up:
  $$\text{totalAmount} = \text{round}\left(\text{offeredFare} \times \left(1 + \frac{\text{flightMarkupPercent}}{100}\right) \times 100\right) / 100$$
* **Client Response:** The customer only sees `totalAmount`. Supplier identifiers (`srdvIndex`, `offeredFare`) are stripped.

#### 2. Hotels Module
**File**: [`modules/hotels/application/pricing.service.js:L42-L82`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/hotels/application/pricing.service.js#L42-L82)
* **Minor Unit Calculation:** Operates in integer minor units (paise for INR) to prevent floating-point rounding errors:
  $$\text{supplierPaise} = \text{round}(\text{supplierAmountMinor})$$
  $$\text{markupPaise} = \text{round}\left(\text{supplierPaise} \times \frac{\text{hotelMarkupPercent}}{100}\right)$$
  $$\text{feePaise} = \text{convenienceFeeInr} \times 100$$
  $$\text{customerTotalMinor} = \text{supplierPaise} + \text{markupPaise} + \text{feePaise}$$

#### 3. Invoice & Tax Calculation Engine
**File**: [`modules/invoices/invoice.service.js:L233-L250`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/invoices/invoice.service.js#L233-L250) and [`L693-L720`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/invoices/invoice.service.js#L693-L720)
* **Service Fee Extraction:** When customer tax invoices are generated, the dynamic markup recorded at booking (`booking.markupAmount` for flights, `booking.markupMinor / 100` for hotels) is itemized as the official Agency Service Fee.
* **18% Statutory GST Computation:**
  - Agency service fees are subject to 18% GST under SAC `996411` / `996412` (Flights) and SAC `998555` (Hotels).
  - Intra-State Supply: 9% CGST + 9% SGST.
  - Inter-State Supply: 18% IGST.
  $$\text{CGST} = \text{round}(\text{markupAmount} \times 0.09, 2)$$
  $$\text{SGST} = \text{round}(\text{markupAmount} \times 0.09, 2)$$

---

## 3. End-to-End Workflow & Pricing Lifecycle

```
[Admin in CRM Dashboard]
        │
        ▼
PUT /api/v1/crm/setting/markup { flightMarkupPercent: 3.5, hotelMarkupPercent: 7.0 }
        │
        ▼
[settings.service.js] ──────────▶ Updates MongoDB 'settings' collection ('markup' & 'financial')
                                          │
┌─────────────────────────────────────────┼─────────────────────────────────────────┐
│                                         │                                         │
▼                                         ▼                                         ▼
[Customer Searches Flights]             [Customer Searches Hotels]                [Invoice Generation Engine]
        │                                         │                                         │
1. Supplier returns net fare: $1000     1. Supplier returns net room: $400        1. Reads booking.markupAmount: $35
2. Calls getMarkupPercent() ──▶ 3.5%    2. Calls getHotelMarkupPercent() ──▶ 7.0% 2. Calculates 18% GST on markup:
3. Markup amount = $35                  3. Markup amount = $28 + Fee $20             CGST (9%): $3.15 | SGST (9%): $3.15
4. Customer sees Total: $1,035          4. Customer sees Total: $448              3. Renders itemized A4 tax invoice
```

---

## 4. API Reference & Payload Specifications

### 1. Get Current Markup
- **Canonical Endpoint:** `GET /api/v1/crm/setting/markup`
- **Compatibility Aliases:** `GET /api/v1/crm/settings/markup`, `GET /api/v1/crm/markup`
- **Headers:** `Authorization: Bearer <Admin/Agent Token>`
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Markup settings retrieved successfully",
    "data": {
      "flightMarkupPercent": 2.5,
      "hotelMarkupPercent": 5.0,
      "defaultMarkupPercent": 5.0,
      "currency": "USD"
    }
  }
  ```

---

### 2. Update Markup (Admin Only)
- **Canonical Endpoint:** `PUT /api/v1/crm/setting/markup` (or `POST` / `PATCH`)
- **Compatibility Aliases:** `PUT /api/v1/crm/settings/markup`, `PUT /api/v1/crm/markup`
- **Headers:** `Authorization: Bearer <Admin Token>`, `Content-Type: application/json`
- **Validation**: Enforced via `validateUpdateMarkup()` in `crm.validator.js`
- **Request Body (Module-Specific):**
  ```json
  {
    "flightMarkupPercent": 4.0,
    "hotelMarkupPercent": 6.5,
    "currency": "USD"
  }
  ```
- **Request Body (Global Uniform via `markPercent` alias):**
  ```json
  {
    "markPercent": 5.0,
    "currency": "USD"
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Markup settings updated successfully",
    "data": {
      "flightMarkupPercent": 4.0,
      "hotelMarkupPercent": 6.5,
      "defaultMarkupPercent": 5.0,
      "currency": "USD"
    }
  }
  ```

---

## 5. Evaluation: Strengths & Limitations of the Current Build

### Strengths (What works well today):
1. **Dynamic Centralization:** The admin can adjust markups on the fly without server redeployments or restarts.
2. **Granular Separation:** Independent controls for Flights vs. Hotels vs. Default.
3. **Resilient Fallback Hierarchy:** Four tiers of fallbacks prevent server crashes if the database document is missing.
4. **Clean Decoupling:** Downstream modules invoke `settingsService.getMarkupSettings()` rather than hardcoding numbers.
5. **Role-Based Access Control:** Only `admin` and `super_admin` can mutate markup parameters.

### Current Limitations:
1. **Flat / Global Rules Only:** Applies the exact same percentage to all flights regardless of airline (e.g., Saudia vs. Indigo), destination (Domestic vs. International), or booking class (Economy vs. Business).
2. **Database Overhead Under High Load:** Each search and fare-quote hits MongoDB (`Setting.findOne`). With high search volumes, this creates unnecessary database load.
3. **No Audit Trail:** Previous values are overwritten. There is no historical log of who altered margins, when, or why.
4. **No B2B / Channel Differentiation:** Retail B2C customers and B2B travel agents receive the identical markup rate.

---

## 6. Blueprint: How to Build the Perfect Enterprise Markup Engine

To transform the current implementation into a **World-Class Travel Pricing Engine** (comparable to Amadeus, Sabre, or MakeMyTrip), implement the following architectural enhancements:

---

### 1. Multi-Tiered Dynamic Rule Matrix
Instead of a single flat number, replace the single document with a **Rule Evaluation Priority Engine**:

```
[Incoming Pricing Request]
(Product: Flight, Airline: SV, Route: DEL -> JED, Channel: B2C, Class: Economy)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 Rule Evaluation Priority                    │
│                                                             │
│ Priority 1: Specific Airline + Route (e.g., SV DEL-JED = 3%)│ ◀── Matches!
│ Priority 2: Airline Specific (e.g., All SV Flights = 4%)   │
│ Priority 3: Sector Specific (e.g., All International = 5%)  │
│ Priority 4: Channel Default (e.g., B2C Global = 2.5%)       │
│ Priority 5: System Fallback (2.0%)                          │
└─────────────────────────────────────────────────────────────┘
```

#### Recommended Rule Schema (`MarkupRule` Model):
```javascript
{
  ruleName: "Saudi Airlines Umrah Special",
  productType: "flight",          // "flight" | "hotel" | "package" | "visa"
  channel: "b2c",                 // "b2c" | "b2b_agent" | "corporate"
  priority: 10,                   // Higher number evaluated first
  status: "active",               // "active" | "paused"

  // Matching Criteria (Null = Wildcard/Any)
  criteria: {
    airlineCodes: ["SV", "XY"],   // Saudia, Flynas
    routes: [{ origin: "DEL", destination: "JED" }],
    supplierId: "srdv",
    cabinClass: "economy",
    minBaseFare: 10000,
    maxBaseFare: 100000
  },

  // Action
  calculation: {
    type: "percentage",           // "percentage" | "fixed_amount" | "hybrid"
    value: 3.5,                   // 3.5%
    minMarkup: 500,               // Floor cap: Minimum ₹500
    maxMarkup: 2500               // Ceiling cap: Maximum ₹2500
  },

  validFrom: ISODate("2026-01-01"),
  validTo: ISODate("2026-12-31")
}
```

---

### 2. Calculation Types
Enterprise systems support three distinct commercial models:

1. **Percentage Markup:**
   $$\text{Markup} = \text{NetFare} \times \left(\frac{P}{100}\right)$$
2. **Fixed Amount Markup:**
   $$\text{Markup} = \text{FixedAmount per Passenger / per Room Night}$$
3. **Capped Hybrid Markup (Safest for OTAs):**
   $$\text{RawMarkup} = \text{NetFare} \times \left(\frac{P}{100}\right)$$
   $$\text{FinalMarkup} = \max(\text{MinCap}, \min(\text{RawMarkup}, \text{MaxCap}))$$
   *Example:* 3% markup, but at least ₹300 (covers payment gateway costs on cheap tickets) and at most ₹2,500 (prevents overpricing luxury flights).

---

### 3. Sub-Millisecond Redis Caching & Invalidation
To maintain sub-50ms search response times without loading MongoDB:

```
[Search / Pricing Call]
          │
          ▼
[Check Redis Cache: "crm:markup:rules"]
   ├─ Cache HIT (0.5 ms) ──▶ Evaluate rules in memory
   │
   └─ Cache MISS ──────────▶ Fetch from MongoDB
                             Write to Redis with TTL (10 minutes)
```

**Real-Time Invalidation Event:**
When an admin updates markup in CRM:
1. Update MongoDB.
2. Execute `await redisOps.del("crm:markup:rules")`.
3. The very next search reads the fresh rates instantly with zero delay.

---

### 4. Audit Logging & Financial Versioning
Every change in profit margin directly impacts business revenue. Implement a dedicated `MarkupAuditLog`:

```javascript
{
  changedBy: ObjectId("admin_id"),
  adminEmail: "finance.manager@maqam.com",
  timestamp: ISODate("2026-10-07T12:00:00Z"),
  targetSection: "flight",
  previousValue: 2.5,
  newValue: 4.0,
  reason: "High season Umrah peak demand adjustment",
  ipAddress: "103.22.45.10"
}
```

---

### 5. Zero-Leakage Customer vs. Backoffice Transparency

* **For the Customer (Public API):**
  - Customer receives `totalFare`, `taxes`, and `grandTotal`.
  - The markup is seamlessly merged into the published fare.

* **For the Backoffice / CRM Order View:**
  - The internal booking model stores the complete financial breakdown:
  ```json
  {
    "bookingId": "BK-109283",
    "supplierNetFare": 12000,
    "markupApplied": 480,
    "convenienceFee": 200,
    "customerPaid": 12680,
    "netProfitMargin": 480
  }
  ```
  - This allows instant margin reporting, tax reporting, and supplier reconciliation without reverse-calculating percentages.

---

## 7. Implementation Roadmap

| Phase | Milestone | Expected Impact |
| :---: | :--- | :--- |
| **Current State** | Single Global Percentage in CRM (`Setting` model) | Operational baseline, functional fallbacks. |
| **Phase 1** | **Redis Caching Layer** on `getMarkupSettings()` | Eliminates redundant MongoDB lookups on flight searches. |
| **Phase 2** | **Min/Max Floor & Ceiling Caps** | Protects margins on low-cost flights and keeps high-value flights competitive. |
| **Phase 3** | **Audit Log Collection** | Full regulatory and accounting trace of margin updates. |
| **Phase 4** | **Rule-Based Engine (Airline / Route / B2B)** | Unlocks advanced yield management and dynamic corporate pricing. |
