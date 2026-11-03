# 📊 CRM Markup API — Frontend Integration Guide

> **Target Audience:** Frontend Developers (React, Next.js, Vue, Angular, Mobile Apps)  
> **Service:** Maqam Travels CRM Operations  
> **Base Currency:** **`USD`** (US Dollars)  
> **Base URL:** `http://localhost:5000` *(Local Dev)* | `https://api.yourdomain.com` *(Production)*  
> **Swagger Documentation:** `http://localhost:5000/api/crm-docs` *(CRM Swagger UI)*

---

## 📌 Table of Contents
1. [Overview](#1-overview)
2. [API Endpoints Summary](#2-api-endpoints-summary)
3. [Authentication & Headers](#3-authentication--headers)
4. [Endpoint Specifications](#4-endpoint-specifications)
   - [A. Get Markup Configuration (`GET /api/v1/crm/markup`)](#a-get-markup-configuration-get-apiv1crmmarkup)
   - [B. Set / Update Markup Configuration (`POST / PUT / PATCH /api/v1/crm/markup`)](#b-set--update-markup-configuration-post--put--patch-apiv1crmmarkup)
5. [Frontend Implementation Guide](#5-frontend-implementation-guide)
   - [Step 1: Environment Variables](#step-1-environment-variables)
   - [Step 2: Axios Client with Auth Interceptor](#step-2-axios-client-with-auth-interceptor)
   - [Step 3: Markup API Service Module](#step-3-markup-api-service-module)
   - [Step 4: Complete React Component Example](#step-4-complete-react-component-example)
   - [Step 5: TanStack Query (React Query) Example (Optional)](#step-5-tanstack-query-react-query-example-optional)
6. [Error Handling & Edge Cases](#6-error-handling--edge-cases)
7. [Testing with cURL](#7-testing-with-curl)

---

## 1. Overview

The **CRM Markup API** allows administrators and back-office agents to manage profit margins on travel services (Flights and Hotels) from the CRM side in **USD**. When an admin updates these percentages, the platform's pricing engine dynamically calculates prices across all customer-facing searches and bookings.

* **Flight Markup (`flightMarkupPercent`)**: Applied to supplier flight fares (LCC & GDS).
* **Hotel Markup (`hotelMarkupPercent`)**: Applied per-night to hotel supplier rates.
* **Operating Currency (`currency`)**: **`USD`** (default CRM & platform financial currency).

---

## 2. API Endpoints Summary

| Method | Canonical Endpoint | Compatibility Alias | Allowed Roles | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`GET`** | `/api/v1/crm/setting/markup` | `/api/v1/crm/markup` | `admin`, `super_admin`, `sales_agent`, `support_agent` | Retrieve current platform markup percentages |
| **`POST`** | `/api/v1/crm/setting/markup` | `/api/v1/crm/markup` | `admin`, `super_admin` | Create or set markup settings |
| **`PUT`** | `/api/v1/crm/setting/markup` | `/api/v1/crm/markup` | `admin`, `super_admin` | Full update / overwrite markup settings |
| **`PATCH`**| `/api/v1/crm/setting/markup` | `/api/v1/crm/markup` | `admin`, `super_admin` | Partial update of specific markup fields |

---

## 3. Authentication & Headers

All requests require JWT Bearer authentication. Non-authenticated requests will return `401 Unauthorized`. Users without appropriate roles will receive `403 Forbidden`.

### Required Headers:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
```

---

## 4. Endpoint Specifications

### A. Get Markup Configuration (`GET /api/v1/crm/setting/markup`)

Retrieves the currently active markup settings.

* **Canonical URL:** `/api/v1/crm/setting/markup`
* **Compatibility URL:** `/api/v1/crm/markup`
* **Method:** `GET`
* **Access:** Admins, Super Admins, Sales Agents, Support Agents

#### Response Example (`200 OK`):
```json
{
  "success": true,
  "message": "Markup settings retrieved successfully",
  "data": {
    "flightMarkupPercent": 10,
    "hotelMarkupPercent": 4,
    "defaultMarkupPercent": 5,
    "currency": "USD"
  }
}
```

---

### B. Set / Update Markup Configuration (`POST / PUT / PATCH /api/v1/crm/setting/markup`)

Updates the markup percentages and optional currency. Admins can update one or all fields.

* **Canonical URL:** `/api/v1/crm/setting/markup`
* **Compatibility URL:** `/api/v1/crm/markup`
* **Methods:** `POST`, `PUT`, or `PATCH`
* **Access:** `admin`, `super_admin` only

#### Request Body (`application/json`):
```json
{
  "flightMarkupPercent": 10.0,
  "hotelMarkupPercent": 5.0,
  "defaultMarkupPercent": 5.0,
  "currency": "USD"
}
```

#### Field Validation Rules:
| Field | Type | Required? | Rules | Description |
| :--- | :--- | :--- | :--- | :--- |
| `flightMarkupPercent` | `number` | Optional* | Must be numeric (e.g. `10` or `7.5`) | Profit markup percentage for flights |
| `hotelMarkupPercent` | `number` | Optional* | Must be numeric (e.g. `5` or `4.2`) | Profit markup percentage for hotels |
| `currency` | `string` | Optional | e.g. `"USD"` | Base operating currency (defaults to `"USD"`) |
| `defaultMarkupPercent` | `number` | Optional | Must be numeric | Fallback default markup percentage |

*\*Note: At least one field should be provided in the payload object.*

#### Response Example (`200 OK`):
```json
{
  "success": true,
  "message": "Markup settings updated successfully",
  "data": {
    "flightMarkupPercent": 10.0,
    "hotelMarkupPercent": 5.0,
    "currency": "USD"
  }
}
```

---

## 5. Frontend Implementation Guide

### Step 1: Environment Variables

In your frontend project root (Vite / Next.js / Create React App), configure your backend API base URL:

#### For Vite (`.env`):
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

#### For Next.js (`.env.local`):
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

---

### Step 2: Axios Client with Auth Interceptor

Create a reusable API client that attaches the JWT token from `localStorage` or your auth state.

**File:** `src/api/axiosClient.js`
```javascript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor: Attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 token expiry
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Optional: Redirect to login or dispatch refresh token action
      console.warn('Session expired or unauthorized. Redirecting to login...');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

### Step 3: Markup API Service Module

Create a dedicated service file for markup actions.

**File:** `src/services/markupService.js`
```javascript
import apiClient from '../api/axiosClient';

/**
 * Fetch current markup configuration
 * @returns {Promise<Object>} Markup data { flightMarkupPercent, hotelMarkupPercent, currency }
 */
export const getMarkupSettings = async () => {
  const response = await apiClient.get('/crm/markup');
  return response.data.data;
};

/**
 * Update markup configuration (Admin only)
 * @param {Object} payload - { flightMarkupPercent, hotelMarkupPercent, currency }
 * @returns {Promise<Object>} Updated markup data
 */
export const updateMarkupSettings = async (payload) => {
  const response = await apiClient.post('/crm/markup', payload);
  return response.data.data;
};
```

---

### Step 4: Complete React Component Example

Here is a ready-to-use, polished Settings card component in React with loading states, error handling, and form submission.

**File:** `src/components/MarkupSettingsCard.jsx`
```jsx
import React, { useState, useEffect } from 'react';
import { getMarkupSettings, updateMarkupSettings } from '../services/markupService';

export default function MarkupSettingsCard() {
  const [formData, setFormData] = useState({
    flightMarkupPercent: '',
    hotelMarkupPercent: '',
  });
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  // 1. Fetch current settings on component mount
  useEffect(() => {
    fetchMarkup();
  }, []);

  const fetchMarkup = async () => {
    try {
      setLoading(true);
      const data = await getMarkupSettings();
      setFormData({
        flightMarkupPercent: data.flightMarkupPercent ?? 0,
        hotelMarkupPercent: data.hotelMarkupPercent ?? 0,
      });
      if (data.currency) setCurrency(data.currency);
      setStatusMessage({ type: '', text: '' });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to load markup settings.';
      setStatusMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === '' ? '' : Number(value),
    }));
  };

  // 3. Submit updated settings
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setStatusMessage({ type: '', text: '' });

      const payload = {
        flightMarkupPercent: Number(formData.flightMarkupPercent),
        hotelMarkupPercent: Number(formData.hotelMarkupPercent),
        currency: 'USD',
      };

      const updatedData = await updateMarkupSettings(payload);
      setFormData({
        flightMarkupPercent: updatedData.flightMarkupPercent,
        hotelMarkupPercent: updatedData.hotelMarkupPercent,
      });
      if (updatedData.currency) setCurrency(updatedData.currency);
      setStatusMessage({ type: 'success', text: 'Markup settings updated successfully in USD!' });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to update markup settings.';
      setStatusMessage({ type: 'error', text: errorMsg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', background: '#fff', borderRadius: '8px' }}>
        <p>Loading markup configuration...</p>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h2 style={styles.title}>📈 Platform Markup Configuration</h2>
        <span style={styles.badge}>Base Currency: {currency}</span>
      </div>
      <p style={styles.subtitle}>
        Configure the profit markup percentages added dynamically to live flight tickets and hotel bookings.
      </p>

      {statusMessage.text && (
        <div
          style={{
            ...styles.alert,
            background: statusMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: statusMessage.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${statusMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          {statusMessage.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="flightMarkupPercent">
            ✈️ Flight Markup (%)
          </label>
          <div style={styles.inputWrapper}>
            <input
              id="flightMarkupPercent"
              name="flightMarkupPercent"
              type="number"
              step="0.1"
              min="0"
              max="100"
              required
              value={formData.flightMarkupPercent}
              onChange={handleChange}
              style={styles.input}
              placeholder="e.g. 10.0"
            />
            <span style={styles.inputSuffix}>%</span>
          </div>
          <small style={styles.helpText}>Applied to LCC & GDS flight bookings.</small>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="hotelMarkupPercent">
            🏨 Hotel Markup (%)
          </label>
          <div style={styles.inputWrapper}>
            <input
              id="hotelMarkupPercent"
              name="hotelMarkupPercent"
              type="number"
              step="0.1"
              min="0"
              max="100"
              required
              value={formData.hotelMarkupPercent}
              onChange={handleChange}
              style={styles.input}
              placeholder="e.g. 5.0"
            />
            <span style={styles.inputSuffix}>%</span>
          </div>
          <small style={styles.helpText}>Applied to per-night hotel room rates.</small>
        </div>

        <div style={styles.actions}>
          <button
            type="button"
            onClick={fetchMarkup}
            disabled={saving}
            style={styles.btnSecondary}
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            style={styles.btnPrimary}
          >
            {saving ? 'Saving Changes...' : 'Save Markup'}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  card: {
    maxWidth: '560px',
    background: '#ffffff',
    borderRadius: '12px',
    padding: '28px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
    border: '1px solid #e2e8f0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
  },
  badge: {
    background: '#ecfdf5',
    color: '#059669',
    fontSize: '11px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '12px',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '20px',
    lineHeight: 1.5,
  },
  alert: {
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#334155',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '10px 40px 10px 14px',
    fontSize: '15px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  inputSuffix: {
    position: 'absolute',
    right: '14px',
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: '14px',
    pointerEvents: 'none',
  },
  helpText: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px',
  },
  btnPrimary: {
    background: '#0284c7',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  btnSecondary: {
    background: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
```

---

### Step 5: TanStack Query (React Query) Example (Optional)

If your frontend uses `@tanstack/react-query`:

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMarkupSettings, updateMarkupSettings } from '../services/markupService';

export const useMarkupQuery = () => {
  return useQuery({
    queryKey: ['crm-markup'],
    queryFn: getMarkupSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
};

export const useUpdateMarkupMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMarkupSettings,
    onSuccess: (newData) => {
      queryClient.setQueryData(['crm-markup'], newData);
    },
  });
};
```

---

## 6. Error Handling & Edge Cases

| Status Code | Message | Cause | How Frontend Should Handle |
| :--- | :--- | :--- | :--- |
| **`400 Bad Request`** | `"flightMarkupPercent must be a number"` | Non-numeric input value sent | Validate form input with `type="number"` before dispatch. |
| **`401 Unauthorized`** | `"Authentication token missing"` or `"Invalid or expired access token"` | Missing/expired JWT Bearer token | Prompt user to log in again or refresh auth token. |
| **`403 Forbidden`** | `"Insufficient permissions"` | User role is not `admin` / `super_admin` | Hide the save button or disable inputs for non-admin users. |
| **`500 Internal Error`**| `"Internal Server Error"` | Server or database issue | Show user-friendly toast: "Service temporarily unavailable". |

---

## 7. Testing with cURL

You can test both endpoints directly from your command line:

### 1. GET Current Markup (returns USD):
```bash
curl -X GET "http://localhost:5000/api/v1/crm/markup" \
  -H "Authorization: Bearer <YOUR_ADMIN_JWT_TOKEN>"
```

### 2. POST / Update Markup in USD:
```bash
curl -X POST "http://localhost:5000/api/v1/crm/markup" \
  -H "Authorization: Bearer <YOUR_ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"flightMarkupPercent": 10.0, "hotelMarkupPercent": 5.0, "currency": "USD"}'
```
