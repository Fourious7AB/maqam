---
sidebar_position: 9
---

# Contributing & Coding Standards

This document describes coding standards, Swagger documentation conventions, and the Git workflow required for developers working on the MaqamTravels codebase.

## Coding Standards (SOLID & Clean Code)

1. **Separation of Concerns:** Keep routing separate from controller parsing, business logic, and schema definitions.
2. **Model Safety:** Never access Mongoose models directly inside controllers. Always fetch and write records inside `*service.js` files.
3. **Fail-Fast validation:** Use `express-validator` chains to intercept requests early. Controllers should expect clean, verified payloads.
4. **Consistency:** Always use the `apiResponse` helper utilities to structure payloads. Never write `res.status().json()` with custom layouts.

---

## Documentation Guidelines for the Team

### 1. Document as You Write Code
When creating or modifying an API endpoint, you **must** update its JSDoc documentation inline in the routing file (`*.routes.js`) in the same pull request.

### 2. Route Documentation Structure
Every endpoint JSDoc block must contain:
* **`tags`:** Match the specific business domain (e.g. `Authentication`, `Bookings`, `Flights`).
* **`summary`:** Short action phrase.
* **`description`:** Detail requirements, token scopes, and background tasks (like email dispatches or payment timeouts).
* **`security`:** If the route requires token verification, define:
  ```yaml
  security:
    - BearerAuth: []
  ```
* **`requestBody` or `parameters`:** Link to reusable schemas or query specifications.
* **`responses`:** Link to standardized success envelopes and reusable HTTP error components.

### 3. Reusable Component Rules
* If a data schema represents a model (e.g. Flight payload, Booking order), add it to `swagger/components/schemas/` instead of writing it inline.
* Reference common errors via `$ref: '#/components/responses/<ErrorName>'` (e.g. `ValidationError`, `Unauthorized`, `Forbidden`, `NotFound`).

---

## Recommended Git Workflow for Documentation

To ensure code and documentation remain synchronized, we follow a strict branching and review process:

```
                  +--------------------------------+
                  |         Main / Master          |
                  +--------------------------------+
                                  |
                           (Create Feature Branch)
                                  v
                  +--------------------------------+
                  |    feature/booking-engine      |
                  |                                |
                  |  * Write API Code              |
                  |  * Update Route JSDoc          |
                  |  * Edit Docusaurus (if needed) |
                  +--------------------------------+
                                  |
                         (Run local builds)
                                  v
                  +--------------------------------+
                  |    Local verification passes   |
                  +--------------------------------+
                                  |
                       (Create Pull Request)
                                  v
                  +--------------------------------+
                  |   GitHub Actions CI Checks     |
                  |   (Runs build checks)          |
                  +--------------------------------+
                                  |
                       (Review & Merge Approval)
                                  v
                  +--------------------------------+
                  |         Main / Master          |
                  +--------------------------------+
```

### 1. Branch Strategy
* Create feature branches off `main`: `feature/your-feature-name`.
* Include both code modifications and documentation updates in the **same commits**.

### 2. Local Verification Checklist
Before committing and pushing changes:
1. Verify the Express app starts without JSDoc parse errors.
2. Build the Docusaurus site locally to test for broken references:
   ```bash
   cd documentation
   npm run build
   ```

### 3. CI/CD Integration
Our GitHub Actions pipeline automatically validates commits:
* **Linter Check:** Runs code linting.
* **Documentation Build:** Runs `npm run build` on the Docusaurus project. If there are broken markdown links or compilation errors, the CI job fails, preventing merge.
