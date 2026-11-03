const router = require('express').Router();
const cmsController = require('./cms.controller');
const cmsValidator = require('./cms.validator');
const validate = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { uploadSingle } = require('../../middleware/upload');

/**
 * ─── CMS ROUTES ────────────────────────────────────────
 * Base URL: /api/v1/cms
 * Pattern: Manage static pages, FAQs, blog, hero banners, etc.
 * Public read, admin write
 */

// ─── Public routes ─────────────────────────────────────

/**
 * @openapi
 * /api/v1/cms/pages/{slug}:
 *   get:
 *     tags:
 *       - CMS
 *     summary: Get Static Page by Slug
 *     description: Retrieve a published static CMS page (e.g., terms-of-service, privacy-policy, about-us) by its unique URL slug.
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique slug identifier for the page
 *         example: privacy-policy
 *     responses:
 *       200:
 *         description: Page retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               message: Page retrieved
 *               data:
 *                 _id: 6512bd8f4f1a250012345678
 *                 type: page
 *                 title: Privacy Policy
 *                 slug: privacy-policy
 *                 content: "<h1>Privacy Policy</h1><p>Your privacy is important to us...</p>"
 *                 isPublished: true
 *                 createdAt: "2026-01-01T00:00:00.000Z"
 *                 updatedAt: "2026-01-01T00:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/pages/:slug', cmsValidator.validatePageSlug(), validate, cmsController.getPage);

/**
 * @openapi
 * /api/v1/cms/faqs:
 *   get:
 *     tags:
 *       - CMS
 *     summary: Get Frequently Asked Questions (FAQs)
 *     description: Retrieve a paginated list of published FAQs, optionally filtered by category.
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter FAQs by category (e.g., general, booking, visa, payment)
 *         example: visa
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of FAQ items per page
 *         example: 10
 *     responses:
 *       200:
 *         description: FAQs retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               message: FAQs retrieved
 *               data:
 *                 - _id: 6512bd8f4f1a250012345679
 *                   type: faq
 *                   title: How do I apply for an Umrah visa?
 *                   slug: how-do-i-apply-for-an-umrah-visa
 *                   answer: You can apply directly through our Visa portal by submitting your passport scan and photo.
 *                   category: visa
 *                   order: 1
 *                   isPublished: true
 *               meta:
 *                 total: 1
 *                 page: 1
 *                 limit: 10
 *                 totalPages: 1
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/faqs', cmsController.getFAQs);

/**
 * @openapi
 * /api/v1/cms/blog:
 *   get:
 *     tags:
 *       - CMS
 *     summary: List Published Blog Posts
 *     description: Retrieve a paginated list of published blog articles sorted newest first.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of blog posts per page
 *         example: 10
 *     responses:
 *       200:
 *         description: Blog posts retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               message: Blog posts retrieved
 *               data:
 *                 - _id: 6512bd8f4f1a250012345680
 *                   type: blog
 *                   title: Top 10 Sacred Sites to Visit in Makkah & Madinah
 *                   slug: top-10-sacred-sites-makkah-madinah
 *                   excerpt: A comprehensive spiritual guide for pilgrims visiting the Holy Lands.
 *                   coverImage: "https://res.cloudinary.com/demo/image/upload/makkah.jpg"
 *                   tags: ["umrah", "travel-guide", "makkah"]
 *                   isPublished: true
 *                   createdAt: "2026-01-01T00:00:00.000Z"
 *               meta:
 *                 total: 1
 *                 page: 1
 *                 limit: 10
 *                 totalPages: 1
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/blog', cmsController.listBlogPosts);

/**
 * @openapi
 * /api/v1/cms/blog/{slug}:
 *   get:
 *     tags:
 *       - CMS
 *     summary: Get Blog Post by Slug
 *     description: Retrieve full details and content of a single published blog article by its unique URL slug.
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique slug identifier of the blog post
 *         example: top-10-sacred-sites-makkah-madinah
 *     responses:
 *       200:
 *         description: Blog post retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               message: Blog post retrieved
 *               data:
 *                 _id: 6512bd8f4f1a250012345680
 *                 type: blog
 *                 title: Top 10 Sacred Sites to Visit in Makkah & Madinah
 *                 slug: top-10-sacred-sites-makkah-madinah
 *                 excerpt: A comprehensive spiritual guide for pilgrims visiting the Holy Lands.
 *                 content: "<p>Visiting the holy sites is a once-in-a-lifetime experience...</p>"
 *                 coverImage: "https://res.cloudinary.com/demo/image/upload/makkah.jpg"
 *                 tags: ["umrah", "travel-guide", "makkah"]
 *                 isPublished: true
 *                 createdAt: "2026-01-01T00:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/blog/:slug', cmsValidator.validatePageSlug(), validate, cmsController.getBlogPost);

/**
 * @openapi
 * /api/v1/cms/heroPic:
 *   get:
 *     tags:
 *       - CMS
 *     summary: Get Current Active Hero Banner Picture
 *     description: Public endpoint to fetch the current active frontend hero banner image, headline, and subtitle.
 *     responses:
 *       200:
 *         description: Hero picture retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               message: Hero picture retrieved successfully
 *               data:
 *                 _id: 6512bd8f4f1a250012345681
 *                 type: hero
 *                 slug: main-hero-banner
 *                 title: Discover Sacred Journeys
 *                 subTitle: Unforgettable Umrah, Hajj & Global Travel Packages
 *                 imageUrl: "https://res.cloudinary.com/demo/image/upload/travel-agency/cms/hero/sample_hero.jpg"
 *                 publicId: "travel-agency/cms/hero/sample_hero"
 *                 isPublished: true
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/heroPic', cmsController.getHeroPic);

// ─── Admin routes ──────────────────────────────────────

/**
 * @openapi
 * /api/v1/cms/changeHeroPic:
 *   post:
 *     tags:
 *       - CMS
 *     summary: Update Frontend Hero Banner Picture (POST)
 *     description: |
 *       Admin endpoint to change or update the frontend hero banner picture.
 *       - Accepts a binary image file (`heroPic`) via `multipart/form-data` to automatically stream and upload to Cloudinary.
 *       - Or accepts an `imageUrl` string (in JSON or form data).
 *       - Automatically removes the previous hero image from Cloudinary to prevent orphaned storage.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               heroPic:
 *                 type: string
 *                 format: binary
 *                 description: Banner image file to upload (Max 10MB; jpg, jpeg, png, webp, gif)
 *               imageUrl:
 *                 type: string
 *                 description: Direct image URL (alternative to uploading a binary file)
 *                 example: "https://res.cloudinary.com/demo/image/upload/banner.jpg"
 *               title:
 *                 type: string
 *                 description: Main hero banner headline
 *                 example: "Discover Sacred Journeys"
 *               subTitle:
 *                 type: string
 *                 description: Banner sub-headline / tagline
 *                 example: "Exclusive Umrah, Hajj & Global Holiday Packages"
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imageUrl:
 *                 type: string
 *                 description: Direct image URL
 *                 example: "https://res.cloudinary.com/demo/image/upload/banner.jpg"
 *               title:
 *                 type: string
 *                 example: "Discover Sacred Journeys"
 *               subTitle:
 *                 type: string
 *                 example: "Exclusive Umrah, Hajj & Global Holiday Packages"
 *     responses:
 *       200:
 *         description: Hero banner picture updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *  
 */
