// modules/packages/user/packageUser.routes.js
//
// Customer-facing Package and Package Booking endpoints
// Base path: /api/v1/packages

const express = require("express");
const packageUserController = require("./packageUser.controller");
const packageBookingUserController = require("./packageBookingUser.controller");
const { authenticate, optionalAuthenticate } = require("../../../middleware/auth");
const eticketController = require("../../eticket/eticket.controller");
const { eticketAuth } = require("../../eticket/eticket.routes");
const invoiceController = require("../../invoices/invoice.controller");

const router = express.Router();

/**
 * @openapi
 * /api/v1/packages:
 *   get:
 *     tags:
 *       - Packages - Customer
 *     summary: Browse & Search Packages
 *     description: Returns a paginated list of public active packages with itemized components, pricing, and live stock availability.
 *     parameters:
 *       - in: query
 *         name: destination
 *         schema:
 *           type: string
 *         description: Filter by destination city or country (e.g. "Dubai")
 *       - in: query
 *         name: sellPriceMin
 *         schema:
 *           type: number
 *         description: Minimum package price filter
 *       - in: query
 *         name: sellPriceMax
 *         schema:
 *           type: number
 *         description: Maximum package price filter
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
 *         description: List of packages retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/", packageUserController.getPackages);

/**
 * @openapi
 * /api/v1/packages/getAllBookingPackage:
 *   get:
 *     tags:
 *       - Packages - Customer
 *     summary: Get All Booking Packages for User Profile
 *     description: Returns all customized package bookings created by the authenticated customer for their own profile, with pagination and optional status filter.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [initiated, pending, confirmed, cancelled]
 *         description: Filter bookings by lifecycle status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of bookings per page
 *     responses:
 *       200:
 *         description: Package bookings retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Package bookings retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "67d3e69f8c12b7a4e098a123"
 *                       userId:
 *                         type: string
 *                         example: "67d3e5828c12b7a4e098a111"
 *                       packageId:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           title:
 *                             type: string
 *                             example: "7D6N Istanbul & Cappadocia Wonders"
 *                           destination:
 *                             type: string
 *                             example: "Turkey"
 *                           sellPrice:
 *                             type: number
 *                             example: 62000
 *                       totalAmount:
 *                         type: number
 *                         example: 62000
 *                       status:
 *                         type: string
 *                         example: "confirmed"
 *                       quantity:
 *                         type: integer
 *                         example: 1
 *                       packageSnapshot:
 *                         type: object
 *                       travellers:
 *                         type: array
 *                         items:
 *                           type: object
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 5
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/getAllBookingPackage", authenticate, packageBookingUserController.getAllBookingPackage);


/**
 * @openapi
 * /api/v1/packages/{id}:
 *   get:
 *     tags:
 *       - Packages - Customer
 *     summary: Get Package Detail & Swappable Alternatives
 *     description: Returns full package details, day-by-day itinerary, itemized breakdown, and eligible alternative options for hotel upgrades and flight swaps.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *     responses:
 *       200:
 *         description: Package details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/:id", packageUserController.getPackageDetail);

/**
 * @openapi
 * /api/v1/packages/{id}/quote:
 *   post:
 *     tags:
 *       - Packages - Customer
 *     summary: Live Dynamic Customizer Quote (Option A Pricing)
 *     description: Recalculates live quote as customer toggles optional items or upgrades hotels/flights. Applies pure Option A formula (Base - Deductions + Swap Deltas).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PackageQuoteRequest'
 *     responses:
 *       200:
 *         description: Dynamic quote recalculated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/:id/quote", packageUserController.getQuotePreview);

/**
 * @openapi
 * /api/v1/packages/book:
 *   post:
 *     tags:
 *       - Packages - Customer
 *     summary: Book Customized Package
 *     description: |
 *       Creates a package booking with customer customizations. 
 *       - Atomically claims physical seat and room stocks (`status: 'assigned'`).
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePackageBookingRequest'
 *     responses:
 *       201:
 *         description: Package booking created successfully. Proceed to payment.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         description: Insufficient stock available for one or more bundled components.
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/book", authenticate, packageBookingUserController.createBooking);

/**
 * @openapi
 * /api/v1/packages/bookings/{id}/cancel:
 *   post:
 *     tags:
 *       - Packages - Customer
 *     summary: Cancel Package Booking
 *     description: Cancels pending booking and releases claimed stock units back to available.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package Booking ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "User decided not to proceed"
 *     responses:
 *       200:
 *         description: Booking cancelled and inventory released.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post("/bookings/:id/cancel", authenticate, packageBookingUserController.cancelBooking);

/**
 * @openapi
 * /api/v1/packages/bookings/{id}:
 *   get:
 *     tags:
 *       - Packages - Customer
 *     summary: Get Package Booking Status & Snapshot
 *     description: Returns booking details, payment status, customized selections, and claimed stock units for the logged-in customer.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package Booking ID
 *     responses:
 *       200:
 *         description: Booking details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/bookings/:id", optionalAuthenticate, packageBookingUserController.getBooking);
router.get("/bookings/:id/invoice", optionalAuthenticate, invoiceController.getPackageInvoiceData);
router.get("/bookings/:id/invoice/download", optionalAuthenticate, invoiceController.downloadPackageInvoice);
router.get("/bookings/:id/eticket", optionalAuthenticate, eticketController.getPackageETicket);
router.get("/bookings/:id/eticket/download", optionalAuthenticate, eticketController.downloadPackageETicket);

module.exports = router;
