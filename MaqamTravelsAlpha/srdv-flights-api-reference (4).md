# SRDV Flights API — Request Reference

> Source: Verified against actual SRDV JSON request examples.
> Use this when writing srdv.adapter.js — not the SRDV docs directly (docs have errors).
> **Updated:** now includes the `flight_callback` webhook spec, the `FlightBooking` schema,
> bugs found/fixed in `srdv.client.js` during implementation, and the build order being followed.

---

## How the steps connect

```
Search → FareQuote → Book (TicketLCC or Hold GDS) → TicketGDS (GDS only, after payment)
```

`TraceId`, `SrdvIndex`, `ResultIndex`, `SrdvType` — come from Search, must be stored on FlightBooking immediately, echoed in every subsequent request.

---

## Credentials — srdv.client.js adds these to every request

```js
{
  EndUserIp: process.env.SRDV_END_USER_IP,
  ClientId:  process.env.SRDV_CLIENT_ID,
  UserName:  process.env.SRDV_USERNAME,
  Password:  process.env.SRDV_PASSWORD
}
```

---

## 1. Search — OneWay

```json
{
  "EndUserIp": "1.1.1.1",
  "ClientId": "...",
  "UserName": "...",
  "Password": "...",
  "AdultCount": 1,
  "ChildCount": 0,
  "InfantCount": 0,
  "JourneyType": 1,
  "DirectFlight": false,
  "Segments": [
    {
      "Origin": "BOM",
      "Destination": "DXB",
      "FlightCabinClass": 0,
      "PreferredDepartureTime": "2025-12-25T00:00:00",
      "PreferredArrivalTime": "2025-12-25T00:00:00"
    }
  ]
}
```

## 1b. Search — Return

```json
{
  "EndUserIp": "1.1.1.1",
  "ClientId": "...",
  "UserName": "...",
  "Password": "...",
  "AdultCount": 1,
  "ChildCount": 0,
  "InfantCount": 0,
  "JourneyType": 2,
  "DirectFlight": false,
  "Segments": [
    {
      "Origin": "BOM",
      "Destination": "BLR",
      "FlightCabinClass": 0,
      "PreferredDepartureTime": "2025-12-29T00:00:00",
      "PreferredArrivalTime": "2025-12-29T00:00:00"
    },
    {
      "Origin": "BLR",
      "Destination": "BOM",
      "FlightCabinClass": 0,
      "PreferredDepartureTime": "2025-12-31T00:00:00",
      "PreferredArrivalTime": "2025-12-31T00:00:00"
    }
  ]
}
```

**JourneyType:** 1=OneWay, 2=Return, 3=MultiCity
**FlightCabinClass:** 0=No preference, 2=Economy, 3=PremiumEconomy, 4=Business, 5=PremiumBusiness, 6=First
> ⚠️ Docs say 1=All but actual requests use 0 for no cabin preference. Use 0.

---

## 2. FareQuote

```json
{
  "EndUserIp": "1.1.1.1",
  "ClientId": "...",
  "UserName": "...",
  "Password": "...",
  "SrdvType": "MixAPI",
  "TraceId": "174278",
  "SrdvIndex": "2",
  "ResultIndex": "5-5668111542_36DELAMD6E2501AMDBOM6E6794~36270019929212"
}
```

**What you get back — check these before proceeding:**
- `IsPriceChanged: true` → return new price to frontend, do NOT book
- `IsTimeChanged: true` → return new time to frontend, do NOT book
- `IsGSTMandatory: true` → pull GST values from Settings and fill GST fields
- `Fare: {}` → save this entire object, send it back in the book request as-is

---

## 3. TicketLCC (LCC airlines — IndiGo, SpiceJet etc.)

```json
{
  "EndUserIp": "1.1.1.1",
  "ClientId": "...",
  "UserName": "...",
  "Password": "...",
  "SrdvType": "MixAPI",
  "SrdvIndex": "2",
  "TraceId": "174278",
  "ResultIndex": "5-5668111542_36DELAMD6E2501AMDBOM6E6794~36270019929212",
  "Passengers": [
    {
      "Title": "Mr",
      "FirstName": "First",
      "LastName": "Name",
      "PaxType": 1,
      "DateOfBirth": "",
      "Gender": "1",

      "PassportNo": "",
      "PassportExpiry": "",
      "PassportIssueDate": "",

      "AddressLine1": "A152 Ashok Nagar",
      "City": "Delhi",
      "CountryCode": "IN",
      "CountryName": "INDIA",
      "CellCountryCode": "+91",
      "ContactNo": "1234567890",
      "Email": "john@example.com",

      "IsLeadPax": 1,

      "GSTCompanyAddress": "",
      "GSTCompanyContactNumber": "",
      "GSTCompanyName": "",
      "GSTNumber": "",
      "GSTCompanyEmail": "",

      "Fare": {
        "BaseFare": 3691,
        "Tax": 1465,
        "TransactionFee": "0",
        "YQTax": 700,
        "AdditionalTxnFeeOfrd": "",
        "AdditionalTxnFeePub": "",
        "AirTransFee": "0"
      },

      "Baggage": [],
      "MealDynamic": [],
      "Seat": []
    }
  ]
}
```

> ⚠️ `IsLeadPax` is integer `1`, NOT boolean `true`
> ⚠️ `Fare` is an object `{}`, NOT an array `[]`
> ⚠️ LCC Fare does NOT have `Currency` or `OtherCharges` — GDS does

