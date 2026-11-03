// modules/packages/stock/stockAdmin.routes.js
//
// CRM / Admin Inventory & Wholesale Stock Management
// Base path: /api/v1/crm/stocks

const express = require("express");
const stockAdminController = require("./stockAdmin.controller");
const { authenticate, authorize } = require("../../../middleware/auth");

const router = express.Router();

router.use(authenticate);
router.use(authorize("admin", "super_admin"));

/**
 * @openapi
 * /api/v1/crm/stocks/overview:
 *   get:
 *     tags:
 *       - Stocks - CRM / Admin
 *     summary: Inventory Utilization Dashboard & Metrics
 *     description: Returns consolidated metrics for all flight seats and hotel rooms (total, available, held, used, expiring soon).
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Stock overview metrics retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
router.get("/overview", stockAdminController.adminGetStockOverview);

/**
 * @openapi
 * /api/v1/crm/stocks/flights:
 *   get:
 *     tags:
 *       - Stocks - CRM / Admin
 *     summary: List Wholesale Flight Ticket Stocks
 *     description: Paginated search of block ticket batches (filter by airline, origin, destination, PNR, dates).
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
 *         name: airline
 *         schema:
 *           type: string
 *       - in: query
 *         name: origin
 *         schema:
 *           type: string
 *       - in: query
 *         name: destination
 *         schema:
 *           type: string
 *       - in: query
 *         name: pnr
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of flight stocks retrieved successfully.
 *   post:
 *     tags:
 *       - Stocks - CRM / Admin
 *     summary: Add Wholesale Flight Ticket Stock Batch
 *     description: Adds bulk PNR block seats to inventory. Auto-generates individual unit items in available status.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - airline
 *               - flightNumber
 *               - origin
 *               - destination
 *               - departureDate
 *               - pnr
 *               - nameAdditionDeadline
 *               - costPerUnit
 *               - totalUnits
 *             properties:
 *               airline:
 *                 type: string
 *                 example: "IndiGo"
 *               flightNumber:
 *                 type: string
 *                 example: "6E-1452"
 *               origin:
 *                 type: string
 *                 example: "DEL"
 *               destination:
 *                 type: string
 *                 example: "DXB"
 *               departureDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-11-15T08:30:00.000Z"
 *               arrivalDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-11-15T12:00:00.000Z"
 *               cabinClass:
 *                 type: string
 *                 default: "Economy"
 *               pnr:
 *                 type: string
 *                 example: "IND99812A"
 *               nameAdditionDeadline:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-11-10T23:59:59.000Z"
 *               costPerUnit:
 *                 type: number
 *                 example: 9500
 *               totalUnits:
 *                 type: integer
 *                 example: 30
 *     responses:
 *       201:
 *         description: Flight stock batch added successfully.
 */
router.get("/flights", stockAdminController.adminListFlightStocks);
router.post("/flights", stockAdminController.adminCreateFlightStock);

