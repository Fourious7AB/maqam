// modules/invoices/adminInvoice.routes.js
//
// Dedicated CRM / Operations Invoice Routes across all verticals:
// 1. Tour Packages (Umrah & Holiday Packages)
// 2. Standalone Retail Offers (Wholesale Flight & Hotel Allotments)
// 3. In-House Visa Batches (Consular & Facilitation Services)
// 4. Online Flights (Live GDS & LCC Aggregator Inventory)
// 5. Online Hotels (Live SRDV Supplier Inventory)
// 6. Cross-Vertical Financial Overview & Summary

const express = require('express');
const router = express.Router();
const adminInvoiceController = require('./adminInvoice.controller');
const { authenticate, authorize } = require('../../middleware/auth');

/**
 * Flexible authentication middleware allowing standard Authorization header
 * or ?token= query parameter (essential for direct tab preview & browser downloads).
 */
const invoiceAuth = (req, res, next) => {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  return authenticate(req, res, next);
};

// Authorized staff roles for CRM operations, finance, and support desks
const adminInvoiceRoles = authorize(
  'admin',
  'super_admin',
  'finance',
  'sales_agent',
  'support_agent'
);

// Apply strict authentication and RBAC to all administrative invoice endpoints
router.use(invoiceAuth, adminInvoiceRoles);

// ─── 0. FINANCIAL DASHBOARD & SUMMARY ──────────────────────────────────────────

