const express = require('express');
const ChatController = require('../aiPlanner/chat.controller')


const router = express.Router();

/**
 * @openapi
 * /api/v1/ai/chat:
 *   post:
 *     tags:
 *       - AI Planner
 *     summary: AI Package Search & Trip Planner
 *     description: Parses a user message for destination, maximum budget, and duration constraints to retrieve matching packages and generate a conversational recommendation.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userMessage
 *             properties:
 *               userMessage:
 *                 type: string
 *                 example: "Find packages for Dubai under 50000 for 5 days"
 *                 description: User's travel query or prompt describing desired trip.
 *     responses:
 *       200:
 *         description: Packages retrieved and conversational reply generated successfully.
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
 *                   example: "Packages are retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     reply:
 *                       type: string
 *                       example: "Packages are retrieved successfully in Dubai within your budget of ₹50,000:"
 *                     filtersApplied:
 *                       type: object
 *                       properties:
 *                         destination:
 *                           type: string
 *                           example: "Dubai"
 *                         maxPrice:
 *                           type: number
 *                           example: 50000
 *                         maxDays:
 *                           type: integer
 *                           example: 5
 *                     isRelativeMatch:
 *                       type: boolean
 *                       example: false
 *                       description: Indicates whether the packages are relative recommendations rather than an exact match.
 *                     packages:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Package'
 *       400:
 *         description: Missing or empty userMessage.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               message: "A non-empty 'userMessage' string is required."
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

router.post('/chat', ChatController.handleChat)

module.exports = router
