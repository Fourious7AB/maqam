# Tour Guide (Instructor) Module - API Documentation

> **Base Route URL**: `{{BASE_URL}}/api/v1/instructor`  
> **Default Local Server**: `http://localhost:5000/api/v1/instructor`  
> **Module Source Files**:
> - Routes: [`guide.routes.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/guide/guide.routes.js)
> - Controller: [`guide.controller.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/guide/guide.controller.js)
> - Validator: [`guide.validator.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/guide/guide.validator.js)
> - Service: [`guide.service.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/guide/guide.service.js)
> - Model: [`guide.model.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/guide/guide.model.js)

---

## 📌 Table of Contents

1. [Architecture & Overview](#-architecture--overview)
2. [Authentication & Authorization](#-authentication--authorization)
3. [Summary of Endpoints](#-summary-of-endpoints)
4. [User-Facing API Endpoints](#-user-facing-api-endpoints)
   - [1. List Guide Categories (`GET /categories`)](#1-list-guide-categories)
   - [2. List & Filter Published Guides (`GET /`)](#2-list--filter-published-guides)
   - [3. Get Guide Public Profile (`GET /:id`)](#3-get-guide-public-profile)
   - [4. Get Available Dates & Slots (`GET /:id/slots`)](#4-get-available-dates--slots)
   - [5. Get Guide Reviews & Ratings (`GET /:id/reviews`)](#5-get-guide-reviews--ratings)
   - [6. Submit Guide Review (`POST /:id/reviews`)](#6-submit-guide-review)
5. [Admin-Facing API Endpoints](#-admin-facing-api-endpoints)
   - [7. Create New Guide Profile (`POST /guide`)](#7-create-new-guide-profile)
   - [8. List All Guides (Admin View) (`GET /guides`)](#8-list-all-guides-admin-view)
   - [9. Get Guide Dossier & Stats (`GET /admin/:id`)](#9-get-guide-dossier--stats)
   - [10. Update Guide Profile & Status (`PATCH /admin/:id`)](#10-update-guide-profile--status)
   - [11. Delete / Archive Guide (`DELETE /admin/:id`)](#11-delete--archive-guide)
   - [12. Configure / Bulk-Update Slots (`PUT /admin/:id/slots`)](#12-configure--bulk-update-slots)
6. [Data Schemas & Enums](#-data-schemas--enums)
7. [Standard Response & Error Codes](#-standard-response--error-codes)

---

## 🏗 Architecture & Overview

The Tour Guide (Instructor) module manages certified local guides (Umrah rituals, historical Ziyarat tours, heritage walks, etc.) for travelers. It provides:
- **Public marketplace access**: Browsing categories, filtering by destination/language/category, viewing guide dossiers, checking live calendar slot availability, and reading reviews.
- **Customer interactions**: Authenticated pilgrims submitting verified feedback & star ratings.
- **Administrative control**: Guide profile onboarding, KYC document management, hourly/full-day rate management, shift scheduling / slot bulk upserts, and lifecycle state management (`active`, `inactive`, `suspended`).

---

## 🔐 Authentication & Authorization

| Role | Access Level | Header Required |
|---|---|---|
| **Public / Guest** | Read categories, guides, slots, reviews | None |
| **Authenticated User** | Submit review | `Authorization: Bearer <USER_JWT_TOKEN>` |
| **Admin / Super Admin** | Create, update, soft-delete guides, bulk-upsert slots, view internal dossiers & stats | `Authorization: Bearer <ADMIN_JWT_TOKEN>` |

---

## 📊 Summary of Endpoints

| # | Method | Endpoint | Access | Summary |
|---|---|---|---|---|
| 1 | `GET` | `/api/v1/instructor/categories` | Public | List guide categories with count of active & total guides |
| 2 | `GET` | `/api/v1/instructor` | Public | Search and list active guides with pagination |
| 3 | `GET` | `/api/v1/instructor/:id` | Public | Get public profile of an active guide |
| 4 | `GET` | `/api/v1/instructor/:id/slots` | Public | Get bookable slots grouped by date |
| 5 | `GET` | `/api/v1/instructor/:id/reviews` | Public | Get guide reviews, average rating & stars breakdown |
| 6 | `POST` | `/api/v1/instructor/:id/reviews` | User | Submit rating (1-5) and feedback comment |
| 7 | `POST` | `/api/v1/instructor/guide` | Admin | Create and onboard a new guide profile |
| 8 | `GET` | `/api/v1/instructor/guides` | Admin | List all guides across all statuses with search |
| 9 | `GET` | `/api/v1/instructor/admin/:id` | Admin | Get full admin dossier with KYC and booking stats |
| 10 | `PATCH` | `/api/v1/instructor/admin/:id` | Admin | Update guide profile details, rates, and status |
| 11 | `DELETE` | `/api/v1/instructor/admin/:id` | Admin | Soft-delete/archive a guide and free slots |
| 12 | `PUT` | `/api/v1/instructor/admin/:id/slots` | Admin | Bulk-set/upsert available tour time slots |

---

## 👥 User-Facing API Endpoints

### 1. List Guide Categories
Retrieves all unique categories currently registered in the database along with the count of active guides and total guides.

- **Endpoint**: `GET /api/v1/instructor/categories`
- **Auth Required**: No

#### cURL Request
```bash
curl -X GET "http://localhost:5000/api/v1/instructor/categories" \
  -H "Accept: application/json"
```

#### Response Payload (`200 OK`)
```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": [
    {
      "category": "ziyarat-historical",
      "activeGuidesCount": 14,
      "totalGuidesCount": 18
    },
    {
      "category": "umrah-religious",
      "activeGuidesCount": 12,
      "totalGuidesCount": 15
    },
    {
      "category": "city-heritage",
      "activeGuidesCount": 6,
      "totalGuidesCount": 8
    },
    {
      "category": "desert-adventure",
      "activeGuidesCount": 4,
      "totalGuidesCount": 5
    }
  ]
}
```

---

### 2. List & Filter Published Guides
Returns a paginated list of active, non-deleted guides. Can be filtered by destination city, category, and spoken language.

- **Endpoint**: `GET /api/v1/instructor`
- **Auth Required**: No

#### Query Parameters
| Parameter | Type | Required | Default | Description | Example |
|---|---|---|---|---|---|
| `destination` | String | No | - | Filter by guide operating city (case-insensitive) | `Makkah` |
| `category` | String | No | - | Filter by category slug | `umrah-religious` |
| `language` | String | No | - | Filter by language in languages array | `Arabic` |
| `page` | Integer | No | `1` | Page number for pagination | `1` |
| `limit` | Integer | No | `10` | Number of items per page (1 - 100) | `10` |

#### cURL Request
```bash
curl -X GET "http://localhost:5000/api/v1/instructor?destination=Makkah&category=umrah-religious&language=English&page=1&limit=10" \
  -H "Accept: application/json"
