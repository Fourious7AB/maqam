// modules/packages/offers/offerAdmin.routes.js
//
// CRM / Admin Standalone Retail Offers Management & Direct Booking
// Base path: /api/v1/crm/offers

const express = require("express");
const offerAdminController = require("./offerAdmin.controller");
const { authenticate, authorize } = require("../../../middleware/auth");
const { uploadArray } = require("../../../middleware/upload");

const router = express.Router();

router.use(authenticate);
router.use(authorize("admin", "super_admin"));

/**
 * @openapi
 * /api/v1/crm/offers:
 *   get:
 *     tags:
 *       - Offers - CRM / Admin
 *     summary: List All Retail Offers with Margin Analytics & Live Stock
 *     description: Returns all standalone flight & hotel offers with wholesale cost vs sell price, profit margin %, and live available bookings.
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
 *           default: 20
 *       - in: query
 *         name: itemType
 *         schema:
 *           type: string
 *           enum: [flight, hotel]
 *       - in: query
 *         name: destination
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of retail offers retrieved successfully.
 *   post:
 *     tags:
 *       - Offers - CRM / Admin
 *     summary: Create Standalone Retail Offer
 *     description: Creates a standalone retail flight or hotel offer linked to wholesale inventory (TicketStock or HotelStock).
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - destination
 *               - itemType
 *               - sellPrice
 *               - startDate
 *               - endDate
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: "Direct photo files to upload to Cloudinary"
 *               title:
 *                 type: string
 *                 example: "Direct Flight to Dubai — IndiGo Special"
 *               description:
 *                 type: string
 *                 example: "Special non-stop flight from Delhi to Dubai."
 *               destination:
 *                 type: string
 *                 example: "Dubai"
 *               itemType:
 *                 type: string
 *                 enum: [flight, hotel]
 *                 example: "flight"
 *               flightRef:
 *                 type: string
 *                 description: "JSON string or object of { stock, unitsPerBooking }"
 *                 example: '{"stock":"66d4a8e2e944f7b6b199e811","unitsPerBooking":1}'
 *               hotelRef:
 *                 type: string
 *                 description: "JSON string or object of { stock, unitsPerBooking }"
 *                 example: '{"stock":"66d4a8e2e944f7b6b199e822","unitsPerBooking":1}'
 *               sellPrice:
 *                 type: number
 *                 example: 12500
 *               originalPrice:
 *                 type: number
 *                 example: 15000
 *               discountPercentage:
 *                 type: number
 *                 example: 16
 *               inclusions:
 *                 type: string
 *                 description: "JSON string or array of inclusions"
 *                 example: '["7kg Cabin Baggage", "30kg Check-in Baggage"]'
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-11-15T08:30:00.000Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-11-15T12:00:00.000Z"
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - destination
 *               - itemType
 *               - sellPrice
 *               - startDate
 *               - endDate
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Direct Flight to Dubai — IndiGo Special"
 *               description:
 *                 type: string
 *                 example: "Special non-stop flight from Delhi to Dubai."
 *               destination:
 *                 type: string
 *                 example: "Dubai"
 *               itemType:
 *                 type: string
 *                 enum: [flight, hotel]
 *                 example: "flight"
 *               flightRef:
 *                 type: object
 *                 properties:
 *                   stock:
 *                     type: string
 *                     example: "66d4a8e2e944f7b6b199e811"
 *                   unitsPerBooking:
 *                     type: integer
 *                     default: 1
 *               hotelRef:
 *                 type: object
 *                 properties:
 *                   stock:
 *                     type: string
 *                     example: "66d4a8e2e944f7b6b199e822"
 *                   unitsPerBooking:
 *                     type: integer
 *                     default: 1
 *               sellPrice:
 *                 type: number
 *                 example: 12500
 *               originalPrice:
 *                 type: number
 *                 example: 15000
 *               discountPercentage:
 *                 type: number
 *                 example: 16
 *               inclusions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["7kg Cabin Baggage", "30kg Check-in Baggage"]
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-11-15T08:30:00.000Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-11-15T12:00:00.000Z"
 *     responses:
 *       201:
 *         description: Retail offer created successfully.
 */
router.get("/", offerAdminController.adminListOffers);
router.post("/", uploadArray("images", 10), offerAdminController.adminCreateOffer);

/**
 * @openapi
 * /api/v1/crm/offers/upload-images:
 *   post:
 *     tags:
 *       - Offers - CRM / Admin
 *     summary: Upload Offer Images to Cloudinary
 *     description: Streams up to 10 image files to Cloudinary and returns secure HTTPS URLs.
 *     security:
 *       - BearerAuth: []
 */
