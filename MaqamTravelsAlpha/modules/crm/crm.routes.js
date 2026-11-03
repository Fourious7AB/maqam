const router = require("express").Router();
const crmController = require("./crm.controller");
const crmValidator = require("./crm.validator");
const validate = require("../../middleware/validate");
const { authenticate, authorize } = require("../../middleware/auth");

const settingsRoutes = require("./settings.routes");
const crmAdminExtraRoutes = require("./crmAdminExtra.routes");




/**
 * ─── CRM ROUTES ────────────────────────────────────────
 * Pattern: Admin & CRM staff management routes
 */

// All CRM routes require authentication
router.use(authenticate);



// CRM Settings Routes (/api/v1/crm/setting and /api/v1/crm/settings)
router.use("/setting", settingsRoutes);
router.use("/settings", settingsRoutes);
router.use("/", crmAdminExtraRoutes);

// Backward compatibility: delegate /markup to settings router
router.all("/markup*", (req, res, next) => {
  return settingsRoutes(req, res, next);
});

/**
 * @openapi
 * /api/v1/crm/leads:
 *   get:
 *     tags:
 *       - CRM - Leads
 *     summary: List Leads with Filtering and Pagination
 *     description: Retrieve all sales leads. Filterable by status and assigned sales agent.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, contacted, qualified, proposal_sent, negotiating, converted, lost]
 *         description: Lead status filter
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: User ID of assigned agent
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
 *     responses:
 *       200:
 *         description: Leads list retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires admin, super_admin, or sales_agent role
 *   post:
 *     tags:
 *       - CRM - Leads
 *     summary: Create New Sales Lead
 *     description: Creates a new lead assigned to the calling agent or unassigned.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - email
 *               - destination
 *               - travelDates
 *               - numberOfPeople
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "Ahmed"
 *               lastName:
 *                 type: string
 *                 example: "Khan"
 *               email:
 *                 type: string
 *                 example: "ahmed.khan@example.com"
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               destination:
 *                 type: string
 *                 example: "Makkah"
 *               travelDates:
 *                 type: object
 *                 properties:
 *                   from:
 *                     type: string
 *                     format: date
 *                   to:
 *                     type: string
 *                     format: date
 *               numberOfPeople:
 *                 type: integer
 *                 example: 4
 *               budget:
 *                 type: number
 *                 example: 250000
 *               specialRequests:
 *                 type: string
 *                 example: "Wheelchair accessible room required"
 *     responses:
 *       201:
 *         description: Lead created successfully
 *       400:
 *         description: Validation error
 */
router.get(
  "/leads",
  authorize("admin", "super_admin", "sales_agent"),
  crmValidator.validateListLeads(),
  validate,
  crmController.listLeads,
);
router.post(
  "/leads",
  authorize("admin", "super_admin", "sales_agent"),
  crmValidator.validateCreateLead(),
  validate,
  crmController.createLead,
);

/**
 * @openapi
 * /api/v1/crm/leads/{leadId}:
 *   get:
 *     tags:
 *       - CRM - Leads
 *     summary: Get Single Lead Details
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lead details retrieved
 *       404:
 *         description: Lead not found
 *   put:
 *     tags:
 *       - CRM - Leads
 *     summary: Update Lead Details & Status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [new, contacted, qualified, proposal_sent, negotiating, converted, lost]
 *               contactNotes:
 *                 type: string
 *               quotedPrice:
 *                 type: number
 *               lostReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lead updated successfully
 *       404:
 *         description: Lead not found
 */
router.get(
  ["/leads/:id", "/leads/:leadId"],
  authorize("admin", "super_admin", "sales_agent"),
  crmValidator.validateLeadId(),
  validate,
  crmController.getLeadDetails,
);

router.patch(
  ["/leads/:id", "/leads/:leadId"],
  authorize("admin", "super_admin", "sales_agent"),
  crmValidator.validateUpdateLead(),
  validate,
  crmController.updateLead,
);

router.put(
  ["/leads/:id", "/leads/:leadId"],
  authorize("admin", "super_admin", "sales_agent"),
  crmValidator.validateUpdateLead(),
  validate,
  crmController.updateLead,
);

