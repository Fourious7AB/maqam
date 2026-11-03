const express = require('express');
const bookingCrmController = require('./bookingCrm.controller');
const {
  validateListBookings,
  validateBookingParams,
  validateUpdateStatus,
  validateAssignAgent,
  validateAddRemark,
} = require('./bookingCrm.validator');
const validate = require('../../../middleware/validate');
const { authenticate, authorize } = require('../../../middleware/auth');
const { ROLES } = require('../../../config/constants');

const router = express.Router();

// Require authentication and CRM staff authorization
router.use(authenticate);
router.use(
  authorize(
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.SALES_AGENT,
    ROLES.SUPPORT_AGENT,
    ROLES.FINANCE
  )
);

/**
 * ─── CRM MASTER BOOKINGS & OPERATIONS DESK ROUTES ───────
 * Base path: /api/v1/crm/bookings
 */

/**
 * @openapi
 * /api/v1/crm/bookings:
 *   get:
 *     tags:
 *       - CRM - Bookings Desk
 *     summary: List All Bookings (Master Unified Search)
 *     description: Retrieve all bookings across Packages, Offers, Flights, and Hotels with customer details, dates, payment status, and handling agents.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: bookingType
 *         schema:
 *           type: string
 *           enum: [all, package, offer, flight, hotel, visa]
 *           default: all
 *         description: Filter by service category
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, failed, completed]
 *         description: Filter by booking status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by customer name, email, phone, or destination
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter bookings created after this date (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter bookings created before this date (ISO 8601)
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Filter by assigned agent user ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully with metadata pagination
 *       401:
 *         description: Unauthorized - Valid JWT required
 *       403:
 *         description: Forbidden - Insufficient CRM role permissions
 */
router.get('/', validateListBookings(), validate, bookingCrmController.listBookings);

/**
 * @openapi
 * /api/v1/crm/bookings/summary:
 *   get:
 *     tags:
 *       - CRM - Bookings Desk
 *     summary: Operations Queue & Metrics Summary
 *     description: Returns live metrics counters for top-bar operational badges (Total Bookings, Pending Operations, By Type, By Status, Total Gross Revenue).
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Operations summary retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/summary', bookingCrmController.getBookingsSummary);

/**
 * @openapi
 * /api/v1/crm/bookings/{bookingType}/{id}:
 *   get:
 *     tags:
 *       - CRM - Bookings Desk
 *     summary: Get 360° Booking Operations Dossier
 *     description: Retrieves the complete operational file for a single booking including customer details, itinerary, passengers, claimed stock / supplier info, payment status, and timeline remarks.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [package, offer, flight, hotel, visa]
 *         description: Booking service type
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking MongoDB ObjectId or supplier reference ID
 *     responses:
 *       200:
 *         description: Booking dossier retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Booking not found
 */
router.get('/:bookingType/:id', validateBookingParams(), validate, bookingCrmController.getBookingDossier);

/**
 * @openapi
 * /api/v1/crm/bookings/{bookingType}/{id}/status:
 *   patch:
 *     tags:
 *       - CRM - Bookings Desk
 *     summary: Operational Status Override & Offline Details
 *     description: Update booking status, record offline PNR or ticket numbers, and log an internal operational remark.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [package, offer, flight, hotel, visa]
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, cancelled, failed, completed]
 *                 example: confirmed
 *               pnr:
 *                 type: string
 *                 example: JED987X
 *               ticketNumber:
 *                 type: string
 *                 example: 098-9876543210
 *               internalRemark:
 *                 type: string
 *                 example: Customer payment verified via NEFT bank transfer
 *     responses:
 *       200:
 *         description: Booking status updated successfully
 *       400:
 *         description: Invalid status or validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
router.patch('/:bookingType/:id/status', validateUpdateStatus(), validate, bookingCrmController.updateBookingStatus);

/**
 * @openapi
 * /api/v1/crm/bookings/{bookingType}/{id}/assign:
 *   patch:
 *     tags:
 *       - CRM - Bookings Desk
 *     summary: Assign Handling Agent
 *     description: Assigns a sales or support agent to oversee the booking file.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [package, offer, flight, hotel, visa]
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
 *               - assignedTo
 *             properties:
 *               assignedTo:
 *                 type: string
 *                 example: 671a98b76e123456789abcde
 *     responses:
 *       200:
 *         description: Agent assigned successfully
 *       400:
 *         description: Invalid agent ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking or agent not found
 */
router.patch('/:bookingType/:id/assign', validateAssignAgent(), validate, bookingCrmController.assignBookingAgent);

/**
 * @openapi
 * /api/v1/crm/bookings/{bookingType}/{id}/remarks:
 *   post:
 *     tags:
 *       - CRM - Bookings Desk
 *     summary: Add Operational Timeline Remark
 *     description: Appends an internal note or customer interaction trace to the booking timeline.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [package, offer, flight, hotel, visa]
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
 *               - remark
 *             properties:
 *               remark:
 *                 type: string
 *                 example: Customer called to request wheelchair assistance at airport
 *     responses:
 *       200:
 *         description: Remark added successfully
 *       400:
 *         description: Remark text required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
router.post('/:bookingType/:id/remarks', validateAddRemark(), validate, bookingCrmController.addBookingRemark);
router.post('/:bookingType/:id/resend-notification', validateBookingParams(), validate, bookingCrmController.resendNotification);

module.exports = router;
