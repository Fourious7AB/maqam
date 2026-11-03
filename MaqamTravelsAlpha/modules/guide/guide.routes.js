// const router = require("express").Router();
// const guideController = require("./guide.controller");
// const guideValidator = require("./guide.validator");
// const validate = require("../../middleware/validate");
// const { authenticate, authorize } = require("../../middleware/auth");

// /**
//  * ===================================================================
//  * USER-SIDE GUIDE ROUTES
//  * ===================================================================
//  */

// /**
//  * @openapi
//  * /api/v1/instructor/categories:
//  *   get:
//  *     tags:
//  *       - Tour Guides (User)
//  *     summary: List guide categories
//  *     description: Returns all available guide categories with active guides count.
//  *     responses:
//  *       200:
//  *         description: Categories retrieved successfully.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/SuccessEnvelope'
//  *       500:
//  *         $ref: '#/components/responses/InternalServerError'
//  */
// router.get("/categories", guideController.getCategories);

// /**
//  * ===================================================================
//  * ADMIN-SIDE GUIDE ROUTES (Mounted before /:id parameter)
//  * ===================================================================
//  */

// /**
//  * @openapi
//  * /api/v1/instructor/guide:
//  *   post:
//  *     tags:
//  *       - Tour Guides (Admin)
//  *     summary: Create new guide profile
//  *     description: >
//  *       Creates and onboards a new guide profile.
//  *
//  *   
//  *     security:
//  *       - BearerAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - fullName
//  *               - phone
//  *               - city
//  *               - category
//  *               - languages
//  *               - hourlyRate
//  *             properties:
//  *               fullName:
//  *                 type: string
//  *                 example: "Muhammad Ibrahim"
//  *                 description: Full legal/professional name of the guide.
//  *               phone:
//  *                 type: string
//  *                 example: "+966501234567"
//  *                 description: Unique phone number with international country code.
//  *               email:
//  *                 type: string
//  *                 format: email
//  *                 example: "m.ibrahim@maqam.com"
//  *               city:
//  *                 type: string
//  *                 example: "Madinah"
//  *                 description: Primary operating city / destination.
//  *               category:
//  *                 type: string
//  *                 example: "ziyarat-historical"
//  *                 description: Category slug (e.g. umrah-religious, ziyarat-historical, city-heritage, desert-adventure).
//  *               languages:
//  *                 type: array
//  *                 items:
//  *                   type: string
//  *                 example: ["Arabic", "English", "Turkish"]
//  *                 description: Spoken languages for tour delivery.
//  *               hourlyRate:
//  *                 type: number
//  *                 minimum: 0
//  *                 example: 160
//  *                 description: Standard hourly guiding rate in local currency (SAR).
//  *               fullDayRate:
//  *                 type: number
//  *                 minimum: 0
//  *                 example: 950
//  *                 description: Optional discounted full-day package rate.
//  *               currency:
//  *                 type: string
//  *                 default: "SAR"
//  *                 example: "SAR"
//  *               bio:
//  *                 type: string
//  *                 example: "Certified Umrah and Historical Ziyarat guide with 8+ years experience helping pilgrims."
//  *               yearsOfExperience:
//  *                 type: integer
//  *                 minimum: 0
//  *                 default: 1
//  *                 example: 8
//  *               avatar:
//  *                 type: string
//  *                 format: uri
//  *                 example: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d"
//  *              
//  *               
//  *               licenseNumber:
//  *                 type: string
//  *                 example: "KSA-TOUR-88910"
//  *               nationalId:
//  *                 type: string
//  *                 example: "1098765432"
//  *                 description: Sensitive national identification or Iqama (hidden by default).
//  *               certifications:
//  *                 type: array
//  *                 items:
//  *                   type: string
//  *                 example: ["Saudi Tourism Authority Certified", "First Aid & CPR Certified"]
//  *               badge:
//  *                 type: string
//  *                 default: "Licensed Guide"
//  *                 example: "Licensed Guide"
//  *               status:
//  *                 type: string
//  *                 enum: [pending, approved, active, suspended]
//  *                 default: "approved"
//  *                 example: "approved"
//  *     responses:
//  *       201:
//  *         description: Guide created successfully.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/SuccessEnvelope'
//  *            
//  *       400:
//  *         $ref: '#/components/responses/ValidationError'
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       403:
//  *         $ref: '#/components/responses/Forbidden'
//  *       500:
//  *         $ref: '#/components/responses/InternalServerError'
//  *  
//  */
// router.post(
//   "/guide",
//   authenticate,
//   authorize("admin", "super_admin"),
//   guideValidator.validateCreateGuideAdmin(),
//   validate,
//   guideController.createGuide,
// );

