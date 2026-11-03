# SRDV Hotel API v8 — Integration Analysis

> Status: implementation guide based on SRDV's public Hotel API v8 documentation, reviewed on 2026-07-17.
>
> This document describes the contract that Maqam Travels should implement. It is **not** a replacement for SRDV's Postman collection: use the collection and sandbox credentials to verify exact JSON samples before enabling production booking.

> For the detailed customer-payment versus SRDV-supplier-settlement design, including recovery and cancellation flows, see [SRDV Hotel Booking and Settlement Flow](/modules/srdv-hotel-booking-settlement-flow).

## 1. Key conclusion

SRDV's Hotel API is a stateful supplier workflow. The correct order is:

```text
Search
  -> GetHotelInfo (property content, when needed)
  -> GetHotelRoom (room/rate details)
  -> BlockRoom (mandatory revalidation of price and cancellation policy)
  -> create local booking awaiting payment
  -> verified payment
  -> Book (hold or voucher/confirm)
  -> HotelBookingDetail polling when SRDV returns Pending
  -> HotelCancel when the customer cancels
```

SRDV explicitly recommends `BlockRoom` before `Book`. A successful payment alone is **not** confirmation: `Book` can report a changed price, a changed cancellation policy, failure, or a pending supplier confirmation.

## 2. Environment and authentication

All documented hotel calls include credentials in the JSON body:

```json
{
  "EndUserIp": "public-end-user-ip",
  "ClientId": "SRDV client id",
  "UserName": "SRDV username",
  "Password": "SRDV password"
}
```

Use environment variables only:

```env
SRDV_API_BASE_HOTEL_URL=https://hotel.srdvtest.com/v8/rest
SRDV_END_USER_IP=
SRDV_CLIENT_ID=
SRDV_USERNAME=
SRDV_PASSWORD=
```

- SRDV documents the **test** base URL as `https://hotel.srdvtest.com/v8/rest`.
- SRDV's public FAQ documents the **live** base URL as `https://hotel.srdvapi.com/v8/rest/`.
- Do not switch to live solely by changing a URL; obtain SRDV live credentials and written approval first.
- Do not send `X-API-Key` unless SRDV has specifically issued and documented one for this account.
- The docs show credentials in the payload, not as a header.

## 3. Provider methods

| Stage           | SRDV method          | Purpose                                       | Maqam endpoint                             |
| --------------- | -------------------- | --------------------------------------------- | ------------------------------------------ |
| Discovery       | `Search`             | Hotel availability for a city and stay        | `POST /api/v1/hotels/search`               |
| Content         | `GetHotelInfo`       | Property details/content                      | `GET /api/v1/hotels/:hotelId?searchId=...` |
| Rate selection  | `GetHotelRoom`       | Room and rate details for a property          | internal; returned by details route        |
| Revalidation    | `BlockRoom`          | Recheck current price and cancellation policy | `POST /api/v1/hotels/recheck`              |
| Reservation     | `Book`               | Hold or voucher/confirm reservation           | internal after verified payment            |
| Supplier status | `HotelBookingDetail` | Poll a pending provider reservation           | worker/internal endpoint                   |
| Cancellation    | `HotelCancel`        | Cancel a supplier booking                     | `POST /api/v1/hotels/bookings/:id/cancel`  |

`Search`, `GetHotelInfo`, `GetHotelRoom`, `BlockRoom`, `Book`, and `HotelCancel` all require credentials in the request body. The public SRDV docs do not expose a separate `HotelBookingDetail` JSON sample in the same path, so implement pending-status polling based on SRDV booking response semantics and provider-specific support.

## 4. Search contract

### SRDV call

```http
POST {SRDV_API_BASE_HOTEL_URL}/Search
Content-Type: application/json
```

### Example request

