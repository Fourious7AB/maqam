---
sidebar_position: 7
---

# Payments Module

The `payments` module coordinates transaction processing across multiple payment aggregators: Razorpay, PayPal, and PhonePe.

## Component Map

* **Routes:** `payment.routes.js`
* **Controller:** `payment.controller.js`
* **Service:** `payment.service.js`
* **Model:** `Transaction`

---

## Webhook Architecture

To guarantee payment verification even if the user closes their browser page prematurely, MaqamTravels processes payment captures asynchronously using webhooks.

```
+---------------+      (1) Captures Payment      +-------------+
|               | -----------------------------> |             |
| User Browser  |                                |   Gateway   |
|               | <============================  |  (Razorpay/ |
+---------------+     (2) Redirects to client    |  PayPal/    |
                                                 |  PhonePe)   |
+---------------+                                |             |
|               | <--------- (3) Webhook ------- |             |
| Express App   |      (signature verified)      +-------------+
+---------------+
```

### Critical Webhook Design Choices

1. **Bypassing Rate Limiters:**
   Webhooks are mounted at `/webhook/*` directly on the Express app *before* the `apiLimiter` rate limiter middleware is applied. This prevents payment provider webhooks from being rate-limited (which would block order confirmations).

2. **Preserving Raw Request Bodies:**
   Payment gateways sign webhook payloads. Standard JSON parsers modify payload spaces, breaking validation checks.
   We preserve the raw buffer inside `app.js` using a custom verify callback:
   ```javascript
   app.use(express.json({
     limit: '10mb',
     verify: (req, res, buf) => {
       if (req.originalUrl && req.originalUrl.includes('/webhook')) {
         req.rawBody = buf; // Preserved for cryptographic check
       }
     }
   }));
   ```

3. **Verification Strategies:**
   * **Razorpay:** Verifies the `x-razorpay-signature` header against the raw body using HMAC-SHA256 and the webhook secret key.
   * **PayPal:** Sends webhook payloads to PayPal endpoints for active verification verification, or performs offline certificate signature check.
   * **PhonePe:** Computes SHA256 checksum of base64 data concatenated with the salt key and salt index, matching it with the `X-VERIFY` header.
