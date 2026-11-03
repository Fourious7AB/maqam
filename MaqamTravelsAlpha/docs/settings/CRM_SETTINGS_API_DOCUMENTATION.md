# ⚙️ CRM Settings & Platform Configuration API Specification

> **Base Route URL:** `/api/v1/crm/setting`  
> **Compatibility Aliases:** `/api/v1/crm/settings` and `/api/v1/settings`  
> **Target Audience:** Frontend Developers, Mobile App Engineers, QA & Integration Engineers, Back-Office Staff  
> **Specification Version:** 2.0.0  
> **Source Code Location:** [`modules/crm/settings.routes.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/crm/settings.routes.js)  
> **Swagger UI Playground:** `http://localhost:5000/api/crm-docs` (Tag: `CRM - Settings & Markup`)

---

## 1. Executive Summary & Architecture

The **CRM Settings Module** manages platform-wide operational configurations for Maqam Travels. It governs:
- **Commercial Markup Engine:** Real-time percentage markups applied to wholesale net flight and hotel inventory.
- **Agency Personal GST (5%):** Dedicated taxation configuration exclusively applying agency personal GST without legacy split taxes.
- **General Company Branding:** Agency contact details, default timezone, operating currency, and support metadata.
- **Booking & Operations Policy:** Seat/room hold deadlines, cancellation grace periods, and automated voucher generation.
- **Omnichannel Notifications:** Email sender identities and SMS dispatch settings.
- **Invoice Generation & Tax Compliance:** Real-time itemization of commercial markups, convenience service fees, SAC codes, and statutory GST across customer invoices.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              CRM SETTINGS ARCHITECTURE                                │
└────────────────────────────────────────────────────────────────────────────────────────┘
                    ┌──────────────────────────────────────────┐
                    │      Client / CRM Dashboard Request      │
                    └─────────────────────┬────────────────────┘
                                          │
                        ┌─────────────────┴─────────────────┐
                        │   Role-Based Guard: authenticate  │
                        │   Read: staff / Write: admin only │
                        └─────────────────┬─────────────────┘
                                          │
         ┌────────────────────────────────┼────────────────────────────────┐
         ▼                                ▼                                ▼
┌──────────────────┐            ┌──────────────────┐             ┌──────────────────┐
│ /markup          │            │ /agency-gst      │             │ /:section        │
│ Flight & Hotel % │            │ Personal GST 5%  │             │ general, booking │
│ Net-to-Sell Sync │            │ Exclusive rate   │             │ Polymorphic JSON │
└────────┬─────────┘            └────────┬─────────┘             └────────┬─────────┘
         │                               │                                │
         └───────────────────────────────┼────────────────────────────────┘
                                         ▼
                        ┌─────────────────────────────────┐
                        │       MongoDB: 'settings'       │
                        │    Fallback to Default Config   │
                        └─────────────────────────────────┘
```

### Architectural Highlights
1. **Polymorphic Storage (`Setting` Model):** Key-value document-per-section pattern (`modules/crm/settings.model.js`) allowing dynamic, non-destructive configuration updates.
2. **Built-in Fallbacks:** If a section has not yet been saved in MongoDB, default values are automatically returned, guaranteeing that the frontend client UI never crashes.
3. **Dual Response Formats:**
   - **Direct Object Mode (Default):** Returns clean JSON directly (e.g. `{ "companyName": "Maqam Travels", ... }`).
   - **Envelope Mode (`?envelope=true`):** Wraps data in the standard platform envelope (`{ success: true, message: "...", data: { ... } }`).
4. **Security & Role Guards:**
   - **Read Operations (`GET`):** Accessible by `admin`, `super_admin`, `sales_agent`, `support_agent`.
   - **Write Operations (`POST`, `PUT`, `PATCH`):** Restricted strictly to `admin` and `super_admin`.

---

## 2. Data Model Schema (`Setting`)

**Model File:** [`modules/crm/settings.model.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/crm/settings.model.js)  
**MongoDB Collection:** `settings`

```typescript
export interface SettingDocument {
  _id: string;
  section: string;         // Unique, lowercase, trimmed identifier (e.g. 'general', 'markup', 'financial')
  data: Record<string, any>; // Polymorphic JSON object containing the section's configuration key-values
  updatedBy?: string;      // Admin User ObjectId who performed the last update
  createdAt: string;       // ISO 8601 creation timestamp
  updatedAt: string;       // ISO 8601 last modified timestamp
}
```

---

## 3. API Endpoints Master Cheat Sheet

All routes require a Bearer JWT token in the `Authorization` header.

