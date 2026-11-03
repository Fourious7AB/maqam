# 📄 Invoice Retrieval & Download API Specification & Frontend Integration Guide

> **Base Route URLs:**  
> - **Customer Invoices Base URL:** `/api/v1/invoices`  
> - **CRM Operations Invoices Base URL:** `/api/v1/crm/invoices` *(Canonical Alias: `/api/v1/invoices/admin`)*  
> **Interactive Swagger UIs:**  
> - **Customer / Platform API Docs:** `http://localhost:5000/api/docs` & `http://localhost:5000/api/v1/invoices/docs` (Tag: `Invoices`)  
> - **Dedicated CRM Swagger UI:** `http://localhost:5000/api/crm-docs` (Tag: `CRM - Invoices` — *isolated strictly to CRM & back-office operations*)  
> **Target Audience:** Frontend Web Developers (React, Next.js, Vue, Angular), Mobile App Engineers, QA Automation Testers, Back-Office CRM Engineers  
> **Specification Version:** 2.1.0  
> **Customer Invoices Source:** [`modules/invoices/invoice.routes.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/invoices/invoice.routes.js), [`invoice.controller.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/invoices/invoice.controller.js), [`invoice.service.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/invoices/invoice.service.js)  
> **CRM Operations Invoices Source:** [`modules/invoices/adminInvoice.routes.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/invoices/adminInvoice.routes.js), [`adminInvoice.controller.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/invoices/adminInvoice.controller.js), [`adminInvoice.service.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/invoices/adminInvoice.service.js)  
> **Frontend Integration Style:** Pure architectural, procedural, and UX state management guide — **strictly zero lines of code**.

---

## 1. Executive Summary & Dual Integration Architecture

The **Invoice System** delivers official, tamper-proof, statutory tax invoices and passenger travel receipts for all confirmed bookings across Maqam Travels. The platform features two core integration delivery channels across all 5 operational verticals (**Tour & Umrah Packages**, **Live Flights**, **Live Hotels**, **In-House Standalone Offers**, and **In-House Visa Services**):

1. **Mode A — Structured JSON Retrieval (`GET /:vertical/:bookingId`)**:  
   Returns normalized, audit-ready JSON data (`application/json`) for frontend SPAs, mobile applications, and CRM portals to render custom invoice UI cards, financial tables, and client-side boarding/tax layouts.
2. **Mode B — File Attachment Download (`GET /:vertical/:bookingId/download`)**:  
   Streams the self-contained HTML invoice document with the HTTP header `Content-Disposition: attachment; filename="<INVOICE_NUMBER>.html"` to trigger native operating system file saving.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             INVOICE RETRIEVAL & DOWNLOAD ARCHITECTURE                            │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
                                   ┌──────────────────────────────────────────────┐
                                   │        Frontend Client Action Trigger        │
                                   │     (Booking Card / CRM Detail View / SPA)   │
                                   └──────────────────────┬───────────────────────┘
                                                          │
                                        ┌─────────────────┴─────────────────┐
                                        │   Dual Authentication Middleware  │
                                        │   Header: Bearer <token>          │
                                        │   OR Query: ?token=<token>        │
                                        └─────────────────┬─────────────────┘
                                                          │
          ┌───────────────────────┬───────────────────────┼───────────────────────┬───────────────────────┐
          ▼                       ▼                       ▼                       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Package Endpoints│    │ Flight Endpoints │    │ Hotel Endpoints  │    │ Offer Endpoints  │    │  Visa Endpoints  │
│ /package/:id     │    │ /flight/:id      │    │ /hotel/:id       │    │ /offer/:id       │    │ /visa/:id        │
│ /package/:id/dl  │    │ /flight/:id/dl   │    │ /hotel/:id/dl    │    │ /offer/:id/dl    │    │ /visa/:id/dl     │
└────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
         │                       │                       │                       │                       │
         ▼                       ▼                       ▼                       ▼                       ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 Deterministic Invoice Number Generator                                 │
│  Package: MT-INV-PKG-YYYYMM-XXXXXX          │  Flight: MT-INV-[LCC|GDS]-YYYYMM-XXXX                    │
│  Hotel:   MT-INV-HTL-YYYYMM-XXXX            │  Offer:  MT-INV-OFR-[FLT|HTL]-YYYYMM-XXXXXX              │
│  Visa:    MT-INV-VSA-YYYYMM-XXXXXX          │                                                          │
└────────────────────────────────────────────────┬───────────────────────────────────────────────────────┘
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                        ▼                                                 ▼
            ┌───────────────────────────┐                     ┌───────────────────────────┐
            │     MODE A: JSON DATA     │                     │  MODE B: FILE ATTACHMENT  │
            │ Content-Type:             │                     │ Content-Type:             │
            │   application/json        │                     │   text/html; charset=utf-8│
            │ Payload:                  │                     │ Header:                   │
            │   Normalized JSON Object  │                     │   Content-Disposition:    │
            │ Usage:                    │                     │     attachment; filename  │
            │   Custom React UI, Mobile │                     │ Usage:                    │
            │   App, CRM Data Tables    │                     │   Native Disk File Save   │
            └───────────────────────────┘                     └───────────────────────────┘
```

### Core Architecture Highlights
* **Zero Database Migrations:** Invoices are dynamically normalized and calculated on the fly directly from existing booking, inventory stock, user profile, and payment records without requiring separate invoice collections.
* **Statutory Compliance & Clean Tax Separation:**
  * **Package Invoices:** Dedicated **5% Agency Personal GST** as a single branded line item, without split CGST/SGST rows.
  * **Flight Invoices:** Applies statutory **18% GST** (CGST 9% + SGST 9% or IGST 18%) strictly to the agency convenience fee / commercial markup with official SAC codes (`996411` domestic, `996412` international).
  * **Hotel Invoices:** Applies statutory **18% GST** strictly to the agency service fee and commercial markup with official SAC code (`996311`).
  * **In-House Retail Offers:** Dynamically itemizes wholesale seat allocation/room allotment cost vs. agency margin, applying SAC `996412` (Flight) or `996311` (Hotel Accommodation).
  * **In-House Visa Services:** Enforces statutory **two-bucket itemization**: non-taxable consular pass-through disbursements vs. taxable agency facilitation fee + 18% GST under SAC `998555`.
* **Flexible Dual-Authentication (`invoiceAuth`):** Supports both standard SPA AJAX requests (`Authorization: Bearer <token>` header) and direct browser link triggers via query parameter (`?token=<token>`).
* **Corporate B2B Tax Invoicing:** Automatically captures Buyer GSTIN, Company Legal Name, and registered billing address when business travel invoicing is enabled (`wantsInvoice: true`).
* **Strict Documentation Segregation (Customer vs. CRM Swagger UI):** Customer-facing invoice retrieval endpoints are documented on `/api/docs` and `/api/v1/invoices/docs`. All CRM back-office operations and administration invoice endpoints are documented **exclusively on the CRM Swagger UI (`/api/crm-docs`)** under Tag `CRM - Invoices`.

---

## 2. Master Quick Reference Matrix

### 2.1 Customer-Facing Invoices (Customer & Portal Access)
*Published on Public / Customer Swagger UI (`/api/docs` & `/api/v1/invoices/docs`)*

| Booking Vertical | Channel / Mode | HTTP Method | Complete API Endpoint Path | Supported Path Identifiers (`:bookingId` / `:id`) | Response Type | Required Access Permissions |
| :--- | :--- | :---: | :--- | :--- | :---: | :--- |
| **Package Booking** | **JSON Retrieval** | `GET` | `/api/v1/invoices/package/:bookingId` | MongoDB `_id` (24-hex), Razorpay Payment ID, or Razorpay Order ID | `application/json` | Booking Owner or Staff |
| **Package Booking** | **Live HTML Preview** | `GET` | `/api/v1/invoices/package/:bookingId/html` | MongoDB `_id` (24-hex), Razorpay Payment ID, or Razorpay Order ID | `text/html` | Booking Owner or Staff |
| **Package Booking** | **File Download** | `GET` | `/api/v1/invoices/package/:bookingId/download` | MongoDB `_id` (24-hex), Razorpay Payment ID, or Razorpay Order ID | `text/html` (attachment) | Booking Owner or Staff |
| **Flight Booking** | **JSON Retrieval** | `GET` | `/api/v1/invoices/flight/:bookingId` | MongoDB `_id` (24-hex), SRDV numeric Booking ID, or 6-char PNR | `application/json` | Booking Owner or Staff |
| **Flight Booking** | **Live HTML Preview** | `GET` | `/api/v1/invoices/flight/:bookingId/html` | MongoDB `_id` (24-hex), SRDV numeric Booking ID, or 6-char PNR | `text/html` | Booking Owner or Staff |
| **Flight Booking** | **File Download** | `GET` | `/api/v1/invoices/flight/:bookingId/download` | MongoDB `_id` (24-hex), SRDV numeric Booking ID, or 6-char PNR | `text/html` (attachment) | Booking Owner or Staff |
| **Hotel Booking** | **JSON Retrieval** | `GET` | `/api/v1/invoices/hotel/:bookingId` | MongoDB `_id` (24-hex), Confirmation No, Booking Ref No, or Provider ID | `application/json` | Booking Owner or Staff |
| **Hotel Booking** | **Live HTML Preview** | `GET` | `/api/v1/invoices/hotel/:bookingId/html` | MongoDB `_id` (24-hex), Confirmation No, Booking Ref No, or Provider ID | `text/html` | Booking Owner or Staff |
| **Hotel Booking** | **File Download** | `GET` | `/api/v1/invoices/hotel/:bookingId/download` | MongoDB `_id` (24-hex), Confirmation No, Booking Ref No, or Provider ID | `text/html` (attachment) | Booking Owner or Staff |
| **In-House Retail Offer** | **JSON Retrieval** | `GET` | `/api/v1/invoices/offer/:bookingId`<br/>*(Alias: `/api/v1/offers/bookings/:id/invoice`)* | Offer Booking MongoDB `_id` (24-hex) or Razorpay Payment ID | `application/json` | Booking Owner or Staff |
| **In-House Retail Offer** | **Live HTML Preview** | `GET` | `/api/v1/invoices/offer/:bookingId/html` | Offer Booking MongoDB `_id` (24-hex) or Razorpay Payment ID | `text/html` | Booking Owner or Staff |
| **In-House Retail Offer** | **File Download** | `GET` | `/api/v1/invoices/offer/:bookingId/download`<br/>*(Alias: `/api/v1/offers/bookings/:id/invoice/download`)* | Offer Booking MongoDB `_id` (24-hex) or Razorpay Payment ID | `text/html` (attachment) | Booking Owner or Staff |
| **In-House Visa Batch** | **JSON Retrieval** | `GET` | `/api/v1/invoices/visa/:groupId`<br/>*(Alias: `/api/v1/visa/user/groups/:id/invoice`)* | Visa Group MongoDB `_id` (24-hex) or Payment ID | `application/json` | Group Submitter or Staff |
| **In-House Visa Batch** | **Live HTML Preview** | `GET` | `/api/v1/invoices/visa/:groupId/html` | Visa Group MongoDB `_id` (24-hex) or Payment ID | `text/html` | Group Submitter or Staff |
| **In-House Visa Batch** | **File Download** | `GET` | `/api/v1/invoices/visa/:groupId/download`<br/>*(Alias: `/api/v1/visa/user/groups/:id/invoice/download`)* | Visa Group MongoDB `_id` (24-hex) or Payment ID | `text/html` (attachment) | Group Submitter or Staff |

---

### 2.2 CRM Operations & Back-Office Invoicing Desk
> **Exclusively published on CRM Swagger UI:** `http://localhost:5000/api/crm-docs` (Tag: `CRM - Invoices`)  
> **Authorized Roles:** `admin`, `super_admin`, `finance`, `sales_agent`, `support_agent`  
> **Security Gate:** Non-staff/customers receive `403 Forbidden` (`"Insufficient permissions"`). Unauthenticated requests receive `401 Unauthorized`.

