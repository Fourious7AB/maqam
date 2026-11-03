import React, { useState, useMemo } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Home,
  ShieldCheck,
  CreditCard,
  Loader2,
} from "lucide-react";
import { toast } from "react-toastify";
import CommonHeader from "../components/CommonHeader";
import paymentService from "../services/paymentService";

export const PaymentCancelPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const initialContext = useMemo(() => {
    let resolvedId =
      searchParams.get("bookingId") || searchParams.get("id") || "";
    let resolvedType = (
      searchParams.get("type") ||
      searchParams.get("bookingType") ||
      ""
    )
      .toLowerCase()
      .trim();

    try {
      const sHotelId = sessionStorage.getItem("lastHotelBookingId");
      const sFlightId = sessionStorage.getItem("lastFlightBookingId");
      const sPackageId = sessionStorage.getItem("lastPackageBookingId");
      const sVisaId = sessionStorage.getItem("lastVisaBookingId");
      const sOfferId = sessionStorage.getItem("lastOfferBookingId");
      const sType = (sessionStorage.getItem("lastPaymentBookingType") || "")
        .toLowerCase()
        .trim();

      if (["flight", "hotel", "package", "visa", "offer"].includes(resolvedType)) {
        // already valid from URL
      } else {
        resolvedType = "";
      }

      if (resolvedId) {
        if (!resolvedType) {
          if (resolvedId === sOfferId) resolvedType = "offer";
          else if (resolvedId === sHotelId) resolvedType = "hotel";
          else if (resolvedId === sFlightId) resolvedType = "flight";
          else if (resolvedId === sPackageId) resolvedType = "package";
          else if (resolvedId === sVisaId) resolvedType = "visa";
          else if (
            ["flight", "hotel", "package", "visa", "offer"].includes(sType)
          ) {
            resolvedType = sType;
          }
        }
      } else {
        // ID missing from URL
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
      // ignore
    }

    return {
      bookingId: resolvedId || "",
      bookingType: resolvedType || "flight",
    };
  }, [searchParams]);

  const rawBookingId = initialContext.bookingId;
  const bookingType = initialContext.bookingType;

  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetryPayment = async () => {
    if (!rawBookingId) {
      toast.info("Navigating to My Bookings to resume your held reservation.");
      navigate(`/bookings?type=${bookingType}`);
      return;
    }

    try {
      setIsRetrying(true);
      toast.info("Connecting to PayPal to re-initiate payment...");

      const returnUrl = `${window.location.origin}/payment/paypal/success?type=${bookingType}&bookingId=${rawBookingId}`;
      const cancelUrl = `${window.location.origin}/payment/paypal/cancel?type=${bookingType}&bookingId=${rawBookingId}`;

      const orderRes = await paymentService.createPayPalOrder({
        bookingId: rawBookingId,
        bookingType: bookingType,
        returnUrl,
        cancelUrl,
      });

      if (orderRes?.redirectUrl) {
        if (bookingType === "offer") {
          sessionStorage.setItem("lastOfferBookingId", String(rawBookingId));
          sessionStorage.setItem("lastPaymentBookingType", "offer");
        } else if (bookingType === "hotel") {
          sessionStorage.setItem("lastHotelBookingId", String(rawBookingId));
          sessionStorage.setItem("lastPaymentBookingType", "hotel");
        } else if (bookingType === "package") {
          sessionStorage.setItem("lastPackageBookingId", String(rawBookingId));
          sessionStorage.setItem("lastPaymentBookingType", "package");
        } else if (bookingType === "visa") {
          sessionStorage.setItem("lastVisaBookingId", String(rawBookingId));
          sessionStorage.setItem("lastPaymentBookingType", "visa");
        } else if (bookingType === "flight") {
          sessionStorage.setItem("lastFlightBookingId", String(rawBookingId));
          sessionStorage.setItem("lastPaymentBookingType", "flight");
        }
        toast.info("Redirecting to PayPal secure checkout...");
        window.location.assign(orderRes.redirectUrl);
      } else {
        throw new Error("Could not acquire PayPal checkout link.");
      }
    } catch (err) {
      console.error("Retry PayPal Error:", err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Payment initiation failed. Please view your booking in My Bookings."
      );
      navigate(`/bookings?type=${bookingType}`);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-poppins pb-20">
      <CommonHeader title="Payment Cancelled" />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-28">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-amber-200/90 shadow-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <AlertTriangle size={32} />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 uppercase tracking-wider">
              Transaction Not Completed
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
              PayPal Checkout Was Cancelled
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Your payment session was cancelled or timed out. No funds have been deducted from your account.
            </p>
          </div>

          {/* Held Reservation Info Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 text-left space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <ShieldCheck size={15} className="text-teal-600" />
              <span>Your Reservation is Still Held</span>
            </div>
            <p>
              Your reservation reference{" "}
              <strong className="text-slate-900 font-mono">
                #{rawBookingId || "Pending"}
              </strong>{" "}
              is preserved in your account. You can complete payment at any time before the rate hold expires.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              disabled={isRetrying}
              onClick={handleRetryPayment}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isRetrying ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Connecting to PayPal...</span>
                </>
              ) : (
                <>
                  <CreditCard size={16} />
                  <span>Retry Payment with PayPal</span>
                </>
              )}
            </button>

            <Link
              to={`/bookings?type=${bookingType}`}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2"
            >
              <span>View in My Bookings</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Link
              to="/"
              className="text-xs font-semibold text-slate-400 hover:text-teal-700 transition flex items-center justify-center gap-1"
            >
              <Home size={13} />
              <span>Back to Maqam Home</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PaymentCancelPage;
