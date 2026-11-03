const srdvClient = require("./srdv.client");
const logger = require("../../utils/logger");
const { AppError } = require("../../middleware/errorHandler");

// const searchHotels = async ({
//   origin,
//   destination,
//   checkIn,
//   checkOut,
//   guests,
//   page,
//   limit,
// }) => {
//   try {
//     const rawResults = await srdvClient.searchHotels({
//       origin,
//       destination,
//       checkIn,
//       checkOut,
//       guests,
//     });

//     return {
//       hotels: rawResults.data || [],
//       total: rawResults.total || 0,
//       page: parseInt(page),
//       limit: parseInt(limit),
//     };
//   } catch (error) {
//     logger.error(`SRDV adapter search hotels failed: ${error.message}`);
//     throw error;
//   }
// };



const coerceFare = (fare = {}) => ({
  baseFare: parseFloat(fare.BaseFare) || 0,
  tax: parseFloat(fare.Tax) || 0,
  yqTax: parseFloat(fare.YQTax) || 0, // can arrive as ""
  transactionFee: parseFloat(fare.TransactionFee) || 0, // can arrive as "0" string
  offeredFare: parseFloat(fare.OfferedFare) || 0,
});

// IsGSTMandatory / GSTAllowed can be true/false OR the string "Not Set"
const coerceTriState = (value) => {
  if (value === "Not Set" || value === undefined || value === null) return null;
  return value === true || value === "true";
};

function normalizeFlightOption(fareData, legs) {
  const fare = coerceFare(fareData.Fare);
  const firstSeg = fareData.FareSegments?.[0] || {};

  return {
    resultIndex: fareData.ResultIndex,
    srdvIndex: fareData.SrdvIndex,
    isLCC: !!fareData.IsLCC,//for testing 
    singleSlotBooking: fareData.SingleSlotBooking,

    // ⚠️ Not present on the sample FareDataMultiple in the reference doc.
    // flight-booking-flow.md's cache shape needs these for FareQuote branching (§3) —
    // keeping the read here so nothing downstream breaks, but VERIFY actual field
    // names in a real search response before relying on either.
    fareType: fareData.FareType ?? null,
    returnIdentifierMatched:
      fareData.ReturnIdentifier ?? fareData.ReturnIdentifierMatched ?? null,

    isRefundable: !!fareData.IsRefundable,
    isGstMandatory: coerceTriState(fareData.IsGSTMandatory),
    offeredFare: fare.offeredFare || parseFloat(fareData.OfferedFare) || 0,
    baseFare: fare.baseFare,
    tax: fare.tax,

    segments: (legs || []).map((seg) => ({
      airline: seg.Airline?.AirlineName,
      airlineCode: seg.Airline?.AirlineCode,
      flightNo: seg.Airline?.FlightNumber,
      origin: seg.Origin?.CityName,
      originCode: seg.Origin?.AirportCode,
      destination: seg.Destination?.CityName,
      destinationCode: seg.Destination?.AirportCode,
      departure: seg.DepTime,
      arrival: seg.ArrTime,
      duration: seg.Duration,
      baggage: firstSeg.Baggage,
      cabinClass: firstSeg.CabinClassName,
      seatsLeft: firstSeg.NoOfSeatAvailable,
    })),
  };
}

// One "option" = { FareDataMultiple: [...], Segments: [...] }.
// Assumption (unverified — only single-fare example in the doc): FareDataMultiple[i]
// pairs with Segments[i] at the same index. Falls back to Segments[0] if a parallel
// entry doesn't exist, so it won't throw on single-fare options — but confirm this
// pairing against a real multi-fare response before trusting it for SingleSlotBooking
// combos.
function normalizeResultsGroup(group = []) {
  const options = [];
  group.forEach((option) => {
    const fareDataList = option.FareDataMultiple || [];
    const segmentGroups = option.Segments || [];
    fareDataList.forEach((fareData, idx) => {
      const legs = segmentGroups[idx] || segmentGroups[0] || [];
      options.push(normalizeFlightOption(fareData, legs));
    });
  });
  return options;
}

const SRDV_ERROR_HINTS = {
  "2": "Duplicate Booking — An identical itinerary or previous booking already exists with the supplier.",
  "900": "IP not whitelisted in SRDV DSA Portal (Security -> IP Whitelist).",
  "998": "API not activated by SRDV Support for this account.",
  "999": "Invalid Api-Token or ClientId.",
  "1005": "Forbidden — Outbound public IP is not in SRDV whitelist (Security -> IP Whitelist in DSA Portal).",
  "1100": "Invalid request payload format.",
  "2008": "Invalid API Token.",
};

