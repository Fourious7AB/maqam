require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const correlationIdMiddleware = require('./middleware/correlationId');

// ─── Module Route imports─────────────────
const authRoutes = require('./modules/auth/auth.routes');
const hotelRoutes = require('./modules/hotels/hotel.routes');
const flightRoutes = require('./modules/flights/flight.routes');
const bookingRoutes = require('./modules/bookings/booking.routes');
const adminPackageRoutes = require('./modules/packages/admin/packageAdmin.routes');
const adminBookingRoutes = require('./modules/bookings/crm/bookingCrm.routes');
const adminStockRoutes = require('./modules/packages/stock/stockAdmin.routes');
const adminOfferRoutes = require('./modules/packages/offers/offerAdmin.routes');
const adminQuoteRoutes = require('./modules/quotes/quoteAdmin.routes');
const userPackageRoutes = require('./modules/packages/user/packageUser.routes');
const offerRoutes = require('./modules/packages/offers/offer.routes');
const paymentRoutes = require('./modules/payments/payment.routes');
const accountRoutes = require('./modules/account/account.routes');
const cmsRoutes = require('./modules/cms/cms.routes');
const crmRoutes = require('./modules/crm/crm.routes');
const settingsRoutes = require('./modules/crm/settings.routes');
const adminUserRoutes = require('./modules/crm/userAdmin.routes');
const adminInvoiceRoutes = require('./modules/invoices/adminInvoice.routes');
const crmAdminExtraRoutes = require('./modules/crm/crmAdminExtra.routes');
const hotelierRoutes = require('./modules/hotelier/hotelier.routes');
const quoteRoutes = require('./modules/quotes/quote.routes');
const eticketRoutes = require('./modules/eticket/eticket.routes');

// ─── Webhook Routes (public, no auth required) ────────────
const razorpayWebhook = require('./webhook/razorpay/razorpay.webhook');
const paypalWebhook = require('./modules/payments/gateways/paypal/paypal.webhook');
const phonepeWebhook = require('./modules/payments/gateways/phonepe/phonepe.webhook');
const srdvFlightCallback = require('./webhook/srdv/flight/flight.callback.routes');

// SWAGGER SETUP
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger/swagger');
const crmSwaggerDocument = require('./swagger/crmSwagger');


// ------- VISA ROUTES IMPORT ---------------------------------

const adminVisaRoutes = require('./modules/visa/visaAdmin/adminVisa.routes')
const userVisaRoutes = require('./modules/visa/user/visa.routes')


// ------------ai planner routes -----------------

const chatRoutes = require('./modules/aiPlanner/chat.route')


let invoiceRoutes;
try {
  invoiceRoutes = require('./modules/invoices/invoice.routes');
} catch (err) {
  invoiceRoutes = null;
}


const app = express();

app.use(correlationIdMiddleware);

// Allow requests from any origin
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Requested-With',
    'Cookie',
    'x-refresh-token',
    'X-Refresh-Token',
    'Idempotency-Key',
    'idempotency-key',
    'X-Correlation-ID',
    'x-correlation-id',
    'PayPal-Request-Id',
  ],
  exposedHeaders: [
    'Set-Cookie',
  ],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(helmet({
  contentSecurityPolicy: false,
  hsts: false,
  crossOriginResourcePolicy: {
    policy: 'cross-origin',
  },
}));

// Configure parser to preserve raw request bodies for webhook verification checks
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    if (req.originalUrl && req.originalUrl.includes('/webhook')) {
      req.rawBody = buf;
    }
  }
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Webhook Routes (BEFORE rate limiter, NO auth required) ─────
// Webhooks need to be outside rate limiting
app.use('/webhook/razorpay', razorpayWebhook);
app.use('/webhook/paypal', paypalWebhook);
app.use('/webhook/phonepe', phonepeWebhook);
app.use('/webhook/srdv', srdvFlightCallback);
app.use('/webhooks/srdv', srdvFlightCallback);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }));
}

app.use('/api', apiLimiter);

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Check server health
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 env:
 *                   type: string
 *                 uptime:
 *                   type: number
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV,
    uptime: process.uptime(),
  });
});

// ─── SWAGGER API DOCUMENTATION ────────────────────────────
app.set('swaggerDocument', swaggerDocument);
app.set('crmSwaggerDocument', crmSwaggerDocument);

app.get('/api/docs.json', (_req, res) => {
  res.json(swaggerDocument);
});