| Operational Vertical | Action / Mode | HTTP Method | Canonical CRM Endpoint Path | Alias Route Path | Key Query Filters / Parameters | Response Type | Description |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: | :--- |
| **Cross-Vertical** | **Dashboard Summary** | `GET` | `/api/v1/crm/invoices/summary` | `/api/v1/invoices/admin/summary` | None (supports `?token=`) | `application/json` | Platform gross invoiced revenues, total invoice counts, and vertical breakdown. |
| **Tour Packages** | **List Invoices** | `GET` | `/api/v1/crm/invoices/package` | `/api/v1/invoices/admin/package` | `status`, `search`, `startDate`, `endDate`, `page`, `limit` | `application/json` | Paginated Umrah & tour package invoices with customer contact, pilgrim count, and 5% GST. |
| **Tour Packages** | **Invoice Dossier** | `GET` | `/api/v1/crm/invoices/package/:id` | `/api/v1/invoices/admin/package/:id` | `:id` (Booking `_id` or payment ref) | `application/json` | Full structured JSON audit dossier for CRM detail drawer. |
| **Tour Packages** | **Live HTML Preview** | `GET` | `/api/v1/crm/invoices/package/:id/html` | `/api/v1/invoices/admin/package/:id/html` | `:id`, `?token=` (optional) | `text/html` | Printable HTML document for CRM modal `<iframe>` or `window.print()`. |
| **Tour Packages** | **File Attachment** | `GET` | `/api/v1/crm/invoices/package/:id/download` | `/api/v1/invoices/admin/package/:id/download` | `:id`, `?token=` (optional) | `text/html` (attachment) | File download stream with `Content-Disposition`. |
| **Retail Offers** | **List Invoices** | `GET` | `/api/v1/crm/invoices/offer` | `/api/v1/invoices/admin/offer` | `itemType` (`flight`\|`hotel`), `status`, `search`, `page`, `limit` | `application/json` | Paginated wholesale retail deal invoices with inventory snapshot info. |
| **Retail Offers** | **Invoice Dossier** | `GET` | `/api/v1/crm/invoices/offer/:id` | `/api/v1/invoices/admin/offer/:id` | `:id` (Offer Booking `_id`) | `application/json` | Complete JSON dossier with unit allocations. |
| **Retail Offers** | **Live HTML Preview** | `GET` | `/api/v1/crm/invoices/offer/:id/html` | `/api/v1/invoices/admin/offer/:id/html` | `:id`, `?token=` (optional) | `text/html` | Rendered HTML preview for retail offers. |
| **Retail Offers** | **File Attachment** | `GET` | `/api/v1/crm/invoices/offer/:id/download` | `/api/v1/invoices/admin/offer/:id/download` | `:id`, `?token=` (optional) | `text/html` (attachment) | File download stream for retail offer invoice. |
| **In-House Visa** | **List Invoices** | `GET` | `/api/v1/crm/invoices/visa` | `/api/v1/invoices/admin/visa` | `paymentStatus`, `groupStatus`, `search`, `page`, `limit` | `application/json` | Paginated visa batch invoices with applicant count and SAC 998555 split. |
| **In-House Visa** | **Invoice Dossier** | `GET` | `/api/v1/crm/invoices/visa/:id` | `/api/v1/invoices/admin/visa/:id` | `:id` (Visa Group `_id`) | `application/json` | Complete JSON dossier with applicant manifest. |
| **In-House Visa** | **Live HTML Preview** | `GET` | `/api/v1/crm/invoices/visa/:id/html` | `/api/v1/invoices/admin/visa/:id/html` | `:id`, `?token=` (optional) | `text/html` | Rendered HTML preview for visa batches. |
| **In-House Visa** | **File Attachment** | `GET` | `/api/v1/crm/invoices/visa/:id/download` | `/api/v1/invoices/admin/visa/:id/download` | `:id`, `?token=` (optional) | `text/html` (attachment) | File download stream for visa batch invoice. |
| **SRDV Flights** | **List Invoices** | `GET` | `/api/v1/crm/invoices/flight` | `/api/v1/invoices/admin/flight` | `isLCC`, `status`, `search` (PNR/srdvId), `page`, `limit` | `application/json` | Paginated live GDS & LCC flight tax invoices with airline PNRs. |
| **SRDV Flights** | **Invoice Dossier** | `GET` | `/api/v1/crm/invoices/flight/:id` | `/api/v1/invoices/admin/flight/:id` | `:id` (Booking `_id`, PNR, or SRDV ID) | `application/json` | Complete JSON dossier with segment routing and convenience fee GST. |
| **SRDV Flights** | **Live HTML Preview** | `GET` | `/api/v1/crm/invoices/flight/:id/html` | `/api/v1/invoices/admin/flight/:id/html` | `:id`, `?token=` (optional) | `text/html` | Rendered HTML preview with boarding/tax layout. |
| **SRDV Flights** | **File Attachment** | `GET` | `/api/v1/crm/invoices/flight/:id/download` | `/api/v1/invoices/admin/flight/:id/download` | `:id`, `?token=` (optional) | `text/html` (attachment) | File download stream for flight invoice. |
| **SRDV Hotels** | **List Invoices** | `GET` | `/api/v1/crm/invoices/hotel` | `/api/v1/invoices/admin/hotel` | `status`, `search` (hotel/city/confNo), `page`, `limit` | `application/json` | Paginated live hotel accommodation invoices with check-in/out dates. |
| **SRDV Hotels** | **Invoice Dossier** | `GET` | `/api/v1/crm/invoices/hotel/:id` | `/api/v1/invoices/admin/hotel/:id` | `:id` (Booking `_id` or confirmationNo) | `application/json` | Complete JSON dossier with room manifest and SAC 996311 lodging tax. |
| **SRDV Hotels** | **Live HTML Preview** | `GET` | `/api/v1/crm/invoices/hotel/:id/html` | `/api/v1/invoices/admin/hotel/:id/html` | `:id`, `?token=` (optional) | `text/html` | Rendered HTML preview for hotel invoices. |
| **SRDV Hotels** | **File Attachment** | `GET` | `/api/v1/crm/invoices/hotel/:id/download` | `/api/v1/invoices/admin/hotel/:id/download` | `:id`, `?token=` (optional) | `text/html` (attachment) | File download stream for hotel invoice. |

---

## 3. Dedicated Invoice Data Retrieval Endpoints (JSON Payload)

Returns normalized, tamper-proof, and audit-ready tax invoice data formatted in structured JSON (`application/json`). Constructed dynamically on the fly from existing bookings, customer profiles, and payment transaction records. Ideal for single-page applications (React, Next.js, Vue), mobile apps (Flutter, React Native), and back-office CRM dashboards.

---

### 3.1. Package Booking Invoice Retrieval (JSON)

Retrieves normalized tax invoice data for booked Umrah and holiday tour packages, including itinerary snapshot, pilgrims manifest, package inclusions, certified guide add-on, statutory 5% agency personal GST, and payment ledger.

#### HTTP Request Specification
* **HTTP Method:** `GET`
* **Route Path:** `/api/v1/invoices/package/:bookingId`
* **URL Example:** `http://localhost:5000/api/v1/invoices/package/6ab751247fecf3dd5b6c1192`

#### Request Headers
| Header Name | Type | Requirement | Description |
| :--- | :---: | :---: | :--- |
| `Authorization` | String | **Conditional** | Bearer token: `Bearer <jwt_token>`. Required unless the `token` query parameter is provided. |
| `Accept` | String | Optional | Preferred MIME type: `application/json`. |

#### Request Path Parameters
| Parameter | Type | Requirement | Description | Valid Examples |
| :--- | :---: | :---: | :--- | :--- |
| `bookingId` | String | **Required** | Package booking identifier. Supports MongoDB ObjectId, Razorpay Payment ID, or Razorpay Order ID. | `6ab751247fecf3dd5b6c1192`<br/>`pay_Oihw87413k`<br/>`order_Oihw87413k` |

#### Request Query Parameters
| Parameter | Type | Requirement | Description | Valid Examples |
| :--- | :---: | :---: | :--- | :--- |
| `token` | String | Optional | Fallback JWT authentication token when Authorization header cannot be attached. | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

#### Request Body Input
* **Body Content:** **None / Empty** (HTTP `GET` requests do not carry a request body).

---

#### Success Response Specification (`200 OK`)
* **Content-Type:** `application/json; charset=utf-8`

```json
{
  "success": true,
  "message": "Package invoice data retrieved successfully",
  "data": {
    "invoiceNumber": "MT-INV-PKG-202610-1192",
    "bookingReference": "BK-PKG-1192",
    "bookingDate": "12 Oct 2026, 02:15 PM",
    "invoiceDate": "12 Oct 2026, 02:20 PM",
    "bookingStatus": "CONFIRMED",
    "serviceType": "PACKAGE",
    "packageTitle": "15 Days Executive Umrah Package with 5-Star Makkah & Madinah Stay",
    "destination": "Holy Makkah & Madinah",
    "quantity": 2,
    "travelDates": {
      "startDate": "10 Nov 2026",
      "endDate": "24 Nov 2026",
      "durationText": "14 Night(s) / 15 Day(s)"
    },
    "customer": {
      "name": "Zubair Hashmi",
      "email": "zubair.hashmi@example.com",
      "phone": "+91 98765 43210",
      "leadPassengerName": "Mr Zubair Hashmi"
    },
    "assignedAgent": "Maqam Operations Team",
    "inclusions": [
      "Hotel Accommodation",
      "Flight Tickets",
      "Airport Transfers",
      "Ziyarat Tours"
    ],
    "guide": {
      "isSelected": true,
      "location": "Holy Makkah & Madinah",
      "price": "5,000.00"
    },
    "travellers": [
      {
        "index": 1,
        "name": "Mr Zubair Hashmi",
        "paxType": "Adult",
        "gender": "Male",
        "isLead": true,
        "passportNo": "Z9876543",
        "nationality": "Indian"
      },
      {
        "index": 2,
        "name": "Mrs Fatima Hashmi",
        "paxType": "Adult",
        "gender": "Female",
        "isLead": false,
        "passportNo": "Z1234567",
        "nationality": "Indian"
      }
    ],
    "pricing": {
      "currency": "INR",
      "basePackageFare": "1,45,000.00",
      "guideFee": "5,000.00",
      "personalGstRate": 5,
      "personalGstAmount": "7,500.00",
      "totalAmount": "1,50,000.00"
    },
    "payment": {
      "method": "RAZORPAY",
      "transactionId": "pay_Oihw87413k",
      "status": "PAID"
    },
    "agency": {
      "name": "Maqam Travels Private Limited",
      "address": "Worldmark 1, Aerocity, New Delhi, Delhi 110037, India",
      "gstin": "07AAACM1234F1Z8",
      "pan": "AAACM1234F",
      "sacCode": "998555",
      "email": "support@maqamtravels.com",
      "phone": "+91 11 4000 8899",
      "website": "https://maqamtravels.com"
    }
  }
}
```

#### Error Response Payloads (JSON Format)

##### 1. HTTP 400 Bad Request
```json
{
  "success": false,
  "message": "Booking reference or ID is required"
}
```

##### 2. HTTP 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

##### 3. HTTP 403 Forbidden
```json
{
  "success": false,
  "message": "Unauthorized: You can only view invoices for your own bookings"
}
```

##### 4. HTTP 404 Not Found
```json
{
  "success": false,
  "message": "Package booking not found for reference: 6ab751247fecf3dd5b6c1192"
}
```

---

### 3.2. Flight Booking Invoice Retrieval (JSON)

