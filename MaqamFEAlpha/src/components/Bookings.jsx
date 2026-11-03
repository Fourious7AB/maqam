
import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "../store/authContext";
import { getDocumentUrl } from "../utils/documentUrl";
import {
  FileText,
  Hotel,
  Plane,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  XCircle,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  Plus,
  RefreshCw,
  Lock,
  ArrowLeft,
  X,
  Loader2,
  Package,
  MapPin,
  Users,
  Check,
  ExternalLink,
  Compass,
  Camera,
  UploadCloud,
} from "lucide-react";
import CommonHeader from "./CommonHeader";
import api from "./stores/api";
import { VisaAPI, PackageAPI, PaymentAPI } from "../configs/api";
import { toast } from "react-toastify";
import packageService from "../services/packageService";
import { WORLD_COUNTRIES } from "../data/worldCountries";
import { visaCountriesList } from "../data/visaCountriesData";
import flightService from "../services/flightService";
import hotelService from "../services/hotelService";
import bookingService from "../services/bookingService";
import paymentService from "../services/paymentService";
import invoiceService from "../services/invoiceService";
import offerService from "../services/offerService";
import ETicketModal from "./eticket/ETicketModal";
import eticketService, { isPaymentConfirmed, isTicketConfirmed } from "../services/eticketService";

const getCountryFlagInfo = (countryName = "") => {
  if (!countryName) return { code: "", flag: "🌐", name: "" };
  const raw = String(countryName).trim();
  const lower = raw.toLowerCase();

  const aliases = {
    uae: "AE",
    "united arab emirates": "AE",
    uk: "GB",
    "united kingdom": "GB",
    usa: "US",
    "united states": "US",
    "united states of america": "US",
    russia: "RU",
    korea: "KR",
    "south korea": "KR",
  };

  if (aliases[lower]) {
    const aliasCode = aliases[lower];
    const match = WORLD_COUNTRIES.find((c) => c.code === aliasCode);
    if (match) return match;
    return { code: aliasCode, flag: "🌐", name: countryName };
  }

  const visaMatch = (visaCountriesList || []).find(
    (c) =>
      c.country?.toLowerCase() === lower ||
      c.slug?.toLowerCase() === lower ||
      c.code?.toLowerCase() === lower
  );
  if (visaMatch) {
    return {
      code: visaMatch.code,
      flag: visaMatch.flag,
      name: visaMatch.country,
    };
  }

  const worldMatch = (WORLD_COUNTRIES || []).find(
    (c) =>
      c.name?.toLowerCase() === lower ||
      c.code?.toLowerCase() === lower
  );
  if (worldMatch) {
    return worldMatch;
  }

  return { code: "", flag: "🌐", name: countryName };
};

const getStatusBadge = (status = "") => {
  const s = String(status || "").toLowerCase();
  if (
    s === "approved" ||
    s === "completed" ||
    s === "confirmed" ||
    s === "ticketed" ||
    s === "paid" ||
    s === "payment_received"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 size={13} className="text-emerald-600" />
        Confirmed
      </span>
    );
  }
  if (
    s === "processing" ||
    s === "in_process" ||
    s === "in process" ||
    s === "in_review"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
        <Clock size={13} className="text-blue-600 animate-spin" />
        In Process
      </span>
    );
  }
  if (s === "pending" || s === "initiated") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock size={13} className="text-amber-600 animate-spin" />
        Pending Payment
      </span>
    );
  }
  if (s === "rejected" || s === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle size={13} className="text-rose-600" />
        {s === "cancelled" ? "Cancelled" : "Rejected"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
      <Clock size={13} className="text-blue-600" />
      Submitted
    </span>
  );
};

