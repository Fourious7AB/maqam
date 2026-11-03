# Frontend Integration Guide: Hotel Partners, Room Allotments & Hotelier Portal

> **Target Audience:** Frontend engineers implementing the CRM Admin Portal and the Hotelier Partner Portal.  
> **Status:** Verified & tested with live API calls against local backend. All seeded credentials and IDs in this document are **active and ready to use**.

---

## 1. Quick Reference: Ready-to-Use Test Credentials & IDs

Use these active accounts and IDs directly to test without needing to seed anything new:

### 🔑 Active User Accounts

| Role | Email | Password | Assigned Hotel |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin1@gmail.com` | `Admin1234` | Full CRM Admin Access |
| **Hotelier 1** | `hotelier1@gmail.com` | `Hotelier1234!` | **Atlantis The Royal, Dubai** |
| **Hotelier 2** | `hotelier2@gmail.com` | `Hotelier1234!` | **Grand Hyatt Dubai** |

### 🏨 Active Partner Hotel Entities in Database

| Hotel Name | Destination | `hotelId` (Pass this to create room/hotelier) |
| :--- | :--- | :--- |
| **Atlantis The Royal** | Dubai | `6aaa35d9d1cad56b320149b5` |
| **Grand Hyatt Dubai** | Dubai | `6aa7a264deb5e62eec46e8f8` |
| **Pullman Zamzam** | Makkah | `6aa7a264deb5e62eec46e8ec` |
| **Madinah Hilton** | Madinah | `6aa7a264deb5e62eec46e8ef` |
| **Swissôtel Makkah** | Makkah | `6aa7a264deb5e62eec46e8f2` |

---

## 2. Solution to Frontend Issue: "How to Add a Room / Hotel Stock in CRM"

In the CRM UI, an admin cannot add a room stock without selecting which hotel it belongs to.

### Recommended UI / UX Flow:
```text
[CRM Room Stock Page] 
   └── 1. On Mount: Call GET /api/v1/crm/hotels
   └── 2. Render Dropdown: <select> options with hotel.name + hotel.destination (value = hotel._id)
   └── 3. User selects Hotel -> form captures hotelId
   └── 4. User fills Room Specs (type, dates, price, units)
   └── 5. On Submit: Call POST /api/v1/crm/stocks/hotels with hotelId
```

---

## 3. Endpoints & Payloads for Admin CRM

### A. Populate Hotel Dropdown: `GET /api/v1/crm/hotels`
Use this endpoint on page load to populate the `<select>` or autocomplete dropdown.

* **Method:** `GET`
* **URL:** `/api/v1/crm/hotels`
* **Headers:** `Authorization: Bearer <ADMIN_ACCESS_TOKEN>`
* **Query Params (Optional):** `?page=1&limit=50&search=dubai`

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "Hotels retrieved",
  "data": [
    {
      "_id": "6aaa35d9d1cad56b320149b5",
      "name": "Atlantis The Royal",
      "destination": "Dubai",
      "address": "Palm Jumeirah, Crescent Rd, Dubai, UAE",
      "contactPerson": "Sarah Jenkins",
      "contactPhone": "+97144260000",
      "contactEmail": "partners@atlantistheroyal.com",
      "amenities": ["Private Beach", "Infinity Pool", "Luxury Spa", "Free WiFi"],
      "isActive": true
    },
    {
      "_id": "6aa7a264deb5e62eec46e8f8",
      "name": "Grand Hyatt Dubai",
      "destination": "Dubai",
      "address": "Riyadh Street, Sheikh Rashid Rd, Dubai, UAE",
      "contactPerson": "John Doe",
      "contactPhone": "+97143171234",
      "contactEmail": "partners@grandhyattdubai.com",
      "amenities": ["Resort Pool", "Tennis Courts", "Spa"],
      "isActive": true
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 21,
    "totalPages": 2
  }
}
```

---

### B. Admin Creates Room Allotment: `POST /api/v1/crm/stocks/hotels`
Once the admin selects a hotel from the dropdown, submit the room allotment. Admin-created room stock is **instantly approved** (`reviewStatus: "approved"`).

