import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Users,
  BadgeCheck,
  CheckCircle2,
  ShieldCheck,
  Lock,
  Sparkles,
  Building,
  Calendar,
  Clock,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Info,
  Check,
  ExternalLink,
  ChevronRight,
  CreditCard,
  RefreshCw,
  X,
} from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import CommonHeader from "../components/CommonHeader";
import ScrollToTop from "../components/ScrollToTop";
import paymentService from "../services/paymentService";
import offerService from "../services/offerService";
import api from "../components/stores/api";
import { useAuth } from "../store/authContext";
import { tokenService, getStoredAuthToken } from "../admin/services/tokenService";
import TravellerSelector from "../components/travellers/TravellerSelector";
import travellerService from "../services/travellerService";
import { isPhoneOnlyIncompleteUser } from "../utils/profileCompletionCheck";
import ProfileCompletionModal from "../components/user/ProfileCompletionModal";

const SPECIAL_REQUEST_OPTIONS = [
  "Non-Smoking Room",
  "Large Double Bed",
  "Twin Beds",
  "High Floor",
  "Quiet Room",
  "Late Check-in (after 6 PM)",
];

const SelectedRoomInformation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [preRecheckId, setPreRecheckId] = useState(null);
  const [saveGuestToProfile, setSaveGuestToProfile] = useState(false);

  const {
    isAuthenticated: ctxAuth,
    user: ctxUser,
    openLoginModal,
  } = useAuth();
  const reduxAuth = useSelector((state) => state.auth.isAuthenticated);
  const hasStoredToken = Boolean(
    tokenService.getAccessToken() ||
    tokenService.getRawStoredToken() ||
    (typeof localStorage !== "undefined" &&
      (localStorage.getItem("maqam_access_token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("AuthToken"))) ||
    (typeof sessionStorage !== "undefined" &&
      (sessionStorage.getItem("maqam_access_token") ||
        sessionStorage.getItem("accessToken") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("authToken") ||
        sessionStorage.getItem("AuthToken")))
  );
  const isAuthenticated = ctxAuth || reduxAuth || hasStoredToken;
  const reduxUser = useSelector((state) => state.auth.user);
  const loggedInUser = ctxUser || reduxUser || tokenService.getUserProfile();

  const stateData = location?.state || {};
  const cachedData = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("selectedHotelDetails") || "{}");
    } catch {
      return {};
    }
  })();

  const hotel = stateData.hotel || cachedData.hotel || {};
  const room = stateData.room || cachedData.room || {};
  const searchId =
    stateData.searchId ||
    cachedData.searchId ||
    localStorage.getItem("searchId");
  const hotelId =
    stateData.hotelId ||
    cachedData.hotelId ||
    hotel.id ||
    hotel.hotelId;
  const _roomId =
    room.id ||
    room.roomId ||
    stateData.roomId ||
    cachedData.roomId ||
    "";

  const isMongoId = (val) =>
    typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val.trim());

  const isExplicitOffer = Boolean(
    (stateData.isOffer === true ||
      cachedData.isOffer === true ||
      (isMongoId(hotelId) && !String(hotelId).toLowerCase().startsWith("hsid"))) &&
    (isMongoId(stateData.offerId) ||
      isMongoId(cachedData.offerId) ||
      isMongoId(hotel.offerId) ||
      isMongoId(hotelId))
  );

  const hasSearchSession =
    !isExplicitOffer &&
    Boolean(
      searchId ||
        stateData.searchId ||
        cachedData.searchId ||
        localStorage.getItem("searchId")
    );

  const isSrdvHotel =
    !isExplicitOffer &&
    Boolean(
      (typeof hotelId === "string" &&
        (hotelId.toLowerCase().startsWith("hsid") || hotelId.includes("-"))) ||
        hasSearchSession
    );

  const isOffer = isExplicitOffer;

  const targetOfferId = isOffer
    ? (stateData.offerId && isMongoId(stateData.offerId)
        ? stateData.offerId
        : cachedData.offerId && isMongoId(cachedData.offerId)
          ? cachedData.offerId
          : hotel.offerId && isMongoId(hotel.offerId)
            ? hotel.offerId
            : isMongoId(hotelId)
              ? hotelId
              : null)
    : null;

  const savedSearch = (() => {
    try {
      return JSON.parse(localStorage.getItem("hotelSearch") || "{}");
    } catch {
      return {};
    }
  })();

  // Retrieve user info for guest form auto-fill
  const localUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();
  const user = loggedInUser || localUser;

  // Saved draft restoration
  const savedDraft = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("hotel_guest_draft") || "null");
    } catch {
      return null;
    }
  })();

  // Guest Details State
  const [guest, setGuest] = useState({
    title: savedDraft?.title || "Mr",
    firstName: savedDraft?.firstName || user?.firstName || user?.name?.split(" ")?.[0] || "",
    lastName:
      savedDraft?.lastName ||
      user?.lastName ||
      user?.name?.split(" ")?.slice(1)?.join(" ") ||
      "",
    email: savedDraft?.email || user?.email || "",
    phone: savedDraft?.phone || user?.phone || "",
    pan: (savedDraft?.pan || user?.pan || "EXVPR5555M").toUpperCase(),
    age: savedDraft?.age || 30,
    savedTravellerId: savedDraft?.savedTravellerId || null,
    specialRequests: savedDraft?.specialRequests || [],
  });

  // Sync user details when user logs in while on this screen
  useEffect(() => {
    if (user) {
      setGuest((prev) => ({
        ...prev,
        firstName: prev.firstName || user.firstName || user.name?.split(" ")?.[0] || "",
        lastName:
          prev.lastName ||
          user.lastName ||
          user.name?.split(" ")?.slice(1)?.join(" ") ||
          "",
        email: prev.email || user.email || "",
        phone: prev.phone || user.phone || "",
        pan: prev.pan || (user.pan || "EXVPR5555M").toUpperCase(),
      }));
    }
  }, [user]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleSelectSavedTraveller = (trav) => {
    if (!trav) return;
    const computedAge = trav.dateOfBirth
      ? Math.max(
          18,
          Math.floor(
            (new Date() - new Date(trav.dateOfBirth)) /
              (365.25 * 24 * 60 * 60 * 1000)
          )
        )
      : 30;

    const profilePan = (trav.pan || trav.panNumber || trav.PAN || "").toUpperCase();

    setGuest((prev) => ({
      ...prev,
      title: trav.title || prev.title,
      firstName: trav.firstName || prev.firstName,
      lastName: trav.lastName || prev.lastName,
      email: trav.email || prev.email,
      phone: trav.phone || prev.phone,
      pan: profilePan || prev.pan,
      age: computedAge,
      savedTravellerId: trav._id || trav.id || null,
    }));
    toast.success(`Autofilled from saved profile: ${trav.firstName} ${trav.lastName}`);
  };

  // Proactively run background rate lock upon landing to pre-acquire recheckId
  // Decouples room verification from checkout so booking does not wait or block the customer!
  useEffect(() => {
    let isMounted = true;
    const prefetchRateLock = async () => {
      if (isOffer) return; // Never invoke SRDV rate check on retail offers
      const activeSearchId = searchId || localStorage.getItem("searchId");
      const activeHotelId = hotelId || hotel.id;
      if (!activeSearchId || !activeHotelId) return;

      const targetRoomId =
        room.roomId ||
        room.id ||
        room.roomCode ||
        room.RoomCode ||
        room.ratePlanCode ||
        room.RatePlanCode ||
        room.code ||
        _roomId ||
        "1";

      try {
        const payload = {
          searchId: activeSearchId,
          hotelId: String(activeHotelId),
          selectedRooms: [{ roomId: String(targetRoomId), quantity: 1 }],
        };
        const res = await api.post("/api/v1/hotels/recheck", payload);
        const acquiredId = res.data?.data?.recheckId || res.data?.recheckId;
        if (isMounted && acquiredId) {
          setPreRecheckId(acquiredId);
        }
      } catch (err) {
        console.warn("Background rate lock prefetch:", err?.message);
      }
    };
    prefetchRateLock();
    return () => {
      isMounted = false;
    };
  }, [searchId, hotelId, room, _roomId]);

  const hotelName = hotel.name || hotel.hotelName || "Hotel Details";
  const hotelAddress =
    hotel.address ||
    [hotel.city, hotel.country].filter(Boolean).join(", ") ||
    savedSearch.cityName ||
    "";
  const hotelRating = Number(hotel.rating || 4.0).toFixed(1);
  const hotelImage =
    hotel.imageUrls?.[0] ||
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600";



  const roomName = room.name || "Standard Room";
  const mealType = room.board || "Room Only";
  const nights = room.nights || 1;
  const rawRoomRate = room.retailPrice || room.price || 2500;
  const roomPrice = Number(rawRoomRate);
  const rawTotal = room.totalPrice ? room.totalPrice : roomPrice * nights;
  const totalAmount = Number(rawTotal);
  const isRefundable = Boolean(room.refundable);

  // Estimate USD for PayPal conversion
  const estimatedUSD = (totalAmount * 0.012).toFixed(2);

  // Format Dates
  const formatDisplayDate = (dateStr, defaultStr) => {
    if (!dateStr) return defaultStr;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return defaultStr;
      return d.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return defaultStr;
    }
  };

  const checkInDisplay = formatDisplayDate(
    savedSearch.checkIn,
    "Thu, 03 Sept 2026",
  );
  const checkOutDisplay = formatDisplayDate(
    savedSearch.checkOut,
    "Fri, 04 Sept 2026",
  );

  const toggleSpecialRequest = (item) => {
    setGuest((prev) => {
      const exists = prev.specialRequests.includes(item);
      return {
        ...prev,
        specialRequests: exists
          ? prev.specialRequests.filter((r) => r !== item)
          : [...prev.specialRequests, item],
      };
    });
  };

  // ─── PROCEED TO PAYMENT (PAYPAL) ──────────────────────────────────
  const handleProceedToPayment = async () => {
    // Guard against simultaneous double-clicks synchronously
    if (isSubmittingRef.current || isSubmitting) return;

    if (!isAuthenticated) {
      openLoginModal({
        message: "Please log in or register to complete your reservation.",
        onSuccess: (authenticatedUser) => {
          toast.success("Signed in!");
          const loggedIn = authenticatedUser || user;
          if (isPhoneOnlyIncompleteUser(loggedIn)) {
            toast.warn(
              "Edit your profile first then add that as traveler and then proceed to hotel booking."
            );
            setShowProfileModal(true);
          } else {
            toast.success("You can now proceed to payment.");
          }
        },
      });
      return;
    }

    if (isPhoneOnlyIncompleteUser(user)) {
      toast.warn(
        "Edit your profile first then add that as traveler and then proceed to hotel booking."
      );
      setShowProfileModal(true);
      return;
    }

    if (!guest.firstName.trim() || guest.firstName.trim().length < 2) {
      toast.error("Please enter a valid First Name (at least 2 characters).");
      return;
    }
    if (!guest.lastName.trim()) {
      toast.error("Please enter a valid Last Name.");
      return;
    }
    if (
      !guest.email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email.trim())
    ) {
      toast.error("Please enter a valid email address for your confirmation.");
      return;
    }
    if (!guest.phone.trim() || guest.phone.trim().replace(/\D/g, "").length < 7) {
      toast.error("Please enter a valid mobile number.");
      return;
    }

    if (!guest.pan?.trim()) {
      toast.error("PAN Card Number is mandatory for hotel bookings.");
      return;
    }

    const cleanPan = guest.pan.trim().toUpperCase();
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(cleanPan)) {
      toast.error(
        "Please enter a valid 10-character PAN Card Number (e.g. EXVPR5555M)."
      );
      return;
    }

    const guestAge = Number(guest.age) || 30;
    if (guestAge < 18 || guestAge > 120) {
      toast.error("Primary guest age must be 18 years or older.");
      return;
    }

    if (!agreedToTerms) {
      toast.error("Please accept the booking terms & cancellation policy.");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      toast.info("Verifying room availability & locking live fare...");

      // Prepare guest object (both PascalCase for supplier and camelCase for internal validator)
      const guestObj = {
        Title: guest.title || "Mr",
        FirstName: guest.firstName.trim(),
        LastName: guest.lastName.trim(),
        Phoneno: guest.phone.trim(),
        Email: guest.email.trim(),
        PaxType: 1,
        LeadPassenger: true,
        Age: guestAge,
        PAN: cleanPan,

        title: guest.title || "Mr",
        firstName: guest.firstName.trim(),
        lastName: guest.lastName.trim(),
        email: guest.email.trim(),
        phone: guest.phone.trim(),
        type: "adult",
        leadGuest: true,
        age: guestAge,
        pan: cleanPan,
      };
      // Connect guest with user profile if save checkbox is checked
      if (saveGuestToProfile && isAuthenticated && !guest.savedTravellerId) {
        try {
          const dob = new Date(Date.now() - guestAge * 365.25 * 24 * 60 * 60 * 1000).toISOString();
          const cleanPhone = String(guest.phone).replace(/\D/g, "");
          const newTrav = await travellerService.createTraveller({
            title: guest.title || "Mr",
            firstName: guest.firstName.trim(),
            lastName: guest.lastName.trim(),
            email: guest.email.trim().toLowerCase(),
            phone: cleanPhone,
            cellCountryCode: "+91",
            passengerType: "Adult",
            gender: ["Mr", "Mstr"].includes(guest.title) ? "Male" : "Female",
            dateOfBirth: dob,
            pan: cleanPan,
          });
          const newTravId = newTrav?._id || newTrav?.id;
          if (newTravId) {
            guestObj.travellerId = String(newTravId);
            setGuest((prev) => ({ ...prev, savedTravellerId: newTravId }));
            toast.success("Guest saved to your co-traveller profile!");
          }
        } catch (travErr) {
          console.warn("Could not auto-save guest profile:", travErr?.response?.data || travErr.message);
        }
      }

      if (guest.savedTravellerId && !guestObj.travellerId) {
        guestObj.travellerId = String(guest.savedTravellerId);
      }

      // Resolve valid supplier room identifier across all SRDV and custom room formats
      const targetRoomId =
        room.roomId ||
        room.id ||
        room.roomCode ||
        room.RoomCode ||
        room.ratePlanCode ||
        room.RatePlanCode ||
        room.code ||
        _roomId ||
        "1";

      const authToken =
        tokenService.getAccessToken() ||
        tokenService.getRawStoredToken() ||
        (typeof localStorage !== "undefined"
          ? localStorage.getItem("maqam_access_token") ||
            localStorage.getItem("accessToken") ||
            localStorage.getItem("token") ||
            localStorage.getItem("authToken") ||
            localStorage.getItem("AuthToken")
          : "") ||
        (typeof sessionStorage !== "undefined"
          ? sessionStorage.getItem("maqam_access_token") ||
            sessionStorage.getItem("accessToken") ||
            sessionStorage.getItem("token") ||
            sessionStorage.getItem("authToken") ||
            sessionStorage.getItem("AuthToken")
          : "");

      if (!authToken) {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        openLoginModal({
          message: "Please sign in to confirm and complete your hotel reservation.",
          onSuccess: () => {
            toast.success("Signed in! You can now proceed to payment.");
          },
        });
        return;
      }

      if (isOffer) {
        if (!targetOfferId) {
          throw new Error("Unable to identify the hotel offer ID. Please return to offers and try again.");
        }

        toast.info("Reserving offer room (30-min stock hold)...");
        let tId = guest.savedTravellerId || guestObj.travellerId;
        const dobDateString = new Date(Date.now() - guestAge * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        if (!tId || !/^[0-9a-fA-F]{24}$/.test(String(tId))) {
          try {
            const cleanPhone = String(guest.phone).replace(/\D/g, "");
            const newTrav = await travellerService.createTraveller({
              title: guest.title || "Mr",
              firstName: guest.firstName.trim(),
              lastName: guest.lastName.trim(),
              email: guest.email.trim().toLowerCase(),
              phone: cleanPhone,
              cellCountryCode: "+91",
              passengerType: "Adult",
              gender: ["Mr", "Mstr"].includes(guest.title) ? "Male" : "Female",
              dateOfBirth: dobDateString,
              pan: cleanPan,
            });
            tId = newTrav?._id || newTrav?.id;
          } catch (travErr) {
            console.warn("Could not auto-save guest profile:", travErr?.message);
          }
        }

        const offerBookingPayload = {
          quantity: 1,
          travellers: [
            {
              ...(tId ? { travellerId: String(tId) } : {}),
              isLead: true,
              title: guest.title || "Mr",
              firstName: guest.firstName.trim(),
              lastName: guest.lastName.trim(),
              dateOfBirth: dobDateString,
              ...(guest.passportNumber ? { passportNumber: String(guest.passportNumber).trim() } : {}),
            },
          ],
        };

        console.log(`POST /api/v1/offers/${targetOfferId}/book Payload:`, JSON.stringify(offerBookingPayload, null, 2));

        const offerRes = await offerService.bookOffer(targetOfferId, offerBookingPayload);
        const bookingData = offerRes.booking || offerRes.data?.booking || offerRes.data || offerRes;
        const bookingId =
          bookingData._id ||
          bookingData.id ||
          offerRes.bookingId ||
          offerRes._id ||
          offerRes.id;

        if (!bookingId) {
          throw new Error(
            offerRes.message || "Failed to create hotel offer booking record."
          );
        }

        toast.success("Offer room held! Connecting to PayPal checkout...");

        const returnUrl = `${window.location.origin}/payment/paypal/success?type=offer&bookingId=${bookingId}`;
        const cancelUrl = `${window.location.origin}/payment/paypal/cancel?type=offer&bookingId=${bookingId}`;

        const orderRes = await paymentService.createPayPalOrder({
          bookingId,
          bookingType: "offer",
          amount: totalAmount,
          returnUrl,
          cancelUrl,
        });

        const redirectUrl = orderRes.redirectUrl;

        if (redirectUrl) {
          try {
            sessionStorage.removeItem("hotel_guest_draft");
          } catch {}

          sessionStorage.setItem("lastOfferBookingId", String(bookingId));
          sessionStorage.setItem("lastPaymentBookingType", "offer");
          sessionStorage.setItem("lastOfferBookingData", JSON.stringify(bookingData));
          sessionStorage.setItem("lastOfferPaymentData", JSON.stringify(orderRes.data || {}));

          const activeToken = getStoredAuthToken();
          if (activeToken) {
            try {
              sessionStorage.setItem("maqam_customer_token", activeToken);
              localStorage.setItem("maqam_customer_token", activeToken);
            } catch {}
          }

          toast.info("Redirecting to PayPal secure checkout...");
          window.location.assign(redirectUrl);
          return;
        } else {
          throw new Error(
            "PayPal checkout link could not be generated. Please try again."
          );
        }
      }

      // 1. Resolve room price lock token (non-blocking: use pre-acquired token or fast fallback)
      const buildRecheckPayload = () => ({
        searchId: searchId || localStorage.getItem("searchId"),
        hotelId: String(hotelId || hotel.id || ""),
        selectedRooms: [
          {
            roomId: String(targetRoomId),
            quantity: 1,
          },
        ],
        guests: [guestObj],
      });

      let recheckId = preRecheckId;

      if (!recheckId) {
        try {
          const recheckRes = await api.post(
            "/api/v1/hotels/recheck",
            buildRecheckPayload(),
            {
              headers: { Authorization: `Bearer ${authToken}` },
              timeout: 15000,
            }
          );
          recheckId = recheckRes.data?.data?.recheckId || recheckRes.data?.recheckId;
        } catch (fastRecheckErr) {
          console.warn("Fast rate lock fallback:", fastRecheckErr?.message);
        }
      }

      if (!recheckId) {
        throw new Error(
          "Could not acquire room price lock. Please reselect the room."
        );
      }

      // 2. Create Hotel Reservation API
      toast.info("Reserving room with hotel supplier...");
      let bookingPayload = {
        recheckId,
        acceptChanges: true,
        guests: [guestObj],
      };

      // Deterministic idempotency key: prevents duplicate reservations on rapid network retries
      let idempotencyKey = `hotel_bkg_${recheckId}_${cleanPan}`;
      bookingPayload = {
        ...bookingPayload,
        idempotencyKey,
      };

      let bookingHeaders = {};
      if (authToken) {
        bookingHeaders.Authorization = `Bearer ${authToken}`;
      }

      let bookingRes;
      try {
        bookingRes = await api.post(
          "/api/v1/hotels/bookings",
          bookingPayload,
          {
            headers: bookingHeaders,
          },
        );
      } catch (bookErr) {
        // Handle Rate Lock Expiry (HTTP 410 or quote expired) by immediately refreshing the lock
        const isExpiredLock =
          bookErr?.response?.status === 410 ||
          /expired|already processed|recheck/i.test(bookErr?.response?.data?.message || bookErr?.message || "");

        if (isExpiredLock) {
          console.warn("Hotel rate lock expired. Refreshing rate lock token...");
          toast.info("Refreshing room price lock with hotel supplier...");
          const freshRecheckRes = await api.post(
            "/api/v1/hotels/recheck",
            buildRecheckPayload(),
            {
              headers: { Authorization: `Bearer ${authToken}` },
              timeout: 15000,
            }
          );
          const freshRecheckId =
            freshRecheckRes.data?.data?.recheckId || freshRecheckRes.data?.recheckId;

          if (!freshRecheckId) {
            throw new Error(
              freshRecheckRes.data?.message ||
                "Hotel rate lock expired and could not be renewed. Please reselect your room."
            );
          }

          recheckId = freshRecheckId;
          setPreRecheckId(freshRecheckId);
          idempotencyKey = `hotel_bkg_${freshRecheckId}_${cleanPan}_retry`;
          bookingPayload = {
            recheckId: freshRecheckId,
            acceptChanges: true,
            guests: [guestObj],
            idempotencyKey,
          };

          bookingRes = await api.post(
            "/api/v1/hotels/bookings",
            bookingPayload,
            {
              headers: bookingHeaders,
            },
          );
        } else if (bookErr?.response?.status === 404 || bookErr?.response?.status === 405) {
          bookingRes = await api.post(
            "/api/v1/hotels/book",
            bookingPayload,
            {
              headers: bookingHeaders,
            },
          );
        } else {
          throw bookErr;
        }
      }

      const bookingData = bookingRes.data?.data || bookingRes.data;
      const bookingId =
        bookingData?.bookingId ||
        bookingData?.id ||
        bookingData?._id ||
        bookingRes.data?.bookingId ||
        bookingRes.data?.id ||
        bookingRes.data?._id;

      if (!bookingId) {
        throw new Error(
          bookingRes.data?.message || "Failed to create hotel booking record.",
        );
      }

      toast.success("Room reserved! Connecting to PayPal checkout...");

      // 3. Create PayPal Payment Order API
      const returnUrl = `${window.location.origin}/payment/paypal/success?type=hotel&bookingId=${bookingId}`;
      const cancelUrl = `${window.location.origin}/payment/paypal/cancel?type=hotel&bookingId=${bookingId}`;

      const orderRes = await paymentService.createPayPalOrder({
        bookingId,
        bookingType: "hotel",
        amount: totalAmount,
        returnUrl,
        cancelUrl,
      });

      const redirectUrl = orderRes.redirectUrl;

      if (redirectUrl) {
        try {
          sessionStorage.removeItem("hotel_guest_draft");
        } catch {
          void 0;
        }

        sessionStorage.setItem("lastHotelBookingId", String(bookingId));
        sessionStorage.setItem("lastPaymentBookingType", "hotel");
        sessionStorage.setItem(
          "lastHotelPaymentData",
          JSON.stringify(orderRes.data || {}),
        );
        sessionStorage.setItem(
          "lastHotelBookingData",
          JSON.stringify(bookingData || {}),
        );

        const activeToken = getStoredAuthToken();
        if (activeToken) {
          try {
            sessionStorage.setItem("maqam_customer_token", activeToken);
            localStorage.setItem("maqam_customer_token", activeToken);
          } catch {
            void 0;
          }
        }

        toast.info("Redirecting to PayPal secure checkout...");
        window.location.assign(redirectUrl);
      } else {
        throw new Error(
          "PayPal checkout link could not be generated. Please try again.",
        );
      }
    } catch (err) {
      console.error("Hotel Checkout Error:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Payment initiation failed. Please try again.";
      toast.error(msg);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen font-poppins pb-16">
      <CommonHeader title="Hotel" />

      {/* Breadcrumb & Navigation Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <Link
              to="/hotel"
              className="hover:text-teal-700 transition flex items-center gap-1 shrink-0"
            >
              <ArrowLeft size={14} /> Back to Hotels
            </Link>
            <span className="text-gray-300">/</span>
            <span className="truncate text-gray-800 font-medium">
              {hotelName}
            </span>
            <span className="text-gray-300">/</span>
            <span className="text-teal-700 font-bold shrink-0">
              Review & Payment
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-emerald-700 font-semibold">
            <Lock size={13} />
            <span>256-Bit SSL Encrypted Checkout</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ─── LEFT COLUMN (8 cols): Property, Stay & Guest Details ─── */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Property & Stay Overview Card */}
            <div className="bg-white rounded-2xl shadow-xs border border-gray-200/90 overflow-hidden">
              <div className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-5">
                  {/* Hotel Thumbnail */}
                  <div className="w-full sm:w-44 h-36 sm:h-auto rounded-xl overflow-hidden bg-gray-100 shrink-0 relative group">
                    <img
                      src={hotelImage}
                      alt={hotelName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src =
                          "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600";
                      }}
                    />
                    <div className="absolute top-2 left-2 bg-teal-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                      {hotelRating} ★ HOTEL
                    </div>
                  </div>

                  {/* Hotel Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <BadgeCheck size={13} /> Verified Property
                      </span>
                    </div>

                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5 leading-snug">
                      {hotelName}
                    </h1>

                    {hotelAddress && (
                      <div className="flex items-start gap-1.5 mt-2 text-slate-600">
                        <MapPin
                          size={15}
                          className="text-teal-600 shrink-0 mt-0.5"
                        />
                        <span className="text-xs sm:text-sm font-medium line-clamp-2">
                          {hotelAddress}
                        </span>
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          window.open(
                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              hotelName + " " + hotelAddress,
                            )}`,
                            "_blank",
                          );
                        }}
                        className="text-teal-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        View on Map <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stay Dates & Duration Grid */}
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 bg-slate-50/70 rounded-xl p-3 sm:p-4 border border-gray-200/60">
                    <div className="pb-3 sm:pb-0 sm:pr-4">
                      <div className="flex items-center gap-1.5 text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                        <Calendar size={13} className="text-teal-600" />
                        <span>Check In</span>
                      </div>
                      <p className="font-bold text-sm text-slate-900 mt-1">
                        {checkInDisplay}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <Clock size={11} /> From 2:00 PM
                      </p>
                    </div>

                    <div className="py-3 sm:py-0 sm:px-4">
                      <div className="flex items-center gap-1.5 text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                        <Calendar size={13} className="text-teal-600" />
                        <span>Check Out</span>
                      </div>
                      <p className="font-bold text-sm text-slate-900 mt-1">
                        {checkOutDisplay}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <Clock size={11} /> Until 12:00 PM
                      </p>
                    </div>

                    <div className="pt-3 sm:pt-0 sm:pl-4">
                      <div className="flex items-center gap-1.5 text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                        <Users size={13} className="text-teal-600" />
                        <span>Guests & Rooms</span>
                      </div>
                      <p className="font-bold text-sm text-slate-900 mt-1">
                        {room.capacity || 2} Adults
                      </p>
                      <p className="text-xs text-teal-700 font-semibold mt-0.5">
                        {nights} Night{nights > 1 ? "s" : ""}, 1 Room
                      </p>
                    </div>
                  </div>
                </div>

                {/* Selected Room Details Pill */}
                <div className="mt-4 p-4 rounded-xl border border-teal-100 bg-teal-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider bg-teal-100 px-2 py-0.5 rounded-md">
                        Selected Room
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isRefundable
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {isRefundable ? "Free Cancellation" : "Non-Refundable"}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 mt-1.5">
                      1 × {roomName}
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Meal Plan:{" "}
                      <span className="font-semibold text-teal-800">
                        {mealType}
                      </span>
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs text-gray-500 block">
                      Room Rate
                    </span>
                    <span className="font-black text-base text-slate-900">
                      ₹ {Math.round(totalAmount).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-emerald-700 block font-medium">
                      Taxes Included
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Guest Details Form Card */}
            <div className="bg-white rounded-2xl shadow-xs border border-gray-200/90 p-5 sm:p-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Users size={18} className="text-teal-600" />
                    Guest Information
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Lead guest name must match the Government ID presented at
                    check-in.
                  </p>
                </div>
                {isAuthenticated && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Logged in as {user?.name || "Guest"}
                  </span>
                )}
              </div>

              {/* 1-Click Autofill from Saved Co-Traveller Profiles */}
              {isAuthenticated && (
                <div className="mt-5 pb-5 border-b border-gray-100">
                  <TravellerSelector
                    onSelect={handleSelectSavedTraveller}
                    selectedId={guest.savedTravellerId}
                    filterType="Adult"
                    title="1-Click Autofill from Saved Travellers"
                  />
                </div>
              )}

              {/* Title Selector */}
              <div className="mt-5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Title
                </label>
                <div className="flex gap-2">
                  {["Mr", "Mrs", "Ms"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setGuest({ ...guest, title: t })}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        guest.title === t
                          ? "bg-teal-700 text-white shadow-xs"
                          : "bg-gray-100 text-slate-700 hover:bg-gray-200"
                      }`}
                    >
                      {t}.
                    </button>
                  ))}
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rohit"
                    value={guest.firstName}
                    onChange={(e) =>
                      setGuest({ ...guest, firstName: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shaw"
                    value={guest.lastName}
                    onChange={(e) =>
                      setGuest({ ...guest, lastName: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  />
                </div>
              </div>

              {/* Contact Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="booking@example.com"
                    value={guest.email}
                    onChange={(e) =>
                      setGuest({ ...guest, email: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  />
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    Your booking confirmation & e-voucher will be sent here.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile / Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9876543210"
                    value={guest.phone}
                    onChange={(e) =>
                      setGuest({ ...guest, phone: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  />
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    Used for critical check-in updates & alerts.
                  </span>
                </div>
              </div>

              {/* PAN Card & Age Fields (Mandatory for Hotel Bookings) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <CreditCard size={13} className="text-teal-600" />
                      PAN Card Number <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Mandatory
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={10}
                      placeholder="EXVPR5555M"
                      value={guest.pan || ""}
                      onChange={(e) => {
                        const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                        setGuest({ ...guest, pan: raw });
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-mono tracking-wider uppercase focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 placeholder:normal-case placeholder:tracking-normal placeholder:font-sans"
                    />
                    {guest.pan && /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(guest.pan) && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 flex items-center gap-1 text-[11px] font-bold">
                        <CheckCircle2 size={15} />
                        Valid
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    Required by hotel & tax regulations (10 characters, e.g. EXVPR5555M).
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Users size={13} className="text-teal-600" />
                      Lead Guest Age (Years) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-semibold text-slate-500">
                      18+ Adult
                    </span>
                  </div>
                  <input
                    type="number"
                    min={18}
                    max={120}
                    required
                    placeholder="30"
                    value={guest.age || ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setGuest({
                        ...guest,
                        age: isNaN(val) ? "" : Math.max(0, val),
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  />
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    Primary guest must be at least 18 years old at check-in.
                  </span>
                </div>
              </div>

              {/* Save as Co-Traveller Checkbox */}
              {isAuthenticated && !guest.savedTravellerId && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={saveGuestToProfile}
                      onChange={(e) => setSaveGuestToProfile(e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      Save this guest to my co-travellers profile for 1-click booking next time
                    </span>
                  </label>
                </div>
              )}

              {/* Special Requests */}
              <div className="mt-5 pt-4 border-t border-gray-100">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Special Requests (Optional, subject to availability)
                </label>
                <div className="flex flex-wrap gap-2">
                  {SPECIAL_REQUEST_OPTIONS.map((opt) => {
                    const isSelected = guest.specialRequests.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleSpecialRequest(opt)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer ${
                          isSelected
                            ? "bg-teal-50 border-teal-600 text-teal-800 font-bold"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "} {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Important Hotel Policy Card */}
            <div className="bg-white rounded-2xl shadow-xs border border-gray-200/90 p-5 sm:p-6 space-y-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Info size={16} className="text-teal-600" />
                Hotel Policies & Check-in Rules
              </h3>
              <ul className="text-xs text-gray-600 space-y-2 list-disc pl-5">
                <li>
                  Primary guest must be at least 18 years old to check in.
                </li>
                <li>
                  Valid government-issued photo ID or Passport is mandatory for all
                  guests at reception.
                </li>
                <li>
                  {isRefundable
                    ? "Free cancellation is available until 48 hours prior to check-in."
                    : "This rate is non-refundable. Cancellations or no-shows are charged in full."}
                </li>
              </ul>
            </div>
          </div>

          {/* ─── RIGHT COLUMN (4 cols): Sticky Price Summary & Payment ─── */}
          <div className="lg:col-span-4 sticky top-6 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/90 overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100 bg-slate-50/60 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  Price Summary
                </h2>
                <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                  {nights} Night{nights > 1 ? "s" : ""}
                </span>
              </div>

              {/* Price Breakdown */}
              <div className="p-5 space-y-3.5">
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Room Rate (1 Room × {nights} Night{nights > 1 ? "s" : ""})</span>
                  <span className="font-bold text-slate-900 text-sm">
                    ₹ {Math.round(totalAmount).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Taxes & Service Fees</span>
                  <span className="text-emerald-700 font-bold">Included</span>
                </div>

                <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 flex items-center gap-2 text-xs text-emerald-800">
                  <BadgeCheck size={16} className="text-emerald-600 shrink-0" />
                  <div className="flex-1 font-medium">
                    <span>Special Price Applied</span>
                    <span className="block text-[10px] text-emerald-600">
                      Best Price Guarantee with Instant Voucher
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t border-gray-100 pt-4 flex justify-between items-baseline">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Total Payable
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Includes all taxes & fees
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-black text-teal-800 block">
                      ₹ {Math.round(totalAmount).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[11px] text-gray-500 font-semibold block">
                      ≈ ${estimatedUSD} USD via PayPal
                    </span>
                  </div>
                </div>

                {/* Terms Agreement Checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-2 cursor-pointer text-[11px] text-gray-600">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                    <span>
                      I accept the{" "}
                      <Link to="/terms" className="text-teal-700 underline font-semibold">
                        booking conditions
                      </Link>{" "}
                      and cancellation policy.
                    </span>
                  </label>
                </div>

                {/* PROCEED TO PAYMENT BUTTON */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleProceedToPayment}
                  className="w-full mt-2 bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Connecting to PayPal...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={15} />
                      <span>Proceed to Payment (PayPal)</span>
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>

                {/* Trust Signals */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-center gap-4 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <ShieldCheck size={13} className="text-emerald-600" /> Secure
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Check size={13} className="text-teal-600" /> Instant Voucher
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Building size={13} className="text-blue-600" /> Supplier Guaranteed
                  </span>
                </div>
              </div>
            </div>

            {/* Member Benefit Banner */}
            {isAuthenticated ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />
                <span className="text-emerald-900 text-xs font-semibold">
                  Member exclusive rates active on your reservation!
                </span>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
                <Sparkles className="text-teal-600 shrink-0" size={18} />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 block">
                    Have an account?
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      openLoginModal({
                        message: "Sign in for faster checkout & member benefits.",
                      })
                    }
                    className="text-teal-700 font-bold hover:underline cursor-pointer text-left"
                  >
                    Log in for faster checkout & loyalty rewards
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <ProfileCompletionModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        prefillData={guest}
        bookingType="hotel"
        onSuccess={(savedTravellerId, updatedData) => {
          if (savedTravellerId) {
            setGuest((prev) => ({
              ...prev,
              firstName: updatedData?.user?.firstName || prev.firstName,
              lastName: updatedData?.user?.lastName || prev.lastName,
              email: updatedData?.user?.email || prev.email,
              phone: updatedData?.user?.phone || prev.phone,
              savedTravellerId,
            }));
          }
          toast.info("Profile verified! Proceeding with your hotel reservation...");
          setTimeout(() => {
            handleProceedToPayment();
          }, 350);
        }}
      />

      <ScrollToTop />
    </div>
  );
};

export default SelectedRoomInformation;