```json
{
  "EndUserIp": "*****",
  "ClientId": "*****",
  "UserName": "*****",
  "Password": "*****",
  "CheckInDate": "2025-12-14",
  "CheckOutDate": "2025-12-15",
  "NoOfNights": "1",
  "BookingMode": "5",
  "CountryCode": "IN",
  "CityId": "725862",
  "ResultCount": "500",
  "PreferredCurrency": "INR",
  "GuestNationality": "IN",
  "RequestType": "International",
  "NoOfRooms": "1",
  "RoomGuests": [
    {
      "NoOfAdults": "1",
      "NoOfChild": "0",
      "ChildAge": []
    }
  ],
  "PreferredHotel": "",
  "MaxRating": "5",
  "MinRating": "0",
  "ReviewScore": null,
  "IsNearBySearchAllowed": false
}
```

### Example response

```json
{
  "Error": {
    "ErrorCode": 0,
    "ErrorMessage": ""
  },
  "TraceId": 34070,
  "SrdvType": "MixAPI",
  "CityId": "725862",
  "Remarks": "",
  "CheckInDate": "2025-12-14",
  "CheckOutDate": "2025-12-15",
  "PreferredCurrency": "INR",
  "NoOfRooms": [
    {
      "NoOfAdults": "1",
      "NoOfChild": "0",
      "ChildAge": []
    }
  ],
  "Results": [
    {
      "SrdvIndex": "15",
      "ResultIndex": "hsid6091731097-54085787",
      "OfferedFare": 366.18,
      "HotelCode": "hsid6091731097-54085787",
      "HotelName": "Roomshala 121 Hotel Classic",
      "HotelCategory": "HOTEL",
      "StarRating": 2,
      "HotelPicture": [
        "https://.../9b577c3e_b.jpg"
      ],
      "HotelAddress": "135/54 F/P, SARAI KALEY KHAN",
      "City": "New Delhi",
      "Country": "India",
      "Facilities": [ ... ],
      "Rooms": [ ... ],
      "Price": {
        "CurrencyCode": "INR",
        "RoomPrice": 366.18,
        "Tax": 0,
        "PublishedPrice": 366.18,
        "OfferedPrice": 366.18,
        "ServiceTax": 0,
        "TDS": 0,
        "TotalGSTAmount": 0,
        "GST": { ... }
      }
    }
  ]
}
```

### Search field notes

- `CityId` is an SRDV city identifier, not a free-text city name.
- `BookingMode`, `PreferredCurrency`, and `RequestType` must be validated against sandbox-supported values.
- `RoomGuests` must include exactly one entry per room.
- `ChildAge` is required when `NoOfChild` is greater than zero.

### Maqam public hotel search API

The Maqam public API accepts a normalized payload and maps it internally to SRDV `Search`.

```http
POST /api/v1/hotels/search
Content-Type: application/json
```

#### Valid request body

```json
{
  "cityId": "725862",
  "countryCode": "IN",
  "checkIn": "2026-08-01",
  "checkOut": "2026-08-03",
  "guestNationality": "IN",
  "currency": "INR",
  "rooms": [
    {
      "adults": 2,
      "children": 0,
      "childAges": []
    }
  ],
  "minRating": 3,
  "maxRating": 5
}
```

- `cityId`: required, SRDV city identifier.
- `countryCode`: required, 2-letter ISO country code.
- `checkIn` / `checkOut`: required, ISO8601 date strings.
- `checkIn` must be today or later.
- `checkOut` must be after `checkIn`.
- `guestNationality`: required, 2-letter ISO country code.
- `currency`: optional, 3-letter currency code.
- `rooms`: required, minimum one room.
- `rooms[].adults`: required, integer 1-8.
- `rooms[].children`: optional, integer 0-6.
- `rooms[].childAges`: optional, array length must equal `children`.
- `minRating` / `maxRating`: optional, integers 1-5.

#### Common validation errors

- `cityId` missing or empty
- `countryCode` invalid or not 2 letters
- `checkIn` / `checkOut` invalid date format
- `checkOut` not after `checkIn`
- `guestNationality` invalid or not 2 letters
- `rooms` missing or empty

### What to cache

Cache the raw SRDV search response plus normalized hotel metadata for 10–15 minutes. Store `TraceId`, `SrdvType`, `SrdvIndex`, `ResultIndex`, `HotelCode`, and the selected room/rate objects because later calls depend on them.

