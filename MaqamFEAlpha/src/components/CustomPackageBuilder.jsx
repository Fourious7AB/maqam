/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect } from "react";
import {
  X,
  Plane,
  Hotel,
  Check,
  Calendar,
  ShieldCheck,
  MapPin,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Ban,
  UserCheck,
  CreditCard,
  Plus,
  Luggage,
} from "lucide-react";
import packageService from "../services/packageService";
import { travellerService } from "../services/travellerService";
import { toast } from "react-toastify";
import { useAuth } from "../store/authContext";
import { normalizePackageData } from "../utils/packageNormalizer.js";

const DEFAULT_TAX_PERCENTAGE = 5.0;

export const GlassInput = (props) => <input {...props} />;
export { normalizePackageData };

/**
 * Package Traveling Plan & One-Click Booking Modal
 * Replaces the old swapping logic with a high-fidelity traveling plan presentation,
 * saved-traveller detection / quick-add form, and direct PayPal checkout execution.
 */
const CustomPackageBuilder = ({
  open,
  onClose,
  packageId,
  initialPackage = null,
  initialBookingId = null,
  initialStep = "booking",
  onBookingCreated,
}) => {
  const [pkg, setPkg] = useState(() => (initialPackage ? normalizePackageData(initialPackage) : null));
  const [loading, setLoading] = useState(() => !initialPackage || Boolean(initialBookingId));
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Active view: "booking" | "snapshot"
  const [activeStep, setActiveStep] = useState(initialBookingId ? "snapshot" : initialStep || "booking");
  const [currentBooking, setCurrentBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Auth context
  const { isAuthenticated, user: currentUser, openLoginModal } = useAuth();
  const isLoggedIn = Boolean(isAuthenticated);

  // Saved Travellers State
  const [savedTravellers, setSavedTravellers] = useState([]);
  const [selectedSavedId, setSelectedSavedId] = useState(null);
  const [isAddingNewTraveller, setIsAddingNewTraveller] = useState(false);

  // Lead Traveller Form State
  const [leadForm, setLeadForm] = useState({
    title: "Mr",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    saveToProfile: true,
  });

  // Additional Co-Travellers (when quantity > 1)
  const [coTravellers, setCoTravellers] = useState([]);

  const handleClose = () => {
    setActiveStep("booking");
    setError("");
    setCurrentBooking(null);
    setIsProcessing(false);
    onClose();
  };

  // Quantity change handler: clamps quantity and synchronizes co-travellers list
  const handleQuantityChange = (newQ) => {
    const maxSlots = pkg?.availableSlots || 20;
    const clamped = Math.max(1, Math.min(maxSlots, newQ));
    setQuantity(clamped);

    setCoTravellers((prev) => {
      const needed = Math.max(0, clamped - 1);
      const updated = [...prev];
      if (needed > updated.length) {
        for (let i = updated.length; i < needed; i++) {
          updated.push({
            title: "Mr",
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
          });
        }
      } else if (needed < updated.length) {
        updated.splice(needed);
      }
      return updated;
    });
  };

  // Fetch package details
  useEffect(() => {
    if (!open) return;

    if (initialBookingId) {
      let isMounted = true;
      packageService
        .getPackageBooking(initialBookingId)
        .then((snapshot) => {
          if (!isMounted) return;
          if (snapshot) {
            setCurrentBooking(snapshot);
            setActiveStep("snapshot");
          }
        })
        .catch((err) => console.warn("Failed to load initial booking:", err))
        .finally(() => {
          if (isMounted) setLoading(false);
        });
      return () => {
        isMounted = false;
      };
    }

    const currentId = packageId || initialPackage?._id || initialPackage?.id;
    if (!currentId) {
      if (initialPackage) {
        let isMounted = true;
        Promise.resolve().then(() => {
          if (isMounted) {
            setPkg(normalizePackageData(initialPackage));
            setLoading(false);
          }
        });
        return () => {
          isMounted = false;
        };
      }

      // Fallback: fetch active package from public catalog
      let isMounted = true;
      packageService
        .getPackages({ limit: 1 })
        .then((res) => {
          if (!isMounted) return;
          const pkgList = res?.packages || res?.data || (Array.isArray(res) ? res : []);
          if (pkgList && pkgList[0]) {
            setPkg(normalizePackageData(pkgList[0]));
          } else {
            setPkg(
              normalizePackageData({
                title: "Curated Umrah Spiritual Package",
                destination: "Makkah & Madinah",
                duration: "5 Nights / 6 Days",
                sellPrice: 45000,
                availableSlots: 10,
              })
            );
          }
        })
        .catch(() => {
          if (isMounted) {
            setPkg(
              normalizePackageData({
                title: "Curated Umrah Spiritual Package",
                destination: "Makkah & Madinah",
                duration: "5 Nights / 6 Days",
                sellPrice: 45000,
                availableSlots: 10,
              })
            );
          }
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }

    let isMounted = true;

    packageService
      .getPackageDetail(currentId)
      .then((data) => {
        if (!isMounted) return;
        setPkg(normalizePackageData(data));
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("Failed to load package details:", err);
        if (initialPackage) {
          setPkg(normalizePackageData(initialPackage));
        } else {
          setError(err.response?.data?.message || "Failed to load package details.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, packageId, initialPackage, initialBookingId]);

  // Load saved travellers from user profile on modal open
  useEffect(() => {
    if (!open) return;

    let isMounted = true;

    const loadTravellersAndUser = async () => {
      let list = [];
      try {
        list = await travellerService.getAllTravellers();
      } catch (err) {
        console.warn("Could not load saved travellers:", err);
      }
      if (!isMounted) return;

      const validList = Array.isArray(list) ? list : [];
      setSavedTravellers(validList);

      // Check current user from auth or localStorage
      const localUser = (() => {
        try {
          return (
            JSON.parse(localStorage.getItem("user") || "null") ||
            JSON.parse(localStorage.getItem("maqam_customer_user") || "null") ||
            JSON.parse(sessionStorage.getItem("user") || "null")
          );
        } catch {
          return null;
        }
      })();
      const activeUser = currentUser || localUser;

      if (validList.length > 0) {
        const lead = validList.find((t) => t.isLead || t.isDefault) || validList[0];
        const tId = lead._id || lead.id;
        setSelectedSavedId(tId);
        setIsAddingNewTraveller(false);
        setLeadForm({
          title: lead.title || "Mr",
          firstName: lead.firstName || "",
          lastName: lead.lastName || "",
          email: lead.email || activeUser?.email || "",
          phone: lead.phone || activeUser?.phone || "",
          saveToProfile: false,
          travellerId: tId,
        });
      } else if (activeUser) {
        setSelectedSavedId(null);
        setIsAddingNewTraveller(true);
        const fullName = activeUser.name || activeUser.fullName || "";
        const parts = fullName.trim().split(" ");
        const firstName = activeUser.firstName || parts[0] || "";
        const lastName = activeUser.lastName || parts.slice(1).join(" ") || "";
        setLeadForm({
          title: activeUser.title || "Mr",
          firstName,
          lastName,
          email: activeUser.email || "",
          phone: activeUser.phone || "",
          saveToProfile: true,
          travellerId: null,
        });
      } else {
        setSelectedSavedId(null);
        setIsAddingNewTraveller(true);
        setLeadForm({
          title: "Mr",
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          saveToProfile: true,
          travellerId: null,
        });
      }
    };

    loadTravellersAndUser();

    return () => {
      isMounted = false;
    };
  }, [open, isLoggedIn, currentUser]);

  // Handle selecting a saved traveller card
  const handleSelectSavedTraveller = (t) => {
    const tId = t._id || t.id;
    setSelectedSavedId(tId);
    setIsAddingNewTraveller(false);
    setLeadForm({
      title: t.title || "Mr",
      firstName: t.firstName || "",
      lastName: t.lastName || "",
      email: t.email || "",
      phone: t.phone || "",
      saveToProfile: false,
      travellerId: tId,
    });
  };

  // Pricing calculations
  const baseSellPrice = Number(pkg?.sellPrice || 0);
  const subtotal = baseSellPrice * quantity;
  const taxAmount = Math.round(subtotal * (DEFAULT_TAX_PERCENTAGE / 100));
  const totalAmount = subtotal + taxAmount;
  const approxUSD = Math.round(totalAmount * 0.012);

  // Validate form before payment
  const validateTravellers = () => {
    if (!leadForm.firstName?.trim() || !leadForm.lastName?.trim()) {
      setError("Please enter the Lead Traveller's first and last name.");
      return false;
    }
    const cleanEmail = leadForm.email?.trim() || "";
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address for the Lead Traveller.");
      return false;
    }
    const cleanPhone = String(leadForm.phone || "").replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 7 || cleanPhone.length > 15) {
      setError("Please enter a valid contact phone number (7-15 digits).");
      return false;
    }

    // Validate co-travellers if any
    for (let i = 0; i < coTravellers.length; i++) {
      const co = coTravellers[i];
      if (!co.firstName?.trim() || !co.lastName?.trim()) {
        setError(`Please enter the full name for Co-Traveller ${i + 2}.`);
        return false;
      }
    }

    return true;
  };

  /**
   * One-click "Make Payment" handler:
   * 1. Validates traveller info
   * 2. Checks/prompts auth
   * 3. Calls packageService.bookPackage(...)
   * 4. Calls packageService.createPayPalOrder(...)
   * 5. Redirects immediately to PayPal checkout
   */
  const handleMakePayment = async () => {
    setError("");

    if (!validateTravellers()) {
      return;
    }

    if (!isLoggedIn) {
      openLoginModal({
        message: "Please sign in to confirm your package booking & proceed to payment.",
        onSuccess: () => {
          toast.success("Signed in! You can now proceed to payment.");
        },
      });
      return;
    }

    const currentId = pkg?._id || pkg?.id;
    if (!currentId) {
      setError("Package reference is missing. Please refresh and try again.");
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Prepare Lead Traveller (guarantee a valid MongoDB ObjectId travellerId)
      let leadTravellerId = leadForm.travellerId;
      if (!leadTravellerId || !/^[0-9a-fA-F]{24}$/.test(String(leadTravellerId))) {
        try {
          const created = await travellerService.createTraveller({
            title: leadForm.title || "Mr",
            firstName: leadForm.firstName.trim(),
            lastName: leadForm.lastName.trim(),
            email: leadForm.email.trim(),
            phone: leadForm.phone.trim().replace(/\D/g, "") || "9876543210",
            cellCountryCode: "+91",
            passengerType: "Adult",
            gender: ["Mr", "Mstr"].includes(leadForm.title) ? "Male" : "Female",
            dateOfBirth: new Date("1992-05-15").toISOString(),
          });
          if (created?._id || created?.id) {
            leadTravellerId = created._id || created.id;
          }
        } catch (tErr) {
          console.warn("Auto-saving lead traveller to profile skipped:", tErr?.message);
        }
      }

      if (!leadTravellerId || !/^[0-9a-fA-F]{24}$/.test(String(leadTravellerId))) {
        throw new Error("A valid traveller profile is required for the lead passenger.");
      }

      const preparedTravellers = [
        {
          travellerId: String(leadTravellerId),
          isLead: true,
          title: leadForm.title || "Mr",
          firstName: leadForm.firstName.trim(),
          lastName: leadForm.lastName.trim(),
          email: leadForm.email.trim(),
          phone: leadForm.phone.trim(),
          passengerType: "Adult",
          gender: ["Mr", "Mstr"].includes(leadForm.title) ? "Male" : "Female",
        },
      ];

      // Add co-travellers (guarantee valid MongoDB ObjectId travellerId for each)
      for (let i = 0; i < coTravellers.length; i++) {
        const co = coTravellers[i];
        let coTravellerId = co.travellerId;
        if (!coTravellerId || !/^[0-9a-fA-F]{24}$/.test(String(coTravellerId))) {
          try {
            const created = await travellerService.createTraveller({
              title: co.title || "Mr",
              firstName: co.firstName?.trim() || `Guest${i + 1}`,
              lastName: co.lastName?.trim() || "Traveler",
              email: co.email?.trim() || leadForm.email.trim(),
              phone: co.phone?.trim()?.replace(/\D/g, "") || leadForm.phone.trim().replace(/\D/g, "") || "9876543210",
              cellCountryCode: "+91",
              passengerType: "Adult",
              gender: ["Mr", "Mstr"].includes(co.title) ? "Male" : "Female",
              dateOfBirth: new Date("1995-05-15").toISOString(),
            });
            if (created?._id || created?.id) {
              coTravellerId = created._id || created.id;
            }
          } catch (coErr) {
            console.warn("Auto-saving co-traveller to profile skipped:", coErr?.message);
          }
        }

        if (!coTravellerId || !/^[0-9a-fA-F]{24}$/.test(String(coTravellerId))) {
          throw new Error(`A valid traveller profile is required for co-traveller ${i + 1}.`);
        }

        preparedTravellers.push({
          travellerId: String(coTravellerId),
          isLead: false,
          title: co.title || "Mr",
          firstName: co.firstName?.trim() || `Guest${i + 1}`,
          lastName: co.lastName?.trim() || "Traveler",
          email: co.email?.trim() || leadForm.email.trim(),
          phone: co.phone?.trim() || leadForm.phone.trim(),
          passengerType: "Adult",
          gender: ["Mr", "Mstr"].includes(co.title) ? "Male" : "Female",
        });
      }

      // 2. Call backend package booking endpoint (POST /api/v1/packages/book)
      const bookingPayload = {
        packageId: currentId,
        quantity: Math.max(1, Number(quantity) || 1),
        travellers: preparedTravellers,
        excludedOfferIds: [],
        swappedOffers: [],
        customSelections: {
          totalAmount,
          packageTitle: pkg.title,
          destination: pkg.destination,
          travelDates: pkg.duration || "5 Nights / 6 Days",
        },
      };

      const bookingRes = await packageService.bookPackage(bookingPayload);
      const bookingId =
        bookingRes.bookingId ||
        bookingRes._id ||
        bookingRes.id ||
        bookingRes.data?.bookingId ||
        bookingRes.data?._id;

      if (!bookingId) {
        throw new Error(
          bookingRes.message || "Failed to create package booking reservation on the server."
        );
      }

      const finalBookingObj = {
        _id: bookingId,
        bookingId,
        package: pkg,
        packageId: currentId,
        status: bookingRes.status || "pending",
        totalAmount: bookingRes.totalAmount || totalAmount,
        currency: bookingRes.currency || "INR",
        quantity,
        travellers: preparedTravellers,
        claimedUnits: bookingRes.claimedUnits || [],
        createdAt: new Date().toISOString(),
      };

      // Save references in storage
      sessionStorage.setItem("lastPackageBookingId", String(bookingId));
      sessionStorage.setItem("lastPaymentBookingType", "package");
      sessionStorage.setItem("lastPackageBookingData", JSON.stringify(finalBookingObj));

      try {
        const stored = JSON.parse(
          localStorage.getItem("maqam_user_package_bookings") || "[]"
        );
        const filtered = stored.filter((b) => (b._id || b.bookingId) !== bookingId);
        localStorage.setItem(
          "maqam_user_package_bookings",
          JSON.stringify([finalBookingObj, ...filtered])
        );
      } catch {
        // ignore storage errors
      }

      if (onBookingCreated) {
        onBookingCreated(finalBookingObj);
      }

      // 3. Immediately initiate PayPal order (POST /api/v1/payments/paypal/create-order)
      const returnUrl = `${window.location.origin}/payment/paypal/success?type=package&bookingId=${bookingId}`;
      const cancelUrl = `${window.location.origin}/payment/paypal/cancel?type=package&bookingId=${bookingId}`;

      const paymentRes = await packageService.createPayPalOrder({
        bookingId,
        amount: totalAmount,
        returnUrl,
        cancelUrl,
      });

      const rawPayment = paymentRes?.data || paymentRes;
      const paymentData = rawPayment?.data || rawPayment || {};
      const redirectUrl =
        paymentRes?.redirectUrl ||
        paymentData.redirectUrl ||
        paymentData.approveUrl ||
        paymentData.links?.find((l) => l.rel === "approve" || l.rel === "payer-action")?.href ||
        rawPayment?.redirectUrl;

      sessionStorage.setItem(
        "lastPackagePaymentData",
        JSON.stringify(paymentData || {})
      );

      if (redirectUrl) {
        toast.info("Booking created! Redirecting to PayPal secure checkout...");
        window.location.assign(redirectUrl);
      } else {
        throw new Error(
          paymentData.message ||
            "PayPal checkout approval link was not returned by the server. Please try again."
        );
      }
    } catch (err) {
      console.error("Package booking / payment error:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to initiate payment. Please verify your details.";
      setError(errMsg);
      toast.error(errMsg);
      setIsProcessing(false);
    }
  };

  // Handle Cancellation (when viewing snapshot)
  const handleExecuteCancellation = async () => {
    const bookingIdentifier =
      currentBooking?._id || currentBooking?.id || currentBooking?.bookingId;
    if (!bookingIdentifier) return;
    setCancelling(true);
    try {
      const res = await packageService.cancelPackageBooking(
        bookingIdentifier,
        "User cancelled from package modal"
      );
      toast.success("Package booking cancelled. Reserved inventory released.");
      const updated = res?.booking || {
        ...currentBooking,
        status: "cancelled",
      };
      setCurrentBooking(updated);
      if (onBookingCreated) onBookingCreated(updated);
    } catch (err) {
      console.error("Cancel booking error:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to cancel booking.");
    } finally {
      setCancelling(false);
    }
  };

  if (!open) return null;

  const defaultFlight = pkg?.flights?.[0] || null;
  const defaultHotel = pkg?.hotels?.[0] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-[#0c1427] text-slate-900 dark:text-slate-100 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden font-poppins"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= MODAL HEADER ================= */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#0f172a]/95 backdrop-blur">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/25">
              <Luggage size={22} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  Curated Travel Plan
                </span>
                {pkg?.destination && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                    <MapPin size={12} className="text-emerald-500" /> {pkg.destination}
                  </span>
                )}
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  • {pkg?.duration || "5 Nights / 6 Days"}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight mt-0.5">
                {pkg?.title || "Book Travel Package"}
              </h2>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* ================= MODAL BODY ================= */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-medium">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <RefreshCw size={32} className="animate-spin text-emerald-500" />
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Loading travel plan details & inventory slots...
              </p>
            </div>
          ) : activeStep === "snapshot" && currentBooking ? (
            /* ================= BOOKING SNAPSHOT VIEW ================= */
            <div className="space-y-6 max-w-2xl mx-auto">
              <div
                className={`p-5 rounded-2xl border flex items-center justify-between ${
                  currentBooking.status === "cancelled"
                    ? "border-rose-300 dark:border-rose-900/80 bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100"
                    : "border-emerald-200 dark:border-emerald-900/80 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${
                      currentBooking.status === "cancelled" ? "bg-rose-600" : "bg-emerald-600"
                    }`}
                  >
                    {currentBooking.status === "cancelled" ? <Ban size={22} /> : <CheckCircle2 size={22} />}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider block opacity-75">
                      Booking Status
                    </span>
                    <h3 className="text-base sm:text-lg font-bold">
                      {currentBooking.status === "cancelled"
                        ? "Booking Cancelled"
                        : "Package Booking Reserved"}
                    </h3>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/70 dark:bg-slate-800">
                  {currentBooking.status}
                </span>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1427] space-y-3.5 text-xs">
                <div className="flex justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Booking Reference</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    #{currentBooking._id || currentBooking.bookingId}
                  </span>
                </div>
                <div className="flex justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Package Title</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {currentBooking.packageSnapshot?.title || pkg?.title || "Customized Package"}
                  </span>
                </div>
                <div className="flex justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Destination</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {currentBooking.packageSnapshot?.destination || pkg?.destination || "Destination"}
                  </span>
                </div>
                <div className="flex justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Travellers Booked</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {currentBooking.quantity || 1} {currentBooking.quantity === 1 ? "Person" : "Persons"}
                  </span>
                </div>
                <div className="flex justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Total Price</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    ₹ {Number(currentBooking.totalAmount || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {currentBooking.status !== "cancelled" && currentBooking.status !== "confirmed" && (
                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">
                      Need to cancel this reservation?
                    </h4>
                    <p className="text-[11px] text-rose-600/90 dark:text-rose-400">
                      Cancelling releases claimed flight and hotel units immediately.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={handleExecuteCancellation}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {cancelling ? "Cancelling..." : "Cancel Reservation"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ================= MAIN BOOKING & TRAVELING PLAN VIEW ================= */
            <div className="space-y-7">
              {/* ---------------- 1. TRAVELING PLAN OVERVIEW ---------------- */}
              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <Sparkles size={13} />
                      Package Traveling Plan
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      Included Flight, Hotel & Day-by-Day Journey
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <ShieldCheck size={13} /> 100% Halal Verified
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      <CheckCircle2 size={13} /> Direct Stock Lock
                    </span>
                  </div>
                </div>

                {/* Logistics Strip: Flights & Hotels Included */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Flight Component */}
                  {defaultFlight && (
                    <div className="p-3.5 rounded-xl bg-white dark:bg-[#0c1427] border border-slate-200/90 dark:border-slate-800 flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                        <Plane size={18} />
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {defaultFlight.airline}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 shrink-0">
                            Flight Included
                          </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                          {defaultFlight.origin || "DEL"} &rarr; {defaultFlight.destination || pkg?.destination || "JED"} • {defaultFlight.cabinClass || "Economy Class"}
                        </p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                          ✓ Baggage & In-flight Halal Meals Included
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Hotel Component */}
                  {defaultHotel && (
                    <div className="p-3.5 rounded-xl bg-white dark:bg-[#0c1427] border border-slate-200/90 dark:border-slate-800 flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
                        <Hotel size={18} />
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {defaultHotel.hotelName}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 shrink-0">
                            Hotel Stay
                          </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                          {defaultHotel.roomType || "Standard Room"} • {defaultHotel.meals?.join(", ") || "Breakfast Included"}
                        </p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                          ✓ Verified Halal Accommodation & 24/7 Desk
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Day-by-Day Timeline / Plan */}
                <div className="mt-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2.5 flex items-center gap-1.5">
                    <Calendar size={14} className="text-emerald-600" />
                    <span>Day-by-Day Traveling Plan & Itinerary:</span>
                  </h4>
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {pkg?.itinerary?.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white dark:bg-[#0c1427] border border-slate-200/80 dark:border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold text-[10px] uppercase">
                            Day {item.day || idx + 1}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {item.title || `Day ${idx + 1} Itinerary`}
                          </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 leading-relaxed">
                          {item.description || item.activity || "Curated spiritual and cultural activities."}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ---------------- 2. TRAVELLERS / GUEST DETAILS ---------------- */}
              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0c1427] p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <UserCheck size={13} />
                      Traveller Information
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                      Lead Guest & Party Details
                    </h3>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500">Travellers:</span>
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(quantity - 1)}
                        disabled={quantity <= 1}
                        className="h-7 w-7 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-bold flex items-center justify-center disabled:opacity-30 shadow-xs cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-black text-sm text-emerald-600 dark:text-emerald-400">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(quantity + 1)}
                        disabled={quantity >= (pkg?.availableSlots || 20)}
                        className="h-7 w-7 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-bold flex items-center justify-center disabled:opacity-30 shadow-xs cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Saved Travellers Quick-Selector Bar if present */}
                {savedTravellers.length > 0 && (
                  <div className="space-y-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Sparkles size={13} className="text-emerald-600" />
                        Saved Profiles in your Account:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSavedId(null);
                          setIsAddingNewTraveller(true);
                          setLeadForm({
                            title: "Mr",
                            firstName: "",
                            lastName: "",
                            email: currentUser?.email || "",
                            phone: currentUser?.phone || "",
                            saveToProfile: true,
                            travellerId: null,
                          });
                        }}
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                          !selectedSavedId
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100"
                        }`}
                      >
                        <Plus size={13} />
                        <span>+ Add / Enter Different Guest</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {savedTravellers.map((trav) => {
                        const tId = trav._id || trav.id;
                        const isSelected = selectedSavedId === tId;
                        return (
                          <button
                            key={tId}
                            type="button"
                            onClick={() => handleSelectSavedTraveller(trav)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                              isSelected
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-400"
                            }`}
                          >
                            <div
                              className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] ${
                                isSelected
                                  ? "bg-white text-emerald-700"
                                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {isSelected ? <Check size={11} strokeWidth={3} /> : <UserCheck size={10} />}
                            </div>
                            <span>
                              {trav.title || "Mr"} {trav.firstName} {trav.lastName}
                            </span>
                            {trav.phone && (
                              <span
                                className={`text-[10px] opacity-75 font-mono ${
                                  isSelected ? "text-emerald-100" : "text-slate-400"
                                }`}
                              >
                                • {trav.phone}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Lead Traveller Form - ALWAYS VISIBLE */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Lead Guest Details:
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {selectedSavedId ? "✓ Autofilled from Saved Profile" : "Guest Entry"}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-1">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          Title
                        </label>
                        <select
                          value={leadForm.title}
                          onChange={(e) => setLeadForm({ ...leadForm, title: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1427] text-xs font-semibold focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="Mr">Mr</option>
                          <option value="Mrs">Mrs</option>
                          <option value="Ms">Ms</option>
                        </select>
                      </div>

                      <div className="sm:col-span-1.5">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          First Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rahul"
                          value={leadForm.firstName}
                          onChange={(e) => setLeadForm({ ...leadForm, firstName: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1427] text-xs font-semibold focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="sm:col-span-1.5">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Sharma"
                          value={leadForm.lastName}
                          onChange={(e) => setLeadForm({ ...leadForm, lastName: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1427] text-xs font-semibold focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="rahul@example.com"
                          value={leadForm.email}
                          onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1427] text-xs font-semibold focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="9876543210"
                          value={leadForm.phone}
                          onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1427] text-xs font-semibold focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {isLoggedIn && !selectedSavedId && (
                      <label className="flex items-center gap-2 pt-1 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={leadForm.saveToProfile}
                          onChange={(e) => setLeadForm({ ...leadForm, saveToProfile: e.target.checked })}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Save this traveller to my profile for faster future bookings</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Additional Co-Travellers Fields if quantity > 1 */}
                {coTravellers.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Co-Travellers ({coTravellers.length} additional guests):
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Required for flight tickets & hotel reservations
                      </span>
                    </div>

                    {coTravellers.map((co, idx) => {
                      const availableProfiles = savedTravellers.filter(
                        (t) => (t._id || t.id) !== selectedSavedId
                      );

                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                              Guest {idx + 2}
                            </span>
                            {availableProfiles.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400">Autofill:</span>
                                <select
                                  onChange={(e) => {
                                    const chosen = availableProfiles.find(
                                      (p) => (p._id || p.id) === e.target.value
                                    );
                                    if (chosen) {
                                      const copy = [...coTravellers];
                                      copy[idx] = {
                                        title: chosen.title || "Mr",
                                        firstName: chosen.firstName || "",
                                        lastName: chosen.lastName || "",
                                        email: chosen.email || leadForm.email,
                                        phone: chosen.phone || leadForm.phone,
                                        travellerId: chosen._id || chosen.id,
                                      };
                                      setCoTravellers(copy);
                                    }
                                  }}
                                  defaultValue=""
                                  className="text-[10px] py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1427] font-semibold text-emerald-700 dark:text-emerald-400"
                                >
                                  <option value="" disabled>
                                    Choose saved profile...
                                  </option>
                                  {availableProfiles.map((p) => (
                                    <option key={p._id || p.id} value={p._id || p.id}>
                                      {p.title || "Mr"} {p.firstName} {p.lastName}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                            <div className="sm:col-span-1">
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                Title
                              </label>
                              <select
                                value={co.title || "Mr"}
                                onChange={(e) => {
                                  const copy = [...coTravellers];
                                  copy[idx].title = e.target.value;
                                  setCoTravellers(copy);
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1427] text-xs font-semibold"
                              >
                                <option value="Mr">Mr</option>
                                <option value="Mrs">Mrs</option>
                                <option value="Ms">Ms</option>
                              </select>
                            </div>

                            <div className="sm:col-span-1.5">
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                Guest {idx + 2} First Name *
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="First Name"
                                value={co.firstName}
                                onChange={(e) => {
                                  const copy = [...coTravellers];
                                  copy[idx].firstName = e.target.value;
                                  setCoTravellers(copy);
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1427] text-xs font-semibold"
                              />
                            </div>

                            <div className="sm:col-span-1.5">
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                Guest {idx + 2} Last Name *
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="Last Name"
                                value={co.lastName}
                                onChange={(e) => {
                                  const copy = [...coTravellers];
                                  copy[idx].lastName = e.target.value;
                                  setCoTravellers(copy);
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1427] text-xs font-semibold"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                Email Address (optional)
                              </label>
                              <input
                                type="email"
                                placeholder={leadForm.email || "guest@example.com"}
                                value={co.email}
                                onChange={(e) => {
                                  const copy = [...coTravellers];
                                  copy[idx].email = e.target.value;
                                  setCoTravellers(copy);
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1427] text-xs"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                Phone Number (optional)
                              </label>
                              <input
                                type="tel"
                                placeholder={leadForm.phone || "Phone number"}
                                value={co.phone}
                                onChange={(e) => {
                                  const copy = [...coTravellers];
                                  copy[idx].phone = e.target.value;
                                  setCoTravellers(copy);
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1427] text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ---------------- 3. PRICING BREAKDOWN & MAKE PAYMENT CTA ---------------- */}
              <div className="p-5 sm:p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-slate-50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-[#0c1427] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/60 dark:border-slate-800 pb-3.5">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Payment & Confirmation
                    </span>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      All-Inclusive Package Booking Total
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Includes flight tickets, verified hotel room, transfers, and taxes.
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-500 block">Total Payable:</span>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-300">
                      ₹ {totalAmount.toLocaleString("en-IN")}
                    </div>
                    <span className="text-[11px] text-slate-500 font-semibold">
                      ≈ ${approxUSD} USD (₹{baseSellPrice.toLocaleString("en-IN")} × {quantity} + {DEFAULT_TAX_PERCENTAGE}% tax)
                    </span>
                  </div>
                </div>

                {/* Direct Make Payment (PayPal) Button */}
                <div className="space-y-2.5">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleMakePayment}
                    className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-black text-sm sm:text-base text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 shadow-xl shadow-emerald-600/25 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw size={20} className="animate-spin text-white" />
                        <span>Reserving Package & Connecting to PayPal...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard size={20} />
                        <span>Make Payment</span>
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>

                  <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-1">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <ShieldCheck size={14} /> Instant 30-min inventory lock
                    </span>
                    <span>•</span>
                    <span>PayPal Sandbox 256-bit SSL</span>
                    <span>•</span>
                    <span>Zero booking fees</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomPackageBuilder;
