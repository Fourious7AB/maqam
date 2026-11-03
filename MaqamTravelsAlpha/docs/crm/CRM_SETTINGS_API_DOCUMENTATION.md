# ⚙️ CRM Platform Settings API Documentation

> **Maqam Travels Alpha — CRM & Back-Office Operations**  
> Complete technical reference for managing platform-wide operational configurations, company details, financial rules, booking deadlines, and notification preferences.

---

## 📑 Table of Contents

1. [Overview & Endpoint Summary](#1-overview--endpoint-summary)
2. [Global Authentication & Role Guards](#2-global-authentication--role-guards)
3. [Data Model: Setting](#3-data-model-setting)
4. [Supported Settings Sections](#4-supported-settings-sections)
5. [API Endpoints Reference](#5-api-endpoints-reference)
   - [1. Get Settings by Section (`GET /api/v1/settings/:section`)](#1-get-settings-by-section)
   - [2. Update Settings by Section (`PUT /api/v1/settings/:section`)](#2-update-settings-by-section)
   - [3. Partial Update Settings (`PATCH /api/v1/settings/:section`)](#3-partial-update-settings)
6. [Section Payloads Reference](#6-section-payloads-reference)
   - [A. General Company Settings (`general`)](#a-general-company-settings-general)
   - [B. Financial & Tax Settings (`financial`)](#b-financial--tax-settings-financial)
   - [C. Booking & Voucher Settings (`booking`)](#c-booking--voucher-settings-booking)
   - [D. Notification & Messaging Settings (`notifications`)](#d-notification--messaging-settings-notifications)
7. [Error Taxonomy & Responses](#7-error-taxonomy--responses)
8. [Developer & QA Testing Playbook (cURL)](#8-developer--qa-testing-playbook-curl)

---

## 1. Overview & Endpoint Summary

The **CRM Settings module** provides polymorphic configuration storage for Maqam Travels. Settings are structured into named **sections** (such as `general`, `financial`, `booking`, `notifications`), allowing administrative staff to configure business rules without code changes.

### Key Features:
- **Dual Route Mount**: Accessible directly via `/api/v1/settings/:section` and through the CRM prefix `/api/v1/crm/settings/:section`.
- **Safe Fallback Defaults**: If a section has not yet been saved in MongoDB, built-in defaults are automatically returned so client UIs never crash.
- **Flexible Response Formats**: Returns direct JSON payloads by default (e.g. `{ "companyName": "Maqam Travels", ... }`), or wraps in standard envelopes when `?envelope=true` is requested.

| HTTP Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :---: | :--- |
| **`GET`** | `/api/v1/settings/:section`<br/>`/api/v1/crm/settings/:section` | `admin`, `super_admin`,<br/>`sales_agent`, `support_agent` | Retrieve settings for a specific section (falls back to defaults if unconfigured). |
| **`PUT`** | `/api/v1/settings/:section`<br/>`/api/v1/crm/settings/:section` | `admin`, `super_admin` | Upsert (create or overwrite) settings for a section. |
| **`PATCH`** | `/api/v1/settings/:section`<br/>`/api/v1/crm/settings/:section` | `admin`, `super_admin` | Partially update settings fields for a section. |

---

## 2. Global Authentication & Role Guards

All endpoints require JWT Bearer authentication:

- **Header**: `Authorization: Bearer <ACCESS_TOKEN>`
- **Role Permissions**:
  - **Read (`GET`)**: `admin`, `super_admin`, `sales_agent`, `support_agent`
  - **Write (`PUT`, `PATCH`)**: `admin`, `super_admin` only

---

## 3. Data Model: Setting

Stored in MongoDB collection: `settings` (Mongoose Model: `Setting`).

```javascript
{
  section: String,    // Unique, lowercase, trimmed identifier (e.g. 'general')
  data: Mixed,        // Polymorphic JSON payload containing the section's fields
  updatedBy: ObjectId // Reference to 'User' (Admin who performed last update)
  createdAt: Date,    // Managed by timestamps
  updatedAt: Date     // Managed by timestamps
}
```

| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `section` | `String` | Required, Unique, Lowercase, Indexed | Section identifier (e.g. `general`, `financial`, `booking`). |
| `data` | `Mixed` | Required, Default: `{}` | The configuration values for that section. |
| `updatedBy` | `ObjectId` | Optional, Ref: `User` | User ID of the admin who updated the settings. |

---

## 4. Supported Settings Sections

| Section Key | Purpose | Default Keys Included |
| :--- | :--- | :--- |
| **`general`** | Company contact, branding, timezone, base currency | `companyName`, `supportEmail`, `supportPhone`, `timezone`, `currency` |
| **`financial`** | Currency rules, taxes, profit markups | `currency`, `taxPercentage`, `flightMarkupPercent`, `hotelMarkupPercent` |
| **`booking`** | Hold limits, cancellation grace, voucher issuance | `holdDeadlineMinutes`, `cancellationGraceHours`, `autoVoucherEnabled` |
| **`notifications`** | Email sender identity, SMS alerts | `emailSenderName`, `replyToEmail`, `smsAlertsEnabled` |
| **`custom`** | Any additional section needed by admin | Any valid JSON object |

---

## 5. API Endpoints Reference

### 1. Get Settings by Section

Retrieve configuration settings for a given section.

- **Method**: `GET`
- **Paths**:
  - `/api/v1/settings/:section`
  - `/api/v1/crm/settings/:section`
- **Auth**: Bearer Token (`admin`, `super_admin`, `sales_agent`, `support_agent`)

#### Path Parameters:
| Parameter | Type | Required | Description | Example |
| :--- | :--- | :---: | :--- | :--- |
| `section` | String | Yes | Alphanumeric section key | `general` |

#### Query Parameters:
| Parameter | Type | Default | Description | Example |
| :--- | :--- | :---: | :--- | :--- |
| `envelope` | Boolean | `false` | When `true`, wraps response in standard API envelope | `?envelope=true` |

#### Request Body:
*None (GET request)*

#### Response Body Payload (`200 OK` - Direct Mode):
```json
{
  "companyName": "Maqam Travels",
  "supportEmail": "support@maqam.com",
  "supportPhone": "+911180808080",
  "timezone": "Asia/Kolkata",
  "currency": "INR"
}
```

#### Response Body Payload (`200 OK` - Envelope Mode `?envelope=true`):
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

---

### 2. Update Settings by Section

Create or overwrite settings for a given section.

- **Method**: `PUT`
- **Paths**:
  - `/api/v1/settings/:section`
  - `/api/v1/crm/settings/:section`
- **Auth**: Bearer Token (`admin`, `super_admin`)
- **Headers**:
  - `Content-Type: application/json`

#### Path Parameters:
| Parameter | Type | Required | Description | Example |
| :--- | :--- | :---: | :--- | :--- |
| `section` | String | Yes | Section to update | `general` |

#### Request Body Input (`application/json`):
```json
{
  "companyName": "Maqam Travels Alpha",
  "supportEmail": "help@maqam.com",
  "supportPhone": "+919876543210",
  "timezone": "Asia/Kolkata",
  "currency": "INR"
}
```

#### Response Body Payload (`200 OK`):
```json
{
  "companyName": "Maqam Travels Alpha",
  "supportEmail": "help@maqam.com",
  "supportPhone": "+919876543210",
  "timezone": "Asia/Kolkata",
  "currency": "INR"
}
```

---

### 3. Partial Update Settings

Partially update one or more fields in a section without replacing the entire configuration.

- **Method**: `PATCH`
- **Paths**:
  - `/api/v1/settings/:section`
  - `/api/v1/crm/settings/:section`
- **Auth**: Bearer Token (`admin`, `super_admin`)

#### Request Body Input:
```json
{
  "supportPhone": "+918000112233"
}
```

#### Response Body Payload (`200 OK`):
```json
{
  "companyName": "Maqam Travels Alpha",
  "supportEmail": "help@maqam.com",
  "supportPhone": "+918000112233",
  "timezone": "Asia/Kolkata",
  "currency": "INR"
}
```

---

## 6. Section Payloads Reference

### A. General Company Settings (`general`)

#### Request Body Input:
```json
{
  "companyName": "Maqam Travels",
  "supportEmail": "support@maqam.com",
  "supportPhone": "+911180808080",
  "timezone": "Asia/Kolkata",
  "currency": "INR"
}
```

| Field | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `companyName` | String | Organization brand name | `"Maqam Travels"` |
| `supportEmail` | String | Contact email for inquiries | `"support@maqam.com"` |
| `supportPhone` | String | Contact hotline / WhatsApp | `"+911180808080"` |
| `timezone` | String | Standard IANA timezone | `"Asia/Kolkata"` |
| `currency` | String | Base operating currency code | `"INR"` |

---

### B. Financial & Tax Settings (`financial`)

#### Request Body Input:
```json
{
  "currency": "INR",
  "taxPercentage": 5,
  "flightMarkupPercent": 2.5,
  "hotelMarkupPercent": 5.0
}
```

| Field | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `currency` | String | Default billing currency | `"INR"` |
| `taxPercentage` | Number | Goods and Services Tax / VAT rate (%) | `5` |
| `flightMarkupPercent` | Number | Wholesale flight profit margin (%) | `2.5` |
| `hotelMarkupPercent` | Number | Wholesale hotel profit margin (%) | `5.0` |

---

### C. Booking & Voucher Settings (`booking`)

#### Request Body Input:
```json
{
  "holdDeadlineMinutes": 60,
  "cancellationGraceHours": 24,
  "autoVoucherEnabled": true
}
```

| Field | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `holdDeadlineMinutes` | Number | Maximum unpaid inventory lock time | `60` |
| `cancellationGraceHours`| Number | Window for fee-free customer cancellation | `24` |
| `autoVoucherEnabled` | Boolean| Automatically issue e-voucher on payment | `true` |

---

### D. Notification & Messaging Settings (`notifications`)

#### Request Body Input:
```json
{
  "emailSenderName": "Maqam Travels Support",
  "replyToEmail": "support@maqam.com",
  "smsAlertsEnabled": true
}
```

| Field | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `emailSenderName` | String | From name displayed on booking confirmation emails | `"Maqam Travels Support"` |
| `replyToEmail` | String | Reply-to address for automated messages | `"support@maqam.com"` |
| `smsAlertsEnabled` | Boolean| Trigger SMS updates on flight/booking changes | `true` |

---

## 7. Error Taxonomy & Responses

### 1. Validation Error (`400 Bad Request`)
Occurs when an invalid section character is provided or the body payload is not a valid JSON object:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "section",
      "message": "Section must contain only alphanumeric characters, dashes, or underscores"
    }
  ]
}
```

### 2. Authentication Error (`401 Unauthorized`)
Occurs when the Bearer token is missing, malformed, or expired:
```json
{
  "success": false,
  "message": "Authentication required. Please log in."
}
```

### 3. Permission Error (`403 Forbidden`)
Occurs when a non-admin user (e.g. `sales_agent`, `customer`) attempts to `PUT` or `PATCH` settings:
```json
{
  "success": false,
  "message": "Forbidden: You do not have permission to perform this action"
}
```

---

## 8. Developer & QA Testing Playbook (cURL)

Replace `{{BASE_URL}}` with `http://localhost:5000` and `{{ADMIN_TOKEN}}` with an active Admin JWT.

### 1. Fetch General Settings (Direct Payload)
```bash
curl -X GET "{{BASE_URL}}/api/v1/settings/general" \
  -H "Authorization: Bearer {{ADMIN_TOKEN}}" \
  -H "Accept: application/json"
```

### 2. Fetch General Settings with Envelope
```bash
curl -X GET "{{BASE_URL}}/api/v1/settings/general?envelope=true" \
  -H "Authorization: Bearer {{ADMIN_TOKEN}}" \
  -H "Accept: application/json"
```

### 3. Fetch Settings via CRM Subpath
```bash
curl -X GET "{{BASE_URL}}/api/v1/crm/settings/general" \
  -H "Authorization: Bearer {{ADMIN_TOKEN}}" \
  -H "Accept: application/json"
```

### 4. Fetch Financial Settings
```bash
curl -X GET "{{BASE_URL}}/api/v1/settings/financial" \
  -H "Authorization: Bearer {{ADMIN_TOKEN}}" \
  -H "Accept: application/json"
```

### 5. Update Company Settings (Admin Only)
```bash
curl -X PUT "{{BASE_URL}}/api/v1/settings/general" \
  -H "Authorization: Bearer {{ADMIN_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Maqam Travels Alpha",
    "supportEmail": "support@maqam.com",
    "supportPhone": "+911180808080",
    "timezone": "Asia/Kolkata",
    "currency": "INR"
  }'
```

### 6. Partial Update (PATCH)
```bash
curl -X PATCH "{{BASE_URL}}/api/v1/settings/general" \
  -H "Authorization: Bearer {{ADMIN_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "supportPhone": "+919876543210"
  }'
```
