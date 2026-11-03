# Customer Profile Management API Documentation

> **Base URL:** `/api/v1/auth`  
> **Interactive Swagger UI:** [`http://localhost:5000/api/docs/`](http://localhost:5000/api/docs/) *(under the **Authentication** tag)*  
> **Security Scheme:** Bearer JWT (`Authorization: Bearer <access_token>`) or HttpOnly Cookie (`accessToken`)  
> **Target Audience:** Public Customers / Travelers (`customer` role) and all authenticated platform users

---

## 📑 Table of Contents
1. [Overview & Architecture](#1-overview--architecture)
2. [Allowed Fields & Validation Matrix](#2-allowed-fields--validation-matrix)
3. [Endpoint: Fetch Profile (`GET /api/v1/auth/me`)](#3-endpoint-fetch-profile-get-apiv1authme)
4. [Endpoint: Update Profile (`PATCH /api/v1/auth/me` / `PUT /api/v1/auth/me`)](#4-endpoint-update-profile-patch-apiv1authme)
5. [Endpoint: Delete Profile (`DELETE /api/v1/auth/me`)](#5-endpoint-delete-profile-delete-apiv1authme)
6. [Security & Architectural Guardrails](#6-security--architectural-guardrails)
7. [Frontend Integration Example (Axios / Redux Toolkit)](#7-frontend-integration-example-axios--redux-toolkit)
8. [cURL Quick Testing Reference](#8-curl-quick-testing-reference)

---

## 1. Overview & Architecture

The Customer Profile Management subsystem enables authenticated travelers to inspect, modify, and delete/deactivate their own personal profiles on Maqam Travels platform.

```
                                 AUTHENTICATED CUSTOMER
                                           │
                    Bearer JWT / HttpOnly Cookie (accessToken)
                                           │
                                           ▼
                              ┌─────────────────────────┐
                              │  authenticate Middleware │
                              └────────────┬────────────┘
                                           │ (req.user set)
                     ┌─────────────────────┴─────────────────────┐
                     │                                           │
                     ▼                                           ▼
         PATCH /api/v1/auth/me                       DELETE /api/v1/auth/me
   (Update Self-Profile Details)                   (Deactivate / Delete Self)
                     │                                           │
         ┌───────────┴───────────┐                   ┌───────────┴───────────┐
         │ • Email uniqueness    │                   │ • Soft-delete default │
         │ • Phone uniqueness    │                   │   (isActive = false)  │
         │ • Avatar whitelist    │                   │ • Optional permanent  │
         │ • Protected fields    │                   │   deletion (?permanent)│
         │   filtered out        │                   │ • Revoke session &    │
         └───────────┬───────────┘                   │   clear cookies       │
                     │                               └───────────┬───────────┘
                     ▼                                           ▼
             200 OK + Updated                            200 OK + Deletion
               User Profile                                Confirmation
```

### Key Differences: Customer Self-Service vs CRM Staff Administration
* **Customer Self-Service (`/api/v1/auth/me`)**: The logged-in customer acts strictly upon their own account (`req.user._id`). They cannot manipulate permissions, elevate roles, alter verification badges, or modify accounts belonging to others.
* **CRM Staff Administration (`/api/v1/crm/users/:id`)**: Restricted strictly to `admin` and `super_admin` roles to manage staff rosters, assign hotel affiliations, or unlock accounts across the company.

---

## 2. Allowed Fields & Validation Matrix

When updating their profile via `PATCH` or `PUT`, customers may only modify the following fields:

| Field | Data Type | Editable by Customer | Validation Rules | Description |
| :--- | :--- | :---: | :--- | :--- |
| `firstName` | `String` | **Yes** | Trimmed, non-empty if provided | User's given name |
| `lastName` | `String` | **Yes** | Trimmed, non-empty if provided | User's family / surname |
| `email` | `String` | **Yes** | Valid RFC email syntax, normalized lowercase, **must be unique** | Email address used for notifications and receipts |
| `phone` | `String` | **Yes** | 10–15 digits, **must be unique** | Primary phone number used for SMS / OTP |
| `avatar` | `String` | **Yes** | Must match one of the predefined CDN avatar URLs | Profile picture URL selected from avatar library |
| `role` | `String` | ❌ **No** | *Ignored / Protected* | Customer cannot change role (remains `customer`) |
| `isActive` | `Boolean` | ❌ **No** | *Ignored / Protected* | Managed only via `DELETE` or by Administrators |
| `isVerified` | `Boolean` | ❌ **No** | *Ignored / Protected* | System verification badge |
| `isPhoneVerified` | `Boolean` | ❌ **No** | *Ignored / Protected* | Managed through OTP verification service |
| `hotelId` | `ObjectId` | ❌ **No** | *Ignored / Protected* | Hotelier linkage only applicable to partner staff |

### Avatar Whitelist Options (`User.AVATAR_OPTIONS`)
The `avatar` property must match one of the system-approved avatar illustrations:
1. `https://cdn-icons-png.flaticon.com/512/1077/1077114.png`
2. `https://cdn-icons-png.flaticon.com/512/3135/3135715.png`
3. `https://cdn-icons-png.flaticon.com/512/6997/6997662.png`
4. `https://cdn-icons-png.flaticon.com/512/4140/4140048.png`
5. `https://cdn-icons-png.flaticon.com/512/236/236831.png`

---

## 3. Endpoint: Fetch Profile (`GET /api/v1/auth/me`)

Retrieves the currently authenticated customer's profile.

* **HTTP Method:** `GET`
* **Route:** `/api/v1/auth/me`
* **Authentication:** Required (`Bearer <token>` or HttpOnly session cookie)

### Headers
| Header | Value | Required |
| :--- | :--- | :---: |
| `Authorization` | `Bearer <JWT_ACCESS_TOKEN>` | **Yes** *(unless session cookie is present)* |

### Request Body
None.

---

### Response Body

#### `200 OK` — Profile Retrieved Successfully
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "user": {
      "id": "67d68a9fc2ba9424de376d0e",
      "phone": "9876543210",
      "email": "tariq.rahman@maqamtravels.com",
      "firstName": "Tariq",
      "lastName": "Rahman",
      "fullName": "Tariq Rahman",
      "avatar": "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
      "role": "customer",
      "isActive": true,
      "isVerified": true,
      "isPhoneVerified": true,
      "hotelId": null,
      "lastLogin": "2026-09-17T06:15:30.000Z",
      "createdAt": "2026-09-15T12:00:00.000Z"
    }
  }
}
```

---

## 4. Endpoint: Update Profile (`PATCH /api/v1/auth/me`)

Updates one or more profile fields for the authenticated customer.  
*(Note: `PUT /api/v1/auth/me` is supported as an identical alias).*

* **HTTP Method:** `PATCH` or `PUT`
* **Route:** `/api/v1/auth/me`
* **Authentication:** Required (`Bearer <token>` or HttpOnly session cookie)

### Headers
| Header | Value | Required |
| :--- | :--- | :---: |
| `Authorization` | `Bearer <JWT_ACCESS_TOKEN>` | **Yes** |
| `Content-Type` | `application/json` | **Yes** |

---

### Request Body

All fields are optional. Supply only the fields you wish to update.

```json
{
  "firstName": "Tariq",
  "lastName": "Al-Rahman",
  "email": "tariq.newemail@maqamtravels.com",
  "phone": "9876543210",
  "avatar": "https://cdn-icons-png.flaticon.com/512/1077/1077114.png"
}
```

#### Request Body Schema (`UpdateProfileRequest`)
| Field | Type | Required | Constraints | Example |
| :--- | :--- | :---: | :--- | :--- |
| `firstName` | `String` | No | Min 1 character when provided | `"Tariq"` |
| `lastName` | `String` | No | Min 1 character when provided | `"Al-Rahman"` |
| `email` | `String` | No | Valid email syntax; must not belong to another user | `"tariq.newemail@maqamtravels.com"` |
| `phone` | `String` | No | 10–15 digits; must not belong to another user | `"9876543210"` |
| `avatar` | `String` | No | Must be one of the `AVATAR_OPTIONS` URLs | `"https://cdn-icons-png.flaticon.com/512/1077/1077114.png"` |

---

### Responses

#### `200 OK` — Profile Updated Successfully
```json
{
  "success": true,
  "message": "User profile updated successfully",
  "data": {
    "user": {
      "id": "67d68a9fc2ba9424de376d0e",
      "phone": "9876543210",
      "email": "tariq.newemail@maqamtravels.com",
      "firstName": "Tariq",
      "lastName": "Al-Rahman",
      "fullName": "Tariq Al-Rahman",
      "avatar": "https://cdn-icons-png.flaticon.com/512/1077/1077114.png",
      "role": "customer",
      "isActive": true,
      "isVerified": true,
      "isPhoneVerified": true,
      "hotelId": null,
      "lastLogin": "2026-09-17T06:15:30.000Z",
      "createdAt": "2026-09-15T12:00:00.000Z",
      "updatedAt": "2026-09-17T06:45:12.000Z"
    }
  }
}
```

#### `400 Bad Request` — Validation Error
Triggered if an invalid email format, blank name, or unlisted avatar URL is submitted.
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "avatar",
      "message": "Avatar selection is invalid"
    },
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

#### `401 Unauthorized` — Missing or Invalid Authentication
```json
{
  "success": false,
  "message": "Access token is missing or invalid. Please authenticate."
}
```

#### `403 Forbidden` — Account Deactivated
Triggered if the user's account has been previously deactivated or banned.
```json
{
  "success": false,
  "message": "Account is deactivated. Please contact support."
}
```

#### `409 Conflict` — Email or Phone Already Registered
Triggered if another customer is already registered with the requested email or phone number.
```json
{
  "success": false,
  "message": "Email is already registered by another user"
}
```
*Or for phone number:*
```json
{
  "success": false,
  "message": "Phone number is already registered by another user"
}
```

---

## 5. Endpoint: Delete Profile (`DELETE /api/v1/auth/me`)

Allows a customer to delete or deactivate their profile and terminate all active sessions.

* **HTTP Method:** `DELETE`
* **Route:** `/api/v1/auth/me`
* **Authentication:** Required (`Bearer <token>` or HttpOnly session cookie)

### Query Parameters
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `permanent` | `Boolean` | No | `false` | When `false` (default), performs a **soft-delete** (`isActive = false`) to maintain historical invoice and booking integrity. When `true`, physically deletes the record from MongoDB. |

### Headers
| Header | Value | Required |
| :--- | :--- | :---: |
| `Authorization` | `Bearer <JWT_ACCESS_TOKEN>` | **Yes** |

### Request Body
None required. (Alternatively, `{ "permanent": true }` can be passed in JSON body).

---

### Responses

#### `200 OK` — Profile Deactivated (Soft Delete — Default)
```json
{
  "success": true,
  "message": "Account deactivated successfully",
  "data": {
    "id": "67d68a9fc2ba9424de376d0e",
    "deleted": true,
    "permanent": false,
    "message": "Account deactivated successfully"
  }
}
```

#### `200 OK` — Profile Permanently Deleted (`?permanent=true`)
```json
{
  "success": true,
  "message": "Account permanently deleted successfully",
  "data": {
    "id": "67d68a9fc2ba9424de376d0e",
    "deleted": true,
    "permanent": true,
    "message": "Account permanently deleted successfully"
  }
}
```

#### Response Cookies Cleared
Upon successful deletion, the server automatically invalidates and removes client-side session cookies:
* `Set-Cookie: accessToken=; Max-Age=0; Path=/; Expires=...`
* `Set-Cookie: refreshToken=; Max-Age=0; Path=/; Expires=...`

#### `401 Unauthorized` — Missing or Invalid Authentication
```json
{
  "success": false,
  "message": "Access token is missing or invalid. Please authenticate."
}
```

#### `404 Not Found` — User Record Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

---

## 6. Security & Architectural Guardrails

1. **Self-Targeting Isolation**:
   The user ID is extracted purely from `req.user._id` decoded from the cryptographic JWT payload. A user cannot supply another user's ID to manipulate someone else's profile.
2. **Protected Attributes Sanitization**:
   Administrative fields like `role`, `hotelId`, `isActive`, `isVerified`, and `isPhoneVerified` are strictly ignored during customer updates.
3. **Collision Avoidance**:
   Email and phone uniqueness checks use `{ $ne: userId }` filters, ensuring users can keep their own email/phone without collision false positives, while preventing collisions with other accounts.
4. **Relational Booking Integrity**:
   In tourism and travel platforms, booking confirmations, e-tickets, and payment receipts are legal and financial records. Default soft deletion (`isActive = false`) ensures these relationships never become dangling orphan references.
5. **Session Revocation**:
   When an account is deleted/deactivated, `logoutUser(userId)` is immediately invoked to flush cached authentication states, and all cookies are cleared.

---

## 7. Frontend Integration Example (Axios / Redux Toolkit)

### Redux Toolkit Thunks

```javascript
import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api"; // Axios instance configured with withCredentials: true

// 1. Update Profile
export const updateUserProfile = createAsyncThunk(
  "auth/updateUserProfile",
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await api.patch("/api/v1/auth/me", profileData);
      return response.data; // contains { success: true, message, data: { user } }
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: "Failed to update profile" });
    }
  }
);

// 2. Delete / Deactivate Profile
export const deleteUserProfile = createAsyncThunk(
  "auth/deleteUserProfile",
  async ({ permanent = false } = {}, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/api/v1/auth/me?permanent=${permanent}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: "Failed to delete account" });
    }
  }
);
```

### React Component Usage

```jsx
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateUserProfile, deleteUserProfile } from "./authSlice";
import { toast } from "react-toastify";

