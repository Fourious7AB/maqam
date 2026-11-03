# Flight E-Ticket API & Integration Guide (Live & In-House Services)

> **Base URL:** `http://localhost:5000/api/v1` (Development) or `https://api.maqamtravels.com/api/v1` (Production)  
> **Source Files:**
> - Centralized Controller: [`modules/eticket/eticket.controller.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/eticket/eticket.controller.js)
> - Service Engine: [`modules/eticket/eticket.service.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/eticket/eticket.service.js)
> - Routes: [`modules/eticket/eticket.routes.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/eticket/eticket.routes.js), [`modules/flights/flight.routes.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/flights/flight.routes.js), [`modules/packages/offers/offer.routes.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/packages/offers/offer.routes.js), [`modules/packages/user/packageUser.routes.js`](file:///d:/Debanjan/joydeb_folder/MaqamTravelsAlpha/modules/packages/user/packageUser.routes.js)  
> **Architecture Note:** No HTML templates are rendered on the backend. The backend provides rich, normalized JSON payloads. All visual styling, boarding pass cards, and PDF generation are implemented on the frontend client.

---

## 1. Endpoints Quick Reference

You can access the `get` (JSON) and `download` (attachment) endpoints either through the **domain routes** or the **centralized `/eticket` routes**:

### A. Live Flight Services (Online GDS & LCC)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/flights/bookings/:bookingId/eticket` | ✅ Bearer JWT | Get live flight e-ticket JSON for frontend UI rendering |
| `GET` | `/api/v1/flights/bookings/:bookingId/eticket/download` | ✅ Bearer JWT | Download verified e-ticket JSON attachment (`Content-Disposition`) |
| *Alias* | `/api/v1/eticket/live/:bookingId` | ✅ Bearer JWT | Centralized endpoint alias for live flight e-ticket |
| *Alias* | `/api/v1/eticket/live/:bookingId/download` | ✅ Bearer JWT | Centralized endpoint alias for live flight download |

### B. In-House Flight Services: Standalone Retail Offers
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/offers/bookings/:id/eticket` | ✅ Bearer JWT | Get in-house offer flight e-ticket JSON (Dual-PNR model) |
| `GET` | `/api/v1/offers/bookings/:id/eticket/download` | ✅ Bearer JWT | Download in-house offer e-ticket document attachment |
| *Alias* | `/api/v1/eticket/inhouse/offer/:bookingId` | ✅ Bearer JWT | Centralized endpoint alias for offer flight e-ticket |
| *Alias* | `/api/v1/eticket/inhouse/offer/:bookingId/download` | ✅ Bearer JWT | Centralized endpoint alias for offer flight download |

### C. In-House Flight Services: Tour Packages
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/packages/bookings/:id/eticket` | ✅ Bearer JWT | Get in-house package flight e-ticket JSON (Dual-PNR model) |
| `GET` | `/api/v1/packages/bookings/:id/eticket/download` | ✅ Bearer JWT | Download in-house package e-ticket document attachment |
| *Alias* | `/api/v1/eticket/inhouse/package/:bookingId` | ✅ Bearer JWT | Centralized endpoint alias for package flight e-ticket |
| *Alias* | `/api/v1/eticket/inhouse/package/:bookingId/download` | ✅ Bearer JWT | Centralized endpoint alias for package flight download |

### D. Public Ticket Verification (Airport / Gate Staff / Mobile)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/eticket/verify?pnr=...&lastName=...` | ✅ Bearer JWT | 2-factor lookup verifying ticket validity (PNR + Passenger Last Name) |

---

## 2. Authentication & Request Headers

All e-ticket retrieval and download operations require customer authentication via standard Bearer token:

```http
Authorization: Bearer <CUSTOMER_JWT_ACCESS_TOKEN>
Accept: application/json
```

---

## 3. Live Flight Service Endpoints

### 3.1 Get Live Flight E-Ticket JSON
- **Method:** `GET`
- **URL:** `/api/v1/flights/bookings/:bookingId/eticket`
- **Headers:** `Authorization: Bearer <TOKEN>`

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "Live flight e-ticket retrieved successfully",
  "data": {
    "serviceType": "LIVE_FLIGHT",
    "bookingId": "66d4a8e2e944f7b6b199e810",
    "bookingReference": "FLT-213637",
    "pnr": "6E5544",
    "gdsPnr": null,
    "carrierType": "LCC",
    "ticketStatus": "CONFIRMED",
    "issuedAt": "2026-10-28T10:15:00.000Z",
    "issuedAtFormatted": "28 Oct 2026, 03:45 pm",
    "customer": {
      "name": "Rahul Sharma",
      "email": "rahul.sharma@example.com",
      "phone": "+919876543210"
    },
    "segments": [
      {
        "segmentIndex": 1,
        "airline": {
          "name": "IndiGo",
          "code": "6E",
          "flightNumber": "6E 204",
          "cabinClass": "Economy"
        },
        "origin": {
          "code": "DEL",
          "city": "New Delhi",
          "airportName": "Indira Gandhi International Airport",
          "terminal": "T3"
        },
        "destination": {
          "code": "BOM",
          "city": "Mumbai",
          "airportName": "Chhatrapati Shivaji Maharaj Int'l Airport",
          "terminal": "T2"
        },
        "departureTime": "2026-11-20T06:15:00.000Z",
        "departureTimeFormatted": "20 Nov 2026, 11:45 am",
        "arrivalTime": "2026-11-20T08:30:00.000Z",
        "arrivalTimeFormatted": "20 Nov 2026, 02:00 pm",
        "duration": "2h 15m",
        "baggage": {
          "checkIn": "15 KG",
          "cabin": "7 KG"
        }
      }
    ],
    "passengers": [
      {
        "passengerIndex": 1,
        "fullName": "MR RAHUL SHARMA",
        "passengerType": "ADULT",
        "isLeadPassenger": true,
        "ticketNumber": "098-2134567890",
        "ticketStatus": "OK",
        "seatNumber": "14B",
        "meal": "VGML",
        "passportNumberMasked": "••••5678",
        "qrCodePayload": "M1SHARMA/RAHUL 6E5544 DELBOM 098-2134567890"
      }
    ],
    "advisories": [
      "Airport check-in counters open 3 hours prior to international departure and 2 hours prior for domestic flights.",
      "Check-in counters close strictly 60 minutes prior to scheduled departure.",
      "All passengers must present a valid government-issued photo ID or international passport matching the ticket name.",
      "Boarding gates close 25 minutes prior to scheduled departure."
    ]
  }
}
```

### 3.2 Download Live Flight E-Ticket Document
- **Method:** `GET`
- **URL:** `/api/v1/flights/bookings/:bookingId/eticket/download`
- **Response Headers:**
  ```http
  Content-Type: application/json; charset=utf-8
  Content-Disposition: attachment; filename="ETicket-6E5544.json"
  ```
- **Response Body:** Formatted downloadable document payload.

---

## 4. In-House Flight Service Endpoints

### 4.1 Get Standalone Offer Flight E-Ticket JSON
- **Method:** `GET`
- **URL:** `/api/v1/offers/bookings/:id/eticket`
- **Headers:** `Authorization: Bearer <TOKEN>`

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "In-house offer flight e-ticket retrieved successfully",
  "data": {
    "serviceType": "INHOUSE_OFFER_FLIGHT",
    "bookingId": "67b8e11a3c4d5e6f7a8b9c01",
    "bookingReference": "OFFER-FLT-8B9C01",
    "customerPnr": "MQM-8B9C01",
    "airlineGroupPnr": "SV-G9921",
    "ticketStatus": "CONFIRMED",
    "issuedAt": "2026-10-28T10:10:00.000Z",
    "issuedAtFormatted": "28 Oct 2026, 03:40 pm",
    "customer": {
      "name": "Ahmed Khan",
      "email": "ahmed.khan@example.com",
      "phone": "+919876543210"
    },
    "segments": [
      {
        "segmentIndex": 1,
        "airline": {
          "name": "Saudia",
          "code": "SV",
          "flightNumber": "SV-759",
          "cabinClass": "Economy"
        },
        "origin": {
          "code": "DEL",
          "city": "DEL",
          "airportName": "DEL International Airport",
          "terminal": "Main Terminal"
        },
        "destination": {
          "code": "JED",
          "city": "JED",
          "airportName": "JED International Airport",
          "terminal": "Main Terminal"
        },
        "departureTime": "2026-11-20T14:30:00.000Z",
        "departureTimeFormatted": "20 Nov 2026, 08:00 pm",
        "arrivalTime": "2026-11-20T18:45:00.000Z",
        "arrivalTimeFormatted": "21 Nov 2026, 12:15 am",
        "duration": "Direct Series Flight",
        "baggage": {
          "checkIn": "2 x 23 KG (Series Allowance)",
          "cabin": "7 KG"
        }
      }
    ],
    "passengers": [
      {
        "passengerIndex": 1,
        "fullName": "MR AHMED KHAN",
        "passengerType": "ADULT",
        "isLeadPassenger": true,
        "ticketNumber": "CONFIRMED (Group PNR: SV-G9921)",
        "seatNumber": "Seat Block Unit #9C01",
        "ticketStatus": "CONFIRMED",
        "passportNumberMasked": "••••5678",
        "qrCodePayload": "M1KHAN/AHMED MQM-8B9C01 DELJED SV-G9921"
      }
    ],
    "advisories": [
      "This e-ticket is issued under pre-contracted Wholesale Group PNR: SV-G9921.",
      "Present this document with your original passport at the airline check-in counter.",
      "Complimentary Zamzam 5L water allowance included for Umrah pilgrims on return flights.",
      "Reporting time: 3 hours prior to scheduled departure."
    ]
  }
}
```

