# 📄 CMS Module (Content Management System) — API Specification & Payload Reference

> **Module Base Path:** `/api/v1/cms`  
> **Target Audience:** Frontend Developers, Mobile App Engineers, QA & Integration Engineers, Backend Maintainers  
> **Specification Version:** 1.0.0  
> **Source Code Location:** [`modules/cms/`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/cms)  
> **OpenAPI / Swagger Tag:** `CMS` (Interactive playground at `http://localhost:5000/api/docs`)

---

## 1. Executive Summary & Architecture

The **CMS (Content Management System) Module** provides public and administrative content delivery for the Maqam Travels platform. It manages:
- **Static Pages:** Legally required and informational pages (Terms of Service, Privacy Policy, About Us, Refund Policy).
- **Frequently Asked Questions (FAQs):** Categorized and ordered questions and answers for travellers.
- **Blog & Travel Articles:** Rich travel guides, religious history, and Umrah tips.
- **Frontend Hero Banners:** Dynamic homepage header banners with automated Cloudinary media asset lifecycle management.

### Architectural Highlights
1. **Polymorphic Content Model:** All static entities (`page`, `faq`, `blog`, `hero`) share the unified [`CMSPage`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/cms/cms.model.js) MongoDB schema.
2. **Cloudinary Asset Lifecycle Management:** Uploading a new hero image streams the file buffer directly to Cloudinary. Replaced or deleted images are **automatically purged** from Cloudinary storage via `publicId` deletion to prevent orphaned cloud storage.
3. **Public Read / Admin Write Security Model:** All read operations (`GET`) are public with zero authentication overhead. All write operations (`POST`, `PUT`, `DELETE`) require Bearer JWT authentication with `admin` or `super_admin` role.
4. **Standard API Envelopes:** All responses strictly follow the centralized `SuccessEnvelope` (`{ success: true, message: "...", data: ... }`).

---

## 2. Data Model Schema (`CMSPage`)

