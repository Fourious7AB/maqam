# 🔐 Authentication & Authorization Architecture — Maqam Travels Alpha

Comprehensive technical documentation and architectural reference for the Authentication and Authorization subsystem of **Maqam Travels Alpha**.

---

## 📑 Table of Contents

1. [Executive Summary & Core Rules](#-executive-summary--core-rules)
2. [Security Model & Token Strategy](#-security-model--token-strategy)
3. [Roles & Permissions Matrix (RBAC)](#-roles--permissions-matrix-rbac)
4. [Frontend User (Customer) Dataflow](#-frontend-user-customer-dataflow)
   - [Flow 1A: Passwordless Phone OTP Authentication (Primary)](#flow-1a-passwordless-phone-otp-authentication-primary)
   - [Flow 1B: Email / Phone + Password Registration & Login (Secondary)](#flow-1b-email--phone--password-registration--login-secondary)
   - [Flow 1C: Token Refresh & Session Continuity](#flow-1c-token-refresh--session-continuity)
   - [Flow 1D: Password Reset (Forgot Password)](#flow-1d-password-reset-forgot-password)
   - [Flow 1E: Secure Logout & Session Termination](#flow-1e-secure-logout--session-termination)
5. [CRM & Internal Staff Dataflow](#-crm--internal-staff-dataflow)
   - [CRM Authentication Rule: Email + Password ONLY](#crm-authentication-rule-email--password-only)
   - [CRM Prefix Gating & Route Protection](#crm-prefix-gating--route-protection)
   - [Staff Account Provisioning Workflow](#staff-account-provisioning-workflow)
   - [CRM Staff Request Lifecycle & RBAC Verification](#crm-staff-request-lifecycle--rbac-verification)
6. [Backend Architecture & Component Breakdown](#-backend-architecture--component-breakdown)
   - [1. Routing Layer](#1-routing-layer)
   - [2. Validation Layer (Express-Validator)](#2-validation-layer-express-validator)
   - [3. Authentication & Authorization Middleware](#3-authentication--authorization-middleware)
   - [4. Controller Layer](#4-controller-layer)
   - [5. Service Layer (Business Logic)](#5-service-layer-business-logic)
   - [6. Data Models & Schemas (Mongoose)](#6-data-models--schemas-mongoose)
   - [7. Fast Cache & Transient State Layer (Redis)](#7-fast-cache--transient-state-layer-redis)
7. [Component Interaction & Sequence Diagrams](#-component-interaction--sequence-diagrams)
8. [Edge Cases & Error Handling Matrix](#-edge-cases--error-handling-matrix)
9. [Environment Variables Reference](#-environment-variables-reference)

---

## 🎯 Executive Summary & Core Rules

The authentication system is built around dual access channels with strictly enforced boundary rules:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                AUTHENTICATION CHANNELS                                 │
├────────────────────────────────────────┬───────────────────────────────────────────────┤
│ 1. Public Travel Platform (Customer)   │ 2. Internal CRM & Back-Office (Staff)         │
├────────────────────────────────────────┼───────────────────────────────────────────────┤
│ • Fast, frictionless access            │ • Strict enterprise security                  │
│ • Authenticates via:                   │ • Authenticates via:                          │
│   a) Phone OTP (Passwordless)          │   a) Email + Password ONLY                    │
│   b) Email / Phone + Password          │   (OTP login is strictly forbidden for CRM)   │
│ • Self-registration allowed            │ • Provisioned exclusively by Admin/SuperAdmin │
│ • Role: 'customer'                     │ • Roles: 'sales_agent', 'support_agent',      │
│                                        │   'finance', 'admin', 'super_admin', 'hotelier'│
└────────────────────────────────────────┴───────────────────────────────────────────────┘
```

### 🔑 Critical Architectural Rules
1. **Customer Dual-Auth Edge Case**:
   - Customers can sign in or register instantly via **Phone OTP** without remembering a password.
   - Customers can also register and log in using **Email / Phone + Password**.
   - If a new customer verifies via OTP, the system **automatically auto-provisions** their user account with a secure random hash and sets `isPhoneVerified: true`.
2. **CRM Staff Single-Auth Edge Case**:
   - All internal staff and admin roles (`sales_agent`, `support_agent`, `finance`, `admin`, `super_admin`, `hotelier`) **MUST authenticate using Email / Phone + Password**.
   - CRM users cannot self-register. Accounts are created by authorized administrators via `/api/v1${CRM_PREFIX}/users`.
   - OTP authentication does not bypass CRM RBAC permissions.
3. **Defense-in-Depth Session Management**:
   - Access tokens are short-lived JWTs (2 hours) passed in the `Authorization: Bearer <token>` header.
   - Refresh tokens are long-lived JWTs (7 days) stored inside `HttpOnly`, `Secure`, `SameSite=None` cookies.
   - Passwords and reset tokens are excluded by default in Mongoose queries (`select: false`).

---

## 🛡️ Security Model & Token Strategy

### JWT Token Specifications

| Parameter | Access Token | Refresh Token |
|---|---|---|
| **Secret Key** | `process.env.ACCESS_TOKEN_SECRET` | `process.env.REFRESH_TOKEN_SECRET` |
| **Lifespan** | `120 minutes` (60 min on refresh) | `7 days` |
| **Payload** | `{ id: user._id, role: user.role }` | `{ id: user._id, role: user.role }` |
| **Storage (Client)** | In-Memory / HTTP Auth Header | `HttpOnly` Secure Cookie |
| **Transport** | `Authorization: Bearer <token>` | Cookie: `refreshToken=<token>` |
| **Purpose** | API Request Authorization | Generating fresh Access Tokens |

### Cookie Security Flags
```javascript
const refreshTokenCookieOptions = {
  httpOnly: true,                                  // Prevent XSS script access
  secure: process.env.NODE_ENV === 'production',   // HTTPS only in production
  sameSite: 'none',                                // Enable cross-site CRM/frontend requests
  maxAge: 7 * 24 * 60 * 60 * 1000,                // 7 days in milliseconds
};
```

---

## 👥 Roles & Permissions Matrix (RBAC)

The application defines granular roles in `config/constants.js`:

```
┌──────────────┐      ┌─────────────┐      ┌───────────────┐      ┌─────────────┐
│   CUSTOMER   │      │ SALES_AGENT │      │ SUPPORT_AGENT │      │   FINANCE   │
└──────┬───────┘      └──────┬──────┘      └───────┬───────┘      └──────┬──────┘
       │                     │                     │                     │
       ▼                     ▼                     ▼                     ▼
Search & Book Flights,   Manage Leads,         View Bookings,        Manage Invoices,
Hotels, Packages, Tours  Create Quotes,        Handle Tickets,       Process Refunds,
Manage Own Profile       Agent Pipeline        Customer Assistance   Payment Audits
       │                     │                     │                     │
       └─────────────────────┴──────────┬──────────┴─────────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
                  ┌─────────────┐               ┌─────────────┐
                  │    ADMIN    │               │ SUPER_ADMIN │
                  └──────┬──────┘               └──────┬──────┘
                         │                             │
                  Manage Inventory,             Full Unrestricted
                  Staff, Hotels, Stock,         System Access &
                  Package Approvals             Global Config
```

### RBAC Permission Matrix

| Role | Flight / Hotel Search & Booking | Own Profile & Orders | CRM Leads & Pipeline | Hotel Entity Management | CRM Staff Provisioning | Hotel Stock Review Queue | System Configuration |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `customer` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `sales_agent` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `support_agent` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `finance` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `hotelier` | ❌ | ❌ | ❌ | ❌ (Own only) | ❌ | ❌ (Submit only) | ❌ |
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `super_admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 📱 Frontend User (Customer) Dataflow

Customers interact with the consumer web/mobile app and have two authentication avenues:

```
                          ┌────────────────────────┐
                          │   CUSTOMER ENTERS APP  │
                          └───────────┬────────────┘
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
        [Phone OTP Passwordless]              [Email/Phone + Password]
                   │                                     │
        POST /api/v1/otp/send-otp             POST /api/v1/auth/login
                   │                          POST /api/v1/auth/register
        POST /api/v1/otp/verify-otp                      │
                   │                                     │
                   └──────────────────┬──────────────────┘
                                      ▼
                        [JWT Session Tokens Issued]
                       Access Token (Bearer Header)
                       Refresh Token (HttpOnly Cookie)
```

---

### Flow 1A: Passwordless Phone OTP Authentication (Primary)

Used for frictionless consumer onboarding and login.

#### Step 1: Request OTP Dispatch
```http
POST /api/v1/otp/send-otp
Content-Type: application/json

{
  "phone": "9876543210"
}
```

**Internal Backend Action**:
1. Normalizes phone (`trim()`) and validates 10-digit Indian mobile pattern `/^[6-9]\d{9}$/`.
2. Checks if user exists; if user exists and `isActive === false`, rejects with `403 Forbidden`.
3. Generates cryptographically secure 6-digit OTP using `crypto.randomInt(100000, 999999)`.
4. Saves OTP payload in **Redis** under `otp:9876543210` with a 5-minute TTL (`300000 ms`).
5. (Optional fallback) Persists OTP record in **MongoDB** `OTP` collection with TTL index.
6. Dispatches SMS via **Fast2SMS DLT Route** (Sender ID: `MAQAMH`, Template ID: `224018`).

**Success Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "OTP dispatched successfully.",
  "data": {
    "phone": "9876543210",
    "isNewUser": true,
    "userExists": false,
    "expiresInSeconds": 300
  }
}
```

---

#### Step 2: Verify OTP & Auto-Provision / Login
```http
POST /api/v1/otp/verify-otp
Content-Type: application/json

{
  "phone": "9876543210",
  "otp": "482931"
}
```

**Internal Backend Action**:
1. Checks **Redis** key `otp:9876543210`. If missing, queries MongoDB `OTP` fallback collection.
2. If no record found or expired, throws `400 Bad Request` ("OTP expired or not found").
3. Verifies OTP match:
   - **On Mismatch**: Increments `attempts`. If `attempts >= 5`, deletes OTP from Redis/DB and rejects with "Max verification attempts exceeded". Otherwise, updates remaining TTL and throws error with remaining attempts.
   - **On Match**: Proceeds to step 4.
4. **Burns OTP**: Immediately deletes `otp:9876543210` from Redis and MongoDB to guarantee single-use security.
5. **User Resolution**:
   - **Existing User**: Updates `isPhoneVerified = true`, `isVerified = true`, `lastLogin = new Date()`, saves user.
   - **New User (Auto-Registration)**: Generates random 16-byte hex password, hashes it via bcrypt (10 rounds), and creates a new `User` document:
     ```javascript
     {
       phone: "9876543210",
       password: hashedPassword,
       firstName: "User",
       lastName: "3210",
       role: "customer",
       isPhoneVerified: true,
       isVerified: true,
       lastLogin: new Date()
     }
     ```
6. Generates `accessToken` (120m) and `refreshToken` (7d) via `generateTokens()`.
7. Sets `refreshToken` cookie on response header.

**Success Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "OTP verified successfully. Login successful.",
  "data": {
    "user": {
      "id": "665abc1234567890",
      "phone": "9876543210",
      "firstName": "User",
      "lastName": "3210",
      "email": null,
      "avatar": "https://cdn-icons-png.flaticon.com/512/1077/1077114.png",
      "role": "customer",
      "isPhoneVerified": true,
      "isVerified": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Flow 1B: Email / Phone + Password Registration & Login (Secondary)

#### Customer Registration (`POST /api/v1/auth/register`)
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "phone": "9876543210",
  "email": "traveler@example.com",
  "password": "Password@123",
  "firstName": "John",
  "lastName": "Doe",
  "avatar": "https://cdn-icons-png.flaticon.com/512/1077/1077114.png"
}
```
1. `authValidator.validateRegister()` validates phone, password complexity, and names.
2. Checks phone and email uniqueness in MongoDB.
3. Hashes password using `bcryptjs.hash(password, 10)`.
4. Creates user with `role: 'customer'`.
5. Returns `201 Created` with Access Token and sets Refresh Token cookie.

#### Customer Login (`POST /api/v1/auth/login`)
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "phone": "9876543210",
  "password": "Password@123"
}
```
1. `authValidator.validateLogin()` verifies non-empty credentials.
2. Finds user by phone with explicit password inclusion: `.select('+password')`.
3. Validates password via `bcrypt.compare()`.
4. Checks `isActive === true`.
5. Returns `200 OK` with user profile and sets Refresh Token cookie.

---

### Flow 1C: Token Refresh & Session Continuity

When the short-lived access token expires (HTTP `401 Unauthorized`), the client automatically calls:

```http
POST /api/v1/auth/refresh-token
Cookie: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Backend Process**:
1. Reads refresh token from `req.cookies.refreshToken` (or `req.body.refreshToken`).
2. Validates signature with `REFRESH_TOKEN_SECRET`.
3. Issues a brand-new access token (valid for 60 min).

**Success Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Token refreshed",
  "data": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Flow 1D: Password Reset (Forgot Password)

```
1. Customer initiates request:
   POST /api/v1/auth/forgot-password { "phone": "9876543210" }
   Backend generates crypto random token, stores SHA-256 hash in DB (1 hour TTL).

2. Customer submits new password with token:
   POST /api/v1/auth/reset-password/:token { "password": "NewSecurePassword@123" }
   Backend matches token hash, updates password hash, clears reset token fields.
```

---

### Flow 1E: Secure Logout & Session Termination

```http
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```
1. Controller calls `authService.logoutUser(userId)`.
2. Resets and clears client cookies: `res.clearCookie('accessToken')`, `res.clearCookie('refreshToken')`.
3. Returns `200 OK` ("Logged out successfully").

---

## 💼 CRM & Internal Staff Dataflow

The CRM module manages internal travel agency operations: lead qualification, custom packaging, hotel entity management, and inventory stock reviews.

---

### 🚨 CRM Authentication Rule: Email + Password ONLY

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                      CRM AUTHENTICATION ENFORCEMENT                           │
├───────────────────────────────────────────────────────────────────────────────┤
│ • ALL internal staff must authenticate via POST /api/v1/auth/login            │
│   using their registered Email / Phone and Password.                          │
│ • Phone OTP login is STRICTLY RESERVED for frontend customers.                │
│ • Staff accounts CANNOT be created through public registration.               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

### 🛡️ CRM Prefix Gating & Route Protection

All CRM endpoints are mounted under an environment-configured prefix (default: `/ops-crm`):

```javascript
// app.js
const CRM_PREFIX = process.env.CRM_PREFIX || '/ops-crm';
app.use(`/api/v1${CRM_PREFIX}`, crmRoutes);
```

#### Complete Route Path Structure:
- Lead Management: `GET /api/v1/ops-crm/leads`
- Agent Pipeline Stats: `GET /api/v1/ops-crm/pipeline`
- Hotel Management: `POST /api/v1/ops-crm/hotels`
- Staff User Provisioning: `POST /api/v1/ops-crm/users`
- Hotel Stock Review: `PATCH /api/v1/ops-crm/hotel-stock/:id/review`

---

### 👤 Staff Account Provisioning Workflow

Only authenticated `admin` and `super_admin` users can provision internal staff accounts.

```http
POST /api/v1/ops-crm/users
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "email": "agent.smith@maqamtravels.com",
  "phone": "9811122233",
  "password": "TempStaffPassword@2026",
  "firstName": "Smith",
  "lastName": "Agent",
  "role": "sales_agent"
}
```

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                        STAFF PROVISIONING PIPELINE                            │
│                                                                               │
│ Admin Request ──▶ crmValidator.validateCreateCrmUser()                        │
│                         │                                                     │
│                         ▼                                                     │
│                   authenticate + authorize('admin', 'super_admin')            │
│                         │                                                     │
│                         ▼                                                     │
│                   crmService.createCrmUser()                                  │
│                         ├─ If role == 'hotelier' ──▶ Requires valid hotelId   │
│                         ├─ Check unique phone & email                         │
│                         ├─ bcrypt.hash(password, 10)                          │
│                         ├─ Set createdBy = adminUserId                        │
│                         └─ User.create({ ... })                               │
│                         │                                                     │
│                         ▼                                                     │
│                   201 Created (User profile without password hash)            │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

### 🔒 CRM Staff Request Lifecycle & RBAC Verification

Every CRM request undergoes a multi-stage security pipeline before hitting the business service:

```
Incoming CRM HTTP Request
  │
  ▼
[1] Correlation ID Middleware    ── Assigns unique X-Correlation-ID for log tracing
  │
  ▼
[2] Helmet & CORS Middleware     ── Validates headers and origins
  │
  ▼
[3] JSON Body Parser             ── Parses JSON payload
  │
  ▼
[4] Rate Limiter Middleware      ── Protects API endpoints against DDoS / scraping
  │
  ▼
[5] Prefix Gated Router Mount    ── Matches /api/v1/ops-crm/*
  │
  ▼
[6] Authenticate Middleware      ── Validates Bearer JWT, fetches req.user from DB,
  │                                verifies user.isActive === true
  │
  ▼
[7] Authorize Middleware         ── Checks req.user.role in allowed roles list:
  │                                authorize('admin', 'super_admin', 'sales_agent')
  │
  ▼
[8] Express-Validator Chain      ── Checks required fields, formats, regex
  │
  ▼
[9] Controller Method            ── Extracts input, calls CRM service
  │
  ▼
[10] Service Layer (Mongoose)    ── Executes business logic & queries
  │
  ▼
[11] apiResponse Formatter       ── Returns standardized JSON envelope
```

---

## 🏗️ Backend Architecture & Component Breakdown

```
MaqamTravelsAlpha/
├── app.js                          # Express app configuration & route mounting
├── server.js / serverT.js          # HTTP server bootstrap & DB/Redis connections
├── config/
│   └── constants.js                # System constants, ROLES, statuses, limits
├── middleware/
│   ├── auth.js                     # JWT generation, verification, authenticate, authorize
│   ├── validate.js                 # Centralized express-validator result handler
│   ├── errorHandler.js             # Global AppError handler & response standardizer
│   ├── rateLimiter.js              # Express rate limiting
│   └── correlationId.js            # Request tracking ID middleware
├── modules/
│   ├── auth/
│   │   ├── auth.model.js           # User schema (roles, avatars, flags, tokens)
│   │   ├── auth.routes.js          # Public auth endpoints (/register, /login, /refresh, etc.)
│   │   ├── auth.controller.js      # Auth request handlers & cookie setting
│   │   ├── auth.service.js         # Core registration, login, token, & password reset logic
│   │   └── auth.validator.js       # express-validator rules for auth routes
│   └── crm/
│       ├── crm.model.js            # Lead schema & CRM entities
│       ├── crm.routes.js           # Gated CRM staff endpoints
│       ├── crm.controller.js       # CRM handlers (leads, hotels, users, stock)
│       ├── crm.service.js          # CRM business logic & staff creation
│       └── crm.validator.js        # express-validator rules for CRM routes
├── routes/
│   └── otp.route.js                # OTP API documentation & route bindings
├── controllers/
│   └── otp.controller.js           # /send-otp and /verify-otp request handlers
├── services/
│   ├── sendOtp.service.js          # OTP generation, Redis caching, SMS trigger
│   ├── verifyOtp.service.js        # OTP validation, rate-limiting, user auto-provisioning
│   └── fast2sms.service.js         # Fast2SMS DLT gateway integration layer
├── models/
│   └── otp.model.js                # MongoDB OTP schema with TTL index
└── utils/
    ├── apiResponse.js              # Standardized response envelopes (sendSuccess, etc.)
    ├── cache.js                    # Redis cache operations with memory fallback
    ├── redis.js                    # ioredis client singleton connection
    └── logger.js                   # Winston logger utility
```

---

### 1. Routing Layer
- **`modules/auth/auth.routes.js`**: Public routes for traditional auth (`/register`, `/login`, `/refresh-token`, `/logout`, `/forgot-password`, `/reset-password/:token`).
- **`routes/otp.route.js`**: Public routes for OTP authentication (`/send-otp`, `/verify-otp`).
- **`modules/crm/crm.routes.js`**: Gated staff routes mounted under `/api/v1${CRM_PREFIX}`. Uses `router.use(authenticate)` at the root level and granular `authorize(...)` per route.

---

### 2. Validation Layer (Express-Validator)
- **`middleware/validate.js`**: Intercepts validation errors from express-validator chains. If errors exist, aborts request immediately with `400 Bad Request` and structured field error details:
  ```json
  {
    "success": false,
    "message": "Validation failed",
    "errors": [
      { "field": "phone", "message": "Phone number is required" }
    ]
  }
  ```
- **`modules/auth/auth.validator.js`**: Validates registration password regex (`/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/`), phone formatting, and avatar selections.
- **`modules/crm/crm.validator.js`**: Validates staff provisioning, hotel creation, and lead status updates.

---

### 3. Authentication & Authorization Middleware
Located in `middleware/auth.js`:

#### Key Functions:
1. `generateTokens(userId, role)`: Produces `{ accessToken, refreshToken }` signed with their respective secrets.
2. `verifyAccessToken(token)`: Synchronously verifies JWT against `ACCESS_TOKEN_SECRET`; throws `AppError(401)` on expiration or tampering.
3. `generateRefreshAccessToken(refreshToken)`: Decodes refresh token and issues a new access token (60m validity).
4. `authenticate(req, res, next)`:
   - Extracts token from `Authorization: Bearer <token>`.
   - Verifies token signature.
   - Queries `User.findById(payload.id).select('-password -resetPasswordToken -resetPasswordExpires')`.
   - Attaches user document to `req.user`.
5. `authorize(...roles)`:
   - Evaluates whether `req.user.role` is included in allowed `roles`.
   - Throws `AppError('Insufficient permissions', 403)` on mismatch.

---

### 4. Controller Layer
Controllers are thin orchestrators:
- Extract input from `req.body`, `req.params`, `req.query`, and `req.user`.
- Invoke the appropriate Service method.
- Set session cookies (e.g. `res.cookie('refreshToken', ...)`).
- Return standardized HTTP responses via `utils/apiResponse.js`.

---

### 5. Service Layer (Business Logic)
Encapsulates all domain rules, cryptographic hashing, database queries, and external integrations:
- **`auth.service.js`**: Bcrypt password hashing (10 rounds), token generation, SHA-256 password reset tokens.
- **`sendOtp.service.js`**: Cryptographic OTP generation (`crypto.randomInt`), Redis TTL storage, SMS dispatch.
- **`verifyOtp.service.js`**: OTP matching, attempt tracking, single-use burn, user creation, JWT issuance.
- **`fast2sms.service.js`**: Fast2SMS DLT HTTP POST request formatting (`route: 'dlt'`, `sender_id: 'MAQAMH'`, `message: '224018'`).
- **`crm.service.js`**: Lead lifecycle, hotel management, staff user creation with role validation and `createdBy` audit trail.

---

### 6. Data Models & Schemas (Mongoose)

#### User Model (`modules/auth/auth.model.js`)
```javascript
{
  phone:                { type: String, required: true, unique: true, trim: true },
  email:                { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  password:             { type: String, required: true, select: false },
  firstName:            { type: String, required: true },
  lastName:             { type: String, required: true },
  avatar:               { type: String, enum: AVATAR_OPTIONS, default: getRandomAvatar },
  role:                 { type: String, enum: ['customer', 'sales_agent', 'support_agent', 'admin', 'super_admin', 'hotelier'], default: 'customer' },
  hotelId:              { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', default: null },
  isActive:             { type: Boolean, default: true },
  isVerified:           { type: Boolean, default: false },
  isPhoneVerified:      { type: Boolean, default: false },
  resetPasswordToken:   { type: String, default: null, select: false },
  resetPasswordExpires: { type: Date, default: null },
  lastLogin:            { type: Date, default: null },
  createdBy:            { type: String, default: null }
}
```

#### OTP Fallback Model (`models/otp.model.js`)
```javascript
{
  phone:     { type: String, required: true, trim: true },
  otp:       { type: String, required: true, trim: true },
  expiresAt: { type: Date, required: true }
}
// Indexes:
// 1. Fast lookup: { phone: 1 }
// 2. Auto TTL purge: { expiresAt: 1 }, { expireAfterSeconds: 0 }
```

---

### 7. Fast Cache & Transient State Layer (Redis)

Managed via `utils/cache.js` with automatic memory fallback:

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                               REDIS KEY SCHEMES                               │
├───────────────────┬───────────────────┬─────────────┬─────────────────────────┤
│ Key Pattern       │ Data Stored       │ TTL         │ Usage                   │
├───────────────────┼───────────────────┼─────────────┼─────────────────────────┤
│ otp:{phone}       │ { otp, attempts,  │ 300,000 ms  │ OTP verification,       │
│                   │   maxAttempts,    │ (5 minutes) │ attempt tracking,       │
│                   │   createdAt,      │             │ expiry timeline         │
│                   │   expiresAt }     │             │                         │
└───────────────────┴───────────────────┴─────────────┴─────────────────────────┘
```

---

## 🔁 Component Interaction & Sequence Diagrams

### 1. Customer OTP Login Sequence

```
Client               otp.controller      sendOtp.service       Redis / DB         Fast2SMS
  │                        │                    │                  │                 │
  ├─ POST /send-otp ──────▶│                    │                  │                 │
  │  { phone }             ├─ sendOtpService()─▶│                  │                 │
  │                        │                    ├─ crypto.randomInt│                 │
  │                        │                    ├─ cache.set() ───▶│                 │
  │                        │                    ├─ sendOtpSMS() ────────────────────▶│
  │                        │◀─ { success } ─────┤                  │                 │
  │◀─ 200 OK ──────────────┤                    │                  │                 │
  │                        │                    │                  │                 │
  │                        │                    │                  │                 │
  ├─ POST /verify-otp ────▶│                    │                  │                 │
  │  { phone, otp }        ├─ verifyOtpService()│                  │                 │
  │                        │                    ├─ cache.get() ───▶│                 │
  │                        │                    ├─ Verify match    │                 │
  │                        │                    ├─ cache.del() ───▶│ (Burn OTP)      │
  │                        │                    ├─ User.find/create│                 │
  │                        │                    ├─ generateTokens()│                 │
  │                        │◀─ { user, tokens }─┤                  │                 │
  │◀─ 200 OK (Set Cookie)──┤                    │                  │                 │
```

---

### 2. CRM Staff Authenticated Request Sequence

```
Staff Client           CRM Router          authenticate           authorize          crm.service
     │                      │                    │                    │                   │
     ├─ GET /ops-crm/leads ─▶│                   │                    │                   │
     │  Header: Bearer JWT  ├─ authenticate() ──▶│                    │                   │
     │                      │                    ├─ jwt.verify()      │                   │
     │                      │                    ├─ User.findById()   │                   │
     │                      │                    ├─ req.user = user   │                   │
     │                      │◀─ next() ──────────┤                    │                   │
     │                      │                                         │                   │
     │                      ├─ authorize('admin', 'sales_agent') ────▶│                   │
     │                      │                                         ├─ check user.role  │
     │                      │◀─ next() ───────────────────────────────┤ (Allowed)         │
     │                      │                                                             │
     │                      ├─ crmController.listLeads() ────────────────────────────────▶│
     │                      │                                                             ├─ Lead.find()
     │                      │◀─ 200 OK [Leads Data] ──────────────────────────────────────┤
     │◀─ 200 OK ────────────┤                                                             │
```

---

## ⚡ Edge Cases & Error Handling Matrix

| Scenario | Trigger / Condition | System Action | HTTP Status | Response Message / Behavior |
|---|---|---|:---:|---|
| **Deactivated User** | `user.isActive === false` | Blocks login and OTP dispatch | `403` | `"Account is deactivated. Please contact support."` |
| **Max OTP Attempts Exceeded** | User enters wrong OTP 5 times | Deletes OTP key from Redis and DB | `400` | `"Maximum OTP verification attempts exceeded. Please request a new OTP."` |
| **Expired OTP** | Request submitted after 5 min TTL | Key missing in Redis / DB | `400` | `"No OTP request found for this phone number or OTP has expired."` |
| **Duplicate Phone on Register** | Phone already exists in `User` | Aborts registration | `409` | `"Phone number already registered"` |
| **Duplicate Email on Register** | Email already exists in `User` | Aborts registration | `409` | `"Email already registered"` |
| **CRM Access with Customer Token** | `req.user.role === 'customer'` hits `/ops-crm/*` | `authorize` middleware blocks request | `403` | `"Insufficient permissions"` |
| **Missing Bearer Token** | No `Authorization` header on protected route | `authenticate` blocks request | `401` | `"Authentication token missing"` |
| **Expired Access Token** | JWT lifespan (> 120m) exceeded | `verifyAccessToken` throws error | `401` | `"Invalid or expired access token"` |
| **Invalid Refresh Token** | Tampered or expired cookie | `generateRefreshAccessToken` throws error | `401` | `"Invalid or expired refresh token"` |
| **Hotelier without Hotel ID** | Provisioning `role: 'hotelier'` with empty `hotelId` | `crmService.createCrmUser` validates requirement | `400` | `"hotelId is required when role is hotelier"` |
| **Redis Outage Resilience** | Redis server down / unreachable | `utils/cache.js` seamlessly falls back to in-memory store; `verifyOtp.service.js` falls back to MongoDB | `200` | Transparent operation without crashing server |

---

## ⚙️ Environment Variables Reference

```env
# ─── Server & Application ─────────────────────────────────
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001
CRM_PREFIX=/ops-crm

# ─── Database ─────────────────────────────────────────────
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/?appName=Cluster0

# ─── JWT Authentication Secrets ───────────────────────────
ACCESS_TOKEN_SECRET=MAQAM_TRAVELS_VAIS_ACCESS_KEY_2026
REFRESH_TOKEN_SECRET=MAQAM_TRAVELS_REFRESH_VAIS_KEY_2026

# ─── Redis Cache ──────────────────────────────────────────
REDIS_URL=redis://127.0.0.1:6379

# ─── Fast2SMS DLT Configuration ───────────────────────────
FAST2SMS_API_KEY=Vt1l9nkQasFWNzO34py7wMfA0oHJ8mCxZUP5DIGqcgXdRj2LBvHfUzTS97GZXnvcQEV86ClpLaIskAwW
FAST2SMS_SENDER_ID=MAQAMH
FAST2SMS_OTP_TEMPLATE_ID=224018

# ─── OTP Policy Controls ──────────────────────────────────
OTP_EXPIRY_MS=300000          # 5 minutes in milliseconds
OTP_MAX_ATTEMPTS=5            # Maximum failed attempts before burn
OTP_RATE_LIMIT_WINDOW_MS=900000 # 15 minutes window
OTP_RATE_LIMIT_MAX=5          # Max OTP dispatches per window
```

---

## 📌 Summary Checklist for Developers

- [x] **Customers** can authenticate via **Phone OTP** OR **Email/Phone + Password**.
- [x] **CRM users** authenticate **ONLY via Email/Phone + Password**.
- [x] **Staff creation** is restricted to `admin` / `super_admin` via CRM user provisioning endpoints.
- [x] **Short-lived access tokens** (120 min) are sent in headers; **long-lived refresh tokens** (7 days) reside in `HttpOnly` cookies.
- [x] **Redis** handles sub-millisecond OTP verification and rate-limiting with automated fallback to MongoDB.
- [x] **Fast2SMS DLT Route** is configured with approved sender header `MAQAMH` and template `224018`.
