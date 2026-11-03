// modules/flights/flight.callback.controller.js
//
// Handles POST <your-registered-URL> — SRDV's flight_callback webhook
// (srdv-flights-api-reference.md §6, flight-booking-flow.md §7). Direction is reversed
// from every other SRDV interaction in this codebase: SRDV calls YOU here. You register
// this URL yourself in SRDV's Dashboard → Settings → Callback URL — it isn't handed to
// you by SRDV, and it can't reach localhost, so local testing needs ngrok or similar.
//
// SECURITY NOTE (flagged in srdv-flights-api-reference.md §6, not resolved — carried
// forward here as-is): SRDV re-sends ClientId/UserName/Password in the callback body as
// the ONLY verification mechanism — no signature, no HMAC, no documented IP allowlist.
// Anyone holding those credentials (already sent on every outbound call) could forge a
// callback. This handler enforces the credential check because it's the only guard
// documented, but it is not a strong guarantee on its own. Worth asking SRDV directly
// whether a real signing mechanism exists that didn't make it into this reference doc —
// the doc's own header warns "SRDV docs have errors."
//
// ASSUMPTION (flagged, unconfirmed): always returning HTTP 200 with the Error object
// carrying the real outcome, since the doc only defines a body-level `{ Error: {...} }`
// contract and never states what HTTP status SRDV expects or how it reacts to a non-2xx.
// If SRDV actually gates retry behavior on HTTP status rather than ErrorCode, this needs
// to change to return a non-200 on failure instead.

const { processFlightCallbackService } = require("../../../modules/flights/flight.service");
const logger = require("../../../utils/logger");

const handleFlightCallback = async (req, res) => {
  try {
    const result = await processFlightCallbackService(req.body);
    return res.status(200).json({
      Error: result.error || { ErrorCode: 0, ErrorMessage: "" },
    });
  } catch (err) {
    logger.error(`flight_callback: processing failed — ${err.message}`, {
      bookingId: req.body?.BookingId,
    });
    return res.status(200).json({
      Error: { ErrorCode: 4, ErrorMessage: err.message || "Processing failed" },
    });
  }
};

module.exports = { handleFlightCallback };