const axios = require("axios");
const logger = require("../../utils/logger");
const { AppError } = require("../../middleware/errorHandler");
const SRDV_FLIGHT_BASE_URL =
  (process.env.SRDV_API_BASE_FLIGHT_URL || "https://flight.srdvapi.com/v8/rest").replace(/\/+$/, "");

const SRDV_API_TOKEN = (process.env.SRDV_API_TOKEN || process.env.SRDV_API_KEY || "")
  .replace(/['"]/g, "")
  .trim();


const handleFlightAxiosError = (op, error) => {
  logger.error(`SRDV ${op} failed: ${error.message}`);
  if (error instanceof AppError) throw error;
  const detail = error.response?.data?.Error?.ErrorMessage || error.response?.data?.message || error.message;
  const status = error.response?.status && error.response.status >= 400 && error.response.status < 500 ? error.response.status : 502;
  throw new AppError(`SRDV ${op} failed: ${detail}`, status);
};

const flightClient = axios.create({
  baseURL: SRDV_FLIGHT_BASE_URL,
  headers: {
    "API-TOKEN": SRDV_API_TOKEN,
    "Content-Type": "application/json",
  },
  timeout: process.env.SRDV_TIMEOUT ? Number(process.env.SRDV_TIMEOUT) : 60000,
});

/**
 * Hotel endpoints
 */

/************* FLIGHT ENDPOINTS ********************/

const normalizeDateTime = (date) => {
  if (!date) return "";
  return date.includes("T") ? date : `${date}T00:00:00`;
};

const mapPassengerCounts = (passengers) => {
  if (typeof passengers === "number") {
    return {
      AdultCount: passengers,
      ChildCount: 0,
      InfantCount: 0,
    };
  }

  if (passengers && typeof passengers === "object") {
    return {
      AdultCount: Number(passengers.AdultCount ?? passengers.adults ?? passengers.adult ?? 1),
      ChildCount: Number(passengers.ChildCount ?? passengers.children ?? passengers.child ?? 0),
      InfantCount: Number(passengers.InfantCount ?? passengers.infants ?? passengers.infant ?? 0),
    };
  }

  return {
    AdultCount: 1,
    ChildCount: 0,
    InfantCount: 0,
  };
};

const mapJourneyType = (journeyType) => {
  const type = String(journeyType || "oneway").toLowerCase();
  if (type === "roundtrip") return 2;
  if (type === "multicity") return 3;
  return 1;
};

const searchFlights = async ({
  origin,
  destination,
  departDate,
  returnDate,
  passengers,
  journeyType,
}) => {
  try {
    const segment = {
      Origin: origin,
      Destination: destination,
      FlightCabinClass: 1, // 1 = All (0 returns 1003 in SRDV v8)
      PreferredDepartureTime: normalizeDateTime(departDate),
      PreferredArrivalTime: normalizeDateTime(departDate),
    };

    const segments = [segment];
    const journeyTypeCode = mapJourneyType(journeyType);

    if (journeyTypeCode === 2 && returnDate) {
      segments.push({
        Origin: destination,
        Destination: origin,
        FlightCabinClass: 1, //hardcoded for now
        PreferredDepartureTime: normalizeDateTime(returnDate),
        PreferredArrivalTime: normalizeDateTime(returnDate),
      });
    }

    logger.info(
      `SRDV: Searching flights from ${origin} to ${destination}, journeyType: ${journeyType} in client`,
    );
    const payload = {
      ...mapPassengerCounts(passengers),
      JourneyType: journeyTypeCode,
      Segments: segments,
    };

    const response = await flightClient.post("/Search", payload);
    logger.info(`SRDV flight search response: TraceId=${response.data?.TraceId}, Results=${response.data?.Results?.[0]?.length || 0}`);
    return response.data;
  } catch (error) {
    handleFlightAxiosError("flight search", error);
  }
};

const fareQuote = async ({ srdvType, traceId, srdvIndex, resultIndex }) => {
  try {
    const payload = {
      SrdvType: srdvType,
      TraceId: traceId,
      SrdvIndex: srdvIndex,
      ResultIndex: resultIndex,
    };
    const response = await flightClient.post("/FareQuote", payload);
    return response.data;
  } catch (error) {
    handleFlightAxiosError("fare quote", error);
  }
};

const seatMap = async ({ srdvType, traceId, srdvIndex, resultIndex }) => {
  try {
    const payload = {
      SrdvType: srdvType,
      TraceId: traceId,
      SrdvIndex: srdvIndex,
      ResultIndex: resultIndex,
    };
    const response = await flightClient.post("/SeatMap", payload);
    return response.data;
  } catch (error) {
    handleFlightAxiosError("seat map", error);
  }
};

const ssr = async ({ srdvType, traceId, srdvIndex, resultIndex }) => {
  try {
    const payload = {
      SrdvType: srdvType,
      TraceId: traceId,
      SrdvIndex: srdvIndex,
      ResultIndex: resultIndex,
    };
    const response = await flightClient.post("/SSR", payload);
    return response.data;
  } catch (error) {
    handleFlightAxiosError("SSR", error);
  }
};

/**Booking endpoints (for SRDV)***/

const paxTypeMap = { Adult: 1, Child: 2, Infant: 3, adult: 1, child: 2, infant: 3 };
const genderMap = { Male: "1", Female: "2", male: "1", female: "2", M: "1", F: "2", m: "1", f: "2" };
const formatDate = (date) => {
  if (!date) return "";
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) return date.trim();
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date).split("T")[0] || "";
  return d.toISOString().split("T")[0];
};

