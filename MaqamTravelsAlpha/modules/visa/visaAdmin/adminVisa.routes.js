const express = require("express");
const router = express.Router();
const adminVisaController = require("./adminVisa.controller");
const { authenticate, authorize } = require("../../../middleware/auth");
const { createUploader, documentFileFilter } = require("../../../middleware/upload");

const upload = createUploader({
  fileSize: 10 * 1024 * 1024, // 10MB limit
  fileFilter: documentFileFilter,
});

/**
 * ─── ADMIN VISA ROUTES ────────────────────────────────────────────────
 * Base route: /api/v1/visa/admin
 * All routes require authentication and appropriate staff/admin authorization.
 * ────────────────────────────────────────────────────────────────────
 */

// Apply authentication to all admin visa endpoints
router.use(authenticate);

/* =========================================================================
   1. DASHBOARD & APPLICATIONS
   ========================================================================= */

/**
 * @openapi
 * /api/v1/visa/admin/dashboard:
 *   get:
 *     tags:
 *       - Visa - Admin
 *     summary: Get Visa Admin Dashboard Overview
 *     description: Aggregated metrics including status counts, total revenue, unassigned   applications, and recent applications.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard overview retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/dashboard", authorize("admin", "super_admin", "sales_agent", "support_agent"), adminVisaController.getDashboardOverview);

/**
 * @openapi
 * /api/v1/visa/admin/applications:
 *   get:
 *     tags:
 *       - Visa - Admin
 *     summary: Get All Visa Applications
 *     description: Paginated list of visa applications with filters and search.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [submitted, assigned, in_review, action_required, approved, rejected]
 *         description: Filter by application status
 *       - in: query
 *         name: assignedAgentId
 *         schema:
 *           type: string
 *         description: Filter by assigned case officer ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by traveler name, email, or passport number
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
 *         description: Applications list retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/applications",authorize("admin", "super_admin", "sales_agent", "support_agent"),adminVisaController.getAllVisaApplications);

/**
 * @openapi
 * /api/v1/visa/admin/groups:
 *   get:
 *     tags:
 *       - Visa - Admin
 *     summary: Get All Visa Group Batches
 *     description: Paginated list of VisaGroup batches with submitter info and status.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupStatus
 *         schema:
 *           type: string
 *           enum: [processing, completed, partially_approved, rejected]
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, paid, failed]
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
 *         description: Visa groups retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
router.get("/groups", authorize("admin", "super_admin", "sales_agent", "support_agent"), adminVisaController.getAllVisaGroups);

/**
 * @openapi
 * /api/v1/visa/admin/groups/{id}:
 *   get:
 *     tags:
 *       - Visa - Admin
 *     summary: Get Single Visa Group Batch Details
 *     description: Full VisaGroup details with submitter and all individual traveler visa applications.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: VisaGroup ID
 *     responses:
 *       200:
 *         description: Visa group batch details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
router.get("/groups/:id", authorize("admin", "super_admin", "sales_agent", "support_agent"), adminVisaController.getVisaGroupDetails);

/**
 * @openapi
 * /api/v1/visa/admin/applications/{id}:
 *   get:
 *     tags:
 *       - Visa - Admin
 *     summary: Get Single Visa Application Details
 *     description: Full application details with populated travellers, case officer, and payment info.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Visa Application ID
 *         example: "67be84a1e944f7b6b199e821"
 *     responses:
 *       200:
 *         description: Visa application details retrieved successfully.
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
router.get(
  "/applications/:id",authorize("admin", "super_admin", "sales_agent", "support_agent"),adminVisaController.getVisaApplicationDetails);

/**
 * @openapi
 * /api/v1/visa/admin/applications/{id}/assign:
 *   post:
 *     tags:
 *       - Visa - Admin
 *     summary: Assign Application to Case Officer
 *     description: Assigns a visa application to a staff case officer and updates status.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Visa Application ID
 *         example: "67be84a1e944f7b6b199e821"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - caseOfficerId
 *             properties:
 *               caseOfficerId:
 *                 type: string
 *                 example: "67be84a1e944f7b6b199e810"
 *               adminRemarks:
 *                 type: string
 *                 example: "Priority applicant review requested"
 *     responses:
 *       200:
 *         description: Case officer assigned successfully.
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
router.post("/applications/:id/assign",authorize("admin", "super_admin"),adminVisaController.assignCaseOfficer);

/**
 * @openapi
 * /api/v1/visa/admin/case-officers:
 *   get:
 *     tags:
 *       - Visa - Admin
 *     summary: Get List of Eligible Case Officers
 *     description: Returns staff members who can be assigned as Case Officers for visa processing.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Eligible case officers retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   post:
 *     tags:
 *       - Visa - Admin
 *     summary: Create New Case Officer / Staff Member
 *     description: Creates a new staff user with role (sales_agent, support_agent, admin, super_admin) to handle visa cases.
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
 *               - lastName
 *               - phone
 *               - password
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "Ahmed"
 *               lastName:
 *                 type: string
 *                 example: "Khan"
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *               email:
 *                 type: string
 *                 example: "ahmed.khan@maqamtravels.com"
 *               password:
 *                 type: string
 *                 example: "StaffPassword@123"
 *              
 *     responses:
 *       201:
 *         description: Case officer created successfully.
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
 *       409:
 *         description: Phone or email already registered
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/case-officers", authorize("admin", "super_admin", "sales_agent", "support_agent"), adminVisaController.getEligibleCaseOfficers);
router.post("/case-officers", authorize("admin", "super_admin"), adminVisaController.createStaff);

/**
 * @openapi
 * /api/v1/visa/admin/applications/{id}/status:
 *   patch:
 *     tags:
 *       - Visa - Admin
 *     summary: Update Visa Application Status
 *     description: Updates visa status (e.g. Under Review -> Processing -> Approved / Rejected).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Visa Application ID
 *         example: "67be84a1e944f7b6b199e821"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateVisaStatusRequest'
 *     responses:
 *       200:
 *         description: Visa status updated successfully.
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
router.patch("/applications/:id/status", authorize("admin", "super_admin", "sales_agent"), adminVisaController.updateVisaStatus);

const uploadVisaMedia = upload.fields([
  { name: "countryImage", maxCount: 1 },
  { name: "countryPicture", maxCount: 1 },
  { name: "countryFlag", maxCount: 1 },
]);

/* =========================================================================
   2. VISA CATALOGUE & INVENTORY MANAGEMENT (ADMIN)
   ========================================================================= */