| HTTP Method | Canonical Endpoint | Allowed Roles | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/crm/setting` | All Staff | Root settings endpoint. Defaults to retrieving the `general` section. |
| `GET` | `/api/v1/crm/setting/markup` | All Staff | Retrieve commercial flight, hotel, and default markup percentages. |
| `POST` | `/api/v1/crm/setting/markup` | Admin Only | Set / create commercial markup percentages. |
| `PUT` | `/api/v1/crm/setting/markup` | Admin Only | Overwrite / update commercial markup percentages. |
| `PATCH` | `/api/v1/crm/setting/markup` | Admin Only | Partially update commercial markup percentages. |
| `GET` | `/api/v1/crm/setting/agency-gst` | All Staff | Retrieve active agency personal GST rate (alias: `/gst`). |
| `POST` | `/api/v1/crm/setting/agency-gst` | Admin Only | Apply agency personal GST rate (defaults to 5%, alias: `/gst`). |
| `GET` | `/api/v1/crm/setting/:section` | All Staff | Retrieve settings for any named section (`general`, `financial`, `booking`, etc.). |
| `PUT` | `/api/v1/crm/setting/:section` | Admin Only | Full upsert (create/overwrite) of a section's configuration. |
| `PATCH` | `/api/v1/crm/setting/:section` | Admin Only | Partially update specific configuration fields for a section. |

---

## 4. Detailed Endpoint Specifications

### 1. Root Settings Endpoint (Defaults to `general`)

Returns general company branding, currency, and contact information.

* **Method:** `GET`
* **Path:** `/api/v1/crm/setting`
* **Auth:** Bearer Token (`admin`, `super_admin`, `sales_agent`, `support_agent`)
* **Controller:** [`settingsController.getSettings`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/crm/settings.controller.js#L13-L40)

#### Query Parameters:
| Parameter | Type | Default | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `section` | `string` | `general` | No | Target section key | `general` |
| `envelope` | `boolean` | `false` | No | When `true`, wraps payload in standard response envelope | `true` |

#### Request Example:
```http
GET /api/v1/crm/setting?envelope=true HTTP/1.1
Host: api.maqamtravels.com
Authorization: Bearer <STAFF_JWT_TOKEN>
Accept: application/json
```

#### Response Body (`200 OK` — Envelope Mode):
```json
{
  "success": true,
  "message": "Settings for section 'general' retrieved successfully",
  "data": {
    "companyName": "Maqam Travels",
    "supportEmail": "support@maqam.com",
    "supportPhone": "+911180808080",
    "timezone": "Asia/Kolkata",
    "currency": "INR"
  }
}
```

#### Response Body (`200 OK` — Direct Mode, Default):
```json
{
  "companyName": "Maqam Travels",
  "supportEmail": "support@maqam.com",
  "supportPhone": "+911180808080",
  "timezone": "Asia/Kolkata",
  "currency": "INR"
}
```

---

### 2. Commercial Markup Configuration

Manage profit markups added on top of wholesale supplier net fares (SRDV Flights & Hotels).

#### A. Get Current Markup
* **Method:** `GET`
* **Path:** `/api/v1/crm/setting/markup`
* **Auth:** Bearer Token (`admin`, `super_admin`, `sales_agent`, `support_agent`)

##### Response Body (`200 OK`):
```json
{
  "success": true,
  "message": "Markup settings retrieved successfully",
  "data": {
    "flightMarkupPercent": 2.5,
    "hotelMarkupPercent": 5.0,
    "defaultMarkupPercent": 5.0,
    "currency": "INR"
  }
}
```

---

#### B. Set / Update Markup (Admin Only)
* **Methods:** `POST`, `PUT`, `PATCH`
* **Path:** `/api/v1/crm/setting/markup`
* **Auth:** Bearer Token (`admin`, `super_admin`)
* **Validator:** [`validateUpdateMarkup()`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/crm/crm.validator.js)
* **Controller:** [`settingsController.updateMarkup`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/crm/settings.controller.js#L94-L105)

##### Request Body Schema (`application/json`):
| Field | Type | Required | Constraints | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `flightMarkupPercent` | `number` | Optional | `0.00` to `100.00` | Percentage markup applied to net wholesale flight tariffs | `4.5` |
| `hotelMarkupPercent` | `number` | Optional | `0.00` to `100.00` | Percentage markup applied to net wholesale hotel room tariffs | `6.0` |
| `defaultMarkupPercent` | `number` | Optional | `0.00` to `100.00` | Default fallback markup for packages / ancillary services | `5.0` |
| `currency` | `string` | Optional | 3-letter ISO code (`INR`, `USD`, `SAR`, `AED`) | Operating currency | `"INR"` |

##### Request Example:
```http
POST /api/v1/crm/setting/markup HTTP/1.1
Host: api.maqamtravels.com
Authorization: Bearer <ADMIN_JWT_TOKEN>
Content-Type: application/json

