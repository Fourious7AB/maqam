# Leads Section — Backend API Guide

This document lists every endpoint the admin **Leads & Pipeline** section needs.
Build them in this order and the frontend (`leadsApi.js`) will switch from mock
data to your real backend with **zero frontend changes** (just set
`VITE_USE_MOCK_API=false` in `.env`).

Base path for all endpoints: `/api/v1/crm/leads`

Frontend source of truth:
- API layer: `src/admin/features/leads/leadsApi.js`
- Mock data (exact shape your responses should match): `src/admin/mocks/mockData.js` → `mockLeads`

---

## Conventions

Every response must be JSON. The frontend reads:

| Endpoint type | Frontend reads |
|---|---|
| List | `data.leads` (array) + `data.pagination` — fallback: `data` as a plain array |
| Single lead | `data.lead` — fallback: `data` directly |
| Everything else | ignored (frontend re-fetches) |

Also: the frontend works with both `id` and `_id` for the lead identifier
(`lead.id || lead._id`), so either field name is fine. Timestamps must be ISO
strings (`2026-08-28T09:30:00`).

### Status (stage) values

The UI "status" maps 1:1 to the backend query param `stage`:

`new` · `contacted` · `qualified` · `proposal` · `negotiation` · `won` · `lost`

### Other enum values

| Field | Allowed values |
|---|---|
| `priority` | `high` · `medium` · `low` |
| `source` | `Website` · `Referral` · `WhatsApp` · `Facebook` · `Sales Agent` · `Manual` |
| `tripType` | `Umrah` · `Leisure` · `Group Tour` · free text allowed |

### Lead object (full shape)

This is exactly what the UI displays. Build your schema around it.

```json
{
  "id": "LD-1001",
  "name": "Rahul Sharma",
  "company": "Family Travel",
  "phone": "+91 98765 43210",
  "email": "rahul@example.com",
  "destination": "Makkah & Madinah",
  "tripType": "Umrah",
  "travelers": 4,
  "budget": 320000,
  "source": "Website",
  "assignedTo": "Arup Bera",
  "status": "new",
  "priority": "high",
  "createdAt": "2026-08-28T09:30:00",
  "nextFollowUp": "2026-08-29T11:00:00",
  "query": "Need 2 premium rooms near Haram Sharif for 4 people, 7 nights in October.",
  "notes": "Family of four. Interested in a premium hotel near Haram.",
  "timeline": [
    { "id": "T1", "type": "created", "title": "Lead created", "detail": "Lead was created from website enquiry.", "time": "28 Aug, 09:30" },
    { "id": "T2", "type": "note", "title": "Note added", "detail": "Called customer, confirmed dates.", "time": "28 Aug, 10:00" }
  ]
}
```

Field notes:
- `query` = the customer's original request (shown as "Query / Request" on the
  detail page and as an excerpt on the card). `notes` = the agent's internal note.
- `timeline` = activity feed. `type` values used by the UI: `created`, `note`,
  `call`, `qualification`, `quote`, `won`, `lost` (any string is safe).
- `assignedTo` = salesman name shown directly in the UI. If you later switch to
  an agent `_id`, also return `assignedToName` and the frontend will need a
  one-line change — for now a plain string name is expected.

---

## 1. List leads

```
GET /api/v1/crm/leads
```

Query parameters (all optional):

| Param | Type | Example | Used by |
|---|---|---|---|
| `page` | integer | `1` | pagination |
| `limit` | integer | `20` | pagination |
| `search` | string | `rahul` | name / email / phone / destination match |
| `stage` | enum | `quoted` | the status filter (values listed above) |
| `priority` | enum | `high` | priority filter |
| `source` | enum | `WhatsApp` | source filter |
| `assignedTo` | string | `Arup Bera` | salesman filter |

Response:

