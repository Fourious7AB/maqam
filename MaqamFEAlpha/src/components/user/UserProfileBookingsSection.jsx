import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Plane,
  Hotel,
  Package,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  Loader2,
  FileText,
  CreditCard,
  Copy,
  Check,
  Tag,
  MapPin,
  Users,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../stores/api";
import bookingService from "../../services/bookingService";
import flightService from "../../services/flightService";
import hotelService from "../../services/hotelService";
import packageService from "../../services/packageService";
import offerService from "../../services/offerService";
import ETicketModal from "../eticket/ETicketModal";
import invoiceService from "../../services/invoiceService";
import paymentService from "../../services/paymentService";

const STATUS_FILTERS = [
  { id: "all", label: "All Bookings" },
  { id: "confirmed", label: "Confirmed" },
  { id: "pending", label: "Pending Payment" },
  { id: "cancelled", label: "Cancelled" },
];

const VERTICAL_TABS = [
  { id: "all", label: "All Types", icon: Sparkles },
  { id: "flight", label: "Flights", icon: Plane },
  { id: "hotel", label: "Hotels", icon: Hotel },
  { id: "package", label: "Packages", icon: Package },
  { id: "offer", label: "Special Offers", icon: Tag },
];

export default function UserProfileBookingsSection() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVertical, setSelectedVertical] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  // Cancellation Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState("Change of travel plans");
  const [isCancelling, setIsCancelling] = useState(false);

  // E-Ticket Modal State
  const [eticketModalOpen, setEticketModalOpen] = useState(false);
  const [selectedETicketBooking, setSelectedETicketBooking] = useState(null);

  // Invoice Download State
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);

  const fetchUserBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Primary: fetch aggregated user bookings from backend
      try {
        const res = await api.get("/api/v1/bookings", {
          params: { limit: 100 },
        });

        const list = res?.data?.data || res?.data?.bookings || res?.data;
        if (Array.isArray(list)) {
          setBookings(list);
          setIsLoading(false);
          return;
        }
      } catch (primaryErr) {
        console.warn("Unified bookings endpoint unavailable, trying vertical fallbacks:", primaryErr.message);
      }

      // 2. Resilient fallback: fetch across domain endpoints in parallel
      const [fRes, hRes, pRes, oRes] = await Promise.allSettled([
        flightService.getUserBookings ? flightService.getUserBookings() : api.get("/api/v1/flights/bookings"),
        hotelService.getMyHotelBookings ? hotelService.getMyHotelBookings() : api.get("/api/v1/hotels/bookings/me"),
        packageService.getUserPackageBookings ? packageService.getUserPackageBookings() : api.get("/api/v1/packages/getAllBookingPackage"),
        offerService.getMyBookings ? offerService.getMyBookings() : api.get("/api/v1/offers/bookings/me"),
      ]);

      const merged = [];

      if (fRes.status === "fulfilled") {
        const flights = fRes.value?.data?.data || fRes.value?.data?.bookings || fRes.value?.data || [];
        (Array.isArray(flights) ? flights : []).forEach((f) => {
          merged.push({
            _id: f._id,
            id: f._id,
            bookingId: f._id,
            bookingType: "flight",
            vertical: "flight",
            title: `Flight ${f.pnr ? `#${f.pnr}` : ""}`,
            pnr: f.pnr || f.eTicketData?.pnr || "N/A",
            destination: f.fareSnapshot?.destination || "Destination",
            status: String(f.status || "").toLowerCase() === "ticketed" ? "confirmed" : f.status,
            totalPrice: f.totalAmount || f.fareSnapshot?.totalFare || 0,
            currency: f.currency || "INR",
            createdAt: f.createdAt,
            rawBooking: f,
          });
        });
      }

      if (hRes.status === "fulfilled") {
        const hotels = hRes.value?.data?.data || hRes.value?.data?.bookings || hRes.value?.data || [];
        (Array.isArray(hotels) ? hotels : []).forEach((h) => {
          merged.push({
            _id: h._id,
            id: h._id,
            bookingId: h._id,
            bookingType: "hotel",
            vertical: "hotel",
            title: h.hotelName || "Hotel Stay",
            hotelName: h.hotelName,
            destination: h.destination || "Makkah / Madinah",
            status: String(h.status || "").toLowerCase() === "completed" ? "confirmed" : h.status,
            totalPrice: h.customerTotalMinor ? h.customerTotalMinor / 100 : (h.totalPrice || 0),
            currency: h.currency || "INR",
            checkIn: h.checkIn,
            checkOut: h.checkOut,
            createdAt: h.createdAt,
            rawBooking: h,
          });
        });
      }

      if (pRes.status === "fulfilled") {
        const pkgs = pRes.value?.data?.data || pRes.value?.data?.bookings || pRes.value?.data || [];
        (Array.isArray(pkgs) ? pkgs : []).forEach((p) => {
          merged.push({
            _id: p._id,
            id: p._id,
            bookingId: p._id,
            bookingType: "package",
            vertical: "package",
            title: p.packageId?.title || p.packageSnapshot?.title || "Custom Package",
            destination: p.packageId?.destination || "Makkah",
            status: p.status,
            totalPrice: p.pricing?.totalSellPrice || p.totalPrice || 0,
            currency: p.currency || "INR",
            createdAt: p.createdAt,
            rawBooking: p,
          });
        });
      }

      if (oRes.status === "fulfilled") {
        const offers = oRes.value?.data?.data || oRes.value?.data?.bookings || oRes.value?.data || [];
        (Array.isArray(offers) ? offers : []).forEach((o) => {
          merged.push({
            _id: o._id,
            id: o._id,
            bookingId: o._id,
            bookingType: "offer",
            vertical: "offer",
            title: o.offerId?.title || o.offerSnapshot?.title || "Special Offer",
            destination: o.offerId?.destination || "Pilgrimage Offer",
            status: o.status,
            totalPrice: o.totalPrice || 0,
            currency: o.currency || "INR",
            createdAt: o.createdAt,
            rawBooking: o,
          });
        });
      }

      setBookings(merged);
    } catch (err) {
      console.error("Failed to load user bookings:", err);
      toast.error("Could not fetch your latest bookings. Please refresh.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserBookings();
  }, [fetchUserBookings]);

  // Handle Copy ID
  const handleCopy = (id) => {
    if (!id) return;
    navigator.clipboard?.writeText(String(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Cancel Modal
  const openCancelModal = (bkg) => {
    setCancellingBooking(bkg);
    setCancelReason("Change of travel plans");
    setCancelModalOpen(true);
  };

  // Submit Cancellation
  const handleConfirmCancel = async (e) => {
    if (e) e.preventDefault();
    if (!cancellingBooking) return;

    const bkgId = cancellingBooking._id || cancellingBooking.id || cancellingBooking.bookingId;
    const vertical = cancellingBooking.bookingType || cancellingBooking.vertical || "flight";

    setIsCancelling(true);
    try {
      // 1. Try unified master cancel endpoint
      try {
        await api.post(`/api/v1/bookings/${bkgId}/cancel`, { reason: cancelReason });
      } catch (masterErr) {
        // Fallback to domain endpoint
        if (vertical === "flight") {
          await flightService.cancelFlightBooking(bkgId, cancelReason);
        } else if (vertical === "hotel") {
          await hotelService.cancelHotelBooking(bkgId, cancelReason);
        } else if (vertical === "package") {
          await packageService.cancelPackageBooking(bkgId, cancelReason);
        } else if (vertical === "offer") {
          await offerService.cancelBooking(bkgId, cancelReason);
        } else {
          throw masterErr;
        }
      }

      toast.success("Booking cancelled successfully.");
      setCancelModalOpen(false);
      setCancellingBooking(null);

      // Optimistically update local status
      setBookings((prev) =>
        prev.map((b) => {
          const currentId = b._id || b.id || b.bookingId;
          return currentId === bkgId ? { ...b, status: "cancelled", canCancel: false } : b;
        })
      );
    } catch (err) {
      console.error("Cancellation failed:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to cancel booking.");
    } finally {
      setIsCancelling(false);
    }
  };

  // Filter Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((bkg) => {
      // Vertical filter
      const v = (bkg.bookingType || bkg.vertical || "").toLowerCase();
      if (selectedVertical !== "all" && v !== selectedVertical) {
        return false;
      }

      // Status filter
      const s = String(bkg.status || "").toLowerCase();
      if (selectedStatus === "confirmed") {
        if (!["confirmed", "ticketed", "completed", "paid", "payment_received"].includes(s)) return false;
      } else if (selectedStatus === "pending") {
        if (!["pending", "initiated", "awaiting_payment"].includes(s)) return false;
      } else if (selectedStatus === "cancelled") {
        if (!["cancelled", "cancellation_requested"].includes(s)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const id = String(bkg._id || bkg.id || bkg.bookingId || "").toLowerCase();
        const title = String(bkg.title || "").toLowerCase();
        const dest = String(bkg.destination || "").toLowerCase();
        const pnr = String(bkg.pnr || "").toLowerCase();
        const airline = String(bkg.airline || "").toLowerCase();
        const hotel = String(bkg.hotelName || "").toLowerCase();

        return (
          id.includes(q) ||
          title.includes(q) ||
          dest.includes(q) ||
          pnr.includes(q) ||
          airline.includes(q) ||
          hotel.includes(q)
        );
      }

      return true;
    });
  }, [bookings, selectedVertical, selectedStatus, searchQuery]);

  // Counts for tabs
  const verticalCounts = useMemo(() => {
    const counts = { all: bookings.length, flight: 0, hotel: 0, package: 0, offer: 0 };
    bookings.forEach((b) => {
      const v = (b.bookingType || b.vertical || "").toLowerCase();
      if (counts[v] !== undefined) counts[v]++;
    });
    return counts;
  }, [bookings]);

  const statusCounts = useMemo(() => {
    const counts = { all: bookings.length, confirmed: 0, pending: 0, cancelled: 0 };
    bookings.forEach((b) => {
      const s = String(b.status || "").toLowerCase();
      if (["confirmed", "ticketed", "completed", "paid", "payment_received"].includes(s)) counts.confirmed++;
      else if (["pending", "initiated", "awaiting_payment"].includes(s)) counts.pending++;
      else if (["cancelled", "cancellation_requested"].includes(s)) counts.cancelled++;
    });
    return counts;
  }, [bookings]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-teal-200/80 dark:border-teal-900/50 bg-gradient-to-br from-teal-50/80 via-white to-emerald-50/60 dark:from-slate-900 dark:via-[#0c1a16] dark:to-slate-900 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/40">
              <Calendar size={13} />
              <span>Personal Reservation Hub</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              My Bookings & Reservations
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl">
              Track your confirmed flights, hotel suites, customized Umrah & Hajj packages, and download tax invoices or e-tickets in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchUserBookings}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition cursor-pointer"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin text-teal-600" : ""} />
              <span>{isLoading ? "Refreshing..." : "Refresh"}</span>
            </button>
            <Link
              to="/package-page"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Book Travel</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Vertical Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {VERTICAL_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedVertical === tab.id;
          const count = verticalCounts[tab.id] || 0;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedVertical(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition cursor-pointer shrink-0 border ${
                isActive
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-teal-600 dark:border-teal-600 shadow-xs"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <Icon size={14} className={isActive ? "text-white" : "text-teal-600 dark:text-teal-400"} />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Status Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_FILTERS.map((filter) => {
            const isActive = selectedStatus === filter.id;
            const count = statusCounts[filter.id] || 0;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setSelectedStatus(filter.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? "bg-teal-700 text-white dark:bg-teal-700 shadow-2xs"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                }`}
              >
                <span>{filter.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Search */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search PNR, hotel, destination..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Bookings List Area */}
      {isLoading ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <Clock size={32} className="animate-spin text-teal-600 mx-auto" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Loading your bookings...
          </p>
          <p className="text-xs text-slate-400">Synchronizing with live reservation services</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        /* Rich Empty State Card with Quick Actions */
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto shadow-xs">
            {selectedVertical === "flight" ? (
              <Plane size={32} />
            ) : selectedVertical === "hotel" ? (
              <Hotel size={32} />
            ) : (
              <Package size={32} />
            )}
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {bookings.length === 0
                ? "No Bookings Found"
                : `No ${selectedVertical !== "all" ? selectedVertical : ""} Bookings Match Filter`}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {bookings.length === 0
                ? "You haven't made any reservations yet. Search flights, luxury hotels in Makkah & Madinah, or explore customized Umrah packages."
                : "No bookings found matching your selected vertical and status filter. Clear the filter or start a new reservation."}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {(selectedVertical !== "all" || selectedStatus !== "all" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedVertical("all");
                  setSelectedStatus("all");
                  setSearchQuery("");
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer shadow-xs"
              >
                Clear All Filters
              </button>
            )}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition shadow-xs"
            >
              <Plane size={14} />
              <span>Book Flight</span>
            </Link>
            <Link
              to="/hotel"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-emerald-600 hover:from-orange-600 hover:to-emerald-700 text-white transition shadow-xs"
            >
              <Hotel size={14} />
              <span>Book Hotel</span>
            </Link>
            <Link
              to="/package-page"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950 transition"
            >
              <Package size={14} />
              <span>Explore Packages</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Bookings Cards Grid */
        <div className="space-y-4">
          {filteredBookings.map((bkg) => {
            const bId = bkg._id || bkg.id || bkg.bookingId;
            const vertical = (bkg.bookingType || bkg.vertical || "flight").toLowerCase();
            const s = String(bkg.status || "").toLowerCase();
            const isConfirmed = ["confirmed", "ticketed", "completed", "paid", "payment_received"].includes(s);
            const isPending = ["pending", "initiated", "awaiting_payment"].includes(s);
            const isCancelled = ["cancelled", "cancellation_requested"].includes(s);
            const canCancel = bkg.canCancel !== false && !isCancelled;

            const dateStr = bkg.createdAt
              ? new Date(bkg.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "Recent";

            return (
              <div
                key={bId}
                className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                        vertical === "flight"
                          ? "bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400"
                          : vertical === "hotel"
                          ? "bg-orange-50 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400"
                          : vertical === "package"
                          ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400"
                          : "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400"
                      }`}
                    >
                      {vertical === "flight" ? (
                        <Plane size={22} />
                      ) : vertical === "hotel" ? (
                        <Hotel size={22} />
                      ) : vertical === "package" ? (
                        <Package size={22} />
                      ) : (
                        <Tag size={22} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {vertical}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                          ID: {String(bId).slice(-8)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(bId)}
                          title="Copy Full Booking ID"
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {copiedId === bId ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      </div>
                      <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                        {bkg.title || bkg.headline || "Travel Booking"}
                      </h4>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isConfirmed ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                        <CheckCircle2 size={13} />
                        Confirmed
                      </span>
                    ) : isPending ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                        <Clock size={13} />
                        Pending Payment
                      </span>
                    ) : isCancelled ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
                        <XCircle size={13} />
                        Cancelled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {bkg.status || "Unknown"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 text-xs">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[11px] font-medium">Destination / Route</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                      {bkg.destination || bkg.headline || "Pilgrimage Route"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[11px] font-medium">Booked On</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      {dateStr}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[11px] font-medium">Reference / PNR</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">
                      {bkg.pnr || bkg.bookingRefNo || bkg.voucherRef || "Direct"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[11px] font-medium">Total Paid / Due</span>
                    <span className="font-black text-slate-900 dark:text-white block text-sm">
                      {bkg.currency || "INR"} {Number(bkg.totalPrice || bkg.amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    {/* E-Ticket Modal Trigger for Confirmed Flight */}
                    {isConfirmed && vertical === "flight" && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedETicketBooking(bkg.rawBooking || bkg);
                          setEticketModalOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText size={13} />
                        <span>View E-Ticket</span>
                      </button>
                    )}

                    {/* Tax Invoice Download */}
                    {isConfirmed && (
                      <button
                        type="button"
                        onClick={async () => {
                          setDownloadingInvoiceId(bId);
                          try {
                            const res = await api.get(`/api/v1/${vertical === "hotel" ? "hotels" : vertical === "flight" ? "flights" : "packages"}/bookings/${bId}/invoice/download`, {
                              responseType: "blob",
                            });
                            const blob = new Blob([res.data], { type: "application/pdf" });
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = `Invoice_${bId}.pdf`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            toast.success("Tax invoice downloaded!");
                          } catch (err) {
                            toast.info("Invoice will be generated upon ticketing completion.");
                          } finally {
                            setDownloadingInvoiceId(null);
                          }
                        }}
                        disabled={downloadingInvoiceId === bId}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        {downloadingInvoiceId === bId ? (
                          <Loader2 size={13} className="animate-spin text-teal-600" />
                        ) : (
                          <FileText size={13} />
                        )}
                        <span>Tax Invoice</span>
                      </button>
                    )}

                    {/* Pending Payment Checkout Trigger */}
                    {isPending && (
                      <Link
                        to={`/checkout?bookingId=${bId}&type=${vertical}`}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <CreditCard size={13} />
                        <span>Complete Payment</span>
                      </Link>
                    )}
                  </div>

                  {/* CANCELLATION BUTTON */}
                  {canCancel && (
                    <button
                      type="button"
                      onClick={() => openCancelModal(bkg)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle size={14} />
                      <span>Cancel {vertical === "flight" ? "Flight" : vertical === "hotel" ? "Hotel" : "Booking"}</span>
                    </button>
                  )}

                  {isCancelled && (
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 italic">
                      Cancelled on record
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CANCELLATION MODAL */}
      {cancelModalOpen && cancellingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0c1a16] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <XCircle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Cancel {cancellingBooking.bookingType === "flight" ? "Flight Booking" : cancellingBooking.bookingType === "hotel" ? "Hotel Reservation" : "Booking"}
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    ID: {cancellingBooking._id || cancellingBooking.id || cancellingBooking.bookingId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <AlertCircle size={14} />
                  <span>Cancellation Terms & Supplier Policies</span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                  Are you sure you want to cancel this {cancellingBooking.bookingType || "travel"} reservation? Supplier cancellation charges may apply according to fare rules.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Reason for Cancellation
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                >
                  <option value="Change of travel plans">Change of travel plans</option>
                  <option value="Schedule or date conflict">Schedule or date conflict</option>
                  <option value="Found alternative arrangement">Found alternative arrangement</option>
                  <option value="Medical or personal emergency">Medical or personal emergency</option>
                  <option value="Other voluntary reason">Other voluntary reason</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  disabled={isCancelling}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    <span>Confirm Cancel</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* E-TICKET MODAL */}
      {eticketModalOpen && selectedETicketBooking && (
        <ETicketModal
          isOpen={eticketModalOpen}
          onClose={() => {
            setEticketModalOpen(false);
            setSelectedETicketBooking(null);
          }}
          booking={selectedETicketBooking}
        />
      )}
    </div>
  );
}