// /**
//  * @openapi
//  * /api/v1/instructor/guides:
//  *  get:
//  *     tags:
//  *       - Tour Guides (Admin)
//  *     summary: List all guides (Admin view)
//  *     description: List guides across all statuses (pending, approved, active, suspended) with search and filters.
//  *     security:
//  *       - BearerAuth: []
//  *     parameters:
//  *       - name: status
//  *         in: query
//  *         required: false
//  *         description: Filter guides by lifecycle status.
//  *         schema:
//  *           type: string
//  *           enum: [pending, approved, active, suspended]
//  *       - name: city
//  *         in: query
//  *         required: false
//  *         description: Filter guides by city.
//  *         schema:
//  *           type: string
//  *           example: "Makkah"
//  *       - name: category
//  *         in: query
//  *         required: false
//  *         description: Filter guides by category slug.
//  *         schema:
//  *           type: string
//  *           example: "umrah-religious"
//  *       - name: search
//  *         in: query
//  *         required: false
//  *         description: Search keyword matching full name, city, category, or bio.
//  *         schema:
//  *           type: string
//  *           example: "Ahmed"
//  *       - name: page
//  *         in: query
//  *         required: false
//  *         description: Page number for pagination.
//  *         schema:
//  *           type: integer
//  *           default: 1
//  *           minimum: 1
//  *           example: 1
//  *       - name: limit
//  *         in: query
//  *         required: false
//  *         description: Number of records per page (max 100).
//  *         schema:
//  *           type: integer
//  *           default: 10
//  *           minimum: 1
//  *           maximum: 100
//  *           example: 10
//  *     responses:
//  *       200:
//  *         description: Guides list retrieved.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/SuccessEnvelope'
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       403:
//  *         $ref: '#/components/responses/Forbidden'
//  *       500:
//  *         $ref: '#/components/responses/InternalServerError'
//  */

// router.get(
//   "/guides",
//   authenticate,
//   authorize("admin", "super_admin"),
//   guideController.getAllGuides,
// );

