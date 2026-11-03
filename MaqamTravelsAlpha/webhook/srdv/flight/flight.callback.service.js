// modules/flights/flight.callback.service.js
//
// Core logic for the SRDV flight_callback webhook. Kept separate from the controller so
// it's testable without the HTTP layer.
//
// ASSUMPTIONS FLAGGED BELOW — none of these were nailed down in the docs I have. Grep for
// "ASSUMPTION" and confirm each against your real code/business rules before trusting this file.

const FlightBooking = require("../../modules/flights/flight.model");
const Traveller = require("../../modules/account/traveller.model"); // adjust path
const paymentService = require("../../modules/payment.service"); // adjust path
const notificationService = require("../../utils/notification.service");
const logger = require("../../utils/logger");

// SRDV's callback Status → this app's FlightBooking.status enum. See the status table in
// flight-booking-flow.md §7/§9: Success→confirmed, Failed→failed, Aborted→aborted.
const STATUS_MAP = {
  Success: "confirmed",
  Failed: "failed",
  Aborted: "aborted",
};

const TERMINAL_STATUSES = new Set(Object.values(STATUS_MAP));

async function processCallback(body) {
  const { BookingId, PNR, GdsPNR, Status, Remark, Passengers } = body;

  const mappedStatus = STATUS_MAP[Status];
  if (!mappedStatus) {
    // Doc lists Status as always Success/Failed/Aborted. An unrecognized value is either a
    // new status SRDV added without documenting it, or a malformed delivery — don't guess
    // a mapping, surface it instead.
    throw new Error(`Unrecognized callback Status "${Status}" for BookingId ${BookingId}`);
  }

  const flightBooking = await FlightBooking.findOne({ srdvBookingId: BookingId });
  if (!flightBooking) {
    throw new Error(`No FlightBooking found for srdvBookingId ${BookingId}`);
  }

  // --- Idempotency / redelivery guard ---
  // "No documented retry/idempotency behavior — SRDV may redeliver on timeout"
  // (srdv-flights-api-reference.md §6). Two cases guarded against:
  //   1. Exact redelivery of a status already applied → no-op, ack cleanly, no double refund.
  //   2. A DIFFERENT terminal status arriving after one is already recorded → the documented
  //      model treats Success/Failed/Aborted as mutually exclusive final outcomes, so this
  //      shouldn't happen. Treated as an anomaly to investigate rather than silently
  //      overwritten — a late "Failed" redelivery must never downgrade an already-confirmed
  //      booking.
  if (TERMINAL_STATUSES.has(flightBooking.status)) {
    if (flightBooking.status === mappedStatus) {
      logger.info(
        `flight_callback: duplicate delivery for BookingId ${BookingId}, already ${mappedStatus} — no-op`
      );
      return;
    }
    throw new Error(
      `flight_callback: BookingId ${BookingId} already resolved to "${flightBooking.status}", ` +
        `now received conflicting "${mappedStatus}" — not overwriting. Needs manual review.`
    );
  }

  flightBooking.pnr = PNR;
  if (GdsPNR) flightBooking.gdsPnr = GdsPNR;
  flightBooking.status = mappedStatus;
  if (Remark) flightBooking.remark = Remark;

  // --- Passenger ticket matching, BY NAME (not array order) ---
  // flight-booking-flow.md flags the equivalent TicketGDS-after-payment code as matching by
  // array order instead of name, and says explicitly: "same fix will be needed in the §7
  // callback handler once it's built." Building it correctly here from the start rather than
  // repeating that shortcut.
  if (Array.isArray(Passengers) && Passengers.length > 0) {
    await matchAndAssignTickets(flightBooking, Passengers);
  }

  await flightBooking.save();

  if (mappedStatus === "failed" || mappedStatus === "aborted") {
    await triggerRefund(flightBooking, Remark);
  }

  try {
    await notificationService.sendEmail(undefined, `booking_${mappedStatus}`, {
      bookingRef: flightBooking.bookingRef,
      pnr: flightBooking.pnr,
    });
  } catch (notifyErr) {
    // notification.service.js not built yet (main plan §17) — never block the callback ack.
  }
}

async function matchAndAssignTickets(flightBooking, incomingPassengers) {
  // flightBooking.passengers[].travellerId is a ref, not an embedded name — resolve each
  // one so SRDV's Passengers[] (Title/FirstName/LastName/TicketNumber) can be matched by
  // name rather than trusting array order.
  const travellerIds = flightBooking.passengers.map((p) => p.travellerId);
  const travellers = await Traveller.find({ _id: { $in: travellerIds } });
  const travellerById = new Map(travellers.map((t) => [String(t._id), t]));

  for (const bookedPax of flightBooking.passengers) {
    const traveller = travellerById.get(String(bookedPax.travellerId));
    if (!traveller) continue; // shouldn't happen — travellerId should always resolve

    const match = incomingPassengers.find(
      (p) =>
        normalizeName(p.FirstName) === normalizeName(traveller.firstName) &&
        normalizeName(p.LastName) === normalizeName(traveller.lastName)
    );

    if (match && match.TicketNumber) {
      bookedPax.ticketNumber = match.TicketNumber;
      // ASSUMPTION: doc doesn't define a per-passenger status field on this callback beyond
      // TicketNumber — inferring "OK" from its presence, mirroring TicketGDS's
      // Passenger.Ticket.Status field. Adjust if SRDV's real payload includes an explicit
      // passenger-level status you should use instead.
      bookedPax.ticketStatus = "OK";
    } else if (!match) {
      // Name mismatch — typo, formatting difference, or a real data problem. Logged, not
      // thrown: one unmatched passenger shouldn't fail the whole booking's status update.
      logger.warn(
        `flight_callback: no name match for traveller ${traveller._id} (${traveller.firstName} ${traveller.lastName}) on BookingId ${flightBooking.srdvBookingId}`
      );
    }
  }
}

function normalizeName(name) {
  return (name || "").trim().toLowerCase();
}

async function triggerRefund(flightBooking, remark) {
  // ASSUMPTION: no refund-service interface is specified anywhere in the docs I have —
  // travel-platform-backend-plan.md §9 only documents a manually-triggered refund endpoint
  // (POST /payments/:id/refund, admin-only), not an automatic trigger from a webhook. Wiring
  // an automatic call here per flight-booking-flow.md §7 step 4 ("Failed/Aborted → trigger
  // refund"), but confirm this is really meant to fire automatically rather than routing to
  // a manual ops queue — auto-refunding on every Failed/Aborted callback is a real
  // money-movement decision, not just a status update.
  try {
    await paymentService.initiateRefundForBooking(flightBooking._id, {
      reason: remark || `SRDV booking ${flightBooking.status}`,
    });
  } catch (refundErr) {
    logger.error(
      `flight_callback: refund trigger failed for FlightBooking ${flightBooking._id} — ${refundErr.message}`
    );
    // Not re-thrown — the status update above already saved successfully; losing the
    // refund call shouldn't undo that. This does need to surface somewhere ops actually
    // sees it (alert/dashboard), which isn't built yet — flagging, not solving, here.
  }
}

module.exports = { processCallback };