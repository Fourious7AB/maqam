# SRDV Hotel API Full Flow

> This document describes the Maqam public hotel flow and the internal SRDV provider contract from search through booking cancellation.
> Use this as the authoritative reference for the hotel module API contracts.

---

## 1. Public API Flow (Maqam Server Endpoints)

All public endpoints are relative to `http://localhost:5000/api/v1/`.

### 1.1 Search Hotels

Find hotels based on location, dates, and guests.

* **Endpoint:** `POST /hotels/search`
* **Auth:** Optional
* **Minimum Payload:**

  ```json
  {
    "cityName": "Mumbai",
    "checkIn": "2026-08-01",
    "checkOut": "2026-08-03",
    "rooms": [
      {
        "adults": 2,
        "children": 0,
        "childAges": []
      }
    ]
  }
  ```

* **Response (Success):** Returns a list of matches and a `searchId`.

### 1.2 Get Hotel Details & Room Options

Fetch room rates for a selected hotel.

* **Endpoint:** `GET /hotels/:hotelId?searchId=:searchId`
* **Auth:** Optional
* **No body required.**
* **Response (Success):** Returns the room rates snapshot array (`rooms`).

### 1.3 Recheck Room Rates before Booking

Locks the rate and checks cancellation policies.

* **Endpoint:** `POST /hotels/recheck`
* **Auth:** Optional
* **Minimum Payload:**

  ```json
  {
    "searchId": "c4a5cbda-1758-4fb3-8646-d93dfa020825",
    "hotelId": "hsid5358235747-72258311",
    "selectedRooms": [
      {
        "roomId": "3ed562bf-346f-4570-8737-bd6d557f254dsrlktsrlkthsid5358235747srlktsrlkt3fb3f83f5381bfbd31b7a84a44ae29c9",
        "quantity": 1
      }
    ]
  }
  ```

* **Response (Success):** Returns `recheckId` and room snapshots.

### 1.4 Create Booking

Initiates a booking awaiting payment.

* **Endpoint:** `POST /hotels/bookings`
* **Auth:** Required (`Authorization: Bearer <token>`, `Idempotency-Key: <key>`)
* **Minimum Payload:**

  ```json
  {
    "recheckId": "8b929920-c04a-4dcb-8326-9c6e9b8d0155",
    "acceptChanges": true,
    "guests": [
      {
        "title": "Mr",
        "firstName": "Bhushan",
        "lastName": "Developer",
        "type": "adult",
        "email": "example@gmail.com",
        "phone": "8294507785"
      }
    ]
  }
  ```

* **Response (Success):** Returns the booking details with status `awaiting_payment`.

### 1.5 Cancel Booking

Cancels a confirmed booking.

* **Endpoint:** `POST /hotels/bookings/:bookingId/cancel`
* **Auth:** Required (`Authorization: Bearer <token>`, `Idempotency-Key: <key>`)
* **No body required.**
* **Response (Success):** Returns status `cancelled` and the penalty amount.

---

## 2. Internal SRDV API Flow (Provider Adapter Endpoints)

All requests to the SRDV Hotel API expect these credentials at the root of the JSON body:

```json
{
  "ClientId": "your_client_id",
  "UserName": "your_username",
  "Password": "your_password",
  "EndUserIp": "1.1.1.1"
}
```

### 2.1 `/Search` (Search Hotels)

Queries hotels from the SRDV sandbox/live pool.

* **Endpoint:** `POST {SRDV_HOTEL_BASE_URL}/Search`
* **Minimum Payload:**

  ```json
  {
    "BookingMode": 5,
    "CheckInDate": "2026-08-01",
    "NoOfNights": 2,
    "CountryCode": "IN",
    "CityId": 180303,
    "PreferredCurrency": "INR",
    "GuestNationality": "IN",
    "NoOfRooms": 1,
    "RoomGuests": [
      {
        "NoOfAdults": 2,
        "NoOfChild": 0,
        "ChildAge": []
      }
    ],
    "MinRating": 1,
    "MaxRating": 5
  }
  ```

### 2.2 `/GetHotelRoom` (Get Room Info)