* **Method:** `POST`
* **URL:** `/api/v1/crm/stocks/hotels`
* **Headers:**  
  * `Authorization: Bearer <ADMIN_ACCESS_TOKEN>`  
  * `Content-Type: application/json`

#### Request Payload:
```json
{
  "hotelId": "6aaa35d9d1cad56b320149b5",
  "roomType": "Royal Sky Suite",
  "checkIn": "2026-11-20T00:00:00.000Z",
  "checkOut": "2026-11-25T00:00:00.000Z",
  "pricePerNight": 5500,
  "meals": ["breakfast", "dinner"],
  "reservationRef": "ATL-ROYAL-BLK-01",
  "nameAdditionDeadline": "2026-11-15T00:00:00.000Z",
  "totalUnits": 10
}
```

#### Field Explanations:
| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `hotelId` | String (ObjectId) | **Yes** | Selected from dropdown (`hotel._id`). |
| `roomType` | String | **Yes** | e.g. `"Deluxe Room"`, `"Executive Suite"`. |
| `checkIn` | ISO Date String | **Yes** | Allotment start date (e.g. `"2026-11-20"`). |
| `checkOut` | ISO Date String | **Yes** | Allotment end date. Must be after `checkIn`. |
| `pricePerNight` | Number | **Yes** | Wholesale contracted rate per night (e.g. `5500`). |
| `meals` | Array of Strings | No | Allowed: `["breakfast"]`, `["lunch"]`, `["dinner"]`. |
| `reservationRef` | String | **Yes** | Wholesale confirmation / contract reference code. |
| `nameAdditionDeadline`| ISO Date String | **Yes** | Cut-off date to supply passenger names before room drops. |
| `totalUnits` | Number | **Yes** | Quantity of rooms allocated (e.g. `10`). Minimum `1`. |

#### Success Response (`201 Created`):
```json
{
  "success": true,
  "message": "Hotel room allotment stock created successfully",
  "stock": {
    "_id": "6aaa38269ee6a3ee85173f90",
    "hotelId": "6aaa35d9d1cad56b320149b5",
    "hotelName": "Atlantis The Royal",
    "destination": "Dubai",
    "roomType": "Royal Sky Suite",
    "checkIn": "2026-11-20T00:00:00.000Z",
    "checkOut": "2026-11-25T00:00:00.000Z",
    "pricePerNight": 5500,
    "meals": ["breakfast", "dinner"],
    "reservationRef": "ATL-ROYAL-BLK-01",
    "nameAdditionDeadline": "2026-11-15T00:00:00.000Z",
    "reviewStatus": "approved",
    "reviewedBy": "6aa294294be3715a8964c408",
    "totalUnits": 10,
    "availableUnits": 10,
    "totalNights": 5,
    "costPerUnit": 27500,
    "units": [
      { "_id": "6aaa38269ee6a3ee85173f91", "status": "available" },
      { "_id": "6aaa38269ee6a3ee85173f92", "status": "available" }
    ],
    "createdAt": "2026-09-16T06:33:10.000Z"
  }
}
```

---

### C. Admin List All Room Stocks: `GET /api/v1/crm/stocks/hotels`
Used to render the wholesale hotel inventory table in the admin dashboard.

* **Method:** `GET`
* **URL:** `/api/v1/crm/stocks/hotels`
* **Headers:** `Authorization: Bearer <ADMIN_ACCESS_TOKEN>`
* **Query Parameters (Filters & Pagination):**
  * `hotelId` - Filter by specific hotel ID
  * `destination` - Filter by city/country (e.g. `dubai`)
  * `roomType` - Filter by room type substring
  * `reservationRef` - Filter by wholesale booking ref
  * `availableOnly=true` - Only return allotments with remaining available units
  * `checkInMin` / `checkOutMax` - Filter date range
  * `page=1&limit=20` - Pagination controls

#### Response (`200 OK`):
```json
{
  "success": true,
  "stocks": [
    {
      "_id": "6aaa38269ee6a3ee85173f90",
      "hotelId": {
        "_id": "6aaa35d9d1cad56b320149b5",
        "name": "Atlantis The Royal",
        "destination": "Dubai"
      },
      "hotelName": "Atlantis The Royal",
      "roomType": "Royal Sky Suite",
      "checkIn": "2026-11-20T00:00:00.000Z",
      "checkOut": "2026-11-25T00:00:00.000Z",
      "pricePerNight": 5500,
      "reviewStatus": "approved",
      "totalUnits": 10,
      "availableUnits": 10,
      "reservationRef": "ATL-ROYAL-BLK-01"
    }
  ],
  "pagination": {
    "total": 28,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  }
}
```