## 5. Hotel details and content

### Maqam public hotel details API

```http
GET /api/v1/hotels/:hotelId?searchId={searchId}
Content-Type: application/json
```

This is the actual public endpoint exposed by Maqam for hotel detail and room-rate retrieval. It does not accept an SRDV-style JSON body; it uses `searchId` from a previous search to resolve SRDV context internally.

### Example public request

```http
GET /api/v1/hotels/hsid4255550579-39676307?searchId=c4a5cbda-1758-4fb3-8646-d93dfa020825
```

### Example public response

```json
{
  "success": true,
  "message": "Hotel details",
  "data": {
    "id": "hsid8789387822-39676307",
    "name": "Hotel C Park Inn",
    "rating": 0,
    "address": "",
    "description": "",
    "imageUrls": [
      "https://i.travelapi.com/lodging/3000000/2660000/2658500/2658482/54e2e5ec_z.jpg",
      "https://i.travelapi.com/lodging/3000000/2660000/2658500/2658482/w4290h2789x85y0-4f606ab2_z.jpg"
    ],
    "currency": "INR",
    "rooms": [
      {
        "id": "8205fc1b-de0d-473c-aeed-d1d5ae7ebe11srlktsrlkthsid8789387822srlktsrlkt48cab9778a5c0c30ff1722ddb6f53e63",
        "name": "Deluxe Room",
        "board": "No meals included",
        "capacity": 2,
        "price": 4522.53,
        "totalPrice": 4522.53,
        "currency": "INR",
        "refundable": false,
        "cancellationPolicy": "Standard cancellation policy applies.",
        "srdvRoomDetails": { ... },
        "priceSnapshot": { ... }
      }
    ]
  }
}
```

> Note: The public endpoint is a Maqam wrapper. Internally, the provider performs the SRDV `GetHotelInfo` and `GetHotelRoom` calls using the cached search context.

### Internal SRDV payload for `GetHotelInfo`

```http
POST {SRDV_API_BASE_HOTEL_URL}/GetHotelInfo
Content-Type: application/json
```

```json
{
  "EndUserIp": "<from SRDV_END_USER_IP>",
  "ClientId": "<from SRDV_CLIENT_ID>",
  "UserName": "<from SRDV_USERNAME>",
  "Password": "<from SRDV_PASSWORD>",
  "TraceId": "34070",
  "SrdvType": "MixAPI",
  "SrdvIndex": "15",
  "ResultIndex": "hsid6091731097-54085787",
  "HotelCode": "hsid6091731097-54085787"
}
```

### Expected SRDV response

```json
{
  "HotelInfoResult": {
    "Error": {
      "ErrorCode": 0,
      "ErrorMessage": ""
    },
    "SrdvType": "MixAPI",
    "ResultIndex": "hsid6091731097-54085787",
    "SrdvIndex": "15",
    "TraceId": "34070",
    "HotelDetails": {
      "HotelCode": "hsid6091731097-54085787",
      "HotelName": "Roomshala 121 Hotel Classic",
      "StarRating": 2,
      "HotelURL": "",
      "Description": [ ... ],
      "HotelFacilities": [ ... ],
      "HotelPicture": [ ... ],
      "Images": [ ... ],
      "Address": "135/54 F/P, SARAI KALEY KHAN",
      "City": "New Delhi",
      "CountryName": "India",
      "Latitude": "28.59",
      "Longitude": "77.26"
    }
  }
}
```

> Important: `GetHotelInfo` is used internally by the provider before calling `GetHotelRoom`, but the public Maqam route remains `GET /api/v1/hotels/:hotelId?searchId=...`.

## 6. Hotel room contract

### SRDV call

```http
POST {SRDV_API_BASE_HOTEL_URL}/GetHotelRoom
Content-Type: application/json
```

### Example request

```json
{
  "EndUserIp": "******",
  "ClientId": "******",
  "UserName": "******",
  "Password": "******",
  "TraceId": "34070",
  "SrdvType": "MixAPI",
  "SrdvIndex": "15",
  "ResultIndex": "hsid6091731097-54085787",
  "HotelCode": "hsid6091731097-54085787"
}
```

