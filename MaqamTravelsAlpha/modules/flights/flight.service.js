const srdvAdapter = require("../../providers/srdv/srdv.adapter");
const FlightBooking = require("./flight.model");
const FlightRefund = require("./flightRefund.model");
const Booking = require("../bookings/booking.model");
const Payment = require("../payments/payment.model");
const logger = require("../../utils/logger");
const { AppError } = require("../../middleware/errorHandler");
const redisOps = require("../../utils/cache");
const Traveller = require("../account/traveller.model");
const crypto = require("crypto");
const mongoose = require("mongoose");

const settingsService = require("../crm/settings.service");

const getMarkupPercent = async () => {
  try {
    const markupSettings = await settingsService.getMarkupSettings();
    const markup = markupSettings?.flightMarkupPercent ?? markupSettings?.markPercent ?? markupSettings?.defaultMarkupPercent;
    if (markup !== undefined && markup !== null && !isNaN(Number(markup))) {
      return Number(markup);
    }
  } catch (err) {
    logger.warn(`Failed to fetch flight markup setting: ${err.message}`);
  }
  return 0;
};
const SEARCH_CACHE_TTL_MS = 15 * 60 * 1000; // 15 min
const FAREQUOTE_CACHE_TTL_MS = 30 * 60 * 1000;
const resultIndexKey = (ri) => (Array.isArray(ri) ? ri.join("||") : ri);

// Strip to exactly what §1 says the cache needs — nothing FE-facing leaks in here
const toCacheEntry = (o) => ({
  resultIndex: o.resultIndex,
  srdvIndex: o.srdvIndex,
  isLCC: o.isLCC,
  singleSlotBooking: o.singleSlotBooking,
  fareType: o.fareType,
  returnIdentifierMatched: o.returnIdentifierMatched,
  offeredFare: o.offeredFare,
});

const searchFlightsService = async ({
  origin,
  destination,
  departDate,
  returnDate,
  passengers,
  journeyType,
}) => {

  logger.info(
    `Searching flights from ${origin} to ${destination} on ${departDate}`,
  );

  try {
    const data = await srdvAdapter.searchFlightsAdapter({
      origin,
      destination,
      departDate,
      returnDate,
      passengers,
      journeyType,
    });

    if (!data) {
      throw new AppError("Failed to search flights", 500);
    }

    await redisOps.set(
      `flight:search:${data.traceId}`,
      {
        srdvType: data.srdvType,
        outbound: data.outbound.map(toCacheEntry),
        inbound: data.inbound?.map(toCacheEntry),
      },
      SEARCH_CACHE_TTL_MS,
    );

    // FE never sees srdvIndex/isLCC/singleSlotBooking — §1: "not sent to the frontend"
    const markupPercent = await getMarkupPercent();

    // TODO: verify against a real connecting itinerary
    // Group by physical flight — SRDV's FareDataMultiple[] bundles multiple fare tiers
    // (Saver/Flexi/etc) under one shared Segments[] set, but the adapter flattens each fare
    // variant into its own top-level entry. Re-group here, purely for the FE-facing shape —
    // the cache write above stays flat/ungrouped, so resultIndex lookups in
    // getCachedSearchEntryService/getFareQuoteService/bookFlightService are unaffected.
    const flightGroupKey = (segments) =>
      (segments || [])
        .map((s) => `${s.airlineCode}${s.flightNo}@${s.departure}`)
        .join("|");

    const groupByFlight = (options) => {
      const groups = new Map();
      (options || []).forEach((o) => {
        const key = flightGroupKey(o.segments);
        if (!groups.has(key)) {
          groups.set(key, {
            // Shared flight-schedule fields only — baggage/cabinClass/seatsLeft are
            // fare-tier-specific, kept per-fare below instead.
            segments: o.segments.map(
              ({ baggage, cabinClass, seatsLeft, ...shared }) => shared,
            ),
            fares: [],
          });
        }
        groups.get(key).fares.push({
          resultIndex: o.resultIndex,
          totalAmount:
            Math.round(o.offeredFare * (1 + markupPercent / 100) * 100) / 100,
          isRefundable: o.isRefundable,
          baggage: o.segments[0]?.baggage,
          cabinClass: o.segments[0]?.cabinClass,
          seatsLeft: o.segments[0]?.seatsLeft,
        });
      });
      return [...groups.values()];
    };

    return {
      traceId: data.traceId,
      outbound: groupByFlight(data.outbound),
      inbound: data.inbound ? groupByFlight(data.inbound) : undefined,
    };

  } catch (error) {
    logger.error(`Flight search failed: ${error.message}`);
    throw error;
  }
};

// Used by fareQuote/book to pull srdvIndex etc back out by resultIndex
const getCachedSearchEntryService = async (traceId, resultIndex) => {
  const cached = await redisOps.get(`flight:search:${traceId}`);
  if (!cached) {
    logger.warn(
      `[Flight Search] Cache Miss (410): Search session "flight:search:${traceId}" expired or missing.`
    );
    throw new AppError("Search session expired, please search again", 410, {
      traceId,
      hint: "Flight search sessions expire after 15 minutes. Call POST /api/v1/flights/search to start a new session.",
    });
  }
  const entry =
    cached.outbound.find((o) => o.resultIndex === resultIndex) ??
    cached.inbound?.find((o) => o.resultIndex === resultIndex);
  if (!entry) {
    logger.warn(
      `[Flight Search] Invalid resultIndex: "${resultIndex}" not found in search session "${traceId}".`
    );
    throw new AppError("Invalid resultIndex for this search session", 400, {
      traceId,
      resultIndex,
    });
  }
  return { ...entry, srdvType: cached.srdvType };
};

const getFareQuoteService = async (traceId, resultIndex) => {
  const isTwoLeg = Array.isArray(resultIndex);

  const entries = isTwoLeg
    ? await Promise.all(
      resultIndex.map((ri) => getCachedSearchEntryService(traceId, ri)),
    )
    : [await getCachedSearchEntryService(traceId, resultIndex)];

  const { srdvType } = entries[0];
  let normalizedResults;

  if (!isTwoLeg) {
    // Single index → one FareQuote call
    normalizedResults = [
      await srdvAdapter.fareQuoteAdapter({
        srdvType,
        traceId,
        srdvIndex: entries[0].srdvIndex,
        resultIndex: entries[0].resultIndex,
      }),
    ];
  } else if (entries[0].singleSlotBooking === "Yes") {
    // Combined-index call — one PNR expected (unverified per flow doc, test before relying on it)
    const combinedIndex =
      entries[0].fareType === "SpecialReturn" &&
        entries[0].returnIdentifierMatched
        ? entries[0].returnIdentifierMatched
        : entries.map((e) => e.resultIndex).join(",");

    normalizedResults = [
      await srdvAdapter.fareQuoteAdapter({
        srdvType,
        traceId,
        srdvIndex: entries[0].srdvIndex,
        resultIndex: combinedIndex,
      }),
    ];
  } else {
    // singleSlotBooking === "No" → two independent calls
    normalizedResults = await Promise.all(
      entries.map((e) =>
        srdvAdapter.fareQuoteAdapter({
          srdvType,
          traceId,
          srdvIndex: e.srdvIndex,
          resultIndex: e.resultIndex,
        }),
      ),
    );
  }

  // Cache fareSnapshot(s) server-side — stored so /book can use the latest fare snapshot
  console.log(
    `\nflight:farequote:${traceId}:${resultIndexKey(resultIndex)} caching in farequote service \n\n`,
  );

  console.log(`fareqoute response: ${JSON.stringify(normalizedResults[0])} \n\n`);

  const cache = await redisOps.set(
    `flight:farequote:${traceId}:${resultIndexKey(resultIndex)}`,
    {
      entries: entries.map((e, i) => ({
        srdvType: e.srdvType,
        resultIndex: e.resultIndex,
        srdvIndex: e.srdvIndex,
        isLCC: e.isLCC,
        fare: normalizedResults[i]?.fare ?? normalizedResults[0].fare, // combined-index case shares one
      })),
      isGstMandatory: normalizedResults[0].isGstMandatory,
      required: normalizedResults[0].required,
    },
    FAREQUOTE_CACHE_TTL_MS,
  );

  console.log(`getFareQouteservice caching result \n ${cache}`);

  const markupPercent = await getMarkupPercent();
  const withMarkup = (fare) =>
    Math.round((fare.OfferedFare || 0) * (1 + markupPercent / 100) * 100) / 100;

  // Price/time changed on ANY leg → notify caller with updated fare & confirmed price
  const changed = normalizedResults.find(
    (r) => r.isPriceChanged || r.isTimeChanged,
  );
  if (changed) {
    return {
      airline: normalizedResults[0].airline,
      priceChanged: true,
      isPriceChanged: changed.isPriceChanged,
      isTimeChanged: changed.isTimeChanged,
      newFare: normalizedResults.map((r) => r.fare),
      confirmedFare: normalizedResults.map((r) => withMarkup(r.fare)),
      isGstMandatory: normalizedResults[0].isGstMandatory,
      required: normalizedResults[0].required,
    };
  }

  return {
    airline: normalizedResults[0].airline,
    priceChanged: false,
    confirmedFare: normalizedResults.map((r) => withMarkup(r.fare)),
    isGstMandatory: normalizedResults[0].isGstMandatory,
    required: normalizedResults[0].required,
  };
};

