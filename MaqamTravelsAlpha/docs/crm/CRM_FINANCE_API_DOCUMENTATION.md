# 💰 CRM Finance & Revenue Analytics API Documentation
> **Maqam Travels Alpha — Back-Office CRM & Financial Operations**  
> Complete technical reference, endpoint specifications, request payloads, response schemas, and financial aggregation formulas for all CRM Finance modules.

---

## 📑 Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Global Authentication & Request Headers](#2-global-authentication--request-headers)
3. [Financial Metric Aggregation Formulas](#3-financial-metric-aggregation-formulas)
4. [Supported Enums & Data Types](#4-supported-enums--data-types)
5. [API Endpoint Specifications](#5-api-endpoint-specifications)
   - [1. Get Finance Revenue Overview (`POST & GET /finance/overview`)](#1-get-finance-revenue-overview)
   - [2. List Financial Transactions (`GET /finance/transactions`)](#2-list-financial-transactions)
   - [3. Get Single Transaction Details (`GET /finance/transactions/:id`)](#3-get-single-transaction-details)
   - [4. List Payment Refunds History (`GET /finance/refunds`)](#4-list-payment-refunds-history)
   - [5. Update Payment Refund Status (`PATCH /finance/refunds/:refundId/status`)](#5-update-payment-refunds-status)
6. [Error Taxonomy & Status Codes](#6-error-taxonomy--status-codes)
7. [Developer & QA Testing Playbook (cURL)](#7-developer--qa-testing-playbook-curl)

---

## 1. Overview & Architecture

The **CRM Finance & Revenue Analytics** subsystem provides financial controllers, operations managers, and business administrators with comprehensive visibility into the platform's revenue streams across flights, hotels, Umrah packages, offers, and visas.

### Base URLs & Route Mounting:
The finance endpoints are accessible under both the standard API route and the masked CRM prefix:
- **Standard Base Route**: `/api/v1/crm/finance`
- **Masked CRM Route**: `/api/v1/ops-crm/finance` (configured via `CRM_PREFIX` environment variable)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CRM FINANCE MODULE ARCHITECTURE                       │
├──────────────────────────┬──────────────────────────┬───────────────────────┤
│ Controller Layer         │ Service Layer            │ Data Models           │
├──────────────────────────┼──────────────────────────┼───────────────────────┤
│ crm.controller.js        │ crm.service.js           │ Payment.js            │
│ • getFinanceOverview     │ • getFinanceOverview     │ User.js               │
│ • listTransactions       │ • listTransactions       │ Booking Models        │
│ • getTransactionDetails  │ • getTransactionById     │ (Flight, Hotel, etc.) │
│ • listRefunds            │ • listRefunds            │                       │
│ • updateRefundStatus     │ • updateRefundStatus     │                       │
└──────────────────────────┴──────────────────────────┴───────────────────────┘
```

---

## 2. Global Authentication & Request Headers

All CRM Finance endpoints are secured with JWT access tokens and restricted by **Role-Based Access Control (RBAC)**:

| Header | Type | Description | Required |
| :--- | :--- | :--- | :---: |
| `Authorization` | String | `Bearer <ACCESS_TOKEN>` | **Yes** |
| `Content-Type` | String | `application/json` (for POST/PATCH requests) | **Yes** |

### Allowed User Roles:
- `admin`
- `super_admin`

*Requests from non-admin accounts (e.g. `customer`, `sales_agent`, `hotelier`) return `403 Forbidden` (`Insufficient permissions`).*

---

## 3. Financial Metric Aggregation Formulas

The Finance Overview endpoint computes real-time business health metrics directly from the MongoDB `Payment` collection using aggregation pipelines:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PAYMENT METRICS RECONCILIATION CARD                     │
├─────────────────────────┬───────────────────────────────────────────────────┤
│ Metric                  │ Formula & Database Filter                         │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ **Gross Revenue**       │ SUM(Payment.amount)                               │
│                         │ WHERE status IN ['paid', 'captured',              │
│                         │                  'partially_refunded', 'refunded']│
├─────────────────────────┼───────────────────────────────────────────────────┤
│ **Refunds**             │ SUM(Payment.totalRefunded)                        │
│                         │ WHERE status IN ['paid', 'captured',              │
│                         │                  'partially_refunded', 'refunded']│
├─────────────────────────┼───────────────────────────────────────────────────┤
│ **Net Revenue**         │ Gross Revenue - Refunds                           │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ **Pending Payment**     │ SUM(Payment.amount)                               │
│                         │ WHERE status IN ['pending', 'created',            │
│                         │                  'authorized']                    │
│                         │   AND expiresAt > NOW()                           │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ **Total Transactions**  │ COUNT(Payments) matching Gross Revenue filter     │
└─────────────────────────┴───────────────────────────────────────────────────┘
```

---

## 4. Supported Enums & Data Types

| Enum Name | Allowed Values |
| :--- | :--- |
| **`currency`** | `INR`, `USD`, `EUR`, `AED`, `SAR`, `GBP` |
| **`status` (Payment)** | `created`, `pending`, `authorized`, `captured`, `paid`, `partially_refunded`, `refunded`, `failed`, `expired`, `cancelled`, `chargeback`, `disputed` |
| **`paymentMethod`** | `razorpay`, `phonepe`, `paypal`, `stripe`, `bank_transfer` |
| **`bookingType`** | `flight`, `hotel`, `package`, `offer`, `visa` |
| **`status` (Refund)** | `pending`, `processed`, `failed` |
| **`sortBy` (Transactions)** | `createdAt`, `amount`, `paidAt`, `updatedAt` |
| **`sortBy` (Refunds)** | `requestedAt`, `processedAt`, `amount` |
| **`sortOrder`** | `asc`, `desc`, `1`, `-1` |

---

## 5. API Endpoint Specifications

### 1. Get Finance Revenue Overview

Calculates Gross Revenue, Pending Payment, Net Revenue, Refunds, and Transaction counts based on payment metrics for a specified date range and currency filter.

- **Method**: `POST` **or** `GET`
- **Path**: `/api/v1/crm/finance/overview`
- **Auth**: `Bearer <token>` (`admin`, `super_admin`)

#### Request Parameters:

*For `POST`, supply in the JSON request body. For `GET`, supply as URL query parameters.*

| Parameter | Type | Required | Description | Example |
| :--- | :--- | :---: | :--- | :--- |
| `startDate` | String (ISO8601) | No | Starting date boundary (inclusive) | `"2026-01-01"` |
| `endDate` | String (ISO8601) | No | Ending date boundary (inclusive, must be >= `startDate`) | `"2026-12-31"` |
| `currency` | String | No | Target currency filter (`INR`, `USD`, `EUR`, etc.) | `"INR"` |

#### Request Body Example (`POST /api/v1/crm/finance/overview`):
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-12-31",
  "currency": "INR"
}
```

#### Response Body Payload (`200 OK` - Single Currency Specified or Found):
```json
{
  "success": true,
  "message": "Finance overview retrieved successfully",
  "data": {
    "grossRevenue": 542000.50,
    "pendingPayment": 45000.00,
    "netRevenue": 517000.50,
    "refunds": 25000.00,
    "totalTransactions": 142,
    "currency": "INR"
  }
}
```

#### Response Body Payload (`200 OK` - Multiple Currencies Active in Platform):
*When no currency is specified and transactions exist in multiple currencies, the response includes a primary aggregate and the `byCurrency` breakdown:*
```json
{
  "success": true,
  "message": "Finance overview retrieved successfully",
  "data": {
    "grossRevenue": 542000.50,
    "pendingPayment": 45000.00,
    "netRevenue": 517000.50,
    "refunds": 25000.00,
    "totalTransactions": 142,
    "currency": "INR",
    "byCurrency": [
      {
        "grossRevenue": 542000.50,
        "pendingPayment": 45000.00,
        "netRevenue": 517000.50,
        "refunds": 25000.00,
        "totalTransactions": 142,
        "currency": "INR"
      },
      {
        "grossRevenue": 12500.00,
        "pendingPayment": 1200.00,
        "netRevenue": 12000.00,
        "refunds": 500.00,
        "totalTransactions": 18,
        "currency": "SAR"
      }
    ]
  }
}
```

---

### 2. List Financial Transactions

Retrieve all payment transactions across flights, hotels, packages, offers, and visas with pagination, status filtering, payment gateway filtering, search, and date range filters.

- **Method**: `GET`
- **Path**: `/api/v1/crm/finance/transactions`
- **Auth**: `Bearer <token>` (`admin`, `super_admin`)

#### Query Parameters:

| Parameter | Type | Default | Description | Example |
| :--- | :--- | :---: | :--- | :--- |
| `page` | Integer | `1` | Page number (min: 1) | `1` |
| `limit` | Integer | `20` | Items per page (min: 1, max: 100) | `20` |
| `status` | String | - | Filter by payment status | `paid` |
| `paymentMethod` | String | - | Filter by gateway | `razorpay` |
| `bookingType` | String | - | Filter by product line (`flight`, `hotel`, `package`, etc.) | `hotel` |
| `currency` | String | - | Filter by 3-letter currency | `INR` |
| `startDate` | String (ISO8601) | - | Transactions created on/after this date | `"2026-01-01"` |
| `endDate` | String (ISO8601) | - | Transactions created on/before this date | `"2026-03-31"` |
| `search` | String | - | Search by `transactionId`, `orderId`, or `captureId` | `"pay_OK58v"` |
| `sortBy` | String | `createdAt` | Sort field (`createdAt`, `amount`, `paidAt`, `updatedAt`) | `createdAt` |
| `sortOrder` | String | `desc` | Sort direction (`asc`, `desc`, `1`, `-1`) | `desc` |

#### Response Body Payload (`200 OK`):
```json
{
  "success": true,
  "message": "Transactions retrieved successfully",
  "data": [
    {
      "_id": "6a9e8f1b2c3d4e5f6a7b8c9d",
      "userId": {
        "_id": "6aacc0352df766456873afa1",
        "firstName": "Ahmed",
        "lastName": "Khan",
        "email": "ahmed.khan@example.com",
        "phone": "9876543210",
        "avatar": null,
        "role": "customer"
      },
      "bookingId": "6b1e2f3a4b5c6d7e8f9a0b1c",
      "bookingModel": "HotelBooking",
      "bookingType": "hotel",
      "paymentMethod": "razorpay",
      "amount": 28500.00,
      "currency": "INR",
      "status": "paid",
      "paidAt": "2026-03-15T10:32:00.000Z",
      "totalRefunded": 0,
      "refunds": [],
      "gatewayData": {
        "orderId": "order_NXK8219Hjs9",
        "transactionId": "pay_OK58vX921kJs",
        "captureId": "cap_8291048291"
      },
      "createdAt": "2026-03-15T10:30:15.120Z",
      "updatedAt": "2026-03-15T10:32:05.450Z"
    }
  ],
  "meta": {
    "total": 142,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

---

### 3. Get Single Transaction Details

Retrieve the complete details of a specific payment transaction by its MongoDB ID.

- **Method**: `GET`
- **Path**: `/api/v1/crm/finance/transactions/:id`
- **Auth**: `Bearer <token>` (`admin`, `super_admin`)

#### Path Parameters:

| Parameter | Type | Required | Description | Example |
| :--- | :--- | :---: | :--- | :--- |
| `id` | String (MongoId) | **Yes** | 24-character hexadecimal MongoDB ObjectId | `6a9e8f1b2c3d4e5f6a7b8c9d` |

#### Response Body Payload (`200 OK`):
```json
{
  "success": true,
  "message": "Transaction details retrieved successfully",
  "data": {
    "_id": "6a9e8f1b2c3d4e5f6a7b8c9d",
    "userId": {
      "_id": "6aacc0352df766456873afa1",
      "firstName": "Ahmed",
      "lastName": "Khan",
      "email": "ahmed.khan@example.com",
      "phone": "9876543210",
      "avatar": null,
      "role": "customer"
    },
    "bookingId": "6b1e2f3a4b5c6d7e8f9a0b1c",
    "bookingModel": "HotelBooking",
    "bookingType": "hotel",
    "paymentMethod": "razorpay",
    "amount": 28500.00,
    "currency": "INR",
    "status": "partially_refunded",
    "paidAt": "2026-03-15T10:32:00.000Z",
    "totalRefunded": 5000.00,
    "refunds": [
      {
        "_id": "6c2e3f4a5b6c7d8e9f0a1b2c",
        "refundId": "rfnd_POk82910Ksj",
        "amount": 5000.00,
        "currency": "INR",
        "status": "processed",
        "reason": "Customer cancellation of room upgrade",
        "requestedAt": "2026-03-16T12:00:00.000Z",
        "processedAt": "2026-03-16T14:30:00.000Z",
        "gatewayResponse": {
          "acquirer_data": { "arn": "987654321098" }
        }
      }
    ],
    "gatewayData": {
      "orderId": "order_NXK8219Hjs9",
      "transactionId": "pay_OK58vX921kJs",
      "captureId": "cap_8291048291"
    },
    "createdAt": "2026-03-15T10:30:15.120Z",
    "updatedAt": "2026-03-16T14:30:00.000Z"
  }
}
```

#### Error Response (`404 Not Found`):
```json
{
  "success": false,
  "message": "Transaction not found",
  "statusCode": 404
}
```

---

### 4. List Payment Refunds History

Retrieve all payment refunds across flights, hotels, packages, offers, and visas. Returns unwound refund records with linked payment context and customer information.

- **Method**: `GET`
- **Path**: `/api/v1/crm/finance/refunds`
- **Auth**: `Bearer <token>` (`admin`, `super_admin`)

#### Query Parameters:

| Parameter | Type | Default | Description | Example |
| :--- | :--- | :---: | :--- | :--- |
| `page` | Integer | `1` | Page number | `1` |
| `limit` | Integer | `20` | Items per page (max 100) | `20` |
| `status` | String | - | Filter by refund status (`pending`, `processed`, `failed`) | `processed` |
| `currency` | String | - | Filter by currency | `INR` |
| `paymentMethod` | String | - | Filter by gateway | `phonepe` |
| `bookingType` | String | - | Filter by product line (`flight`, `hotel`, etc.) | `flight` |
| `startDate` | String (ISO8601) | - | Refunds requested on/after this date | `"2026-01-01"` |
| `endDate` | String (ISO8601) | - | Refunds requested on/before this date | `"2026-12-31"` |
| `search` | String | - | Search by `refundId`, `reason`, or transaction ID | `"rfnd_POk"` |
| `sortBy` | String | `requestedAt` | Sort field (`requestedAt`, `processedAt`, `amount`) | `requestedAt` |
| `sortOrder` | String | `desc` | Sort direction (`asc`, `desc`) | `desc` |

#### Response Body Payload (`200 OK`):
```json
{
  "success": true,
  "message": "Payment refunds history retrieved successfully",
  "data": [
    {
      "_id": "6c2e3f4a5b6c7d8e9f0a1b2c",
      "refundId": "rfnd_POk82910Ksj",
      "amount": 5000.00,
      "currency": "INR",
      "status": "processed",
      "reason": "Customer cancellation of room upgrade",
      "requestedAt": "2026-03-16T12:00:00.000Z",
      "processedAt": "2026-03-16T14:30:00.000Z",
      "gatewayResponse": {
        "acquirer_reference": "ARN987654321098"
      },
      "payment": {
        "paymentId": "6a9e8f1b2c3d4e5f6a7b8c9d",
        "amount": 28500.00,
        "currency": "INR",
        "status": "partially_refunded",
        "paymentMethod": "razorpay",
        "totalRefunded": 5000.00,
        "bookingId": "6b1e2f3a4b5c6d7e8f9a0b1c",
        "bookingModel": "HotelBooking",
        "bookingType": "hotel",
        "gatewayData": {
          "orderId": "order_NXK8219Hjs9",
          "transactionId": "pay_OK58vX921kJs"
        }
      },
      "customer": {
        "_id": "6aacc0352df766456873afa1",
        "firstName": "Ahmed",
        "lastName": "Khan",
        "email": "ahmed.khan@example.com",
        "phone": "9876543210",
        "avatar": null
      }
    }
  ],
  "meta": {
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 5. Update Payment Refund Status

Update the status of a refund record (e.g. from `pending` to `processed` or `failed`), attach gateway reconciliation notes, and automatically trigger parent payment reconciliation.

- **Method**: `PATCH`
- **Paths**:
  - `/api/v1/crm/finance/refunds/:refundId/status` *(Recommended)*
  - `/api/v1/crm/finance/refunds/:refundId` *(Alias)*
- **Auth**: `Bearer <token>` (`admin`, `super_admin`)

#### Path Parameters:

| Parameter | Type | Required | Description | Example |
| :--- | :--- | :---: | :--- | :--- |
| `refundId` | String | **Yes** | Gateway Refund ID (e.g. `rfnd_XYZ`) or MongoDB Refund ObjectId | `"rfnd_POk82910Ksj"` |

#### Request Body Schema:

| Field | Type | Required | Allowed Values | Description |
| :--- | :--- | :---: | :--- | :--- |
| `status` | String | **Yes** | `pending`, `processed`, `failed` | New status to transition the refund record to. |
| `reason` | String | No | - | Internal audit reason or settlement notes. |
| `gatewayResponse` | Object | No | - | Arbitrary JSON object returned by the bank/gateway. |

#### Request Body Example:
```json
{
  "status": "processed",
  "reason": "Reconciled with bank settlement batch #4019",
  "gatewayResponse": {
    "bank_reference_number": "BRN_829104820",
    "settled_at": "2026-03-26T15:00:00Z"
  }
}
```

#### Automated Lifecycle Side-Effects:
1. When transitioned to `processed`, `processedAt` is timestamped to `new Date()`.
2. The service recalculates `payment.totalRefunded` strictly as the sum of all `processed` refunds.
3. The parent `payment.status` is automatically updated:
   - If `totalRefunded >= payment.amount` ➔ `refunded`
   - If `totalRefunded > 0` ➔ `partially_refunded`
   - If `totalRefunded === 0` ➔ `paid`

#### Response Body Payload (`200 OK`):
```json
{
  "success": true,
  "message": "Payment refund status updated successfully",
  "data": {
    "refundId": "rfnd_POk82910Ksj",
    "refundMongoId": "6c2e3f4a5b6c7d8e9f0a1b2c",
    "amount": 5000.00,
    "currency": "INR",
    "status": "processed",
    "reason": "Reconciled with bank settlement batch #4019",
    "processedAt": "2026-03-26T16:00:00.000Z",
    "paymentId": "6a9e8f1b2c3d4e5f6a7b8c9d",
    "paymentStatus": "partially_refunded",
    "totalRefunded": 5000.00
  }
}
```

---

## 6. Error Taxonomy & Status Codes

All CRM Finance endpoints use standard API envelopes for error handling:

| HTTP Status | Error Message | Root Cause / Remedy |
| :---: | :--- | :--- |
| **`400`** | `"Validation error"` | One or more inputs failed validation (e.g. `endDate < startDate`, invalid enum). Check `errors` array. |
| **`401`** | `"Authentication token missing"` or `"Invalid or expired access token"` | Missing or expired JWT token in `Authorization: Bearer` header. |
| **`403`** | `"Insufficient permissions"` | User role is not `admin` or `super_admin`. |
| **`404`** | `"Transaction not found"` | No payment record exists for the supplied `:id`. |
| **`404`** | `"Refund record not found"` | No refund record found matching `:refundId` across all payments. |
| **`500`** | `"Internal Server Error"` | Unhandled database or server exception. |

#### Standard Validation Error Format (`400 Bad Request`):
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "endDate",
      "message": "endDate cannot be earlier than startDate"
    },
    {
      "field": "currency",
      "message": "currency must be one of: INR, USD, EUR, AED, SAR, GBP"
    }
  ],
  "statusCode": 400
}
```

---

## 7. Developer & QA Testing Playbook (cURL)

Replace `<TOKEN>` with an admin access JWT token.

### 1. Get Finance Overview (Filtered by Date Range and Currency):
```bash
curl -X POST http://localhost:5000/api/v1/crm/finance/overview \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-01-01",
    "endDate": "2026-12-31",
    "currency": "INR"
  }'
```

### 2. List Transactions (Page 1, Filtered by Paid Status):
```bash
curl -X GET "http://localhost:5000/api/v1/crm/finance/transactions?page=1&limit=10&status=paid&sortBy=amount&sortOrder=desc" \
  -H "Authorization: Bearer <TOKEN>"
```

### 3. Search Transaction by Gateway Transaction ID:
```bash
curl -X GET "http://localhost:5000/api/v1/crm/finance/transactions?search=pay_OK58vX" \
  -H "Authorization: Bearer <TOKEN>"
```

### 4. Get Transaction Details by ID:
```bash
curl -X GET "http://localhost:5000/api/v1/crm/finance/transactions/6a9e8f1b2c3d4e5f6a7b8c9d" \
  -H "Authorization: Bearer <TOKEN>"
```

### 5. List Pending Refunds:
```bash
curl -X GET "http://localhost:5000/api/v1/crm/finance/refunds?status=pending&currency=INR" \
  -H "Authorization: Bearer <TOKEN>"
```

### 6. Process a Refund and Reconcile Payment:
```bash
curl -X PATCH "http://localhost:5000/api/v1/crm/finance/refunds/rfnd_POk82910Ksj/status" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "processed",
    "reason": "Approved by Finance Director. Processed via banking gateway.",
    "gatewayResponse": { "batch_id": "BATCH_9104" }
  }'
```
