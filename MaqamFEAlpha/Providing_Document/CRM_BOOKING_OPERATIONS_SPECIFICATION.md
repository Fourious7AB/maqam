# CRM Master Bookings & Operations Desk — Frontend Integration Guide

> **Document Version:** 2.0.0  
> **Target Audience:** CRM Frontend Developers, Full-Stack Engineers, Product QA  
> **Location:** `server/docs/booking/CRM_BOOKING_OPERATIONS_SPECIFICATION.md`  
> **Base URL:** `/api/v1/crm/bookings`  
> **Swagger UI (Interactive Playground):** `http://localhost:5000/api/crm-docs` (Tag: `CRM - Bookings Desk`)

---

## 1. Quick Overview & Authentication

The **CRM Master Bookings & Operations Desk** provides a unified operations cockpit for viewing, searching, and managing all customer bookings across the business.

### Authentication Header
Every request to the CRM Bookings API requires a Bearer JWT token:
```http
Authorization: Bearer <your_access_token>
Content-Type: application/json
```

### Allowed Roles
Users with the following roles have access:
- `admin`
- `super_admin`
- `sales_agent`
- `support_agent`
- `finance`

### Standard Response Envelope
All endpoints return standard JSON responses:

#### List Endpoints:
```json
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "data": [ /* Array of records */ ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

#### Single Object Endpoints:
```json
{
  "success": true,
  "message": "Booking dossier retrieved successfully",
  "data": { /* Detailed object directly */ }
}
```

---

## 2. API Endpoints Reference Cheat Sheet

| Method | Endpoint Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/crm/bookings` | **Master Table:** Paginated search and filtering across all booking types. |
| `GET` | `/api/v1/crm/bookings/summary` | **Operations Metrics:** Live badge counters for header statistics. |
| `GET` | `/api/v1/crm/bookings/:bookingType/:id` | **360° Dossier:** Full inspection file (passengers, itinerary, payments, timeline). |
| `PATCH` | `/api/v1/crm/bookings/:bookingType/:id/status` | **Status Override:** Change status, enter offline PNR/ticket #, append internal remark. |
| `PATCH` | `/api/v1/crm/bookings/:bookingType/:id/assign` | **Assign Agent:** Assign a staff member to handle the booking file. |
| `POST` | `/api/v1/crm/bookings/:bookingType/:id/remarks` | **Add Timeline Note:** Log customer interaction notes or internal remarks. |

---

## 3. Detailed Endpoint Specifications

### 1. Master Unified Bookings List
Retrieve a paginated master list of all bookings across Packages, Offers, Flights, and Hotels.

- **Method:** `GET`
- **Path:** `/api/v1/crm/bookings`
- **Query Parameters:**

| Parameter | Type | Default | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `bookingType` | string | `all` | Filter by category: `all`, `package`, `offer`, `flight`, `hotel`, `visa` | `package` |
| `status` | string | optional | Filter by status: `pending`, `confirmed`, `cancelled`, `failed`, `completed` | `confirmed` |
| `search` | string | optional | Case-insensitive text search matching customer name, email, phone, or destination | `Ahmad` |
| `startDate` | string | optional | ISO 8601 date string. Filter bookings created after this date | `2026-09-01T00:00:00Z` |
| `endDate` | string | optional | ISO 8601 date string. Filter bookings created before this date | `2026-09-30T23:59:59Z` |
| `assignedTo` | string | optional | MongoDB ObjectId of assigned staff member | `671a98b76e123456789abcde` |
| `page` | integer | `1` | Page number (min: 1) | `1` |
| `limit` | integer | `20` | Records per page (min: 1, max: 100) | `20` |

#### Sample Request:
```http
GET /api/v1/crm/bookings?bookingType=all&status=confirmed&page=1&limit=20 HTTP/1.1
Authorization: Bearer <token>
```

