// modules/packages/offers/offer.routes.js
//
// Customer-facing Standalone Retail Offers
// Base path: /api/v1/offers

const express = require("express");
const router = express.Router();

const { authenticate, optionalAuthenticate } = require("../../../middleware/auth");

const offerService = require("./offer.service");
const {
  bookOffer,
  cancelBooking,
  getBooking,
  getMyBookings,
} = require("./offerBooking.controller");
const eticketController = require("../../eticket/eticket.controller");
const invoiceController = require("../../invoices/invoice.controller");
const { invoiceAuth } = require("../../invoices/invoice.routes");

/**
 * @openapi
 * /api/v1/offers:
 *   get:
 *     tags:
 *       - Offers - Customer
 *     summary: Browse Public Retail Offers
 *     description: Returns active standalone flight & hotel offers with live available stock and pricing.
 *     parameters:
 *       - in: query
 *         name: itemType
 *         schema:
 *           type: string
 *           enum: [flight, hotel]
 *       - in: query
 *         name: destination
 *         schema:
 *           type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: List of public offers retrieved successfully.
 */
router.get("/", async (req, res) => {
  const result = await offerService.listOffers(req.query, false);
  res.status(200).json({ success: true, ...result });
});

/**
 * @openapi
 * /api/v1/offers/{id}:
 *   get:
 *     tags:
 *       - Offers - Customer
 *     summary: Get Public Offer Details & Live Stock
 *     description: Returns single offer details with live stock availability.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Offer details retrieved successfully.
 *       404:
 *         description: Offer not found.
 */
router.get("/:id", async (req, res, next) => {
  try {
    const offer = await offerService.getOfferById(req.params.id, false);
    res.status(200).json({ success: true, offer });
  } catch (err) {
    next(err);
  }
});

// Customer booking flows

/**
 * @openapi
 * /api/v1/offers/{id}/book:
 *   post:
 *     tags:
 *       - Offers - Customer
 *     summary: Book Retail Offer
 *     description: Authenticated customer reserves an offer booking, claims live stock, and syncs a Master Booking.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Offer ObjectId
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - travellers
 *             properties:
 *               quantity:
 *                 type: integer
 *                 default: 1
 *                 example: 2
 *               travellers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - firstName
 *                     - lastName
 *                   properties:
 *                     travellerId:
 *                       type: string
 *                       example: "66d4a8e2e944f7b6b199e811"
 *                     firstName:
 *                       type: string
 *                       example: "Ahmed"
 *                     lastName:
 *                       type: string
 *                       example: "Khan"
 *                     dateOfBirth:
 *                       type: string
 *                       format: date
 *                       example: "1990-05-15"
 *                     passportNumber:
 *                       type: string
 *                       example: "A12345678"
 *                     isLead:
 *                       type: boolean
 *                       default: false
 *     responses:
 *       200:
 *         description: Offer booking created successfully in pending state.
 *       400:
 *         description: Bad request (missing travellers or invalid quantity).
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Offer not found or not active.
 *       409:
 *         description: Conflict (insufficient stock available).
 */
router.post("/:id/book", authenticate, bookOffer);

/**
 * @openapi
 * /api/v1/offers/bookings/{id}/cancel:
 *   post:
 *     tags:
 *       - Offers - Customer
 *     summary: Cancel Customer Offer Booking
 *     description: Cancels an existing offer booking and releases claimed stock units back to inventory.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Offer Booking ObjectId
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Plans changed by customer"
 *     responses:
 *       200:
 *         description: Offer booking cancelled successfully and stock released.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Booking not found.
 */
router.post("/bookings/:id/cancel", authenticate, cancelBooking);

/**
 * @openapi
 * /api/v1/offers/bookings/me:
 *   get:
 *     tags:
 *       - Offers - Customer
 *     summary: List Authenticated Customer Offer Bookings
 *     description: Retrieves a paginated list of standalone retail offer bookings made by the logged-in customer.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [initiated, pending, confirmed, cancelled]
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
 *         description: Customer offer bookings retrieved successfully.
 *       401:
 *         description: Unauthorized.
 */
router.get("/bookings", authenticate, getMyBookings);
router.get("/bookings/me", authenticate, getMyBookings);

/**
 * @openapi
 * /api/v1/offers/bookings/{id}:
 *   get:
 *     tags:
 *       - Offers - Customer
 *     summary: Get Single Offer Booking Details
 *     description: Retrieves the detailed booking record, claimed stock, and payment status for the logged-in customer.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Offer Booking ObjectId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking details retrieved successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Booking not found.
 */
router.get("/bookings/:id", optionalAuthenticate, getBooking);
router.get("/bookings/:id/eticket", optionalAuthenticate, eticketController.getOfferETicket);
router.get("/bookings/:id/eticket/download", optionalAuthenticate, eticketController.downloadOfferETicket);


router.get("/bookings/:id/invoice", invoiceAuth, invoiceController.getOfferInvoiceData);
router.get("/bookings/:id/invoice/html", invoiceAuth, invoiceController.getOfferInvoiceHtml);
router.get("/bookings/:id/invoice/download", invoiceAuth, invoiceController.downloadOfferInvoice);

module.exports = router;