Retrieves rooms and rates.

* **Endpoint:** `POST {SRDV_HOTEL_BASE_URL}/GetHotelRoom`
* **Minimum Payload:**

  ```json
  {
    "SrdvType": "MixAPI",
    "SrdvIndex": 15,
    "TraceId": "52659",
    "ResultIndex": "hsid5358235747-72258311",
    "HotelCode": "hsid5358235747-72258311"
  }
  ```

### 2.3 `/GetHotelInfo` (Get Hotel Description/Images)

Fetches rich descriptions, ratings, and media files.

* **Endpoint:** `POST {SRDV_HOTEL_BASE_URL}/GetHotelInfo`
* **Minimum Payload:**

  ```json
  {
    "SrdvType": "MixAPI",
    "SrdvIndex": 15,
    "TraceId": "52659",
    "ResultIndex": "hsid5358235747-72258311",
    "HotelCode": "hsid5358235747-72258311"
  }
  ```

### 2.4 `/BlockRoom` (Block Room Rate)

Validates and locks the room rate for booking (expires in 5–10 mins).

* **Endpoint:** `POST {SRDV_HOTEL_BASE_URL}/BlockRoom`
* **Minimum Payload:**

  ```json
  {
    "SrdvType": "MixAPI",
    "SrdvIndex": 15,
    "TraceId": "52659",
    "ResultIndex": "hsid5358235747-72258311",
    "HotelCode": "hsid5358235747-72258311",
    "HotelName": "Hotel M M Homestay Howrah",
    "HotelRoomsDetails": [
      {
        "RoomId": "VT254147218_0",
        "RoomTypeCode": 1,
        "RoomTypeName": "Deluxe Double Room, Air conditioning",
        "RatePlanCode": "VT254147218_0",
        "Price": {
          "CurrencyCode": "INR",
          "RoomPrice": 4018.1,
          "PublishedPrice": 4018.1,
          "OfferedPrice": 4018.1
        }
      }
    ]
  }
  ```

### 2.5 `/Book` (Confirm Reservation)

Submits guests to confirm a booking (requires active `/BlockRoom` session).

* **Endpoint:** `POST {SRDV_HOTEL_BASE_URL}/Book`
* **Minimum Payload:**

  ```json
  {
    "SrdvType": "MixAPI",
    "SrdvIndex": 15,
    "TraceId": "52659",
    "ResultIndex": "hsid5358235747-72258311",
    "HotelCode": "hsid5358235747-72258311",
    "HotelName": "Hotel M M Homestay Howrah",
    "IsVoucherBooking": true,
    "HotelRoomsDetails": [
      {
        "RoomId": "VT254147218_0",
        "RoomTypeCode": 1,
        "RoomTypeName": "Deluxe Double Room, Air conditioning",
        "RatePlanCode": "VT254147218_0",
        "Price": {
          "CurrencyCode": "INR",
          "RoomPrice": 4018.1,
          "PublishedPrice": 4018.1,
          "OfferedPrice": 4018.1
        }
      }
    ],
    "HotelPassenger": [
      {
        "Title": "Mr",
        "FirstName": "Bhushan",
        "LastName": "Developer",
        "Phoneno": "8294507785",
        "Email": "example@gmail.com",
        "PaxType": 1,
        "LeadPassenger": 1,
        "Age": 30
      }
    ]
  }
  ```

### 2.6 `/HotelBookingDetail` (Reconcile / Poll Status)

Fetches booking confirmation or voucher status details.

* **Endpoint:** `POST {SRDV_HOTEL_BASE_URL}/HotelBookingDetail`
* **Minimum Payload:**

  ```json
  {
    "BookingId": 123456,
    "BookingRefNo": "BK-REF-NO-7890"
  }
  ```

### 2.7 `/HotelCancel` (Cancel Booking)

Issues cancellation.

* **Endpoint:** `POST {SRDV_HOTEL_BASE_URL}/HotelCancel`
* **Minimum Payload:**

  ```json
  {
    "BookingId": 123456,
    "BookingRefNo": "BK-REF-NO-7890",
    "CancelRequestType": 3
  }
  ```
