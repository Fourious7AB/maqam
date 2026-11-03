import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ChevronDown,
  Check,
  User,
  Phone,
  Mail,
  Building2,
  Loader2,
  UserPlus,
  Trash2,
  Plus,
  Globe,
  Plane,
  Utensils,
  Accessibility,
  FileText,
  Calendar,
  Sparkles,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../stores/api";
import { reindexSlots, getSlotDisplayName } from "./slotUtils";
import travellerService from "../../services/travellerService";
import { tokenService, getStoredAuthToken, getAuthHeaders } from "../../admin/services/tokenService";
import paymentService from "../../services/paymentService";
import { isPhoneOnlyIncompleteUser, isGenericPlaceholder } from "../../utils/profileCompletionCheck";
import ProfileCompletionModal from "../user/ProfileCompletionModal";
import { FlightAPI } from "../../configs/api";
import offerService from "../../services/offerService";
import flightService from "../../services/flightService";

const COUNTRY_META = {
  India: { code: "IN", name: "INDIA", dial: "+91" },
  "Saudi Arabia": { code: "SA", name: "SAUDI ARABIA", dial: "+966" },
  "United Arab Emirates": { code: "AE", name: "UNITED ARAB EMIRATES", dial: "+971" },
  Qatar: { code: "QA", name: "QATAR", dial: "+974" },
  Oman: { code: "OM", name: "OMAN", dial: "+968" },
  Kuwait: { code: "KW", name: "KUWAIT", dial: "+965" },
  Bahrain: { code: "BH", name: "BAHRAIN", dial: "+973" },
  "United Kingdom": { code: "GB", name: "UNITED KINGDOM", dial: "+44" },
  "United States": { code: "US", name: "UNITED STATES", dial: "+1" },
  Canada: { code: "CA", name: "CANADA", dial: "+1" },
  Pakistan: { code: "PK", name: "PAKISTAN", dial: "+92" },
  Bangladesh: { code: "BD", name: "BANGLADESH", dial: "+880" },
  Malaysia: { code: "MY", name: "MALAYSIA", dial: "+60" },
  Indonesia: { code: "ID", name: "INDONESIA", dial: "+62" },
  Other: { code: "IN", name: "INDIA", dial: "+91" },
};

const formatPassengerType = (rawType) => {
  const upper = String(rawType || "ADULT").trim().toUpperCase();
  if (upper === "CHILD" || upper === "CNN" || upper === "CHD") return "Child";
  if (upper === "INFANT" || upper === "INF") return "Infant";
  return "Adult";
};

const resolveCountryMeta = (nationality, dialCode) => {
  if (nationality && COUNTRY_META[nationality]) {
    return COUNTRY_META[nationality];
  }
  const byCaseInsensitive = Object.entries(COUNTRY_META).find(
    ([key, val]) =>
      key.toLowerCase() === String(nationality || "").trim().toLowerCase() ||
      val.code.toLowerCase() === String(nationality || "").trim().toLowerCase()
  );
  if (byCaseInsensitive) return byCaseInsensitive[1];

  const byDial = Object.values(COUNTRY_META).find((v) => v.dial === dialCode);
  return byDial || COUNTRY_META.India;
};

const POPULAR_NATIONALITIES = [
  "India",
  "Saudi Arabia",
  "United Arab Emirates",
  "Qatar",
  "Oman",
  "Kuwait",
  "Bahrain",
  "United Kingdom",
  "United States",
  "Canada",
  "Pakistan",
  "Bangladesh",
  "Malaysia",
  "Indonesia",
  "Other",
];

const POPULAR_AIRLINES = [
  "Saudia (SV)",
  "Air India (AI)",
  "IndiGo (6E)",
  "Emirates (EK)",
  "Qatar Airways (QR)",
  "Etihad Airways (EY)",
  "Gulf Air (GF)",
  "Oman Air (WY)",
  "Flyadeal (F3)",
  "Flynas (XY)",
  "SpiceJet (SG)",
  "Vistara (UK)",
  "Air Arabia (G9)",
  "Other Airline",
];

const MEAL_PREFERENCES = [
  { code: "", label: "Standard / No Preference" },
  { code: "MOML", label: "Muslim Meal (Halal - MOML)" },
  { code: "HNML", label: "Hindu Non-Vegetarian (HNML)" },
  { code: "VJML", label: "Vegetarian Jain Meal (VJML)" },
  { code: "AVML", label: "Asian Vegetarian Meal (AVML)" },
  { code: "DBML", label: "Diabetic Meal (DBML)" },
  { code: "GFML", label: "Gluten-Free Meal (GFML)" },
  { code: "CHML", label: "Child Meal (CHML)" },
  { code: "BBML", label: "Baby / Infant Meal (BBML)" },
];

const WHEELCHAIR_OPTIONS = [
  { code: "", label: "No Assistance Required" },
  { code: "WCHR", label: "Wheelchair - Ramp (WCHR)" },
  { code: "WCHS", label: "Wheelchair - Steps (WCHS)" },
  { code: "WCHC", label: "Wheelchair - Cabin Seat (WCHC)" },
];

const loadSavedDraft = () => {
  try {
    return (
      JSON.parse(sessionStorage.getItem("flight_booking_form_draft")) ||
      JSON.parse(localStorage.getItem("flight_booking_form_draft")) ||
      null
    );
  } catch {
    return null;
  }
};

const hasFormContent = (slots, contact, gst) => {
  const hasPax = slots?.some(
    (s) => s.firstName?.trim() || s.lastName?.trim() || s.dob || s.passport?.trim(),
  );
  const hasContact = Boolean(contact?.mobile?.trim() || contact?.email?.trim());
  const hasGst = Boolean(gst?.hasGst && gst?.gstNumber?.trim());
  return Boolean(hasPax || hasContact || hasGst);
};

