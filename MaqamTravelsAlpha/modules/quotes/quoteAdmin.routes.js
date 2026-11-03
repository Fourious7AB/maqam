'use strict';

const express = require('express');
const router = express.Router();
const quoteAdminController = require('./quoteAdmin.controller');
const quoteAdminValidator = require('./quoteAdmin.validator');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');

/**
 * ─── ADMIN / CRM QUOTATIONS ROUTES ─────────────────────
 * Base paths: /api/v1/crm/quotes and /api/v1/quotes/admin
 */

router.use(authenticate);

/**
 * @openapi
 * /api/v1/crm/quotes:
 *   get:
 *     tags:
 *       - CRM - Quotations (Admin)
 *     summary: List All Quotations with Search and Filters
 *     description: Retrieve all customer quotations with filters for status, assigned agent, date ranges, and search text.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Quotation status filter (e.g., new, proposal_sent, unhandled, won)
 *       - in: query
 *         name: agentId
 *         schema:
 *           type: string
 *         description: Assigned travel specialist ID (or 'unhandled' for unassigned quotes)
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter created date start
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter created date end
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Text search in customer name, email, phone, destination, or quote reference
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
 *         description: Quotations list retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin or Agent role required
 */
router.get(
  '/',
  authorize('admin', 'super_admin', 'sales_agent', 'support_agent'),
  quoteAdminValidator.validateListQuotations(),
  validate,
  quoteAdminController.listQuotations
);

/**
 * @openapi
 * /api/v1/crm/quotes/{id}:
 *   get:
 *     tags:
 *       - CRM - Quotations (Admin)
 *     summary: Get Single Quotation Details
 *     description: Retrieve detailed quotation record including customer details, assigned agent, timeline, and proposal stage.
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
 *         description: Quotation details retrieved
 *       404:
 *         description: Quotation not found
 */
router.get(
  '/:id',
  authorize('admin', 'super_admin', 'sales_agent', 'support_agent'),
  quoteAdminValidator.validateQuotationId(),
  validate,
  quoteAdminController.getQuotationById
);

/**
 * @openapi
 * /api/v1/crm/quotes/{id}/assign:
 *   post:
 *     tags:
 *       - CRM - Quotations (Admin)
 *     summary: Assign Unhandled Quotation to Travel Specialist
 *     description: Assigns an unhandled or existing quotation lead to a specific travel specialist / agent.
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
 *               - agentId
 *             properties:
 *               agentId:
 *                 type: string
 *                 example: "651234567890abcdef123456"
 *     responses:
 *       200:
 *         description: Quotation assigned successfully
 *       404:
 *         description: Quotation or Agent not found
 */
router.post(
  '/:id/assign',
  authorize('admin', 'super_admin', 'sales_agent'),
  quoteAdminValidator.validateAssignQuotation(),
  validate,
  quoteAdminController.assignQuotation
);

router.put(
  '/:id/assign',
  authorize('admin', 'super_admin', 'sales_agent'),
  quoteAdminValidator.validateAssignQuotation(),
  validate,
  quoteAdminController.assignQuotation
);

router.patch(
  '/:id/assign',
  authorize('admin', 'super_admin', 'sales_agent'),
  quoteAdminValidator.validateAssignQuotation(),
  validate,
  quoteAdminController.assignQuotation
);

/**
 * @openapi
 * /api/v1/crm/quotes/{id}/send:
 *   post:
 *     tags:
 *       - CRM - Quotations (Admin)
 *     summary: Send Specific Quotation Proposal to Customer
 *     description: Issues the quotation with price & expiry date, and sends Email & WhatsApp notifications to the customer.
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
 *               - quotedPrice
 *             properties:
 *               quotedPrice:
 *                 type: number
 *                 example: 320000
 *               quoteExpiresAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-11-15T23:59:59.000Z"
 *               notes:
 *                 type: string
 *                 example: "Includes 5-star hotel in Makkah and direct flights."
 *     responses:
 *       200:
 *         description: Quotation sent to customer successfully
 *       404:
 *         description: Quotation not found
 */
router.post(
  '/:id/send',
  authorize('admin', 'super_admin', 'sales_agent'),
  quoteAdminValidator.validateSendQuotation(),
  validate,
  quoteAdminController.sendQuotationToCustomer
);

router.put(
  '/:id/send',
  authorize('admin', 'super_admin', 'sales_agent'),
  quoteAdminValidator.validateSendQuotation(),
  validate,
  quoteAdminController.sendQuotationToCustomer
);

module.exports = router;
