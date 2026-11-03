// modules/flights/flight.callback.routes.js
//
// Mount wherever you registered this URL in SRDV's Dashboard → Settings → Callback URL.
// Public route — SRDV calls this directly, there's no session/JWT to authenticate against.
// The only guard is the credential check inside the controller (see the security note there).
//
// Local dev note (srdv-flights-api-reference.md §6): SRDV can't reach localhost — use ngrok
// or similar and register the tunnel URL as your callback URL while testing.

const express = require("express");
const router = express.Router();
const { handleFlightCallback } = require("./flight.callback.controller");

router.post("/callback", handleFlightCallback);
// Suggested mount point: app.use("/webhooks/srdv", flightCallbackRoutes)
// → POST /webhooks/srdv/callback, matching the example path in srdv-flights-api-reference.md §6.

module.exports = router;