const buildPassenger = (
  traveller,
  isLeadPax,
  fareData, // same fareData is being passed for every passenger, needs to be changed later
  isLCC,
  gstData,
  ancillaries = {},
) => {
  gstData = gstData ?? {};

  // FIXED: Fare was being passed through unmodified (`Fare: fareData`) regardless of
  // isLCC — the full FareQuote snapshot, including Currency/OtherCharges/PublishedFare/
  // OfferedFare/CommissionEarned/Discount/TdsOnCommission. Per the reference doc's
  // explicit warning ("LCC Fare does NOT have Currency or OtherCharges — GDS does") and
  // the verified TicketLCC example (only 7 fields), LCC needs a narrower shape than GDS.
  const preserveType = (val, defaultVal = 0) => {
    if (val === undefined || val === null) return defaultVal;
    return val;
  };

  const lccFare = {
    BaseFare: fareData.BaseFare,
    Tax: fareData.Tax,
    TransactionFee: String(fareData.TransactionFee ?? "0"),
    YQTax: preserveType(fareData.YQTax, 0),
    AdditionalTxnFeeOfrd: fareData.AdditionalTxnFeeOfrd || "",
    AdditionalTxnFeePub: fareData.AdditionalTxnFeePub || "",
    AirTransFee: String(fareData.AirTransFee ?? "0"),
  };

  const gdsFare = {
    Currency: fareData.Currency,
    BaseFare: fareData.BaseFare,
    Tax: fareData.Tax,
    YQTax: fareData.YQTax,
    OtherCharges: fareData.OtherCharges,
    TransactionFee: String(fareData.TransactionFee ?? "0"),
    AdditionalTxnFeeOfrd: fareData.AdditionalTxnFeeOfrd || 0,
    AdditionalTxnFeePub: fareData.AdditionalTxnFeePub || 0,
    AirTransFee: String(fareData.AirTransFee ?? "0"),
  };

  const passenger = {
    Title: traveller.title,
    FirstName: traveller.firstName,
    LastName: traveller.lastName,
    PaxType: paxTypeMap[traveller.passengerType],
    DateOfBirth: formatDate(traveller.dateOfBirth),
    Gender: genderMap[traveller.gender],

    PassportNo: traveller.passportNo || "",
    PassportExpiry: formatDate(traveller.passportExpiry) || "",

    AddressLine1: String(traveller.addressLine1 || "Flat 402").slice(0, 32),
    City: traveller.city || "Mumbai",
    CountryCode: traveller.countryCode || "IN",
    CountryName: traveller.countryName || "INDIA",
    ContactNo: String(traveller.phone || traveller.ContactNo || traveller.mobile || "9876543210").replace(/\D/g, "").slice(-10) || "9876543210",
    Email: (traveller.email || traveller.Email || "").trim() || "support@maqamtravels.com",

    IsLeadPax: isLeadPax ? 1 : 0,

    GSTCompanyAddress: gstData.address || "",
    GSTCompanyContactNumber: gstData.contactNumber || "",
    GSTCompanyName: gstData.companyName || "",
    GSTNumber: gstData.gstNumber || "",
    GSTCompanyEmail: gstData.email || "",

    Fare: isLCC ? lccFare : gdsFare,
  };

  // LCC-only fields — NOT FOR GDS
  if (isLCC) {
    passenger.CellCountryCode = traveller.cellCountryCode || "+91";
    passenger.PassportIssueDate = formatDate(traveller.passportIssueDate) || "";

    const rawBaggage = ancillaries.baggage || ancillaries.Baggage || [];
    const baggageList = (Array.isArray(rawBaggage) ? rawBaggage : [rawBaggage])
      .filter((b) => b && String(b.Code || b.code || "").trim().length > 0)
      .map((b) => ({
        AirlineCode: b.AirlineCode || b.airlineCode || "",
        FlightNumber: b.FlightNumber || b.flightNumber || "",
        WayType: b.WayType ?? b.wayType ?? 1,
        Code: String(b.Code || b.code || "").trim(),
        Description: b.Description || b.description || "",
        Weight: String(b.Weight ?? b.weight ?? "0"),
        Currency: b.Currency || b.currency || "INR",
        Price: parseFloat(b.Price ?? b.price ?? 0),
        Origin: b.Origin || b.origin || "",
        Destination: b.Destination || b.destination || "",
      }));
    if (baggageList.length > 0) {
      passenger.Baggage = baggageList;
    }

    const rawMeals = ancillaries.meals || ancillaries.MealDynamic || [];
    const mealList = (Array.isArray(rawMeals) ? rawMeals : [rawMeals])
      .filter((m) => m && String(m.Code || m.code || "").trim().length > 0)
      .map((m) => ({
        WayType: m.WayType ?? m.wayType ?? 1,
        Code: String(m.Code || m.code || "").trim(),
        Description:
          m.Description ||
          m.description ||
          m.AirlineDescription ||
          m.airlineDescription ||
          "",
        AirlineDescription:
          m.AirlineDescription ||
          m.airlineDescription ||
          m.Description ||
          m.description ||
          "",
        Quantity: String(m.Quantity ?? m.quantity ?? "1"),
        Currency: m.Currency || m.currency || "INR",
        Price: parseFloat(m.Price ?? m.price ?? m.Amount ?? m.amount ?? 0),
        Origin: m.Origin || m.origin || "",
        Destination: m.Destination || m.destination || "",
      }));
    if (mealList.length > 0) {
      passenger.MealDynamic = mealList;
    }

    const rawSeats =
      ancillaries.seats || passenger.Seat || ancillaries.Seat || [];
    const seatList = (Array.isArray(rawSeats) ? rawSeats : [rawSeats])
      .filter(
        (s) =>
          s &&
          String(s.Code || s.code || "").trim().length > 0 &&
          String(s.SeatNumber || s.seatNumber || "").trim().length > 0,
      )
      .map((s) => {
        const flightNum =
          s.FlightNumber ||
          s.flightNumber ||
          s.AirlineNumber ||
          s.airlineNumber ||
          "";
        return {
          AirlineCode: s.AirlineCode || s.airlineCode || "",
          FlightNumber: flightNum,
          AirlineNumber: flightNum,
          SeatNumber: s.SeatNumber || s.seatNumber || "",
          IsBooked: false,
          IsLegroom: !!(s.IsLegroom ?? s.isLegroom),
          IsAisle: !!(s.IsAisle ?? s.isAisle),
          Amount: parseFloat(s.Amount ?? s.amount ?? s.Price ?? s.price ?? 0),
          Code: s.Code || s.code || "",
          Origin: s.Origin || s.origin || "",
          Destination: s.Destination || s.destination || "",
        };
      });
    if (seatList.length > 0) {
      passenger.Seat = seatList;
    }
  }

  return passenger;
};