/**
 * @openapi
 * /api/v1/crm/leads/{id}/notes:
 *   post:
 *     tags:
 *       - CRM - Leads
 *     summary: Add Follow-Up Note to Lead Activity Timeline
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
 *               - note
 *             properties:
 *               note:
 *                 type: string
 *                 example: "Called customer, he will confirm by Friday."
 *     responses:
 *       200:
 *         description: Note added and timeline updated
 *       404:
 *         description: Lead not found
 */
router.post(
  ["/leads/:id/notes", "/leads/:leadId/notes"],
  authorize("admin", "super_admin", "sales_agent"),
  crmValidator.validateAddLeadNote(),
  validate,
  crmController.addLeadNote,
);

/**
 * @openapi
 * /api/v1/crm/leads/{id}/convert:
 *   post:
 *     tags:
 *       - CRM - Leads
 *     summary: Convert Lead to Customer / Booking
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
 *               customerType:
 *                 type: string
 *                 enum: [new, existing]
 *                 example: "existing"
 *               bookingId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lead converted to booking/customer successfully
 *       404:
 *         description: Lead not found
 */
router.post(
  ["/leads/:id/convert", "/leads/:leadId/convert"],
  authorize("admin", "super_admin", "sales_agent"),
  crmValidator.validateConvertLead(),
  validate,
  crmController.convertLead,
);


/**
 * @openapi
 * /api/v1/crm/stats:
 *   get:
 *     tags:
 *       - CRM - Analytics & Pipeline
 *     summary: Get Sales Agent Statistics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Agent statistics retrieved successfully
 */
router.get(
  "/stats",
  authorize("admin", "super_admin", "sales_agent"),
  crmController.getAgentStats,
);

/**
 * @openapi
 * /api/v1/crm/pipeline:
 *   get:
 *     tags:
 *       - CRM - Analytics & Pipeline
 *     summary: Get Overall Pipeline Overview
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Pipeline overview retrieved successfully
 */
router.get(
  "/pipeline",
  authorize("admin", "super_admin", "sales_agent"),
  crmController.getPipelineOverview,
);

/**
 * @openapi
 * /api/v1/crm/hotels:
 *   get:
 *     tags:
 *       - CRM - Hotels
 *     summary: List Hotels (CRM Admin View)
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
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hotels list retrieved
 *   post:
 *     tags:
 *       - CRM - Hotels
 *     summary: Create New Hotel Entity
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - destination
 *               - address
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Pullman Zamzam Makkah"
 *               destination:
 *                 type: string
 *                 example: "Makkah"
 *               address:
 *                 type: string
 *                 example: "Abraj Al Bait Complex, Makkah"
 *               starRating:
 *                 type: number
 *                 example: 5
 *     responses:
 *       201:
 *         description: Hotel entity created successfully
 */
router.get(
  "/hotels",
  authorize("admin", "super_admin"),
  crmController.listHotels,
);
router.post(
  "/hotels",
  authorize("admin", "super_admin"),
  crmValidator.validateCreateHotel(),
  validate,
  crmController.createHotel,
);

/**
 * @openapi
 * /api/v1/crm/hotels/{id}:
 *   get:
 *     tags:
 *       - CRM - Hotels
 *     summary: Get Hotel Details
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
 *         description: Hotel details retrieved
 *       404:
 *         description: Hotel not found
 *   patch:
 *     tags:
 *       - CRM - Hotels
 *     summary: Update Hotel Entity
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
 *               name:
 *                 type: string
 *               destination:
 *                 type: string
 *               address:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Hotel updated successfully
 *       404:
 *         description: Hotel not found
 *   delete:
 *     tags:
 *       - CRM - Hotels
 *     summary: Delete Hotel Entity
 *     description: Delete a hotel entity according to hotel ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel ID (MongoDB ObjectId)
 *       - in: query
 *         name: permanent
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Set false to soft-delete (deactivate) instead of permanently deleting
 *     responses:
 *       200:
 *         description: Hotel deleted successfully
 *       404:
 *         description: Hotel not found
 */