---

### D. Admin Get Single Room Stock: `GET /api/v1/crm/stocks/hotels/:id`
* **Method:** `GET`
* **URL:** `/api/v1/crm/stocks/hotels/:stockId`
* **Headers:** `Authorization: Bearer <ADMIN_ACCESS_TOKEN>`
* **Description:** Fetches complete room allotment details including every individual room unit and populated hotel entity.

---

### E. Inventory Utilization & Expiry KPI Overview: `GET /api/v1/crm/stocks/overview`
Use this endpoint to render summary dashboard cards for wholesale ticket seats and hotel room allotments.

* **Method:** `GET`
* **URL:** `/api/v1/crm/stocks/overview`
* **Headers:** `Authorization: Bearer <ADMIN_ACCESS_TOKEN>`

#### Response (`200 OK`):
```json
{
  "success": true,
  "flights": {
    "totalBatches": 15,
    "totalSeats": 320,
    "availableSeats": 240,
    "heldSeats": 60,
    "usedSeats": 20,
    "expiringWithin3Days": 2
  },
  "hotels": {
    "totalAllotments": 28,
    "totalRooms": 210,
    "availableRooms": 165,
    "heldRooms": 35,
    "usedRooms": 10,
    "expiringWithin3Days": 1
  }
}
```

---

### F. Create a New Hotel Partner: `POST /api/v1/crm/hotels`
If the hotel does not exist yet in the dropdown, open an "Add Hotel" modal/drawer.

* **Method:** `POST`
* **URL:** `/api/v1/crm/hotels`
* **Headers:** `Authorization: Bearer <ADMIN_ACCESS_TOKEN>`

#### Request Payload:
```json
{
  "name": "Burj Al Arab Luxury Suites",
  "destination": "Dubai",
  "address": "Jumeirah Beach Road, Dubai, UAE",
  "contactPerson": "Ahmad Hassan",
  "contactPhone": "+97143017777",
  "contactEmail": "reservations@burjalarab.com",
  "amenities": ["Helipad", "Private Butler", "Infinity Pool", "Spa"],
  "tieUpStartDate": "2026-01-01T00:00:00.000Z",
  "contractNotes": "VIP Partner, net rates locked for Q4"
}
```

---

### G. Get Partner Hotel Details: `GET /api/v1/crm/hotels/:id`
* **Method:** `GET`
* **URL:** `/api/v1/crm/hotels/:hotelId`
* **Headers:** `Authorization: Bearer <ADMIN_ACCESS_TOKEN>`
* **Description:** Retrieves full profile of a single hotel partner.

---

### H. Update Partner Hotel / Deactivate: `PATCH /api/v1/crm/hotels/:id`
Use this to update hotel contact info, amenities, or toggle `isActive: false` (which instantly pauses sales on all packages containing this hotel).

* **Method:** `PATCH`
* **URL:** `/api/v1/crm/hotels/:hotelId`
* **Headers:** `Authorization: Bearer <ADMIN_ACCESS_TOKEN>`
* **Payload (send only updated fields):**
```json
{
  "contactPerson": "Layla Al-Maktoum",
  "contactPhone": "+97143018888",
  "isActive": false
}
```

---

### I. Create a Hotelier Staff User: `POST /api/v1/crm/users`
Creates a dedicated login account for staff at that hotel so they can access their hotelier portal.

* **Method:** `POST`
* **URL:** `/api/v1/crm/users`
* **Headers:** `Authorization: Bearer <ADMIN_ACCESS_TOKEN>`

#### Request Payload:
```json
{
  "firstName": "Sarah",
  "lastName": "Jenkins",
  "email": "hotelier.atlantis@example.com",
  "phone": "+971501112233",
  "password": "HotelierPassword123!",
  "role": "hotelier",
  "hotelId": "6aaa35d9d1cad56b320149b5"
}
```
*(Note: `hotelId` is strictly required whenever `role === "hotelier"`)*.

