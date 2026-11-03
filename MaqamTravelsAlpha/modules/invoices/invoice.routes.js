const router = require('express').Router();
const invoiceController = require('./invoice.controller');
const { authenticate, optionalAuthenticate, authorize } = require('../../middleware/auth');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../../swagger/swagger');

// Authorized staff roles for back-office and finance invoice operations
const adminInvoiceRoles = authorize('admin', 'super_admin', 'finance', 'sales_agent', 'support_agent');

/**
 * Flexible auth middleware that allows either Authorization header or ?token= query param
 * (Crucial for direct browser tab opens, iframes, and file downloads)
 */
const invoiceAuth = (req, res, next) => {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  return authenticate(req, res, next);
};

const invoiceDownloadAuth = (req, res, next) => {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  return optionalAuthenticate(req, res, next);
};

// ─── DEDICATED SWAGGER UI FOR INVOICES ──────────────────────────────────────────
/**
 * Mounts interactive Swagger UI documentation directly on /api/v1/invoices/docs
 */
router.use(
  '/docs',
  swaggerUi.serveFiles(swaggerDocument),
  swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'MaqamTravels Invoices API Docs (Flight & Hotel)',
  })
);

// ─── SWAGGER / OPENAPI DOCUMENTED ROUTES ───────────────────────────────────────

