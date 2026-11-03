const router = require('express').Router();
const  {
  searchFlights,
  getCalendarFare,
  getFareQuote,
  getSeatMap,
  getSSR,
  book,
  getCancellationCharges,
  sendChangeRequest,
  getCancelStatus,
  cancelBooking,
  getRefundDetails,
  getBooking,
  getMyBookings,
  handleFlightCallback,
} = require('./flight.controller');
const flightValidator = require('./flight.validator');
const validate = require('../../middleware/validate');
const { searchLimiter } = require('../../middleware/rateLimiter');
const { authenticate, optionalAuthenticate } = require('../../middleware/auth');
const invoiceController = require('../invoices/invoice.controller');

/**
 * @openapi
 * /api/v1/flights/search:
 *   post:
 *     tags:
 *       - Flights
 *     summary: Search available flights
 *     description: Searches flights based on the provided travel details.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - origin
 *               - destination
 *               - departureDate
 *             properties:
 *               origin:
 *                 type: string
 *                 description: IATA airport code of the departure airport.
 *                 example: DEL
 *               destination:
 *                 type: string
 *                 description: IATA airport code of the destination airport.
 *                 example: BOM
 *               departureDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-08-15"
 *               returnDate:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 example: "2026-08-20"
 *               passengers:
 *                 type: object
 *                 properties:
 *                   adults:
 *                     type: integer
 *                     minimum: 1
 *                     example: 1
 *                   children:
 *                     type: integer
 *                     minimum: 0
 *                     example: 0
 *                   infants:
 *                     type: integer
 *                     minimum: 0
 *                     example: 0
 *               journeyType:
 *                 type: string
 *                 enum:
 *                   - oneway
 *                   - roundtrip
 *                 default: oneway
 *                 example: oneway
 *     responses:
 *       200:
 *         description: Flights found successfully.
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
 *                   example: Flights found
 *                 data:
 *                   type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/search', searchLimiter, flightValidator.validateSearch(), validate, searchFlights);

/**
 * @openapi
 * /api/v1/flights/calendar-fare:
 *   post:
 *     tags: [Flights]
 *     summary: Get lowest calendar fare per day for a route
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - origin
 *               - destination
 *               - departDate
 *             properties:
 *               origin:
 *                 type: string
 *                 example: DEL
 *               destination:
 *                 type: string
 *                 example: BOM
 *               departDate:
 *                 type: string
 *                 example: "2026-08-01"
 *               returnDate:
 *                 type: string
 *                 nullable: true
 *                 example: null
 *               journeyType:
 *                 type: string
 *                 example: oneway
 *               fareType:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Calendar fare retrieved successfully.
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
 *                   example: Flights found
 *                 data:
 *                   type: object
 *                   properties:
 *                     traceId:
 *                       type: string
 *                       example: "1734567890123"
 *                     origin:
 *                       type: string
 *                       example: "DEL"
 *                     destination:
 *                       type: string
 *                       example: "BOM"
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           airlineCode:
 *                             type: string
 *                             example: "6E"
 *                           airlineName:
 *                             type: string
 *                             example: "IndiGo"
 *                           departureDate:
 *                             type: string
 *                             example: "2026-08-01T06:00:00"
 *                           isLowestFareOfMonth:
 *                             type: boolean
 *                             example: true
 *                           fare:
 *                             type: number
 *                             example: 4500
 *                           baseFare:
 *                             type: number
 *                             example: 3500
 *                           tax:
 *                             type: number
 *                             example: 1000
 *                           otherCharges:
 *                             type: number
 *                             example: 0
 *                           fuelSurcharge:
 *                             type: number
 *                             example: 0
 *                           totalAmount:
 *                             type: number
 *                             example: 4950
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *          $ref: '#/components/responses/InternalServerError' 
 */
router.post(['/calendar-fare', '/calendar-fares'], flightValidator.validateCalendarFare(), validate, getCalendarFare);