Retrieves normalized flight tax invoice data for live **GDS (Full-Service Carrier)** and **LCC (Low-Cost Carrier)** reservations. Normalizes air transportation fare, airline statutory taxes, SSR ancillaries (baggage, meals, seats), agency convenience markup, corporate B2B GST details, and 18% GST (CGST 9% + SGST 9% or IGST 18%).

#### HTTP Request Specification
* **HTTP Method:** `GET`
* **Route Path:** `/api/v1/invoices/flight/:bookingId`
* **URL Example:** `http://localhost:5000/api/v1/invoices/flight/66a123456789012345678901` or `/789123` (SRDV ID) or `/6E9XYZ` (PNR)

#### Request Headers
| Header Name | Type | Requirement | Description |
| :--- | :---: | :---: | :--- |
| `Authorization` | String | **Conditional** | Bearer token: `Bearer <jwt_token>`. Required unless the `token` query parameter is provided. |
| `Accept` | String | Optional | Preferred MIME type: `application/json`. |

#### Request Path Parameters
| Parameter | Type | Requirement | Description | Valid Examples |
| :--- | :---: | :---: | :--- | :--- |
| `bookingId` | String | **Required** | Flight booking identifier. Supports MongoDB ObjectId, numeric SRDV booking ID, or uppercase airline PNR. | `66a123456789012345678901`<br/>`789123`<br/>`6E9XYZ` |

#### Request Query Parameters
| Parameter | Type | Requirement | Description | Valid Examples |
| :--- | :---: | :---: | :--- | :--- |
| `token` | String | Optional | Fallback JWT authentication token. | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

#### Request Body Input
* **Body Content:** **None / Empty** (HTTP `GET` requests do not carry a request body).

---

#### Success Response Specification (`200 OK`)
* **Content-Type:** `application/json; charset=utf-8`

```json
{
  "success": true,
  "message": "Invoice data retrieved successfully",
  "data": {
    "invoiceNumber": "MT-INV-LCC-202610-2106",
    "supplierInvoiceNumber": "SRDV-INV-998811",
    "invoiceDate": "10 Oct 2026, 03:30 PM",
    "bookingReference": "2106",
    "bookingStatus": "CONFIRMED",
    "serviceType": "LCC",
    "serviceTypeBadge": "LCC (Low-Cost Carrier)",
    "isLCC": true,
    "airlinePnr": "6E9XYZ",
    "gdsPnr": null,
    "placeOfSupply": "Plot 45, Sector 18, Gurugram, Haryana",
    "agency": {
      "name": "Maqam Travels Private Limited",
      "address": "Worldmark 1, Aerocity, New Delhi, Delhi 110037, India",
      "gstin": "07AAACM1234F1Z8",
      "pan": "AAACM1234F",
      "sacCode": "996411",
      "email": "support@maqamtravels.com",
      "phone": "+91 11 4000 8899",
      "website": "https://maqamtravels.com"
    },
    "customer": {
      "name": "Rahul Sharma",
      "email": "rahul.sharma@example.com",
      "phone": "+91 99999 88888",
      "hasCorporateGst": true,
      "companyName": "Acme Corp Technologies Pvt Ltd",
      "gstNumber": "07AAACA1234F1Z1",
      "companyAddress": "Plot 45, Sector 18, Gurugram, Haryana",
      "companyEmail": "tax@acmecorp.com",
      "companyContactNumber": "+91 9876543210"
    },
    "segments": [
      {
        "segmentIndex": 1,
        "airline": "IndiGo (6E-2501)",
        "airlineCode": "6E",
        "flightNumber": "2501",
        "route": "Delhi [DEL] → Ahmedabad [AMD]",
        "departureAirport": "Delhi (DEL) (T3)",
        "departureTime": "15 Oct 2026, 08:00 AM",
        "arrivalAirport": "Ahmedabad (AMD) (T1)",
        "arrivalTime": "15 Oct 2026, 09:35 AM",
        "duration": "1h 35m",
        "cabinClass": "Economy",
        "checkInBaggage": "15 Kg",
        "cabinBaggage": "7 Kg"
      }
    ],
    "passengers": [
      {
        "index": 1,
        "name": "Mr Rahul Sharma",
        "paxType": "Adult",
        "ticketNumber": "6E9XYZ-1",
        "ticketStatus": "OK",
        "seat": "Standard"
      }
    ],
    "pricing": {
      "currency": "INR",
      "baseFare": "3,691.00",
      "taxAmount": "1,465.00",
      "ancillaryCharges": null,
      "baggageCharges": null,
      "mealCharges": null,
      "seatCharges": null,
      "serviceFee": "250.00",
      "cgst": "22.50",
      "sgst": "22.50",
      "igst": null,
      "totalAmount": "5,156.00",
      "raw": {
        "baseFare": 3691,
        "airlineTaxes": 1465,
        "ancillaryCharges": 0,
        "markupAmount": 250,
        "totalAmount": 5156
      }
    },
    "payment": {
      "method": "RAZORPAY",
      "transactionId": "order_Oihw87413k",
      "status": "PAID"
    }
  }
}
```

#### Error Response Payloads (JSON Format)

##### 1. HTTP 400 Bad Request
```json
{
  "success": false,
  "message": "Booking reference or ID is required"
}
```

##### 2. HTTP 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

##### 3. HTTP 403 Forbidden
```json
{
  "success": false,
  "message": "Unauthorized: You can only view invoices for your own bookings"
}
```

##### 4. HTTP 404 Not Found
```json
{
  "success": false,
  "message": "Flight booking not found for reference: 789123"
}
```

---

### 3.3. Hotel Booking Invoice Retrieval (JSON)

Retrieves normalized hotel tax invoice data for live bookings across CRS and aggregator properties. Normalizes room tariff, stay dates, room breakdown, meal plan board, guest manifest, agency service fee, and statutory 18% GST.

#### HTTP Request Specification
* **HTTP Method:** `GET`
* **Route Path:** `/api/v1/invoices/hotel/:bookingId`
* **URL Example:** `http://localhost:5000/api/v1/invoices/hotel/6aba186d6479de9e23668e1f` or `/HTL-PULLMAN-55419` (Confirmation No)

#### Request Headers
| Header Name | Type | Requirement | Description |
| :--- | :---: | :---: | :--- |
| `Authorization` | String | **Conditional** | Bearer token: `Bearer <jwt_token>`. Required unless the `token` query parameter is provided. |
| `Accept` | String | Optional | Preferred MIME type: `application/json`. |

#### Request Path Parameters
| Parameter | Type | Requirement | Description | Valid Examples |
| :--- | :---: | :---: | :--- | :--- |
| `bookingId` | String | **Required** | Hotel booking identifier. Supports MongoDB ObjectId, confirmation number, booking reference number, or provider booking ID. | `6aba186d6479de9e23668e1f`<br/>`HTL-PULLMAN-55419`<br/>`BK-MAQAM-7721` |

#### Request Query Parameters
| Parameter | Type | Requirement | Description | Valid Examples |
| :--- | :---: | :---: | :--- | :--- |
| `token` | String | Optional | Fallback JWT authentication token. | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

#### Request Body Input
* **Body Content:** **None / Empty** (HTTP `GET` requests do not carry a request body).

---

#### Success Response Specification (`200 OK`)
* **Content-Type:** `application/json; charset=utf-8`

```json
{
  "success": true,
  "message": "Hotel invoice data retrieved successfully",
  "data": {
    "invoiceNumber": "MT-INV-HTL-202610-HTLPULLMAN55419",
    "supplierInvoiceNumber": "SRDV-INV-2026-8842",
    "invoiceDate": "12 Oct 2026, 04:00 PM",
    "bookingReference": "BK-MAQAM-7721",
    "confirmationNo": "HTL-PULLMAN-55419",
    "providerBookingId": "SRDV-HTL-99120",
    "bookingStatus": "CONFIRMED",
    "serviceType": "HOTEL",
    "serviceTypeBadge": "Hotel Accommodation",
    "placeOfSupply": "Mecca (Saudi Arabia)",
    "agency": {
      "name": "Maqam Travels Private Limited",
      "address": "Worldmark 1, Aerocity, New Delhi, Delhi 110037, India",
      "gstin": "07AAACM1234F1Z8",
      "pan": "AAACM1234F",
      "sacCode": "998555",
      "email": "support@maqamtravels.com",
      "phone": "+91 11 4000 8899",
      "website": "https://maqamtravels.com"
    },
    "hotel": {
      "name": "Pullman Zamzam Makkah",
      "address": "Abraj Al Bait Complex, King Abdul Aziz Endowment, Mecca 21955, Saudi Arabia",
      "city": "Mecca",
      "state": "Makkah Province",
      "country": "Saudi Arabia",
      "pinCode": "21955",
      "destination": "Mecca, Makkah Province, Saudi Arabia",
      "starRating": 5,
      "starDisplay": "★★★★★",
      "category": "5-Star Luxury Hotel",
      "contactNo": "+966 12 571 5555"
    },
    "stay": {
      "checkIn": "10 Nov 2026",
      "checkInRaw": "2026-11-10T14:00:00.000Z",
      "checkOut": "15 Nov 2026",
      "checkOutRaw": "2026-11-15T11:00:00.000Z",
      "nights": 5,
      "roomsCount": 2,
      "guestsCount": 3,
      "cancellationPolicyText": "Room 1: Free cancellation until 48 hours prior to check-in date. | Room 2: Non-refundable rate policy applies."
    },
    "customer": {
      "name": "Ahmed Khan",
      "email": "ahmed.khan@example.com",
      "phone": "+91 98200 12345"
    },
    "rooms": [
      {
        "index": 1,
        "name": "Deluxe Suite Haram View",
        "mealPlan": "Bed & Breakfast",
        "capacity": 2,
        "pricePerNight": "12,000.00",
        "totalPrice": "60,000.00",
        "refundable": "Refundable"
      },
      {
        "index": 2,
        "name": "Classic Twin Room City View",
        "mealPlan": "Room Only",
        "capacity": 2,
        "pricePerNight": "8,000.00",
        "totalPrice": "40,000.00",
        "refundable": "Non-Refundable"
      }
    ],
    "guests": [
      {
        "index": 1,
        "name": "Mr Ahmed Khan",
        "type": "Adult",
        "isLead": true,
        "phone": "+91 98200 12345",
        "passportNo": "Z9876543"
      },
      {
        "index": 2,
        "name": "Mrs Fatima Khan",
        "type": "Adult",
        "isLead": false,
        "phone": "+91 98200 12345",
        "passportNo": "Z1234567"
      },
      {
        "index": 3,
        "name": "Mstr Zayd Khan",
        "type": "Child",
        "isLead": false,
        "phone": "N/A",
        "passportNo": null
      }
    ],
    "pricing": {
      "currency": "INR",
      "roomCharges": "1,00,000.00",
      "serviceFee": "4,500.00",
      "cgst": "405.00",
      "sgst": "405.00",
      "igst": null,
      "totalAmount": "1,04,500.00",
      "raw": {
        "roomCharges": 100000,
        "serviceFee": 4500,
        "totalPaid": 104500,
        "cgst": 405,
        "sgst": 405,
        "igst": 0
      }
    },
    "payment": {
      "method": "RAZORPAY",
      "transactionId": "order_RZP_HOTEL_9988",
      "status": "PAID"
    }
  }
}
```

#### Error Response Payloads (JSON Format)

##### 1. HTTP 400 Bad Request
```json
{
  "success": false,
  "message": "Booking reference or ID is required"
}
```

##### 2. HTTP 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

##### 3. HTTP 403 Forbidden
```json
{
  "success": false,
  "message": "Unauthorized: You can only view invoices for your own bookings"
}
```

##### 4. HTTP 404 Not Found
```json
{
  "success": false,
  "message": "Hotel booking not found for reference: 6aba186d6479de9e23668e1f"
}
```

---