### 4.2 Download Offer Flight E-Ticket Document
- **Method:** `GET`
- **URL:** `/api/v1/offers/bookings/:id/eticket/download`
- **Response Headers:**
  ```http
  Content-Type: application/json; charset=utf-8
  Content-Disposition: attachment; filename="ETicket-MQM-8B9C01.json"
  ```

---

### 4.3 Get Package Flight E-Ticket JSON
- **Method:** `GET`
- **URL:** `/api/v1/packages/bookings/:id/eticket`
- **Headers:** `Authorization: Bearer <TOKEN>`

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "In-house package flight e-ticket retrieved successfully",
  "data": {
    "serviceType": "INHOUSE_PACKAGE_FLIGHT",
    "bookingId": "67b8f22b4c5d6e7f8a9b0c12",
    "bookingReference": "PKG-FLT-9B0C12",
    "packageTitle": "15 Days Deluxe Umrah Package with 5-Star Makkah & Madinah Stay",
    "customerPnr": "MQM-9B0C12",
    "airlineGroupPnr": "SV-G8840",
    "ticketStatus": "CONFIRMED",
    "issuedAt": "2026-10-28T11:20:00.000Z",
    "issuedAtFormatted": "28 Oct 2026, 04:50 pm",
    "customer": {
      "name": "Zubair Hashmi",
      "email": "zubair.hashmi@example.com",
      "phone": "+919876501234"
    },
    "segments": [
      {
        "segmentIndex": 1,
        "airline": {
          "name": "Saudia",
          "code": "SV",
          "flightNumber": "SV-803",
          "cabinClass": "Economy"
        },
        "origin": {
          "code": "BOM",
          "city": "BOM",
          "airportName": "BOM International Airport",
          "terminal": "Main Terminal"
        },
        "destination": {
          "code": "JED",
          "city": "JED",
          "airportName": "JED International Airport",
          "terminal": "Main Terminal"
        },
        "departureTime": "2026-12-05T06:15:00.000Z",
        "departureTimeFormatted": "05 Dec 2026, 11:45 am",
        "arrivalTime": "2026-12-05T09:40:00.000Z",
        "arrivalTimeFormatted": "05 Dec 2026, 03:10 pm",
        "duration": "Group Charter / Series Flight",
        "baggage": {
          "checkIn": "2 x 23 KG (Group Tour Allowance)",
          "cabin": "7 KG"
        }
      }
    ],
    "passengers": [
      {
        "passengerIndex": 1,
        "fullName": "MR ZUBAIR HASHMI",
        "passengerType": "ADULT",
        "isLeadPassenger": true,
        "ticketNumber": "CONFIRMED (Group PNR: SV-G8840)",
        "seatNumber": "Group Unit #0C12",
        "ticketStatus": "CONFIRMED",
        "passportNumberMasked": "••••4321",
        "qrCodePayload": "M1HASHMI/ZUBAIR MQM-9B0C12 BOMJED SV-G8840"
      },
      {
        "passengerIndex": 2,
        "fullName": "MRS FATIMA HASHMI",
        "passengerType": "ADULT",
        "isLeadPassenger": false,
        "ticketNumber": "CONFIRMED (Group PNR: SV-G8840)",
        "seatNumber": "Group Unit #0C13",
        "ticketStatus": "CONFIRMED",
        "passportNumberMasked": "••••8765",
        "qrCodePayload": "M1HASHMI/FATIMA MQM-9B0C12 BOMJED SV-G8840"
      }
    ],
    "advisories": [
      "This e-ticket is part of an organized group travel package under Airline Series PNR: SV-G8840.",
      "Tour manager / airport coordinator will assist travelers at the departure terminal.",
      "Complimentary Zamzam 5L allowance included for pilgrims upon return.",
      "Check-in desk opens 3 hours prior to departure."
    ]
  }
}
```

### 4.4 Download Package Flight E-Ticket Document
- **Method:** `GET`
- **URL:** `/api/v1/packages/bookings/:id/eticket/download`
- **Response Headers:**
  ```http
  Content-Type: application/json; charset=utf-8
  Content-Disposition: attachment; filename="ETicket-MQM-7A8B9C.json"
  ```

---

## 5. Public 2-Factor Ticket Verification Endpoint

For airport check-in agents or travelers on mobile without an active session:

- **Method:** `GET`
- **URL:** `/api/v1/eticket/verify?pnr=6E5544&lastName=Sharma`
- **Auth:** ❌ Public (No token required)
- **Parameters:**
  - `pnr` *(required)*: Airline PNR or Customer PNR (`MQM-XXXXXX`)
  - `lastName` *(required)*: Passenger's last name (case-insensitive)
- **Success (`200 OK`):** Returns the verified e-ticket JSON.
- **Not Found (`404`):** `{ "success": false, "message": "No matching confirmed e-ticket found for the provided PNR and Last Name" }`

---

## 6. Frontend Developer Integration Recipes (React / Next.js)

### A. Direct Browser Download Button
Since the `download` endpoints support `?token=...`, the frontend can simply render an `<a>` tag:

```tsx
export function DownloadETicketButton({ bookingId, token }: { bookingId: string; token: string }) {
  const downloadUrl = `/api/v1/flights/bookings/${bookingId}/eticket/download?token=${token}`;

  return (
    <a
      href={downloadUrl}
      download
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-flex items-center gap-2"
    >
      <span>⬇️</span> Download E-Ticket
    </a>
  );
}
```

### B. Client-Side Print to PDF (Zero Backend HTML Needed!)
The frontend creates an interactive boarding pass component and uses the browser's native print engine:

```tsx
import React, { useEffect, useState } from 'react';