/**
 * @openapi
 * /api/v1/flights/farequote:
 *   post:
 *     tags: [Flights]
 *     summary: Get a fare quote for a flight with cached details and resultIndex from FE
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - traceId
 *               - resultIndex
 *             properties:
 *               traceId:
 *                 type: string
 *                 example: "1734567890123"
 *               resultIndex:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *                 example: "11-9273507496_0DELBOM9I11111~4825511490445912"
 *     responses:
 *       200:
 *         description: Fare quote or flight details returned successfully.
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
 *                   example: Flight details
 *                 data:
 *                   type: object
 *                   properties:
 *                     airline:
 *                       type: string
 *                       example: "IndiGo"
 *                     priceChanged:
 *                       type: boolean
 *                       example: false
 *                     isPriceChanged:
 *                       type: boolean
 *                       example: false
 *                     isTimeChanged:
 *                       type: boolean
 *                       example: false
 *                     confirmedFare:
 *                       type: array
 *                       items:
 *                         type: number
 *                       example: [4950]
 *                     newFare:
 *                       type: array
 *                       items:
 *                         type: object
 *                     isGstMandatory:
 *                       type: boolean
 *                       example: false
 *                     required:
 *                       type: object
 *                       properties:
 *                         passport:
 *                           type: boolean
 *                           example: false
 *                         passportFullDetail:
 *                           type: boolean
 *                           example: false
 *                         passportExpiry:
 *                           type: boolean
 *                           example: false
 *                         passportIssueDate:
 *                           type: boolean
 *                           example: false
 *                         adultDob:
 *                           type: boolean
 *                           example: false
 *                         childDob:
 *                           type: boolean
 *                           example: false
 *                         infantDob:
 *                           type: boolean
 *                           example: false
 *                         hold:
 *                           type: boolean
 *                           example: true
 *                         seatSelect:
 *                           type: boolean
 *                           example: true
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       410:
 *         $ref: '#/components/responses/Gone'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(['/farequote', '/fare-quote'], flightValidator.validateResultIndex(), validate,  getFareQuote);

/**
 * @openapi
 * /api/v1/flights/seatmap:
 *   post:
 *     tags: [Flights]
 *     summary: Get seat map details for a flight segment
 *     description: Returns the seat map configuration and availability for the specified resultIndex and traceId.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - traceId
 *               - resultIndex
 *             properties:
 *               traceId:
 *                 type: string
 *                 description: Unique identifier representing the search session.
 *                 example: "1734567890123"
 *               resultIndex:
 *                 type: string
 *                 description: The result index of the selected flight.
 *                 example: "11-9273507496_0DELBOM9I11111~4825511490445912"
 *     responses:
 *       200:
 *         description: Seat map details retrieved successfully.
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
 *                   example: Seat map details
 *                 data:
 *                   type: object
 *                   properties:
 *                     traceId:
 *                       type: string
 *                       example: "1734567890123"
 *                     srdvType:
 *                       type: string
 *                       example: "MixAPI"
 *                     resultIndex:
 *                       type: string
 *                       example: "11-9273507496_0DELBOM9I11111~4825511490445912"
 *                     segments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           fromAirportCode:
 *                             type: string
 *                           fromCity:
 *                             type: string
 *                           toAirportCode:
 *                             type: string
 *                           toCity:
 *                             type: string
 *                           airlineName:
 *                             type: string
 *                           airlineCode:
 *                             type: string
 *                           airlineNumber:
 *                             type: string
 *                           totalRow:
 *                             type: integer
 *                           totalColumn:
 *                             type: integer
 *                     seatLayout:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           rowNumber:
 *                             type: integer
 *                           seats:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 seatNumber:
 *                                   type: string
 *                                 isBooked:
 *                                   type: boolean
 *                                 isLegroom:
 *                                   type: boolean
 *                                 isAisle:
 *                                   type: boolean
 *                                 amount:
 *                                   type: number
 *                                 code:
 *                                   type: string
 *       400:
 *          $ref: '#/components/responses/BadRequest'
 *       500:
 *          $ref: '#/omponents/responses/InternalServerError'
 */
router.post(['/seatmap', '/seat-map'], flightValidator.validateResultIndex(), validate, getSeatMap);