// /**
//  * @openapi
//  * /api/v1/instructor/admin/{id}:
//  *   get:
//  *     tags:
//  *       - Tour Guides (Admin)
//  *     summary: Get guide internal dossier
//  *     description: Fetches full administrative details of a guide including KYC and stats.
//  *     security:
//  *       - BearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         description: MongoDB ObjectId of the guide profile.
//  *         schema:
//  *           type: string
//  *           example: "64f8e5d32b1a4c9f12345678"
//  *     responses:
//  *       200:
//  *         description: Guide dossier retrieved.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/SuccessEnvelope'
//  *       400:
//  *         $ref: '#/components/responses/ValidationError'
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       403:
//  *         $ref: '#/components/responses/Forbidden'
//  *       404:
//  *         $ref: '#/components/responses/NotFound'
//  *       500:
//  *         $ref: '#/components/responses/InternalServerError'
//  *   patch:
//  *     tags:
//  *       - Tour Guides (Admin)
//  *     summary: Update guide profile & status
//  *     description: Update profile, rates, or change lifecycle status (approved, active, suspended).
//  *     security:
//  *       - BearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         description: MongoDB ObjectId of the guide to update.
//  *         schema:
//  *           type: string
//  *           example: "64f8e5d32b1a4c9f12345678"
//  *     requestBody:
//  *       required: false
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               fullName:
//  *                 type: string
//  *                 example: "Sheikh Ahmed Al-Mansoor"
//  *               phone:
//  *                 type: string
//  *                 example: "+966501234567"
//  *               email:
//  *                 type: string
//  *                 format: email
//  *                 example: "ahmed.updated@example.com"
//  *               city:
//  *                 type: string
//  *                 example: "Madinah"
//  *               category:
//  *                 type: string
//  *                 example: "ziyarat-historical"
//  *               languages:
//  *                 type: array
//  *                 items:
//  *                   type: string
//  *                 example: ["Arabic", "English", "French"]
//  *               hourlyRate:
//  *                 type: number
//  *                 minimum: 0
//  *                 example: 150
//  *               fullDayRate:
//  *                 type: number
//  *                 minimum: 0
//  *                 example: 900
//  *               currency:
//  *                 type: string
//  *                 example: "SAR"
//  *               bio:
//  *                 type: string
//  *                 example: "Updated biography and qualifications."
//  *               yearsOfExperience:
//  *                 type: integer
//  *                 minimum: 0
//  *                 example: 10
//  *               badge:
//  *                 type: string
//  *                 example: "Elite Guide"
//  *               status:
//  *                 type: string
//  *                 enum: [pending, approved, active, suspended]
//  *                 example: "active"
//  *               avatar:
//  *                 type: string
//  *                 format: uri
//  *               gallery:
//  *                 type: array
//  *                 items:
//  *                   type: string
//  *               coverageAreas:
//  *                 type: array
//  *                 items:
//  *                   type: string
//  *               licenseNumber:
//  *                 type: string
//  *               certifications:
//  *                 type: array
//  *                 items:
//  *                   type: string
//  *     responses:
//  *       200:
//  *         description: Guide updated successfully.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/SuccessEnvelope'
//  *       400:
//  *         $ref: '#/components/responses/ValidationError'
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       403:
//  *         $ref: '#/components/responses/Forbidden'
//  *       404:
//  *         $ref: '#/components/responses/NotFound'
//  *       500:
//  *         $ref: '#/components/responses/InternalServerError'
//  *   delete:
//  *     tags:
//  *       - Tour Guides (Admin)
//  *     summary: Remove or archive a guide
//  *     description: Soft-deletes a guide and cancels unbooked future slots.
//  *     security:
//  *       - BearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         description: MongoDB ObjectId of the guide to remove.
//  *         schema:
//  *           type: string
//  *           example: "64f8e5d32b1a4c9f12345678"
//  *     responses:
//  *       200:
//  *         description: Guide removed/archived successfully.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/SuccessEnvelope'
//  *       400:
//  *         $ref: '#/components/responses/ValidationError'
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       403:
//  *         $ref: '#/components/responses/Forbidden'
//  *       404:
//  *         $ref: '#/components/responses/NotFound'
//  *       500:
//  *         $ref: '#/components/responses/InternalServerError'
//  */
// router.get(
//   "/admin/:id",
//   authenticate,
//   authorize("admin", "super_admin"),
//   guideValidator.validateGuideId(),
//   validate,
//   guideController.getAdminGuideById,
// );

// router.patch(
//   "/admin/:id",
//   authenticate,
//   authorize("admin", "super_admin"),
//   guideValidator.validateUpdateGuideAdmin(),
//   validate,
//   guideController.updateGuide,
// );

// router.delete(
//   "/admin/:id",
//   authenticate,
//   authorize("admin", "super_admin"),
//   guideValidator.validateGuideId(),
//   validate,
//   guideController.deleteGuide,
// );

// /**
//  * @openapi
//  * /api/v1/instructor/admin/{id}/slots:
//  *   put:
//  *     tags:
//  *       - Tour Guides (Admin)
//  *     summary: Set / bulk-update available slots
//  *     description: Configure shifts, working hours, and bookable time windows for a guide.
//  *     security:
//  *       - BearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         description: MongoDB ObjectId of the guide.
//  *         schema:
//  *           type: string
//  *           example: "64f8e5d32b1a4c9f12345678"
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - slots
//  *             properties:
//  *               slots:
//  *                 type: array
//  *                 description: List of time slots to configure/upsert.
//  *                 items:
//  *                   type: object
//  *                   required:
//  *                     - date
//  *                     - startTime
//  *                     - endTime
//  *                     - price
//  *                   properties:
//  *                     date:
//  *                       type: string
//  *                       format: date
//  *                       example: "2026-09-15"
//  *                       description: "Date string in YYYY-MM-DD format."
//  *                     startTime:
//  *                       type: string
//  *                       example: "09:00"
//  *                       description: "Slot start time (HH:mm)."
//  *                     endTime:
//  *                       type: string
//  *                       example: "13:00"
//  *                       description: "Slot end time (HH:mm)."
//  *                     price:
//  *                       type: number
//  *                       minimum: 0
//  *                       example: 150
//  *                       description: "Price for this specific time slot in SAR."
//  *                     isAvailable:
//  *                       type: boolean
//  *                       default: true
//  *                       example: true
//  *                       description: "Availability status of the slot."
//  *     responses:
//  *       200:
//  *         description: Slots configured successfully.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/SuccessEnvelope'
//  *       400:
//  *         $ref: '#/components/responses/ValidationError'
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       403:
//  *         $ref: '#/components/responses/Forbidden'
//  *       404:
//  *         $ref: '#/components/responses/NotFound'
//  *       500:
//  *         $ref: '#/components/responses/InternalServerError'
//  */
// router.put(
//   "/admin/:id/slots",
//   authenticate,
//   authorize("admin", "super_admin"),
//   guideValidator.validateSetSlotsAdmin(),
//   validate,
//   guideController.setGuideSlots,
// );

