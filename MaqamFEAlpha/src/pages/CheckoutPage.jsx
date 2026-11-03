import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Lock,
  ShieldCheck,
  CreditCard,
  Building,
  Plane,
  Package,
  Calendar,
  Users,
  Check,
  AlertCircle,
  Loader2,
  ChevronRight,
  ArrowLeft,
  BadgeCheck,
} from "lucide-react";
import { toast } from "react-toastify";
import CommonHeader from "../components/CommonHeader";
import TravellerSelector from "../components/travellers/TravellerSelector";
import paymentService from "../services/paymentService";
import { useAuth } from "../store/authContext";
import { isPhoneOnlyIncompleteUser } from "../utils/profileCompletionCheck";
import ProfileCompletionModal from "../components/user/ProfileCompletionModal";

export const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated: ctxAuth, user: ctxUser, openLoginModal } = useAuth();
  const reduxAuth = useSelector((state) => state.auth?.isAuthenticated);
  const reduxUser = useSelector((state) => state.auth?.user);
  const isAuthenticated = ctxAuth || reduxAuth;
  const user = ctxUser || reduxUser;

  const stateData = location?.state || {};
  const bookingId =
    stateData.bookingId ||
    new URLSearchParams(location.search).get("bookingId") ||
    "";
  const bookingType = (
    stateData.bookingType ||
    new URLSearchParams(location.search).get("type") ||
    "flight"
  ).toLowerCase();

  const title =
    stateData.title ||
    stateData.name ||
    (bookingType === "flight"
      ? "Flight Booking Checkout"
      : bookingType === "hotel"
      ? "Hotel Booking Checkout"
      : bookingType === "offer"
      ? "Special Offer Checkout"
      : "Travel Package Checkout");

  const totalAmount = Number(
    stateData.totalAmount || stateData.amount || stateData.totalPrice || 0
  );
  const estimatedUSD = (totalAmount * 0.012).toFixed(2);

  const [leadPassenger, setLeadPassenger] = useState({
    title: "Mr",
    firstName: user?.firstName || user?.name?.split(" ")[0] || "",
    lastName: user?.lastName || user?.name?.split(" ").slice(1).join(" ") || "",
    email: user?.email || "",
    phone: user?.phone || "",
    travellerId: null,
  });

  const [agreed, setAgreed] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleSelectTraveller = (trav) => {
    if (!trav) return;
    setLeadPassenger((prev) => ({
      ...prev,
      title: trav.title || prev.title,
      firstName: trav.firstName || prev.firstName,
      lastName: trav.lastName || prev.lastName,
      email: trav.email || prev.email,
      phone: trav.phone || prev.phone,
      travellerId: trav._id || trav.id || null,
    }));
    toast.success(`Selected traveller: ${trav.firstName} ${trav.lastName}`);
  };

  const handlePayNow = async () => {
    if (!isAuthenticated) {
      openLoginModal({
        message: "Please log in to proceed with secure payment.",
        onSuccess: (authenticatedUser) => {
          const loggedIn = authenticatedUser || user;
          if (isPhoneOnlyIncompleteUser(loggedIn)) {
            toast.warn(
              `Edit your profile first then add that as traveler and then proceed to ${bookingType} booking.`
            );
            setShowProfileModal(true);
          }
        },
      });
      return;
    }

    if (isPhoneOnlyIncompleteUser(user)) {
      toast.warn(
        `Edit your profile first then add that as traveler and then proceed to ${bookingType} booking.`
      );
      setShowProfileModal(true);
      return;
    }

    if (!leadPassenger.firstName.trim() || !leadPassenger.lastName.trim()) {
      toast.error("Please enter first and last name for the booking.");
      return;
    }

    if (!agreed) {
      toast.error("Please agree to the booking terms and conditions.");
      return;
    }

    if (!bookingId) {
      toast.error("No active booking reference found. Please select inventory first.");
      navigate(bookingType === "hotel" ? "/hotel" : "/flight");
      return;
    }

    if (totalAmount <= 0) {
      toast.error("Invalid booking total. Please re-select your itinerary.");
      navigate(bookingType === "hotel" ? "/hotel" : "/flight");
      return;
    }

    try {
      setIsSubmitting(true);
      toast.info("Connecting to PayPal secure checkout...");

      const returnUrl = `${window.location.origin}/payment/paypal/success?type=${bookingType}&bookingId=${bookingId}`;
      const cancelUrl = `${window.location.origin}/payment/paypal/cancel?type=${bookingType}&bookingId=${bookingId}`;

      const res = await paymentService.createPayPalOrder({
        bookingId,
        bookingType,
        amount: totalAmount,
        returnUrl,
        cancelUrl,
      });

      if (res?.redirectUrl) {
        toast.info("Redirecting to PayPal...");
        window.location.assign(res.redirectUrl);
      } else {
        throw new Error("PayPal authorization URL was not received.");
      }
    } catch (err) {
      console.error("Checkout Payment Error:", err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Payment initiation failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-poppins pb-20">
      <CommonHeader title="Secure Checkout" />

      {/* Top Breadcrumb & Trust Banner */}
      <div className="bg-white border-b border-slate-200 mt-20 sm:mt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 font-bold text-slate-700 hover:text-teal-700 transition cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to Itinerary</span>
          </button>

          <div className="flex items-center gap-2 text-emerald-700 font-bold">
            <Lock size={13} />
            <span>256-Bit SSL Encrypted PayPal Checkout</span>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Passenger & Contact Info */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Lead Traveller Information
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Names must match valid government ID or passport presented during travel.
                  </p>
                </div>
                {isAuthenticated && (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Logged in as {user?.name || "Member"}
                  </span>
                )}
              </div>

              {/* Saved Co-Traveller Profiles Selection */}
              {isAuthenticated && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <TravellerSelector
                    onSelect={handleSelectTraveller}
                    selectedId={leadPassenger.travellerId}
                    filterType="Adult"
                    title="1-Click Autofill from Saved Profiles"
                  />
                </div>
              )}

              {/* Title & Name Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Title
                  </label>
                  <select
                    value={leadPassenger.title}
                    onChange={(e) =>
                      setLeadPassenger({ ...leadPassenger, title: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:border-teal-600"
                  >
                    <option value="Mr">Mr.</option>
                    <option value="Mrs">Mrs.</option>
                    <option value="Ms">Ms.</option>
                    <option value="Miss">Miss</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={leadPassenger.firstName}
                    onChange={(e) =>
                      setLeadPassenger({ ...leadPassenger, firstName: e.target.value })
                    }
                    placeholder="e.g. Vikram"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={leadPassenger.lastName}
                    onChange={(e) =>
                      setLeadPassenger({ ...leadPassenger, lastName: e.target.value })
                    }
                    placeholder="e.g. Malhotra"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              {/* Email & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={leadPassenger.email}
                    onChange={(e) =>
                      setLeadPassenger({ ...leadPassenger, email: e.target.value })
                    }
                    placeholder="email@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Your e-ticket & receipt will be sent here.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mobile Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={leadPassenger.phone}
                    onChange={(e) =>
                      setLeadPassenger({ ...leadPassenger, phone: e.target.value })
                    }
                    placeholder="+91 9876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Used for SMS itinerary alerts and status updates.
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method Banner */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <CreditCard size={18} className="text-teal-600" />
                <span>Payment Method</span>
              </h3>
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center">
                    PP
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">
                      PayPal Smart Checkout
                    </h4>
                    <p className="text-xs text-slate-500">
                      Pay via PayPal balance, connected bank account, or Credit/Debit Card in USD.
                    </p>
                  </div>
                </div>
                <BadgeCheck size={20} className="text-blue-600 shrink-0" />
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Pay Button */}
          <div className="lg:col-span-4 sticky top-28 space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-black text-base text-slate-900">Order Summary</h3>
                <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md uppercase">
                  {bookingType}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Itinerary</span>
                  <span className="font-bold text-slate-900 max-w-[160px] truncate text-right">
                    {title}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Booking Reference</span>
                  <span className="font-mono font-bold text-slate-700">
                    #{bookingId || "Held Item"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxes & Supplier Fees</span>
                  <span className="font-bold text-emerald-700">Included</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Total Payable
                  </span>
                  <span className="text-[11px] text-slate-400">All inclusive</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-slate-900 block">
                    ₹{Math.round(totalAmount).toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold block">
                    ≈ ${estimatedUSD} USD via PayPal
                  </span>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <span>
                    I accept the booking terms and cancellation policy.
                  </span>
                </label>
              </div>

              {/* Pay Now Button */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handlePayNow}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Connecting to PayPal...</span>
                  </>
                ) : (
                  <>
                    <Lock size={15} />
                    <span>Pay with PayPal (${estimatedUSD} USD)</span>
                    <ChevronRight size={16} />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <ShieldCheck size={13} className="text-emerald-600" />
                  <span>Instant Confirmation & Buyer Protection Guaranteed</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <ProfileCompletionModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        prefillData={{
          firstName: leadPassenger.firstName,
          lastName: leadPassenger.lastName,
          email: leadPassenger.email,
          phone: leadPassenger.phone,
          title: leadPassenger.title,
        }}
        bookingType={bookingType}
        onSuccess={(savedTravellerId, updatedData) => {
          if (updatedData?.user) {
            setLeadPassenger((prev) => ({
              ...prev,
              firstName: updatedData.user.firstName || prev.firstName,
              lastName: updatedData.user.lastName || prev.lastName,
              email: updatedData.user.email || prev.email,
              phone: updatedData.user.phone || prev.phone,
              travellerId: savedTravellerId || prev.travellerId,
            }));
          }
          toast.info("Profile verified! Proceeding to payment...");
          setTimeout(() => {
            handlePayNow();
          }, 350);
        }}
      />
    </div>
  );
};

export default CheckoutPage;