### 3.4. In-House Standalone Retail Offer Invoices (Flight & Hotel Allocations)

Returns normalized tax invoice and customer receipt data for booked standalone retail flight or hotel offers (`OfferBooking`). Built on top of pre-purchased inventory series (`TicketStock` for group flights or `HotelStock` for contracted hotel room allotments).

#### HTTP Request Specification
* **HTTP Method:** `GET`
* **Canonical Path:** `/api/v1/invoices/offer/:bookingId`
* **Convenience Domain Alias:** `/api/v1/offers/bookings/:id/invoice`
* **URL Example:** `http://localhost:5000/api/v1/invoices/offer/66a987654321fedcba012345`

#### Request Headers
| Header Name | Type | Requirement | Description |
| :--- | :---: | :---: | :--- |
| `Authorization` | String | **Conditional** | Standard JWT Bearer token: `Bearer <jwt_token>`. Required unless the `token` query parameter is provided. |
| `Accept` | String | Optional | Preferred MIME type: `application/json`. |

#### Request Path Parameters
| Parameter | Type | Requirement | Description | Valid Examples |
| :--- | :---: | :---: | :--- | :--- |
| `bookingId` / `id` | String | **Required** | The Offer Booking MongoDB ObjectId or payment transaction ID. | `66a987654321fedcba012345`<br/>`pay_OFR998811` |

#### Request Query Parameters
| Parameter | Type | Requirement | Description | Valid Examples |
| :--- | :---: | :---: | :--- | :--- |
| `token` | String | Optional | Fallback JWT authentication token for scenarios where custom request headers cannot be sent. | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

#### Request Body Input
* **Body Content:** **None / Empty** (HTTP `GET` requests do not carry a request body).

---

#### Success Response Specification (HTTP 200 OK)
* **Response Content-Type:** `application/json; charset=utf-8`

##### Flight Offer Example JSON Payload
```json
{
  "success": true,
  "message": "Offer invoice data retrieved successfully",
  "data": {
    "invoiceNumber": "MT-INV-OFR-FLT-202610-A1B2C3",
    "bookingReference": "OFFER-BK-A1B2C3",
    "customerPnr": "MQM-A1B2C3",
    "airlineGroupPnr": "SVDEL7",
    "bookingDate": "28 Oct 2026, 04:30 PM",
    "invoiceDate": "28 Oct 2026, 04:30 PM",
    "bookingStatus": "CONFIRMED",
    "serviceType": "OFFER_FLIGHT",
    "serviceTypeBadge": "Special In-House Flight Offer",
    "offerItemType": "Flight Inventory",
    "offerTitle": "Delhi to Jeddah Umrah Group Series Special",
    "destination": "Jeddah (JED)",
    "quantity": 2,
    "inclusions": [
      "Series Flight Allocation",
      "Confirmed Group PNR",
      "2x23kg Check-in Baggage"
    ],
    "customer": {
      "name": "Mohammed Ali",
      "email": "ali@example.com",
      "phone": "+91 9876543210"
    },
    "flightDetails": {
      "airline": "Saudia (SV-759)",
      "flightNumber": "SV-759",
      "route": "DEL → JED",
      "departureAirport": "DEL International Airport",
      "departureTime": "15 Nov 2026, 08:00 AM",
      "arrivalAirport": "JED International Airport",
      "arrivalTime": "15 Nov 2026, 12:30 PM",
      "duration": "Direct Series Flight",
      "cabinClass": "Economy",
      "baggage": "2 x 23 KG",
      "cabinBaggage": "7 KG"
    },
    "hotelDetails": null,
    "passengers": [
      {
        "index": 1,
        "name": "MR MOHAMMED ALI",
        "paxType": "ADULT",
        "isLead": true,
        "ticketNumber": "CONFIRMED (Group PNR: SVDEL7)",
        "seatNumber": "Seat Block Unit #001",
        "passportNumberMasked": "••••1234",
        "status": "CONFIRMED"
      },
      {
        "index": 2,
        "name": "MRS FATIMA ALI",
        "paxType": "ADULT",
        "isLead": false,
        "ticketNumber": "CONFIRMED (Group PNR: SVDEL7)",
        "seatNumber": "Seat Block Unit #002",
        "passportNumberMasked": "••••5678",
        "status": "CONFIRMED"
      }
    ],
    "pricing": {
      "currency": "INR",
      "baseFareAmount": "47,500.00",
      "serviceFee": "2,500.00",
      "cgst": "225.00",
      "sgst": "225.00",
      "igst": null,
      "totalAmount": "50,450.00",
      "raw": {
        "baseFare": 47500,
        "serviceFee": 2500,
        "cgst": 225,
        "sgst": 225,
        "totalPaid": 50450
      }
    },
    "payment": {
      "method": "RAZORPAY",
      "transactionId": "pay_OFR998811",
      "status": "PAID"
    },
    "agency": {
      "name": "Maqam Travels Private Limited",
      "address": "Worldmark 1, Aerocity, New Delhi, Delhi 110037, India",
      "gstin": "07AAACM1234F1Z8",
      "pan": "AAACM1234F",
      "sacCode": "996412",
      "email": "support@maqamtravels.com",
      "phone": "+91 11 4000 8899"
    }
  }
}
```

---

### 3.5. In-House Visa Services Batch Invoices (`VisaGroup` & `VisaApplication`)

Returns statutory two-bucket tax invoice data for batch Visa orders. In accordance with government tax regulations:
1. **Consular & Statutory Government Fees:** Treated as **non-taxable pass-through disbursements** without GST.
2. **Agency Processing Margin & Facilitation Fee:** Fully taxable under statutory **18% GST** (9% CGST + 9% SGST under SAC `998555`).

#### HTTP Request Specification
* **HTTP Method:** `GET`
* **Canonical Path:** `/api/v1/invoices/visa/:groupId`
* **Convenience Domain Alias:** `/api/v1/visa/user/groups/:id/invoice`
* **URL Example:** `http://localhost:5000/api/v1/invoices/visa/6711a987654321fedcba9988`

#### Request Headers
| Header Name | Type | Requirement | Description |
| :--- | :---: | :---: | :--- |
| `Authorization` | String | **Conditional** | Standard JWT Bearer token: `Bearer <jwt_token>`. Required unless the `token` query parameter is provided. |
| `Accept` | String | Optional | Preferred MIME type: `application/json`. |

#### Request Path Parameters
| Parameter | Type | Requirement | Description | Valid Examples |
| :--- | :---: | :---: | :--- | :--- |
| `groupId` / `id` | String | **Required** | The VisaGroup batch MongoDB ObjectId or payment reference. | `6711a987654321fedcba9988`<br/>`TXN-VSA-9988` |

#### Request Query Parameters
| Parameter | Type | Requirement | Description | Valid Examples |
| :--- | :---: | :---: | :--- | :--- |
| `token` | String | Optional | Fallback JWT authentication token for browser tabs or iframe embeds. | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

#### Request Body Input
* **Body Content:** **None / Empty** (HTTP `GET` requests do not carry a request body).

---

#### Success Response Specification (HTTP 200 OK)
* **Response Content-Type:** `application/json; charset=utf-8`

##### Visa Batch Example JSON Payload
```json
{
  "success": true,
  "message": "Visa invoice data retrieved successfully",
  "data": {
    "invoiceNumber": "MT-INV-VSA-202610-BA9988",
    "batchReference": "BATCH-VSA-BA9988",
    "bookingDate": "28 Oct 2026, 02:15 PM",
    "invoiceDate": "28 Oct 2026, 02:15 PM",
    "bookingStatus": "CONFIRMED",
    "serviceType": "VISA",
    "serviceTypeBadge": "Visa Processing & Facilitation",
    "destinationCountry": "Saudi Arabia",
    "visaType": "Umrah eVisa (Multiple Entry)",
    "totalApplicants": 2,
    "bookingSource": "Direct Portal Application",
    "customer": {
      "name": "Ahmed Khan",
      "email": "ahmed.khan@example.com",
      "phone": "+91 98200 12345"
    },
    "applicants": [
      {
        "index": 1,
        "applicationNumber": "VSA-APP001",
        "name": "MR AHMED KHAN",
        "passportNumber": "••••4321",
        "nationality": "Indian",
        "status": "APPROVED"
      },
      {
        "index": 2,
        "applicationNumber": "VSA-APP002",
        "name": "MRS SARA KHAN",
        "passportNumber": "••••8765",
        "nationality": "Indian",
        "status": "APPROVED"
      }
    ],
    "pricing": {
      "currency": "INR",
      "governmentFees": "28,000.00",
      "agencyProcessingFee": "5,932.20",
      "cgst": "533.90",
      "sgst": "533.90",
      "igst": null,
      "totalAmount": "35,000.00",
      "raw": {
        "governmentFees": 28000,
        "agencyProcessingFee": 5932.20,
        "cgst": 533.90,
        "sgst": 533.90,
        "totalPaid": 35000
      }
    },
    "payment": {
      "method": "ONLINE PAYMENT",
      "transactionId": "TXN-VSA-BA9988",
      "status": "PAID"
    },
    "agency": {
      "name": "Maqam Travels Private Limited",
      "address": "Worldmark 1, Aerocity, New Delhi, Delhi 110037, India",
      "gstin": "07AAACM1234F1Z8",
      "pan": "AAACM1234F",
      "sacCode": "998555",
      "email": "support@maqamtravels.com",
      "phone": "+91 11 4000 8899"
    }
  }
}
```

---

## 4. Dedicated Invoice Download Endpoints (File Attachment Stream)

---

### 4.1. Package Booking Invoice Download

Downloads the official tax invoice and pilgrim confirmation receipt for Umrah and holiday tour packages as a standalone HTML file attachment.

#### HTTP Request Specification
* **HTTP Method:** `GET`
* **Route Path:** `/api/v1/invoices/package/:bookingId/download`
* **URL Example:** `http://localhost:5000/api/v1/invoices/package/6ab751247fecf3dd5b6c1192/download`

#### Request Headers
| Header Name | Type | Requirement | Description |
| :--- | :---: | :---: | :--- |
| `Authorization` | String | **Conditional** | Standard JWT Bearer token: `Bearer <jwt_token>`. Required unless the `token` query parameter is provided. |
| `Accept` | String | Optional | Preferred MIME type: `text/html, application/json`. |

#### Request Path Parameters
| Parameter | Type | Requirement | Description | Valid Examples |
| :--- | :---: | :---: | :--- | :--- |
| `bookingId` | String | **Required** | The package booking identifier. The system dynamically matches MongoDB ObjectIds or Razorpay transaction references. | `6ab751247fecf3dd5b6c1192`<br/>`pay_Oihw87413k`<br/>`order_Oihw87413k` |

#### Request Query Parameters
| Parameter | Type | Requirement | Description | Valid Examples |
| :--- | :---: | :---: | :--- | :--- |
| `token` | String | Optional | Fallback JWT authentication token for scenarios where custom request headers cannot be sent (e.g. direct browser link downloads or new window triggers). | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

#### Request Body Input
* **Body Content:** **None / Empty** (HTTP `GET` requests do not carry a request body).

---

#### Success Response Specification (HTTP 200 OK)
* **Response Headers:**
  * `Content-Type: text/html; charset=utf-8`
  * `Content-Disposition: attachment; filename="MT-INV-PKG-202610-1192.html"`
  * `Cache-Control: private, no-cache, no-store, must-revalidate`

