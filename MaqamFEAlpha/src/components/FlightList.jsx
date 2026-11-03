import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import CommonHeader from "./CommonHeader";
import {
  PlaneTakeoff,
  PlaneLanding,
  Plane,
  Clock,
  Luggage,
  CheckCircle,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";
import FlightSearch from "../pages/Flight";
import HotelSearch from "../pages/HotelSearch";
import CommonFlightHotelSearchBox from "./commonflighthotelsearchbox/CommonFlightHotelSearchBox";
import { fetchFlights, getFareQuote } from "./reducer/FlightSearchSlice";
import FlightLoader from "./loader/FlightLoader";
import MoreFlightDetails from "./modal/MoreFlightDetails";
import ViewPricesModal from "./modal/ViewPricesModal";
import api from "./stores/api";
import { toast } from "react-toastify";
import AnimatedNumber from "./shared/AnimatedNumber";
import AnimatedFlightRoute from "./flights/AnimatedFlightRoute";
import { staggerEntrance, clickSquash } from "../animations/presets";
import { INTERNATIONAL_AIRPORTS } from "../utils/airportLocator";

const formatDate = (date) => {
  if (typeof date === "string") {
    const isoDate = date.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (isoDate) return isoDate;
  }

  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};

const getBaseDate = (departDateStr) => {
  const todayStr = formatDate(new Date());
  if (!departDateStr) return todayStr;
  const depart = formatDate(departDateStr);
  return depart && depart < todayStr ? depart : todayStr;
};

const buildFallbackDates = (baseDate, count = 120) => {
  const start = new Date(`${baseDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return [];
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date: formatDate(date), fare: null };
  });
};

const addDays = (date, days) => {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return formatDate(value);
};

const getTripLength = (departureDate, returnDate) => {
  if (!departureDate || !returnDate) return 0;
  const departure = new Date(`${departureDate}T00:00:00`);
  const returning = new Date(`${returnDate}T00:00:00`);
  return Math.max(0, Math.round((returning - departure) / 86400000));
};

const getFlightNetFare = (f) => {
  if (!f) return 0;
  if (f.netFare !== undefined && f.netFare !== null && !isNaN(Number(f.netFare))) {
    return Number(f.netFare);
  }
  const fare0 = f.fares?.[0]?.totalAmount;
  if (fare0 !== undefined && fare0 !== null && !isNaN(Number(fare0))) {
    return Number(fare0);
  }
  const total = f.totalAmount;
  if (total !== undefined && total !== null && !isNaN(Number(total))) {
    return Number(total);
  }
  return 0;
};

const getFlightUnitFare = (f) => {
  if (!f) return 0;
  const net = getFlightNetFare(f);
  if (!net) return 0;
  return Math.round(net);
};

const FlightCard = () => {
  const navigate = useNavigate();
  const dateStripRef = useRef(null);
  const { state } = useLocation();
  const dispatch = useDispatch();
  const { flightsData, loading, error } = useSelector(
    (state) => state.flightSearch,
  );

  const [_searchRefreshKey, setSearchRefreshKey] = useState(0);

  const searchParams = (() => {
    try {
      return (
        state?.flights?.[0]?.searchFlights ||
        JSON.parse(localStorage.getItem("flightSearch")) ||
        {}
      );
    } catch {
      return {};
    }
  })();

  const searchPax = searchParams.passengers || {};
  const adultCount = Math.max(
    1,
    Number(searchPax.adults ?? searchPax.adult ?? 1),
  );
  const childCount = Math.max(
    0,
    Number(searchPax.children ?? searchPax.child ?? 0),
  );
  const infantCount = Math.max(
    0,
    Number(searchPax.infants ?? searchPax.infant ?? 0),
  );
  const totalPassengerCount = adultCount + childCount + infantCount;
  const paxMultiplier = adultCount + childCount * 0.75 + infantCount * 0.1;

  const routeOrigin = searchParams.origin;
  const routeDest = searchParams.destination;
  const routeJourneyType = searchParams.journeyType;
  const routeReturnDate = searchParams.returnDate;
  const routeDepartureDate = searchParams.departureDate;

  const outboundFlights =
    flightsData?.data?.data?.outbound ||
    flightsData?.data?.outbound ||
    flightsData?.outbound ||
    [];

  const rawInboundFlights =
    flightsData?.data?.data?.inbound ||
    flightsData?.data?.inbound ||
    flightsData?.inbound ||
    [];

  const normalizedJourneyType = useMemo(() => {
    const raw = String(routeJourneyType || "").toLowerCase().trim();
    if (raw.includes("round")) return "roundtrip";
    if (raw.includes("multi")) return "multicity";
    if (raw.includes("one")) return "oneway";
    return raw;
  }, [routeJourneyType]);

  const isMultiCity = normalizedJourneyType === "multicity";
  const isRoundTrip =
    normalizedJourneyType === "roundtrip" ||
    (!["oneway", "multicity"].includes(normalizedJourneyType) &&
      Boolean(routeReturnDate));

  const inboundFlights = !isRoundTrip ? [] : rawInboundFlights;

  const [rawActiveLeg, setActiveLeg] = useState("outbound");
  const [selectedOutbound, setSelectedOutbound] = useState(null);
  const [rawSelectedInbound, setSelectedInbound] = useState(null);

  const activeLeg = isRoundTrip ? rawActiveLeg : "outbound";
  const selectedInbound = isRoundTrip ? rawSelectedInbound : null;

  const flightsdata =
    isRoundTrip && activeLeg === "inbound" ? inboundFlights : outboundFlights;

  const traceId =
    flightsData?.data?.data?.traceId ||
    flightsData?.data?.traceId ||
    flightsData?.traceId;

  const getFlightFare = useCallback(
    (f) => {
      if (!f) return 0;
      if (f.selectedTier?.price) return Number(f.selectedTier.price);
      const unit = getFlightUnitFare(f);
      return Math.round(unit * (paxMultiplier || 1));
    },
    [paxMultiplier],
  );

  const maxPrice =
    flightsdata.length > 0
      ? Math.max(...flightsdata.map((f) => getFlightFare(f)))
      : 0;

  const minPrice =
    flightsdata.length > 0
      ? Math.min(...flightsdata.map((f) => getFlightFare(f)))
      : 0;

  const [selected, setSelected] = useState([]);
  const [selectedStops, setSelectedStops] = useState([]);
  const [openAirline, setOpenAirline] = useState(true);
  const [openTimePrice, setOpenTimePrice] = useState(true);
  const [openStopage, setOpenStopage] = useState(true);
  const [openFareQuote, setOpenFareQuote] = useState(false);
  const [selectedFlightForModal, setSelectedFlightForModal] = useState(null);
  const [openViewPrices, setOpenViewPrices] = useState(false);
  const [selectedFlightForPrices, setSelectedFlightForPrices] = useState(null);
  const [departure, setDeparture] = useState(24);
  const [arrival, setArrival] = useState(24);
  const [userPriceFilter, setPrice] = useState(null);
  const price =
    userPriceFilter !== null && maxPrice > 0 && userPriceFilter <= maxPrice
      ? userPriceFilter
      : maxPrice;

  const defaultDepartureDate =
    formatDate(routeDepartureDate) || formatDate(new Date());
  const [selectedActiveDate, setActiveDate] = useState("");
  const activeDate = selectedActiveDate || defaultDepartureDate;

  const [calendarDates, setCalendarDates] = useState(() =>
    buildFallbackDates(getBaseDate(defaultDepartureDate), 120),
  );

  const isFlightSelected = (f) => {
    if (!f) return false;
    const currentSelected =
      activeLeg === "outbound" ? selectedOutbound : selectedInbound;
    if (!currentSelected) return false;
    const curIdx =
      currentSelected.resultIndex || currentSelected.fares?.[0]?.resultIndex;
    const fIdx = f.resultIndex || f.fares?.[0]?.resultIndex;
    return Boolean(curIdx && fIdx && curIdx === fIdx);
  };

  const handleBookFlights = async () => {
    const hasOutbound = Boolean(selectedOutbound);
    const hasInbound = Boolean(selectedInbound);

    if (!hasOutbound && !hasInbound) {
      toast.warning(
        "Please select at least one flight to proceed with booking.",
      );
      return;
    }

    if (isRoundTrip && (!hasOutbound || !hasInbound)) {
      if (!hasOutbound) {
        toast.warning("Please select a departure flight.");
        setActiveLeg("outbound");
        return;
      }
      if (!hasInbound) {
        toast.warning(
          "Please select a return flight to complete your round trip booking.",
        );
        setActiveLeg("inbound");
        return;
      }
    }

    const isBoth = hasOutbound && hasInbound;
    const primaryFlight = selectedOutbound || selectedInbound;
    const secFlight = isBoth ? selectedInbound : null;

    const outResultIndex = String(
      selectedOutbound?.selectedTier?.resultIndex ||
        selectedOutbound?.resultIndex ||
        selectedOutbound?.fares?.[0]?.resultIndex ||
        "",
    ).trim();
    const inResultIndex = String(
      selectedInbound?.selectedTier?.resultIndex ||
        selectedInbound?.resultIndex ||
        selectedInbound?.fares?.[0]?.resultIndex ||
        "",
    ).trim();

    const combinedResultIndex = isBoth
      ? [outResultIndex, inResultIndex].filter(Boolean)
      : outResultIndex || inResultIndex;

    const resolvedTraceId = String(
      traceId ||
        flightsData?.data?.data?.traceId ||
        flightsData?.data?.traceId ||
        flightsData?.traceId ||
        primaryFlight?.traceId ||
        "",
    ).trim();

    const primaryResultIndex = outResultIndex || inResultIndex;
    let verifiedQuote =
      primaryFlight?.selectedTier?.verifiedFareQuote ||
      primaryFlight?.verifiedFareQuote ||
      null;

    if (!verifiedQuote && resolvedTraceId && primaryResultIndex && !primaryFlight?.isInHouse) {
      try {
        const res = await dispatch(
          getFareQuote({
            traceId: resolvedTraceId,
            resultIndex: primaryResultIndex,
          }),
        ).unwrap();
        verifiedQuote = res?.data || res;
      } catch (err) {
        toast.error(
          typeof err === "string"
            ? err
            : err?.message || "Failed to verify live fare quote. Please try again.",
        );
        return;
      }
    }

    const quoteBaseFare = Number(
      verifiedQuote?.fare?.baseFare ?? verifiedQuote?.BaseFare ?? 0,
    );
    const quoteTaxes = Number(
      verifiedQuote?.fare?.tax ??
        verifiedQuote?.fare?.taxes ??
        verifiedQuote?.Tax ??
        0,
    );
    const quoteTotal =
      Number(
        verifiedQuote?.fare?.offeredFare ||
          verifiedQuote?.fare?.publishedFare ||
          verifiedQuote?.OfferedFare ||
          verifiedQuote?.PublishedFare ||
          0,
      ) || quoteBaseFare + quoteTaxes;

    const outUnit =
      quoteTotal > 0
        ? Math.round(quoteTotal)
        : selectedOutbound?.selectedTier?.unitPrice ??
          getFlightUnitFare(selectedOutbound);
    const inUnit =
      selectedInbound?.selectedTier?.unitPrice ??
      getFlightUnitFare(selectedInbound);
    const outTotal =
      quoteTotal > 0
        ? Math.round(quoteTotal * (paxMultiplier || 1))
        : selectedOutbound?.selectedTier?.price ??
          getFlightFare(selectedOutbound);
    const inTotal =
      selectedInbound?.selectedTier?.price ?? getFlightFare(selectedInbound);
    const totalFare = outTotal + inTotal;
    const totalUnit = outUnit + inUnit;

    const outTier = selectedOutbound?.selectedTier?.title || "Saver Fare";
    const inTier = selectedInbound?.selectedTier?.title || "Saver Fare";
    const tierTitle = isBoth
      ? `${outTier} + ${inTier}`
      : selectedOutbound
        ? outTier
        : inTier;

    const bookingState = {
      traceId: resolvedTraceId,
      resultIndex: combinedResultIndex,
      selectedFareTier: tierTitle,
      verifiedFareQuote: verifiedQuote,
      flight: primaryFlight
        ? {
            ...primaryFlight,
            resultIndex: primaryResultIndex || primaryFlight.resultIndex,
            netFare: getFlightNetFare(primaryFlight) || outUnit,
            retailFare: outUnit,
          }
        : null,
      returnFlight: secFlight
        ? {
            ...secFlight,
            resultIndex: inResultIndex || secFlight.resultIndex,
            netFare: getFlightNetFare(secFlight) || inUnit,
            retailFare: inUnit,
          }
        : null,
      isRoundTrip: isBoth,
      passengers: {
        adults: adultCount,
        children: childCount,
        infants: infantCount,
      },
      selectedTier: {
        id: isBoth ? "roundtrip-saver" : "flight-saver",
        title: tierTitle,
        resultIndex: primaryResultIndex,
        priceMultiplier: 1,
        unitPrice: totalUnit,
        price: totalFare,
        verifiedFareQuote: verifiedQuote,
      },
      timestamp: Date.now(),
    };

    let cleanBookingState;
    try {
      cleanBookingState = JSON.parse(JSON.stringify(bookingState));
      sessionStorage.setItem(
        "selectedFlightBooking",
        JSON.stringify(cleanBookingState),
      );
      localStorage.setItem(
        "selectedFlightBooking",
        JSON.stringify(cleanBookingState),
      );
    } catch (e) {
      console.warn("Could not cache flight booking:", e);
      cleanBookingState = bookingState;
    }

    navigate("/fare-quote-details", {
      state: cleanBookingState,
    });
  };

  const handleDirectBook = async (f) => {
    const fIdx = String(
      f?.selectedTier?.resultIndex ||
        f?.resultIndex ||
        f?.fares?.[0]?.resultIndex ||
        "",
    ).trim();
    const resolvedTraceId = String(
      traceId ||
        flightsData?.data?.data?.traceId ||
        flightsData?.data?.traceId ||
        flightsData?.traceId ||
        f?.traceId ||
        "",
    ).trim();

    let verifiedQuote =
      f?.selectedTier?.verifiedFareQuote || f?.verifiedFareQuote || null;

    if (!verifiedQuote && resolvedTraceId && fIdx && !f?.isInHouse) {
      try {
        const res = await dispatch(
          getFareQuote({
            traceId: resolvedTraceId,
            resultIndex: fIdx,
          }),
        ).unwrap();
        verifiedQuote = res?.data || res;
      } catch (err) {
        toast.error(
          typeof err === "string"
            ? err
            : err?.message || "Failed to verify live fare quote. Please try again.",
        );
        return;
      }
    }

    const quoteBaseFare = Number(
      verifiedQuote?.fare?.baseFare ?? verifiedQuote?.BaseFare ?? 0,
    );
    const quoteTaxes = Number(
      verifiedQuote?.fare?.tax ??
        verifiedQuote?.fare?.taxes ??
        verifiedQuote?.Tax ??
        0,
    );
    const quoteTotal =
      Number(
        verifiedQuote?.fare?.offeredFare ||
          verifiedQuote?.fare?.publishedFare ||
          verifiedQuote?.OfferedFare ||
          verifiedQuote?.PublishedFare ||
          0,
      ) || quoteBaseFare + quoteTaxes;

    const unitFare =
      quoteTotal > 0
        ? Math.round(quoteTotal)
        : f?.selectedTier?.unitPrice ?? getFlightUnitFare(f);
    const totalFare =
      quoteTotal > 0
        ? Math.round(quoteTotal * (paxMultiplier || 1))
        : f?.selectedTier?.price ?? Math.round(unitFare * (paxMultiplier || 1));
    const netUnit = getFlightNetFare(f) || unitFare;

    const bookingState = {
      traceId: resolvedTraceId,
      resultIndex: fIdx,
      selectedFareTier: f?.selectedTier?.title || "Saver Fare",
      verifiedFareQuote: verifiedQuote,
      flight: {
        ...f,
        resultIndex: fIdx || f?.resultIndex,
        netFare: netUnit,
        retailFare: unitFare,
      },
      returnFlight: null,
      isRoundTrip: false,
      passengers: {
        adults: adultCount,
        children: childCount,
        infants: infantCount,
      },
      selectedTier: {
        id: f?.selectedTier?.id || "saver",
        title: f?.selectedTier?.title || "Saver Fare",
        resultIndex: fIdx,
        priceMultiplier: f?.selectedTier?.priceMultiplier || 1,
        unitPrice: unitFare,
        price: totalFare,
        verifiedFareQuote: verifiedQuote,
      },
      timestamp: Date.now(),
    };

    let cleanBookingState;
    try {
      cleanBookingState = JSON.parse(JSON.stringify(bookingState));
      sessionStorage.setItem(
        "selectedFlightBooking",
        JSON.stringify(cleanBookingState),
      );
      localStorage.setItem(
        "selectedFlightBooking",
        JSON.stringify(cleanBookingState),
      );
    } catch (e) {
      console.warn("Could not cache flight booking:", e);
      cleanBookingState = bookingState;
    }

    navigate("/fare-quote-details", {
      state: cleanBookingState,
    });
  };

  const [showPriceTooltip, setShowPriceTooltip] = useState(false);
  const [showDepartureTimeTooltip, setShowDepartureTimeTooltip] =
    useState(false);
  const [showArrivalTimeTooltip, setShowArrivalTimeTooltip] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    let active = true;
    const departureDate =
      formatDate(routeDepartureDate) || formatDate(new Date());
    const baseDate = getBaseDate(departureDate);
    const initialDates = buildFallbackDates(baseDate, 120);

    const loadCalendarFares = async () => {
      if (!routeOrigin || !routeDest) {
        if (active) setCalendarDates(initialDates);
        return;
      }

      // Check if route is international (SRDV sandbox only supports domestic India for calendar fares)
      const origCode = String(routeOrigin).trim().toUpperCase();
      const destCode = String(routeDest).trim().toUpperCase();
      const origAirport = INTERNATIONAL_AIRPORTS.find((a) => a.iataCode === origCode);
      const destAirport = INTERNATIONAL_AIRPORTS.find((a) => a.iataCode === destCode);
      const isDomesticIndianRoute =
        (!origAirport || origAirport.countryCode === "IN") &&
        (!destAirport || destAirport.countryCode === "IN");

      // Circuit breaker check: if previously 502/unsupported in this session, skip API calls
      const isCalDisabled = sessionStorage.getItem("srdv_cal_fare_disabled") === "true";

      if (!isDomesticIndianRoute || isCalDisabled) {
        if (active) setCalendarDates(initialDates);
        return;
      }

      if (active) setCalendarDates(initialDates);

      const fareDates = new Map();
      const tripLength = getTripLength(
        departureDate,
        formatDate(routeReturnDate),
      );

      try {
        // Step 1: Probe with offset 0 first to prevent 4 simultaneous 502 errors
        const firstRes = await api.post("/api/v1/flights/calendar-fare", {
          origin: routeOrigin,
          destination: routeDest,
          departDate: addDays(baseDate, 0),
          returnDate:
            normalizedJourneyType === "roundtrip"
              ? addDays(baseDate, tripLength)
              : null,
          journeyType:
            normalizedJourneyType === "roundtrip" ? "roundtrip" : "oneway",
          fareType: 1,
        });

        const firstFares = firstRes?.data?.data?.results || [];
        firstFares.forEach((item) => {
          const date = formatDate(item.departureDate);
          const fare = Number(item.totalAmount ?? item.fare ?? 0);
          if (!date || !fare) return;
          fareDates.set(date, {
            date,
            fare,
            lowFare: Boolean(item.isLowestFareOfMonth),
          });
        });

        // Step 2: Since offset 0 succeeded, fetch remaining offsets in parallel
        const remainingOffsets = [30, 60, 90];
        const remainingRequests = remainingOffsets.map((offset) =>
          api
            .post("/api/v1/flights/calendar-fare", {
              origin: routeOrigin,
              destination: routeDest,
              departDate: addDays(baseDate, offset),
              returnDate:
                normalizedJourneyType === "roundtrip"
                  ? addDays(addDays(baseDate, offset), tripLength)
                  : null,
              journeyType:
                normalizedJourneyType === "roundtrip" ? "roundtrip" : "oneway",
              fareType: 1,
            })
            .catch(() => null),
        );

        const responses = await Promise.allSettled(remainingRequests);
        if (!active) return;

        responses.forEach((result) => {
          if (result.status !== "fulfilled") return;
          const fares = result.value?.data?.data?.results || [];
          fares.forEach((item) => {
            const date = formatDate(item.departureDate);
            const fare = Number(item.totalAmount ?? item.fare ?? 0);
            if (!date || !fare) return;

            const current = fareDates.get(date);
            if (!current || fare < current.fare) {
              fareDates.set(date, {
                date,
                fare,
                lowFare: Boolean(item.isLowestFareOfMonth),
              });
            }
          });
        });

        const mergedDates = initialDates.map(
          (date) => fareDates.get(date.date) || date,
        );
        setCalendarDates(mergedDates);
      } catch (err) {
        // If upstream SRDV throws 502 or calendar-fare is disabled in sandbox,
        // trigger circuit breaker for current session to prevent repeating 502 calls
        const status = err?.response?.status;
        if (status === 502 || status === 400 || status === 500) {
          sessionStorage.setItem("srdv_cal_fare_disabled", "true");
        }
        if (active) setCalendarDates(initialDates);
      }
    };

    loadCalendarFares();

    return () => {
      active = false;
    };
  }, [
    routeOrigin,
    routeDest,
    normalizedJourneyType,
    routeReturnDate,
    routeDepartureDate,
  ]);

  useEffect(() => {
    if (dateStripRef.current && activeDate) {
      const activeEl = dateStripRef.current.querySelector(
        `[data-date="${activeDate}"]`,
      );
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [activeDate, calendarDates.length]);

  const scrollDates = (direction) => {
    if (dateStripRef.current) {
      const scrollAmount = Math.max(
        240,
        dateStripRef.current.clientWidth * 0.75,
      );
      dateStripRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const effectivePrice = price > 0 ? price : maxPrice;

  // Percentage of slider
  const percentage =
    maxPrice > minPrice
      ? ((effectivePrice - minPrice) / (maxPrice - minPrice)) * 100
      : 100;

  const stopOptions = useMemo(() => {
    let nonStop = 0;
    let oneStop = 0;
    (flightsdata || []).forEach((flight) => {
      const stops = Math.max(0, (flight.segments?.length || 1) - 1);
      if (stops === 0) nonStop++;
      else if (stops === 1) oneStop++;
    });
    return [
      { stop: 0, label: "Non Stop", count: nonStop },
      { stop: 1, label: "1 Stop", count: oneStop },
    ];
  }, [flightsdata]);

  const handleToggleStop = (stopValue) => {
    setSelectedStops((prev) =>
      prev.includes(stopValue)
        ? prev.filter((s) => s !== stopValue)
        : [...prev, stopValue]
    );
  };

  const handleResetFilters = () => {
    setSelected([]);
    setSelectedStops([]);
    setDeparture(24);
    setArrival(24);
    setPrice(null);
  };

  const activeFiltersCount =
    selected.length +
    selectedStops.length +
    (departure < 24 ? 1 : 0) +
    (arrival < 24 ? 1 : 0) +
    (price < maxPrice && price > 0 ? 1 : 0);

  const filteredFlights = useMemo(() => {
    return (flightsdata || []).filter((flight) => {
      const segments = flight.segments || [];
      const firstSegment = segments[0];
      const lastSegment = segments[segments.length - 1] || firstSegment;

      if (!firstSegment) return false;

      // 1. Airline filter
      if (selected.length > 0) {
        const matchesAirline = segments.some((seg) =>
          selected.includes(seg?.airlineCode)
        );
        if (!matchesAirline) return false;
      }

      // 2. Stops filter (Non Stop = 0, 1 Stop = 1)
      const stopsCount = Math.max(0, segments.length - 1);
      if (selectedStops.length > 0) {
        const matchesStop = selectedStops.some((s) => {
          if (s === 0) return stopsCount === 0;
          if (s === 1) return stopsCount === 1;
          return false;
        });
        if (!matchesStop) return false;
      }

      // 3. Departure hour filter
      let departureHour = NaN;
      if (firstSegment.departure) {
        if (firstSegment.departure.includes("T")) {
          departureHour = parseInt(
            firstSegment.departure.split("T")[1]?.slice(0, 2),
            10
          );
        } else {
          const d = new Date(firstSegment.departure);
          if (!isNaN(d)) departureHour = d.getHours();
        }
      }
      if (!isNaN(departureHour) && departureHour > departure) {
        return false;
      }

      // 4. Arrival hour filter (based on final destination arrival!)
      let arrivalHour = NaN;
      if (lastSegment.arrival) {
        if (lastSegment.arrival.includes("T")) {
          arrivalHour = parseInt(
            lastSegment.arrival.split("T")[1]?.slice(0, 2),
            10
          );
        } else {
          const d = new Date(lastSegment.arrival);
          if (!isNaN(d)) arrivalHour = d.getHours();
        }
      }
      if (!isNaN(arrivalHour) && arrivalHour > arrival) {
        return false;
      }

      // 5. Price filter
      const flightPrice = getFlightFare(flight);
      if (effectivePrice > 0 && flightPrice > Number(effectivePrice)) {
        return false;
      }

      return true;
    });
  }, [
    flightsdata,
    selected,
    selectedStops,
    departure,
    arrival,
    effectivePrice,
    getFlightFare,
  ]);

  const airlines = Object.values(
    flightsdata.reduce((acc, flight) => {
      flight.segments?.forEach((segment) => {
        if (!segment) return;

        const { airline, airlineCode } = segment;
        if (!airlineCode) return;

        const key = airlineCode.trim().toUpperCase();

        if (!acc[key]) {
          acc[key] = {
            airlineCode,
            airline: key === "6E" ? "IndiGo" : airline,
            count: 0,
          };
        }
        acc[key].count++;
      });

      return acc;
    }, {}),
  );

  // Pagination Configuration & State (20 flights per page)
  const FLIGHTS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const flightListSectionRef = useRef(null);

  // Adjust to page 1 whenever filters or active legs change
  const filterKey = `${selected.join(",")}_${selectedStops.join(",")}_${departure}_${arrival}_${effectivePrice}_${activeLeg}_${flightsdata?.length || 0}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setCurrentPage(1);
  }

  const totalFlights = filteredFlights.length;
  const totalPages = Math.max(1, Math.ceil(totalFlights / FLIGHTS_PER_PAGE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedFlights = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * FLIGHTS_PER_PAGE;
    return filteredFlights.slice(startIndex, startIndex + FLIGHTS_PER_PAGE);
  }, [filteredFlights, safeCurrentPage]);

  const startFlightIndex =
    totalFlights === 0 ? 0 : (safeCurrentPage - 1) * FLIGHTS_PER_PAGE + 1;
  const endFlightIndex = Math.min(
    safeCurrentPage * FLIGHTS_PER_PAGE,
    totalFlights,
  );

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (safeCurrentPage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [
      1,
      "...",
      safeCurrentPage - 1,
      safeCurrentPage,
      safeCurrentPage + 1,
      "...",
      totalPages,
    ];
  }, [safeCurrentPage, totalPages]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === safeCurrentPage) return;
    setCurrentPage(newPage);
    if (flightListSectionRef.current) {
      flightListSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else {
      window.scrollTo({ top: 380, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (!loading && paginatedFlights?.length > 0) {
      staggerEntrance(".flight-card-container", {
        stagger: 45,
        startDelay: 30,
      });
    }
  }, [loading, paginatedFlights?.length, activeLeg, safeCurrentPage]);

  const handleCheckbox = (id) => {
    console.log("Check", id);
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleDateSelect = (date) => {
    setActiveDate(date);
    const nextSearch = { ...searchParams, departureDate: date };
    localStorage.setItem("flightSearch", JSON.stringify(nextSearch));
    dispatch(fetchFlights(nextSearch));
  };

  return (
    <>
      <CommonHeader title="Flight" value={false} />
      {/* Flight Search Card (Responsive across mobile, tablet, and desktop) */}
      <div className="relative z-40 bg-slate-100/95 backdrop-blur-md border-b border-gray-200/80 shadow-2xs mt-16 sm:mt-20">
        <CommonFlightHotelSearchBox
          headerChange={true}
          departureDate={activeDate}
          onSearchSuccess={() => {
            setActiveDate("");
            setSearchRefreshKey((prev) => prev + 1);
          }}
        />
      </div>

      <div
        className={`max-w-[1400px] w-full mx-auto px-3 sm:px-6 pt-6 ${isRoundTrip ? "pb-32" : "pb-12"}`}
      >
        {/* Mobile & Tablet Filter Icon Bar */}
        <div className="flex justify-between items-center lg:hidden  mb-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              {filteredFlights?.length || 0} Flights Available
            </h2>
            <p className="text-xs text-gray-500">
              {selected.length > 0
                ? `${selected.length} filter(s) applied`
                : "Filter by airline, price & time"}
            </p>
          </div>
          <button
            onClick={() => setShowFilter(true)}
            className="flex items-center gap-2 bg-[#00BBA7] hover:bg-[#009b8a] text-white px-4 py-2 rounded-lg font-semibold text-xs transition cursor-pointer shadow-sm"
          >
            <Filter size={16} />
            <span>
              Filters {selected.length > 0 ? `(${selected.length})` : ""}
            </span>
          </button>
        </div>

        {/* Mobile & Tablet Filter Drawer Modal */}
        {showFilter && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs lg:hidden">
            <div className="w-full max-w-xs sm:max-w-sm h-full bg-white p-4 overflow-y-auto flex flex-col justify-between shadow-2xl">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
                  <div className="flex items-center gap-2">
                    <Filter size={18} className="text-[#00BBA7]" />
                    <h2 className="text-lg font-bold text-gray-900">
                      Filter Flights
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowFilter(false)}
                    className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Airlines */}
                <div>
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setOpenAirline(!openAirline)}
                  >
                    <h2 className="text-base font-bold text-gray-900">
                      Airlines
                    </h2>
                    <ChevronUp
                      className={`h-5 w-5 transition-transform ${
                        !openAirline ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                  {openAirline && (
                    <div className="mt-3 space-y-2">
                      {airlines.map((item, idx) => (
                        <div
                          key={`${item.airlineCode}-${idx}`}
                          className="flex items-center justify-between py-1.5 cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selected.includes(item.airlineCode)}
                              onChange={() => handleCheckbox(item.airlineCode)}
                              className="h-4 w-4 rounded border-gray-300 accent-teal-600"
                            />
                            <img
                              src={`https://images.kiwi.com/airlines/64/${item.airlineCode}.png`}
                              alt={item.airline}
                              className="w-6 h-6 object-contain"
                              onError={(e) => {
                                e.target.src =
                                  "https://cdn-icons-png.flaticon.com/512/684/684908.png";
                              }}
                            />
                            <span className="text-xs sm:text-sm text-gray-700">
                              {item.airline}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-gray-700">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-b w-full border-gray-200 my-4" />

                {/* Time & Price */}
                <div>
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setOpenTimePrice(!openTimePrice)}
                  >
                    <h2 className="text-base font-bold text-gray-900">
                      Time and Price
                    </h2>
                    <ChevronUp
                      className={`h-5 w-5 transition-transform duration-300 ${
                        !openTimePrice ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                  {openTimePrice && (
                    <div className="space-y-5 mt-3">
                      <div>
                        <h3 className="mb-2 text-xs font-semibold text-gray-700">
                          Arrival at {searchParams.destination || "Destination"}
                        </h3>
                        <input
                          type="range"
                          min="0"
                          max="24"
                          value={arrival}
                          onChange={(e) => setArrival(Number(e.target.value))}
                          className="w-full accent-teal-600"
                        />
                        <div className="mt-1 flex justify-between text-[11px] text-gray-500">
                          <span>00:00</span>
                          <span>12:00</span>
                          <span>24:00</span>
                        </div>
                      </div>

                      <div>
                        <h3 className="mb-2 text-xs font-semibold text-gray-700">
                          Flight Price
                        </h3>
                        <input
                          type="range"
                          min={minPrice}
                          max={maxPrice}
                          value={price}
                          onChange={(e) => setPrice(Number(e.target.value))}
                          className="w-full cursor-pointer accent-teal-600"
                        />
                        <div className="mt-1 flex justify-between text-xs font-semibold text-gray-700">
                          <span>₹ {minPrice.toLocaleString()}</span>
                          <span>₹ {maxPrice.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-b w-full border-gray-200 my-4" />

                {/* Stops */}
                <div>
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setOpenStopage(!openStopage)}
                  >
                    <h2 className="text-base font-bold text-gray-900">
                      Stops
                    </h2>
                    <ChevronUp
                      className={`h-5 w-5 transition-transform ${
                        !openStopage ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                  {openStopage && (
                    <div className="space-y-2.5 mt-3">
                      <div className="grid grid-cols-2 gap-2">
                        {stopOptions.map((item) => {
                          const isActive = selectedStops.includes(item.stop);
                          return (
                            <button
                              key={item.stop}
                              type="button"
                              onClick={() => handleToggleStop(item.stop)}
                              className={`flex flex-col items-center justify-center py-2 px-1 text-xs rounded-xl font-bold border transition cursor-pointer ${
                                isActive
                                  ? "bg-[#00BBA7] text-white border-[#00BBA7] shadow-xs"
                                  : "border-gray-200 text-gray-700 bg-gray-50 hover:bg-gray-100"
                              }`}
                            >
                              <span>{item.label}</span>
                              <span className={`text-[10px] font-semibold mt-0.5 ${isActive ? "text-white/80" : "text-gray-400"}`}>
                                ({item.count})
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="pt-4 border-t border-gray-200 flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex-1 py-2 px-3 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition cursor-pointer"
                >
                  Reset ({activeFiltersCount})
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilter(false)}
                  className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-[#00BBA7] rounded-lg hover:bg-[#009b8a] transition cursor-pointer shadow-sm"
                >
                  Apply Filters ({filteredFlights.length})
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-80 sticky top-24 self-start z-20">
            <div className="w-full p-4 rounded-xl bg-white border border-gray-200 shadow-sm max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
              {/* Filter Master Header */}
              <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-teal-600" />
                  <span className="font-bold text-gray-900 text-base">Filter Flights</span>
                  {activeFiltersCount > 0 && (
                    <span className="bg-teal-100 text-teal-800 text-[11px] font-extrabold px-2 py-0.5 rounded-full">
                      {activeFiltersCount}
                    </span>
                  )}
                </div>
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs font-bold text-teal-600 hover:text-teal-800 hover:underline cursor-pointer"
                  >
                    Reset all
                  </button>
                )}
              </div>

              {/* Header */}
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setOpenAirline(!openAirline)}
              >
                <h2 className="text-base font-bold text-gray-900">Airlines</h2>

                <ChevronUp
                  className={`h-5 w-5 transition-transform ${
                    !openAirline ? "rotate-180" : ""
                  }`}
                />
              </div>

              {/* List */}
              {openAirline && (
                <div className="mt-4 space-y-3">
                  {airlines.map((item, idx) => (
                    <div
                      key={`${item.airlineCode}-${idx}`}
                      className="flex items-center justify-between py-2 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(item.airlineCode)}
                          onChange={() => handleCheckbox(item.airlineCode)}
                          className="h-5 w-5 rounded border-gray-300 accent-green-600"
                        />
                        <img
                          src={`https://images.kiwi.com/airlines/64/${item.airlineCode}.png`}
                          alt={item.airline}
                          className="w-7 h-7 object-contain"
                          onError={(e) => {
                            e.target.src =
                              "https://cdn-icons-png.flaticon.com/512/684/684908.png";
                          }}
                        />

                        <span className="text-sm sm:text-base text-gray-700">
                          {item.airline}
                        </span>
                      </div>

                      <span className="text-sm font-semibold text-gray-700">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-b w-full border-gray-200 my-4" />
              <div>
                {/* Header */}
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setOpenTimePrice(!openTimePrice)}
                >
                  <h2 className="text-lg font-bold text-gray-900">
                    Time and Price
                  </h2>

                  <ChevronUp
                    className={`h-5 w-5 transition-transform duration-300 ${
                      !openTimePrice ? "rotate-180" : ""
                    }`}
                  />
                </div>

                {openTimePrice && (
                  <div className="space-y-6 mt-4">
                    {/* Departure */}

                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-gray-700">
                        Departure from {searchParams.origin || "Origin"}
                      </h3>

                      <div className="relative">
                        {showDepartureTimeTooltip && (
                          <div
                            className="absolute -top-7 -translate-x-1/2 rounded bg-white px-2 py-1 shadow border text-xs pointer-events-none z-10"
                            style={{ left: `${(departure / 24) * 100}%` }}
                          >
                            {departure < 10 ? `0${departure}` : departure}:00
                          </div>
                        )}

                        <input
                          type="range"
                          min="0"
                          max="24"
                          value={departure}
                          onChange={(e) => setDeparture(Number(e.target.value))}
                          onMouseEnter={() => setShowDepartureTimeTooltip(true)}
                          onMouseLeave={() =>
                            setShowDepartureTimeTooltip(false)
                          }
                          onMouseDown={() => setShowDepartureTimeTooltip(true)}
                          onMouseUp={() => setShowDepartureTimeTooltip(false)}
                          className="w-full accent-blue-500 cursor-pointer"
                        />
                      </div>

                      <div className="mt-2 flex justify-between text-xs text-gray-600">
                        <span>00:00</span>
                        <span>06:00</span>
                        <span>12:00</span>
                        <span>18:00</span>
                        <span>24:00</span>
                      </div>
                    </div>
                    {/* Arrival */}
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-gray-700">
                        Arrival at {searchParams.destination || "Destination"}
                      </h3>

                      <div className="relative">
                        {showArrivalTimeTooltip && (
                          <div
                            className="absolute -top-7 -translate-x-1/2 rounded bg-white px-2 py-1 shadow border text-xs pointer-events-none z-10"
                            style={{ left: `${(arrival / 24) * 100}%` }}
                          >
                            {arrival < 10 ? `0${arrival}` : arrival}:00
                          </div>
                        )}

                        <input
                          type="range"
                          min="0"
                          max="24"
                          value={arrival}
                          onChange={(e) => setArrival(Number(e.target.value))}
                          onMouseEnter={() => setShowArrivalTimeTooltip(true)}
                          onMouseLeave={() => setShowArrivalTimeTooltip(false)}
                          onMouseDown={() => setShowArrivalTimeTooltip(true)}
                          onMouseUp={() => setShowArrivalTimeTooltip(false)}
                          className="w-full accent-blue-500 cursor-pointer"
                        />
                      </div>

                      <div className="mt-2 flex justify-between text-xs text-gray-600">
                        <span>00:00</span>
                        <span>06:00</span>
                        <span>12:00</span>
                        <span>18:00</span>
                        <span>24:00</span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="w-full">
                      <h3 className=" mb-4 text-sm font-bold  text-base">
                        Flight Price
                      </h3>

                      <div className="relative">
                        {/* Tooltip */}
                        {showPriceTooltip && (
                          <div
                            className="absolute -top-7 -translate-x-1/2 text-xs"
                            style={{
                              left: `calc(${percentage}% )`,
                            }}
                          >
                            <div className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-xs font-medium shadow">
                              ₹ {price.toLocaleString()}
                            </div>

                            {/* Arrow */}
                            <div className="mx-auto h-2 w-2 rotate-45 border-r border-b border-gray-300 bg-white -mt-1"></div>
                          </div>
                        )}
                        {/* Slider */}
                        <input
                          type="range"
                          min={minPrice}
                          max={maxPrice}
                          value={price}
                          onChange={(e) => setPrice(Number(e.target.value))}
                          onMouseEnter={() => setShowPriceTooltip(true)}
                          onMouseLeave={() => setShowPriceTooltip(false)}
                          onMouseDown={() => setShowPriceTooltip(true)}
                          onMouseUp={() => setShowPriceTooltip(false)}
                          className="w-full cursor-pointer accent-blue-500"
                        />

                        {/* Min / Max */}
                        <div className="mt-2 flex justify-between text-xs font-semibold text-gray-700">
                          <span>₹ {minPrice.toLocaleString()}</span>
                          <span>₹ {maxPrice.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="border-b w-full border-gray-200 my-4" />
              </div>
              {/* Header */}
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setOpenStopage(!openStopage)}
              >
                <h2 className="text-base font-bold text-gray-900">
                  Stops
                </h2>

                <ChevronUp
                  className={`h-5 w-5 transition-transform ${
                    !openStopage ? "rotate-180" : ""
                  }`}
                />
              </div>
              {openStopage && (
                <div className="space-y-3 mt-4">
                  <div className="space-y-2.5">
                    {stopOptions.map((item) => {
                      const isChecked = selectedStops.includes(item.stop);
                      return (
                        <label
                          key={item.stop}
                          className="flex items-center justify-between cursor-pointer py-1"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleStop(item.stop)}
                              className="h-4 w-4 rounded border-gray-300 accent-teal-600 cursor-pointer"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              {item.label}
                            </span>
                          </div>

                          <span className="text-xs font-semibold text-gray-500">
                            {item.count}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Main Flight Cards Container */}
          <main className="flex-1 w-full min-w-0">
            <div>
              {/* Round Trip Leg Navigation Banner */}
              {isRoundTrip && (
                <div className="mb-5 bg-white rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Departure Tab */}
                    <div
                      onClick={() => {
                        setActiveLeg("outbound");
                        if (selectedOutbound) {
                          setSelectedFlightForPrices(selectedOutbound);
                          setOpenViewPrices(true);
                        }
                      }}
                      className={`flex-1 w-full p-3 sm:p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                        activeLeg === "outbound"
                          ? "border-teal-500 bg-teal-50/40 shadow-xs ring-2 ring-teal-500/20"
                          : "border-gray-200/80 hover:bg-gray-50/70"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider bg-teal-100/70 px-2 py-0.5 rounded-full">
                            1. Departure Flight
                          </span>
                          <span className="text-xs font-semibold text-gray-500">
                            {formatDate(searchParams.departureDate) ||
                              "Selected Date"}
                          </span>
                        </div>
                        {selectedOutbound ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Selected
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-gray-400">
                            {outboundFlights.length} flights
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-baseline justify-between">
                        <h3 className="text-base font-bold text-gray-900">
                          {searchParams.origin || "Origin"} →{" "}
                          {searchParams.destination || "Destination"}
                        </h3>
                        {selectedOutbound && (
                          <span className="text-sm font-extrabold text-teal-700">
                            ₹
                            {getFlightFare(selectedOutbound).toLocaleString(
                              "en-IN",
                            )}
                          </span>
                        )}
                      </div>
                      {selectedOutbound && (
                        <p className="mt-1 text-xs text-gray-600 truncate font-medium">
                          {selectedOutbound.segments?.[0]?.airline} (
                          {selectedOutbound.segments?.[0]?.departure
                            ?.split("T")?.[1]
                            ?.slice(0, 5)}
                          )
                        </p>
                      )}
                    </div>

                    {/* Return Tab */}
                    <div
                      onClick={() => {
                        setActiveLeg("inbound");
                        if (selectedInbound) {
                          setSelectedFlightForPrices(selectedInbound);
                          setOpenViewPrices(true);
                        }
                      }}
                      className={`flex-1 w-full p-3 sm:p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                        activeLeg === "inbound"
                          ? "border-teal-500 bg-teal-50/40 shadow-xs ring-2 ring-teal-500/20"
                          : "border-gray-200/80 hover:bg-gray-50/70"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider bg-teal-100/70 px-2 py-0.5 rounded-full">
                            2. Return Flight
                          </span>
                          <span className="text-xs font-semibold text-gray-500">
                            {formatDate(routeReturnDate) || "Return Date"}
                          </span>
                        </div>
                        {selectedInbound ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Selected
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-gray-400">
                            {inboundFlights.length} flights
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-baseline justify-between">
                        <h3 className="text-base font-bold text-gray-900">
                          {searchParams.destination || "Destination"} →{" "}
                          {searchParams.origin || "Origin"}
                        </h3>
                        {selectedInbound && (
                          <span className="text-sm font-extrabold text-teal-700">
                            ₹
                            {getFlightFare(selectedInbound).toLocaleString(
                              "en-IN",
                            )}
                          </span>
                        )}
                      </div>
                      {selectedInbound && (
                        <p className="mt-1 text-xs text-gray-600 truncate font-medium">
                          {selectedInbound.segments?.[0]?.airline} (
                          {selectedInbound.segments?.[0]?.departure
                            ?.split("T")?.[1]
                            ?.slice(0, 5)}
                          )
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div ref={flightListSectionRef} className="scroll-mt-24">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {isRoundTrip
                    ? activeLeg === "outbound"
                      ? `Departure Flights: ${searchParams.origin || "Origin"} to ${searchParams.destination || "Destination"}`
                      : `Return Flights: ${searchParams.destination || "Destination"} to ${searchParams.origin || "Origin"}`
                    : isMultiCity
                      ? `Multi-City Flights: ${searchParams.origin || "Origin"} to ${searchParams.destination || "Destination"}`
                      : `Flights from ${searchParams.origin || ""} to ${searchParams.destination || ""}`}
                </h1>
              </div>
              {/* Date Selector Carousel */}
              <div className="relative w-full rounded-xl border border-gray-200 bg-white shadow-xs mt-3 overflow-hidden">
                {/* Left Arrow */}
                <button
                  type="button"
                  onClick={() => scrollDates("left")}
                  className="cursor-pointer absolute left-0 top-0 bottom-0 z-20 w-8 sm:w-10 border-r border-gray-200 bg-white/95 backdrop-blur-xs flex items-center justify-center hover:bg-gray-50 transition shadow-xs"
                  aria-label="Previous dates"
                >
                  <ChevronLeft className="h-5 w-5 text-teal-600" />
                </button>

                {/* Scroll Area */}
                <div
                  ref={dateStripRef}
                  className="flex overflow-x-auto scrollbar-hide scroll-smooth px-8 sm:px-10 divide-x divide-gray-100"
                >
                  {calendarDates.map((item) => (
                    <button
                      key={item.date}
                      type="button"
                      data-date={item.date}
                      onClick={() => handleDateSelect(item.date)}
                      className={`min-w-[100px] sm:min-w-[125px] flex-1 py-3 sm:py-3.5 cursor-pointer transition-all hover:bg-teal-50/20 text-center shrink-0
                        ${
                          activeDate === item.date
                            ? "border-b-[3px] border-b-teal-600 bg-teal-50/40"
                            : ""
                        }`}
                    >
                      <p
                        className={`text-xs sm:text-sm font-semibold ${
                          activeDate === item.date
                            ? "text-teal-700 font-bold"
                            : "text-gray-700"
                        }`}
                      >
                        {new Date(`${item.date}T00:00:00`).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </p>

                      <p
                        className={`mt-0.5 text-xs sm:text-sm font-bold ${
                          activeDate === item.date
                            ? "text-teal-700 font-extrabold"
                            : item.lowFare
                              ? "text-emerald-600 font-bold"
                              : "text-gray-900"
                        }`}
                      >
                        {item.fare
                          ? `₹ ${Number(item.fare).toLocaleString("en-IN")}`
                          : "Check fares"}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Right Arrow */}
                <button
                  type="button"
                  onClick={() => scrollDates("right")}
                  className="cursor-pointer absolute right-0 top-0 bottom-0 z-20 w-8 sm:w-10 border-l border-gray-200 bg-white/95 backdrop-blur-xs flex items-center justify-center hover:bg-gray-50 transition shadow-xs"
                  aria-label="Next dates"
                >
                  <ChevronRight className="h-5 w-5 text-teal-600" />
                </button>
              </div>

              <div className="py-4 space-y-4">
                {loading && <FlightLoader />}

                {!loading && (
                  <>
                    {filteredFlights?.length === 0 ? (
                      <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                        <PlaneLanding className="mb-4 h-10 w-10 text-slate-400" />
                        <h2 className="text-lg font-bold text-slate-800">
                          No flights available
                        </h2>
                        <p className="mt-2 max-w-md text-sm text-slate-500">
                          {error
                            ? "We could not load flights for this search. Please try again with different dates or airports."
                            : "No flights were found for the selected route, date, or filters."}
                        </p>
                      </div>
                    ) : (
                      paginatedFlights.map((temp, index) => {
                        const firstSegment = temp?.segments?.[0];
                        const lastSegment =
                          temp?.segments?.[temp?.segments?.length - 1];

                        if (!firstSegment || !lastSegment) return null;

                        // Calculate duration
                        const depDate = new Date(firstSegment.departure);
                        const arrDate = new Date(lastSegment.arrival);
                        let durationStr = "03h 05m";
                        if (!isNaN(depDate) && !isNaN(arrDate)) {
                          const diffMs = arrDate - depDate;
                          if (diffMs > 0) {
                            const hrs = Math.floor(diffMs / 3600000);
                            const mins = Math.floor((diffMs % 3600000) / 60000);
                            durationStr = `${hrs}h ${mins}m`;
                          }
                        }

                        return (
                          <div key={index} className="w-full">
                            <div className="flight-card-container group relative rounded-2xl border border-slate-200/90 bg-white shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_36px_-6px_rgba(15,23,42,0.09)] hover:border-teal-500/40 w-full overflow-hidden">
                              {/* Top Badge Strip */}
                              <div className="flex items-center justify-between px-4 sm:px-6 pt-3 pb-1 border-b border-slate-50">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    100% on time
                                  </span>
                                  {temp?.fares?.[0]?.isRefundable && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-teal-50 text-teal-700 border border-teal-200/50">
                                      Refundable
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                  {firstSegment.cabinClass || "Economy"}
                                </span>
                              </div>

                              {/* Main Section */}
                              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between px-4 sm:px-6 py-4 gap-4 sm:gap-6">
                                {/* Airline Info */}
                                <div className="flex items-center gap-3.5 shrink-0 min-w-0 sm:w-48 lg:w-52">
                                  <div className="flight-airline-logo h-12 w-12 shrink-0 rounded-2xl bg-white p-2 shadow-xs border border-slate-100 flex items-center justify-center">
                                    <img
                                      src={`https://images.kiwi.com/airlines/64/${firstSegment.airlineCode}.png`}
                                      alt={firstSegment.airline}
                                      className="h-full w-full object-contain"
                                      onError={(e) => {
                                        e.target.src =
                                          "https://cdn-icons-png.flaticon.com/512/684/684908.png";
                                      }}
                                    />
                                  </div>

                                  <div className="min-w-0">
                                    <h3 className="text-[15px] sm:text-base font-extrabold text-slate-900 truncate leading-snug tracking-tight">
                                      {firstSegment.airline}
                                    </h3>

                                    <p className="mt-0.5 text-xs text-slate-500 font-medium">
                                      <span className="font-mono font-semibold tracking-wide text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                        {firstSegment.flightNumber || "QP-1526"}
                                      </span>
                                    </p>
                                  </div>
                                </div>

                                {/* Departure, Duration & Arrival */}
                                <div className="flex items-center justify-between sm:justify-center gap-3 sm:gap-8 flex-1 min-w-0 py-2 sm:py-0 border-y lg:border-y-0 border-slate-100">
                                  {/* Departure */}
                                  <div className="text-left sm:text-right shrink-0 min-w-[75px] sm:min-w-[95px]">
                                    <h2 className="text-2xl sm:text-[26px] font-black leading-none text-slate-900 tracking-tight">
                                      {firstSegment.departure
                                        ?.split("T")?.[1]
                                        ?.slice(0, 5) || "00:00"}
                                    </h2>

                                    <p className="mt-1 text-xs sm:text-sm font-bold text-slate-800 truncate max-w-[100px] sm:max-w-none">
                                      {firstSegment.originCity ||
                                        firstSegment.origin}
                                    </p>
                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                                      {firstSegment.originCode ||
                                        firstSegment.origin}
                                    </span>
                                  </div>

                                  {/* Duration & Animated Route Visualizer */}
                                  <AnimatedFlightRoute
                                    durationStr={durationStr}
                                    stopsContent={(() => {
                                      const stopsCount =
                                        temp?.segments?.length - 1;
                                      if (stopsCount === 0) {
                                        return (
                                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                            Non Stop
                                          </span>
                                        );
                                      }
                                      const layovers = temp?.segments
                                        ?.slice(0, -1)
                                        ?.map((seg) => seg.destination)
                                        ?.filter(Boolean)
                                        ?.join(", ");
                                      return (
                                        <span
                                          className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md truncate max-w-full inline-block"
                                          title={`${stopsCount} stop via ${layovers}`}
                                        >
                                          {stopsCount}{" "}
                                          {stopsCount === 1 ? "Stop" : "Stops"}{" "}
                                          via ${layovers}
                                        </span>
                                      );
                                    })()}
                                  />

                                  {/* Arrival */}
                                  <div className="text-right sm:text-left shrink-0 min-w-[75px] sm:min-w-[95px]">
                                    <h2 className="text-2xl sm:text-[26px] font-black leading-none text-slate-900 tracking-tight">
                                      {lastSegment.arrival
                                        ?.split("T")?.[1]
                                        ?.slice(0, 5) || "00:00"}
                                    </h2>

                                    <p className="mt-1 text-xs sm:text-sm font-bold text-slate-800 truncate max-w-[100px] sm:max-w-none">
                                      {lastSegment.destinationCity ||
                                        lastSegment.destination}
                                    </p>
                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                                      {lastSegment.destinationCode ||
                                        lastSegment.destination}
                                    </span>
                                  </div>
                                </div>

                                {/* Divider */}
                                <div className="hidden lg:block h-14 w-px bg-slate-200/80 shrink-0"></div>

                                {/* Price & Action */}
                                <div className="flex items-center justify-between lg:flex-col lg:items-end lg:justify-center gap-3 shrink-0 pt-2 lg:pt-0">
                                  {(() => {
                                    const unitAdultFare = Number(
                                      temp?.fares?.[0]?.totalAmount ??
                                        temp?.totalAmount ??
                                        0,
                                    );
                                    const totalCardFare = Math.round(
                                      unitAdultFare * (paxMultiplier || 1),
                                    );
                                    return (
                                      <div className="text-left lg:text-right">
                                        <span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider block">
                                          {totalPassengerCount > 1
                                            ? `Total for ${totalPassengerCount} travellers`
                                            : "Total Fare"}
                                        </span>
                                        <div className="flex items-baseline justify-start lg:justify-end gap-1 mt-0.5">
                                          <span className="text-sm font-extrabold text-slate-700">
                                            ₹
                                          </span>
                                          <AnimatedNumber
                                            value={totalCardFare}
                                            className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none font-mono"
                                          />
                                        </div>
                                        {totalPassengerCount > 1 && (
                                          <span className="inline-block mt-1 text-[10px] sm:text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                                            <AnimatedNumber
                                              value={unitAdultFare}
                                              prefix="₹"
                                              suffix=" / adult"
                                            />
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })()}

                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        clickSquash(e.currentTarget);
                                        setSelectedFlightForPrices(temp);
                                        setOpenViewPrices(true);
                                      }}
                                      className="h-10 px-4 rounded-xl border border-teal-600/90 bg-teal-50/50 hover:bg-teal-600 text-teal-700 hover:text-white font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 whitespace-nowrap"
                                    >
                                      VIEW PRICES
                                    </button>

                                    {isRoundTrip ? (
                                      <button
                                        onClick={(e) => {
                                          clickSquash(e.currentTarget);
                                          setSelectedFlightForPrices(temp);
                                          setOpenViewPrices(true);
                                        }}
                                        className={`h-10 px-5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap flex items-center gap-1.5 ${
                                          isFlightSelected(temp)
                                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30"
                                            : "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-xs hover:shadow-md"
                                        }`}
                                      >
                                        {isFlightSelected(temp) ? (
                                          <>
                                            <CheckCircle className="w-4 h-4" />
                                            <span>SELECTED</span>
                                          </>
                                        ) : (
                                          <span>
                                            SELECT{" "}
                                            {activeLeg === "outbound"
                                              ? "DEPARTURE"
                                              : "RETURN"}
                                          </span>
                                        )}
                                      </button>
                                    ) : (
                                      <button
                                        onClick={(e) => {
                                          clickSquash(e.currentTarget);
                                          setSelectedFlightForPrices(temp);
                                          setOpenViewPrices(true);
                                        }}
                                        className="h-10 px-5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer shadow-md shadow-teal-700/20 hover:shadow-lg hover:shadow-teal-700/30 active:scale-95 whitespace-nowrap flex items-center gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                                      >
                                        <span>BOOK NOW</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Bottom Section */}
                              <div className="flex h-11 items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 sm:px-6">
                                <div className="flex items-center gap-4">
                                  <button
                                    onClick={() => {
                                      setSelectedFlightForModal({
                                        ...temp,
                                        netFare: getFlightNetFare(temp),
                                        retailFare: getFlightUnitFare(temp),
                                      });
                                      setOpenFareQuote(true);
                                    }}
                                    className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-teal-700 transition cursor-pointer"
                                  >
                                    <PlaneTakeoff className="h-3.5 w-3.5 text-teal-600" />
                                    <span>Flight details</span>
                                  </button>

                                  {temp?.fares?.[0]?.baggage && (
                                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                      <Luggage className="w-3.5 h-3.5 text-slate-400" />
                                      {temp.fares[0].baggage}
                                    </span>
                                  )}
                                </div>

                                <span className="text-[11px] font-semibold text-emerald-700 hidden sm:flex items-center gap-1.5 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                  100% Verified Fare
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Flights Pagination Bar */}
                    {totalFlights > 0 && (
                      <div className="mt-8 pt-4 pb-6 border-t border-gray-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                        {/* Summary Text */}
                        <div className="text-xs sm:text-sm text-gray-600 font-medium text-center sm:text-left">
                          Showing <span className="font-bold text-gray-900">{startFlightIndex}–{endFlightIndex}</span> of{" "}
                          <span className="font-bold text-gray-900">{totalFlights}</span> Flights
                          {totalPages > 1 && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200/60">
                              Page {safeCurrentPage} of {totalPages}
                            </span>
                          )}
                        </div>

                        {/* Serial Numbered Pagination Controls */}
                        {totalPages > 1 && (
                          <nav
                            className="inline-flex items-center gap-1 sm:gap-1.5 p-1 rounded-2xl bg-white border border-gray-200 shadow-2xs"
                            aria-label="Flights pagination"
                          >
                            {/* Previous Button */}
                            <button
                              type="button"
                              onClick={() => handlePageChange(safeCurrentPage - 1)}
                              disabled={safeCurrentPage === 1}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 text-gray-700"
                              aria-label="Previous page"
                            >
                              <ChevronLeft size={16} />
                              <span className="hidden sm:inline">Prev</span>
                            </button>

                            {/* Serial Numbered Buttons */}
                            {pageNumbers.map((p, pIdx) => {
                              if (p === "...") {
                                return (
                                  <span
                                    key={`ellipsis-${pIdx}`}
                                    className="px-2 py-1 text-xs sm:text-sm text-gray-400 font-bold select-none"
                                  >
                                    …
                                  </span>
                                );
                              }
                              const isCurrent = p === safeCurrentPage;
                              return (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => handlePageChange(p)}
                                  aria-current={isCurrent ? "page" : undefined}
                                  className={`min-w-8 sm:min-w-9 h-8 sm:h-9 px-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center justify-center ${
                                    isCurrent
                                      ? "bg-teal-600 text-white shadow-xs"
                                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                  }`}
                                >
                                  {p}
                                </button>
                              );
                            })}

                            {/* Next Button */}
                            <button
                              type="button"
                              onClick={() => handlePageChange(safeCurrentPage + 1)}
                              disabled={safeCurrentPage === totalPages}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 text-gray-700"
                              aria-label="Next page"
                            >
                              <span className="hidden sm:inline">Next</span>
                              <ChevronRight size={16} />
                            </button>
                          </nav>
                        )}
                      </div>
                    )}

                    <MoreFlightDetails
                      openFareQuote={openFareQuote}
                      setOpenFareQuote={setOpenFareQuote}
                      flight={selectedFlightForModal}
                      traceId={
                        traceId ||
                        flightsData?.data?.data?.traceId ||
                        flightsData?.data?.traceId ||
                        flightsData?.traceId
                      }
                      resultIndex={
                        selectedFlightForModal?.resultIndex ||
                        selectedFlightForModal?.fares?.[0]?.resultIndex
                      }
                      onSelectFlight={handleDirectBook}
                    />

                    <ViewPricesModal
                      openViewPrices={openViewPrices}
                      setOpenViewPrices={setOpenViewPrices}
                      flight={selectedFlightForPrices}
                      returnFlight={
                        activeLeg === "outbound"
                          ? selectedInbound
                          : selectedOutbound
                      }
                      isRoundTrip={isRoundTrip}
                      onConfirmTier={(tier) => {
                        const priceNum = Number(tier.price || 0);
                        if (isRoundTrip) {
                          if (activeLeg === "outbound") {
                            setSelectedOutbound({
                              ...selectedFlightForPrices,
                              selectedTier: tier,
                            });
                            toast.success(
                              `Departure flight selected (${tier.title} - ₹${priceNum.toLocaleString("en-IN")})`,
                            );
                            if (!selectedInbound) {
                              setActiveLeg("inbound");
                            }
                          } else {
                            setSelectedInbound({
                              ...selectedFlightForPrices,
                              selectedTier: tier,
                            });
                            toast.success(
                              `Return flight selected (${tier.title} - ₹${priceNum.toLocaleString("en-IN")})`,
                            );
                          }
                        } else {
                          setSelectedOutbound({
                            ...selectedFlightForPrices,
                            selectedTier: tier,
                          });
                          handleDirectBook({
                            ...selectedFlightForPrices,
                            selectedTier: tier,
                          });
                        }
                      }}
                      traceId={
                        traceId ||
                        flightsData?.data?.data?.traceId ||
                        flightsData?.data?.traceId ||
                        flightsData?.traceId
                      }
                    />
                  </>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
      {/* Sticky Bottom Round-Trip / Flight Booking Bar */}
      {(isRoundTrip || selectedOutbound || selectedInbound) && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] px-4 sm:px-8 py-3.5 animate-in slide-in-from-bottom duration-300">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
            {/* Selected Legs Preview */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full md:w-auto">
              {/* Outbound Leg */}
              <div
                onClick={() => {
                  setActiveLeg("outbound");
                  if (selectedOutbound) {
                    setSelectedFlightForPrices(selectedOutbound);
                    setOpenViewPrices(true);
                  }
                }}
                className={`group flex items-center gap-2.5 px-3.5 py-2 rounded-xl border cursor-pointer transition ${
                  selectedOutbound
                    ? "bg-teal-50/70 border-teal-300 ring-1 ring-teal-400/20"
                    : "bg-gray-50 border-dashed border-gray-300 hover:bg-gray-100"
                }`}
              >
                <PlaneTakeoff className="w-4 h-4 text-teal-600 shrink-0" />
                <div className="text-left">
                  <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
                    Departure
                  </span>
                  <p className="text-xs font-bold text-gray-900 truncate max-w-[170px]">
                    {selectedOutbound
                      ? `${selectedOutbound.segments?.[0]?.airline || "Flight"} • ₹${getFlightFare(selectedOutbound).toLocaleString("en-IN")}`
                      : "Choose departure flight"}
                  </p>
                </div>
                {selectedOutbound && (
                  <button
                    type="button"
                    title="Deselect departure flight"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOutbound(null);
                      toast.info("Departure flight removed");
                    }}
                    className="ml-1 p-0.5 rounded-full hover:bg-teal-200/60 text-teal-700 hover:text-teal-900 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Return Leg (in Round Trip) */}
              {isRoundTrip && (
                <>
                  <span className="text-gray-400 font-extrabold text-sm hidden sm:inline">
                    +
                  </span>

                  <div
                    onClick={() => {
                      setActiveLeg("inbound");
                      if (selectedInbound) {
                        setSelectedFlightForPrices(selectedInbound);
                        setOpenViewPrices(true);
                      }
                    }}
                    className={`group flex items-center gap-2.5 px-3.5 py-2 rounded-xl border cursor-pointer transition ${
                      selectedInbound
                        ? "bg-teal-50/70 border-teal-300 ring-1 ring-teal-400/20"
                        : "bg-gray-50 border-dashed border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    <PlaneLanding className="w-4 h-4 text-teal-600 shrink-0" />
                    <div className="text-left">
                      <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
                        Return
                      </span>
                      <p className="text-xs font-bold text-gray-900 truncate max-w-[170px]">
                        {selectedInbound
                          ? `${selectedInbound.segments?.[0]?.airline || "Flight"} • ₹${getFlightFare(selectedInbound).toLocaleString("en-IN")}`
                          : "Choose return flight"}
                      </p>
                    </div>
                    {selectedInbound && (
                      <button
                        type="button"
                        title="Deselect return flight"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedInbound(null);
                          toast.info("Return flight removed");
                        }}
                        className="ml-1 p-0.5 rounded-full hover:bg-teal-200/60 text-teal-700 hover:text-teal-900 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Total Fare & Action */}
            <div className="flex items-center justify-between md:justify-end gap-5 w-full md:w-auto">
              <div className="text-left md:text-right">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                  {selectedOutbound && selectedInbound
                    ? "Total Round Trip Fare"
                    : selectedOutbound
                      ? "Departure Flight Fare"
                      : selectedInbound
                        ? "Return Flight Fare"
                        : "Total Fare"}
                  {totalPassengerCount > 1
                    ? ` (${totalPassengerCount} Travellers)`
                    : ""}
                </span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  ₹
                  {Math.round(
                    getFlightFare(selectedOutbound) +
                      getFlightFare(selectedInbound),
                  ).toLocaleString("en-IN")}
                </p>
                {totalPassengerCount > 1 && (
                  <span className="text-[10px] text-gray-400 font-medium block">
                    (₹
                    {Math.round(
                      (getFlightFare(selectedOutbound) +
                        getFlightFare(selectedInbound)) /
                        (paxMultiplier || 1),
                    ).toLocaleString("en-IN")}{" "}
                    / adult)
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleBookFlights();
                }}
                disabled={!selectedOutbound && !selectedInbound}
                className={`px-8 py-3 rounded-full font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg transition-all active:scale-95 whitespace-nowrap ${
                  selectedOutbound || selectedInbound
                    ? "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white hover:shadow-xl hover:scale-105 cursor-pointer"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                {selectedOutbound && selectedInbound
                  ? `Book Round Trip (₹${Math.round(getFlightFare(selectedOutbound) + getFlightFare(selectedInbound)).toLocaleString("en-IN")}) →`
                  : selectedOutbound
                    ? `Book Departure (₹${Math.round(getFlightFare(selectedOutbound)).toLocaleString("en-IN")}) →`
                    : selectedInbound
                      ? `Book Return (₹${Math.round(getFlightFare(selectedInbound)).toLocaleString("en-IN")}) →`
                      : "Select a Flight"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FlightCard;