### Baggage[] — MVP sends []. When built, each item:
```json
{
  "WayType": 1,
  "Code": "XBPESeKey309",
  "Description": "Excess Baggage - 3 Kg",
  "Weight": "Excess Baggage - 3 Kg",
  "Currency": "INR",
  "Price": 1350,
  "Origin": "DEL",
  "Destination": "AMD"
}
```
> `Origin`/`Destination` here = which flight segment this baggage applies to, NOT the overall trip

### MealDynamic[] — MVP sends []. When built, each item:
```json
{
  "WayType": 1,
  "Code": "TCSWSeKey309",
  "Description": "Tomato Cucumber Cheese Lettuce Sandwich Combo",
  "AirlineDescription": "Tomato Cucumber Cheese Lettuce Sandwich Combo",
  "Quantity": "1",
  "Currency": "INR",
  "Price": 400,
  "Origin": "DEL",
  "Destination": "AMD"
}
```

### Seat[] — MVP sends []. When built, each item:
```json
{
  "AirlineCode": "6E",
  "FlightNumber": "2501",
  "SeatNumber": "4C",
  "IsBooked": false,
  "IsLegroom": false,
  "IsAisle": true,
  "Amount": 350,
  "Code": "4CSeKey309",
  "Origin": "DEL",
  "Destination": "AMD"
}
```
> ⚠️ Field is `FlightNumber` NOT `AirlineNumber` — SRDV docs are wrong on this

---

## 4. Hold GDS (GDS airlines — Air India, Emirates etc.)

```json
{
  "EndUserIp": "1.1.1.1",
  "ClientId": "...",
  "UserName": "...",
  "Password": "...",
  "SrdvType": "MixAPI",
  "SrdvIndex": "1",
  "TraceId": "204142",
  "ResultIndex": "OB3_0_2",
  "Passengers": [
    {
      "Title": "Mr",
      "FirstName": "Jojy",
      "LastName": "Milson",
      "PaxType": 1,
      "DateOfBirth": "1997-03-12T00:00:00",
      "Gender": "1",

      "PassportNo": "abc123456",
      "PassportExpiry": "2031-03-12T00:00:00",

      "AddressLine1": "Noida, Sector 63",
      "City": "Noida",
      "CountryCode": "IN",
      "CountryName": "INDIA",
      "ContactNo": "1234567890",
      "Email": "email@gmail.com",

      "IsLeadPax": 1,

      "GSTCompanyAddress": "",
      "GSTCompanyContactNumber": "",
      "GSTCompanyName": "",
      "GSTNumber": "",
      "GSTCompanyEmail": "",

      "Fare": {
        "Currency": "INR",
        "BaseFare": 3180,
        "Tax": 9364,
        "YQTax": 0,
        "OtherCharges": 0,
        "TransactionFee": "0",
        "AdditionalTxnFeeOfrd": 0,
        "AdditionalTxnFeePub": 0,
        "AirTransFee": "0"
      }
    }
  ]
}
```

**Differences from LCC:**

| Field | LCC | GDS |
|-------|-----|-----|
| CellCountryCode | ✅ Send it | ❌ Do not send |
| PassportIssueDate | ✅ Send it (even if empty string) | ❌ Do not send |
| Baggage[] | ✅ Send (empty array for MVP) | ❌ Do not send at all |
| MealDynamic[] | ✅ Send (empty array for MVP) | ❌ Do not send at all |
| Seat[] | ✅ Send (empty array for MVP) | ❌ Do not send at all |
| Fare.Currency | ❌ Not present | ✅ Required |
| Fare.OtherCharges | ❌ Not present | ✅ Required |

---

## 5. TicketGDS (called internally after payment — not a customer route)

```json
{
  "EndUserIp": "1.1.1.1",
  "ClientId": "...",
  "UserName": "...",
  "Password": "...",
  "SrdvType": "MixAPI",
  "SrdvIndex": "1",
  "TraceId": "204142",
  "ResultIndex": "OB3_0_2",
  "PNR": "ABC123",
  "BookingId": 9876543
}
```

All values from FlightBooking record in DB.

---

## 6. Booking Callback (`flight_callback`) — inbound, not outbound

> ⚠️ Different direction from sections 1–5. Those are things **you** send to SRDV.
> This is SRDV sending **to you** — you build and host this endpoint, SRDV just calls it.

**Why it exists:** Hold GDS / TicketLCC / TicketGDS responses aren't always final. A booking can
come back `Pending`, `In Process`, or `On Hold` while SRDV is still finishing with the
airline/GDS in the background. This webhook is how SRDV tells you when it resolves to `Success`,
`Failed`, or `Aborted`. You've already seen evidence of this above — the TicketLCC response
example has an empty `Ticket{}` object; that's not a broken example, the ticket doesn't exist yet
at that point. This callback is what delivers it once it does.

**Endpoint SRDV calls:** `POST https://flight.srdvtest.com/v8/rest/flight_callback` triggers a
`POST` to *your* URL. **You configure your URL:** Dashboard → Settings → Callback URL.

### Callback request (SRDV → you)

| Element | Format | Comments | Mandatory |
|---|---|---|---|
| ClientId | Integer | Your agency's client ID | Mandatory |
| UserName | String | Your API username | Mandatory |
| Password | String | Your API password | Mandatory |
| EndUserIp | String | End user IP from the original booking | Mandatory |
| TraceId | String | Ties back to the original Search/FareQuote/Book calls | Mandatory |
| BookingId | String | **Join key** — matches `srdvBookingId` on FlightBooking | Mandatory |
| PNR | String | Airline PNR | Mandatory |
| GdsPNR | String | GDS system PNR | Optional |
| Status | String | Final status: `Success` / `Failed` / `Aborted` | Mandatory |
| Remark | String | Reason on Failed/Aborted — triggers refund logic | Optional |
| Passengers[] | Array | `Title`, `FirstName`, `LastName`, `TicketNumber` (optional) per pax | Mandatory |