* **Response Body Structure (HTML Document):**  
  The response body is an executive, self-contained HTML document engineered for direct desktop preview and high-fidelity A4 physical printing. It includes:
  1. **Branded Header & Document Identification:**
     * Agency Name, Logo, Address, Support Email, Helpline Phone, and Statutory GSTIN.
     * Deterministic Tax Invoice Number (e.g., `MT-INV-PKG-202610-1192`).
     * Invoice Issue Date and Booking Timestamp.
     * Booking Reference Code (e.g., `BK-PKG-1192`).
     * Booking Status Badge (e.g., `CONFIRMED`).
  2. **Pilgrim / Billed Customer Profile:**
     * Primary traveler full name, contact email address, phone number.
     * Corporate GST details (Company Name, Buyer GSTIN, Registered Address) if corporate invoicing was requested.
  3. **Package Itinerary & Accommodation Snapshot:**
     * Package Title (e.g., *15 Days Executive Umrah Package*).
     * Destination (e.g., *Holy Makkah & Madinah*).
     * Travel Duration (e.g., *14 Nights / 15 Days*).
     * Travel Dates (Departure Date to Return Date).
     * Assigned Tour Guide / Religious Instructor Details (if selected).
     * Inclusions Tags (e.g., *Hotel Accommodation, Flight Tickets, Airport Transfers, Ziyarat Tours*).
  4. **Pilgrim Passenger Manifest:**
     * Complete tabular listing of all traveling pilgrims.
     * Pilgrim Full Name, Age, Gender, Passport Number, and Room Allocation.
  5. **Itemized Financial Breakdown & Clean Taxation Table:**
     * **Base Tour Package Fare:** Pass-through package consideration covering flights, hotels, and ground transfers.
     * **Tour Guide & Instructor Add-on:** Dedicated certified guide fee (if opted).
     * **Agency Personal GST (5%):** Statutory composite tour operator GST calculated at 5% on the overall package value. Rendered strictly as a single branded line item **without split CGST or SGST rows**.
     * **Total Amount Paid:** Final settled amount in operating currency (INR).
  6. **Payment & Settlement Ledger:**
     * Payment Gateway Name (e.g., `RAZORPAY`).
     * Payment Transaction Reference ID (e.g., `pay_Oihw87413k`).
     * Settlement Status (`PAID`).
  7. **Footer & Compliance Endorsement:**
     * Computer-generated document endorsement (no physical signature required).
     * Print utility trigger note (`Ctrl + P` to save as PDF).

---

#### Error Response Payloads (JSON Format)

When an error occurs during invoice generation, the server returns an `application/json` payload using the standard platform error envelope.

##### 1. HTTP 400 Bad Request
Occurs when the `:bookingId` parameter is missing or invalid.
```json
{
  "success": false,
  "message": "Booking reference or ID is required"
}
```

##### 2. HTTP 401 Unauthorized
Occurs when no valid JWT token is provided via the `Authorization` header or `?token=` query parameter.
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

##### 3. HTTP 403 Forbidden
Occurs when an authenticated customer attempts to download an invoice belonging to another traveler's booking account.
```json
{
  "success": false,
  "message": "Unauthorized: You can only view invoices for your own bookings"
}
```

##### 4. HTTP 404 Not Found
Occurs when no package booking record exists matching the specified identifier.
```json
{
  "success": false,
  "message": "Package booking not found for reference: 6ab751247fecf3dd5b6c1192"
}
```

##### 5. HTTP 500 Internal Server Error
Occurs in the event of an unhandled database exception or template rendering fault.
```json
{
  "success": false,
  "message": "Internal Server Error"
}
```

---

### 4.2. Flight Booking Invoice Download

Downloads the official tax invoice, airline fare summary, and passenger e-receipt for live flight reservations (both GDS Full-Service Carriers and LCC Instant-Ticketing Carriers) as a standalone HTML file attachment.

#### HTTP Request Specification
* **HTTP Method:** `GET`
* **Route Path:** `/api/v1/invoices/flight/:bookingId/download`
* **URL Example:** `http://localhost:5000/api/v1/invoices/flight/789123/download` (SRDV ID) or `/PNR90757/download` (PNR)

#### Request Headers
| Header Name | Type | Requirement | Description |
| :--- | :---: | :---: | :--- |
| `Authorization` | String | **Conditional** | Standard JWT Bearer token: `Bearer <jwt_token>`. Required unless the `token` query parameter is provided. |
| `Accept` | String | Optional | Preferred MIME type: `text/html, application/json`. |

#### Request Path Parameters
| Parameter | Type | Requirement | Description | Valid Examples |
| :--- | :---: | :---: | :--- | :--- |
| `bookingId` | String | **Required** | The flight booking identifier. Supports MongoDB ObjectIds, numeric SRDV booking IDs, or uppercase airline PNRs. | `66a123456789012345678901`<br/>`789123`<br/>`PNR90757` |

#### Request Query Parameters
| Parameter | Type | Requirement | Description | Valid Examples |
| :--- | :---: | :---: | :--- | :--- |
| `token` | String | Optional | Fallback JWT authentication token for direct browser downloads. | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

#### Request Body Input
* **Body Content:** **None / Empty** (HTTP `GET` requests do not carry a request body).

---

#### Success Response Specification (HTTP 200 OK)
* **Response Headers:**
  * `Content-Type: text/html; charset=utf-8`
  * `Content-Disposition: attachment; filename="MT-INV-LCC-202610-789123.html"` (or `MT-INV-GDS-...html`)
  * `Cache-Control: private, no-cache, no-store, must-revalidate`

* **Response Body Structure (HTML Document):**  
  The response body is an executive, self-contained HTML document featuring:
  1. **Branded Header & Flight Type Indicator:**
     * Agency Name, Official Logo, Address, Contact details, and Statutory GSTIN.
     * Carrier Classification Badge: `LCC (Low-Cost Carrier)` or `GDS (Full-Service Carrier)`.
     * Deterministic Tax Invoice Number (e.g., `MT-INV-LCC-202610-789123`).
     * Airline PNR Code (e.g., `PNR90757`) and Supplier Reference Number.
     * Booking Status Badge (e.g., `CONFIRMED` or `TICKETED`).
  2. **Billed Passenger / Corporate Profile:**
     * Primary passenger full name, email, phone number.
     * Corporate GSTIN, Company Name, and Registered Address (if corporate invoicing was requested).
  3. **Flight Route & Segment Details:**
     * Airline Name, Carrier Code, and Flight Number (e.g., `IndiGo 6E-204`).
     * Origin Airport Code, Terminal, and Scheduled Departure Timestamp.
     * Destination Airport Code, Terminal, and Scheduled Arrival Timestamp.
     * Flight Duration, Number of Stops, and Travel Cabin Class (Economy / Business).
  4. **Passenger Travel Manifest:**
     * Table detailing each passenger's Full Name, Traveler Category (Adult, Child, Infant), Ticket Number, Allocated Seat, and Baggage Allowance.
  5. **Itemized Financial Breakdown & Tax Table:**
     * **Airline Base Fare:** Wholesale passenger air transportation fare (SAC 996411/996412).
     * **Airline Taxes & Fuel Surcharges:** Airport departure taxes, passenger user development fees, and carrier fuel surcharges (YQ/YR).
     * **SSR Ancillary Services:** Optional excess baggage, pre-selected in-flight meals, and seat selection fees.
     * **Agency Convenience & Service Markup:** Commercial margin configured via CRM Settings (SAC 998555).
     * **CGST (9.0%) & SGST (9.0%):** Levied strictly on the Agency Convenience Fee for intra-state bookings.
     * **IGST (18.0%):** Levied strictly on the Agency Convenience Fee for inter-state bookings.
     * **Total Amount Paid:** Final aggregate customer payment.
  6. **Payment & Settlement Details:**
     * Payment Gateway (`RAZORPAY`, `PAYPAL`, or `WALLET`).
     * Gateway Transaction ID and Paid Status.

---

#### Error Response Payloads (JSON Format)

##### 1. HTTP 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

##### 2. HTTP 403 Forbidden
```json
{
  "success": false,
  "message": "Unauthorized: You can only view invoices for your own bookings"
}
```

##### 3. HTTP 404 Not Found
```json
{
  "success": false,
  "message": "Flight booking not found for reference: 789123"
}
```

---

### 4.3. Hotel Booking Invoice Download

Downloads the official tax invoice and hotel accommodation receipt for live hotel bookings (both CRS and aggregator properties) as a standalone HTML file attachment.

#### HTTP Request Specification
* **HTTP Method:** `GET`
* **Route Path:** `/api/v1/invoices/hotel/:bookingId/download`
* **URL Example:** `http://localhost:5000/api/v1/invoices/hotel/6aba186d6479de9e23668e1f/download` or `/CONF-88219/download`

#### Request Headers
| Header Name | Type | Requirement | Description |
| :--- | :---: | :---: | :--- |
| `Authorization` | String | **Conditional** | Standard JWT Bearer token: `Bearer <jwt_token>`. Required unless the `token` query parameter is provided. |
| `Accept` | String | Optional | Preferred MIME type: `text/html, application/json`. |

#### Request Path Parameters
| Parameter | Type | Requirement | Description | Valid Examples |
| :--- | :---: | :---: | :--- | :--- |
| `bookingId` | String | **Required** | The hotel booking identifier. Supports MongoDB ObjectIds, confirmation numbers, booking reference numbers, or provider booking IDs. | `6aba186d6479de9e23668e1f`<br/>`CONF-88219`<br/>`HTL-REF-44102` |

#### Request Query Parameters
| Parameter | Type | Requirement | Description | Valid Examples |
| :--- | :---: | :---: | :--- | :--- |
| `token` | String | Optional | Fallback JWT authentication token for direct browser downloads. | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

#### Request Body Input
* **Body Content:** **None / Empty** (HTTP `GET` requests do not carry a request body).

---

#### Success Response Specification (HTTP 200 OK)
* **Response Headers:**
  * `Content-Type: text/html; charset=utf-8`
  * `Content-Disposition: attachment; filename="MT-INV-HTL-202610-88219.html"`
  * `Cache-Control: private, no-cache, no-store, must-revalidate`

* **Response Body Structure (HTML Document):**  
  The response body is an executive, self-contained HTML document featuring:
  1. **Branded Header & Property Details:**
     * Agency Name, Logo, Address, Contact details, and Statutory GSTIN.
     * Hotel Property Name (e.g., *Makkah Clock Royal Tower, A Fairmont Hotel*).
     * Hotel Address, Star Rating, and City / Country.
     * Deterministic Tax Invoice Number (e.g., `MT-INV-HTL-202610-88219`).
     * Confirmation Number and Supplier Booking ID.
  2. **Stay Duration & Accommodation Specifications:**
     * Check-in Date and Check-in Time.
     * Check-out Date and Check-out Time.
     * Total Duration of Stay (calculated nights).
     * Number of Rooms Booked.
     * Room Category (e.g., *Deluxe Haram View Suite*).
     * Meal Plan Board Basis (e.g., *Room Only*, *Bed & Breakfast*, or *Half Board*).
  3. **Guest Manifest:**
     * Lead guest and accompanying guest names, contact details, and special requests.
  4. **Itemized Financial Breakdown & Tax Table:**
     * **Room Accommodation Charges:** Wholesale accommodation tariff for all booked nights (SAC 996311).
     * **Agency Convenience & Service Fee:** Commercial markup and booking fee configured via CRM settings (SAC 998555).
     * **CGST (9.0%) & SGST (9.0%):** Levied strictly on the Agency Service Fee for intra-state bookings.
     * **IGST (18.0%):** Levied strictly on the Agency Service Fee for inter-state bookings.
     * **Total Amount Paid:** Final settled accommodation consideration.
  5. **Cancellation & Refund Policy Summary:**
     * Clear statement of cancellation dead-lines and non-refundable penalties.
  6. **Payment & Settlement Details:**
     * Payment Gateway Name, Transaction ID, and Paid Status.

---

#### Error Response Payloads (JSON Format)

##### 1. HTTP 400 Bad Request
```json
{
  "success": false,
  "message": "Booking reference or ID is required"
}
```

##### 2. HTTP 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

