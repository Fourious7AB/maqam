import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { CheckCircle2, ArrowLeft, ArrowRight, Printer, Plane, Calendar, CreditCard, User } from "lucide-react";
import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import DigitalBoardingPass from "../../../../components/flight/DigitalBoardingPass";
import OmnichannelAlertStatus from "../../../../components/notifications/OmnichannelAlertStatus";

export default function BookingConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};

  const booking = state.booking || state.created || {};
  const bookingType = (state.bookingType || booking.bookingType || "flight").toLowerCase();
  const bookingId = booking._id || booking.id || booking.bookingNumber || "BK-" + Math.floor(100000 + Math.random() * 900000);
  const pnr = booking.pnr || booking.bookingReference || state.pnr || "B4K68K";
  const customerName = booking.customerName || booking.customer?.name || state.customerName || "Rajarajeshwari Satyanarayana";
  const totalAmount = booking.totalAmount || booking.amount || state.total || 33879;
  const paymentStatus = booking.payment?.status || booking.paymentStatus || state.paymentStatus || "paid";

  const [activeView, setActiveView] = useState("pass"); // "pass" | "summary"

  const flightData = booking.flight || state.flight || {
    airline: "INDIGO",
    flightNumber: "6E 6819",
    origin: "IXD",
    destination: "HYD",
    departure: "2026-10-12T11:20:00",
    arrival: "2026-10-12T13:10:00",
  };

  const isFlightRelated =
    bookingType === "flight" ||
    Boolean(booking.flight) ||
    Boolean(booking.claimed?.flights?.length) ||
    Boolean(state.flight);

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <PageHeader
        title="Booking Confirmation & Operations Dispatch"
        subtitle={`Booking reference #${bookingId} • Confirmed & Processed`}
        action={{
          label: "Back to Bookings Desk",
          icon: ArrowLeft,
          variant: "secondary",
          onClick: () => navigate("/admin/bookings"),
        }}
      />

      {/* Hero Confirmed Banner */}
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-1">
              Confirmed & Logged
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Booking Confirmed Successfully
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Customer: <strong className="text-slate-800">{customerName}</strong> • Reference: <span className="font-mono font-bold text-emerald-800">#{bookingId}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 print:hidden">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={16} /> Print Records
          </Button>
          <Button onClick={() => navigate(`/admin/bookings/${bookingId}`)}>
            View Dossier <ArrowRight size={16} />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Digital Boarding Pass */}
        <div className="md:col-span-7 flex flex-col items-center">
          <div className="w-full bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col items-center">
            <div className="flex items-center justify-between w-full pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#011B94]">
                <Plane size={20} />
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                  Digital Boarding Pass
                </h3>
              </div>
              <span className="font-mono text-xs font-bold bg-blue-50 text-[#011B94] px-2.5 py-1 rounded-lg">
                PNR: {pnr}
              </span>
            </div>

            <DigitalBoardingPass
              booking={booking}
              flight={flightData}
              pnr={pnr}
              passengers={booking.travellers || booking.passengers || [{ firstName: customerName.split(" ")[0], lastName: customerName.split(" ").slice(1).join(" ") || "Passenger", seat: "3F" }]}
              showActions={true}
            />
          </div>
        </div>

        {/* Right Column: Financial & Operational Details */}
        <div className="md:col-span-5 space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <CreditCard size={16} className="text-slate-500" />
              <span>Payment & Settlement</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Payment Status</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
                  {paymentStatus}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Amount Charged</span>
                <span className="font-black text-slate-900 text-sm">
                  ₹{Number(totalAmount).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Payment Channel</span>
                <span className="font-semibold text-slate-800">
                  {booking.payment?.method || "Bank Transfer / Card"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Booking Category</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {bookingType} Booking
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <User size={16} className="text-slate-500" />
              <span>Customer Details</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Name</span>
                <p className="font-semibold text-slate-800">{customerName}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Contact</span>
                <p className="font-semibold text-slate-800">
                  {booking.contactDetails?.phone || booking.customer?.phone || "+91 9876543210"}
                </p>
                <p className="text-slate-500">
                  {booking.contactDetails?.email || booking.customer?.email || "customer@maqamtravels.com"}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              className="w-full justify-center"
              onClick={() => navigate("/admin/bookings/create-service")}
            >
              Book Another Service
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-center"
              onClick={() => navigate("/admin/bookings")}
            >
              Back to Bookings
            </Button>
          </div>
        </div>
      </div>

      {/* Block 5: Omnichannel Alerts (Email, WhatsApp, SMS) */}
      <OmnichannelAlertStatus
        bookingId={bookingId}
        bookingType={bookingType}
        pnr={pnr}
        recipientEmail={booking.contactDetails?.email || booking.customer?.email}
        recipientPhone={booking.contactDetails?.phone || booking.customer?.phone}
        isAdmin={true}
      />
    </div>
  );
}