/**
 * @openapi
 * /api/v1/flights/ssr:
 *   post:
 *     tags: [Flights]
 *     summary: Get Special Service Requests (SSR) like meals and baggage allowances
 *     description: Returns the available dynamic meals, standard meals, and excess baggage options for the specified resultIndex and traceId.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - traceId
 *               - resultIndex
 *             properties:
 *               traceId:
 *                 type: string
 *                 description: Unique identifier representing the search session.
 *                 example: "1734567890123"
 *               resultIndex:
 *                 type: string
 *                 description: The result index of the selected flight.
 *                 example: "11-9273507496_0DELBOM9I11111~4825511490445912"
 *     responses:
 *       200:
 *         description: SSR details retrieved successfully.
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
 *                   example: SSR details
 *                 data:
 *                   type: object
 *                   properties:
 *                     traceId:
 *                       type: string
 *                       example: "1734567890123"
 *                     srdvType:
 *                       type: string
 *                       example: "MixAPI"
 *                     resultIndex:
 *                       type: string
 *                       example: "11-9273507496_0DELBOM9I11111~4825511490445912"
 *                     baggage:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           airlineCode:
 *                             type: string
 *                           flightNumber:
 *                             type: string
 *                           wayType:
 *                             type: integer
 *                           code:
 *                             type: string
 *                           description:
 *                             type: string
 *                           weight:
 *                             type: string
 *                           currency:
 *                             type: string
 *                           price:
 *                             type: number
 *                           origin:
 *                             type: string
 *                           destination:
 *                             type: string
 *                     meals:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           airlineCode:
 *                             type: string
 *                           flightNumber:
 *                             type: string
 *                           wayType:
 *                             type: integer
 *                           code:
 *                             type: string
 *                           description:
 *                             type: string
 *                           airlineDescription:
 *                             type: string
 *                           quantity:
 *                             type: string
 *                           currency:
 *                             type: string
 *                           price:
 *                             type: number
 *                           origin:
 *                             type: string
 *                           destination:
 *                             type: string
 *                     standardMeals:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *          $ref: '#/components/responses/BadRequest'
 *       500:
 *          $ref: '#/components/responses/InternalServerError'
 */
router.post('/ssr', flightValidator.validateResultIndex(), validate, getSSR);

/**
 * @openapi
 * /api/v1/flights/book:
 *   post:
 *     tags: [Flights]
 *     summary: Book a selected flight
 *     description: Creates a flight booking after a fare quote has been accepted. Requires an authenticated user and a valid fare quote cache entry.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - traceId
 *               - resultIndex
 *               - passengers
 *             properties:
 *               traceId:
 *                 type: string
 *                 example: "1734567890123"
 *               resultIndex:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *                 example: "11-9273507496_0DELBOM9I11111~4825511490445912"
 *               passengers:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - isLeadPax
 *                   properties:
 *                     travellerId:
 *                       type: string
 *                       description: ID of an existing saved traveller. Use either travellerId or travellerDetails.
 *                       example: "64f0b5c2d2b6e3b4c5d6e7f8"
 *                     isLeadPax:
 *                       type: boolean
 *                       example: true
 *                     saveToProfile:
 *                       type: boolean
 *                       description: If true, saves the traveller details to the user profile (only when travellerDetails is used).
 *                       example: false
 *                     travellerDetails:
 *                       type: object
 *                       description: Complete passenger details. Use either travellerId or travellerDetails.
 *                       required:
 *                         - title
 *                         - firstName
 *                         - lastName
 *                         - passengerType
 *                         - gender
 *                         - dateOfBirth
 *                       properties:
 *                         title:
 *                           type: string
 *                           enum: [Mr, Mrs, Ms, Miss, Mstr]
 *                           example: "Mr"
 *                         firstName:
 *                           type: string
 *                           example: "Test"
 *                         lastName:
 *                           type: string
 *                           example: "Sharma"
 *                         passengerType:
 *                           type: string
 *                           enum: [Adult, Child, Infant]
 *                           example: "Adult"
 *                         gender:
 *                           type: string
 *                           enum: [Male, Female]
 *                           example: "Male"
 *                         dateOfBirth:
 *                           type: string
 *                           format: date
 *                           example: "1992-08-15"
 *                         email:
 *                           type: string
 *                           example: "rahul.sharma@example.com"
 *                         phone:
 *                           type: string
 *                           example: "9876543210"
 *                         cellCountryCode:
 *                           type: string
 *                           example: "+91"
 *                         addressLine1:
 *                           type: string
 *                           example: "Flat 402"
 *                         city:
 *                           type: string
 *                           example: "Mumbai"
 *                         countryCode:
 *                           type: string
 *                           example: "IN"
 *                         countryName:
 *                           type: string
 *                           example: "INDIA"
 *                         passportNo:
 *                           type: string
 *                           example: "J1234567"
 *                         passportExpiry:
 *                           type: string
 *                           format: date
 *                           example: "2032-12-31"
 *                         passportIssueDate:
 *                           type: string
 *                           format: date
 *                           example: "2022-01-15"
 *                         passportIssueCountryCode:
 *                           type: string
 *                           example: "IN"
 *                     meals:
 *                       type: array
 *                       description: Dynamic meal selections from the /ssr endpoint response.
 *                       items:
 *                         type: object
 *                     baggage:
 *                       type: array
 *                       description: Dynamic baggage selections from the /ssr endpoint response.
 *                       items:
 *                         type: object
 *                     seats:
 *                       type: array
 *                       description: Seat selections from the /seatmap endpoint response.
 *                       items:
 *                         type: object
 *               gstDetails:
 *                 type: object
 *                 nullable: true
 *                 properties:
 *                   gstNumber:
 *                     type: string
 *                     example: "22AAAAA0000A1Z5"
 *                   companyName:
 *                     type: string
 *                     example: "Example Pvt Ltd"
 *                   address:
 *                     type: string
 *                     example: "123 Main Street"
 *     responses:
 *       201:
 *         description: Booking initiated successfully and payment can proceed.
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
 *                   example: Booking initiated, proceed to payment
 *                 data:
 *                   type: object
 *       400:
 *          $ref: '#/components/responses/BadRequest' 
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *          $ref: '#/components/responses/NotFound'
 *       410:
 *         $ref: '#/components/responses/Unprocessable'
 *       500: 
 *          $ref: '#/components/responses/InternalServerError'
 */
