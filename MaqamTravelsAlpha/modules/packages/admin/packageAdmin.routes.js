// modules/packages/admin/packageAdmin.routes.js
//
// CRM / Admin Package Management & Operations endpoints
// Base path: /api/v1/crm/packages

const express = require("express");
const packageAdminController = require("./packageAdmin.controller");
const packageBookingAdminController = require("./packageBookingAdmin.controller");
const { authenticate, authorize } = require("../../../middleware/auth");
const { uploadArray } = require("../../../middleware/upload");

const router = express.Router();

router.use(authenticate);

/**
 * @openapi
 * /api/v1/crm/packages:
 *   get:
 *     tags:
 *       - Packages - CRM / Admin
 *     summary: List All Packages with Cost & Profit Analytics
 *     description: Returns all packages with underlying wholesale cost price, gross profit margins, discount percentages, and active status.
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
 *         description: Packages list with margin analytics retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *   post:
 *     tags:
 *       - Packages - CRM / Admin
 *     summary: Create New Package
 *     description: Creates a new package bundle with minimum 2 Offer components (e.g. Flight + Hotel). If sellPrice is omitted, automatically computes base price from underlying retail items and bundle discount.
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
 *               - offerRefs
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: "Binary image files to upload directly to Cloudinary"
 *               title:
 *                 type: string
 *                 example: "Dubai Explorer 5D4N"
 *               destination:
 *                 type: string
 *                 example: "Dubai"
 *               description:
 *                 type: string
 *                 example: "Complete Dubai package with flights and 4-star luxury stay"
 *               offerRefs:
 *                 type: string
 *                 description: 'JSON string of offerRefs array, e.g. [{"offer":"66d4a8e2e944f7b6b199e810","unitsPerBooking":1}]'
 *                 example: '[{"offer":"66d4a8e2e944f7b6b199e810","unitsPerBooking":1}]'
 *               bundleDiscountPercentage:
 *                 type: number
 *                 example: 10
 *               sellPrice:
 *                 type: number
 *                 example: 36000
 *               inclusions:
 *                 type: string
 *                 description: 'JSON string of inclusions array, e.g. ["Flights", "Hotel", "Transfers"]'
 *                 example: '["Flights", "Hotel", "Airport Transfers"]'
 *               itinerary:
 *                 type: string
 *                 description: 'JSON string of itinerary days'
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminCreatePackageRequest'
 *     responses:
 *       201:
 *         description: Package created successfully.
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
 */
router.get("/", authorize("admin", "super_admin"), packageAdminController.adminListPackages);
router.post("/", authorize("admin", "super_admin"), uploadArray("images", 10), packageAdminController.adminCreatePackage);

/**
 * @openapi
 * /api/v1/crm/packages/upload-images:
 *   post:
 *     tags:
 *       - Packages - CRM / Admin
 *     summary: Upload Package Images to Cloudinary
 *     description: Streams up to 10 image files to Cloudinary and returns secure HTTPS URLs.
 *     security:
 *       - BearerAuth: []
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
 *         description: Images uploaded successfully.
 */
router.post(
  "/upload-images",
  authorize("admin", "super_admin"),
  uploadArray("images", 10),
  packageAdminController.adminUploadPackageImages
);

router.post(
  "/:id/images",
  authorize("admin", "super_admin"),
  uploadArray("images", 10),
  packageAdminController.adminAttachPackageImages
);

router.delete(
  "/:id/images",
  authorize("admin", "super_admin"),
  packageAdminController.adminRemovePackageImage
);

