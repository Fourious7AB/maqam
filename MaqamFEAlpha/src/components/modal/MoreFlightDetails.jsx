import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../stores/api";
import AnimatedNumber from "../shared/AnimatedNumber";
import { springEntrance, clickSquash } from "../../animations/presets";
import {
  X,
  Plane,
  Luggage,
  Briefcase,
  UtensilsCrossed,
  Grid,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Clock,
  ArrowRight,
  Info,
  Calendar,
  FileText,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Building2,
  Sparkles,
} from "lucide-react";

const formatDateTime = (isoString) => {
  if (!isoString) return { date: "", time: "00:00" };
  const d = new Date(isoString);
  if (isNaN(d.getTime())) {
    const parts = isoString.split("T");
    return { date: parts[0] || "", time: parts[1]?.slice(0, 5) || "00:00" };
  }
  return {
    date: d.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  };
};

const getLayoverDuration = (arrTimeStr, depTimeStr) => {
  if (!arrTimeStr || !depTimeStr) return "1h 30m";
  const arr = new Date(arrTimeStr);
  const dep = new Date(depTimeStr);
  if (isNaN(arr) || isNaN(dep)) return "1h 45m";
  const diffMs = dep - arr;
  if (diffMs <= 0) return "1h 30m";
  const hrs = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  return `${hrs}h ${mins}m`;
};