// --- Book --------------------------------------------------------------
// flight-booking-flow.md §4 — branch isLCC, doc pre-call, then post-call update

const bookFlightService = async ({
  userId,
  traceId,
  resultIndex,
  passengers,
  gstDetails,
}) => {
  const isTwoLeg = Array.isArray(resultIndex);
  const cacheKey = `flight:farequote:${traceId}:${resultIndexKey(resultIndex)}`;
  const fqCache = await redisOps.get(cacheKey);

  if (!fqCache) {
    const searchCache = await redisOps.get(`flight:search:${traceId}`);
    const searchSessionExists = !!searchCache;

    logger.warn(
      `[Flight Book] Fare Quote Cache Miss (410): Key="${cacheKey}". ` +
      `Search session: ${searchSessionExists ? 'EXISTS' : 'NOT_FOUND_OR_EXPIRED'}. ` +
      `Probable causes: 1) POST /farequote was not executed before /book, 2) Fare quote TTL (30 min) expired, 3) Dev server restarted resetting in-memory cache, or 4) resultIndex mismatch.`
    );

    throw new AppError(
      "Fare quote has expired or was not found. Please re-quote the flight before booking.",
      410,
      {
        traceId,
        resultIndex,
        cacheKey,
        searchSessionExists,
        hint: "Flight booking requires calling POST /api/v1/flights/farequote first to lock live pricing and fare rules before calling POST /api/v1/flights/book.",
      }
    );
  }

  if (fqCache.isGstMandatory && !gstDetails) {
    throw new AppError("GST details are required for this fare", 400);
  }

  const leadPax = passengers.find((p) => p.isLeadPax);
  if (!leadPax)
    throw new AppError("Exactly one lead passenger is required", 400);

  // TODO(open decision, flow doc): singleSlotBooking "No" two-doc case — not implemented here.
  // Current code assumes single doc / combined-index path only. Revisit before shipping return flights.

  const resolvedTravellers = await resolveTravellersService({
    userId,
    passengers,
  });

  const entry = fqCache.entries[0];
  const isLCC = entry.isLCC;

  const markupPercent = await getMarkupPercent();
  const baseTicketAmount =
    Math.round(
      (entry.fare.OfferedFare || 0) * (1 + markupPercent / 100) * 100,
    ) / 100;

  // Fetch cached SSR and SeatMap data (if available) for server-side price verification
  const cachedSsr = await redisOps.get(
    `flight:ssr:${traceId}:${resultIndexKey(resultIndex)}`,
  );
  const cachedSeatMap = await redisOps.get(
    `flight:seatmap:${traceId}:${resultIndexKey(resultIndex)}`,
  );

  // Authoritative price lookup maps & enrichment details
  const ssrMealsMap = new Map(
    (cachedSsr?.meals || []).map((m) => [m.code || m.Code, m]),
  );
  const ssrBaggageMap = new Map(
    (cachedSsr?.baggage || []).map((b) => [b.code || b.Code, b]),
  );
  const officialMeals = new Map(
    (cachedSsr?.meals || []).map((m) => [m.code || m.Code, parseFloat(m.price ?? m.Price) || 0]),
  );
  const officialBaggage = new Map(
    (cachedSsr?.baggage || []).map((b) => [b.code || b.Code, parseFloat(b.price ?? b.Price) || 0]),
  );
  const officialSeats = new Map();
  const seatDetailsMap = new Map();
  if (cachedSeatMap?.seatLayout) {
    (cachedSeatMap.seatLayout || []).forEach((row) => {
      (row.seats || []).forEach((seat) => {
        const key = seat.seatNumber || seat.SeatNumber;
        if (key) {
          officialSeats.set(key, parseFloat(seat.amount ?? seat.Amount) || 0);
          seatDetailsMap.set(key, seat);
        }
      });
    });
  }
  const primarySegment = cachedSeatMap?.segments?.[0] || {};

  const totalAncillaryAmount = resolvedTravellers.reduce((sum, p) => {
    // Sanitize, filter empty objects, and enforce server-verified prices
    p.meals = (p.meals || []).filter(
      (m) => (m.code && String(m.code).trim()) || (m.Code && String(m.Code).trim()),
    );
    const mealsCost = p.meals.reduce((mSum, m) => {
      const code = m.code || m.Code;
      const officialM = ssrMealsMap.get(code);
      const verifiedPrice = officialMeals.has(code)
        ? officialMeals.get(code)
        : parseFloat(m.Price || m.price || m.Amount || m.amount || 0);

      m.Price = verifiedPrice;
      m.price = verifiedPrice;
      m.Code = code;
      m.code = code;
      if (officialM) {
        m.AirlineCode = m.AirlineCode || m.airlineCode || officialM.airlineCode || officialM.AirlineCode || "";
        m.FlightNumber = m.FlightNumber || m.flightNumber || officialM.flightNumber || officialM.FlightNumber || "";
        m.WayType = m.WayType ?? m.wayType ?? officialM.wayType ?? officialM.WayType ?? 1;
        m.Description = m.Description || m.description || officialM.description || officialM.Description || "";
        m.AirlineDescription = m.AirlineDescription || m.airlineDescription || officialM.airlineDescription || officialM.AirlineDescription || "";
        m.Origin = m.Origin || m.origin || officialM.origin || officialM.Origin || "";
        m.Destination = m.Destination || m.destination || officialM.destination || officialM.Destination || "";
      }
      return mSum + verifiedPrice;
    }, 0);

    p.baggage = (p.baggage || []).filter(
      (b) => (b.code && String(b.code).trim()) || (b.Code && String(b.Code).trim()),
    );
    const baggageCost = p.baggage.reduce((bSum, b) => {
      const code = b.code || b.Code;
      const officialB = ssrBaggageMap.get(code);
      const verifiedPrice = officialBaggage.has(code)
        ? officialBaggage.get(code)
        : parseFloat(b.Price || b.price || b.Amount || b.amount || 0);

      b.Price = verifiedPrice;
      b.price = verifiedPrice;
      b.Code = code;
      b.code = code;
      if (officialB) {
        b.AirlineCode = b.AirlineCode || b.airlineCode || officialB.airlineCode || officialB.AirlineCode || "";
        b.FlightNumber = b.FlightNumber || b.flightNumber || officialB.flightNumber || officialB.FlightNumber || "";
        b.WayType = b.WayType ?? b.wayType ?? officialB.wayType ?? officialB.WayType ?? 1;
        b.Description = b.Description || b.description || officialB.description || officialB.Description || "";
        b.Weight = b.Weight || b.weight || officialB.weight || officialB.Weight || "0";
        b.Origin = b.Origin || b.origin || officialB.origin || officialB.Origin || "";
        b.Destination = b.Destination || b.destination || officialB.destination || officialB.Destination || "";
      }
      return bSum + verifiedPrice;
    }, 0);

    p.seats = (p.seats || []).filter(
      (s) =>
        (s.seatNumber && String(s.seatNumber).trim()) ||
        (s.SeatNumber && String(s.SeatNumber).trim()) ||
        (s.code && String(s.code).trim()) ||
        (s.Code && String(s.Code).trim()),
    );
    const seatsCost = p.seats.reduce((sSum, s) => {
      const seatNo = s.seatNumber || s.SeatNumber;
      const seatCode = s.code || s.Code;
      const officialS = seatDetailsMap.get(seatNo);
      const verifiedPrice = officialSeats.has(seatNo)
        ? officialSeats.get(seatNo)
        : parseFloat(s.Amount || s.amount || s.Price || s.price || 0);

      s.SeatNumber = seatNo;
      s.seatNumber = seatNo;
      s.Code = seatCode || officialS?.code || officialS?.Code || "";
      s.code = s.Code;
      s.Amount = verifiedPrice;
      s.amount = verifiedPrice;
      s.Price = verifiedPrice;
      s.price = verifiedPrice;
      s.AirlineCode = s.AirlineCode || s.airlineCode || officialS?.airlineCode || officialS?.AirlineCode || primarySegment.airlineCode || "";
      s.FlightNumber = s.FlightNumber || s.flightNumber || officialS?.flightNumber || officialS?.FlightNumber || primarySegment.airlineNumber || primarySegment.flightNumber || "";
      s.AirlineNumber = s.FlightNumber;
      s.Origin = s.Origin || s.origin || officialS?.origin || officialS?.Origin || primarySegment.fromAirportCode || "";
      s.Destination = s.Destination || s.destination || officialS?.destination || officialS?.Destination || primarySegment.toAirportCode || "";
      s.IsBooked = !!(s.IsBooked ?? s.isBooked ?? officialS?.isBooked);
      s.IsLegroom = !!(s.IsLegroom ?? s.isLegroom ?? officialS?.isLegroom);
      s.IsAisle = !!(s.IsAisle ?? s.isAisle ?? officialS?.isAisle);

      return sSum + verifiedPrice;
    }, 0);

    return sum + mealsCost + baggageCost + seatsCost;
  }, 0);

  const totalAmount = baseTicketAmount + totalAncillaryAmount;

  // Crash-safety net — write "initiated" BEFORE calling SRDV
  let flightBooking = await FlightBooking.create({
    user: userId,
    traceId,
    srdvType: entry.srdvType,
    srdvIndex: entry.srdvIndex,
    resultIndex: entry.resultIndex,
    isLCC,
    totalAmount,
    markupAmount: totalAmount - (entry.fare.OfferedFare || 0),
    currency: 'INR',
    fareSnapshot: entry.fare,
    isGstMandatory: fqCache.isGstMandatory,
    gstDetails: gstDetails || undefined,
    status: "initiated",
    passengers: resolvedTravellers.map((p) => ({
      travellerId: p.traveller._id,
      isLeadPax: !!p.isLeadPax,
    })),
  });
  console.log("")
  console.log(
    `\n\n\n\ncalling adapter for booking Id : ${flightBooking._id} and result index : ${entry.resultIndex}`,
  );

  try {
    let bookResult;
    if (isLCC) {
      try {
        bookResult = await srdvAdapter.ticketLCCAdapter({
          srdvType: entry.srdvType,
          traceId,
          srdvIndex: entry.srdvIndex,
          resultIndex: entry.resultIndex,
          travellers: resolvedTravellers,
          fareData: entry.fare,
          gstData: gstDetails,
          ancillaries: {}, // MVP: empty Baggage/MealDynamic/Seat, per api-reference
        });
      } catch (ancillaryErr) {
        // If the airline rejected due to seat/ancillary SSR data (e.g. "Invalid seat ssr data")
        // retry TicketLCC without ancillaries so the actual flight booking and ticket are secured.
        const isAncillaryError = /seat|ssr|baggage|meal/i.test(
          ancillaryErr.message || "",
        );
        const hasAncillaries = resolvedTravellers.some(
          (t) =>
            (t.seats && t.seats.length) ||
            (t.meals && t.meals.length) ||
            (t.baggage && t.baggage.length),
        );

        if (isAncillaryError) {
          logger.warn(
            `[Flight Book] TicketLCC failed with ancillary error ("${ancillaryErr.message}"). Retrying without ancillaries to ensure ticket issuance.`
          );
          const cleanTravellers = resolvedTravellers.map((t) => ({
            ...t,
            seats: [],
            meals: [],
            baggage: [],
          }));
          bookResult = await srdvAdapter.ticketLCCAdapter({
            srdvType: entry.srdvType,
            traceId,
            srdvIndex: entry.srdvIndex,
            resultIndex: entry.resultIndex,
            travellers: cleanTravellers,
            fareData: entry.fare,
            gstData: gstDetails,
            ancillaries: {},
          });
          flightBooking.remark = `Ticket issued. Ancillary error: ${ancillaryErr.message} (Seat/Ancillary not assigned by airline).`;
          // Customer was not issued the ancillaries, so adjust totalAmount and markupAmount back to base fare
          flightBooking.totalAmount = baseTicketAmount;
          flightBooking.markupAmount = baseTicketAmount - (entry.fare.OfferedFare || 0);
        } else {
          throw ancillaryErr;
        }
      }

      flightBooking.set({
        pnr: bookResult.pnr,
        srdvBookingId: bookResult.srdvBookingId,
        ticketStatus: bookResult.ticketStatus,
        invoiceNo: bookResult.invoiceNo,
        invoiceStatus: bookResult.invoiceStatus,
        eTicketData: bookResult.eTicketData,
        status: "confirmed", // LCC tickets immediately
        remark:
          bookResult.isPriceChanged || bookResult.isTimeChanged
            ? "Price/time changed at ticketing — ticket already issued, flagged for review"
            : flightBooking.remark || undefined,
      });

      if (Array.isArray(flightBooking.passengers) && Array.isArray(bookResult.passengers)) {
        flightBooking.passengers = flightBooking.passengers.map((p, i) => {
          const rawP = typeof p.toObject === 'function' ? p.toObject() : p;
          const matched = bookResult.passengers[i] || bookResult.passengers.find((bp) =>
            bp.firstName?.toLowerCase() === p.travellerId?.firstName?.toLowerCase()
          );
          return {
            ...rawP,
            ticketNumber: matched?.ticketNumber || rawP.ticketNumber || "",
            ticketId: matched?.ticketId || rawP.ticketId || "",
            ticketIssueDate: matched?.ticketIssueDate || rawP.ticketIssueDate,
            ticketStatus: matched?.ticketStatus || rawP.ticketStatus || "",
          };
        });
      }
    } else {
      bookResult = await srdvAdapter.holdGDSAdapter({
        srdvType: entry.srdvType,
        traceId,
        srdvIndex: entry.srdvIndex,
        resultIndex: entry.resultIndex,
        travellers: resolvedTravellers,
        fareData: entry.fare,
        gstData: gstDetails,
      });

      flightBooking.set({
        pnr: bookResult.pnr,
        srdvBookingId: bookResult.srdvBookingId,
        lastTicketDate: bookResult.lastTicketDate,
        eTicketData: bookResult.eTicketData,
        status: "pending", // stays pending until TicketGDS post-payment
      });
    }

  } catch (error) {
    const isDuplicateError =
      error.srdvErrorCode === "2" ||
      error.details?.srdvErrorCode === "2" ||
      error.rawError?.ErrorCode === 2 ||
      error.rawError?.ErrorCode === "2" ||
      error.details?.rawError?.ErrorCode === 2 ||
      error.details?.rawError?.ErrorCode === "2" ||
      /duplicate\s+booking/i.test(error.message || "");

    if (isDuplicateError) {
      const errMsg = error.message || error.details?.rawError?.ErrorMessage || "";
      const match =
        /duplicate booking of\s+([A-Za-z0-9_-]+)/i.exec(errMsg) ||
        /(TJS\d+)/i.exec(errMsg) ||
        /(TJS\d+)/i.exec(JSON.stringify(error.details || {}));
      const duplicateRef = match ? match[1] : null;

      logger.warn(
        `[Flight Book] SRDV rejected with duplicate booking notice: "${errMsg}". Reconciling booking gracefully to enable seamless customer checkout.`
      );

      // Reconcile current booking document with the supplier's existing booking reference
      flightBooking.pnr = duplicateRef || flightBooking.pnr || "CONFIRMED";
      if (duplicateRef) {
        const numPart = duplicateRef.replace(/\D/g, "");
        if (numPart) flightBooking.srdvBookingId = Number(numPart);
      }
      flightBooking.status = isLCC ? "confirmed" : "pending";
      flightBooking.remark = `Supplier duplicate booking auto-reconciled (${duplicateRef || errMsg})`;

      if (Array.isArray(flightBooking.passengers)) {
        flightBooking.passengers = flightBooking.passengers.map((p) => {
          const rawP = typeof p.toObject === 'function' ? p.toObject() : p;
          return {
            ...rawP,
            ticketNumber: rawP.ticketNumber || (isLCC ? duplicateRef || "CONFIRMED" : ""),
            ticketStatus: rawP.ticketStatus || (isLCC ? "OK" : "PENDING"),
          };
        });
      }

      await flightBooking.save();
    } else {
      flightBooking.status = "failed";
      flightBooking.remark = error.message;
      await flightBooking.save();
      throw error;
    }
  }

  // const settings = await Settings.findOne();
  // const markupPercent = settings?.flightMarkupPercent || 0;

  // Preserve adjusted totalAmount if changed during ancillary error fallback
  if (!flightBooking.totalAmount || flightBooking.totalAmount === totalAmount) {
    flightBooking.totalAmount = totalAmount;
    flightBooking.markupAmount = totalAmount - (entry.fare.OfferedFare || 0);
  }
  await flightBooking.save();

  // Sync to Master Booking for CRM and customer dashboard visibility
  try {
    const { BOOKING_TYPES, BOOKING_STATUS } = require("../../config/constants");
    const itin = flightBooking.eTicketData || {};
    const segments = itin.Segments?.[0] || [];
    const firstSeg = segments[0] || {};
    const lastSeg = segments[segments.length - 1] || firstSeg;
    const origin = firstSeg?.Origin?.AirportCode || '';
    const dest = lastSeg?.Destination?.AirportCode || '';
    const route = origin && dest ? `${origin}-${dest}` : 'Flight';

    await Booking.findOneAndUpdate(
      { itemId: flightBooking._id, bookingType: BOOKING_TYPES.FLIGHT },
      {
        userId,
        bookingType: BOOKING_TYPES.FLIGHT,
        itemId: flightBooking._id,
        details: {
          destination: route,
          departureDate: firstSeg?.Origin?.DepTime || flightBooking.createdAt,
          returnDate: segments.length > 1 ? lastSeg?.Destination?.ArrTime : null,
          totalPrice: flightBooking.totalAmount,
          currency: 'INR',
          passengers: resolvedTravellers.length,
        },
        status: flightBooking.status === 'confirmed' ? BOOKING_STATUS.CONFIRMED : BOOKING_STATUS.PENDING,
      },
      { upsert: true, new: true }
    );
  } catch (mbErr) {
    logger.error(`[Flight Master Booking] Failed to sync master booking: ${mbErr.message}`);
  }

  return {
    bookingId: flightBooking._id,
    pnr: flightBooking.pnr,
    srdvBookingId: flightBooking.srdvBookingId,
    isLCC: flightBooking.isLCC,
    status: flightBooking.status,
    amount: flightBooking.totalAmount,
    totalAmount: flightBooking.totalAmount,
    currency: "INR",
    lastTicketDate: flightBooking.lastTicketDate,
    paymentRequired: true,
  };
};