/**
 * @openapi
 * /api/v1/crm/packages/bookings:
 *   get:
 *     tags:
 *       - Packages - CRM / Admin
 *     summary: List All Package Bookings
 *     description: List package bookings with filtering by status, package, customer, or assigned agent.
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [initiated, pending, confirmed, cancelled]
 *       - in: query
 *         name: packageId
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
router.get(
  "/bookings",
  authorize("admin", "super_admin", "finance", "agent"),
  packageBookingAdminController.adminListBookings,
);

/**
 * @openapi
 * /api/v1/crm/packages/book-for-customer:
 *   post:
 *     tags:
 *       - Packages - CRM / Admin
 *     summary: Direct Package Booking for Customer via Bank Transfer
 *     description: Admin/Agent books a package bundle directly for a customer with offline bank transfer, claiming wholesale stock units directly into confirmed/used state.
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
 *               - packageId
 *               - travellers
 *             properties:
 *               customerId:
 *                 type: string
 *               packageId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 default: 1
 *               travellers:
 *                 type: array
 *                 items:
 *                   type: object
 *               travelDates:
 *                 type: object
 *                 properties:
 *                   startDate:
 *                     type: string
 *                     format: date-time
 *                   endDate:
 *                     type: string
 *                     format: date-time
 *               contactDetails:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: string
 *                   phone:
 *                     type: string
 *               payment:
 *                 type: object
 *                 properties:
 *                   method:
 *                     type: string
 *                     default: bank_transfer
 *                   referenceNumber:
 *                     type: string
 *                   notes:
 *                     type: string
 *     responses:
 *       201:
 *         description: Direct booking completed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
router.post(
  "/book-for-customer",
  authorize("admin", "super_admin", "finance", "agent"),
  packageBookingAdminController.adminBookPackageForCustomer,
);

/**
 * @openapi
 * /api/v1/crm/packages/bookings/{id}:
 *   get:
 *     tags:
 *       - Packages - CRM / Admin
 *     summary: CRM Package Booking Lookup & Operations Details
 *     description: Retrieves comprehensive booking file including customer info, customized options, claimed stock units, and assigned operations officer.
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
 *         description: Booking operations detail retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  "/bookings/:id",
  authorize("admin", "super_admin", "finance", "agent"),
  packageBookingAdminController.adminGetBooking,
);

/**
 * @openapi
 * /api/v1/crm/packages/bookings/{id}/assign:
 *   patch:
 *     tags:
 *       - Packages - CRM / Admin
 *     summary: Assign Package Booking to Operations Case Officer
 *     description: Assigns the package booking to an Operations Agent / Case Officer in the CRM.
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminAssignPackageBookingRequest'
 *     responses:
 *       200:
 *         description: Package booking assigned successfully.
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
 */
router.patch(
  "/bookings/:id/assign",
  authorize("admin", "super_admin"),
  packageBookingAdminController.adminAssignBooking,
);

/**
 * @openapi
 * /api/v1/crm/packages/bookings/{id}/cancel:
 *   post:
 *     tags:
 *       - Packages - CRM / Admin
 *     summary: Cancel Package Booking & Release Claimed Stock
 *     description: Cancels package booking, releases underlying ticket/hotel units back to available wholesale stock, updates payment, and writes cancellation remark.
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
 *     responses:
 *       200:
 *         description: Package booking cancelled successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
router.post(
  "/bookings/:id/cancel",
  authorize("admin", "super_admin", "finance"),
  packageBookingAdminController.adminCancelBooking,
);

/**
 * @openapi
 * /api/v1/crm/packages/bookings/{id}:
 *   patch:
 *     tags:
 *       - Packages - CRM / Admin
 *     summary: Update Confirmed Package Booking Details
 *     description: Modify travel dates, contact details, and operational remark on a confirmed booking. Structural changes (adding/removing/swapping components) are rejected by guardrails.
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               travelDates:
 *                 type: object
 *                 properties:
 *                   startDate:
 *                     type: string
 *                     format: date-time
 *                   endDate:
 *                     type: string
 *                     format: date-time
 *               contactDetails:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   emergencyContact:
 *                     type: string
 *               remark:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
router.patch(
  "/bookings/:id",
  authorize("admin", "super_admin", "agent"),
  packageBookingAdminController.adminUpdateConfirmedBooking,
);

/**
 * @openapi
 * /api/v1/crm/packages/bookings/{id}/remark:
 *   patch:
 *     tags:
 *       - Packages - CRM / Admin
 *     summary: Add Operational Remark to Package Booking
 *     description: Appends an internal operational remark to the package booking audit trail.
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
 *     responses:
 *       200:
 *         description: Remark added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
router.patch(
  "/bookings/:id/remark",
  authorize("admin", "super_admin", "agent"),
  packageBookingAdminController.adminAddRemark,
);

/**
 * @openapi
 * /api/v1/crm/packages/{id}:
 *   get:
 *     tags:
 *       - Packages - CRM / Admin
 *     summary: Get Package Detail for CRM
 *     description: Retrieves complete package configuration, wholesale cost price breakdown, gross profit margins, and inventory counts.
 *     security:
 *       - BearerAuth: []
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
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   patch:
 *     tags:
 *       - Packages - CRM / Admin
 *     summary: Update Package Configuration
 *     description: Updates package title, description, discount percentage, sell price, bundled offers, or itinerary.
 *     security:
 *       - BearerAuth: []
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
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               bundleDiscountPercentage:
 *                 type: number
 *               sellPrice:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Package updated successfully.
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
 */
router.get("/:id", authorize("admin", "super_admin"), packageAdminController.adminGetPackage);
router.patch("/:id", authorize("admin", "super_admin"), uploadArray("images", 10), packageAdminController.adminUpdatePackage);

/**
 * @openapi
 * /api/v1/crm/packages/{id}/deactivate:
 *   patch:
 *     tags:
 *       - Packages - CRM / Admin
 *     summary: Deactivate Package
 *     description: Sets package isActive to false (hiding it from customer storefront while preserving past bookings).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *     responses:
 *       200:
 *         description: Package deactivated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  "/:id/deactivate",
  authorize("admin", "super_admin"),
  packageAdminController.adminDeactivatePackage,
);

module.exports = router;