```

#### Response Payload (`200 OK`)
```json
{
  "success": true,
  "message": "Guides retrieved successfully",
  "data": [
    {
      "_id": "66dec987b1c4a839f1234567",
      "fullName": "Sheikh Ahmed Al-Mansoor",
      "phone": "+966501234567",
      "email": "ahmed.mansoor@example.com",
      "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
      "gallery": [
        "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a",
        "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa"
      ],
      "city": "Makkah",
      "coverageAreas": ["Haram Area", "Mina", "Arafat", "Muzdalifah"],
      "category": "umrah-religious",
      "languages": ["Arabic", "English", "Urdu"],
      "bio": "Certified Umrah and Historical Ziyarat guide with 8+ years experience guiding pilgrims through rituals and historical landmarks.",
      "yearsOfExperience": 8,
      "hourlyRate": 160,
      "fullDayRate": 950,
      "currency": "SAR",
      "licenseNumber": "KSA-TOUR-88910",
      "certifications": [
        "Saudi Tourism Authority Certified",
        "Ministry of Hajj & Umrah Accredited"
      ],
      "badge": "Licensed Guide",
      "status": "active",
      "rating": 4.95,
      "totalReviews": 48,
      "completedTours": 120,
      "isDeleted": false,
      "createdAt": "2026-08-01T10:00:00.000Z",
      "updatedAt": "2026-09-01T12:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 3. Get Guide Public Profile
Retrieves public details, biography, language proficiencies, ratings, and rates for a specific guide by ID.

- **Endpoint**: `GET /api/v1/instructor/:id`
- **Auth Required**: No

#### Path Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `id` | Mongo ObjectId | Yes | Valid 24-character hexadecimal MongoDB ID of the guide | `66dec987b1c4a839f1234567` |

#### cURL Request
```bash
curl -X GET "http://localhost:5000/api/v1/instructor/66dec987b1c4a839f1234567" \
  -H "Accept: application/json"
```

#### Response Payload (`200 OK`)
```json
{
  "success": true,
  "message": "Guide details retrieved successfully",
  "data": {
    "guide": {
      "_id": "66dec987b1c4a839f1234567",
      "fullName": "Sheikh Ahmed Al-Mansoor",
      "phone": "+966501234567",
      "email": "ahmed.mansoor@example.com",
      "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
      "gallery": [
        "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a"
      ],
      "city": "Makkah",
      "coverageAreas": ["Haram Area", "Mina", "Jabal al-Noor"],
      "category": "umrah-religious",
      "languages": ["Arabic", "English", "Urdu"],
      "bio": "Certified Umrah and Historical Ziyarat guide with 8+ years experience guiding pilgrims.",
      "yearsOfExperience": 8,
      "hourlyRate": 160,
      "fullDayRate": 950,
      "currency": "SAR",
      "licenseNumber": "KSA-TOUR-88910",
      "certifications": [
        "Saudi Tourism Authority Certified"
      ],
      "badge": "Licensed Guide",
      "status": "active",
      "rating": 4.95,
      "totalReviews": 48,
      "completedTours": 120,
      "isDeleted": false,
      "createdAt": "2026-08-01T10:00:00.000Z",
      "updatedAt": "2026-09-01T12:00:00.000Z"
    }
  }
}
```

#### Error Response (`404 Not Found`)
```json
{
  "success": false,
  "message": "Guide not found or inactive"
}
```

---

### 4. Get Available Dates & Slots
Retrieves bookable, unbooked time slots for a guide within an optional date range or specific date. The slots are automatically grouped by date for easy calendar UI rendering.

- **Endpoint**: `GET /api/v1/instructor/:id/slots`
- **Auth Required**: No

#### Path Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `id` | Mongo ObjectId | Yes | Guide MongoDB ID | `66dec987b1c4a839f1234567` |

#### Query Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `date` | String (YYYY-MM-DD) | No | Exact date lookup | `2026-09-15` |
| `startDate` | String (YYYY-MM-DD) | No | Calendar window start date | `2026-09-10` |
| `endDate` | String (YYYY-MM-DD) | No | Calendar window end date | `2026-09-20` |

> *Note: If no query params are provided, it defaults to all available slots from today onwards.*

#### cURL Request
```bash
curl -X GET "http://localhost:5000/api/v1/instructor/66dec987b1c4a839f1234567/slots?startDate=2026-09-15&endDate=2026-09-16" \
  -H "Accept: application/json"
```

#### Response Payload (`200 OK`)
```json
{
  "success": true,
  "message": "Available slots retrieved successfully",
  "data": {
    "guideId": "66dec987b1c4a839f1234567",
    "calendar": [
      {
        "date": "2026-09-15",
        "slots": [
          {
            "slotId": "66df10a1b1c4a839f7654321",
            "startTime": "08:00",
            "endTime": "12:00",
            "slotType": "Morning Umrah Guidance",
            "price": 160,
            "currency": "SAR",
            "isAvailable": true
          },
          {
            "slotId": "66df10a1b1c4a839f7654322",
            "startTime": "16:00",
            "endTime": "20:00",
            "slotType": "Evening Ziyarat Tour",
            "price": 160,
            "currency": "SAR",
            "isAvailable": true
          }
        ]
      },
      {
        "date": "2026-09-16",
        "slots": [
          {
            "slotId": "66df10a1b1c4a839f7654323",
            "startTime": "09:00",
            "endTime": "13:00",
            "slotType": "Standard Tour",
            "price": 160,
            "currency": "SAR",
            "isAvailable": true
          }
        ]
      }
    ],
    "totalAvailableSlots": 3
  }
}
```

---

### 5. Get Guide Reviews & Ratings
Fetches verified customer reviews with paginated results and comprehensive summary statistics (aggregate star rating, total review count, and a 1-to-5 star rating breakdown).

- **Endpoint**: `GET /api/v1/instructor/:id/reviews`
- **Auth Required**: No

#### Path Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `id` | Mongo ObjectId | Yes | Guide MongoDB ID | `66dec987b1c4a839f1234567` |

#### Query Parameters
| Parameter | Type | Required | Default | Description | Example |
|---|---|---|---|---|---|
| `page` | Integer | No | `1` | Page number | `1` |
| `limit` | Integer | No | `10` | Records per page (1 - 50) | `10` |

#### cURL Request
```bash
curl -X GET "http://localhost:5000/api/v1/instructor/66dec987b1c4a839f1234567/reviews?page=1&limit=10" \
  -H "Accept: application/json"
```

#### Response Payload (`200 OK`)
```json
{
  "success": true,
  "message": "Reviews retrieved successfully",
  "data": {
    "summary": {
      "averageRating": 4.95,
      "totalReviews": 48,
      "starsBreakdown": {
        "1": 0,
        "2": 0,
        "3": 1,
        "4": 5,
        "5": 42
      }
    },
    "reviews": [
      {
        "_id": "66df220ab1c4a839f9876543",
        "guide": "66dec987b1c4a839f1234567",
        "user": {
          "_id": "66d01111b1c4a839faaaaaaa",
          "firstName": "Tariq",
          "lastName": "Mahmood",
          "avatar": "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
        },
        "booking": "66de3333b1c4a839fbbbbbbb",
        "rating": 5,
        "comment": "Sheikh Ahmed was extremely knowledgeable and patient during our Umrah rituals. Highly recommended!",
        "verifiedBooking": true,
        "createdAt": "2026-09-02T14:30:00.000Z",
        "updatedAt": "2026-09-02T14:30:00.000Z"
      }
    ],
    "meta": {
      "total": 48,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

---

### 6. Submit Guide Review
Allows an authenticated user to submit a review and star rating (1–5) for a guide. Upon submission, the guide's overall average rating and review counter are automatically updated in the database.

- **Endpoint**: `POST /api/v1/instructor/:id/reviews`
- **Auth Required**: Yes (User Bearer Token)

#### Path Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `id` | Mongo ObjectId | Yes | Guide MongoDB ID | `66dec987b1c4a839f1234567` |

#### Request Body Parameters
| Field | Type | Required | Description | Validation | Example |
|---|---|---|---|---|---|
| `rating` | Integer | Yes | Star rating | Min: 1, Max: 5 | `5` |
| `comment` | String | Yes | Review message / feedback | 5 - 1000 characters | `"Amazing guidance and very deep historical knowledge."` |
| `bookingId` | Mongo ObjectId | No | Associated completed tour booking | Valid Mongo ID | `"66de3333b1c4a839fbbbbbbb"` |

#### cURL Request
```bash
curl -X POST "http://localhost:5000/api/v1/instructor/66dec987b1c4a839f1234567/reviews" \
  -H "Authorization: Bearer <USER_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "rating": 5,
    "comment": "Sheikh Ahmed explained every historical site in Makkah with authentic references. Truly memorable experience for my family.",
    "bookingId": "66de3333b1c4a839fbbbbbbb"
  }'
```

#### Response Payload (`201 Created`)
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "data": {
    "review": {
      "_id": "66df3456b1c4a839fccccccc",
      "guide": "66dec987b1c4a839f1234567",
      "user": "66d01111b1c4a839faaaaaaa",
      "booking": "66de3333b1c4a839fbbbbbbb",
      "rating": 5,
      "comment": "Sheikh Ahmed explained every historical site in Makkah with authentic references. Truly memorable experience for my family.",
      "verifiedBooking": true,
      "createdAt": "2026-09-08T10:15:30.123Z",
      "updatedAt": "2026-09-08T10:15:30.123Z"
    },
    "newGuideAverage": 4.96
  }
}
```

---

## 🛠 Admin-Facing API Endpoints

### 7. Create New Guide Profile
Onboards a new tour guide into the system. Requires Admin or Super Admin role.

- **Endpoint**: `POST /api/v1/instructor/guide`
- **Auth Required**: Yes (Admin or Super Admin Bearer Token)

#### Request Body Parameters
| Field | Type | Required | Default | Description / Rules |
|---|---|---|---|---|
| `fullName` | String | Yes | - | Full legal/professional name (2 - 100 chars) |
| `phone` | String | Yes | - | Unique phone number with international format (e.g., `+966501234567`) |
| `email` | String | No | `null` | Valid email address |
| `city` | String | Yes | - | Primary operating city (e.g., `Madinah`, `Makkah`, `Jeddah`, `Riyadh`) |
| `category` | String | Yes | - | Category slug (e.g., `ziyarat-historical`, `umrah-religious`, `city-heritage`) |
| `languages` | Array[String] | Yes | - | Array of languages spoken (min 1 language required) |
| `hourlyRate` | Number | Yes | - | Guiding rate per hour (must be >= 0) |
| `fullDayRate` | Number | No | `null` | Optional flat full-day package rate |
| `currency` | String | No | `"SAR"` | Currency ISO code |
| `bio` | String | No | `""` | Detailed background and biography |
| `yearsOfExperience` | Integer | No | `1` | Years of relevant guiding experience |
| `avatar` | String (URL) | No | Default icon | URL to guide avatar picture |
| `gallery` | Array[String] | No | `[]` | Array of image URLs showcasing past tours |
| `coverageAreas` | Array[String] | No | `[]` | Sub-regions or landmarks covered |
| `licenseNumber` | String | No | `null` | Government/Tourism authority license ID |
| `nationalId` | String | No | `null` | National ID / Iqama number (hidden by default) |
| `certifications` | Array[String] | No | `[]` | List of badges, certifications, or diplomas |
| `badge` | String | No | `"Licensed Guide"` | Display badge string |
| `status` | String | No | `"inactive"` | Enum: `active`, `inactive`, `suspended` |

#### cURL Request
```bash
curl -X POST "http://localhost:5000/api/v1/instructor/guide" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "fullName": "Muhammad Ibrahim",
    "phone": "+966509876543",
    "email": "m.ibrahim@maqam.com",
    "city": "Madinah",
    "category": "ziyarat-historical",
    "languages": ["Arabic", "English", "Turkish"],
    "hourlyRate": 150,
    "fullDayRate": 900,
    "currency": "SAR",
    "bio": "Certified Madinah Ziyarat specialist with 10 years experience helping visitors explore Mount Uhud, Masjid Quba, and Seven Mosques.",
    "yearsOfExperience": 10,
    "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
    "gallery": [
      "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a"
    ],
    "coverageAreas": ["Masjid Nabawi", "Mount Uhud", "Masjid Quba", "Qiblatain"],
    "licenseNumber": "KSA-MED-44219",
    "nationalId": "1098765432",
    "certifications": [
      "Madinah Heritage Foundation Guide",
      "STA Licensed Tour Guide"
    ],
    "badge": "Elite Guide",
    "status": "active"
  }'
```

#### Response Payload (`201 Created`)
```json
{
  "success": true,
  "message": "Guide created successfully",
  "data": {
    "guide": {
      "id": "66df4567b1c4a839fddddddd",
      "fullName": "Muhammad Ibrahim",
      "phone": "+966509876543",
      "city": "Madinah",
      "status": "active",
      "hourlyRate": 150,
      "createdAt": "2026-09-08T10:20:00.000Z"
    }
  }
}
```

#### Error Response (`409 Conflict` - Phone Exists)
```json
{
  "success": false,
  "message": "Guide with this phone number already exists"
}
```

---

### 8. List All Guides (Admin View)
Returns all guides across all lifecycle statuses (`active`, `inactive`, `suspended`) with administrative search filters and pagination.

- **Endpoint**: `GET /api/v1/instructor/guides`
- **Auth Required**: Yes (Admin or Super Admin Bearer Token)

#### Query Parameters
| Parameter | Type | Required | Default | Description | Example |
|---|---|---|---|---|---|
| `status` | String | No | - | Filter by status (`active`, `inactive`, `suspended`) | `active` |
| `city` | String | No | - | Filter by city name (regex match) | `Madinah` |
| `category` | String | No | - | Filter by category slug | `ziyarat-historical` |
| `search` | String | No | - | Keyword search on `fullName`, `phone`, `licenseNumber`, or `city` | `Ibrahim` |
| `page` | Integer | No | `1` | Page number | `1` |
| `limit` | Integer | No | `20` | Records per page (1 - 100) | `20` |

#### cURL Request
```bash
curl -X GET "http://localhost:5000/api/v1/instructor/guides?status=active&search=Ibrahim&page=1&limit=20" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Accept: application/json"
```

#### Response Payload (`200 OK`)
```json
{
  "success": true,
  "message": "Admin guides list retrieved successfully",
  "data": [
    {
      "_id": "66df4567b1c4a839fddddddd",
      "fullName": "Muhammad Ibrahim",
      "phone": "+966509876543",
      "email": "m.ibrahim@maqam.com",
      "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
      "gallery": [
        "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a"
      ],
      "city": "Madinah",
      "coverageAreas": ["Masjid Nabawi", "Mount Uhud", "Masjid Quba"],
      "category": "ziyarat-historical",
      "languages": ["Arabic", "English", "Turkish"],
      "bio": "Certified Madinah Ziyarat specialist with 10 years experience...",
      "yearsOfExperience": 10,
      "hourlyRate": 150,
      "fullDayRate": 900,
      "currency": "SAR",
      "licenseNumber": "KSA-MED-44219",
      "certifications": ["STA Licensed Tour Guide"],
      "badge": "Elite Guide",
      "status": "active",
      "rating": 5,
      "totalReviews": 0,
      "completedTours": 0,
      "isDeleted": false,
      "createdBy": "66d00000b1c4a839f0000000",
      "createdAt": "2026-09-08T10:20:00.000Z",
      "updatedAt": "2026-09-08T10:20:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 9. Get Guide Dossier & Stats
Retrieves an internal administrative dossier for a specific guide, including sensitive identity information (`nationalId`), operational statistics (total slots configured, booked slots, completed tours), and financial aggregates.

- **Endpoint**: `GET /api/v1/instructor/admin/:id`
- **Auth Required**: Yes (Admin or Super Admin Bearer Token)

#### Path Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `id` | Mongo ObjectId | Yes | Guide MongoDB ID | `66df4567b1c4a839fddddddd` |

#### cURL Request
```bash
curl -X GET "http://localhost:5000/api/v1/instructor/admin/66df4567b1c4a839fddddddd" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Accept: application/json"
```

#### Response Payload (`200 OK`)
```json
{
  "success": true,
  "message": "Admin guide dossier retrieved successfully",
  "data": {
    "guideDetails": {
      "id": "66df4567b1c4a839fddddddd",
      "fullName": "Muhammad Ibrahim",
      "phone": "+966509876543",
      "email": "m.ibrahim@maqam.com",
      "nationalId": "1098765432",
      "status": "active",
      "lifetimeBookings": 0,
      "lifetimeRevenue": 0,
      "createdAt": "2026-09-08T10:20:00.000Z"
    },
    "stats": {
      "totalSlotsConfigured": 14,
      "bookedSlotsCount": 3,
      "completedTours": 0,
      "lifetimeReviews": 0,
      "rating": 5
    }
  }
}
```

---

### 10. Update Guide Profile & Status
Updates guide profile fields, rates, languages, or administrative status (`active`, `inactive`, `suspended`).

- **Endpoint**: `PATCH /api/v1/instructor/admin/:id`
- **Auth Required**: Yes (Admin or Super Admin Bearer Token)

#### Path Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `id` | Mongo ObjectId | Yes | Guide MongoDB ID | `66df4567b1c4a839fddddddd` |

#### Request Body Parameters
| Field | Type | Required | Description / Rules |
|---|---|---|---|
| `fullName` | String | No | Updated full name |
| `phone` | String | No | Updated phone number (checked for uniqueness) |
| `email` | String | No | Valid email format |
| `city` | String | No | City of operation |
| `category` | String | No | Category slug |
| `languages` | Array[String] | No | Updated language list |
| `hourlyRate` | Number | No | Minimum 0 |
| `fullDayRate` | Number | No | Minimum 0 |
| `currency` | String | No | Currency code (e.g., `SAR`) |
| `bio` | String | No | Updated biography |
| `yearsOfExperience`| Integer | No | Years of experience |
| `badge` | String | No | Display badge (e.g. `Master Guide`) |
| `status` | String | No | Lifecycle status (`active`, `inactive`, `suspended`) |
| `avatar` | String | No | Image URL |
| `gallery` | Array[String] | No | Array of image URLs |
| `coverageAreas` | Array[String] | No | Array of area names |
| `licenseNumber` | String | No | Updated license string |
| `certifications` | Array[String] | No | Updated certifications list |
| `adminNotes` | String | No | Internal administrative CRM notes |

#### cURL Request
```bash
curl -X PATCH "http://localhost:5000/api/v1/instructor/admin/66df4567b1c4a839fddddddd" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "hourlyRate": 175,
    "fullDayRate": 1050,
    "badge": "Senior Master Guide",
    "status": "active",
    "adminNotes": "Background check and STA verification completed on 2026-09-08."
  }'
```

#### Response Payload (`200 OK`)
```json
{
  "success": true,
  "message": "Guide profile updated successfully",
  "data": {
    "guide": {
      "_id": "66df4567b1c4a839fddddddd",
      "fullName": "Muhammad Ibrahim",
      "phone": "+966509876543",
      "email": "m.ibrahim@maqam.com",
      "city": "Madinah",
      "category": "ziyarat-historical",
      "languages": ["Arabic", "English", "Turkish"],
      "hourlyRate": 175,
      "fullDayRate": 1050,
      "currency": "SAR",
      "bio": "Certified Madinah Ziyarat specialist with 10 years experience...",
      "badge": "Senior Master Guide",
      "status": "active",
      "nationalId": "1098765432",
      "adminNotes": "Background check and STA verification completed on 2026-09-08.",
      "rating": 5,
      "totalReviews": 0,
      "completedTours": 0,
      "isDeleted": false,
      "updatedAt": "2026-09-08T10:30:00.000Z"
    }
  }
}
```

---

### 11. Delete / Archive Guide
Soft-deletes a guide from the platform, marks the guide status as `suspended`, and deactivates all unbooked future calendar slots to prevent accidental bookings.

- **Endpoint**: `DELETE /api/v1/instructor/admin/:id`
- **Auth Required**: Yes (Admin or Super Admin Bearer Token)

#### Path Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `id` | Mongo ObjectId | Yes | Guide MongoDB ID | `66df4567b1c4a839fddddddd` |

#### cURL Request
```bash
curl -X DELETE "http://localhost:5000/api/v1/instructor/admin/66df4567b1c4a839fddddddd" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Accept: application/json"
```

#### Response Payload (`200 OK`)
```json
{
  "success": true,
  "message": "Guide successfully archived and removed from active operations"
}
```

---

### 12. Configure / Bulk-Update Slots
Bulk configures or upserts bookable shift time windows for a guide. If a slot on the same date and time already exists, it is updated; otherwise, a new slot is inserted.

- **Endpoint**: `PUT /api/v1/instructor/admin/:id/slots`
- **Auth Required**: Yes (Admin or Super Admin Bearer Token)

#### Path Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `id` | Mongo ObjectId | Yes | Guide MongoDB ID | `66df4567b1c4a839fddddddd` |

#### Request Body Parameters
| Field | Type | Required | Description / Rules |
|---|---|---|---|
| `slots` | Array[Object] | Yes | Non-empty array of shift objects to configure |
| `slots[].date` | String (YYYY-MM-DD) | Yes | Shift date |
| `slots[].startTime` | String (HH:mm) | Yes | Start time (e.g., `"08:00"`) |
| `slots[].endTime` | String (HH:mm) | Yes | End time (e.g., `"12:00"`) |
| `slots[].price` | Number | Yes | Price for this specific shift in SAR (>= 0) |
| `slots[].slotType` | String | No | Type of tour (default: `"Standard Tour"`) |
| `slots[].currency` | String | No | Currency code (default: `"SAR"`) |
| `slots[].isAvailable`| Boolean | No | Availability flag (default: `true`) |

#### cURL Request
```bash
curl -X PUT "http://localhost:5000/api/v1/instructor/admin/66df4567b1c4a839fddddddd/slots" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "slots": [
      {
        "date": "2026-09-15",
        "startTime": "08:00",
        "endTime": "12:00",
        "slotType": "Morning Historical Ziyarat",
        "price": 175,
        "currency": "SAR",
        "isAvailable": true
      },
      {
        "date": "2026-09-15",
        "startTime": "16:00",
        "endTime": "20:00",
        "slotType": "Evening Uhud Heritage Tour",
        "price": 175,
        "currency": "SAR",
        "isAvailable": true
      },
      {
        "date": "2026-09-16",
        "startTime": "08:00",
        "endTime": "12:00",
        "slotType": "Morning Historical Ziyarat",
        "price": 175,
        "currency": "SAR",
        "isAvailable": true
      }
    ]
  }'