function formatSrdvError(errObj, defaultMsg = "SRDV error") {
  if (!errObj) return defaultMsg;
  const code = String(errObj.ErrorCode ?? "");
  const msg = errObj.ErrorMessage || defaultMsg;
  const hint = SRDV_ERROR_HINTS[code];
  return hint ? `SRDV [${code}]: ${msg} — ${hint}` : `SRDV [${code}]: ${msg}`;
}

function checkAndThrowSrdvError(errObj, defaultMsg = "SRDV error") {
  if (!errObj) return;
  const code = errObj.ErrorCode !== undefined && errObj.ErrorCode !== null ? String(errObj.ErrorCode) : null;
  if (code && code !== "0") {
    throw new AppError(formatSrdvError(errObj, defaultMsg), 502, {
      srdvErrorCode: code,
      rawError: errObj,
    });
  }
}

function normalizeSearchResponse(raw) {
  checkAndThrowSrdvError(raw?.Error, "SRDV search error");

  const outboundGroup = raw.Results?.[0];
  const inboundGroup = raw.Results?.[1];

  return {
    traceId: String(raw.TraceId),
    srdvType: raw.SrdvType,
    outbound: normalizeResultsGroup(outboundGroup),
    inbound: inboundGroup ? normalizeResultsGroup(inboundGroup) : undefined,
  };
}

const searchFlightsAdapter = async ({
  origin,
  destination,
  departDate,
  returnDate,
  passengers,
  journeyType,
}) => {
  try {
    const rawResults = await srdvClient.searchFlights({
      origin,
      destination,
      departDate,
      returnDate,
      passengers,
      journeyType,
    });

    return normalizeSearchResponse(rawResults);
  } catch (error) {
    logger.error(`SRDV adapter search flights failed: ${error.message}`);
    throw error;
  }
};

// ----------------FARE QUOTE------------------------

function normalizeFareQuoteResponse(raw) {
  checkAndThrowSrdvError(raw?.Error, "SRDV fare quote error");

  const results = raw.Results || {};

  // ⚠️ IsTimeChanged: flight-booking-flow.md §3 lists it alongside IsPriceChanged as a
  // top-level field, but no FareQuote sample in srdv-flights-api-reference.md actually
  // shows it anywhere (top-level or under Results). Reading defensively from both
  // spots, defaulting false — CONFIRM against a live response before trusting this for
  // the "stop, don't book" gate.
  const isPriceChanged = !!(raw.IsPriceChanged ?? results.IsPriceChanged);
  const isTimeChanged = !!(raw.IsTimeChanged ?? results.IsTimeChanged);

  return {
    traceId: String(raw.TraceId),
    srdvType: raw.SrdvType,
    isPriceChanged,
    isTimeChanged,

    srdvIndex: results.SrdvIndex,
    resultIndex: results.ResultIndex,
    isLCC: !!results.IsLCC,
    isRefundable: !!results.IsRefundable,
    isGstMandatory: coerceTriState(results.IsGSTMandatory),
    // FareQuote Segments are nested: Segments[legIndex][segIndex].Airline
    airline: results.Segments?.[0]?.[0]?.Airline?.AirlineName || results.AirlineCode || null,
    // paxCount:{
      
    // }
    required: {
      passport: !!results.IsPassportRequiredAtBook,
      passportFullDetail: !!results.IsPassportFullDetailRequiredAtBook,
      passportExpiry: !!results.IsPassportExpiryRequired,
      passportIssueDate: !!results.IsPassportIssueDateRequired,
      adultDob: !!results.AdultDobRequired,
      childDob: !!results.ChildDobRequired,
      infantDob: !!results.InfantDobRequired,
      hold: !!results.HoldAllowed,
      seatSelect: !!results.SeatSelectAllowed,
    },

    // Passed through AS-IS, not re-keyed — both docs require this exact object to be
    // echoed verbatim into Book's Passengers[].Fare. Re-shaping it here would break that.
    fare: results.Fare || {},
  };
}