##### 3. HTTP 403 Forbidden
```json
{
  "success": false,
  "message": "Unauthorized: You can only view invoices for your own bookings"
}
```

##### 4. HTTP 404 Not Found
```json
{
  "success": false,
  "message": "Hotel booking not found for reference: 6aba186d6479de9e23668e1f"
}
```

---

### 4.4. In-House Standalone Retail Offer Invoice Download

Downloads the official tax invoice and customer receipt for booked standalone retail flight or hotel offers (`OfferBooking`) as an HTML attachment.

#### HTTP Request Specification
* **HTTP Method:** `GET`
* **Canonical Path:** `/api/v1/invoices/offer/:bookingId/download`
* **Convenience Domain Alias:** `/api/v1/offers/bookings/:id/invoice/download`
* **URL Example:** `http://localhost:5000/api/v1/invoices/offer/66a987654321fedcba012345/download`

#### Request Headers
| Header Name | Type | Requirement | Description |
| :--- | :---: | :---: | :--- |
| `Authorization` | String | **Conditional** | Standard JWT Bearer token: `Bearer <jwt_token>`. Required unless the `token` query parameter is provided. |
| `Accept` | String | Optional | Preferred MIME type: `text/html, application/json`. |

#### Request Path Parameters
| Parameter | Type | Requirement | Description | Valid Examples |
| :--- | :---: | :---: | :--- | :--- |
| `bookingId` / `id` | String | **Required** | The Offer Booking MongoDB ObjectId or payment transaction ID. | `66a987654321fedcba012345`<br/>`pay_OFR998811` |

#### Request Query Parameters
| Parameter | Type | Requirement | Description | Valid Examples |
| :--- | :---: | :---: | :--- | :--- |
| `token` | String | Optional | Fallback JWT authentication token for scenarios where custom request headers cannot be sent (direct browser link download). | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

#### Request Body Input
* **Body Content:** **None / Empty** (HTTP `GET` requests do not carry a request body).

---

#### Success Response Specification (HTTP 200 OK)
* **Response Headers:**
  * `Content-Type: text/html; charset=utf-8`
  * `Content-Disposition: attachment; filename="MT-INV-OFR-FLT-202610-A1B2C3.html"` *(or `...OFR-HTL-...`)*
  * `Cache-Control: private, no-cache, no-store, must-revalidate`

* **Response Body Structure (HTML Document):**  
  The response body is an executive, self-contained HTML document featuring:
  1. **Branded Header & Document Identification:**
     * Agency Name, Logo, Address, Contact details, and Statutory GSTIN.
     * Deterministic Tax Invoice Number (e.g., `MT-INV-OFR-FLT-202610-A1B2C3` or `MT-INV-OFR-HTL-202610-C3D4E5`).
     * Booking Reference and Customer PNR.
     * Booking Status Badge (`CONFIRMED`).
  2. **Offer Component Specifications:**
     * **Flight Variant:** Operating airline, flight number, route sector, master group PNR, departure/arrival airports, flight dates/times, and baggage allowances.
     * **Hotel Variant:** Property name, room category, destination, check-in/out dates, reservation reference, and meal board basis.
  3. **Traveler / Guest Manifest:**
     * Tabular listing of confirmed travelers or guests with seat block allocations or room units, pax types, and masked passport numbers.
  4. **Itemized Financial Breakdown & Tax Table:**
     * Base wholesale consideration (pass-through airline/hotel cost).
     * Agency Service Fee & Markup.
     * CGST (9.0%) & SGST (9.0%) on the agency fee.
     * Total Amount Paid in INR.
  5. **Payment Ledger & Compliance Endorsement:**
     * Payment Gateway, Transaction ID, and Paid Status.

---

### 4.5. In-House Visa Services Batch Invoice Download

Downloads the official statutory tax invoice and applicant batch confirmation for visa applications (`VisaGroup` + `VisaApplication`) as an HTML attachment.

#### HTTP Request Specification
* **HTTP Method:** `GET`
* **Canonical Path:** `/api/v1/invoices/visa/:groupId/download`
* **Convenience Domain Alias:** `/api/v1/visa/user/groups/:id/invoice/download`
* **URL Example:** `http://localhost:5000/api/v1/invoices/visa/6711a987654321fedcba9988/download`

#### Request Headers
| Header Name | Type | Requirement | Description |
| :--- | :---: | :---: | :--- |
| `Authorization` | String | **Conditional** | Standard JWT Bearer token: `Bearer <jwt_token>`. Required unless the `token` query parameter is provided. |
| `Accept` | String | Optional | Preferred MIME type: `text/html, application/json`. |

#### Request Path Parameters
| Parameter | Type | Requirement | Description | Valid Examples |
| :--- | :---: | :---: | :--- | :--- |
| `groupId` / `id` | String | **Required** | The VisaGroup batch MongoDB ObjectId or payment reference. | `6711a987654321fedcba9988`<br/>`TXN-VSA-9988` |

#### Request Query Parameters
| Parameter | Type | Requirement | Description | Valid Examples |
| :--- | :---: | :---: | :--- | :--- |
| `token` | String | Optional | Fallback JWT authentication token for direct browser downloads. | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

#### Request Body Input
* **Body Content:** **None / Empty** (HTTP `GET` requests do not carry a request body).

---

#### Success Response Specification (HTTP 200 OK)
* **Response Headers:**
  * `Content-Type: text/html; charset=utf-8`
  * `Content-Disposition: attachment; filename="MT-INV-VSA-202610-BA9988.html"`
  * `Cache-Control: private, no-cache, no-store, must-revalidate`

* **Response Body Structure (HTML Document):**  
  The response body is an executive, self-contained HTML document featuring:
  1. **Branded Header & Document Identification:**
     * Agency Name, Logo, Address, Helpline Phone, Support Email, and Statutory GSTIN.
     * Deterministic Tax Invoice Number (e.g., `MT-INV-VSA-202610-BA9988`).
     * Batch Reference (e.g., `BATCH-VSA-BA9988`).
     * Booking Source (*Direct Portal Application* or *Tour Package Bundle*).
  2. **Visa Service Specifications:**
     * Destination Country (e.g., *Saudi Arabia*).
     * Visa Category (e.g., *Umrah eVisa - Multiple Entry*).
     * Total Applicants Count in the batch.
  3. **Applicant Manifest:**
     * Tabular listing of all applicants with system Application Number, Full Name, Masked Passport Number, Nationality, and Status (`APPROVED` / `CONFIRMED`).
  4. **Two-Bucket Statutory Tax Breakdown:**
     * **Consular & Statutory Government Fees:** Non-taxable pass-through disbursement without GST.
     * **Agency Processing Margin & Facilitation Fee:** Fully taxable agency margin.
     * **CGST (9.0%) & SGST (9.0%):** Levied strictly on the Agency Processing Margin under SAC `998555`.
     * **Total Amount Paid:** Final settled batch order amount in INR.
  5. **Payment Ledger & Compliance Endorsement:**
     * Payment Gateway, Transaction ID, and Paid Status.

---

## 5. Dedicated CRM Operations & Back-Office Invoicing Desk

> **Interactive CRM Swagger UI:** `http://localhost:5000/api/crm-docs` (Tag: `CRM - Invoices`)  
> **Route Base Path:** `/api/v1/crm/invoices` *(Canonical Alias: `/api/v1/invoices/admin`)*  
> **Target Audience:** CRM Engineers, Operations Staff, Finance Officers, Support Specialists  
> **Swagger Isolation Architecture:** In compliance with enterprise security and portal segregation, all administrative invoice endpoints are indexed **strictly on the CRM Swagger UI (`/api/crm-docs`)** and excluded from the public customer API documentation (`/api/docs` and `/api/v1/invoices/docs`).

---

### 5.0. Cross-Vertical Financial Overview & Summary

Aggregates real-time gross billed revenue, total invoice counts, and vertical-by-vertical breakdowns across all travel verticals to populate the top-level KPI cards of the CRM Invoicing Desk.

#### HTTP Request Specification
* **HTTP Method:** `GET`
* **Route Path:** `/api/v1/crm/invoices/summary` *(Alias: `/api/v1/invoices/admin/summary`)*
* **Headers:** `Authorization: Bearer <TOKEN>` or Query: `?token=<TOKEN>`
* **Required Roles:** `admin`, `super_admin`, `finance`, `sales_agent`, `support_agent`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Invoices summary retrieved successfully",
  "data": {
    "totalInvoicesCount": 96,
    "grandTotalRevenue": 123511737.04,
    "currency": "INR",
    "byVertical": {
      "package": { "totalInvoices": 18, "confirmedRevenue": 2250000 },
      "offer": { "totalInvoices": 14, "confirmedRevenue": 672000 },
      "visa": { "totalInvoices": 12, "confirmedRevenue": 144000 },
      "flight": { "totalInvoices": 11, "confirmedRevenue": 467500 },
      "hotel": { "totalInvoices": 41, "confirmedRevenue": 119978237.04 }
    }
  }
}
```

---

### 5.1. Tour Packages Invoicing Desk (`/package`)

Enables CRM agents and accountants to audit Umrah and holiday tour packages, verify pilgrim counts, and check dedicated **5% Agency Personal GST**.

#### A. List Invoices: `GET /api/v1/crm/invoices/package` *(Alias: `/packages`)*
* **Query Parameters:**
  * `status` *(string)*: `confirmed`, `pending`, `cancelled`
  * `search` *(string)*: Case-insensitive search on package title or destination
  * `startDate` / `endDate` *(ISO Date)*: Date range filter on booking creation
  * `page` *(integer, default: 1)* / `limit` *(integer, default: 10, max: 100)*
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Package invoices retrieved successfully",
  "data": [
    {
      "invoiceNumber": "MT-INV-PKG-202610-6FC4FD",
      "bookingId": "6ae466c96a2368589c6fc4fd",
      "vertical": "package",
      "packageTitle": "Deluxe Umrah 15 Days Series",
      "destination": "Makkah & Madinah",
      "durationDays": 15,
      "quantity": 2,
      "pilgrimCount": 2,
      "customer": {
        "_id": "6ae1ab60437ad9791cf015a2",
        "name": "Mohammad Farooq",
        "email": "farooq@example.com",
        "phone": "+91 9876543210"
      },
      "totalAmount": 250000,
      "currency": "INR",
      "status": "confirmed",
      "issuedAt": "2026-10-25T11:00:00.000Z",
      "links": {
        "viewJson": "/api/v1/crm/invoices/package/6ae466c96a2368589c6fc4fd",
        "viewHtml": "/api/v1/crm/invoices/package/6ae466c96a2368589c6fc4fd/html",
        "download": "/api/v1/crm/invoices/package/6ae466c96a2368589c6fc4fd/download"
      }
    }
  ],
  "meta": { "total": 18, "page": 1, "limit": 10, "totalPages": 2 }
}
```

#### B. Per-Invoice Operations:
* **Structured JSON Dossier:** `GET /api/v1/crm/invoices/package/:id` — Full normalized invoice details for CRM slide-over drawer.
* **Live HTML Preview:** `GET /api/v1/crm/invoices/package/:id/html` — Direct printable HTML for modal `<iframe>` embedding or `window.print()`.
* **File Download:** `GET /api/v1/crm/invoices/package/:id/download` — Native file download stream (`Content-Disposition: attachment; filename="<INVOICE_NUMBER>.html"`).

---

### 5.2. Standalone Retail Offers Invoicing Desk (`/offer`)

Covers wholesale flight deals and hotel room blocks with direct discrete unit allocations.