```

#### Response Payload (`200 OK`)
```json
{
  "success": true,
  "message": "3 slots configured successfully",
  "data": {
    "guideId": "66df4567b1c4a839fddddddd",
    "updatedCount": 3,
    "activeDates": [
      "2026-09-15",
      "2026-09-16"
    ]
  }
}
```

---

## 📦 Data Schemas & Enums

### 1. Guide Status Enum
- `"active"`: Published and bookable by customers on search and profile pages.
- `"inactive"`: Saved in the system but hidden from user search results.
- `"suspended"`: Blocked or archived profile.

### 2. Guide Entity Schema
```typescript
interface Guide {
  _id: string;
  fullName: string;
  phone: string;              // Unique
  email?: string | null;
  avatar: string;             // Image URL
  gallery: string[];          // Array of image URLs
  city: string;               // Operating city (e.g. Makkah, Madinah)
  coverageAreas: string[];
  category: string;           // Slug: 'umrah-religious', 'ziyarat-historical', etc.
  languages: string[];        // e.g. ['Arabic', 'English', 'Urdu']
  bio: string;
  yearsOfExperience: number;
  hourlyRate: number;
  fullDayRate?: number | null;
  currency: string;           // Default: 'SAR'
  licenseNumber?: string | null;
  nationalId?: string | null; // Sensitive, selected only in admin routes
  certifications: string[];
  badge: string;              // Default: 'Licensed Guide'
  status: 'active' | 'inactive' | 'suspended';
  rating: number;             // Default: 5.0 (min 1, max 5)
  totalReviews: number;
  completedTours: number;
  adminNotes?: string | null; // Sensitive, selected only in admin routes
  isDeleted: boolean;         // Default: false
  createdBy?: string | null;  // Admin ObjectId
  createdAt: string;
  updatedAt: string;
}
```

### 3. Guide Slot Entity Schema
```typescript
interface GuideSlot {
  _id: string;
  guide: string;              // Guide ObjectId
  date: string;               // Format: "YYYY-MM-DD"
  startTime: string;          // e.g. "08:00"
  endTime: string;            // e.g. "12:00"
  slotType: string;           // Default: "Standard Tour"
  price: number;
  currency: string;           // Default: "SAR"
  isAvailable: boolean;       // Default: true
  isBooked: boolean;          // Default: false
  bookingId?: string | null;  // Booking ObjectId
  createdAt: string;
  updatedAt: string;
}
```

### 4. Guide Review Entity Schema
```typescript
interface GuideReview {
  _id: string;
  guide: string;              // Guide ObjectId
  user: string | {            // User ObjectId (or populated object)
    _id: string;
    firstName: string;
    lastName: string;
    avatar: string;
  };
  booking?: string | null;    // Booking ObjectId
  rating: number;             // Integer between 1 and 5
  comment: string;            // 5 - 1000 characters
  verifiedBooking: boolean;   // true if bookingId is provided
  createdAt: string;
  updatedAt: string;
}
```

---

## ⚠️ Standard Response & Error Codes

| Status Code | Meaning | Example Scenario | Format |
|---|---|---|---|
| `200 OK` | Request Succeeded | Retrieval, update, deletion of resources | `{ success: true, message: string, data?: any }` |
| `201 Created` | Resource Created | New guide registered or review posted | `{ success: true, message: string, data: any }` |
| `400 Bad Request` | Validation Error | Invalid Mongo ID, missing required fields, invalid date format | `{ success: false, message: string, errors?: any[] }` |
| `401 Unauthorized` | Missing / Invalid Token | Authorization header missing or expired JWT | `{ success: false, message: "Unauthorized" }` |
| `403 Forbidden` | Insufficient Permissions | Regular user accessing `/admin` endpoints | `{ success: false, message: "Forbidden" }` |
| `404 Not Found` | Resource Not Found | Guide ID does not exist or is inactive | `{ success: false, message: "Guide not found or inactive" }` |
| `409 Conflict` | Duplicate Key | Registering guide with phone number already in use | `{ success: false, message: "Guide with this phone number already exists" }` |
| `500 Server Error`| Internal Failure | Unhandled database or server exception | `{ success: false, message: "Something went wrong" }` |