const fareQuoteAdapter = async ({
  srdvType,
  traceId,
  srdvIndex,
  resultIndex,
}) => {
  try {
    const raw = await srdvClient.fareQuote({
      srdvType,
      traceId,
      srdvIndex,
      resultIndex,
    });
    return normalizeFareQuoteResponse(raw);
  } catch (error) {
    logger.error(`SRDV adapter fare quote failed: ${error.message}`);
    throw error;
  }
};

//----------------TICKET LCC------------------------

function normalizeTicketLCCResponse(raw) {
  checkAndThrowSrdvError(raw?.Error, "SRDV ticket (LCC) error");

  const response = raw.Response || {};
  const itinerary = response.FlightItinerary || {};

  return {
    traceId: String(raw.TraceId),
    srdvType: raw.SrdvType,
    pnr: response.PNR,
    srdvBookingId: response.BookingId,

    // Price/time changed here does NOT mean stop — LCC has no hold step, the ticket
    // is already real. Per flight-booking-flow.md §4: "log + flag only."
    isPriceChanged: !!response.IsPriceChanged,
    isTimeChanged: !!response.IsTimeChanged,

    ticketStatus: response.TicketStatus,
    invoiceNo: itinerary.InvoiceNo || "",
    invoiceStatus: itinerary.InvoiceStatus || "",

    // Ticket fields legitimately empty here (TicketNumber/IssueDate) — TicketLCC's sync
    // response doesn't carry them. flight_callback fills these in later, matched by name.
    passengers: (itinerary.Passenger || []).map((p) => ({
      title: p.Title,
      firstName: p.FirstName,
      lastName: p.LastName,
      paxType: p.PaxType,
      ticketNumber: p.Ticket?.TicketNumber || "",
      ticketId: p.Ticket?.TicketId || "",
      ticketIssueDate: p.Ticket?.IssueDate || "",
      ticketStatus: p.Ticket?.Status || "",
    })),

    eTicketData: itinerary,
    status: "confirmed",
  };
}

const ticketLCCAdapter = async ({
  srdvType,
  traceId,
  srdvIndex,
  resultIndex,
  travellers,
  fareData,
  gstData,
  ancillaries,
}) => {
  try {
    const raw = await srdvClient.ticketLCC({
      srdvType,
      traceId,
      srdvIndex,
      resultIndex,
      travellers,
      fareData,
      gstData,
      ancillaries,
    });

    console.log(`\n\n\nHi here is your res from SRDV ticketLLC:${JSON.stringify(raw)} `) //logging for tesrt
    
    return normalizeTicketLCCResponse(raw);
  } catch (error) {
    logger.error(`SRDV adapter ticket LCC failed: ${error.message}`);
    throw error;
  }
};

//-----------------TICKET GDS------------------------
function normalizeHoldGdsResponse(raw) {
  checkAndThrowSrdvError(raw?.Error, "SRDV hold GDS error");

  const response = raw.Response || {};
  const itinerary = response.FlightItinerary || {};

  return {
    traceId: String(raw.TraceId),
    srdvType: raw.SrdvType,
    pnr: response.PNR,
    srdvBookingId: response.BookingId,
    isPriceChanged: !!response.IsPriceChanged,
    isTimeChanged: !!response.IsTimeChanged,
    ssrDenied: !!response.SSRDenied,

    // ⚠️ CRITICAL per both docs — deadline TicketGDS must beat after payment
    lastTicketDate: itinerary.LastTicketDate || null,

    eTicketData: itinerary,
    status: "pending", // not confirmed — awaiting payment + TicketGDS
  };
}

const holdGDSAdapter = async ({
  srdvType,
  traceId,
  srdvIndex,
  resultIndex,
  travellers,
  fareData,
  gstData,
}) => {
  try {
    const raw = await srdvClient.holdGDS({
      srdvType,
      traceId,
      srdvIndex,
      resultIndex,
      travellers,
      fareData,
      gstData,
    });
    return normalizeHoldGdsResponse(raw);
  } catch (error) {
    logger.error(`SRDV adapter hold GDS failed: ${error.message}`);
    throw error;
  }
};