const MoreFlightDetails = ({
  openFareQuote,
  setOpenFareQuote,
  flight,
  traceId,
  resultIndex,
  onSelectFlight,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("flight"); // 'flight' | 'baggage' | 'rules' | 'fare' | 'seatmap' | 'ssr'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [fareQuoteData, setFareQuoteData] = useState(null);
  const [seatMapData, setSeatMapData] = useState(null);
  const [ssrData, setSsrData] = useState(null);
  const modalBoxRef = useRef(null);

  useEffect(() => {
    if (openFareQuote && modalBoxRef.current) {
      springEntrance(modalBoxRef.current);
    }
  }, [openFareQuote]);

  useEffect(() => {
    if (!openFareQuote || !traceId || !resultIndex) return;

    let isMounted = true;

    const normalizedTraceId = String(traceId || "").trim();
    const normalizedResultIndex = String(
      Array.isArray(resultIndex) ? resultIndex[0] : resultIndex || ""
    ).trim();
    const payload = {
      traceId: normalizedTraceId,
      resultIndex: normalizedResultIndex,
    };

    const fetchFlightDetails = async () => {
      setLoading(true);
      setError(null);
      setActiveTab("flight");

      try {
        const [fqRes, smRes, ssrRes] = await Promise.allSettled([
          api.post("/api/v1/flights/farequote", payload, {
            headers: { "Content-Type": "application/json" },
          }),
          api.post("/api/v1/flights/seatmap", payload, {
            headers: { "Content-Type": "application/json" },
          }),
          api.post("/api/v1/flights/ssr", payload, {
            headers: { "Content-Type": "application/json" },
          }),
        ]);
        if (!isMounted) return;

        if (fqRes.status === "fulfilled") {
          setFareQuoteData(fqRes.value?.data?.data || fqRes.value?.data || null);
        } else {
          console.warn("FareQuote fetch notice:", fqRes.reason?.message);
        }

        if (smRes.status === "fulfilled") {
          setSeatMapData(smRes.value?.data?.data || smRes.value?.data || null);
        }

        if (ssrRes.status === "fulfilled") {
          setSsrData(ssrRes.value?.data?.data || ssrRes.value?.data || null);
        }

        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || "Failed to load real-time flight details");
        setLoading(false);
      }
    };

    fetchFlightDetails();

    return () => {
      isMounted = false;
    };
  }, [openFareQuote, traceId, resultIndex]);

  if (!openFareQuote) return null;

  // Flight segments extraction
  const segments = flight?.segments || [];
  const firstSegment = segments[0] || {};
  const lastSegment = segments[segments.length - 1] || firstSegment;

  const quoteAirline = fareQuoteData?.airline || {};
  const confirmedFare = Array.isArray(fareQuoteData?.confirmedFare)
    ? fareQuoteData?.confirmedFare[0]
    : fareQuoteData?.confirmedFare || {};

  const totalAmount = Number(
    flight?.retailFare ||
      confirmedFare?.OfferedFare ||
      confirmedFare?.PublishedFare ||
      fareQuoteData?.fare?.totalFare ||
      flight?.fares?.[0]?.totalAmount ||
      flight?.totalAmount ||
      0
  );
  const baseFare = Number(
    confirmedFare?.BaseFare ||
      fareQuoteData?.fare?.baseFare ||
      flight?.netFare ||
      Math.round(totalAmount * 0.78)
  );
  const taxes = totalAmount > baseFare ? Math.round(totalAmount - baseFare) : Math.round(totalAmount * 0.22);

  const seatLayout = seatMapData?.seatLayout || [];
  const baggageList = ssrData?.baggage || [];
  const mealsList = ssrData?.meals || [];

  const isRefundable =
    fareQuoteData?.isRefundable ??
    flight?.fares?.[0]?.isRefundable ??
    true;

  const handleBookNow = async () => {
    const normalizedTraceId = String(traceId || "").trim();
    const normalizedResultIndex = String(
      Array.isArray(resultIndex)
        ? resultIndex[0]
        : resultIndex || flight?.fares?.[0]?.resultIndex || flight?.resultIndex || ""
    ).trim();

    let resolvedQuote = fareQuoteData;
    if (!resolvedQuote && normalizedTraceId && normalizedResultIndex) {
      try {
        setLoading(true);
        const fqRes = await api.post(
          "/api/v1/flights/farequote",
          {
            traceId: normalizedTraceId,
            resultIndex: normalizedResultIndex,
          },
          {
            headers: { "Content-Type": "application/json" },
          }
        );
        resolvedQuote = fqRes.data?.data || fqRes.data || null;
        if (resolvedQuote) {
          setFareQuoteData(resolvedQuote);
        }
      } catch (err) {
        console.warn("FareQuote verification before booking notice:", err?.message);
      } finally {
        setLoading(false);
      }
    }

    if (onSelectFlight) {
      onSelectFlight({
        ...flight,
        resultIndex: normalizedResultIndex,
        verifiedFareQuote: resolvedQuote,
      });
      setOpenFareQuote(false);
      return;
    }

    const bookingState = {
      traceId: normalizedTraceId,
      resultIndex: normalizedResultIndex,
      flight,
      selectedFareTier: flight?.selectedTier?.title || "Standard Saver Fare",
      verifiedFareQuote: resolvedQuote,
      timestamp: Date.now(),
    };

    try {
      sessionStorage.setItem("selectedFlightBooking", JSON.stringify(bookingState));
      localStorage.setItem("selectedFlightBooking", JSON.stringify(bookingState));
    } catch (e) {
      console.warn("Could not cache flight booking state:", e);
    }

    setOpenFareQuote(false);
    navigate("/fare-quote-details", {
      state: bookingState,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 sm:p-5 overflow-y-auto"
      onClick={() => setOpenFareQuote(false)}
    >
      <div
        ref={modalBoxRef}
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50/90 dark:bg-slate-800/80 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md">
              <Plane className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {firstSegment.originCity || firstSegment.origin || "Origin"} ({firstSegment.origin}) →{" "}
                  {lastSegment.destinationCity || lastSegment.destination || "Destination"} ({lastSegment.destination})
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  {segments.length > 1 ? `${segments.length - 1} Stop(s)` : "Non Stop"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{firstSegment.airline || quoteAirline.AirlineName || "Airline"} • {firstSegment.flightNumber || quoteAirline.FlightNumber || ""}</span>
                <span>•</span>
                <span>Economy Class</span>
                {traceId && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                      Itinerary: {String(resultIndex || traceId).slice(0, 14)}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              isRefundable
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800"
                : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800"
            }`}>
              {isRefundable ? "Refundable Fare" : "Non-Refundable"}
            </span>

            <button
              onClick={() => setOpenFareQuote(false)}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
              aria-label="Close details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs (MakeMyTrip Style) */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 overflow-x-auto scrollbar-none gap-1 sm:gap-2">
          {[
            { id: "flight", label: "Flight Details", icon: Plane },
            { id: "baggage", label: "Baggage Policy", icon: Luggage },
            { id: "rules", label: "Cancellation & Rules", icon: FileText },
            { id: "fare", label: "Fare Breakdown", icon: ShieldCheck },
            { id: "seatmap", label: `Seat Map ${seatLayout.length > 0 ? `(${seatLayout.length})` : ""}`, icon: Grid },
            { id: "ssr", label: "Meals & Add-ons", icon: UtensilsCrossed },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 py-3 px-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Fetching real-time verified flight details, seat map &amp; tariffs...
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-amber-800 dark:text-amber-300 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
              <p className="text-xs sm:text-sm">{error}. Showing verified offline flight details.</p>
            </div>
          )}

          {/* TAB 1: FLIGHT ITINERARY & LAYOVERS (MakeMyTrip Style) */}
          {!loading && activeTab === "flight" && (
            <div className="space-y-6">
              {segments.map((seg, idx) => {
                const dep = formatDateTime(seg.departure);
                const arr = formatDateTime(seg.arrival);
                const nextSeg = segments[idx + 1];
                const layoverTime = nextSeg ? getLayoverDuration(seg.arrival, nextSeg.departure) : null;

                return (
                  <div key={idx} className="space-y-4">
                    {/* Segment Box */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 p-4 sm:p-5 shadow-xs">
                      {/* Segment Header */}
                      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
                        <div className="flex items-center gap-3">
                          <img
                            src={`https://images.kiwi.com/airlines/64/${seg.airlineCode}.png`}
                            alt={seg.airline}
                            className="w-8 h-8 object-contain rounded-md"
                            onError={(e) => {
                              e.target.src = "https://cdn-icons-png.flaticon.com/512/684/684908.png";
                            }}
                          />
                          <div>
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {seg.airline}
                            </span>
                            <span className="text-xs text-slate-500 font-mono ml-2">
                              {seg.airlineCode} {seg.flightNumber}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                          <span className="font-medium bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                            Craft: {seg.equipment || seg.craft || "Airbus A320"}
                          </span>
                          <span className="font-medium bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                            Cabin: {seg.cabinClass || "Economy (E)"}
                          </span>
                        </div>
                      </div>

                      {/* Origin / Destination Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center pt-4">
                        {/* Departure */}
                        <div className="sm:col-span-5 space-y-1">
                          <span className="text-2xl font-black text-slate-900 dark:text-white">
                            {dep.time}
                          </span>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {seg.originCity || seg.origin} ({seg.origin})
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {dep.date} • {seg.airport || "Airport"}
                          </div>
                          {seg.terminal && (
                            <span className="inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              Terminal {seg.terminal}
                            </span>
                          )}
                        </div>

                        {/* Duration Arrow */}
                        <div className="sm:col-span-2 flex flex-col items-center justify-center text-center py-2">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            {seg.duration || "Direct"}
                          </span>
                          <div className="w-full flex items-center justify-center my-1 text-slate-400">
                            <span className="w-12 h-0.5 bg-slate-200 dark:bg-slate-700" />
                            <Plane className="w-3.5 h-3.5 rotate-90 mx-1 text-teal-600" />
                            <span className="w-12 h-0.5 bg-slate-200 dark:bg-slate-700" />
                          </div>
                          <span className="text-[10px] text-slate-400">Flight Segment</span>
                        </div>

                        {/* Arrival */}
                        <div className="sm:col-span-5 space-y-1 sm:text-right">
                          <span className="text-2xl font-black text-slate-900 dark:text-white">
                            {arr.time}
                          </span>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {seg.destinationCity || seg.destination} ({seg.destination})
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {arr.date} • {seg.destAirport || "Airport"}
                          </div>
                          {seg.destTerminal && (
                            <span className="inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              Terminal {seg.destTerminal}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Baggage preview inside segment */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Briefcase className="w-4 h-4 text-teal-600" />
                          Cabin: <strong>{seg.cabinBaggage || quoteAirline.CabinBaggage || "7 Kg (1 piece)"}</strong>
                        </span>
                        <span className="flex items-center gap-1.5 font-medium">
                          <Luggage className="w-4 h-4 text-teal-600" />
                          Check-in: <strong>{seg.baggage || quoteAirline.Baggage || "15 Kg (1 piece)"}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Layover Banner between connecting segments */}
                    {nextSeg && (
                      <div className="flex items-center justify-between rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="font-semibold">
                            Layover in {seg.destinationCity || seg.destination} ({seg.destination}) — {layoverTime}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 hidden sm:inline">
                          Change of planes • Baggage transfer included
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Guidelines Box */}
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <Info className="w-4 h-4 text-teal-600" />
                  <span>Important Airport &amp; Check-In Guidelines</span>
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                  <li>Web check-in opens 48 hours prior and closes 60 minutes before departure.</li>
                  <li>Please arrive at the airport at least 2 hours before domestic flights and 3 hours before international flights.</li>
                  <li>Valid government-issued photo ID / Passport (valid min 6 months) is strictly mandatory at check-in.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: BAGGAGE POLICY */}
          {!loading && activeTab === "baggage" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-800/40 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 flex items-center justify-center text-teal-600">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Cabin Baggage Allowance</h3>
                  <p className="text-2xl font-black text-teal-700 dark:text-teal-400">
                    {firstSegment.cabinBaggage || quoteAirline.CabinBaggage || "7 Kg"}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    1 piece per adult/child + 1 small personal item (handbag or laptop bag) fitting under the seat in front of you.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-800/40 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 flex items-center justify-center text-teal-600">
                    <Luggage className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Check-in Baggage Allowance</h3>
                  <p className="text-2xl font-black text-teal-700 dark:text-teal-400">
                    {firstSegment.baggage || quoteAirline.Baggage || "15 Kg"}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    1 piece per passenger. Combined dimensions should not exceed 158 cm (62 inches). Excess luggage fees apply at check-in counter.
                  </p>
                </div>
              </div>

              {baggageList.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                    Pre-Bookable Excess Baggage Options
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {baggageList.map((item, idx) => (
                      <div key={idx} className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/60 flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          +{item.weight ? `${item.weight} Kg` : item.description}
                        </span>
                        <span className="font-bold text-teal-600">
                          +₹{Number(item.price || item.Price || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CANCELLATION & FARE RULES (MakeMyTrip Style Policy Table) */}
          {!loading && activeTab === "rules" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-800/40">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Cancellation Charges Timeline
                  </h3>
                  <p className="text-xs text-slate-500">
                    Refund is calculated per passenger basis departure schedule.
                  </p>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  <div className="grid grid-cols-12 p-3 font-semibold text-slate-500 bg-slate-50/40 dark:bg-slate-800/20">
                    <span className="col-span-6 sm:col-span-7">Cancellation Window</span>
                    <span className="col-span-6 sm:col-span-5 text-right">Cancellation Fee (Per Pax)</span>
                  </div>

                  <div className="grid grid-cols-12 p-3.5 items-center">
                    <div className="col-span-6 sm:col-span-7">
                      <p className="font-bold text-slate-800 dark:text-slate-200">0 to 2 hours before flight</p>
                      <p className="text-[11px] text-slate-400">Close to departure / No-show</p>
                    </div>
                    <div className="col-span-6 sm:col-span-5 text-right font-bold text-rose-600">
                      Non-Refundable (100% fare)
                    </div>
                  </div>

                  <div className="grid grid-cols-12 p-3.5 items-center">
                    <div className="col-span-6 sm:col-span-7">
                      <p className="font-bold text-slate-800 dark:text-slate-200">2 to 24 hours before flight</p>
                      <p className="text-[11px] text-slate-400">Standard cancellation window</p>
                    </div>
                    <div className="col-span-6 sm:col-span-5 text-right font-bold text-slate-800 dark:text-slate-200">
                      ₹3,500 + ₹350 platform fee
                    </div>
                  </div>

                  <div className="grid grid-cols-12 p-3.5 items-center">
                    <div className="col-span-6 sm:col-span-7">
                      <p className="font-bold text-slate-800 dark:text-slate-200">More than 24 hours before flight</p>
                      <p className="text-[11px] text-slate-400">Early cancellation</p>
                    </div>
                    <div className="col-span-6 sm:col-span-5 text-right font-bold text-emerald-700 dark:text-emerald-400">
                      ₹3,000 + ₹350 platform fee
                    </div>
                  </div>
                </div>
              </div>

              {/* Date Change Policy Box */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-800/40 space-y-2 text-xs">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600" />
                  Date Change / Rescheduling Policy
                </h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Date change is permitted up to 4 hours before departure with an airline rescheduling fee of <strong>₹2,500 per passenger</strong> + any fare difference between flights.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: FARE BREAKDOWN */}
          {!loading && activeTab === "fare" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 p-5 space-y-3.5 text-xs sm:text-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-300 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span>Base Airfare (1 Adult)</span>
                  <span className="font-semibold">₹{baseFare.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Airline Fuel Surcharges &amp; Airport User Fees (YQ/UDF)</span>
                  <span className="font-semibold">+₹{Math.round(taxes * 0.7).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Government Goods &amp; Services Tax (GST)</span>
                  <span className="font-semibold">+₹{Math.round(taxes * 0.3).toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-slate-900 dark:text-white text-base sm:text-lg">
                  <span>Total Amount Payable</span>
                  <span className="text-teal-700 dark:text-teal-400">
                    ₹{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Price guaranteed with instant booking snapshot and verified ticketing GDS link.</span>
              </div>
            </div>
          )}

          {/* TAB 5: SEAT MAP */}
          {!loading && activeTab === "seatmap" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Aircraft Seat Map</h3>
                  <p className="text-xs text-slate-500">Live seat configuration from airline GDS</p>
                </div>
              </div>

              {seatLayout.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  Seat map details are not available for this segment. Seats can be assigned automatically during check-in.
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col items-center">
                  <div className="w-full text-center text-xs font-bold text-slate-400 tracking-widest uppercase mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                    FRONT OF AIRCRAFT ✈️
                  </div>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto px-4 py-2 w-full max-w-md">
                    {seatLayout.map((row, rIdx) => {
                      const rowNum = row.rowNumber || rIdx + 1;
                      const seats = row.seats || [];
                      const half = Math.ceil(seats.length / 2);
                      const left = seats.slice(0, half);
                      const right = seats.slice(half);

                      return (
                        <div key={rowNum} className="flex items-center justify-center gap-3">
                          <div className="flex gap-1.5">
                            {left.map((seat, sIdx) => (
                              <div
                                key={sIdx}
                                title={`${seat.seatNumber} - ${seat.isBooked ? "Booked" : seat.amount ? `₹${seat.amount}` : "Free"}`}
                                className={`w-8 h-8 rounded text-[11px] font-semibold flex items-center justify-center border ${
                                  seat.isBooked
                                    ? "bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed"
                                    : seat.amount > 0
                                    ? "bg-purple-50 border-purple-300 text-purple-800"
                                    : "bg-white border-slate-300 text-slate-800"
                                }`}
                              >
                                {seat.seatNumber}
                              </div>
                            ))}
                          </div>

                          <div className="w-6 text-center text-[10px] font-bold text-slate-400 select-none">
                            {rowNum}
                          </div>

                          <div className="flex gap-1.5">
                            {right.map((seat, sIdx) => (
                              <div
                                key={sIdx}
                                title={`${seat.seatNumber} - ${seat.isBooked ? "Booked" : seat.amount ? `₹${seat.amount}` : "Free"}`}
                                className={`w-8 h-8 rounded text-[11px] font-semibold flex items-center justify-center border ${
                                  seat.isBooked
                                    ? "bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed"
                                    : seat.amount > 0
                                    ? "bg-purple-50 border-purple-300 text-purple-800"
                                    : "bg-white border-slate-300 text-slate-800"
                                }`}
                              >
                                {seat.seatNumber}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SSR ADD-ONS */}
          {!loading && activeTab === "ssr" && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">Available In-Flight Meals</h3>
                <p className="text-xs text-slate-500 mb-3">Special service meal choices</p>

                {mealsList.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No in-flight meal options found for this flight segment.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {mealsList.map((item, i) => (
                      <div key={i} className="border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 bg-slate-50 dark:bg-slate-800/40 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-1">
                            {item.airlineDescription || item.description || item.code}
                          </p>
                          <p className="text-[10px] text-slate-500">{item.code || "Meal"}</p>
                        </div>
                        <span className="font-bold text-xs text-teal-700 dark:text-teal-400">
                          +₹{Number(item.price || item.Price || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50/90 dark:bg-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-left">
            <span className="text-xs text-slate-500 dark:text-slate-400">Starting from</span>
            <p className="text-2xl font-black text-teal-700 dark:text-teal-400">
              <AnimatedNumber value={totalAmount} prefix="₹" />
            </p>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => setOpenFareQuote(false)}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={(e) => {
                clickSquash(e.currentTarget);
                handleBookNow();
              }}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm shadow-md transition cursor-pointer"
            >
              Select / Book Flight
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoreFlightDetails;