---

### E. Admin Review Queue: Pending Hotelier Submissions

#### 1. List Submissions: `GET /api/v1/crm/hotel-stock/pending`
* **Method:** `GET`
* **URL:** `/api/v1/crm/hotel-stock/pending`
* **Headers:** `Authorization: Bearer <ADMIN_ACCESS_TOKEN>`
* **Query Params (Optional):** `?page=1&limit=20`
* **Description:** Returns all room stock batches submitted or modified by hoteliers that are currently in `pending_review` status.

##### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Pending hotel stock retrieved",
  "data": [
    {
      "_id": "6aaa373563e175718f9bb13e",
      "hotelId": {
        "_id": "6aa7a264deb5e62eec46e8f8",
        "name": "Grand Hyatt Dubai",
        "destination": "Dubai",
        "address": "Riyadh Street, Sheikh Rashid Rd, Dubai, UAE",
        "isActive": true
      },
      "hotelName": "Grand Hyatt Dubai",
      "destination": "Dubai",
      "roomType": "Creek View Deluxe Room",
      "checkIn": "2026-12-01T00:00:00.000Z",
      "checkOut": "2026-12-06T00:00:00.000Z",
      "pricePerNight": 3200,
      "meals": ["breakfast"],
      "reservationRef": "HYATT-DEC-CRK",
      "nameAdditionDeadline": "2026-11-25T00:00:00.000Z",
      "reviewStatus": "pending_review",
      "totalUnits": 6,
      "availableUnits": 6,
      "createdAt": "2026-09-18T05:17:25.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

#### 2. Approve or Reject: `PATCH /api/v1/crm/hotel-stock/:id/review`
* **Method:** `PATCH`
* **URL:** `/api/v1/crm/hotel-stock/:stockId/review` *(e.g. `/api/v1/crm/hotel-stock/6aaa373563e175718f9bb13e/review`)*
* **Headers:**  
  * `Authorization: Bearer <ADMIN_ACCESS_TOKEN>`  
  * `Content-Type: application/json`

##### To Approve Payload:
```json
{
  "decision": "approved",
  "reviewNotes": "Rates and dates verified with hotel partner."
}
```

##### To Reject Payload:
```json
{
  "decision": "rejected",
  "reviewNotes": "Rate is too high. Please revise to ₹2,800 or adjust check-in date."
}
```

##### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Stock batch approved",
  "data": {
    "_id": "6aaa373563e175718f9bb13e",
    "hotelId": "6aa7a264deb5e62eec46e8f8",
    "hotelName": "Grand Hyatt Dubai",
    "roomType": "Creek View Deluxe Room",
    "reviewStatus": "approved",
    "reviewedBy": "6aacc0352df766456873afa1",
    "reviewNotes": "Rates and dates verified with hotel partner.",
    "totalUnits": 6,
    "availableUnits": 6
  }
}
```

---

#### 3. View Approved Stock Catalog: `GET /api/v1/crm/hotel-stock/approved`
* **Method:** `GET`
* **URL:** `/api/v1/crm/hotel-stock/approved`
* **Headers:** `Authorization: Bearer <ADMIN_ACCESS_TOKEN>`
* **Description:** Returns all approved batches ready to be packaged into Holiday Packages or Flash Offers.

---

## 4. Endpoints & Payloads for Hotelier Partner Portal

Hoteliers log in at the normal auth endpoint but only see and manage stock for their hotel.

### A. Hotelier Login: `POST /api/v1/auth/login`
* **URL:** `/api/v1/auth/login`
* **Payload:**
```json
{
  "email": "hotelier1@gmail.com",
  "password": "Hotelier1234!"
}
```
#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "user": {
      "id": "6aaa35dad1cad56b320149ff",
      "email": "hotelier1@gmail.com",
      "firstName": "Sarah",
      "lastName": "Jenkins",
      "role": "hotelier",
      "hotelId": "6aaa35d9d1cad56b320149b5",
      "hotelName": "Atlantis The Royal"
    }
  }
}
```

---

### B. Hotelier Views Inventory: `GET /api/v1/hotelier/stock`
Returns all batches belonging to this hotelier's hotel (both admin-created and self-submitted).

* **Method:** `GET`
* **URL:** `/api/v1/hotelier/stock`
* **Headers:** `Authorization: Bearer <HOTELIER_ACCESS_TOKEN>`

#### Response Sample (`200 OK`):
```json
{
  "success": true,
  "message": "Stock batches retrieved successfully",
  "data": [
    {
      "_id": "6aaa373563e175718f9bb12c",
      "hotelId": "6aaa35d9d1cad56b320149b5",
      "hotelName": "Atlantis The Royal",
      "destination": "Dubai",
      "roomType": "Royal Sky Suite",
      "checkIn": "2026-11-10T00:00:00.000Z",
      "checkOut": "2026-11-15T00:00:00.000Z",
      "pricePerNight": 5500,
      "meals": ["breakfast", "dinner"],
      "reservationRef": "ATL-ROYAL-BLK-01",
      "reviewStatus": "approved",
      "totalUnits": 10,
      "availableUnits": 9,
      "units": [
        { "_id": "6aaa373563e175718f9bb12d", "status": "blocked" },
        { "_id": "6aaa373563e175718f9bb12e", "status": "available" },
        { "_id": "6aaa373563e175718f9bb12f", "status": "unavailable" }
      ]
    }
  ]
}
```
> **Privacy Note:** When a room is booked on the storefront, its status appears as `"unavailable"`. Guest PII, booking IDs, and passenger lists are masked from the hotelier.

---

### C. Hotelier Submits Room Block: `POST /api/v1/hotelier/stock`
Hoteliers can allocate wholesale inventory directly. Newly created batches default to `reviewStatus: "pending_review"`.

* **Method:** `POST`
* **URL:** `/api/v1/hotelier/stock`
* **Headers:** `Authorization: Bearer <HOTELIER_ACCESS_TOKEN>`

#### Request Payload:
```json
{
  "roomType": "Palm Terrace Double",
  "checkIn": "2026-12-01T00:00:00.000Z",
  "checkOut": "2026-12-06T00:00:00.000Z",
  "pricePerNight": 4200,
  "meals": ["breakfast"],
  "reservationRef": "HOTELIER-DEC-PALM",
  "nameAdditionDeadline": "2026-11-25T00:00:00.000Z",
  "unitCount": 6
}
```

---

### D. Hotelier Room Hold / Maintenance Toggle: `PATCH /api/v1/hotelier/stock/:id/units/:unitId`
If the hotel needs to hold an unbooked room for maintenance or walk-ins:

* **Method:** `PATCH`
* **URL:** `/api/v1/hotelier/stock/:stockId/units/:unitId`
* **Headers:** `Authorization: Bearer <HOTELIER_ACCESS_TOKEN>`
* **Payload:**
```json
{
  "status": "blocked"
}
```
*(To release the hold, send `"status": "available"`. Hoteliers **cannot** set status to `assigned` or `used`)*.

---

### E. Edit Batch / Resubmit After Rejection: `PATCH /api/v1/hotelier/stock/:id`
Use this endpoint when a hotelier needs to update rates/dates, or when an admin has **rejected** a batch and the hotelier fixes the requested change (e.g. rate correction, date typo).

* **Method:** `PATCH`
* **URL:** `/api/v1/hotelier/stock/:stockId`
* **Headers:** `Authorization: Bearer <HOTELIER_ACCESS_TOKEN>`
* **Payload (send only fields to update):**
```json
{
  "pricePerNight": 3900,
  "meals": ["breakfast", "dinner"],
  "reservationRef": "ATL-UPDATED-REF"
}
```
* **Effect on Approval:** Editing any batch resets `reviewStatus` back to `"pending_review"` and sends it back to the Admin CRM queue for re-approval.

> 🛡️ **Active Booking Protection (Guard 1 Enforcement):**  
> If any room in the batch is **already booked by a customer** (`assigned` or `used`), hoteliers are **strictly blocked** from changing critical fields (`checkIn`, `checkOut`, `roomType`, `destination`).  
> Attempting to do so returns:
> ```json
> {
>   "success": false,
>   "message": "Cannot modify dates, destination, or room type on a stock batch with active customer bookings. Please contact agency admin."
> }
> ```
> Frontend UI should disable editing check-in/out dates if `units.some(u => u.status === 'unavailable')`.

---

### F. Add More Units to Existing Batch: `POST /api/v1/hotelier/stock/:id/units`
* **Method:** `POST`
* **URL:** `/api/v1/hotelier/stock/:stockId/units`
* **Payload:**
```json
{
  "count": 5
}
```
*(Adds 5 new rooms and sets batch back to `"pending_review"` for admin to approve the added allocation)*.

---

## 5. Error Responses Reference for Frontend UI Handling

The backend returns standardized error formats. The frontend should handle these status codes in axios interceptors or toast alerts:

### A. Validation Errors (`400 Bad Request`)
When input fields fail validation (e.g. invalid date, missing required field, `checkOut` before `checkIn`):
```json
{
  "status": "fail",
  "errors": [
    {
      "field": "roomType",
      "message": "roomType is required"
    },
    {
      "field": "hotelId",
      "message": "hotelId is required and must be a valid MongoId"
    }
  ]
}
```

### B. Business Logic Error (`400 Bad Request`)
When attempting an illegal state change (e.g. modifying dates on a batch with active customer bookings):
```json
{
  "success": false,
  "message": "Cannot modify dates, destination, or room type on a stock batch with active customer bookings. Please contact agency admin."
}
```

### C. Authentication Error (`401 Unauthorized`)
When token is expired, missing, or invalid:
```json
{
  "success": false,
  "message": "Authentication token missing or expired"
}
```

### D. Permission Error (`403 Forbidden`)
When a hotelier attempts to access another hotel's stock or call an admin-only route:
```json
{
  "success": false,
  "message": "Access denied: insufficient permissions"
}
```

### E. Not Found Error (`404 Not Found`)
When an ID does not exist:
```json
{
  "success": false,
  "message": "Stock batch not found or permission denied"
}
```

### F. Conflict Error (`409 Conflict`)
When creating a user with a duplicate email or phone number:
```json
{
  "success": false,
  "message": "Email already registered"
}
```

---

## 6. Complete API Cheat Sheet for Frontend Developers

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ADMIN CRM ACTIONS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1.  GET    /api/v1/crm/hotels                   -> Fill Hotel Dropdown      │
│ 2.  POST   /api/v1/crm/hotels                   -> Add New Partner Hotel    │
│ 3.  GET    /api/v1/crm/hotels/:id               -> View Hotel Profile       │
│ 4.  PATCH  /api/v1/crm/hotels/:id               -> Edit Hotel / Deactivate  │
│ 5.  POST   /api/v1/crm/users                    -> Add Hotelier User (hotelId)
│ 6.  POST   /api/v1/crm/stocks/hotels            -> Create Allotment (hotelId)
│ 7.  GET    /api/v1/crm/stocks/hotels            -> List All Allotments (filters)
│ 8.  GET    /api/v1/crm/stocks/hotels/:id        -> Get Single Allotment     │
│ 9.  GET    /api/v1/crm/stocks/overview          -> Inventory Utilization KPIs
│ 10. GET    /api/v1/crm/hotel-stock/pending      -> View Review Queue        │
│ 11. PATCH  /api/v1/crm/hotel-stock/:id/review   -> Approve/Reject Batch     │
│ 12. GET    /api/v1/crm/hotel-stock/approved     -> List Approved Catalog    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           HOTELIER PORTAL ACTIONS                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1.  POST   /api/v1/auth/login                   -> Login (hotelier1@gmail.com)
│ 2.  GET    /api/v1/hotelier/stock               -> View Inventory & Units   │
│ 3.  POST   /api/v1/hotelier/stock               -> Submit New Room Block    │
│ 4.  PATCH  /api/v1/hotelier/stock/:id           -> Edit / Resubmit Rejected │
│ 5.  POST   /api/v1/hotelier/stock/:id/units     -> Add Extra Room Units     │
│ 6.  PATCH  /api/v1/hotelier/stock/:id/units/:uId-> Toggle Blocked/Available │
└─────────────────────────────────────────────────────────────────────────────┘
```


