# Implementation Prompt — Hotelier Module (integrates with existing Packages module)

> Hand this to an agentic coding assistant with direct repo access. Read
> `packages-and-offers-flow.md` and the existing `HotelStock`/`Package`/`Offer` models before
> making any change — this module extends them, it does not replace them.

---

## Goal

Add a third actor — **hotelier** (external partner staff, not Maqams staff) — who can manage
their own hotel's room inventory (`HotelStock`) through a review-gated queue. Approved stock
must be indistinguishable from admin-entered stock everywhere the Packages/Offers module already
reads `HotelStock` — no changes to `Package`, `Offer`, `PackageBooking`, or `OfferBooking`
schemas or logic. `TicketStock` (flights) is untouched — this is hotel-side only.

---

## 1. New model: `Hotel`

```js
// models/Hotel.js
Hotel {
  name, destination, address              String, required
  images                                  [String]
  amenities                               [String]
  contactPerson, contactPhone, contactEmail  String
  tieUpStartDate                          Date
  contractNotes                           String       // internal, admin-only, never exposed to hotelier routes
  isActive                                Boolean, default: true
  createdBy                               ObjectId ref User
  createdAt, updatedAt
}
```

## 2. `User` model changes

- Add `"hotelier"` to the `role` enum.
- Add `hotelId: { type: ObjectId, ref: "Hotel" }` — required iff `role === "hotelier"`,
  enforce at the service/pre-save layer, not schema-level.
