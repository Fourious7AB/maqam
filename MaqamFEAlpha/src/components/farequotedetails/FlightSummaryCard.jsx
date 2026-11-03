import { Plane, Briefcase, Luggage, AlertTriangle, Sparkles } from "lucide-react";

const FlightSummaryCard = ({ fareQuote, flight, returnFlight, selectedFareTier, loading }) => {
  if (loading && !flight) {
    return (
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-20 bg-gray-100 rounded w-full mb-4"></div>
        <div className="h-10 bg-gray-200 rounded w-1/3"></div>
      </div>
    );
  }

  const quoteData = fareQuote?.data?.data || fareQuote?.data || fareQuote || {};
  const priceChanged = quoteData.priceChanged || quoteData.isPriceChanged;
  const timeChanged = quoteData.isTimeChanged;

  const renderLeg = (targetFlight, legLabel, isReturn = false) => {
    if (!targetFlight) return null;
    const segments = targetFlight?.segments || [];
    const firstSegment = segments[0] || {};
    const lastSegment = segments[segments.length - 1] || firstSegment;

    const origin = firstSegment.origin || "Origin";
    const destination = lastSegment.destination || "Destination";
    const originCity = firstSegment.originCity || origin;
    const destCity = lastSegment.destinationCity || destination;
    const airlineName = firstSegment.airline || "Airline";
    const airlineCode = firstSegment.airlineCode || "";
    const flightNumber = firstSegment.flightNumber || airlineCode;

    const depTime = firstSegment.departure?.split("T")?.[1]?.slice(0, 5) || "00:00";
    const arrTime = lastSegment.arrival?.split("T")?.[1]?.slice(0, 5) || "00:00";

    const depDate = firstSegment.departure
      ? new Date(firstSegment.departure).toLocaleDateString("en-US", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "";

    let duration = firstSegment.duration || "";
    if (!duration && firstSegment.departure && lastSegment.arrival) {
      const start = new Date(firstSegment.departure);
      const end = new Date(lastSegment.arrival);
      if (!isNaN(start) && !isNaN(end)) {
        const diffMs = end - start;
        if (diffMs > 0) {
          const hrs = Math.floor(diffMs / 3600000);
          const mins = Math.floor((diffMs % 3600000) / 60000);
          duration = `${hrs}h ${mins}m`;
        }
      }
    }

    const isRefundable = quoteData.isRefundable ?? targetFlight?.fares?.[0]?.isRefundable ?? true;
    const cabinBaggage = firstSegment.cabinBaggage || "7 kg (1 piece)";
    const checkInBaggage = firstSegment.baggage || "15 kg (1 piece)";

    return (
      <div className={`p-5 sm:p-7 ${isReturn ? "border-t border-gray-200/80 bg-slate-50/40" : ""}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                isReturn ? "bg-purple-100 text-purple-800" : "bg-teal-100 text-teal-800"
              }`}>
                {legLabel}
              </span>
              {depDate && <span className="text-slate-800 font-semibold text-xs">{depDate}</span>}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {originCity} ({origin}) → {destCity} ({destination})
            </h2>

            <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500 font-medium">
              <span>{duration || "Direct"}</span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold">{segments.length > 1 ? `${segments.length - 1} Stop` : "Non Stop"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {selectedFareTier && (
              <span className="inline-flex items-center gap-1 px-3.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200/60 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5" />
                {selectedFareTier}
              </span>
            )}
            <span
              className={`px-3.5 py-1 rounded-full text-xs font-semibold ${
                isRefundable
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                  : "bg-amber-50 text-amber-700 border border-amber-200/60"
              }`}
            >
              {isRefundable ? "Refundable Fare" : "Non-Refundable"}
            </span>
          </div>
        </div>

        {/* Airline Info */}
        <div className="mt-5 flex items-center gap-3.5 p-3.5 rounded-xl bg-gray-50/70 border border-gray-100">
          <img
            src={`https://images.kiwi.com/airlines/64/${airlineCode || firstSegment.airlineCode}.png`}
            alt={airlineName}
            className="w-10 h-10 rounded-lg object-contain p-1 bg-white border border-gray-200 shrink-0"
            onError={(e) => {
              e.target.src = "https://cdn-icons-png.flaticon.com/512/684/684908.png";
            }}
          />
          <div>
            <p className="font-bold text-slate-900 text-sm sm:text-base">
              {airlineName} • {flightNumber || airlineCode}
            </p>
            <p className="text-xs text-gray-500 font-medium">Economy Class</p>
          </div>
        </div>

        {/* Departure & Arrival Times */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-5 bg-white rounded-2xl border border-gray-100 shadow-2xs">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Departure</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">{depTime || "00:00"}</p>
            <p className="font-bold text-amber-600 text-sm mt-1">{originCity} ({origin})</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{firstSegment.airport || "Airport"}</p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Arrival</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">{arrTime || "00:00"}</p>
            <p className="font-bold text-slate-700 text-sm mt-1">{destCity} ({destination})</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{lastSegment.airport || "Airport"}</p>
          </div>
        </div>

        {/* If multiple segments, show layover step */}
        {segments.length > 1 && (
          <div className="mt-4 space-y-2">
            {segments.map((seg, sIdx) => {
              const sDep = seg.departure?.split("T")?.[1]?.slice(0, 5) || "00:00";
              const sArr = seg.arrival?.split("T")?.[1]?.slice(0, 5) || "00:00";
              const nextS = segments[sIdx + 1];
              return (
                <div key={sIdx} className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs gap-2">
                    <div className="flex items-center gap-2">
                      <Plane className="w-3.5 h-3.5 text-teal-600" />
                      <span className="font-bold text-slate-900">{seg.airline || airlineName} ({seg.flightNumber || seg.airlineCode})</span>
                      <span className="text-slate-500">• {seg.originCity || seg.origin} → {seg.destinationCity || seg.destination}</span>
                    </div>
                    <div className="font-semibold text-slate-700">
                      {sDep} - {sArr} {seg.duration ? `(${seg.duration})` : ""}
                    </div>
                  </div>
                  {nextS && (
                    <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200/80 text-[11px] font-semibold text-amber-800 flex items-center gap-1.5">
                      <span>⏱️ Layover in {seg.destinationCity || seg.destination} ({seg.destination})</span>
                      <span className="text-amber-600 font-normal">• Change of planes required</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Baggage Policy */}
        <div className="mt-5 border-t border-gray-100 pt-4 flex flex-wrap gap-6 text-xs sm:text-sm font-medium text-slate-700">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-teal-600" />
            <span>Cabin Baggage: <strong className="text-slate-900">{cabinBaggage}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <Luggage className="w-4 h-4 text-teal-600" />
            <span>Check-in Baggage: <strong className="text-slate-900">{checkInBaggage}</strong></span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-gray-200/90 overflow-hidden">
      {/* Price / Time Changed Alert */}
      {(priceChanged || timeChanged) && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm px-5 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold">
              {priceChanged && timeChanged
                ? "Flight Fare and Schedule have updated"
                : priceChanged
                ? "Flight Fare has updated"
                : "Flight Schedule has updated"}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              The airline updated the price or timing for this flight itinerary. Please review the updated summary below before confirming.
            </p>
          </div>
        </div>
      )}

      {/* Leg 1: Departure */}
      {renderLeg(flight, returnFlight ? "Departure Flight" : "Flight Itinerary", false)}

      {/* Leg 2: Return (if round trip) */}
      {returnFlight && renderLeg(returnFlight, "Return Flight", true)}
    </div>
  );
};

export default FlightSummaryCard;