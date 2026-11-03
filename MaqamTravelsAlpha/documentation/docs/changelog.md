---
sidebar_position: 10
---

# Changelog

All notable changes to the MaqamTravels documentation and API platform will be documented in this file.

## [1.0.0] - 2026-07-13

### Added
- Integrated Swagger (OpenAPI 3.0) documentation engine using `swagger-jsdoc` and `swagger-ui-express`.
- Added reusable swagger schemas under `swagger/components/schemas/` for `SuccessEnvelope`, `ErrorEnvelope`, and auth payload records.
- Added modular HTTP error responses under `swagger/components/responses/` for status codes `400`, `401`, `403`, `404`, `409`, `422`, and `500`.
- Documented `auth` routes endpoints (`/avatar-options`, `/register`, `/login`, `/refresh-token`, `/logout`, `/forgot-password`, `/reset-password`).
- Set up Docusaurus project under the `documentation/` directory, detailing request routing flows, deployments, RBAC rules, webhooks, and payment components.
- Added direct Swagger UI links to the Docusaurus site navigation setup.