```json
{
  "success": true,
  "message": "Leads retrieved",
  "data": {
    "leads": [
      { "id": "LD-1001", "name": "Rahul Sharma", "...": "full lead object as above" }
    ],
    "pagination": { "total": 48, "page": 1, "limit": 20, "totalPages": 3 }
  }
}
```

A plain array response (`data: [ ... ]`) also works, but pagination totals will
fall back to the array length.

---

## 2. Create lead (Add Lead modal)

```
POST /api/v1/crm/leads
```

### Real backend request body (confirmed format)

This is the actual shape your backend expects — update the Add Lead form and
the mock data to shoot this format:

```json
{
  "firstName": "Ahmed",
  "lastName": "Khan",
  "email": "ahmed.khan@example.com",
  "phone": "9876543210",
  "destination": "Makkah",
  "travelDates": {
    "from": "2026-09-21",
    "to": "2026-09-21"
  },
  "numberOfPeople": 4,
  "budget": 250000,
  "specialRequests": "Wheelchair accessible room required"
}
```

Field rules:

| Field | Type | Required | Notes |
|---|---|---|---|
| `firstName` | string | yes | first name |
| `lastName` | string | yes | last name |
| `email` | string | no | |
| `phone` | string | yes | digits, as entered (no country-code formatting required) |
| `destination` | string | no | e.g. `Makkah` |
| `travelDates` | object | no | `{ from, to }` as `YYYY-MM-DD` strings |
| `numberOfPeople` | integer | no | replaces `paxCount` / `travelers` from the old shape |
| `budget` | number | no | |
| `specialRequests` | string | no | the customer's request — replaces `query` from the old shape |

### Example response

```json
{
  "success": true,
  "message": "Lead created successfully",
  "data": {
    "_id": "6ab1c2d3e4f5a6b7c8d9e0f1",
    "firstName": "Ahmed",
    "lastName": "Khan",
    "email": "ahmed.khan@example.com",
    "phone": "9876543210",
    "destination": "Makkah",
    "travelDates": { "from": "2026-09-21", "to": "2026-09-21" },
    "numberOfPeople": 4,
    "budget": 250000,
    "specialRequests": "Wheelchair accessible room required",
    "status": "new",
    "priority": "medium",
    "source": "Manual",
    "assignedTo": null,
    "createdBy": "6aacc0352df766456873afa1",
    "createdAt": "2026-09-21T07:45:10.512Z",
    "updatedAt": "2026-09-21T07:45:10.512Z",
    "__v": 0
  }
}
```

### Suggested mock-data mapping (old mock shape → new backend format)

Update `mockLeads` and the Add Lead form to this format. Map the fields like
this so the UI keeps working unchanged:

| UI / old mock field | New backend field |
|---|---|
| `name` ("Rahul Sharma") | `firstName` + `lastName` (split on the first space; display joins them back) |
| `travelers` | `numberOfPeople` |
| `query` (customer request) | `specialRequests` |
| `nextFollowUp` | closest match is `travelDates.from` / `travelDates.to` — or keep `nextFollowUp` as an extra backend field |
| `budget`, `email`, `phone`, `destination` | same names |
| `id` / `_id` | `_id` (frontend already reads `lead.id \|\| lead._id`) |
| `status`, `priority`, `source`, `assignedTo`, `notes`, `timeline`, `company` | keep as extra backend fields — the UI needs them |

So a mock lead re-shot in the new format looks like:

```json
{
  "_id": "LD-1001",
  "firstName": "Rahul",
  "lastName": "Sharma",
  "company": "Family Travel",
  "phone": "9876543210",
  "email": "rahul@example.com",
  "destination": "Makkah & Madinah",
  "travelDates": { "from": "2026-09-21", "to": "2026-09-28" },
  "numberOfPeople": 4,
  "budget": 320000,
  "specialRequests": "Need 2 premium rooms near Haram Sharif, 7 nights in October, flights from Kolkata.",
  "tripType": "Umrah",
  "source": "Website",
  "assignedTo": "Arup Bera",
  "status": "new",
  "priority": "high",
  "notes": "Family of four. Interested in a premium hotel near Haram.",
  "createdAt": "2026-08-28T09:30:00",
  "timeline": [
    { "id": "T1", "type": "created", "title": "Lead created", "detail": "Lead was created from website enquiry.", "time": "28 Aug, 09:30" }
  ]
}
```

