# Package Module - CRM / Admin API Documentation

**Base Path:** `/api/v1/crm/packages`  
**Authentication:** Required for all routes (`Authorization: Bearer <token>`)  
**Authorized Roles:** `admin`, `super_admin`, `finance`, `agent` (Role specific per endpoint)

---

## 📋 Table of Contents
1. [Overview & Core Concepts](#1-overview--core-concepts)
2. [Package Management Endpoints](#2-package-management-endpoints)
   - [2.1 List All Packages (with Margin Analytics)](#21-list-all-packages-with-margin-analytics)
   - [2.2 Create New Package](#22-create-new-package)
   - [2.3 Get Package Details by ID](#23-get-package-details-by-id)
   - [2.4 Update Package Configuration](#24-update-package-configuration)
   - [2.5 Deactivate Package](#25-deactivate-package)
3. [Package Booking Operations Endpoints](#3-package-booking-operations-endpoints)
   - [3.1 List All Package Bookings](#31-list-all-package-bookings)
   - [3.2 Get Package Booking Details by ID](#32-get-package-booking-details-by-id)
   - [3.3 Direct Booking for Customer (Offline / Bank Transfer)](#33-direct-booking-for-customer-offline--bank-transfer)
   - [3.4 Assign Booking to Operations Agent](#34-assign-booking-to-operations-agent)
   - [3.5 Update Confirmed Booking (Dates & Contact Details)](#35-update-confirmed-booking-dates--contact-details)
   - [3.6 Add Operational Remark to Booking](#36-add-operational-remark-to-booking)
   - [3.7 Cancel Package Booking & Release Stock](#37-cancel-package-booking--release-stock)

---

## 1. Overview & Core Concepts

- **3-Tier Architecture:** Packages bundle standalone **Offers** (Flight offers, Hotel offers, etc.).
- **Guardrail:** Every package must contain **at least 2 offer components** (e.g., Flight + Hotel).
- **Tour Guide Option:**
  - Packages can specify default guide capabilities (`guideActive`, `guideLocation`, `guidePrice`).
  - During booking, admins (and customers) can include a tour guide (`includeGuide`, `guideSelected`, `guideLocation`, `guidePrice`, `guideId`).
  - The guide price is seamlessly added to the package sell price: `finalSellPrice = basePackageSellPrice - deductions + swapDeltas + guidePrice`, and `totalAmount = finalSellPrice * quantity`.
- **Pricing:**
  - `sellPrice`: Can be specified manually or auto-calculated from underlying offers minus the `bundleDiscountPercentage`.
  - Margin and wholesale cost breakdowns are exposed to admins.
- **Stock Claiming:** Confirmed bookings directly lock and claim inventory units (`TicketStock`, `HotelStock`). Cancelling a booking automatically releases claimed stock units.

---

## 2. Package Management Endpoints

---

### 2.1 List All Packages (with Margin Analytics)
Retrieves all packages with pagination, wholesale cost prices, profit margins, discount percentages, and active statuses.

- **Method:** `GET`
- **Path:** `/api/v1/crm/packages`
- **Access:** `admin`, `super_admin`
- **Query Parameters:**
  - `page` *(optional, integer, default: 1)*
  - `limit` *(optional, integer, default: 10)*

#### cURL Example
```bash
curl -X GET "http://localhost:5000/api/v1/crm/packages?page=1&limit=10" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "packages": [
    {
      "_id": "66d4a8e2e944f7b6b199e815",
      "title": "Dubai Golden Sands 5D4N Getaway",
      "destination": "Dubai",
      "sellPrice": 36000,
      "costPrice": 28000,
      "margin": 8000,
      "marginPercentage": 22.22,
      "bundleDiscountPercentage": 10,
      "availableSlots": 14,
      "isActive": true,
      "isPublic": true,
      "createdAt": "2026-09-01T10:00:00.000Z"
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

### 2.2 Create New Package
Creates a new package bundle with at least 2 offer components. If `sellPrice` is omitted, it auto-calculates based on underlying offers and discount percentage.

- **Method:** `POST`
- **Path:** `/api/v1/crm/packages`
- **Access:** `admin`, `super_admin`

#### Request Body Schema
```json
{
  "title": "Dubai Explorer 5D4N",
  "description": "Complete Dubai package with return flights, 4-star hotel, and transfers",
  "destination": "Dubai",
  "images": [
    "https://res.cloudinary.com/travel/image/upload/dubai.jpg"
  ],
  "guideActive": true,
  "guideLocation": "Dubai",
  "guidePrice": 1500,
  "offerRefs": [
    {
      "offer": "66d4a8e2e944f7b6b199e810",
      "unitsPerBooking": 1,
      "isOptional": false,
      "isDefaultSelected": true,
      "allowSwap": true,
      "notes": "Return Flight DEL-DXB"
    },
    {
      "offer": "66d4a8e2e944f7b6b199e811",
      "unitsPerBooking": 1,
      "isOptional": true,
      "isDefaultSelected": true,
      "allowSwap": true,
      "notes": "4-Star Hotel Stay 4 Nights"
    }
  ],
  "bundleDiscountPercentage": 10,
  "sellPrice": 36000,
  "inclusions": [
    "Return Flights",
    "4-Star Luxury Hotel",
    "Airport Transfers"
  ],
  "itinerary": [
    {
      "day": 1,
      "title": "Arrival in Dubai & Marina Dhow Cruise",
      "description": "Land at DXB, hotel check-in, and evening cruise dinner.",
      "assignedOffers": [
        {
          "offer": "66d4a8e2e944f7b6b199e810",
          "role": "flight_arrival",
          "notes": "Flight lands at 11:30 AM"
        }
      ]
    }
  ],
  "validity": {
    "from": "2026-10-01T00:00:00.000Z",
    "to": "2026-12-31T23:59:59.000Z"
  },
  "isActive": true,
  "isPublic": true
}
```

#### cURL Example
```bash
curl -X POST "http://localhost:5000/api/v1/crm/packages" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Dubai Explorer 5D4N",
    "description": "Complete Dubai package with return flights, 4-star hotel, and transfers",
    "destination": "Dubai",
    "images": ["https://res.cloudinary.com/travel/image/upload/dubai.jpg"],
    "guideActive": true,
    "guideLocation": "Dubai",
    "guidePrice": 1500,
    "offerRefs": [
      {
        "offer": "66d4a8e2e944f7b6b199e810",
        "unitsPerBooking": 1,
        "isOptional": false,
        "isDefaultSelected": true,
        "allowSwap": true
      },
      {
        "offer": "66d4a8e2e944f7b6b199e811",
        "unitsPerBooking": 1,
        "isOptional": true,
        "isDefaultSelected": true,
        "allowSwap": true
      }
    ],
    "bundleDiscountPercentage": 10,
    "sellPrice": 36000,
    "inclusions": ["Return Flights", "4-Star Hotel", "Airport Transfers"],
    "itinerary": [
      {
        "day": 1,
        "title": "Arrival in Dubai",
        "description": "Airport pickup and hotel check-in."
      }
    ]
  }'
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "package": {
    "_id": "66d4a8e2e944f7b6b199e815",
    "title": "Dubai Explorer 5D4N",
    "destination": "Dubai",
    "guideActive": true,
    "guideLocation": "Dubai",
    "guidePrice": 1500,
    "bundleDiscountPercentage": 10,
    "sellPrice": 36000,
    "offerRefs": [...],
    "itinerary": [...],
    "isActive": true,
    "isPublic": true,
    "createdBy": "66c1b011e944f7b6b199e801",
    "createdAt": "2026-09-09T13:45:00.000Z",
    "updatedAt": "2026-09-09T13:45:00.000Z"
  }
}
```

---

### 2.3 Get Package Details by ID
Retrieves full details for a package including wholesale cost calculations and margin breakdowns.

- **Method:** `GET`
- **Path:** `/api/v1/crm/packages/:id`
- **Access:** `admin`, `super_admin`

#### cURL Example
```bash
curl -X GET "http://localhost:5000/api/v1/crm/packages/66d4a8e2e944f7b6b199e815" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "package": {
    "_id": "66d4a8e2e944f7b6b199e815",
    "title": "Dubai Explorer 5D4N",
    "destination": "Dubai",
    "guideActive": true,
    "guideLocation": "Dubai",
    "guidePrice": 1500,
    "sellPrice": 36000,
    "costPrice": 28000,
    "margin": 8000,
    "marginPercentage": 22.22,
    "availableSlots": 12,
    "offerRefs": [...],
    "itinerary": [...],
    "isActive": true
  }
}
```

---

### 2.4 Update Package Configuration
Updates fields such as title, description, pricing, discount, guide availability (`guideActive`, `guideLocation`, `guidePrice`), offerRefs, or itinerary.

- **Method:** `PATCH`
- **Path:** `/api/v1/crm/packages/:id`
- **Access:** `admin`, `super_admin`

#### Request Body Schema
```json
{
  "title": "Dubai Luxury Summer Getaway 5D4N",
  "bundleDiscountPercentage": 15,
  "sellPrice": 34000,
  "guideActive": true,
  "guideLocation": "Dubai Marina",
  "guidePrice": 1800,
  "isActive": true,
  "isPublic": true
}
```

#### cURL Example
```bash
curl -X PATCH "http://localhost:5000/api/v1/crm/packages/66d4a8e2e944f7b6b199e815" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Dubai Luxury Summer Getaway 5D4N",
    "bundleDiscountPercentage": 15,
    "sellPrice": 34000,
    "guideActive": true,
    "guidePrice": 1800
  }'
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "package": {
    "_id": "66d4a8e2e944f7b6b199e815",
    "title": "Dubai Luxury Summer Getaway 5D4N",
    "sellPrice": 34000,
    "bundleDiscountPercentage": 15,
    "updatedAt": "2026-09-09T13:46:00.000Z"
  }
}
```

---

### 2.5 Deactivate Package
Sets `isActive = false`, hiding the package from user storefronts while preserving past bookings.

- **Method:** `PATCH`
- **Path:** `/api/v1/crm/packages/:id/deactivate`
- **Access:** `admin`, `super_admin`

#### cURL Example
```bash
curl -X PATCH "http://localhost:5000/api/v1/crm/packages/66d4a8e2e944f7b6b199e815/deactivate" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "package": {
    "_id": "66d4a8e2e944f7b6b199e815",
    "title": "Dubai Explorer 5D4N",
    "isActive": false,
    "updatedAt": "2026-09-09T13:47:00.000Z"
  }
}
```

---

## 3. Package Booking Operations Endpoints

---

### 3.1 List All Package Bookings
List package bookings with pagination and filters.

- **Method:** `GET`
- **Path:** `/api/v1/crm/packages/bookings`
- **Access:** `admin`, `super_admin`, `finance`, `agent`
- **Query Parameters:**
  - `page` *(integer, default: 1)*
  - `limit` *(integer, default: 20)*
  - `status` *(string, enum: `initiated`, `pending`, `confirmed`, `cancelled`)*
  - `packageId` *(string, ObjectId)*
  - `userId` *(string, ObjectId)*
  - `assignedTo` *(string, ObjectId)*

#### cURL Example
```bash
curl -X GET "http://localhost:5000/api/v1/crm/packages/bookings?status=confirmed&page=1&limit=20" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "bookings": [
    {
      "_id": "66d4b555e944f7b6b199e825",
      "userId": {
        "_id": "66c1b011e944f7b6b199e801",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+919876543210"
      },
      "packageId": {
        "_id": "66d4a8e2e944f7b6b199e815",
        "title": "Dubai Explorer 5D4N"
      },
      "quantity": 1,
      "totalAmount": 36000,
      "status": "confirmed",
      "assignedTo": "66ce08f0e944f7b6b199e810",
      "createdAt": "2026-09-09T11:00:00.000Z"
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

### 3.2 Get Package Booking Details by ID
Retrieves complete booking details, claimed stock units, travellers, and operational audit trail.

- **Method:** `GET`
- **Path:** `/api/v1/crm/packages/bookings/:id`
- **Access:** `admin`, `super_admin`, `finance`, `agent`

#### cURL Example
```bash
curl -X GET "http://localhost:5000/api/v1/crm/packages/bookings/66d4b555e944f7b6b199e825" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "booking": {
    "_id": "66d4b555e944f7b6b199e825",
    "userId": {
      "_id": "66c1b011e944f7b6b199e801",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "guideSelected": "Sheikh Ahmad Al-Makki",
    "guideLocation": ["Dubai"],
    "guidePrice": 1500,
    "packageSnapshot": {
      "title": "Dubai Explorer 5D4N",
      "destination": "Dubai",
      "basePackageSellPrice": 36000,
      "guidePrice": 1500,
      "guideSelected": "Sheikh Ahmad Al-Makki",
      "finalSellPrice": 37500
    },
    "travellers": [
      {
        "travellerId": "66c1b011e944f7b6b199e801",
        "isLead": true
      }
    ],
    "claimedUnits": [
      {
        "stockModel": "TicketStock",
        "stock": "66d4a8e2e944f7b6b199e810",
        "unitId": "66d4a8e2e944f7b6b199e811"
      }
    ],
    "quantity": 1,
    "totalAmount": 37500,
    "status": "confirmed",
    "assignedTo": "66ce08f0e944f7b6b199e810",
    "remarks": [
      {
        "text": "Confirmed booking via bank transfer",
        "createdAt": "2026-09-09T11:00:00.000Z"
      }
    ]
  }
}
```

---

### 3.3 Direct Booking for Customer (Offline / Bank Transfer)
Admin/Agent books a package bundle directly for a customer with offline bank transfer, claiming wholesale stock units directly into confirmed/used state and optionally attaching a tour guide.

- **Method:** `POST`
- **Path:** `/api/v1/crm/packages/book-for-customer`
- **Access:** `admin`, `super_admin`, `finance`, `agent`

#### Request Body Schema
```json
{
  "customerId": "66c1b011e944f7b6b199e801",
  "packageId": "66d4a8e2e944f7b6b199e815",
  "quantity": 1,
  "excludedOfferIds": [],
  "swappedOffers": [],
  "includeGuide": true,
  "guideSelected": "Sheikh Ahmad Al-Makki",
  "guideLocation": ["Dubai"],
  "guidePrice": 1500,
  "guideId": "66d4a8e2e944f7b6b199e999",
  "travellers": [
    {
      "travellerId": "66c1b011e944f7b6b199e801",
      "isLead": true
    }
  ],
  "travelDates": {
    "startDate": "2026-11-10T00:00:00.000Z",
    "endDate": "2026-11-15T00:00:00.000Z"
  },
  "contactDetails": {
    "email": "customer@example.com",
    "phone": "+919876543210",
    "emergencyContact": "+919876543211"
  },
  "payment": {
    "method": "bank_transfer",
    "referenceNumber": "NEFT-HDFC-994821034",
    "notes": "Paid directly in branch"
  }
}
```

#### Guide Selection Parameters Reference

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `includeGuide` | `boolean` | Optional | Set `true` to attach a guide to this booking. If omitted but `guideSelected` or `guideId` is given, guide is automatically included. |
| `guideSelected` | `string` | Optional | Name or label for the selected guide (e.g., `"Sheikh Ahmad Al-Makki"`). Defaults to package's configured guide location label if omitted. |
| `guideLocation` | `array` / `string` | Optional | Destination or coverage areas (e.g., `["Dubai"]`). Defaults to package `guideLocation` or destination. |
| `guidePrice` | `number` | Optional | Guide fee to add to package price. If omitted, defaults to package `guidePrice` or the referenced Guide's catalog rate. |
| `guideId` | `string` (ObjectId) | Optional | References a certified guide document in the `Guide` catalog model to automatically load credentials and rates. |

> **Pricing Calculation with Guide:**  
> `finalSellPrice = basePackageSellPrice - totalDeductions + totalSwapDeltas + guidePrice`  
> `totalAmount = finalSellPrice * quantity`

#### cURL Example
```bash
curl -X POST "http://localhost:5000/api/v1/crm/packages/book-for-customer" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "66c1b011e944f7b6b199e801",
    "packageId": "66d4a8e2e944f7b6b199e815",
    "quantity": 1,
    "includeGuide": true,
    "guideSelected": "Sheikh Ahmad Al-Makki",
    "guideLocation": ["Dubai"],
    "guidePrice": 1500,
    "travellers": [
      {
        "travellerId": "66c1b011e944f7b6b199e801",
        "isLead": true
      }
    ],
    "travelDates": {
      "startDate": "2026-11-10T00:00:00.000Z",
      "endDate": "2026-11-15T00:00:00.000Z"
    },
    "payment": {
      "method": "bank_transfer",
      "referenceNumber": "NEFT-HDFC-994821034",
      "notes": "Offline bank transfer received"
    }
  }'
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Direct package booking completed successfully via bank transfer",
  "booking": {
    "_id": "66d4b555e944f7b6b199e825",
    "userId": "66c1b011e944f7b6b199e801",
    "packageId": "66d4a8e2e944f7b6b199e815",
    "guideSelected": "Sheikh Ahmad Al-Makki",
    "guideLocation": [
      "Dubai"
    ],
    "guidePrice": 1500,
    "quantity": 1,
    "totalAmount": 37500,
    "status": "confirmed"
  },
  "payment": {
    "_id": "66d4b555e944f7b6b199e830",
    "amount": 37500,
    "paymentMethod": "bank_transfer",
    "status": "paid"
  },
  "masterBooking": {
    "_id": "66d4b555e944f7b6b199e840",
    "bookingType": "package",
    "status": "confirmed",
    "details": {
      "totalPrice": 37500
    }
  }
}
```

---

### 3.4 Assign Booking to Operations Agent
Assigns the package booking to an Operations Agent / Case Officer.

- **Method:** `PATCH`
- **Path:** `/api/v1/crm/packages/bookings/:id/assign`
- **Access:** `admin`, `super_admin`, `finance`, `agent`

#### Request Body Schema
```json
{
  "assignedTo": "66ce08f0e944f7b6b199e810"
}
```
*(Accepts `assignedTo`, `agentId`, or `caseOfficerId`)*

#### cURL Example
```bash
curl -X PATCH "http://localhost:5000/api/v1/crm/packages/bookings/66d4b555e944f7b6b199e825/assign" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "assignedTo": "66ce08f0e944f7b6b199e810"
  }'
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Package booking assigned successfully",
  "booking": {
    "_id": "66d4b555e944f7b6b199e825",
    "assignedTo": "66ce08f0e944f7b6b199e810"
  }
}
```

---

### 3.5 Update Confirmed Booking (Dates & Contact Details)
Modify travel dates, contact details, and operational remark on a confirmed booking. Structural changes (adding/removing/swapping components) are rejected.

- **Method:** `PATCH`
- **Path:** `/api/v1/crm/packages/bookings/:id`
- **Access:** `admin`, `super_admin`, `agent`

#### Request Body Schema
```json
{
  "travelDates": {
    "startDate": "2026-11-12T00:00:00.000Z",
    "endDate": "2026-11-17T00:00:00.000Z"
  },
  "contactDetails": {
    "email": "john.updated@example.com",
    "phone": "+919876543210",
    "emergencyContact": "+919988776655"
  },
  "remark": "Customer requested date shift by 2 days"
}
```

#### cURL Example
```bash
curl -X PATCH "http://localhost:5000/api/v1/crm/packages/bookings/66d4b555e944f7b6b199e825" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "travelDates": {
      "startDate": "2026-11-12T00:00:00.000Z",
      "endDate": "2026-11-17T00:00:00.000Z"
    },
    "remark": "Customer requested date shift by 2 days"
  }'
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Confirmed package booking updated successfully",
  "booking": {
    "_id": "66d4b555e944f7b6b199e825",
    "travelDates": {
      "startDate": "2026-11-12T00:00:00.000Z",
      "endDate": "2026-11-17T00:00:00.000Z"
    },
    "remark": "Customer requested date shift by 2 days"
  }
}
```

---

### 3.6 Add Operational Remark to Booking
Appends an internal note/remark to the booking's audit log.

- **Method:** `PATCH`
- **Path:** `/api/v1/crm/packages/bookings/:id/remark`
- **Access:** `admin`, `super_admin`, `agent`

#### Request Body Schema
```json
{
  "remark": "Visa documents forwarded to embassy team"
}
```
*(Accepts `remark` or `text`)*

#### cURL Example
```bash
curl -X PATCH "http://localhost:5000/api/v1/crm/packages/bookings/66d4b555e944f7b6b199e825/remark" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "remark": "Visa documents forwarded to embassy team"
  }'
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Remark added successfully",
  "booking": {
    "_id": "66d4b555e944f7b6b199e825",
    "remark": "Visa documents forwarded to embassy team",
    "remarks": [
      {
        "text": "Visa documents forwarded to embassy team",
        "author": "66ce08f0e944f7b6b199e810",
        "createdAt": "2026-09-09T13:48:00.000Z"
      }
    ]
  }
}
```

---

### 3.7 Cancel Package Booking & Release Stock
Cancels a package booking, automatically releases all claimed flight/hotel units back to available wholesale inventory, updates master booking & payment status.

- **Method:** `POST`
- **Path:** `/api/v1/crm/packages/bookings/:id/cancel`
- **Access:** `admin`, `super_admin`, `finance`, `agent`

#### Request Body Schema
```json
{
  "reason": "Customer requested cancellation due to medical emergency"
}
```

#### cURL Example
```bash
curl -X POST "http://localhost:5000/api/v1/crm/packages/bookings/66d4b555e944f7b6b199e825/cancel" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Customer requested cancellation due to medical emergency"
  }'
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Package booking cancelled successfully and claimed stock released",
  "booking": {
    "_id": "66d4b555e944f7b6b199e825",
    "status": "cancelled",
    "cancellationReason": "Customer requested cancellation due to medical emergency",
    "cancelledAt": "2026-09-09T13:49:00.000Z"
  }
}
```

---

## 4. Error Responses Reference

| Status Code | Error Message | Description |
| :--- | :--- | :--- |
| `400 Bad Request` | `A Package must contain at least 2 Offer components...` | Validation failed (missing required fields, offerRefs < 2, etc.) |
| `400 Bad Request` | `Structural modifications (adding, removing, or swapping offers) are not allowed on confirmed bookings.` | Guardrail triggered when trying to alter offers on confirmed booking |
| `401 Unauthorized` | `Authentication token missing` / `Invalid token` | Missing or expired JWT Bearer token |
| `403 Forbidden` | `Insufficient permissions` | User role is not permitted to call this endpoint |
| `404 Not Found` | `Package not found` / `Package booking not found` | The provided resource ID does not exist |
| `500 Server Error` | `Internal Server Error` | Unhandled server or database error |
