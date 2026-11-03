---
sidebar_position: 3
---

# Environment Variables

Copy `.env.example` to `.env` in the repository root. Never commit `.env` or log its values.

## Required for API startup

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/maqam_travels
ACCESS_TOKEN_SECRET=replace-with-a-random-secret
REFRESH_TOKEN_SECRET=replace-with-a-different-random-secret
```

`MONGO_URI`, `ACCESS_TOKEN_SECRET`, and `REFRESH_TOKEN_SECRET` are the names used by the running code. The current `.env.example` uses older JWT variable names, so update that template before sharing it with a new developer.

Generate secrets with a cryptographically secure tool, for example:

```bash
openssl rand -base64 32
```

## Hotel/SRDV configuration

Hotel work depends on the same SRDV credentials used by the provider client:

```env
SRDV_API_BASE_HOTEL_URL=https://hotel.srdv.com/v8/rest
SRDV_API_KEY=...
SRDV_END_USER_IP=...
SRDV_CLIENT_ID=...
SRDV_USERNAME=...
SRDV_PASSWORD=...
```

Confirm the base URL and provider contract with SRDV before using production credentials. Do not use fallback values such as a public IP address for a production end-user context.

## Other integrations

Payment integrations require their gateway-specific variables, including Razorpay keys/webhook secret, PayPal client credentials/webhook ID, and PhonePe merchant/salt values. `CLIENT_URL` is used in payment redirects; `CRM_PREFIX` determines the CRM mount path.

Keep environment-specific URLs and credentials in the deployment secret store rather than the repository.