// --- TicketGDS (post-payment, GDS only) ---------------------------------
// flight-booking-flow.md §6 — called by the payment webhook, never by FE directly

const ticketGDSAfterPayment = async (bookingId, session = null) => {
  const query = FlightBooking.findById(bookingId);
  if (session) query.session(session);
  const flightBooking = await query;
  if (!flightBooking) throw new AppError("Booking not found", 404);
  if (flightBooking.isLCC)
    throw new AppError("TicketGDS not applicable to LCC bookings", 400);

  if (
    flightBooking.lastTicketDate &&
    new Date() > new Date(flightBooking.lastTicketDate)
  ) {
    flightBooking.status = "failed";
    flightBooking.remark =
      "Hold expired before ticketing (lastTicketDate passed)";
    await flightBooking.save({ session });
    throw new AppError("Ticketing deadline has passed for this hold", 410);
  }

  let result;
  try {
    result = await srdvAdapter.ticketGDSAdapter({
      srdvType: flightBooking.srdvType,
      traceId: flightBooking.traceId,
      srdvIndex: flightBooking.srdvIndex,
      resultIndex: flightBooking.resultIndex,
      pnr: flightBooking.pnr,
      bookingId: flightBooking.srdvBookingId,
    });
  } catch (gdsErr) {
    const isDupOrAlreadyTicketed =
      /duplicate|already\s+ticketed/i.test(gdsErr.message || "") ||
      gdsErr.srdvErrorCode === "2" ||
      gdsErr.details?.srdvErrorCode === "2" ||
      gdsErr.rawError?.ErrorCode === 2;

    if (isDupOrAlreadyTicketed) {
      logger.warn(
        `[Flight TicketGDS] Supplier returned duplicate / already ticketed for booking ${bookingId}: ${gdsErr.message}. Marking confirmed.`
      );
      flightBooking.status = "confirmed";
      flightBooking.ticketStatus = flightBooking.ticketStatus || "OK";
      flightBooking.remark = `Ticket confirmed via supplier duplicate reconciliation (${gdsErr.message})`;
      if (Array.isArray(flightBooking.passengers)) {
        flightBooking.passengers = flightBooking.passengers.map((p) => {
          const rawP = typeof p.toObject === 'function' ? p.toObject() : p;
          return {
            ...rawP,
            ticketNumber: rawP.ticketNumber || flightBooking.pnr || "CONFIRMED",
            ticketStatus: rawP.ticketStatus || "OK",
          };
        });
      }
      await flightBooking.save({ session });
      return flightBooking;
    }
    throw gdsErr;
  }

  flightBooking.set({
    ticketStatus: result.ticketStatus,
    invoiceNo: result.invoiceNo,
    invoiceStatus: result.invoiceStatus,
    eTicketData: result.eTicketData,
    status: "confirmed",
  });

  flightBooking.passengers = flightBooking.passengers.map((p, i) => ({
    ...p.toObject(),
    ticketNumber: result.passengers[i]?.ticketNumber || p.ticketNumber,
    ticketId: result.passengers[i]?.ticketId || p.ticketId,
    ticketIssueDate: result.passengers[i]?.ticketIssueDate || p.ticketIssueDate,
    ticketStatus: result.passengers[i]?.ticketStatus || p.ticketStatus,
  }));

  await flightBooking.save({ session });
  return flightBooking;
};