// /**
//  * ===================================================================
//  * USER-SIDE PARAMETERIZED ROUTES
//  * ===================================================================
//  */

// /**
//  * @openapi
//  * /api/v1/instructor:
//  *   get:
//  *     tags:
//  *       - Tour Guides (User)
//  *     summary: List published tour guides
//  *     description: Search and filter available active guides by city, category, language, or date.
//  *     parameters:
//  *       - name: destination
//  *         in: query
//  *         required: false
//  *         description: City / destination to filter guides by (e.g. Makkah, Madinah, Jeddah).
//  *         schema:
//  *           type: string
//  *           example: "Makkah"
//  *       - name: category
//  *         in: query
//  *         required: false
//  *         description: Category slug (e.g. umrah-religious, ziyarat-historical, city-heritage, desert-adventure).
//  *         schema:
//  *           type: string
//  *           example: "umrah-religious"
//  *       - name: language
//  *         in: query
//  *         required: false
//  *         description: Spoken language of the guide (e.g. English, Arabic, Urdu).
//  *        
//  *       - name: page
//  *         in: query
//  *         required: false
//  *         description: Page number for pagination.
//  *         schema:
//  *           type: integer
//  *           default: 1
//  *           minimum: 1
//  *           example: 1
//  *       - name: limit
//  *         in: query
//  *         required: false
//  *         description: Number of records per page (max 100).
//  *         schema:
//  *           type: integer
//  *           default: 10
//  *           minimum: 1
//  *           maximum: 100
//  *           example: 10
//  *     responses:
//  *       200:
//  *         description: Guides retrieved successfully.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/SuccessEnvelope'
//  *       400:
//  *         $ref: '#/components/responses/ValidationError'
//  *       500:
//  *         $ref: '#/components/responses/InternalServerError'
//  */
// router.get(
//   "/",
//   guideValidator.validateGetGuides(),
//   validate,
//   guideController.getGuides,
// );

// /**
//  * @openapi
//  * /api/v1/instructor/{id}:
//  *   get:
//  *     tags:
//  *       - Tour Guides (User)
//  *     summary: Get public guide profile
//  *     description: Returns public details, bio, languages, ratings, and pricing for a guide.
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         description: MongoDB ObjectId of the guide.
//  *         schema:
//  *           type: string
//  *           example: "64f8e5d32b1a4c9f12345678"
//  *     responses:
//  *       200:
//  *         description: Guide details retrieved.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/SuccessEnvelope'
//  *       400:
//  *         $ref: '#/components/responses/ValidationError'
//  *       404:
//  *         $ref: '#/components/responses/NotFound'
//  *       500:
//  *         $ref: '#/components/responses/InternalServerError'
//  */
// router.get(
//   "/:id",
//   guideValidator.validateGuideId(),
//   validate,
//   guideController.getUserGuideById,
// );