/**
 * @openapi
 * /api/v1/visa/admin/inventory:
 *   post:
 *     tags:
 *       - Visa - Admin Inventory
 *     summary: Create New Visa in Catalogue
 *     description: Admin creates a new visa product / offering with pricing, duration, required document checklist, and optional country picture / flag upload to Cloudinary.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - country
 *               - visaType
 *               - title
 *             properties:
 *               countryImage:
 *                 type: string
 *                 format: binary
 *                 description: Country photo / destination banner image file to upload to Cloudinary
 *               countryPicture:
 *                 type: string
 *                 format: binary
 *                 description: Alias for countryImage file
 *               countryFlag:
 *                 type: string
 *                 format: binary
 *                 description: Country flag image file to upload to Cloudinary
 *               country:
 *                 type: string
 *                 example: "SAUDI ARABIA"
 *               countryCode:
 *                 type: string
 *                 example: "SA"
 *               visaType:
 *                 type: string
 *                 example: "Tourist"
 *               title:
 *                 type: string
 *                 example: "Saudi Arabia 30-Day Tourist Visa (Single Entry)"
 *               entryType:
 *                 type: string
 *                 enum: [Single Entry, Multiple Entry]
 *                 example: "Single Entry"
 *               validity:
 *                 type: string
 *                 example: "90 Days"
 *               stayDuration:
 *                 type: string
 *                 example: "30 Days"
 *               processingTime:
 *                 type: string
 *                 example: "3-5 Working Days"
 *               fees:
 *                 type: string
 *                 description: JSON string with fee breakdown
 *                 example: '{"basePrice":3500,"governmentFee":1200,"serviceFee":300,"tax":0,"currency":"INR"}'
 *               inventory:
 *                 type: string
 *                 description: JSON string with stock configuration
 *                 example: '{"isUnlimited":true,"totalStock":100}'
 *               requiredDocuments:
 *                 type: string
 *                 description: JSON string array of document requirements
 *                 example: '[{"docType":"travellerPhoto","label":"Photograph","isRequired":true}]'
 *               description:
 *                 type: string
 *                 example: "Fast-track tourist visa for Saudi Arabia"
 *               status:
 *                 type: string
 *                 enum: [active, inactive, out_of_stock, draft]
 *                 example: "active"
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - country
 *               - visaType
 *               - title
 *               - fees
 *             properties:
 *               country:
 *                 type: string
 *                 example: "SAUDI ARABIA"
 *               countryCode:
 *                 type: string
 *                 example: "SA"
 *               countryImage:
 *                 type: string
 *                 description: Direct URL for country destination picture
 *                 example: "https://res.cloudinary.com/demo/image/upload/saudi_arabia.jpg"
 *               countryPicture:
 *                 type: string
 *                 description: Alias for countryImage URL
 *                 example: "https://res.cloudinary.com/demo/image/upload/saudi_arabia.jpg"
 *               countryFlag:
 *                 type: string
 *                 description: Direct URL for country flag image
 *                 example: "https://res.cloudinary.com/demo/image/upload/sa_flag.png"
 *               visaType:
 *                 type: string
 *                 example: "Tourist"
 *               title:
 *                 type: string
 *                 example: "Saudi Arabia 30-Day Tourist Visa (Single Entry)"
 *               entryType:
 *                 type: string
 *                 enum: [Single Entry, Multiple Entry]
 *                 example: "Single Entry"
 *               validity:
 *                 type: string
 *                 example: "90 Days"
 *               stayDuration:
 *                 type: string
 *                 example: "30 Days"
 *               processingTime:
 *                 type: string
 *                 example: "3-5 Working Days"
 *               fees:
 *                 type: object
 *                 required:
 *                   - basePrice
 *                 properties:
 *                   basePrice:
 *                     type: number
 *                     example: 3500
 *                   governmentFee:
 *                     type: number
 *                     example: 1200
 *                   serviceFee:
 *                     type: number
 *                     example: 300
 *                   tax:
 *                     type: number
 *                     example: 0
 *                   totalPrice:
 *                     type: number
 *                     example: 5000
 *                   currency:
 *                     type: string
 *                     example: "INR"
 *               inventory:
 *                 type: object
 *                 properties:
 *                   isUnlimited:
 *                     type: boolean
 *                     example: true
 *                   totalStock:
 *                     type: number
 *                     example: 100
 *               requiredDocuments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     docType:
 *                       type: string
 *                       example: "travellerPhoto"
 *                     label:
 *                       type: string
 *                       example: "Photograph"
 *                     description:
 *                       type: string
 *                       example: "Recent photo with white background"
 *                     isRequired:
 *                       type: boolean
 *                       example: true
 *               description:
 *                 type: string
 *                 example: "Fast-track tourist visa for Saudi Arabia"
 *               status:
 *                 type: string
 *                 enum: [active, inactive, out_of_stock, draft]
 *                 example: "active"
 *     responses:
 *       201:
 *         description: Visa created successfully in catalogue.
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
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  "/inventory",
  authorize("admin", "super_admin"),
  uploadVisaMedia,
  adminVisaController.createVisa
);

/** 
 * @openapi
 * /api/v1/visa/admin/inventory:
 *  get:
 *     tags:
 *       - Visa - Admin Inventory
 *     summary: Get All Visa Catalogue / Inventory Items
 *     description: List all configured visas with filters for country, visaType, status, search, and pagination.
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
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Filter by country name
 *       - in: query
 *         name: visaType
 *         schema:
 *           type: string
 *         description: Filter by visa type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, out_of_stock, draft, deleted]
 *         description: Filter by status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title, country, or keyword
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include soft-deleted visas in results
 *     responses:
 *       200:
 *         description: all Visa catalogue list retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
*/
router.get("/inventory",authorize("admin", "super_admin", "sales_agent", "support_agent"),adminVisaController.getAllVisaInventory);

