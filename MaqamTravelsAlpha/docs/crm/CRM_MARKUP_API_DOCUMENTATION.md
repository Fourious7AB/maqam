# 📈 CRM Markup API & Pricing Engine Documentation

> **Maqam Travels Alpha — CRM & Back-Office Operations**  
> Technical specification for managing platform profit markups across Flights, Hotels, and Default Services from the CRM Admin Panel.  
> **Route File:** [`modules/crm/settings.routes.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/crm/settings.routes.js)  
> **Controller:** [`modules/crm/settings.controller.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/crm/settings.controller.js)  
> **Validator:** [`modules/crm/crm.validator.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/crm/crm.validator.js) (`validateUpdateMarkup`)  
> **Service Layer:** [`modules/crm/settings.service.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/crm/settings.service.js)  
> **Canonical Base URL:** `/api/v1/crm/setting/markup`  
> **Last Updated:** 2026-10-16

---

## 📑 Table of Contents

1. [Overview & Purpose](#1-overview--purpose)
2. [Global Authentication & Role Guards](#2-global-authentication--role-guards)
3. [Architecture: How Markup Works System-Wide](#3-architecture-how-markup-works-system-wide)
   - [A. Settings Database & Bi-Directional Synchronization](#a-settings-database--bi-directional-synchronization)
   - [B. Dynamic Flight Search & Booking Engine](#b-dynamic-flight-search--booking-engine)
   - [C. Dynamic Hotel Pricing Engine](#c-dynamic-hotel-pricing-engine)
   - [D. Invoice & Tax Calculation Engine](#d-invoice--tax-calculation-engine)
4. [API Endpoints Summary](#4-api-endpoints-summary)
5. [Detailed Endpoint Specifications](#5-detailed-endpoint-specifications)
   - [1. Get CRM Markup (`GET /api/v1/crm/setting/markup`)](#1-get-crm-markup-get-apiv1crmsettingmarkup)
   - [2. Set CRM Markup (`POST /api/v1/crm/setting/markup`)](#2-set-crm-markup-post-apiv1crmsettingmarkup)
   - [3. Full Update Markup (`PUT /api/v1/crm/setting/markup`)](#3-full-update-markup-put-apiv1crmsettingmarkup)
   - [4. Partial Update Markup (`PATCH /api/v1/crm/setting/markup`)](#4-partial-update-markup-patch-apiv1crmsettingmarkup)
   - [5. Backward Compatibility Aliases](#5-backward-compatibility-aliases)
6. [Request Payloads & Field Schemas](#6-request-payloads--field-schemas)
7. [Response Body Examples & Payload Schemas](#7-response-body-examples--payload-schemas)
8. [Error Taxonomy & Responses](#8-error-taxonomy--responses)
9. [Developer & QA Testing Playbook (cURL Commands)](#9-developer--qa-testing-playbook-curl-commands)

---

## 1. Overview & Purpose

The **CRM Markup API** enables administrators to set and retrieve profit margin percentages (`flightMarkupPercent`, `hotelMarkupPercent`, `defaultMarkupPercent`) and operational currency (`currency`) directly from the CRM Admin Panel.

### Key Objectives:
- **Zero Hardcoded Markups:** Eliminates static hardcoded profit values across travel modules.
- **Real-Time Dynamic Pricing:** Flight search, fare quote, fare calendar, and hotel pricing engines query the configured markup dynamically from the database.
- **Admin Control Without Restarts:** Admins and Super Admins can update markups without server redeployments or server restarts.
- **Bi-Directional Database Sync:** Automatically updates both the `markup` and legacy `financial` configuration sections in MongoDB simultaneously.
- **Tax & Invoice Compliance:** Dynamic markup values are preserved in booking records and itemized as Agency Service Fees subject to 18% GST (CGST 9% + SGST 9% / IGST 18%) on generated tax invoices.

---

## 2. Global Authentication & Role Guards

All CRM Markup endpoints require JWT Bearer Authentication.

- **Header**: `Authorization: Bearer <ACCESS_TOKEN>`

| HTTP Method | Canonical Route | Compatibility Aliases | Allowed Roles | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`GET`** | `/api/v1/crm/setting/markup` | `/api/v1/crm/settings/markup`<br/>`/api/v1/crm/markup` | `admin`, `super_admin`, `sales_agent`, `support_agent` | View current platform markup settings |
| **`POST`** | `/api/v1/crm/setting/markup` | `/api/v1/crm/settings/markup`<br/>`/api/v1/crm/markup` | `admin`, `super_admin` | Create or set platform markup settings |
| **`PUT`** | `/api/v1/crm/setting/markup` | `/api/v1/crm/settings/markup`<br/>`/api/v1/crm/markup` | `admin`, `super_admin` | Full update / overwrite of markup parameters |
| **`PATCH`** | `/api/v1/crm/setting/markup` | `/api/v1/crm/settings/markup`<br/>`/api/v1/crm/markup` | `admin`, `super_admin` | Partial update of specific markup fields |

---

## 3. Architecture: How Markup Works System-Wide

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CRM Admin Control Panel                           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                      POST / PUT / PATCH /api/v1/crm/setting/markup
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │    settings.controller.js         │
                     │    validateUpdateMarkup()         │
                     └─────────────────┬─────────────────┘
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │    settings.service.js            │
                     │    updateMarkupSettings()         │
                     └─────────────────┬─────────────────┘
                                       │
                 ┌─────────────────────┴─────────────────────┐
                 ▼                                           ▼
    MongoDB Section: "markup"                   MongoDB Section: "financial"
    { flightMarkupPercent: 3.5, ... }           { flightMarkupPercent: 3.5, ... }
                 │                                           │
                 └─────────────────────┬─────────────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
 ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
 │  flight.service.js  │    │ pricing.service.js  │    │ invoice.service.js  │
 │  getMarkupPercent() │    │getHotelMarkupPercent│    │  Tax & GST (18%)    │
 └──────────┬──────────┘    └──────────┬──────────┘    └──────────┬──────────┘
            │                          │                          │
            ▼                          ▼                          ▼
   Customer Flight Fare       Customer Hotel Rate         A4 Official Invoice
   OfferedFare * (1+m/100)    SupplierPaise * (1+m/100)   Markup + 18% GST itemized
```

### A. Settings Database & Bi-Directional Synchronization
- Stored in the MongoDB `settings` collection ([`modules/crm/settings.model.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/crm/settings.model.js)).
- When an admin updates markup, `updateMarkupSettings()` synchronizes both the `markup` section and the legacy `financial` section simultaneously.
- Built-in fallback defaults (`flightMarkupPercent: 2.5%`, `hotelMarkupPercent: 5.0%`, `defaultMarkupPercent: 5.0%`, `currency: 'USD'`) prevent system failures if settings have not yet been stored in the database.

### B. Dynamic Flight Search & Booking Engine
- Functions in `modules/flights/flight.service.js` query:
  ```javascript
  const markupPercent = await getMarkupPercent();
  ```
- Fares presented to customers automatically include the newly configured markup:
  $$\text{Total Fare} = \text{OfferedFare} \times \left(1 + \frac{\text{flightMarkupPercent}}{100}\right)$$

### C. Dynamic Hotel Pricing Engine
- Functions in `modules/hotels/application/pricing.service.js` query `getHotelMarkupPercent()`:
  ```javascript
  const markupPercent = await getHotelMarkupPercent();
  ```
- Minor currency units (paise for INR) are computed as:
  $$\text{markupMinor} = \text{round}\left(\text{supplierAmountMinor} \times \frac{\text{hotelMarkupPercent}}{100}\right)$$

### D. Invoice & Tax Calculation Engine
- In `modules/invoices/invoice.service.js`, the recorded markup is extracted as the official Agency Service Fee.
- 18% GST (CGST 9% + SGST 9% or IGST 18%) is dynamically computed on the agency service markup:
  $$\text{CGST} = \text{round}(\text{markupAmount} \times 0.09, 2)$$
  $$\text{SGST} = \text{round}(\text{markupAmount} \times 0.09, 2)$$

---

## 4. API Endpoints Summary

| Method | Canonical Route | Compatibility Route | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/crm/setting/markup` | `/api/v1/crm/markup` | Fetch current markup settings (flight, hotel, default, currency) |
| `POST` | `/api/v1/crm/setting/markup` | `/api/v1/crm/markup` | Set markup values from CRM side |
| `PUT` | `/api/v1/crm/setting/markup` | `/api/v1/crm/markup` | Overwrite / update all markup parameters |
| `PATCH` | `/api/v1/crm/setting/markup` | `/api/v1/crm/markup` | Partially update selected markup fields |
| `GET` | `/api/v1/crm/setting/general` | `/api/v1/crm/settings/general` | Get general settings section |

---

## 5. Detailed Endpoint Specifications

### 1. Get CRM Markup (`GET /api/v1/crm/setting/markup`)

Retrieve current active markup configuration for flights, hotels, and default services.

- **URL**: `/api/v1/crm/setting/markup`
- **Method**: `GET`
- **Auth Required**: Yes (`Bearer <token>`)
- **Permissions**: `admin`, `super_admin`, `sales_agent`, `support_agent`

#### Request Headers:
```http
GET /api/v1/crm/setting/markup HTTP/1.1
Host: localhost:5000
Authorization: Bearer <ADMIN_JWT_TOKEN>
Accept: application/json
```

---

### 2. Set CRM Markup (`POST /api/v1/crm/setting/markup`)

Create or set platform markup parameters from the CRM Admin Panel.

- **URL**: `/api/v1/crm/setting/markup`
- **Method**: `POST`
- **Auth Required**: Yes (`Bearer <token>`)
- **Permissions**: `admin`, `super_admin` only
- **Validation**: `validateUpdateMarkup()`

#### Request Body Example:
```json
{
  "flightMarkupPercent": 10.0,
  "hotelMarkupPercent": 8.0,
  "defaultMarkupPercent": 5.0,
  "currency": "USD"
}
```

---

### 3. Full Update Markup (`PUT /api/v1/crm/setting/markup`)

Full overwrite/update of CRM markup parameters.

- **URL**: `/api/v1/crm/setting/markup`
- **Method**: `PUT`
- **Auth Required**: Yes (`Bearer <token>`)
- **Permissions**: `admin`, `super_admin` only

#### Request Body Example:
```json
{
  "flightMarkupPercent": 12.5,
  "hotelMarkupPercent": 15.0,
  "defaultMarkupPercent": 10.0,
  "currency": "USD"
}
```

---

### 4. Partial Update Markup (`PATCH /api/v1/crm/setting/markup`)

Partially update one or more markup fields without altering omitted parameters.

- **URL**: `/api/v1/crm/setting/markup`
- **Method**: `PATCH`
- **Auth Required**: Yes (`Bearer <token>`)
- **Permissions**: `admin`, `super_admin` only

#### Request Body Example (Using `markPercent` universal alias):
```json
{
  "markPercent": 14.0
}
```
*Note: Passing `markPercent` (or `markupPercent`) automatically sets default, flight, and hotel markup fallbacks if they are not explicitly specified in the payload.*

---

### 5. Backward Compatibility Aliases

The following route paths are fully supported via express route aliases:
- `/api/v1/crm/markup` (delegated via `crm.routes.js:L27`)
- `/api/v1/crm/settings/markup` (delegated via `crm.routes.js:L24`)
- `/crm/setting/markup` (fallback without `/api/v1` prefix)

---

## 6. Request Payloads & Field Schemas

Enforced via `validateUpdateMarkup()` in [`modules/crm/crm.validator.js:L347-L363`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/crm/crm.validator.js#L347-L363):

| Field Name | Type | Required | Default Fallback | Description |
| :--- | :---: | :---: | :---: | :--- |
| `flightMarkupPercent` | `Number` | Optional | `2.5` | Profit percentage markup applied on wholesale flight offered fares. |
| `hotelMarkupPercent` | `Number` | Optional | `5.0` | Profit percentage markup applied on supplier hotel room prices. |
| `defaultMarkupPercent`| `Number` | Optional | `5.0` | Default fallback percentage markup for general products. |
| `markPercent` | `Number` | Optional | `2.5` | Universal markup percentage alias (convenience field for CRM UI controls). |
| `markupPercent` | `Number` | Optional | `2.5` | Alternative alias for `markPercent`. |
| `currency` | `String` | Optional | `"USD"` | Platform operating currency (e.g. `"USD"`, `"INR"`). Automatically uppercase. |

---

## 7. Response Body Examples & Payload Schemas

### Standard API Response Envelope

#### HTTP Status: `200 OK`
```json
{
  "success": true,
  "message": "Markup settings retrieved successfully",
  "data": {
    "flightMarkupPercent": 12.5,
    "hotelMarkupPercent": 15,
    "defaultMarkupPercent": 10,
    "currency": "USD"
  }
}
```

#### Field Specifications:

| Property | Type | Description |
| :--- | :--- | :--- |
| `success` | `Boolean` | `true` for successful operations. |
| `message` | `String` | Human-readable response summary. |
| `data.flightMarkupPercent` | `Number` | Active percentage markup for flights (e.g. `12.5` = 12.5%). |
| `data.hotelMarkupPercent` | `Number` | Active percentage markup for hotels (e.g. `15` = 15%). |
| `data.defaultMarkupPercent` | `Number` | Active default percentage markup. |
| `data.currency` | `String` | Operational currency code (`USD`). |

---

## 8. Error Taxonomy & Responses

### 1. `400 Bad Request` — Validation Error
Returned when non-numeric data or empty body payload is sent:
```json
{
  "success": false,
  "message": "flightMarkupPercent must be a number"
}
```

### 2. `401 Unauthorized` — Missing or Invalid JWT Token
Returned when `Authorization` header is missing or token is expired:
```json
{
  "success": false,
  "message": "Access token is missing or invalid"
}
```

### 3. `403 Forbidden` — Insufficient Privileges
Returned when non-admin staff (e.g. `customer` or `sales_agent`) attempts `POST`, `PUT`, or `PATCH`:
```json
{
  "success": false,
  "message": "Forbidden"
}
```

---

## 9. Developer & QA Testing Playbook (cURL Commands)

### 1. Get Current Markup (Canonical Route)
```bash
curl -X GET "http://localhost:5000/api/v1/crm/setting/markup" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json"
```

### 2. Update Flight & Hotel Markups
```bash
curl -X PUT "http://localhost:5000/api/v1/crm/setting/markup" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "flightMarkupPercent": 3.5,
    "hotelMarkupPercent": 7.0,
    "defaultMarkupPercent": 5.0,
    "currency": "USD"
  }'
```

### 3. Set Universal Markup via `markPercent` Alias
```bash
curl -X POST "http://localhost:5000/api/v1/crm/setting/markup" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "markPercent": 10.0,
    "currency": "USD"
  }'
```

### 4. Verify Backward Compatibility Route
```bash
curl -X GET "http://localhost:5000/api/v1/crm/markup" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

### 5. Verify Non-Admin Access Denial
```bash
curl -X PUT "http://localhost:5000/api/v1/crm/setting/markup" \
  -H "Authorization: Bearer <CUSTOMER_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "flightMarkupPercent": 50.0
  }'
```
*(Expected Result: `HTTP 403 Forbidden`)*