function normalizeTicketGdsResponse(raw) {
  checkAndThrowSrdvError(raw?.Error, "SRDV ticket GDS error");

  const response = raw.Response || {};
  const itinerary = response.FlightItinerary || {};

  return {
    traceId: String(raw.TraceId),
    pnr: response.PNR,
    srdvBookingId: response.BookingId,
    ticketStatus: response.TicketStatus,
    invoiceNo: itinerary.InvoiceNo || "",
    invoiceStatus: itinerary.InvoiceStatus,

    passengers: (itinerary.Passenger || []).map((p) => ({
      title: p.Title,
      firstName: p.FirstName,
      lastName: p.LastName,
      ticketId: p.Ticket?.TicketId,
      ticketNumber: p.Ticket?.TicketNumber || "",
      ticketIssueDate: p.Ticket?.IssueDate || "",
      ticketStatus: p.Ticket?.Status || "",
    })),

    eTicketData: itinerary,
    status: "confirmed",
  };
}

const ticketGDSAdapter = async ({
  srdvType,
  traceId,
  srdvIndex,
  resultIndex,
  pnr,
  bookingId,
}) => {
  try {
    const raw = await srdvClient.ticketGDS({
      srdvType,
      traceId,
      srdvIndex,
      resultIndex,
      pnr,
      bookingId,
    });
    return normalizeTicketGdsResponse(raw);
  } catch (error) {
    logger.error(`SRDV adapter ticket GDS failed: ${error.message}`);
    throw error;
  }
};

function normalizeSeatMapResponse(raw) {
  const errCode = raw?.Error?.ErrorCode;
  if (errCode !== undefined && errCode !== null && String(errCode) !== "0") {
    logger.warn(`SRDV seat map supplier notice [${errCode}]: ${raw?.Error?.ErrorMessage || "Unavailable"}`);
    return {
      traceId: String(raw?.TraceId || ""),
      srdvType: raw?.SrdvType,
      resultIndex: raw?.ResultIndex,
      segments: [],
      seatLayout: [],
      isAvailable: false,
      message: raw?.Error?.ErrorMessage || "Seat map not available for this flight",
    };
  }
  checkAndThrowSrdvError(raw?.Error, "SRDV seat map error");

  const results = raw.Results || raw.Response?.Results || raw.Response?.FlightItinerary || [];
  const rawSeats =
    raw.Seats ||
    raw.Response?.Seats ||
    raw.SeatLayout ||
    raw.Response?.SeatLayout ||
    (Array.isArray(results) ? results[0]?.Seats || results[0]?.SeatLayout : null) ||
    {};

  const rows = [];
  const rowKeys = Object.keys(rawSeats).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, "")) || 0;
    const numB = parseInt(b.replace(/\D/g, "")) || 0;
    return numA - numB;
  });

  for (const rowKey of rowKeys) {
    const rowNum = parseInt(rowKey.replace(/\D/g, "")) || 0;
    const columnsObj = rawSeats[rowKey] || {};
    
    const colKeys = Object.keys(columnsObj).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, "")) || 0;
      const numB = parseInt(b.replace(/\D/g, "")) || 0;
      return numA - numB;
    });

    const firstSeg = Array.isArray(results) ? results[0] : (results || {});
    const columns = colKeys.map(colKey => {
      const seat = columnsObj[colKey] || {};
      return {
        seatNumber: seat.SeatNumber || "",
        isBooked: !!seat.IsBooked,
        isLegroom: !!seat.IsLegroom,
        isAisle: !!seat.IsAisle,
        amount: parseFloat(seat.Amount) || 0,
        code: seat.Code || "",
        airlineCode: seat.AirlineCode || firstSeg?.AirlineCode || "",
        flightNumber: seat.FlightNumber || firstSeg?.AirlineNumber || firstSeg?.FlightNumber || "",
        origin: seat.Origin || firstSeg?.FromAirportCode || "",
        destination: seat.Destination || firstSeg?.ToAirportCode || "",
      };
    });

    rows.push({
      rowNumber: rowNum,
      seats: columns,
    });
  }

  return {
    traceId: String(raw.TraceId),
    srdvType: raw.SrdvType,
    resultIndex: raw.ResultIndex,
    segments: results.map(res => ({
      fromAirportCode: res.FromAirportCode,
      fromCity: res.FromCity,
      toAirportCode: res.ToAirportCode,
      toCity: res.ToCity,
      airlineName: res.AirlineName,
      airlineCode: res.AirlineCode,
      airlineNumber: res.AirlineNumber ?? res.FlightNumber,
      totalRow: parseInt(res.TotalRow) || 0,
      totalColumn: parseInt(res.TotalColumn) || 0,
    })),
    seatLayout: rows,
  };
}