/**
 * @openapi
 * /api/v1/crm/stocks/flights/{id}:
 *   get:
 *     tags:
 *       - Stocks - CRM / Admin
 *     summary: Get Wholesale Flight Ticket Stock Batch by ID
 *     description: Returns detailed information for a single wholesale flight ticket stock batch, including all allocated seats and their current status.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the Flight Ticket Stock batch
 *         example: "66d4a8e2e944f7b6b199e811"
 *     responses:
 *       200:
 *         description: Flight ticket stock batch retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               message: "Flight ticket stock batch retrieved successfully"
 *               data:
 *                 _id: "66d4a8e2e944f7b6b199e811"
 *                 airline: "IndiGo"
 *                 flightNumber: "6E-1452"
 *                 origin: "DEL"
 *                 destination: "DXB"
 *                 departureDate: "2026-11-15T08:30:00.000Z"
 *                 arrivalDate: "2026-11-15T12:00:00.000Z"
 *                 cabinClass: "Economy"
 *                 pnr: "IND99812A"
 *                 nameAdditionDeadline: "2026-11-10T23:59:59.000Z"
 *                 costPerUnit: 9500
 *                 totalUnits: 30
 *                 availableUnits: 30
 *                 heldUnits: 0
 *                 usedUnits: 0
 *                 units:
 *                   - _id: "66d4a8e2e944f7b6b199e812"
 *                     status: "available"
 *                     heldUntil: null
 *                 createdBy:
 *                   _id: "66d4a8e2e944f7b6b199e810"
 *                   firstName: "Admin"
 *                   lastName: "User"
 *                   email: "admin@maqamtravels.com"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/flights/:id", stockAdminController.adminGetFlightStock);

/**
 * @openapi
 * /api/v1/crm/stocks/flights/{id}:
 *   patch:
 *     tags:
 *       - Stocks - CRM / Admin
 *     summary: Update Wholesale Flight Stock Batch (Times, Cost, Units)
 *     description: |
 *       Admin endpoint to update wholesale flight stock batch properties:
 *       - **Batch Times**: departureDate, arrivalDate, nameAdditionDeadline
 *       - **Cost**: costPerUnit
 *       - **Units**: totalUnits (adjusts available seat pool) or specific seat status/ticketNumber
 *       - **Details**: airline, flightNumber, origin, destination, cabinClass, pnr
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the Flight Ticket Stock batch
 *         example: "66d4a8e2e944f7b6b199e811"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               departureDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-11-15T09:30:00.000Z"
 *               arrivalDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-11-15T13:00:00.000Z"
 *               nameAdditionDeadline:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-11-12T23:59:59.000Z"
 *               costPerUnit:
 *                 type: number
 *                 example: 9800
 *               totalUnits:
 *                 type: integer
 *                 description: New total unit count (safely adjusts available seat units)
 *                 example: 35
 *               units:
 *                 type: array
 *                 description: Array of individual unit updates or additions
 *                 items:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "66d4a8e2e944f7b6b199e812"
 *                     status:
 *                       type: string
 *                       enum: [available, assigned, used]
 *                       example: "available"
 *                     ticketNumber:
 *                       type: string
 *                       example: "ETKT-0987654321"
 *               unitId:
 *                 type: string
 *                 description: Target a single unit by ID
 *                 example: "66d4a8e2e944f7b6b199e812"
 *               unitStatus:
 *                 type: string
 *                 enum: [available, assigned, used]
 *                 example: "used"
 *               ticketNumber:
 *                 type: string
 *                 example: "ETKT-0987654321"
 *               airline:
 *                 type: string
 *                 example: "IndiGo"
 *               flightNumber:
 *                 type: string
 *                 example: "6E-1452"
 *               origin:
 *                 type: string
 *                 example: "DEL"
 *               destination:
 *                 type: string
 *                 example: "DXB"
 *               cabinClass:
 *                 type: string
 *                 example: "Economy"
 *               pnr:
 *                 type: string
 *                 example: "IND99812A"
 *     responses:
 *       200:
 *         description: Flight ticket stock batch updated successfully.
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
router.patch("/flights/:id", stockAdminController.adminUpdateFlightStock);

/**
 * @openapi
 * /api/v1/crm/stocks/hotels:
 *   get:
 *     tags:
 *       - Stocks - CRM / Admin
 *     summary: List Wholesale Hotel Room Stocks
 *     description: Paginated list of contracted hotel room blocks (filter by hotel, destination, dates).
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
 *         name: destination
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of hotel room stocks retrieved successfully.
 *   post:
 *     tags:
 *       - Stocks - CRM / Admin
 *     summary: Add Contracted Hotel Room Allotment
 *     description: Adds contracted hotel room nights. Auto-generates individual room units in available status.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hotelId
 *               - roomType
 *               - checkIn
 *               - checkOut
 *               - pricePerNight
 *               - reservationRef
 *               - nameAdditionDeadline
 *               - totalUnits
 *             properties:
 *               hotelId:
 *                 type: string
 *                 example: "66d4a8e2e944f7b6b199e811"
 *               hotelName:
 *                 type: string
 *                 example: "Grand Hyatt Dubai"
 *               destination:
 *                 type: string
 *                 example: "Dubai"
 *               roomType:
 *                 type: string
 *                 example: "Deluxe King Room"
 *               checkIn:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-11-15T14:00:00.000Z"
 *               checkOut:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-11-20T11:00:00.000Z"
 *               pricePerNight:
 *                 type: number
 *                 example: 3500
 *               meals:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["breakfast"]
 *               reservationRef:
 *                 type: string
 *                 example: "HYATT-BLK-8821"
 *               nameAdditionDeadline:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-11-10T23:59:59.000Z"
 *               totalUnits:
 *                 type: integer
 *                 example: 15
 *     responses:
 *       201:
 *         description: Hotel stock allotment added successfully.
 */
router.get("/hotels", stockAdminController.adminListHotelStocks);
router.post("/hotels", stockAdminController.adminCreateHotelStock);

