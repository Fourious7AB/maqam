
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  AlertCircle,
  Printer,
  ArrowRight,
  Plane,
  Hotel,
  Package,
  ShieldCheck,
  Home,
  Loader2,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
  Check,
  MapPin,
  Gift,
} from "lucide-react";
import { toast } from "react-toastify";
import CommonHeader from "../components/CommonHeader";
import paymentService from "../services/paymentService";
import flightService from "../services/flightService";
import hotelService from "../services/hotelService";
import packageService from "../services/packageService";
import offerService from "../services/offerService";
import bookingService from "../services/bookingService";
import invoiceService from "../services/invoiceService";
import api from "../components/stores/api";
import { VisaAPI } from "../configs/api";
import tokenService, {
  getStoredAuthToken,
  getAuthHeaders,
} from "../admin/services/tokenService";
import lottie from "lottie-web/build/player/lottie_light.js";
import { motion as Motion, AnimatePresence } from "framer-motion";
import wrxSuccessAnimation from "../assets/WRX Success.json";
import successAudioSrc from "../assets/nomagician-successfinish-ui-sound-effect-467873 (1).mp3";

const extractFlightInfo = (details, fallbackToken = "") => {
  if (!details) {
    return {
      pnr: fallbackToken ? "6E-" + fallbackToken.slice(-6).toUpperCase() : "Confirmed",
      airline: "Scheduled Flight",
      flightNumber: "",
      origin: "Origin",
      destination: "Destination",
      ticketNumber: "E-Ticket Generated",
      passengers: [],
    };
  }

  const pnr =
    details.pnr ||
    details.gdsPnr ||
    details.airlinePnr ||
    details.Result?.PNR ||
    details.eTicketData?.PNR ||
    details.eTicketData?.Itinerary?.PNR ||
    (fallbackToken ? "6E-" + fallbackToken.slice(-6).toUpperCase() : "Confirmed");

  let rawSegments =
    details.eTicketData?.Segments ||
    details.segments ||
    details.flight?.segments ||
    [];
  if (
    Array.isArray(rawSegments) &&
    rawSegments.length > 0 &&
    Array.isArray(rawSegments[0])
  ) {
    rawSegments = rawSegments.flat();
  }
  const segments = Array.isArray(rawSegments) ? rawSegments : [];

  const firstSeg = segments[0] || {};
  const lastSeg = segments[segments.length - 1] || firstSeg;

  const airline =
    details.airline ||
    details.flight?.airline ||
    firstSeg.Airline?.AirlineName ||
    details.eTicketData?.AirlineName ||
    firstSeg.airline ||
    firstSeg.airlineName ||
    "Scheduled Flight";

  const flightNumber =
    details.flightNumber ||
    details.flight?.flightNumber ||
    firstSeg.Airline?.FlightNumber ||
    (firstSeg.Airline?.AirlineCode && firstSeg.Airline?.FlightNumber
      ? `${firstSeg.Airline.AirlineCode}-${firstSeg.Airline.FlightNumber}`
      : "") ||
    firstSeg.flightNumber ||
    firstSeg.flightNo ||
    "";

  const origin =
    details.origin ||
    details.flight?.origin ||
    firstSeg.Origin?.AirportCode ||
    firstSeg.Origin?.CityName ||
    details.eTicketData?.Origin ||
    firstSeg.origin ||
    firstSeg.originCode ||
    "Origin";

  const destination =
    details.destination ||
    details.flight?.destination ||
    lastSeg.Destination?.AirportCode ||
    lastSeg.Destination?.CityName ||
    details.eTicketData?.Destination ||
    lastSeg.destination ||
    lastSeg.destinationCode ||
    "Destination";

  const ticketNumber =
    details.ticketNumber ||
    details.eTicketNumber ||
    details.passengers?.[0]?.ticketNumber ||
    details.eTicketData?.Passenger?.[0]?.Ticket?.TicketNumber ||
    details.ticketId ||
    "E-Ticket Generated";

  const passengers = Array.isArray(details.passengers)
    ? details.passengers.map((p) => ({
        name:
          p.travellerId?.name ||
          (p.travellerId?.firstName
            ? `${p.travellerId.firstName} ${p.travellerId.lastName || ""}`.trim()
            : "") ||
          p.name ||
          "Passenger",
        ticketNumber: p.ticketNumber || ticketNumber || "Issued",
        ticketStatus: p.ticketStatus || details.ticketStatus || "OK",
        isLeadPax: p.isLeadPax || false,
      }))
    : [];

  return {
    pnr,
    airline,
    flightNumber,
    origin,
    destination,
    ticketNumber,
    passengers,
  };
};

const extractHotelInfo = (details) => {
  if (!details) {
    return {
      hotelName: "Hotel Reservation",
      cityName: "",
      checkIn: "",
      checkOut: "",
      roomType: "Confirmed Room",
      guests: 1,
    };
  }
  return {
    hotelName:
      details.hotelName ||
      details.hotel?.name ||
      details.hotelInfo?.name ||
      details.hotelDetails?.hotelName ||
      details.name ||
      "Hotel Reservation",
    cityName:
      details.cityName ||
      details.city ||
      details.hotel?.city ||
      details.hotelDetails?.city ||
      details.hotelInfo?.city ||
      "",
    checkIn: details.checkInDate || details.checkIn || details.dates?.checkIn || details.checkIn_date || "",
    checkOut: details.checkOutDate || details.checkOut || details.dates?.checkOut || details.checkOut_date || "",
    roomType:
      details.roomName ||
      details.roomType ||
      details.rooms?.[0]?.roomName ||
      details.rooms?.[0]?.roomType ||
      "Confirmed Room",
    guests:
      details.guests?.length ||
      details.totalGuests ||
      details.adults ||
      1,
  };
};