### Callback response (you → SRDV)

```json
{ "Error": { "ErrorCode": 0, "ErrorMessage": "" } }
```

> ⚠️ SECURITY: SRDV re-sends `ClientId`/`UserName`/`Password` in the callback body — this is the
> **only** verification mechanism, no signature/HMAC/IP-allowlist is documented. The handler
> **must** check these against stored values and reject (non-zero `ErrorCode`) on mismatch, or
> anyone holding those credentials (already sent on every outbound call) could spoof a callback.

### What the handler does

```js
// POST /webhooks/srdv/callback
1. Verify ClientId/UserName/Password against stored SRDV creds → reject if mismatch
2. FlightBooking.findOne({ srdvBookingId: req.body.BookingId })
3. Update: pnr, gdsPnr, status (map Success/Failed/Aborted → your enum), remark
4. Match Passengers[] by name → set passenger.ticketNumber
5. If Failed/Aborted → trigger refund
6. Respond { Error: { ErrorCode: 0, ErrorMessage: "" } }
```

> ⚠️ No documented retry/idempotency behavior — SRDV may redeliver on timeout. Update by
> `BookingId` + `Status` so a duplicate delivery can't double-trigger a refund or overwrite a
> later status with a stale one.

**Build note:** this endpoint can be scaffolded early, but is only provably correct once Hold
GDS / TicketLCC / TicketGDS are producing real `BookingId`s for SRDV to send callbacks about.
Locally it needs a tunnel (ngrok or similar) — SRDV can't reach `localhost`.

---

## Traveller model → SRDV field mapping

```js
// srdv.client.js
const paxTypeMap = { Adult: 1, Child: 2, Infant: 3 };
const genderMap  = { Male: "1", Female: "2" };

// ⚠️ FIXED: original used .toISOString().split("T")[0] → truncated to "YYYY-MM-DD".
// Every DateOfBirth/PassportExpiry in actual SRDV examples is a full timestamp
// ("1997-03-12T00:00:00") — keep it, only strip milliseconds/Z.
const formatDate = (date) =>
  date ? new Date(date).toISOString().replace(/\.\d{3}Z$/, "") : "";

function buildPassenger(traveller, isLeadPax, fareFromFareQuote, isLCC, gstData = {}, ancillaries = {}) {
  const passenger = {
    Title:       traveller.title,
    FirstName:   traveller.firstName,
    LastName:    traveller.lastName,
    PaxType:     paxTypeMap[traveller.passengerType],
    DateOfBirth: formatDate(traveller.dateOfBirth),
    Gender:      genderMap[traveller.gender],

    PassportNo:     traveller.passportNo || "",
    PassportExpiry: formatDate(traveller.passportExpiry) || "",

    AddressLine1: (traveller.addressLine1 || "").slice(0, 32),
    City:         traveller.city,
    CountryCode:  traveller.countryCode,
    CountryName:  traveller.countryName,
    ContactNo:    traveller.phone,
    Email:        traveller.email,

    IsLeadPax: isLeadPax ? 1 : 0,   // integer, not boolean

    // ⚠️ FIXED: original referenced `gst` — undefined, out-of-scope variable.
    // Now an explicit param so GST company details are per-call, not implicit/global.
    GSTCompanyAddress:       gstData.address || "",
    GSTCompanyContactNumber: gstData.contactNumber || "",
    GSTCompanyName:          gstData.companyName || "",
    GSTNumber:               gstData.gstNumber || "",
    GSTCompanyEmail:         gstData.email || "",

    Fare: fareFromFareQuote,   // object from FareQuote response — NOT an array
  };

  // LCC-only fields — do NOT send on GDS (see comparison table in section 4)
  if (isLCC) {
    passenger.CellCountryCode   = traveller.cellCountryCode;
    passenger.PassportIssueDate = formatDate(traveller.passportIssueDate) || "";
    passenger.Baggage     = ancillaries.baggage || [];
    passenger.MealDynamic = ancillaries.meals || [];
    passenger.Seat        = ancillaries.seats || [];
  }

  return passenger;
}
```

> ⚠️ Open question, not yet hit: `Fare` above is one flat object reused for every passenger —
> correct for all-adult bookings. If Adult+Child+Infant are booked together, fares may need to be
> split by `PaxType` (see `FareBreakdown[]` in the Search response) instead of passing the same
> `fareFromFareQuote` to everyone. Unconfirmed — the FareQuote example in this doc is single-pax
> only. Verify with a live multi-pax-type test before shipping that case.

---

## Fields NOT on Traveller model

| Field | Source |
|-------|--------|
| IsLeadPax | Frontend sends which travellerId is lead in /book request |
| PaxType (1/2/3) | Mapped from traveller.passengerType in adapter |
| Gender ("1"/"2") | Mapped from traveller.gender in adapter |
| Fare object | FareQuote response — pass through as-is |
| Baggage/Meal/Seat items | Post-MVP — customer selects at booking time |
| GST fields | Settings collection — only if IsGSTMandatory = true from FareQuote |

---

## srdv.client.js — holdGDS / ticketGDS (bugs found & fixed during implementation)

