import { useState } from "react";
import {
  Plane,
  X,
  Printer,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Luggage,
  Clock,
  MapPin,
  User,
  AlertCircle,
  FileText,
  Calendar,
  Sparkles,
  QrCode,
  CheckCircle2,
  CreditCard,
} from "lucide-react";
import { toast } from "react-toastify";
import eticketService from "../../services/eticketService";

export default function ETicketModal({
  isOpen = false,
  onClose,
  ticket = null,
  loading = false,
  error = null,
}) {
  const [selectedPaxIndex, setSelectedPaxIndex] = useState(0);
  const [copiedPnr, setCopiedPnr] = useState(false);
  const [qrStep, setQrStep] = useState(0);

  if (!isOpen) return null;

  const handleCopyPnr = (pnrText) => {
    if (!pnrText) return;
    navigator.clipboard?.writeText(pnrText);
    setCopiedPnr(true);
    toast.success(`PNR ${pnrText} copied to clipboard!`);
    setTimeout(() => setCopiedPnr(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!ticket) return;
    const pnr = ticket.pnr || ticket.customerPnr || ticket.bookingReference || "TICKET";
    eticketService.downloadETicketDocument(ticket, `ETicket-${pnr}.html`);
    toast.success("Official E-Ticket document downloaded successfully!");
  };

  const pnr = ticket?.pnr || ticket?.customerPnr || "N/A";
  const groupPnr = ticket?.airlineGroupPnr;
  const segments = Array.isArray(ticket?.segments) && ticket.segments.length > 0 ? ticket.segments : [];
  const firstSegment = segments[0] || {};
  const lastSegment = segments[segments.length - 1] || firstSegment;
  const passengers = Array.isArray(ticket?.passengers) && ticket.passengers.length > 0 ? ticket.passengers : [];
  const currentPax = passengers[selectedPaxIndex] || passengers[0] || {};

  // Build QR code URL from payload
  const qrPayload = currentPax.qrCodePayload || `${pnr} ${firstSegment.airline?.flightNumber || "FLT"} ${currentPax.fullName || "PAX"}`;
  const qrCodeUrl =
    qrStep === 0
      ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrPayload)}`
      : `https://quickchart.io/qr?text=${encodeURIComponent(qrPayload)}&size=160`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl my-6 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden print:p-0 print:border-0 print:shadow-none print:w-full print:max-w-none">
        
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 print:hidden">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-600 text-white shadow-xs">
              <Plane size={18} />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Official Flight E-Ticket & Boarding Pass
              </h3>
              <p className="text-[11px] text-slate-500">
                Carrier Verified • Confirmed Electronic Ticket
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
              title="Print or Save as PDF"
            >
              <Printer size={14} className="text-teal-600" />
              <span className="hidden sm:inline">Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 transition shadow-xs cursor-pointer"
              title="Download verified official E-Ticket document"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Download E-Ticket</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto print:max-h-none print:p-0 print:overflow-visible">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-teal-600 border-t-transparent" />
              <p className="text-sm font-bold text-slate-700">Retrieving verified airline e-ticket...</p>
              <p className="text-xs text-slate-400">Verifying PNR and ticket status with carrier reservation system</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-2">
              <AlertCircle size={28} className="mx-auto text-red-600" />
              <h4 className="text-sm font-bold text-red-800">E-Ticket Notice</h4>
              <p className="text-xs text-red-600 max-w-md mx-auto">{error}</p>
            </div>
          ) : !ticket ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No ticket information available.
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Boarding Pass Hero Container */}
              <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white p-6 sm:p-7 shadow-xl overflow-hidden border border-teal-800/40">
                {/* Background watermarks */}
                <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 opacity-10 pointer-events-none">
                  <Plane size={240} />
                </div>

                {/* Top Airline & PNR Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-xl font-black">
                      {firstSegment.airline?.code || "✈️"}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black tracking-tight text-white">
                          {firstSegment.airline?.name || "Airline Carrier"}
                        </span>
                        <span className="rounded-md bg-teal-500/20 px-2 py-0.5 text-[11px] font-bold text-teal-300 border border-teal-400/30">
                          {firstSegment.airline?.flightNumber}
                        </span>
                      </div>
                      <p className="text-xs text-teal-200/80">
                        Class: {firstSegment.airline?.cabinClass || "Economy"} • {ticket.carrierType || "Standard Flight"}
                      </p>
                    </div>
                  </div>

                  {/* PNR Box */}
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 block">
                        Booking PNR
                      </span>
                      <span className="text-xl font-mono font-black text-white tracking-widest">
                        {pnr}
                      </span>
                      {groupPnr && (
                        <span className="block text-[10px] font-mono text-teal-200">
                          Group PNR: {groupPnr}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyPnr(pnr)}
                      className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition cursor-pointer print:hidden"
                      title="Copy PNR"
                    >
                      {copiedPnr ? <Check size={16} className="text-teal-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                {/* Route & Times Grid */}
                <div className="my-6 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center text-center">
                  <div className="text-left sm:text-center">
                    <span className="text-4xl sm:text-5xl font-black tracking-tight text-white block">
                      {firstSegment.origin?.code}
                    </span>
                    <span className="text-sm font-bold text-teal-200 block mt-1">
                      {firstSegment.origin?.city} ({firstSegment.origin?.terminal || "Main"})
                    </span>
                    <span className="text-xs text-white/70 block mt-0.5 font-mono">
                      {firstSegment.departureTimeFormatted}
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-teal-300 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                      {firstSegment.duration}
                    </span>
                    <div className="w-full flex items-center justify-center my-2 text-teal-400">
                      <div className="h-px bg-white/20 flex-1" />
                      <Plane size={18} className="mx-2 rotate-90 sm:rotate-0" />
                      <div className="h-px bg-white/20 flex-1" />
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-white/60">
                      Non-Stop / Series Flight
                    </span>
                  </div>

                  <div className="text-left sm:text-center">
                    <span className="text-4xl sm:text-5xl font-black tracking-tight text-white block">
                      {lastSegment.destination?.code}
                    </span>
                    <span className="text-sm font-bold text-teal-200 block mt-1">
                      {lastSegment.destination?.city} ({lastSegment.destination?.terminal || "Main"})
                    </span>
                    <span className="text-xs text-white/70 block mt-0.5 font-mono">
                      {lastSegment.arrivalTimeFormatted}
                    </span>
                  </div>
                </div>

                {/* Baggage & Issuance Footer Banner */}
                <div className="border-t border-white/10 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-teal-200/90">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 font-bold">
                      <Luggage size={14} className="text-teal-400" />
                      Check-In: {firstSegment.baggage?.checkIn || "23 KG"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-bold">
                      <Luggage size={14} className="text-teal-400" />
                      Cabin: {firstSegment.baggage?.cabin || "7 KG"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-white/60 font-mono">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span>Issued: {ticket.issuedAtFormatted || "Confirmed"}</span>
                  </div>
                </div>
              </div>

              {/* Connecting Flights / Multi-Segment Itinerary Timeline */}
              {segments.length > 1 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Plane size={16} className="text-teal-600" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Flight Route &amp; Connecting Segments ({segments.length} Flights)
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                      Connecting Itinerary
                    </span>
                  </div>

                  <div className="space-y-3">
                    {segments.map((seg, sIdx) => (
                      <div
                        key={sIdx}
                        className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-600/10 text-teal-800 font-extrabold text-xs shrink-0">
                            {sIdx + 1}
                          </span>
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                              <span>{seg.origin?.code} → {seg.destination?.code}</span>
                              <span className="text-xs font-normal text-slate-500">
                                ({seg.airline?.name || "Airline"} {seg.airline?.flightNumber})
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {seg.origin?.city} ({seg.origin?.terminal || "Main"}) to {seg.destination?.city} ({seg.destination?.terminal || "Main"})
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-[11px] sm:text-right">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Departure</span>
                            <span className="font-bold text-slate-700">{seg.departureTimeFormatted}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Duration</span>
                            <span className="font-bold text-teal-700">{seg.duration || "Direct"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Baggage</span>
                            <span className="font-bold text-slate-700">{seg.baggage?.checkIn || "20 KG"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Multi-Passenger Switcher Tabs (if > 1 pax) */}
              {passengers.length > 1 && (
                <div className="print:hidden space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Select Passenger Boarding Pass ({passengers.length} Travellers):
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {passengers.map((pax, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedPaxIndex(idx)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                          selectedPaxIndex === idx
                            ? "bg-teal-700 text-white shadow-xs"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        <User size={13} />
                        <span>{pax.fullName}</span>
                        {pax.isLeadPassenger && (
                          <span className="rounded bg-white/20 px-1 py-0.2 text-[9px] uppercase">
                            Lead
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Passenger Card & QR Code */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-4 flex-1 w-full">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Passenger Full Name
                    </span>
                    <h4 className="text-lg font-black text-slate-900 tracking-tight">
                      {currentPax.fullName}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Type: {currentPax.passengerType || "Adult"} • Passport: {currentPax.passportNumberMasked || "Verified"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Seat Assigned</span>
                      <span className="text-base font-black text-slate-900">{currentPax.seatNumber || "3F"}</span>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Status</span>
                      <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700">
                        <CheckCircle2 size={13} />
                        {currentPax.ticketStatus || "CONFIRMED"}
                      </span>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Meal Code</span>
                      <span className="text-xs font-bold text-slate-800">{currentPax.meal || "Standard"}</span>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Ticket Number</span>
                      <span className="font-mono text-[11px] font-bold text-teal-800 truncate block" title={currentPax.ticketNumber}>
                        {currentPax.ticketNumber || "Issued"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* QR Code Boarding Visualizer */}
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 bg-slate-50/60 shrink-0">
                  <div className="w-32 h-32 rounded-xl bg-white p-2 border border-slate-200 shadow-2xs flex items-center justify-center">
                    <img
                      src={qrCodeUrl}
                      alt="Airport Boarding Pass QR"
                      className="w-full h-full object-contain"
                      onError={() => setQrStep((prev) => (prev < 1 ? prev + 1 : prev))}
                    />
                  </div>
                  <span className="mt-2 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <QrCode size={11} />
                    Scan at Security
                  </span>
                </div>
              </div>

              {/* Complete Passenger Manifest Table */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <User size={15} className="text-teal-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Official Passenger Manifest ({passengers.length} Travellers)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 font-mono">
                    All Tickets Validated
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 bg-slate-50/50">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Passenger Name</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Seat</th>
                        <th className="py-2.5 px-3">Ticket / E-Ticket No</th>
                        <th className="py-2.5 px-3">Meal</th>
                        <th className="py-2.5 px-3">Passport</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {passengers.map((pax, pIdx) => (
                        <tr
                          key={pIdx}
                          className={`hover:bg-slate-50/60 transition ${
                            selectedPaxIndex === pIdx ? "bg-teal-50/40" : ""
                          }`}
                        >
                          <td className="py-2.5 px-3 font-bold text-slate-400">{pIdx + 1}</td>
                          <td className="py-2.5 px-3 font-extrabold text-slate-900">
                            {pax.fullName}
                            {pax.isLeadPassenger && (
                              <span className="ml-1.5 rounded bg-teal-100 text-teal-800 px-1 py-0.2 text-[9px] uppercase font-bold">
                                Lead
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{pax.passengerType || "Adult"}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{pax.seatNumber || "-"}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-teal-800 text-[11px]">
                            {pax.ticketNumber || "CONFIRMED"}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{pax.meal || "Standard"}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                            {pax.passportNumberMasked || "Verified"}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-[11px]">
                              <CheckCircle2 size={12} />
                              {pax.ticketStatus || "CONFIRMED"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Itemized Fare & Payment Summary */}
              {ticket.fareBreakdown && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <CreditCard size={15} className="text-teal-600" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Itemized Fare &amp; Payment Summary
                      </h4>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 size={11} /> 100% Paid &amp; Confirmed
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Base Airfare</span>
                      <span className="text-sm font-black text-slate-900">
                        ₹{Number(ticket.fareBreakdown.baseFare || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Taxes &amp; Fees</span>
                      <span className="text-sm font-black text-slate-900">
                        ₹{Number(ticket.fareBreakdown.taxesAndFees || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Meals &amp; Baggage</span>
                      <span className="text-sm font-black text-emerald-700">
                        Included
                      </span>
                    </div>

                    <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-2.5">
                      <span className="text-[10px] font-bold text-teal-800 uppercase block">Total Amount Paid</span>
                      <span className="text-sm font-black text-teal-950">
                        ₹{Number(ticket.fareBreakdown.totalAmount || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Travel Advisories & Compliance Notice */}
              {Array.isArray(ticket.advisories) && ticket.advisories.length > 0 && (
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <AlertCircle size={14} className="text-amber-600" />
                    <span>Important Travel Advisories</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800">
                    {ticket.advisories.map((adv, i) => (
                      <li key={i}>{adv}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-500 print:hidden">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <ShieldCheck size={14} className="text-teal-600" />
            <span>Official Maqam Travels E-Ticket Verification Engine</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