router.get(
  "/hotels/:id",
  authorize("admin", "super_admin"),
  crmController.getHotelDetails,
);
router.patch(
  "/hotels/:id",
  authorize("admin", "super_admin"),
  crmValidator.validateUpdateHotel(),
  validate,
  crmController.updateHotel,
);
router.delete(
  "/hotels/:id",
  authorize("admin", "super_admin"),
  crmValidator.validateHotelId(),
  validate,
  crmController.deleteHotel,
);

/**
 * @openapi
 * /api/v1/crm/users:
 *   post:
 *     tags:
 *       - CRM - User & Staff Management
 *     summary: Create Staff / Hotelier User
 *     description: Administrative endpoint to create CRM staff accounts (sales_agent, support_agent, admin, super_admin, hotelier).
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
 *               - password
 *               - firstName
 *               - lastName
 *               - role
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               email:
 *                 type: string
 *                 example: "agent@maqamtravels.com"
 *               password:
 *                 type: string
 *                 example: "SecurePass123"
 *               firstName:
 *                 type: string
 *                 example: "Tariq"
 *               lastName:
 *                 type: string
 *                 example: "Rahman"
 *               role:
 *                 type: string
 *                 enum: [customer, sales_agent, support_agent, admin, super_admin, hotelier]
 *                 example: "sales_agent"
 *               hotelId:
 *                 type: string
 *                 description: Required only if role is hotelier
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Phone or email already registered
 */
router.post(
  "/users",
  authorize("admin", "super_admin"),
  crmValidator.validateCreateCrmUser(),
  validate,
  crmController.createCrmUser,
);

/**
 * @openapi
 * /api/v1/crm/hotel-stock/pending:
 *   get:
 *     tags:
 *       - CRM - Hotel Stock Review
 *     summary: List Pending Hotel Stock Batches for Review
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
 *     responses:
 *       200:
 *         description: Pending stock batches retrieved
 */
router.get(
  "/hotel-stock/pending",
  authorize("admin", "super_admin"),
  crmController.listPendingHotelStock,
);

/**
 * @openapi
 * /api/v1/crm/hotel-stock/{id}/review:
 *   patch:
 *     tags:
 *       - CRM - Hotel Stock Review
 *     summary: Review / Approve / Reject Hotel Stock Batch
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
 *               - decision
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 example: "approved"
 *               rejectionReason:
 *                 type: string
 *                 example: "Price per room exceeds agreed seasonal wholesale rate"
 *     responses:
 *       200:
 *         description: Stock batch review updated successfully
 *       400:
 *         description: Invalid decision or missing reason
 *       404:
 *         description: Stock batch not found
 */
router.patch(
  "/hotel-stock/:id/review",
  authorize("admin", "super_admin"),
  crmValidator.validateReviewStock(),
  validate,
  crmController.reviewHotelStock,
);

/**
 * @openapi
 * /api/v1/crm/hotel-stock/approved:
 *   get:
 *     tags:
 *       - CRM - Hotel Stock Review
 *     summary: List Approved Hotel Stock
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Approved hotel stock retrieved
 */
router.get(
  "/hotel-stock/approved",
  authorize("admin", "super_admin"),
  crmController.listApprovedHotelStock,
);

/**
 * @openapi
 * /api/v1/crm/finance/overview:
 *   post:
 *     tags:
 *       - CRM - Finance & Revenue Analytics
 *     summary: Get Finance Revenue Overview
 *     description: Calculates Gross Revenue, Pending Payment, Net Revenue, Refunds, and Transaction counts based on the payment metrics formula card for a specified date range.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-01-01"
 *                 description: Starting boundary date (inclusive)
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-12-31"
 *                 description: Ending boundary date (inclusive)
 *               currency:
 *                 type: string
 *                 enum: [INR, USD, EUR, AED, SAR, GBP]
 *                 example: "INR"
 *                 description: Optional currency filter
 *     responses:
 *       200:
 *         description: Finance overview retrieved successfully
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
 *                   example: "Finance overview retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     currency:
 *                       type: string
 *                       example: "INR"
 *                     grossRevenue:
 *                       type: number
 *                       example: 500000
 *                     pendingPayment:
 *                       type: number
 *                       example: 25000
 *                     netRevenue:
 *                       type: number
 *                       example: 480000
 *                     refunds:
 *                       type: number
 *                       example: 20000
 *                     totalTransactions:
 *                       type: integer
 *                       example: 15
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires admin or super_admin role
 *   get:
 *     tags:
 *       - CRM - Finance & Revenue Analytics
 *     summary: Get Finance Revenue Overview (Query Params)
 *     description: Calculates Gross Revenue, Pending Payment, Net Revenue, Refunds, and Transaction counts using query parameters.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-12-31"
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *           enum: [INR, USD, EUR, AED, SAR, GBP]
 *         example: "INR"
 *     responses:
 *       200:
 *         description: Finance overview retrieved successfully
 */
