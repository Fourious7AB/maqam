// modules/eticket/eticket.routes.js
//
// Centralized E-Ticket Router for Live Flight & In-House Services
// Mount path: /api/v1/eticket

const express = require('express');
const router = express.Router();
const eticketController = require('./eticket.controller');
const { authenticate } = require('../../middleware/auth');

/**
 * Flexible authentication middleware allowing either:
 * 1. Standard Authorization: Bearer <token> header
 * 2. ?token=<token> query parameter (essential for direct browser <a> link downloads)
 */
// const eticketAuth = (req, res, next) => {
//   if (!req.headers.authorization && req.query.token) {
//     req.headers.authorization = `Bearer ${req.query.token}`;
//   }
//   return authenticate(req, res, next);
// };

router.use(authenticate)



// ─── 1. LIVE FLIGHT SERVICES (GDS & LCC) ──────────────────────────────────────

/**
 * @openapi
 * /api/v1/eticket/live/{bookingId}:
 *   get:
 *     tags:
 *       - E-Ticket - Live Flights
 *     summary: Get Live Flight E-Ticket JSON data
 *     description: Returns rich, normalized e-ticket JSON for GDS and LCC live flights. Consumed by frontend to render boarding passes.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: FlightBooking ObjectId, SRDV numeric ID, or Airline PNR
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         description: Optional JWT query token for browser downloads
 *     responses:
 *       200:
 *         description: Live flight e-ticket retrieved successfully.
 *       400:
 *         description: E-ticket not ready or payment pending.
 *       403:
 *         description: Unauthorized.
 *       404:
 *         description: Flight booking not found.
 */
router.get('/live/:bookingId', eticketController.getLiveFlightETicket);

/**
 * @openapi
 * /api/v1/eticket/live/{bookingId}/download:
 *   get:
 *     tags:
 *       - E-Ticket - Live Flights
 *     summary: Download Live Flight E-Ticket Document
 *     description: Directly downloads the verified live flight e-ticket JSON attachment with Content-Disposition headers.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: E-ticket attachment file stream.
 */
router.get('/live/:bookingId/download', eticketController.downloadLiveFlightETicket);

// ─── 2. IN-HOUSE SERVICES: RETAIL OFFERS ──────────────────────────────────────

/**
 * @openapi
 * /api/v1/eticket/inhouse/offer/{bookingId}:
 *   get:
 *     tags:
 *       - E-Ticket - In-House Offers
 *     summary: Get In-House Offer Flight E-Ticket JSON data
 *     description: Returns normalized flight e-ticket for standalone retail offers under the Dual-PNR wholesale series model.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: OfferBooking ObjectId
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: In-house offer e-ticket retrieved successfully.
 */
router.get('/inhouse/offer/:bookingId', eticketController.getOfferETicket);

/**
 * @openapi
 * /api/v1/eticket/inhouse/offer/{bookingId}/download:
 *   get:
 *     tags:
 *       - E-Ticket - In-House Offers
 *     summary: Download In-House Offer Flight E-Ticket Document
 *     description: Directly downloads the verified in-house offer flight e-ticket document attachment.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: E-ticket attachment file stream.
 */
router.get('/inhouse/offer/:bookingId/download', eticketController.downloadOfferETicket);

// ─── 3. IN-HOUSE SERVICES: PACKAGES ───────────────────────────────────────────

/**
 * @openapi
 * /api/v1/eticket/inhouse/package/{bookingId}:
 *   get:
 *     tags:
 *       - E-Ticket - In-House Packages
 *     summary: Get In-House Package Flight E-Ticket JSON data
 *     description: Returns normalized flight e-ticket for tour package bookings under the Dual-PNR wholesale series model.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: PackageBooking ObjectId
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: In-house package e-ticket retrieved successfully.
 */
router.get('/inhouse/package/:bookingId', eticketController.getPackageETicket);

/**
 * @openapi
 * /api/v1/eticket/inhouse/package/{bookingId}/download:
 *   get:
 *     tags:
 *       - E-Ticket - In-House Packages
 *     summary: Download In-House Package Flight E-Ticket Document
 *     description: Directly downloads the verified in-house package flight e-ticket document attachment.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: E-ticket attachment file stream.
 */
router.get('/inhouse/package/:bookingId/download', eticketController.downloadPackageETicket);

// ─── 4. PUBLIC TICKET VERIFICATION (AIRPORT GROUND STAFF) ─────────────────────

/**
 * @openapi
 * /api/v1/eticket/verify:
 *   get:
 *     tags:
 *       - E-Ticket - Verification
 *     summary: Public 2-Factor Ticket Verification
 *     description: Verifies e-ticket validity using PNR and passenger last name without requiring an active user session.
 *     parameters:
 *       - in: query
 *         name: pnr
 *         required: true
 *         schema:
 *           type: string
 *         example: "6E5544"
 *       - in: query
 *         name: lastName
 *         required: true
 *         schema:
 *           type: string
 *         example: "Sharma"
 *     responses:
 *       200:
 *         description: Ticket verified successfully.
 *       404:
 *         description: Ticket not found or name mismatch.
 */
router.get('/verify', eticketController.verifyTicket);

module.exports = router;
