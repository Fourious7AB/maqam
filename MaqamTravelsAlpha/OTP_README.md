# 📲 OTP Authentication Service — Maqam Travels Alpha

Phone-based OTP authentication system using **Fast2SMS DLT route**, **Redis** (primary store with TTL), and **MongoDB** (resilient fallback).

> 📖 **Full Architectural Documentation**: See [OTP_AUTHENTICATION_DOCUMENTATION.md](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/docs/auth/OTP_AUTHENTICATION_DOCUMENTATION.md) for the complete reference.

---

## 📁 File Structure (Modular Architecture)

```
MaqamTravelsAlpha/
├── modules/
│   └── auth/
│       ├── auth.routes.js            # Express endpoints: /send-otp & /verify-otp
│       ├── auth.controller.js        # Request handlers & cookie dispatch
│       ├── auth.service.js           # OTP generation, verification, user auto-provisioning
│       └── auth.model.js             # Mongoose User model with phone verification flags
├── models/
│   └── otp.model.js                  # Mongoose schema for OTP fallback records with TTL index
├── services/
│   └── fast2sms.service.js           # Fast2SMS DLT API integration layer (Header: MAQAMH)
├── utils/
│   ├── cache.js                      # Redis cache manager with in-memory map fallback
│   └── redis.js                      # ioredis client singleton
└── scripts/
    └── test-fast2sms.js              # CLI smoke-test for Fast2SMS API
```

---

## 🔄 Active Endpoints

Base Path: **`/api/v1/auth`**

### 1️⃣ Send OTP — `POST /api/v1/auth/send-otp`

Generates a 6-digit OTP, stores it in Redis with 5-minute TTL, and dispatches it via Fast2SMS DLT.

**Request Body:**
```json
{
  "phone": "9876543210"
}
```

**Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "OTP dispatched successfully.",
  "data": {
    "phone": "9876543210",
    "otp": "482931",
    "isNewUser": true,
    "userExists": false,
    "expiresInSeconds": 300
  }
}
```

---

### 2️⃣ Verify OTP — `POST /api/v1/auth/verify-otp`

Validates OTP against Redis (or MongoDB fallback). On success, burns the OTP (single-use), auto-registers new users, and issues JWT access token + refresh token cookie.

**Request Body:**
```json
{
  "phone": "9876543210",
  "otp": "482931"
}
```

**Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "OTP verified successfully. Login successful.",
  "data": {
    "user": {
      "id": "66d4b555e944f7b6b199e825",
      "phone": "9876543210",
      "firstName": "User",
      "lastName": "3210",
      "role": "customer",
      "isPhoneVerified": true,
      "isVerified": true
    },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

---

## ⚙️ Environment Variables

```env
# ─── Fast2SMS Gateway ─────────────────────────────────────────
FAST2SMS_API_KEY=Vt1l9nkQasFWNzO34py7wMfA0oHJ8mCxZUP5DIGqcgXdRj2LBvHfUzTS97GZXnvcQEV86ClpLaIskAwW
FAST2SMS_SENDER_ID=MAQAMH
FAST2SMS_OTP_TEMPLATE_ID=224018

# ─── OTP Policy Controls ──────────────────────────────────────
OTP_EXPIRY_MS=300000            # 5 minutes (in milliseconds)
OTP_MAX_ATTEMPTS=5              # Max wrong attempts before OTP burns
OTP_RATE_LIMIT_WINDOW_MS=900000 # Rate limit window: 15 minutes
OTP_RATE_LIMIT_MAX=5            # Max OTP requests per window

# ─── Redis Connection ─────────────────────────────────────────
REDIS_URL=redis://127.0.0.1:6379
```

---

## 🔒 Security Highlights

- **Single-Use Burning**: OTP is immediately deleted from Redis and MongoDB upon match.
- **Brute-Force Lockout**: After 5 failed attempts, the OTP is burned and rejected.
- **Cryptographic Randomness**: Uses `crypto.randomInt(100000, 999999)`.
- **HttpOnly Cookies**: Refresh token is kept out of browser JavaScript access.
- **TRAI DLT Compliance**: Sender header `MAQAMH` with template `224018`.
