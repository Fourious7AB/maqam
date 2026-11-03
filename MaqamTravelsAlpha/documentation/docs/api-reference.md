---
sidebar_position: 7
---

# API Reference and OpenAPI Coverage

The interactive API reference is served by the backend:

- Local: `http://localhost:5000/api/docs`
- Raw OpenAPI JSON: `http://localhost:5000/api/docs.json`

Swagger is generated from JSDoc annotations in route files plus reusable YAML components under `swagger/components/`. It is the intended API contract, but it is not yet complete.

## Current coverage

The generated specification currently contains 11 paths:

| Area | Documented paths |
| --- | ---: |
| Health | 1 |
| Authentication | 7 |
| Flights | 3 |
| Hotels, account, bookings, tours, packages, payments, CMS, CRM | 0 |

The following mounted route groups exist in the application but are absent from the OpenAPI document: `/api/v1/hotels`, `/account`, `/bookings`, `/tours`, `/packages`, `/payments`, `/cms`, and the configurable CRM prefix. Payment webhooks are also not documented.

Do not use Swagger alone to conclude that an undocumented endpoint does not exist. Conversely, do not publish an endpoint as supported merely because a route is registered: its provider integration and business flow must be complete.

## Authentication

The API has a global Bearer JWT security requirement. Routes that are intentionally public must explicitly set `security: []` in their OpenAPI block. Authenticated requests use:

```http
Authorization: Bearer <access-token>
```

The login and refresh-token flows also use an HttpOnly refresh-token cookie. Cross-origin clients must send credentials only from an allowed origin.

## Response conventions

Controllers generally use the helpers in `utils/apiResponse.js`. New OpenAPI responses should describe the actual success/error envelope used by the controller, including validation failures, authentication errors, ownership/permission errors, provider failures, and rate-limit responses.

## Adding a route to Swagger

1. Add an `@openapi` block directly above the route declaration.
2. Use the final mounted path, for example `/api/v1/hotels/search`, not a router-relative path.
3. Declare every request parameter and body field enforced by the validator.
4. Mark authentication accurately and reference `BearerAuth` for protected routes.
5. Reuse shared schemas where they fit; add a module schema when they do not.
6. Add success and realistic failure responses.
7. Verify the generated `/api/docs.json` and the Swagger UI.
8. Add an automated assertion that the path is present in the generated specification.

## Priority for the hotel work

Before implementing a hotel booking endpoint, document and test the search request, the provider-normalized hotel/rate response, revalidation/hold semantics, reservation request, cancellation policy, and the final booking/voucher response. See [Hotels Module](./modules/hotels.md) for the proposed implementation order.
