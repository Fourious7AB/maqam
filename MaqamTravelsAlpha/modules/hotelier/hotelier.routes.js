const router = require('express').Router();
const hotelierController = require('./hotelier.controller');
const hotelierValidator = require('./hotelier.validator');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');

/**
 * ─── HOTELIER PARTNER ROUTES ───────────────────────────
 * Base path: /api/v1/hotelier
 * All routes require authentication and the 'hotelier' role.
 */

router.use(authenticate);
router.use(authorize('hotelier'));

/**
 * @openapi
 * /api/v1/hotelier/stock:
 *   get:
 *     tags:
 *       - Hotelier
 *     summary: List own hotel room stock batches
 *     description: >
 *       Retrieves all room stock allotment batches owned by the authenticated hotelier's assigned hotel.
 *       Includes review status (pending_review, approved, rejected), pricing breakdown, meal plans,
 *       and sanitized room units (available, blocked, or unavailable).
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Stock batches retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "66d4a8e2e944f7b6b199e813"
 *                           hotelId:
 *                             type: string
 *                             example: "66d4a8e2e944f7b6b199e811"
 *                           hotelName:
 *                             type: string
 *                             example: "Pullman Zamzam Makkah"
 *                           destination:
 *                             type: string
 *                             example: "Makkah"
 *                           roomType:
 *                             type: string
 *                             example: "Deluxe Haram View"
 *                           checkIn:
 *                             type: string
 *                             format: date-time
 *                             example: "2026-11-01T14:00:00.000Z"
 *                           checkOut:
 *                             type: string
 *                             format: date-time
 *                             example: "2026-11-06T11:00:00.000Z"
 *                           pricePerNight:
 *                             type: number
 *                             example: 450
 *                           meals:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ["breakfast"]
 *                           reservationRef:
 *                             type: string
 *                             example: "PZ-BLK-2026-01"
 *                           nameAdditionDeadline:
 *                             type: string
 *                             format: date-time
 *                             example: "2026-10-25T23:59:59.000Z"
 *                           reviewStatus:
 *                             type: string
 *                             enum: [pending_review, approved, rejected]
 *                             example: "approved"
 *                           reviewNotes:
 *                             type: string
 *                             nullable: true
 *                             example: "Rate plan verified with revenue director"
 *                           totalNights:
 *                             type: integer
 *                             example: 5
 *                           costPerUnit:
 *                             type: number
 *                             example: 2250
 *                           totalUnits:
 *                             type: integer
 *                             example: 10
 *                           availableUnits:
 *                             type: integer
 *                             example: 8
 *                           units:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 _id:
 *                                   type: string
 *                                   example: "66d4a8e2e944f7b6b199e814"
 *                                 status:
 *                                   type: string
 *                                   enum: [available, blocked, unavailable]
 *                                   example: "available"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/stock', hotelierController.listStock);

/**
 * @openapi
 * /api/v1/hotelier/hotel-amenities:
 *   get:
 *     tags:
 *       - Hotelier
 *     summary: Get hotel profile and amenities/facilities
 *     description: >
 *       Retrieves the assigned hotel's property profile, contact information, gallery images,
 *       and listed facilities/amenities. Internal confidential contract notes are strictly excluded.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Hotel amenities and profile fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         hotelId:
 *                           type: string
 *                           example: "66d4a8e2e944f7b6b199e811"
 *                         hotelName:
 *                           type: string
 *                           example: "Pullman Zamzam Makkah"
 *                         destination:
 *                           type: string
 *                           example: "Makkah"
 *                         address:
 *                           type: string
 *                           example: "Abraj Al Bait Complex, Makkah"
 *                         amenities:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["Free High-Speed Wi-Fi", "24/7 Room Service", "Haram View Rooms", "Restaurant"]
 *                         images:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["https://res.cloudinary.com/maqam/hotel1.jpg"]
 *                         contactPerson:
 *                           type: string
 *                           example: "Tariq Rahman"
 *                         contactEmail:
 *                           type: string
 *                           example: "reservations@pullmanmakkah.com"
 *                         contactPhone:
 *                           type: string
 *                           example: "+966123456789"
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/hotel-amenities', hotelierController.getHotelAmenities);

/**
 * @openapi
 * /api/v1/hotelier/stock:
 *   post:
 *     tags:
 *       - Hotelier
 *     summary: Submit new room stock batch for review
 *     description: >
 *       Submits a new wholesale block of hotel rooms for quality review.
 *       The batch is initialized with `reviewStatus: pending_review` and automatically generates
 *       the requested number of room units in `available` status. It will not be sellable in packages
 *       until approved by agency administrators.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomType
 *               - checkIn
 *               - checkOut
 *               - pricePerNight
 *               - reservationRef
 *               - nameAdditionDeadline
 *               - unitCount
 *             properties:
 *               roomType:
 *                 type: string
 *                 example: "Deluxe Haram View"
 *               checkIn:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-11-01T14:00:00.000Z"
 *               checkOut:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-11-06T11:00:00.000Z"
 *               pricePerNight:
 *                 type: number
 *                 minimum: 0
 *                 example: 450
 *               meals:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [breakfast, lunch, dinner]
 *                 example: ["breakfast", "dinner"]
 *               reservationRef:
 *                 type: string
 *                 example: "PZ-BLK-2026-01"
 *               nameAdditionDeadline:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-10-25T23:59:59.000Z"
 *               unitCount:
 *                 type: integer
 *                 minimum: 1
 *                 example: 10
 *               destination:
 *                 type: string
 *                 description: Optional destination override (defaults to hotel destination)
 *                 example: "Makkah"
 *     responses:
 *       201:
 *         description: Stock batch submitted for review successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/stock', hotelierValidator.validateCreateStock(), validate, hotelierController.createStock);

/**
 * @openapi
 * /api/v1/hotelier/stock/{id}:
 *   patch:
 *     tags:
 *       - Hotelier
 *     summary: Update stock batch details (resets to pending review)
 *     description: >
 *       Updates pricing, dates, meal inclusions, or deadlines on an existing batch.
 *       Commercial updates automatically reset `reviewStatus` back to `pending_review`.
 *       If the batch already has active customer bookings (units in assigned/used status),
 *       critical fields (checkIn, checkOut, roomType, destination) cannot be modified.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the Hotel Stock batch
 *         example: "66d4a8e2e944f7b6b199e813"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pricePerNight:
 *                 type: number
 *                 minimum: 0
 *                 example: 480
 *               checkIn:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-11-01T14:00:00.000Z"
 *               checkOut:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-11-06T11:00:00.000Z"
 *               nameAdditionDeadline:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-10-28T23:59:59.000Z"
 *               roomType:
 *                 type: string
 *                 example: "Deluxe Haram View"
 *               meals:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [breakfast, lunch, dinner]
 *                 example: ["breakfast"]
 *               reservationRef:
 *                 type: string
 *                 example: "PZ-BLK-2026-01-REV"
 *     responses:
 *       200:
 *         description: Stock batch updated and resubmitted for review successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/stock/:id', hotelierValidator.validateUpdateStock(), validate, hotelierController.updateStock);

/**
 * @openapi
 * /api/v1/hotelier/stock/{id}/units:
 *   post:
 *     tags:
 *       - Hotelier
 *     summary: Add extra room units to an existing stock batch
 *     description: >
 *       Increases available room units for an existing stock batch.
 *       Automatically resets the batch's `reviewStatus` back to `pending_review` for administrator approval.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the Hotel Stock batch
 *         example: "66d4a8e2e944f7b6b199e813"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - count
 *             properties:
 *               count:
 *                 type: integer
 *                 minimum: 1
 *                 description: Number of additional available units to append
 *                 example: 5
 *     responses:
 *       200:
 *         description: Units added and batch resubmitted for review.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/stock/:id/units', hotelierValidator.validateAddUnits(), validate, hotelierController.addUnits);

/**
 * @openapi
 * /api/v1/hotelier/stock/{id}/units/{unitId}:
 *   patch:
 *     tags:
 *       - Hotelier
 *     summary: Toggle individual room unit status (available / blocked)
 *     description: >
 *       Instantly toggles a specific unit between `available` and `blocked` (for internal maintenance or walk-in holds).
 *       Does NOT reset the batch `reviewStatus`.
 *       Units that are currently booked (`assigned` or `used`) cannot be modified.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the Hotel Stock batch
 *         example: "66d4a8e2e944f7b6b199e813"
 *       - in: path
 *         name: unitId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the specific room unit subdocument
 *         example: "66d4a8e2e944f7b6b199e814"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [available, blocked]
 *                 example: "blocked"
 *     responses:
 *       200:
 *         description: Unit status updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/stock/:id/units/:unitId', hotelierValidator.validateUpdateUnitStatus(), validate, hotelierController.updateUnitStatus);

/**
 * @openapi
 * /api/v1/hotelier/hotel-amenities:
 *   patch:
 *     tags:
 *       - Hotelier
 *     summary: Update hotel amenities / facilities
 *     description: >
 *       Updates the list of facilities and amenities for the hotelier's assigned hotel.
 *       Strict security rule: Only the `amenities` field is modified. All other property fields remain immutable.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amenities
 *             properties:
 *               amenities:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: string
 *                 example:
 *                   - "Free High-Speed Wi-Fi"
 *                   - "24/7 Room Service"
 *                   - "Haram View Rooms"
 *                   - "Wheelchair Accessible Shuttle"
 *                   - "Multi-Cuisine Buffet Restaurant"
 *     responses:
 *       200:
 *         description: Hotel amenities updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/hotel-amenities', hotelierValidator.validateUpdateAmenities(), validate, hotelierController.updateHotelAmenities);

/**
 * @openapi
 * /api/v1/hotelier/profile:
 *   get:
 *     tags:
 *       - Hotelier
 *     summary: Get hotelier account and assigned hotel profile
 *     description: >
 *       Retrieves the authenticated hotelier's user profile (personal details, credentials info, verification status)
 *       combined with their assigned hotel property details (destination, address, amenities, images, contact details).
 *       Internal confidential contract notes and sensitive credentials are strictly excluded.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Hotelier profile retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                               example: "6701a23b4f91c820d1e34567"
 *                             firstName:
 *                               type: string
 *                               example: "Tariq"
 *                             lastName:
 *                               type: string
 *                               example: "Rahman"
 *                             email:
 *                               type: string
 *                               example: "tariq@pullmanmakkah.com"
 *                             phone:
 *                               type: string
 *                               example: "+966123456789"
 *                             role:
 *                               type: string
 *                               example: "hotelier"
 *                             avatar:
 *                               type: string
 *                               example: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
 *                             isVerified:
 *                               type: boolean
 *                               example: true
 *                             isPhoneVerified:
 *                               type: boolean
 *                               example: true
 *                             createdAt:
 *                               type: string
 *                               format: date-time
 *                               example: "2026-09-01T08:00:00.000Z"
 *                         hotel:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                               example: "66d4a8e2e944f7b6b199e811"
 *                             name:
 *                               type: string
 *                               example: "Pullman Zamzam Makkah"
 *                             destination:
 *                               type: string
 *                               example: "Makkah"
 *                             address:
 *                               type: string
 *                               example: "Abraj Al Bait Complex, Makkah"
 *                             amenities:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               example: ["Free High-Speed Wi-Fi", "24/7 Room Service", "Haram View Rooms"]
 *                             images:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               example: ["https://res.cloudinary.com/maqam/hotel1.jpg"]
 *                             contactPerson:
 *                               type: string
 *                               example: "Tariq Rahman"
 *                             contactEmail:
 *                               type: string
 *                               example: "reservations@pullmanmakkah.com"
 *                             contactPhone:
 *                               type: string
 *                               example: "+966123456789"
 *                             isActive:
 *                               type: boolean
 *                               example: true
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/profile', hotelierController.getHotelierProfile);

module.exports = router;