```js
// provider/srdv.client.js

const holdGDS = async ({
  srdvType, traceId, srdvIndex, resultIndex, travellers, fareData, gstData,
}) => {
  try {
    const payload = {
      ...SRDV_CREDENTIALS,
      SrdvType: srdvType,
      TraceId: traceId,
      SrdvIndex: srdvIndex,
      ResultIndex: resultIndex,
      Passengers: travellers.map((t) =>
        buildPassenger(t.traveller, t.isLeadPax, fareData, false, gstData)
      ),
    };
    // ⚠️ FIXED: was flightClient.post("/hold", { payload }) — extra wrapper key.
    // Every request shape in this doc is flat at the top level; SRDV doesn't expect { payload }.
    const response = await flightClient.post("/hold", payload);
    return response.data;
  } catch (error) {
    logger.error(`SRDV flight booking failed: ${error.message}`);
    throw error;
  }
};

const ticketGDS = async ({
  srdvType, traceId, srdvIndex, resultIndex, pnr, bookingId,
  // ⚠️ FIXED: was destructuring `{}` — every field below was silently undefined.
}) => {
  const payload = {
    ...SRDV_CREDENTIALS,
    SrdvType: srdvType,
    TraceId: traceId,
    SrdvIndex: srdvIndex,
    ResultIndex: resultIndex,
    PNR: pnr,
    BookingId: Number(bookingId),   // ⚠️ coerced — doc example sends a number, not a string
  };
  try {
    const response = await flightClient.post("/TicketGDS", payload);
    return response.data;
  } catch (error) {
    logger.error(`SRDV flight booking failed: ${error.message}`);
    throw error;
  }
};

module.exports = { holdGDS, ticketGDS };
```


**Still open:** `ticketLCC` hasn't been pasted/reviewed yet — check for the same two bug patterns (payload-wrapping, empty/incomplete destructure) before relying on it. LCC's `Passengers[]` also needs `Baggage`/`MealDynamic`/`Seat`/`CellCountryCode`/`PassportIssueDate`, which `buildPassenger`'s `isLCC` branch already handles — just confirm the caller passes `isLCC: true`.

---

---

# SRDV Response Reference

---

## Search Response

```json
{
  "Error": { "ErrorCode": "0", "ErrorMessage": "" },
  "TraceId": 202837,
  "SrdvType": "MixAPI",
  "Origin": "BOM",
  "Destination": "DXB",
  "Results": [
    [
      {
        "FareDataMultiple": [
          {
            "SrdvIndex": "2",
            "ResultIndex": "4-4202752645_0BOMDXBSG59~...",
            "SingleSlotBooking": "Yes",
            "IsLCC": true,
            "IsRefundable": true,
            "GSTAllowed": "Not Set",
            "IsGSTMandatory": "Not Set",
            "OfferedFare": 5651,
            "Fare": {
              "Currency": "INR",
              "BaseFare": 3497,
              "Tax": 2153.5,
              "YQTax": "",
              "OtherCharges": 0,
              "TransactionFee": 0,
              "PublishedFare": 5650.5,
              "OfferedFare": 5651,
              "CommissionEarned": 0
            },
            "FareBreakdown": [
              {
                "PassengerType": 1,
                "PassengerCount": 1,
                "BaseFare": 3497,
                "Tax": 2153.5
              }
            ],
            "FareSegments": [
              {
                "AirlineCode": "SG",
                "AirlineName": "SpiceJet",
                "FlightNumber": "59",
                "Baggage": "15 Kg",
                "CabinBaggage": "7 Kg",
                "FareClass": "RS",
                "CabinClassName": "Economy",
                "CabinClassCode": 2,
                "NoOfSeatAvailable": 1
              }
            ]
          }
        ],
        "Segments": [
          [
            {
              "TripIndicator": 1,
              "SegmentIndicator": 1,
              "Airline": {
                "AirlineCode": "SG",
                "AirlineName": "SpiceJet",
                "FlightNumber": "59",
                "OperatingCarrier": ""
              },
              "Origin": {
                "AirportCode": "BOM",
                "AirportName": "Chhatrapati Shivaji",
                "Terminal": "Terminal 2",
                "CityCode": "BOM",
                "CityName": "Mumbai",
                "CountryCode": "IN",
                "CountryName": "India"
              },
              "DepTime": "2025-12-25T02:00",
              "Destination": {
                "AirportCode": "DXB",
                "AirportName": "Dubai Intl Arpt",
                "Terminal": "Terminal 1",
                "CityCode": "DXB",
                "CityName": "Dubai",
                "CountryCode": "AE",
                "CountryName": "United Arab Emirates"
              },
              "ArrTime": "2025-12-25T03:55",
              "Duration": 205,
              "StopOver": "",
              "StopPoint": ""
            }
          ]
        ],
        "AirlineCode": "",
        "ValidatingAirline": "",
        "OfferedFare": 5651
      }
    ]
  ]
}
```

### Results structure — critical to understand

```
Results                         ← outer array
  [0]                           ← all outbound flight options
    [0]                         ← flight option 1
      FareDataMultiple[0]       ← fare data for this option (SrdvIndex, ResultIndex, IsLCC, Fare)
      Segments[0][0]            ← segment details for this option
    [1]                         ← flight option 2
      ...
  [1]                           ← all inbound flight options (return trips only)
    [0]
      ...
```

For OneWay: only `Results[0]` exists.
For Return: `Results[0]` = outbound options, `Results[1]` = inbound options.

### What to extract and store when customer selects a flight

```js
// From top level
traceId   = res.TraceId
srdvType  = res.SrdvType

// From the selected FareDataMultiple item
srdvIndex   = selected.SrdvIndex
resultIndex = selected.ResultIndex
isLCC       = selected.IsLCC
offeredFare = selected.OfferedFare   // before your markup
fare        = selected.Fare          // full fare object

// Your markup calculation (in flight.service.js)
const settings     = await Settings.findOne()
const markup       = settings.flightMarkupPercent || 0
const markupAmount = (offeredFare * markup) / 100
const totalAmount  = offeredFare + markupAmount
```

