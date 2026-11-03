const express = require("express");
const router = express.Router();
const visaController = require("./visa.controller");
const { authenticate } = require("../../../middleware/auth");
const { createUploader, documentFileFilter } = require("../../../middleware/upload");

const upload = createUploader({
  fileSize: 10 * 1024 * 1024, // 10MB limit
  fileFilter: documentFileFilter,
});

/**
 * ─── USER VISA ROUTES ─────────────────────────────────────────────────
 * Base path: /api/v1/visa/user
 * ────────────────────────────────────────────────────────────────────
 */

const invoiceController = require("../../invoices/invoice.controller");

// Support query param token for direct browser tab opens / downloads
router.use((req, res, next) => {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
});

// Authenticate all user visa routes
router.use(authenticate);

/**
 * @openapi
 * /api/v1/visa/user/visas:
 *   get:
 *     tags:
 *       - Visa - User
 *     summary: Get All Available Admin-Created Visas & Self-Applied Visas
 *     description: |
 *       Unified endpoint for users. In a single request without query parameters, it returns:
 *       1. All available active Visa catalogue offerings created by Admin (with pricing, countryPicture, countryFlag, requirements).
 *       2. All Visa applications/batches submitted by the logged-in user themself (with application status, applicants, payment info).
 *       3. Overview summary metrics.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All available visas and user applied visas retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/visas",authenticate, visaController.getUserVisasOverview);

/**
 * @openapi
 * /api/v1/visa/user/applications:
 *   post:
 *     tags:
 *       - Visa - User
 *     summary: Apply for Visa (Single Applicant or Multiple Applicants with Documents)
 *     description: |
 *       Apply for a single visa or multiple visas in a single endpoint with document uploads.
 *       - **Single Visa**: Pass user details as an Object (`userDetails`, `applicant`, or flat in form).
 *       - **Multiple Visas**: Pass user details as an Array of Objects (`userDetails` or `applicants`).
 *       - Supports both `application/json` (with pre-existing document URLs) and `multipart/form-data` (with binary file uploads).
 *       - Documents supported: `passportScan`, `photo`, `additionalDocs`.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - destinationCountry
 *               - visaType
 *             properties:
 *               destinationCountry:
 *                 type: string
 *                 example: "Saudi Arabia"
 *               visaType:
 *                 type: string
 *                 example: "Umrah Visa"
 *               totalAmount:
 *                 type: number
 *                 example: 10000
 *               userDetails:
 *                 description: Single applicant object OR array of applicant objects (can be JSON string in FormData)
 *                 oneOf:
 *                   - type: object
 *                     properties:
 *                       namePrefix:
 *                         type: string
 *                         enum: [Mr, Mrs, Ms, Miss, Mstr, Dr]
 *                         example: "Mr"
 *                       firstName:
 *                         type: string
 *                         example: "Ali"
 *                       lastName:
 *                         type: string
 *                         example: "Khan"
 *                       passportNumber:
 *                         type: string
 *                         example: "A12345678"
 *                       dateOfBirth:
 *                         type: string
 *                         format: date
 *                         example: "1990-05-12"
 *                       nationality:
 *                         type: string
 *                         example: "Indian"
 *                       gender:
 *                         type: string
 *                         enum: [male, female, other]
 *                         example: "male"
 *                   - type: array
 *                     items:
 *                       type: object
 *               passportScan:
 *                 type: string
 *                 format: binary
 *                 description: Passport scan file for single applicant or indexed passportScan_0
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Photo file for single applicant or indexed photo_0
 *               additionalDocs:
 *                 type: string
 *                 format: binary
 *                 description: Optional additional supporting document
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - destinationCountry
 *               - visaType
 *             properties:
 *               destinationCountry:
 *                 type: string
 *                 example: "Saudi Arabia"
 *               visaType:
 *                 type: string
 *                 example: "Umrah Visa"
 *               totalAmount:
 *                 type: number
 *                 example: 10000
 *               userDetails:
 *                 description: Single applicant object OR array of applicant objects
 *                 oneOf:
 *                   - type: object
 *                     properties:
 *                       namePrefix:
 *                         type: string
 *                         example: "Mr"
 *                       firstName:
 *                         type: string
 *                         example: "Ali"
 *                       lastName:
 *                         type: string
 *                         example: "Khan"
 *                       passportNumber:
 *                         type: string
 *                         example: "A12345678"
 *                       dateOfBirth:
 *                         type: string
 *                         format: date
 *                         example: "1990-05-12"
 *                       nationality:
 *                         type: string
 *                         example: "Indian"
 *                       gender:
 *                         type: string
 *                         example: "male"
 *                       documents:
 *                         type: object
 *                         properties:
 *                           passportScan:
 *                             type: string
 *                           photo:
 *                             type: string
 *                           additionalDocs:
 *                             type: array
 *                             items:
 *                               type: string
 *                   - type: array
 *                     items:
 *                       type: object
 *     responses:
 *       201:
 *         description: Visa application(s) created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/applications",authenticate, upload.any(), visaController.createApplication);

/**
 * @openapi
 * /api/v1/visa/user/groups:
 *   get:
 *     tags:
 *       - Visa - User
 *     summary: Get All Visa Batches / Groups Submitted by User
 *     description: Paginated list of all VisaGroup submissions belonging to the logged-in user.
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
 *         name: groupStatus
 *         schema:
 *           type: string
 *           enum: [processing, completed, partially_approved, rejected]
 *     responses:
 *       200:
 *         description: User visa groups list retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/groups",authenticate, visaController.getUserGroups);

/**
 * @openapi
 * /api/v1/visa/user/groups/{id}:
 *   get:
 *     tags:
 *       - Visa - User
 *     summary: Get Single Visa Group Details
 *     description: Returns the parent VisaGroup record along with all child VisaApplication traveler records.
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
 *         description: Visa group details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/groups/:id", authenticate,visaController.getUserGroupDetails);

/**
 * @openapi
 * /api/v1/visa/user/groups/{id}/applicants:
 *   post:
 *     tags:
 *       - Visa - User
 *     summary: Add Additional Applicant to Visa Group
 *     description: Adds another applicant record to an existing VisaGroup batch.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: VisaGroup ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateVisaBatchApplicantItem'
 *     responses:
 *       201:
 *         description: Applicant added to group successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/groups/:id/applicants",authenticate, visaController.addApplicant);

/**
 * @openapi
 * /api/v1/visa/user/applications/{id}:
 *   get:
 *     tags:
 *       - Visa - User
 *     summary: Get Single Visa Application Details
 *     description: Returns individual traveler visa application details, status, and assigned agent.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: VisaApplication ID
 *     responses:
 *       200:
 *         description: Visa application retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/applications/:id",authenticate, visaController.getApplicationDetails);

/**
 * @openapi
 * /api/v1/visa/user/applications/{id}/documents/{docType}:
 *   post:
 *     tags:
 *       - Visa - User
 *     summary: Upload Document for Individual Visa Application
 *     description: Uploads document (passportScan, photo, additionalDocs) to Cloudinary and saves URL in VisaApplication documents.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: VisaApplication ID
 *       - in: path
 *         name: docType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [passportScan, photo, additionalDocs]
 *         description: Type of document being uploaded
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Document uploaded successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  "/applications/:id/documents/:docType",
  upload.single("file"),authenticate,
  visaController.uploadDocument
);

// Backward compatibility routes
router.get("/travelers/:travelerId/documents", visaController.getTravelerDocuments);
router.post("/travelers/:travelerId/documents/:docType", upload.single("file"), (req, res, next) => {
  req.params.id = req.params.travelerId;
  return visaController.uploadDocument(req, res, next);
});
router.post("/applications/:applicationId/travelers", (req, res, next) => {
  req.params.id = req.params.applicationId;
  return visaController.addApplicant(req, res, next);
});

// ─── Visa Batch Invoices ──────────────────────────────────────────
router.get("/groups/:id/invoice", invoiceController.getVisaInvoiceData);
router.get("/groups/:id/invoice/html", invoiceController.getVisaInvoiceHtml);
router.get("/groups/:id/invoice/download", invoiceController.downloadVisaInvoice);

module.exports = router;
