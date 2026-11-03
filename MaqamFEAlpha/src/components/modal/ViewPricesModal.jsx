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
  ShieldCheck,
  Check,
  ArrowRight,
  Sparkles,
  Utensils,
  Armchair,
  RefreshCw,
  Loader2,
  Lock,
} from "lucide-react";

const ViewPricesModal = ({
  openViewPrices,
  setOpenViewPrices,
  flight,
  returnFlight,
  isRoundTrip,
  onConfirmTier,
  traceId,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fareQuotes, setFareQuotes] = useState({});
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);
  const modalBoxRef = useRef(null);

  useEffect(() => {
    if (openViewPrices && modalBoxRef.current) {
      springEntrance(modalBoxRef.current);
    }
  }, [openViewPrices]);

  const searchParams = (() => {
    try {
      return JSON.parse(localStorage.getItem("flightSearch")) || {};
    } catch {
      return {};
    }
  })();
  const searchPax = searchParams.passengers || {};
  const adultCount = Math.max(1, Number(searchPax.adults ?? searchPax.adult ?? 1));
  const childCount = Math.max(0, Number(searchPax.children ?? searchPax.child ?? 0));
  const infantCount = Math.max(0, Number(searchPax.infants ?? searchPax.infant ?? 0));
  const totalPassengerCount = adultCount + childCount + infantCount;
  const paxMultiplier = adultCount + (childCount * 0.75) + (infantCount * 0.10);

  const segments = flight?.segments || [];
  const firstSegment = segments[0] || {};
  const lastSegment = segments[segments.length - 1] || firstSegment;

  const depDateStr = firstSegment.departure
    ? new Date(firstSegment.departure).toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : "";

  const depTime = firstSegment.departure?.split("T")?.[1]?.slice(0, 5) || "00:00";
  const arrTime = lastSegment.arrival?.split("T")?.[1]?.slice(0, 5) || "00:00";

  // Calculate duration
  let durationStr = "Direct";
  if (firstSegment.departure && lastSegment.arrival) {
    const start = new Date(firstSegment.departure);
    const end = new Date(lastSegment.arrival);
    if (!isNaN(start) && !isNaN(end)) {
      const diffMs = end - start;
      if (diffMs > 0) {
        const hrs = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        durationStr = `${hrs}h ${mins}m`;
      }
    }
  }

  // Build fare tiers from live SRDV fares
  const fares = flight?.fares || [];
  const basePrice = Number(fares[0]?.totalAmount || flight?.totalAmount || 0);

  const tierTemplates = [
    {
      id: "saver",
      title: "Saver Fare",
      subtext: "Best price for light & direct travel",
      priceMultiplier: 1.0,
      tag: "Best Value",
      theme: "slate",
      features: [
        { icon: Briefcase, text: "7 Kg Cabin Baggage", included: true },
        { icon: Luggage, text: "15 Kg Check-in Baggage", included: true },
        { icon: RefreshCw, text: "Standard Date Change Fee", included: false, detail: "Airline fee applies" },
        { icon: ShieldCheck, text: "Standard Cancellation Policy", included: false, detail: "Airline terms apply" },
        { icon: Armchair, text: "Seat Selection", included: false, detail: "Available as add-on" },
        { icon: Utensils, text: "In-Flight Meal", included: false, detail: "Available as add-on" },
      ],
    },
    ...(fares.length > 1
      ? [
          {
            id: "flexi",
            title: "Flexi Comfort",
            subtext: "Maximum freedom with included perks",
            priceMultiplier: 1.0,
            tag: "Recommended",
            theme: "indigo",
            features: [
              { icon: Briefcase, text: "7 Kg Cabin Baggage", included: true },
              { icon: Luggage, text: "15 Kg Check-in Baggage", included: true },
              { icon: RefreshCw, text: "Lower Rescheduling / Date Change", included: true, detail: "Up to 3 hrs before departure" },
              { icon: ShieldCheck, text: "Lower Cancellation Penalty", included: true, detail: "Reduced airline penalty" },
              { icon: Armchair, text: "Standard Seat Included", included: true, detail: "Free seat assignment" },
              { icon: Utensils, text: "Complimentary In-Flight Meal", included: true, detail: "Snack/Meal box included" },
            ],
          },
        ]
      : []),
  ];

  // Combine with live API fare tiers and verified farequote
  const availableTiers = tierTemplates.map((tier, idx) => {
    const apiFare = fares[idx] || fares[0];
    const rawIdx = apiFare?.resultIndex || flight?.resultIndex || fares[0]?.resultIndex || "";
    const resultIndex = Array.isArray(rawIdx) ? String(rawIdx[0] || "") : String(rawIdx || "");
    const verifiedQuote = fareQuotes[resultIndex];
    const verifiedConfirmed = Array.isArray(verifiedQuote?.confirmedFare)
      ? verifiedQuote.confirmedFare[0]
      : verifiedQuote?.confirmedFare || verifiedQuote?.fare || {};
    const verifiedTotal = Number(
      verifiedConfirmed?.OfferedFare ||
        verifiedConfirmed?.PublishedFare ||
        verifiedQuote?.fare?.totalFare ||
        verifiedQuote?.totalAmount ||
        0
    );

    const unitPrice =
      verifiedTotal > 0
        ? verifiedTotal
        : apiFare
        ? Number(apiFare.totalAmount || basePrice)
        : Math.round(basePrice * tier.priceMultiplier);

    const totalPrice = Math.round(unitPrice * (paxMultiplier || 1));

    return {
      ...tier,
      unitPrice,
      price: totalPrice,
      resultIndex,
      isRefundable:
        verifiedQuote?.isRefundable ?? (apiFare ? apiFare.isRefundable : true),
    };
  });

  const activeTier = availableTiers[selectedTierIndex] || availableTiers[0];
  const activeTierResultIndex = String(activeTier?.resultIndex || "").trim();
  const hasCachedActiveQuote = Boolean(
    activeTierResultIndex && fareQuotes[activeTierResultIndex]
  );

  // Verify fare quote on open or tier switch via POST /api/v1/flights/farequote
  useEffect(() => {
    if (!openViewPrices || !traceId || !activeTierResultIndex || hasCachedActiveQuote) return;

    let isMounted = true;

    const verifyFareQuote = async () => {
      setLoading(true);

      try {
        const res = await api.post(
          "/api/v1/flights/farequote",
          {
            traceId: String(traceId).trim(),
            resultIndex: activeTierResultIndex,
          },
          {
            headers: { "Content-Type": "application/json" },
          }
        );
        if (!isMounted) return;
        const data = res.data?.data || res.data || {};
        setFareQuotes((prev) => ({ ...prev, [activeTierResultIndex]: data }));
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.warn("Live fare quote notice (using cached search price):", err?.message || err);
        setLoading(false);
      }
    };

    verifyFareQuote();

    return () => {
      isMounted = false;
    };
  }, [openViewPrices, traceId, activeTierResultIndex, hasCachedActiveQuote]);

  if (!openViewPrices) return null;

  const handleSelectTier = async (tier) => {
    const normalizedTraceId = String(traceId || "").trim();
    const normalizedResultIndex = String(
      Array.isArray(tier.resultIndex) ? tier.resultIndex[0] : tier.resultIndex || ""
    ).trim();

    let verifiedQuote = fareQuotes[normalizedResultIndex] || null;
    if (normalizedTraceId && normalizedResultIndex && !verifiedQuote) {
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
        verifiedQuote = fqRes.data?.data || fqRes.data || null;
        if (verifiedQuote) {
          setFareQuotes((prev) => ({ ...prev, [normalizedResultIndex]: verifiedQuote }));
        }
      } catch (err) {
        console.warn("Fare quote check before booking notice (using cached search price):", err?.message || err);
      } finally {
        setLoading(false);
      }
    }

    const verifiedConfirmed = Array.isArray(verifiedQuote?.confirmedFare)
      ? verifiedQuote.confirmedFare[0]
      : verifiedQuote?.confirmedFare || verifiedQuote?.fare || {};
    const verifiedTotal = Number(
      verifiedConfirmed?.OfferedFare ||
        verifiedConfirmed?.PublishedFare ||
        verifiedQuote?.fare?.totalFare ||
        verifiedQuote?.totalAmount ||
        0
    );

    const resolvedUnitPrice =
      verifiedTotal > 0 ? verifiedTotal : Number(tier.unitPrice || 0);
    const resolvedTotalPrice =
      verifiedTotal > 0
        ? Math.round(resolvedUnitPrice * (paxMultiplier || 1))
        : Number(tier.price || 0);

    const serializableTier = {
      id: tier.id,
      title: tier.title,
      subtext: tier.subtext,
      priceMultiplier: tier.priceMultiplier,
      tag: tier.tag,
      theme: tier.theme,
      unitPrice: resolvedUnitPrice,
      price: resolvedTotalPrice,
      resultIndex: normalizedResultIndex,
      isRefundable: verifiedQuote?.isRefundable ?? tier.isRefundable,
      verifiedFareQuote: verifiedQuote,
      features: (tier.features || []).map(({ text, included, detail }) => ({
        text,
        included,
        detail,
      })),
    };

    if (onConfirmTier) {
      onConfirmTier(serializableTier);
      setOpenViewPrices(false);
      return;
    }

    const bookingState = {
      traceId: normalizedTraceId,
      resultIndex: normalizedResultIndex,
      selectedFareTier: tier.title,
      flight,
      returnFlight,
      isRoundTrip: Boolean(isRoundTrip || returnFlight),
      passengers: {
        adults: adultCount,
        children: childCount,
        infants: infantCount,
      },
      selectedTier: serializableTier,
      verifiedFareQuote: verifiedQuote,
      timestamp: Date.now(),
    };

    let cleanBookingState;
    try {
      cleanBookingState = JSON.parse(JSON.stringify(bookingState));
      sessionStorage.setItem("selectedFlightBooking", JSON.stringify(cleanBookingState));
      localStorage.setItem("selectedFlightBooking", JSON.stringify(cleanBookingState));
    } catch (e) {
      console.warn("Could not cache flight booking state:", e);
      cleanBookingState = bookingState;
    }

    setOpenViewPrices(false);
    navigate("/fare-quote-details", {
      state: cleanBookingState,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 sm:p-6 overflow-y-auto"
      onClick={() => setOpenViewPrices(false)}
    >
      <div
        ref={modalBoxRef}
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Hero Strip */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white px-6 sm:px-8 py-6 relative overflow-hidden">
          {/* Subtle background graphic glow */}
          <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-white/15 backdrop-blur-sm text-xs font-semibold px-3 py-1 rounded-full text-blue-200 border border-white/10">
                  Select Fare Tier
                </span>
                {loading && (
                  <span className="flex items-center gap-1.5 text-xs text-blue-300 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying Live Airline Fares...
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-white">
                Choose Your Travel Option
              </h2>
            </div>

            <button
              onClick={() => setOpenViewPrices(false)}
              className="self-end sm:self-center rounded-full p-2.5 bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Flight Summary Bar inside header */}
          <div className="mt-5 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-sm">
                <img
                  src={`https://images.kiwi.com/airlines/64/${firstSegment.airlineCode}.png`}
                  alt={firstSegment.airline}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.src = "https://cdn-icons-png.flaticon.com/512/684/684908.png";
                  }}
                />
              </div>
              <div>
                <p className="font-bold text-white text-base">
                  {firstSegment.airline || "Airline"} • {firstSegment.flightNumber || ""}
                </p>
                <p className="text-blue-200 text-xs">{depDateStr}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 sm:gap-8">
              <div className="text-right">
                <p className="text-lg font-extrabold text-white">{depTime}</p>
                <p className="text-xs text-blue-200 font-semibold">{firstSegment.origin}</p>
              </div>

              <div className="flex flex-col items-center px-2">
                <span className="text-[11px] text-blue-200 font-medium">{durationStr}</span>
                <div className="w-16 sm:w-20 h-px bg-blue-300/40 relative my-1">
                  <Plane className="w-3.5 h-3.5 text-blue-300 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90" />
                </div>
                <span className="text-[10px] text-blue-300">Non Stop</span>
              </div>

              <div className="text-left">
                <p className="text-lg font-extrabold text-white">{arrTime}</p>
                <p className="text-xs text-blue-200 font-semibold">{lastSegment.destination}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fare Tier Comparison Grid */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {availableTiers.map((tier, index) => {
              const isFlexi = tier.id === "flexi";

              return (
                <div
                  key={tier.id}
                  onClick={() => setSelectedTierIndex(index)}
                  className={`relative flex flex-col justify-between rounded-3xl p-6 sm:p-7 transition-all duration-300 cursor-pointer ${
                    isFlexi
                      ? "bg-gradient-to-b from-white via-indigo-50/40 to-indigo-100/30 border-2 border-indigo-500 shadow-xl shadow-indigo-500/10 ring-4 ring-indigo-500/10"
                      : "bg-white border-2 border-slate-200 hover:border-slate-300 shadow-md hover:shadow-lg"
                  }`}
                >
                  {/* Top Badge */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                          isFlexi
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {isFlexi && <Sparkles className="w-3.5 h-3.5" />}
                        {tier.tag}
                      </span>
                      <h3 className="text-2xl font-extrabold text-slate-900 mt-2">
                        {tier.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">{tier.subtext}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-3xl font-black text-slate-900">
                        <AnimatedNumber value={Math.round(tier.price)} prefix="₹" />
                      </p>
                      <p className="text-xs text-slate-400 font-medium">
                        {totalPassengerCount > 1 ? `Total for ${totalPassengerCount} travellers` : "Total Fare"}
                      </p>
                      {totalPassengerCount > 1 && (
                        <p className="text-xs font-bold text-teal-700 mt-1 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 inline-block">
                          <AnimatedNumber value={Math.round(tier.unitPrice)} prefix="₹" /> / adult
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="w-full h-px bg-slate-200/80 my-4" />

                  {/* Feature Checklist */}
                  <div className="space-y-3.5 text-sm mb-6 flex-1">
                    {tier.features.map((feature, fIdx) => {
                      const Icon = feature.icon;
                      return (
                        <div key={fIdx} className="flex items-start gap-3">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              feature.included
                                ? isFlexi
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {feature.included ? (
                              <Check className="w-4 h-4 stroke-[2.5]" />
                            ) : (
                              <Icon className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>

                          <div className="flex-1">
                            <p
                              className={`font-semibold text-xs sm:text-sm ${
                                feature.included ? "text-slate-800" : "text-slate-500"
                              }`}
                            >
                              {feature.text}
                            </p>
                            {feature.detail && (
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {feature.detail}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clickSquash(e.currentTarget);
                      handleSelectTier(tier);
                    }}
                    className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] ${
                      isFlexi
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  >
                    <span>
                      Proceed with {tier.title} (₹{Math.round(tier.price).toLocaleString("en-IN")})
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Guarantee Strip */}
        <div className="border-t border-slate-200 px-6 py-3.5 bg-white flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-medium text-slate-700">
              Live Fare Confirmation: All taxes & mandatory airline surcharges included.
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Instant E-Ticket</span>
            <span>•</span>
            <span>24/7 Booking Support</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewPricesModal;
