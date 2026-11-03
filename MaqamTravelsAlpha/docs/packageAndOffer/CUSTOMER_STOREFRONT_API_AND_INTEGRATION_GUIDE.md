# Customer Storefront (User-Facing) API & Integration Guide
## Packages, Dynamic Customizer & Retail Offers

> **Target Audience:** Client-side Frontend Engineers (React, Next.js, Vue, Mobile apps) building the public-facing travel storefront, package details pages, dynamic quote builders, and checkout flows.  
> **Base URL:** `http://localhost:5002/api/v1` (Development) or `https://api.maqamtravels.com/api/v1` (Production)

---

## 1. Overview & Authentication Rules

The storefront endpoints are divided into **Public Browsing** (no credentials required) and **Authenticated Customer Actions** (booking, payment capture, cancellations).

| Domain | Route Prefix | Auth Required? | Purpose |
| :--- | :--- | :---: | :--- |
| **Packages Storefront** | `/api/v1/packages` | ❌ Public (Browse/Detail/Quote)<br/>✅ Bearer JWT (Book/Cancel/Status) | Discovery, deep-dive itinerary, live Option-A dynamic quote recalculation, customized bookings. |
| **Retail Offers** | `/api/v1/offers` | ❌ Public (Browse/Detail)<br/>✅ Bearer JWT (Book/Cancel) | Standalone wholesale flight seats and contracted hotel room nights sold directly to consumers. |

When hitting authenticated endpoints (`/book`, `/cancel`, `/bookings/:id`), include the customer's JWT in the headers:
```http
Authorization: Bearer <customer_jwt_token>
Content-Type: application/json
```

---

## 2. Image Architecture on the Storefront

The backend delivers images hosted on **Cloudinary CDN**. When rendering storefront views, images are structured at **three distinct visual levels**:

```
📦 Package Response
 │
 ├── 1. Top-Level Hero Carousel   ──▶ package.images
 │      High-res destination landscapes, city landmarks, itinerary hero banners.
 │      (Smart Fallback: If no custom banner was uploaded, automatically aggregates offer photos!)
 │
 ├── 2. Itemized Component Cards  ──▶ package.priceBreakdown[].details.images
 │      Photos of the specific hotel room (Deluxe Room, Suite, Pool) or flight cabin.
 │
 └── 3. Upgrade / Swap Drawer     ──▶ package.availableAlternatives.offers[id][].images
        Photos of candidate hotel upgrades or alternative flights with price deltas.
```

---

## 3. Packages Storefront API Reference

### 3.1 Browse & Search Packages
Search and paginate through active, public travel packages.

- **Method:** `GET`
- **Path:** `/api/v1/packages`
- **Auth:** Not required (Public)

#### Query Parameters:
| Param | Type | Default | Description |
| :--- | :--- | :---: | :--- |
| `destination` | string | — | Filter by destination city or country (e.g. `Dubai`, `Switzerland`). |
| `sellPriceMin`| number | — | Filter packages with sellPrice >= min. |
| `sellPriceMax`| number | — | Filter packages with sellPrice <= max. |
| `page` | integer | `1` | Page number. |
| `limit` | integer | `10` | Number of packages per page. |

