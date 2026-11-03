---
sidebar_position: 4
---

# Folder Structure

The MaqamTravels backend project utilizes a modular codebase architecture. All business domains are partitioned into self-contained modules. This allows multiple teams to work concurrently on different services (e.g. Flights vs Hotels) with minimal merge conflicts.

## Root Directory Layout

```
maqam-travels-server/
├── config/              # Global system configurations (database, logger, providers)
├── middleware/          # Express global middlewares (auth, validation, error handler)
├── modules/             # Business modules containing core domain logic
│   ├── account/         # User profile and account management
│   ├── auth/            # Authentication, token generation, password resets
│   ├── bookings/        # Booking state lifecycle (Flights/Hotels order execution)
│   ├── cms/             # Content Management System (static pages, faqs, blogs)
│   ├── crm/             # Operational tools, customer relations, administrative CRM
│   ├── flights/         # Flight search, fare quoting, and reservation
│   ├── hotels/          # Hotel search, rates, and booking aggregations
│   ├── notifications/   # Email, SMS, push notifications workers
│   ├── packages/        # Travel package combinations
│   ├── payments/        # Gateway processors and capture callbacks
│   └── tours/           # Local activities and tours management
├── providers/           # Third-party GDS, payment, and aggregator SDK wrapper setups
├── scripts/             # Data seeders and automation utilities
├── swagger/             # Swagger OpenAPI 3.0 reusable component definitions
├── tests/               # Unit, integration, and performance tests
├── utils/               # Shared helper functions (formatters, logger instance, apiResponse)
├── webhook/             # Third-party notification listener endpoints
├── app.js               # Application middleware and route bootstrapping
└── server.js            # Node HTTP server execution and database bootstrap
```

---

## Module Folder Layout

Every folder under `modules/` follows a strict pattern to ensure separation of concerns:

```
modules/auth/
├── auth.model.js        # Mongoose Schema definition
├── auth.controller.js   # HTTP Request/Response parser (no business logic)
├── auth.service.js      # Business and database logic processing
├── auth.routes.js       # Express route mounting and middleware chaining
└── auth.validator.js    # Field validations using express-validator
```

### Purpose of Each Layer

1. **`*.model.js`:**
   * Defines Mongoose schemas, types, validations, hooks, and database indices.
   * **Rule:** Contain database mapping only. Do not parse HTTP requests or process gateway payments here.

2. **`*.routes.js`:**
   * Declares Express endpoints, maps routes to controllers, and applies route-level middleware (such as `authenticate`, `authorize`, `validate`).
   * **Rule:** All routes must contain comprehensive JSDoc OpenAPI blocks.

3. **`*.validator.js`:**
   * Declares validation chains using `express-validator` (e.g. email patterns, password complexity, dates consistency).
   * Passed to `validate` middleware in routes to intercept invalid payloads.

4. **`*.controller.js`:**
   * Parses query parameters, path variables, and body values.
   * Invokes appropriate services.
   * Formats output using `apiResponse` utility helpers (`sendSuccess`, `sendCreated`, `sendError`).
   * **Rule:** Do not query Mongoose models directly inside controllers; delegate to services.

5. **`*.service.js`:**
   * Contains the core business logic, makes external GDS calls, reads/writes to databases, and handles payment calculations.
   * **Rule:** Services should be framework-independent and should not accept or return Express request/response objects.