export default function Bookings() {
  const navigate = useNavigate();
  const { isAuthenticated: ctxAuth } = useAuth();
  const reduxAuth = useSelector((state) => state.auth.isAuthenticated);
  const isAuthenticated = ctxAuth || reduxAuth;

  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const paramVal = searchParams.get("type") || searchParams.get("tab") || "package";
  const resolveOfferTab = () => {
    try {
      const lastData = JSON.parse(sessionStorage.getItem("lastOfferBookingData") || "{}");
      const itemType = (
        lastData.offerSnapshot?.itemType ||
        lastData.offerSnapshot?.type ||
        lastData.offer?.itemType ||
        lastData.itemType ||
        ""
      ).toLowerCase();
      if (itemType === "hotel" || lastData.offerSnapshot?.hotelId || lastData.offer?.hotelId) {
        return "hotel";
      }
    } catch {}
    return "flight";
  };

  const initialType =
    paramVal === "applications" ||
    paramVal === "visa" ||
    paramVal === "my-applications"
      ? "visa"
      : paramVal === "offer"
      ? resolveOfferTab()
      : paramVal;

  const [activeTab, setActiveTab] = useState(initialType); // "package" | "visa" | "flight" | "hotel"
  const [prevSearch, setPrevSearch] = useState(location.search);

  if (location.search !== prevSearch) {
    setPrevSearch(location.search);
    const p = searchParams.get("type") || searchParams.get("tab");
    const nextTab =
      p === "applications" || p === "visa" || p === "my-applications"
        ? "visa"
        : p === "offer"
        ? resolveOfferTab()
        : p && ["package", "flight", "hotel"].includes(p)
        ? p
        : activeTab;
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
    const s = searchParams.get("status");
    if (s && ["confirmed", "pending", "cancelled", "all"].includes(s.toLowerCase())) {
      setHotelFilter(s.toLowerCase());
      setFlightFilter(s.toLowerCase());
    }
  }

  // If customer returns from PayPal with token, seamlessly route to PaymentSuccessPage to capture
  useEffect(() => {
    const token = searchParams.get("token") || searchParams.get("orderId");
    if (token) {
      navigate(`/payment/paypal/success${location.search}`, { replace: true });
    }
  }, [location.search, navigate, searchParams]);

  // Package bookings state
  const [packageBookings, setPackageBookings] = useState([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [expandedPackageId, setExpandedPackageId] = useState(null);
  const [packageFilter, setPackageFilter] = useState("all"); // "all" | "confirmed" | "pending" | "cancelled"
  const [cancelPackageModalOpen, setCancelPackageModalOpen] = useState(false);
  const [cancellingPackage, setCancellingPackage] = useState(null);
  const [cancelReason, setCancelReason] = useState("Change of travel plans");
  const [isCancellingPackage, setIsCancellingPackage] = useState(false);

  // Visa applications state
  const [visaGroups, setVisaGroups] = useState([]);
  const [isLoadingVisas, setIsLoadingVisas] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [groupDetailsMap, setGroupDetailsMap] = useState({});
  const [loadingDetailsId, setLoadingDetailsId] = useState(null);

  // Visa Filter state: "all" | "completed" | "draft"
  const [visaFilter, setVisaFilter] = useState("all");

  const handleResumeVisa = (group) => {
    navigate(
      `/visa-card?groupId=${group._id}&country=${encodeURIComponent(
        group.destinationCountry
      )}&visaType=${encodeURIComponent(group.visaType || "")}`
    );
  };

  // Hotel & Flight bookings state
  const [hotelBookings, setHotelBookings] = useState([]);
  const [flightBookings, setFlightBookings] = useState([]);
  const [isLoadingHotels, setIsLoadingHotels] = useState(false);
  const [expandedFlightId, setExpandedFlightId] = useState(null);
  const [expandedHotelId, setExpandedHotelId] = useState(null);
  const initialStatus = searchParams.get("status");
  const validInitialStatus =
    initialStatus && ["confirmed", "pending", "cancelled", "all"].includes(initialStatus.toLowerCase())
      ? initialStatus.toLowerCase()
      : "all";
  const [flightFilter, setFlightFilter] = useState(validInitialStatus);
  const [hotelFilter, setHotelFilter] = useState(validInitialStatus);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
  const [downloadedInvoiceId, setDownloadedInvoiceId] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellingItem, setCancellingItem] = useState(null);
  const [cancellingType, setCancellingType] = useState("flight");
  const [isCancellingGeneral, setIsCancellingGeneral] = useState(false);
  const [generalCancelReason, setGeneralCancelReason] = useState("Change of travel plans");

  // E-Ticket Viewer Modal State
  const [eTicketModalOpen, setETicketModalOpen] = useState(false);
  const [activeETicket, setActiveETicket] = useState(null);
  const [isLoadingETicket, setIsLoadingETicket] = useState(false);
  const [eTicketError, setETicketError] = useState(null);

  const handleOpenETicket = async (bkg, serviceType = "LIVE_FLIGHT") => {
    // 1. Strict Payment Confirmation Guard:
    if (!isPaymentConfirmed(bkg)) {
      toast.warning("Payment must be confirmed before your e-ticket can be generated.");
      return;
    }

    setETicketModalOpen(true);
    setIsLoadingETicket(true);
    setETicketError(null);
    setActiveETicket(null);

    try {
      const id = bkg._id || bkg.id;
      let ticket = null;

      if (serviceType === "INHOUSE_OFFER_FLIGHT") {
        ticket = await eticketService.getOfferFlightETicket(id, bkg);
      } else if (serviceType === "INHOUSE_PACKAGE_FLIGHT") {
        ticket = await eticketService.getPackageFlightETicket(id, bkg);
      } else {
        ticket = await eticketService.getLiveFlightETicket(id, bkg);
      }

      // 2. Strict Backend Confirmed Details Guard:
      if (!isTicketConfirmed(ticket)) {
        setETicketError(
          "Your payment is confirmed! However, the airline carrier is currently finalizing your PNR and ticket number issuance. Please check back shortly or refresh."
        );
      } else {
        setActiveETicket(ticket);
      }
    } catch (err) {
      setETicketError(
        err?.response?.data?.message ||
          err?.message ||
          "Confirmed e-ticket details are not yet available from the carrier reservation system."
      );
    } finally {
      setIsLoadingETicket(false);
    }
  };

  const handleDownloadInvoice = async ({ vertical = "package", bookingId, bookingTitle }) => {
    const id = bookingId;
    if (!id) {
      toast.error(`Unable to identify booking reference for this ${vertical} reservation.`);
      return;
    }

    try {
      setDownloadingInvoiceId(id);
      const res = await invoiceService.downloadInvoice({
        vertical,
        bookingId: String(id),
      });

      setDownloadedInvoiceId(id);
      toast.success(`Official invoice downloaded: ${res.filename}`);
      setTimeout(() => setDownloadedInvoiceId((prev) => (prev === id ? null : prev)), 3500);
    } catch (err) {
      console.error(`${vertical} invoice download failed:`, err);
      const status = err?.response?.status;
      const message = err?.message || "";

      if (status === 401) {
        toast.error("Your session has expired. Please log in again to download your invoice.");
      } else if (status === 403) {
        toast.error("Access denied: You are only authorized to view invoices for your own bookings.");
      } else if (status === 404 || /not found/i.test(message)) {
        toast.warn(`Invoice not found on the server for this ${vertical} booking.`);
      } else {
        toast.error(message || "Failed to download invoice. Please try again later.");
      }
    } finally {
      setDownloadingInvoiceId((prev) => (prev === id ? null : prev));
    }
  };

  const handleDownloadHotelInvoice = (bkg) => {
    const id = bkg._id || bkg.id || bkg.bookingId || bkg.providerBookingId;
    return handleDownloadInvoice({ vertical: "hotel", bookingId: id });
  };

  const fetchPackageBookings = async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoadingPackages(true);
      // 1. Fetch from dedicated package bookings endpoint
      const list = await packageService.getUserPackageBookings();

      // 2. Also check /api/v1/bookings for any package items
      let generalBookings = [];
      try {
        const genRes = await api.get("/api/v1/bookings");
        const genList =
          genRes.data?.data || genRes.data?.bookings || genRes.data || [];
        if (Array.isArray(genList)) {
          generalBookings = genList.filter(
            (b) =>
              (b.bookingType || "").toLowerCase() === "package" ||
              (b.bookingType || "").toLowerCase() === "custom_package" ||
              b.packageId
          );
        }
      } catch {
        // ignore
      }

      // 3. Also check local storage for recent guest or user bookings
      let cachedBookings = [];
      try {
        const cached = localStorage.getItem("maqam_user_package_bookings");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) cachedBookings = parsed;
        }
      } catch {
        // ignore
      }

      // Merge and deduplicate by _id / id
      const combined = [...list, ...generalBookings, ...cachedBookings];
      const seen = new Set();
      const uniqueList = [];
      for (const item of combined) {
        const id = item._id || item.id || item.bookingId;
        if (id && !seen.has(id)) {
          seen.add(id);
          uniqueList.push(item);
        }
      }

      setPackageBookings(uniqueList);
    } catch (error) {
      console.warn("Error fetching package bookings:", error);
      setPackageBookings([]);
    } finally {
      setIsLoadingPackages(false);
    }
  };

  const handleCancelPackage = async (e) => {
    e.preventDefault();
    if (!cancellingPackage?._id) return;
    try {
      setIsCancellingPackage(true);
      await packageService.cancelPackageBooking(cancellingPackage._id, cancelReason);
      toast.success("Package booking cancelled successfully. Inventory released.");

      setPackageBookings((prev) =>
        prev.map((b) =>
          b._id === cancellingPackage._id ? { ...b, status: "cancelled" } : b
        )
      );

      try {
        const stored = JSON.parse(
          localStorage.getItem("maqam_user_package_bookings") || "[]"
        );
        const updated = stored.map((b) =>
          b._id === cancellingPackage._id ? { ...b, status: "cancelled" } : b
        );
        localStorage.setItem("maqam_user_package_bookings", JSON.stringify(updated));
      } catch {
        // ignore
      }

      setCancelPackageModalOpen(false);
      setCancellingPackage(null);
    } catch (err) {
      console.error("Failed to cancel package booking:", err);
      toast.error(
        err.response?.data?.message || err.message || "Failed to cancel booking"
      );
    } finally {
      setIsCancellingPackage(false);
    }
  };

  const handlePayPackage = async (booking) => {
    const bookingId = booking._id || booking.id || booking.bookingId;
    if (!bookingId) return;
    try {
      toast.info("Connecting to PayPal secure checkout...");
      const order = await packageService.createPayPalOrder({
        bookingId,
        amount: booking.totalPrice || booking.totalAmount || booking.amount,
        returnUrl: `${window.location.origin}/payment/paypal/success?type=package&bookingId=${bookingId}`,
        cancelUrl: `${window.location.origin}/payment/paypal/cancel?type=package&bookingId=${bookingId}`,
      });
      const redirectUrl =
        order?.redirectUrl ||
        order?.approvalUrl ||
        order?.data?.redirectUrl ||
        order?.data?.approvalUrl ||
        order?.links?.find((l) => l.rel === "approve")?.href;
      if (redirectUrl) {
        sessionStorage.setItem("lastPackageBookingId", String(bookingId));
        sessionStorage.setItem("lastPaymentBookingType", "package");
        window.location.assign(redirectUrl);
      } else {
        throw new Error(
          order?.message || "Could not acquire PayPal checkout link. Please try again."
        );
      }
    } catch (err) {
      console.error("Payment initiation error:", err);
      toast.error(
        err.response?.data?.message || err.message || "Failed to initiate PayPal payment."
      );
    }
  };

  const handlePayVisa = async (group) => {
    const groupId = group._id || group.id;
    if (!groupId) return;
    try {
      toast.info("Connecting to PayPal secure checkout...");
      const returnUrl = `${window.location.origin}/payment/paypal/success?type=visa&bookingId=${groupId}`;
      const cancelUrl = `${window.location.origin}/payment/paypal/cancel?type=visa&bookingId=${groupId}`;

      const orderRes = await paymentService.createPayPalOrder({
        bookingId: groupId,
        bookingType: "visa",
        amount: group.totalAmount || 0,
        returnUrl,
        cancelUrl,
      });

      const redirectUrl =
        orderRes?.redirectUrl ||
        orderRes?.approvalUrl ||
        orderRes?.data?.redirectUrl ||
        orderRes?.data?.approvalUrl ||
        orderRes?.data?.links?.find((l) => l.rel === "approve")?.href;

      if (redirectUrl) {
        sessionStorage.setItem("lastVisaBookingId", String(groupId));
        sessionStorage.setItem("lastPaymentBookingType", "visa");
        window.location.assign(redirectUrl);
      } else {
        throw new Error(
          orderRes?.message ||
            "PayPal checkout link could not be generated. Please try again."
        );
      }
    } catch (err) {
      console.error("Visa PayPal Payment Error:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Payment initiation failed. Please try again.";
      toast.error(msg);
    }
  };

  const fetchVisaGroups = async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoadingVisas(true);
      const response = await api.get(VisaAPI.UserGroupsApi);
      const data = response.data?.data || response.data || [];
      setVisaGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching visa applications:", error);
    } finally {
      setIsLoadingVisas(false);
    }
  };

  const fetchBookings = async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoadingHotels(true);

      const [flightRes, hotelRes, masterRes, offerRes] = await Promise.allSettled([
        flightService.getMyFlightBookings(),
        hotelService.getMyHotelBookings(),
        bookingService.getMasterBookings(),
        offerService.getUserOfferBookings(),
      ]);

      const rawDomainFlights =
        flightRes.status === "fulfilled" && Array.isArray(flightRes.value)
          ? flightRes.value
          : [];
      const rawDomainHotels =
        hotelRes.status === "fulfilled" && Array.isArray(hotelRes.value)
          ? hotelRes.value
          : [];
      const masterList =
        masterRes.status === "fulfilled" && Array.isArray(masterRes.value)
          ? masterRes.value
          : [];
      const offerList =
        offerRes.status === "fulfilled" && Array.isArray(offerRes.value)
          ? offerRes.value
          : [];

      const domainFlights = rawDomainFlights.map((f) => {
        const segs =
          f.eTicketData?.Segments ||
          f.eTicketData?.FlightItinerary?.Segments ||
          f.fareSnapshot?.Segments ||
          f.segments ||
          [];
        const flattenedSegs = Array.isArray(segs[0]) ? segs.flat() : segs;
        const firstSeg = flattenedSegs[0] || {};
        const lastSeg = flattenedSegs[flattenedSegs.length - 1] || firstSeg;

        const rawETicketPax =
          (Array.isArray(f.eTicketData?.Passenger) && f.eTicketData.Passenger) ||
          (Array.isArray(f.eTicketData?.FlightItinerary?.Passenger) && f.eTicketData.FlightItinerary.Passenger) ||
          [];

        const normalizedPax = (f.passengers && f.passengers.length > 0 ? f.passengers : rawETicketPax).map((p, idx) => {
          const t = p.travellerId && typeof p.travellerId === "object" ? p.travellerId : {};
          const matchedETicketPax = rawETicketPax[idx] || rawETicketPax.find((ep) =>
            ep.FirstName?.toLowerCase() === (p.firstName || t.firstName || "").toLowerCase()
          );
          return {
            ...p,
            firstName: p.firstName || t.firstName || p.FirstName || matchedETicketPax?.FirstName || "",
            lastName: p.lastName || t.lastName || p.LastName || matchedETicketPax?.LastName || "",
            title: p.title || t.title || p.Title || matchedETicketPax?.Title || "Mr",
            passengerType: p.passengerType || t.passengerType || p.PaxType || matchedETicketPax?.PaxType || "Adult",
            ticketNumber:
              p.ticketNumber ||
              p.Ticket?.TicketNumber ||
              matchedETicketPax?.Ticket?.TicketNumber ||
              f.ticketNumber ||
              "",
          };
        });

        const pnr =
          f.pnr ||
          f.gdsPnr ||
          f.srdvPnr ||
          f.eTicketData?.PNR ||
          f.eTicketData?.FlightItinerary?.PNR ||
          "";

        const isPaid = isPaymentConfirmed(f);
        const resolvedStatus = isPaid ? "confirmed" : (f.status || "confirmed");

        return {
          ...f,
          status: resolvedStatus,
          bookingSource: "SRDV_LIVE",
          sourceLabel: "SRDV Live Supplier",
          origin: f.origin || firstSeg.Origin?.AirportCode || firstSeg.Origin?.CityName || firstSeg.origin || "DEL",
          destination: f.destination || lastSeg.Destination?.AirportCode || lastSeg.Destination?.CityName || lastSeg.destination || "BOM",
          airline:
            f.airline ||
            f.airlineName ||
            firstSeg.Airline?.AirlineName ||
            (firstSeg.Airline?.AirlineCode ? firstSeg.Airline.AirlineCode : (f.isLCC ? "Low Cost Carrier" : "Commercial Airline")),
          flightNumber: f.flightNumber || firstSeg.Airline?.FlightNumber || "",
          totalPrice: f.totalAmount || f.totalPrice || f.amount || 0,
          pnr,
          passengers: normalizedPax.length > 0 ? normalizedPax : (f.passengers || []),
        };
      });

      const domainHotels = rawDomainHotels.map((h) => {
        const isPaid = isPaymentConfirmed(h);
        const resolvedStatus = isPaid ? "confirmed" : (h.status ? String(h.status).toLowerCase() : "awaiting_payment");
        return {
          ...h,
          bookingSource: "SRDV_LIVE",
          sourceLabel: "SRDV Live Supplier",
          hotelName: h.hotelName || h.hotelSnapshot?.name || h.hotel?.name || "Hotel Reservation",
          roomName: h.roomName || h.roomSnapshots?.[0]?.roomName || h.roomSnapshots?.[0]?.name || h.rooms?.[0]?.name || "Standard Room",
          totalPrice: h.totalPrice || (h.customerTotalMinor ? h.customerTotalMinor / 100 : h.amount || 0),
          voucherRef: h.providerBookingId || h.bookingRefNo || h.confirmationNo || h.voucherCode || h.voucherRef || "",
          status: resolvedStatus,
          checkIn: h.checkIn,
          checkOut: h.checkOut,
          guests: h.guests || [],
        };
      });

      const masterFlights = masterList
        .filter((b) => (b.bookingType || "").toLowerCase() === "flight")
        .map((b) => {
          let orig = b.details?.origin || b.origin;
          let dest = b.details?.destination || b.destination;
          if (dest && dest.includes("-") && !orig) {
            const parts = dest.split("-");
            orig = parts[0];
            dest = parts[1];
          }
          return {
            ...b,
            isMaster: true,
            bookingSource: "INHOUSE_MASTER",
            sourceLabel: "In-House Custom Inventory",
            bookingType: "flight",
            origin: orig || "DEL",
            destination: dest || "BOM",
            totalPrice: b.details?.totalPrice || b.totalAmount || b.amount || 0,
            passengers: b.passengers || (b.details?.passengers ? Array(b.details.passengers).fill({ firstName: "Passenger", lastName: "" }) : []),
            status: b.status || "confirmed",
            airline: b.airline || b.details?.airline || "Commercial Airline",
            flightNumber: b.flightNumber || b.details?.flightNumber || "",
            departureDate: b.details?.departureDate,
            returnDate: b.details?.returnDate,
          };
        });

      const masterHotels = masterList
        .filter((b) => (b.bookingType || "").toLowerCase() === "hotel")
        .map((b) => ({
          ...b,
          isMaster: true,
          bookingSource: "INHOUSE_MASTER",
          sourceLabel: "In-House Custom Inventory",
          bookingType: "hotel",
          hotelName: b.hotelName || b.details?.hotelName || (b.details?.destination ? `${b.details.destination} Hotel` : "Hotel Reservation"),
          roomName: b.roomName || b.details?.roomName || "Standard Room",
          totalPrice: b.details?.totalPrice || b.totalAmount || b.amount || 0,
          status: b.status || "confirmed",
          checkIn: b.details?.checkIn || b.details?.departureDate,
          checkOut: b.details?.checkOut || b.details?.returnDate,
          guests: b.guests || [],
        }));

      const offerFlights = [];
      const offerHotels = [];

      for (const ob of offerList) {
        const itemType = (
          ob.offerSnapshot?.itemType ||
          ob.offerSnapshot?.type ||
          ob.offer?.itemType ||
          ob.offer?.type ||
          ob.itemType ||
          ""
        ).toLowerCase();

        const isHotelOffer =
          itemType === "hotel" ||
          Boolean(ob.offerSnapshot?.hotelId || ob.offer?.hotelId);

        if (isHotelOffer) {
          offerHotels.push({
            ...ob,
            isOffer: true,
            bookingSource: "INHOUSE_OFFER",
            sourceLabel: "In-House Special Offer",
            bookingType: "offer",
            hotelName:
              ob.offerSnapshot?.title ||
              ob.offer?.title ||
              ob.title ||
              "Special Hotel Offer",
            roomName:
              ob.offerSnapshot?.description ||
              ob.roomName ||
              "Standard Offer Allocation",
            totalPrice: ob.totalAmount || ob.totalPrice || ob.amount || 0,
            status: ob.status || ob.bookingStatus || "confirmed",
            guests: ob.travellers || [],
            checkIn: ob.offerSnapshot?.validFrom || ob.createdAt,
            checkOut: ob.offerSnapshot?.validUntil,
          });
        } else {
          const stockDoc = ob.offerSnapshot?.detail || ob.claimedFlightUnits?.[0]?.stock || {};
          offerFlights.push({
            ...ob,
            isOffer: true,
            bookingSource: "INHOUSE_OFFER",
            sourceLabel: "In-House Special Offer",
            bookingType: "offer",
            airline:
              stockDoc.airline ||
              ob.offerSnapshot?.title ||
              ob.offer?.title ||
              ob.title ||
              "Special Flight Offer",
            airlineName:
              stockDoc.airline ||
              ob.offerSnapshot?.title ||
              ob.offer?.title ||
              ob.title ||
              "Special Flight Offer",
            flightNumber:
              stockDoc.flightNumber ||
              ob.offerSnapshot?.flightNumber ||
              ob.offer?.flightNumber ||
              ob.flightNumber ||
              "Offer Flight",
            flightNo:
              stockDoc.flightNumber ||
              ob.offerSnapshot?.flightNumber ||
              ob.offer?.flightNumber ||
              ob.flightNumber ||
              "Offer Flight",
            origin:
              stockDoc.origin ||
              ob.offerSnapshot?.origin ||
              ob.offer?.origin ||
              ob.origin ||
              "DEL",
            destination:
              stockDoc.destination ||
              ob.offerSnapshot?.destination ||
              ob.offer?.destination ||
              ob.destination ||
              "JED",
            departureDate:
              stockDoc.departureDate ||
              ob.offerSnapshot?.startDate ||
              ob.departureDate ||
              ob.createdAt,
            arrivalDate:
              stockDoc.arrivalDate ||
              ob.offerSnapshot?.endDate ||
              ob.arrivalDate,
            passengers: ob.travellers || [],
            totalPrice: ob.totalAmount || ob.totalPrice || ob.amount || 0,
            status: ob.status || ob.bookingStatus || "confirmed",
            pnr: stockDoc.pnr || ob.offerSnapshot?.pnr || ob.pnr || ob.airlinePnr || "OFFER-PNR",
          });
        }
      }

      // Merge and deduplicate flights
      const mergedFlights = [...domainFlights];
      const seenFlightIds = new Set();
      domainFlights.forEach((f) => {
        if (f._id) seenFlightIds.add(String(f._id));
        if (f.id) seenFlightIds.add(String(f.id));
        if (f.bookingId) seenFlightIds.add(String(f.bookingId));
      });
      for (const mf of [...masterFlights, ...offerFlights]) {
        const id = String(mf._id || mf.id || mf.bookingId);
        const itemId = mf.itemId ? String(mf.itemId) : null;
        if (id && !seenFlightIds.has(id) && (!itemId || !seenFlightIds.has(itemId))) {
          seenFlightIds.add(id);
          if (itemId) seenFlightIds.add(itemId);
          mergedFlights.push(mf);
        }
      }

      // Merge and deduplicate hotels
      const mergedHotels = [...domainHotels];
      const seenHotelIds = new Set();
      domainHotels.forEach((h) => {
        if (h._id) seenHotelIds.add(String(h._id));
        if (h.id) seenHotelIds.add(String(h.id));
        if (h.bookingId) seenHotelIds.add(String(h.bookingId));
      });
      for (const mh of [...masterHotels, ...offerHotels]) {
        const id = String(mh._id || mh.id || mh.bookingId);
        const itemId = mh.itemId ? String(mh.itemId) : null;
        if (id && !seenHotelIds.has(id) && (!itemId || !seenHotelIds.has(itemId))) {
          seenHotelIds.add(id);
          if (itemId) seenHotelIds.add(itemId);
          mergedHotels.push(mh);
        }
      }

      setFlightBookings(mergedFlights);
      setHotelBookings(mergedHotels);
    } catch (error) {
      console.warn("Bookings not found or error:", error);
      setHotelBookings([]);
      setFlightBookings([]);
    } finally {
      setIsLoadingHotels(false);
    }
  };

  const handlePayHeldBooking = async (bkg, type) => {
    const bookingId = bkg._id || bkg.id || bkg.bookingId;
    if (!bookingId) return;
    try {
      toast.info("Connecting to PayPal secure checkout...");
      const actualType = bkg.isOffer || bkg.bookingType === "offer" ? "offer" : type;
      const orderRes = await paymentService.createPayPalOrder({
        bookingId,
        bookingType: actualType,
        amount: bkg.totalPrice || bkg.totalAmount || bkg.amount,
        returnUrl: `${window.location.origin}/payment/paypal/success?type=${actualType}&bookingId=${bookingId}`,
        cancelUrl: `${window.location.origin}/payment/paypal/cancel?type=${actualType}&bookingId=${bookingId}`,
      });
      if (orderRes?.redirectUrl) {
        if (actualType === "offer") {
          sessionStorage.setItem("lastOfferBookingId", String(bookingId));
          sessionStorage.setItem("lastPaymentBookingType", "offer");
        } else if (type === "flight") {
          sessionStorage.setItem("lastFlightBookingId", String(bookingId));
          sessionStorage.setItem("lastPaymentBookingType", "flight");
        } else if (type === "hotel") {
          sessionStorage.setItem("lastHotelBookingId", String(bookingId));
          sessionStorage.setItem("lastPaymentBookingType", "hotel");
        } else if (type === "package") {
          sessionStorage.setItem("lastPackageBookingId", String(bookingId));
          sessionStorage.setItem("lastPaymentBookingType", "package");
        } else if (type === "visa") {
          sessionStorage.setItem("lastVisaBookingId", String(bookingId));
          sessionStorage.setItem("lastPaymentBookingType", "visa");
        }
        window.location.assign(orderRes.redirectUrl);
      } else {
        throw new Error("Could not acquire PayPal approval URL.");
      }
    } catch (err) {
      console.error("Payment resumption error:", err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to initiate PayPal payment."
      );
    }
  };

  const handleConfirmCancelGeneral = async (e) => {
    e.preventDefault();
    if (!cancellingItem) return;
    const bookingId =
      cancellingItem._id || cancellingItem.id || cancellingItem.bookingId;
    if (!bookingId) return;

    try {
      setIsCancellingGeneral(true);
      if (cancellingItem.isOffer || cancellingItem.bookingType === "offer") {
        await offerService.cancelBooking(bookingId, generalCancelReason);
      } else if (cancellingType === "flight") {
        await flightService.cancelFlightBooking(bookingId);
      } else if (cancellingType === "hotel") {
        await hotelService.cancelHotelBooking(bookingId);
      } else {
        await bookingService.cancelMasterBooking(bookingId);
      }
      toast.success(
        `${cancellingItem.isOffer || cancellingItem.bookingType === "offer" ? "Offer" : cancellingType === "flight" ? "Flight" : "Hotel"} booking cancelled successfully.`
      );
      setCancelModalOpen(false);
      setCancellingItem(null);
      fetchBookings();
    } catch (err) {
      console.error("Cancellation error:", err);
      toast.error(
        err.response?.data?.message || err.message || "Failed to cancel booking."
      );
    } finally {
      setIsCancellingGeneral(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;
    const loadAll = async () => {
      await Promise.resolve();
      if (!isMounted) return;
      fetchPackageBookings();
      fetchVisaGroups();
      fetchBookings();
    };
    loadAll();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const toggleExpandGroup = async (groupId) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      return;
    }
    setExpandedGroupId(groupId);

    // If not fetched yet, fetch details
    if (!groupDetailsMap[groupId]) {
      try {
        setLoadingDetailsId(groupId);
        const response = await api.get(VisaAPI.UserSingleGroupApi(groupId));
        const resData = response.data?.data || response.data;
        if (resData) {
          setGroupDetailsMap((prev) => ({
            ...prev,
            [groupId]: resData,
          }));
        }
      } catch (err) {
        console.error("Failed to load visa group details:", err);
      } finally {
        setLoadingDetailsId(null);
      }
    }
  };



  return (
    <div className="min-h-screen bg-[#f7f9fc] font-poppins text-slate-800">
      <CommonHeader title="My Bookings & Applications" />

      <main className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-28">
        {/* Page Top Title */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            My Bookings & Applications
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track your international visa applications, hotel reservations, and travel documents in real-time.
          </p>
        </div>

        {/* Not Authenticated Warning */}
        {!isAuthenticated ? (
          <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 text-center shadow-sm max-w-lg mx-auto my-12 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Lock size={28} />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Sign In to View Applications
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Please log in to your Maqam Travels account to view your active visa application batches, applicant statuses, and hotel bookings.
            </p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-md transition cursor-pointer"
            >
              Log In to My Account
            </button>
          </div>
        ) : (
          <>
            {/* Tabs Selector */}
            <div className="flex items-center gap-2.5 sm:gap-3 border-b border-slate-200 pb-3 mb-6 overflow-x-auto scrollbar-none">
              <button
                type="button"
                id="tab-package-bookings"
                onClick={() => setActiveTab("package")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
                  activeTab === "package"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Package size={16} />
                <span>Package Bookings</span>
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                    activeTab === "package"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {packageBookings.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("visa")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
                  activeTab === "visa"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <FileText size={16} />
                <span>Visa Applications</span>
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                    activeTab === "visa"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {visaGroups.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("flight")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
                  activeTab === "flight"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Plane size={16} />
                <span>Flight Bookings</span>
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                    activeTab === "flight"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {flightBookings.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("hotel")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
                  activeTab === "hotel"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Hotel size={16} />
                <span>Hotel Bookings</span>
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                    activeTab === "hotel"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {hotelBookings.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  fetchPackageBookings();
                  fetchVisaGroups();
                  fetchBookings();
                  toast.info("Refreshed all bookings and applications");
                }}
                className="ml-auto p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-teal-700 hover:bg-slate-50 transition cursor-pointer shrink-0"
                title="Refresh"
              >
                <RefreshCw size={15} />
              </button>
            </div>

            {/* TAB CONTENT 1: VISA APPLICATIONS */}
            {activeTab === "visa" && (() => {
              const confirmedVisaGroups = visaGroups.filter(
                (g) => g.paymentStatus === "paid"
              );
              const draftVisaGroups = visaGroups.filter(
                (g) => g.paymentStatus !== "paid"
              );
              const filteredVisaGroups = visaGroups.filter((g) => {
                if (visaFilter === "completed") return g.paymentStatus === "paid";
                if (visaFilter === "draft") return g.paymentStatus !== "paid";
                return true;
              });

              return (
                <div className="space-y-6">
                  {/* Top Summary Metrics Cards (Matching MakeMyTrip & Goibibo) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                        <FileText size={22} />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Total Applications
                        </p>
                        <p className="text-xl sm:text-2xl font-black text-slate-900">
                          {visaGroups.length}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-emerald-200/90 shadow-2xs flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={22} />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                          Confirmed & Paid
                        </p>
                        <p className="text-xl sm:text-2xl font-black text-emerald-900">
                          {confirmedVisaGroups.length}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-indigo-200/80 shadow-2xs flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Clock size={22} />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                          Drafts / Action Required
                        </p>
                        <p className="text-xl sm:text-2xl font-black text-slate-900">
                          {draftVisaGroups.length}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sub-Filter Tabs: All | Confirmed & Paid | Drafts */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <button
                      type="button"
                      onClick={() => setVisaFilter("all")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 ${
                        visaFilter === "all"
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      <span>All Applications</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          visaFilter === "all"
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {visaGroups.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVisaFilter("completed")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 ${
                        visaFilter === "completed"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      <CheckCircle2
                        size={13}
                        className={
                          visaFilter === "completed" ? "text-white" : "text-emerald-600"
                        }
                      />
                      <span>Confirmed & Paid</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          visaFilter === "completed"
                            ? "bg-white/20 text-white"
                            : "bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        {confirmedVisaGroups.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVisaFilter("draft")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 ${
                        visaFilter === "draft"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      <Clock
                        size={13}
                        className={
                          visaFilter === "draft" ? "text-white" : "text-indigo-600"
                        }
                      />
                      <span>Drafts / Action Required</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          visaFilter === "draft"
                            ? "bg-white/20 text-white"
                            : "bg-indigo-50 text-indigo-700"
                        }`}
                      >
                        {draftVisaGroups.length}
                      </span>
                    </button>
                  </div>

                  {isLoadingVisas ? (
                    <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                      <Clock size={28} className="animate-spin text-teal-600 mx-auto" />
                      <p className="text-xs sm:text-sm font-bold text-slate-600">
                        Loading your visa applications...
                      </p>
                    </div>
                  ) : visaGroups.length === 0 ? (
                    <div className="rounded-3xl bg-white border border-slate-200 p-8 sm:p-12 text-center shadow-xs space-y-4">
                      <div className="w-16 h-16 rounded-3xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                        <FileText size={32} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                          No Visa Applications Found
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                          You haven't submitted any visa applications yet. Explore our global visa catalogue for Saudi Arabia, Indonesia, UAE, and more.
                        </p>
                      </div>
                      <Link
                        to="/visa-card"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-md transition"
                      >
                        <Plus size={16} />
                        <span>Apply for a Visa Now</span>
                      </Link>
                    </div>
                  ) : filteredVisaGroups.length === 0 ? (
                    <div className="rounded-3xl bg-white border border-slate-200 p-8 text-center shadow-xs space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                        {visaFilter === "draft" ? <Clock size={26} /> : <CheckCircle2 size={26} />}
                      </div>
                      <h4 className="text-base font-extrabold text-slate-900">
                        {visaFilter === "draft"
                          ? "No Draft Applications"
                          : "No Confirmed Applications"}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        {visaFilter === "draft"
                          ? "All your visa applications have completed payments and are confirmed."
                          : "You do not have any completed or paid visa applications yet."}
                      </p>
                      <button
                        type="button"
                        onClick={() => setVisaFilter("all")}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                      >
                        View All Applications
                      </button>
                    </div>
                  ) : (
                    filteredVisaGroups.map((group) => {
                      const isExpanded = expandedGroupId === group._id;
                      const details = groupDetailsMap[group._id];
                      const isLoadingDetails = loadingDetailsId === group._id;
                      const isDraft = group.paymentStatus !== "paid";
                      const createdDate = group.createdAt
                        ? new Date(group.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Recent";
                      const flagInfo = getCountryFlagInfo(group.destinationCountry);

                      return (
                        <div
                          key={group._id}
                          className="rounded-2xl bg-white border border-slate-200/90 hover:border-indigo-300 hover:shadow-md transition-all overflow-hidden"
                        >
                          {/* Group Batch Card Summary Header */}
                          <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                              {/* Country Flag */}
                              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center overflow-hidden shrink-0 p-1">
                                {flagInfo.code ? (
                                  <img
                                    src={`https://flagcdn.com/w80/${flagInfo.code.toLowerCase()}.png`}
                                    alt={`${group.destinationCountry} flag`}
                                    className="w-full h-full object-cover rounded-xl shadow-2xs"
                                    loading="lazy"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                      if (e.currentTarget.nextSibling) {
                                        e.currentTarget.nextSibling.style.display = "block";
                                      }
                                    }}
                                  />
                                ) : null}
                                <span
                                  className={`${flagInfo.code ? "hidden" : "block"} text-2xl select-none leading-none`}
                                >
                                  {flagInfo.flag || "🌐"}
                                </span>
                              </div>

                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                                    {group.destinationCountry}
                                  </h3>
                                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/70">
                                    {group.visaType}
                                  </span>
                                  {isDraft ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/70">
                                      <Clock size={12} className="text-amber-500" />
                                      Action Required
                                    </span>
                                  ) : (
                                    getStatusBadge(group.groupStatus)
                                  )}
                                </div>

                                <p className="text-xs text-slate-400">
                                  Batch #{group._id?.slice(-8).toUpperCase()} • Submitted on {createdDate}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between lg:justify-end gap-5 sm:gap-7 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                              <div className="text-left lg:text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  Travelers
                                </p>
                                <p className="text-sm font-bold text-slate-800">
                                  {group.totalApplicants} Traveler
                                  {group.totalApplicants > 1 ? "s" : ""}
                                </p>
                              </div>

                              <div className="text-left lg:text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  Amount
                                </p>
                                <p className="text-base font-black text-slate-900">
                                  ₹{(group.totalAmount || 0).toLocaleString()}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                {/* Single Professional Resume Button and 1-Click PayPal Pay for Drafts */}
                                {isDraft && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePayVisa(group);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                                      title="1-Click Pay with PayPal"
                                    >
                                      <CreditCard size={13} />
                                      <span>Pay with PayPal</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleResumeVisa(group);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                                      title="Resume Visa Application"
                                    >
                                      <span>Resume Application</span>
                                      <ArrowRight size={13} />
                                    </button>
                                  </>
                                )}

                                {/* View Applicants Details Button */}
                                <button
                                  type="button"
                                  onClick={() => toggleExpandGroup(group._id)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                                >
                                  <span>{isExpanded ? "Hide Details" : "View Applicants"}</span>
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Applicant Details (Pure Tracking & Document Upload) */}
                          {isExpanded && (
                            <div className="bg-slate-50/70 border-t border-slate-200/80 p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
                              <div className="flex items-center justify-between gap-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                  <Users size={14} className="text-indigo-600" />
                                  <span>
                                    Applicant Records ({details?.applications?.length || group.totalApplicants || 1})
                                  </span>
                                </h4>
                              </div>

                              {isLoadingDetails ? (
                                <div className="p-6 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                                  <Clock size={16} className="animate-spin text-teal-600" />
                                  <span>Fetching applicant details...</span>
                                </div>
                              ) : details?.applications && details.applications.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {details.applications.map((app, idx) => {
                                    const trav = app.travelerDetails || {};
                                    const docs = app.documents || {};
                                    const dob = trav.dateOfBirth
                                      ? new Date(trav.dateOfBirth).toLocaleDateString("en-IN", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                        })
                                      : "N/A";
                                    const passportNo =
                                      !trav.passportNumber ||
                                      trav.passportNumber === "VERIFY_FROM_IMAGE"
                                        ? "To be verified from scan"
                                        : trav.passportNumber;

                                    return (
                                      <div
                                        key={app._id || idx}
                                        className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 transition space-y-3 text-xs shadow-2xs"
                                      >
                                        {/* Header: Traveler Name & Current Status */}
                                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                                              {idx + 1}
                                            </div>
                                            <span className="font-bold text-sm text-slate-900 truncate">
                                              {trav.firstName} {trav.lastName}
                                            </span>
                                          </div>
                                          <div className="shrink-0">
                                            {getStatusBadge(app.status)}
                                          </div>
                                        </div>

                                        {/* Details Row: Passport, DOB, Profile */}
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[11px] text-slate-400 font-medium">Passport:</span>
                                            <span
                                              className={`font-semibold ${
                                                passportNo === "To be verified from scan"
                                                  ? "text-slate-400 italic text-[11px]"
                                                  : "font-mono text-slate-800"
                                              }`}
                                            >
                                              {passportNo}
                                            </span>
                                          </div>

                                          {dob !== "N/A" && (
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-[11px] text-slate-400 font-medium">DOB:</span>
                                              <span className="font-semibold text-slate-700">{dob}</span>
                                            </div>
                                          )}

                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[11px] text-slate-400 font-medium">Profile:</span>
                                            <span className="font-medium text-slate-700 capitalize">
                                              {trav.gender || "Male"} • {trav.nationality || "Indian"}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Read-Only Documents Status & View */}
                                        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                                          {/* Passport Scan */}
                                          {getDocumentUrl(docs.passportScan) ? (
                                            <a
                                              href={getDocumentUrl(docs.passportScan)}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
                                              title="View passport document scan"
                                            >
                                              <FileText size={13} className="text-teal-600" />
                                              <span>Passport Bio Page</span>
                                              <ExternalLink size={11} className="text-slate-400 ml-0.5" />
                                            </a>
                                          ) : (
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-400 text-xs">
                                              <FileText size={13} />
                                              <span>Passport Scan: Pending</span>
                                            </div>
                                          )}

                                          {/* Photo */}
                                          {getDocumentUrl(docs.photo) ? (
                                            <a
                                              href={getDocumentUrl(docs.photo)}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
                                              title="View traveler passport photograph"
                                            >
                                              <Camera size={13} className="text-teal-600" />
                                              <span>Photo</span>
                                              <ExternalLink size={11} className="text-slate-400 ml-0.5" />
                                            </a>
                                          ) : (
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-400 text-xs">
                                              <Camera size={13} />
                                              <span>Photo: Pending</span>
                                            </div>
                                          )}

                                          {/* Official Visa Link (if available) */}
                                          {getDocumentUrl(app.issuedVisaUrl) && (
                                            <a
                                              href={getDocumentUrl(app.issuedVisaUrl)}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition ml-auto"
                                              title="Download approved e-visa document"
                                            >
                                              <CheckCircle2 size={13} className="text-emerald-600" />
                                              <span>Download Visa</span>
                                              <ExternalLink size={11} />
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500">
                                  {group.totalApplicants} applicant(s) registered under this visa application batch.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })()}

            {/* TAB CONTENT 2: FLIGHT BOOKINGS */}
            {activeTab === "flight" && (() => {
              const filteredFlights = flightBookings.filter((bkg) => {
                if (flightFilter === "all") return true;
                const s = (bkg.status || "").toLowerCase();
                const isConf = s === "confirmed" || s === "ticketed" || isPaymentConfirmed(bkg);
                if (flightFilter === "confirmed") return isConf;
                if (flightFilter === "pending")
                  return !isConf && (s === "pending" || s === "initiated" || s === "awaiting_payment");
                if (flightFilter === "cancelled") return s === "cancelled";
                return true;
              });

              return (
                <div className="space-y-4">
                  {/* Status Filter Bar */}
                  <div className="flex items-center justify-between flex-wrap gap-3 pb-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      {[
                        { id: "all", label: "All Flights", count: flightBookings.length },
                        {
                          id: "confirmed",
                          label: "Confirmed / Ticketed",
                          count: flightBookings.filter((b) =>
                            ["confirmed", "ticketed"].includes((b.status || "").toLowerCase()) || isPaymentConfirmed(b)
                          ).length,
                        },
                        {
                          id: "pending",
                          label: "Pending Payment",
                          count: flightBookings.filter((b) =>
                            !isPaymentConfirmed(b) &&
                            ["pending", "initiated", "awaiting_payment"].includes(
                              (b.status || "").toLowerCase()
                            )
                          ).length,
                        },
                        {
                          id: "cancelled",
                          label: "Cancelled",
                          count: flightBookings.filter(
                            (b) => (b.status || "").toLowerCase() === "cancelled"
                          ).length,
                        },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFlightFilter(f.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            flightFilter === f.id
                              ? "bg-slate-900 text-white shadow-xs"
                              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                          }`}
                        >
                          <span>{f.label}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                              flightFilter === f.id
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {f.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    <Link
                      to="/"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 transition"
                    >
                      <Plus size={14} />
                      <span>Book New Flight</span>
                    </Link>
                  </div>

                  {isLoadingHotels ? (
                    <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                      <Clock size={28} className="animate-spin text-teal-600 mx-auto" />
                      <p className="text-xs sm:text-sm font-bold text-slate-600">
                        Loading your flight bookings...
                      </p>
                    </div>
                  ) : flightBookings.length === 0 ? (
                    <div className="rounded-3xl bg-white border border-slate-200 p-8 sm:p-12 text-center shadow-xs space-y-4">
                      <div className="w-16 h-16 rounded-3xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                        <Plane size={32} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                          No Flight Bookings Found
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                          You have not made any flight bookings yet. Search and book flights to domestic and international destinations.
                        </p>
                      </div>
                      <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-md transition"
                      >
                        <Plus size={16} />
                        <span>Search Flights</span>
                      </Link>
                    </div>
                  ) : filteredFlights.length === 0 ? (
                    <div className="rounded-3xl bg-white border border-slate-200 p-8 sm:p-10 text-center shadow-xs space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                        <Plane size={26} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base sm:text-lg font-extrabold text-slate-900">
                          {flightFilter === "cancelled"
                            ? "No Cancelled Flight Bookings"
                            : flightFilter === "pending"
                            ? "No Pending Flight Bookings"
                            : "No Confirmed Flight Bookings"}
                        </h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          {flightFilter === "cancelled"
                            ? "You do not have any cancelled flight bookings in your record."
                            : flightFilter === "pending"
                            ? "No flight bookings are awaiting payment or processing."
                            : "No flight tickets have been confirmed under this filter."}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setFlightFilter("all")}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer shadow-xs"
                        >
                          View All Flights
                        </button>
                        <Link
                          to="/"
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition shadow-xs"
                        >
                          <Plus size={14} />
                          <span>Book New Flight</span>
                        </Link>
                        <Link
                          to="/flight"
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                        >
                          <span>Explore Deals</span>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    filteredFlights.map((bkg) => {
                      const id = bkg._id || bkg.id || bkg.bookingId;
                      const isExpanded = expandedFlightId === id;
                      const pnr = bkg.pnr || bkg.airlinePnr || bkg.srdvPnr || bkg.providerBookingId;
                      const status = (bkg.status || "confirmed").toLowerCase();
                      const isConfirmed = isPaymentConfirmed(bkg);
                      const isPending = !isConfirmed && ["pending", "initiated", "awaiting_payment"].includes(status);
                      const totalAmount = bkg.totalPrice || bkg.totalAmount || bkg.amount || 0;
                      const airlineName =
                        bkg.airline ||
                        bkg.airlineName ||
                        bkg.segments?.[0]?.Airline?.AirlineName ||
                        "Commercial Flight";
                      const flightNo =
                        bkg.flightNumber ||
                        bkg.segments?.[0]?.Airline?.FlightNumber ||
                        "";
                      const origin =
                        bkg.origin ||
                        bkg.segments?.[0]?.Origin?.AirportCode ||
                        "DEL";
                      const destination =
                        bkg.destination ||
                        bkg.segments?.[bkg.segments.length - 1]?.Destination?.AirportCode ||
                        "BOM";
                      const passengers = Array.isArray(bkg.passengers) ? bkg.passengers : [];
                      const leadPax =
                        passengers.find((p) => p.isLeadPax || p.isLead) || passengers[0];
                      const leadPaxName = leadPax
                        ? `${leadPax.title || leadPax.Title || ""} ${leadPax.firstName || leadPax.FirstName || ""} ${leadPax.lastName || leadPax.LastName || ""}`.trim()
                        : "Lead Passenger";

                      return (
                        <div
                          key={id}
                          className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden transition hover:border-teal-300"
                        >
                          <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-lg shadow-2xs shrink-0">
                                <Plane size={24} />
                              </div>

                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                                    {origin} → {destination}
                                  </h3>
                                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {airlineName} {flightNo ? `(${flightNo})` : ""}
                                  </span>
                                  {pnr && (
                                    <span className="text-xs font-mono font-black text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                                      PNR: {pnr}
                                    </span>
                                  )}
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    bkg.bookingSource === "SRDV_LIVE"
                                      ? "bg-sky-50 text-sky-700 border-sky-200"
                                      : "bg-purple-50 text-purple-700 border-purple-200"
                                  }`}>
                                    {bkg.sourceLabel || (bkg.isOffer ? "In-House Offer" : bkg.isMaster ? "In-House Inventory" : "Live Supplier")}
                                  </span>
                                  {getStatusBadge(isConfirmed ? "confirmed" : status)}
                                </div>

                                <p className="text-xs text-slate-400 font-mono">
                                  Booking #{id} • {leadPaxName} • {passengers.length || 1} Traveller(s)
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between lg:justify-end gap-4 sm:gap-6 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                              <div className="text-left lg:text-right">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                  Total Fare
                                </span>
                                <span className="text-lg sm:text-xl font-black text-slate-900">
                                  ₹{Number(totalAmount).toLocaleString("en-IN")}
                                </span>
                              </div>

                              {isConfirmed ? (
                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenETicket(bkg, bkg.isOffer || bkg.bookingType === "offer" ? "INHOUSE_OFFER_FLIGHT" : "LIVE_FLIGHT")}
                                    className="flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95"
                                    title="View verified carrier e-ticket & boarding pass"
                                  >
                                    <Plane size={14} />
                                    <span>View E-Ticket</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        const bId = bkg._id || bkg.id;
                                        const sType = bkg.isOffer || bkg.bookingType === "offer" ? "INHOUSE_OFFER_FLIGHT" : "LIVE_FLIGHT";
                                        let ticket;
                                        if (sType === "INHOUSE_OFFER_FLIGHT") {
                                          ticket = await eticketService.getOfferFlightETicket(bId, bkg);
                                        } else {
                                          ticket = await eticketService.getLiveFlightETicket(bId, bkg);
                                        }
                                        const tPnr = ticket.pnr || ticket.customerPnr || bkg.pnr || "TICKET";
                                        eticketService.downloadETicketDocument(ticket, `ETicket-${tPnr}.html`);
                                        toast.success("E-Ticket document downloaded successfully!");
                                      } catch (err) {
                                        toast.error(err?.message || "Failed to download e-ticket");
                                      }
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs bg-teal-800 hover:bg-teal-900 text-white active:scale-95"
                                    title="Download official carrier E-Ticket HTML document"
                                  >
                                    <Download size={14} />
                                    <span className="hidden sm:inline">Download E-Ticket</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDownloadInvoice({
                                        vertical: "flight",
                                        bookingId: id,
                                        bookingTitle: `${origin} → ${destination}`,
                                      })
                                    }
                                    disabled={downloadingInvoiceId === id}
                                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs active:scale-95 ${
                                      downloadedInvoiceId === id
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                                        : "bg-teal-700 hover:bg-teal-800 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                    }`}
                                    title="Download official airline tax invoice"
                                  >
                                    {downloadingInvoiceId === id ? (
                                      <>
                                        <Loader2 size={14} className="animate-spin text-white shrink-0" />
                                        <span className="hidden sm:inline">Generating Invoice...</span>
                                        <span className="sm:hidden">Invoice...</span>
                                      </>
                                    ) : downloadedInvoiceId === id ? (
                                      <>
                                        <Check size={14} className="text-emerald-700 shrink-0" />
                                        <span>Downloaded</span>
                                      </>
                                    ) : (
                                      <>
                                        <FileText size={14} className="shrink-0" />
                                        <span>Download Invoice</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold">
                                  <Clock size={13} />
                                  <span>Ticket Locked (Payment Pending)</span>
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => setExpandedFlightId(isExpanded ? null : id)}
                                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs ${
                                  isExpanded
                                    ? "bg-slate-900 text-white"
                                    : "bg-teal-50 text-teal-800 hover:bg-teal-100"
                                }`}
                              >
                                <span>{isExpanded ? "Hide" : "Details"}</span>
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </div>
                          </div>

                          {/* Collapsible Flight Details */}
                          {isExpanded && (
                            <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50/50 space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-200">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                    Airline & Flight
                                  </span>
                                  <p className="font-extrabold text-sm text-slate-900">
                                    {airlineName} {flightNo}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                    Sector / Route
                                  </span>
                                  <p className="font-extrabold text-sm text-slate-900">
                                    {origin} → {destination}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                    E-Ticket Numbers
                                  </span>
                                  <p className="font-mono text-xs font-bold text-teal-800">
                                    {bkg.ticketNumber || bkg.eTicketNumber || (isConfirmed ? "Issued by Carrier" : "Pending Payment")}
                                  </p>
                                </div>
                              </div>

                              {passengers.length > 0 && (
                                <div className="space-y-1.5">
                                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Users size={14} className="text-teal-600" />
                                    <span>Passenger Details ({passengers.length})</span>
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {passengers.map((pax, idx) => {
                                      const pName = `${pax.title || pax.Title || ""} ${pax.firstName || pax.FirstName || ""} ${pax.lastName || pax.LastName || ""}`.trim();
                                      const tNo = pax.ticketNumber || pax.TicketNumber || "";
                                      return (
                                        <div
                                          key={idx}
                                          className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                                        >
                                          <div>
                                            <p className="font-bold text-slate-900">{pName || `Passenger ${idx + 1}`}</p>
                                            <p className="text-[11px] text-slate-400">{pax.passengerType || "Adult"}</p>
                                          </div>
                                          {tNo && (
                                            <span className="font-mono text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                                              Tkt: {tNo}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Action Footer */}
                              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                                {isPending && (
                                  <button
                                    type="button"
                                    onClick={() => handlePayHeldBooking(bkg, "flight")}
                                    className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                                  >
                                    <CreditCard size={14} />
                                    <span>Complete PayPal Payment</span>
                                  </button>
                                )}

                                {isConfirmed && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDownloadInvoice({
                                          vertical: "flight",
                                          bookingId: id,
                                          bookingTitle: `${origin} → ${destination}`,
                                        })
                                      }
                                      disabled={downloadingInvoiceId === id}
                                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer ${
                                        downloadedInvoiceId === id
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                                          : "bg-teal-700 hover:bg-teal-800 text-white"
                                      }`}
                                    >
                                      {downloadingInvoiceId === id ? (
                                        <>
                                          <Loader2 size={14} className="animate-spin text-white" />
                                          <span>Generating Invoice...</span>
                                        </>
                                      ) : downloadedInvoiceId === id ? (
                                        <>
                                          <Check size={14} className="text-emerald-700" />
                                          <span>Invoice Downloaded</span>
                                        </>
                                      ) : (
                                        <>
                                          <FileText size={14} />
                                          <span>Download Tax Invoice</span>
                                        </>
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCancellingItem(bkg);
                                        setCancellingType("flight");
                                        setCancelModalOpen(true);
                                      }}
                                      className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1"
                                    >
                                      <XCircle size={14} />
                                      <span>Cancel Flight Booking</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })()}

            {/* TAB CONTENT 3: HOTEL BOOKINGS */}
            {activeTab === "hotel" && (() => {
              const isHotelBookingConfirmed = (b) => {
                const s = String(b.status || b.rawStatus || "").toLowerCase();
                return (
                  isPaymentConfirmed(b) ||
                  s === "confirmed" ||
                  s === "completed" ||
                  s === "paid" ||
                  s === "payment_received" ||
                  Boolean(b.paymentId) ||
                  Boolean(b.providerBookingId || b.bookingRefNo || b.confirmationNo)
                );
              };

              const filteredHotels = hotelBookings.filter((bkg) => {
                if (hotelFilter === "all") return true;
                const isConfirmed = isHotelBookingConfirmed(bkg);
                if (hotelFilter === "confirmed") return isConfirmed;
                const s = (bkg.status || "").toLowerCase();
                if (hotelFilter === "pending")
                  return !isConfirmed && ["pending", "awaiting_payment", "initiated"].includes(s);
                if (hotelFilter === "cancelled") return s === "cancelled";
                return true;
              });

              return (
                <div className="space-y-4">
                  {/* Status Filter Bar */}
                  <div className="flex items-center justify-between flex-wrap gap-3 pb-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      {[
                        { id: "all", label: "All Hotels", count: hotelBookings.length },
                        {
                          id: "confirmed",
                          label: "Confirmed",
                          count: hotelBookings.filter(isHotelBookingConfirmed).length,
                        },
                        {
                          id: "pending",
                          label: "Awaiting Payment",
                          count: hotelBookings.filter((b) =>
                            !isHotelBookingConfirmed(b) && ["pending", "awaiting_payment", "initiated"].includes(
                              (b.status || "").toLowerCase()
                            )
                          ).length,
                        },
                        {
                          id: "cancelled",
                          label: "Cancelled",
                          count: hotelBookings.filter(
                            (b) => (b.status || "").toLowerCase() === "cancelled"
                          ).length,
                        },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setHotelFilter(f.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            hotelFilter === f.id
                              ? "bg-slate-900 text-white shadow-xs"
                              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                          }`}
                        >
                          <span>{f.label}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                              hotelFilter === f.id
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {f.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    <Link
                      to="/hotel"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 transition"
                    >
                      <Plus size={14} />
                      <span>Search Hotels</span>
                    </Link>
                  </div>

                  {isLoadingHotels ? (
                    <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                      <Clock size={28} className="animate-spin text-teal-600 mx-auto" />
                      <p className="text-xs sm:text-sm font-bold text-slate-600">
                        Loading your hotel reservations...
                      </p>
                    </div>
                  ) : hotelBookings.length === 0 ? (
                    <div className="rounded-3xl bg-white border border-slate-200 p-8 sm:p-12 text-center shadow-xs space-y-4">
                      <div className="w-16 h-16 rounded-3xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
                        <Hotel size={32} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                          No Hotel Bookings Found
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                          You have not made any hotel reservations yet. Browse top-rated hotels and suites in Makkah, Madinah, and international destinations.
                        </p>
                      </div>
                      <Link
                        to="/hotel"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-emerald-600 hover:from-orange-600 hover:to-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md transition"
                      >
                        <Plus size={16} />
                        <span>Search Hotels</span>
                      </Link>
                    </div>
                  ) : filteredHotels.length === 0 ? (
                    <div className="rounded-3xl bg-white border border-slate-200 p-8 sm:p-10 text-center shadow-xs space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
                        <Hotel size={26} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base sm:text-lg font-extrabold text-slate-900">
                          {hotelFilter === "cancelled"
                            ? "No Cancelled Hotel Reservations"
                            : hotelFilter === "pending"
                            ? "No Pending Hotel Reservations"
                            : "No Confirmed Hotel Reservations"}
                        </h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          {hotelFilter === "cancelled"
                            ? "You have no cancelled hotel reservations on file."
                            : hotelFilter === "pending"
                            ? "No hotel stays are currently awaiting confirmation or payment."
                            : "No confirmed hotel bookings found under this filter."}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setHotelFilter("all")}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer shadow-xs"
                        >
                          View All Hotels
                        </button>
                        <Link
                          to="/hotel"
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-emerald-600 hover:from-orange-600 hover:to-emerald-700 text-white transition shadow-xs"
                        >
                          <Plus size={14} />
                          <span>Search Hotels</span>
                        </Link>
                        <Link
                          to="/hotel-page"
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                        >
                          <span>Browse Offers</span>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    filteredHotels.map((bkg) => {
                      const id = bkg._id || bkg.id || bkg.bookingId;
                      const isExpanded = expandedHotelId === id;
                      const isConfirmed = isHotelBookingConfirmed(bkg);
                      const status = isConfirmed ? "confirmed" : (bkg.status || "confirmed").toLowerCase();
                      const isPending = !isConfirmed && ["pending", "awaiting_payment", "initiated"].includes(status);
                      const totalAmount = bkg.totalPrice || bkg.totalAmount || bkg.amount || 0;
                      const voucherRef = bkg.voucherRef || bkg.providerBookingId || bkg.bookingRefNo || bkg.voucherCode || bkg.confirmationNo;
                      const hotelName = bkg.hotelName || bkg.hotelSnapshot?.name || bkg.hotel?.name || "Hotel Reservation";
                      const roomName = bkg.roomName || bkg.roomSnapshots?.[0]?.roomName || bkg.roomSnapshots?.[0]?.name || bkg.rooms?.[0]?.name || "Standard Room";
                      const checkIn = bkg.checkIn ? new Date(bkg.checkIn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Check-in";
                      const checkOut = bkg.checkOut ? new Date(bkg.checkOut).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Check-out";
                      const guests = Array.isArray(bkg.guests) ? bkg.guests : [];
                      const leadGuest = guests[0] || {};
                      const leadName = `${leadGuest.title || ""} ${leadGuest.firstName || ""} ${leadGuest.lastName || ""}`.trim() || "Lead Guest";

                      return (
                        <div
                          key={id}
                          className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden transition hover:border-orange-300"
                        >
                          <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-lg shadow-2xs shrink-0">
                                <Hotel size={24} />
                              </div>

                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                                    {hotelName}
                                  </h3>
                                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {roomName}
                                  </span>
                                  {voucherRef && (
                                    <span className="text-xs font-mono font-black text-orange-800 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                                      Ref: {voucherRef}
                                    </span>
                                  )}
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    bkg.bookingSource === "SRDV_LIVE"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-purple-50 text-purple-700 border-purple-200"
                                  }`}>
                                    {bkg.sourceLabel || (bkg.isOffer ? "In-House Offer" : bkg.isMaster ? "In-House Inventory" : "Live Supplier")}
                                  </span>
                                  {getStatusBadge(status)}
                                </div>

                                <p className="text-xs text-slate-400 font-mono">
                                  Booking #{id} • {checkIn} to {checkOut} • {leadName} • {guests.length || 1} Guest(s)
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between lg:justify-end gap-4 sm:gap-6 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                              <div className="text-left lg:text-right">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                  Total Rate
                                </span>
                                <span className="text-lg sm:text-xl font-black text-slate-900">
                                  ₹{Number(totalAmount).toLocaleString("en-IN")}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                {isConfirmed ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadHotelInvoice(bkg)}
                                    disabled={downloadingInvoiceId === id}
                                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs active:scale-95 ${
                                      downloadedInvoiceId === id
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                                        : "bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                    }`}
                                    title="Download official hotel tax invoice"
                                  >
                                    {downloadingInvoiceId === id ? (
                                      <>
                                        <Loader2 size={15} className="animate-spin text-white shrink-0" />
                                        <span>Generating Invoice...</span>
                                      </>
                                    ) : downloadedInvoiceId === id ? (
                                      <>
                                        <Check size={15} className="text-emerald-700 shrink-0" />
                                        <span>Invoice Downloaded</span>
                                      </>
                                    ) : (
                                      <>
                                        <FileText size={15} className="shrink-0" />
                                        <span>Download Invoice</span>
                                      </>
                                    )}
                                  </button>
                                ) : isPending ? (
                                  <button
                                    type="button"
                                    onClick={() => handlePayHeldBooking(bkg, "hotel")}
                                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition cursor-pointer active:scale-95"
                                  >
                                    <CreditCard size={14} />
                                    <span>Pay Now</span>
                                  </button>
                                ) : null}

                                <button
                                  type="button"
                                  onClick={() => setExpandedHotelId(isExpanded ? null : id)}
                                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs ${
                                    isExpanded
                                      ? "bg-slate-900 text-white"
                                      : "bg-orange-50 text-orange-800 hover:bg-orange-100"
                                  }`}
                                >
                                  <span>{isExpanded ? "Hide" : "Details"}</span>
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Collapsible Hotel Details */}
                          {isExpanded && (
                            <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50/50 space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-200">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                    Hotel & Destination
                                  </span>
                                  <p className="font-extrabold text-sm text-slate-900">
                                    {hotelName}
                                  </p>
                                  <p className="text-xs text-slate-500">{bkg.destination || "Confirmed Property"}</p>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                    Dates & Duration
                                  </span>
                                  <p className="font-extrabold text-sm text-slate-900">
                                    {checkIn} → {checkOut}
                                  </p>
                                  <p className="text-xs text-slate-500">Room: {roomName}</p>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                    Reservation Code / Voucher
                                  </span>
                                  <p className="font-mono text-xs font-bold text-orange-800">
                                    {voucherRef || (isConfirmed ? "Confirmed by Property" : "Pending Payment")}
                                  </p>
                                  <p className="text-[11px] text-slate-500">Status: {isConfirmed ? "Confirmed & Guaranteed" : "Awaiting Payment"}</p>
                                </div>
                              </div>

                              {guests.length > 0 && (
                                <div className="space-y-1.5">
                                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Users size={14} className="text-orange-600" />
                                    <span>Guest Details ({guests.length})</span>
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {guests.map((g, idx) => {
                                      const gName = `${g.title || ""} ${g.firstName || ""} ${g.lastName || ""}`.trim();
                                      return (
                                        <div
                                          key={idx}
                                          className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                                        >
                                          <div>
                                            <p className="font-bold text-slate-900">{gName || `Guest ${idx + 1}`}</p>
                                            <p className="text-[11px] text-slate-400">{g.type || g.passengerType || (idx === 0 ? "Lead Guest" : "Guest")}</p>
                                          </div>
                                          {g.age && (
                                            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                              Age: {g.age}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Action Footer */}
                              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                                {isPending && (
                                  <button
                                    type="button"
                                    onClick={() => handlePayHeldBooking(bkg, "hotel")}
                                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                                  >
                                    <CreditCard size={14} />
                                    <span>Complete PayPal Payment</span>
                                  </button>
                                )}

                                {isConfirmed && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadHotelInvoice(bkg)}
                                      disabled={downloadingInvoiceId === id}
                                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer ${
                                        downloadedInvoiceId === id
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                                          : "bg-orange-600 hover:bg-orange-700 text-white"
                                      }`}
                                    >
                                      {downloadingInvoiceId === id ? (
                                        <>
                                          <Loader2 size={14} className="animate-spin text-white" />
                                          <span>Generating Invoice...</span>
                                        </>
                                      ) : downloadedInvoiceId === id ? (
                                        <>
                                          <Check size={14} className="text-emerald-700" />
                                          <span>Invoice Downloaded</span>
                                        </>
                                      ) : (
                                        <>
                                          <FileText size={14} />
                                          <span>Download Tax Invoice</span>
                                        </>
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCancellingItem(bkg);
                                        setCancellingType("hotel");
                                        setCancelModalOpen(true);
                                      }}
                                      className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                    >
                                      <XCircle size={14} />
                                      <span>Cancel Hotel Reservation</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })()}

            {/* TAB CONTENT 4: PACKAGE BOOKINGS */}
            {activeTab === "package" && (() => {
              const filteredPackages = packageBookings.filter((bkg) => {
                if (packageFilter === "all") return true;
                const s = (bkg.status || "").toLowerCase();
                if (packageFilter === "confirmed") return s === "confirmed";
                if (packageFilter === "pending")
                  return s === "pending" || s === "initiated";
                if (packageFilter === "cancelled") return s === "cancelled";
                return true;
              });

              return (
                <div className="space-y-4">
                  {/* Status Filter Bar */}
                  <div className="flex items-center justify-between flex-wrap gap-3 pb-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      {[
                        { id: "all", label: "All Bookings", count: packageBookings.length },
                        {
                          id: "confirmed",
                          label: "Confirmed",
                          count: packageBookings.filter(
                            (b) => (b.status || "").toLowerCase() === "confirmed"
                          ).length,
                        },
                        {
                          id: "pending",
                          label: "Pending Payment",
                          count: packageBookings.filter((b) =>
                            ["pending", "initiated"].includes((b.status || "").toLowerCase())
                          ).length,
                        },
                        {
                          id: "cancelled",
                          label: "Cancelled",
                          count: packageBookings.filter(
                            (b) => (b.status || "").toLowerCase() === "cancelled"
                          ).length,
                        },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setPackageFilter(f.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            packageFilter === f.id
                              ? "bg-slate-900 text-white shadow-xs"
                              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                          }`}
                        >
                          <span>{f.label}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                              packageFilter === f.id
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {f.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    <Link
                      to="/package-page"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 transition"
                    >
                      <Plus size={14} />
                      <span>Browse Packages Catalog</span>
                    </Link>
                  </div>

                  {/* Loading state */}
                  {isLoadingPackages ? (
                    <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                      <Clock size={28} className="animate-spin text-teal-600 mx-auto" />
                      <p className="text-xs sm:text-sm font-bold text-slate-600">
                        Loading your package reservations...
                      </p>
                    </div>
                  ) : packageBookings.length === 0 ? (
                    /* Empty state when no bookings at all */
                    <div className="rounded-3xl bg-white border border-slate-200 p-8 sm:p-12 text-center shadow-xs space-y-4">
                      <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                        <Package size={32} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                          No Package Bookings Found
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                          You have not booked any customized travel packages yet. Explore our curated Umrah, Hajj & international holiday packages with swappable flights, luxury hotels, and local tours.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                        <Link
                          to="/package-page"
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-md transition cursor-pointer"
                        >
                          <Plus size={16} />
                          <span>Browse Packages Catalog</span>
                        </Link>
                        <Link
                          to="/ai-package-generator"
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-teal-200 text-teal-700 hover:bg-teal-50 text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
                        >
                          <Sparkles size={16} />
                          <span>AI Tour Planner</span>
                        </Link>
                      </div>
                    </div>
                  ) : filteredPackages.length === 0 ? (
                    <div className="rounded-3xl bg-white border border-slate-200 p-8 sm:p-10 text-center shadow-xs space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                        <Package size={26} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base sm:text-lg font-extrabold text-slate-900">
                          {packageFilter === "cancelled"
                            ? "No Cancelled Travel Packages"
                            : packageFilter === "pending"
                            ? "No Pending Package Bookings"
                            : "No Confirmed Travel Packages"}
                        </h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          {packageFilter === "cancelled"
                            ? "You have no cancelled packages in your order history."
                            : packageFilter === "pending"
                            ? "All your customized packages are confirmed or completed."
                            : "No confirmed package reservations found under this filter."}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setPackageFilter("all")}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer shadow-xs"
                        >
                          View All Packages
                        </button>
                        <Link
                          to="/package-page"
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition shadow-xs"
                        >
                          <Plus size={14} />
                          <span>Browse Packages</span>
                        </Link>
                        <Link
                          to="/ai-package-generator"
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border border-teal-200 text-teal-700 hover:bg-teal-50 transition"
                        >
                          <Sparkles size={14} />
                          <span>Custom Trip Planner</span>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    filteredPackages.map((bkg) => {
                      const isExpanded = expandedPackageId === (bkg._id || bkg.id);
                      const pkgId =
                        bkg.packageId?._id || bkg.packageId || bkg.packageSnapshot?._id;
                      const pkgTitle =
                        bkg.packageId?.title ||
                        bkg.packageSnapshot?.title ||
                        "Custom Travel Package";
                      const pkgDestination =
                        bkg.packageId?.destination ||
                        bkg.packageSnapshot?.destination ||
                        "International";
                      const createdDate = bkg.createdAt
                        ? new Date(bkg.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Recent";
                      const totalAmount = bkg.totalAmount || bkg.totalPrice || 0;
                      const status = (bkg.status || "initiated").toLowerCase();
                      const travellers = Array.isArray(bkg.travellers)
                        ? bkg.travellers
                        : [];
                      const leadTraveller =
                        travellers.find((t) => t.isLead) || travellers[0];

                      // Bundled components
                      const bundledFlight =
                        bkg.packageSnapshot?.bundledFlight ||
                        bkg.customSelections?.selectedFlightDetails ||
                        (bkg.claimedFlightUnits?.[0]?.flightDetails) ||
                        {};
                      const bundledHotel =
                        bkg.packageSnapshot?.bundledHotel ||
                        bkg.customSelections?.selectedHotelDetails ||
                        (bkg.claimedHotelUnits?.[0]?.hotelDetails) ||
                        {};

                      return (
                        <div
                          key={bkg._id || bkg.id}
                          className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden transition hover:border-teal-300"
                        >
                          {/* Card Header */}
                          <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                                <Package size={24} />
                              </div>

                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                                    {pkgTitle}
                                  </h3>
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                                    <MapPin size={11} />
                                    {pkgDestination}
                                  </span>
                                  {getStatusBadge(status)}
                                </div>

                                <p className="text-xs text-slate-400 font-mono">
                                  Booking ID: #{bkg._id || bkg.id} • Reserved on {createdDate}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between lg:justify-end gap-4 sm:gap-6 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                              <div className="text-left lg:text-right">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                  Locked Amount
                                </span>
                                <span className="text-lg sm:text-xl font-black text-slate-900">
                                  ₹{totalAmount.toLocaleString("en-IN")}
                                </span>
                                <span className="text-[11px] text-slate-500 block font-medium">
                                  {bkg.quantity || 1} Unit(s) • {travellers.length || bkg.quantity || 1} Guests
                                </span>
                              </div>

                              {((bkg.status || "").toLowerCase() === "confirmed" ||
                                (bkg.paymentStatus || "").toLowerCase() === "completed" ||
                                (bkg.paymentStatus || "").toLowerCase() === "paid") &&
                                (bundledFlight.airline || bkg.claimedFlightUnits?.length > 0) && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenETicket(bkg, "INHOUSE_PACKAGE_FLIGHT")}
                                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95"
                                  title="View confirmed flight e-ticket & boarding pass"
                                >
                                  <Plane size={14} />
                                  <span>Flight E-Ticket</span>
                                </button>
                              )}

                              {((bkg.status || "").toLowerCase() === "confirmed" ||
                                (bkg.paymentStatus || "").toLowerCase() === "completed" ||
                                (bkg.paymentStatus || "").toLowerCase() === "paid") && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDownloadInvoice({
                                      vertical: "package",
                                      bookingId: bkg._id || bkg.id,
                                      bookingTitle: pkgTitle,
                                    })
                                  }
                                  disabled={downloadingInvoiceId === (bkg._id || bkg.id)}
                                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs active:scale-95 ${
                                    downloadedInvoiceId === (bkg._id || bkg.id)
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                                      : "bg-teal-700 hover:bg-teal-800 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                  }`}
                                  title="Download official tour package tax invoice"
                                >
                                  {downloadingInvoiceId === (bkg._id || bkg.id) ? (
                                    <>
                                      <Loader2 size={14} className="animate-spin text-white shrink-0" />
                                      <span className="hidden sm:inline">Generating Invoice...</span>
                                      <span className="sm:hidden">Invoice...</span>
                                    </>
                                  ) : downloadedInvoiceId === (bkg._id || bkg.id) ? (
                                    <>
                                      <Check size={14} className="text-emerald-700 shrink-0" />
                                      <span>Downloaded</span>
                                    </>
                                  ) : (
                                    <>
                                      <FileText size={14} className="shrink-0" />
                                      <span>Download Invoice</span>
                                    </>
                                  )}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedPackageId(
                                    isExpanded ? null : bkg._id || bkg.id
                                  )
                                }
                                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs ${
                                  isExpanded
                                    ? "bg-slate-900 text-white"
                                    : "bg-teal-50 text-teal-800 hover:bg-teal-100"
                                }`}
                              >
                                <span>
                                  {isExpanded
                                    ? "Hide Details"
                                    : "View Itinerary & Travellers"}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp size={14} />
                                ) : (
                                  <ChevronDown size={14} />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Quick Component Tags Strip */}
                          <div className="px-5 sm:px-6 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center gap-4 sm:gap-6 flex-wrap text-xs text-slate-600 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Plane size={14} className="text-teal-600" />
                              <span>
                                {bundledFlight.airline
                                  ? `${bundledFlight.airline} (${bundledFlight.flightNumber || "Direct"})`
                                  : "Flight Component Included"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Hotel size={14} className="text-teal-600" />
                              <span>
                                {bundledHotel.hotelName ||
                                  "Hotel Accommodation Included"}
                              </span>
                            </div>

                            {bkg.guideSelected && (
                              <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                                <ShieldCheck size={14} />
                                <span>Private Tour Guide</span>
                              </div>
                            )}

                            {leadTraveller && (
                              <div className="flex items-center gap-1.5 ml-auto text-slate-500 text-[11px]">
                                <User size={13} />
                                <span>
                                  Lead: {leadTraveller.firstName}{" "}
                                  {leadTraveller.lastName}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Expandable Full Breakdown Details */}
                          {isExpanded && (
                            <div className="p-5 sm:p-6 border-t border-slate-100 bg-white space-y-6 animate-in fade-in duration-200">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Flight Card */}
                                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                                  <div className="flex items-center gap-2 text-teal-700 font-bold text-xs uppercase tracking-wider">
                                    <Plane size={15} />
                                    <span>Bundled Flight Reservation</span>
                                  </div>
                                  <h4 className="font-extrabold text-sm text-slate-900">
                                    {bundledFlight.airline || "Scheduled Flight"}{" "}
                                    {bundledFlight.flightNumber
                                      ? `(${bundledFlight.flightNumber})`
                                      : ""}
                                  </h4>
                                  <p className="text-xs text-slate-500">
                                    Route: {bundledFlight.origin || "Origin"} →{" "}
                                    {bundledFlight.destination || pkgDestination}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Cabin Class:{" "}
                                    {bundledFlight.cabinClass || "Economy Class"}
                                  </p>
                                </div>

                                {/* Hotel Card */}
                                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                                  <div className="flex items-center gap-2 text-teal-700 font-bold text-xs uppercase tracking-wider">
                                    <Hotel size={15} />
                                    <span>Hotel Accommodation</span>
                                  </div>
                                  <h4 className="font-extrabold text-sm text-slate-900">
                                    {bundledHotel.hotelName ||
                                      "Standard Included Hotel"}
                                  </h4>
                                  <p className="text-xs text-slate-500">
                                    Room Type:{" "}
                                    {bundledHotel.roomType ||
                                      bkg.customSelections?.roomType ||
                                      "Standard Room"}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Destination:{" "}
                                    {bundledHotel.destination || pkgDestination}
                                  </p>
                                </div>
                              </div>

                              {/* Travellers List */}
                              {travellers.length > 0 && (
                                <div className="space-y-2">
                                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Users size={14} className="text-teal-600" />
                                    <span>
                                      Registered Travellers ({travellers.length})
                                    </span>
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                    {travellers.map((trav, idx) => (
                                      <div
                                        key={idx}
                                        className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2"
                                      >
                                        <div className="min-w-0">
                                          <p className="text-xs font-bold text-slate-900 truncate">
                                            {trav.title ? `${trav.title} ` : ""}
                                            {trav.firstName} {trav.lastName}
                                          </p>
                                          <p className="text-[11px] text-slate-400 truncate">
                                            {trav.email ||
                                              trav.phone ||
                                              `Guest #${idx + 1}`}
                                          </p>
                                        </div>
                                        {trav.isLead && (
                                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-teal-100 text-teal-800 shrink-0">
                                            Lead
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Action Footer */}
                              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                                {pkgId && (
                                  <Link
                                    to={`/package-detail/${pkgId}`}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-teal-700 transition"
                                  >
                                    <ExternalLink size={13} />
                                    <span>View Original Package Itinerary</span>
                                  </Link>
                                )}

                                <div className="flex items-center gap-2.5 ml-auto">
                                  {/* If status is initiated or pending: allow PayPal payment & Cancellation */}
                                  {(status === "initiated" ||
                                    status === "pending") && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handlePayPackage(bkg)}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white text-xs font-bold shadow-sm hover:shadow transition cursor-pointer"
                                      >
                                        <CreditCard size={14} />
                                        <span>Complete PayPal Payment</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCancellingPackage(bkg);
                                          setCancelPackageModalOpen(true);
                                        }}
                                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold transition cursor-pointer"
                                      >
                                        <XCircle size={14} />
                                        <span>Cancel Booking</span>
                                      </button>
                                    </>
                                  )}

                                  {status === "confirmed" && (
                                    <>
                                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                                        <CheckCircle2 size={14} />
                                        <span>Payment Verified & Confirmed</span>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDownloadInvoice({
                                            vertical: "package",
                                            bookingId: bkg._id || bkg.id,
                                            bookingTitle: pkgTitle,
                                          })
                                        }
                                        disabled={downloadingInvoiceId === (bkg._id || bkg.id)}
                                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                                          downloadedInvoiceId === (bkg._id || bkg.id)
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                                            : "bg-teal-700 hover:bg-teal-800 text-white"
                                        }`}
                                      >
                                        {downloadingInvoiceId === (bkg._id || bkg.id) ? (
                                          <>
                                            <Loader2 size={14} className="animate-spin text-white" />
                                            <span>Generating Invoice...</span>
                                          </>
                                        ) : downloadedInvoiceId === (bkg._id || bkg.id) ? (
                                          <>
                                            <Check size={14} className="text-emerald-700" />
                                            <span>Invoice Downloaded</span>
                                          </>
                                        ) : (
                                          <>
                                            <FileText size={14} />
                                            <span>Download Tax Invoice</span>
                                          </>
                                        )}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })()}
          </>
        )}

                {/* ─── MODAL: CANCEL PACKAGE BOOKING ─── */}
        {cancelPackageModalOpen && cancellingPackage && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-rose-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
                    <XCircle size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Cancel Package Booking
                    </h3>
                    <p className="text-xs text-slate-400">
                      Booking #{cancellingPackage._id || cancellingPackage.id}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCancelPackageModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCancelPackage} className="p-6 space-y-4">
                <p className="text-xs text-slate-600">
                  Are you sure you want to cancel your booking for{" "}
                  <strong className="text-slate-900">
                    {cancellingPackage.packageId?.title ||
                      cancellingPackage.packageSnapshot?.title ||
                      "this package"}
                  </strong>
                  ? Held flight seats and hotel rooms will be released back to
                  inventory.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Reason for Cancellation
                  </label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
                  >
                    <option value="Change of travel plans">
                      Change of travel plans
                    </option>
                    <option value="Found a better package/deal">
                      Found a better package/deal
                    </option>
                    <option value="Date conflict or schedule change">
                      Date conflict or schedule change
                    </option>
                    <option value="Other">Other reason</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCancelPackageModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Keep Booking
                  </button>
                  <button
                    type="submit"
                    disabled={isCancellingPackage}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isCancellingPackage && (
                      <Loader2 size={14} className="animate-spin" />
                    )}
                    <span>
                      {isCancellingPackage
                        ? "Cancelling..."
                        : "Confirm Cancellation"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL: CANCEL FLIGHT / HOTEL BOOKING ─── */}
        {cancelModalOpen && cancellingItem && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-rose-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
                    <XCircle size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Cancel {cancellingType === "flight" ? "Flight" : "Hotel"} Booking
                    </h3>
                    <p className="text-xs text-slate-400">
                      Booking #{cancellingItem._id || cancellingItem.id || cancellingItem.bookingId}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmCancelGeneral} className="p-6 space-y-4">
                <p className="text-xs text-slate-600">
                  Are you sure you want to cancel your{" "}
                  <strong className="text-slate-900">
                    {cancellingType === "flight"
                      ? cancellingItem.airline || cancellingItem.airlineName || "flight reservation"
                      : cancellingItem.hotelName || "hotel reservation"}
                  </strong>
                  ? Supplier cancellation policies and charges will apply as per fare terms.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Reason for Cancellation
                  </label>
                  <select
                    value={generalCancelReason}
                    onChange={(e) => setGeneralCancelReason(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
                  >
                    <option value="Change of travel plans">Change of travel plans</option>
                    <option value="Emergency or personal reason">Emergency or personal reason</option>
                    <option value="Found a cheaper fare/hotel">Found a cheaper fare/hotel</option>
                    <option value="Flight schedule conflict">Flight schedule conflict</option>
                    <option value="Other">Other reason</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCancelModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Keep Booking
                  </button>
                  <button
                    type="submit"
                    disabled={isCancellingGeneral}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isCancellingGeneral && <Loader2 size={14} className="animate-spin" />}
                    <span>{isCancellingGeneral ? "Cancelling..." : "Confirm Cancellation"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Flight E-Ticket Modal */}
        <ETicketModal
          isOpen={eTicketModalOpen}
          onClose={() => {
            setETicketModalOpen(false);
            setActiveETicket(null);
            setETicketError(null);
          }}
          ticket={activeETicket}
          loading={isLoadingETicket}
          error={eTicketError}
        />

      </main>
    </div>
  );
}