export default function ETicketViewer({ bookingId, serviceType = 'live' }: { bookingId: string; serviceType: 'live' | 'offer' | 'package' }) {
  const [ticket, setTicket] = useState<any>(null);

  useEffect(() => {
    const endpoint = serviceType === 'live'
      ? `/api/v1/flights/bookings/${bookingId}/eticket`
      : `/api/v1/offers/bookings/${bookingId}/eticket`;

    fetch(endpoint, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(json => setTicket(json.data));
  }, [bookingId]);

  if (!ticket) return <div>Loading verified e-ticket...</div>;

  return (
    <div className="eticket-container p-6 bg-white rounded-xl shadow-lg print:p-0">
      {/* 1. Header with Airline PNR */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-bold">{ticket.segments[0]?.airline?.name}</h2>
          <p className="text-sm text-gray-500">Flight: {ticket.segments[0]?.airline?.flightNumber}</p>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase text-gray-400">Booking PNR</span>
          <p className="text-2xl font-mono font-bold text-blue-600">{ticket.pnr || ticket.customerPnr}</p>
          {ticket.airlineGroupPnr && (
            <p className="text-xs text-gray-500">Group Airline PNR: {ticket.airlineGroupPnr}</p>
          )}
        </div>
      </div>

      {/* 2. Route & Times */}
      <div className="my-6 grid grid-cols-3 text-center items-center">
        <div>
          <h3 className="text-3xl font-black">{ticket.segments[0]?.origin?.code}</h3>
          <p className="text-sm font-medium">{ticket.segments[0]?.origin?.city} ({ticket.segments[0]?.origin?.terminal})</p>
          <p className="text-xs text-gray-500">{ticket.segments[0]?.departureTimeFormatted}</p>
        </div>
        <div className="text-sm text-gray-400">✈️ {ticket.segments[0]?.duration}</div>
        <div>
          <h3 className="text-3xl font-black">{ticket.segments[0]?.destination?.code}</h3>
          <p className="text-sm font-medium">{ticket.segments[0]?.destination?.city} ({ticket.segments[0]?.destination?.terminal})</p>
          <p className="text-xs text-gray-500">{ticket.segments[0]?.arrivalTimeFormatted}</p>
        </div>
      </div>

      {/* 3. Passengers Manifest */}
      <div className="border-t pt-4">
        <h4 className="text-xs uppercase tracking-wider text-gray-400 mb-2">Passengers</h4>
        {ticket.passengers.map((p: any) => (
          <div key={p.passengerIndex} className="flex justify-between py-2 border-b text-sm">
            <span><strong>{p.fullName}</strong> ({p.passengerType})</span>
            <span>Seat: <strong>{p.seatNumber}</strong></span>
            <span className="font-mono text-gray-600">Ticket: {p.ticketNumber}</span>
          </div>
        ))}
      </div>

      {/* 4. Action Buttons (Hidden when printing) */}
      <div className="mt-6 flex gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
        >
          🖨️ Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
```