/**
 * @openapi
 * /api/v1/crm/stocks/hotels/{id}:
 *   get:
 *     tags:
 *       - Stocks - CRM / Admin
 *     summary: Get Wholesale Hotel Room Stock Allotment by ID
 *     description: Returns detailed information for a single contracted hotel room allotment batch, including review status, meals, room units, and hotel profile.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the Hotel Stock allotment
 *         example: "66d4a8e2e944f7b6b199e813"
 *     responses:
 *       200:
 *         description: Hotel stock retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               message: "Hotel stock retrieved successfully"
 *               data:
 *                 _id: "66d4a8e2e944f7b6b199e813"
 *                 hotelId:
 *                   _id: "66d4a8e2e944f7b6b199e811"
 *                   name: "Grand Hyatt Dubai"
 *                   destination: "Dubai"
 *                 hotelName: "Grand Hyatt Dubai"
 *                 destination: "Dubai"
 *                 roomType: "Deluxe King Room"
 *                 checkIn: "2026-11-15T14:00:00.000Z"
 *                 checkOut: "2026-11-20T11:00:00.000Z"
 *                 pricePerNight: 3500
 *                 totalNights: 5
 *                 costPerUnit: 17500
 *                 meals: ["breakfast", "dinner"]
 *                 reservationRef: "HYATT-BLK-8821"
 *                 nameAdditionDeadline: "2026-11-10T23:59:59.000Z"
 *                 reviewStatus: "approved"
 *                 reviewNotes: "Contract verified with Hyatt sales desk"
 *                 totalUnits: 15
 *                 availableUnits: 15
 *                 units:
 *                   - _id: "66d4a8e2e944f7b6b199e814"
 *                     status: "available"
 *                     guestConfirmationRef: null
 *                 createdBy:
 *                   _id: "66d4a8e2e944f7b6b199e810"
 *                   firstName: "Admin"
 *                   lastName: "User"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   patch:
 *     tags:
 *       - Stocks - CRM / Admin
 *     summary: Update Wholesale Hotel Stock Allotment (Review Status, Unit Status, Meals)
 *     description: |
 *       Admin endpoint to update wholesale hotel stock allotment properties:
 *       - **Review Status**: reviewStatus (pending_review, approved, rejected), reviewNotes
 *       - **Unit Status / Inventory**: unitStatus, unitId, units array, or totalUnits (adjusts room count)
 *       - **Meals**: meals array (breakfast, lunch, dinner)
 *       - **Dates & Rates**: checkIn, checkOut, pricePerNight, reservationRef, nameAdditionDeadline, roomType
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the Hotel Stock allotment
 *         example: "66d4a8e2e944f7b6b199e813"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reviewStatus:
 *                 type: string
 *                 enum: [pending_review, approved, rejected]
 *                 example: "approved"
 *               reviewNotes:
 *                 type: string
 *                 example: "Allotment confirmed and countersigned by hotelier"
 *               meals:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [breakfast, lunch, dinner]
 *                 example: ["breakfast", "dinner"]
 *               totalUnits:
 *                 type: integer
 *                 description: New total room count (safely adjusts available pool)
 *                 example: 20
 *               units:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "66d4a8e2e944f7b6b199e814"
 *                     status:
 *                       type: string
 *                       enum: [available, blocked, assigned, used]
 *                       example: "blocked"
 *                     guestConfirmationRef:
 *                       type: string
 *                       example: "CONF-8821-ROOM-1"
 *               unitId:
 *                 type: string
 *                 description: Target a single room unit by ID
 *                 example: "66d4a8e2e944f7b6b199e814"
 *               unitStatus:
 *                 type: string
 *                 enum: [available, blocked, assigned, used]
 *                 example: "blocked"
 *               guestConfirmationRef:
 *                 type: string
 *                 example: "CONF-8821-ROOM-1"
 *               checkIn:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-11-15T14:00:00.000Z"
 *               checkOut:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-11-20T11:00:00.000Z"
 *               pricePerNight:
 *                 type: number
 *                 example: 3800
 *               reservationRef:
 *                 type: string
 *                 example: "HYATT-BLK-8821"
 *               nameAdditionDeadline:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-11-12T23:59:59.000Z"
 *               roomType:
 *                 type: string
 *                 example: "Deluxe King Room"
 *     responses:
 *       200:
 *         description: Hotel room allotment stock updated successfully.
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
router.get("/hotels/:id", stockAdminController.adminGetHotelStock);
router.patch("/hotels/:id", stockAdminController.adminUpdateHotelStock);

module.exports = router;
