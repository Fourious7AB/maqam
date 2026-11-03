const {
  searchFlightsService,
  getFareQuoteService,
  getCachedSearchEntryService,
  bookFlightService,
  getSeatMapService,
  getSsrService,
  getCalenderFareService,
  getCancellationChargesService,
  sendFlightChangeRequestService,
  getCancelStatusService,
  cancelFlightBookingService,
  getFlightRefundService,
  getFlightBookingByIdService,
  getUserFlightBookingsService,
  processFlightCallbackService,
} = require("./flight.service");
const { sendSuccess, sendCreated, sendNotFound } = require("../../utils/apiResponse");
const logger = require("../../utils/logger");

const searchFlights = async (req, res, next) => {
  try {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers,
      journeyType,
      //flightCabin is hardcoded for now, can be added later if needed
    } = req.body;

    const results = await searchFlightsService({
      origin,
      destination,
      departDate: departureDate,
      returnDate,
      passengers,
      journeyType: journeyType || "oneway", // oneway, roundtrip
    });

    return sendSuccess(res, {
      message: "Flights found",
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

const getCalendarFare = async (req, res, next) => {
  try {
    const { origin, destination, departDate, returnDate,  journeyType, fareType } = req.body;
    const results = await getCalenderFareService({
      origin,
      destination,
      departDate,
      returnDate,
      journeyType,
      fareType,
    });
    return sendSuccess(res, {
      message: "Flights found",
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

const getFareQuote = async (req, res, next) => {
  try {
    const { traceId, resultIndex } = req.body;

    console.log(`calling fare qoute service for traceId: ${traceId}, resultIndex: ${resultIndex}\n`);//logging for testing

    const flight = await getFareQuoteService(traceId, resultIndex);

    if (!flight) {
      return sendNotFound(res, "Flight not found");
    }

    return sendSuccess(res, { message: "Flight details", data: flight });
  } catch (error) {
    next(error);
  }
};

const getSeatMap = async (req, res, next) => {
  try {
    const { traceId, resultIndex } = req.body;

    const seatMap = await getSeatMapService(traceId, resultIndex);

    return sendSuccess(res, { message: "Seat map details", data: seatMap });
  } catch (error) {
    logger.warn(`getSeatMap controller error: ${error.message}`);
    return sendSuccess(res, {
      message: "Seat map details",
      data: {
        traceId: req.body?.traceId || "",
        resultIndex: req.body?.resultIndex || "",
        segments: [],
        seatLayout: [],
        isAvailable: false,
        message: error.message || "Seat map not available for this flight",
      },
    });
  }
};

const getSSR = async (req, res, next) => {
  try {
    const { traceId, resultIndex } = req.body;

    console.log(`calling SSR service for traceId: ${traceId}, resultIndex: ${resultIndex}\n`);

    const ssr = await getSsrService(traceId, resultIndex);

    return sendSuccess(res, { message: "SSR details", data: ssr });
  } catch (error) {
    logger.warn(`getSSR controller error: ${error.message}`);
    return sendSuccess(res, {
      message: "SSR details",
      data: {
        traceId: req.body?.traceId || "",
        resultIndex: req.body?.resultIndex || "",
        baggage: [],
        meals: [],
        standardMeals: [],
        isAvailable: false,
        message: error.message || "SSR not available for this flight",
      },
    });
  }
};

const book = async (req, res, next) => {
  try {
    const { traceId, resultIndex, passengers, gstDetails } = req.body;
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return sendNotFound(res, "Authenticated user is required");
    }

    logger.info(
      `[Flight Book] Initiating booking request for user=${userId}, traceId=${traceId}, resultIndex=${resultIndex}, passengers=${passengers?.length || 0}`
    );

    const result = await bookFlightService({
      userId,
      traceId,
      resultIndex,
      passengers,
      gstDetails,
    });

    return sendCreated(res, result, "Booking initiated, proceed to payment");
  } catch (error) {
    next(error);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { reason, penaltyAmount, idempotencyKey } = req.body;
    const userId = req.user?.id || req.user?._id;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    const endUserIp = req.ip || req.connection?.remoteAddress;

    const result = await cancelFlightBookingService({
      bookingId,
      userId,
      reason,
      penaltyAmount,
      idempotencyKey,
      isAdmin,
      endUserIp,
    });

    return sendSuccess(res, {
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const sendChangeRequest = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { requestType, cancellationType, remarks, paxIds } = req.body;
    const userId = req.user?.id || req.user?._id;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    const endUserIp = req.ip || req.connection?.remoteAddress;

    const result = await sendFlightChangeRequestService({
      bookingId,
      requestType: requestType || "1",
      cancellationType: cancellationType || "3",
      remarks,
      paxIds: paxIds || [],
      userId,
      isAdmin,
      endUserIp,
    });

    return sendSuccess(res, {
      message: "Change request submitted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getCancelStatus = async (req, res, next) => {
  try {
    const { bookingId, changeRequestId } = req.params;
    const userId = req.user?.id || req.user?._id;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    const endUserIp = req.ip || req.connection?.remoteAddress;

    const result = await getCancelStatusService({
      bookingId,
      changeRequestId,
      userId,
      isAdmin,
      endUserIp,
    });

    return sendSuccess(res, {
      message: "Cancellation status retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getRefundDetails = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user?.id || req.user?._id;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';

    const refund = await getFlightRefundService(bookingId, userId, isAdmin);

    return sendSuccess(res, {
      message: "Flight refund details retrieved",
      data: refund,
    });
  } catch (error) {
    next(error);
  }
};

const getBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.bookingId || req.params.id;
    const userId = req.user?.id || req.user?._id;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';

    const booking = await getFlightBookingByIdService(bookingId, userId, isAdmin);

    return sendSuccess(res, {
      message: "Flight booking details retrieved",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

const getMyBookings = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { page, limit, status } = req.query;

    const result = await getUserFlightBookingsService({
      userId,
      page,
      limit,
      status,
    });

    return sendSuccess(res, {
      message: "User flight bookings retrieved",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const handleFlightCallback = async (req, res, next) => {
  try {
    const callbackPayload = req.body;
    logger.info(`[Flight Callback Controller] Inbound callback received for BookingId: ${callbackPayload?.BookingId}, Status: ${callbackPayload?.Status}`);

    const result = await processFlightCallbackService(callbackPayload);

    // SRDV callback protocol always returns HTTP 200 with { Error: { ErrorCode, ErrorMessage } }
    return res.status(200).json({
      Error: result.error || { ErrorCode: 0, ErrorMessage: "" },
    });
  } catch (error) {
    logger.error(`[Flight Callback Controller] Error: ${error.message}`);
    return res.status(200).json({
      Error: {
        ErrorCode: 4,
        ErrorMessage: error.message || "Internal error during callback processing",
      },
    });
  }
};

const getCancellationCharges = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const requestType = req.query.requestType || req.body?.requestType || 1;
    const userId = req.user?.id || req.user?._id;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    const endUserIp = req.ip || req.connection?.remoteAddress;

    const result = await getCancellationChargesService({
      bookingId,
      requestType: Number(requestType) || 1,
      userId,
      isAdmin,
      endUserIp,
    });

    return sendSuccess(res, {
      message: "Cancellation charges retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