export default function EditProfileForm() {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user);

  const [form, setForm] = useState({
    firstName: currentUser?.firstName || "",
    lastName: currentUser?.lastName || "",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
    avatar: currentUser?.avatar || "",
  });

  const handleUpdate = async (e) => {
    e.preventDefault();
    const result = await dispatch(updateUserProfile(form));
    if (updateUserProfile.fulfilled.match(result)) {
      toast.success("Profile updated successfully!");
    } else {
      toast.error(result.payload?.message || "Update failed");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to deactivate your account?")) return;
    const result = await dispatch(deleteUserProfile({ permanent: false }));
    if (deleteUserProfile.fulfilled.match(result)) {
      toast.info("Account deactivated. Redirecting to home...");
      window.location.href = "/";
    } else {
      toast.error(result.payload?.message || "Deletion failed");
    }
  };

  return (
    <form onSubmit={handleUpdate} className="space-y-4">
      <input
        type="text"
        value={form.firstName}
        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
        placeholder="First Name"
      />
      <input
        type="text"
        value={form.lastName}
        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
        placeholder="Last Name"
      />
      <input
        type="email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        placeholder="Email Address"
      />
      <button type="submit">Save Changes</button>
      <button type="button" onClick={handleDelete} className="text-red-500">
        Deactivate Account
      </button>
    </form>
  );
}
```

---

## 8. cURL Quick Testing Reference

### 1. Update Profile (PATCH)
```bash
curl -X PATCH http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Tariq",
    "lastName": "Rahman",
    "email": "tariq.updated@example.com",
    "avatar": "https://cdn-icons-png.flaticon.com/512/1077/1077114.png"
  }'
```

### 2. Deactivate Profile (Soft Delete — Default)
```bash
curl -X DELETE http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 3. Permanent Profile Delete
```bash
curl -X DELETE "http://localhost:5000/api/v1/auth/me?permanent=true" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```