router.post(
  "/upload-images",
  uploadArray("images", 10),
  offerAdminController.adminUploadOfferImages
);

/**
 * @openapi
 * /api/v1/crm/offers/{id}/images:
 *   post:
 *     tags:
 *       - Offers - CRM / Admin
 *     summary: Attach Uploaded Images to Retail Offer
 *     description: Appends up to 10 image files to an existing offer.
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Images attached successfully.
 *   delete:
 *     tags:
 *       - Offers - CRM / Admin
 *     summary: Remove Single Image from Retail Offer
 *     description: Deletes an image by its secure URL from the offer's images array.
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
 *               - imageUrl
 *             properties:
 *               imageUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Image removed successfully.
 */
router.post(
  "/:id/images",
  uploadArray("images", 10),
  offerAdminController.adminAttachOfferImages
);

router.delete(
  "/:id/images",
  offerAdminController.adminRemoveOfferImage
);

/**
 * @openapi
 * /api/v1/crm/offers/bookings:
 *   get:
 *     tags:
 *       - Offers - CRM / Admin
 *     summary: List All Offer Bookings
 *     description: Paginated search of standalone customer offer purchases.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Offer bookings retrieved successfully.
 */
router.get("/bookings", offerAdminController.adminListOfferBookings);

/**
 * @openapi
 * /api/v1/crm/offers/book-for-customer:
 *   post:
 *     tags:
 *       - Offers - CRM / Admin
 *     summary: Direct Offer Booking for Customer via Bank Transfer
 *     description: Agent books a standalone flight/hotel offer directly for a customer. Immediately locks stock as used and records offline payment.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - offerId
 *               - travellers
 *             properties:
 *               customerId:
 *                 type: string
 *                 example: "66d4a8e2e944f7b6b199e811"
 *               offerId:
 *                 type: string
 *                 example: "66d4a8e2e944f7b6b199e822"
 *               quantity:
 *                 type: integer
 *                 default: 1
 *               travellers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     travellerId:
 *                       type: string
 *                     isLead:
 *                       type: boolean
 *               payment:
 *                 type: object
 *                 properties:
 *                   method:
 *                     type: string
 *                     default: "bank_transfer"
 *                   referenceNumber:
 *                     type: string
 *                     example: "NEFT-HDFC-991282"
 *                   notes:
 *                     type: string
 *                     example: "Direct payment received in corporate account"
 *     responses:
 *       201:
 *         description: Offer booked directly for customer.
 */
router.post("/book-for-customer", offerAdminController.adminBookOfferForCustomer);

/**
 * @openapi
 * /api/v1/crm/offers/bookings/{id}/cancel:
 *   post:
 *     tags:
 *       - Offers - CRM / Admin
 *     summary: Admin Cancel Offer Booking
 *     description: Cancels an offer booking, releases claimed inventory back to available, and updates payment state.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
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
 *                 example: "Customer requested cancellation via call"
 *     responses:
 *       200:
 *         description: Offer booking cancelled and stock released.
 */
router.post("/bookings/:id/cancel", offerAdminController.adminCancelOfferBooking);

/**
 * @openapi
 * /api/v1/crm/offers/{id}:
 *   get:
 *     tags:
 *       - Offers - CRM / Admin
 *     summary: Get Single Offer Details (Admin View)
 *     description: Retrieves complete offer configuration, wholesale stock linkage, and margin stats.
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
 *         description: Offer details retrieved successfully.
 *       404:
 *         description: Offer not found.
 *   patch:
 *     tags:
 *       - Offers - CRM / Admin
 *     summary: Update Retail Offer
 *     description: Modifies pricing, descriptions, travel dates, or wholesale stock linkage.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               sellPrice:
 *                 type: number
 *               originalPrice:
 *                 type: number
 *               discountPercentage:
 *                 type: number
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Offer updated successfully.
 *       404:
 *         description: Offer not found.
 */
router.get("/:id", offerAdminController.adminGetOffer);
router.patch("/:id", uploadArray("images", 10), offerAdminController.adminUpdateOffer);

/**
 * @openapi
 * /api/v1/crm/offers/{id}/toggle-status:
 *   patch:
 *     tags:
 *       - Offers - CRM / Admin
 *     summary: Toggle Retail Offer Active / Inactive Status
 *     description: Activates or pauses an offer from public display and booking.
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
 *         description: Offer status toggled successfully.
 *       404:
 *         description: Offer not found.
 */
router.patch("/:id/toggle-status", offerAdminController.adminToggleOfferStatus);

module.exports = router;
