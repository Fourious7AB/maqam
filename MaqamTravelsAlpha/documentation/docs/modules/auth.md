---
sidebar_position: 1
---

# Authentication Module

The `auth` module handles user onboarding, login, session token issuance, and password recovery.

## Component Map

* **Model:** `User` ([auth.model.js](file:///d:/Shashi/MaqamTravelsAlpha/modules/auth/auth.model.js))
* **Controller:** `authController` ([auth.controller.js](file:///d:/Shashi/MaqamTravelsAlpha/modules/auth/auth.controller.js))
* **Service:** `authService` ([auth.service.js](file:///d:/Shashi/MaqamTravelsAlpha/modules/auth/auth.service.js))
* **Routes:** `authRoutes` ([auth.routes.js](file:///d:/Shashi/MaqamTravelsAlpha/modules/auth/auth.routes.js))
* **Validator:** `authValidator` ([auth.validator.js](file:///d:/Shashi/MaqamTravelsAlpha/modules/auth/auth.validator.js))

---

## Key Flows

### 1. User Registration (`POST /register`)
* **Validations:** Checks that phone number is unique, password has at least 6 characters, and names are present.
* **Logic:** Cryptographically hashes the password using `bcryptjs` (salt rounds: 10). Saves user profile. Generates Access and Refresh tokens. Sets the HttpOnly cookie. Returns `AuthResponse`.

### 2. User Login (`POST /login`)
* **Validations:** Checks that phone and password are provided.
* **Logic:** Queries the `User` model, explicitly selecting the `+password` field (which is hidden by default). Verifies hashes. Updates `lastLogin` timestamp. Generates new session tokens.

### 3. Password Reset
* **Forgot Password (`POST /forgot-password`):** Generates a high-entropy, short-lived reset token (`resetPasswordToken`) and stores it in the database with an expiration time (`resetPasswordExpires`). Dispatches an email containing the reset URL: `https://maqamtravels.com/reset-password?token=<token>`.
* **Reset Password (`POST /reset-password/:token`):** Validates that the token exists and is not expired. Hashes the new password, clears the token/expiration fields, and saves the user record.

---

## Role-Based Access Control (RBAC)

Users are assigned one of the following roles:
* `customer`: Standard consumer. Can search and book.
* `sales_agent`: CRM operations agent. Can create custom packages and record payments.
* `support_agent`: Support operations. Can view bookings and logs.
* `admin`: Manage inventory, bookings, and agents.
* `super_admin`: Full administrative system privileges.

### Role Authorization Middleware
To restrict access to routes, chain the `authenticate` and `authorize` middleware:
```javascript
const { authenticate, authorize } = require('../../middleware/auth');

// Gated admin route
router.post('/admin/inventory', authenticate, authorize('admin', 'super_admin'), inventoryController.create);
```