router.post('/book', authenticate,flightValidator.validateBooking(), validate, book);

// Flight booking lookup and cancellation routes
router.get('/bookings', authenticate, getMyBookings);
router.get('/bookings/:bookingId', optionalAuthenticate, getBooking);
router.get('/bookings/:bookingId/invoice', optionalAuthenticate, invoiceController.getInvoiceData);
router.get('/bookings/:bookingId/invoice/html', optionalAuthenticate, invoiceController.getInvoiceHtml);
router.get('/bookings/:bookingId/invoice/download', optionalAuthenticate, invoiceController.downloadInvoice);


/**
 * @openapi
 * /api/v1/flights/bookings/{bookingId}/cancellation-charges:
 *   get:
 *     tags: [Flights]
 *     summary: Preview flight cancellation charges and net refund amount
 *     description: Queries SRDV GetCancellationCharges to calculate airline cancellation penalties, retained agency markup, and estimated customer refund before executing cancellation.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Flight booking ID (MongoDB ObjectId).
 *       - in: query
 *         name: requestType
 *         schema:
 *           type: integer
 *           enum: [1, 2]
 *           default: 1
 *         description: "1 = FullCancellation, 2 = PartialCancellation"
 *     responses:
 *       200:
 *         description: Cancellation penalty breakdown and estimated refund.
 *       400:
 *         description: Invalid booking status or missing TraceId.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Unauthorized to access this booking.
 *       404:
 *         description: Booking not found.
 */
router.get('/bookings/:bookingId/cancellation-charges', authenticate, getCancellationCharges);
router.post('/bookings/:bookingId/cancellation-charges', authenticate, getCancellationCharges);

/**
 * @openapi
 * /api/v1/flights/bookings/{bookingId}/change-request:
 *   post:
 *     tags: [Flights]
 *     summary: Submit change / cancellation request to SRDV
 *     description: Submits a per-passenger change/cancellation request to SRDV and returns the ChangeRequestId ticket from the airline.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Flight booking ID (MongoDB ObjectId).
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               requestType:
 *                 type: string
 *                 enum: ["0", "1", "2"]
 *                 default: "1"
 *                 description: "0 = NotSet, 1 = FullCancellation, 2 = PartialCancellation"
 *               cancellationType:
 *                 type: string
 *                 enum: ["0", "1", "2", "3"]
 *                 default: "3"
 *                 description: "0 = NotSet, 1 = NoShow, 2 = FlightCancelled, 3 = Others"
 *               remarks:
 *                 type: string
 *                 example: "Customer voluntary cancellation"
 *               paxIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional specific traveller IDs for partial passenger cancellation
 *     responses:
 *       200:
 *         description: Change request successfully submitted to SRDV and airline.
 *       400:
 *         description: Invalid request or supplier error.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Unauthorized.
 *       404:
 *         description: Booking not found.
 */