### Example response

```json
{
  "GetHotelRoomResult": {
    "Error": {
      "ErrorCode": 0,
      "ErrorMessage": ""
    },
    "SrdvType": "MixAPI",
    "ResultIndex": "hsid6091731097-54085787",
    "SrdvIndex": "15",
    "TraceId": "34070",
    "IsPolicyPerStay": false,
    "IsUnderCancellationAllowed": false,
    "HotelRoomsDetails": [
      {
        "CategoryName": "Deluxe Double Room",
        "Rooms": [
          {
            "ChildCount": 0,
            "RequireAllPaxDetails": false,
            "RoomId": "322923705_392097973_37321##1",
            "RoomStatus": "Active",
            "RoomIndex": "45srlkt0srlkt98297868",
            "RoomTypeCode": "45_0_98297868",
            "RoomTypeName": "Deluxe Double Room-1 King Bed - Package Deal",
            "RatePlan": "322923705_392097973_37321##1",
            "RatePlanCode": "322923705_392097973_37321##1",
            "DayRates": [
              {
                "Date": "2025-12-14",
                "Amount": 366.18
              }
            ],
            "Price": {
              "CurrencyCode": "INR",
              "RoomPrice": 366.18,
              "PublishedPrice": 366.18,
              "OfferedPrice": 366.18,
              "AgentCommission": 0,
              "AgentMarkUp": 0,
              "ServiceTax": 0,
              "TotalGSTAmount": 0,
              "GST": { ... }
            },
            "CancellationPolicies": [ ... ]
          }
        ]
      }
    ],
    "RoomCombinations": { ... }
  }
}
```

### Room selection rules

- `GetHotelRoom` is the source of room/rate details and cancellation policy.
- Preserve exact fields from the response for later `BlockRoom` and `Book` calls.
- `RoomId`, `RoomIndex`, `RatePlan`, `RatePlanCode`, `DayRates`, and `Price` must be kept intact.
- `RoomCombinations` may be required for multi-room configurations.

## 7. BlockRoom contract

### SRDV call

```http
POST {SRDV_API_BASE_HOTEL_URL}/BlockRoom
Content-Type: application/json
```

### Example request

```json
{
  "EndUserIp": "*******",
  "ClientId": "*******",
  "UserName": "*******",
  "Password": "*******",
  "TraceId": 34072,
  "SrdvType": "MixAPI",
  "SrdvIndex": "15",
  "ResultIndex": "hsid2053730133-50350635",
  "HotelCode": "hsid2053730133-50350635",
  "HotelName": "Frazyone Hostel",
  "GuestNationality": "IN",
  "NoOfRooms": "1",
  "ClientReferenceNo": 0,
  "IsVoucherBooking": true,
  "HotelRoomsDetails": [
    {
      "ChildCount": 0,
      "RequireAllPaxDetails": false,
      "RoomId": "327387346_404514396_39983##1",
      "RoomStatus": "Active",
      "RoomIndex": "45srlkt0srlkt120699711",
      "RoomTypeCode": "45_0_120699711",
      "RoomTypeName": "Deluxe Double Room-1 King Bed - Package Deal",
      "RatePlan": "327387346_404514396_39983##1",
      "RatePlanCode": "327387346_404514396_39983##1",
      "DayRates": [
        {
          "Amount": 575.2,
          "Date": "2025-12-14"
        }
      ],
      "Price": { ... },
      "HotelPassenger": [ ... ],
      "CancellationPolicies": [ ... ]
    }
  ]
}
```

### Example response

```json
{
  "BlockRoomResult": {
    "Error": {
      "ErrorCode": 0,
      "ErrorMessage": ""
    },
    "AvailabilityType": "Confirm",
    "TraceId": 34072,
    "ResponseStatus": 1,
    "GSTAllowed": false,
    "IsPackageDetailsMandatory": false,
    "IsPackageFare": false,
    "IsPriceChanged": false,
    "IsCancellationPolicyChanged": false,
    "IsHotelPolicyChanged": false,
    "HotelName": "Frazyone Hostel",
    "AddressLine1": "2/86A",
    ...
  }
}
```