#### Response (`200 OK`):
```json
{
  "success": true,
  "packages": [
    {
      "_id": "66d4a8e2e944f7b6b199e815",
      "title": "Dubai Golden Sands 5D4N Getaway",
      "description": "All-inclusive Dubai holiday with flights, 4-star luxury stay, and desert safari.",
      "destination": "Dubai",
      "images": [
        "https://res.cloudinary.com/travelagency/image/upload/travel-agency/packages/dubai_hero.jpg",
        "https://res.cloudinary.com/travelagency/image/upload/travel-agency/packages/dubai_marina.jpg"
      ],
      "sellPrice": 36000,
      "bundleDiscountPercentage": 10,
      "availableSlots": 14,
      "inclusions": [
        "Return Flights (DEL-DXB)",
        "4-Star Hotel 4 Nights",
        "Airport Transfers",
        "Desert Safari with BBQ"
      ],
      "validity": {
        "from": "2026-11-01T00:00:00.000Z",
        "to": "2027-03-31T23:59:59.000Z"
      }
    }
  ],
  "meta": {
    "total": 24,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

---

### 3.2 Get Package Details & Swappable Alternatives
Returns full itinerary, itemized component breakdown, and all eligible alternative components for live swapping and room upgrades.

- **Method:** `GET`
- **Path:** `/api/v1/packages/:id`
- **Auth:** Not required (Public)

#### Response (`200 OK`):
```json
{
  "success": true,
  "package": {
    "_id": "66d4a8e2e944f7b6b199e815",
    "title": "Dubai Golden Sands 5D4N Getaway",
    "description": "All-inclusive Dubai holiday with return flights, 4-star hotel stay, and desert safari.",
    "destination": "Dubai",
    "images": [
      "https://res.cloudinary.com/travelagency/image/upload/travel-agency/packages/dubai_hero.jpg"
    ],
    "sellPrice": 36000,
    "bundleDiscountPercentage": 10,
    "availableSlots": 12,
    "inclusions": [
      "Return Flights (DEL-DXB)",
      "4-Star Hotel Stay 4 Nights",
      "Airport Transfers",
      "Desert Safari Dinner"
    ],
    "itinerary": [
      {
        "day": 1,
        "title": "Arrival in Dubai",
        "description": "Airport pickup and private transfer to hotel. Evening Marina Dhow Cruise."
      },
      {
        "day": 2,
        "title": "Modern Dubai & Burj Khalifa",
        "description": "Visit Dubai Mall, Dubai Aquarium, and At The Top Burj Khalifa (124th floor)."
      }
    ],

    /* Itemized Components included by default */
    "priceBreakdown": [
      {
        "id": "66d4a8e2e944f7b6b199e810",
        "refId": "66e01a2b3c4d5e6f7a8b9c01",
        "title": "Return Flights (DEL - DXB)",
        "itemType": "flight",
        "retailPrice": 18000,
        "unitsPerBooking": 1,
        "isOptional": false,
        "isDefaultSelected": true,
        "allowSwap": true,
        "details": {
          "destination": "Dubai",
          "images": [
            "https://res.cloudinary.com/travelagency/image/upload/travel-agency/offers/indigo_cabin.jpg"
          ],
          "flightDetails": {
            "airline": "IndiGo",
            "flightNumber": "6E-1452",
            "origin": "DEL",
            "destination": "DXB",
            "departure": "2026-11-15T08:30:00.000Z",
            "arrival": "2026-11-15T12:00:00.000Z"
          }
        }
      },
      {
        "id": "66d4a8e2e944f7b6b199e820",
        "refId": "66e01a2b3c4d5e6f7a8b9c02",
        "title": "Grand Hyatt Dubai (4 Nights)",
        "itemType": "hotel",
        "retailPrice": 22000,
        "unitsPerBooking": 1,
        "isOptional": true,
        "isDefaultSelected": true,
        "allowSwap": true,
        "details": {
          "destination": "Dubai",
          "images": [
            "https://res.cloudinary.com/travelagency/image/upload/travel-agency/offers/hyatt_room.jpg",
            "https://res.cloudinary.com/travelagency/image/upload/travel-agency/offers/hyatt_pool.jpg"
          ],
          "hotelDetails": {
            "roomType": "Deluxe King Room",
            "checkIn": "2026-11-15T14:00:00.000Z",
            "checkOut": "2026-11-19T11:00:00.000Z"
          }
        }
      }
    ],

    /* Swappable Alternatives (Upgrades / Alternatives) */
    "availableAlternatives": {
      "offers": {
        "66d4a8e2e944f7b6b199e820": [
          {
            "_id": "66d4a8e2e944f7b6b199e899",
            "title": "Burj Al Arab Luxury Suite (Upgrade)",
            "itemType": "hotel",
            "destination": "Dubai",
            "sellPrice": 45000,
            "priceDelta": 23000,
            "images": [
              "https://res.cloudinary.com/travelagency/image/upload/travel-agency/offers/burj_suite.jpg"
            ],
            "hotelDetails": {
              "roomType": "Deluxe Marina Suite"
            }
          }
        ]
      }
    }
  }
}
```

---

### 3.3 Dynamic Live Quote Recalculation (Option A Pricing)
As the customer toggles optional items on/off or picks upgrades from `availableAlternatives`, call this endpoint to get an immediate, transparent price breakdown without reloading the page.

$$\text{Final Price} = \text{Base Sell Price} - \text{Excluded Offer Deductions} + \sum (\text{Swap Deltas})$$

- **Method:** `POST`
- **Path:** `/api/v1/packages/:id/quote`
- **Auth:** Not required (Public)

#### Request Body:
```json
{
  "quantity": 2,
  "excludedOfferIds": [
    "66d4a8e2e944f7b6b199e830"
  ],
  "swappedOffers": [
    {
      "originalOfferId": "66d4a8e2e944f7b6b199e820",
      "replacementOfferId": "66d4a8e2e944f7b6b199e899"
    }
  ]
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "quote": {
    "packageId": "66d4a8e2e944f7b6b199e815",
    "packageTitle": "Dubai Golden Sands 5D4N Getaway",
    "basePackageSellPrice": 36000,
    "bundleDiscountPercentage": 10,
    "deductions": 4000,
    "swapDeltas": 23000,
    "finalSellPrice": 55000,
    "quantity": 2,
    "totalAmount": 110000,
    "activeComponentsCount": 3,
    "items": [
      {
        "id": "66d4a8e2e944f7b6b199e810",
        "title": "Return Flights (DEL - DXB)",
        "itemType": "flight",
        "status": "included",
        "retailPrice": 18000,
        "effectivePrice": 18000
      },
      {
        "id": "66d4a8e2e944f7b6b199e899",
        "title": "Burj Al Arab Luxury Suite (Upgrade)",
        "itemType": "hotel",
        "status": "swapped",
        "retailPrice": 45000,
        "effectivePrice": 45000,
        "swapDelta": 23000,
        "replaces": "66d4a8e2e944f7b6b199e820"
      }
    ]
  }
}
```

---

### 3.4 Book Customized Package
Creates a pending booking, captures customer customizations, snapshots the package and itinerary, and **atomically claims wholesale seats/rooms**.

- **Method:** `POST`
- **Path:** `/api/v1/packages/book`
- **Auth:** ✅ Required (`Bearer <customer_token>`)

#### Request Body:
```json
{
  "packageId": "66d4a8e2e944f7b6b199e815",
  "quantity": 2,
  "excludedOfferIds": [],
  "swappedOffers": [
    {
      "originalOfferId": "66d4a8e2e944f7b6b199e820",
      "replacementOfferId": "66d4a8e2e944f7b6b199e899"
    }
  ],
  "contactDetails": {
    "name": "Rahul Sharma",
    "email": "rahul.sharma@example.com",
    "phone": "+919876543210"
  },
  "travellers": [
    {
      "namePrefix": "Mr",
      "firstName": "Rahul",
      "lastName": "Sharma",
      "type": "adult",
      "passportNumber": "Z1234567"
    },
    {
      "namePrefix": "Mrs",
      "firstName": "Priya",
      "lastName": "Sharma",
      "type": "adult",
      "passportNumber": "Z7654321"
    }
  ]
}
```

#### Response (`201 Created`):
```json
{
  "success": true,
  "message": "Package booking initiated. Complete payment within 30 minutes to confirm.",
  "booking": {
    "_id": "66e01a2b3c4d5e6f7a8b9c99",
    "bookingRef": "PKG-2026-9812",
    "status": "pending",
    "totalAmount": 110000,
    "currency": "INR",
    "expiresAt": "2026-09-15T17:15:00.000Z"
  }
}
```

---

### 3.5 Get Booking Status & Snapshot
- **Method:** `GET`
- **Path:** `/api/v1/packages/bookings/:id`
- **Auth:** ✅ Required (`Bearer <customer_token>`)

Returns booking details, payment status, full frozen snapshot, and confirmation codes.

---

### 3.6 Cancel Pending Package Booking
- **Method:** `POST`
- **Path:** `/api/v1/packages/bookings/:id/cancel`
- **Auth:** ✅ Required (`Bearer <customer_token>`)

Releases claimed seat/room units back to available stock.

```json
{
  "reason": "Customer changed travel dates"
}
```

---

## 4. Standalone Retail Offers API Reference

For customers looking for standalone flight deals or contracted hotel room night discounts without buying a whole package.

### 4.1 Browse Retail Offers
- **Method:** `GET`
- **Path:** `/api/v1/offers`
- **Auth:** Not required (Public)

#### Query Params:
`itemType` (`flight` | `hotel`), `destination`, `minPrice`, `maxPrice`.

#### Response (`200 OK`):
```json
{
  "success": true,
  "offers": [
    {
      "_id": "66d4a8e2e944f7b6b199e820",
      "title": "Grand Hyatt Dubai (4 Nights)",
      "itemType": "hotel",
      "destination": "Dubai",
      "images": [
        "https://res.cloudinary.com/travelagency/image/upload/travel-agency/offers/hyatt_room.jpg"
      ],
      "sellPrice": 22000,
      "originalPrice": 26000,
      "discountPercentage": 15,
      "availableBookings": 8,
      "startDate": "2026-11-15T00:00:00.000Z",
      "endDate": "2026-11-19T00:00:00.000Z"
    }
  ]
}
```

---

### 4.2 Book Standalone Retail Offer
- **Method:** `POST`
- **Path:** `/api/v1/offers/:id/book`
- **Auth:** ✅ Required (`Bearer <customer_token>`)

#### Request Body:
```json
{
  "quantity": 1,
  "travellers": [
    {
      "namePrefix": "Mr",
      "firstName": "Rahul",
      "lastName": "Sharma",
      "phone": "+919876543210",
      "email": "rahul.sharma@example.com"
    }
  ]
}
```

---

## 5. React / Next.js Implementation Blueprint

### A. Rendering the Package Details Page
```tsx
import React, { useState, useEffect } from "react";

