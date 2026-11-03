# 📋 Customer & Admin Quotation Platform API Documentation

> **Maqam Travels Alpha — Customer & Back-Office Quotation Operations Module**  
> Complete technical reference for Quotation API endpoints: Customer quotation submission, guest tracking, customer quotation management, and Admin / Staff operations (listing with filters, single lookup, specialist assignment, and proposal dispatch).

---

## 📑 Table of Contents

1. [Overview & System Architecture](#1-overview--system-architecture)
2. [Global Authentication & Role Matrix](#2-global-authentication--role-matrix)
3. [Customer Stage Lifecycle & CRM Mapping](#3-customer-stage-lifecycle--crm-mapping)
4. [API Endpoints Overview](#4-api-endpoints-overview)
5. [Customer API Endpoints (`/api/v1/quotes`)](#5-customer-api-endpoints-apiv1quotes)
   - [1. Request a Quotation (`POST /api/v1/quotes/request`)](#1-request-a-quotation-post-apiv1quotesrequest)
   - [2. Track Quotation Status (`POST /api/v1/quotes/track`)](#2-track-quotation-status-post-apiv1quotestrack)
   - [3. List Logged-In Customer's Quotations (`GET /api/v1/quotes/my`)](#3-list-logged-in-customers-quotations-get-apiv1quotesmy)
   - [4. Get Single Quotation Details (`GET /api/v1/quotes/my/:id`)](#4-get-single-quotation-details-get-apiv1quotesmyid)
   - [5. Respond to Quotation (`POST /api/v1/quotes/my/:id/respond`)](#5-respond-to-quotation-post-apiv1quotesmyidrespond)
6. [Admin / Staff API Endpoints (`/api/v1/crm/quotes`)](#6-admin--staff-api-endpoints-apiv1crmquotes)
   - [1. List All Quotations with Search & Filters (`GET /api/v1/crm/quotes`)](#1-list-all-quotations-with-search--filters-get-apiv1crmquotes)
   - [2. Get Single Quotation Details (`GET /api/v1/crm/quotes/:id`)](#2-get-single-quotation-details-get-apiv1crmquotesid)
   - [3. Assign Unhandled Quotation to Specialist (`POST /api/v1/crm/quotes/:id/assign`)](#3-assign-unhandled-quotation-to-specialist-post-apiv1crmquotesidassign)
   - [4. Send Quotation Proposal to Customer (`POST /api/v1/crm/quotes/:id/send`)](#4-send-quotation-proposal-to-customer-post-apiv1crmquotesidsend)
7. [Request Body Field Schemas Reference](#7-request-body-field-schemas-reference)
8. [Response Body Field Schemas Reference](#8-response-body-field-schemas-reference)
9. [Error Taxonomy & Responses](#9-error-taxonomy--responses)
10. [Developer & QA cURL Playbook](#10-developer--qa-curl-playbook)

---

## 1. Overview & System Architecture

The **Quotation Platform Module** provides a dual-interface architecture:
1. **Customer-Facing Portal (`/api/v1/quotes`)**: Allows travellers to request quotes, track status via reference codes (`QT-XXXXXXXX`), and accept/decline proposals.
2. **Admin & Back-Office Operations (`/api/v1/crm/quotes` & `/api/v1/quotes/admin`)**: Enables travel specialists and administrative staff to manage quotation leads, filter unhandled requests, assign specialists, and issue pricing proposals.

- **Data Store**: Built on top of the shared CRM [`Lead`](../../modules/crm/crm.model.js) collection.
- **Sanitization Layer**: Customer views automatically sanitize internal CRM fields (agent notes, priority, internal timeline, lead source), while Admin endpoints expose the full operational CRM metadata.
- **Omnichannel Dispatch**: Sending a proposal triggers real-time Email & WhatsApp alerts to the customer.

---

## 2. Global Authentication & Role Matrix

| Endpoint Route | HTTP Method | Authentication | Allowed Roles | Description |
| :--- | :---: | :--- | :--- | :--- |
| `/api/v1/quotes/request` | `POST` | Optional | Guest / Customer | Submit a new quotation request |
| `/api/v1/quotes/track` | `POST` | Public | Anyone | Guest status tracking via Ref + Phone |
| `/api/v1/quotes/my` | `GET` | Required | Customer | List user's quotation requests |
| `/api/v1/quotes/my/:id` | `GET` | Required | Customer | Get customer's quotation view |
| `/api/v1/quotes/my/:id/respond` | `POST` | Required | Customer | Submit customer decision (accept/reject/changes) |
| `/api/v1/crm/quotes` | `GET` | Required | `admin`, `super_admin`, `sales_agent`, `support_agent` | List all quotations with search & filters |
| `/api/v1/crm/quotes/:id` | `GET` | Required | `admin`, `super_admin`, `sales_agent`, `support_agent` | Get complete admin quotation record |
| `/api/v1/crm/quotes/:id/assign` | `POST` | Required | `admin`, `super_admin`, `sales_agent` | Assign unhandled quote to specialist |
| `/api/v1/crm/quotes/:id/send` | `POST` | Required | `admin`, `super_admin`, `sales_agent` | Issue & send proposal to customer |

---

## 3. Customer Stage Lifecycle & CRM Mapping

Internal CRM lead statuses translate into customer-facing `stage` indicators:

```
                  ┌──────────────────────┐
                  │     under_review     │
                  └──────────┬───────────┘
                             │ (Agent issues price via POST /crm/quotes/:id/send)
                             ▼
                  ┌──────────────────────┐
                  │     quote_ready      │
                  └──────────┬───────────┘
         ┌───────────────────┼───────────────────┐
         │ (Customer         │ (Customer         │ (Customer requests
         │  accepts)         │  declines)        │  revisions / expires)
         ▼                   ▼                   ▼
┌──────────────────┐ ┌───────────────┐ ┌───────────────────┐
│     accepted     │ │    closed     │ │ revision_requested│
└────────┬─────────┘ └───────────────┘ │    / expired      │
         │ (CRM conversion)            └───────────────────┘
         ▼
┌──────────────────┐
│      booked      │
└──────────────────┘
```

| Customer `stage` | Internal CRM Status | Description |
| :--- | :--- | :--- |
| `under_review` | `new`, `contacted`, `qualified`, `interested` | Proposal is being reviewed and priced by travel experts. |
| `quote_ready` | `proposal`, `quoted`, `proposal_sent` | Quoted price issued; awaiting customer decision. |
| `expired` | `proposal`, `quoted` (Expiry date passed) | Quotation validity date has expired. |
| `accepted` | Any (Customer responded `accepted`) | Customer accepted quote; agent preparing booking conversion. |
| `revision_requested` | `negotiation`, `negotiating` | Customer requested customized adjustments or price revision. |
| `booked` | `won`, `converted` | Proposal converted to confirmed booking. |
| `closed` | `lost` | Request declined by customer or closed by staff. |

---

## 4. API Endpoints Overview

### Customer Endpoints (`/api/v1/quotes`)
- `POST /api/v1/quotes/request` — Request a quotation
- `POST /api/v1/quotes/track` — Track quote by reference + phone
- `GET /api/v1/quotes/my` — List logged-in user's quotes
- `GET /api/v1/quotes/my/:id` — Single quote details
- `POST /api/v1/quotes/my/:id/respond` — Accept / Decline / Request changes

### Admin Endpoints (`/api/v1/crm/quotes` & `/api/v1/quotes/admin`)
- `GET /api/v1/crm/quotes` — List all quotations with search, status, agent, and date range filters
- `GET /api/v1/crm/quotes/:id` — Single quotation admin lookup
- `POST /api/v1/crm/quotes/:id/assign` — Assign unhandled lead to travel specialist
- `POST /api/v1/crm/quotes/:id/send` — Send quotation proposal to customer

---

## 5. Customer API Endpoints (`/api/v1/quotes`)

### 1. Request a Quotation (`POST /api/v1/quotes/request`)

Submit a new quotation request for Umrah, Hajj, or custom travel packages.

- **URL**: `/api/v1/quotes/request`
- **Method**: `POST`
- **Auth**: Optional

#### Request Body Input Schema:
```json
{
  "firstName": "Ahmed",
  "lastName": "Farooq",
  "email": "ahmed.farooq@example.com",
  "phone": "+919876543210",
  "destination": "Makkah & Madinah",
  "tripType": "umrah",
  "travelDates": {
    "from": "2026-11-10",
    "to": "2026-11-20"
  },
  "numberOfPeople": 4,
  "budget": 350000,
  "specialRequests": "2 quadruple rooms near Clock Tower, non-stop flights"
}
```

#### Response Body Payload (`201 Created`):
```json
{
  "success": true,
  "message": "Quotation request submitted successfully. You will receive updates via Email/WhatsApp.",
  "data": {
    "quote": {
      "id": "66f1a2b3c4d5e6f7a8b9c0d1",
      "reference": "QT-F4A9B1C2",
      "stage": "under_review",
      "destination": "Makkah & Madinah",
      "tripType": "umrah",
      "travelDates": {
        "from": "2026-11-10T00:00:00.000Z",
        "to": "2026-11-20T00:00:00.000Z"
      },
      "numberOfPeople": 4,
      "budget": 350000,
      "specialRequests": "2 quadruple rooms near Clock Tower, non-stop flights",
      "quote": null,
      "availableActions": [],
      "customerResponse": null,
      "timeline": [
        {
          "type": "created",
          "title": "Quotation requested",
          "detail": "Customer requested a quotation for Makkah & Madinah (4 traveller(s)). Ref QT-F4A9B1C2.",
          "createdAt": "2026-10-05T16:00:00.000Z"
        }
      ],
      "createdAt": "2026-10-05T16:00:00.000Z",
      "updatedAt": "2026-10-05T16:00:00.000Z",
      "contact": {
        "firstName": "Ahmed",
        "lastName": "Farooq",
        "email": "ahmed.farooq@example.com",
        "phone": "+919876543210"
      }
    },
    "duplicate": false
  }
}
```

---

### 2. Track Quotation Status (`POST /api/v1/quotes/track`)

Guest lookup endpoint to check quote stage and price using reference code and phone number.

- **URL**: `/api/v1/quotes/track`
- **Method**: `POST`
- **Auth**: Public

#### Request Body Input Schema:
```json
{
  "reference": "QT-F4A9B1C2",
  "phone": "9876543210"
}
```

#### Response Body Payload (`200 OK`):
```json
{
  "success": true,
  "message": "Quotation status retrieved successfully",
  "data": {
    "quote": {
      "id": "66f1a2b3c4d5e6f7a8b9c0d1",
      "reference": "QT-F4A9B1C2",
      "stage": "quote_ready",
      "destination": "Makkah & Madinah",
      "tripType": "umrah",
      "travelDates": {
        "from": "2026-11-10T00:00:00.000Z",
        "to": "2026-11-20T00:00:00.000Z"
      },
      "numberOfPeople": 4,
      "budget": 350000,
      "specialRequests": "2 quadruple rooms near Clock Tower, non-stop flights",
      "quote": {
        "price": 320000,
        "currency": "INR",
        "expiresAt": "2026-10-12T18:00:00.000Z",
        "isExpired": false
      },
      "availableActions": [
        "accepted",
        "rejected",
        "changes_requested"
      ],
      "customerResponse": null,
      "timeline": [
        {
          "type": "created",
          "title": "Quotation requested",
          "detail": "Customer requested a quotation for Makkah & Madinah (4 traveller(s)). Ref QT-F4A9B1C2.",
          "createdAt": "2026-10-05T16:00:00.000Z"
        }
      ]
    }
  }
}
```

---

### 3. List Logged-In Customer's Quotations (`GET /api/v1/quotes/my`)

Retrieve a paginated list of all quotation requests belonging to the logged-in customer.

- **URL**: `/api/v1/quotes/my`
- **Method**: `GET`
- **Auth**: Bearer Token

#### Response Body Payload (`200 OK`):
```json
{
  "success": true,
  "message": "Customer quotes retrieved successfully",
  "data": {
    "quotes": [
      {
        "id": "66f1a2b3c4d5e6f7a8b9c0d1",
        "reference": "QT-F4A9B1C2",
        "stage": "quote_ready",
        "destination": "Makkah & Madinah",
        "tripType": "umrah",
        "travelDates": {
          "from": "2026-11-10T00:00:00.000Z",
          "to": "2026-11-20T00:00:00.000Z"
        },
        "numberOfPeople": 4,
        "budget": 350000,
        "specialRequests": "2 quadruple rooms near Clock Tower",
        "quote": {
          "price": 320000,
          "currency": "INR",
          "expiresAt": "2026-10-12T18:00:00.000Z",
          "isExpired": false
        },
        "availableActions": [
          "accepted",
          "rejected",
          "changes_requested"
        ],
        "customerResponse": null
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### 4. Get Single Quotation Details (`GET /api/v1/quotes/my/:id`)

Retrieve single quotation view for logged-in user.

- **URL**: `/api/v1/quotes/my/:id`
- **Method**: `GET`
- **Auth**: Bearer Token

---

### 5. Respond to Quotation (`POST /api/v1/quotes/my/:id/respond`)

Submit customer decision on an issued quote proposal.

- **URL**: `/api/v1/quotes/my/:id/respond`
- **Method**: `POST`
- **Auth**: Bearer Token

#### Request Body Input Schema:
```json
{
  "action": "accepted",
  "note": "Looks great! Please contact me to process payment for quadruple sharing."
}
```

#### Response Body Payload (`200 OK`):
```json
{
  "success": true,
  "message": "Quotation response (accepted) submitted successfully",
  "data": {
    "quote": {
      "id": "66f1a2b3c4d5e6f7a8b9c0d1",
      "reference": "QT-F4A9B1C2",
      "stage": "accepted",
      "quote": {
        "price": 320000,
        "currency": "INR",
        "expiresAt": "2026-10-12T18:00:00.000Z",
        "isExpired": false
      },
      "availableActions": [],
      "customerResponse": {
        "action": "accepted",
        "note": "Looks great! Please contact me to process payment for quadruple sharing.",
        "respondedAt": "2026-10-05T16:10:00.000Z"
      }
    }
  }
}
```

---

## 6. Admin / Staff API Endpoints (`/api/v1/crm/quotes`)

### 1. List All Quotations with Search & Filters (`GET /api/v1/crm/quotes`)

Retrieve all customer quotation leads with filtering, search, and pagination.

- **URL**: `/api/v1/crm/quotes` (or `/api/v1/quotes/admin`)
- **Method**: `GET`
- **Auth Required**: Yes (`Bearer <token>`)
- **Permissions**: `admin`, `super_admin`, `sales_agent`, `support_agent`

#### Query Parameters:

| Parameter | Type | Required | Default | Description |
| :--- | :---: | :---: | :---: | :--- |
| `status` | `String` | Optional | *None* | Filter by quotation status (`new`, `proposal_sent`, `negotiation`, `won`, `lost`, `unhandled`) |
| `agentId` | `String` | Optional | *None* | Filter by assigned specialist ID. Pass **`unhandled`** or **`unassigned`** to filter unhandled quotes |
| `assignedTo` | `String` | Optional | *None* | Alias for `agentId` |
| `fromDate` | `String` | Optional | *None* | Filter created date start (YYYY-MM-DD) |
| `toDate` | `String` | Optional | *None* | Filter created date end (YYYY-MM-DD) |
| `search` | `String` | Optional | *None* | Text search in customer name, email, phone, destination, or quote reference (`QT-XXXX`) |
| `page` | `Number` | Optional | `1` | Page number |
| `limit` | `Number` | Optional | `20` | Items per page (max 100) |

#### Request Header Example:
```http
GET /api/v1/crm/quotes?agentId=unhandled&page=1&limit=10 HTTP/1.1
Host: localhost:5000
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

#### Response Body Payload (`200 OK`):
```json
{
  "success": true,
  "message": "Quotations retrieved successfully",
  "data": {
    "quotations": [
      {
        "_id": "66f1a2b3c4d5e6f7a8b9c0d1",
        "firstName": "Bilal",
        "lastName": "Habashi",
        "email": "bilal.habashi@example.com",
        "phone": "+919876543222",
        "source": "Website - Quote Request",
        "tripType": "umrah",
        "destination": "Madinah Deluxe",
        "travelDates": {
          "from": "2026-11-10T00:00:00.000Z",
          "to": "2026-11-20T00:00:00.000Z"
        },
        "numberOfPeople": 2,
        "budget": 200000,
        "specialRequests": "Near Haram hotel, direct flights",
        "status": "new",
        "priority": "medium",
        "quoteReference": "QT-UNH-8A9B",
        "quotedPrice": 0,
        "quoteExpiresAt": null,
        "assignedAgent": null,
        "assignedTo": null,
        "customer": null,
        "customerResponse": {
          "action": null,
          "note": "",
          "respondedAt": null
        },
        "timeline": [
          {
            "id": "T1728144000abc1",
            "type": "created",
            "title": "Quotation requested",
            "detail": "Customer requested a quotation for Madinah Deluxe (2 traveller(s)). Ref QT-UNH-8A9B.",
            "time": "5 Oct, 16:00",
            "createdAt": "2026-10-05T16:00:00.000Z"
          }
        ],
        "createdAt": "2026-10-05T16:00:00.000Z",
        "updatedAt": "2026-10-05T16:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### 2. Get Single Quotation Details (`GET /api/v1/crm/quotes/:id`)

Retrieve complete operational quotation record by ID for admin and sales staff.

- **URL**: `/api/v1/crm/quotes/:id` (or `/api/v1/quotes/admin/:id`)
- **Method**: `GET`
- **Auth Required**: Yes (`Bearer <token>`)
- **Permissions**: `admin`, `super_admin`, `sales_agent`, `support_agent`
- **Path Parameters**:
  - `id` (required, Mongo ObjectId): Quotation Lead ObjectId

#### Response Body Payload (`200 OK`):
```json
{
  "success": true,
  "message": "Quotation details retrieved successfully",
  "data": {
    "quotation": {
      "_id": "66f1a2b3c4d5e6f7a8b9c0d1",
      "firstName": "Tariq",
      "lastName": "Ziyad",
      "email": "tariq.ziyad@example.com",
      "phone": "+919876543211",
      "source": "Website - Quote Request",
      "tripType": "umrah",
      "destination": "Makkah & Madinah",
      "travelDates": {
        "from": "2026-11-10T00:00:00.000Z",
        "to": "2026-11-20T00:00:00.000Z"
      },
      "numberOfPeople": 4,
      "budget": 350000,
      "specialRequests": "2 quadruple rooms near Clock Tower",
      "status": "proposal_sent",
      "priority": "high",
      "quoteReference": "QT-ADM-7F3A",
      "quotedPrice": 340000,
      "quoteExpiresAt": "2026-11-12T23:59:59.000Z",
      "assignedAgent": {
        "_id": "651234567890abcdef123456",
        "firstName": "TravelSpecialist",
        "lastName": "Agent",
        "email": "travel.specialist@maqamtravels.com",
        "phone": "+919200000000",
        "role": "sales_agent"
      },
      "assignedTo": "651234567890abcdef123456",
      "customer": null,
      "customerResponse": {
        "action": null,
        "note": "",
        "respondedAt": null
      },
      "timeline": [
        {
          "id": "T1728144000abc1",
          "type": "created",
          "title": "Quotation requested",
          "detail": "Customer requested a quotation for Makkah & Madinah (4 traveller(s)). Ref QT-ADM-7F3A.",
          "time": "5 Oct, 16:00",
          "createdAt": "2026-10-05T16:00:00.000Z"
        },
        {
          "id": "T1728144300def2",
          "type": "assigned",
          "title": "Assigned to travel specialist",
          "detail": "Quotation lead assigned to travel specialist TravelSpecialist Agent.",
          "time": "5 Oct, 16:05",
          "createdAt": "2026-10-05T16:05:00.000Z"
        },
        {
          "id": "T1728144600ghi3",
          "type": "quote_sent",
          "title": "Quotation sent to customer",
          "detail": "Quotation proposal issued to customer for INR 3,40,000.00. Notes: Includes 5-star hotel near Haram and private VIP transfers.",
          "time": "5 Oct, 16:10",
          "createdAt": "2026-10-05T16:10:00.000Z"
        }
      ],
      "createdAt": "2026-10-05T16:00:00.000Z",
      "updatedAt": "2026-10-05T16:10:00.000Z"
    }
  }
}
```

---

### 3. Assign Unhandled Quotation to Specialist (`POST /api/v1/crm/quotes/:id/assign`)

Assign an unhandled or unassigned quotation lead to a specific travel specialist / sales agent.

- **URL**: `/api/v1/crm/quotes/:id/assign` (also supports `PUT` and `PATCH`)
- **Method**: `POST`
- **Auth Required**: Yes (`Bearer <token>`)
- **Permissions**: `admin`, `super_admin`, `sales_agent`
- **Path Parameters**:
  - `id` (required, Mongo ObjectId): Quotation Lead ObjectId

#### Request Body Input Schema:
```json
{
  "agentId": "651234567890abcdef123456"
}
```

#### Response Body Payload (`200 OK`):
```json
{
  "success": true,
  "message": "Quotation lead successfully assigned to travel specialist",
  "data": {
    "quotation": {
      "_id": "66f1a2b3c4d5e6f7a8b9c0d1",
      "quoteReference": "QT-UNH-8A9B",
      "destination": "Madinah Deluxe",
      "assignedAgent": {
        "_id": "651234567890abcdef123456",
        "firstName": "TravelSpecialist",
        "lastName": "Agent",
        "email": "travel.specialist@maqamtravels.com",
        "phone": "+919200000000",
        "role": "sales_agent"
      },
      "assignedTo": "651234567890abcdef123456",
      "timeline": [
        {
          "type": "assigned",
          "title": "Assigned to travel specialist",
          "detail": "Quotation lead assigned to travel specialist TravelSpecialist Agent.",
          "createdAt": "2026-10-05T16:05:00.000Z"
        }
      ]
    }
  }
}
```

---

### 4. Send Quotation Proposal to Customer (`POST /api/v1/crm/quotes/:id/send`)

Issues the quotation proposal with price and expiry date to the customer. Triggers real-time Email & WhatsApp notifications to the customer.

- **URL**: `/api/v1/crm/quotes/:id/send` (also supports `PUT`)
- **Method**: `POST`
- **Auth Required**: Yes (`Bearer <token>`)
- **Permissions**: `admin`, `super_admin`, `sales_agent`
- **Path Parameters**:
  - `id` (required, Mongo ObjectId): Quotation Lead ObjectId

#### Request Body Input Schema:
```json
{
  "quotedPrice": 340000,
  "quoteExpiresAt": "2026-11-12T23:59:59.000Z",
  "notes": "Includes 5-star hotel near Haram and private VIP transfers."
}
```

#### Response Body Payload (`200 OK`):
```json
{
  "success": true,
  "message": "Quotation proposal issued and sent to customer successfully",
  "data": {
    "quotation": {
      "_id": "66f1a2b3c4d5e6f7a8b9c0d1",
      "quoteReference": "QT-ADM-7F3A",
      "status": "proposal_sent",
      "quotedPrice": 340000,
      "quoteExpiresAt": "2026-11-12T23:59:59.000Z",
      "assignedAgent": {
        "_id": "651234567890abcdef123456",
        "firstName": "TravelSpecialist",
        "lastName": "Agent"
      },
      "timeline": [
        {
          "type": "quote_sent",
          "title": "Quotation sent to customer",
          "detail": "Quotation proposal issued to customer for INR 3,40,000.00. Notes: Includes 5-star hotel near Haram and private VIP transfers.",
          "createdAt": "2026-10-05T16:10:00.000Z"
        }
      ]
    }
  }
}
```

---

## 7. Request Body Field Schemas Reference

### Assign Quotation (`POST /api/v1/crm/quotes/:id/assign`)

| Field Name | Type | Required | Validation Rules | Description |
| :--- | :---: | :---: | :--- | :--- |
| `agentId` | `String` | **Yes** | Valid Mongo ObjectId | User ID of the sales agent / travel specialist |
| `assignedTo` | `String` | Optional | Valid Mongo ObjectId | Alias for `agentId` |

---

### Send Quotation Proposal (`POST /api/v1/crm/quotes/:id/send`)

| Field Name | Type | Required | Validation Rules | Description |
| :--- | :---: | :---: | :--- | :--- |
| `quotedPrice` | `Number` | **Yes** | Number > 0 | Quoted selling price for the proposal (e.g. `340000`) |
| `price` | `Number` | Optional | Number > 0 | Alias for `quotedPrice` |
| `quoteExpiresAt` | `String` | Optional | Valid ISO 8601 date string | Validity expiration timestamp for the proposal |
| `notes` | `String` | Optional | String | Package inclusion notes / remarks sent to customer |

---

## 8. Response Body Field Schemas Reference

### Admin Quotation Record Object (`data.quotation`)

| Property | Type | Description |
| :--- | :--- | :--- |
| `_id` | `String` | Unique MongoDB ObjectId for the quotation lead |
| `firstName` | `String` | Customer first name |
| `lastName` | `String` | Customer last name |
| `email` | `String` | Customer email address |
| `phone` | `String` | Customer contact phone number |
| `destination` | `String` | Requested destination |
| `tripType` | `String` | Trip category (`umrah`, `holiday`, `hajj`) |
| `travelDates` | `Object` | `{ from: ISOString, to: ISOString }` |
| `numberOfPeople` | `Number` | Passenger count |
| `budget` | `Number` | Customer estimated budget |
| `specialRequests` | `String` | Special requirements and notes |
| `status` | `String` | Lead status (`new`, `proposal_sent`, `negotiation`, `won`, `lost`) |
| `quoteReference` | `String` | Unique quote reference code (`QT-XXXXXXXX`) |
| `quotedPrice` | `Number` | Quoted price issued by agent (`0` if pending) |
| `quoteExpiresAt` | `String \| null` | ISO timestamp when the quote proposal expires |
| `assignedAgent` | `Object \| null` | Populated travel specialist user profile (`firstName`, `lastName`, `email`, `phone`) |
| `customerResponse` | `Object \| null` | Customer decision payload (`action`, `note`, `respondedAt`) |
| `timeline` | `Array<Object>` | Complete operational timeline feed |

---

## 9. Error Taxonomy & Responses

### 1. `400 Bad Request` — Validation Error
Returned when required parameters (`agentId`, `quotedPrice`) are invalid or missing.

```json
{
  "success": false,
  "message": "quotedPrice must be a valid number greater than 0"
}
```

### 2. `404 Not Found` — Record Not Found
Returned when quotation ID or travel specialist ID does not exist.

```json
{
  "success": false,
  "message": "Travel specialist / agent not found"
}
```

---

## 10. Developer & QA cURL Playbook

### 1. List Unhandled Quotations
```bash
curl -X GET "http://localhost:5000/api/v1/crm/quotes?agentId=unhandled&page=1&limit=10" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

### 2. Search Quotations by Customer Name
```bash
curl -X GET "http://localhost:5000/api/v1/crm/quotes?search=Bilal" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

### 3. Get Single Quotation Admin Details
```bash
curl -X GET "http://localhost:5000/api/v1/crm/quotes/66f1a2b3c4d5e6f7a8b9c0d1" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

### 4. Assign Quotation to Travel Specialist
```bash
curl -X POST "http://localhost:5000/api/v1/crm/quotes/66f1a2b3c4d5e6f7a8b9c0d1/assign" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "651234567890abcdef123456"
  }'
```

### 5. Issue & Send Proposal to Customer
```bash
curl -X POST "http://localhost:5000/api/v1/crm/quotes/66f1a2b3c4d5e6f7a8b9c0d1/send" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "quotedPrice": 340000,
    "quoteExpiresAt": "2026-11-15T23:59:59.000Z",
    "notes": "Includes 5-star hotel near Haram and private VIP transfers."
  }'
```