When you build the real endpoint, return **all** of the UI fields (`status`,
`priority`, `source`, `assignedTo`, `timeline`, …) together with the new-format
fields above — the section needs both sets.

---

## 3. Get single lead (detail page)

```
GET /api/v1/crm/leads/{id}
```

Example: `GET /api/v1/crm/leads/LD-1001`

Response:

```json
{
  "success": true,
  "message": "Lead retrieved",
  "data": {
    "lead": { "id": "LD-1001", "...": "full lead object with timeline" }
  }
}
```

---

## 4. Update lead (handle lead: status, priority, assignment, edits)

```
PATCH /api/v1/crm/leads/{id}
```

Request body — send only the changed fields. Any combination of:

```json
{
  "status": "negotiation",
  "priority": "high",
  "assignedTo": "Sourav Das",
  "notes": "Customer confirmed dates for December.",
  "destination": "Makkah",
  "budget": 350000,
  "nextFollowUp": "2026-09-01T11:00:00"
}
```

The status dropdown on the detail page and the per-column dropdown on the
Pipeline page both call this with a single `{ "status": "..." }` body.

Response:

```json
{
  "success": true,
  "message": "Lead updated",
  "data": { "lead": { "id": "LD-1001", "status": "negotiation", "...": "updated lead" } }
}
```

Recommended (nice to have): append an entry to `timeline` on the backend
whenever `status` changes, e.g.
`{ "id": "auto", "type": "status", "title": "Status changed", "detail": "Moved to Negotiation", "time": "<now>" }`.

---

## 5. Add follow-up note (detail page)

```
POST /api/v1/crm/leads/{id}/notes
```

Request body:

```json
{ "note": "Called customer, he will confirm by Friday." }
```

Response: the full updated lead (the frontend uses the returned `timeline`):

```json
{
  "success": true,
  "message": "Note added",
  "data": {
    "lead": {
      "id": "LD-1001",
      "timeline": [
        { "id": "T9", "type": "note", "title": "Note added", "detail": "Called customer, he will confirm by Friday.", "time": "29 Aug, 12:40" }
      ],
      "...": "rest of lead"
    }
  }
}
```

Backend must: append the timeline entry (`type: "note"`, `title: "Note added"`,
`detail: <note>`, `time: <formatted now>`) and also store the latest note in
`notes`.

---

## 6. Convert lead to customer / booking

```
POST /api/v1/crm/leads/{id}/convert
```

Request body (current modal sends this):

```json
{ "customerType": "existing" }
```

`customerType`: `"existing"` (link to an existing customer) or `"new"`
(create a customer from the lead's name/phone/email).

Behavior expected from backend:
1. Create (or link) the customer.
2. Mark the lead as `status: "won"`, set `convertedAt`.
3. Optionally create a draft booking from the lead's destination/budget.

Response:

```json
{
  "success": true,
  "message": "Lead converted",
  "data": {
    "lead": { "id": "LD-1001", "status": "won", "convertedAt": "2026-08-29T17:15:00", "...": "updated lead" }
  }
}
```

---

## Build order (suggested)

1. Schema + **#1 List** + **#3 Get** → the section renders with real data.
2. **#4 Update** → status handling and the Pipeline kanban go live.
3. **#2 Create** → the Add Lead modal goes live.
4. **#5 Notes** → follow-up notes go live.
5. **#6 Convert** → full lead-to-booking flow complete.

After all six are done, switch the frontend with one line in `.env`:

```
VITE_USE_MOCK_API=false
```