router.post(
  "/finance/overview",
  authorize("admin", "super_admin"),
  crmValidator.validateFinanceOverview(),
  validate,
  crmController.getFinanceOverview,
);
router.get(
  "/finance/overview",
  authorize("admin", "super_admin"),
  crmValidator.validateFinanceOverview(),
  validate,
  crmController.getFinanceOverview,
);

/**
 * @openapi
 * /api/v1/crm/finance/transactions:
 *   get:
 *     tags:
 *       - CRM - Finance & Revenue Analytics
 *     summary: List All Financial Transactions
 *     description: Retrieve all payment transactions across flights, hotels, packages, offers, and visas with pagination, search, status filtering, and date range filters.
 *     security:
 *       - BearerAuth: []
 *     parameters:
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
 *         description: Items per page (max 100)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [created, pending, authorized, captured, paid, partially_refunded, refunded, failed, expired, cancelled, chargeback, disputed]
 *         description: Filter by payment transaction status
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [razorpay, phonepe, paypal, stripe, bank_transfer]
 *         description: Filter by payment gateway method
 *       - in: query
 *         name: bookingType
 *         schema:
 *           type: string
 *           enum: [flight, hotel, package, offer, visa]
 *         description: Filter by booking product line
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *           enum: [INR, USD, EUR, AED, SAR, GBP]
 *         description: Filter by currency
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-01-01"
 *         description: Filter transactions created on or after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-12-31"
 *         description: Filter transactions created on or before this date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by transaction ID, order ID, or capture ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, amount, paidAt, updatedAt]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Transactions list retrieved successfully
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
 *                   example: "Transactions retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires admin or super_admin role
 *
 * /api/v1/crm/finance/transactions/{id}:
 *   get:
 *     tags:
 *       - CRM - Finance & Revenue Analytics
 *     summary: Get Single Transaction Details
 *     description: Retrieve full details of a specific payment transaction by its MongoDB ID.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the payment transaction
 *     responses:
 *       200:
 *         description: Transaction details retrieved successfully
 *       404:
 *         description: Transaction not found
 */
router.get(
  "/finance/transactions",
  authorize("admin", "super_admin"),
  crmValidator.validateListTransactions(),
  validate,
  crmController.listTransactions,
);

router.get(
  "/finance/transactions/:id",
  authorize("admin", "super_admin"),
  crmValidator.validateTransactionId(),
  validate,
  crmController.getTransactionDetails,
);