//****TICKETLLC */

const ticketLCC = async ({
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
    const payload = {
      SrdvType: srdvType,
      SrdvIndex: srdvIndex,
      TraceId: traceId,
      ResultIndex: resultIndex,

      Passengers: travellers.map((t) =>
        buildPassenger(
          t.traveller,
          t.isLeadPax,
          fareData,
          true,
          gstData,
          {
            meals: t.meals,
            baggage: t.baggage,
            seats: t.seats,
            ...ancillaries,
          },
        ),
      ),
    };

    console.log(
      `payload in the tciketLLC client call :${JSON.stringify(payload)}`,
    ); //logging for test

    const response = await flightClient.post("/TicketLCC", payload);
    return response.data;
  } catch (error) {
    handleFlightAxiosError("flight booking (TicketLCC)", error);
  }
};

const holdGDS = async ({
  srdvType,
  traceId,
  srdvIndex,
  resultIndex,
  travellers,
  fareData,
  gstData,
}) => {
  try {
    const payload = {
      SrdvType: srdvType,
      TraceId: traceId,
      SrdvIndex: srdvIndex,
      ResultIndex: resultIndex,
      Passengers: travellers.map((t) =>
        buildPassenger(t.traveller, t.isLeadPax, fareData, false, gstData),
      ),
    };

    const response = await flightClient.post("/hold", payload);
    return response.data;
  } catch (error) {
    handleFlightAxiosError("hold GDS", error);
  }
};

