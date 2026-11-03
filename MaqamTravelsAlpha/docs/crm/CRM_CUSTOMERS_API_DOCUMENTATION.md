# 👥 CRM Customer Intelligence & Travellers API Documentation
> **Maqam Travels Alpha — CRM & Back-Office Operations**  
> Complete technical reference for Customer directory management, aggregate metrics (total travellers, booked offers, lifetime spend), individual customer details, and customer-associated traveller profiles.

---

## 📑 Table of Contents

1. [Overview & Endpoint Summary](#1-overview--endpoint-summary)
2. [Global Authentication & Role Guards](#2-global-authentication--role-guards)
3. [API Endpoints Reference](#3-api-endpoints-reference)
   - [1. List All Customers (`GET /api/v1/crm/customers`)](#1-list-all-customers)
   - [2. Get Specific Customer Details (`GET /api/v1/crm/customers/:id`)](#2-get-specific-customer-details)
   - [3. Get Traveller Details of Specific Customer (`GET /api/v1/crm/customers/:id/travellers`)](#3-get-traveller-details-of-specific-customer)
4. [Data Models & Aggregation Logic](#4-data-models--aggregation-logic)
5. [Error Taxonomy & Responses](#5-error-taxonomy--responses)
6. [Developer & QA Testing Playbook (cURL)](#6-developer--qa-testing-playbook-curl)

---

## 1. Overview & Endpoint Summary

The CRM Customers module enables sales agents, support staff, and administrators to gain 360° visibility into traveler relationships. It enriches standard user identity records with aggregated lifetime business data:

- **Base Route**: `/api/v1/crm/customers` (also accessible under `/api/v1/ops-crm/customers`)

| HTTP Method | Endpoint | Description |
| :--- | :--- | :--- |
| **`GET`** | `/api/v1/crm/customers` | Paginated list of registered customers with metrics (`name`, `phone`, `email`, `totalTravellers`, `bookedOffersCount`, `isActive`, `totalMoneySpent`). |
| **`GET`** | `/api/v1/crm/customers/:id` | Detailed customer profile with lifetime spending breakdown, total bookings count, and recent reservations. |
| **`GET`** | `/api/v1/crm/customers/:id/travellers` | List of all saved family members/travellers, passport details, passenger types, and defaults for a customer. |

---

## 2. Global Authentication & Role Guards

All endpoints require JWT Bearer authentication and are accessible by CRM and administrative staff:

- **Header**: `Authorization: Bearer <ACCESS_TOKEN>`
- **Allowed Roles**:
  - `admin`
  - `super_admin`
  - `sales_agent`
  - `support_agent`

---

## 3. API Endpoints Reference

### 1. List All Customers

Retrieve all registered customers (`role === 'customer'`) with computed metrics.

- **Method**: `GET`
- **Path**: `/api/v1/crm/customers`
- **Auth**: `Bearer <token>` (`admin`, `super_admin`, `sales_agent`, `support_agent`)

#### Query Parameters:

| Parameter | Type | Default | Description | Example |
| :--- | :--- | :---: | :--- | :--- |
| `page` | Integer | `1` | Page number (min: 1) | `1` |
| `limit` | Integer | `20` | Items per page (min: 1, max: 100) | `20` |
| `search` | String | - | Search by customer name (`firstName`, `lastName`), `phone`, or `email` | `"Ahmed"` |
| `isActive` | Boolean | - | Filter by account active status | `true` |
| `sortBy` | String | `createdAt` | Sort field (`createdAt`, `firstName`, `lastName`, `updatedAt`) | `createdAt` |
| `sortOrder` | String | `desc` | Sort direction (`asc`, `desc`, `1`, `-1`) | `desc` |

#### Response Body Payload (`200 OK`):
```json
{
  "success": true,
  "message": "Customers retrieved successfully",
  "data": [
    {
      "_id": "6aacc0352df766456873afa1",
      "name": "Ahmed Khan",
      "firstName": "Ahmed",
      "lastName": "Khan",
      "phone": "9876543210",
      "email": "ahmed.khan@example.com",
      "totalTravellers": 3,
      "bookedOffersCount": 2,
      "isActive": true,
      "totalMoneySpent": 85000.50,
      "createdAt": "2026-02-10T08:30:00.000Z"
    },
    {
      "_id": "6ab612fe1362e79ab84cd4af",
      "name": "Fatima Zahra",
      "firstName": "Fatima",
      "lastName": "Zahra",
      "phone": "9896563835",
      "email": "fatima.z@example.com",
      "totalTravellers": 1,
      "bookedOffersCount": 0,
      "isActive": true,
      "totalMoneySpent": 32000.00,
      "createdAt": "2026-03-01T12:15:00.000Z"
    }
  ],
  "meta": {
    "total": 48,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### 2. Get Specific Customer Details

Retrieve comprehensive profile information, lifetime spending, booking count, booked offers count, and recent bookings for an individual customer.

- **Method**: `GET`
- **Path**: `/api/v1/crm/customers/:id`
- **Auth**: `Bearer <token>` (`admin`, `super_admin`, `sales_agent`, `support_agent`)

#### Path Parameters:

| Parameter | Type | Required | Description | Example |
| :--- | :--- | :---: | :--- | :--- |
| `id` | String (MongoId) | **Yes** | 24-character hexadecimal MongoDB ObjectId | `6aacc0352df766456873afa1` |

#### Response Body Payload (`200 OK`):
```json
{
  "success": true,
  "message": "Customer details retrieved successfully",
  "data": {
    "_id": "6aacc0352df766456873afa1",
    "name": "Ahmed Khan",
    "firstName": "Ahmed",
    "lastName": "Khan",
    "phone": "9876543210",
    "email": "ahmed.khan@example.com",
    "avatar": "https://res.cloudinary.com/.../avatar1.png",
    "role": "customer",
    "isActive": true,
    "isVerified": true,
    "isPhoneVerified": true,
    "totalTravellers": 3,
    "bookedOffersCount": 2,
    "totalBookingsCount": 5,
    "totalMoneySpent": 85000.50,
    "currencyBreakdown": [
      {
        "currency": "INR",
        "spent": 85000.50,
        "transactions": 4
      }
    ],
    "recentBookings": [
      {
        "_id": "6b1e2f3a4b5c6d7e8f9a0b1c",
        "bookingType": "hotel",
        "status": "confirmed",
        "createdAt": "2026-03-15T10:30:15.120Z"
      }
    ],
    "createdAt": "2026-02-10T08:30:00.000Z",
    "updatedAt": "2026-03-15T10:32:05.000Z"
  }
}
```

#### Error Response (`404 Not Found`):
```json
{
  "success": false,
  "message": "Customer not found",
  "statusCode": 404
}
```

---

### 3. Get Traveller Details of Specific Customer

Retrieve all saved passengers and family members associated with a specific customer account (e.g. passport numbers, dates of birth, nationality, default passenger status).

- **Method**: `GET`
- **Path**: `/api/v1/crm/customers/:id/travellers`
- **Auth**: `Bearer <token>` (`admin`, `super_admin`, `sales_agent`, `support_agent`)

#### Path Parameters:

| Parameter | Type | Required | Description | Example |
| :--- | :--- | :---: | :--- | :--- |
| `id` | String (MongoId) | **Yes** | Customer MongoDB ObjectId | `6aacc0352df766456873afa1` |

#### Response Body Payload (`200 OK`):
```json
{
  "success": true,
  "message": "Customer travellers retrieved successfully",
  "data": {
    "customer": {
      "_id": "6aacc0352df766456873afa1",
      "name": "Ahmed Khan",
      "phone": "9876543210",
      "email": "ahmed.khan@example.com"
    },
    "totalTravellers": 2,
    "travellers": [
      {
        "_id": "6c4e5f6a7b8c9d0e1f2a3b4c",
        "title": "Mr",
        "firstName": "Ahmed",
        "lastName": "Khan",
        "middleName": null,
        "fullName": "Mr Ahmed Khan",
        "passengerType": "Adult",
        "gender": "Male",
        "dateOfBirth": "1990-05-14T00:00:00.000Z",
        "nationality": "Indian",
        "email": "ahmed.khan@example.com",
        "phone": "9876543210",
        "cellCountryCode": "+91",
        "passportNo": "Z1234567",
        "passportExpiry": "2032-05-14T00:00:00.000Z",
        "passportIssueCountryCode": "IN",
        "passportIssueDate": "2022-05-14T00:00:00.000Z",
        "address": {
          "addressLine1": "123 Connaught Place",
          "city": "New Delhi",
          "countryCode": "IN",
          "countryName": "INDIA"
        },
        "documentType": "Passport",
        "documentId": "DOC_98124",
        "isDefault": true,
        "createdAt": "2026-02-11T09:00:00.000Z",
        "updatedAt": "2026-02-11T09:00:00.000Z"
      },
      {
        "_id": "6c5f6a7b8c9d0e1f2a3b4c5d",
        "title": "Mrs",
        "firstName": "Zainab",
        "lastName": "Khan",
        "middleName": null,
        "fullName": "Mrs Zainab Khan",
        "passengerType": "Adult",
        "gender": "Female",
        "dateOfBirth": "1992-08-20T00:00:00.000Z",
        "nationality": "Indian",
        "email": null,
        "phone": null,
        "cellCountryCode": "+91",
        "passportNo": "Z7654321",
        "passportExpiry": "2030-08-20T00:00:00.000Z",
        "passportIssueCountryCode": "IN",
        "passportIssueDate": "2020-08-20T00:00:00.000Z",
        "address": {
          "addressLine1": "123 Connaught Place",
          "city": "New Delhi",
          "countryCode": "IN",
          "countryName": "INDIA"
        },
        "documentType": "Passport",
        "documentId": "DOC_98125",
        "isDefault": false,
        "createdAt": "2026-02-15T14:20:00.000Z",
        "updatedAt": "2026-02-15T14:20:00.000Z"
      }
    ]
  }
}
```

---

## 4. Data Models & Aggregation Logic

### Metrics Aggregation Strategy:
To maintain high throughput on the paginated customer list, the service uses **3 parallel targeted aggregation queries** across the indexed customer IDs on each page:

1. **`totalTravellers`**:
   ```javascript
   Traveller.aggregate([
     { $match: { userId: { $in: customerIds } } },
     { $group: { _id: '$userId', count: { $sum: 1 } } }
   ]);
   ```
2. **`bookedOffersCount`**:
   ```javascript
   OfferBooking.aggregate([
     { $match: { userId: { $in: customerIds } } },
     { $group: { _id: '$userId', count: { $sum: 1 } } }
   ]);
   ```
3. **`totalMoneySpent`**:
   Calculates actual net expenditure from paid/captured payment transactions minus refunds:
   ```javascript
   Payment.aggregate([
     {
       $match: {
         userId: { $in: customerIds },
         status: { $in: ['paid', 'captured', 'partially_refunded'] }
       }
     },
     {
       $group: {
         _id: '$userId',
         totalSpent: {
           $sum: { $subtract: ['$amount', { $ifNull: ['$totalRefunded', 0] }] }
         }
       }
     }
   ]);
   ```

---

## 5. Error Taxonomy & Responses

| Status Code | Error Message | Reason / Fix |
| :---: | :--- | :--- |
| **`400`** | `"Invalid customer ID format"` | `:id` is not a valid 24-character hexadecimal MongoDB ObjectId. |
| **`401`** | `"Authentication token missing"` | Missing or expired JWT in `Authorization` header. |
| **`403`** | `"Insufficient permissions"` | User role is not `admin`, `super_admin`, `sales_agent`, or `support_agent`. |
| **`404`** | `"Customer not found"` | No user found matching the ID with `role === 'customer'`. |

---

## 6. Developer & QA Testing Playbook (cURL)

Replace `<TOKEN>` with your CRM agent or admin JWT access token.

### 1. List Customers with Pagination and Search:
```bash
curl -X GET "http://localhost:5000/api/v1/crm/customers?page=1&limit=10&search=Ahmed" \
  -H "Authorization: Bearer <TOKEN>"
```

### 2. Filter Active Customers:
```bash
curl -X GET "http://localhost:5000/api/v1/crm/customers?isActive=true&sortBy=createdAt&sortOrder=desc" \
  -H "Authorization: Bearer <TOKEN>"
```

### 3. Get Specific Customer Profile & Metrics:
```bash
curl -X GET "http://localhost:5000/api/v1/crm/customers/6aacc0352df766456873afa1" \
  -H "Authorization: Bearer <TOKEN>"
```

### 4. Get Customer's Saved Travellers:
```bash
curl -X GET "http://localhost:5000/api/v1/crm/customers/6aacc0352df766456873afa1/travellers" \
  -H "Authorization: Bearer <TOKEN>"
```