#### Sample Response (`200 OK`):
```json
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "data": [
    {
      "_id": "673f1a2b8e123456789a1111",
      "itemId": "673f1a2b8e123456789a1111",
      "bookingReference": "BK-PACKAGE-9A1111",
      "bookingType": "package",
      "origin": "in_house",
      "customer": {
        "_id": "671e54a32b00000000000001",
        "name": "Ahmad Al-Mansoor",
        "email": "ahmad.mansoor@example.com",
        "phone": "+91 9876543210"
      },
      "destination": "Makkah & Madinah",
      "travelDates": {
        "startDate": "2026-11-01T00:00:00.000Z",
        "endDate": "2026-11-08T00:00:00.000Z"
      },
      "paxCount": 2,
      "totalAmount": 135000,
      "currency": "INR",
      "status": "confirmed",
      "paymentStatus": "paid",
      "assignedTo": {
        "_id": "671a98b76e123456789abcde",
        "name": "Sarah Khan",
        "email": "sarah.crm@maqamtravels.com"
      },
      "createdAt": "2026-09-21T10:15:00.000Z",
      "updatedAt": "2026-09-21T10:20:00.000Z"
    },
    {
      "_id": "673f1a2b8e123456789a2222",
      "itemId": "673f1a2b8e123456789a2222",
      "bookingReference": "BK-FLIGHT-9A2222",
      "bookingType": "flight",
      "origin": "third_party",
      "customer": {
        "_id": "671e54a32b00000000000002",
        "name": "Zaid Ibrahim",
        "email": "zaid@example.com",
        "phone": "+91 9123456780"
      },
      "destination": "DEL-JED",
      "travelDates": {
        "startDate": "2026-12-01T06:30:00.000Z",
        "endDate": null
      },
      "paxCount": 1,
      "totalAmount": 45000,
      "currency": "INR",
      "status": "pending",
      "paymentStatus": "pending",
      "assignedTo": null,
      "createdAt": "2026-09-22T14:00:00.000Z",
      "updatedAt": "2026-09-22T14:00:00.000Z"
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### 2. Operations Metrics & Queue Summary
Fetch top-bar badge metrics for operations dashboards.

- **Method:** `GET`
- **Path:** `/api/v1/crm/bookings/summary`

#### Sample Response (`200 OK`):
```json
{
  "success": true,
  "message": "Bookings summary retrieved successfully",
  "data": {
    "totalBookings": 128,
    "pendingActions": {
      "awaitingOperations": 14,
      "cancellationsCount": 6
    },
    "byType": {
      "packages": 52,
      "offers": 24,
      "flights": 38,
      "hotels": 14
    },
    "byStatus": {
      "confirmed": 102,
      "pending": 14,
      "cancelled": 6
    },
    "financialSummary": {
      "totalGrossRevenue": 14850000,
      "currency": "INR"
    }
  }
}
```

---

### 3. Get 360° Booking Operations Dossier
Fetches the complete operational dossier of a single booking.

- **Method:** `GET`
- **Path:** `/api/v1/crm/bookings/:bookingType/:id`
- **URL Parameters:**
  - `bookingType`: `package` | `offer` | `flight` | `hotel` | `visa`
  - `id`: The booking MongoDB ObjectId (or SRDV reference ID)

#### Sample Response (`200 OK`):
```json
{
  "success": true,
  "message": "Booking dossier retrieved successfully",
  "data": {
    "_id": "673f1a2b8e123456789a1111",
    "masterBookingId": "673f1a2b8e123456789a9999",
    "bookingReference": "BK-PACKAGE-9A1111",
    "bookingType": "package",
    "origin": "in_house",
    "status": "confirmed",
    "customer": {
      "_id": "671e54a32b00000000000001",
      "name": "Ahmad Al-Mansoor",
      "email": "ahmad.mansoor@example.com",
      "phone": "+91 9876543210"
    },
    "assignedTo": {
      "_id": "671a98b76e123456789abcde",
      "name": "Sarah Khan",
      "email": "sarah.crm@maqamtravels.com",
      "phone": "+91 9988776655"
    },
    "remarks": [
      {
        "_id": "673f2b1...",
        "text": "Customer called to request wheelchair assistance at airport",
        "author": {
          "_id": "671a98b76e123456789abcde",
          "name": "Sarah Khan",
          "email": "sarah.crm@maqamtravels.com"
        },
        "createdAt": "2026-09-22T11:00:00.000Z"
      }
    ],
    "financials": {
      "totalAmount": 135000,
      "currency": "INR",
      "payment": {
        "_id": "673f3c1...",
        "status": "paid",
        "amount": 135000,
        "method": "razorpay",
        "gatewayOrderId": "order_P98XyZ123",
        "gatewayPaymentId": "pay_P98AbC456",
        "paidAt": "2026-09-21T10:18:00.000Z"
      }
    },
    "cancellation": {
      "isCancelled": false,
      "cancelledAt": null,
      "cancellationReason": null,
      "refundAmount": null
    },
    "rawBookingDetails": {
      "_id": "673f1a2b8e123456789a1111",
      "packageId": {
        "_id": "672...",
        "title": "7D Umrah Delights",
        "destination": "Makkah"
      },
      "travelDates": {
        "startDate": "2026-11-01T00:00:00.000Z",
        "endDate": "2026-11-08T00:00:00.000Z"
      },
      "travellers": [
        {
          "travellerId": "671...",
          "isLead": true
        }
      ],
      "claimedFlightUnits": [],
      "claimedHotelUnits": []
    },
    "createdAt": "2026-09-21T10:15:00.000Z",
    "updatedAt": "2026-09-22T11:00:00.000Z"
  }
}
```

---

### 4. Operational Status Override & Offline Details
Allows an operations agent to update status, set an offline PNR/ticket number, or log an internal resolution.

- **Method:** `PATCH`
- **Path:** `/api/v1/crm/bookings/:bookingType/:id/status`
- **Request Body:**

| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `status` | string | **Yes** | `pending` \| `confirmed` \| `cancelled` \| `failed` \| `completed` | `confirmed` |
| `pnr` | string | No | Offline airline PNR (for flights/packages) | `JED987X` |
| `ticketNumber` | string | No | E-ticket confirmation number | `098-9876543210` |
| `internalRemark` | string | No | Reason or note for the status change | `Payment received via NEFT transfer` |

#### Sample Request:
```json
{
  "status": "confirmed",
  "pnr": "JED987X",
  "ticketNumber": "098-9876543210",
  "internalRemark": "Verified NEFT bank transfer and issued offline e-ticket"
}
```

#### Sample Response (`200 OK`):
Returns the updated 360° dossier with updated `status` and the appended remark in `remarks`.

---

### 5. Assign Handling Agent
Assigns or reassigns a sales/support agent to oversee the booking file.

- **Method:** `PATCH`
- **Path:** `/api/v1/crm/bookings/:bookingType/:id/assign`
- **Request Body:**

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `assignedTo` | string | **Yes** | MongoDB ObjectId of the target staff user |

#### Sample Request:
```json
{
  "assignedTo": "671a98b76e123456789abcde"
}
```

#### Sample Response (`200 OK`):
Returns the updated dossier with the updated `assignedTo` object and an automated timeline entry (`"Assigned to agent <Name>"`).

---

### 6. Add Operational Timeline Remark
Log internal support remarks or customer conversation notes.

- **Method:** `POST`
- **Path:** `/api/v1/crm/bookings/:bookingType/:id/remarks`
- **Request Body:**

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `remark` | string | **Yes** | Note text (e.g. customer request, supplier delay note) |

#### Sample Request:
```json
{
  "remark": "Customer requested date shift. Informed that airline penalty of ₹3,000 will apply."
}
```

#### Sample Response (`200 OK`):
Returns the updated dossier with the new remark appended to the `remarks` array.

---

## 4. How Cancellations Work (Frontend Action Routing)

To protect wholesale stock counts and avoid code duplication:
- **In-House Packages (`bookingType === 'package'`):**  
  Call the Package module's dedicated cancellation endpoint:
  ```http
  POST /api/v1/crm/packages/bookings/:id/cancel
  Content-Type: application/json
  Authorization: Bearer <token>

  {
    "reason": "Customer requested cancellation due to medical emergency"
  }
  ```
  *What happens automatically:* The backend unclaims all physical flight seats and hotel rooms in `TicketStock` and `HotelStock`, marks the booking `cancelled`, updates master records, and marks payment status.

- **In-House Offers (`bookingType === 'offer'`):**  
  Call the Offer module's dedicated cancellation endpoint:
  ```http
  POST /api/v1/crm/offers/bookings/:id/cancel
  Content-Type: application/json
  Authorization: Bearer <token>

  {
    "reason": "User requested cancellation"
  }
  ```

- **Live SRDV Flights & Hotels (`flight`, `hotel`):**  
  Live airline and hotel bookings are subject to GDS supplier rules. Once the ticket is cancelled/voided with the supplier/airline, update the status via:
  ```http
  PATCH /api/v1/crm/bookings/:bookingType/:id/status
  
  {
    "status": "cancelled",
    "internalRemark": "Cancelled via airline portal. Airline refund reference: REF9812."
  }
  ```

---

## 5. TypeScript Interfaces for Frontend

You can copy and paste these TypeScript types directly into your frontend codebase (`src/types/crmBookings.ts`):

```typescript
export type BookingType = 'package' | 'offer' | 'flight' | 'hotel' | 'visa';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'failed' | 'completed';
export type PaymentStatus = 'pending' | 'paid' | 'partially_refunded' | 'refunded' | 'failed';
export type BookingOrigin = 'in_house' | 'third_party';