router.post(
  '/changeHeroPic',
  authenticate,
  authorize('admin', 'super_admin'),
  uploadSingle('heroPic', { fileSize: 10 * 1024 * 1024 }),
  cmsValidator.validateChangeHeroPic(),
  validate,
  cmsController.changeHeroPic
);

/**
 * @openapi
 * /api/v1/cms/heroPic:
 *   put:
 *     tags:
 *       - CMS
 *     summary: Edit Frontend Hero Banner Properties (PUT)
 *     description: Admin endpoint to edit hero banner title, subTitle, publication status, or replace image.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               heroPic:
 *                 type: string
 *                 format: binary
 *               imageUrl:
 *                 type: string
 *               title:
 *                 type: string
 *               subTitle:
 *                 type: string
 *               isPublished:
 *                 type: boolean
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imageUrl:
 *                 type: string
 *               title:
 *                 type: string
 *               subTitle:
 *                 type: string
 *               isPublished:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Hero banner updated successfully.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put(
  '/heroPic',
  authenticate,
  authorize('admin', 'super_admin'),
  uploadSingle('heroPic', { fileSize: 10 * 1024 * 1024 }),
  cmsValidator.validateEditHeroPic(),
  validate,
  cmsController.editHeroPic
);

/**
 * @openapi
 * /api/v1/cms/heroPic:
 *   delete:
 *     tags:
 *       - CMS
 *     summary: Delete Hero Banner & Clean Storage (DELETE)
 *     description: Permanently removes the hero banner document and deletes the image asset from Cloudinary via its publicId.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Hero banner and image deleted successfully.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete(
  '/heroPic',
  authenticate,
  authorize('admin', 'super_admin'),
  cmsController.deleteHeroPic
);

// Admin page management (TODO: Add admin middleware)
// router.post('/pages', adminMiddleware, cmsValidator.validateCreatePage(), validate, cmsController.createPage);
// router.put('/pages/:pageId', adminMiddleware, cmsValidator.validateUpdatePage(), validate, cmsController.updatePage);
// router.delete('/pages/:pageId', adminMiddleware, cmsController.deletePage);

module.exports = router;