/**
 * @openapi
 * /api/v1/visa/admin/inventory/{id}:
 *   get:
 *     tags:
 *       - Visa - Admin Inventory
 *     summary: Get Single Visa Catalogue Details
 *     description: Retrieve single visa offering details, fees, requirements, and current stock.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Visa Inventory ID
 *         example: "67be84a1e944f7b6b199e830"
 *     responses:
 *       200:
 *         description: Visa details retrieved successfully.
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
router.get("/inventory/:id",authorize("admin", "super_admin", "sales_agent", "support_agent"),adminVisaController.getVisaInventoryById);

/**
 * @openapi
 * /api/v1/visa/admin/inventory/{id}:
 *  put:
 *     tags:
 *       - Visa - Admin Inventory
 *     summary: Update Visa Catalogue Offering
 *     description: Updates visa information, fees, requirements, stay duration, country picture, country flag, or status.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Visa Inventory ID
 *         example: "67be84a1e944f7b6b199e830"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               countryImage:
 *                 type: string
 *                 format: binary
 *                 description: New country photo file to upload to Cloudinary
 *               countryPicture:
 *                 type: string
 *                 format: binary
 *                 description: Alias for countryImage file
 *               countryFlag:
 *                 type: string
 *                 format: binary
 *                 description: New country flag image file to upload to Cloudinary
 *               country:
 *                 type: string
 *                 example: "SAUDI ARABIA"
 *               countryCode:
 *                 type: string
 *                 example: "SA"
 *               title:
 *                 type: string
 *                 example: "Saudi Arabia 30-Day Tourist Visa (Single Entry)"
 *               visaType:
 *                 type: string
 *                 example: "Tourist"
 *               entryType:
 *                 type: string
 *                 enum: [Single Entry, Multiple Entry]
 *               validity:
 *                 type: string
 *               stayDuration:
 *                 type: string
 *               processingTime:
 *                 type: string
 *               fees:
 *                 type: string
 *                 description: JSON string with fee breakdown
 *               inventory:
 *                 type: string
 *                 description: JSON string with stock configuration
 *               requiredDocuments:
 *                 type: string
 *                 description: JSON string array of document requirements
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, out_of_stock, draft]
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               country:
 *                 type: string
 *               countryCode:
 *                 type: string
 *               title:
 *                 type: string
 *               countryImage:
 *                 type: string
 *                 description: Direct URL of country picture
 *               countryPicture:
 *                 type: string
 *                 description: Alias for countryImage URL
 *               countryFlag:
 *                 type: string
 *                 description: Direct URL of country flag
 *               visaType:
 *                 type: string
 *               entryType:
 *                 type: string
 *                 enum: [Single Entry, Multiple Entry]
 *               validity:
 *                 type: string
 *               stayDuration:
 *                 type: string
 *               processingTime:
 *                 type: string
 *               fees:
 *                 type: object
 *                 properties: 
 *                   basePrice:
 *                     type: number
 *                   governmentFee:
 *                     type: number
 *                   serviceFee:
 *                     type: number
 *                   tax:
 *                     type: number
 *                   totalPrice:
 *                     type: number
 *               status:
 *                 type: string
 *                 enum: [active, inactive, out_of_stock, draft]
 *     responses:
 *       200:
 *         description: Visa catalogue item updated successfully.
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
router.put(
  "/inventory/:id",
  authorize("admin", "super_admin"),
  uploadVisaMedia,
  adminVisaController.updateVisa
);

 

/** 
 * @openapi
 * /api/v1/visa/admin/inventory/{id}:
 *  delete:
 *     tags:
 *       - Visa - Admin Inventory
 *     summary: Delete Visa from Catalogue
 *     description: Soft deletes a visa offering from the catalogue (instantly removing it from user available visa pages and admin active inventory), while preserving historical user application records. Supports permanent=true for hard delete.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Visa Inventory ID
 *         example: "67be84a1e944f7b6b199e830"
 *       - in: query
 *         name: permanent
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Set true to permanently remove the document from MongoDB instead of soft-deleting
 *     responses:
 *       200:
 *         description: Visa deleted successfully.
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
router.delete("/inventory/:id",authorize("admin", "super_admin"),adminVisaController.deleteVisa);

/**
 * @openapi
 * /api/v1/visa/admin/inventory/{id}/stock:
 *   patch:
 *     tags:
 *       - Visa - Admin Inventory
 *     summary: Edit / Adjust Visa Stock & Quota
 *     description: Adjusts available stock count, sets total stock, or toggles unlimited quota.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Visa Inventory ID
 *         example: "67be84a1e944f7b6b199e830"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isUnlimited:
 *                 type: boolean
 *                 example: false
 *               totalStock:
 *                 type: number
 *                 example: 50
 *               availableStock:
 *                 type: number
 *                 example: 45
 *               adjustment:
 *                 type: number
 *                 description: Relative +/- increment to current stock
 *                 example: 10
 *     responses:
 *       200:
 *         description: Visa stock updated successfully.
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
router.patch("/inventory/:id/stock",authorize("admin", "super_admin"),adminVisaController.editVisaStock);

module.exports = router;