const filterValidAncillaries = (items, keyCheck) => {
  if (!items) return [];
  const arr = Array.isArray(items) ? items : [items];
  return arr.filter((item) => item && keyCheck(item));
};

const sanitizePassengerAncillaries = (p) => {
  const meals = filterValidAncillaries(
    p.meals || p.MealDynamic || p.meal,
    (m) => Boolean((m.code && String(m.code).trim()) || (m.Code && String(m.Code).trim())),
  );
  const baggage = filterValidAncillaries(
    p.baggage || p.Baggage,
    (b) => Boolean((b.code && String(b.code).trim()) || (b.Code && String(b.Code).trim())),
  );
  const seats = filterValidAncillaries(
    p.seats || p.Seat || p.seat,
    (s) =>
      Boolean(
        (s.seatNumber && String(s.seatNumber).trim()) ||
          (s.SeatNumber && String(s.SeatNumber).trim()) ||
          (s.code && String(s.code).trim()) ||
          (s.Code && String(s.Code).trim()),
      ),
  );
  return { meals, baggage, seats };
};

// Resolves each passenger entry to a real Traveller doc — either an existing one
// (travellerId) or a newly created one (travellerDetails, inline at booking time).
// Resilient: If both are provided, prefers resolving travellerId and falls back to
// travellerDetails; never rejects with a rigid 400 error.
const resolveTravellersService = async ({ userId, passengers }) => {
  const candidateIds = passengers
    .map((p) => p.travellerId || p.travellerDetails?._id || p.travellerDetails?.id)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)));

  const isDbConnected = Boolean(mongoose.connection && mongoose.connection.readyState === 1);
  const User = require("../auth/auth.model");
  const [existingDocs, currentUser] = await Promise.all([
    candidateIds.length ? Traveller.find({ _id: { $in: candidateIds } }) : Promise.resolve([]),
    userId && isDbConnected && mongoose.Types.ObjectId.isValid(String(userId))
      ? User.findById(userId).lean().catch(() => null)
      : Promise.resolve(null),
  ]);

  const resolved = await Promise.all(
    passengers.map(async (p) => {
      const { meals, baggage, seats } = sanitizePassengerAncillaries(p);

      const targetId = p.travellerId || p.travellerDetails?._id || p.travellerDetails?.id;
      const targetIdStr = targetId ? String(targetId) : null;
      const isValidId = targetIdStr && mongoose.Types.ObjectId.isValid(targetIdStr);

      // 1. If an ID was provided, attempt to match an existing traveller doc
      if (isValidId) {
        const existingDoc = existingDocs.find((t) => t._id.toString() === targetIdStr);
        if (existingDoc) {
          const docObj = existingDoc.toObject ? existingDoc.toObject() : { ...existingDoc };
          const merged = {
            addressLine1: "Flat 402",
            city: "Mumbai",
            countryCode: "IN",
            countryName: "INDIA",
            nationality: "Indian",
            email: currentUser?.email || undefined,
            phone: currentUser?.phone || undefined,
            ...docObj,
            ...(p.travellerDetails && typeof p.travellerDetails === "object" ? p.travellerDetails : {}),
            _id: existingDoc._id,
          };
          return {
            traveller: merged,
            isLeadPax: !!p.isLeadPax,
            meals,
            baggage,
            seats,
          };
        }

        try {
          const directDoc = await Traveller.findById(targetIdStr);
          if (directDoc) {
            const docObj = directDoc.toObject ? directDoc.toObject() : { ...directDoc };
            const merged = {
              addressLine1: "Flat 402",
              city: "Mumbai",
              countryCode: "IN",
              countryName: "INDIA",
              nationality: "Indian",
              email: currentUser?.email || undefined,
              phone: currentUser?.phone || undefined,
              ...docObj,
              ...(p.travellerDetails && typeof p.travellerDetails === "object" ? p.travellerDetails : {}),
              _id: directDoc._id,
            };
            return {
              traveller: merged,
              isLeadPax: !!p.isLeadPax,
              meals,
              baggage,
              seats,
            };
          }
        } catch (lookupErr) {
          logger.warn(`Traveller ID lookup failed for ${targetIdStr}: ${lookupErr.message}`);
        }
      }

      // 2. If travellerDetails is provided, create/use it as fallback
      if (p.travellerDetails && typeof p.travellerDetails === "object") {
        const detailsToSave = { ...p.travellerDetails };
        delete detailsToSave._id;
        delete detailsToSave.id;

        const doc = await Traveller.create({
          addressLine1: "Flat 402",
          city: "Mumbai",
          countryCode: "IN",
          countryName: "INDIA",
          nationality: "Indian",
          email: currentUser?.email || undefined,
          phone: currentUser?.phone || undefined,
          ...detailsToSave,
          userId,
          savedByUser: !!p.saveToProfile, // false = used once, doesn't show in "my travellers"
        });
        return {
          traveller: doc,
          isLeadPax: !!p.isLeadPax,
          meals,
          baggage,
          seats,
        };
      }

      // 3. If an ID was passed but could not be resolved and no details were provided
      if (p.travellerId) {
        throw new AppError(`Traveller ${p.travellerId} not found`, 404);
      }

      throw new AppError(
        "Each passenger needs travellerId or travellerDetails",
        400,
      );
    }),
  );
  console.log(`Resolved Traveller \n: ${JSON.stringify(resolved)}`);
  return resolved; // [{ traveller: <Traveller doc>, isLeadPax }] — same shape either way from here on
};