### What to send to frontend (cleaned — not raw SRDV)

```js
{
  traceId: res.TraceId,
  srdvType: res.SrdvType,
  flights: results.map(option => ({
    srdvIndex:    fareData.SrdvIndex,
    resultIndex:  fareData.ResultIndex,
    isLCC:        fareData.IsLCC,
    isRefundable: fareData.IsRefundable,
    offeredFare:  totalAmount,          // your price (with markup)
    baseFare:     fareData.Fare.BaseFare,
    tax:          fareData.Fare.Tax,
    segments: segments.map(seg => ({
      airline:     seg.Airline.AirlineName,
      flightNo:    seg.Airline.FlightNumber,
      origin:      seg.Origin.CityName,
      destination: seg.Destination.CityName,
      departure:   seg.DepTime,
      arrival:     seg.ArrTime,
      duration:    seg.Duration,
      baggage:     fareData.FareSegments[0].Baggage,
      cabinClass:  fareData.FareSegments[0].CabinClassName,
      seatsLeft:   fareData.FareSegments[0].NoOfSeatAvailable,
    }))
  }))
}
```

### Type warnings from actual response

| Field | Expected | Actual sometimes |
|-------|----------|-----------------|
| YQTax | Number | `""` empty string |
| GSTAllowed | Boolean | `"Not Set"` string |
| IsGSTMandatory | Boolean | `"Not Set"` string |
| TransactionFee | Number | `"0"` string |

Always coerce: `parseFloat(val) || 0`

---

## FareQuote Response

```json
{
  "Error": { "ErrorCode": "0", "ErrorMessage": "" },
  "TraceId": 202844,
  "SrdvType": "MixAPI",
  "IsPriceChanged": false,
  "Results": {
    "SrdvIndex": "2",
    "ResultIndex": "5-3656635733_1BOMFJR6E1501~...",
    "IsLCC": true,
    "IsRefundable": true,
    "IsPriceChanged": false,

    "IsPassportRequiredAtBook": false,
    "IsPassportFullDetailRequiredAtBook": true,
    "IsPassportExpiryRequired": true,
    "IsPassportIssueDateRequired": true,

    "IsGSTMandatory": false,
    "AdultDobRequired": true,
    "ChildDobRequired": true,
    "InfantDobRequired": true,
    "SeatSelectAllowed": true,
    "HoldAllowed": true,

    "Fare": {
      "Currency": "INR",
      "BaseFare": 2758,
      "Tax": 2400.59,
      "YQTax": 0,
      "OtherCharges": 0,
      "TransactionFee": 0,
      "AdditionalTxnFeeOfrd": 0,
      "AdditionalTxnFeePub": 0,
      "AirTransFee": 0,
      "Discount": 0,
      "PublishedFare": 5158.59,
      "OfferedFare": 5159,
      "CommissionEarned": 0
    },

    "Segments": [[ ... ]]
  }
}
```

### What to check before proceeding

```js
if (res.IsPriceChanged) {
  // Do NOT book. Return new price to frontend.
  return { priceChanged: true, newFare: res.Results.Fare }
}
```

### What to send to frontend

```js
{
  isPriceChanged: res.IsPriceChanged,
  confirmedFare:  res.Results.Fare.OfferedFare + markupAmount,

  // These flags tell frontend which fields to show on booking form
  passportRequired:         res.Results.IsPassportRequiredAtBook,
  passportFullDetail:       res.Results.IsPassportFullDetailRequiredAtBook,
  passportExpiryRequired:   res.Results.IsPassportExpiryRequired,
  passportIssueDateRequired:res.Results.IsPassportIssueDateRequired,
  adultDobRequired:         res.Results.AdultDobRequired,
  holdAllowed:              res.Results.HoldAllowed,
}
```

### What to store temporarily (needed for Book request)

```js
// Store on FlightBooking record or in session
fareSnapshot = res.Results.Fare   // send this object as-is in Book request
isGSTMandatory = res.Results.IsGSTMandatory
```

---

## TicketLCC Response

```json
{
  "Error": { "ErrorCode": "0", "ErrorMessage": "" },
  "TraceId": "174278",
  "ResponseStatus": "1",
  "SrdvType": "MixAPI",
  "Response": {
    "SrdvIndex": "2",
    "PNR": "TESTPNR",
    "BookingId": 2106,
    "IsPriceChanged": false,
    "IsTimeChanged": false,
    "TicketStatus": "1",
    "FlightItinerary": {
      "BookingId": 2106,
      "PNR": "TESTPNR",
      "IsDomestic": "Not Set",
      "IsLCC": true,
      "Origin": "DEL",
      "Destination": "AMD",
      "AirlineCode": "6E",
      "Fare": {
        "Currency": "INR",
        "BaseFare": 3691,
        "Tax": 1465,
        "YQTax": 700,
        "PublishedFare": 5156,
        "OfferedFare": 5156,
        "TotalBaggageCharges": 0,
        "TotalMealCharges": 0,
        "TotalSeatCharges": 0
      },
      "Passenger": [
        {
          "Title": "Mr",
          "FirstName": "First",
          "LastName": "Name",
          "PaxType": "1",
          "ContactNo": "09870123654",
          "Email": "navneet@srdvtechnologies.com",
          "Ticket": {
            "TicketId": "",
            "TicketNumber": "",
            "IssueDate": "",
            "ValidatingAirline": "",
            "Status": ""
          }
        }
      ],
      "Segments": [
        {
          "TripIndicator": 1,
          "SegmentIndicator": 1,
          "DepTime": "2023-12-31T18:40",
          "ArrTime": "2023-12-31T20:05",
          "Airline": {
            "AirlineCode": "6E",
            "AirlineName": "IndiGo",
            "FlightNumber": "2501"
          },
          "Origin": { "AirportCode": "DEL", "CityName": "Delhi" },
          "Destination": { "AirportCode": "AMD", "CityName": "Ahmedabad" },
          "Duration": 85,
          "Baggage": "15 Kg (01 Piece only)",
          "CabinBaggage": "7 Kg"
        }
      ],
      "InvoiceNo": "",
      "InvoiceStatus": ""
    }
  }
}
```