/**
 * @openapi
 * /api/v1/crm/finance/refunds:
 *   get:
 *     tags:
 *       - CRM - Finance & Revenue Analytics
 *     summary: List All Payment Refunds History
 *     description: Retrieve all payment refunds across flights, hotels, packages, offers, and visas for the CRM dashboard, showing refund amounts, currencies, statuses, parent payment, and customer details.
 *     security:
 *       - BearerAuth: []
 *     parameters:
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
 *         description: Items per page (max 100)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processed, failed]
 *         description: Filter by refund status
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *           enum: [INR, USD, EUR, AED, SAR, GBP]
 *         description: Filter by refund currency
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [razorpay, phonepe, paypal, stripe, bank_transfer]
 *         description: Filter by payment gateway
 *       - in: query
 *         name: bookingType
 *         schema:
 *           type: string
 *           enum: [flight, hotel, package, offer, visa]
 *         description: Filter by booking product line
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-01-01"
 *         description: Filter refunds requested on or after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-12-31"
 *         description: Filter refunds requested on or before this date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by refund ID, reason, or gateway transaction ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [requestedAt, processedAt, amount]
 *           default: requestedAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Payment refunds history retrieved successfully
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
 *                   example: "Payment refunds history retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires admin or super_admin role
 *
 * /api/v1/crm/finance/refunds/{refundId}/status:
 *   patch:
 *     tags:
 *       - CRM - Finance & Revenue Analytics
 *     summary: Update Payment Refund Status
 *     description: Update the status of a refund record (e.g. pending to processed or failed), update notes, and automatically reconcile parent payment totals.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: refundId
 *         required: true
 *         schema:
 *           type: string
 *         description: Refund ID (gateway refund ID or MongoDB ObjectId)
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
 *                 enum: [pending, processed, failed]
 *                 example: "processed"
 *               reason:
 *                 type: string
 *                 example: "Reconciled with gateway batch settlement"
 *               gatewayResponse:
 *                 type: object
 *                 example: { "acquirer_reference": "ARN987654321" }
 *     responses:
 *       200:
 *         description: Payment refund status updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Refund record not found
 */
router.get(
  "/finance/refunds",
  authorize("admin", "super_admin"),
  crmValidator.validateListRefunds(),
  validate,
  crmController.listRefunds, 
);

router.patch(
  "/finance/refunds/:refundId/status",
  authorize("admin", "super_admin"),
  crmValidator.validateUpdateRefundStatus(),
  validate,
  crmController.updateRefundStatus,
);

router.patch(
  "/finance/refunds/:refundId",
  authorize("admin", "super_admin"),
  crmValidator.validateUpdateRefundStatus(),
  validate,
  crmController.updateRefundStatus,
);

/**
 * @openapi
 * /api/v1/crm/customers:
 *   get:
 *     tags:
 *       - CRM - Customers
 *     summary: List All Customers with Travellers, Booked Offers & Total Spend
 *     description: Retrieve all registered customers with aggregated business metrics including total saved travellers, count of booked offers, active status, and lifetime money spent.
 *     security:
 *       - BearerAuth: []
 *     parameters:
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
 *         description: Items per page (max 100)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by customer name, email, or phone number
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by account active status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, firstName, lastName, updatedAt]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Customers list retrieved successfully
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
 *                   example: "Customers retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                         example: "Ahmed Khan"
 *                       phone:
 *                         type: string
 *                         example: "9876543210"
 *                       email:
 *                         type: string
 *                         example: "ahmed@example.com"
 *                       totalTravellers:
 *                         type: integer
 *                         example: 3
 *                       bookedOffersCount:
 *                         type: integer
 *                         example: 2
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       totalMoneySpent:
 *                         type: number
 *                         example: 85000.50
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *
 * /api/v1/crm/customers/{id}:
 *   get:
 *     tags:
 *       - CRM - Customers
 *     summary: Get Specific Customer Details
 *     description: Retrieve detailed profile, lifetime spending, total bookings, booked offers count, and recent bookings for a specific customer.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Customer details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Customer not found
 *
 * /api/v1/crm/customers/{id}/travellers:
 *   get:
 *     tags:
 *       - CRM - Customers
 *     summary: Get Traveller Details of Specific Customer
 *     description: Retrieve all saved travellers, passport details, passenger types, and default preferences belonging to a specific customer.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Customer travellers retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Customer not found
 */

router.get(
  "/customers",
  authorize("admin", "super_admin", "sales_agent", "support_agent"),
  crmValidator.validateListCustomers(),
  validate,
  crmController.listCustomers,
);

router.get(
  "/customers/:id",
  authorize("admin", "super_admin", "sales_agent", "support_agent"),
  crmValidator.validateCustomerId(),
  validate,
  crmController.getCustomerDetails,
);

router.get(
  "/customers/:id/travellers",
  authorize("admin", "super_admin", "sales_agent", "support_agent"),
  crmValidator.validateCustomerId(),
  validate,
  crmController.getCustomerTravellers,
);






module.exports = router;