{
  "flightMarkupPercent": 3.5,
  "hotelMarkupPercent": 7.0,
  "defaultMarkupPercent": 5.0,
  "currency": "INR"
}
```

##### Response Body (`200 OK`):
```json
{
  "success": true,
  "message": "Markup settings updated successfully",
  "data": {
    "flightMarkupPercent": 3.5,
    "hotelMarkupPercent": 7.0,
    "defaultMarkupPercent": 5.0,
    "currency": "INR"
  }
}
```

##### Synchronized Downstream Effect:
1. Updates the `markup` section in MongoDB.
2. Automatically syncs `flightMarkupPercent`, `hotelMarkupPercent`, and `currency` into the `financial` section for backward compatibility with live pricing engines.

---

### 3. Agency Personal GST Configuration (5%)

Apply or inspect the dedicated agency personal GST rate without default or split taxes.

#### A. Get Agency Personal GST
* **Method:** `GET`
* **Path:** `/api/v1/crm/setting/agency-gst` (Alias: `/api/v1/crm/setting/gst`)
* **Auth:** Bearer Token (`admin`, `super_admin`, `sales_agent`, `support_agent`)

##### Response Body (`200 OK`):
```json
{
  "success": true,
  "message": "Agency personal GST settings retrieved successfully",
  "data": {
    "agencyPersonalGst": 5,
    "isPersonalGstApplied": true,
    "currency": "INR"
  }
}
```

---

#### B. Apply Agency Personal GST (Admin Only)
* **Method:** `POST`
* **Path:** `/api/v1/crm/setting/agency-gst` (Alias: `/api/v1/crm/setting/gst`)
* **Auth:** Bearer Token (`admin`, `super_admin`)
* **Controller:** [`settingsController.applyAgencyGst`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/crm/settings.controller.js#L125-L136)

##### Request Body Schema (`application/json`):
| Field | Type | Default | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `agencyPersonalGst` | `number` | `5` | Optional | Personal GST percentage applied to agency packages | `5` |
| `personalGstTax` | `number` | — | Optional | Alias for `agencyPersonalGst` | `5` |

##### Request Example:
```http
POST /api/v1/crm/setting/agency-gst HTTP/1.1
Host: api.maqamtravels.com
Authorization: Bearer <ADMIN_JWT_TOKEN>
Content-Type: application/json

{
  "agencyPersonalGst": 5
}
```

##### Response Body (`200 OK`):
```json
{
  "success": true,
  "message": "Agency personal GST (5%) applied successfully",
  "data": {
    "agencyPersonalGst": 5,
    "isPersonalGstApplied": true,
    "currency": "INR"
  }
}
```

##### Exclusive Tax Architecture:
Applying this endpoint strips legacy default tax (`taxPercentage`) and split taxes (`cgstPercent`, `sgstPercent`, `igstPercent`) from the `financial` settings section, ensuring the platform invoice engine only charges the clean 5% Personal GST.

---

### 4. Polymorphic Section-Based Settings

Access and manage any arbitrary or built-in configuration section by key.

#### Built-in Section Keys:
1. `general` — Company branding & localization
2. `financial` — Tax rules, markups, base operating currency
3. `booking` — Hold limits, cancellation grace hours, auto-voucher flags
4. `notifications` — Outbound email sender name, reply-to, SMS dispatch

---

#### A. Get Section Settings
* **Method:** `GET`
* **Path:** `/api/v1/crm/setting/:section`
* **Auth:** Bearer Token (`admin`, `super_admin`, `sales_agent`, `support_agent`)
* **Validation:** Section slug must match `/^[a-zA-Z0-9_-]+$/`

##### Request Example:
```http
GET /api/v1/crm/setting/booking HTTP/1.1
Host: api.maqamtravels.com
Authorization: Bearer <STAFF_JWT_TOKEN>
Accept: application/json
```

##### Response Body (`200 OK`):
```json
{
  "holdDeadlineMinutes": 60,
  "cancellationGraceHours": 24,
  "autoVoucherEnabled": true
}
```

---

#### B. Update Section Settings (Full Upsert, Admin Only)
* **Method:** `PUT`
* **Path:** `/api/v1/crm/setting/:section`
* **Auth:** Bearer Token (`admin`, `super_admin`)
* **Validator:** [`validateUpdateSettings()`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/crm/crm.validator.js)

##### Request Example:
```http
PUT /api/v1/crm/setting/general HTTP/1.1
Host: api.maqamtravels.com
Authorization: Bearer <ADMIN_JWT_TOKEN>
Content-Type: application/json

{
  "companyName": "Maqam Travels Elite",
  "supportEmail": "elite.support@maqamtravels.com",
  "supportPhone": "+919876543210",
  "timezone": "Asia/Kolkata",
  "currency": "INR"
}
```

##### Response Body (`200 OK`):
```json
{
  "companyName": "Maqam Travels Elite",
  "supportEmail": "elite.support@maqamtravels.com",
  "supportPhone": "+919876543210",
  "timezone": "Asia/Kolkata",
  "currency": "INR"
}
```

---

#### C. Partially Update Section Settings (Patch, Admin Only)
* **Method:** `PATCH`
* **Path:** `/api/v1/crm/setting/:section`
* **Auth:** Bearer Token (`admin`, `super_admin`)

##### Request Example:
```http
PATCH /api/v1/crm/setting/notifications HTTP/1.1
Host: api.maqamtravels.com
Authorization: Bearer <ADMIN_JWT_TOKEN>
Content-Type: application/json