const TravellerDetails = ({
  traceId,
  resultIndex,
  isInHouse = false,
  isOffer = false,
  offerId = null,
  selectedOffer = null,
  flight = null,
  selectedSsr = {},
  selectedSeats = {},
  fareQuote,
  passengerSlots: controlledSlots,
  setPassengerSlots: setControlledSlots,
  onAddPassenger,
  onRemovePassenger,
  formId = "booking-traveller-form",
  onLoadingChange,
  onRequireLogin,
  grandTotal,
  netFare,
}) => {
  const navigate = useNavigate();
  // Extract saved search passenger limits
  const savedSearch = (() => {
    try {
      return JSON.parse(localStorage.getItem("flightSearch")) || {};
    } catch {
      return {};
    }
  })();

  const adultsCount = Math.max(
    1,
    Number(savedSearch.passengers?.adults ?? savedSearch.adults ?? 1),
  );
  const childrenCount = Math.max(
    0,
    Number(savedSearch.passengers?.children ?? savedSearch.children ?? 0),
  );
  const infantsCount = Math.max(
    0,
    Number(savedSearch.passengers?.infants ?? savedSearch.infants ?? 0),
  );

  const quoteData = fareQuote?.data?.data || fareQuote?.data || fareQuote || {};
  const requiredRules = quoteData.required || {};
  const isGstMandatory = Boolean(quoteData.isGstMandatory);

  const [_bookingLoading, setBookingLoading] = useState(false);

  const updateLoading = (val) => {
    setBookingLoading(val);
    if (onLoadingChange) onLoadingChange(val);
  };

  // Live saved travellers from backend account profile
  const [_savedTravellers, setSavedTravellers] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchSaved = async () => {
      const token = tokenService.getAccessToken();
      if (!token) return;

      try {
        const list = await travellerService.getAllTravellers();
        if (isMounted && Array.isArray(list) && list.length > 0) {
          const mapped = list.map((t) => ({
            id: t._id || t.id,
            travellerType: t.passengerType || "Adult",
            title: t.title || "Mr",
            firstName: t.firstName || "",
            lastName: t.lastName || "",
            gender: t.gender || "Male",
            dob: t.dateOfBirth ? String(t.dateOfBirth).split("T")[0] : "",
            passport: t.passportNo || "",
            passportExpiry: t.passportExpiry
              ? String(t.passportExpiry).split("T")[0]
              : "",
            passportIssueDate: t.passportIssueDate
              ? String(t.passportIssueDate).split("T")[0]
              : "",
            passportIssueCountryCode: t.passportIssueCountryCode || "IN",
            addressLine1: t.addressLine1 || t.address || "",
            city: t.city || "",
            countryCode: t.countryCode || "",
            countryName: t.countryName || "",
            phone: t.phone || "",
            email: t.email || "",
            isDefault: Boolean(t.isDefault),
          }));
          setSavedTravellers(mapped);

          // Auto-assign primary/default saved traveller to single traveller / lead traveller
          // if slot 0 is currently empty or has not been manually edited
          const defaultTraveller =
            mapped.find((t) => t.isDefault) ||
            mapped.find((t) => (t.travellerType || "").toUpperCase() === "ADULT") ||
            mapped[0];

          if (defaultTraveller) {
            setPassengerSlots((prev) => {
              const slot0 = prev[0];
              if (!slot0) return prev;

              // Eligible for saved traveller link if:
              // 1. It is currently empty or generic placeholder
              // 2. OR it was pre-filled from loggedInUser without a saved ID (!slot0.savedTravellerId)
              // 3. OR it was already from a saved traveller or this same defaultTraveller
              const isSlot0EligibleForSavedLink =
                !slot0.firstName?.trim() ||
                isGenericPlaceholder(slot0.firstName) ||
                slot0.isFromSavedTraveller ||
                !slot0.savedTravellerId ||
                slot0.savedTravellerId === defaultTraveller.id;

              if (isSlot0EligibleForSavedLink) {
                const normalizedDefaultTitle =
                  defaultTraveller.title === "Master"
                    ? "Mstr"
                    : defaultTraveller.title || slot0.title || "Mr";
                const inferredGender =
                  defaultTraveller.gender ||
                  (normalizedDefaultTitle === "Mr" ||
                  normalizedDefaultTitle === "Mstr" ||
                  normalizedDefaultTitle === "Master"
                    ? "Male"
                    : "Female");
                const updatedSlot0 = {
                  ...slot0,
                  title: normalizedDefaultTitle,
                  firstName: defaultTraveller.firstName || slot0.firstName || "",
                  lastName: defaultTraveller.lastName || slot0.lastName || "",
                  gender: inferredGender,
                  dob: defaultTraveller.dob || slot0.dob || "",
                  passport: defaultTraveller.passport || slot0.passport || "",
                  passportExpiry:
                    defaultTraveller.passportExpiry || slot0.passportExpiry || "",
                  passportIssueDate:
                    defaultTraveller.passportIssueDate || slot0.passportIssueDate || "",
                  passportIssueCountryCode:
                    defaultTraveller.passportIssueCountryCode ||
                    slot0.passportIssueCountryCode ||
                    "IN",
                  nationality: defaultTraveller.countryName || slot0.nationality || "India",
                  addressLine1: defaultTraveller.addressLine1 || slot0.addressLine1 || "",
                  city: defaultTraveller.city || slot0.city || "",
                  countryCode: defaultTraveller.countryCode || slot0.countryCode || "IN",
                  countryName: defaultTraveller.countryName || slot0.countryName || "INDIA",
                  isCompleted: Boolean(
                    (defaultTraveller.firstName || slot0.firstName) &&
                      (defaultTraveller.lastName || slot0.lastName) &&
                      (defaultTraveller.dob || slot0.dob)
                  ),
                  isFromSavedTraveller: true,
                  savedTravellerId: defaultTraveller.id,
                  saveToProfile: false, // Already saved in user profile
                };
                return [updatedSlot0, ...prev.slice(1)];
              }
              return prev;
            });

            setSelectedTravellerIds((prev) =>
              prev.includes(defaultTraveller.id) ? prev : [...prev, defaultTraveller.id]
            );

            // Also ensure contact details are populated
            if (defaultTraveller.phone || defaultTraveller.email) {
              setContactDetails((prev) => ({
                ...prev,
                mobile: prev.mobile || defaultTraveller.phone || "",
                email: prev.email || defaultTraveller.email || "",
              }));
            }
          } else {
            // User has no saved travellers in MongoDB.
            // Ensure slot 0 auto-saves for single traveler if not already linked
            setPassengerSlots((prev) =>
              prev.map((s, idx) => {
                if (idx === 0 && prev.length === 1 && !s.savedTravellerId) {
                  return { ...s, saveToProfile: true };
                }
                return s;
              })
            );
          }
        } else if (isMounted) {
          // Empty saved travellers list returned from server
          setPassengerSlots((prev) =>
            prev.map((s, idx) => {
              if (idx === 0 && prev.length === 1 && !s.savedTravellerId) {
                return { ...s, saveToProfile: true };
              }
              return s;
            })
          );
        }
      } catch (err) {
        console.warn("Could not load saved travellers for autofill:", err.message);
      }
    };

    fetchSaved();
    return () => {
      isMounted = false;
    };
  }, []);

  // Track selected saved traveller IDs
  const [selectedTravellerIds, setSelectedTravellerIds] = useState([]);

  const initialDraft = loadSavedDraft();

  // Contact Details State (with Draft auto-restoration)
  const [contactDetails, setContactDetails] = useState(() => {
    if (initialDraft?.contactDetails) {
      return initialDraft.contactDetails;
    }
    return {
      countryCode: "+91",
      mobile: "",
      email: "",
      sendUpdates: true,
    };
  });

  // GST Details State (with Draft auto-restoration)
  const [gstDetails, setGstDetails] = useState(() => {
    if (initialDraft?.gstDetails) {
      return initialDraft.gstDetails;
    }
    return {
      hasGst: false,
      gstNumber: "",
      companyName: "",
      companyAddress: "",
      companyEmail: "",
    };
  });
  const [isGstExpanded, setIsGstExpanded] = useState(Boolean(initialDraft?.gstDetails?.hasGst));

  // Validation State
  const [validationErrors, setValidationErrors] = useState({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Fallback internal passenger slots (with Draft auto-restoration)
  const [internalSlots, setInternalSlots] = useState(() => {
    if (
      initialDraft?.passengerSlots &&
      Array.isArray(initialDraft.passengerSlots) &&
      initialDraft.passengerSlots.length > 0
    ) {
      return reindexSlots(initialDraft.passengerSlots);
    }
    const slots = [];
    let slotId = 1;
    const makeDefaultSlot = (id, type, slotTitle, title, isExpanded) => ({
      id,
      type,
      slotTitle,
      title,
      firstName: "",
      lastName: "",
      gender: "",
      dob: "",
      passport: "",
      passportExpiry: "",
      passportIssueDate: "",
      passportIssueCountryCode: "IN",
      nationality: "India",
      addressLine1: "",
      city: "",
      airline: "",
      ffNumber: "",
      mealPreference: "",
      wheelchair: "",
      saveToProfile: id === 1 && adultsCount === 1,
      isCompleted: false,
      isExpanded,
      isFromSavedTraveller: false,
      savedTravellerId: null,
    });
    for (let i = 1; i <= adultsCount; i++) {
      slots.push(
        makeDefaultSlot(
          slotId++,
          "ADULT",
          adultsCount === 1 ? "Adult" : `Adult ${i}`,
          "Mr",
          i === 1,
        ),
      );
    }
    for (let i = 1; i <= childrenCount; i++) {
      slots.push(
        makeDefaultSlot(
          slotId++,
          "CHILD",
          childrenCount === 1 ? "Child" : `Child ${i}`,
          "Mstr",
          false,
        ),
      );
    }
    for (let i = 1; i <= infantsCount; i++) {
      slots.push(
        makeDefaultSlot(
          slotId++,
          "INFANT",
          infantsCount === 1 ? "Infant" : `Infant ${i}`,
          "Mstr",
          false,
        ),
      );
    }
    return reindexSlots(slots);
  });

  const passengerSlots = controlledSlots || internalSlots;
  const setPassengerSlots = setControlledSlots || setInternalSlots;
  const hasRestoredDraftRef = useRef(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const modalUserProfile = useMemo(() => {
    return (
      tokenService.getUserProfile() ||
      (() => {
        try {
          return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
          return null;
        }
      })()
    );
  }, [showProfileModal]);

  const modalPrefillData = useMemo(() => {
    const lead = passengerSlots[0] || {};
    return {
      firstName: lead.firstName || "",
      lastName: lead.lastName || "",
      email: contactDetails?.email || "",
      phone: contactDetails?.mobile || "",
      title: lead.title || "Mr",
      gender: lead.gender || "Male",
    };
  }, [
    showProfileModal,
    passengerSlots[0]?.firstName,
    passengerSlots[0]?.lastName,
    passengerSlots[0]?.title,
    passengerSlots[0]?.gender,
    contactDetails?.email,
    contactDetails?.mobile,
  ]);

  // Mount effect: Ensure draft and logged-in user details are populated when returning to the form
  useEffect(() => {
    if (hasRestoredDraftRef.current) return;
    hasRestoredDraftRef.current = true;

    let didRestore = false;
    const timer = setTimeout(() => {
      const draft = loadSavedDraft();

      if (draft) {
        // Restore Contact Details if currently empty
        if (draft.contactDetails?.mobile || draft.contactDetails?.email) {
          setContactDetails((prev) => {
            if (!prev.mobile && !prev.email) {
              didRestore = true;
              return draft.contactDetails;
            }
            return prev;
          });
        }

        // Restore GST Details if currently empty
        if (draft.gstDetails?.gstNumber) {
          setGstDetails((prev) => {
            if (!prev.gstNumber) {
              if (draft.gstDetails.hasGst) setIsGstExpanded(true);
              didRestore = true;
              return draft.gstDetails;
            }
            return prev;
          });
        }

        // Restore Passenger Details into active slots
        if (draft.passengerSlots && Array.isArray(draft.passengerSlots)) {
          setPassengerSlots((prev) => {
            const alreadyFilled = prev.some((s) => s.firstName?.trim());
            if (alreadyFilled) return prev;

            const restored = prev.map((slot, idx) => {
              const dSlot = draft.passengerSlots[idx];
              if (!dSlot) return slot;
              didRestore = true;
              return {
                ...slot,
                title: dSlot.title || slot.title,
                firstName: dSlot.firstName || slot.firstName,
                lastName: dSlot.lastName || slot.lastName,
                gender: dSlot.gender || slot.gender,
                dob: dSlot.dob || slot.dob,
                passport: dSlot.passport || slot.passport,
                passportExpiry: dSlot.passportExpiry || slot.passportExpiry,
                passportIssueDate: dSlot.passportIssueDate || slot.passportIssueDate,
                passportIssueCountryCode:
                  dSlot.passportIssueCountryCode || slot.passportIssueCountryCode,
                nationality: dSlot.nationality || slot.nationality,
                addressLine1: dSlot.addressLine1 || slot.addressLine1,
                city: dSlot.city || slot.city,
                airline: dSlot.airline || slot.airline,
                ffNumber: dSlot.ffNumber || slot.ffNumber,
                mealPreference: dSlot.mealPreference || slot.mealPreference,
                wheelchair: dSlot.wheelchair || slot.wheelchair,
                saveToProfile: Boolean(dSlot.saveToProfile ?? slot.saveToProfile),
                isFromSavedTraveller: Boolean(
                  dSlot.isFromSavedTraveller ?? slot.isFromSavedTraveller,
                ),
                savedTravellerId: dSlot.savedTravellerId ?? slot.savedTravellerId,
                isCompleted: dSlot.isCompleted ?? slot.isCompleted,
              };
            });
            return reindexSlots(restored);
          });
        }
      }

      // If no draft exists, auto-fill from logged-in user profile
      try {
        const loggedInUser =
          tokenService.getUserProfile() ||
          JSON.parse(localStorage.getItem("user") || "null");
        if (loggedInUser) {
          if (loggedInUser.phone || loggedInUser.mobile) {
            setContactDetails((prev) => {
              if (!prev.mobile) {
                return {
                  ...prev,
                  mobile: loggedInUser.phone || loggedInUser.mobile || prev.mobile,
                  email: loggedInUser.email || prev.email,
                  countryCode: loggedInUser.cellCountryCode || prev.countryCode || "+91",
                };
              }
              return prev;
            });
          }

          const rawFirst =
            loggedInUser.firstName ||
            (!isGenericPlaceholder(loggedInUser.name)
              ? loggedInUser.name?.trim().split(" ")[0]
              : "");
          const rawLast =
            loggedInUser.lastName ||
            (!isGenericPlaceholder(loggedInUser.name)
              ? loggedInUser.name?.trim().split(" ").slice(1).join(" ")
              : "");
          const rawDob = loggedInUser.dateOfBirth
            ? String(loggedInUser.dateOfBirth).split("T")[0]
            : loggedInUser.dob || "";
          const rawGender =
            loggedInUser.gender ||
            (loggedInUser.title === "Mrs" || loggedInUser.title === "Ms" ? "Female" : "Male");
          const rawTitle = loggedInUser.title || (rawGender === "Female" ? "Ms" : "Mr");
          const rawPassport = loggedInUser.passportNo || loggedInUser.passport || "";
          const rawPassportExpiry = loggedInUser.passportExpiry
            ? String(loggedInUser.passportExpiry).split("T")[0]
            : "";
          const rawAddress = loggedInUser.addressLine1 || loggedInUser.address || "";
          const rawCity = loggedInUser.city || "";

          setPassengerSlots((prev) =>
            prev.map((s, idx) => {
              if (idx === 0) {
                const isSinglePax = prev.length === 1;
                const shouldAutoFill =
                  (!s.firstName || isGenericPlaceholder(s.firstName)) &&
                  !s.isFromSavedTraveller &&
                  !s.savedTravellerId;
                if (shouldAutoFill) {
                  return {
                    ...s,
                    title: s.title || rawTitle,
                    firstName: s.firstName || rawFirst || "",
                    lastName: s.lastName || rawLast || "",
                    gender: s.gender || rawGender,
                    dob: s.dob || rawDob,
                    passport: s.passport || rawPassport,
                    passportExpiry: s.passportExpiry || rawPassportExpiry,
                    addressLine1: s.addressLine1 || rawAddress,
                    city: s.city || rawCity,
                    // Single traveler / user: auto-save to profile
                    saveToProfile: isSinglePax ? true : s.saveToProfile,
                    isCompleted: Boolean(
                      (s.firstName || rawFirst) &&
                      (s.lastName || rawLast) &&
                      (s.dob || rawDob)
                    ),
                  };
                }
              }
              return s;
            }),
          );
        }
      } catch {
        void 0;
      }

      if (didRestore) {
        toast.info("Welcome back! Your saved traveller details have been restored.", {
          toastId: "form-draft-restored",
        });
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [setPassengerSlots]);

  // Auto-save form details to storage when leaving or editing the form
  useEffect(() => {
    const saveDraftToStorage = () => {
      try {
        // Protect: DO NOT overwrite saved draft if current fields are all blank
        if (!hasFormContent(passengerSlots, contactDetails, gstDetails)) {
          return;
        }

        const draftPayload = {
          traceId,
          resultIndex,
          passengerSlots,
          contactDetails,
          gstDetails,
          savedAt: new Date().toISOString(),
        };
        sessionStorage.setItem(
          "flight_booking_form_draft",
          JSON.stringify(draftPayload),
        );
        localStorage.setItem(
          "flight_booking_form_draft",
          JSON.stringify(draftPayload),
        );
      } catch (err) {
        console.warn("Failed to persist flight form details:", err);
      }
    };

    saveDraftToStorage();

    const handleBeforeUnload = () => {
      saveDraftToStorage();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      saveDraftToStorage(); // triggers when leaving form / navigating away
    };
  }, [passengerSlots, contactDetails, gstDetails, traceId, resultIndex]);

  // Handler: Reset/Clear form draft
  const handleClearDraft = () => {
    try {
      sessionStorage.removeItem("flight_booking_form_draft");
      localStorage.removeItem("flight_booking_form_draft");
    } catch {
      void 0;
    }

    setContactDetails({
      countryCode: "+91",
      mobile: "",
      email: "",
      sendUpdates: true,
    });
    setGstDetails({
      hasGst: false,
      gstNumber: "",
      companyName: "",
      companyAddress: "",
      companyEmail: "",
    });
    setSelectedTravellerIds([]);

    setPassengerSlots((prev) =>
      reindexSlots(
        prev.map((s, idx) => ({
          ...s,
          title: s.type === "CHILD" || s.type === "INFANT" ? "Mstr" : "Mr",
          firstName: "",
          lastName: "",
          gender: "",
          dob: "",
          passport: "",
          passportExpiry: "",
          passportIssueDate: "",
          passportIssueCountryCode: "IN",
          nationality: "India",
          addressLine1: "",
          city: "",
          airline: "",
          ffNumber: "",
          mealPreference: "",
          wheelchair: "",
          saveToProfile: false,
          isCompleted: false,
          isExpanded: idx === 0,
          isFromSavedTraveller: false,
          savedTravellerId: null,
        }))
      )
    );
    toast.info("Saved form details have been reset.");
  };

  const _currentAdults = passengerSlots.filter((p) => p.type === "ADULT").length;
  const _currentChildren = passengerSlots.filter((p) => p.type === "CHILD").length;
  const _currentInfants = passengerSlots.filter((p) => p.type === "INFANT").length;

  const getNextSlotId = (slots) =>
    (slots || []).reduce((max, s) => Math.max(max, Number(s.id) || 0), 0) + 1;

  const handleAddSlot = (type = "ADULT") => {
    if (onAddPassenger) {
      onAddPassenger(type);
    } else {
      const pType = type.toUpperCase();
      setPassengerSlots((prev) => {
        const newSlot = {
          id: getNextSlotId(prev),
          type: pType,
          slotTitle: "",
          title: pType === "CHILD" || pType === "INFANT" ? "Mstr" : "Mr",
          firstName: "",
          lastName: "",
          gender: "",
          dob: "",
          passport: "",
          passportExpiry: "",
          passportIssueDate: "",
          passportIssueCountryCode: "IN",
          nationality: "India",
          addressLine1: "",
          city: "",
          airline: "",
          ffNumber: "",
          mealPreference: "",
          wheelchair: "",
          saveToProfile: false,
          isCompleted: false,
          isExpanded: true,
          isFromSavedTraveller: false,
          savedTravellerId: null,
        };
        return reindexSlots(prev.map((s) => ({ ...s, isExpanded: false })).concat(newSlot));
      });
    }
  };

  const handleRemoveSlot = (slotId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (passengerSlots.length <= 1) {
      toast.dismiss();
      toast.warning("At least 1 passenger is required for booking.", {
        toastId: "min-passenger-warning",
        autoClose: 2000,
      });
      return;
    }
    if (onRemovePassenger) {
      onRemovePassenger(slotId);
    } else {
      setPassengerSlots((prev) => reindexSlots(prev.filter((s) => s.id !== slotId)));
    }
  };

  // Helper: Get count of completed passengers for a specific type
  const _getSelectedCount = (type) => {
    return passengerSlots.filter(
      (slot) =>
        slot.type.toLowerCase() === type.toLowerCase() && slot.isCompleted,
    ).length;
  };

  // Helper: Get next available empty slot for a type
  const getNextAvailableSlot = (type) => {
    return passengerSlots.find(
      (slot) =>
        slot.type.toLowerCase() === type.toLowerCase() &&
        !slot.isCompleted &&
        !slot.savedTravellerId,
    );
  };

  // Helper: Check if saved traveller checkbox should be disabled
  const _isTravellerDisabled = (savedTraveller) => {
    const isAlreadySelected = selectedTravellerIds.includes(savedTraveller.id);
    if (isAlreadySelected) return false;
    return false;
  };

  // Helper: Assign saved traveller to slot
  const assignTravellerToSlot = (savedTraveller) => {
    let availableSlot = getNextAvailableSlot(savedTraveller.travellerType);
    const normalizedSavedTitle =
      savedTraveller.title === "Master" ? "Mstr" : (savedTraveller.title || "Mr");
    const inferredGender =
      savedTraveller.gender ||
      (normalizedSavedTitle === "Mr" || normalizedSavedTitle === "Mstr" || normalizedSavedTitle === "Master"
        ? "Male"
        : "Female");

    if (!availableSlot) {
      const pType = (savedTraveller.travellerType || "Adult").toUpperCase();

      setSelectedTravellerIds((prev) => [...prev, savedTraveller.id]);
      setPassengerSlots((prev) => {
        const newSlot = {
          id: getNextSlotId(prev),
          type: pType,
          slotTitle: "",
          title: normalizedSavedTitle,
          firstName: savedTraveller.firstName || "",
          lastName: savedTraveller.lastName || "",
          gender: inferredGender,
          dob: savedTraveller.dob || "",
          passport: savedTraveller.passport || "",
          passportExpiry: savedTraveller.passportExpiry || "",
          passportIssueDate: savedTraveller.passportIssueDate || "",
          passportIssueCountryCode: savedTraveller.passportIssueCountryCode || "IN",
          nationality: savedTraveller.countryName || "India",
          addressLine1: savedTraveller.addressLine1 || "",
          city: savedTraveller.city || "",
          countryCode: savedTraveller.countryCode || "",
          countryName: savedTraveller.countryName || "",
          airline: "",
          ffNumber: "",
          mealPreference: "",
          wheelchair: "",
          saveToProfile: false,
          isCompleted: true,
          isExpanded: true,
          isFromSavedTraveller: true,
          savedTravellerId: savedTraveller.id,
        };
        return reindexSlots(prev.map((s) => ({ ...s, isExpanded: false })).concat(newSlot));
      });
      return;
    }

    setSelectedTravellerIds((prev) => [...prev, savedTraveller.id]);

    setPassengerSlots((prev) =>
      prev.map((slot) => {
        if (slot.id === availableSlot.id) {
          return {
            ...slot,
            title: savedTraveller.title || slot.title,
            firstName: savedTraveller.firstName || slot.firstName,
            lastName: savedTraveller.lastName || slot.lastName,
            gender: inferredGender,
            dob: savedTraveller.dob || slot.dob,
            passport: savedTraveller.passport || slot.passport,
            passportExpiry: savedTraveller.passportExpiry || slot.passportExpiry,
            passportIssueDate:
              savedTraveller.passportIssueDate || slot.passportIssueDate,
            passportIssueCountryCode:
              savedTraveller.passportIssueCountryCode ||
              slot.passportIssueCountryCode ||
              "IN",
            addressLine1: savedTraveller.addressLine1 || slot.addressLine1,
            city: savedTraveller.city || slot.city,
            countryCode: savedTraveller.countryCode || slot.countryCode,
            countryName: savedTraveller.countryName || slot.countryName,
            isCompleted: true,
            isExpanded: true,
            isFromSavedTraveller: true,
            savedTravellerId: savedTraveller.id,
          };
        }
        return { ...slot, isExpanded: false };
      }),
    );
  };

  // Helper: Remove saved traveller from slot
  const removeTravellerFromSlot = (savedTravellerId) => {
    setSelectedTravellerIds((prev) =>
      prev.filter((id) => id !== savedTravellerId),
    );

    setPassengerSlots((prev) =>
      prev.map((slot) => {
        if (slot.savedTravellerId === savedTravellerId) {
          return {
            ...slot,
            firstName: "",
            lastName: "",
            gender: "",
            dob: "",
            passport: "",
            passportExpiry: "",
            passportIssueDate: "",
            passportIssueCountryCode: "IN",
            addressLine1: "",
            city: "",
            isCompleted: false,
            isFromSavedTraveller: false,
            savedTravellerId: null,
          };
        }
        return slot;
      }),
    );
  };

  // Checkbox toggle handler for saved travellers
  const _handleSavedTravellerToggle = (savedTraveller) => {
    const isSelected = selectedTravellerIds.includes(savedTraveller.id);
    if (isSelected) {
      removeTravellerFromSlot(savedTraveller.id);
    } else {
      assignTravellerToSlot(savedTraveller);
    }
  };

  // Helper: Toggle passenger card accordion (Only one card open at a time)
  const togglePassenger = (slotId) => {
    setPassengerSlots((prev) =>
      prev.map((slot) => ({
        ...slot,
        isExpanded: slot.id === slotId ? !slot.isExpanded : false,
      })),
    );
  };

  // Helper: Update single passenger field
  const updatePassenger = (slotId, field, value) => {
    setPassengerSlots((prev) =>
      prev.map((slot) => {
        if (slot.id === slotId) {
          const updated = { ...slot, [field]: value };
          const isComplete = Boolean(
            updated.firstName?.trim() &&
            updated.lastName?.trim() &&
            updated.gender &&
            updated.dob &&
            (!requiredRules.passport || (updated.passport?.trim() && updated.passportExpiry))
          );
          return { ...updated, isCompleted: isComplete };
        }
        return slot;
      }),
    );
  };

  // Helper: Validate individual passenger slot
  const validatePassenger = (slot) => {
    const errors = {};
    if (!slot.firstName?.trim()) errors.firstName = "First Name is required";
    if (!slot.lastName?.trim()) errors.lastName = "Last Name is required";
    if (!slot.gender) errors.gender = "Gender is required";

    if (requiredRules.passport && !slot.passport?.trim()) {
      errors.passport = "Passport number is required for international travel";
    }
    if (requiredRules.passport && !slot.passportExpiry) {
      errors.passportExpiry = "Passport expiry date is required";
    }

    if (!slot.dob) {
      errors.dob = "Date of birth is required";
    }

    return errors;
  };

  // Validate all forms and submit booking
  const handleContinue = async (e) => {
    e.preventDefault();
    setHasSubmitted(true);

    const slotErrors = {};
    let hasSlotErrors = false;

    passengerSlots.forEach((slot) => {
      const errs = validatePassenger(slot);
      if (Object.keys(errs).length > 0) {
        slotErrors[slot.id] = errs;
        hasSlotErrors = true;
      }
    });

    const contactErrs = {};
    if (!contactDetails.mobile?.trim() || contactDetails.mobile.length < 10) {
      contactErrs.mobile = "Enter a valid 10-digit mobile number";
    }
    if (!contactDetails.email?.trim() || !contactDetails.email.includes("@")) {
      contactErrs.email = "Enter a valid email address";
    }

    if (isGstMandatory && !gstDetails.hasGst) {
      contactErrs.gst = "GST details are mandatory for this airline fare";
    }
    if (gstDetails.hasGst || isGstMandatory) {
      if (!gstDetails.gstNumber?.trim()) {
        contactErrs.gst = "GST Number is required when GST is enabled";
      } else if (!gstDetails.companyName?.trim()) {
        contactErrs.gst = "Registered Company Name is required for GST invoice";
      } else if (!(gstDetails.address || gstDetails.companyAddress)?.trim()) {
        contactErrs.gst = "Registered Company Address is required for GST invoice";
      }
    }

    setValidationErrors({
      slots: slotErrors,
      contact: contactErrs,
    });

    if (hasSlotErrors || Object.keys(contactErrs).length > 0) {
      const firstErrorSlot = passengerSlots.find((s) => slotErrors[s.id]);
      if (firstErrorSlot) {
        // Expand the card with the error, NEVER collapse it
        setPassengerSlots((prev) =>
          prev.map((slot) => ({
            ...slot,
            isExpanded: slot.id === firstErrorSlot.id,
          }))
        );

        const slotErr = slotErrors[firstErrorSlot.id];
        const firstErrorKey = Object.keys(slotErr)[0];
        const firstErrorMsg = slotErr[firstErrorKey];
        const slotDisplayName = getSlotDisplayName(firstErrorSlot, passengerSlots);
        toast.error(`${slotDisplayName}: ${firstErrorMsg}`);
      } else if (Object.keys(contactErrs).length > 0) {
        const firstContactKey = Object.keys(contactErrs)[0];
        toast.error(`Contact Details: ${contactErrs[firstContactKey]}`);
      }
      return;
    }

    const token = tokenService.getAccessToken();
    if (!token) {
      toast.warning("Please sign in or register to complete your flight booking.");
      if (onRequireLogin) {
        onRequireLogin();
      }
      return;
    }

    const currentUser =
      tokenService.getUserProfile() ||
      (() => {
        try {
          return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
          return null;
        }
      })();

    if (isPhoneOnlyIncompleteUser(currentUser)) {
      toast.warn(
        "Edit your profile first then add that as traveler and then proceed to flight booking."
      );
      setShowProfileModal(true);
      return;
    }

    updateLoading(true);

    try {
      const normalizedTraceId = String(traceId || "").trim();
      const normalizedResultIndex = String(
        Array.isArray(resultIndex) ? resultIndex[0] : resultIndex || ""
      ).trim();

      if (!normalizedTraceId || !normalizedResultIndex) {
        throw new Error("Missing flight traceId or resultIndex. Please search and select a flight again.");
      }

      // Ensure live fare quote is checked/validated via POST /api/v1/flights/farequote before booking
      // SRDV requires an authenticated user and a valid fare quote cache entry
      if (!isInHouse) {
        try {
          await api.post(
            FlightAPI.FlightFareQuoteApi,
            {
              traceId: normalizedTraceId,
              resultIndex: normalizedResultIndex,
            },
            {
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (fareQuoteCheckErr) {
          console.warn("Live fare quote pre-booking refresh notice:", fareQuoteCheckErr?.message);
        }
      }

      const eligibleSlots = passengerSlots.filter((p) => p.type !== "INFANT");

      const payloadPassengers = passengerSlots.map((slot, index) => {
        const isInfant = String(slot.type || "").toUpperCase() === "INFANT";
        const eligibleIndex = isInfant
          ? -1
          : eligibleSlots.findIndex((s) => s.id === slot.id);
        const lookupIdx = eligibleIndex >= 0 ? eligibleIndex : index;
        const paxSsr = isInfant ? {} : selectedSsr[lookupIdx] || {};
        const paxSeat = isInfant ? {} : selectedSeats[lookupIdx] || {};

        const seatList = paxSeat?.seatNumber
          ? [
              {
                seatNumber: paxSeat.seatNumber,
                code: paxSeat.code || paxSeat.seatNumber,
                amount: Number(paxSeat.amount || paxSeat.Amount || 0),
              },
            ]
          : [];

        const mealList = paxSsr?.meal?.code
          ? [
              {
                code: paxSsr.meal.code,
                price: Number(paxSsr.meal.price || 0),
                description: paxSsr.meal.description || "",
              },
            ]
          : [];

        const baggageList = paxSsr?.baggage?.code
          ? [
              {
                code: paxSsr.baggage.code,
                price: Number(paxSsr.baggage.price || 0),
                weight: paxSsr.baggage.weight || "",
              },
            ]
          : [];

        const isLead = index === 0;
        const countryMeta = resolveCountryMeta(
          slot.nationality || "India",
          contactDetails.countryCode || "+91"
        );
        const issueCountryMeta = resolveCountryMeta(
          slot.passportIssueCountryCode || slot.nationality || "India",
          contactDetails.countryCode || "+91"
        );

        const formatTitle = (rawTitle) => {
          if (rawTitle === "Master") return "Mstr";
          return rawTitle || "Mr";
        };

        const travellerDetails = {
          title: formatTitle(slot.title),
          firstName: (slot.firstName || "").trim(),
          lastName: (slot.lastName || "").trim(),
          passengerType: formatPassengerType(slot.type),
          gender:
            slot.gender ||
            (slot.title === "Mrs" || slot.title === "Ms" || slot.title === "Miss"
              ? "Female"
              : "Male"),
          dateOfBirth: slot.dob || "",
          email: (contactDetails.email || "").trim(),
          phone: (contactDetails.mobile || "").trim(),
          cellCountryCode: contactDetails.countryCode || countryMeta.dial || "+91",
          addressLine1: (slot.addressLine1 || contactDetails.addressLine1 || "Flat 402").trim(),
          city: (slot.city || contactDetails.city || "Mumbai").trim(),
          countryCode: slot.countryCode || countryMeta.code || "IN",
          countryName: slot.countryName || countryMeta.name || "INDIA",
          ...(slot.passport?.trim() || slot.passportNo?.trim()
            ? {
                passportNo: (slot.passport || slot.passportNo || "").trim(),
                passportExpiry: slot.passportExpiry || "",
                passportIssueDate: slot.passportIssueDate || "",
                passportIssueCountryCode:
                  slot.passportIssueCountryCode || issueCountryMeta.code || "IN",
              }
            : {}),
        };

        const rawTravellerId =
          slot.savedTravellerId || slot.travellerId || (typeof slot._id === "string" && slot._id.length === 24 ? slot._id : null);
        const resolvedTravellerId =
          rawTravellerId && typeof rawTravellerId === "string" && /^[0-9a-fA-F]{24}$/.test(rawTravellerId)
            ? rawTravellerId
            : null;

        const isSingleTraveler = passengerSlots.length === 1;
        const autoSave = Boolean(
          !resolvedTravellerId && (slot.saveToProfile || (isSingleTraveler && isLead))
        );

        if (resolvedTravellerId) {
          return {
            travellerId: String(resolvedTravellerId),
            isLeadPax: isLead,
            saveToProfile: false,
            meals: mealList,
            baggage: baggageList,
            seats: seatList,
          };
        }

        return {
          isLeadPax: isLead,
          saveToProfile: autoSave,
          travellerDetails,
          meals: mealList,
          baggage: baggageList,
          seats: seatList,
        };
      });

      const isMongoId = (val) =>
        typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val.trim());

            const resolvedOfferId =
        offerId && isMongoId(offerId)
          ? String(offerId).trim()
          : flight?.offerId && isMongoId(flight.offerId)
            ? String(flight.offerId).trim()
            : selectedOffer?._id && isMongoId(selectedOffer._id)
              ? String(selectedOffer._id).trim()
              : flight?._id && isMongoId(flight._id)
                ? String(flight._id).trim()
                : null;

      const hasLiveSupplierFlight = Boolean(
        !isOffer &&
        !isInHouse &&
        !flight?.isOffer &&
        !flight?.isInHouse &&
        !resolvedOfferId &&
        traceId &&
        resultIndex &&
        !String(traceId).startsWith("OFFER-")
      );

      const isOfferBooking = Boolean(
        !hasLiveSupplierFlight &&
        (isOffer || isInHouse || flight?.isOffer || flight?.isInHouse || Boolean(resolvedOfferId)) &&
        resolvedOfferId
      );
      const targetOfferId = isOfferBooking ? resolvedOfferId : null;

      if (isOfferBooking) {
        if (!targetOfferId) {
          throw new Error("Unable to identify the flight offer ID. Please return to offers and try again.");
        }

        toast.info("Reserving offer inventory (30-min stock hold)...");

        // Format travellers with saved or auto-created traveller records compliant with POST /api/v1/offers/:id/book
        const offerTravellers = await Promise.all(
          passengerSlots.map(async (slot, index) => {
            let tId = slot.savedTravellerId || slot.travellerId;
            const isLead = index === 0;

            if (!tId || !/^[0-9a-fA-F]{24}$/.test(String(tId))) {
              try {
                const dob = slot.dob || "1990-01-01";
                const newTrav = await travellerService.createTraveller({
                  title: slot.title || "Mr",
                  firstName: slot.firstName?.trim() || "Traveler",
                  lastName: slot.lastName?.trim() || "User",
                  email: (contactDetails.email || "").trim().toLowerCase(),
                  phone: (contactDetails.mobile || "").replace(/\D/g, ""),
                  cellCountryCode: contactDetails.countryCode || "+91",
                  passengerType: slot.type === "CHILD" ? "Child" : slot.type === "INFANT" ? "Infant" : "Adult",
                  gender: slot.gender || (["Mrs", "Ms"].includes(slot.title) ? "Female" : "Male"),
                  dateOfBirth: dob,
                  passportNo: (slot.passport || slot.passportNo || "").trim(),
                  passportExpiry: slot.passportExpiry || "",
                  passportIssueCountryCode: slot.passportIssueCountryCode || "IN",
                  nationality: slot.nationality || "India",
                });
                tId = newTrav?._id || newTrav?.id;
              } catch (travErr) {
                console.warn("Could not auto-create traveller for offer:", travErr?.message);
              }
            }

            return {
              ...(tId ? { travellerId: String(tId) } : {}),
              title: slot.title || (slot.gender === "Female" ? "Ms" : "Mr"),
              firstName: slot.firstName?.trim() || "Traveler",
              lastName: slot.lastName?.trim() || "User",
              gender: slot.gender || (["Mrs", "Ms"].includes(slot.title) ? "Female" : "Male"),
              email: slot.email?.trim() || contactDetails?.email || "",
              phone: slot.phone?.trim() || contactDetails?.mobile || "",
              ...(slot.dob ? { dateOfBirth: slot.dob } : {}),
              ...((slot.passport || slot.passportNo)
                ? { passportNumber: (slot.passport || slot.passportNo).trim() }
                : {}),
              isLead,
            };
          })
        );

        const offerBookingPayload = {
          quantity: passengerSlots.length,
          travellers: offerTravellers,
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
            offerRes.message || "Failed to create offer booking reservation."
          );
        }

        toast.success("Offer stock held! Connecting to PayPal checkout...");

        let paymentData = {};
        let redirectUrl = "";
        let paymentError = "";

        try {
          const returnUrl = `${window.location.origin}/payment/paypal/success?type=offer&bookingId=${bookingId}`;
          const cancelUrl = `${window.location.origin}/payment/paypal/cancel?type=offer&bookingId=${bookingId}`;
          const orderRes = await paymentService.createPayPalOrder({
            bookingId,
            bookingType: "offer",
            amount: Number(grandTotal || bookingData.totalAmount || offerRes.totalAmount || 0),
            returnUrl,
            cancelUrl,
          });
          redirectUrl = orderRes.redirectUrl;
          paymentData = orderRes.data || {};
        } catch (payErr) {
          console.warn("[Payment] PayPal create-order error:", payErr?.message);
          paymentError =
            payErr?.response?.data?.message ||
            payErr?.message ||
            "Could not initialize PayPal checkout.";
        }

        try {
          sessionStorage.removeItem("flight_booking_form_draft");
          localStorage.removeItem("flight_booking_form_draft");
        } catch {}

        sessionStorage.setItem("lastOfferBookingId", String(bookingId));
        sessionStorage.setItem("lastPaymentBookingType", "offer");
        sessionStorage.setItem("lastOfferBookingData", JSON.stringify(bookingData));
        sessionStorage.setItem("lastOfferPaymentData", JSON.stringify(paymentData));
        sessionStorage.setItem("lastOfferPassengers", JSON.stringify(offerTravellers));

        const activeToken = getStoredAuthToken();
        if (activeToken) {
          try {
            sessionStorage.setItem("maqam_customer_token", activeToken);
            localStorage.setItem("maqam_customer_token", activeToken);
          } catch {}
        }

        if (redirectUrl) {
          toast.info("Redirecting to PayPal secure checkout...");
          if (redirectUrl.startsWith("/")) {
            navigate(redirectUrl);
          } else {
            window.location.assign(redirectUrl);
          }
        } else {
          throw new Error(paymentError || "PayPal checkout approval link was not returned.");
        }
        return;
      }

      const bookingPayload = {
        traceId: normalizedTraceId,
        resultIndex: normalizedResultIndex,
        passengers: payloadPassengers,
        ...(gstDetails.hasGst && gstDetails.gstNumber?.trim()
          ? {
              gstDetails: {
                gstNumber: gstDetails.gstNumber.trim(),
                companyName: (gstDetails.companyName || "").trim(),
                address: (gstDetails.address || gstDetails.companyAddress || "").trim(),
              },
            }
          : {}),
      };

      console.log("POST /api/v1/flights/book Payload:", JSON.stringify(bookingPayload, null, 2));

      toast.info("Reserving flight and creating PayPal checkout order...");
      const idempotencyKey = `flt_bk_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      let bookRes;
      try {
        bookRes = await flightService.bookFlight(bookingPayload, idempotencyKey);
      } catch (bookErr) {
        const errMsg = bookErr?.response?.data?.message || bookErr?.message || "";
        const rawErr = bookErr?.response?.data?.details?.rawError || bookErr?.details?.rawError;
        const srdvCode = String(bookErr?.response?.data?.details?.srdvErrorCode || bookErr?.details?.srdvErrorCode || "");
        const isDuplicate = /duplicate\s+booking/i.test(errMsg) || srdvCode === "2" || rawErr?.ErrorCode === 2 || rawErr?.ErrorCode === "2";

        if (isDuplicate) {
          toast.info("Active reservation detected with supplier. Checking your bookings...");
          try {
            const myBookingsRes = await flightService.getMyBookings();
            const bookingsList = myBookingsRes?.data || myBookingsRes?.bookings || (Array.isArray(myBookingsRes) ? myBookingsRes : []);
            const matchingBooking = bookingsList.find(
              (b) => String(b.traceId) === String(normalizedTraceId)
            );
            if (matchingBooking && (matchingBooking._id || matchingBooking.id)) {
              bookRes = { bookingId: matchingBooking._id || matchingBooking.id, data: matchingBooking, ...matchingBooking };
            } else {
              throw bookErr;
            }
          } catch (lookupErr) {
            throw bookErr;
          }
        } else {
          throw bookErr;
        }
      }

      const bookingId =
        bookRes?.bookingId ||
        bookRes?._id ||
        bookRes?.id ||
        bookRes?.data?.bookingId ||
        bookRes?.data?._id;
      const data = bookRes?.data || bookRes || {};

      if (!bookingId) {
        throw new Error("Booking response did not include a valid bookingId.");
      }

      toast.success("Flight booking initiated! Connecting to PayPal...");

      // Call PayPal Create Order API
      let paymentData = {};
      let redirectUrl = "";
      let paymentError = "";
      try {
        const returnUrl = `${window.location.origin}/payment/paypal/success?type=flight&bookingId=${bookingId}`;
        const cancelUrl = `${window.location.origin}/payment/paypal/cancel?type=flight&bookingId=${bookingId}`;
        const orderRes = await paymentService.createPayPalOrder({
          bookingId,
          bookingType: "flight",
          amount: Number(grandTotal || data.totalAmount || 0),
          returnUrl,
          cancelUrl,
        });
        redirectUrl = orderRes.redirectUrl;
        paymentData = orderRes.data || {};
      } catch (payErr) {
        console.warn("[Payment] PayPal create-order error:", payErr?.message);
        paymentError =
          payErr?.response?.data?.message ||
          payErr?.message ||
          "Could not initialize PayPal checkout.";
      }

      // Clear saved form draft upon successful reservation
      try {
        sessionStorage.removeItem("flight_booking_form_draft");
        localStorage.removeItem("flight_booking_form_draft");
      } catch {
        void 0;
      }

      // Save current booking context for verification on success page
      sessionStorage.setItem("lastFlightBookingId", String(bookingId));
      sessionStorage.setItem("lastPaymentBookingType", "flight");
      sessionStorage.setItem("lastFlightBookingData", JSON.stringify(data));
      sessionStorage.setItem("lastFlightPaymentData", JSON.stringify(paymentData));
      sessionStorage.setItem("lastFlightPassengers", JSON.stringify(payloadPassengers));
      sessionStorage.setItem("lastFlightSeats", JSON.stringify(selectedSeats));
      sessionStorage.setItem(
        "lastFlightDetails",
        JSON.stringify({ ...(fareQuote || {}), ...(flight ? { flight } : {}) })
      );
      if (paymentError) {
        sessionStorage.setItem("lastFlightPaymentNotice", paymentError);
      } else {
        sessionStorage.removeItem("lastFlightPaymentNotice");
      }
      if (grandTotal) sessionStorage.setItem("lastFlightGrandTotal", String(grandTotal));
      if (netFare) sessionStorage.setItem("lastFlightNetFare", String(netFare));

      const activeToken = getStoredAuthToken();
      if (activeToken) {
        try {
          sessionStorage.setItem("maqam_customer_token", activeToken);
          localStorage.setItem("maqam_customer_token", activeToken);
        } catch {
          void 0;
        }
      }

      if (redirectUrl) {
        toast.info("Redirecting to PayPal secure checkout...");
        if (redirectUrl.startsWith("/")) {
          navigate(redirectUrl);
        } else {
          window.location.assign(redirectUrl);
        }
      } else {
        toast.warn(
          "Flight reserved! Please complete your PayPal payment to issue e-tickets."
        );
        navigate(`/flight-booking-success?bookingId=${bookingId}&status=pending`);
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to complete booking";
      toast.error(errorMsg);
    } finally {
      updateLoading(false);
    }
  };

  return (
    <>
      <form id={formId} onSubmit={handleContinue} className="space-y-6">
      {/* Yellow Warning Banner (MakeMyTrip Style) */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900 shadow-sm">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <span className="font-bold">Important: </span>
          Enter your name exactly as on your Government ID / Passport.
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Clean Header Bar */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-teal-600" />
            <h3 className="font-bold text-gray-900 text-sm">Traveller Details</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
              {passengerSlots.length} Traveller{passengerSlots.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Details auto-saved</span>
            </span>
            <button
              type="button"
              onClick={handleClearDraft}
              className="text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 px-2.5 py-1 rounded-lg border border-gray-200 transition cursor-pointer"
              title="Reset all entered form details"
            >
              Reset Form
            </button>
          </div>
        </div>

        {/* Saved Travellers Quick-Select Bar */}
        {_savedTravellers.length > 0 && (
          <div className="px-4 py-3 bg-teal-50/40 border-b border-gray-200">
            <p className="text-[11px] font-bold text-teal-800 uppercase tracking-wider mb-2">
              Saved Travellers (Click to autofill)
            </p>
            <div className="flex flex-wrap gap-2">
              {_savedTravellers.map((trav) => {
                const isSelected =
                  selectedTravellerIds.includes(trav.id) ||
                  passengerSlots.some((s) => s.savedTravellerId === trav.id);
                return (
                  <button
                    key={trav.id}
                    type="button"
                    onClick={() => _handleSavedTravellerToggle(trav)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                      isSelected
                        ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                        : "bg-white text-gray-700 border-gray-300 hover:border-teal-400 hover:text-teal-700"
                    }`}
                  >
                    <span>
                      {trav.title} {trav.firstName} {trav.lastName}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? "bg-teal-700 text-teal-100"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {trav.travellerType}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Passenger Cards Accordion */}
        <div className="divide-y divide-gray-200">
          {passengerSlots.map((slot) => {
            const slotErr = hasSubmitted && validationErrors.slots?.[slot.id];

            return (
              <div key={slot.id} className="transition-colors">
                {/* Passenger Card Header */}
                <div
                  onClick={() => togglePassenger(slot.id)}
                  className={`flex items-center justify-between p-4 cursor-pointer select-none transition-colors ${
                    slot.isExpanded ? "bg-teal-50/40" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        slot.isCompleted
                          ? "bg-teal-600 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {slot.isCompleted ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <User className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {getSlotDisplayName(slot, passengerSlots)}
                        </h3>
                        <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-gray-100 text-gray-600">
                          {slot.type}
                        </span>
                      </div>

                      {slot.isCompleted ? (
                        <p className="text-xs text-teal-700 font-medium mt-0.5 flex items-center gap-1">
                          ✓ Traveller Details Added
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Requires Name, Gender & Date of Birth
                          {requiredRules.passport ? " & Passport" : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {passengerSlots.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleRemoveSlot(slot.id, e)}
                        className="px-2.5 py-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold active:scale-95 shadow-2xs"
                        title="Delete this traveller"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}

                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                        slot.isExpanded ? "rotate-180 text-teal-600" : ""
                      }`}
                    />
                  </div>
                </div>

                {/* Passenger Card Body */}
                {slot.isExpanded && (
                  <div className="p-5 border-t border-gray-100 bg-white space-y-5">
                    {/* Section 1: Basic Identity Information */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-teal-600" />
                        <span>Personal Information</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {/* Title */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Title <span className="text-red-500">*</span>
                          </label>
                          <select
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            value={slot.title}
                            onChange={(e) =>
                              updatePassenger(slot.id, "title", e.target.value)
                            }
                          >
                            {slot.type === "ADULT" && (
                              <>
                                <option value="Mr">Mr</option>
                                <option value="Mrs">Mrs</option>
                                <option value="Ms">Ms</option>
                              </>
                            )}
                            {(slot.type === "CHILD" ||
                              slot.type === "INFANT") && (
                              <>
                                <option value="Mstr">Master (Mstr)</option>
                                <option value="Miss">Miss</option>
                              </>
                            )}
                          </select>
                        </div>

                        {/* First Name */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            First & Middle Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                              slotErr?.firstName
                                ? "border-red-500 bg-red-50"
                                : "border-gray-300"
                            }`}
                            placeholder="As on passport / ID"
                            value={slot.firstName}
                            onChange={(e) =>
                              updatePassenger(
                                slot.id,
                                "firstName",
                                e.target.value,
                              )
                            }
                          />
                          {slotErr?.firstName && (
                            <p className="text-xs text-red-500 mt-1">
                              {slotErr.firstName}
                            </p>
                          )}
                        </div>

                        {/* Last Name */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Last Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                              slotErr?.lastName
                                ? "border-red-500 bg-red-50"
                                : "border-gray-300"
                            }`}
                            placeholder="Surname"
                            value={slot.lastName}
                            onChange={(e) =>
                              updatePassenger(slot.id, "lastName", e.target.value)
                            }
                          />
                          {slotErr?.lastName && (
                            <p className="text-xs text-red-500 mt-1">
                              {slotErr.lastName}
                            </p>
                          )}
                        </div>

                        {/* Gender */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Gender <span className="text-red-500">*</span>
                          </label>
                          <select
                            className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                              slotErr?.gender
                                ? "border-red-500 bg-red-50"
                                : "border-gray-300"
                            }`}
                            value={slot.gender}
                            onChange={(e) =>
                              updatePassenger(slot.id, "gender", e.target.value)
                            }
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                          {slotErr?.gender && (
                            <p className="text-xs text-red-500 mt-1">
                              {slotErr.gender}
                            </p>
                          )}
                        </div>

                        {/* Date of Birth */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Date of Birth <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            max={new Date().toISOString().split("T")[0]}
                            className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                              slotErr?.dob ? "border-red-500 bg-red-50" : "border-gray-300"
                            }`}
                            value={slot.dob}
                            onChange={(e) =>
                              updatePassenger(slot.id, "dob", e.target.value)
                            }
                          />
                          {slotErr?.dob && (
                            <p className="text-xs text-red-500 mt-1 font-medium">
                              {slotErr.dob}
                            </p>
                          )}
                        </div>
                        {/* Address Line 1 */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Address Line 1
                          </label>
                          <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            placeholder="e.g. Flat 402"
                            value={slot.addressLine1 || ""}
                            onChange={(e) =>
                              updatePassenger(slot.id, "addressLine1", e.target.value)
                            }
                          />
                        </div>

                        {/* City */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            placeholder="e.g. Mumbai"
                            value={slot.city || ""}
                            onChange={(e) =>
                              updatePassenger(slot.id, "city", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Passport & Travel Documents */}
                    <div className="pt-3 border-t border-gray-100">
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-teal-600" />
                        <span>
                          Passport & Travel Documents{" "}
                          {requiredRules.passport ? (
                            <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold normal-case">
                              Required for International Flight
                            </span>
                          ) : (
                            "(Optional / Domestic)"
                          )}
                        </span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Passport Number */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Passport Number {requiredRules.passport && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="text"
                            className={`w-full border rounded-lg p-2.5 text-sm uppercase focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder:normal-case ${
                              slotErr?.passport ? "border-red-500 bg-red-50" : "border-gray-300"
                            }`}
                            placeholder="e.g. J1234567"
                            value={slot.passport || ""}
                            onChange={(e) =>
                              updatePassenger(slot.id, "passport", e.target.value.toUpperCase())
                            }
                          />
                          {slotErr?.passport && (
                            <p className="text-xs text-red-500 mt-1 font-medium">
                              {slotErr.passport}
                            </p>
                          )}
                        </div>

                        {/* Issuing Country / Nationality */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Nationality / Issuing Country
                          </label>
                          <select
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            value={slot.nationality || "India"}
                            onChange={(e) =>
                              updatePassenger(slot.id, "nationality", e.target.value)
                            }
                          >
                            {POPULAR_NATIONALITIES.map((nat) => (
                              <option key={nat} value={nat}>
                                {nat}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Passport Issue Date */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Passport Issue Date
                          </label>
                          <input
                            type="date"
                            max={new Date().toISOString().split("T")[0]}
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            value={slot.passportIssueDate || ""}
                            onChange={(e) =>
                              updatePassenger(slot.id, "passportIssueDate", e.target.value)
                            }
                          />
                        </div>

                        {/* Passport Expiry Date */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Passport Expiry Date
                          </label>
                          <input
                            type="date"
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            value={slot.passportExpiry || ""}
                            onChange={(e) =>
                              updatePassenger(slot.id, "passportExpiry", e.target.value)
                            }
                          />
                        </div>
                      </div>

                      {slot.isFromSavedTraveller || slot.savedTravellerId ? (
                        <div className="inline-flex items-center gap-1.5 mt-3 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Saved in your profile</span>
                        </div>
                      ) : (
                        <label className="inline-flex items-center gap-2 mt-3 text-xs text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(slot.saveToProfile)}
                            onChange={(e) =>
                              updatePassenger(slot.id, "saveToProfile", e.target.checked)
                            }
                            className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                          />
                          <span>
                            Save traveller details to my profile{" "}
                            {passengerSlots.length === 1 && (
                              <span className="text-teal-700 font-semibold">(Auto-saved for single traveler)</span>
                            )}
                          </span>
                        </label>
                      )}
                    </div>

                    {/* Section 3: Loyalty & Special Preferences */}
                    <div className="pt-3 border-t border-gray-100">
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                        <span>Loyalty & Flight Preferences (Optional)</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Frequent Flyer Airline */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Loyalty Airline
                          </label>
                          <select
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            value={slot.airline || ""}
                            onChange={(e) =>
                              updatePassenger(slot.id, "airline", e.target.value)
                            }
                          >
                            <option value="">Select Airline</option>
                            {POPULAR_AIRLINES.map((air) => (
                              <option key={air} value={air}>
                                {air}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Frequent Flyer Number */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Frequent Flyer No.
                          </label>
                          <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            placeholder="e.g. FF89210"
                            value={slot.ffNumber || ""}
                            onChange={(e) =>
                              updatePassenger(slot.id, "ffNumber", e.target.value)
                            }
                          />
                        </div>

                        {/* Meal Preference */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Meal Preference
                          </label>
                          <select
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            value={slot.mealPreference || ""}
                            onChange={(e) =>
                              updatePassenger(slot.id, "mealPreference", e.target.value)
                            }
                          >
                            {MEAL_PREFERENCES.map((m) => (
                              <option key={m.code} value={m.code}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Wheelchair Assistance */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Special Assistance
                          </label>
                          <select
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            value={slot.wheelchair || ""}
                            onChange={(e) =>
                              updatePassenger(slot.id, "wheelchair", e.target.value)
                            }
                          >
                            {WHEELCHAIR_OPTIONS.map((w) => (
                              <option key={w.code} value={w.code}>
                                {w.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add More Passengers Action Bar */}
        <div className="p-4 bg-slate-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-teal-600" />
              <span>Need to add more travellers?</span>
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Add extra family members, pilgrims or friends to this flight booking
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => handleAddSlot("ADULT")}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 active:scale-95 text-white flex items-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Traveller</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contact Details Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-600" />
          Booking Details Will Be Sent To
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Your ticket & booking information will be sent to these contact
          details.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Country Code
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={contactDetails.countryCode}
              onChange={(e) =>
                setContactDetails((prev) => ({
                  ...prev,
                  countryCode: e.target.value,
                }))
              }
            >
              <option value="+91">India (+91)</option>
              <option value="+1">USA (+1)</option>
              <option value="+971">UAE (+971)</option>
              <option value="+966">Saudi Arabia (+966)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="tel"
                className={`w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  hasSubmitted && validationErrors.contact?.mobile
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300"
                }`}
                placeholder="Mobile Number"
                value={contactDetails.mobile}
                onChange={(e) =>
                  setContactDetails((prev) => ({
                    ...prev,
                    mobile: e.target.value,
                  }))
                }
              />
            </div>
            {hasSubmitted && validationErrors.contact?.mobile && (
              <p className="text-xs text-red-500 mt-1">
                {validationErrors.contact.mobile}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="email"
                className={`w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  hasSubmitted && validationErrors.contact?.email
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300"
                }`}
                placeholder="Email Address"
                value={contactDetails.email}
                onChange={(e) =>
                  setContactDetails((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
              />
            </div>
            {hasSubmitted && validationErrors.contact?.email && (
              <p className="text-xs text-red-500 mt-1">
                {validationErrors.contact.email}
              </p>
            )}
          </div>
        </div>

        <label className="flex items-center gap-2 mt-4 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={contactDetails.sendUpdates}
            onChange={(e) =>
              setContactDetails((prev) => ({
                ...prev,
                sendUpdates: e.target.checked,
              }))
            }
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
          />
          Send booking updates and flight status via WhatsApp / Email
        </label>
      </div>

      {/* GST Accordion Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div
          onClick={() => setIsGstExpanded(!isGstExpanded)}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 select-none"
        >
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-gray-500" />
            <div>
              <h4 className="font-semibold text-gray-800 text-sm">
                GST Details (Optional)
              </h4>
              <p className="text-xs text-gray-500">
                Claim credit on your GST invoice
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isGstExpanded ? "rotate-180 text-blue-600" : ""
            }`}
          />
        </div>

        {isGstExpanded && (
          <div className="p-5 border-t border-gray-100 bg-gray-50/50 space-y-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={gstDetails.hasGst}
                onChange={(e) =>
                  setGstDetails((prev) => ({
                    ...prev,
                    hasGst: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              I have a GST Number
            </label>

            {gstDetails.hasGst && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    GST Number
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="22AAAAA0000A1Z5"
                    value={gstDetails.gstNumber}
                    onChange={(e) =>
                      setGstDetails((prev) => ({
                        ...prev,
                        gstNumber: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Registered Company Name
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Company Name"
                    value={gstDetails.companyName}
                    onChange={(e) =>
                      setGstDetails((prev) => ({
                        ...prev,
                        companyName: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Registered Company Address
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Company Address"
                    value={gstDetails.companyAddress}
                    onChange={(e) =>
                      setGstDetails((prev) => ({
                        ...prev,
                        companyAddress: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Company Email
                  </label>
                  <input
                    type="email"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Company Email"
                    value={gstDetails.companyEmail}
                    onChange={(e) =>
                      setGstDetails((prev) => ({
                        ...prev,
                        companyEmail: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </form>

    <ProfileCompletionModal
      isOpen={showProfileModal}
      onClose={() => setShowProfileModal(false)}
      user={modalUserProfile}
      prefillData={modalPrefillData}
      bookingType="flight"
      onSuccess={(savedTravellerId, updatedData) => {
        if (updatedData?.user) {
          const u = updatedData.user;
          const trav = updatedData.traveller;
          const travDob = trav?.dateOfBirth ? String(trav.dateOfBirth).split("T")[0] : "";
          const resolvedGender = u.gender || (u.title === "Mrs" || u.title === "Ms" ? "Female" : "Male");
          const resolvedTitle = u.title || (resolvedGender === "Female" ? "Ms" : "Mr");

          setContactDetails((prev) => ({
            ...prev,
            email: u.email || prev.email,
            mobile: u.phone || prev.mobile,
          }));
          setPassengerSlots((prev) =>
            prev.map((slot, idx) =>
              idx === 0
                ? {
                    ...slot,
                    title: resolvedTitle,
                    firstName: u.firstName || slot.firstName,
                    lastName: u.lastName || slot.lastName,
                    gender: resolvedGender,
                    dob: travDob || slot.dob || "1994-01-01",
                    savedTravellerId: savedTravellerId || slot.savedTravellerId,
                    isFromSavedTraveller: true,
                    isCompleted: true,
                    saveToProfile: true,
                  }
                : slot
            )
          );
        }
        toast.info("Profile verified! Proceeding with your flight reservation...");
        setTimeout(() => {
          handleContinue({ preventDefault: () => {} });
        }, 350);
      }}
    />
  </>
);
};

export default TravellerDetails;