### What to check immediately

```js
if (res.Response.IsPriceChanged || res.Response.IsTimeChanged) {
  // Booking happened but price/time changed — notify customer
}
```

### What to store on FlightBooking record

```js
pnr           = res.Response.PNR
srdvBookingId = res.Response.BookingId
ticketStatus  = res.Response.TicketStatus
invoiceNo     = res.Response.FlightItinerary.InvoiceNo
eTicketData   = res.Response.FlightItinerary   // full snapshot
status        = "confirmed"
```

---

## Full Data Flow

```
Search response
  → store: TraceId, SrdvType (top level)
  → store: SrdvIndex, ResultIndex, IsLCC (from selected FareDataMultiple)
  → send to frontend: cleaned flight list with your markup applied

      ↓ frontend sends back TraceId, SrdvType, SrdvIndex, ResultIndex

FareQuote response
  → check: IsPriceChanged → if true, stop and return new price
  → store: Fare object (send as-is in Book request)
  → store: IsGSTMandatory
  → send to frontend: passport/dob requirement flags + confirmed price with markup

      ↓ frontend sends back travellerId(s) + isLeadPax + isLCC

Book (TicketLCC or Hold GDS)
  → fetch travellers from DB
  → build passenger objects using adapter mapping
  → attach Fare from FareQuote snapshot
  → check: IsPriceChanged / IsTimeChanged in response
  → store on FlightBooking: PNR, BookingId, TicketStatus, InvoiceNo, full FlightItinerary
  → create Razorpay order
  → send to frontend: { bookingId, razorpayOrderId, amount }

      ↓ customer pays

Payment verified
  → if GDS: call TicketGDS using PNR + BookingId from FlightBooking
  → update FlightBooking status → confirmed
  → send confirmation email/SMS
```

---

## FlightBooking Schema (Mongoose) — how everything above gets persisted

Two categories of fields: **pre-call** (known before Book is called) and **post-call** (only
filled in once SRDV responds — either synchronously, or later via the `flight_callback` webhook,
section 6).

```js
// models/FlightBooking.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const PassengerSchema = new Schema(
  {
    travellerId: { type: Schema.Types.ObjectId, ref: "Traveller", required: true },
    isLeadPax: { type: Boolean, default: false },

    // Post-call only
    paxId: Number,                      // SRDV's PaxId (GDS responses)
    ticketNumber: { type: String, default: "" },
    ticketId: String,
    ticketIssueDate: Date,
    ticketStatus: String,               // e.g. "OK"
  },
  { _id: false }
);

const GstDetailsSchema = new Schema(
  {
    wantsInvoice: { type: Boolean, default: false },
    companyName: String,
    gstNumber: String,
    companyAddress: String,
    companyEmail: String,
    companyContactNumber: String,
  },
  { _id: false }
);

const FlightBookingSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // ---- Pre-call: Search → FareQuote, needed for Book & TicketGDS ----
    traceId: { type: String, required: true },
    srdvType: String,
    srdvIndex: String,
    resultIndex: String,
    isLCC: { type: Boolean, required: true },

    fareSnapshot: Schema.Types.Mixed,   // Fare object from FareQuote, sent as-is to Book
    totalAmount: Number,
    markupAmount: Number,

    isGstMandatory: Boolean,            // from FareQuote — enforce in controller, not schema
    gstDetails: GstDetailsSchema,       // optional unless isGstMandatory was true

    // ---- Post-call: Book response, or later the webhook/TicketGDS ----
    pnr: String,
    gdsPnr: String,
    srdvBookingId: { type: Number, index: true },   // join key for TicketGDS + the webhook
    lastTicketDate: Date,                // GDS hold only — ticketing deadline

    status: {
      type: String,
      enum: ["initiated", "pending", "confirmed", "failed", "aborted"],
      default: "initiated",
    },
    remark: String,

    ticketStatus: String,
    invoiceNo: String,
    invoiceStatus: String,

    passengers: [PassengerSchema],

    eTicketData: Schema.Types.Mixed,    // full FlightItinerary snapshot — for support/debugging

    razorpayOrderId: String,
    razorpayPaymentId: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("FlightBooking", FlightBookingSchema);
```

**Design notes:**
- `status: "initiated"` is written **before** calling `holdGDS`/`ticketLCC`, not after — pure
  safety net, so a crash/timeout mid-call still leaves a trace to reconcile against. Gets
  overwritten to `"pending"` once the Book response actually comes back.
- `gstDetails` is per-booking, not per-Traveller/profile — GST is a "does this booking need a
  claimable invoice" toggle, not a user account type. `isGstMandatory` records what FareQuote
  said; the controller enforces it before calling Book if `true` — the schema itself stays
  unvalidated since most bookings won't have GST data at all.
- `srdvBookingId` is indexed since it's the exact field the callback webhook queries on:
  `FlightBooking.findOne({ srdvBookingId: req.body.BookingId })`.
