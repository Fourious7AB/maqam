import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import CommonHeader from "../components/CommonHeader";
import Footer from "../components/Footer";
import successAudioSrc from "../assets/nomagician-successfinish-ui-sound-effect-467873 (1).mp3";
import {
  CheckCircle2,
  Plane,
  Calendar,
  Clock,
  MapPin,
  User,
  CreditCard,
  Printer,
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
  Luggage,
  AlertTriangle,
  RotateCcw,
  Loader2,
  AlertCircle,
  Download,
  FileText,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../components/stores/api";
import DigitalBoardingPass from "../components/flight/DigitalBoardingPass";
import OmnichannelAlertStatus from "../components/notifications/OmnichannelAlertStatus";
import paymentService from "../services/paymentService";
import flightService from "../services/flightService";
import invoiceService from "../services/invoiceService";
import { getAuthHeaders } from "../admin/services/tokenService";


const FlightBookingSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const bookingId =
    searchParams.get("bookingId") ||
    sessionStorage.getItem("lastFlightBookingId") ||
    "";
  const orderId =
    searchParams.get("token") ||
    searchParams.get("orderId") ||
    searchParams.get("paypalOrderId") ||
    "";
  const paymentId = searchParams.get("paymentId") || "";
  const statusParam = searchParams.get("status") || "";
  const urlErrorMessage = searchParams.get("error") || "";

  const [hasRetriedSuccess, setHasRetriedSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [_loading, setLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureId, setCaptureId] = useState(paymentId || "");
  const [captureError, setCaptureError] = useState(urlErrorMessage);
  const [isRetrying, setIsRetrying] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [invoiceDownloaded, setInvoiceDownloaded] = useState(false);
  const [viewMode, setViewMode] = useState("boarding-pass"); // "boarding-pass" | "eticket"
  const hasPlayedSoundRef = useRef(false);
  const audioInstanceRef = useRef(null);

  const isCancelled =
    !hasRetriedSuccess &&
    !captureId &&
    (statusParam === "cancelled" ||
      searchParams.get("cancel") === "true" ||
      searchParams.get("canceled") === "true");

  // Cached flight passengers from form submission
  const savedPassengers = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("lastFlightPassengers") || "null");
    } catch {
      return null;
    }
  })();

  const _savedSeats = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("lastFlightSeats") || "null");
    } catch {
      return null;
    }
  })();

  const savedFlightDetails = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("lastFlightDetails") || "null");
    } catch {
      return null;
    }
  })();

  // Cached flight information from search & booking
  const cachedBooking = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("selectedFlightBooking") || sessionStorage.getItem("lastFlightBookingData") || "{}");
    } catch {
      return {};
    }
  })();

  const rawETicketSegments =
    bookingData?.eTicketData?.Segments ||
    bookingData?.eTicketData?.FlightItinerary?.Segments ||
    bookingData?.fareSnapshot?.Segments ||
    [];
  const flatETicketSegments = Array.isArray(rawETicketSegments?.[0])
    ? rawETicketSegments[0]
    : rawETicketSegments;

  const flightCandidates = [
    bookingData?.flight,
    bookingData?.rawBookingDetails?.flight,
    bookingData?.rawBookingDetails,
    flatETicketSegments.length > 0 ? { segments: flatETicketSegments } : null,
    bookingData,
    savedFlightDetails?.flight,
    cachedBooking?.flight,
    savedFlightDetails?.data?.data,
    savedFlightDetails?.data,
    savedFlightDetails,
    cachedBooking,
  ].filter(Boolean);

  const resolvedFlight =
    flightCandidates.find(
      (f) => Array.isArray(f?.segments) && f.segments.length > 0,
    ) ||
    flightCandidates[0] ||
    {};

  const flight = resolvedFlight;
  const segments =
    flight.segments ||
    flatETicketSegments ||
    [];
  const firstSegment = segments[0] || {};
  const lastSegment = segments[segments.length - 1] || firstSegment;

  const airlineName =
    firstSegment.airline ||
    firstSegment.airlineName ||
    firstSegment.Airline?.AirlineName ||
    bookingData?.airline ||
    "Airline Partner";
  const airlineCode =
    firstSegment.airlineCode ||
    firstSegment.Airline?.AirlineCode ||
    "";
  const flightNumber =
    firstSegment.flightNumber ||
    firstSegment.flightNo ||
    firstSegment.Airline?.FlightNumber ||
    (airlineCode ? `${airlineCode}` : "Flight");
  const origin =
    firstSegment.origin ||
    firstSegment.originCode ||
    firstSegment.Origin?.AirportCode ||
    firstSegment.Origin?.CityName ||
    bookingData?.origin ||
    "Origin";
  const destination =
    lastSegment.destination ||
    lastSegment.destinationCode ||
    lastSegment.Destination?.AirportCode ||
    lastSegment.Destination?.CityName ||
    bookingData?.destination ||
    "Destination";
  const originCity = firstSegment.originCity || firstSegment.Origin?.CityName || origin;
  const destCity = lastSegment.destinationCity || lastSegment.Destination?.CityName || destination;

  const depTime =
    firstSegment.departure?.split("T")?.[1]?.slice(0, 5) ||
    firstSegment.departureTime ||
    "--:--";
  const arrTime =
    lastSegment.arrival?.split("T")?.[1]?.slice(0, 5) ||
    lastSegment.arrivalTime ||
    "--:--";
  const depDate = firstSegment.departure
    ? new Date(firstSegment.departure).toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Scheduled Departure";

  useEffect(() => {
    let isMounted = true;
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Non-flight services (retail offers, hotels, packages, visa) must be handled by PaymentSuccessPage
    const urlType = (searchParams.get("type") || searchParams.get("bookingType") || "").toLowerCase();
    if (["offer", "hotel", "package", "visa"].includes(urlType)) {
      navigate(`/payment/paypal/success?${searchParams.toString()}`, { replace: true });
      return;
    }

    const processPaymentAndFetchBooking = async () => {
      // Step 3: Complete & capture payment on PayPal if customer was redirected back with order token/orderId
      if (orderId && !isCancelled && !paymentService.isOrderCaptured(orderId)) {
        try {
          if (isMounted) setIsCapturing(true);
          const captureRes = await paymentService.capturePayPalOrder(orderId);

          if (isMounted) {
            if (captureRes.captureId) setCaptureId(captureRes.captureId);
            setCaptureError("");
            setHasRetriedSuccess(true);
            toast.success("Payment Successful! Thank you for choosing Maqam.");
          }
        } catch (capErr) {
          console.error("Payment Capture Error:", capErr);
          const errDetail =
            capErr.response?.data?.message ||
            capErr.message ||
            "Could not capture payment from PayPal.";
          if (isMounted) {
            setCaptureError(errDetail);
            toast.error(errDetail);
          }
        } finally {
          if (isMounted) setIsCapturing(false);
        }
      }

      // Fetch confirmed booking record from backend (with real-time polling for GDS async ticketing)
      if (bookingId) {
        try {
          const fetchBooking = async () => {
            try {
              const flightRes = await flightService.getFlightBookingById(bookingId);
              return flightRes?.data || flightRes || null;
            } catch {
              const res = await api.get(`/api/v1/bookings/${bookingId}`, {
                headers: getAuthHeaders(),
              });
              return res.data?.data || res.data || null;
            }
          };

          let data = await fetchBooking();
          if (isMounted && data) {
            setBookingData(data);
          }

          // GDS Async Ticketing Polling (Flight Module Integration Guide §5.1):
          // If the flight is GDS (isLCC === false) or status is pending, poll every 2 seconds
          // (up to 10 retries / 20 seconds) for the BullMQ worker to issue the official airline e-ticket.
          if (data && (!data.isLCC || data.status === "pending") && !isCancelled) {
            const maxRetries = 10;
            for (let i = 0; i < maxRetries; i++) {
              if (
                data.status === "confirmed" &&
                (data.passengers?.[0]?.ticketNumber || data.pnr)
              ) {
                break;
              }
              await new Promise((resolve) => setTimeout(resolve, 2000));
              if (!isMounted) break;

              const freshData = await fetchBooking();
              if (freshData) {
                data = freshData;
                if (isMounted) setBookingData(freshData);
                if (
                  freshData.status === "confirmed" &&
                  (freshData.passengers?.[0]?.ticketNumber || freshData.pnr)
                ) {
                  break;
                }
              }
            }
          }
        } catch (fetchErr) {
          console.warn("Could not fetch remote flight booking record:", fetchErr);
        }
      }

      if (isMounted) setLoading(false);
    };

    processPaymentAndFetchBooking();

    return () => {
      isMounted = false;
    };
  }, [bookingId, orderId, isCancelled]);

  const handleCopyBookingId = () => {
    if (!bookingId) return;
    navigator.clipboard.writeText(bookingId);
    setCopied(true);
    toast.success("Booking ID copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadInvoice = async () => {
    const targetBookingId =
      bookingId ||
      bookingData?._id ||
      bookingData?.bookingId ||
      bookingData?.srdvBookingId ||
      searchParams.get("bookingId");

    if (!targetBookingId) {
      toast.warn("Booking reference not available yet. Printing standard page receipt...");
      handlePrint();
      return;
    }

    try {
      setDownloadingInvoice(true);
      const res = await invoiceService.downloadInvoice({
        vertical: "flight",
        bookingId: String(targetBookingId),
      });

      setInvoiceDownloaded(true);
      toast.success(`Official invoice downloaded: ${res.filename}`);
      setTimeout(() => setInvoiceDownloaded(false), 3500);
    } catch (err) {
      console.error("Invoice download error:", err);
      const status = err?.response?.status;
      const message = err?.message || "";

      if (status === 401) {
        toast.error("Your session has expired. Please log in again to download your invoice.");
      } else if (status === 403) {
        toast.error("Access denied: You are only authorized to view invoices for your own bookings.");
      } else if (status === 404 || /not found/i.test(message)) {
        toast.warn("Official invoice is not yet available on the server. Printing standard receipt...");
        handlePrint();
      } else {
        toast.error(message || "Failed to generate invoice. Printing standard receipt...");
        handlePrint();
      }
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const handleRetryPayment = async () => {
    if (!bookingId) {
      toast.error("No active booking found to retry payment.");
      return;
    }

    try {
      setIsRetrying(true);
      toast.info("Connecting to PayPal secure checkout...");
      const grandTotal = Number(
        sessionStorage.getItem("lastFlightGrandTotal") ||
        bookingData?.totalAmount ||
        bookingData?.totalPrice ||
        0
      );

      const returnUrl = `${window.location.origin}/payment/paypal/success?type=flight&bookingId=${bookingId}`;
      const cancelUrl = `${window.location.origin}/payment/paypal/cancel?type=flight&bookingId=${bookingId}`;

      const orderRes = await paymentService.createPayPalOrder({
        bookingId,
        bookingType: "flight",
        amount: grandTotal || undefined,
        returnUrl,
        cancelUrl,
      });

      const redirectUrl =
        orderRes?.redirectUrl ||
        orderRes?.approvalUrl ||
        orderRes?.data?.redirectUrl ||
        orderRes?.data?.links?.find((l) => l.rel === "approve")?.href;

      if (redirectUrl) {
        sessionStorage.setItem("lastFlightBookingId", String(bookingId));
        sessionStorage.setItem("lastPaymentBookingType", "flight");
        toast.info("Redirecting to PayPal secure checkout...");
        window.location.assign(redirectUrl);
        return;
      }

      throw new Error(
        orderRes?.message ||
          "PayPal checkout link could not be generated. Please try again."
      );
    } catch (err) {
      console.error("Flight Payment Resolution Error:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Payment initiation failed. Please try again.";
      toast.error(msg);
    } finally {
      setIsRetrying(false);
    }
  };


  const rawCallbackStatus = String(
    searchParams.get("callbackStatus") ||
      bookingData?.srdvStatus ||
      bookingData?.callbackStatus ||
      bookingData?.status ||
      statusParam ||
      ""
  ).toLowerCase();

  const isCallbackFailedOrAborted =
    rawCallbackStatus === "failed" ||
    rawCallbackStatus === "aborted" ||
    bookingData?.status === "Failed" ||
    bookingData?.status === "Aborted";

  const isConfirmed =
    !isCallbackFailedOrAborted &&
    !isCancelled &&
    (Boolean(captureId) ||
      (orderId && paymentService.isOrderCaptured(orderId)) ||
      rawCallbackStatus === "confirmed" ||
      rawCallbackStatus === "success" ||
      rawCallbackStatus === "completed" ||
      statusParam === "confirmed" ||
      statusParam === "success");

  const isFailed =
    !isConfirmed &&
    (isCallbackFailedOrAborted ||
      statusParam === "failed" ||
      Boolean(captureError));

  const isPending =
    !isCapturing &&
    !isCancelled &&
    !isFailed &&
    !isConfirmed;

  // Play celebration finish sound effect on confirmed flight booking
  useEffect(() => {
    if (isCapturing || isCancelled || isFailed || !isConfirmed || hasPlayedSoundRef.current) return;

    hasPlayedSoundRef.current = true;

    try {
      const audio = new Audio(successAudioSrc);
      audio.volume = 0.75;
      audioInstanceRef.current = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Silently handle browser autoplay policy restriction (no console error/warning)
          let cleanedUp = false;
          const cleanupListeners = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            window.removeEventListener("pointerdown", handleFirstInteraction);
            window.removeEventListener("keydown", handleFirstInteraction);
          };
          const handleFirstInteraction = () => {
            if (audioInstanceRef.current) {
              audioInstanceRef.current.play().catch(() => {});
            }
            cleanupListeners();
          };
          window.addEventListener("pointerdown", handleFirstInteraction, {
            once: true,
          });
          window.addEventListener("keydown", handleFirstInteraction, {
            once: true,
          });
          setTimeout(cleanupListeners, 12000);
        });
      }
    } catch {
      // Silently catch audio init issues
    }

    return () => {
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause();
        audioInstanceRef.current.currentTime = 0;
        audioInstanceRef.current = null;
      }
    };
  }, [isCapturing, isCancelled, isFailed, isConfirmed]);

  const resolvedPnr =
    bookingData?.pnr ||
    bookingData?.PNR ||
    bookingData?.Result?.PNR ||
    bookingData?.bookingReference ||
    cachedBooking?.pnr ||
    bookingId ||
    "";

  const resolvedGdsPnr =
    bookingData?.gdsPnr ||
    bookingData?.GdsPNR ||
    bookingData?.Result?.GdsPNR ||
    "";

  const callbackPassengers =
    bookingData?.Result?.Passengers ||
    bookingData?.passengers ||
    savedPassengers ||
    [];

  const totalPaidAmount = Number(
    sessionStorage.getItem("lastFlightGrandTotal") ||
      bookingData?.totalAmount ||
      bookingData?.totalPrice ||
      cachedBooking?.selectedTier?.price ||
      0
  );

  return (
    <>
      <CommonHeader />
      <div className="min-h-screen bg-slate-50/80 py-10 mt-16 sm:mt-20 print:bg-white print:m-0 print:p-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Capturing In Progress Banner */}
          {isCapturing && (
            <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-blue-100 text-center mb-8">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Loader2 className="w-10 h-10 animate-spin text-[#00209e]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Finalizing & Capturing Payment...
              </h1>
              <p className="text-slate-600 mt-2 max-w-lg mx-auto text-sm sm:text-base">
                Communicating with PayPal secure gateway, settling the transaction, and issuing your confirmed airline ticket. Please do not close this window.
              </p>
            </div>
          )}

          {/* Cancelled Alert Banner */}
          {!isCapturing && isCancelled && (
            <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-amber-200 text-center mb-8">
              <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                PayPal Checkout Cancelled
              </h1>
              <p className="text-gray-600 mt-2 max-w-lg mx-auto text-sm sm:text-base">
                Your payment was not completed on PayPal. Your flight booking reservation is held, but tickets will not be issued until payment is completed.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={handleRetryPayment}
                  disabled={isRetrying}
                  className="bg-[#00209e] hover:bg-blue-900 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isRetrying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  <span>{isRetrying ? "Connecting..." : "Complete Payment (PayPal)"}</span>
                </button>
                <Link
                  to="/bookings?type=flight"
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-xl text-sm transition-all cursor-pointer"
                >
                  View in My Bookings
                </Link>
              </div>
            </div>
          )}

          {/* Failure / Aborted Alert Banner */}
          {!isCapturing && !isCancelled && isFailed && (
            <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-red-100 text-center mb-8">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {isCallbackFailedOrAborted
                  ? `Flight Booking ${rawCallbackStatus === "aborted" ? "Aborted" : "Failed"}`
                  : "Payment Verification Incomplete"}
              </h1>
              <p className="text-gray-600 mt-2 max-w-lg mx-auto text-sm sm:text-base">
                {isCallbackFailedOrAborted
                  ? "The airline could not finalize your ticket reservation. An automatic 100% full refund has been initiated to your original payment method."
                  : captureError
                  ? decodeURIComponent(captureError)
                  : "We could not capture your PayPal payment. Your booking has been reserved but requires payment to issue tickets."}
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                {!isCallbackFailedOrAborted && (
                  <button
                    onClick={handleRetryPayment}
                    disabled={isRetrying}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isRetrying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4" />
                    )}
                    <span>{isRetrying ? "Connecting to PayPal..." : "Retry Payment (PayPal)"}</span>
                  </button>
                )}
                <Link
                  to="/bookings?type=flight"
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-xl text-sm transition-all cursor-pointer"
                >
                  View in My Bookings
                </Link>
                <Link
                  to="/flight"
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-xl text-sm transition-all cursor-pointer"
                >
                  Search Flights
                </Link>
              </div>
            </div>
          )}

          {/* Pending Payment Alert Banner */}
          {!isCapturing && !isCancelled && !isFailed && isPending && (
            <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-blue-200 text-center mb-8">
              <div className="w-20 h-20 bg-blue-50 text-[#00209e] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Clock className="w-10 h-10 animate-pulse text-[#00209e]" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 mb-3 uppercase tracking-wider">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Pending Payment</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Payment Required to Issue Tickets
              </h1>
              <p className="text-gray-600 mt-2 max-w-lg mx-auto text-sm sm:text-base">
                {bookingId ? (
                  <>
                    Your flight itinerary is held under booking reference{" "}
                    <strong className="font-mono text-slate-800">{bookingId}</strong>.{" "}
                  </>
                ) : null}
                Airline tickets and live PNR will be issued once your payment is completed via PayPal.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={handleRetryPayment}
                  disabled={isRetrying}
                  className="bg-[#00209e] hover:bg-blue-900 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60 active:scale-95"
                >
                  {isRetrying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  <span>{isRetrying ? "Connecting to PayPal..." : "Pay via PayPal Now"}</span>
                </button>
                <Link
                  to="/bookings?type=flight"
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-xl text-sm transition-all cursor-pointer"
                >
                  View in My Bookings
                </Link>
                <Link
                  to="/flight"
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-xl text-sm transition-all cursor-pointer"
                >
                  Search Flights
                </Link>
              </div>
            </div>
          )}

          {/* Success Content */}
          {!isCapturing && !isCancelled && !isFailed && isConfirmed && (
            <>
              {/* Success Header Card */}
              <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-900 text-white rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden mb-8">
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 rounded-2xl flex items-center justify-center shrink-0 shadow-lg mt-1">
                      <CheckCircle2 className="w-8 h-8 text-emerald-300" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold border border-emerald-400/30 mb-2 uppercase tracking-wider">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Confirmed & Paid via PayPal</span>
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        Payment Successful
                      </h1>
                      <p className="text-emerald-200 font-semibold text-base sm:text-lg mt-1">
                        Thank you for choosing Maqam
                      </p>
                      <p className="text-teal-100/80 text-xs sm:text-sm mt-1 max-w-xl">
                        Your flight booking is confirmed and your e-ticket and receipt have been issued.
                      </p>
                    </div>
                  </div>

                  {/* Print & Download Action Buttons (Hidden during print) */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 print:hidden">
                    <button
                      onClick={handleDownloadInvoice}
                      disabled={downloadingInvoice}
                      className="bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-100 border border-emerald-400/40 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer backdrop-blur-xs active:scale-95 disabled:opacity-60"
                      title="Download official tax invoice & receipt"
                    >
                      {downloadingInvoice ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                          <span>Generating...</span>
                        </>
                      ) : invoiceDownloaded ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-300" />
                          <span>Downloaded</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 text-emerald-300" />
                          <span>Download Invoice</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handlePrint}
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer backdrop-blur-xs active:scale-95"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Ticket</span>
                    </button>
                  </div>
                </div>

                {/* Booking ID & PNR Bar */}
                <div className="mt-8 pt-6 border-t border-teal-700/50 flex flex-wrap items-center justify-between gap-4 text-xs">
                  {bookingId && (
                    <div className="flex items-center gap-2 text-teal-200">
                      <span className="font-semibold text-teal-300">Booking Reference:</span>
                      <span className="font-mono bg-teal-950/40 px-3 py-1 rounded-lg border border-teal-700/40 text-white select-all">
                        {bookingId}
                      </span>
                      <button
                        onClick={handleCopyBookingId}
                        className="text-teal-300 hover:text-white p-1 rounded transition-colors cursor-pointer"
                        title="Copy Reference"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}

                  {resolvedPnr && (
                    <div className="flex items-center gap-2 text-teal-200">
                      <span className="font-semibold text-teal-300">PNR:</span>
                      <span className="font-mono bg-teal-950/40 px-3 py-1 rounded-lg border border-teal-700/40 text-white">
                        {resolvedPnr}
                      </span>
                    </div>
                  )}

                  {resolvedGdsPnr && (
                    <div className="flex items-center gap-2 text-teal-200">
                      <span className="font-semibold text-teal-300">GDS PNR:</span>
                      <span className="font-mono bg-teal-950/40 px-3 py-1 rounded-lg border border-teal-700/40 text-white">
                        {resolvedGdsPnr}
                      </span>
                    </div>
                  )}

                  {orderId && (
                    <div className="flex items-center gap-2 text-teal-200">
                      <span className="font-semibold text-teal-300">PayPal Order:</span>
                      <span className="font-mono bg-teal-950/40 px-3 py-1 rounded-lg border border-teal-700/40 text-teal-100">
                        {orderId}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* View Switcher Bar (Hidden during print) */}
              <div className="flex items-center justify-center gap-3 mb-8 print:hidden">
                <button
                  type="button"
                  onClick={() => setViewMode("boarding-pass")}
                  className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    viewMode === "boarding-pass"
                      ? "bg-[#00209e] text-white shadow-lg shadow-blue-900/25"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Plane className="w-4 h-4" />
                  <span>🎫 Digital Boarding Pass</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("eticket")}
                  className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    viewMode === "eticket"
                      ? "bg-slate-900 text-white shadow-lg shadow-slate-900/25"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>📄 Detailed E-Ticket & Receipt</span>
                </button>
              </div>

              {/* Digital Boarding Pass View */}
              {viewMode === "boarding-pass" && (
                <div className="mb-10 flex flex-col items-center">
                  <DigitalBoardingPass
                    booking={bookingData || cachedBooking}
                    passengers={
                      savedPassengers ||
                      bookingData?.passengers ||
                      bookingData?.travellers ||
                      cachedBooking?.passengers
                    }
                    flight={resolvedFlight}
                    pnr={resolvedPnr}
                    showActions={true}
                  />
                </div>
              )}

              {/* Main E-Ticket Styling Card */}
              <div
                className={`bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden mb-8 print:shadow-none print:border-none ${
                  viewMode === "boarding-pass" ? "hidden print:block" : "block"
                }`}
              >
                {/* Airline & Route Top Bar */}
                <div className="bg-slate-900 text-white p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {airlineCode ? (
                      <img
                        src={`https://images.kiwi.com/airlines/64/${airlineCode}.png`}
                        alt={airlineName}
                        className="w-12 h-12 object-contain bg-white rounded-xl p-1.5 shadow"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center">
                        <Plane className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold">
                        {airlineName}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
                        <span>Flight {flightNumber}</span>
                        <span>•</span>
                        <span>Economy Class</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                      Ticket Issued
                    </span>
                    <p className="text-xs text-slate-400 mt-1">{depDate}</p>
                  </div>
                </div>

                {/* Itinerary Flight Route Matrix */}
                <div className="p-6 sm:p-8 border-b border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 text-center md:text-left">
                    {/* Departure */}
                    <div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Departure
                      </span>
                      <p className="text-3xl font-black text-slate-900 mt-1">
                        {depTime}
                      </p>
                      <p className="font-bold text-slate-800 text-sm mt-0.5">
                        {originCity} ({origin})
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {depDate}
                      </p>
                    </div>

                    {/* Flight Path Middle */}
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-xs text-gray-500 font-semibold mb-1">
                        {segments.length > 1 ? `${segments.length - 1} Stop(s)` : "Direct"}
                      </span>
                      <div className="w-full flex items-center gap-2 max-w-[180px]">
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-600 ring-4 ring-teal-100 shrink-0" />
                        <div className="flex-1 border-t-2 border-dashed border-gray-300 relative flex items-center justify-center">
                          <Plane className="w-4 h-4 text-teal-600 transform rotate-90 absolute" />
                        </div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-emerald-100 shrink-0" />
                      </div>
                      <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-2 font-medium">
                        On Schedule
                      </span>
                    </div>

                    {/* Arrival */}
                    <div className="md:text-right">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Arrival
                      </span>
                      <p className="text-3xl font-black text-slate-900 mt-1">
                        {arrTime}
                      </p>
                      <p className="font-bold text-slate-800 text-sm mt-0.5">
                        {destCity} ({destination})
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {lastSegment.terminal ? `Terminal ${lastSegment.terminal}` : "Scheduled Arrival"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Passenger Ticket Numbers (if resolved via SRDV callback) */}
                {Array.isArray(callbackPassengers) && callbackPassengers.length > 0 && (
                  <div className="px-6 sm:px-8 py-4 border-b border-gray-100 bg-white">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Passenger Ticket Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {callbackPassengers.map((pax, idx) => {
                        const details =
                          pax?.travellerDetails || pax?.travelerDetails || pax || {};
                        const fullName = [
                          details.title || pax?.Title,
                          details.firstName || pax?.FirstName,
                          details.lastName || pax?.LastName,
                        ]
                          .filter(Boolean)
                          .join(" ");
                        const ticketNo =
                          pax?.TicketNumber ||
                          pax?.Ticket?.TicketNumber ||
                          pax?.ticket?.ticketNumber ||
                          pax?.ticketNumber ||
                          details?.ticketNumber ||
                          resolvedPnr ||
                          "Issued";
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-200"
                          >
                            <span className="font-semibold text-slate-800">
                              {fullName || `Passenger ${idx + 1}`}
                            </span>
                            <span className="font-mono text-teal-700 font-bold">
                              Ticket: {ticketNo}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Baggage & Inclusions Strip */}
                <div className="bg-slate-50 px-6 sm:px-8 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Luggage className="w-4 h-4 text-teal-600" />
                    <span>Cabin Baggage: <strong>7 kg</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Luggage className="w-4 h-4 text-emerald-600" />
                    <span>Check-in Baggage: <strong>15–20 kg</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-teal-700 font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Thank you for choosing Maqam</span>
                  </div>
                </div>

                {/* Payment Breakdown & PayPal Details */}
                <div className="p-6 sm:p-8 bg-white">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-teal-600" />
                    <span>Payment & Transaction Summary</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-50/70 p-5 rounded-2xl border border-gray-200/80">
                    <div className="space-y-2 text-slate-600 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span>Payment Gateway:</span>
                        <strong className="text-slate-800">PayPal</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Payment Status:</span>
                        <strong className="text-emerald-600">Payment Successful</strong>
                      </div>
                      {orderId && (
                        <div className="flex justify-between">
                          <span>PayPal Order ID:</span>
                          <span className="font-mono text-slate-800">{orderId}</span>
                        </div>
                      )}
                      {captureId && (
                        <div className="flex justify-between">
                          <span>PayPal Capture ID:</span>
                          <span className="font-mono text-slate-800">{captureId}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-slate-600 text-xs sm:text-sm sm:border-l sm:border-gray-200 sm:pl-4">
                      <div className="flex justify-between">
                        <span>Transaction Time:</span>
                        <strong className="text-slate-800">
                          {new Date().toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Invoice Status:</span>
                        <button
                          type="button"
                          onClick={handleDownloadInvoice}
                          disabled={downloadingInvoice}
                          className="text-teal-700 font-bold hover:underline inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 text-xs sm:text-sm"
                          title="Click to download official tax invoice"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Official Invoice Issued</span>
                        </button>
                      </div>
                      {totalPaidAmount > 0 && (
                        <div className="flex justify-between items-center text-sm pt-2 font-bold text-slate-900 border-t border-gray-200">
                          <span>Total Amount Paid:</span>
                          <span className="text-base text-emerald-600">
                            ₹{totalPaidAmount.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Block 5: Omnichannel Alerts (Email, WhatsApp, SMS) */}
              <OmnichannelAlertStatus
                bookingId={bookingId}
                bookingType="flight"
                pnr={resolvedPnr}
                recipientEmail={
                  savedPassengers?.[0]?.travellerDetails?.email ||
                  savedPassengers?.[0]?.contact?.email ||
                  bookingData?.contactDetails?.email
                }
                recipientPhone={
                  savedPassengers?.[0]?.travellerDetails?.phone ||
                  savedPassengers?.[0]?.contact?.mobile ||
                  bookingData?.contactDetails?.phone
                }
                className="mb-8 print:hidden"
              />

              {/* Bottom Navigation CTA Buttons (Hidden on Print) */}
              <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
                <Link
                  to="/flight"
                  className="bg-white hover:bg-gray-50 text-slate-700 font-semibold px-6 py-3 rounded-xl text-sm border border-gray-200 shadow-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  <Plane className="w-4 h-4 text-teal-600" />
                  <span>Book Another Flight</span>
                </Link>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDownloadInvoice}
                    disabled={downloadingInvoice}
                    className="bg-white hover:bg-gray-50 text-slate-700 font-semibold px-5 py-3 rounded-xl text-sm border border-gray-200 shadow-sm transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-60"
                  >
                    {downloadingInvoice ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                        <span>Generating Invoice...</span>
                      </>
                    ) : invoiceDownloaded ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Invoice Downloaded</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 text-teal-600" />
                        <span>Download Tax Invoice</span>
                      </>
                    )}
                  </button>
                  <Link
                    to="/bookings"
                    className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold px-7 py-3 rounded-xl text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span>View in My Bookings</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default FlightBookingSuccess;