export interface CrmCustomer {
  _id: string | null;
  name: string;
  email: string;
  phone: string;
}

export interface CrmAgent {
  _id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface CrmRemark {
  _id?: string;
  text: string;
  author: CrmAgent | null;
  createdAt: string;
}

export interface CrmBookingListItem {
  _id: string;
  itemId: string;
  bookingReference: string;
  bookingType: BookingType;
  origin: BookingOrigin;
  customer: CrmCustomer;
  destination: string;
  travelDates: {
    startDate: string | null;
    endDate: string | null;
  };
  paxCount: number;
  totalAmount: number;
  currency: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  assignedTo: CrmAgent | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmBookingsPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CrmBookingsSummary {
  totalBookings: number;
  pendingActions: {
    awaitingOperations: number;
    cancellationsCount: number;
  };
  byType: {
    packages: number;
    offers: number;
    flights: number;
    hotels: number;
  };
  byStatus: {
    confirmed: number;
    pending: number;
    cancelled: number;
  };
  financialSummary: {
    totalGrossRevenue: number;
    currency: string;
  };
}

export interface CrmBookingDossier {
  _id: string;
  masterBookingId: string | null;
  bookingReference: string;
  bookingType: BookingType;
  origin: BookingOrigin;
  status: BookingStatus;
  customer: CrmCustomer;
  assignedTo: CrmAgent | null;
  remarks: CrmRemark[];
  financials: {
    totalAmount: number;
    currency: string;
    payment: {
      _id: string;
      status: string;
      amount: number;
      method: string;
      gatewayOrderId?: string;
      gatewayPaymentId?: string;
      paidAt?: string;
    } | null;
  };
  cancellation: {
    isCancelled: boolean;
    cancelledAt: string | null;
    cancellationReason: string | null;
    refundAmount: number | null;
  };
  rawBookingDetails: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

---

## 6. Ready-to-Use Frontend API Client (`bookingsApi.js`)

Drop this Axios client into `src/admin/features/bookings/bookingsApi.js`:

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Bearer token from localStorage or state
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const bookingsApi = {
  /**
   * 1. Get paginated bookings with search and filters
   * @param {Object} params - { bookingType, status, search, startDate, endDate, assignedTo, page, limit }
   */
  listBookings: async (params = {}) => {
    const res = await api.get('/crm/bookings', { params });
    return {
      bookings: res.data.data,
      pagination: res.data.meta,
    };
  },

  /**
   * 2. Get operations queue summary badge counts
   */
  getSummary: async () => {
    const res = await api.get('/crm/bookings/summary');
    return res.data.data;
  },

  /**
   * 3. Get 360° booking operations dossier
   * @param {string} bookingType - 'package' | 'offer' | 'flight' | 'hotel' | 'visa'
   * @param {string} id - Booking ID
   */
  getBookingDossier: async (bookingType, id) => {
    const res = await api.get(`/crm/bookings/${bookingType}/${id}`);
    return res.data.data;
  },

  /**
   * 4. Override operational status & offline details
   * @param {string} bookingType
   * @param {string} id
   * @param {Object} body - { status, pnr, ticketNumber, internalRemark }
   */
  updateStatus: async (bookingType, id, body) => {
    const res = await api.patch(`/crm/bookings/${bookingType}/${id}/status`, body);
    return res.data.data;
  },

  /**
   * 5. Assign handling agent to booking
   * @param {string} bookingType
   * @param {string} id
   * @param {string} assignedTo - Agent User ID
   */
  assignAgent: async (bookingType, id, assignedTo) => {
    const res = await api.patch(`/crm/bookings/${bookingType}/${id}/assign`, { assignedTo });
    return res.data.data;
  },

  /**
   * 6. Add operational timeline remark
   * @param {string} bookingType
   * @param {string} id
   * @param {string} remark
   */
  addRemark: async (bookingType, id, remark) => {
    const res = await api.post(`/crm/bookings/${bookingType}/${id}/remarks`, { remark });
    return res.data.data;
  },

  /**
   * 7. Cancel In-House Package Booking (Releases stock automatically)
   * @param {string} packageBookingId
   * @param {string} reason
   */
  cancelPackageBooking: async (packageBookingId, reason) => {
    const res = await api.post(`/crm/packages/bookings/${packageBookingId}/cancel`, { reason });
    return res.data.data;
  },

  /**
   * 8. Cancel In-House Offer Booking (Releases stock automatically)
   * @param {string} offerBookingId
   * @param {string} reason
   */
  cancelOfferBooking: async (offerBookingId, reason) => {
    const res = await api.post(`/crm/offers/bookings/${offerBookingId}/cancel`, { reason });
    return res.data.data;
  },
};
```

---

## 7. Error Handling Reference

| HTTP Status | Meaning | Typical Scenario | Example Response Body |
| :--- | :--- | :--- | :--- |
| `400 Bad Request` | Validation Failure | Invalid `status` or invalid `bookingType` | `{"success": false, "message": "Status must be one of: pending, confirmed, cancelled, completed, failed"}` |
| `401 Unauthorized` | Auth Missing/Expired | Bearer token is missing or expired | `{"success": false, "message": "Unauthorized"}` |
| `403 Forbidden` | Access Denied | User does not have a CRM staff role | `{"success": false, "message": "Forbidden - Insufficient permissions"}` |
| `404 Not Found` | Resource Missing | Booking or Agent ID does not exist | `{"success": false, "message": "Booking of type package not found"}` |
