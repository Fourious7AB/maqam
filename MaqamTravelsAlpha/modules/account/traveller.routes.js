const router = require('express').Router();
const travellerController = require('./traveller.controller.js');
const travellerValidator = require('./traveller.validator');
// const authMiddleware = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
 

/**
 * @openapi
 * /api/v1/account/traveller/getAll:
 *   get:
 *     tags:
 *       - Account
 *     summary: Get all travellers for the authenticated user
 *     description: Retrieves all traveller profiles associated with the current logged-in user.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Traveller list retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           email:
 *                             type: string
 *                             format: email
 *                           phone:
 *                             type: string
 *                           passengerType:
 *                             type: string
 *                           title:
 *                             type: string
 *                           gender:
 *                             type: string
 *                           dateOfBirth:
 *                             type: string
 *                             format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', authenticate, travellerController.getTravellersByUserId);
router.get('/getAll', authenticate, travellerController.getTravellersByUserId);

/**
 * @openapi
 * /api/v1/account/traveller/{travellerId}:
 *   get:
 *     tags:
 *       - Account
 *     summary: Get a traveller by ID
 *     description: Fetches a single traveller profile belonging to the authenticated user.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: travellerId
 *         required: true
 *         description: The MongoDB ID of the traveller to retrieve.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Traveller retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:travellerId', authenticate, travellerValidator.validateTravellerId(), validate, travellerController.getTravellerById);

/**
 * @openapi
 * /api/v1/account/traveller/create:
 *   post:
 *     tags:
 *       - Account
 *     summary: Create a new traveller profile
 *     description: Creates a new traveller profile for the authenticated user.
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
 *               - email
 *               - phone
 *               - passengerType
 *               - title
 *               - gender
 *               - dateOfBirth
 *               - cellCountryCode
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               passengerType:
 *                 type: string
 *                 enum: [Adult, Child, Infant]
 *               title:
 *                 type: string
 *                 enum: [Mr, Mrs, Ms, Miss, Mstr]
 *               gender:
 *                 type: string
 *                 enum: [Male, Female]
 *               dateOfBirth:
 *                 type: string
 *                 format: date-time
 *               passportNo:
 *                 type: string
 *                 nullable: true
 *               passportExpiry:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               passportIssueDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               cellCountryCode:
 *                 type: string
 *     responses:
 *       201:
 *         description: Traveller created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/create', authenticate, travellerValidator.validateCreateTraveller(), validate, travellerController.createTraveller);
router.post('/', authenticate, travellerValidator.validateCreateTraveller(), validate, travellerController.createTraveller);

/**
 * @openapi
 * /api/v1/account/traveller/{travellerId}:
 *   put:
 *     tags:
 *       - Account
 *     summary: Update a traveller profile
 *     description: Updates an existing traveller profile for the authenticated user.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: travellerId
 *         required: true
 *         description: The MongoDB ID of the traveller to update.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
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
 *                 format: email
 *               phone:
 *                 type: string
 *               passengerType:
 *                 type: string
 *                 enum: [Adult, Child, Infant]
 *               title:
 *                 type: string
 *                 enum: [Mr, Mrs, Ms, Miss, Mstr]
 *               gender:
 *                 type: string
 *                 enum: [Male, Female]
 *               dateOfBirth:
 *                 type: string
 *                 format: date-time
 *               passportNo:
 *                 type: string
 *                 nullable: true
 *               passportExpiry:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               passportIssueDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               cellCountryCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Traveller updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/:travellerId', authenticate, travellerValidator.validateTravellerId(), travellerValidator.validateUpdateTraveller(), validate, travellerController.updateTraveller);
router.patch('/:travellerId/default', authenticate, travellerValidator.validateTravellerId(), validate, travellerController.setDefaultTraveller);
router.put('/:travellerId/default', authenticate, travellerValidator.validateTravellerId(), validate, travellerController.setDefaultTraveller);

/**
 * @openapi
 * /api/v1/account/traveller/{travellerId}:
 *   delete:
 *     tags:
 *       - Account
 *     summary: Delete a traveller profile
 *     description: Deletes a traveller profile belonging to the authenticated user.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: travellerId
 *         required: true
 *         description: The MongoDB ID of the traveller to delete.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Traveller deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/:travellerId', authenticate, travellerValidator.validateTravellerId(), validate, travellerController.deleteTraveller);

module.exports = router;
