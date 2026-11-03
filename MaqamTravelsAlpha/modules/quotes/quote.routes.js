'use strict';

const express = require('express');
const router = express.Router();
const quoteController = require('./quote.controller');
const quoteValidator = require('./quote.validator');
const validate = require('../../middleware/validate');
const { authenticate, tryAuthenticate } = require('../../middleware/auth');
const { quoteRequestLimiter, quoteTrackLimiter } = require('../../middleware/rateLimiter');

/**
 * ─── CUSTOMER QUOTATION ROUTES ──────────────────────────
 * Base path: /api/v1/quotes
 * Handles customer quotation requests, tracking, and response actions.
 */

/** Middleware helper: optional authentication for guest quote requests */
const optionalAuth = async (req, res, next) => {
  try {
    const user = await tryAuthenticate(req);
    if (user) req.user = user;
    next();
  } catch (err) {
    next();
  }
};

/**
 * @openapi
 * /api/v1/quotes/request:
 *   post:
 *     tags:
 *       - Quotations (Customer)
 *     summary: Request a Travel / Umrah Quotation
 *     description: Public or authenticated endpoint for customers to submit trip quotation requests.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - destination
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "Ahmed"
 *               lastName:
 *                 type: string
 *                 example: "Farooq"
 *               email:
 *                 type: string
 *                 example: "ahmed.farooq@example.com"
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *               destination:
 *                 type: string
 *                 example: "Makkah & Madinah"
 *               tripType:
 *                 type: string
 *                 example: "umrah"
 *               travelDates:
 *                 type: object
 *                 properties:
 *                   from:
 *                     type: string
 *                     format: date
 *                     example: "2026-11-10"
 *                   to:
 *                     type: string
 *                     format: date
 *                     example: "2026-11-20"
 *               numberOfPeople:
 *                 type: integer
 *                 example: 4
 *               budget:
 *                 type: number
 *                 example: 350000
 *               specialRequests:
 *                 type: string
 *                 example: "2 quadruple rooms near Clock Tower, non-stop flights"
 *     responses:
 *       201:
 *         description: Quotation request submitted successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/request',
  quoteRequestLimiter,
  optionalAuth,
  quoteValidator.validateRequestQuote(),
  validate,
  quoteController.requestQuote
);

/**
 * @openapi
 * /api/v1/quotes/track:
 *   post:
 *     tags:
 *       - Quotations (Customer)
 *     summary: Track Quotation Status (Guest Lookup)
 *     description: Public endpoint for guests to check quotation status using reference number and registered phone number.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reference
 *               - phone
 *             properties:
 *               reference:
 *                 type: string
 *                 example: "QT-A1B2C3D4"
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *     responses:
 *       200:
 *         description: Quotation status retrieved
 *       404:
 *         description: Quotation not found or phone mismatch
 */
router.post(
  '/track',
  quoteTrackLimiter,
  quoteValidator.validateTrackQuote(),  
  validate,
  quoteController.trackQuote   
);

/**
 * @openapi
 * /api/v1/quotes/my:
 *   get:
 *     tags:
 *       - Quotations (Customer)
 *     summary: List Logged-In Customer's Quotation Requests
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Customer quotes retrieved
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/my',
  authenticate,
  quoteValidator.validateListQuotes(),
  validate,
  quoteController.listMyQuotes
);

/**
 * @openapi
 * /api/v1/quotes/my/{id}:
 *   get:
 *     tags:
 *       - Quotations (Customer)
 *     summary: Get Details of a Customer Quotation Request
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quotation details retrieved
 *       404:
 *         description: Quotation not found
 */
router.get(
  '/my/:id',
  authenticate,
  quoteController.getMyQuote
);

/**
 * @openapi
 * /api/v1/quotes/my/{id}/respond:
 *   post:
 *     tags:
 *       - Quotations (Customer)
 *     summary: Accept, Decline, or Request Changes for a Quotation
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accepted, rejected, changes_requested]
 *                 example: "accepted"
 *               note:
 *                 type: string
 *                 example: "Looks good! Please call me for payment."
 *     responses:
 *       200:
 *         description: Customer response recorded
 *       400:
 *         description: Quotation expired or invalid action
 *       409:
 *         description: Conflict (e.g. quote not ready yet or already accepted)
 */
router.post(
  '/my/:id/respond',
  authenticate,
  quoteValidator.validateRespondToQuote(),
  validate,
  quoteController.respondToQuote
);

// ─── ADMIN QUOTATION ROUTES (/api/v1/quotes/admin) ───────
router.use('/admin', require('./quoteAdmin.routes'));

module.exports = router;