#### A. List Invoices: `GET /api/v1/crm/invoices/offer` *(Alias: `/offers`)*
* **Query Parameters:**
  * `itemType` *(string)*: `flight` or `hotel`
  * `status` *(string)*: `confirmed`, `pending`, `cancelled`
  * `search` *(string)*: Offer title or destination
  * `page` / `limit`
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Offer invoices retrieved successfully",
  "data": [
    {
      "invoiceNumber": "MT-INV-OFR-FLT-202610-6FC589",
      "bookingId": "6ae466d36a2368589c6fc589",
      "vertical": "offer",
      "itemType": "flight",
      "offerTitle": "Direct Jeddah Umrah Group Allotment",
      "destination": "JED",
      "quantity": 1,
      "travellersCount": 1,
      "customer": {
        "_id": "6ae1ab60437ad9791cf015a2",
        "name": "Zaid Hussain",
        "email": "zaid@example.com",
        "phone": "+91 9123456789"
      },
      "totalAmount": 48000,
      "currency": "INR",
      "status": "confirmed",
      "issuedAt": "2026-10-29T11:15:00.000Z",
      "links": {
        "viewJson": "/api/v1/crm/invoices/offer/6ae466d36a2368589c6fc589",
        "viewHtml": "/api/v1/crm/invoices/offer/6ae466d36a2368589c6fc589/html",
        "download": "/api/v1/crm/invoices/offer/6ae466d36a2368589c6fc589/download"
      }
    }
  ],
  "meta": { "total": 14, "page": 1, "limit": 10, "totalPages": 2 }
}
```

#### B. Per-Invoice Operations:
* **JSON Dossier:** `GET /api/v1/crm/invoices/offer/:id`
* **HTML Preview:** `GET /api/v1/crm/invoices/offer/:id/html`
* **File Download:** `GET /api/v1/crm/invoices/offer/:id/download`

---

### 5.3. In-House Visa Batches Invoicing Desk (`/visa`)

Itemizes consular pass-through disbursements vs. taxable agency facilitation fee + 18% GST under SAC `998555`.

#### A. List Invoices: `GET /api/v1/crm/invoices/visa` *(Alias: `/visas`)*
* **Query Parameters:**
  * `paymentStatus` *(string)*: `paid`, `pending`, `failed`
  * `groupStatus` *(string)*: `processing`, `completed`, `rejected`
  * `search` *(string)*: Destination country or visa type
  * `page` / `limit`
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Visa invoices retrieved successfully",
  "data": [
    {
      "invoiceNumber": "MT-INV-VSA-202610-E38A56",
      "groupId": "6acc986331b967b0cbe38a56",
      "vertical": "visa",
      "destinationCountry": "Saudi Arabia",
      "visaType": "Tourist 30 Days eVisa",
      "totalApplicants": 4,
      "customer": {
        "_id": "6ae1ab60437ad9791cf015a2",
        "name": "Ibrahim Malik",
        "email": "ibrahim@example.com",
        "phone": "+91 9845012345"
      },
      "totalAmount": 48000,
      "currency": "INR",
      "paymentStatus": "paid",
      "groupStatus": "completed",
      "issuedAt": "2026-10-26T16:20:00.000Z",
      "links": {
        "viewJson": "/api/v1/crm/invoices/visa/6acc986331b967b0cbe38a56",
        "viewHtml": "/api/v1/crm/invoices/visa/6acc986331b967b0cbe38a56/html",
        "download": "/api/v1/crm/invoices/visa/6acc986331b967b0cbe38a56/download"
      }
    }
  ],
  "meta": { "total": 12, "page": 1, "limit": 10, "totalPages": 2 }
}
```

#### B. Per-Invoice Operations:
* **JSON Dossier:** `GET /api/v1/crm/invoices/visa/:id`
* **HTML Preview:** `GET /api/v1/crm/invoices/visa/:id/html`
* **File Download:** `GET /api/v1/crm/invoices/visa/:id/download`

---

### 5.4. SRDV Live Flights Invoicing Desk (`/flight`)

Itemizes wholesale base fare, airline taxes, agency service markup, and 18% GST under SAC `996411` / `996412`.

#### A. List Invoices: `GET /api/v1/crm/invoices/flight` *(Alias: `/flights`)*
* **Query Parameters:**
  * `isLCC` *(boolean)*: Filter Low-Cost Carriers (`true`) vs Full-Service GDS (`false`)
  * `status` *(string)*: `confirmed`, `pending`, `cancelled`
  * `search` *(string)*: Airline PNR, GDS PNR, or SRDV Booking ID
  * `page` / `limit`
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Flight invoices retrieved successfully",
  "data": [
    {
      "invoiceNumber": "MT-INV-LCC-202610-2620292",
      "bookingId": "6ae4740b9d20c73be41d1808",
      "vertical": "flight",
      "serviceType": "LCC",
      "isLCC": true,
      "pnr": "XY7K9P",
      "srdvBookingId": "2620292",
      "airline": "IndiGo",
      "flightNumber": "6E-1721",
      "route": "DEL → DXB",
      "customer": {
        "_id": "6ae1ab60437ad9791cf015a2",
        "name": "Mohammad Farooq",
        "email": "farooq@example.com",
        "phone": "+91 9876543210"
      },
      "passengersCount": 1,
      "totalAmount": 42500,
      "currency": "INR",
      "status": "confirmed",
      "issuedAt": "2026-10-28T14:30:00.000Z",
      "links": {
        "viewJson": "/api/v1/crm/invoices/flight/6ae4740b9d20c73be41d1808",
        "viewHtml": "/api/v1/crm/invoices/flight/6ae4740b9d20c73be41d1808/html",
        "download": "/api/v1/crm/invoices/flight/6ae4740b9d20c73be41d1808/download"
      }
    }
  ],
  "meta": { "total": 11, "page": 1, "limit": 10, "totalPages": 2 }
}
```

#### B. Per-Invoice Operations:
* **JSON Dossier:** `GET /api/v1/crm/invoices/flight/:id`
* **HTML Preview:** `GET /api/v1/crm/invoices/flight/:id/html`
* **File Download:** `GET /api/v1/crm/invoices/flight/:id/download`

---

### 5.5. SRDV Live Hotels Invoicing Desk (`/hotel`)

Itemizes stay duration, room inventory manifests, and SAC `996311` room accommodation taxation.

#### A. List Invoices: `GET /api/v1/crm/invoices/hotel` *(Alias: `/hotels`)*
* **Query Parameters:**
  * `status` *(string)*: `CONFIRMED`, `AWAITING_PAYMENT`, `CANCELLED`
  * `search` *(string)*: Hotel name, city, confirmation number, or provider ID
  * `page` / `limit`
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Hotel invoices retrieved successfully",
  "data": [
    {
      "invoiceNumber": "MT-INV-HTL-202610-4A3558",
      "bookingId": "6ae0988e4b05d37bbb4a3558",
      "vertical": "hotel",
      "confirmationNo": "CONF-998811",
      "providerBookingId": "SRDV_HTL_774921",
      "hotelName": "Anantara Downtown Dubai",
      "city": "Dubai",
      "checkIn": "2026-11-10T14:00:00.000Z",
      "checkOut": "2026-11-15T11:00:00.000Z",
      "nights": 5,
      "roomsCount": 1,
      "customer": {
        "_id": "6ae1ab60437ad9791cf015a2",
        "name": "Zaid Hussain",
        "email": "zaid@example.com",
        "phone": "+91 9123456789"
      },
      "totalAmount": 92000,
      "currency": "INR",
      "status": "CONFIRMED",
      "issuedAt": "2026-10-27T09:12:00.000Z",
      "links": {
        "viewJson": "/api/v1/crm/invoices/hotel/6ae0988e4b05d37bbb4a3558",
        "viewHtml": "/api/v1/crm/invoices/hotel/6ae0988e4b05d37bbb4a3558/html",
        "download": "/api/v1/crm/invoices/hotel/6ae0988e4b05d37bbb4a3558/download"
      }
    }
  ],
  "meta": { "total": 41, "page": 1, "limit": 10, "totalPages": 5 }
}
```

#### B. Per-Invoice Operations:
* **JSON Dossier:** `GET /api/v1/crm/invoices/hotel/:id`
* **HTML Preview:** `GET /api/v1/crm/invoices/hotel/:id/html`
* **File Download:** `GET /api/v1/crm/invoices/hotel/:id/download`

---

### 5.6. CRM Security, RBAC & Dual-Authentication Enforcement

1. **Staff Role Guard**:
   * All `/api/v1/crm/invoices/*` routes are protected by `authorize('admin', 'super_admin', 'finance', 'sales_agent', 'support_agent')`.
   * Logged-in customers (`role: 'customer'`) receive **`403 Forbidden`** with `"Insufficient permissions"`.
   * Unauthenticated requests receive **`401 Unauthorized`** with `"Authentication token missing"`.
2. **Dual-Authentication Integration (`invoiceAuth`)**:
   * **Programmatic AJAX Requests:** Frontend CRM applications send standard `Authorization: Bearer <TOKEN>` headers.
   * **Direct Browser Tab Previews & File Downloads:** When opening invoice previews in modal iframes or triggering native file downloads via anchor tags, append `?token=<TOKEN>` to the URL. The `invoiceAuth` middleware automatically normalizes this into `req.headers.authorization = "Bearer <TOKEN>"`.

---

## 6. Frontend Implementation Guide (Zero-Code Architecture)

> **Important Constraint Notice:** As requested, this implementation guide is presented **strictly without writing any lines of code**. It details the comprehensive architectural, procedural, state management, and user experience requirements needed by frontend engineering teams to successfully implement the invoice download functionality.

---

### 6.1. User Interface Placement & Trigger Points

Frontend applications should position the invoice download action at intuitive touchpoints throughout the user journey:

1. **Post-Booking Confirmation & Thank You Screens:**
   * Immediately after successful payment settlement, render a prominent secondary action button: **"Download Tax Invoice"** alongside the primary **"View Itinerary"** button.
2. **Customer Self-Service Portal ("My Bookings" / History Tab):**
   * On every confirmed booking summary card (Flight, Hotel, or Package), display an action menu or dedicated icon button with an invoice document icon and tooltip: **"Download Invoice (.html)"**.
3. **Back-Office CRM & Admin Booking Detail Drawers:**
   * In the top-right action header of the Booking Management drawer, render an **"Export Invoice"** button available to operational agents, customer support staff, and accountants.
4. **Interactive Invoices Data Table:**
   * On dedicated financial and accounting ledger views, provide a download action icon on each row linking to the corresponding vertical download endpoint.

#### Recommended Visual States for the Download Button
* **Default / Idle State:** Displays an invoice icon paired with clear label text (e.g., *"Download Invoice"*). The button is fully clickable.
* **Loading / Pending State:** Upon user click, immediately replace the invoice icon with an animated spinning activity indicator, change the label to *"Generating Invoice..."*, and disable the button to prevent duplicate click submissions during network transit.
* **Success State:** Briefly flash a green checkmark icon with text *"Downloaded"*, before returning to the default idle state after a short delay (e.g., 2 seconds).
* **Error / Retry State:** If the download fails, restore the button to an active clickable state, display a red alert indicator or toast notification, and update the tooltip to prompt the user to retry.

---

### 6.2. Two Architectural Integration Strategies

Frontend applications have two distinct approaches for triggering file downloads from the backend. The engineering team should select the appropriate strategy based on the application architecture:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         DOWNLOAD INTEGRATION STRATEGIES                                │
└────────────────────────────────────────────────────────────────────────────────────────┘

  STRATEGY 1: In-Memory Fetch & Blob Pipeline            STRATEGY 2: Direct Anchor / Tab
  (Recommended for Modern SPAs)                         (Lightweight External Trigger)

  [User Clicks "Download Invoice"]                      [User Clicks "Download Invoice"]
                 │                                                     │
                 ▼                                                     ▼
    [Set Button Loading = true]                         [Construct Direct URL with Token]
                 │                                      /api/v1/invoices/:type/:id/download
                 ▼                                                  ?token=<JWT>
  [Authenticated Fetch with Bearer]                                    │
  GET /api/v1/invoices/:type/:id/download                              ▼
  Headers: { Authorization: 'Bearer ...' }              [Open Hidden Iframe / Direct Link]
                 │                                                     │
                 ▼                                                     ▼
      [Inspect HTTP Response]                           [Browser Handles Native Download]
       Status == 200 & text/html?                                      │
        ├── YES: Create Blob Pipeline                   * Caveats: Token visible in URL,
        └── NO: Parse JSON Error Toast                             cannot display error toasts