{
  "smsAlertsEnabled": false
}
```

##### Response Body (`200 OK`):
```json
{
  "emailSenderName": "Maqam Travels Support",
  "replyToEmail": "support@maqam.com",
  "smsAlertsEnabled": false
}
```

---

## 5. Built-in Section Payloads & Fallback Defaults

If a section has not yet been explicitly modified or saved in MongoDB, the service automatically falls back to these default configuration objects:

### A. General Section (`general`)
```json
{
  "companyName": "Maqam Travels",
  "supportEmail": "support@maqam.com",
  "supportPhone": "+911180808080",
  "timezone": "Asia/Kolkata",
  "currency": "INR"
}
```

### B. Financial Section (`financial`)
```json
{
  "currency": "USD",
  "flightMarkupPercent": 2.5,
  "hotelMarkupPercent": 5.0,
  "agencyPersonalGst": 5,
  "isPersonalGstApplied": true
}
```

### C. Booking Policy Section (`booking`)
```json
{
  "holdDeadlineMinutes": 60,
  "cancellationGraceHours": 24,
  "autoVoucherEnabled": true
}
```

### D. Notifications Section (`notifications`)
```json
{
  "emailSenderName": "Maqam Travels Support",
  "replyToEmail": "support@maqam.com",
  "smsAlertsEnabled": true
}
```

---

## 6. Error Taxonomy & Standard Error Payloads

All error responses strictly follow the centralized `ErrorEnvelope` format:

```json
{
  "success": false,
  "message": "Descriptive error message"
}
```

| HTTP Code | Condition | Example Response Body |
| :---: | :--- | :--- |
| **`400 Bad Request`** | Invalid section identifier characters (must match `/^[a-zA-Z0-9_-]+$/`). | `{"success": false, "message": "Invalid section name. Use only letters, numbers, hyphens, and underscores."}` |
| **`400 Bad Request`** | Markup percentage is negative or exceeds 100%. | `{"success": false, "message": "flightMarkupPercent must be a number between 0 and 100"}` |
| **`401 Unauthorized`** | Missing, invalid, or expired Bearer JWT token. | `{"success": false, "message": "Access token is missing or invalid"}` |
| **`403 Forbidden`** | Non-admin user attempts write operation (`PUT`, `POST`, `PATCH`). | `{"success": false, "message": "Forbidden - Insufficient permissions"}` |
| **`500 Server Error`** | Unhandled internal exception or database connection failure. | `{"success": false, "message": "Internal server error"}` |

---

## 7. Developer & QA cURL Testing Playbook

Copy and execute these commands in your shell to test and verify CRM settings:

### 1. Retrieve General Settings
```bash
curl -X GET "http://localhost:5000/api/v1/crm/setting/general" \
  -H "Authorization: Bearer <STAFF_JWT>" \
  -H "Accept: application/json"
```

### 2. Retrieve Settings with Standard Envelope
```bash
curl -X GET "http://localhost:5000/api/v1/crm/setting/general?envelope=true" \
  -H "Authorization: Bearer <STAFF_JWT>"
```

### 3. Retrieve Active Commercial Markup
```bash
curl -X GET "http://localhost:5000/api/v1/crm/setting/markup" \
  -H "Authorization: Bearer <STAFF_JWT>"
```

### 4. Update Commercial Markup Percentages (Admin)
```bash
curl -X PUT "http://localhost:5000/api/v1/crm/setting/markup" \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "flightMarkupPercent": 4.5,
    "hotelMarkupPercent": 7.0,
    "defaultMarkupPercent": 5.0,
    "currency": "INR"
  }'
```

### 5. Check Agency Personal GST (5%) Rate
```bash
curl -X GET "http://localhost:5000/api/v1/crm/setting/agency-gst" \
  -H "Authorization: Bearer <STAFF_JWT>"
```

### 6. Apply Agency Personal GST 5% (Admin)
```bash
curl -X POST "http://localhost:5000/api/v1/crm/setting/agency-gst" \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "agencyPersonalGst": 5
  }'
```

### 7. Partially Update Booking Hold Policy (Admin)
```bash
curl -X PATCH "http://localhost:5000/api/v1/crm/setting/booking" \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "holdDeadlineMinutes": 90,
    "autoVoucherEnabled": false
  }'