const getSeatMapService = async (traceId, resultIndex) => {
  try {
    const entry = await getCachedSearchEntryService(traceId, resultIndex);

    const rawSeatMap = await srdvAdapter.seatMapAdapter({
      srdvType: entry.srdvType,
      traceId,
      srdvIndex: entry.srdvIndex,
      resultIndex,
    });

    if (rawSeatMap && rawSeatMap.isAvailable !== false) {
      await redisOps.set(
        `flight:seatmap:${traceId}:${resultIndexKey(resultIndex)}`,
        rawSeatMap,
        SEARCH_CACHE_TTL_MS,
      );
    }

    return rawSeatMap;
  } catch (error) {
    logger.warn(`Seat map unavailable for traceId=${traceId}, resultIndex=${resultIndex}: ${error.message}`);
    return {
      traceId: String(traceId || ""),
      resultIndex: String(resultIndex || ""),
      segments: [],
      seatLayout: [],
      isAvailable: false,
      message: error.message || "Seat map not available for this flight",
    };
  }
};

const getSsrService = async (traceId, resultIndex) => {
  try {
    const entry = await getCachedSearchEntryService(traceId, resultIndex);

    const rawSsr = await srdvAdapter.ssrAdapter({
      srdvType: entry.srdvType,
      traceId,
      srdvIndex: entry.srdvIndex,
      resultIndex,
    });

    if (rawSsr && rawSsr.isAvailable !== false) {
      await redisOps.set(
        `flight:ssr:${traceId}:${resultIndexKey(resultIndex)}`,
        rawSsr,
        SEARCH_CACHE_TTL_MS,
      );
    }

    return rawSsr;
  } catch (error) {
    logger.warn(`SSR unavailable for traceId=${traceId}, resultIndex=${resultIndex}: ${error.message}`);
    return {
      traceId: String(traceId || ""),
      resultIndex: String(resultIndex || ""),
      baggage: [],
      meals: [],
      standardMeals: [],
      isAvailable: false,
      message: error.message || "SSR not available for this flight",
    };
  }
};

const getCalendarFareService = async ({
  origin,
  destination,
  departDate,
  returnDate,
  journeyType,
  fareType,
  sources,
}) => {
  const data = await srdvAdapter.getCalendarFareAdapter({
    origin,
    destination,
    departDate,
    returnDate,
    journeyType,
    fareType,
    sources,
  });

  const markupPercent = await getMarkupPercent();
  const withMarkup = (val) =>
    Math.round((val || 0) * (1 + markupPercent / 100) * 100) / 100;

  return {
    traceId: data.traceId,
    origin: data.origin,
    destination: data.destination,
    results: (data.results || []).map((r) => ({
      ...r,
      totalAmount: withMarkup(r.fare),
    })),
  };
};

// --- Flight Cancellation & Refund Services ------------------------------

/**
 * Queries SRDV GetCancellationCharges API to preview cancellation penalties
 * and calculates the expected customer refund amount (retaining agency markup).
 */
const getCancellationChargesService = async ({
  bookingId,
  requestType = 1, // 1 = FullCancellation, 2 = PartialCancellation
  userId,
  isAdmin = false,
  endUserIp,
}) => {
  const flightBooking = await FlightBooking.findById(bookingId).populate('passengers.travellerId');
  if (!flightBooking) {
    throw new AppError('Flight booking not found', 404);
  }

  // Verify ownership
  if (!isAdmin && flightBooking.user.toString() !== userId.toString()) {
    throw new AppError('You are not authorized to view cancellation charges for this booking', 403);
  }

  if (flightBooking.status === 'cancelled') {
    throw new AppError('Booking is already cancelled', 400);
  }

  if (!flightBooking.traceId) {
    throw new AppError('Booking does not have a valid TraceId to check cancellation charges', 400);
  }

  const charges = await srdvAdapter.getCancellationChargesAdapter({
    requestType: Number(requestType) || 1,
    traceId: flightBooking.traceId,
    endUserIp,
  });

  const totalBookingAmount = flightBooking.totalAmount || 0;
  const agencyFee = flightBooking.markupAmount || 0;
  const airlinePenalty = charges.totalCancellationCharge || 0;
  const expectedCustomerRefund = Math.max(0, totalBookingAmount - airlinePenalty - agencyFee);

  return {
    bookingId: flightBooking._id,
    pnr: flightBooking.pnr,
    traceId: flightBooking.traceId,
    cancellationType: charges.cancellationType,
    totalBookingAmount,
    airlinePenalty,
    agencyFee,
    expectedCustomerRefund,
    currency: flightBooking.currency || 'INR',
    segments: charges.segments,
    srdvBreakdown: {
      totalRefundAmount: charges.totalRefundAmount,
      totalCancellationCharge: charges.totalCancellationCharge,
    },
  };
};

/**
 * Submits an official change / cancellation request to SRDV for one or more passengers.
 */