### Revalidation rules

- `BlockRoom` is the mandatory price/policy checkpoint before payment.
- If `IsPriceChanged: true` or `IsCancellationPolicyChanged: true`, do not continue to payment or `Book` without sending the updated details to the customer.
- Store the `BlockRoomResult` snapshot immutably in the booking context.
- Reuse all source fields from the original search and selected room payload, including `RoomId`, `RoomIndex`, `RatePlanCode`, `DayRates`, and `Price`.

## 8. Booking with Book

### SRDV call

```http
POST {SRDV_API_BASE_HOTEL_URL}/Book
Content-Type: application/json
```

### Example request

```json
{
  "EndUserIp": "******",
  "ClientId": "******",
  "UserName": "******",
  "Password": "******",
  "TraceId": 34072,
  "SrdvType": "MixAPI",
  "SrdvIndex": "15",
  "ResultIndex": "hsid2053730133-50350635",
  "HotelCode": "hsid2053730133-50350635",
  "HotelName": "Frazyone Hostel",
  "GuestNationality": "IN",
  "NoOfRooms": "1",
  "ClientReferenceNo": 0,
  "IsVoucherBooking": true,
  "HotelRoomsDetails": [
    {
      "ChildCount": 0,
      "RequireAllPaxDetails": false,
      "RoomId": "327387346_404514396_39983##1",
      "RoomStatus": "Active",
      "RoomIndex": "45srlkt0srlkt120699711",
      "RoomTypeCode": "45_0_120699711",
      "RoomTypeName": "Deluxe Double Room-1 King Bed - Package Deal",
      "RatePlan": "327387346_404514396_39983##1",
      "RatePlanCode": "327387346_404514396_39983##1",
      "DayRates": [ ... ],
      "Price": { ... },
      "HotelPassenger": [
        {
          "Title": "Mr",
          "FirstName": "MD Rana",
          "LastName": "HASAN",
          "Phoneno": "1234567899",
          "Email": "example@gmail.com",
          "PaxType": "1",
          "LeadPassenger": true,
          "PassportNo": null,
          "PAN": "EXVPR5555M",
          "GSTCompanyName": "Test company",
          "GSTNumber": "09XXXXXXXXXZ3"
        }
      ],
      "CancellationPolicies": [ ... ]
    }
  ]
}
```

### Example response

```json
{
  "BookResult": {
    "Error": {
      "ErrorCode": 0,
      "ErrorMessage": ""
    },
    "VoucherStatus": true,
    "ResponseStatus": 1,
    "TraceId": 34072,
    "Status": "Confirmed",
    "HotelBookingStatus": "Confirmed",
    "InvoiceNumber": "",
    "ConfirmationNo": "TJS206501794071",
    "BookingRefNo": "TJS206501794071",
    "BookingId": 685,
    "IsPriceChanged": false,
    "IsCancellationPolicyChanged": false
  }
}
```

### Booking outcomes

| SRDV condition                      | Maqam action                                                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `IsPriceChanged: true`              | Do not finalize booking; return revised price and require customer approval.                                    |
| `IsCancellationPolicyChanged: true` | Do not finalize silently; return revised policy and require customer approval.                                  |
| `HotelBookingStatus: Confirmed`     | Persist provider IDs, confirmation number, booking reference, invoice number, and voucher data. Mark confirmed. |
| `HotelBookingStatus: Pending`       | Mark provider pending and poll SRDV for final status.                                                           |
| Book failure                        | Mark provider failure and invoke payment recovery/refund workflow.                                              |

> Important: Payment success is not enough for hotel bookings. For `bookingType === 'hotel'`, confirm via SRDV `Book` before marking the master booking confirmed.

## 9. Price-change / policy-change flow

To change price or policy in one flow:

