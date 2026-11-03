---
sidebar_position: 8
---

# FAQ

Frequently asked questions for backend engineers working on the MaqamTravels platform.

### 1. Why are my local changes to Swagger schemas not showing up?
Ensure the backend server has restarted. If using `npm run dev`, nodemon should automatically monitor files and trigger a restart. If you created a new YAML component file under `swagger/components`, verify that the glob patterns in `swagger/swagger.js` match its location and that the server has rebooted.

### 2. How do I authenticate requests when testing via Swagger UI?
1. Perform a POST request to `/api/v1/auth/login` using testing credentials.
2. Copy the `accessToken` string returned in the response body data.
3. Click the **Authorize** lock button at the top of the Swagger page.
4. Paste the token and click **Authorize**. You can now test protected endpoints.

### 3. My webhook signature validation is failing. Why?
Confirm that you are checking the **raw request body buffer**, not the parsed JSON object. Express middleware parses request bodies into standard objects, modifying spacing and key orders, which invalidates cryptographic signatures.
Ensure the raw request body buffer is preserved under `req.rawBody` by confirming the verify hook in `app.js` is active.

### 4. How do I change the operational CRM URL path?
Set the `CRM_PREFIX` environment variable in your `.env` configuration (e.g. `CRM_PREFIX=/ops-control`). The app routes will automatically mount at the updated URL path, security-gated by middleware.
