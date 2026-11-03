const router = require('express').Router();
const settingsController = require('./settings.controller');
const { validateSettingsSection, validateUpdateSettings, validateUpdateMarkup } = require('./crm.validator');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');

/**
 * ─── CRM SETTINGS & MARKUP ROUTES ──────────────────────────────
 * Base URL: /api/v1/crm/setting, /api/v1/crm/settings, or /api/v1/settings
 */

// All settings routes require JWT authentication
router.use(authenticate);

// ─── ROOT SETTINGS (Defaults to 'general' section) ─────────────
router.get(
  '/',
  authorize('admin', 'super_admin', 'sales_agent', 'support_agent'),
  (req, res, next) => {
    req.params.section = req.query.section || 'general';
    return settingsController.getSettings(req, res, next);
  }
);

// ─── MARKUP CONFIGURATION (Transferred from CRM Routes) ─────────
/**
 * @openapi
 * /api/v1/crm/setting/markup:
 *   get:
 *     tags:
 *       - CRM - Settings & Markup
 *     summary: Get CRM Markup Configuration
 *     description: Retrieve current markup percentages (flight, hotel, default mark percent) set in CRM.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Markup settings retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Markup settings retrieved successfully"
 *               data:
 *                 flightMarkupPercent: 2.5
 *                 hotelMarkupPercent: 5.0
 *                 currency: "USD"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *   post:
 *     tags:
 *       - CRM - Settings & Markup
 *     summary: Set CRM Markup (Admin only)
 *     description: Set/Update markup percentages (flight, hotel, default mark percent) from CRM side.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               flightMarkupPercent:
 *                 type: number
 *                 example: 10
 *               hotelMarkupPercent:
 *                 type: number
 *                 example: 8
 *               currency:
 *                 type: string
 *                 example: "USD"
 *     responses:
 *       200:
 *         description: Markup settings updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *   put:
 *     tags:
 *       - CRM - Settings & Markup
 *     summary: Update CRM Markup (Admin only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               flightMarkupPercent:
 *                 type: number
 *                 example: 10
 *               hotelMarkupPercent:
 *                 type: number
 *                 example: 4
 *               currency:
 *                 type: string
 *                 example: "USD"
 *     responses:
 *       200:
 *         description: Markup settings updated successfully
 *   patch:
 *     tags:
 *       - CRM - Settings & Markup
 *     summary: Partially Update CRM Markup (Admin only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               flightMarkupPercent:
 *                 type: number
 *                 example: 10
 *               hotelMarkupPercent:
 *                 type: number
 *                 example: 4
 *               currency:
 *                 type: string
 *                 example: "USD"
 *     responses:
 *       200:
 *         description: Markup settings updated successfully
 */
router.get(
  '/markup',
  authorize('admin', 'super_admin', 'sales_agent', 'support_agent'),
  settingsController.getMarkup
);

router.post(
  '/markup',
  authorize('admin', 'super_admin'),
  validateUpdateMarkup(), 
  validate,
  settingsController.updateMarkup
);

router.put(
  '/markup',
  authorize('admin', 'super_admin'),
  validateUpdateMarkup(),
  validate,
  settingsController.updateMarkup
);

router.patch(
  '/markup',
  authorize('admin', 'super_admin'),
  validateUpdateMarkup(),
  validate,
  settingsController.updateMarkup 
);

// ─── SECTION-BASED SETTINGS ──────────────────────────────────────
/**
 * @openapi
 * /api/v1/crm/setting/{section}:
 *   get:
 *     tags:
 *       - CRM - Settings
 *     summary: Get CRM Settings by Section
 *     description: Retrieve settings configuration for a specific section (e.g., general, financial, booking, notifications, markup).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *         description: Settings section key (e.g., general, markup)
 *         example: general
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *   put:
 *     tags:
 *       - CRM - Settings
 *     summary: Update CRM Settings by Section (Admin only)
 *     description: Update or create settings for a section.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *         description: Settings section key
 *         example: general
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               companyName: "Maqam Travels"
 *               supportEmail: "support@maqam.com"
 *               supportPhone: "+911180808080"
 *               timezone: "Asia/Kolkata"
 *               currency: "INR"
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *   patch:
 *     tags:
 *       - CRM - Settings
 *     summary: Partially Update CRM Settings by Section (Admin only)
 *     description: Partially update settings for a section.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *         description: Settings section key
 *         example: general
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               timezone: "Asia/Kolkata"
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get(
  '/:section',
  authorize('admin', 'super_admin', 'sales_agent', 'support_agent'),
  validateSettingsSection(),
  validate,
  settingsController.getSettings
);

router.put(
  '/:section',
  authorize('admin', 'super_admin'),
  validateUpdateSettings(),
  validate,
  settingsController.updateSettings
);

router.patch(
  '/:section',
  authorize('admin', 'super_admin'),
  validateUpdateSettings(),
  validate,
  settingsController.updateSettings
);

module.exports = router;