export const PaymentSuccessPage = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const token =
    searchParams.get("token") ||
    searchParams.get("orderId") ||
    searchParams.get("paypalOrderId") ||
    "";
  const urlBookingId =
    searchParams.get("bookingId") || searchParams.get("id") || "";
  const urlType = (
    searchParams.get("type") ||
    searchParams.get("bookingType") ||
    ""
  )
    .toLowerCase()
    .trim();

  // Multi-layer detection:
  // Layer 1: Query param if valid
  // Layer 2: Match bookingId against sessionStorage keys
  // Layer 3: Use lastPaymentBookingType from sessionStorage matching last...BookingId
  // Layer 4: Fallback to non-empty last...BookingId
  const initialContext = useMemo(() => {
    let resolvedId = urlBookingId;
    let resolvedType = "";

    try {
      const sHotelId = sessionStorage.getItem("lastHotelBookingId");
      const sFlightId = sessionStorage.getItem("lastFlightBookingId");
      const sPackageId = sessionStorage.getItem("lastPackageBookingId");
      const sVisaId = sessionStorage.getItem("lastVisaBookingId");
      const sOfferId = sessionStorage.getItem("lastOfferBookingId");
      const sType = (sessionStorage.getItem("lastPaymentBookingType") || "")
        .toLowerCase()
        .trim();

      // Layer 1: Query param if valid
      if (["flight", "hotel", "package", "visa", "offer"].includes(urlType)) {
        resolvedType = urlType;
      }

      if (resolvedId) {
        // Layer 2: If resolvedType not known from URL, match ID against sessionStorage keys
        if (!resolvedType) {
          if (resolvedId === sOfferId) resolvedType = "offer";
          else if (resolvedId === sHotelId) resolvedType = "hotel";
          else if (resolvedId === sFlightId) resolvedType = "flight";
          else if (resolvedId === sPackageId) resolvedType = "package";
          else if (resolvedId === sVisaId) resolvedType = "visa";
          else if (["flight", "hotel", "package", "visa", "offer"].includes(sType)) {
            resolvedType = sType;
          }
        }
      } else {
        // Layer 3: ID missing from URL (backend PayPal adapter stripped it)
        // If type is already identified, map directly to its dedicated sessionStorage key
        if (resolvedType === "offer" && sOfferId) {
          resolvedId = sOfferId;
        } else if (resolvedType === "hotel" && sHotelId) {
          resolvedId = sHotelId;
        } else if (resolvedType === "package" && sPackageId) {
          resolvedId = sPackageId;
        } else if (resolvedType === "visa" && sVisaId) {
          resolvedId = sVisaId;
        } else if (resolvedType === "flight" && sFlightId) {
          resolvedId = sFlightId;
        } else if (["flight", "hotel", "package", "visa", "offer"].includes(sType)) {
          resolvedType = sType;
          if (sType === "offer") resolvedId = sOfferId || "";
          else if (sType === "hotel") resolvedId = sHotelId || "";
          else if (sType === "package") resolvedId = sPackageId || "";
          else if (sType === "visa") resolvedId = sVisaId || "";
          else if (sType === "flight") resolvedId = sFlightId || "";
        } else {
          // Layer 4: Fallback to available sessionStorage keys
          if (sOfferId) {
            resolvedId = sOfferId;
            resolvedType = "offer";
          } else if (sHotelId) {
            resolvedId = sHotelId;
            resolvedType = "hotel";
          } else if (sPackageId) {
            resolvedId = sPackageId;
            resolvedType = "package";
          } else if (sVisaId) {
            resolvedId = sVisaId;
            resolvedType = "visa";
          } else if (sFlightId) {
            resolvedId = sFlightId;
            resolvedType = "flight";
          }
        }
      }
    } catch {
      // sessionStorage read fallback
    }

    return {
      bookingId: resolvedId || "",
      bookingType: resolvedType || "",
    };
  }, [urlBookingId, urlType]);

  const [effectiveBookingId, setEffectiveBookingId] = useState(
    initialContext.bookingId
  );
  const [effectiveBookingType, setEffectiveBookingType] = useState(
    initialContext.bookingType || "flight"
  );

  const [loading, setLoading] = useState(true);
  const [captureData, setCaptureData] = useState(null);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [error, setError] = useState(null);
  const [animationDone, setAnimationDone] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [invoiceDownloaded, setInvoiceDownloaded] = useState(false);
  const animContainerRef = useRef(null);
  const pollingAttemptsRef = useRef(0);
  const hasPlayedSoundRef = useRef(false);
  const audioInstanceRef = useRef(null);

  // Synchronous early token hydration from URL query params or storage
  const urlAuthToken =
    searchParams.get("authToken") ||
    searchParams.get("accessToken") ||
    searchParams.get("jwt") ||
    searchParams.get("bearerToken");

  if (urlAuthToken && tokenService.getAccessToken() !== urlAuthToken) {
    tokenService.setAccessToken(urlAuthToken);
    try {
      localStorage.setItem("maqam_customer_token", urlAuthToken);
      sessionStorage.setItem("maqam_customer_token", urlAuthToken);
    } catch {
      // ignore storage errors
    }
  }

  const activeAuthToken = urlAuthToken || getStoredAuthToken();
  if (activeAuthToken && api.defaults?.headers) {
    api.defaults.headers.common["Authorization"] = `Bearer ${activeAuthToken}`;
  }

  // Synchronize token store and prime axios defaults from URL query params or storage on mount
  useEffect(() => {
    if (urlAuthToken) {
      tokenService.setAccessToken(urlAuthToken);
      try {
        localStorage.setItem("maqam_customer_token", urlAuthToken);
        sessionStorage.setItem("maqam_customer_token", urlAuthToken);
      } catch {
        // ignore storage errors
      }
    }

    const currentToken = urlAuthToken || getStoredAuthToken();
    if (currentToken && api.defaults?.headers) {
      api.defaults.headers.common["Authorization"] = `Bearer ${currentToken}`;
    }
  }, [urlAuthToken]);

  useEffect(() => {
    if (!loading && !error) {
      // Safety fallback: ensure buttons become visible after 2.4s even if onComplete doesn't fire
      const timer = setTimeout(() => {
        setAnimationDone(true);
      }, 2400);
      return () => clearTimeout(timer);
    }
  }, [loading, error]);

  useEffect(() => {
    if (loading || error || !animContainerRef.current) return;

    let anim = null;
    try {
      anim = lottie.loadAnimation({
        container: animContainerRef.current,
        renderer: "svg",
        loop: false,
        autoplay: true,
        animationData: wrxSuccessAnimation,
      });

      const handleComplete = () => {
        setAnimationDone(true);
      };

      anim.addEventListener("complete", handleComplete);
    } catch (err) {
      console.error("Failed to load Lottie animation:", err);
      setAnimationDone(true);
    }

    return () => {
      if (anim) {
        anim.destroy();
      }
    };
  }, [loading, error]);

  useEffect(() => {
    let isMounted = true;

    const executeCaptureAndLoad = async () => {
      if (!token) {
        if (isMounted) {
          setError("No PayPal order reference found in the URL.");
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        // Step 1: Capture PayPal funds (in-flight deduplication handled inside paymentService)
        const captureRes = await paymentService.capturePayPalOrder(token, {
          bookingId: urlBookingId || initialContext.bookingId,
          bookingType: urlType || initialContext.bookingType,
        });
        if (!isMounted) return;
        setCaptureData(captureRes);

        const capData = captureRes?.data?.data || captureRes?.data || {};

        // Step 2: Resolve confirmed booking details
        let foundDetails = capData.booking || null;
        let matchedType = (capData.bookingType || initialContext.bookingType || urlType || "").toLowerCase().trim();
        let idToQuery = capData.bookingId || initialContext.bookingId || urlBookingId || "";

        // If ID or Type is still missing (e.g. Incognito or backend stripped both),
        // inspect capture response or query payment order record from backend
        if (!idToQuery || !matchedType) {
          const possibleBookingId =
            capData.bookingId ||
            capData.custom_id ||
            capData.invoice_id ||
            capData.purchase_units?.[0]?.custom_id ||
            capData.purchase_units?.[0]?.reference_id?.replace(/^booking_/, "");

          if (possibleBookingId && !idToQuery) {
            idToQuery = possibleBookingId;
          }

          if (capData.bookingType && !matchedType) {
            matchedType = capData.bookingType.toLowerCase();
          }

          if ((!idToQuery || !matchedType) && token) {
            try {
              const paymentDoc = await paymentService.getPaymentByOrderId(token);
              if (paymentDoc) {
                if (!idToQuery && paymentDoc.bookingId) {
                  idToQuery = String(paymentDoc.bookingId);
                }
                if (!matchedType && paymentDoc.bookingType) {
                  matchedType = String(paymentDoc.bookingType).toLowerCase();
                }
              }
            } catch {
              // Gracefully continue probing
            }
          }
        }

        // If booking object was not returned directly from capture, fetch it
        if (idToQuery && !foundDetails) {
          const tryFetch = async (type) => {
            try {
              if (type === "offer") {
                const res = await offerService.getBooking(idToQuery);
                return res?.booking || res?.data?.booking || res?.data || res || null;
              }
              if (type === "flight") {
                const res = await flightService.getFlightBookingById(idToQuery);
                return res?.data || res || null;
              }
              if (type === "hotel") {
                const res = await hotelService.getHotelBookingById(idToQuery);
                return res?.data || res || null;
              }
              if (type === "package") {
                const res = await packageService.getPackageBooking(idToQuery);
                return res?.data || res || null;
              }
              if (type === "visa") {
                const res = await api.get(VisaAPI.UserSingleGroupApi(idToQuery), {
                  headers: getAuthHeaders(),
                });
                return res?.data?.data || res?.data || null;
              }
              if (type === "master") {
                const res = await bookingService.getMasterBookingById(idToQuery);
                return res?.data || res || null;
              }
            } catch {
              return null;
            }
            return null;
          };

          // Try initially detected type first if known
          if (matchedType && matchedType !== "master") {
            foundDetails = await tryFetch(matchedType);
          }

          // If null or failed, probe candidate verticals concurrently
          if (!foundDetails) {
            const candidates = [
              "offer",
              "hotel",
              "package",
              "visa",
              "flight",
              "master",
            ].filter((c) => c !== matchedType);

            const probeResults = await Promise.allSettled(
              candidates.map(async (candidate) => {
                const data = await tryFetch(candidate);
                return { candidate, data };
              })
            );

            for (const result of probeResults) {
              if (result.status === "fulfilled" && result.value?.data) {
                foundDetails = result.value.data;
                const hit = result.value.candidate;
                if (hit !== "master") {
                  matchedType = hit;
                } else if (result.value.data?.bookingType || result.value.data?.type) {
                  matchedType = (
                    result.value.data.bookingType || result.value.data.type
                  ).toLowerCase();
                }
                break;
              }
            }
          }
        }

        // Offer-specific backend payment verification polling
        // Poll offerService.getBooking(bookingId) until confirmed by the backend before showing success page
        if (matchedType === "offer" || urlType === "offer" || initialContext.bookingType === "offer") {
          const isOfferConfirmedRecord = (rec) => {
            if (!rec) return false;
            const st = (rec.status || rec.bookingStatus || "").toLowerCase();
            const pst = (rec.paymentStatus || rec.payment?.status || "").toUpperCase();
            return (
              st === "confirmed" ||
              st === "completed" ||
              pst === "COMPLETED" ||
              pst === "CAPTURED" ||
              pst === "PAID" ||
              pst === "SUCCESS"
            );
          };

          let verifiedOffer = foundDetails;
          let pollAttempts = 0;
          const maxVerificationAttempts = 15;
          const pollInterval = 1500;

          while (pollAttempts < maxVerificationAttempts) {
            if (isOfferConfirmedRecord(verifiedOffer)) {
              foundDetails = verifiedOffer;
              break;
            }

            await new Promise((resolve) => setTimeout(resolve, pollInterval));
            pollAttempts++;

            try {
              const polled = await offerService.getBooking(idToQuery);
              if (polled) {
                verifiedOffer =
                  polled?.booking ||
                  polled?.data?.booking ||
                  polled?.data ||
                  polled;
                if (isOfferConfirmedRecord(verifiedOffer)) {
                  foundDetails = verifiedOffer;
                  break;
                }
              }
            } catch (pollErr) {
              console.warn(
                "[PaymentSuccessPage] Offer verification polling attempt error:",
                pollErr?.message
              );
            }
          }

          if (!isOfferConfirmedRecord(foundDetails)) {
            throw new Error(
              "Offer payment was processed with PayPal, but the booking confirmation is still pending backend stock verification. Please check My Bookings or refresh to verify."
            );
          }
        }

        // Verification: Ensure backend confirmed payment was successful before showing confirmation
        const paymentStatus = (
          capData.status ||
          capData.paymentStatus ||
          foundDetails?.paymentStatus ||
          ""
        ).toUpperCase();

        const bookingStatus = (
          foundDetails?.status ||
          foundDetails?.bookingStatus ||
          ""
        ).toLowerCase();

        const isBackendPaymentConfirmed =
          captureRes?.success &&
          (paymentStatus === "COMPLETED" ||
            paymentStatus === "CAPTURED" ||
            paymentStatus === "PAID" ||
            paymentStatus === "SUCCESS" ||
            bookingStatus === "confirmed" ||
            bookingStatus === "completed" ||
            bookingStatus === "payment_received" ||
            bookingStatus === "confirming" ||
            bookingStatus === "confirming_provider" ||
            bookingStatus === "provider_pending" ||
            captureRes.alreadyCaptured ||
            Boolean(captureRes.captureId));

        if (!isBackendPaymentConfirmed) {
          throw new Error(
            "Payment verification incomplete. The backend has not confirmed payment receipt yet."
          );
        }

        if (isMounted) {
          if (foundDetails) {
            setBookingDetails(foundDetails);
          }
          if (matchedType) {
            setEffectiveBookingType(matchedType);
          }
          if (idToQuery) {
            setEffectiveBookingId(idToQuery);
          }
        }
      } catch (err) {
        console.error("Payment capture error:", err);
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "We encountered an issue finalizing your PayPal payment."
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    executeCaptureAndLoad();

    return () => {
      isMounted = false;
    };
  }, [token, urlBookingId, urlType, initialContext.bookingId, initialContext.bookingType]);

  // Reset polling attempts whenever effective booking context changes
  useEffect(() => {
    pollingAttemptsRef.current = 0;
  }, [effectiveBookingId, effectiveBookingType]);

  // Background polling for async ticketing/confirmation if status is pending
  useEffect(() => {
    let timerId = null;
    const maxAttempts = 10;

    const isPendingFlight =
      effectiveBookingType === "flight" &&
      effectiveBookingId &&
      (!bookingDetails ||
        bookingDetails?.status === "pending" ||
        bookingDetails?.ticketStatus === "pending" ||
        (!bookingDetails?.isLCC && !bookingDetails?.passengers?.[0]?.ticketNumber && !bookingDetails?.pnr));

    const isPendingPackage =
      effectiveBookingType === "package" &&
      effectiveBookingId &&
      (!bookingDetails ||
        bookingDetails?.status === "pending" ||
        bookingDetails?.bookingStatus === "pending" ||
        bookingDetails?.status === "awaiting_payment" ||
        bookingDetails?.bookingStatus === "awaiting_payment");

    const isPendingHotel =
      effectiveBookingType === "hotel" &&
      effectiveBookingId &&
      (!bookingDetails ||
        bookingDetails?.status === "pending" ||
        bookingDetails?.bookingStatus === "pending" ||
        bookingDetails?.status === "awaiting_payment" ||
        bookingDetails?.bookingStatus === "awaiting_payment" ||
        bookingDetails?.status === "confirming_provider" ||
        bookingDetails?.bookingStatus === "confirming_provider" ||
        bookingDetails?.status === "provider_pending" ||
        bookingDetails?.bookingStatus === "provider_pending" ||
        bookingDetails?.status === "payment_received" ||
        bookingDetails?.bookingStatus === "payment_received");

    const isPendingOffer =
      effectiveBookingType === "offer" &&
      effectiveBookingId &&
      (!bookingDetails ||
        bookingDetails?.status === "pending" ||
        bookingDetails?.bookingStatus === "pending");

    if (isPendingFlight || isPendingHotel || isPendingPackage || isPendingOffer) {
      const pollBooking = async () => {
        try {
          pollingAttemptsRef.current++;
          if (effectiveBookingType === "flight") {
            const refreshed = await flightService.getFlightBookingById(effectiveBookingId);
            const data = refreshed?.data || refreshed;
            if (data) {
              setBookingDetails(data);
              if (
                data.status === "confirmed" &&
                (data.ticketStatus === "OK" ||
                  data.passengers?.[0]?.ticketNumber ||
                  data.pnr)
              ) {
                return; // Ticketing complete
              }
            }
          } else if (effectiveBookingType === "hotel") {
            const refreshed = await hotelService.getHotelBookingById(effectiveBookingId);
            const data = refreshed?.data || refreshed;
            if (data) {
              setBookingDetails(data);
              if (
                data.status === "confirmed" ||
                data.bookingStatus === "confirmed" ||
                data.status === "failed" ||
                data.bookingStatus === "failed"
              ) {
                return; // Hotel reservation finalized
              }
            }
          } else if (effectiveBookingType === "package") {
            const refreshed = await packageService.getPackageBooking(effectiveBookingId);
            const data = refreshed?.data || refreshed;
            if (data) {
              setBookingDetails(data);
              if (
                data.status === "confirmed" ||
                data.bookingStatus === "confirmed" ||
                data.status === "failed" ||
                data.bookingStatus === "failed"
              ) {
                return; // Package reservation finalized
              }
            }
          } else if (effectiveBookingType === "offer") {
            const refreshed = await offerService.getBooking(effectiveBookingId);
            const data = refreshed?.booking || refreshed?.data?.booking || refreshed?.data || refreshed;
            if (data) {
              setBookingDetails(data);
              if (
                data.status === "confirmed" ||
                data.bookingStatus === "confirmed" ||
                data.status === "failed" ||
                data.bookingStatus === "failed"
              ) {
                return; // Offer reservation finalized
              }
            }
          }
        } catch {
          // Gracefully continue polling
        }

        if (pollingAttemptsRef.current < maxAttempts) {
          timerId = setTimeout(pollBooking, 2000);
        }
      };

      if (pollingAttemptsRef.current < maxAttempts) {
        timerId = setTimeout(pollBooking, 2000);
      }
    }

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [effectiveBookingType, effectiveBookingId, bookingDetails]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handlePrintReceipt = async () => {
    const vertical = (effectiveBookingType || "flight").toLowerCase();
    const targetBookingId =
      effectiveBookingId ||
      bookingDetails?._id ||
      bookingDetails?.bookingId ||
      bookingDetails?.providerBookingId ||
      urlBookingId;

    if (!targetBookingId) {
      toast.warn("Booking reference not available yet. Printing standard page receipt...");
      handlePrint();
      return;
    }

    try {
      setDownloadingInvoice(true);
      const res = await invoiceService.downloadInvoice({
        vertical,
        bookingId: targetBookingId,
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

  const captureId =
    captureData?.captureId ||
    captureData?.data?.id ||
    captureData?.data?.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
    token;

  const rawStatus = (
    bookingDetails?.status ||
    bookingDetails?.bookingStatus ||
    ""
  ).toLowerCase();
  const rawRefundStatus = (
    bookingDetails?.refundStatus ||
    bookingDetails?.paymentStatus ||
    ""
  ).toLowerCase();

  const isRefundInitiated =
    rawRefundStatus === "initiated" ||
    rawRefundStatus === "pending" ||
    rawRefundStatus === "processing" ||
    rawRefundStatus === "completed" ||
    rawRefundStatus === "refunded" ||
    rawRefundStatus === "refund_initiated" ||
    /refund\s+(initiated|process|pending|completed)/i.test(error || "") ||
    /refund\s+(initiated|process|pending|completed)/i.test(
      bookingDetails?.supplierError || ""
    ) ||
    /refund\s+(initiated|process|pending|completed)/i.test(
      bookingDetails?.errorMessage || ""
    ) ||
    /refund\s+(initiated|process|pending|completed)/i.test(
      bookingDetails?.failureReason || ""
    );

  const isSupplierFailed =
    rawStatus === "failed" ||
    rawStatus === "cancelled" ||
    rawStatus === "rejected" ||
    /duplicate\s+booking/i.test(error || "") ||
    /duplicate\s+booking/i.test(bookingDetails?.supplierError || "") ||
    /duplicate\s+booking/i.test(bookingDetails?.errorMessage || "") ||
    /ErrorCode\s*100/i.test(error || "") ||
    /ErrorCode\s*100/i.test(bookingDetails?.supplierError || "") ||
    /existing booking was done using credit line or wallet/i.test(error || "") ||
    /existing booking was done using credit line or wallet/i.test(
      bookingDetails?.supplierError || ""
    ) ||
    /supplier.*fail/i.test(error || "") ||
    /supplier.*fail/i.test(bookingDetails?.supplierError || "");

  const hasSupplierRefundConflict = isSupplierFailed || isRefundInitiated;

  // Play celebration finish sound effect once payment is captured & confirmed (strictly once)
  useEffect(() => {
    if (loading || error || hasSupplierRefundConflict || hasPlayedSoundRef.current) return;

    hasPlayedSoundRef.current = true;

    try {
      const audio = new Audio(successAudioSrc);
      audio.volume = 0.75;
      audioInstanceRef.current = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser autoplay policy requires user gesture, play immediately on first interaction
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

          setTimeout(cleanupListeners, 15000);
        });
      }
    } catch {
      // Silently catch audio init issues
    }
  }, [loading, error, hasSupplierRefundConflict]);

  const supplierFailureMessage =
    bookingDetails?.supplierError ||
    bookingDetails?.errorMessage ||
    bookingDetails?.failureReason ||
    (error && /duplicate|ErrorCode|supplier|credit line|wallet/i.test(error)
      ? error
      : effectiveBookingType === "flight"
      ? "The airline supplier was unable to issue the e-ticket due to an airline reservation conflict or inventory change."
      : "The hotel supplier was unable to confirm the room reservation due to a duplicate booking or supplier allocation limit.");

  const refundAmount =
    bookingDetails?.totalPrice ||
    bookingDetails?.totalAmount ||
    bookingDetails?.amount ||
    captureData?.data?.purchase_units?.[0]?.amount?.value ||
    null;

  return (
    <div className="min-h-screen bg-[#f8fafc] font-poppins pb-20">
      <CommonHeader title="Booking Confirmation" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-28">
        {loading ? (
          <div className="bg-white rounded-3xl p-10 sm:p-16 border border-slate-200/90 shadow-sm text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto shadow-xs">
              <Loader2 size={32} className="animate-spin text-teal-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Securing Your Reservation...
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              We are capturing your approved PayPal payment, locking your
              inventory, and finalizing your booking confirmation.
            </p>
          </div>
        ) : hasSupplierRefundConflict ? (
          <div className="space-y-6">
            {/* Supplier Booking Unsuccessful / Refund Initiated Hero Card */}
            <Motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-amber-200 dark:border-amber-800/80 shadow-lg relative overflow-hidden text-center"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-100/60 dark:bg-amber-950/40 rounded-full blur-3xl pointer-events-none -mt-36" />

              <div className="relative z-10 flex flex-col items-center">
                {/* Print button pinned to top right */}
                <div className="w-full flex justify-end mb-2">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                    title="Print Notice"
                  >
                    <Printer size={15} />
                    <span className="hidden sm:inline">Print Notice</span>
                  </button>
                </div>

                {/* Section Badge: Payment Captured — Refund Initiated */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs sm:text-[13px] font-black uppercase tracking-wider shadow-xs">
                  <RotateCcw size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Payment Captured — Refund Initiated</span>
                </div>

                <div className="w-20 h-20 sm:w-24 sm:h-24 my-4 rounded-3xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-800">
                  <AlertTriangle size={38} />
                </div>

                {/* Title: Booking Unsuccessful */}
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  {effectiveBookingType === "flight"
                    ? "Flight Booking Unsuccessful"
                    : effectiveBookingType === "hotel"
                    ? "Hotel Booking Unsuccessful"
                    : "Booking Unsuccessful"}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-lg mx-auto">
                  {effectiveBookingType === "flight"
                    ? `Your payment was received by PayPal. However, the airline supplier could not issue the e-ticket (${supplierFailureMessage}).`
                    : `Your payment was received by PayPal. However, the supplier could not confirm the reservation (${supplierFailureMessage}).`}
                </p>

                {/* Transparent Refund Notice Card */}
                <div className="w-full max-w-lg mt-6 p-4 sm:p-5 bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-slate-800/80 dark:to-slate-800/60 rounded-2xl border border-amber-200/80 dark:border-amber-800 text-left space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Automated Refund Status:
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-xs font-black uppercase">
                      100% Refund Initiated
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    A full refund {refundAmount ? `of ₹${Number(refundAmount).toLocaleString()}` : ""} has been initiated to your PayPal account. Funds will reflect in your account within 3–5 business days.
                  </p>
                </div>

                {/* Key Reference Codes Strip */}
                <div className="w-full mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-left text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Booking ID
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate block">
                      #{effectiveBookingId || (token ? "MB-" + token.slice(-8) : "N/A")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      PayPal Capture ID
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-extrabold text-teal-800 dark:text-teal-400 truncate block">
                      {captureId}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Payment State
                    </span>
                    <span className="font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <RotateCcw size={12} /> REFUND IN PROGRESS
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Booking Type
                    </span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 capitalize">
                      {effectiveBookingType}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-6 pt-2 w-full max-w-md mx-auto">
                  <Link
                    to={`/bookings?type=${effectiveBookingType}`}
                    className="w-full sm:w-auto flex-1 px-6 py-3.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <span>View in My Bookings</span>
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    to={effectiveBookingType === "flight" ? "/flight" : "/hotel"}
                    className="w-full sm:w-auto flex-1 px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 border border-slate-200/80 dark:border-slate-700 shadow-xs cursor-pointer active:scale-98"
                  >
                    <Home size={16} />
                    <span>
                      {effectiveBookingType === "flight"
                        ? "Browse Other Flights"
                        : "Browse Other Hotels"}
                    </span>
                  </Link>
                </div>
              </div>
            </Motion.div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-rose-200 shadow-sm text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Payment Verification Notice
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                {error}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 text-left space-y-1">
              <p className="font-bold text-slate-800">What happens next?</p>
              <p>
                If PayPal funds were already deducted, your booking status will
                automatically synchronize via PayPal webhooks within 2–5
                minutes. Your reservation remains held in your account.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to={`/bookings?type=${effectiveBookingType}`}
                className="px-6 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-bold shadow-md transition"
              >
                Go to My Bookings
              </Link>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Retry Verification</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full">
            {/* Top Confirmed Hero Celebration Card - Full Screen */}
            <Motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 md:p-14 border border-emerald-200/90 dark:border-emerald-800/80 shadow-xl relative overflow-hidden text-center w-full min-h-[calc(100vh-180px)] flex flex-col justify-between items-center"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-100/60 dark:bg-emerald-950/40 rounded-full blur-3xl pointer-events-none -mt-36" />

              <div className="relative z-10 flex flex-col items-center w-full my-auto">
                {/* Print Receipt / Official Invoice button pinned to top right */}
                <div className="w-full flex justify-end mb-2">
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    disabled={downloadingInvoice}
                    className={`p-2 sm:px-3.5 sm:py-2 rounded-xl border transition cursor-pointer flex items-center gap-2 text-xs font-bold shadow-xs active:scale-95 ${
                      invoiceDownloaded
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                    }`}
                    title="Download official tax invoice & print receipt"
                  >
                    {downloadingInvoice ? (
                      <>
                        <Loader2 size={15} className="animate-spin text-teal-600 shrink-0" />
                        <span className="hidden sm:inline">Generating Invoice...</span>
                      </>
                    ) : invoiceDownloaded ? (
                      <>
                        <Check size={15} className="text-emerald-600 shrink-0" />
                        <span className="hidden sm:inline">Invoice Downloaded</span>
                      </>
                    ) : (
                      <>
                        <Printer size={15} className="shrink-0" />
                        <span className="hidden sm:inline">Print Receipt</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Section Badge: Payment Captured & Confirmed */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-[13px] font-black uppercase tracking-wider shadow-xs">
                  <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Payment Captured & Confirmed</span>
                </div>

                {/* Responsive WRX Success Lottie Animation */}
                <div
                  ref={animContainerRef}
                  className="w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 my-3 flex items-center justify-center relative [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                  aria-label="Payment successful animation"
                />

                {/* Title: Payment Successful */}
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  Payment Successful
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto">
                  Your reservation has been confirmed. Confirmation details and official receipt have been generated.
                </p>

                {/* Booking summary card (flight or hotel) */}
                {effectiveBookingType === "flight" && bookingDetails && (
                  <div className="w-full max-w-md mx-auto mt-4 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-left text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      <span className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400 font-extrabold truncate">
                        <Plane size={14} className="shrink-0" />
                        {extractFlightInfo(bookingDetails, token).airline} {extractFlightInfo(bookingDetails, token).flightNumber}
                      </span>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800 shrink-0">
                        PNR: {extractFlightInfo(bookingDetails, token).pnr}
                      </span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 flex items-center justify-between text-[11px]">
                      <span>{extractFlightInfo(bookingDetails, token).origin} &rarr; {extractFlightInfo(bookingDetails, token).destination}</span>
                      <span className="font-medium truncate max-w-[150px]">{extractFlightInfo(bookingDetails, token).ticketNumber}</span>
                    </div>
                  </div>
                )}
                {effectiveBookingType === "hotel" && bookingDetails && (
                  <div className="w-full max-w-md mx-auto mt-4 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-left text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      <span className="flex items-center gap-1.5 text-orange-700 dark:text-orange-400 font-extrabold truncate max-w-[240px]">
                        <Hotel size={14} className="shrink-0" />
                        {extractHotelInfo(bookingDetails).hotelName}
                      </span>
                      {extractHotelInfo(bookingDetails).cityName && (
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 font-bold border border-orange-200 dark:border-orange-800 shrink-0">
                          {extractHotelInfo(bookingDetails).cityName}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 flex items-center justify-between text-[11px]">
                      <span className="truncate max-w-[200px]">{extractHotelInfo(bookingDetails).roomType}</span>
                      {extractHotelInfo(bookingDetails).checkIn && (
                        <span className="font-medium shrink-0">
                          {extractHotelInfo(bookingDetails).checkIn} &rarr; {extractHotelInfo(bookingDetails).checkOut}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {effectiveBookingType === "package" && bookingDetails && (
                  <div className="w-full max-w-md mx-auto mt-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-left text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 mb-1">
                      <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-extrabold truncate max-w-[240px]">
                        <Package size={15} className="shrink-0" />
                        {bookingDetails.packageSnapshot?.title ||
                          bookingDetails.package?.title ||
                          bookingDetails.title ||
                          "Curated Travel Package"}
                      </span>
                      <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 shrink-0">
                        CONFIRMED
                      </span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400" />
                        {bookingDetails.packageSnapshot?.destination ||
                          bookingDetails.destination ||
                          bookingDetails.package?.destination ||
                          "Destination"}
                      </span>
                      <span className="font-medium">
                        {bookingDetails.quantity || 1} {Number(bookingDetails.quantity) === 1 ? "Traveller" : "Travellers"}
                      </span>
                    </div>
                    {bookingDetails.travellers?.[0] && (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Lead Traveller:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {bookingDetails.travellers[0].title || ""} {bookingDetails.travellers[0].firstName} {bookingDetails.travellers[0].lastName}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {effectiveBookingType === "offer" && bookingDetails && (
                  <div className="w-full max-w-md mx-auto mt-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-left text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 mb-1">
                      <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-extrabold truncate max-w-[240px]">
                        <Gift size={15} className="shrink-0" />
                        {bookingDetails.offerSnapshot?.title ||
                          bookingDetails.offer?.title ||
                          bookingDetails.title ||
                          "Special Retail Offer"}
                      </span>
                      <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800 shrink-0">
                        CONFIRMED
                      </span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400" />
                        {bookingDetails.offerSnapshot?.destination ||
                          bookingDetails.destination ||
                          bookingDetails.offer?.destination ||
                          (bookingDetails.offerSnapshot?.type ? `${bookingDetails.offerSnapshot.type.toUpperCase()} Offer` : "Special Offer")}
                      </span>
                      <span className="font-medium">
                        {bookingDetails.quantity || 1} {Number(bookingDetails.quantity) === 1 ? "Traveller / Unit" : "Travellers / Units"}
                      </span>
                    </div>
                    {bookingDetails.travellers?.[0] && (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Lead Traveller:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {bookingDetails.travellers[0].title || ""} {bookingDetails.travellers[0].firstName} {bookingDetails.travellers[0].lastName}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Two Action Buttons: Revealed with smooth movement */}
                <AnimatePresence>
                  {animationDone && (
                    <Motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                      className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-6 pt-2 w-full max-w-md mx-auto"
                    >
                      <Link
                        to="/"
                        className="w-full sm:w-auto flex-1 px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 border border-slate-200/80 dark:border-slate-700 shadow-xs cursor-pointer active:scale-98"
                      >
                        <Home size={16} />
                        <span>Home Page</span>
                      </Link>

                      {effectiveBookingType === "flight" && effectiveBookingId && (
                        <Link
                          to={`/flight-booking-success?bookingId=${effectiveBookingId}`}
                          className="w-full sm:w-auto flex-1 px-6 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Plane size={16} />
                          <span>View Boarding Pass</span>
                        </Link>
                      )}

                      {effectiveBookingType === "package" && (
                        <Link
                          to="/package-page"
                          className="w-full sm:w-auto flex-1 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Package size={16} />
                          <span>All Packages</span>
                        </Link>
                      )}

                      {effectiveBookingType === "offer" && (
                        <Link
                          to="/"
                          className="w-full sm:w-auto flex-1 px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Gift size={16} />
                          <span>Browse More Offers</span>
                        </Link>
                      )}

                      {(() => {
                        const offerItemType = (
                          bookingDetails?.offerSnapshot?.itemType ||
                          bookingDetails?.offerSnapshot?.type ||
                          bookingDetails?.offer?.itemType ||
                          bookingDetails?.offer?.type ||
                          bookingDetails?.itemType ||
                          ""
                        ).toLowerCase();
                        const isHotelOffer =
                          offerItemType === "hotel" ||
                          Boolean(
                            bookingDetails?.offerSnapshot?.hotelId ||
                            bookingDetails?.offer?.hotelId
                          );
                        const targetTab =
                          effectiveBookingType === "offer"
                            ? isHotelOffer
                              ? "hotel"
                              : "flight"
                            : effectiveBookingType;

                        return (
                          <Link
                            to={`/bookings?type=${targetTab}&status=confirmed`}
                            className="w-full sm:w-auto flex-1 px-7 py-3.5 rounded-2xl bg-teal-700 hover:bg-teal-800 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <span>My Bookings</span>
                            <ArrowRight size={16} />
                          </Link>
                        );
                      })()}
                    </Motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Key Reference Codes Strip */}
              <div className="w-full mt-8 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-left">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Booking ID
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-extrabold text-slate-900 truncate block">
                    #{effectiveBookingId || (token ? "MB-" + token.slice(-8) : "Confirmed")}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    PayPal Capture ID
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-extrabold text-teal-800 truncate block">
                    {captureId}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Payment Status
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-emerald-700 flex items-center gap-1">
                    <ShieldCheck size={14} /> PAID
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Booking Type
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-800 capitalize flex items-center gap-1">
                    {effectiveBookingType === "flight" ? (
                      <Plane size={13} className="text-teal-600" />
                    ) : effectiveBookingType === "hotel" ? (
                      <Hotel size={13} className="text-orange-600" />
                    ) : effectiveBookingType === "offer" ? (
                      <Gift size={13} className="text-rose-600" />
                    ) : effectiveBookingType === "visa" ? (
                      <ShieldCheck size={13} className="text-indigo-600" />
                    ) : (
                      <Package size={13} className="text-emerald-600" />
                    )}
                    {effectiveBookingType}
                  </span>
                </div>
              </div>
            </Motion.div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PaymentSuccessPage;