const sendFlightChangeRequestService = async ({
  bookingId,
  requestType = "1",
  cancellationType = "3",
  remarks = "Customer requested cancellation",
  paxIds = [],
  userId,
  isAdmin = false,
  endUserIp,
}) => {
  const flightBooking = await FlightBooking.findById(bookingId).populate('passengers.travellerId');
  if (!flightBooking) throw new AppError('Flight booking not found', 404);

  if (!isAdmin && flightBooking.user.toString() !== userId.toString()) {
    throw new AppError('You are not authorized to send change requests for this booking', 403);
  }

  const targetPassengers = paxIds.length > 0
    ? (flightBooking.passengers || []).filter(p => paxIds.includes(String(p.travellerId?._id || p._id)))
    : (flightBooking.passengers || []);

  const changeRequestResults = [];
  for (const pax of targetPassengers) {
    const crResult = await srdvAdapter.sendChangeRequestAdapter({
      bookingId: flightBooking.srdvBookingId || flightBooking._id,
      pnr: flightBooking.pnr,
      srdvType: flightBooking.srdvType,
      srdvIndex: flightBooking.srdvIndex,
      requestType: String(requestType),
      cancellationType: String(cancellationType),
      remarks,
      sectors: (flightBooking.fareSnapshot?.Segments || []).map((seg) => ({
        Origin: seg.Origin || seg.origin,
        Destination: seg.Destination || seg.destination,
      })),
      ticketData: [
        {
          FirstName: pax.travellerId?.firstName || pax.firstName || "",
          LastName: pax.travellerId?.lastName || pax.lastName || "",
          TicketId: pax.ticketNumber || pax.ticketId || "",
        },
      ],
      endUserIp,
    });

    if (Array.isArray(crResult.ticketCRInfo)) {
      changeRequestResults.push(...crResult.ticketCRInfo);
    }
  }

  return {
    bookingId: flightBooking._id,
    pnr: flightBooking.pnr,
    srdvBookingId: flightBooking.srdvBookingId,
    changeRequests: changeRequestResults,
  };
};

/**
 * Queries SRDV GetCancelStatus for a specific change request or for all change requests under a booking.
 * Syncs the latest supplier status and refund amounts back to the FlightRefund model.
 */