const seatMapAdapter = async ({
  srdvType,
  traceId,
  srdvIndex,
  resultIndex,
}) => {
  try {
    const raw = await srdvClient.seatMap({
      srdvType,
      traceId,
      srdvIndex,
      resultIndex,
    });
    return normalizeSeatMapResponse(raw);
  } catch (error) {
    logger.warn(`SRDV adapter seat map notice: ${error.message}`);
    return {
      traceId: String(traceId || ""),
      srdvType,
      resultIndex,
      segments: [],
      seatLayout: [],
      isAvailable: false,
      message: error.message || "Seat map not available for this flight",
    };
  }
};

function normalizeSsrResponse(raw) {
  const errCode = raw?.Error?.ErrorCode;
  if (errCode !== undefined && errCode !== null && String(errCode) !== "0") {
    logger.warn(`SRDV SSR supplier notice [${errCode}]: ${raw?.Error?.ErrorMessage || "Unavailable"}`);
    return {
      traceId: String(raw?.TraceId || ""),
      srdvType: raw?.SrdvType,
      resultIndex: raw?.ResultIndex,
      baggage: [],
      meals: [],
      standardMeals: [],
      isAvailable: false,
      message: raw?.Error?.ErrorMessage || "SSR not available for this flight",
    };
  }
  checkAndThrowSrdvError(raw?.Error, "SRDV SSR error");

  const baggage = raw.Baggage || [];
  const mealDynamic = raw.MealDynamic || [];
  const meal = raw.Meal || [];

  return {
    traceId: String(raw.TraceId),
    srdvType: raw.SrdvType,
    resultIndex: raw.ResultIndex,
    baggage: baggage.map(b => ({
      airlineCode: b.AirlineCode || "",
      flightNumber: b.FlightNumber || "",
      wayType: parseInt(b.WayType) || 1,
      code: b.Code || "",
      description: b.Description || "",
      weight: b.Weight || "",
      currency: b.Currency || "INR",
      price: parseFloat(b.Price) || 0,
      origin: b.Origin || "",
      destination: b.Destination || "",
    })),
    meals: mealDynamic.map(m => ({
      airlineCode: m.AirlineCode || "",
      flightNumber: m.FlightNumber || "",
      wayType: parseInt(m.WayType) || 1,
      code: m.Code || "",
      description: m.Description || "",
      airlineDescription: m.AirlineDescription || "",
      quantity: String(m.Quantity || "1"),
      currency: m.Currency || "INR",
      price: parseFloat(m.Price) || 0,
      origin: m.Origin || "",
      destination: m.Destination || "",
    })),
    standardMeals: Array.isArray(meal) ? meal : [],
  };
}

const ssrAdapter = async ({
  srdvType,
  traceId,
  srdvIndex,
  resultIndex,
}) => {
  try {
    const raw = await srdvClient.ssr({
      srdvType,
      traceId,
      srdvIndex,
      resultIndex,
    });
    return normalizeSsrResponse(raw);
  } catch (error) {
    logger.warn(`SRDV adapter SSR notice: ${error.message}`);
    return {
      traceId: String(traceId || ""),
      srdvType,
      resultIndex,
      baggage: [],
      meals: [],
      standardMeals: [],
      isAvailable: false,
      message: error.message || "SSR not available for this flight",
    };
  }
};

function normalizeCalendarFareResponse(raw) {
  checkAndThrowSrdvError(raw?.Error, "SRDV calendar fare error");

  const results = (raw.Results || []).map((r) => ({
    airlineCode: r.AirlineCode,
    airlineName: r.AirlineName,
    departureDate: r.DepartureDate,
    isLowestFareOfMonth: !!r.IsLowestFareOfMonth,
    fare: r.Fare,
    baseFare: r.BaseFare,
    tax: r.Tax,
    otherCharges: r.OtherCharges,
    fuelSurcharge: r.FuelSurcharge,
  }));

  return {
    traceId: String(raw.TraceId || ""),
    srdvType: raw.SrdvType,
    origin: raw.Origin,
    destination: raw.Destination,
    results,
  };
}

const getCalendarFareAdapter = async ({
  origin,
  destination,
  departDate,
  returnDate,
  journeyType,
  fareType,
  sources,
}) => {
  try {
    const rawResults = await srdvClient.getCalendarFare({
      origin,
      destination,
      departDate,
      returnDate,
      journeyType,
      fareType,
      sources,
    });
    return normalizeCalendarFareResponse(rawResults);
  } catch (error) {
    logger.error(`SRDV adapter get calendar fare failed: ${error.message}`);
    throw error;
  }
};

