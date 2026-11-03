import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import CommonHeader from "../components/CommonHeader";
import FlightSummaryCard from "../components/farequotedetails/FlightSummaryCard";
import ImportantInformation from "../components/farequotedetails/ImportantInformation";
import TravellerDetails from "../components/farequotedetails/TravellerDetails";
import SsrSelection from "../components/farequotedetails/SsrSelection";
import SeatMapSelection from "../components/farequotedetails/SeatMapSelection";
import { getFareQuote, getSeatMap, getSSR } from "../components/reducer/FlightSearchSlice";
import { AlertCircle, Loader2, Lock, ArrowRight, X, Clock, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../store/authContext";
import { reindexSlots, getSlotDisplayName } from "../components/farequotedetails/slotUtils";

const FareQuoteDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const state = location.state || {};

  const cachedBooking = (() => {
    try {
      const sessionData = JSON.parse(sessionStorage.getItem("selectedFlightBooking") || "null");
      if (sessionData && Object.keys(sessionData).length > 0) {
        if (!sessionData.timestamp || Date.now() - Number(sessionData.timestamp) < 10 * 60 * 1000) {
          return sessionData;
        }
      }
      const localData = JSON.parse(localStorage.getItem("selectedFlightBooking") || "null");
      if (localData && Object.keys(localData).length > 0) {
        if (localData.timestamp && Date.now() - Number(localData.timestamp) < 10 * 60 * 1000) {
          return localData;
        }
      }
      return {};
    } catch {
      return {};
    }
  })();

  const savedDraft = (() => {
    try {
      return (
        JSON.parse(sessionStorage.getItem("flight_booking_form_draft")) ||
        JSON.parse(localStorage.getItem("flight_booking_form_draft")) ||
        {}
      );
    } catch {
      return {};
    }
  })();

  const rawTraceId = location.state?.traceId || cachedBooking.traceId || savedDraft.traceId || "";
  const traceId = String(rawTraceId).trim();
  const flight = location.state?.flight || cachedBooking.flight || savedDraft.flight;
  const returnFlight = location.state?.returnFlight || cachedBooking.returnFlight || savedDraft.returnFlight;
  const isRoundTrip = location.state?.isRoundTrip ?? (cachedBooking.isRoundTrip ?? Boolean(returnFlight));
  const selectedFareTier = location.state?.selectedFareTier || cachedBooking.selectedFareTier || savedDraft.selectedFareTier;
  const selectedTier = location.state?.selectedTier || cachedBooking.selectedTier || savedDraft.selectedTier;

  const rawResultIndex = location.state?.resultIndex ?? cachedBooking.resultIndex ?? savedDraft.resultIndex;
  const fallbackOutIdx = flight?.fares?.[0]?.resultIndex || flight?.resultIndex || "";
  const resolvedResultIndex = rawResultIndex || fallbackOutIdx;
  const resultIndex = Array.isArray(resolvedResultIndex)
    ? String(resolvedResultIndex[0] || "").trim()
    : String(resolvedResultIndex || "").trim();

  const [currentTraceId, setCurrentTraceId] = useState(traceId);
  const [currentResultIndex, setCurrentResultIndex] = useState(resultIndex);
  const [currentFlight, setCurrentFlight] = useState(flight);
  const [isRefreshingSession, setIsRefreshingSession] = useState(false);

  const [sessionTimeLeft, setSessionTimeLeft] = useState(() => {
    const ts = location.state?.timestamp || cachedBooking?.timestamp;
    if (ts) {
      const elapsed = Math.floor((Date.now() - Number(ts)) / 1000);
      return Math.max(0, 600 - elapsed);
    }
    return 600; // 10 minutes default
  });

  const flightId =
    location.state?.flightId ||
    cachedBooking.flightId ||
    location.state?.cardId ||
    cachedBooking.cardId ||
    flight?.flightId ||
    flight?.cardId ||
    location.state?.offerId ||
    cachedBooking.offerId;
  const cardId =
    location.state?.cardId ||
    cachedBooking.cardId ||
    flight?.cardId ||
    flightId;

  const isMongoId = (val) =>
    typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val.trim());

    const isOffer = Boolean(
    (location.state?.isOffer ||
      cachedBooking.isOffer ||
      savedDraft.isOffer ||
      location.state?.isInHouse ||
      cachedBooking.isInHouse ||
      savedDraft.isInHouse ||
      isMongoId(location.state?.offerId) ||
      isMongoId(cachedBooking.offerId) ||
      flight?.isOffer ||
      flight?.isInHouse) &&
    (isMongoId(location.state?.offerId) ||
      isMongoId(cachedBooking.offerId) ||
      isMongoId(flight?.offerId) ||
      isMongoId(flightId))
  );

  const hasLiveSupplierFlight = Boolean(
    !isOffer &&
    traceId &&
    resultIndex &&
    !String(traceId).startsWith("OFFER-")
  );

  const offerId = isOffer
    ? (isMongoId(location.state?.offerId)
        ? location.state.offerId
        : isMongoId(cachedBooking.offerId)
          ? cachedBooking.offerId
          : isMongoId(flight?.offerId)
            ? flight.offerId
            : isMongoId(flightId)
              ? flightId
              : null)
    : null;

  const selectedOffer =
    location.state?.selectedOffer ||
    cachedBooking.selectedOffer ||
    savedDraft.selectedOffer ||
    null;

  const savedSearch = (() => {
    try {
      return JSON.parse(localStorage.getItem("flightSearch")) || {};
    } catch {
      return {};
    }
  })();
  const savedTravellers = (() => {
    try {
      return JSON.parse(localStorage.getItem("travellers")) || {};
    } catch {
      return {};
    }
  })();
  const statePax = state.passengers || cachedBooking.passengers || savedDraft.passengers || {};
  const searchPax = savedSearch.passengers || {};
  const initialAdultsCount = Math.max(
    1,
    Number(statePax.adults ?? searchPax.adults ?? savedTravellers.adult ?? savedSearch.adults ?? 1)
  );
  const initialChildrenCount = Math.max(
    0,
    Number(statePax.children ?? searchPax.children ?? savedTravellers.child ?? savedSearch.children ?? 0)
  );
  const initialInfantsCount = Math.max(
    0,
    Number(statePax.infants ?? searchPax.infants ?? savedTravellers.infant ?? savedSearch.infants ?? 0)
  );

  // Dynamic Passenger Slots State (with Draft auto-restoration)
  const [passengerSlots, setPassengerSlots] = useState(() => {
    const slots = [];
    let slotId = 1;

    const createInitialSlot = (id, type, slotTitle, title, isExpanded) => ({
      id,
      type,
      slotTitle,
      title,
      firstName: "",
      lastName: "",
      gender: "",
      dob: "",
      passport: "",
      passportExpiry: "",
      passportIssueDate: "",
      passportIssueCountryCode: "IN",
      nationality: "India",
      addressLine1: "",
      city: "",
      airline: "",
      ffNumber: "",
      mealPreference: "",
      wheelchair: "",
      saveToProfile: id === 1 && initialAdultsCount === 1,
      isCompleted: false,
      isExpanded,
      isFromSavedTraveller: false,
      savedTravellerId: null,
    });

    for (let i = 1; i <= initialAdultsCount; i++) {
      slots.push(
        createInitialSlot(
          slotId++,
          "ADULT",
          initialAdultsCount === 1 ? "Adult" : `Adult ${i}`,
          "Mr",
          i === 1,
        ),
      );
    }

    for (let i = 1; i <= initialChildrenCount; i++) {
      slots.push(
        createInitialSlot(
          slotId++,
          "CHILD",
          initialChildrenCount === 1 ? "Child" : `Child ${i}`,
          "Mstr",
          false,
        ),
      );
    }

    for (let i = 1; i <= initialInfantsCount; i++) {
      slots.push(
        createInitialSlot(
          slotId++,
          "INFANT",
          initialInfantsCount === 1 ? "Infant" : `Infant ${i}`,
          "Mstr",
          false,
        ),
      );
    }

    // Merge with saved draft if available so form details are filled up when returning
    if (savedDraft?.passengerSlots && Array.isArray(savedDraft.passengerSlots)) {
      const restored = slots.map((slot, index) => {
        const dSlot = savedDraft.passengerSlots[index];
        if (!dSlot) return slot;
        return {
          ...slot,
          title: dSlot.title || slot.title,
          firstName: dSlot.firstName || slot.firstName,
          lastName: dSlot.lastName || slot.lastName,
          gender: dSlot.gender || slot.gender,
          dob: dSlot.dob || slot.dob,
          passport: dSlot.passport || slot.passport,
          passportExpiry: dSlot.passportExpiry || slot.passportExpiry,
          passportIssueDate: dSlot.passportIssueDate || slot.passportIssueDate,
          passportIssueCountryCode:
            dSlot.passportIssueCountryCode || slot.passportIssueCountryCode,
          nationality: dSlot.nationality || slot.nationality,
          addressLine1: dSlot.addressLine1 || slot.addressLine1,
          city: dSlot.city || slot.city,
          airline: dSlot.airline || slot.airline,
          ffNumber: dSlot.ffNumber || slot.ffNumber,
          mealPreference: dSlot.mealPreference || slot.mealPreference,
          wheelchair: dSlot.wheelchair || slot.wheelchair,
          saveToProfile: Boolean(dSlot.saveToProfile ?? slot.saveToProfile),
          isFromSavedTraveller: Boolean(
            dSlot.isFromSavedTraveller ?? slot.isFromSavedTraveller,
          ),
          savedTravellerId: dSlot.savedTravellerId ?? slot.savedTravellerId,
          isCompleted: dSlot.isCompleted ?? slot.isCompleted,
        };
      });
      return reindexSlots(restored);
    }

    return reindexSlots(slots);
  });

  const seatEligiblePassengers = passengerSlots.filter((p) => p.type !== "INFANT");
  const totalPassengerCount = seatEligiblePassengers.length;
  const currentAdultsCount = passengerSlots.filter((p) => p.type === "ADULT").length;
  const currentChildrenCount = passengerSlots.filter((p) => p.type === "CHILD").length;
  const currentInfantsCount = passengerSlots.filter((p) => p.type === "INFANT").length;
  const totalTravellersCount = passengerSlots.length;

  const handleAddPassenger = (type = "ADULT") => {
    const pType = type.toUpperCase();
    const newId = Date.now() + Math.floor(Math.random() * 1000);

    const newSlot = {
      id: newId,
      type: pType,
      slotTitle: "",
      title: pType === "CHILD" || pType === "INFANT" ? "Mstr" : "Mr",
      firstName: "",
      lastName: "",
      gender: "",
      dob: "",
      passport: "",
      passportExpiry: "",
      passportIssueDate: "",
      passportIssueCountryCode: "IN",
      nationality: "India",
      addressLine1: "",
      city: "",
      airline: "",
      ffNumber: "",
      mealPreference: "",
      wheelchair: "",
      saveToProfile: false,
      isCompleted: false,
      isExpanded: true,
      isFromSavedTraveller: false,
      savedTravellerId: null,
    };

    setPassengerSlots((prev) => {
      const updated = prev.map((s) => ({ ...s, isExpanded: false })).concat(newSlot);
      return reindexSlots(updated);
    });
  };

  const handleRemovePassenger = (targetId) => {
    if (passengerSlots.length <= 1) {
      toast.dismiss();
      toast.warning("At least 1 passenger is required for booking.", {
        toastId: "min-passenger-warning",
        autoClose: 2000,
      });
      return;
    }

    // 1. First try matching by unique slot ID (supports string and number comparison)
    let slotToRemove = passengerSlots.find(
      (s) => String(s.id) === String(targetId)
    );

    // 2. If not found by unique slot ID and targetId is a valid array index, fall back to seatEligible index
    if (!slotToRemove && typeof targetId === "number" && targetId >= 0 && targetId < seatEligiblePassengers.length) {
      slotToRemove = seatEligiblePassengers[targetId];
    }

    if (!slotToRemove) return;

    const removedId = slotToRemove.id;

    const removedEligibleIndex = seatEligiblePassengers.findIndex(
      (s) => String(s.id) === String(removedId),
    );

    // Pure state updater
    setPassengerSlots((prev) => {
      const remainingSlots = prev.filter((s) => String(s.id) !== String(removedId));
      return reindexSlots(remainingSlots);
    });

    const shiftIndexedMap = (prev) => {
      if (removedEligibleIndex < 0) return prev;
      const next = {};
      Object.entries(prev || {}).forEach(([k, val]) => {
        const numKey = Number(k);
        if (Number.isNaN(numKey)) {
          if (k !== String(removedId)) next[k] = val;
        } else if (numKey < removedEligibleIndex) {
          next[numKey] = val;
        } else if (numKey > removedEligibleIndex) {
          next[numKey - 1] = val;
        }
      });
      return next;
    };

    setSelectedSeats(shiftIndexedMap);
    setSelectedSsr(shiftIndexedMap);
  };

  const {
    fareQuote,
    seatMapData,
    ssrData,
    fareQuoteLoading,
    seatMapLoading,
    ssrLoading,
    fareQuoteError,
    fareQuoteErrorMeta,
  } = useSelector((state) => state.flightSearch);

  // Selected Ancillaries State
  const [selectedSsr, setSelectedSsr] = useState({});
  const [selectedSeats, setSelectedSeats] = useState({});
  const [bookingLoading, setBookingLoading] = useState(false);
  const { openLoginModal } = useAuth();

  useEffect(() => {
    if (sessionTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setSessionTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionTimeLeft]);

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(remSecs).padStart(2, "0")}`;
  };

  const isExpiredSession =
    !isOffer && (
      sessionTimeLeft === 0 ||
      fareQuoteErrorMeta?.isExpired ||
      fareQuoteErrorMeta?.is502 ||
      /502|expired|trace|session|bad gateway/i.test(String(fareQuoteError || ""))
    );

  const handleRefreshSession = async () => {
    setIsRefreshingSession(true);
    try {
      toast.info("Connecting to airline system to refresh live inventory & lock fare...");

      const activeFlt = currentFlight || flight;
      const originCode =
        savedSearch.origin ||
        activeFlt?.segments?.[0]?.origin?.airportCode ||
        activeFlt?.origin ||
        "DEL";
      const destCode =
        savedSearch.destination ||
        activeFlt?.segments?.[(activeFlt?.segments?.length || 1) - 1]?.destination?.airportCode ||
        activeFlt?.destination ||
        "BOM";
      const depDate =
        savedSearch.departureDate ||
        activeFlt?.segments?.[0]?.departureTime?.split("T")[0] ||
        activeFlt?.departureDate;

      const searchPayload = {
        origin: originCode,
        destination: destCode,
        departureDate: depDate,
        returnDate: savedSearch.returnDate || null,
        passengers: savedSearch.passengers || {
          adults: initialAdultsCount || 1,
          children: initialChildrenCount || 0,
          infants: initialInfantsCount || 0,
        },
        journeyType: isRoundTrip ? "roundtrip" : "oneway",
        forceRefresh: true,
      };

      const res = await flightService.searchFlights(searchPayload);
      const newTraceId = res?.traceId || res?.data?.traceId;
      const flightList =
        res?.results ||
        res?.outbound ||
        res?.data?.results ||
        res?.data?.outbound ||
        [];

      if (!newTraceId) {
        throw new Error("Unable to obtain fresh airline session. Please try searching flights again.");
      }

      const currentAirline =
        activeFlt?.airlineCode ||
        activeFlt?.segments?.[0]?.airline?.code ||
        "";
      const currentFltNum =
        activeFlt?.flightNumber ||
        activeFlt?.segments?.[0]?.flightNumber ||
        "";

      let matched = flightList.find(
        (f) =>
          (currentFltNum && (f.flightNumber === currentFltNum || f.segments?.[0]?.flightNumber === currentFltNum)) ||
          (currentAirline && (f.airlineCode === currentAirline || f.segments?.[0]?.airline?.code === currentAirline))
      );

      if (!matched && flightList.length > 0) {
        matched = flightList[0];
      }

      const freshResultIndex = String(
        matched?.fares?.[0]?.resultIndex || matched?.resultIndex || "1"
      ).trim();

      setCurrentTraceId(newTraceId);
      setCurrentResultIndex(freshResultIndex);
      if (matched) setCurrentFlight(matched);
      setSessionTimeLeft(600);

      const updatedBooking = {
        ...(cachedBooking || {}),
        traceId: newTraceId,
        resultIndex: freshResultIndex,
        flight: matched || activeFlt,
        timestamp: Date.now(),
      };
      sessionStorage.setItem("selectedFlightBooking", JSON.stringify(updatedBooking));
      localStorage.setItem("selectedFlightBooking", JSON.stringify(updatedBooking));

      await dispatch(getFareQuote({ traceId: newTraceId, resultIndex: freshResultIndex }));
      dispatch(getSeatMap({ traceId: newTraceId, resultIndex: freshResultIndex }));
      dispatch(getSSR({ traceId: newTraceId, resultIndex: freshResultIndex }));

      toast.success("Flight fare session updated! You can now proceed with your booking.");
    } catch (err) {
      console.error("Failed to refresh flight session:", err);
      toast.error(err?.message || "Failed to refresh flight fare. Please try searching flights again.");
    } finally {
      setIsRefreshingSession(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token") || params.get("orderId");
    const bookingId = params.get("bookingId") || sessionStorage.getItem("lastFlightBookingId");
    if (params.get("status") === "cancelled") {
      toast.info("PayPal checkout was cancelled. You can retry payment when ready.");
    } else if (token) {
      if (isOffer || params.get("type") === "offer") {
        const targetOfferBookingId =
          params.get("bookingId") ||
          sessionStorage.getItem("lastOfferBookingId") ||
          bookingId ||
          offerId ||
          "";
        navigate(
          `/payment/paypal/success?token=${token}&type=offer&bookingId=${targetOfferBookingId}`,
          { replace: true }
        );
      } else {
        navigate(
          `/payment/paypal/success?token=${token}&type=flight${bookingId ? `&bookingId=${bookingId}` : ""}`,
          { replace: true }
        );
      }
    }
  }, [location.search, navigate, isOffer, offerId]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (!isOffer && currentTraceId && currentResultIndex) {
      dispatch(getFareQuote({ traceId: currentTraceId, resultIndex: currentResultIndex }));
      dispatch(getSeatMap({ traceId: currentTraceId, resultIndex: currentResultIndex }));
      dispatch(getSSR({ traceId: currentTraceId, resultIndex: currentResultIndex }));
    }
  }, [dispatch, currentTraceId, currentResultIndex, isOffer]);

  // Extract base fare & taxes from fareQuote
  const quoteData = fareQuote?.data?.data || fareQuote?.data || fareQuote || {};
  const liveFare = quoteData.fare || {};
  const confirmedFareList = Array.isArray(quoteData.confirmedFare)
    ? quoteData.confirmedFare
    : quoteData.confirmedFare
    ? [quoteData.confirmedFare]
    : [];
  const primaryConfirmedFare = confirmedFareList[0] || {};

  // Tier multiplier or standard fare calculation
  const multiplier = Number(selectedTier?.priceMultiplier || 1);
  const rawBaseFare = Number(liveFare.baseFare || primaryConfirmedFare.BaseFare || 0);
  const rawTaxes = Number(
    (liveFare.tax || 0) +
      (liveFare.otherCharges || 0) +
      (primaryConfirmedFare.Tax || 0) +
      (primaryConfirmedFare.OtherCharges || 0)
  );

  const initialPaxWeight = Math.max(
    1,
    initialAdultsCount + initialChildrenCount * 0.75 + initialInfantsCount * 0.10
  );

  const outboundUnitPrice = isRoundTrip
    ? Number(
        flight?.selectedTier?.unitPrice ||
          (flight?.selectedTier?.price ? flight.selectedTier.price / initialPaxWeight : 0) ||
          flight?.fares?.[0]?.totalAmount ||
          flight?.totalAmount ||
          0,
      )
    : Number(
        selectedTier?.unitPrice ||
          (selectedTier?.price ? selectedTier.price / initialPaxWeight : 0) ||
          flight?.fares?.[0]?.totalAmount ||
          flight?.totalAmount ||
          0,
      );

  const returnUnitPrice =
    isRoundTrip && returnFlight
      ? Number(
        returnFlight?.selectedTier?.unitPrice ||
          (returnFlight?.selectedTier?.price ? returnFlight.selectedTier.price / initialPaxWeight : 0) ||
          returnFlight?.fares?.[0]?.totalAmount ||
          returnFlight?.totalAmount ||
          0,
      )
      : 0;

  const fallbackUnitTotal =
    rawBaseFare + rawTaxes > 0
      ? rawBaseFare + rawTaxes
      : outboundUnitPrice + returnUnitPrice > 0
        ? outboundUnitPrice + returnUnitPrice
        : 0;

  const netSupplierBase = rawBaseFare > 0 ? rawBaseFare : Math.round(fallbackUnitTotal * 0.8);
  const unitAdultBase = Math.round(netSupplierBase * multiplier);

  const unitAdultTaxes =
    rawTaxes > 0
      ? Math.round(rawTaxes * multiplier)
      : Math.max(0, Math.round(fallbackUnitTotal * 0.2 * multiplier));

  const unitChildBase = Math.round(unitAdultBase * 0.75);
  const unitChildTaxes = unitAdultTaxes;

  const unitInfantBase = Math.round(unitAdultBase * 0.10);
  const unitInfantTaxes = Math.round(unitAdultTaxes * 0.25);

  const adultBaseTotal = unitAdultBase * currentAdultsCount;
  const childBaseTotal = unitChildBase * currentChildrenCount;
  const infantBaseTotal = unitInfantBase * currentInfantsCount;
  const computedBaseFare = adultBaseTotal + childBaseTotal + infantBaseTotal;

  const adultTaxesTotal = unitAdultTaxes * currentAdultsCount;
  const childTaxesTotal = unitChildTaxes * currentChildrenCount;
  const infantTaxesTotal = unitInfantTaxes * currentInfantsCount;
  const computedTaxes = adultTaxesTotal + childTaxesTotal + infantTaxesTotal;

  // Add-on Totals (Baggage + Meals + Seats)
  const baggageTotal = Object.values(selectedSsr).reduce(
    (acc, item) => acc + (Number(item?.baggage?.price) || 0),
    0
  );
  const mealTotal = Object.values(selectedSsr).reduce(
    (acc, item) => acc + (Number(item?.meal?.price) || 0),
    0
  );
  const seatTotal = Object.values(selectedSeats).reduce(
    (acc, seat) => acc + (Number(seat?.amount || seat?.Amount) || 0),
    0
  );

  const grandTotal = computedBaseFare + computedTaxes + baggageTotal + mealTotal + seatTotal;

  if (!traceId || !resultIndex) {
    return (
      <>
        <CommonHeader />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Flight Selection Needed</h2>
            <p className="text-gray-500 text-sm mb-6">
              Please search and select a flight from the list before reviewing fare details.
            </p>
            <button
              onClick={() => navigate("/flight")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition shadow-md"
            >
              Back to Flight Search
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <CommonHeader />
      <div className="min-h-screen bg-slate-100/70 py-6 mt-16 sm:mt-20">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          {/* Page Heading & Countdown Badge */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 uppercase tracking-widest mb-1.5">
                <span>Flight Booking</span>
                <span>›</span>
                <span className="text-gray-500">{selectedFareTier || "Flight Summary"}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Flight Summary & Booking</span>
                {fareQuoteLoading && <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />}
              </h1>
              <p className="text-gray-500 mt-1 text-xs sm:text-sm">
                Review your flight itinerary, traveller details, and live fare confirmation.
              </p>
            </div>

            {/* Session Expiry Countdown Badge */}
            <div
              className={`self-start sm:self-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors shadow-sm ${
                sessionTimeLeft === 0
                  ? "bg-red-50 text-red-700 border-red-200"
                  : sessionTimeLeft < 180
                  ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                  : "bg-teal-50 text-teal-700 border-teal-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>
                {sessionTimeLeft === 0
                  ? "Fare Hold Expired"
                  : `Live Price Locked: ${formatTimer(sessionTimeLeft)}`}
              </span>
            </div>
          </div>

          {/* Expired Session / 502 Bad Gateway Recovery Card */}
          {isExpiredSession && (
            <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4 sm:p-5 shadow-sm text-amber-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-amber-100 rounded-xl text-amber-700 shrink-0 mt-0.5">
                  <RefreshCw className={`w-5 h-5 ${isRefreshingSession ? "animate-spin" : ""}`} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-amber-950 flex items-center gap-2">
                    <span>Airline Fare Session Expired (502 / Timeout)</span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-amber-200 text-amber-900 rounded">
                      GDS Session
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm text-amber-800 mt-1 leading-relaxed">
                    Airlines only guarantee live seat availability for 10–15 minutes. 
                    Click <strong>Refresh Live Fare</strong> to reconnect with the airline system and lock in current seats without losing your entered passenger details.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRefreshSession}
                disabled={isRefreshingSession}
                className="w-full md:w-auto shrink-0 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshingSession ? "animate-spin" : ""}`} />
                <span>{isRefreshingSession ? "Refreshing Fare..." : "Refresh Live Fare"}</span>
              </button>
            </div>
          )}

          {/* Other Non-Expired Fare Quote Errors */}
          {fareQuoteError && !isExpiredSession && !flight && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
              <span>{fareQuoteError === "Internal Server Error" ? "Failed to verify flight fare. Please try searching again." : fareQuoteError}</span>
            </div>
          )}
          {fareQuoteError && !isExpiredSession && flight && (
            <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 p-3.5 sm:p-4 rounded-xl flex items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Using verified search fare. You can continue with passenger details and booking.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (currentTraceId && currentResultIndex) {
                    dispatch(getFareQuote({ traceId: currentTraceId, resultIndex: currentResultIndex }));
                  }
                }}
                className="shrink-0 px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left Main Content */}
            <div className="xl:col-span-8 space-y-6">
              <FlightSummaryCard
                fareQuote={fareQuote}
                flight={currentFlight || flight}
                returnFlight={returnFlight}
                selectedFareTier={selectedFareTier}
                loading={fareQuoteLoading}
              />

              <ImportantInformation />

              <TravellerDetails
                traceId={currentTraceId}
                resultIndex={currentResultIndex}
                flightId={flightId}
                cardId={cardId}
                isInHouse={Boolean(
                  state.isInHouse ?? cachedBooking.isInHouse ?? flight?.isInHouse,
                )}
                isOffer={isOffer}
                offerId={offerId}
                selectedOffer={selectedOffer}
                flight={currentFlight || flight}
                selectedSsr={selectedSsr}
                selectedSeats={selectedSeats}
                fareQuote={fareQuote || state.verifiedFareQuote || cachedBooking.verifiedFareQuote}
                passengerSlots={passengerSlots}
                setPassengerSlots={setPassengerSlots}
                onAddPassenger={handleAddPassenger}
                onRemovePassenger={handleRemovePassenger}
                formId="booking-traveller-form"
                onLoadingChange={(loading) => setBookingLoading(loading)}
                grandTotal={grandTotal}
                netFare={netSupplierBase + rawTaxes}
                retailFare={grandTotal}
                onRequireLogin={() =>
                  openLoginModal({
                    message: "Please sign in to proceed with flight passenger booking.",
                    onSuccess: () => {
                      toast.success("Signed in! You can now continue with your flight booking.");
                    },
                  })
                }
              />

              {!isOffer && (
                <>
                  <SsrSelection
                    ssrData={ssrData}
                    loading={ssrLoading}
                    passengerCount={totalPassengerCount}
                    passengerList={seatEligiblePassengers}
                    onSelectionChange={(updated) => setSelectedSsr(updated)}
                  />

                  <SeatMapSelection
                    seatMapData={seatMapData}
                    loading={seatMapLoading}
                    passengerCount={totalPassengerCount}
                    passengerList={seatEligiblePassengers}
                    onAddPassenger={handleAddPassenger}
                    onRemovePassenger={handleRemovePassenger}
                    onSelectionChange={(updated) => setSelectedSeats(updated)}
                  />
                </>
              )}

              {/* 6. Payment / Complete Booking Action Card (Under Seat Card) */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-5 transition-all">
                <div>
                  <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-0.5">
                    Grand Total ({totalTravellersCount} Traveller{totalTravellersCount > 1 ? "s" : ""})
                  </span>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900">
                      ₹{grandTotal.toLocaleString()}
                    </span>
                    <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      All taxes & seats included
                    </span>
                  </div>
                </div>
                <button
                  type="submit"
                  form="booking-traveller-form"
                  disabled={bookingLoading || isRefreshingSession || (isExpiredSession && !fareQuote)}
                  onClick={(e) => {
                    if (isExpiredSession && !fareQuote) {
                      e.preventDefault();
                      handleRefreshSession();
                    }
                  }}
                  className={`w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold px-9 py-4 rounded-xl text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 ${
                    bookingLoading || isRefreshingSession ? "opacity-75 cursor-not-allowed" : ""
                  }`}
                >
                  {bookingLoading || isRefreshingSession ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isExpiredSession && !fareQuote ? (
                    <RefreshCw className="w-5 h-5" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                  <span>
                    {bookingLoading
                      ? "Processing Booking..."
                      : isRefreshingSession
                      ? "Refreshing Live Fares..."
                      : isExpiredSession && !fareQuote
                      ? "Refresh Fare to Proceed"
                      : "Proceed to Payment"}
                  </span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Right Fare Breakdown Sticky Sidebar */}
            <div className="xl:col-span-4 sticky top-24 self-start z-20">
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                  <div className="border-b border-gray-200 p-5 bg-gray-50 flex items-center justify-between">
                    <h2 className="font-bold text-lg text-slate-800">Fare Summary</h2>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                      {totalTravellersCount} Traveller{totalTravellersCount > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="p-5 space-y-3 text-sm text-slate-700">
                    {/* Adult Base Fare */}
                    {currentAdultsCount > 0 && (
                      <div className="flex justify-between items-center">
                        <div>
                          <span>Adult Base Fare</span>
                          <span className="text-xs text-gray-400 block">
                            {currentAdultsCount} × ₹{unitAdultBase.toLocaleString()}
                          </span>
                        </div>
                        <span className="font-semibold">₹{adultBaseTotal.toLocaleString()}</span>
                      </div>
                    )}

                    {/* Child Base Fare */}
                    {currentChildrenCount > 0 && (
                      <div className="flex justify-between items-center">
                        <div>
                          <span>Child Base Fare</span>
                          <span className="text-xs text-gray-400 block">
                            {currentChildrenCount} × ₹{unitChildBase.toLocaleString()} (75%)
                          </span>
                        </div>
                        <span className="font-semibold">₹{childBaseTotal.toLocaleString()}</span>
                      </div>
                    )}

                    {/* Infant Base Fare */}
                    {currentInfantsCount > 0 && (
                      <div className="flex justify-between items-center">
                        <div>
                          <span>Infant Base Fare</span>
                          <span className="text-xs text-gray-400 block">
                            {currentInfantsCount} × ₹{unitInfantBase.toLocaleString()} (10%)
                          </span>
                        </div>
                        <span className="font-semibold">₹{infantBaseTotal.toLocaleString()}</span>
                      </div>
                    )}

                    {/* Taxes & Surcharges */}
                    <div className="flex justify-between items-center">
                      <div>
                        <span>Taxes & Surcharges</span>
                        <span className="text-xs text-gray-400 block">
                          ₹{unitAdultTaxes.toLocaleString()} × {currentAdultsCount + currentChildrenCount} Pax
                          {currentInfantsCount > 0 ? ` + ₹${infantTaxesTotal.toLocaleString()} infant tax` : ""}
                        </span>
                      </div>
                      <span className="font-semibold">₹{computedTaxes.toLocaleString()}</span>
                    </div>

                    {baggageTotal > 0 && (
                      <div className="flex justify-between text-blue-700">
                        <span>Excess Baggage</span>
                        <span className="font-semibold">+₹{baggageTotal.toLocaleString()}</span>
                      </div>
                    )}

                    {mealTotal > 0 && (
                      <div className="flex justify-between text-blue-700">
                        <span>In-flight Meals</span>
                        <span className="font-semibold">+₹{mealTotal.toLocaleString()}</span>
                      </div>
                    )}

                    {seatTotal > 0 && (
                      <div className="flex justify-between text-blue-700">
                        <span>Seat Selection ({Object.keys(selectedSeats).length} Seats)</span>
                        <span className="font-semibold">+₹{seatTotal.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="border-b border-gray-200 pt-2" />

                    <div className="flex justify-between items-baseline pt-1">
                      <div>
                        <span className="text-base font-extrabold text-slate-900 block">Total Amount</span>
                        <span className="text-xs text-gray-400">
                          For {totalTravellersCount} traveller{totalTravellersCount > 1 ? "s" : ""} (all taxes incl.)
                        </span>
                      </div>
                      <span className="text-2xl font-black text-teal-700">₹{grandTotal.toLocaleString()}</span>
                    </div>

                    {/* Sidebar Proceed to Payment Button */}
                    <div className="pt-3">
                      <button
                        type="submit"
                        form="booking-traveller-form"
                        disabled={bookingLoading}
                        className={`w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                          bookingLoading ? "opacity-75 cursor-not-allowed" : ""
                        }`}
                      >
                        {bookingLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                        <span>{bookingLoading ? "Processing..." : "Proceed to Payment"}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Fare Guarantee / Safe Booking Card */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-xs text-green-800">
                  <p className="font-bold text-green-900 mb-1">✓ Verified Airline Fare</p>
                  <p>Prices locked upon booking. Taxes & mandatory fees included.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FareQuoteDetails;
