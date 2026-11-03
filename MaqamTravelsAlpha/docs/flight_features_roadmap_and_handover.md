# ✈️ Flight Module: Complete Handover & Implementation Roadmap

> **Purpose:** Single source of truth for the Flight module status, worker modularization, and feature implementations.

---

## 1. What Is Completed & Verified ✅

| Component | Files Modified / Created | Status |
|---|---|---|
| **Flight Refund Model** | [flightRefund.model.js](file:///d:/Arun-Shaw/TravelAgency/server/modules/flights/flightRefund.model.js) | ✅ Tracks `totalBookingAmount`, `airlinePenalty`, `agencyFee` (markup), net `customerRefundAmount`, `changeRequests[]`, `supplierRefundReference`, and gateway refund IDs. |
| **Dynamic Markup** | [flight.service.js](file:///d:/Arun-Shaw/TravelAgency/server/modules/flights/flight.service.js) | ✅ Reads `process.env.FLIGHT_MARKUP_PERCENT || '10'` dynamically across Search, FareQuote, Booking, and Calendar. |
| **Cancellation & Refund Service** | [flight.service.js](file:///d:/Arun-Shaw/TravelAgency/server/modules/flights/flight.service.js) | ✅ `cancelFlightBookingService`, `sendFlightChangeRequestService`, `getCancelStatusService`, `getCancellationChargesService`, `getFlightRefundService`, `getFlightBookingByIdService`, `getUserFlightBookingsService`. |
| **Flight Routes & Controller** | [flight.routes.js](file:///d:/Arun-Shaw/TravelAgency/server/modules/flights/flight.routes.js), [flight.controller.js](file:///d:/Arun-Shaw/TravelAgency/server/modules/flights/flight.controller.js) | ✅ `POST /bookings/:id/cancel`, `POST /bookings/:id/change-request`, `GET/POST /bookings/:id/cancellation-charges`, `GET /bookings/:id/cancel-status`, `GET /change-requests/:id/status`, `GET /bookings/:id/refund`, `GET /bookings/:id`, `GET /bookings`. |
| **STEP 1: SRDV Booking Callback Webhook** | [flight.routes.js](file:///d:/Arun-Shaw/TravelAgency/server/modules/flights/flight.routes.js), [flight.controller.js](file:///d:/Arun-Shaw/TravelAgency/server/modules/flights/flight.controller.js), [flight.service.js](file:///d:/Arun-Shaw/TravelAgency/server/modules/flights/flight.service.js) | ✅ `POST /api/v1/flights/callback` verifies credentials, updates ticket numbers on `Success`, and triggers 100% full auto-refund on `Failed`/`Aborted`. |
| **STEP 2: GDS Ticketing BullMQ Worker + Outbox** | [flight-ticket-gds.worker.js](file:///d:/Arun-Shaw/TravelAgency/server/workers/flights/flight-ticket-gds.worker.js), [bookingSync.js](file:///d:/Arun-Shaw/TravelAgency/server/modules/payments/bookingSync.js), [flight.constants.js](file:///d:/Arun-Shaw/TravelAgency/server/modules/flights/flight.constants.js) | ✅ Decouples `POST /TicketGDS` from payment capture via `flight-ticket-gds` queue, with distributed locking, 3-attempt exponential backoff retry, and `OutboxEvent` logging. |
| **Shared Outbox Event Model** | [outbox-event.model.js](file:///d:/Arun-Shaw/TravelAgency/server/modules/shared/outbox-event.model.js) | ✅ Shared transactional outbox model centralized in `modules/shared/` for Hotels, Flights, and Packages. |
| **STEP 3: SRDV GetCancellationCharges** | [srdv.client.js](file:///d:/Arun-Shaw/TravelAgency/server/providers/srdv/srdv.client.js), [srdv.adapter.js](file:///d:/Arun-Shaw/TravelAgency/server/providers/srdv/srdv.adapter.js), [flight.service.js](file:///d:/Arun-Shaw/TravelAgency/server/modules/flights/flight.service.js), [flight.routes.js](file:///d:/Arun-Shaw/TravelAgency/server/modules/flights/flight.routes.js) | ✅ `GET/POST /api/v1/flights/bookings/:id/cancellation-charges` calls SRDV `POST /GetCancellationCharges` and returns complete financial quote ($\text{Total} - \text{Airline Penalty} - \text{Agency Fee} = \text{Customer Refund}$). |
| **STEP 3: SRDV SendChangeRequest (Cancellation Submission)** | [srdv.client.js](file:///d:/Arun-Shaw/TravelAgency/server/providers/srdv/srdv.client.js), [srdv.adapter.js](file:///d:/Arun-Shaw/TravelAgency/server/providers/srdv/srdv.adapter.js), [flight.service.js](file:///d:/Arun-Shaw/TravelAgency/server/modules/flights/flight.service.js), [flight.routes.js](file:///d:/Arun-Shaw/TravelAgency/server/modules/flights/flight.routes.js) | ✅ `POST /SendChangeRequest` submits individual per-passenger cancellation tickets to SRDV, records `changeRequests[]` in `FlightRefund`, triggers PayPal/Razorpay gateway refund, and updates booking status to `cancelled`. |
| **STEP 3: SRDV GetCancelStatus (Cancellation & Refund Polling)** | [srdv.client.js](file:///d:/Arun-Shaw/TravelAgency/server/providers/srdv/srdv.client.js), [srdv.adapter.js](file:///d:/Arun-Shaw/TravelAgency/server/providers/srdv/srdv.adapter.js), [flight.service.js](file:///d:/Arun-Shaw/TravelAgency/server/modules/flights/flight.service.js), [flight.routes.js](file:///d:/Arun-Shaw/TravelAgency/server/modules/flights/flight.routes.js) | ✅ `POST /GetCancelStatus` checks cancellation & refund progress from SRDV/Airline, syncs live supplier status & refund amounts to MongoDB `FlightRefund`, and returns unified status. |
| **STEP 4: Full End-to-End Orchestration** | [flight.service.js](file:///d:/Arun-Shaw/TravelAgency/server/modules/flights/flight.service.js), [bookingSync.js](file:///d:/Arun-Shaw/TravelAgency/server/modules/payments/bookingSync.js) | ✅ Complete flight lifecycle: Search $\rightarrow$ Quote $\rightarrow$ Hold/Book $\rightarrow$ Payment Capture $\rightarrow$ GDS Worker Ticket Issuance $\rightarrow$ Cancellation Quote $\rightarrow$ Change Request $\rightarrow$ Payment Gateway Refund $\rightarrow$ Supplier Status Sync. |
| **Automated Integration Tests** | [test-flight-cancel-status.js](file:///d:/Arun-Shaw/TravelAgency/server/scripts/test-flight-cancel-status.js), [test-flight-change-request.js](file:///d:/Arun-Shaw/TravelAgency/server/scripts/test-flight-change-request.js), [test-flight-cancellation-charges.js](file:///d:/Arun-Shaw/TravelAgency/server/scripts/test-flight-cancellation-charges.js), [test-flight-gds-worker.js](file:///d:/Arun-Shaw/TravelAgency/server/scripts/test-flight-gds-worker.js), [test-flight-refund.js](file:///d:/Arun-Shaw/TravelAgency/server/scripts/test-flight-refund.js) | ✅ All test suites pass (100% green). |

---

## 2. Modular Worker Architecture

```text
server/workers/
├── index.js                          (Central bootloader: startAllWorkers / stopAllWorkers)
│
├── hotels/
│   ├── hotel-book.worker.js          (Queue: hotel-book)
│   ├── hotel-poll-status.worker.js   (Queue: hotel-poll-status)
│   └── hotel-booking-status.worker.js (Periodic / Admin sweeper)
│
├── flights/
│   └── flight-ticket-gds.worker.js   (Queue: flight-ticket-gds)
│
└── packages/
    └── stock-expiration.worker.js    (5-min timer: cleans unpaid held stock)
```