app.get('/api/crm-docs.json', (_req, res) => {
  res.json(crmSwaggerDocument);
});

// 1. Main Platform Swagger UI
app.use(
  '/api/docs',
  swaggerUi.serveFiles(swaggerDocument),
  swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'MaqamTravels Platform API Docs',
  })
);

// 2. Dedicated CRM Swagger UI (ONLY CRM Site Routes)
app.use(
  '/api/crm-docs',
  swaggerUi.serveFiles(crmSwaggerDocument),
  swaggerUi.setup(crmSwaggerDocument, {
    customSiteTitle: 'MaqamTravels CRM Operations API Docs',
  })
);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/hotels', hotelRoutes);
app.use('/api/v1/flights', flightRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/crm/bookings', adminBookingRoutes);
app.use('/api/v1/crm/packages', adminPackageRoutes);
app.use('/api/v1/crm/stocks', adminStockRoutes);
app.use('/api/v1/crm/offers', adminOfferRoutes);
app.use('/api/v1/crm/quotes', adminQuoteRoutes);
app.use('/api/v1/crm/setting', settingsRoutes);
app.use('/api/v1/crm/settings', settingsRoutes);
app.use('/api/v1/crm/invoices', adminInvoiceRoutes);
app.use('/api/v1/crm/users', adminUserRoutes);
app.use('/api/v1/crm', crmRoutes);
app.use('/api/v1/audit-logs', crmAdminExtraRoutes);
app.use('/api/v1/roles', crmAdminExtraRoutes);
app.use('/api/v1/permissions', crmAdminExtraRoutes);
app.use('/api/v1/reports', crmAdminExtraRoutes);
app.use('/api/v1/admin/dashboard', crmAdminExtraRoutes);
app.use('/api/v1/packages', userPackageRoutes);
app.use('/api/v1/offers', offerRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/account', accountRoutes);
app.use('/api/v1/cms', cmsRoutes);
app.use('/api/v1/hotelier', hotelierRoutes);
app.use('/api/v1/visa/admin', adminVisaRoutes)
app.use('/api/v1/visa/user', userVisaRoutes);
app.use('/api/v1/ai', chatRoutes);
// app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/quotes', quoteRoutes);
if (invoiceRoutes) {
  app.use('/api/v1/invoices', invoiceRoutes);
}
app.use('/api/v1/eticket', eticketRoutes);



// ─── PayPal Redirect Landing Pages ─────────────────────────
// Redirect user directly to the frontend SPA at port 5069 (or configured CLIENT_URL)
app.get('/payment/paypal/success', (req, res) => {
  const { token, PayerID, bookingId } = req.query;
  const orderId = token || req.query.orderId || '';
  const clientUrl = (process.env.CLIENT_URL || process.env.PAYPAL_RETURN_URL_BASE || 'http://localhost:5069').replace(/\/+$/, '');

  const params = new URLSearchParams();
  if (orderId) params.set('token', orderId);
  if (PayerID) params.set('PayerID', PayerID);
  if (bookingId) params.set('bookingId', bookingId);

  const queryString = params.toString();
  return res.redirect(`${clientUrl}/payment/paypal/success${queryString ? `?${queryString}` : ''}`);
});

app.get('/payment/paypal/cancel', (req, res) => {
  const { bookingId } = req.query;
  const clientUrl = (process.env.CLIENT_URL || process.env.PAYPAL_RETURN_URL_BASE || 'http://localhost:5069').replace(/\/+$/, '');

  const params = new URLSearchParams();
  if (bookingId) params.set('bookingId', bookingId);

  const queryString = params.toString();
  return res.redirect(`${clientUrl}/payment/paypal/cancel${queryString ? `?${queryString}` : ''}`);
});

// ─── CRM Routes (prefix-gated — mounts only when slug matches) ──
// The actual CRM route file checks the prefix at the middleware level too
// so even if someone guesses the URL, they still need the right role
const CRM_PREFIX = process.env.CRM_PREFIX || '/ops-crm';
app.use(`/api/v1${CRM_PREFIX}`, crmRoutes);
if (CRM_PREFIX !== '/crm') {
  app.use('/api/v1/crm', crmRoutes);
}

// ─── 404 Handler ──────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found or the method/headers is wrong ' });
});

// ─── Global Error Handler (must be last) ──────────────────
app.use(errorHandler);

module.exports = app;