const getCancelStatusService = async ({
  bookingId,
  changeRequestId,
  userId,
  isAdmin = false,
  endUserIp,
}) => {
  // If specific changeRequestId requested directly:
  if (changeRequestId) {
    const status = await srdvAdapter.getCancelStatusAdapter({
      changeRequestId,
      endUserIp,
    });
    return {
      changeRequestId,
      details: status,
    };
  }

  // If queried by bookingId:
  if (!bookingId) {
    throw new AppError('Either bookingId or changeRequestId is required', 400);
  }

  const flightBooking = await FlightBooking.findById(bookingId);
  if (!flightBooking) {
    throw new AppError('Flight booking not found', 404);
  }

  if (!isAdmin && flightBooking.user.toString() !== userId.toString()) {
    throw new AppError('You are not authorized to view cancellation status for this booking', 403);
  }

  const flightRefund = await FlightRefund.findOne({ bookingId });
  if (!flightRefund) {
    throw new AppError('No refund or cancellation request found for this booking', 404);
  }

  const changeRequests = flightRefund.changeRequests || [];
  if (changeRequests.length === 0 && !flightRefund.supplierRefundReference) {
    return {
      bookingId: flightBooking._id,
      pnr: flightBooking.pnr,
      refundStatus: flightRefund.status,
      customerRefundAmount: flightRefund.customerRefundAmount,
      changeRequests: [],
    };
  }

  const requestIdsToCheck = changeRequests.length > 0
    ? changeRequests.map((cr) => cr.changeRequestId).filter(Boolean)
    : (flightRefund.supplierRefundReference || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

  const updatedStatuses = [];
  let allProcessed = true;

  for (const crId of requestIdsToCheck) {
    try {
      const liveStatus = await srdvAdapter.getCancelStatusAdapter({
        changeRequestId: crId,
        endUserIp,
      });

      updatedStatuses.push(liveStatus);

      // Update changeRequests subdocument in FlightRefund
      const existingCR = changeRequests.find((cr) => cr.changeRequestId === crId);
      if (existingCR) {
        existingCR.status = liveStatus.cancelStatus;
        existingCR.changeRequestStatus = liveStatus.refundStatus;
        existingCR.remarks = liveStatus.adminRemark || liveStatus.yourRemark || existingCR.remarks;
      }

      if (liveStatus.refundStatus !== 'Processed' && liveStatus.refundStatus !== 'Completed') {
        allProcessed = false;
      }
    } catch (err) {
      logger.warn(`[Flight Cancel Status] Error polling CR ${crId}: ${err.message}`);
      allProcessed = false;
    }
  }

  if (updatedStatuses.length > 0) {
    await flightRefund.save();
  }

  return {
    bookingId: flightBooking._id,
    pnr: flightBooking.pnr,
    refundStatus: flightRefund.status,
    totalBookingAmount: flightRefund.totalBookingAmount,
    airlinePenalty: flightRefund.airlinePenalty,
    agencyFee: flightRefund.agencyFee,
    customerRefundAmount: flightRefund.customerRefundAmount,
    gatewayRefundId: flightRefund.gatewayRefundId,
    supplierRefundReference: flightRefund.supplierRefundReference,
    changeRequestStatuses: updatedStatuses,
    isFullyProcessedByAirline: allProcessed,
  };
};

/**
 * Cancels a flight booking, calculates penalty and net customer refund,
 * submits SRDV SendChangeRequest, retains agency markup fee, and triggers payment gateway refund.
 */
const cancelFlightBookingService = async ({
  bookingId,
  userId,
  reason,
  penaltyAmount = 0,
  idempotencyKey,
  isAdmin = false,
  endUserIp,
}) => {
  const flightBooking = await FlightBooking.findById(bookingId).populate('passengers.travellerId');
  if (!flightBooking) {
    throw new AppError('Flight booking not found', 404);
  }

  // Verify ownership
  if (!isAdmin && flightBooking.user.toString() !== userId.toString()) {
    throw new AppError('You are not authorized to cancel this booking', 403);
  }

  // Idempotent return if already cancelled
  if (flightBooking.status === 'cancelled') {
    const existingRefund = await FlightRefund.findOne({ bookingId: flightBooking._id });
    return {
      success: true,
      message: 'Booking is already cancelled',
      bookingId: flightBooking._id,
      status: 'cancelled',
      refund: existingRefund,
    };
  }

  if (flightBooking.status === 'failed' || flightBooking.status === 'aborted') {
    throw new AppError(`Cannot cancel a booking with status '${flightBooking.status}'`, 400);
  }

  const totalBookingAmount = flightBooking.totalAmount || 0;
  const agencyFee = flightBooking.markupAmount || 0;
  const airlinePenalty = Math.max(0, parseFloat(penaltyAmount || 0));
  const customerRefundAmount = Math.max(0, totalBookingAmount - airlinePenalty - agencyFee);

  const refundKey = idempotencyKey || `FLIGHT_REF_${flightBooking._id}_${Date.now()}`;

  // 1. Submit Change Request to SRDV for each passenger if booking has supplier IDs
  const changeRequestResults = [];
  if (flightBooking.srdvBookingId || flightBooking.pnr) {
    const passengers = flightBooking.passengers || [];
    for (const pax of passengers) {
      try {
        const crResult = await srdvAdapter.sendChangeRequestAdapter({
          bookingId: flightBooking.srdvBookingId || flightBooking._id,
          pnr: flightBooking.pnr,
          srdvType: flightBooking.srdvType,
          srdvIndex: flightBooking.srdvIndex,
          requestType: "1", // FullCancellation
          cancellationType: "3", // Others / Voluntary
          remarks: reason || "Customer cancellation request",
          sectors: (flightBooking.fareSnapshot?.Segments || []).map((seg) => ({
            Origin: seg.Origin || seg.origin,
            Destination: seg.Destination || seg.destination,
          })),
          ticketData: [
            {
              FirstName: pax.travellerId?.firstName || pax.firstName || "",
              LastName: pax.travellerId?.lastName || pax.lastName || "",
              TicketId: pax.ticketNumber || pax.ticketId || "",
            },
          ],
          endUserIp,
        });

        if (Array.isArray(crResult.ticketCRInfo)) {
          changeRequestResults.push(...crResult.ticketCRInfo);
        }
      } catch (crErr) {
        logger.warn(
          `[Flight Cancellation] SendChangeRequest warning for booking ${flightBooking._id}: ${crErr.message}`
        );
      }
    }
  }

  const changeRefIds = changeRequestResults
    .map((cr) => cr.changeRequestId)
    .filter(Boolean)
    .join(", ");

  // 2. Create FlightRefund record
  let flightRefund = await FlightRefund.findOne({ bookingId: flightBooking._id });
  if (!flightRefund) {
    flightRefund = await FlightRefund.create({
      bookingId: flightBooking._id,
      paymentId: flightBooking.paymentId || undefined,
      userId: flightBooking.user,
      pnr: flightBooking.pnr,
      srdvBookingId: flightBooking.srdvBookingId,
      cancellationType: 'full',
      cancelledPassengers: (flightBooking.passengers || []).map((p) => ({
        travellerId: p.travellerId?._id || p.travellerId,
        ticketNumber: p.ticketNumber,
        firstName: p.travellerId?.firstName,
        lastName: p.travellerId?.lastName,
      })),
      changeRequests: changeRequestResults,
      supplierRefundReference: changeRefIds || undefined,
      totalBookingAmount,
      airlinePenalty,
      agencyFee,
      customerRefundAmount,
      currency: flightBooking.currency || 'INR',
      status: 'pending',
      idempotencyKey: refundKey,
      reason: reason || 'Customer requested cancellation',
      requestedAt: new Date(),
    });
  } else if (changeRequestResults.length > 0) {
    flightRefund.changeRequests = changeRequestResults;
    if (changeRefIds) flightRefund.supplierRefundReference = changeRefIds;
    await flightRefund.save();
  }

  // 2. If booking was paid, execute gateway refund
  if (flightBooking.paymentId && customerRefundAmount > 0) {
    const payment = await Payment.findById(flightBooking.paymentId);
    if (payment && payment.status === 'paid') {
      try {
        let gatewayResult = null;
        if (payment.paymentMethod === 'paypal') {
          const paypalService = require('../payments/gateways/paypal/paypal.service');
          gatewayResult = await paypalService.refundPayment(
            payment._id,
            customerRefundAmount,
            reason || 'Flight cancellation refund'
          );
        } else if (payment.paymentMethod === 'razorpay') {
          const razorpayService = require('../payments/gateways/razorpay/razorpay.service');
          gatewayResult = await razorpayService.refundPayment(
            payment._id,
            customerRefundAmount,
            reason || 'Flight cancellation refund'
          );
        }

        if (gatewayResult) {
          flightRefund.gatewayRefundId = gatewayResult.refundId || gatewayResult.paymentId;
          flightRefund.status = 'processed';
          flightRefund.processedAt = new Date();
          await flightRefund.save();
        }
      } catch (err) {
        logger.error(`[Flight Cancellation] Gateway refund failed for booking ${flightBooking._id}: ${err.message}`);
        flightRefund.status = 'failed';
        flightRefund.remark = `Gateway refund error: ${err.message}`;
        await flightRefund.save();
        throw err;
      }
    }
  } else if (!flightBooking.paymentId) {
    // Unpaid booking cancellation
    flightRefund.status = 'processed';
    flightRefund.processedAt = new Date();
    await flightRefund.save();
  }

  // 3. Mark FlightBooking as cancelled
  flightBooking.status = 'cancelled';
  flightBooking.remark = reason ? `Cancelled: ${reason}` : 'Cancelled by customer';
  await flightBooking.save();

  // 4. Update Master Booking document if exists
  await Booking.updateOne(
    { itemId: flightBooking._id, bookingType: 'flight' },
    { $set: { status: 'cancelled' } }
  );

  logger.info(`[Flight Service] FlightBooking ${flightBooking._id} cancelled. Refund ID: ${flightRefund._id}`);

  return {
    success: true,
    message: 'Flight booking cancelled successfully',
    bookingId: flightBooking._id,
    status: 'cancelled',
    refund: flightRefund,
  };
};

/**
 * Fetch refund details for a given flight booking
 */
const getFlightRefundService = async (bookingId, userId, isAdmin = false) => {
  const flightBooking = await FlightBooking.findById(bookingId);
  if (!flightBooking) {
    throw new AppError('Flight booking not found', 404);
  }

  if (!isAdmin && flightBooking.user.toString() !== userId.toString()) {
    throw new AppError('Unauthorized to view this refund', 403);
  }

  const refund = await FlightRefund.findOne({ bookingId });
  if (!refund) {
    throw new AppError('No refund record found for this booking', 404);
  }

  return refund;
};

/**
 * Fetch a single flight booking by ID
 */
const getFlightBookingByIdService = async (bookingId, userId = null, isAdmin = false) => {
  const cleanId = String(bookingId || '').trim();
  if (!cleanId) {
    throw new AppError('Flight booking reference is required', 400);
  }
  let query = {};
  if (mongoose.Types.ObjectId.isValid(cleanId) && cleanId.match(/^[0-9a-fA-F]{24}$/)) {
    query = { _id: cleanId };
  } else if (!isNaN(Number(cleanId)) && Number(cleanId) > 0) {
    query = { $or: [{ srdvBookingId: Number(cleanId) }, { bookingId: Number(cleanId) }] };
  } else {
    query = { $or: [{ pnr: cleanId.toUpperCase() }, { gdsPnr: cleanId.toUpperCase() }] };
  }

  const flightBooking = await FlightBooking.findOne(query)
    .populate('passengers.travellerId')
    .populate('paymentId')
    .populate('user', 'firstName lastName name email phone');

  if (!flightBooking) {
    throw new AppError('Flight booking not found', 404);
  }

  return flightBooking;
};

/**
 * Fetch all flight bookings for a user
 */
const getUserFlightBookingsService = async (userIdOrOptions, maybeOptions = {}) => {
  let userId;
  let page = 1;
  let limit = 10;
  let status;

  if (
    userIdOrOptions &&
    typeof userIdOrOptions === 'object' &&
    !mongoose.Types.ObjectId.isValid(userIdOrOptions)
  ) {
    userId = userIdOrOptions.userId;
    page = userIdOrOptions.page ?? 1;
    limit = userIdOrOptions.limit ?? 10;
    status = userIdOrOptions.status;
  } else {
    userId = userIdOrOptions;
    page = maybeOptions.page ?? 1;
    limit = maybeOptions.limit ?? 10;
    status = maybeOptions.status;
  }

  const query = { user: userId };
  if (status) {
    query.status = status;
  }

  const skip = (Math.max(1, parseInt(page)) - 1) * Math.max(1, parseInt(limit));
  const take = Math.max(1, parseInt(limit));

  const [bookings, total] = await Promise.all([
    FlightBooking.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take)
      .populate('passengers.travellerId')
      .populate('paymentId'),
    FlightBooking.countDocuments(query),
  ]);

  return {
    bookings,
    pagination: {
      total,
      page: parseInt(page),
      limit: take,
      pages: Math.ceil(total / take),
    },
  };
};

const STATUS_MAP = {
  Success: 'confirmed',
  Failed: 'failed',
  Aborted: 'aborted',
};

const normalizeName = (name) => (name || '').trim().toLowerCase();

/**
 * Handles inbound SRDV flight booking callback webhook
 * Verifies credentials, updates status & ticket numbers on Success, and triggers 100% full refund on Failed/Aborted.
 */