1. Search hotel availability.
2. Retrieve `GetHotelInfo` for property metadata.
3. Retrieve `GetHotelRoom` for room/rate and cancellation details.
4. Call `BlockRoom` immediately before payment to revalidate the selected room/rate.
5. If `BlockRoom` returns `IsPriceChanged: true` or `IsCancellationPolicyChanged: true`, do not proceed.
6. Present the new price/policy to the customer and allow them to accept or choose a different room.
7. After customer approval and payment verification, send `Book` with the immutable `BlockRoom`-validated payload.
8. If `Book` still reports a change or pending status, follow SRDV's provider confirmation behavior.

### Why this matters

- `Search` is discovery only; prices are not final.
- `GetHotelRoom` provides the full room/pricing/cancellation payload.
- `BlockRoom` is the current price/policy checkpoint before payment.
- `Book` is the final provider reservation step and may still change price or policy.

## 10. Hotel cancel contract

### SRDV call

```http
POST {SRDV_API_BASE_HOTEL_URL}/HotelCancel
Content-Type: application/json
```

### Example request

```json
{
  "BookingId": "XXXX",
  "RequestType": "4",
  "BookingMode": "5",
  "Remarks": "XXXX",
  "SrdvType": "SingleTB",
  "SrdvIndex": "SrdvTB",
  "EndUserIp": "1.1.1.1",
  "ClientId": "XXXX",
  "UserName": "XXXX",
  "Password": "XXXX"
}
```

### Example response

```json
{
  "Error": {
    "ErrorCode": "0",
    "ErrorMessage": ""
  },
  "ResponseStatus": 1,
  "SrdvType": "SingleTB",
  "SrdvIndex": "SrdvTB",
  "TraceId": "XXXX",
  "ChangeRequestId": "XXXX",
  "ChangeRequestStatus": 3
}
```

## 11. Project changes and verification

Important implementation notes for Maqam:

1. Use `POST /api/v1/hotels/search` for search because the payload is in the request body.
2. Normalize and cache SRDV search context, including `TraceId`, `SrdvType`, `SrdvIndex`, and `ResultIndex`.
3. Call `GetHotelInfo` before `GetHotelRoom` when loading hotel details to satisfy SRDV's content flow.
4. Preserve the exact `GetHotelRoom` response payload for later `BlockRoom` and `Book` requests.
5. Revalidate with `BlockRoom` before creating a payment order.
6. Do not mark hotel bookings confirmed until `Book` returns a confirmed provider status.
7. Add test coverage for price change, cancellation policy change, pending provider booking, duplicate payment callback, `Book` failure after payment, and cancellation.
8. If `HotelBookingDetail` documentation is not present publicly, implement pending-status polling using SRDV support or the provider's supplier status mechanism.

## 12. Items to verify in SRDV's Postman collection/sandbox

- Values permitted for `BookingMode`, `PreferredCurrency`, and `RequestType`.
- Exact payloads and paths for `GetHotelInfo`, `GetHotelRoom`, `BlockRoom`, `HotelBookingDetail`, and `HotelCancel`.
- Whether `IsVoucherBooking: false` creates a hold that later needs a separate voucher API call, and its expiry.
- How a voucher or final supplier confirmation document is returned.
- Whether HotelBookingDetail supports a safe polling window and whether SRDV sends callbacks.
- Supplier cancellation quote, cancellation response, refund processing, and no-show behavior.
- Whether all `HotelRoomsDetails` fields must be echoed exactly from HotelRoom/BlockRoom responses.
- Test and live credential/whitelist requirements for `EndUserIp`.

## Sources

- [SRDV Hotel Search v8](https://www.srdvtechnologies.com/doc/hotel/v8/search)
- [SRDV Hotel Book v8](https://www.srdvtechnologies.com/doc/hotel/v8/book)
- [SRDV Hotel API Postman collection](https://documenter.getpostman.com/view/27850097/2sB2j1iCbF)
- [SRDV live endpoint FAQ](https://www.srdvtechnologies.com/faq/api/common-query/what-are-the-endpoint-urls-for-the-flight-hotel-bus-and-car-live-apis)