// /**
//  * @openapi
//  * /api/v1/instructor/{id}/slots:
//  *   get:
//  *     tags:
//  *       - Tour Guides (User)
//  *     summary: Check available dates & slots
//  *     description: Returns bookable slots for a guide within a calendar window.
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         description: MongoDB ObjectId of the guide.
//  *         schema:
//  *           type: string
//  *           example: "64f8e5d32b1a4c9f12345678"
//  *       - name: startDate
//  *         in: query
//  *         required: false
//  *         description: Window start date (YYYY-MM-DD).
//  *         schema:
//  *           type: string
//  *           format: date
//  *           example: "2026-09-01"
//  *       - name: endDate
//  *         in: query
//  *         required: false
//  *         description: Window end date (YYYY-MM-DD).
//  *         schema:
//  *           type: string
//  *           format: date
//  *           example: "2026-09-30"
//  *       - name: date
//  *         in: query
//  *         required: false
//  *         description: Specific date lookup (YYYY-MM-DD).
//  *         schema:
//  *           type: string
//  *           format: date
//  *           example: "2026-09-15"
//  *     responses:
//  *       200:
//  *         description: Available slots retrieved.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/SuccessEnvelope'
//  *       400:
//  *         $ref: '#/components/responses/ValidationError'
//  *       404:
//  *         $ref: '#/components/responses/NotFound'
//  *       500:
//  *         $ref: '#/components/responses/InternalServerError'
//  */
// router.get(
//   "/:id/slots",
//   guideValidator.validateGetSlots(),
//   validate,
//   guideController.getGuideSlots,
// );

// /**
//  * @openapi
//  * /api/v1/instructor/{id}/reviews:
//  *   get:
//  *     tags:
//  *       - Tour Guides (User)
//  *     summary: List guide reviews
//  *     description: Retrieves verified reviews and ratings breakdown for a guide.
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         description: MongoDB ObjectId of the guide.
//  *         schema:
//  *           type: string
//  *           example: "64f8e5d32b1a4c9f12345678"
//  *       - name: page
//  *         in: query
//  *         required: false
//  *         description: Page number for reviews pagination.
//  *         schema:
//  *           type: integer
//  *           default: 1
//  *           minimum: 1
//  *           example: 1
//  *       - name: limit
//  *         in: query
//  *         required: false
//  *         description: Number of reviews per page.
//  *         schema:
//  *           type: integer
//  *           default: 10
//  *           minimum: 1
//  *           maximum: 100
//  *           example: 10
//  *     responses:
//  *       200:
//  *         description: Reviews retrieved.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/SuccessEnvelope'
//  *       400:
//  *         $ref: '#/components/responses/ValidationError'
//  *       404:
//  *         $ref: '#/components/responses/NotFound'
//  *       500:
//  *         $ref: '#/components/responses/InternalServerError'
//  *   post:
//  *     tags:
//  *       - Tour Guides (User)
//  *     summary: Submit a review for a guide
//  *     description: Authenticated user submits a rating (1-5) and feedback for a guide.
//  *     security:
//  *       - BearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         description: MongoDB ObjectId of the guide.
//  *         schema:
//  *           type: string
//  *           example: "64f8e5d32b1a4c9f12345678"
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - rating
//  *               - comment
//  *             properties:
//  *               rating:
//  *                 type: integer
//  *                 minimum: 1
//  *                 maximum: 5
//  *                 example: 5
//  *                 description: Star rating between 1 and 5.
//  *               comment:
//  *                 type: string
//  *                 minLength: 5
//  *                 maxLength: 1000
//  *                 example: "Sheikh Ahmed was extremely knowledgeable and patient during our Umrah rituals."
//  *                 description: Review text comment.
//  *               bookingId:
//  *                 type: string
//  *                 example: "64f8e5d32b1a4c9f87654321"
//  *                 description: Optional booking ObjectId verifying completed service.
//  *     responses:
//  *       201:
//  *         description: Review submitted successfully.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/SuccessEnvelope'
//  *       400:
//  *         $ref: '#/components/responses/ValidationError'
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       404:
//  *         $ref: '#/components/responses/NotFound'
//  *       500:
//  *         $ref: '#/components/responses/InternalServerError'
//  */
// router.get(
//   "/:id/reviews",
//   guideValidator.validateGuideId(),
//   validate,
//   guideController.getGuideReviews,
// );

// router.post(
//   "/:id/reviews",
//   authenticate,
//   guideValidator.validateCreateReview(),
//   validate,
//   guideController.createGuideReview,
// );

// module.exports = router;