export default function PackageDetailPage({ packageId }: { packageId: string }) {
  const [pkg, setPkg] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [swaps, setSwaps] = useState<Array<{ originalOfferId: string; replacementOfferId: string }>>([]);

  useEffect(() => {
    fetch(`/api/v1/packages/${packageId}`)
      .then((res) => res.json())
      .then((data) => setPkg(data.package));
  }, [packageId]);

  // Recalculate quote whenever customization changes
  useEffect(() => {
    if (!pkg) return;
    fetch(`/api/v1/packages/${packageId}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity: 1,
        excludedOfferIds: excludedIds,
        swappedOffers: swaps,
      }),
    })
      .then((res) => res.json())
      .then((data) => setQuote(data.quote));
  }, [excludedIds, swaps, pkg]);

  if (!pkg) return <div>Loading holiday experience...</div>;

  return (
    <div className="package-page">
      {/* 1. Hero Image Carousel */}
      <div className="hero-slider">
        {pkg.images.map((imgUrl: string, idx: number) => (
          <img key={idx} src={imgUrl} alt={`${pkg.title} photo ${idx + 1}`} className="carousel-img" />
        ))}
      </div>

      <h1>{pkg.title}</h1>
      <p className="destination">{pkg.destination}</p>

      {/* 2. Itemized Component Cards */}
      <div className="components-list">
        {pkg.priceBreakdown.map((item: any) => (
          <div key={item.id} className="component-card">
            {item.details.images?.[0] && (
              <img src={item.details.images[0]} alt={item.title} className="card-thumb" />
            )}
            <div className="card-info">
              <h3>{item.title}</h3>
              <p>₹{item.retailPrice.toLocaleString()}</p>
              {item.isOptional && (
                <label>
                  <input
                    type="checkbox"
                    checked={!excludedIds.includes(item.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setExcludedIds(excludedIds.filter((id) => id !== item.id));
                      } else {
                        setExcludedIds([...excludedIds, item.id]);
                      }
                    }}
                  />
                  Include this item
                </label>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Sticky Bottom Pricing Bar */}
      <div className="sticky-booking-bar">
        <div>
          <span className="price-label">Live Customizer Total</span>
          <h2>₹{(quote ? quote.finalSellPrice : pkg.sellPrice).toLocaleString()}</h2>
        </div>
        <button onClick={handleProceedToBooking} className="btn-primary">
          Book Now
        </button>
      </div>
    </div>
  );
}
```

---

## 6. Frontend Developer Checklist

- [ ] **Image Fallback**: Always bind `src={item.details.images?.[0] || pkg.images?.[0]}` so every card displays an image.
- [ ] **Dynamic Quotes**: Use `POST /api/v1/packages/:id/quote` on state changes to avoid doing math on the client.
- [ ] **Inventory Timer**: When a booking is created (`POST /packages/book`), start a **30-minute countdown timer** using `booking.expiresAt`.
- [ ] **Error Handling (`409 Conflict`)**: If stock runs out when booking, catch `409` and display: *"One of the selected flights/hotels just sold out. Please select an alternative."*