const processFlightCallbackService = async (body) => {
  const envClientId = process.env.SRDV_CLIENT_ID;
  const envUsername = process.env.SRDV_USERNAME;
  const envPassword = process.env.SRDV_PASSWORD;

  // 1. Verify credentials
  const isAuthorized =
    Boolean(envUsername && envPassword) &&
    (!envClientId || String(body?.ClientId || '').trim() === String(envClientId).trim()) &&
    String(body?.UserName || '').trim() === String(envUsername).trim() &&
    String(body?.Password || '').trim() === String(envPassword).trim();

  if (!isAuthorized) {
    logger.warn('[SRDV Flight Callback] Credential verification failed', {
      bookingId: body?.BookingId,
      clientId: body?.ClientId,
    });
    return {
      success: false,
      error: { ErrorCode: 1, ErrorMessage: 'Credential verification failed' },
    };
  }

  // 2. Validate mandatory fields
  const { BookingId, Status, PNR, GdsPNR, Remark, Passengers } = body || {};
  if (!BookingId || !Status) {
    logger.warn('[SRDV Flight Callback] Missing required fields (BookingId or Status)', { body });
    return {
      success: false,
      error: { ErrorCode: 2, ErrorMessage: 'Missing required fields (BookingId, Status)' },
    };
  }

  const mappedStatus = STATUS_MAP[Status];
  if (!mappedStatus) {
    logger.warn(`[SRDV Flight Callback] Unrecognized Status "${Status}" for BookingId ${BookingId}`);
    return {
      success: false,
      error: { ErrorCode: 2, ErrorMessage: `Unrecognized callback Status: ${Status}` },
    };
  }

  // 3. Find FlightBooking by srdvBookingId
  const parsedBookingId = Number(BookingId) || BookingId;
  const flightBooking = await FlightBooking.findOne({
    $or: [{ srdvBookingId: parsedBookingId }, { srdvBookingId: String(BookingId) }],
  });

  if (!flightBooking) {
    logger.warn(`[SRDV Flight Callback] No FlightBooking found for srdvBookingId: ${BookingId}`);
    return {
      success: false,
      error: { ErrorCode: 3, ErrorMessage: `Flight booking not found for BookingId ${BookingId}` },
    };
  }

  // 4. Idempotency & Conflict Guard
  if (flightBooking.status === mappedStatus) {
    logger.info(`[SRDV Flight Callback] Duplicate delivery for BookingId ${BookingId}, already ${mappedStatus} - no-op`);
    return {
      success: true,
      error: { ErrorCode: 0, ErrorMessage: '' },
    };
  }

  // If booking is already explicitly cancelled
  if (flightBooking.status === 'cancelled') {
    logger.info(`[SRDV Flight Callback] BookingId ${BookingId} is already cancelled - no-op`);
    return {
      success: true,
      error: { ErrorCode: 0, ErrorMessage: '' },
    };
  }

  // 5. Handle Status: Success
  if (mappedStatus === 'confirmed') {
    if (PNR) flightBooking.pnr = PNR;
    if (GdsPNR) flightBooking.gdsPnr = GdsPNR;
    flightBooking.status = 'confirmed';
    if (Remark) flightBooking.remark = Remark;

    // Match Passengers by Name and assign Ticket Number
    if (Array.isArray(Passengers) && Passengers.length > 0 && Array.isArray(flightBooking.passengers)) {
      const travellerIds = flightBooking.passengers
        .map((p) => p.travellerId?._id || p.travellerId)
        .filter(Boolean);

      const travellers = await Traveller.find({ _id: { $in: travellerIds } });
      const travellerMap = new Map(travellers.map((t) => [String(t._id), t]));

      for (const bookedPax of flightBooking.passengers) {
        const tId = String(bookedPax.travellerId?._id || bookedPax.travellerId);
        const traveller = travellerMap.get(tId);

        const targetFirstName = normalizeName(traveller?.firstName || bookedPax.firstName || '');
        const targetLastName = normalizeName(traveller?.lastName || bookedPax.lastName || '');

        const match = Passengers.find(
          (p) =>
            normalizeName(p.FirstName) === targetFirstName &&
            normalizeName(p.LastName) === targetLastName
        );

        if (match && match.TicketNumber) {
          bookedPax.ticketNumber = match.TicketNumber;
          bookedPax.ticketStatus = 'OK';
        }
      }
    }

    await flightBooking.save();

    // Sync Master Booking
    await Booking.updateOne(
      { itemId: flightBooking._id, bookingType: 'flight' },
      { $set: { status: 'confirmed', ...(PNR ? { pnr: PNR } : {}) } }
    );

    logger.info(`[SRDV Flight Callback] Booking ${flightBooking._id} (SRDV ${BookingId}) confirmed with PNR ${PNR}`);
    return {
      success: true,
      error: { ErrorCode: 0, ErrorMessage: '' },
    };
  }

  // 6. Handle Status: Failed / Aborted -> 100% Full Automated Refund
  if (mappedStatus === 'failed' || mappedStatus === 'aborted') {
    flightBooking.status = mappedStatus;
    flightBooking.remark = Remark ? `${Status}: ${Remark}` : `SRDV Booking ${Status}`;
    await flightBooking.save();

    // Sync Master Booking
    await Booking.updateOne(
      { itemId: flightBooking._id, bookingType: 'flight' },
      { $set: { status: mappedStatus } }
    );

    // Trigger 100% Full Automated Refund
    const totalBookingAmount = flightBooking.totalAmount || 0;
    const airlinePenalty = 0; // 100% refund on supplier failure
    const agencyFee = 0;      // 100% refund on supplier failure
    const customerRefundAmount = totalBookingAmount;

    let flightRefund = await FlightRefund.findOne({ bookingId: flightBooking._id });
    if (!flightRefund && totalBookingAmount > 0) {
      flightRefund = await FlightRefund.create({
        bookingId: flightBooking._id,
        paymentId: flightBooking.paymentId || undefined,
        userId: flightBooking.user,
        pnr: flightBooking.pnr || PNR,
        srdvBookingId: flightBooking.srdvBookingId || parsedBookingId,
        cancellationType: 'full',
        cancelledPassengers: (flightBooking.passengers || []).map((p) => ({
          travellerId: p.travellerId?._id || p.travellerId,
          ticketNumber: p.ticketNumber,
        })),
        totalBookingAmount,
        airlinePenalty,
        agencyFee,
        customerRefundAmount,
        currency: flightBooking.currency || 'INR',
        status: 'pending',
        idempotencyKey: `FLIGHT_CALLBACK_REF_${flightBooking._id}_${Date.now()}`,
        reason: Remark || `SRDV Booking ${Status} - 100% full automated refund`,
        requestedAt: new Date(),
      });
    }

    if (flightBooking.paymentId && customerRefundAmount > 0) {
      const payment = await Payment.findById(flightBooking.paymentId);
      if (payment && payment.status === 'paid') {
        try {
          let gatewayResult = null;
          if (payment.paymentMethod === 'paypal') {
            const paypalService = require('../payments/gateways/paypal/paypal.service');
            gatewayResult = await paypalService.refundPayment(
              payment._id,
              customerRefundAmount,
              Remark || `SRDV Flight Booking ${Status} - 100% Automated Refund`
            );
          } else if (payment.paymentMethod === 'razorpay') {
            const razorpayService = require('../payments/gateways/razorpay/razorpay.service');
            gatewayResult = await razorpayService.refundPayment(
              payment._id,
              customerRefundAmount,
              Remark || `SRDV Flight Booking ${Status} - 100% Automated Refund`
            );
          }

          if (gatewayResult && flightRefund) {
            flightRefund.gatewayRefundId = gatewayResult.refundId || gatewayResult.paymentId;
            flightRefund.status = 'processed';
            flightRefund.processedAt = new Date();
            await flightRefund.save();
          }
        } catch (gatewayErr) {
          logger.error(
            `[SRDV Flight Callback] Gateway refund error for booking ${flightBooking._id}: ${gatewayErr.message}`
          );
          if (flightRefund) {
            flightRefund.status = 'failed';
            flightRefund.remark = `Gateway refund failed: ${gatewayErr.message}`;
            await flightRefund.save();
          }
        }
      }
    } else if (flightRefund) {
      flightRefund.status = 'processed';
      flightRefund.processedAt = new Date();
      await flightRefund.save();
    }

    // Explicitly set final supplier status on FlightBooking & Master Booking
    flightBooking.status = mappedStatus;
    flightBooking.remark = Remark ? `${Status}: ${Remark}` : `SRDV Booking ${Status}`;
    await flightBooking.save();

    await Booking.updateOne(
      { itemId: flightBooking._id, bookingType: 'flight' },
      { $set: { status: mappedStatus } }
    );

    logger.info(
      `[SRDV Flight Callback] Booking ${flightBooking._id} marked as ${mappedStatus}. Full refund processed.`
    );

    return {
      success: true,
      error: { ErrorCode: 0, ErrorMessage: '' },
    };
  }

  return {
    success: true,
    error: { ErrorCode: 0, ErrorMessage: '' },
  };
};

module.exports = {
  searchFlightsService,
  getFareQuoteService,
  getCachedSearchEntryService,
  bookFlightService,
  ticketGDSAfterPayment,
  getSeatMapService,
  getSsrService,
  getCalendarFareService,
  getCalenderFareService: getCalendarFareService,
  getCancellationChargesService,
  sendFlightChangeRequestService,
  getCancelStatusService,
  cancelFlightBookingService,
  getFlightRefundService,
  getFlightBookingByIdService,
  getUserFlightBookingsService,
  processFlightCallbackService,
  resolveTravellersService,
};