/**
 * @openapi
 * /api/v1/crm/invoices/summary:
 *   get:
 *     tags:
 *       - CRM - Invoices
 *     summary: Cross-Vertical Financial Overview & Summary (CRM / Finance)
 *     description: Aggregates real-time gross billed revenue, total invoice counts, and breakdown across all operational verticals (package, offer, visa, flight, hotel) for CRM KPI dashboard cards.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         description: Optional JWT access token when Authorization header cannot be passed.
 *     responses:
 *       200:
 *         description: Cross-vertical invoices summary retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/summary', adminInvoiceController.getInvoicesSummary);

// ─── 1. TOUR PACKAGES ─────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/v1/crm/invoices/package:
 *   get:
 *     tags:
 *       - CRM - Invoices
 *     summary: List all tour package invoices (CRM / Finance)
 *     description: Paginated listing of Umrah & holiday package tax invoices with customer details, pilgrim count, and 5% Agency Personal GST.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [confirmed, pending, cancelled]
 *         description: Package booking status filter.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive search on package title or destination.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings created on or after this date.
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings created on or before this date.
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
 *         description: Package invoices retrieved successfully.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/package', adminInvoiceController.listPackageInvoices);
router.get('/packages', adminInvoiceController.listPackageInvoices);

/**
 * @openapi
 * /api/v1/crm/invoices/package/{id}/download:
 *   get:
 *     tags:
 *       - CRM - Invoices
 *     summary: Download package invoice HTML attachment (CRM / Finance)
 *     description: Streams self-contained HTML invoice file with Content-Disposition attachment for native disk save.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package booking MongoDB _id or payment reference.
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         description: Optional JWT token for direct browser link triggers.
 *     responses:
 *       200:
 *         description: Package invoice HTML attachment stream.
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/package/:id/download', adminInvoiceController.downloadPackageInvoice);
router.get('/packages/:id/download', adminInvoiceController.downloadPackageInvoice);

/**
 * @openapi
 * /api/v1/crm/invoices/package/{id}/html:
 *   get:
 *     tags:
 *       - CRM - Invoices
 *     summary: Live HTML preview for package invoice (CRM / Finance)
 *     description: Returns rendered HTML document for embedding in CRM modal iframe or printing via window.print().
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package booking MongoDB _id.
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         description: Optional JWT token for iframe source.
 *     responses:
 *       200:
 *         description: Rendered HTML invoice document.
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/package/:id/html', adminInvoiceController.getPackageInvoiceHtml);
router.get('/packages/:id/html', adminInvoiceController.getPackageInvoiceHtml);

/**
 * @openapi
 * /api/v1/crm/invoices/package/{id}:
 *   get:
 *     tags:
 *       - CRM - Invoices
 *     summary: Get tour package invoice structured JSON dossier (CRM / Finance)
 *     description: Returns complete audit-ready normalized JSON invoice data for CRM detail modal or slide-over drawer.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package booking MongoDB _id.
 *     responses:
 *       200:
 *         description: Package invoice data retrieved successfully.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/package/:id', adminInvoiceController.getPackageInvoiceData);
router.get('/packages/:id', adminInvoiceController.getPackageInvoiceData);

// ─── 2. STANDALONE RETAIL OFFERS ──────────────────────────────────────────────

/**
 * @openapi
 * /api/v1/crm/invoices/offer:
 *   get:
 *     tags:
 *       - CRM - Invoices
 *     summary: List all retail wholesale offer invoices (CRM / Finance)
 *     description: Paginated listing of standalone flight deals and hotel room block invoices.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: itemType
 *         schema:
 *           type: string
 *           enum: [flight, hotel]
 *         description: Filter by offer vertical.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [confirmed, pending, cancelled]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by offer title or destination.
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
 *         description: Offer invoices retrieved successfully.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/offer', adminInvoiceController.listOfferInvoices);
router.get('/offers', adminInvoiceController.listOfferInvoices);

/**
 * @openapi
 * /api/v1/crm/invoices/offer/{id}/download:
 *   get:
 *     tags:
 *       - CRM - Invoices
 *     summary: Download retail offer invoice HTML attachment (CRM / Finance)
 *     description: File download stream for wholesale retail offer invoice.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Offer booking MongoDB _id.
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Offer invoice HTML attachment stream.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/offer/:id/download', adminInvoiceController.downloadOfferInvoice);
router.get('/offers/:id/download', adminInvoiceController.downloadOfferInvoice);

/**
 * @openapi
 * /api/v1/crm/invoices/offer/{id}/html:
 *   get:
 *     tags:
 *       - CRM - Invoices
 *     summary: Live HTML preview for retail offer invoice (CRM / Finance)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Offer booking MongoDB _id.
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rendered HTML invoice document.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/offer/:id/html', adminInvoiceController.getOfferInvoiceHtml);
router.get('/offers/:id/html', adminInvoiceController.getOfferInvoiceHtml);

/**
 * @openapi
 * /api/v1/crm/invoices/offer/{id}:
 *   get:
 *     tags:
 *       - CRM - Invoices
 *     summary: Get retail offer invoice structured JSON dossier (CRM / Finance)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Offer booking MongoDB _id.
 *     responses:
 *       200:
 *         description: Offer invoice data retrieved successfully.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/offer/:id', adminInvoiceController.getOfferInvoiceData);
router.get('/offers/:id', adminInvoiceController.getOfferInvoiceData);

// ─── 3. VISA BATCHES ──────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/v1/crm/invoices/visa:
 *   get:
 *     tags:
 *       - CRM - Invoices
 *     summary: List all visa batch invoices (CRM / Finance)
 *     description: Paginated visa batch invoices with applicant counts and SAC 998555 agency markup vs consular pass-through split.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, paid, failed]
 *       - in: query
 *         name: groupStatus
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by destination country or visa type.
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
 *         description: Visa invoices retrieved successfully.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/visa', adminInvoiceController.listVisaInvoices);
router.get('/visas', adminInvoiceController.listVisaInvoices);

/**
 * @openapi
 * /api/v1/crm/invoices/visa/{id}/download:
 *   get:
 *     tags:
 *       - CRM - Invoices
 *     summary: Download visa batch invoice HTML attachment (CRM / Finance)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Visa group MongoDB _id.
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Visa invoice HTML attachment stream.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/visa/:id/download', adminInvoiceController.downloadVisaInvoice);
router.get('/visas/:id/download', adminInvoiceController.downloadVisaInvoice);

/**
 * @openapi
 * /api/v1/crm/invoices/visa/{id}/html:
 *   get:
 *     tags:
 *       - CRM - Invoices
 *     summary: Live HTML preview for visa batch invoice (CRM / Finance)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Visa group MongoDB _id.
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rendered HTML invoice document.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/visa/:id/html', adminInvoiceController.getVisaInvoiceHtml);
router.get('/visas/:id/html', adminInvoiceController.getVisaInvoiceHtml);

/**
 * @openapi
 * /api/v1/crm/invoices/visa/{id}:
 *   get:
 *     tags:
 *       - CRM - Invoices
 *     summary: Get visa batch invoice structured JSON dossier (CRM / Finance)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Visa group MongoDB _id.
 *     responses:
 *       200:
 *         description: Visa invoice data retrieved successfully.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/visa/:id', adminInvoiceController.getVisaInvoiceData);
router.get('/visas/:id', adminInvoiceController.getVisaInvoiceData);

// ─── 4. ONLINE FLIGHTS (SRDV GDS & LCC) ────────────────────────────────────────

/**
 * @openapi
 * /api/v1/crm/invoices/flight:
 *   get:
 *     tags:
 *       - CRM - Invoices
 *     summary: List all live flight invoices (CRM / Finance)
 *     description: Paginated GDS & LCC flight tax invoices with airline PNRs, segment routing, and 18% convenience fee GST.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isLCC
 *         schema:
 *           type: boolean
 *         description: Filter Low-Cost Carriers (true) vs Full-Service GDS (false).
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [confirmed, pending, cancelled]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by PNR, GDS PNR, or SRDV Booking ID.
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
 *         description: Flight invoices retrieved successfully.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/flight', adminInvoiceController.listFlightInvoices);
router.get('/flights', adminInvoiceController.listFlightInvoices);

/**
 * @openapi
 * /api/v1/crm/invoices/flight/{id}/download:
 *   get:
 *     tags:
 *       - CRM - Invoices
 *     summary: Download flight invoice HTML attachment (CRM / Finance)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Flight booking MongoDB _id, SRDV booking ID, or airline PNR.
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Flight invoice HTML attachment stream.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/flight/:id/download', adminInvoiceController.downloadFlightInvoice);
router.get('/flights/:id/download', adminInvoiceController.downloadFlightInvoice);

/**
 * @openapi
 * /api/v1/crm/invoices/flight/{id}/html:
 *   get:
 *     tags:
 *       - CRM - Invoices
 *     summary: Live HTML preview for flight invoice (CRM / Finance)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Flight booking MongoDB _id, SRDV ID, or PNR.
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rendered HTML invoice document.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/flight/:id/html', adminInvoiceController.getFlightInvoiceHtml);
router.get('/flights/:id/html', adminInvoiceController.getFlightInvoiceHtml);

/**
 * @openapi
 * /api/v1/crm/invoices/flight/{id}:
 *   get:
 *     tags:
 *       - CRM - Invoices
 *     summary: Get flight invoice structured JSON dossier (CRM / Finance)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Flight booking MongoDB _id, SRDV ID, or PNR.
 *     responses:
 *       200:
 *         description: Flight invoice data retrieved successfully.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/flight/:id', adminInvoiceController.getFlightInvoiceData);
router.get('/flights/:id', adminInvoiceController.getFlightInvoiceData);

// ─── 5. ONLINE HOTELS (SRDV LIVE INVENTORY) ───────────────────────────────────

/**
 * @openapi
 * /api/v1/crm/invoices/hotel:
 *   get:
 *     tags:
 *       - CRM - Invoices
 *     summary: List all live hotel accommodation invoices (CRM / Finance)
 *     description: Paginated hotel accommodation invoices with check-in/out dates, room counts, and SAC 996311 lodging taxation.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [CONFIRMED, AWAITING_PAYMENT, CANCELLED]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by hotel name, city, confirmation number, or provider ID.
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
 *         description: Hotel invoices retrieved successfully.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/hotel', adminInvoiceController.listHotelInvoices);
router.get('/hotels', adminInvoiceController.listHotelInvoices);

/**
 * @openapi
 * /api/v1/crm/invoices/hotel/{id}/download:
 *   get:
 *     tags:
 *       - CRM - Invoices
 *     summary: Download hotel invoice HTML attachment (CRM / Finance)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel booking MongoDB _id or confirmation number.
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hotel invoice HTML attachment stream.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/hotel/:id/download', adminInvoiceController.downloadHotelInvoice);
router.get('/hotels/:id/download', adminInvoiceController.downloadHotelInvoice);

/**
 * @openapi
 * /api/v1/crm/invoices/hotel/{id}/html:
 *   get:
 *     tags:
 *       - CRM - Invoices
 *     summary: Live HTML preview for hotel invoice (CRM / Finance)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel booking MongoDB _id or confirmation number.
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rendered HTML invoice document.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/hotel/:id/html', adminInvoiceController.getHotelInvoiceHtml);
router.get('/hotels/:id/html', adminInvoiceController.getHotelInvoiceHtml);

/**
 * @openapi
 * /api/v1/crm/invoices/hotel/{id}:
 *   get:
 *     tags:
 *       - CRM - Invoices
 *     summary: Get hotel invoice structured JSON dossier (CRM / Finance)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel booking MongoDB _id or confirmation number.
 *     responses:
 *       200:
 *         description: Hotel invoice data retrieved successfully.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/hotel/:id', adminInvoiceController.getHotelInvoiceData);
router.get('/hotels/:id', adminInvoiceController.getHotelInvoiceData);

router.invoiceAuth = invoiceAuth;
module.exports = router;