**Model File:** [`modules/cms/cms.model.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/cms/cms.model.js)  
**MongoDB Collection:** `cmspages`

```typescript
export type CMSContentType = 'page' | 'faq' | 'blog' | 'hero';

export interface CMSPageDocument {
  _id: string;
  type: CMSContentType;              // Enum: 'page', 'faq', 'blog', 'hero'
  title: string;                     // Title or headline
  slug: string;                      // Unique lowercase URL-safe slug
  content?: string;                  // Main body HTML/Markdown (pages, blogs)
  
  // Hero Banner Specific
  imageUrl?: string;                 // Fully qualified Cloudinary or CDN image URL
  publicId?: string;                 // Cloudinary asset ID for automated cleanup
  subTitle?: string;                 // Subtitle or tagline

  // FAQ Specific
  answer?: string;                   // Answer text for FAQ
  category?: string;                 // Category filter (e.g. 'visa', 'booking', 'general')
  order?: number;                    // Ascending display sort order

  // Blog Specific
  excerpt?: string;                  // Short teaser summary
  author?: string;                   // User ObjectId reference
  tags?: string[];                   // Keyword tags
  coverImage?: string;               // Blog card thumbnail / header image

  // Publication State & Timestamps
  isPublished: boolean;              // Boolean visibility flag (default: false)
  publishedAt?: string;              // ISO 8601 publication timestamp
  createdAt: string;                 // ISO 8601 creation timestamp
  updatedAt: string;                 // ISO 8601 last modified timestamp
}
```

---

## 3. API Endpoints Master Cheat Sheet

| HTTP Method | Route Endpoint | Access / Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/cms/pages/:slug` | **Public** | Retrieve a published static page (Privacy Policy, Terms, etc.) by slug. |
| `GET` | `/api/v1/cms/faqs` | **Public** | Retrieve published FAQs with optional category filter and pagination. |
| `GET` | `/api/v1/cms/blog` | **Public** | List published blog posts with pagination sorted by newest first. |
| `GET` | `/api/v1/cms/blog/:slug` | **Public** | Get complete single published blog post by its unique URL slug. |
| `GET` | `/api/v1/cms/heroPic` | **Public** | Fetch active frontend homepage hero banner, image URL, headline & subtitle. |
| `POST` | `/api/v1/cms/changeHeroPic` | **Admin Only** | Upload/change hero banner picture (`multipart/form-data` file or direct `imageUrl`). |
| `PUT` | `/api/v1/cms/heroPic` | **Admin Only** | Edit hero banner headline, subtitle, publish status, or replace image. |
| `DELETE` | `/api/v1/cms/heroPic` | **Admin Only** | Permanently delete hero banner record and delete asset from Cloudinary. |

---

## 4. Detailed Endpoint Specifications

### 1. Get Static Page by Slug

Retrieve the published content of any static page (e.g., `privacy-policy`, `terms-of-service`, `about-us`, `refund-policy`).

* **Method:** `GET`
* **Path:** `/api/v1/cms/pages/:slug`
* **Auth Required:** No (Public)
* **Controller:** [`cmsController.getPage`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/cms/cms.controller.js#L9-L22)

#### Path Parameters:
| Parameter | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `slug` | `string` | **Yes** | Unique URL identifier of the static page | `privacy-policy` |

#### Request Example:
```http
GET /api/v1/cms/pages/privacy-policy HTTP/1.1
Host: api.maqamtravels.com
Accept: application/json
```

#### Response Body (`200 OK`):
```json
{
  "success": true,
  "message": "Page retrieved",
  "data": {
    "_id": "671e54a32b00000000000010",
    "type": "page",
    "title": "Privacy Policy",
    "slug": "privacy-policy",
    "content": "<h2>1. Information We Collect</h2><p>Maqam Travels collects personal information to process bookings...</p><h2>2. Data Security</h2><p>We implement TLS 1.3 encryption and secure payment tokenization...</p>",
    "isPublished": true,
    "createdAt": "2026-01-15T08:30:00.000Z",
    "updatedAt": "2026-03-20T11:45:00.000Z"
  }
}
```

#### Error Responses:
* `400 Bad Request` — Missing or invalid slug parameter.
  ```json
  {
    "success": false,
    "message": "Page slug is required"
  }
  ```
* `404 Not Found` — Page does not exist or `isPublished: false`.
  ```json
  {
    "success": false,
    "message": "Page not found"
  }
  ```

---

### 2. Get Frequently Asked Questions (FAQs)

Retrieve a paginated list of published FAQs. Supports filtering by travel category.

* **Method:** `GET`
* **Path:** `/api/v1/cms/faqs`
* **Auth Required:** No (Public)
* **Controller:** [`cmsController.getFAQs`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/cms/cms.controller.js#L24-L38)

#### Query Parameters:
| Parameter | Type | Default | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `category` | `string` | — | No | Category filter | `visa`, `packages`, `flights`, `general` |
| `page` | `integer` | `1` | No | Page number for pagination | `1` |
| `limit` | `integer` | `10` | No | Number of records per page | `20` |

#### Request Example:
```http
GET /api/v1/cms/faqs?category=visa&page=1&limit=10 HTTP/1.1
Host: api.maqamtravels.com
Accept: application/json
```

#### Response Body (`200 OK`):
```json
{
  "success": true,
  "message": "FAQs retrieved",
  "data": [
    {
      "_id": "671e54a32b00000000000020",
      "type": "faq",
      "title": "What documents are required for an Umrah Visa?",
      "slug": "what-documents-are-required-for-an-umrah-visa",
      "answer": "You need a passport valid for at least 6 months, a passport-sized photograph with a white background, and confirmed flight reservations.",
      "category": "visa",
      "order": 1,
      "isPublished": true,
      "createdAt": "2026-02-01T10:00:00.000Z",
      "updatedAt": "2026-02-01T10:00:00.000Z"
    },
    {
      "_id": "671e54a32b00000000000021",
      "type": "faq",
      "title": "How long does Saudi Visa processing take?",
      "slug": "how-long-does-saudi-visa-processing-take",
      "answer": "Standard tourist and Umrah e-visas are typically processed and issued within 24 to 72 business hours.",
      "category": "visa",
      "order": 2,
      "isPublished": true,
      "createdAt": "2026-02-01T10:15:00.000Z",
      "updatedAt": "2026-02-01T10:15:00.000Z"
    }
  ],
  "meta": {
    "total": 2,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 3. List Published Blog Posts

Retrieve a paginated list of published travel articles, Umrah advisories, and guides.

* **Method:** `GET`
* **Path:** `/api/v1/cms/blog`
* **Auth Required:** No (Public)
* **Controller:** [`cmsController.listBlogPosts`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/cms/cms.controller.js#L40-L54)

#### Query Parameters:
| Parameter | Type | Default | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `page` | `integer` | `1` | No | Page number for pagination | `1` |
| `limit` | `integer` | `10` | No | Number of blog articles per page | `10` |

#### Request Example:
```http
GET /api/v1/cms/blog?page=1&limit=5 HTTP/1.1
Host: api.maqamtravels.com
Accept: application/json
```

#### Response Body (`200 OK`):
```json
{
  "success": true,
  "message": "Blog posts retrieved",
  "data": [
    {
      "_id": "671e54a32b00000000000030",
      "type": "blog",
      "title": "Top 10 Sacred Sites to Visit in Makkah & Madinah",
      "slug": "top-10-sacred-sites-makkah-madinah",
      "excerpt": "A complete pilgrim guide to visiting Cave Hira, Mount Uhud, Quba Mosque, and the historic battlegrounds.",
      "coverImage": "https://res.cloudinary.com/maqamtravels/image/upload/v1718000000/travel-agency/cms/blog/makkah_sites.jpg",
      "tags": ["umrah", "makkah", "madinah", "travel-guide"],
      "isPublished": true,
      "createdAt": "2026-03-01T12:00:00.000Z",
      "updatedAt": "2026-03-05T09:30:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 5,
    "totalPages": 1
  }
}
```

---

### 4. Get Blog Post by Slug

Retrieve the complete article content, author, tags, and cover image for a single post.

* **Method:** `GET`
* **Path:** `/api/v1/cms/blog/:slug`
* **Auth Required:** No (Public)
* **Controller:** [`cmsController.getBlogPost`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/cms/cms.controller.js#L56-L69)

#### Path Parameters:
| Parameter | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `slug` | `string` | **Yes** | Unique URL slug identifier for the article | `top-10-sacred-sites-makkah-madinah` |

#### Request Example:
```http
GET /api/v1/cms/blog/top-10-sacred-sites-makkah-madinah HTTP/1.1
Host: api.maqamtravels.com
Accept: application/json
```

#### Response Body (`200 OK`):
```json
{
  "success": true,
  "message": "Blog post retrieved",
  "data": {
    "_id": "671e54a32b00000000000030",
    "type": "blog",
    "title": "Top 10 Sacred Sites to Visit in Makkah & Madinah",
    "slug": "top-10-sacred-sites-makkah-madinah",
    "excerpt": "A complete pilgrim guide to visiting Cave Hira, Mount Uhud, Quba Mosque, and the historic battlegrounds.",
    "content": "<article><h2>1. Cave of Hira (Jabal Al-Nour)</h2><p>Located roughly 5 km northeast of the Grand Mosque, this is where the Prophet received his first revelation...</p><h2>2. Mount Uhud</h2><p>A place of immense historical significance in Islamic history...</p></article>",
    "coverImage": "https://res.cloudinary.com/maqamtravels/image/upload/v1718000000/travel-agency/cms/blog/makkah_sites.jpg",
    "tags": ["umrah", "makkah", "madinah", "travel-guide"],
    "isPublished": true,
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-05T09:30:00.000Z"
  }
}
```

#### Error Responses:
* `404 Not Found`:
  ```json
  {
    "success": false,
    "message": "Blog post not found"
  }
  ```

---

### 5. Get Active Frontend Hero Banner Picture

Public endpoint consumed by the homepage hero section to display current banner picture, headline, and subtitle.

* **Method:** `GET`
* **Path:** `/api/v1/cms/heroPic`
* **Auth Required:** No (Public)
* **Controller:** [`cmsController.getHeroPic`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/cms/cms.controller.js#L74-L84)
* **Fixed Database Key:** `{ type: 'hero', slug: 'main-hero-banner' }`

#### Request Example:
```http
GET /api/v1/cms/heroPic HTTP/1.1
Host: api.maqamtravels.com
Accept: application/json
```

#### Response Body (`200 OK`):
```json
{
  "success": true,
  "message": "Hero picture retrieved successfully",
  "data": {
    "_id": "671e54a32b00000000000040",
    "type": "hero",
    "slug": "main-hero-banner",
    "title": "Begin Your Sacred Journey with Maqam Travels",
    "subTitle": "Tailored Umrah & Hajj Packages, Premium Hotels & Seamless Flights",
    "imageUrl": "https://res.cloudinary.com/maqamtravels/image/upload/v1718100000/travel-agency/cms/hero/hero_banner_makkah.webp",
    "publicId": "travel-agency/cms/hero/hero_banner_makkah",
    "isPublished": true,
    "createdAt": "2026-01-10T09:00:00.000Z",
    "updatedAt": "2026-03-12T14:20:00.000Z"
  }
}
```

---

### 6. Change Hero Banner Picture (Admin)

Create or replace the frontend hero banner. Accepts either a binary file upload or a direct image URL.

* **Method:** `POST`
* **Path:** `/api/v1/cms/changeHeroPic`
* **Auth Required:** **Yes** (Bearer JWT: `admin` or `super_admin`)
* **Controller:** [`cmsController.changeHeroPic`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/cms/cms.controller.js#L90-L114)
* **Validator:** [`cmsValidator.validateChangeHeroPic`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/cms/cms.validator.js#L39-L68)
* **Multer Field Name:** `heroPic` (Max 10MB; `jpg`, `jpeg`, `png`, `webp`, `gif`)

#### Supported Content Types:
1. `multipart/form-data` (Binary file upload)
2. `application/json` (Direct image URL)

#### Request Fields:
| Field Name | Type | Required | Description | Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `heroPic` | `File (Binary)` | One of `heroPic` or `imageUrl` is **required** | Image file uploaded as multipart form data. | Max 10MB. Stored in Cloudinary folder `travel-agency/cms/hero`. |
| `imageUrl` | `string` | One of `heroPic` or `imageUrl` is **required** | Fully qualified URL to an existing image. | Must be valid URL format. |
| `title` | `string` | Optional | Hero banner headline text. | Max 200 characters. |
| `subTitle` | `string` | Optional | Hero banner sub-headline / descriptive tagline. | Max 500 characters. |

#### Request Example (A: `multipart/form-data` with Binary Image File):
```http
POST /api/v1/cms/changeHeroPic HTTP/1.1
Host: api.maqamtravels.com
Authorization: Bearer <ADMIN_JWT_TOKEN>
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="heroPic"; filename="kaaba_sunrise.webp"
Content-Type: image/webp

(binary image data...)
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="title"

Begin Your Sacred Journey
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="subTitle"

Verified 5-Star Umrah Packages & Seamless Visa Processing
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

#### Request Example (B: `application/json` with Direct URL):
```http
POST /api/v1/cms/changeHeroPic HTTP/1.1
Host: api.maqamtravels.com
Authorization: Bearer <ADMIN_JWT_TOKEN>
Content-Type: application/json

{
  "imageUrl": "https://res.cloudinary.com/maqamtravels/image/upload/v1718100000/travel-agency/cms/hero/kaaba_sunrise.webp",
  "title": "Begin Your Sacred Journey",
  "subTitle": "Verified 5-Star Umrah Packages & Seamless Visa Processing"
}
```

#### Response Body (`200 OK`):
```json
{
  "success": true,
  "message": "Hero banner picture updated successfully",
  "data": {
    "_id": "671e54a32b00000000000040",
    "type": "hero",
    "slug": "main-hero-banner",
    "title": "Begin Your Sacred Journey",
    "subTitle": "Verified 5-Star Umrah Packages & Seamless Visa Processing",
    "content": "",
    "imageUrl": "https://res.cloudinary.com/maqamtravels/image/upload/v1718100000/travel-agency/cms/hero/kaaba_sunrise.webp",
    "publicId": "travel-agency/cms/hero/kaaba_sunrise",
    "isPublished": true,
    "updatedBy": "671a98b76e123456789abcde",
    "createdAt": "2026-01-10T09:00:00.000Z",
    "updatedAt": "2026-03-23T12:00:00.000Z"
  }
}
```

#### Error Responses:
* `400 Bad Request` — Missing both `heroPic` file and `imageUrl`:
  ```json
  {
    "success": false,
    "message": "Please provide an image file (heroPic) or an imageUrl"
  }
  ```
* `401 Unauthorized` — Missing or invalid token.
* `403 Forbidden` — Calling user does not possess `admin` or `super_admin` role.

---

### 7. Edit Hero Banner Properties (Admin)

Modify specific hero banner metadata (headline, subtitle, publication status) or swap the current image.

* **Method:** `PUT`
* **Path:** `/api/v1/cms/heroPic`
* **Auth Required:** **Yes** (Bearer JWT: `admin` or `super_admin`)
* **Controller:** [`cmsController.editHeroPic`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/cms/cms.controller.js#L116-L136)
* **Service:** [`cmsService.editHeroPicture`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/cms/cms.service.js#L153-L217)
* **Multer Field Name:** `heroPic` (Optional binary file)

#### Request Fields:
| Field Name | Type | Required | Description | Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `heroPic` | `File (Binary)` | No | Replacement image file. | Max 10MB. Cleans up previous Cloudinary asset. |
| `imageUrl` | `string` | No | Replacement image URL. | Valid URL string. |
| `title` | `string` | No | Updated headline. | Max 200 characters. |
| `subTitle` | `string` | No | Updated sub-headline / tagline. | Max 500 characters. |
| `isPublished` | `boolean` | No | Toggle banner visibility on the frontend. | `true` or `false`. |

#### Request Example (`application/json`):
```http
PUT /api/v1/cms/heroPic HTTP/1.1
Host: api.maqamtravels.com
Authorization: Bearer <ADMIN_JWT_TOKEN>
Content-Type: application/json

{
  "title": "Exclusive Ramadan 2026 Umrah Packages",
  "subTitle": "Book early to guarantee 5-star clock tower accommodation and non-stop flights",
  "isPublished": true
}
```

#### Response Body (`200 OK`):
```json
{
  "success": true,
  "message": "Hero banner updated successfully",
  "data": {
    "_id": "671e54a32b00000000000040",
    "type": "hero",
    "slug": "main-hero-banner",
    "title": "Exclusive Ramadan 2026 Umrah Packages",
    "subTitle": "Book early to guarantee 5-star clock tower accommodation and non-stop flights",
    "imageUrl": "https://res.cloudinary.com/maqamtravels/image/upload/v1718100000/travel-agency/cms/hero/kaaba_sunrise.webp",
    "publicId": "travel-agency/cms/hero/kaaba_sunrise",
    "isPublished": true,
    "updatedAt": "2026-03-23T12:30:00.000Z"
  }
}
```

#### Error Responses:
* `404 Not Found` — Hero banner document has not been initialized yet:
  ```json
  {
    "success": false,
    "message": "Hero banner not found. Please create one first"
  }
  ```

---

### 8. Delete Hero Banner & Clean Storage (Admin)

Permanently removes the hero banner document from the database and deletes the corresponding image asset from Cloudinary via its `publicId`.

* **Method:** `DELETE`
* **Path:** `/api/v1/cms/heroPic`
* **Auth Required:** **Yes** (Bearer JWT: `admin` or `super_admin`)
* **Controller:** [`cmsController.deleteHeroPic`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/cms/cms.controller.js#L138-L150)
* **Service:** [`cmsService.deleteHeroPicture`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/cms/cms.service.js#L219-L249)

#### Request Example:
```http
DELETE /api/v1/cms/heroPic HTTP/1.1
Host: api.maqamtravels.com
Authorization: Bearer <ADMIN_JWT_TOKEN>
Accept: application/json
```

#### Response Body (`200 OK`):
```json
{
  "success": true,
  "message": "Hero banner and image deleted successfully",
  "data": {
    "deleted": true,
    "herorId": "671e54a32b00000000000040"
  }
}
```

#### Error Responses:
* `404 Not Found` — Banner does not exist:
  ```json
  {
    "success": false,
    "message": "Hero banner not found"
  }
  ```

---

## 5. Testing & Verification Guide (cURL Reference)

You can copy and run these cURL commands directly in your terminal to verify CMS endpoints:

### 1. Fetch Static Page
```bash
curl -X GET "http://localhost:5000/api/v1/cms/pages/privacy-policy" \
  -H "Accept: application/json"
```

### 2. Fetch FAQs with Filter
```bash
curl -X GET "http://localhost:5000/api/v1/cms/faqs?category=visa&page=1&limit=10" \
  -H "Accept: application/json"
```

### 3. Fetch Blog Articles
```bash
curl -X GET "http://localhost:5000/api/v1/cms/blog?page=1&limit=5" \
  -H "Accept: application/json"
```

### 4. Fetch Hero Banner
```bash
curl -X GET "http://localhost:5000/api/v1/cms/heroPic" \
  -H "Accept: application/json"
```

### 5. Upload New Hero Picture (Multipart Form Binary)
```bash
curl -X POST "http://localhost:5000/api/v1/cms/changeHeroPic" \
  -H "Authorization: Bearer <YOUR_ADMIN_JWT>" \
  -F "heroPic=@/path/to/banner.jpg" \
  -F "title=Explore The Holy Lands" \
  -F "subTitle=Best Umrah and Hajj Packages 2026"
```

### 6. Update Hero Picture with Direct URL
```bash
curl -X POST "http://localhost:5000/api/v1/cms/changeHeroPic" \
  -H "Authorization: Bearer <YOUR_ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa",
    "title": "Sacred Journeys",
    "subTitle": "Curated Pilgrimage Packages"
  }'
```

### 7. Edit Hero Metadata
```bash
curl -X PUT "http://localhost:5000/api/v1/cms/heroPic" \
  -H "Authorization: Bearer <YOUR_ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Exclusive Ramadan 2026 Umrah Packages",
    "isPublished": true
  }'
```

### 8. Delete Hero Banner
```bash
curl -X DELETE "http://localhost:5000/api/v1/cms/heroPic" \
  -H "Authorization: Bearer <YOUR_ADMIN_JWT>"
```

---

## 6. Frontend Integration & Caching Recommendations

1. **Incremental Static Regeneration (Next.js / ISR):**  
   For pages like `/privacy-policy`, `/terms-of-service`, and `/faqs`, use ISR with `revalidate: 3600` (1 hour) or on-demand revalidation webhooks when content is edited.
2. **Hero Banner Preloading:**  
   The image returned in `GET /api/v1/cms/heroPic` (`data.imageUrl`) should be rendered with `priority` / `fetchpriority="high"` on the homepage to optimize Largest Contentful Paint (LCP).
3. **Graceful Fallbacks:**  
   If `GET /api/v1/cms/heroPic` returns `404` or `data` is null (e.g. fresh environment before initial admin upload), the frontend should fall back to a curated local stock banner asset.