- One login per hotel — no join table. Hotelier accounts are created manually by
  `admin`/`super_admin` via the existing CRM-user-creation flow (reuse it, don't fork it),
  just allow `hotelId` in the payload when `role === "hotelier"`.

## 3. `HotelStock` model changes

```js
HotelStock {
  ...existing fields (hotelName/destination/roomType/checkIn/checkOut/pricePerNight/
                       reservationRef/nameAdditionDeadline)...

  hotelId          ObjectId ref Hotel, required   // NEW — replaces/supplements hotelName going forward

  reviewStatus     Enum: [pending_review, approved, rejected], default: "pending_review"  // NEW
  reviewedBy       ObjectId ref User               // NEW
  reviewNotes      String                          // NEW

  units: [{
    status              Enum: [available, blocked, assigned, used]   // "blocked" is NEW
    guestConfirmationRef String, default: null
    assignedToBooking    ObjectId ref PackageBooking | OfferBooking
    assignedAt           Date
  }]
}
```

**State transition rules — implement exactly this, it's the crux of the module:**

| Action | Actor | Effect on `reviewStatus` | Needs approval? |
|---|---|---|---|
| Create new `HotelStock` batch | hotelier | → `pending_review` | Yes |
| Add units to an existing batch | hotelier | batch → `pending_review` (even if it was `approved`) | Yes |
| Edit rate/dates on existing batch | hotelier | batch → `pending_review` | Yes |
| Toggle a unit `available` ↔ `blocked` | hotelier | no change to batch `reviewStatus` | No — instant |
| Approve/reject a `pending_review` batch | admin/super | → `approved` / `rejected` | — |

A hotelier must **never** be able to set `reviewStatus` directly, touch `assigned`/`used`
units, or edit another hotel's `HotelStock`. Enforce ownership via `req.user.hotelId ===
stock.hotelId` on every hotelier route, same pattern as `ownerOrAdmin`.

## 4. Availability calculation — update wherever this is currently computed for Package/Offer

```js
// Only count units that are genuinely sellable right now
availableUnits = stock.units.filter(u => u.status === 'available').length

// A stock document only contributes to Package/Offer availability at all if:
isStockUsable = stock.reviewStatus === 'approved' && hotel.isActive === true
```

Update:
- The `min`-across-refs availability calc for `Package` (`flightRefs`/`hotelRefs`).
- The single-ref availability calc for `Offer`.
- Both must filter out stock where `isStockUsable` is false, in addition to the existing
  `floor(availableUnits / unitsPerBooking)` logic. This is a query/filter change only — no
  schema change to `Package`/`Offer`.

## 5. Package/Offer builder (admin CRM UI + underlying stock-picker endpoint)

Whatever endpoint currently lists `HotelStock` for admin to attach to a `Package`/`Offer`
must filter to `reviewStatus: 'approved'` AND `hotel.isActive: true`. A hotelier's
newly-submitted or newly-edited batch should not be pickable until approved — no explicit
validation needed at Package-save time, just filter at pick-time.

## 6. Claim-time defensive check (in the not-yet-built atomic multi-unit claim logic)

When a booking actually claims units at checkout, re-verify — do not rely on what was true
when the customer viewed the Package page:

```js
if (stock.reviewStatus !== 'approved' || !hotel.isActive) {
  // reject the claim for this stock — someone changed it between view and checkout
}
```
Add this alongside the existing `status: 'available'` filter in the claim query.

## 7. `Hotel.isActive = false` — cascade behavior

No new flag needed on `Package`/`Offer`. Because availability is always computed on read
(`min`/`floor` over live stock, never cached), setting `hotel.isActive = false` makes every
`HotelStock` batch under that hotel silently read as 0 availability everywhere it's
referenced — Packages/Offers using it just show as sold out, without you having to touch
them. Confirm this falls out naturally from step 4's filter; don't build a separate cascade
job.

## 8. New routes

```
# Hotelier (own hotel only, enforced via req.user.hotelId)
GET    /api/v1/hotelier/stock                 — list own batches + reviewStatus
POST   /api/v1/hotelier/stock                 — create batch → pending_review
PATCH  /api/v1/hotelier/stock/:id             — edit rate/dates → resets to pending_review
POST   /api/v1/hotelier/stock/:id/units       — add units → batch resets to pending_review
PATCH  /api/v1/hotelier/stock/:id/units/:unitId   — body: { status: 'available' | 'blocked' } only

# CRM (admin, super_admin)
GET    /api/v1/crm/hotel-stock/pending        — queue of pending_review batches
PATCH  /api/v1/crm/hotel-stock/:id/review     — body: { decision: 'approved'|'rejected', reviewNotes }

# CRM — Hotel entity + hotelier account management
POST   /api/v1/crm/hotels                     — create Hotel (admin/super)
PATCH  /api/v1/crm/hotels/:id                 — edit Hotel, incl. isActive toggle
POST   /api/v1/crm/users  (existing route)    — extend to accept role: 'hotelier' + hotelId
```

## 9. Explicit guardrails — do not violate

- `TicketStock`, `Package`, `Offer`, `PackageBooking`, `OfferBooking` schemas: **no changes**.
- Hotelier role never sees: `assigned`/`used` unit detail, any booking/guest/passenger data,
  `Package.priceBreakdown`/`sellPrice`, `otherItems`, `costPrice`, other hotels' anything,
  `Hotel.contractNotes`.
- `PATCH .../units/:unitId` only ever accepts `available` or `blocked` from a hotelier — never
  `assigned`/`used`, those are booking-flow-only and must be rejected if a hotelier attempts them.
- Follow existing architectural conventions in this codebase: explicit service-layer logic
  over Mongoose `refPath` magic, computed-not-stored counts, PII by reference not embed.

## Suggested build order

1. `Hotel` model + CRM hotel CRUD + extend CRM user creation for `hotelier` role
2. `HotelStock` schema additions (`hotelId`, `reviewStatus`, `reviewedBy`, `reviewNotes`, `blocked` unit status)
3. Hotelier routes (stock CRUD + unit toggle), with ownership middleware
4. CRM review queue + approve/reject endpoint
5. Update availability calc (Package `min`, Offer single-ref) to filter on `reviewStatus`/`isActive`
6. Update admin's stock-picker query for Package/Offer builder
7. Add claim-time re-check once atomic claim logic is built (flag as TODO if claim logic still doesn't exist yet — don't build it now if out of scope for this pass)

## Open items to flag back to the human, don't guess

- Whether `PATCH /hotelier/stock/:id` should be blocked entirely while a batch is
  `pending_review` (avoid a hotelier repeatedly resetting the queue), or allowed freely.
- Whether rejected batches (`reviewStatus: 'rejected'`) can be resubmitted by the hotelier
  (edit → back to `pending_review`) or need a new batch.