```

---

#### Strategy 1: Programmatic In-Memory Fetch & Blob Pipeline (Recommended for SPAs)

This strategy is the industry standard for secure Single Page Applications (React, Next.js, Vue, Angular) because the JWT bearer token is transmitted securely via HTTP request headers without ever being exposed in the browser URL bar or history.

##### Procedural Execution Lifecycle
1. **User Interaction Event:** The customer clicks the "Download Invoice" button. The frontend captures the booking identifier and vertical type (`package`, `flight`, or `hotel`).
2. **State Transition:** The application transitions the local UI component into a loading state, activating a spinner and disabling the button.
3. **Authenticated Network Request:** The application dispatches an HTTP `GET` request to the target download endpoint, attaching the active JWT access token in the `Authorization` header with the `Bearer` scheme.
4. **Defensive Anti-Corruption Validation Gate (Critical):**
   * **The Problem:** If an error occurs (such as an expired session or booking not found), the backend responds with a JSON error payload (`application/json`). If the frontend blindly treats every response as a downloadable file, the browser will save the error JSON into an `.html` file, confusing the user.
   * **The Solution:** The frontend client **must inspect the HTTP response status code and the `Content-Type` header** before initiating any file creation:
     * **If Status is 200 OK and `Content-Type` contains `text/html`:** Proceed to the Blob generation pipeline.
     * **If Status is 4xx/5xx or `Content-Type` contains `application/json`:** Parse the response body as JSON, extract the `message` attribute, display a user-friendly error toast notification, and abort the file save pipeline.
5. **Dynamic Filename Resolution:**
   * The application reads the HTTP `Content-Disposition` header from the response.
   * It extracts the official invoice filename specified by the server (e.g., `MT-INV-PKG-202610-1192.html`).
   * If the header is missing or unreadable due to browser cross-origin masking, the application applies a deterministic fallback filename combining the vertical type and booking identifier (e.g., `Invoice-Package-6ab75124.html`).
6. **In-Memory Blob Creation:** The application consumes the raw response stream and instantiates an in-memory binary Blob specifying the explicit MIME type `text/html;charset=utf-8`.
7. **Virtual DOM Trigger & Memory Lifecycle Management:**
   * The application creates a temporary Object URL referencing the in-memory Blob.
   * It instantiates a hidden virtual anchor DOM element, sets its target href to the Object URL, and assigns the resolved filename to its download attribute.
   * It programmatically dispatches a synthetic click event on the virtual anchor element, instructing the operating system and browser to save the file to the user's local Downloads directory.
   * **Crucial Memory Cleanup:** Immediately after triggering the download, the application explicitly revokes the Object URL to free the allocated browser memory and prevent client-side memory leaks.
8. **UI State Restoration:** The button transitions from the loading state back to the idle state.

---

#### Strategy 2: Direct Anchor Link / Window Trigger via Query Parameter (`?token=`)

This alternative approach is suitable for simple HTML pages, email notifications, external portals, or quick prototypes where complex JavaScript state management is unnecessary.

##### Procedural Execution Lifecycle
1. **URL Construction:** The frontend application constructs the download URL by concatenating the base API path, vertical type, booking identifier, `/download` sub-path, and the user's active session token as a query parameter (e.g., `/api/v1/invoices/package/6ab75124/download?token=<jwt_token>`).
2. **Download Trigger:**
   * The application can bind this constructed URL directly to the `href` attribute of a standard hyperlink tag with the `download` attribute.
   * Alternatively, it can dynamically trigger a hidden iframe or background tab to initiate the download.
3. **Native Browser Handling:** When clicked, the browser sends the request directly to the backend. The backend's `invoiceAuth` middleware detects the `?token=` parameter, automatically elevates it into a Bearer authorization token, verifies the user's session, and streams the file attachment with the appropriate `Content-Disposition` header.

##### Architectural Trade-offs & Security Considerations
* **Advantages:** Extremely lightweight; requires zero client-side JavaScript memory management or Blob handling.
* **Security Caveats:** Transmitting JWT tokens in URL query strings can lead to token logging in browser navigation history, web server proxy access logs, and referrer headers.
* **User Experience Limitation:** If the request fails (e.g., 401 or 404), the browser will open a raw JSON error message in a new tab or trigger a download of the error JSON file, rather than displaying an in-app error toast.

---

### 6.3. Defensive Error Handling & User Notification Matrix

When an invoice download request fails, the frontend application should intercept the HTTP status code and present clear, actionable feedback to the user:

| HTTP Status Code | Root Cause in Backend | Recommended User Interface Feedback / Notification | Required Recovery Action |
| :---: | :--- | :--- | :--- |
| **`400 Bad Request`** | Booking identifier is malformed, missing, or invalid. | **Toast Warning:** *"Unable to generate invoice: Invalid booking reference. Please refresh the page and try again."* | Prevent button clicks if the booking reference is null or undefined. |
| **`401 Unauthorized`** | User session has expired or authentication token is missing/invalid. | **Toast Alert / Modal:** *"Your session has expired. Please log in again to download your invoice."* | Redirect the user to the login screen, preserving the current page URL for return redirection. |
| **`403 Forbidden`** | A logged-in customer is attempting to download an invoice belonging to another traveler's booking. | **Toast Alert:** *"Access denied: You are only authorized to view and download invoices for your own bookings."* | Hide download buttons for records not owned by the current user unless the user holds an administrative role. |
| **`404 Not Found`** | Booking record does not exist in the database, or payment has not been completed. | **Toast Warning:** *"Invoice not found: This booking does not exist or has not yet reached a confirmed payment status."* | Check booking status before enabling the download action. |
| **`500 Server Error`** | Unhandled server error or template rendering failure. | **Toast Error:** *"Failed to generate invoice due to a server error. Please try again shortly or contact customer support."* | Restore the button to an active state so the user can re-attempt the download. |

---

### 6.4. Cross-Origin Resource Sharing (CORS) & Filename Preservation

When the frontend and backend are hosted on different origins or domains (e.g., `https://app.maqamtravels.com` communicating with `https://api.maqamtravels.com`):

1. **Header Exposure Requirement:**
   * Browsers restrict client-side JavaScript access to HTTP response headers unless explicitly permitted by the server.
   * To allow the frontend application to read the server-assigned filename from the `Content-Disposition` header, the backend CORS middleware must expose this header:
     * `Access-Control-Expose-Headers: Content-Disposition`
2. **Defensive Filename Fallback Algorithm:**
   * If the browser cannot read the `Content-Disposition` header due to strict CORS masking, the frontend must not default to a generic name like `download.html`.
   * Instead, the frontend should procedurally construct a deterministic fallback filename based on the active booking context:
     * Package Bookings: `Invoice-Package-<bookingId>.html`
     * Flight Bookings: `Invoice-Flight-<bookingId>.html`
     * Hotel Bookings: `Invoice-Hotel-<bookingId>.html`

---

### 6.5. Role-Based Access Control (RBAC) in the User Interface

The frontend application should tailor the visibility and interactivity of download buttons based on the authenticated user's role:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          RBAC USER INTERFACE VISIBILITY                                │
└────────────────────────────────────────────────────────────────────────────────────────┘

    USER ROLE: Customer / Traveler
    ├── Can view download buttons ONLY on their own confirmed bookings.
    ├── Buttons on other users' bookings are completely hidden from the DOM.
    └── If 403 Forbidden is received, display a friendly permission message.

    USER ROLE: Back-Office Staff (Sales Agent, Support Agent, Operations)
    ├── Can view and click download buttons across ALL customer bookings.
    └── Buttons are accompanied by quick-action tooltips for rapid invoice dispatch.

    USER ROLE: Administrator & Super-Administrator
    ├── Unrestricted download access across all bookings and historical archives.
    └── Access to bulk invoice export tools in the CRM accounting section.
```

---

### 6.6. The End-User Document Experience: From HTML File to High-Resolution PDF

Frontend teams often ask why the backend delivers an `.html` file attachment rather than a pre-compiled binary `.pdf` file. This architecture provides significant technical and operational advantages:

1. **Instantaneous File Generation:**
   * Generating binary PDFs on the server requires heavy headless browser instances (such as Puppeteer or Chromium) or canvas rendering engines that consume excessive server CPU and memory, often leading to server timeouts during peak traffic.
   * Delivering a self-contained HTML file occurs in under **50 milliseconds**, ensuring instant downloads even under heavy platform load.
2. **100% Vector Typography & Styling:**
   * The downloaded HTML invoice incorporates high-resolution vector logos, clean typography, and responsive tables that display crisply on any screen resolution or retina display.
3. **Embedded `@media print` Page Formatting:**
   * The invoice contains embedded CSS print rules configured specifically for standard **A4 paper** dimensions, with calibrated page margins, header repeats, and table page-break protections.
4. **Zero-Friction "Save to PDF" Workflow for Customers:**
   * When the customer double-clicks the downloaded `.html` file, it opens instantly in their default desktop or mobile web browser (Google Chrome, Microsoft Edge, Apple Safari, or Mozilla Firefox).
   * The customer can immediately press `Ctrl + P` (or `Cmd + P` on macOS) or select **Print** from their browser menu.
   * The browser's native print engine automatically applies the embedded A4 print styles, allowing the customer to click **"Save as PDF"** or send the document directly to a physical office printer with perfect layout alignment.
5. **Completely Offline & Self-Contained:**
   * All structural CSS rules and layout frameworks are bundled directly inside the HTML document. The customer does not need an active internet connection to open, view, or print their downloaded invoice once saved to their device.

---

## 7. Summary & Handover Checklist for Frontend Engineers

Before releasing the invoice retrieval and download feature to production, frontend developers should verify the following implementation checklist:

- [ ] **Route Mapping (JSON Data):** Custom invoice UI cards and CRM drawers correctly query `/api/v1/invoices/:vertical/:bookingId` for `application/json` data.
- [ ] **Route Mapping (File Download):** All download buttons correctly target `/api/v1/invoices/:vertical/:bookingId/download` with the appropriate vertical keyword (`package`, `flight`, `hotel`, `offer`, or `visa`).
- [ ] **Dual Authentication:** Requests include either the `Authorization: Bearer <token>` header or the `?token=<token>` query parameter.
- [ ] **Request Body:** Confirmed that all retrieval and download requests are sent via HTTP `GET` with **no request body**.
- [ ] **Anti-Corruption Check:** The frontend inspects the response status and `Content-Type` before triggering a file download, preventing error JSON from being saved as an HTML file.
- [ ] **Dynamic Filename:** Filenames are parsed from the `Content-Disposition` header, with a clean fallback pattern if the header is inaccessible.
- [ ] **Memory Management:** Temporary Object URLs created for Blob downloads are immediately revoked to prevent browser memory leaks.
- [ ] **Button States:** Download and fetch buttons display an active loading spinner while the request is in flight and disable interaction to prevent double clicks.
- [ ] **Error Notifications:** Distinct, user-friendly toast alerts are displayed for 400 (Bad Request), 401 (Session Expired), 403 (Permission Denied), 404 (Booking Not Found), and 500 (Server Error).
- [ ] **RBAC Restrictions:** Customers only see download and view buttons for their own bookings, while administrative staff have access across all customer records.
- [ ] **A4 Print Verification:** Downloaded HTML files have been opened in major web browsers (Chrome, Edge, Safari, Firefox) and verified via print preview (`Ctrl+P`) for clean A4 alignment.