/**
 * @openapi
 * /api/v1/invoices/flight/{bookingId}:
 *   get:
 *     tags:
 *       - Invoices
 *     summary: Get flight invoice data (JSON)
 *     description: |
 *       Returns normalized, tamper-proof invoice data for live **GDS** and **LCC** flight bookings.
 *       Constructed dynamically from existing booking, user, and payment records without requiring any new database schema.
 *       
 *       **Features:**
 *       - Supports both GDS (e-tickets, hold deadlines, segment breakdown) and LCC (instant ticketing, PNR).
 *       - Deterministic tax invoice numbering (`MT-INV-LCC-YYYYMM-XXXX` / `MT-INV-GDS-YYYYMM-XXXX`).
 *       - Itemized financial fare breakdown (Base Fare, Airline Taxes, SSR Ancillaries, Service/Convenience Markup, GST 18%).
 *       - Automatic Corporate GST invoicing if `wantsInvoice` is enabled (Buyer GSTIN, Company Name, Address).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: bookingId
 *         in: path
 *         required: true
 *         description: Flight booking MongoDB `_id`, SRDV numeric `srdvBookingId`, or Airline/GDS `PNR`.
 *         schema:
 *           type: string
 *         example: "66a123456789012345678901"
 *       - name: token
 *         in: query
 *         required: false
 *         description: Optional JWT access token when Authorization header cannot be passed (e.g. browser tab).
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice data retrieved successfully
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
 *                         invoiceNumber:
 *                           type: string
 *                           example: "MT-INV-LCC-202610-2106"
 *                         supplierInvoiceNumber:
 *                           type: string
 *                           nullable: true
 *                           example: "SRDV-INV-998811"
 *                         invoiceDate:
 *                           type: string
 *                           example: "12 Oct 2026, 04:30 PM"
 *                         bookingReference:
 *                           type: string
 *                           example: "2106"
 *                         bookingStatus:
 *                           type: string
 *                           example: "CONFIRMED"
 *                         serviceType:
 *                           type: string
 *                           enum: [LCC, GDS]
 *                           example: "LCC"
 *                         serviceTypeBadge:
 *                           type: string
 *                           example: "LCC (Low-Cost Carrier)"
 *                         isLCC:
 *                           type: boolean
 *                           example: true
 *                         airlinePnr:
 *                           type: string
 *                           example: "6E9XYZ"
 *                         gdsPnr:
 *                           type: string
 *                           nullable: true
 *                           example: null
 *                         placeOfSupply:
 *                           type: string
 *                           example: "Delhi (07)"
 *                         agency:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                               example: "Maqam Travels Private Limited"
 *                             gstin:
 *                               type: string
 *                               example: "07AAACM1234F1Z8"
 *                             pan:
 *                               type: string
 *                               example: "AAACM1234F"
 *                             sacCode:
 *                               type: string
 *                               example: "996411"
 *                         customer:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                               example: "Rahul Sharma"
 *                             email:
 *                               type: string
 *                               example: "rahul.sharma@example.com"
 *                             hasCorporateGst:
 *                               type: boolean
 *                               example: true
 *                             companyName:
 *                               type: string
 *                               example: "Acme Corp Technologies Pvt Ltd"
 *                             gstNumber:
 *                               type: string
 *                               example: "07AAACA1234F1Z1"
 *                         segments:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               airline:
 *                                 type: string
 *                                 example: "IndiGo (6E-2501)"
 *                               route:
 *                                 type: string
 *                                 example: "Delhi [DEL] → Ahmedabad [AMD]"
 *                               departureTime:
 *                                 type: string
 *                                 example: "15 Oct 2026, 08:00 AM"
 *                               arrivalTime:
 *                                 type: string
 *                                 example: "15 Oct 2026, 09:35 AM"
 *                               duration:
 *                                 type: string
 *                                 example: "1h 35m"
 *                               checkInBaggage:
 *                                 type: string
 *                                 example: "15 Kg"
 *                         passengers:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                                 example: "Mr Rahul Sharma"
 *                               paxType:
 *                                 type: string
 *                                 example: "Adult"
 *                               ticketNumber:
 *                                 type: string
 *                                 example: "6E9XYZ-1"
 *                               ticketStatus:
 *                                 type: string
 *                                 example: "OK"
 *                         pricing:
 *                           type: object
 *                           properties:
 *                             currency:
 *                               type: string
 *                               example: "INR"
 *                             baseFare:
 *                               type: string
 *                               example: "3,691.00"
 *                             taxAmount:
 *                               type: string
 *                               example: "1,465.00"
 *                             serviceFee:
 *                               type: string
 *                               example: "250.00"
 *                             cgst:
 *                               type: string
 *                               example: "22.50"
 *                             sgst:
 *                               type: string
 *                               example: "22.50"
 *                             totalAmount:
 *                               type: string
 *                               example: "5,406.00"
 *                         payment:
 *                           type: object
 *                           properties:
 *                             method:
 *                               type: string
 *                               example: "RAZORPAY"
 *                             transactionId:
 *                               type: string
 *                               example: "order_Oihw87413k"
 *                             status:
 *                               type: string
 *                               example: "PAID"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/flight/:bookingId', invoiceAuth, invoiceController.getInvoiceData);

/**
 * @openapi
 * /api/v1/invoices/flight/{bookingId}/html:
 *   get:
 *     tags:
 *       - Invoices
 *     summary: View flight invoice as rendered HTML
 *     description: |
 *       Renders a responsive, executive-styled HTML Tax Invoice and flight e-receipt.
 *       Includes `@media print` styling configured for A4 paper export, browser preview, iframe embedding, or calling `window.print()`.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: bookingId
 *         in: path
 *         required: true
 *         description: Flight booking MongoDB `_id`, SRDV `srdvBookingId`, or `PNR`.
 *         schema:
 *           type: string
 *         example: "66a123456789012345678901"
 *       - name: token
 *         in: query
 *         required: false
 *         description: Optional bearer token for opening directly in a new browser tab or iframe.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rendered HTML tax invoice document
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: "<!DOCTYPE html><html><head><title>Invoice - MT-INV-LCC-202610-2106</title>...</head>...</html>"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/flight/:bookingId/html', invoiceDownloadAuth, invoiceController.getInvoiceHtml);

/**
 * @openapi
 * /api/v1/invoices/flight/{bookingId}/download:
 *   get:
 *     tags:
 *       - Invoices
 *     summary: Download flight invoice file attachment
 *     description: |
 *       Downloads the official tax invoice with header `Content-Disposition: attachment; filename="MT-INV-...html"`.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: bookingId
 *         in: path
 *         required: true
 *         description: Flight booking MongoDB `_id`, SRDV `srdvBookingId`, or `PNR`.
 *         schema:
 *           type: string
 *         example: "66a123456789012345678901"
 *       - name: token
 *         in: query
 *         required: false
 *         description: Optional bearer token when downloading via link.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice file attachment stream
 *         headers:
 *           Content-Disposition:
 *             schema:
 *               type: string
 *               example: 'attachment; filename="MT-INV-LCC-202610-2106.html"'
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
router.get('/flight/:bookingId/download', invoiceDownloadAuth, invoiceController.downloadInvoice);

// ─── HOTEL INVOICES ─────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/v1/invoices/hotel/{bookingId}:
 *   get:
 *     tags:
 *       - Invoices
 *     summary: Get hotel invoice data (JSON)
 *     description: |
 *       Returns normalized, compliant tax invoice data for live **Hotel** bookings.
 *       Constructed dynamically from existing HotelBooking, User, and Payment records.
 *       
 *       **Features:**
 *       - Supports all hotel bookings (SRDV / CRS live properties).
 *       - Deterministic tax invoice numbering (`MT-INV-HTL-YYYYMM-XXXX`).
 *       - Itemized financial breakdown (Room Tariff, Agency Markup & Service Fee, GST 18%).
 *       - Room category, meal plan board, stay duration (nights), and guest manifest.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: bookingId
 *         in: path
 *         required: true
 *         description: Hotel booking MongoDB `_id`, `confirmationNo`, `bookingRefNo`, or SRDV `providerBookingId`.
 *         schema:
 *           type: string
 *         example: "66a123456789012345678901"
 *       - name: token
 *         in: query
 *         required: false
 *         description: Optional JWT access token when Authorization header cannot be passed.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hotel invoice data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/hotel/:bookingId', invoiceAuth, invoiceController.getHotelInvoiceData);

/**
 * @openapi
 * /api/v1/invoices/hotel/{bookingId}/html:
 *   get:
 *     tags:
 *       - Invoices
 *     summary: Get rendered hotel tax invoice (HTML document)
 *     description: |
 *       Renders an official, branded HTML tax invoice document for hotel bookings.
 *       Includes property summary, star rating, stay dates, room types, guest manifest, and print CSS.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: bookingId
 *         in: path
 *         required: true
 *         description: Hotel booking MongoDB `_id`, `confirmationNo`, `bookingRefNo`, or `providerBookingId`.
 *         schema:
 *           type: string
 *         example: "66a123456789012345678901"
 *       - name: token
 *         in: query
 *         required: false
 *         description: Optional bearer token for opening directly in browser tab or iframe.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rendered HTML hotel tax invoice document
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
router.get('/hotel/:bookingId/html', invoiceDownloadAuth, invoiceController.getHotelInvoiceHtml);

/**
 * @openapi
 * /api/v1/invoices/hotel/{bookingId}/download:
 *   get:
 *     tags:
 *       - Invoices
 *     summary: Download hotel invoice file attachment
 *     description: |
 *       Downloads the official hotel tax invoice as an HTML attachment.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: bookingId
 *         in: path
 *         required: true
 *         description: Hotel booking MongoDB `_id`, `confirmationNo`, `bookingRefNo`, or `providerBookingId`.
 *         schema:
 *           type: string
 *         example: "66a123456789012345678901"
 *       - name: token
 *         in: query
 *         required: false
 *         description: Optional bearer token when downloading via link.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice file attachment stream
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
router.get('/hotel/:bookingId/download', invoiceDownloadAuth, invoiceController.downloadHotelInvoice);

// ─── PACKAGE INVOICE ROUTES ─────────────────────────────────────

/**
 * @openapi
 * /api/v1/invoices/package/{bookingId}:
 *   get:
 *     tags:
 *       - Invoices
 *     summary: Get package invoice data (JSON)
 *     description: |
 *       Returns normalized, audit-ready tax invoice data for booked Umrah and holiday tour packages.
 *       Includes destination, travel dates, pilgrim passenger manifest, bundled flight/hotel components, tour guide addon, and financial breakdown.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: bookingId
 *         in: path
 *         required: true
 *         description: Package booking MongoDB `_id` or transaction reference.
 *         schema:
 *           type: string
 *         example: "66a123456789012345678901"
 *       - name: token
 *         in: query
 *         required: false
 *         description: Optional JWT access token when Authorization header cannot be passed.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Package invoice data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/package/:bookingId', invoiceAuth, invoiceController.getPackageInvoiceData);

/**
 * @openapi
 * /api/v1/invoices/package/{bookingId}/html:
 *   get:
 *     tags:
 *       - Invoices
 *     summary: Get rendered package tax invoice (HTML document)
 *     description: |
 *       Renders an official, branded HTML tax invoice document for tour package bookings.
 *       Includes package summary, pilgrims manifest, inclusions tags, tour guide details, and print CSS for A4 export.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: bookingId
 *         in: path
 *         required: true
 *         description: Package booking MongoDB `_id` or transaction reference.
 *         schema:
 *           type: string
 *         example: "66a123456789012345678901"
 *       - name: token
 *         in: query
 *         required: false
 *         description: Optional bearer token for opening directly in browser tab or iframe.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rendered HTML package tax invoice document
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
router.get('/package/:bookingId/html', invoiceDownloadAuth, invoiceController.getPackageInvoiceHtml);

/**
 * @openapi
 * /api/v1/invoices/package/{bookingId}/download:
 *   get:
 *     tags:
 *       - Invoices
 *     summary: Download package invoice file attachment
 *     description: |
 *       Downloads the official package tax invoice as an HTML attachment.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: bookingId
 *         in: path
 *         required: true
 *         description: Package booking MongoDB `_id` or transaction reference.
 *         schema:
 *           type: string
 *         example: "66a123456789012345678901"
 *       - name: token
 *         in: query
 *         required: false
 *         description: Optional bearer token when downloading via link.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Package invoice file attachment stream
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
router.get('/package/:bookingId/download', invoiceDownloadAuth, invoiceController.downloadPackageInvoice);

// ─── OFFER INVOICES (STANDALONE FLIGHT & HOTEL OFFERS) ─────────────────────────

/**
 * @openapi
 * /api/v1/invoices/offer/{bookingId}:
 *   get:
 *     tags:
 *       - Invoices
 *     summary: Get in-house offer invoice data (JSON)
 *     description: |
 *       Returns normalized, compliant tax invoice data for booked standalone in-house retail **Flight** and **Hotel** offers.
 *       Constructed dynamically from `OfferBooking`, `Offer`, `TicketStock`, and `HotelStock` inventory without altering schema.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: bookingId
 *         in: path
 *         required: true
 *         description: Offer booking MongoDB `_id` or transaction reference.
 *         schema:
 *           type: string
 *         example: "66a123456789012345678901"
 *       - name: token
 *         in: query
 *         required: false
 *         description: Optional JWT access token when Authorization header cannot be passed.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Offer invoice data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/offer/:bookingId', invoiceAuth, invoiceController.getOfferInvoiceData);

/**
 * @openapi
 * /api/v1/invoices/offer/{bookingId}/html:
 *   get:
 *     tags:
 *       - Invoices
 *     summary: View in-house offer invoice as rendered HTML
 *     description: |
 *       Renders an executive, branded HTML tax invoice for in-house retail offers.
 *       Includes flight routing / hotel stay details, passenger / guest manifest, retail price breakdown, and print CSS for A4 export.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: bookingId
 *         in: path
 *         required: true
 *         description: Offer booking MongoDB `_id` or transaction reference.
 *         schema:
 *           type: string
 *         example: "66a123456789012345678901"
 *       - name: token
 *         in: query
 *         required: false
 *         description: Optional bearer token for opening directly in browser tab or iframe.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rendered HTML offer tax invoice document
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
router.get('/offer/:bookingId/html', invoiceDownloadAuth, invoiceController.getOfferInvoiceHtml);

/**
 * @openapi
 * /api/v1/invoices/offer/{bookingId}/download:
 *   get:
 *     tags:
 *       - Invoices
 *     summary: Download in-house offer invoice file attachment
 *     description: |
 *       Downloads the official offer tax invoice as an HTML attachment with `Content-Disposition`.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: bookingId
 *         in: path
 *         required: true
 *         description: Offer booking MongoDB `_id` or transaction reference.
 *         schema:
 *           type: string
 *         example: "66a123456789012345678901"
 *       - name: token
 *         in: query
 *         required: false
 *         description: Optional bearer token when downloading via link.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Offer invoice file attachment stream
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
router.get('/offer/:bookingId/download', invoiceDownloadAuth, invoiceController.downloadOfferInvoice);

// ─── VISA INVOICES (BATCH VISA APPLICATIONS) ───────────────────────────────────

/**
 * @openapi
 * /api/v1/invoices/visa/{groupId}:
 *   get:
 *     tags:
 *       - Invoices
 *     summary: Get visa batch invoice data (JSON)
 *     description: |
 *       Returns normalized, audit-ready tax invoice data for visa application batches (`VisaGroup` + `VisaApplication`).
 *       Enforces statutory two-bucket itemization: non-taxable consular pass-through disbursements vs. taxable agency facilitation fee + 18% GST (SAC 998555).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: groupId
 *         in: path
 *         required: true
 *         description: Visa group/order MongoDB `_id` or payment reference.
 *         schema:
 *           type: string
 *         example: "66a123456789012345678901"
 *       - name: token
 *         in: query
 *         required: false
 *         description: Optional JWT access token when Authorization header cannot be passed.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Visa batch invoice data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/visa/:groupId', invoiceAuth, invoiceController.getVisaInvoiceData);

/**
 * @openapi
 * /api/v1/invoices/visa/{groupId}/html:
 *   get:
 *     tags:
 *       - Invoices
 *     summary: View visa batch invoice as rendered HTML
 *     description: |
 *       Renders an executive, branded HTML tax invoice document for visa application batches.
 *       Includes destination country, visa category, applicant manifest, two-bucket fee breakdown, and A4 print CSS.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: groupId
 *         in: path
 *         required: true
 *         description: Visa group/order MongoDB `_id` or payment reference.
 *         schema:
 *           type: string
 *         example: "66a123456789012345678901"
 *       - name: token
 *         in: query
 *         required: false
 *         description: Optional bearer token for opening directly in browser tab or iframe.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rendered HTML visa tax invoice document
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
router.get('/visa/:groupId/html', invoiceDownloadAuth, invoiceController.getVisaInvoiceHtml);

/**
 * @openapi
 * /api/v1/invoices/visa/{groupId}/download:
 *   get:
 *     tags:
 *       - Invoices
 *     summary: Download visa batch invoice file attachment
 *     description: |
 *       Downloads the official visa batch tax invoice as an HTML attachment with `Content-Disposition`.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: groupId
 *         in: path
 *         required: true
 *         description: Visa group/order MongoDB `_id` or payment reference.
 *         schema:
 *           type: string
 *         example: "66a123456789012345678901"
 *       - name: token
 *         in: query
 *         required: false
 *         description: Optional bearer token when downloading via link.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Visa invoice file attachment stream
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
router.get('/visa/:groupId/download', invoiceDownloadAuth, invoiceController.downloadVisaInvoice);

// ─── ADMIN SPECIFIC INVOICES ROUTES (TIER 2 & CRM DESK) ───────────────────────────
const adminInvoiceRoutes = require('./adminInvoice.routes');
router.use('/admin', adminInvoiceRoutes);

router.invoiceAuth = invoiceAuth;
router.invoiceDownloadAuth = invoiceDownloadAuth;
module.exports = router;