const ticketGDS = async ({
  srdvType,
  traceId,
  srdvIndex,
  resultIndex,
  travellers,
  fareData,
  gstData,
  pnr,
  bookingId,
}) => {
  try {
    const payload = {
      SrdvType: srdvType,
      TraceId: traceId,
      SrdvIndex: srdvIndex,
      ResultIndex: resultIndex,
      PNR: pnr,
      BookingId: bookingId,
    };

    const response = await flightClient.post("/TicketGDS", payload);
    return response.data;
  } catch (error) {
    handleFlightAxiosError("ticket GDS", error);
  }
};

const getCalendarFare = async ({
  origin,
  destination,
  departDate,
  returnDate,
  journeyType,
  fareType = 1,
  sources,
}) => {
  try {
    const segment = {
      Origin: origin,
      Destination: destination,
      FlightCabinClass: 1,
      PreferredDepartureTime: normalizeDateTime(departDate),
      PreferredArrivalTime: normalizeDateTime(departDate),
    };

    const segments = [segment];
    const journeyTypeCode = mapJourneyType(journeyType);

    if (journeyTypeCode === 2 && returnDate) {
      segments.push({
        Origin: destination,
        Destination: origin,
        FlightCabinClass: 1,
        PreferredDepartureTime: normalizeDateTime(returnDate),
        PreferredArrivalTime: normalizeDateTime(returnDate),
      });
    }

    const payload = {
      JourneyType: journeyTypeCode,
      FareType: Number(fareType || 1),
      ...(sources && { Sources: sources }),
      Segments: segments,
    };

    logger.info(
      `SRDV: Fetching calendar fare from ${origin} to ${destination} in client`,
    );

    const response = await flightClient.post("/GetCalendarFare", payload);
    return response.data;
  } catch (error) {
    handleFlightAxiosError("calendar fare", error);
  }
};

const getCancellationCharges = async ({
  requestType = 1,
  traceId,
  endUserIp,
}) => {
  try {
    const payload = {
      RequestType: Number(requestType) || 1,
      TraceId: traceId,
    };

    logger.info(
      `SRDV: Fetching cancellation charges for TraceId: ${traceId}, RequestType: ${requestType}`
    );
    const response = await flightClient.post("/GetCancellationCharges", payload);
    return response.data;
  } catch (error) {
    handleFlightAxiosError("cancellation charges", error);
  }
};

const sendChangeRequest = async ({
  bookingId,
  pnr,
  srdvType,
  srdvIndex,
  requestType = "1",
  cancellationType = "3",
  remarks = "Customer requested cancellation",
  sectors = [],
  ticketData = [],
  endUserIp,
}) => {
  try {
    const payload = {
      BookingId: String(bookingId),
      PNR: String(pnr || ""),
      SrdvType: srdvType || "mock",
      SrdvIndex: String(srdvIndex || "1"),
      RequestType: String(requestType),
      CancellationType: String(cancellationType),
      Remarks: remarks || "Customer requested cancellation",
      Sectors: (sectors || []).map((sec) => ({
        Origin: sec.Origin || sec.origin,
        Destination: sec.Destination || sec.destination,
      })),
      TicketData: (ticketData || []).map((t) => ({
        FirstName: t.FirstName || t.firstName || "",
        LastName: t.LastName || t.lastName || "",
        TicketId: t.TicketId || t.ticketId || t.ticketNumber || "",
      })),
    };

    logger.info(
      `SRDV: Sending change request for BookingId: ${bookingId}, PNR: ${pnr}, RequestType: ${requestType}, CancellationType: ${cancellationType}`
    );
    const response = await flightClient.post("/SendChangeRequest", payload);
    return response.data;
  } catch (error) {
    handleFlightAxiosError("send change request", error);
  }
};

const getCancelStatus = async ({ changeRequestId, endUserIp }) => {
  try {
    const payload = {
      ChangeRequestId: String(changeRequestId),
    };

    logger.info(
      `SRDV: Fetching cancel status for ChangeRequestId: ${changeRequestId}`
    );
    const response = await flightClient.post("/GetCancelStatus", payload);
    return response.data;
  } catch (error) {
    handleFlightAxiosError("get cancel status", error);
  }
};

module.exports = {
  flightClient,
  ticketLCC,
  searchFlights,
  fareQuote,
  holdGDS,
  ticketGDS,
  seatMap,
  ssr,
  getCalendarFare,
  getCancellationCharges,
  sendChangeRequest,
  getCancelStatus,
  buildPassenger,
};
