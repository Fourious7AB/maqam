'use strict';

/**
 * modules/crm/userAdmin.routes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * CRM & Admin User Management Endpoints
 * Base path: /api/v1/crm/users (and /api/v1/ops-crm/users)
 */

const express = require('express');
const router = express.Router();
const crmController = require('./crm.controller');
const crmValidator = require('./crm.validator');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');

// All User Admin routes require authentication and admin or super_admin role
router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

/**
 * @openapi
 * /api/v1/crm/users:
 *   get:
 *     tags:
 *       - CRM - User & Staff Management
 *     summary: List All Users (Paginated with Search and Role Filtering)
 *     description: Retrieve users with pagination, text search (name, email, phone), role filtering, and active status filters.
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
 *           default: 10
 *         description: Items per page (max 100)
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [customer, sales_agent, support_agent, admin, super_admin, hotelier]
 *         description: Filter by user role
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status (true/false)
 *      
 *     responses:
 *       200:
 *         description: Users list retrieved successfully
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
 *                   example: "Users retrieved successfully"
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
 *       400:
 *         description: Validation error
 *       409:
 *         description: Phone or email already registered
 */
router.get('/', crmValidator.validateListUsers(), validate, crmController.listUsers);


/**
 * @openapi
 * /api/v1/crm/users/{id}:
 *   get:
 *     tags:
 *       - CRM - User & Staff Management
 *     summary: Get Single User Details
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongo ID of the user
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *       404:
 *         description: User not found
 *   put:
 *     tags:
 *       - CRM - User & Staff Management
 *     summary: Edit User Profile (Full Update)
 *     description: Update user details including name, email, phone, role, active status, and credentials.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongo ID of the user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "Tariq"
 *               lastName:
 *                 type: string
 *                 example: "Rahman"
 *               email:
 *                 type: string
 *                 example: "tariq.updated@maqamtravels.com"
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               role:
 *                 type: string
 *                 enum: [customer, sales_agent, support_agent, admin, super_admin, hotelier]
 *               hotelId:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               isVerified:
 *                 type: boolean
 *               password:
 *                 type: string
 *                 description: Provide to reset password
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden - Insufficient hierarchy permissions
 *       404:
 *         description: User not found
 *       409:
 *         description: Email or phone already registered by another user
 *   patch:
 *     tags:
 *       - CRM - User & Staff Management
 *     summary: Edit User Profile (Partial Update)
 *     description: Partially update user fields (e.g. toggle isActive, change role, or update contact info).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongo ID of the user
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [customer, sales_agent, support_agent, admin, super_admin, hotelier]
 *               hotelId:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               isVerified:
 *                 type: boolean
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       409:
 *         description: Conflict
 *   delete:
 *     tags:
 *       - CRM - User & Staff Management
 *     summary: Delete or Deactivate User
 *     description: Deactivates user (soft-delete by setting isActive = false) by default. Add query parameter ?permanent=true for permanent removal.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongo ID of the user
 *       - in: query
 *         name: permanent
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Set true to permanently hard-delete user from database
 *     responses:
 *       200:
 *         description: User deleted or deactivated successfully
 *       400:
 *         description: Cannot delete your own account
 *       403:
 *         description: Forbidden - Cannot delete super_admin without super_admin privileges
 *       404:
 *         description: User not found
 */
router.get('/:id', crmValidator.validateUserId(), validate, crmController.getUserDetails);
router.put('/:id', crmValidator.validateUpdateUser(), validate, crmController.updateUser);
router.patch('/:id', crmValidator.validateUpdateUser(), validate, crmController.updateUser);
router.delete('/:id', crmValidator.validateUserId(), validate, crmController.deleteUser);

module.exports = router;