- `passengers[].travellerId` references the existing `Traveller` collection rather than embedding
  name/DOB — avoids duplicating PII that can drift if a traveller edits their profile later.
- The DB record and the SRDV request payload are deliberately different shapes — `buildPassenger()`
  is the translator between them, built fresh per-call. Nothing SRDV-shaped (e.g. `PaxType: 1`,
  `Gender: "1"`) gets persisted here; the schema stays in the app's own readable shape.

---

## Hold GDS Response

```json
{
  "Error": { "ErrorCode": "0", "ErrorMessage": "" },
  "TraceId": "204142",
  "ResponseStatus": 1,
  "SrdvType": "MixAPI",
  "Response": {
    "SrdvIndex": "1",
    "PNR": "8FM86Y",
    "BookingId": 2059008,
    "SSRDenied": false,
    "SSRMessage": null,
    "Status": 1,
    "IsPriceChanged": false,
    "IsTimeChanged": false,
    "FlightItinerary": {
      "BookingId": 2059008,
      "PNR": "8FM86Y",
      "IsDomestic": false,
      "IsLCC": false,
      "Origin": "BOM",
      "Destination": "DXB",
      "AirlineCode": "UL",
      "LastTicketDate": "",
      "ValidatingAirlineCode": "UL",
      "NonRefundable": true,
      "FareType": "RP",
      "Fare": {
        "Currency": "INR",
        "BaseFare": 3180,
        "Tax": 9364,
        "YQTax": 6744,
        "OtherCharges": 56,
        "PublishedFare": 12600,
        "OfferedFare": 12600,
        "TotalBaggageCharges": 0,
        "TotalMealCharges": 0,
        "TotalSeatCharges": 0
      },
      "Passenger": [
        {
          "PaxId": 3320678,
          "Title": "Mr",
          "FirstName": "Jojy",
          "LastName": "Milson",
          "PaxType": 1,
          "DateOfBirth": "1997-03-12T00:00:00",
          "Gender": 1,
          "PassportNo": "abc123456",
          "IsLeadPax": true,
          "ContactNo": "+91 1234567890",
          "Email": "email@gmail.com",
          "Fare": { ... }
        }
      ],
      "Segments": [
        {
          "TripIndicator": 1,
          "SegmentIndicator": 1,
          "DepTime": "2026-02-02T20:45:00",
          "ArrTime": "2026-02-02T23:15:00",
          "Airline": {
            "AirlineCode": "UL",
            "AirlineName": "Sri Lankan Airlines",
            "FlightNumber": "144",
            "FareClass": "S"
          },
          "AirlinePNR": "8FM86Y",
          "Origin": { "AirportCode": "BOM", "CityName": "Mumbai", "Terminal": "2" },
          "Destination": { "AirportCode": "CMB", "CityName": "Colombo" },
          "Duration": 150,
          "Baggage": "30 KG",
          "CabinBaggage": "Included",
          "FlightStatus": "Confirmed",
          "Status": "HK"
        },
        {
          "SegmentIndicator": 2,
          "Origin": { "AirportCode": "CMB", "CityName": "Colombo" },
          "Destination": { "AirportCode": "DXB", "CityName": "Dubai" },
          "Duration": 280
        }
      ],
      "FareRules": [
        {
          "Origin": "BOM",
          "Destination": "CMB",
          "Airline": "UL",
          "FareBasisCode": "SOWIZ",
          "FareRestriction": "N"
        }
      ]
    }
  }
}
```

### What to check immediately

```js
if (res.Response.IsPriceChanged || res.Response.IsTimeChanged) {
  // Notify customer — hold happened but details changed
}
if (res.Response.SSRDenied) {
  // Special service request was denied — log it
}
```

### What to store on FlightBooking record

```js
pnr              = res.Response.PNR
srdvBookingId    = res.Response.BookingId
lastTicketDate   = res.Response.FlightItinerary.LastTicketDate  // ⚠️ CRITICAL — ticketing deadline
holdStatus       = res.Response.Status
eTicketData      = res.Response.FlightItinerary                 // full snapshot
status           = "pending"   // NOT confirmed yet — awaiting payment + TicketGDS
```

> ⚠️ `LastTicketDate` is the deadline by which TicketGDS must be called after payment.
> Store it. If payment comes in after this date, the hold has expired and booking will fail.

### Difference from TicketLCC response

| Field | Hold GDS | TicketLCC |
|-------|----------|-----------|
| TicketStatus | ❌ Not present | ✅ Present |
| Passenger[].Ticket | ❌ Not present | ✅ Present (but empty in test) |
| InvoiceNo | ❌ Not present | ✅ Present (but empty in test) |
| LastTicketDate | ✅ Present | ❌ Not present |
| Status | ✅ At Response level | ✅ At Response level |

Hold = seat is held, not ticketed. Ticket numbers only come after TicketGDS.

---

## TicketGDS Response

