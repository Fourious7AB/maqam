# Travel Insurance Module - API Documentation

> **Base Route URL**: `{{BASE_URL}}/api/v1/insurance`  
> **Default Local Server**: `http://localhost:5000/api/v1/insurance`  
> **Module Source Files**:
> - Routes: [`insurance.routes.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/insurance/insurance.routes.js)
> - Controller: [`insurance.controller.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/insurance/insurance.controller.js)
> - Validator: [`insurance.validator.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/insurance/insurance.validator.js)
> - Service: [`insurance.service.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/insurance/insurance.service.js)
> - Model: [`insurance.model.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/insurance/insurance.model.js)

---

## 📌 Table of Contents

1. [Architecture & Overview](#-architecture--overview)
2. [Authentication & Authorization](#-authentication--authorization)
3. [Summary of Endpoints](#-summary-of-endpoints)
4. [Public & User API Endpoints](#-public--user-api-endpoints)
   - [1. List Active Insurance Plans (`GET /plans`)](#1-list-active-insurance-plans)
   - [2. Get Single Plan Details (`GET /plans/:id`)](#2-get-single-plan-details)
   - [3. Calculate Premium Quote (`POST /quote`)](#3-calculate-premium-quote)
   - [4. Purchase / Issue Insurance Policy (`POST /create_policies`)](#4-purchase--issue-insurance-policy)
   - [5. Get My Policies (`GET /my-policies`)](#5-get-my-policies)
   - [6. Get Single Policy Details (`GET /policies/:id`)](#6-get-single-policy-details)
   - [7. File a Claim on Active Policy (`POST /policies/:id/claims`)](#7-file-a-claim-on-active-policy)
5. [Admin & Staff API Endpoints](#-admin--staff-api-endpoints)
   - [8. Create Insurance Plan (`POST /admin/plans`)](#8-create-insurance-plan)
   - [9. Update Insurance Plan (`PUT /admin/plans/:id`)](#9-update-insurance-plan)
   - [10. Soft-Delete Plan (`DELETE /admin/plans/:id`)](#10-soft-delete-plan)
   - [11. List All System Policies (`GET /admin/policies`)](#11-list-all-system-policies)
   - [12. Manually Update Policy Status (`PATCH /admin/policies/:id/status`)](#12-manually-update-policy-status)
   - [13. Resolve Insurance Claim (`PATCH /admin/policies/:policyId/claims/:claimId`)](#13-resolve-insurance-claim)
6. [Pricing & Calculation Logic](#-pricing--calculation-logic)
7. [Data Schemas & Enums](#-data-schemas--enums)
8. [Standard Response & Error Codes](#-standard-response--error-codes)

---

## 🏗 Architecture & Overview

The **Travel Insurance Module** handles complete travel protection workflows for individual travelers, families, Umrah pilgrims, and group tours:
- **Plan Catalog & Configuration**: Admins configure tiered coverage plans (Medical Emergency, Baggage Loss, Flight Cancellation, Trip Delay, COVID Cover, Senior Citizen packages) with custom duration slabs and coverage deductibles.
- **Dynamic Instant Quotation**: Real-time premium calculations supporting duration days, traveler age surcharges (>65 yrs = +20%, >75 yrs = +50%), and add-ons.
- **Policy Issuance & Linking**: Seamless purchase flow producing unique policy certificates (`INS-YYYYMMDD-HEX`), supporting direct linkage to booked flights, visas, packages, or hotels.
- **Claims Lifecycle**: End-to-end claim filing by policy owners, attachment of evidentiary documents, and administrative claim resolution workflows (`pending` ➔ `under_review` ➔ `approved` / `rejected` ➔ `paid`).

---

## 🔐 Authentication & Authorization

| Role | Access Level | Header Required |
|---|---|---|
| **Public / Guest** | Browse active plans, view plan details, calculate premium quotations | None |
| **Authenticated User** | Purchase policies, view owned policies, file insurance claims | `Authorization: Bearer <USER_JWT_TOKEN>` |
| **Support / Sales Agent** | View all system policies, resolve customer claims, update policy status | `Authorization: Bearer <STAFF_JWT_TOKEN>` |
| **Admin / Super Admin** | Full access: Plan CRUD, Policy lifecycle management, Claim adjudication | `Authorization: Bearer <ADMIN_JWT_TOKEN>` |

---

## 📊 Summary of Endpoints

| # | Method | Endpoint | Access | Summary |
|---|---|---|---|---|
| 1 | `GET` | `/api/v1/insurance/plans` | Public | List active insurance plans with pagination & filtering |
| 2 | `GET` | `/api/v1/insurance/plans/:id` | Public | Get full details of a specific plan |
| 3 | `POST` | `/api/v1/insurance/quote` | Public | Real-time quote calculation with age loading |
| 4 | `POST` | `/api/v1/insurance/create_policies` | User | Purchase and issue an active insurance policy |
| 5 | `GET` | `/api/v1/insurance/my-policies` | User | Get logged-in user's policy history |
| 6 | `GET` | `/api/v1/insurance/policies/:id` | Owner / Staff | Get single policy detail with coverage and claim list |
| 7 | `POST` | `/api/v1/insurance/policies/:id/claims` | Owner | Submit a claim with proof documents against an active policy |
| 8 | `POST` | `/api/v1/insurance/admin/plans` | Admin | Create a new insurance plan |
| 9 | `PUT` | `/api/v1/insurance/admin/plans/:id` | Admin | Update insurance plan parameters |
| 10 | `DELETE` | `/api/v1/insurance/admin/plans/:id` | Admin | Soft-delete / deactivate an insurance plan |
| 11 | `GET` | `/api/v1/insurance/admin/policies` | Admin / Staff | List all platform policies with status filters & pagination |
| 12 | `PATCH` | `/api/v1/insurance/admin/policies/:id/status` | Admin / Staff | Update policy lifecycle state (`active`, `expired`, `cancelled`, `claimed`) |
| 13 | `PATCH` | `/api/v1/insurance/admin/policies/:policyId/claims/:claimId` | Admin / Staff | Adjudicate/resolve a claim (`approved`, `rejected`, `paid`, etc.) |

---

## 👥 Public & User API Endpoints

### 1. List Active Insurance Plans
Fetches active insurance plans available for purchase.

- **Endpoint**: `GET /api/v1/insurance/plans`
- **Auth Required**: No

#### Query Parameters
| Parameter | Type | Required | Default | Description | Example |
|---|---|---|---|---|---|
| `page` | Integer | No | `1` | Page number | `1` |
| `limit` | Integer | No | `10` | Records per page (1 - 100) | `10` |
| `planType` | String | No | - | Enum: `comprehensive`, `medical`, `travel_delay`, `cancellation`, `student`, `schengen`, `senior_citizen`, `custom` | `comprehensive` |

#### cURL Request
```bash
curl -X GET "http://localhost:5000/api/v1/insurance/plans?planType=comprehensive&page=1&limit=10" \
  -H "Accept: application/json"
```

#### Response Payload (`200 OK`)
```json
{
  "success": true,
  "message": "Active insurance plans retrieved successfully",
  "data": [
    {
      "_id": "66f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Global Comprehensive Travel Shield",
      "provider": "Tata AIG / Alliance Global",
      "planType": "comprehensive",
      "destinationScope": "worldwide",
      "description": "Comprehensive international travel protection covering medical emergencies, baggage loss, flight delays, and personal liability.",
      "coverageDetails": [
        {
          "_id": "66f1a2b3c4d5e6f7a8b9c0d2",
          "title": "Emergency Medical & Hospitalization",
          "coverageAmount": 100000,
          "currency": "USD",
          "description": "Hospitalization, outpatient care, and emergency medical evacuation.",
          "deductible": 50
        },
        {
          "_id": "66f1a2b3c4d5e6f7a8b9c0d3",
          "title": "Trip Cancellation & Curtailment",
          "coverageAmount": 5000,
          "currency": "USD",
          "description": "Reimbursement for non-refundable flight and hotel expenses.",
          "deductible": 0
        },
        {
          "_id": "66f1a2b3c4d5e6f7a8b9c0d4",
          "title": "Baggage Loss / Delay",
          "coverageAmount": 1500,
          "currency": "USD",
          "description": "Loss or checked-in baggage delay beyond 6 hours.",
          "deductible": 0
        }
      ],
      "durationOptions": [
        {
          "_id": "66f1a2b3c4d5e6f7a8b9c0d5",
          "minDays": 1,
          "maxDays": 7,
          "price": 18
        },
        {
          "_id": "66f1a2b3c4d5e6f7a8b9c0d6",
          "minDays": 8,
          "maxDays": 15,
          "price": 32
        },
        {
          "_id": "66f1a2b3c4d5e6f7a8b9c0d7",
          "minDays": 16,
          "maxDays": 30,
          "price": 55
        }
      ],
      "basePrice": 18,
      "currency": "USD",
      "minAge": 0,
      "maxAge": 85,
      "termsUrl": "https://cdn.example.com/terms/global_shield.pdf",
      "policyDocumentTemplateUrl": "https://cdn.example.com/templates/policy_cert.pdf",
      "isActive": true,
      "isDeleted": false,
      "createdAt": "2026-08-15T09:00:00.000Z",
      "updatedAt": "2026-09-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 2. Get Single Plan Details
Retrieves complete plan specifications, all coverage items, duration pricing tiers, and terms URL.

- **Endpoint**: `GET /api/v1/insurance/plans/:id`
- **Auth Required**: No

#### Path Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `id` | Mongo ObjectId | Yes | Valid 24-char MongoDB ID of the plan | `66f1a2b3c4d5e6f7a8b9c0d1` |

#### cURL Request
```bash
curl -X GET "http://localhost:5000/api/v1/insurance/plans/66f1a2b3c4d5e6f7a8b9c0d1" \
  -H "Accept: application/json"
```

#### Response Payload (`200 OK`)
```json
{
  "success": true,
  "message": "Insurance plan details retrieved successfully",
  "data": {
    "_id": "66f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Global Comprehensive Travel Shield",
    "provider": "Tata AIG / Alliance Global",
    "planType": "comprehensive",
    "destinationScope": "worldwide",
    "description": "Comprehensive international travel protection covering medical emergencies, baggage loss, flight delays, and personal liability.",
    "coverageDetails": [
      {
        "_id": "66f1a2b3c4d5e6f7a8b9c0d2",
        "title": "Emergency Medical & Hospitalization",
        "coverageAmount": 100000,
        "currency": "USD",
        "description": "Hospitalization, outpatient care, and emergency medical evacuation.",
        "deductible": 50
      }
    ],
    "durationOptions": [
      {
        "_id": "66f1a2b3c4d5e6f7a8b9c0d5",
        "minDays": 1,
        "maxDays": 7,
        "price": 18
      },
      {
        "_id": "66f1a2b3c4d5e6f7a8b9c0d6",
        "minDays": 8,
        "maxDays": 15,
        "price": 32
      }
    ],
    "basePrice": 18,
    "currency": "USD",
    "minAge": 0,
    "maxAge": 85,
    "termsUrl": "https://cdn.example.com/terms/global_shield.pdf",
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-08-15T09:00:00.000Z",
    "updatedAt": "2026-09-01T10:00:00.000Z"
  }
}
```

---

### 3. Calculate Premium Quote
Calculates instantaneous premium quotation for single or multiple travelers across a specific date range, incorporating age-based loadings.

- **Endpoint**: `POST /api/v1/insurance/quote`
- **Auth Required**: No

#### Request Body Parameters
| Field | Type | Required | Description | Example |
|---|---|---|---|---|
| `planId` | Mongo ObjectId | Yes | Selected Insurance Plan ID | `"66f1a2b3c4d5e6f7a8b9c0d1"` |
| `startDate` | String (ISO / YYYY-MM-DD) | Yes | Trip start date | `"2026-11-10"` |
| `endDate` | String (ISO / YYYY-MM-DD) | Yes | Trip return / end date | `"2026-11-20"` |
| `travelers` | Array[Object] | Yes | Non-empty array of travelers with age | `[{"age": 30}, {"age": 68}]` |
| `addOnNames` | Array[String] | No | Optional selected add-on names | `["COVID Cover"]` |

#### cURL Request
```bash
curl -X POST "http://localhost:5000/api/v1/insurance/quote" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "planId": "66f1a2b3c4d5e6f7a8b9c0d1",
    "startDate": "2026-11-10",
    "endDate": "2026-11-20",
    "travelers": [
      { "name": "Vaishnavi Roy", "age": 30 },
      { "name": "Ramesh Roy", "age": 68 }
    ],
    "addOnNames": []
  }'
```

#### Response Payload (`200 OK`)
```json
{
  "success": true,
  "message": "Insurance quote calculated successfully",
  "data": {
    "plan": {
      "id": "66f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Global Comprehensive Travel Shield",
      "provider": "Tata AIG / Alliance Global",
      "planType": "comprehensive",
      "destinationScope": "worldwide",
      "currency": "USD"
    },
    "tripDetails": {
      "startDate": "2026-11-10",
      "endDate": "2026-11-20",
      "durationDays": 11
    },
    "pricingBreakdown": {
      "baseRatePerPerson": 32,
      "durationDays": 11,
      "travelersCount": 2,
      "selectedAddOns": [],
      "addOnsTotal": 0,
      "travelerBreakdown": [
        {
          "travelerIndex": 1,
          "name": "Vaishnavi Roy",
          "age": 30,
          "baseRate": 32,
          "addOnsRate": 0,
          "total": 32
        },
        {
          "travelerIndex": 2,
          "name": "Ramesh Roy",
          "age": 68,
          "baseRate": 38.4,
          "addOnsRate": 0,
          "total": 38.4
        }
      ],
      "tax": 0,
      "discount": 0,
      "totalPremium": 70.4,
      "currency": "USD"
    }
  }
}
```

---

### 4. Purchase / Issue Insurance Policy
Purchases and issues an active policy for the authenticated user with a generated certificate number (`INS-YYYYMMDD-HEX`).

- **Endpoint**: `POST /api/v1/insurance/create_policies`
- **Auth Required**: Yes (User Bearer Token)

#### Request Body Parameters
| Field | Type | Required | Description |
|---|---|---|---|
| `planId` | Mongo ObjectId | Yes | Selected Insurance Plan ID |
| `tripDetails` | Object | Yes | Trip info containing `origin`, `destination`, `startDate`, `endDate` |
| `tripDetails.origin` | String | Yes | Origin city/country (e.g. `"Kolkata"`) |
| `tripDetails.destination` | String | Yes | Destination city/country (e.g. `"Bangkok"`) |
| `tripDetails.startDate` | String (YYYY-MM-DD) | Yes | Policy inception date |
| `tripDetails.endDate` | String (YYYY-MM-DD) | Yes | Policy expiry date |
| `travelers` | Array[Object] | Yes | Non-empty array of insured traveler profiles |
| `travelers[].name` | String | Yes | Full legal name |
| `travelers[].age` | Integer | Yes | Age (0 - 120) |
| `travelers[].passportNumber` | String | No | Passport / ID number |
| `travelers[].gender` | String | No | Enum: `male`, `female`, `other` |
| `travelers[].dateOfBirth` | String | No | Date of birth |
| `travelers[].relationship` | String | No | Relationship (e.g., `"primary"`, `"spouse"`, `"child"`) |
| `linkedTo` | Object | No | Linked booking info: `{ "type": "flight" | "visa" | "package" | "hotel" | "none", "refId": "..." }` |
| `paymentReference` | String | No | Gateway transaction reference (e.g. `pay_MkQ1abc2xyz`) |

#### cURL Request
```bash
curl -X POST "http://localhost:5000/api/v1/insurance/create_policies" \
  -H "Authorization: Bearer <USER_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "planId": "66f1a2b3c4d5e6f7a8b9c0d1",
    "tripDetails": {
      "origin": "Kolkata",
      "destination": "Bangkok",
      "startDate": "2026-11-10",
      "endDate": "2026-11-20"
    },
    "travelers": [
      {
        "name": "Vaishnavi Roy",
        "age": 30,
        "passportNumber": "P9876543",
        "gender": "female",
        "relationship": "primary"
      }
    ],
    "linkedTo": {
      "type": "flight",
      "refId": "66e88888b1c4a839faaaaaaa"
    },
    "paymentReference": "pay_MkQ1abc2xyz"
  }'
```

#### Response Payload (`201 Created`)
```json
{
  "success": true,
  "message": "Insurance policy purchased successfully",
  "data": {
    "_id": "66f2bbbbb1c4a839f1111111",
    "policyNumber": "INS-20260908-A4F1D9",
    "plan": {
      "_id": "66f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Global Comprehensive Travel Shield",
      "provider": "Tata AIG / Alliance Global",
      "planType": "comprehensive",
      "destinationScope": "worldwide",
      "coverageDetails": [
        {
          "title": "Emergency Medical & Hospitalization",
          "coverageAmount": 100000,
          "currency": "USD",
          "description": "Hospitalization, outpatient care, and emergency medical evacuation.",
          "deductible": 50
        }
      ]
    },
    "user": {
      "_id": "66d01111b1c4a839faaaaaaa",
      "firstName": "Vaishnavi",
      "lastName": "Roy",
      "email": "vaishnavi@example.com",
      "phone": "+919876543210"
    },
    "tripDetails": {
      "origin": "Kolkata",
      "destination": "Bangkok",
      "startDate": "2026-11-10T00:00:00.000Z",
      "endDate": "2026-11-20T00:00:00.000Z",
      "durationDays": 11
    },
    "travelers": [
      {
        "_id": "66f2bbbbb1c4a839f2222222",
        "name": "Vaishnavi Roy",
        "age": 30,
        "passportNumber": "P9876543",
        "gender": "female",
        "relationship": "primary"
      }
    ],
    "addOns": [],
    "pricingBreakdown": {
      "baseRate": 32,
      "durationDays": 11,
      "travelersCount": 1,
      "addOnsTotal": 0,
      "tax": 0,
      "discount": 0,
      "totalPremium": 32,
      "currency": "USD"
    },
    "linkedTo": {
      "type": "flight",
      "refId": "66e88888b1c4a839faaaaaaa"
    },
    "paymentStatus": "paid",
    "paymentReference": "pay_MkQ1abc2xyz",
    "status": "active",
    "policyDocumentUrl": null,
    "claims": [],
    "createdAt": "2026-09-08T11:00:00.000Z",
    "updatedAt": "2026-09-08T11:00:00.000Z"
  }
}
```

---

### 5. Get My Policies
Returns a paginated list of all policies owned by the logged-in user with optional lifecycle status filter.

- **Endpoint**: `GET /api/v1/insurance/my-policies`
- **Auth Required**: Yes (User Bearer Token)

#### Query Parameters
| Parameter | Type | Required | Default | Description | Example |
|---|---|---|---|---|---|
| `page` | Integer | No | `1` | Page number | `1` |
| `limit` | Integer | No | `10` | Records per page (1 - 100) | `10` |
| `status` | String | No | - | Filter by status: `active`, `expired`, `cancelled`, `claimed` | `active` |

#### cURL Request
```bash
curl -X GET "http://localhost:5000/api/v1/insurance/my-policies?status=active&page=1&limit=10" \
  -H "Authorization: Bearer <USER_JWT_TOKEN>" \
  -H "Accept: application/json"
```

#### Response Payload (`200 OK`)
```json
{
  "success": true,
  "message": "User policies retrieved successfully",
  "data": [
    {
      "_id": "66f2bbbbb1c4a839f1111111",
      "policyNumber": "INS-20260908-A4F1D9",
      "plan": {
        "_id": "66f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Global Comprehensive Travel Shield",
        "provider": "Tata AIG / Alliance Global",
        "planType": "comprehensive",
        "destinationScope": "worldwide",
        "currency": "USD"
      },
      "tripDetails": {
        "origin": "Kolkata",
        "destination": "Bangkok",
        "startDate": "2026-11-10T00:00:00.000Z",
        "endDate": "2026-11-20T00:00:00.000Z",
        "durationDays": 11
      },
      "travelers": [
        {
          "name": "Vaishnavi Roy",
          "age": 30,
          "passportNumber": "P9876543"
        }
      ],
      "pricingBreakdown": {
        "totalPremium": 32,
        "currency": "USD"
      },
      "paymentStatus": "paid",
      "status": "active",
      "claims": [],
      "createdAt": "2026-09-08T11:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 6. Get Single Policy Details
Fetches full details of a specific policy. Accessible only by the policy owner or staff members (`admin`, `super_admin`, `sales_agent`, `support_agent`).

- **Endpoint**: `GET /api/v1/insurance/policies/:id`
- **Auth Required**: Yes (User or Staff Bearer Token)

#### Path Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `id` | Mongo ObjectId | Yes | Policy MongoDB ID | `66f2bbbbb1c4a839f1111111` |

#### cURL Request
```bash
curl -X GET "http://localhost:5000/api/v1/insurance/policies/66f2bbbbb1c4a839f1111111" \
  -H "Authorization: Bearer <USER_JWT_TOKEN>" \
  -H "Accept: application/json"
```

#### Response Payload (`200 OK`)
```json
{
  "success": true,
  "message": "Policy details retrieved successfully",
  "data": {
    "_id": "66f2bbbbb1c4a839f1111111",
    "policyNumber": "INS-20260908-A4F1D9",
    "plan": {
      "_id": "66f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Global Comprehensive Travel Shield",
      "provider": "Tata AIG / Alliance Global",
      "planType": "comprehensive",
      "coverageDetails": [
        {
          "title": "Emergency Medical & Hospitalization",
          "coverageAmount": 100000,
          "currency": "USD",
          "deductible": 50
        }
      ]
    },
    "user": {
      "_id": "66d01111b1c4a839faaaaaaa",
      "firstName": "Vaishnavi",
      "lastName": "Roy",
      "email": "vaishnavi@example.com",
      "phone": "+919876543210"
    },
    "tripDetails": {
      "origin": "Kolkata",
      "destination": "Bangkok",
      "startDate": "2026-11-10T00:00:00.000Z",
      "endDate": "2026-11-20T00:00:00.000Z",
      "durationDays": 11
    },
    "travelers": [
      {
        "_id": "66f2bbbbb1c4a839f2222222",
        "name": "Vaishnavi Roy",
        "age": 30,
        "passportNumber": "P9876543",
        "gender": "female"
      }
    ],
    "pricingBreakdown": {
      "baseRate": 32,
      "durationDays": 11,
      "travelersCount": 1,
      "totalPremium": 32,
      "currency": "USD"
    },
    "status": "active",
    "claims": [],
    "createdAt": "2026-09-08T11:00:00.000Z"
  }
}
```

---

### 7. File a Claim on Active Policy
Allows policy owners to submit insurance reimbursement claims with itemized expenses and proof URLs. The policy must be currently `active`.

- **Endpoint**: `POST /api/v1/insurance/policies/:id/claims`
- **Auth Required**: Yes (User Bearer Token)

#### Path Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `id` | Mongo ObjectId | Yes | Policy MongoDB ID | `66f2bbbbb1c4a839f1111111` |

#### Request Body Parameters
| Field | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `description` | String | Yes | Detailed description of incident / loss | 5 - 2000 characters |
| `amountClaimed` | Number | Yes | Total claim amount requested | Must be > 0 |
| `documents` | Array[String] | No | Array of uploaded document/receipt URLs | List of valid URLs |

#### cURL Request
```bash
curl -X POST "http://localhost:5000/api/v1/insurance/policies/66f2bbbbb1c4a839f1111111/claims" \
  -H "Authorization: Bearer <USER_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "description": "Flight PG932 from Kolkata to Bangkok delayed by 7 hours. Incurred emergency accommodation and meal expenses.",
    "amountClaimed": 145.50,
    "documents": [
      "https://cdn.example.com/claims/airline_delay_letter.pdf",
      "https://cdn.example.com/claims/hotel_receipt.jpg"
    ]
  }'
```

#### Response Payload (`201 Created`)
```json
{
  "success": true,
  "message": "Insurance claim submitted successfully",
  "data": {
    "policyNumber": "INS-20260908-A4F1D9",
    "claim": {
      "_id": "66f3ccccb1c4a839f3333333",
      "claimNumber": "CLM-KTEX91-7C4E",
      "description": "Flight PG932 from Kolkata to Bangkok delayed by 7 hours. Incurred emergency accommodation and meal expenses.",
      "amountClaimed": 145.5,
      "amountApproved": 0,
      "currency": "USD",
      "documents": [
        "https://cdn.example.com/claims/airline_delay_letter.pdf",
        "https://cdn.example.com/claims/hotel_receipt.jpg"
      ],
      "status": "pending",
      "adminNotes": null,
      "filedAt": "2026-09-08T11:15:00.000Z",
      "resolvedAt": null,
      "resolvedBy": null,
      "createdAt": "2026-09-08T11:15:00.000Z",
      "updatedAt": "2026-09-08T11:15:00.000Z"
    }
  }
}
```

#### Error Response (`422 Unprocessable Entity` - Non-Active Policy)
```json
{
  "success": false,
  "message": "Cannot file claim: Policy is currently 'expired'. Claims can only be filed on active policies."
}
```

---

## 🛠 Admin & Staff API Endpoints

### 8. Create Insurance Plan
Allows administrators to define new insurance plans, destination scopes, and duration pricing matrices.

- **Endpoint**: `POST /api/v1/insurance/admin/plans`
- **Auth Required**: Yes (`admin`, `super_admin` Bearer Token)

#### Request Body Parameters
| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | String | Yes | - | Name of plan (3 - 150 chars) |
| `provider` | String | Yes | - | Insurance underwriting provider |
| `planType` | String | No | `"comprehensive"` | Enum: `comprehensive`, `medical`, `travel_delay`, `cancellation`, `student`, `schengen`, `senior_citizen`, `custom` |
| `destinationScope` | String | No | `"worldwide"` | Enum: `worldwide`, `worldwide_excluding_usa_canada`, `schengen`, `asia`, `middle_east`, `domestic`, `custom` |
| `basePrice` | Number | Yes | - | Base price for 1 week (>= 0) |
| `currency` | String | No | `"USD"` | Currency code (e.g. `USD`, `SAR`, `INR`) |
| `description` | String | No | `""` | Description of benefits |
| `coverageDetails` | Array[Object] | No | `[]` | Coverage items: `[{ title, coverageAmount, currency, description, deductible }]` |
| `durationOptions` | Array[Object] | No | `[]` | Duration pricing slabs: `[{ minDays, maxDays, price }]` |
| `minAge` | Integer | No | `0` | Minimum eligible age |
| `maxAge` | Integer | No | `99` | Maximum eligible age |
| `termsUrl` | String | No | `null` | Policy brochure / terms document URL |
| `policyDocumentTemplateUrl` | String | No | `null` | Certificate PDF template URL |
| `isActive` | Boolean | No | `true` | Publication status |

#### cURL Request
```bash
curl -X POST "http://localhost:5000/api/v1/insurance/admin/plans" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "name": "Umrah & Hajj Pilgrim Shield",
    "provider": "Tawuniya Insurance KSA",
    "planType": "comprehensive",
    "destinationScope": "middle_east",
    "description": "Specialized travel insurance covering pilgrimage rituals, heat stroke hospitalization, emergency medical evacuation, and lost luggage.",
    "basePrice": 25,
    "currency": "SAR",
    "coverageDetails": [
      {
        "title": "Emergency Hospitalization in KSA",
        "coverageAmount": 500000,
        "currency": "SAR",
        "description": "Full coverage for inpatient treatment across all licensed hospitals in Makkah & Madinah.",
        "deductible": 0
      },
      {
        "title": "Emergency Repatriation",
        "coverageAmount": 100000,
        "currency": "SAR",
        "deductible": 0
      }
    ],
    "durationOptions": [
      { "minDays": 1, "maxDays": 15, "price": 45 },
      { "minDays": 16, "maxDays": 30, "price": 75 },
      { "minDays": 31, "maxDays": 60, "price": 120 }
    ],
    "minAge": 0,
    "maxAge": 85,
    "termsUrl": "https://cdn.example.com/terms/umrah_shield_ar_en.pdf",
    "isActive": true
  }'
```

#### Response Payload (`201 Created`)
```json
{
  "success": true,
  "message": "Insurance plan created successfully",
  "data": {
    "_id": "66f4ddddb1c4a839f4444444",
    "name": "Umrah & Hajj Pilgrim Shield",
    "provider": "Tawuniya Insurance KSA",
    "planType": "comprehensive",
    "destinationScope": "middle_east",
    "basePrice": 25,
    "currency": "SAR",
    "coverageDetails": [
      {
        "_id": "66f4ddddb1c4a839f5555555",
        "title": "Emergency Hospitalization in KSA",
        "coverageAmount": 500000,
        "currency": "SAR",
        "deductible": 0
      }
    ],
    "durationOptions": [
      { "minDays": 1, "maxDays": 15, "price": 45 }
    ],
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-09-08T11:20:00.000Z",
    "updatedAt": "2026-09-08T11:20:00.000Z"
  }
}
```

---

### 9. Update Insurance Plan
Updates any subset of plan parameters, rates, duration options, or coverage lines.

- **Endpoint**: `PUT /api/v1/insurance/admin/plans/:id`
- **Auth Required**: Yes (`admin`, `super_admin` Bearer Token)

#### Path Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `id` | Mongo ObjectId | Yes | Plan MongoDB ID | `66f4ddddb1c4a839f4444444` |

#### Request Body Parameters
All fields are optional (e.g., `name`, `basePrice`, `currency`, `durationOptions`, `coverageDetails`, `isActive`, `termsUrl`, etc.).

#### cURL Request
```bash
curl -X PUT "http://localhost:5000/api/v1/insurance/admin/plans/66f4ddddb1c4a839f4444444" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "basePrice": 30,
    "durationOptions": [
      { "minDays": 1, "maxDays": 15, "price": 50 },
      { "minDays": 16, "maxDays": 30, "price": 85 }
    ]
  }'
```

#### Response Payload (`200 OK`)
```json
{
  "success": true,
  "message": "Insurance plan updated successfully",
  "data": {
    "_id": "66f4ddddb1c4a839f4444444",
    "name": "Umrah & Hajj Pilgrim Shield",
    "provider": "Tawuniya Insurance KSA",
    "basePrice": 30,
    "currency": "SAR",
    "isActive": true,
    "updatedAt": "2026-09-08T11:25:00.000Z"
  }
}
```

---

### 10. Soft-Delete Plan
Soft-deletes a plan (`isActive: false`, `isDeleted: true`), preventing future purchases while maintaining historical integrity for existing policies.

- **Endpoint**: `DELETE /api/v1/insurance/admin/plans/:id`
- **Auth Required**: Yes (`admin`, `super_admin` Bearer Token)

#### Path Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `id` | Mongo ObjectId | Yes | Plan MongoDB ID | `66f4ddddb1c4a839f4444444` |

#### cURL Request
```bash
curl -X DELETE "http://localhost:5000/api/v1/insurance/admin/plans/66f4ddddb1c4a839f4444444" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Accept: application/json"
```

#### Response Payload (`200 OK`)
```json
{
  "success": true,
  "message": "Insurance plan soft-deleted successfully",
  "data": {
    "planId": "66f4ddddb1c4a839f4444444"
  }
}
```

---

### 11. List All System Policies
Administrative dashboard view to monitor all platform policies across all users with lifecycle status, payment status, and pagination.

- **Endpoint**: `GET /api/v1/insurance/admin/policies`
- **Auth Required**: Yes (`admin`, `super_admin`, `sales_agent`, `support_agent` Bearer Token)

#### Query Parameters
| Parameter | Type | Required | Default | Description | Example |
|---|---|---|---|---|---|
| `page` | Integer | No | `1` | Page number | `1` |
| `limit` | Integer | No | `10` | Records per page (1 - 100) | `20` |
| `status` | String | No | - | Filter by status (`active`, `expired`, `cancelled`, `claimed`) | `active` |
| `paymentStatus` | String | No | - | Filter by payment status (`pending`, `paid`, `failed`, `refunded`) | `paid` |

#### cURL Request
```bash
curl -X GET "http://localhost:5000/api/v1/insurance/admin/policies?status=active&paymentStatus=paid&page=1&limit=20" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Accept: application/json"
```

#### Response Payload (`200 OK`)
```json
{
  "success": true,
  "message": "All insurance policies retrieved successfully",
  "data": [
    {
      "_id": "66f2bbbbb1c4a839f1111111",
      "policyNumber": "INS-20260908-A4F1D9",
      "plan": {
        "_id": "66f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Global Comprehensive Travel Shield",
        "provider": "Tata AIG / Alliance Global",
        "planType": "comprehensive",
        "destinationScope": "worldwide"
      },
      "user": {
        "_id": "66d01111b1c4a839faaaaaaa",
        "firstName": "Vaishnavi",
        "lastName": "Roy",
        "email": "vaishnavi@example.com",
        "phone": "+919876543210"
      },
      "tripDetails": {
        "origin": "Kolkata",
        "destination": "Bangkok",
        "startDate": "2026-11-10T00:00:00.000Z",
        "endDate": "2026-11-20T00:00:00.000Z",
        "durationDays": 11
      },
      "pricingBreakdown": {
        "totalPremium": 32,
        "currency": "USD"
      },
      "paymentStatus": "paid",
      "status": "active",
      "claims": [
        {
          "_id": "66f3ccccb1c4a839f3333333",
          "claimNumber": "CLM-KTEX91-7C4E",
          "amountClaimed": 145.5,
          "status": "pending"
        }
      ],
      "createdAt": "2026-09-08T11:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 12. Manually Update Policy Status
Allows operations staff to update policy lifecycle status (e.g., mark as `cancelled`, `expired`, or `claimed`).

- **Endpoint**: `PATCH /api/v1/insurance/admin/policies/:id/status`
- **Auth Required**: Yes (`admin`, `super_admin`, `support_agent` Bearer Token)

#### Path Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `id` | Mongo ObjectId | Yes | Policy MongoDB ID | `66f2bbbbb1c4a839f1111111` |

#### Request Body Parameters
| Field | Type | Required | Description |
|---|---|---|---|
| `status` | String | Yes | Enum: `active`, `expired`, `cancelled`, `claimed` |

#### cURL Request
```bash
curl -X PATCH "http://localhost:5000/api/v1/insurance/admin/policies/66f2bbbbb1c4a839f1111111/status" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "status": "cancelled"
  }'
```

#### Response Payload (`200 OK`)
```json
{
  "success": true,
  "message": "Policy status updated to cancelled",
  "data": {
    "_id": "66f2bbbbb1c4a839f1111111",
    "policyNumber": "INS-20260908-A4F1D9",
    "status": "cancelled",
    "updatedAt": "2026-09-08T11:30:00.000Z"
  }
}
```

---

### 13. Resolve Insurance Claim
Allows claims adjudicators to review, approve, reject, or mark claims as paid with authorized settlement amounts and internal remarks. If a claim is approved or paid, the parent policy status is automatically set to `claimed`.

- **Endpoint**: `PATCH /api/v1/insurance/admin/policies/:policyId/claims/:claimId`
- **Auth Required**: Yes (`admin`, `super_admin`, `support_agent` Bearer Token)

#### Path Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `policyId` | Mongo ObjectId | Yes | Policy MongoDB ID | `66f2bbbbb1c4a839f1111111` |
| `claimId` | Mongo ObjectId | Yes | Claim subdocument MongoDB ID | `66f3ccccb1c4a839f3333333` |

#### Request Body Parameters
| Field | Type | Required | Description |
|---|---|---|---|
| `status` | String | Yes | Enum: `pending`, `under_review`, `approved`, `rejected`, `paid` |
| `amountApproved` | Number | No | Adjudicated payout amount (>= 0) |
| `adminNotes` | String | No | Adjudication rationale or internal notes |

#### cURL Request
```bash
curl -X PATCH "http://localhost:5000/api/v1/insurance/admin/policies/66f2bbbbb1c4a839f1111111/claims/66f3ccccb1c4a839f3333333" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "status": "approved",
    "amountApproved": 140.00,
    "adminNotes": "Approved flight delay accommodation as per clause 4.2. Payout scheduled via wire transfer."
  }'
```

#### Response Payload (`200 OK`)
```json
{
  "success": true,
  "message": "Claim status updated to approved",
  "data": {
    "policyNumber": "INS-20260908-A4F1D9",
    "claim": {
      "_id": "66f3ccccb1c4a839f3333333",
      "claimNumber": "CLM-KTEX91-7C4E",
      "description": "Flight PG932 from Kolkata to Bangkok delayed by 7 hours...",
      "amountClaimed": 145.5,
      "amountApproved": 140,
      "currency": "USD",
      "status": "approved",
      "adminNotes": "Approved flight delay accommodation as per clause 4.2. Payout scheduled via wire transfer.",
      "filedAt": "2026-09-08T11:15:00.000Z",
      "resolvedAt": "2026-09-08T11:35:00.000Z",
      "resolvedBy": "66d00000b1c4a839f0000000"
    }
  }
}
```

---

## 🧮 Pricing & Calculation Logic

### 1. Duration Calculation
```text
durationDays = ceil(|endDate - startDate| / (1000 * 60 * 60 * 24)) + 1 (inclusive)
```

### 2. Tier Selection & Overage
1. If `durationDays` falls within a defined `durationOptions` slab `[minDays, maxDays]`, the slab's flat `price` is applied.
2. If `durationDays` exceeds the maximum configured slab, the formula applies:
   ```text
   baseRatePerPerson = highestTier.price + (extraDays * (plan.basePrice / 7))
   ```
3. Fallback (if no tiers configured):
   ```text
   baseRatePerPerson = plan.basePrice * ceil(durationDays / 7)
   ```

### 3. Senior Citizen Age Multipliers
| Traveler Age | Multiplier | Surcharge |
|---|---|---|
| `<= 65 years` | `1.0x` | 0% (Standard rate) |
| `66 - 75 years` | `1.2x` | +20% surcharge |
| `> 75 years` | `1.5x` | +50% surcharge |

---

## 📦 Data Schemas & Enums

### 1. Plan Type Enum
- `comprehensive`: All-inclusive emergency medical, baggage, delay, cancellation, and liability.
- `medical`: Emergency medical and hospitalization focus.
- `travel_delay`: Missed connections and delay allowances.
- `cancellation`: Flight/Hotel non-refundable fee protections.
- `student`: Long-term study abroad protection.
- `schengen`: Minimum €30,000 medical coverage required for European Schengen visas.
- `senior_citizen`: Specialized geriatric medical protection.
- `custom`: Tailored enterprise coverage.

### 2. Destination Scope Enum
- `worldwide`
- `worldwide_excluding_usa_canada`
- `schengen`
- `asia`
- `middle_east`
- `domestic`
- `custom`

### 3. Policy Status Enum
- `active`: Inception active and valid for claims.
- `expired`: Trip completed past `endDate`.
- `cancelled`: Revoked prior to inception.
- `claimed`: One or more claims approved/paid against the policy.

### 4. Claim Status Enum
- `pending`: Newly filed by user awaiting review.
- `under_review`: Staff reviewing receipts and circumstances.
- `approved`: Approved for reimbursement.
- `rejected`: Rejected due to deductible/policy exclusions.
- `paid`: Payment transferred to beneficiary.

---

## ⚠️ Standard Response & Error Codes

| Status Code | Meaning | Typical Scenario |
|---|---|---|
| `200 OK` | Request Succeeded | Retrieval, quotation calculation, updates |
| `201 Created` | Resource Created | Plan created, policy issued, claim filed |
| `400 Bad Request` | Validation Error | Missing required fields, `endDate < startDate`, invalid Mongo ID |
| `401 Unauthorized` | Missing / Invalid Token | Authorization header missing or expired JWT |
| `403 Forbidden` | Access Denied | Non-owner accessing another user's policy, non-admin creating plans |
| `404 Not Found` | Resource Not Found | Plan ID, Policy ID, or Claim ID does not exist |
| `422 Unprocessable Entity` | State Error | Attempting to file an insurance claim on an `expired` or `cancelled` policy |
| `500 Server Error` | Internal Server Error | Unhandled database or system exception |