const getCancellationChargesAdapter = async ({
  requestType = 1,
  traceId,
  endUserIp,
}) => {
  try {
    const raw = await srdvClient.getCancellationCharges({
      requestType,
      traceId,
      endUserIp,
    });

    checkAndThrowSrdvError(raw?.Error, "Failed to fetch cancellation charges from SRDV");

    const results = raw?.Result || [];
    const firstResult = Array.isArray(results) ? results[0] : (results || {});

    const segments = (firstResult?.Segments || []).map((seg) => ({
      fromAirport: seg.FromAirport,
      toAirport: seg.ToAirport,
      refundAmount: parseFloat(seg.RefundAmount) || 0,
      cancellationCharge: parseFloat(seg.CancellationCharge) || 0,
      remarks: seg.Remarks || "",
    }));

    return {
      cancellationType:
        firstResult?.CancellationType ||
        (Number(requestType) === 1 ? "FullCancellation" : "PartialCancellation"),
      totalRefundAmount: parseFloat(firstResult?.TotalRefundAmount) || 0,
      totalCancellationCharge: parseFloat(firstResult?.TotalCancellationCharge) || 0,
      segments,
      raw,
    };
  } catch (error) {
    logger.error(`SRDV adapter get cancellation charges failed: ${error.message}`);
    throw error;
  }
};

const sendChangeRequestAdapter = async ({
  bookingId,
  pnr,
  srdvType,
  srdvIndex,
  requestType = "1",
  cancellationType = "3",
  remarks,
  sectors = [],
  ticketData = [],
  endUserIp,
}) => {
  try {
    const raw = await srdvClient.sendChangeRequest({
      bookingId,
      pnr,
      srdvType,
      srdvIndex,
      requestType,
      cancellationType,
      remarks,
      sectors,
      ticketData,
      endUserIp,
    });

    checkAndThrowSrdvError(raw?.Error, "Failed to submit change request to SRDV");

    const ticketCRInfo = (raw?.TicketCRInfo || []).map((cr) => ({
      changeRequestId: cr.ChangeRequestId,
      ticketId: cr.TicketId,
      status: cr.Status || cr.ChangeRequestStatus || "Pending",
      remarks: cr.Remarks || "",
      changeRequestStatus: cr.ChangeRequestStatus || cr.Status || "Pending",
    }));

    return {
      responseStatus: raw?.ResponseStatus || "Success",
      srdvType: raw?.SrdvType,
      srdvIndex: raw?.SrdvIndex,
      traceId: raw?.TraceId,
      ticketCRInfo,
      raw,
    };
  } catch (error) {
    logger.error(`SRDV adapter send change request failed: ${error.message}`);
    throw error;
  }
};

const getCancelStatusAdapter = async ({ changeRequestId, endUserIp }) => {
  try {
    const raw = await srdvClient.getCancelStatus({
      changeRequestId,
      endUserIp,
    });

    checkAndThrowSrdvError(raw?.Error, "Failed to fetch cancel status from SRDV");

    return {
      changeRequestId: raw?.ChangeRequestId || changeRequestId,
      paxName: raw?.PaxName || "",
      pnr: raw?.PNR || "",
      sector: raw?.Sector || "",
      departDate: raw?.DepartDate || null,
      cancelStatus: raw?.CancelStatus || "Pending",
      refundStatus: raw?.RefundStatus || "Pending",
      refundAmount: parseFloat(raw?.RefundAmount) || 0,
      cancellationCharge: parseFloat(raw?.CancellationCharge) || 0,
      refundDate: raw?.RefundDate || null,
      adminRemark: raw?.AdminRemark || "",
      yourRemark: raw?.YourRemark || "",
      raw,
    };
  } catch (error) {
    logger.error(`SRDV adapter get cancel status failed: ${error.message}`);
    throw error;
  }
};

module.exports = {
  searchFlightsAdapter,
  fareQuoteAdapter,
  ticketLCCAdapter,
  holdGDSAdapter,
  ticketGDSAdapter,
  seatMapAdapter,
  ssrAdapter,
  getCalendarFareAdapter,
  getCancellationChargesAdapter,
  sendChangeRequestAdapter,
  getCancelStatusAdapter,
};
