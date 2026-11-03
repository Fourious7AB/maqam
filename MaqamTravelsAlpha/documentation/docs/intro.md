---
sidebar_position: 1
slug: /
---

# Introduction

Welcome to the **MaqamTravels** Backend Developer Documentation. This documentation portal provides architecture specifications, deployment guides, database schemas, coding standards, and interactive API references for our production-grade travel booking engine.

## Platform Overview

MaqamTravels is an enterprise-scale travel booking platform designed to orchestrate and manage travel services, specifically tailored for:
* **Flights:** Searching, pricing quotes, and ticketing via GDS integrations.
* **Hotels:** Room availability, rates, bookings, and third-party aggregator sync.
* **Tours & Packages:** Custom itineraries, booking workflows, and resource allocation.
* **Bookings Management:** Comprehensive state transitions (pending, paid, ticketed, cancelled).
* **Payment Gateways:** Integrations with Razorpay, PayPal, and PhonePe with asynchronous webhook processing.
* **CRM & Ops:** Operational back-office control panels for sales and support agents.

---

## Technical Stack

The backend application is designed for performance, security, and scalability using the following stack:

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime** | Node.js | Non-blocking I/O event-driven core |
| **Framework** | Express.js | Robust routing engine and middleware integration |
| **Database** | MongoDB | High-performance document store for flexible cataloging |
| **ODM** | Mongoose | Strict schema validation and active-record mapping |
| **Security** | JSON Web Tokens (JWT) | Access/Refresh token security paradigm |
| **Documentation** | OpenAPI 3 & Docusaurus | Dual-layer reference and developer portal |

---

## Architectural Principles

1. **Modular Design:** Each domain feature (Auth, Hotels, Flights, Bookings) resides inside its own self-contained module. Modules do not share controllers or routes directly, and communicate through explicit services.
2. **SOLID Compliant:** High cohesion and loose coupling. Business logic is strictly separated from HTTP parsing controllers.
3. **Fail-Safe Webhooks:** Webhooks bypass rate limiters, preserve raw request bodies for security sign verification, and are decoupled from user session states.
4. **Resilient Error Handling:** Centralized middleware catches cast, validation, JWT, and network exceptions, returning structured envelopes to the client.
