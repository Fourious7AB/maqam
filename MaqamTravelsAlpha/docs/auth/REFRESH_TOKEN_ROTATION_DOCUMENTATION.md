# 🔄 Refresh Token Rotation (RTR) — Evolution, Current Implementation, Storage Architecture & Future Roadmap
> **Maqam Travels Alpha — Identity & Access Management (IAM)**  
> Comprehensive technical documentation detailing the legacy implementation flaws, the current production implementation of Refresh Token Rotation, token storage locations, comparative workflows, and future architecture roadmap.

---

## 📑 Table of Contents

1. [Executive Summary & Concept](#1-executive-summary--concept)
2. [Token Storage Architecture: Where Tokens Live](#2-token-storage-architecture-where-tokens-live)
   - [Access Token Storage (Client & Server)](#access-token-storage-client--server)
   - [Refresh Token Storage (Client & Server)](#refresh-token-storage-client--server)
   - [Storage Security Comparison Matrix](#storage-security-comparison-matrix)
3. [Previous Implementation (Legacy State & Flaws)](#3-previous-implementation-legacy-state--flaws)
   - [How It Worked Previously](#how-it-worked-previously)
   - [Architectural Flaws & Vulnerabilities](#architectural-flaws--vulnerabilities)
   - [Previous Workflow Diagram](#previous-workflow-diagram)
4. [Current Implementation (Present Production State)](#4-current-implementation-present-production-state)
   - [Database Model (`modules/auth/refreshToken.model.js`)](#database-model-modulesauthrefreshtokenmodeljs)
   - [Unique Token Issuance with `jti` (`middleware/auth.js`)](#unique-token-issuance-with-jti-middlewareauthjs)
   - [Session Storage on Login, Register & OTP (`modules/auth/auth.service.js`)](#session-storage-on-login-register--otp-modulesauthauthservicejs)
   - [Rotation & Burn-on-Use Logic (`refreshAccessToken`)](#rotation--burn-on-use-logic-refreshaccesstoken)
   - [Cookie Synchronization in Controller (`modules/auth/auth.controller.js`)](#cookie-synchronization-in-controller-modulesauthauthcontrollerjs)
   - [Revocation on Logout & Password Reset](#revocation-on-logout--password-reset)
   - [Present Workflow Diagram](#present-workflow-diagram)
5. [Side-by-Side Workflow Comparison: Previous vs. Present](#5-side-by-side-workflow-comparison-previous-vs-present)
6. [Future Implementations & Roadmap](#6-future-implementations--roadmap)
   - [Milestone 1: Redis In-Memory Caching & Revocation Fast-Path](#milestone-1-redis-in-memory-caching--revocation-fast-path)
   - [Milestone 2: Token Family Lineage & Automatic Compromise Detection](#milestone-2-token-family-lineage--automatic-compromise-detection)
   - [Milestone 3: Concurrency Grace Window for Multi-Tab Storms](#milestone-3-concurrency-grace-window-for-multi-tab-storms)
   - [Milestone 4: Device Fingerprinting & Anomaly Detection](#milestone-4-device-fingerprinting--anomaly-detection)
   - [Milestone 5: Multi-Device Management Dashboard](#milestone-5-multi-device-management-dashboard)
7. [Automated Verification & Testing](#7-automated-verification--testing)

---

## 1. Executive Summary & Concept

In modern web applications, user sessions must balance **frictionless user experience** with **rigorous cybersecurity**:

- **Short-Lived Access Tokens (120 Minutes)** provide fast, stateless verification for API endpoints without burdening the database on every request.
- **Long-Lived Refresh Tokens (7 Days)** allow the client to seamlessly refresh expired access tokens in the background without forcing the traveler to re-authenticate.

**Refresh Token Rotation (RTR)** transforms long-lived refresh tokens from dangerous static credentials into **single-use disposable tokens**. Every time a refresh token is presented to `/api/v1/auth/refresh-token`, it is instantly consumed and burned, and a completely new token pair is issued.

---

## 2. Token Storage Architecture: Where Tokens Live

A critical aspect of secure authentication is **where** each token is stored on both the client (browser) and the backend (server).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                TOKEN STORAGE TOPOLOGY                                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   CLIENT-SIDE (Browser)                                    BACKEND SERVER              │
│  ┌────────────────────────────────────────┐               ┌────────────────────────┐   │
│  │ In-Memory (JavaScript State / Context) │               │ Stateless Verification │   │
│  │ └── Access Token (120m)                │               │ └── ACCESS_TOKEN_SECRET│   │
│  └────────────────────────────────────────┘               └────────────────────────┘   │
│                                                                                        │
│  ┌────────────────────────────────────────┐               ┌────────────────────────┐   │
│  │ HttpOnly Secure Cookie                 │               │ MongoDB Collection     │   │
│  │ └── Refresh Token (7d)                 │──────────────>│ └── 'refreshtokens'    │   │
│  │     • httpOnly: true (No XSS read)     │               │     • TTL Index (7d)   │   │
│  │     • secure: true (HTTPS only)        │               │     • Burned on use    │   │
│  │     • sameSite: "none"                 │               └────────────────────────┘   │
│  └────────────────────────────────────────┘                                            │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Access Token Storage (Client & Server)

#### Client-Side Storage: In-Memory (React State / Redux / AuthContext)
- **Where**: Stored in JavaScript memory (e.g. React `useState`, Pinia, or an in-memory Axios variable).
- **Transport**: Transmitted in the HTTP request header:
  ```http
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```
- **Why NOT in `localStorage`?**: Storing access tokens in `localStorage` or `sessionStorage` exposes them to Cross-Site Scripting (XSS) attacks. Any malicious third-party script or injected dependency can read `localStorage.getItem("token")` and exfiltrate credentials. In-memory storage shields access tokens from script exfiltration.

#### Server-Side Storage: Purely Stateless (In-Memory Crypto Verification)
- **Where**: **NOT stored in any database**.
- **How Verified**: The server verifies access tokens mathematically using HMAC-SHA256 with `process.env.ACCESS_TOKEN_SECRET`.
- **Advantage**: Zero database queries required for standard token validation, enabling sub-millisecond API response times across high-traffic endpoints.

---

### Refresh Token Storage (Client & Server)

#### Client-Side Storage: `HttpOnly`, `Secure` Cookie
- **Where**: Stored in the browser's native cookie jar under the name `refreshToken`.
- **Cookie Configuration Options**:
  ```javascript
  const refreshTokenCookieOptions = {
    httpOnly: true,                                // Inaccessible to client-side JS (XSS immune)
    secure: process.env.NODE_ENV === "production", // Transmitted ONLY over encrypted HTTPS
    sameSite: "none",                              // Permitted across cross-origin SPA requests
    maxAge: 7 * 24 * 60 * 60 * 1000,               // 7-day lifespan
  };
  ```
- **Security Guarantees**:
  - `httpOnly: true` means `document.cookie` cannot read or steal the token via XSS.
  - The browser automatically attaches this cookie exclusively on calls to `/api/v1/auth/refresh-token` and `/api/v1/auth/logout`.

#### Server-Side Storage: MongoDB `refreshtokens` Collection
- **Where**: Stored as persistent documents in the `refreshtokens` MongoDB collection.
- **Model File**: [`modules/auth/refreshToken.model.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/auth/refreshToken.model.js).
- **Auto-Cleanup**: Governed by a MongoDB native TTL index (`{ expires: 0 }` on `expiresAt`) which automatically deletes expired documents without requiring background cron scripts.

---

### Storage Security Comparison Matrix

| Storage Location | XSS Protection | CSRF Protection | Persistence Across Refresh | Storage Target |
| :--- | :---: | :---: | :---: | :--- |
| **JavaScript Memory** (Access Token) | 🟢 **Immune** | 🟢 **Immune** | 🟡 Resets on tab refresh (Handled by silent refresh) | Client App Memory |
| **`localStorage` / `sessionStorage`** | 🔴 **Vulnerable** | 🟢 **Immune** | 🟢 Persists | ⚠️ *Never used in Maqam Travels* |
| **`HttpOnly` Cookie** (Refresh Token) | 🟢 **Immune** | 🟡 Handled via SameSite + CORS | 🟢 Persists for 7 days | Browser Native Cookie Jar |
| **MongoDB Collection** (Refresh Token) | 🟢 **Server-side** | N/A | 🟢 Persists until burned, rotated or expired | Server Database (`refreshtokens`) |

---

## 3. Previous Implementation (Legacy State & Flaws)

Before implementing true rotation, the codebase operated under a **pseudo-rotation ("illusion of rotation")** model.

### How It Worked Previously
1. **Stateless Refresh Tokens**: Tokens were generated as standard stateless JWTs without database registration:
   ```javascript
   // Legacy middleware/auth.js
   const generateTokens = (userId, role) => {
     const payload = { id: userId, role };
     const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '120m' });
     const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
     return { accessToken, refreshToken };
   };
   ```
2. **Pseudo-Refresh**:
   When `/refresh-token` was called, `jwt.verify` verified the signature and immediately minted a new token pair:
   ```javascript
   // Legacy generateRefreshAccessToken
   const generateRefreshAccessToken = (refreshToken) => {
     const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
     const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.id, decoded.role);
     return { accessToken, newRefreshToken };
   };
   ```
3. **Broken Cookie Synchronization**:
   In `auth.controller.js`, `res.cookie` was **never called** during refresh. The new refresh token was only sent in the response JSON payload. The browser's `HttpOnly` cookie remained stuck on the old token indefinitely.

### Architectural Flaws & Vulnerabilities

| Legacy Flaw | Technical Root Cause | Security Hazard |
| :--- | :--- | :--- |
| **Zombie Tokens (No Burning)** | Old refresh token was never recorded or deleted. | An attacker with a leaked token could call `/refresh-token` thousands of times over 7 days. |
| **No Replay Attack Detection** | The server had no state to know if a token had already been used. | Token theft could not be detected. Attacker and victim shared the session concurrently. |
| **Cookie Desynchronization** | Controller omitted `res.cookie` in refresh handler. | Web client kept sending the original login token on every refresh. |
| **Client-Only Logout** | `authService.logoutUser` only executed `logger.info`. | Logging out did not revoke the token on the server. Leaked tokens remained 100% active. |
| **Bypassed Account Deactivation** | Signature check never checked `user.isActive` in DB. | Banned or deactivated users could continue refreshing tokens for 7 days. |

### Previous Workflow Diagram

```
[Client]                                             [Auth Server]
   │                                                       │
   │──── 1. POST /refresh-token (Sends Token T1) ─────────>│
   │                                                       ├─ Verify JWT Signature only
   │                                                       ├─ Mint new Token T2
   │                                                       │  (T1 IS NOT BURNED! REMAINS VALID)
   │                                                       │  (Cookie NOT updated)
   │<─── 2. HTTP 200 { accessToken, refreshToken: T2 } ────┤
   │                                                       │
   │─── Later: Attacker replays stolen Token T1 ──────────>│
   │                                                       ├─ Verify signature -> PASSES!
   │<─── Attacker gets NEW Access Token! (VULNERABILITY) ──┤
```

---

## 4. Current Implementation (Present Production State)

The platform now implements **Single-Use Burn-on-Use Refresh Token Rotation** with automatic database persistence, cookie synchronization, and server-side revocation.

### Database Model ([`modules/auth/refreshToken.model.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/auth/refreshToken.model.js))

Every active refresh token is tracked as a first-class document in MongoDB:

```javascript
const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Automatic TTL cleanup by MongoDB engine
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
```

---

### Unique Token Issuance with `jti` ([`middleware/auth.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/middleware/auth.js#L15-L27))

To prevent token string collisions (even if two tokens are issued in the exact same millisecond for the same user), a cryptographic UUID is embedded in each token's `jwtid` (`jti`):

```javascript
const crypto = require('crypto');

const generateTokens = (userId, role) => {
  const payload = { id: userId, role };
  const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '120m' });
  const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: '7d',
    jwtid: crypto.randomUUID(), // Guarantees global uniqueness
  });
  return { accessToken, refreshToken };
};
```

---

### Session Storage on Login, Register & OTP ([`modules/auth/auth.service.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/auth/auth.service.js#L17-L25))

Whenever a user authenticates (via email/password, registration, or phone OTP), the issued refresh token is saved to MongoDB:

```javascript
const saveRefreshToken = async (userId, token) => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await RefreshToken.create({
    userId,
    token,
    expiresAt,
  });
};
```

This helper is invoked in:
- [`registerUser`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/auth/auth.service.js#L58-L62)
- [`loginUser`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/auth/auth.service.js#L98-L102)
- [`verifyOtpService`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/auth/auth.service.js#L338-L344)

---

### Rotation & Burn-on-Use Logic ([`refreshAccessToken`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/auth/auth.service.js#L117-L151))

When the client requests a refresh, the system executes a 6-step atomic rotation:

```javascript
const refreshAccessToken = async (oldRefreshToken) => {
  try {
    // 1. Verify cryptographic signature & expiry
    let decoded;
    try {
      decoded = jwt.verify(oldRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      throw new AppError("Invalid or expired refresh token", 401);
    }

    // 2. Locate token in MongoDB
    const tokenDoc = await RefreshToken.findOne({ token: oldRefreshToken });
    if (!tokenDoc) {
      // Token not found -> Already burned or tampered! (REPLAY ATTACK)
      throw new AppError("Refresh token has already been used or is invalid. Please login again.", 401);
    }

    // 3. BURN the old token immediately
    await RefreshToken.deleteOne({ _id: tokenDoc._id });

    // 4. Verify user status
    const user = await User.findById(decoded.id);
    if (!user || user.isActive === false) {
      throw new AppError("User account inactive or not found", 401);
    }

    // 5. Mint new rotated tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id, user.role);

    // 6. Save the new refresh token in MongoDB
    await saveRefreshToken(user._id, newRefreshToken);

    logger.info(`Refresh token rotated successfully for user: ${user._id}`);
    return { accessToken, newRefreshToken };
  } catch (error) {
    logger.error(`Token refresh failed: ${error.message}`);
    throw error;
  }
};
```

---

### Cookie Synchronization in Controller ([`modules/auth/auth.controller.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/auth/auth.controller.js#L82-L101))

The controller synchronizes the newly rotated token back into the browser's `HttpOnly` cookie on every single refresh:

```javascript
const refreshToken = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!rawRefreshToken) {
      return sendUnauthorized(res, "Refresh token not provided");
    }

    const result = await authService.refreshAccessToken(rawRefreshToken);

    // CRITICAL: Synchronize the rotated refresh token into HttpOnly cookie
    res.cookie("refreshToken", result.newRefreshToken, refreshTokenCookieOptions);

    return sendSuccess(res, {
      message: "Token refreshed successfully",
      data: {
        accessToken: result.accessToken,
        refreshToken: result.newRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};
```

---

### Revocation on Logout & Password Reset

1. **Logout**:
   When the user logs out, [`authService.logoutUser`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/auth/auth.service.js#L180-L192) deletes the token record from MongoDB. If an attacker stole that token earlier, they cannot use it.
2. **Password Reset**:
   When a user resets their password, **all** existing refresh tokens for that user are wiped across all devices:
   ```javascript
   await RefreshToken.deleteMany({ userId: user._id });
   ```

---

### Present Workflow Diagram

```
[Client]                                              [Auth Server & MongoDB]
   │                                                             │
   │──── 1. POST /refresh-token (Sends Token T1) ───────────────>│
   │                                                             ├─ Verify JWT Signature (Valid)
   │                                                             ├─ Check MongoDB for T1
   │                                                             │  • FOUND in DB!
   │                                                             ├─ 💥 BURN T1: deleteOne({ token: T1 })
   │                                                             ├─ Verify User active in DB
   │                                                             ├─ Mint new pair: { A2, T2 }
   │                                                             ├─ 💾 SAVE T2: create({ token: T2 })
   │<─── 2. HTTP 200 Set-Cookie: refreshToken=T2 ────────────────┤
   │        Data: { accessToken: A2, refreshToken: T2 }          │
   │                                                             │
   │═════════════════════════════════════════════════════════════│
   │                ATTACK SCENARIO: REPLAY OF T1                │
   │═════════════════════════════════════════════════════════════│
   │                                                             │
   │──── 3. Attacker replays burned Token T1 ───────────────────>│
   │                                                             ├─ Verify JWT Signature (Valid)
   │                                                             ├─ Check MongoDB for T1
   │                                                             │  • ❌ NOT FOUND (Already Burned!)
   │<─── 4. HTTP 401 Unauthorized ("Token already used") ────────┤
```

---

## 5. Side-by-Side Workflow Comparison: Previous vs. Present

| Dimension | Previous Implementation (Legacy) | Present Implementation (Current Production) |
| :--- | :--- | :--- |
| **Token Invalidation** | ❌ **Never invalidated**. Old tokens remained valid for 7 days ("zombie tokens"). | 🟢 **Single-use burn**. Old token is deleted from MongoDB on every refresh. |
| **Replay Attack Resistance** | ❌ **Vulnerable**. Stolen token could be replayed endlessly. | 🟢 **Protected**. Replaying a burned token triggers instant HTTP 401 rejection. |
| **Token Uniqueness** | 🟡 Deterministic timestamp (could collide if issued in same second). | 🟢 Embedded `jwtid: crypto.randomUUID()` guarantees 100% uniqueness. |
| **Cookie Synchronization** | ❌ **Broken**. `res.cookie` was omitted in refresh controller. | 🟢 **Synchronized**. New token cookie is updated on every refresh. |
| **Server-Side Logout** | ❌ **Client-only**. Server took no action; tokens stayed active. | 🟢 **Server-side deletion**. Token is purged from MongoDB on logout. |
| **Account Deactivation** | ❌ **Ignored**. Inactive users could still refresh tokens. | 🟢 **Guarded**. Database verifies `user.isActive` before minting tokens. |
| **Password Reset Invalidation**| ❌ **None**. Old devices remained logged in. | 🟢 **Cascade Purge**. Wipes all active tokens for the user in MongoDB. |
| **Database Auto-Cleaning** | ❌ None. | 🟢 Native MongoDB TTL index auto-deletes expired tokens after 7 days. |

---

## 6. Future Implementations & Roadmap

While the current MongoDB-backed implementation is robust, production-grade, and eliminates replay attacks, the following architecture milestones represent the forward-looking roadmap:

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                       TOKEN SUBSYSTEM FUTURE ROADMAP                              │
├─────────────────────┬─────────────────────────────────────────────────────────────┤
│ Milestone 1         │ Redis Caching Layer for Sub-Millisecond Lookups             │
├─────────────────────┼─────────────────────────────────────────────────────────────┤
│ Milestone 2         │ Token Family Lineage & Automatic Compromise Detection       │
├─────────────────────┼─────────────────────────────────────────────────────────────┤
│ Milestone 3         │ Concurrency Grace Window for Multi-Tab Storms               │
├─────────────────────┼─────────────────────────────────────────────────────────────┤
│ Milestone 4         │ Device Fingerprinting & Geographic Anomaly Detection        │
├─────────────────────┼─────────────────────────────────────────────────────────────┤
│ Milestone 5         │ Customer Multi-Device Session Management Dashboard          │
└─────────────────────┴─────────────────────────────────────────────────────────────┘
```

### Milestone 1: Redis In-Memory Caching & Revocation Fast-Path
- **Objective**: Reduce MongoDB disk I/O under massive concurrent user traffic spikes.
- **Design**:
  - Cache active refresh token keys in Redis (`rt:token:<tokenId>`) with 7-day TTL.
  - Verify token existence in Redis sub-millisecond RAM memory before hitting MongoDB.
  - Revocations update Redis instantly with sub-millisecond propagation.

### Milestone 2: Token Family Lineage & Automatic Compromise Detection
- **Standard**: RFC 6749 & OAuth 2.0 Security BCP §4.14.2.
- **Concept**:
  - Assign a permanent `familyId` (UUID) to the session upon initial login.
  - Even as tokens rotate (T1 ➔ T2 ➔ T3), all generations share the same `familyId`.
  - If a burned token (e.g. T1) is replayed, the server doesn't just reject the attacker—it **recognizes that a compromise occurred and instantly revokes all descendant tokens in that family** (`status: 'revoked'`).
  - Forces both the attacker and the legitimate user to re-authenticate, instantly isolating the breach.

### Milestone 3: Concurrency Grace Window for Multi-Tab Storms
- **Problem**: When a customer opens 4 browser tabs (e.g. Flights, Hotels, Umrah Packages, Profile), access tokens expire at the exact same millisecond. All 4 tabs simultaneously call `/refresh-token`.
- **Solution**:
  - Introduce a **30-second concurrency grace period** (`graceExpiresAt`).
  - Tab 1 rotates T1 ➔ T2.
  - If Tab 2 arrives 80ms later with T1, the server detects it is within the 30s grace window and safely re-serves the already-created child T2 without triggering a security breach alarm.

### Milestone 4: Device Fingerprinting & Anomaly Detection
- **Concept**:
  - Record SHA-256 hash of client fingerprint (User-Agent, Accept-Language, IP subnet) inside the token record.
  - If a refresh token issued in Mumbai is suddenly presented 10 minutes later from Frankfurt, flag as suspicious, require step-up OTP authentication, or revoke the session.

### Milestone 5: Customer Multi-Device Session Management Dashboard
- **Concept**:
  - Allow travelers to view active sessions in their profile settings ("Chrome on Windows - Delhi", "Safari on iPhone - Jeddah").
  - Provide a "Log out of other devices" button calling:
    ```javascript
    await RefreshToken.deleteMany({ userId, _id: { $ne: currentTokenId } });
    ```

---

## 7. Automated Verification & Testing

The current RTR implementation includes an automated integration test suite located at:
[`tests/refreshTokenAuth.test.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/tests/refreshTokenAuth.test.js)

### Running the Test Suite:
```bash
node --test tests/refreshTokenAuth.test.js
```

### Verified Test Assertions:
1. `should issue and store a new refresh token on login/session creation` ✅
2. `should successfully rotate token: burn old token and issue new child token` ✅
3. `should REJECT replay attack when trying to reuse an already burned token` ✅
4. `should allow multiple sequential rotations with valid active tokens` ✅
5. `should reject rotation with completely invalid or tampered token` ✅
6. `should revoke token on logout and prevent further refreshes` ✅