router.post('/bookings/:bookingId/change-request', authenticate, sendChangeRequest);

/**
 * @openapi
 * /api/v1/flights/bookings/{bookingId}/cancel-status:
 *   get:
 *     tags: [Flights]
 *     summary: Check cancellation and refund status for a flight booking
 *     description: Queries SRDV GetCancelStatus for all change requests under a flight booking, updates DB records, and returns supplier processing status and refunded amounts.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Flight booking ID (MongoDB ObjectId).
 *     responses:
 *       200:
 *         description: Latest cancellation and refund status from SRDV and airline.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Unauthorized.
 *       404:
 *         description: Booking or refund record not found.
 */
router.get('/bookings/:bookingId/cancel-status', authenticate, getCancelStatus);

/**
 * @openapi
 * /api/v1/flights/change-requests/{changeRequestId}/status:
 *   get:
 *     tags: [Flights]
 *     summary: Check cancellation status for a specific SRDV ChangeRequestId
 *     description: Direct lookup of SRDV GetCancelStatus by ChangeRequestId.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: changeRequestId
 *         required: true
 *         schema:
 *           type: string
 *         description: SRDV ChangeRequestId (e.g. CR123456).
 *     responses:
 *       200:
 *         description: Change request details and current status.
 *       401:
 *         description: Authentication required.
 */
router.get('/change-requests/:changeRequestId/status', authenticate, getCancelStatus);

router.post('/bookings/:bookingId/cancel', authenticate, cancelBooking);
router.get('/bookings/:bookingId/refund', authenticate, getRefundDetails);

/**
 * @openapi
 * /api/v1/flights/callback:
 *   post:
 *     tags: [Flights]
 *     summary: SRDV flight booking status callback webhook
 *     description: Inbound webhook triggered by SRDV when a booking status resolves (Success, Failed, Aborted). Verifies credentials, updates PNR and passenger tickets on Success, and triggers 100% full refund on Failed/Aborted.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ClientId
 *               - UserName
 *               - Password
 *               - EndUserIp
 *               - TraceId
 *               - BookingId
 *               - PNR
 *               - Status
 *               - Passengers
 *             properties:
 *               ClientId:
 *                 type: integer
 *                 example: 12345
 *               UserName:
 *                 type: string
 *                 example: "agency_user"
 *               Password:
 *                 type: string
 *                 example: "agency_pass"
 *               EndUserIp:
 *                 type: string
 *                 example: "127.0.0.1"
 *               TraceId:
 *                 type: string
 *                 example: "TRACE123456"
 *               BookingId:
 *                 type: string
 *                 example: "987654"
 *               PNR:
 *                 type: string
 *                 example: "6E7890"
 *               GdsPNR:
 *                 type: string
 *                 example: "GDS123"
 *               Status:
 *                 type: string
 *                 enum: [Success, Failed, Aborted]
 *                 example: "Success"
 *               Remark:
 *                 type: string
 *                 example: "Ticketed successfully"
 *               Passengers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - Title
 *                     - FirstName
 *                     - LastName
 *                   properties:
 *                     Title:
 *                       type: string
 *                       example: "Mr"
 *                     FirstName:
 *                       type: string
 *                       example: "Vikram"
 *                     LastName:
 *                       type: string
 *                       example: "Malhotra"
 *                     TicketNumber:
 *                       type: string
 *                       example: "6E-902148"
 *     responses:
 *       200:
 *         description: Callback processing response (SRDV error envelope format)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 Error:
 *                   type: object
 *                   properties:
 *                     ErrorCode:
 *                       type: integer
 *                       example: 0
 *                     ErrorMessage:
 *                       type: string
 *                       example: ""
 */
router.post('/callback', handleFlightCallback);

module.exports = router;