```json
{
  "Error": { "ErrorCode": "0", "ErrorMessage": "" },
  "TraceId": "XXXX",
  "ResponseStatus": 1,
  "SrdvType": "SingleTB",
  "Response": {
    "SrdvIndex": "SrdvTB",
    "PNR": "VSDSY6",
    "BookingId": 1495552,
    "SSRDenied": false,
    "SSRMessage": null,
    "IsPriceChanged": false,
    "IsTimeChanged": false,
    "TicketStatus": 1,
    "FlightItinerary": {
      "BookingId": 1495552,
      "PNR": "VSDSY6",
      "IsDomestic": false,
      "IsLCC": false,
      "Origin": "DEL",
      "Destination": "BKK",
      "AirlineCode": "TG",
      "LastTicketDate": "2020-03-02T04:00:00",
      "ValidatingAirlineCode": "TG",
      "NonRefundable": false,
      "Fare": {
        "Currency": "INR",
        "BaseFare": 10205,
        "Tax": 1214,
        "YQTax": 0,
        "OtherCharges": 11.8,
        "PublishedFare": 11430.8,
        "OfferedFare": 11380.8,
        "CommissionEarned": 50,
        "TdsOnCommission": 20
      },
      "Passenger": [
        {
          "PaxId": 2144710,
          "Title": "Mr",
          "FirstName": "Joe",
          "LastName": "Milson",
          "PaxType": 1,
          "IsLeadPax": true,
          "Fare": { ... },
          "Ticket": {
            "TicketId": 1760879,
            "TicketNumber": "3432743357",
            "IssueDate": "2019-08-18T18:25:03",
            "ValidatingAirline": "217",
            "Status": "OK"
          },
          "SegmentAdditionalInfo": [
            {
              "FareBasis": "W1LOII3",
              "Baggage": "30 Kg",
              "Meal": "0 Platter",
              "Seat": ""
            }
          ]
        }
      ],
      "Segments": [ ... ],
      "InvoiceNo": "IW/1920/4652",
      "InvoiceStatus": 3,
      "InvoiceCreatedOn": "2019-08-18T18:25:03"
    }
  }
}
```

### What to store after TicketGDS

```js
ticketStatus  = res.Response.TicketStatus
invoiceNo     = res.Response.FlightItinerary.InvoiceNo
invoiceStatus = res.Response.FlightItinerary.InvoiceStatus
eTicketData   = res.Response.FlightItinerary   // update snapshot with ticket info
status        = "confirmed"

// Per passenger — update ticket details
passenger.ticket = {
  ticketId:    passenger.Ticket.TicketId,
  ticketNumber: passenger.Ticket.TicketNumber,   // actual e-ticket number
  issueDate:   passenger.Ticket.IssueDate,
  status:      passenger.Ticket.Status            // "OK" = issued
}
```

### What to send to frontend after full GDS flow completes

```js
{
  bookingRef:    flightBooking.bookingRef,
  pnr:           flightBooking.pnr,
  status:        "confirmed",
  ticketNumbers: passengers.map(p => p.ticket.ticketNumber),
  invoiceNo:     flightBooking.invoiceNo,
  segments:      cleanedSegments,
  totalAmount:   flightBooking.totalAmount
}
```

---

## Hold GDS vs TicketGDS — What changes between them

| Field | After Hold GDS | After TicketGDS |
|-------|---------------|----------------|
| FlightBooking.status | `pending` | `confirmed` |
| Passenger.Ticket.TicketNumber | not present | ✅ actual ticket number |
| InvoiceNo | not present | ✅ present |
| TicketStatus | not present | ✅ 1 = confirmed |
| eTicketData | Hold snapshot | Updated with ticket info |

---

## Build Order & Current Status

Conventional order being followed: **fix known adapter bugs → booking controller (happy path) →
webhook (async/edge path)**. Building the controller on top of known-broken adapters means
debugging the same failure twice; the webhook is effectively untestable until real bookings with
real `BookingId`s exist for SRDV to send callbacks about.

- [x] `buildPassenger` — bugs fixed (undefined `gst`, truncated dates) — see "Traveller model → SRDV field mapping"
- [x] `holdGDS` / `ticketGDS` — bugs fixed (payload wrapping, empty destructure) — see "srdv.client.js" section
- [x] `FlightBooking` schema — drafted
- [ ] `ticketLCC` — not yet reviewed, check for the same bug patterns as holdGDS/ticketGDS
- [ ] Booking controller — creates the `FlightBooking` record pre-call (`status: "initiated"`),
      calls Book, updates the record post-call, creates the Razorpay order
- [ ] `flight_callback` webhook — receives async status updates (see section 6)

**Why this order:** the controller and the webhook both read/write the same `FlightBooking`
record, so the schema had to be settled before either could be built meaningfully. Once settled,
the controller comes next — it's what proves the adapters + schema work end-to-end and is what
actually produces the `BookingId`s the webhook needs something to react to.

##  SSR (Special Service Request — Meals and Baggage)

```json
{
  "EndUserIp": "1.1.1.1",
  "ClientId": "...",
  "UserName": "...",
  "Password": "...",
  "SrdvType": "MixAPI",
  "TraceId": "174278",
  "SrdvIndex": "2",
  "ResultIndex": "5-5668111542_36DELAMD6E2501AMDBOM6E6794~36270019929212"
}
```

### Baggage Option Format
```json
{
  "AirlineCode": "6E",
  "FlightNumber": "2501",
  "WayType": 1,
  "Code": "XBPESeKey309",
  "Description": "Excess Baggage - 3 Kg",
  "Weight": "Excess Baggage - 3 Kg",
  "Currency": "INR",
  "Price": 1350,
  "Origin": "DEL",
  "Destination": "AMD"
}
```

### MealDynamic Option Format
```json
{
  "AirlineCode": "6E",
  "FlightNumber": "2501",
  "WayType": 1,
  "Code": "TCSWSeKey309",
  "Description": "Tomato Cucumber Cheese Lettuce Sandwich Combo",
  "AirlineDescription": "Tomato Cucumber Cheese Lettuce Sandwich Combo",
  "Quantity": "1",
  "Currency": "INR",
  "Price": 400,
  "Origin": "DEL",
  "Destination": "AMD"
}
```
