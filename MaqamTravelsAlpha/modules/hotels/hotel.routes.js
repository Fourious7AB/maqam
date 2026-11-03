const router = require("express").Router();
const controller = require("./hotel.controller");
const validator = require("./hotel.validator");
const validate = require("../../middleware/validate");
const { searchLimiter } = require("../../middleware/rateLimiter");
const { query } = require("express-validator");
const { authenticate } = require("../../middleware/auth");
const idempotency = require("../payments/idempotency.middleware");

/**
 * @openapi
 * /api/v1/hotels/search:
 *   post:
 *     tags:
 *       - Hotels
 *     summary: Search hotel inventory
 *     description: >
 *       Executes a hotel search query against live supplier inventory (SRDV).
 *       Returns an array of available hotel properties with pricing quotes and an opaque, session-scoped `searchId`.
 *       The `searchId` must be supplied in subsequent `/hotels/{hotelId}` and `/hotels/recheck` calls.
 *       Includes markup and convenience fee calculation. Standard users see public pricing; admin/developer tokens receive full minor-unit financial breakdown.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HotelSearchRequest'
 *     responses:
 *       200:
 *         description: Hotel search completed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/HotelSearchResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  "/search",
  searchLimiter,
  validator.validateSearch(),
  validate,
  controller.searchHotels,
);

// Developer-only debug route (non-production)
router.get("/debug/search/:searchId", controller.debugSearchSession);

/**
 * @openapi
 * /api/v1/hotels/cities:
 *   get:
 *     tags:
 *       - Hotels
 *     summary: Autocomplete destination cities
 *     description: >
 *       Returns city suggestions matching the search prefix `q` from a 136k-city database.
 *       Use this endpoint for front-end destination dropdowns.
 *       The returned `cityId` or `cityName` can be passed to `POST /hotels/search`.
 *       Optionally filter by `countryCode` to restrict suggestions to a specific country.
 *     security: []
 *     parameters:
 *       - name: q
 *         in: query
 *         required: false
 *         description: Partial city name prefix (at least 1 character). Returns empty array for blank queries.
 *         schema:
 *           type: string
 *           example: "Mumbai"
 *       - name: countryCode
 *         in: query
 *         required: false
 *         description: ISO 3166-1 alpha-2 country code to filter city suggestions (e.g. `IN`, `AE`, `SA`).
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 2
 *           example: "IN"
 *     responses:
 *       200:
 *         description: City suggestions returned successfully.
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
 *                         $ref: '#/components/schemas/HotelCitySuggestion'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  "/cities",
  [query("q").optional().trim()],
  validate,
  controller.searchHotelCities,
);

/**
 * @openapi
 * /api/v1/hotels/debug/search/{searchId}:
 *   get:
 *     tags:
 *       - Hotels
 *     summary: "[Dev Only] Inspect raw search session cache"
 *     description: >
 *       **Non-production only.** Returns the full raw server-side search session cache for debugging
 *       search result issues. Returns HTTP 403 in production environments.
 *     security: []
 *     parameters:
 *       - name: searchId
 *         in: path
 *         required: true
 *         description: Search session UUID from a prior POST /hotels/search response.
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Search session cache retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @openapi
 * /api/v1/hotels/{hotelId}:
 *   get:
 *     tags:
 *       - Hotels
 *     summary: Get hotel details and room rate options
 *     description: >
 *       Fetches detailed hotel property information, amenities, description, image gallery, and available room rate plans for an active search session.
 *       Requires a valid `searchId` query parameter generated during `/hotels/search`.
 *     security: []
 *     parameters:
 *       - name: hotelId
 *         in: path
 *         required: true
 *         description: Hotel code returned in search results.
 *         schema:
 *           type: string
 *           example: "hsid4255550579-39676307"
 *       - name: searchId
 *         in: query
 *         required: true
 *         description: Active search session UUID.
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "c4a5cbda-1758-4fb3-8646-d93dfa020825"
 *     responses:
 *       200:
 *         description: Hotel details and room options retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/HotelDetailsResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       410:
 *        $ref: '#/components/responses/Gone'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  "/:hotelId",
  validator.validateHotelId(),
  validate,
  controller.getHotelDetails,
);

/**
 * @openapi
 * /api/v1/hotels/recheck:
 *   post:
 *     tags:
 *       - Hotels
 *     summary: Recheck room availability and lock rate (BlockRoom)
 *     description: >
 *       Mandatory price and cancellation policy revalidation step before creating a booking or initiating payment.
 *       Calls SRDV `/BlockRoom` API to confirm live rate availability and receive authoritative pricing.
 *       Returns a **single-use** `recheckId` token valid for **3 minutes (180 seconds)**.
 *       If `priceChanged` or `policyChanged` is `true`, the caller must re-confirm by sending `acceptChanges: true`
 *       in the subsequent `POST /hotels/bookings` request.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HotelRecheckRequest'
 *     responses:
 *       200:
 *         description: Room selection rechecked and rate locked successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/HotelRecheckResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       410:
 *         $ref: '#/components/responses/Gone'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  "/recheck",
  validator.validateRecheck(),
  validate,
  controller.recheck,
);

/**
 * @openapi
 * /api/v1/hotels/bookings:
 *   post:
 *     tags:
 *       - Hotels
 *     summary: Create a hotel booking
 *     description: >
 *       Atomically consumes the single-use `recheckId` token and initializes a local `HotelBooking`
 *       record in `AWAITING_PAYMENT` status. The booking record is persisted in a MongoDB transaction
 *       along with an audit event and an outbox event.
 *
 *
 *       **Payment Window**: After creation, the booking expires in 15 minutes
 *       (`expiresInSeconds` in the response). Payment must be initiated within this window.
 *
 *
 *       **Idempotency**: Sending an `Idempotency-Key` header is strongly recommended to prevent
 *       duplicate booking creation on network retries. Duplicate requests with the same key
 *       return the existing booking.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: Idempotency-Key
 *         in: header
 *         required: false
 *         description: Unique key (UUID recommended) to prevent duplicate booking requests on retries. Strongly recommended.
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HotelBookingCreateRequest'
 *     responses:
 *       201:
 *         description: Hotel booking created successfully and awaiting payment.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/HotelBookingResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       410:
 *        $ref: '#/components/responses/Gone'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  "/bookings",
  authenticate,
  idempotency,
  validator.validateCreateBooking(),
  validate,
  controller.createBooking,
);

/**
 * @openapi
 * /api/v1/hotels/bookings/me:
 *   get:
 *     tags:
 *       - Hotels
 *     summary: List authenticated user hotel bookings
 *     description: Retrieve paginated hotel booking history for the current authenticated user.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *     responses:
 *       200:
 *         description: User hotel bookings retrieved successfully.
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
 *                         $ref: '#/components/schemas/HotelBookingSummary'
 *                     meta:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  "/bookings/me",
  authenticate,
  validator.validateListBookings(),
  validate,
  controller.getMyBookings,
);

/**
 * @openapi
 * /api/v1/hotels/bookings/{id}:
 *   get:
 *     tags:
 *       - Hotels
 *     summary: Get hotel booking details by ID
 *     description: Retrieve full details of a specific hotel booking by its database ID.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Hotel booking document ID.
 *         schema:
 *           type: string
 *           example: "6a747b3f71465786694f90d7"
 *     responses:
 *       200:
 *         description: Hotel booking retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/HotelBookingResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  "/bookings/:id",
  authenticate,
  validator.validateBookingId(),
  validate,
  controller.getBooking,
);

/**
 * @openapi
 * /api/v1/hotels/bookings/{id}/cancel:
 *   post:
 *     tags:
 *       - Hotels
 *     summary: Cancel a confirmed hotel booking
 *     description: >
 *       Initiates cancellation for a confirmed hotel booking with the supplier (SRDV `/HotelCancel`).
 *       Calculates cancellation charges according to supplier cancellation policy rules.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Hotel booking document ID.
 *         schema:
 *           type: string
 *           example: "6a747b3f71465786694f90d7"
 *     responses:
 *       200:
 *         description: Hotel booking cancellation processed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/HotelCancelResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  "/bookings/:id/cancel",
  authenticate,
  validator.validateBookingId(),
  validate,
  controller.cancelBooking,
);

module.exports = router;