```

---

## 8. Frontend Implementation Playbook: Commercial Markup & Agency Personal GST (Zero-Code Guide)

This section provides a complete, conceptual, step-by-step implementation guide for frontend engineers developing the administrative back-office settings interface for Maqam Travels. It details the exact interaction lifecycles, user experience patterns, state transitions, validation boundaries, and role-based permissions without requiring any programming code.

---

### 8.1. Implementing the Commercial Markup Engine (GET, POST, and PATCH)

The commercial markup engine controls the profit margins added dynamically on top of wholesale supplier net tariffs for flights and hotel rooms.

### When and How to Use Each HTTP Method

| HTTP Method | Target Endpoint | When to Dispatch from Frontend UI | UI & Payload Behavior |
| :--- | :--- | :--- | :--- |
| **`GET`** | `/api/v1/crm/setting/markup` | **Initial Page Load / Tab Mount:** Whenever the administrator navigates to the commercial pricing tab or refreshes the page. | Retrieves active percentage values and operating currency. Automatically applies built-in default fallbacks if the database is uninitialized, guaranteeing that form fields are never blank or undefined. |
| **`POST`** | `/api/v1/crm/setting/markup` | **Full Configuration Setup / Form Overwrite:** When an administrator fills in the entire form and clicks the primary save button. | Transmits the full set of fields (flight markup, hotel markup, default markup, and currency) together to establish or completely overwrite the active settings. |
| **`PATCH`** | `/api/v1/crm/setting/markup` | **Quick Partial Updates / Inline Controls:** When modifying an isolated field (e.g., sliding a single markup slider or changing the currency dropdown directly). | Transmits only the specific modified field without requiring the client to resend unchanged properties. The backend retains all other existing values. |



##### Initial Mount, Data Hydration & Fallback Handling (GET)
* When the pricing configuration screen mounts, send an authenticated GET request to the markup endpoint.
* Extract the flight markup, hotel markup, default markup, and currency values from the response payload.
* Populate the controlled form input fields with these received values.
* **Built-in Fallback Assurance:** If the platform is running on a fresh environment where settings have not yet been customized, the backend automatically provides default fallback values (2.5% flight markup, 5.0% hotel markup, 5.0% default markup, and INR currency). Frontend developers do not need to write complex defensive fallback logic against empty responses.
* Store a pristine baseline copy of the loaded data to track form dirty states, keeping the save button disabled until the user makes a change.



#####  Submitting Full Form Updates (POST)
* When the administrator clicks the primary "Save Markup Settings" button, dispatch an authenticated POST request containing all four parameters (flight markup, hotel markup, default markup, and currency).
* Enter a submitting state: display a loading spinner inside the button and temporarily disable input fields to prevent duplicate clicks during network transit.

#####  Submitting Single-Field Partial Updates (PATCH)
* If your user interface incorporates independent controls—such as an auto-saving currency dropdown or an inline quick-adjustment slider for flight margins—dispatch an authenticated PATCH request sending only the changed attribute.
* The backend automatically merges the single updated attribute into the existing configuration without overwriting other parameters.

##### Visual Feedback & Error Recovery
* On receiving a successful 200 OK response, display a green confirmation toast notification stating that commercial markups have been updated and synchronized.
* Update the pristine baseline snapshot with the returned values and return the save button to its disabled clean state.
* In the event of an error (such as network failure or unauthorized access), keep the administrator's inputs intact, show a dismissible error alert explaining the issue, and re-enable the button so they can retry.

##### Role-Based Access Control (RBAC) in the User Interface
* **Sales and Support Staff (Read-Only):** When a staff member without administrator privileges opens this screen, render all input fields and dropdowns in read-only or disabled mode. Completely hide the save action button, or display it with a tooltip clarifying that only administrators possess authority to adjust commercial pricing.
* **Administrators and Super-Administrators (Full Access):** Render all form controls interactively with full write and save capabilities.

#####  Downstream Financial Synchronization & Invoice Impact
* **Dual Database Sync:** Saving markups via the markup endpoints automatically synchronizes values across both the modern markup section and the legacy financial section in MongoDB, maintaining full compatibility across all platform services.
* **Live Booking Engines:** Once saved, every subsequent live flight search and hotel tariff calculation dynamically applies the new margin percentage in real time.
* **Invoicing Compliance:** The markup portion calculated by this setting is itemized on generated A4 PDF tax invoices under the official Agency Service / Convenience Fee line item, and statutory 18% GST is levied exclusively on this service fee.

---

### 8.2. Implementing Agency Personal GST (GET and POST)

The Agency Personal GST setting establishes a clean, unified 5% personal GST tax rule for In-House Umrah and Tour Packages, completely isolating it from traditional airline split taxes.

#### 1. Core Concepts & The Business Problem Solved
* **Single Personal GST vs. Split Taxes:** Airline ticketing and third-party hotel bookings calculate complex split taxes (CGST 9% + SGST 9% or IGST 18% on agency convenience markups). In contrast, in-house pilgrimage packages require a clean, uniform 5% Personal GST calculated on the overall package booking amount.
* **The Exclusive Tax Effect:** Previously, legacy settings stored split taxes and default taxes together, causing duplicate or conflicting line items on invoices. The dedicated agency GST endpoint solves this: calling the POST endpoint activates the clean personal GST rate while automatically stripping legacy default taxes and split taxes from financial settings.

#### 2. Screen Location & Recommended Visual Layout
* **Navigation Placement:** Position this card under the administrative back-office settings panel: **CRM Settings > Taxation & GST** (or **Financial Compliance**).
* **Recommended Visual Form Controls:**
  * **Dynamic Status Badge / Pill:** A prominent visual indicator communicating whether personal GST is active (for example, a green pill badge labeled "Active (5% Agency GST)" or an amber badge labeled "Not Applied").
  * **Tax Rate Input Field:** A numerical percentage input field pre-filled with the current rate (defaulting to 5%).
  * **Informational Compliance Banner:** A clear explanatory note clarifying that applying this setting isolates package tax calculations and deactivates legacy split taxes.
  * **Primary Action Button:** An "Apply 5% Personal GST" (or "Apply Rate") button.

#### 3. When and How to Use Each HTTP Method

| HTTP Method | Target Endpoint | When to Dispatch from Frontend UI | UI & Payload Behavior |
| :--- | :--- | :--- | :--- |
| **`GET`** | `/api/v1/crm/setting/agency-gst`<br/>*(Alias: `/gst`)* | **Initial Page Load / Tab Mount:** Whenever the administrator navigates to the tax settings tab. | Retrieves the active personal GST rate, a boolean status flag indicating if it is applied, and the operating currency. Used to hydrate the status badge and input field. |
| **`POST`** | `/api/v1/crm/setting/agency-gst`<br/>*(Alias: `/gst`)* | **Action Button Click:** When an administrator clicks the "Apply Personal GST" button. | Applies the personal GST percentage (defaults to 5% if payload is omitted). Deactivates legacy split taxes and sets the status to active. |

#### 4. Step-by-Step Frontend Interaction Lifecycle

##### Step 1: Initial Mount & Status Hydration (GET)
* When the taxation configuration tab mounts, send an authenticated GET request to `/api/v1/crm/setting/agency-gst` (or its alias `/gst`).
* Extract the tax rate, the boolean status flag, and the operating currency from the response payload.
* Bind the boolean flag to the status badge: render an active green pill if true, or an inactive warning pill if false.
* Populate the rate input field with the returned percentage. If unconfigured, default the display to 5%.

##### Step 2: Triggering Tax Policy Application (POST)
* When the administrator clicks the "Apply 5% Personal GST" button, dispatch an authenticated POST request to `/api/v1/crm/setting/agency-gst` (or `/gst`).
* Include the desired percentage rate in the request body. If sent with an empty body, the backend automatically defaults to 5%.
* Transition the button into a loading state with a spinner, and disable it to prevent multiple rapid submissions during network transit.

##### Step 3: Visual Feedback & Invoice Assurance
* On receiving a 200 OK success response, display a green confirmation toast notification stating that agency personal GST has been applied successfully and legacy split taxes have been deactivated.
* Immediately switch the status badge to the active state and reflect the applied rate.
* Display an informative confirmation note beneath the card reassuring the administrator that all newly booked in-house packages and generated PDF invoices will now exclusively itemize the single Agency Personal GST line without split CGST or SGST rows.
* If an error occurs, show an error alert, re-enable the button, and retain the previous status badge state.

##### Step 4: Role-Based Access Control (RBAC) in the User Interface
* Sales and support staff have read-only privileges: they can view the active tax percentage and status badge, but the rate input field must be read-only and the action button must be hidden or disabled.
* Only administrators and super-administrators have permission to trigger the POST request to alter or re-apply the tax rate.

##### Step 5: Downstream Invoice Engine Impact
* Once applied, the zero-migration invoice engine automatically retrieves this rate whenever a customer completes a package booking payment.
* On the official executive A4 package tax invoice, a single branded tax row labeled "Agency Personal GST (5%)" is rendered with the exact calculated amount, guaranteeing complete statutory compliance without redundant tax line items.

---

## 9. How Markup & GST Are Calculated and Added onto Customer Invoices

This section details how the commercial markups and agency taxation settings configured via the CRM Settings API dynamically flow into the automated invoice generation engine for Flights, Hotels, and In-House Tour/Umrah Packages. All explanations, itemization rules, and tax equations are presented procedurally without programming code.

---

### 9.1. Core Statutory Principles & Invoice Architecture

In travel and tourism taxation compliance, invoices must clearly distinguish between **intermediary pass-through costs** and **agency value-added revenue**:

1. **Pass-Through Principle (Pure Agent):**
   * Airline wholesale base fares, carrier fuel surcharges, and wholesale hotel accommodation tariffs are pass-through costs collected on behalf of third-party suppliers.
   * Under standard tax regulations, the travel agency does not levy agency GST on airline base fares or hotel room tariffs because the primary suppliers (airlines/hotels) already account for their own statutory taxes.

2. **Taxable Agency Service Principle:**
   * Commercial markups and convenience fees added by Maqam Travels represent the agency's gross commission or service consideration.
   * Statutory 18% GST is levied **exclusively on the agency markup and convenience service fee** for standalone flight and hotel reservations.

3. **Composite In-House Tour Package Principle:**
   * In-house Umrah and tourism packages are bundled services provided directly by the agency.
   * Applying the Agency Personal GST setting establishes an all-inclusive 5% personal GST rate calculated against the overall booking amount, rendered as a single branded tax line without split CGST or SGST rows.

---

### 9.2. Air Ticketing Invoices (Flights)

#### 1. How Markup Is Added
* **Supplier Net Retrieval:** When an airline search or fare quote is executed, the engine retrieves the supplier's net offered fare from the airline reservation system (GDS/LCC).
* **Markup Evaluation:** The flight markup percentage configured in CRM settings (`flightMarkupPercent`, defaulting to 2.5%) is calculated against the net fare:
  * **Markup Amount** = Supplier Net Fare × (Flight Markup Percentage ÷ 100)
* **Customer Gross Fare:** The markup amount is added to the base fare, airline statutory taxes, and passenger ancillary selections (such as excess baggage, meals, and seat selection).
* **Persistence:** The calculated markup amount is stored directly on the booking document under the commercial markup attribute.

#### 2. How GST Is Added
* **Tax Base:** GST is applied **strictly to the agency markup amount**, not to the airline base fare or carrier fuel surcharges.
* **Statutory Rate:** 18% total Goods and Services Tax.
* **Jurisdictional Splitting:**
  * **Intra-State Transactions (Same State as Agency GSTIN):**
    * **CGST (9%)** = Markup Amount × 0.09
    * **SGST (9%)** = Markup Amount × 0.09
  * **Inter-State Transactions (Different State):**
    * **IGST (18%)** = Markup Amount × 0.18
* **Exemption Threshold:** If the commercial markup amount is 0, the agency service tax line items evaluate to 0.00.

#### 3. Invoice Itemization Structure (A4 Flight Tax Invoice)
The generated invoice presents an itemized financial breakdown table structured as follows:

| Invoice Line Item | Statutory Classification / SAC Code | Description & Tax Treatment |
| :--- | :---: | :--- |
| **Airline Base Fare** | SAC 996411 (Domestic) / SAC 996412 (International) | Wholesale base passenger air transportation fare. Pass-through cost. |
| **Airline Taxes & Carrier Fees** | Applicable Airline Surcharges | Government airport taxes, user development fees, and fuel surcharges (YQ/YR). |
| **SSR Ancillary Services** | Passenger Specific Add-ons | Optional baggage allowance, pre-selected in-flight meals, and seat reservation fees. |
| **Agency Convenience & Service Markup** | SAC 998555 (Travel Agency Services) | The commercial markup configured via CRM settings. Taxable agency service revenue. |
| **CGST (9.0%)** | Central Goods & Services Tax | 9% levied solely on the Agency Convenience & Service Markup amount. |
| **SGST (9.0%)** | State Goods & Services Tax | 9% levied solely on the Agency Convenience & Service Markup amount. |
| **IGST (18.0%)** | Integrated Goods & Services Tax | 18% levied on the Markup amount in place of CGST/SGST for inter-state bookings. |
| **Total Invoice Payable** | Final Consumer Total | Sum of Base Fare + Airline Taxes + Ancillaries + Markup Amount + Applicable GST. |

---

### 9.3. Hotel Accommodation Invoices

#### 1. How Markup Is Added
* **Supplier Net Tariff:** The accommodation booking engine receives wholesale net room rates from hotel aggregators.
* **Markup Evaluation:** The hotel markup percentage configured in CRM settings (`hotelMarkupPercent`, defaulting to 5.0%) is applied on top of the wholesale tariff:
  * **Hotel Markup Amount** = Wholesale Room Tariff × (Hotel Markup Percentage ÷ 100)
* **Convenience & Platform Fee:** Any per-booking operational convenience fees are added alongside the commercial markup.
* **Total Agency Service Fee:** The invoice engine combines the markup and convenience fee into a single commercial consideration:
  * **Total Agency Service Fee** = Hotel Markup Amount + Convenience Fee Amount
* **Total Customer Price:** The customer pays the Room Charges plus the Total Agency Service Fee.

#### 2. How GST Is Added
* **Tax Base:** Statutory 18% GST is applied **strictly to the Total Agency Service Fee** (the agency's earnings), leaving the underlying room tariff exempt from double taxation by the agency.
* **Jurisdictional Splitting:**
  * **Intra-State:** CGST 9% on Service Fee + SGST 9% on Service Fee
  * **Inter-State:** IGST 18% on Service Fee

#### 3. Invoice Itemization Structure (A4 Hotel Tax Invoice)

| Invoice Line Item | Statutory Classification / SAC Code | Description & Tax Treatment |
| :--- | :---: | :--- |
| **Room Accommodation Charges** | SAC 996311 (Hotel Accommodation) | Wholesale room stay charges for all booked nights and guest rooms. |
| **Agency Convenience & Service Fee** | SAC 998555 (Tour Operator / Agency Reservation) | Combined commercial markup and convenience fee derived from CRM settings. |
| **CGST (9.0%)** | Central Goods & Services Tax | 9% levied solely on the Agency Convenience & Service Fee. |
| **SGST (9.0%)** | State Goods & Services Tax | 9% levied solely on the Agency Convenience & Service Fee. |
| **IGST (18.0%)** | Integrated Goods & Services Tax | 18% levied on the Service Fee in place of CGST/SGST for inter-state guests. |
| **Total Amount Paid** | Final Consumer Total | Room Charges + Total Agency Service Fee + Applicable GST. |

---

### 9.4. In-House Tour & Umrah Package Invoices

#### 1. How Package Pricing Is Structured
* **All-Inclusive Package Fare:** In-house packages represent comprehensive itineraries combining hotels, visa processing, ground transportation, and ziyarat excursions into a single fixed pilgrim tariff.
* **Optional Tour Guide Add-on:** If a certified religious scholar or tour guide is selected during booking, the dedicated instructor fee is itemized alongside the core package.
* **Base Package Amount:** Total package payment minus the guide fee:
  * **Base Package Fare** = Total Booking Amount Paid − Tour Guide Fee

#### 2. How Agency Personal GST Is Added
* **Dynamic Settings Query:** When generating an Umrah or Tour Package invoice, the engine directly retrieves the active personal GST configuration from the Agency GST settings.
* **Statutory Rate:** 5.0% uniform composite tour operator GST (`agencyPersonalGst`).
* **Tax Calculation:**
  * **Personal GST Amount** = Total Booking Amount Paid × (Agency Personal GST Rate ÷ 100)
  * *Example:* On an Umrah package with a total paid amount of 100,000 INR, a 5% personal GST yields exactly 5,000.00 INR.
* **Exclusive Single-Row Presentation:**
  * Applying the dedicated Agency GST endpoint deactivates legacy split taxes.
  * In-House Package invoices **do not show split CGST or SGST rows**.
  * The invoice renders a single branded tax line: **"Agency Personal GST (5%)"**.

#### 3. Invoice Itemization Structure (A4 Package Tax Invoice)

| Invoice Line Item | Category / Classification | Description & Tax Treatment |
| :--- | :---: | :--- |
| **Base Tour Package Fare** | SAC 998555 (Tour Operator Services) | All-inclusive package tariff covering holy city hotels, flights, and transfers. |
| **Tour Guide & Instructor Add-on** | Optional Religious Scholar Service | Dedicated certified guide fee (rendered only if selected during checkout). |
| **Agency Personal GST (5%)** | Composite Tourism GST | Statutory 5% tax calculated on the total package booking value. Rendered as a single dedicated branded row. |
| **Grand Total Paid** | Confirmed Pilgrim Payment | Total financial consideration received, stamped with payment transaction reference. |

---

### 9.5. Master SAC Code & Tax Matrix

The table below summarizes the Service Accounting Codes (SAC), markup origins, and tax application rules across all platform service verticals:

| Service Vertical | Markup Origin (CRM Setting) | Tax Base Amount | GST Rate | Tax Line Breakdown | SAC Code |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **Flight Bookings** | `flightMarkupPercent` (e.g. 2.5%) | Markup Amount Only | 18% | CGST 9% + SGST 9% (or IGST 18%) | **998555** *(Markup)*<br/>**996411 / 996412** *(Air Fare)* |
| **Hotel Bookings** | `hotelMarkupPercent` (e.g. 5.0%) | Markup + Fee Only | 18% | CGST 9% + SGST 9% (or IGST 18%) | **998555** *(Service Fee)*<br/>**996311** *(Accommodation)* |
| **Tour & Umrah Packages** | Fixed Itinerary Tariff + Add-ons | Total Booking Amount | 5% | Single "Agency Personal GST (5%)" Row *(No CGST/SGST split)* | **998555** *(Tour Operator)* |

---

### 9.6. End-to-End Invoice Generation Workflow

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      END-TO-END INVOICE GENERATION WORKFLOW                            │
└────────────────────────────────────────────────────────────────────────────────────────┘

 [1. CRM Settings Configured]
       │  • Admin sets flightMarkupPercent & hotelMarkupPercent via /api/v1/crm/setting/markup
       │  • Admin applies 5% agencyPersonalGst via /api/v1/crm/setting/agency-gst
       ▼
 [2. Booking & Payment Completed]
       │  • Customer books Flight, Hotel, or Tour Package
       │  • Live pricing engines apply markup percentage during fare quotation
       │  • Payment gateway (Razorpay) confirms transaction; status transitions to CONFIRMED
       ▼
 [3. Invoice Engine Triggered]
       │  • Invoice requested via /api/v1/invoices/:service/:id
       │  • Engine queries booking snapshot & retrieves dynamic tax settings from settingsService
       ▼
 [4. Tax & Markup Itemization Applied]
       │
       ├── FLIGHTS:
       │     Isolate markupAmount ──► Compute 18% GST on markup (CGST 9% + SGST 9% / IGST 18%)
       │
       ├── HOTELS:
       │     Isolate (markupMinor + feeMinor) ──► Compute 18% GST on service fee
       │
       └── PACKAGES:
             Read agencyPersonalGst ──► Compute 5% Personal GST on Total Paid (Single row)
       ▼
 [5. Executive Document Rendered]
          • Generates print-ready A4 HTML/PDF with official Agency GSTIN, PAN, and SAC Codes
          • Stamps customer billing address, pilgrim/passenger manifest, and payment receipt
```

---

### 9.7. Quality Assurance & Tax Compliance Checklist

When verifying invoices generated by the platform, ensure the following audit requirements are satisfied:

1. **No Double Taxation on Pass-Through Fares:** Verify that for flights and hotels, the 18% GST is calculated **only** against the agency service fee and markup amount. The airline base fare, airline taxes, and hotel net room tariff must never have 18% agency tax added on top.
2. **Package Tax Isolation:** Confirm that Umrah and Tour Package invoices display exactly one tax row labeled **"Agency Personal GST (5%)"**. Ensure no legacy default tax rows or split CGST/SGST lines appear.
3. **Statutory Agency Identifiers:** Verify that every generated invoice header displays the agency's official trade name, physical registered address, valid 15-character GSTIN, permanent account number (PAN), and official SAC classification codes.
4. **Dynamic Rate Reflection:** Confirm that if an administrator updates markup or agency GST in CRM settings, all subsequent booking invoices immediately calculate and display taxes according to the updated rate.


