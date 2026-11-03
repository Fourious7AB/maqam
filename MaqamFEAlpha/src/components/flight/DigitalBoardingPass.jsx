import React, { useState } from "react";
import { Plane, Printer, Copy, Check } from "lucide-react";
import { toast } from "react-toastify";

/**
 * DigitalBoardingPass
 * 
 * Reusable digital mobile boarding pass precisely matching download (2).jpg:
 * - Signature Indigo Royal Navy Blue background (#011B94)
 * - Centered square QR code on white card
 * - Circular airline logo badge + Airline Flight Title (e.g. INDIGO 6E 6819)
 * - Date, route & scheduled times (e.g. Sat, 12 Oct • IXD 11:20 → HYD 13:10)
 * - Dashed horizontal separators
 * - Passenger name (with natural truncation) & assigned seat (e.g. Rajarajeshwari Satyanaray... | 3F)
 * - 6-cell flight metrics grid: PNR, BOARDING TIME, DEPARTURE TIME, GATE, BOARDING, SEQUENCE NUMBER
 * - Centered airport warning footer (25 mins gate closure)
 * - Multi-passenger switcher, copy PNR, and print action
 */
export default function DigitalBoardingPass({
  booking,
  passengers = [],
  flight,
  pnr: customPnr,
  className = "",
  showActions = true,
}) {
  const [selectedPaxIndex, setSelectedPaxIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [qrStep, setQrStep] = useState(0); // 0: qrserver, 1: quickchart, 2: svg fallback

  // Normalize passenger list
  const paxList = (() => {
    if (Array.isArray(passengers) && passengers.length > 0) {
      return passengers;
    }
    if (booking?.passengers && Array.isArray(booking.passengers) && booking.passengers.length > 0) {
      return booking.passengers;
    }
    if (booking?.Result?.Passengers && Array.isArray(booking.Result.Passengers) && booking.Result.Passengers.length > 0) {
      return booking.Result.Passengers;
    }
    if (booking?.travellers && Array.isArray(booking.travellers) && booking.travellers.length > 0) {
      return booking.travellers;
    }
    const defaultName =
      booking?.customerName ||
      booking?.customer?.name ||
      booking?.contactDetails?.name ||
      "Lead Passenger";
    return [
      {
        firstName: defaultName.split(" ")[0] || "Lead",
        lastName: defaultName.split(" ").slice(1).join(" ") || "Passenger",
        name: defaultName,
        seat: "3F",
        seatNumber: "3F",
      },
    ];
  })();

  const currentPax = paxList[selectedPaxIndex] || paxList[0] || {};

  // Extract passenger display name (supporting travellerDetails with 2 L's, travelerDetails with 1 L, and SRDV callback PascalCase)
  const paxName = (() => {
    const td = currentPax.travellerDetails || currentPax.travelerDetails;
    if (td && (td.firstName || td.lastName)) {
      return `${td.title || ""} ${td.firstName || ""} ${td.lastName || ""}`.trim();
    }
    if (
      currentPax.firstName ||
      currentPax.lastName ||
      currentPax.FirstName ||
      currentPax.LastName
    ) {
      const title = currentPax.title || currentPax.Title || "";
      const fName = currentPax.firstName || currentPax.FirstName || "";
      const lName = currentPax.lastName || currentPax.LastName || "";
      return `${title ? title + " " : ""}${fName} ${lName}`.trim();
    }
    if (currentPax.name) return currentPax.name;
    if (booking?.customerName) return booking.customerName;
    if (booking?.customer?.name) return booking.customer.name;
    return `Passenger ${selectedPaxIndex + 1}`;
  })();

  // Extract Flight & Segment info safely (handling empty objects and varied schemas)
  const hasFlightProp = flight && typeof flight === "object" && Object.keys(flight).length > 0;
  const flightData =
    (hasFlightProp ? flight : null) ||
    booking?.flight ||
    booking?.rawBookingDetails ||
    booking?.details ||
    booking?.packageSnapshot?.bundledFlight ||
    booking?.customSelections?.selectedFlightDetails ||
    booking?.claimedFlightUnits?.[0]?.flightDetails ||
    {};

  const segments = flightData.segments || [];
  const firstSegment = segments[0] || flightData;
  const lastSegment = segments[segments.length - 1] || firstSegment;

  const airlineName = (
    flightData.airline ||
    flightData.airlineName ||
    flightData.airline_name ||
    firstSegment.airline ||
    firstSegment.airlineName ||
    booking?.airline ||
    booking?.airlineName ||
    "AIRLINE"
  ).toUpperCase();

  const airlineCode = (
    flightData.airlineCode ||
    flightData.code ||
    firstSegment.airlineCode ||
    (airlineName.includes("INDIGO")
      ? "6E"
      : airlineName.includes("SAUDIA")
      ? "SV"
      : airlineName.includes("EMIRATES")
      ? "EK"
      : airlineName.includes("AIR INDIA")
      ? "AI"
      : airlineName.includes("GULF")
      ? "GF"
      : "FL")
  ).toUpperCase();

  const rawFlightNumber =
    flightData.flightNumber ||
    flightData.flightNo ||
    firstSegment.flightNumber ||
    firstSegment.flightNo ||
    booking?.flightNumber ||
    "101";

  // Match title format: "INDIGO 6E 6819"
  const flightTitle = (() => {
    const fn = String(rawFlightNumber).trim();
    const an = String(airlineName).trim();
    if (fn.toUpperCase().startsWith(an.toUpperCase())) {
      return fn.toUpperCase();
    }
    if (fn.toUpperCase().startsWith(airlineCode.toUpperCase())) {
      return `${an.toUpperCase()} ${fn.toUpperCase()}`;
    }
    return `${an.toUpperCase()} ${airlineCode.toUpperCase()} ${fn.toUpperCase()}`;
  })();

  const origin = (
    flightData.origin ||
    flightData.originCode ||
    flightData.departureAirport ||
    flightData.from ||
    firstSegment.origin ||
    firstSegment.originCode ||
    booking?.origin ||
    "DEL"
  ).toUpperCase();

  const destination = (
    flightData.destination ||
    flightData.destinationCode ||
    flightData.arrivalAirport ||
    flightData.to ||
    lastSegment.destination ||
    lastSegment.destinationCode ||
    booking?.destination ||
    "BOM"
  ).toUpperCase();

  // Departure time
  const rawDep =
    firstSegment.departure ||
    firstSegment.departureTime ||
    flightData.departureDate ||
    flightData.departure ||
    flightData.departureTime ||
    booking?.travelDates?.startDate ||
    booking?.departureDate ||
    "";

  const depTime = (() => {
    if (typeof rawDep === "string" && rawDep.includes("T")) {
      return rawDep.split("T")[1]?.slice(0, 5) || "11:20";
    }
    if (rawDep && !isNaN(new Date(rawDep).getTime())) {
      const d = new Date(rawDep);
      return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    return "11:20";
  })();

  // Arrival time
  const rawArr =
    lastSegment.arrival ||
    lastSegment.arrivalTime ||
    flightData.arrivalDate ||
    flightData.arrival ||
    flightData.arrivalTime ||
    booking?.travelDates?.endDate ||
    booking?.arrivalDate ||
    "";

  const arrTime = (() => {
    if (typeof rawArr === "string" && rawArr.includes("T")) {
      return rawArr.split("T")[1]?.slice(0, 5) || "13:10";
    }
    if (rawArr && !isNaN(new Date(rawArr).getTime())) {
      const d = new Date(rawArr);
      return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    return "13:10";
  })();

  // Date format e.g. "Sat, 12 Oct"
  const formattedDate = (() => {
    if (rawDep && !isNaN(new Date(rawDep).getTime())) {
      const d = new Date(rawDep);
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    }
    return "Scheduled";
  })();

  // Boarding time (standard 45 mins prior to departure)
  const boardingTime = (() => {
    if (currentPax.boardingTime) return currentPax.boardingTime;
    try {
      const [hours, minutes] = depTime.split(":").map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        let totalMinutes = hours * 60 + minutes - 45;
        if (totalMinutes < 0) totalMinutes += 24 * 60;
        const bHours = Math.floor(totalMinutes / 60);
        const bMinutes = totalMinutes % 60;
        return `${String(bHours).padStart(2, "0")}:${String(bMinutes).padStart(2, "0")}`;
      }
    } catch {
      // ignore parsing error and use fallback time
    }
    return "10:35";
  })();

  // Seat number
  const seatNumber =
    currentPax.seat ||
    currentPax.seatNumber ||
    currentPax.seats?.[0]?.seatNumber ||
    currentPax.ssr?.seatNumber ||
    (selectedPaxIndex === 0 ? "3F" : `${3 + selectedPaxIndex}A`);

  // PNR resolution
  const pnr =
    customPnr ||
    currentPax.pnr ||
    currentPax.TicketNumber ||
    booking?.pnr ||
    booking?.PNR ||
    booking?.Result?.PNR ||
    booking?.bookingReference ||
    booking?.bookingNumber ||
    booking?.ticketNumber ||
    booking?.id?.slice(-6)?.toUpperCase() ||
    booking?._id?.slice(-6)?.toUpperCase() ||
    "ISSUED";

  // Gate & Zone
  const gate = currentPax.gate || flightData.gate || booking?.gate || "-";
  const zone =
    currentPax.zone ||
    currentPax.boardingZone ||
    (seatNumber.startsWith("1") || seatNumber.startsWith("2") ? "ZONE 1" : "ZONE 3");
  const sequenceNumber =
    currentPax.sequenceNumber ||
    currentPax.seqNo ||
    String(selectedPaxIndex + 1);

  // QR Code payload (IATA-style standard check-in barcode payload)
  const qrPayload = `M1${paxName.toUpperCase().replace(/\s+/g, "/")} E${pnr} ${origin}${destination}${airlineCode} ${rawFlightNumber} ${seatNumber} ${depTime}`;

  const qrImageUrl =
    qrStep === 0
      ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(qrPayload)}`
      : qrStep === 1
      ? `https://quickchart.io/qr?size=240&text=${encodeURIComponent(qrPayload)}`
      : null;

  const handleCopyPnr = () => {
    navigator.clipboard.writeText(pnr);
    setCopied(true);
    toast.success(`PNR ${pnr} copied to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Multi-Passenger Tab Switcher (if > 1 traveller) */}
      {paxList.length > 1 && (
        <div className="flex items-center gap-2 mb-4 bg-slate-100 p-1.5 rounded-2xl max-w-sm w-full overflow-x-auto print:hidden shadow-xs">
          {paxList.map((p, idx) => {
            const name =
              p.travellerDetails?.firstName ||
              p.travelerDetails?.firstName ||
              p.firstName ||
              p.FirstName ||
              `Passenger ${idx + 1}`;
            const pSeat =
              p.seat ||
              p.seatNumber ||
              p.seats?.[0]?.seatNumber ||
              p.ssr?.seatNumber ||
              `${3 + idx}A`;
            const isSelected = idx === selectedPaxIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedPaxIndex(idx)}
                className={`flex-1 min-w-[100px] py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer truncate ${
                  isSelected
                    ? "bg-[#011B94] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                {name} ({pSeat})
              </button>
            );
          })}
        </div>
      )}

      {/* THE OFFICIAL BOARDING PASS CARD (download (2).jpg exact pixel replication) */}
      <div
        className="w-full max-w-[356px] sm:max-w-[370px] rounded-3xl p-5 sm:p-6 shadow-2xl relative select-none print:shadow-none print:m-0 print:w-full print:max-w-md"
        style={{
          backgroundColor: "#011B94",
          color: "#ffffff",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        {/* 1. TOP QR CODE SECTION */}
        <div className="bg-white rounded-xl p-2.5 shadow-sm mx-auto w-[150px] h-[150px] sm:w-[160px] sm:h-[160px] flex items-center justify-center mb-4">
          {qrImageUrl ? (
            <img
              src={qrImageUrl}
              alt="Boarding Pass QR Code"
              className="w-full h-full object-contain"
              onError={() => setQrStep((prev) => prev + 1)}
            />
          ) : (
            /* High-fidelity Vector QR representation if offline */
            <div className="w-full h-full flex flex-col items-center justify-center p-1.5 text-slate-900 text-center">
              <div className="w-24 h-24 border-2 border-slate-900 grid grid-cols-4 gap-1 p-1 mb-1">
                <div className="bg-slate-900" />
                <div className="bg-transparent" />
                <div className="bg-slate-900" />
                <div className="bg-slate-900" />
                <div className="bg-slate-900" />
                <div className="bg-slate-900" />
                <div className="bg-transparent" />
                <div className="bg-slate-900" />
                <div className="bg-slate-900" />
                <div className="bg-transparent" />
                <div className="bg-slate-900" />
                <div className="bg-slate-900" />
                <div className="bg-slate-900" />
                <div className="bg-slate-900" />
                <div className="bg-transparent" />
                <div className="bg-slate-900" />
              </div>
              <span className="text-[9px] font-mono font-bold tracking-widest">{pnr}</span>
            </div>
          )}
        </div>

        {/* 2. AIRLINE HEADER ROW */}
        <div className="flex items-center gap-3.5 mb-3">
          <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs overflow-hidden p-1.5">
            {airlineCode && airlineCode.length === 2 ? (
              <img
                src={`https://images.kiwi.com/airlines/64/${airlineCode}.png`}
                alt={airlineName}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "block";
                }}
              />
            ) : null}
            <Plane
              className="w-5 h-5 text-[#011B94]"
              style={{ display: airlineCode && airlineCode.length === 2 ? "none" : "block" }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-black tracking-wider uppercase truncate text-white leading-tight">
              {flightTitle}
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 font-medium mt-0.5 truncate">
              {formattedDate} • {origin} {depTime} → {destination} {arrTime}
            </p>
          </div>
        </div>

        {/* DOTTED DIVIDER */}
        <div className="border-b border-dashed border-white/25 my-3" />

        {/* 3. PASSENGER & SEAT ROW */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-200/90 block mb-0.5">
              PASSENGER
            </span>
            <p
              className="text-base sm:text-lg font-extrabold text-white truncate tracking-wide max-w-[210px] sm:max-w-[230px]"
              title={paxName}
            >
              {paxName}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-200/90 block mb-0.5">
              SEAT
            </span>
            <p className="text-xl sm:text-2xl font-black text-white tracking-wider">
              {seatNumber}
            </p>
          </div>
        </div>

        {/* DOTTED DIVIDER */}
        <div className="border-b border-dashed border-white/25 my-3" />

        {/* 4. SIX-CELL FLIGHT METRICS GRID (Row 1) */}
        <div className="grid grid-cols-3 gap-2 text-left mb-3">
          <div>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-blue-200/90 block">
              PNR
            </span>
            <span className="text-sm sm:text-base font-black tracking-wider font-mono text-white mt-0.5 block">
              {pnr}
            </span>
          </div>

          <div>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-blue-200/90 block">
              BOARDING TIME
            </span>
            <span className="text-sm sm:text-base font-black text-white mt-0.5 block">
              {boardingTime}
            </span>
          </div>

          <div>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-blue-200/90 block">
              DEPARTURE TIME
            </span>
            <span className="text-sm sm:text-base font-black text-white mt-0.5 block">
              {depTime}
            </span>
          </div>
        </div>

        {/* SIX-CELL FLIGHT METRICS GRID (Row 2) */}
        <div className="grid grid-cols-3 gap-2 text-left mb-2">
          <div>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-blue-200/90 block">
              GATE
            </span>
            <span className="text-sm sm:text-base font-black text-white mt-0.5 block">
              {gate}
            </span>
          </div>

          <div>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-blue-200/90 block">
              BOARDING
            </span>
            <span className="text-sm sm:text-base font-black text-white mt-0.5 block">
              {zone}
            </span>
          </div>

          <div>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-blue-200/90 block">
              SEQUENCE NUMBER
            </span>
            <span className="text-sm sm:text-base font-black text-white mt-0.5 block">
              {sequenceNumber}
            </span>
          </div>
        </div>

        {/* 5. FOOTER AIRPORT NOTICE (Matching download (2).jpg layout without upper line) */}
        <p className="text-[10px] sm:text-[11px] leading-relaxed text-blue-100/80 text-center pt-3 select-none">
          Boarding gates close 25 mins prior to departure. Boarding gates are subject to change, please check flight info for latest updates.
        </p>
      </div>

      {/* ACTION BAR BUTTONS (Print / Copy PNR) */}
      {showActions && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Boarding Pass</span>
          </button>

          <button
            type="button"
            onClick={handleCopyPnr}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>{copied ? "Copied!" : "Copy PNR"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
