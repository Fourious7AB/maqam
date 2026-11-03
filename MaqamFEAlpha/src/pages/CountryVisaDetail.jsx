import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { tokenService } from "../admin/services/tokenService";
import {
  User,
  ShieldCheck,
  Clock,
  Calendar,
  CreditCard,
  FileCheck2,
  CheckCircle2,
  Check,
  FileText,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  Camera,
  Trash2,
  Plus,
  Plane,
  Building,
  HelpCircle,
  MessageSquare,
  BadgeCheck,
  Lock,
  LogIn,
  Globe,
  X,
  Loader2,
  Info,
} from "lucide-react";
import { toast } from "react-toastify";
import Logo from "../assets/logo.png";
import LumaSpin from "../components/ui/LumaSpin";

const Login = lazy(() => import("../components/Login"));
const Register = lazy(() => import("./Register"));
import api from "../components/stores/api";
import { VisaAPI, PaymentAPI } from "../configs/api";
import paymentService from "../services/paymentService";
import { getCountryVisaData } from "../data/visaCountriesData";
import anime from "animejs";
import {
  staggerEntrance,
  springEntrance,
  clickSquash,
} from "../animations/presets";

// Bulletproof Country Flag Renderer (handles URLs, Cloudinary paths, and emojis without leaking links)
function CountryFlagIcon({
  flag,
  code,
  name = "Country",
  className = "w-6 h-4 rounded-sm object-cover inline-block shadow-2xs shrink-0",
}) {
  const isImageUrl =
    typeof flag === "string" &&
    (flag.startsWith("http") ||
      flag.includes("/") ||
      flag.includes(".png") ||
      flag.includes(".jpg") ||
      flag.includes(".webp") ||
      flag.includes(".svg"));

  if (isImageUrl) {
    const src = flag.startsWith("http")
      ? flag
      : code
        ? `https://flagcdn.com/w80/${code.toLowerCase()}.png`
        : `https://flagcdn.com/w80/ae.png`;

    return (
      <img
        src={src}
        alt={`${name} flag`}
        className={className}
        loading="lazy"
        onError={(e) => {
          if (code) {
            e.currentTarget.src = `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
          } else {
            e.currentTarget.style.display = "none";
          }
        }}
      />
    );
  }

  return (
    <span className="leading-none select-none text-base shrink-0 inline-block">
      {flag || "🌐"}
    </span>
  );
}

export default function CountryVisaDetail() {
  const { countrySlug } = useParams();
  const navigate = useNavigate();

  // Authentication State
  const isAuthenticated = useSelector(
    (state) =>
      state.auth.isAuthenticated ||
      Boolean(tokenService.getAccessToken()),
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setAuthModalView("login");
      setShowAuthModal(true);
      toast.info("Log in is mandatory to view visa details.");
    }
  }, [isAuthenticated]);

  // Database Country Data (Enriched from VisaAPI)
  const [dbCountryData, setDbCountryData] = useState(null);
  const [allCountryVisas, setAllCountryVisas] = useState([]);
  const [selectedVisaId, setSelectedVisaId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDbVisas = async () => {
      try {
        const response = await api.get(VisaAPI.UserVisasCatalogApi);
        const resData = response.data?.data || response.data;
        const available =
          resData?.availableVisas || (Array.isArray(resData) ? resData : null);

        if (isMounted && available && available.length > 0) {
          const slug = (countrySlug || "").toLowerCase().trim();
          const matchedList = available.filter((v) => {
            const countryName = (v.country || "").toLowerCase().trim();
            const title = (v.title || "").toLowerCase().trim();
            const cCode = (v.countryCode || "").toLowerCase().trim();
            const id = String(v._id || v.id || "").toLowerCase();

            return (
              countryName.replace(/\s+/g, "-") === slug ||
              countryName === slug.replace(/-/g, " ") ||
              cCode === slug ||
              id === slug ||
              title.toLowerCase().replace(/\s+/g, "-") === slug ||
              countryName.includes(slug.replace(/-/g, " "))
            );
          });

          if (matchedList.length > 0) {
            setAllCountryVisas(matchedList);
            const activeMatch =
              matchedList.find((v) => String(v._id) === slug || String(v.id) === slug) ||
              matchedList[0];
            setDbCountryData(activeMatch);
            setSelectedVisaId(activeMatch._id || activeMatch.id);
          }
        }
      } catch (err) {
        console.warn("Could not fetch DB country visa data:", err);
      }
    };
    fetchDbVisas();
    return () => {
      isMounted = false;
    };
  }, [countrySlug]);

  const handleSelectVisa = (visa) => {
    if (!visa) return;
    setDbCountryData(visa);
    setSelectedVisaId(visa._id || visa.id);
  };

  // Active Country Data (Resolved dynamically & enriched with DB values)
  const country = useMemo(() => {
    const base = getCountryVisaData(countrySlug || "indonesia");
    if (!dbCountryData) return base;

    const totalPrice =
      dbCountryData.fees?.totalPrice ||
      dbCountryData.fees?.basePrice ||
      base.priceNumber;

    const currencySymbol =
      dbCountryData.fees?.currency === "USD"
        ? "$"
        : dbCountryData.fees?.currency === "EUR"
          ? "€"
          : dbCountryData.fees?.currency === "AED"
            ? "AED "
            : "₹";

    const flag =
      dbCountryData.countryFlag && dbCountryData.countryFlag.startsWith("http")
        ? dbCountryData.countryFlag
        : dbCountryData.flagEmoji ||
        (dbCountryData.countryCode
          ? `https://flagcdn.com/w80/${dbCountryData.countryCode.toLowerCase()}.png`
          : base.flag);

    // Helpers to generate intelligent fallback descriptions and icons
    const getDocDefaultDesc = (docType = "", label = "") => {
      const t = (docType + " " + label).toLowerCase();
      if (t.includes("photo") || t.includes("picture") || t.includes("selfie")) {
        return "Recent passport-size color photograph with white background, front-facing without glare.";
      }
      if (t.includes("passport") || t.includes("scan") || t.includes("bio")) {
        return "Clear color scan or photo of passport front/bio page with minimum 6 months validity.";
      }
      if (t.includes("ticket") || t.includes("flight")) {
        return "Confirmed onward or return flight itinerary.";
      }
      if (t.includes("hotel") || t.includes("stay") || t.includes("accommodation")) {
        return "Confirmed hotel reservation or accommodation proof.";
      }
      if (t.includes("bank") || t.includes("statement") || t.includes("financial")) {
        return "Bank account statement showing sufficient funds for travel.";
      }
      return "Official required document for verification and visa submission.";
    };

    const getDocIconType = (docType = "", label = "") => {
      const t = (docType + " " + label).toLowerCase();
      if (t.includes("photo") || t.includes("picture")) return "photo";
      if (t.includes("flight") || t.includes("ticket")) return "flight";
      if (t.includes("hotel") || t.includes("accommodation")) return "hotel";
      if (t.includes("bank") || t.includes("financial")) return "finance";
      return "passport";
    };

    const formatAllowedMimes = (mimes) => {
      if (!Array.isArray(mimes) || mimes.length === 0) return "JPG, PNG, PDF";
      return mimes
        .map((m) => {
          if (m.includes("jpeg") || m.includes("jpg")) return "JPG";
          if (m.includes("png")) return "PNG";
          if (m.includes("webp")) return "WEBP";
          if (m.includes("pdf")) return "PDF";
          return m.split("/")[1]?.toUpperCase() || m;
        })
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(", ");
    };

    // Format Required Documents from Backend
    const requiredDocs =
      Array.isArray(dbCountryData.requiredDocuments) &&
        dbCountryData.requiredDocuments.length > 0
        ? dbCountryData.requiredDocuments.map((doc, idx) => {
          if (typeof doc === "string") {
            return {
              id: `doc_${idx}`,
              docType: doc,
              title: doc,
              label: doc,
              desc: getDocDefaultDesc(doc, doc),
              required: true,
              isRequired: true,
              allowedMimes: ["image/jpeg", "image/png", "application/pdf"],
              formatsText: "JPG, PNG, PDF",
              maxSizeBytes: 5242880,
              maxSizeText: "5 MB",
              icon: getDocIconType(doc, doc),
            };
          }
          const docType = doc.docType || (doc.label?.toLowerCase().includes("photo") ? "travellerPhoto" : "passportScan");
          const label = doc.label || doc.title || (doc.docType ? doc.docType.replace(/([A-Z])/g, " $1").trim() : `Document ${idx + 1}`);
          const isReq = doc.isRequired !== undefined ? doc.isRequired : (doc.required !== undefined ? doc.required : true);
          const mimes = doc.allowedMimes || ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
          const maxBytes = doc.maxSizeBytes || 5242880;
          const maxMB = Math.round(maxBytes / (1024 * 1024)) || 5;

          return {
            id: doc._id || `doc_${idx}`,
            docType,
            title: label,
            label,
            desc: doc.description?.trim() || getDocDefaultDesc(docType, label),
            required: isReq,
            isRequired: isReq,
            allowedMimes: mimes,
            formatsText: formatAllowedMimes(mimes),
            maxSizeBytes: maxBytes,
            maxSizeText: `${maxMB} MB`,
            icon: getDocIconType(docType, label),
          };
        })
        : base.documents;

    return {
      ...base,
      id: dbCountryData._id || base.id,
      _id: dbCountryData._id,
      country: dbCountryData.country
        ? dbCountryData.country
          .toLowerCase()
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
        : base.country,
      code: dbCountryData.countryCode || base.code,
      flag,
      type: dbCountryData.visaType || base.type,
      title: dbCountryData.title || `${dbCountryData.country || base.country} ${dbCountryData.visaType || base.type}`,
      validity: dbCountryData.validity || base.validity,
      stayDuration: dbCountryData.stayDuration || base.stayDuration,
      entryType: dbCountryData.entryType || base.entryType,
      headline:
        dbCountryData.title ||
        dbCountryData.description ||
        base.headline,
      description: dbCountryData.description || base.headline,
      price: `${currencySymbol}${totalPrice.toLocaleString()}`,
      priceNumber: totalPrice,
      currencySymbol,
      fees: dbCountryData.fees || null,
      inventory: dbCountryData.inventory || null,
      govtFee: dbCountryData.fees?.governmentFee !== undefined
        ? `${currencySymbol}${dbCountryData.fees.governmentFee.toLocaleString()}`
        : base.govtFee,
      serviceFee: dbCountryData.fees?.serviceFee !== undefined
        ? `${currencySymbol}${dbCountryData.fees.serviceFee.toLocaleString()}`
        : base.serviceFee,
      baseFee: dbCountryData.fees?.basePrice !== undefined
        ? `${currencySymbol}${dbCountryData.fees.basePrice.toLocaleString()}`
        : null,
      taxFee: dbCountryData.fees?.tax !== undefined
        ? `${currencySymbol}${dbCountryData.fees.tax.toLocaleString()}`
        : null,
      timeline: dbCountryData.processingTime || base.timeline,
      processingTime: dbCountryData.processingTime || base.processingTime,
      heroImage:
        dbCountryData.bannerImage ||
        dbCountryData.countryPicture ||
        base.heroImage,
      cardImage:
        dbCountryData.countryImage ||
        dbCountryData.countryPicture ||
        base.cardImage,
      documents: requiredDocs,
      rules:
        Array.isArray(dbCountryData.guidelines) &&
          dbCountryData.guidelines.length > 0
          ? dbCountryData.guidelines
          : base.rules,
      termsAndConditions:
        Array.isArray(dbCountryData.termsAndConditions) &&
          dbCountryData.termsAndConditions.length > 0
          ? dbCountryData.termsAndConditions
          : [],
      gallery: Array.isArray(dbCountryData.gallery) ? dbCountryData.gallery : [],
    };
  }, [countrySlug, dbCountryData]);

  // Dynamic Photo requirement derived from backend documents
  const photoDocSpec = useMemo(() => {
    return country?.documents?.find(
      (d) =>
        d.docType === "travellerPhoto" ||
        d.docType === "photo" ||
        d.title?.toLowerCase().includes("photo") ||
        d.label?.toLowerCase().includes("photo"),
    );
  }, [country]);

  const isPhotoMandatory = Boolean(photoDocSpec?.required);

  // UI State
  const [activeTab, setActiveTab] = useState("info"); // 'info' | 'process' | 'faqs'
  const [activeFaq, setActiveFaq] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalView, setAuthModalView] = useState("login");

  // Application Modal State
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPayingVisaId, setIsPayingVisaId] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submissionData, setSubmissionData] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Handle Proceed to Payment (PayPal) for any Visa Batch
  const handlePayVisaGroup = async (groupId) => {
    if (!groupId || isPayingVisaId) return;
    try {
      setIsPayingVisaId(groupId);
      toast.info("Connecting to PayPal secure checkout...");

      const returnUrl = `${window.location.origin}/payment/paypal/success?type=visa&bookingId=${groupId}`;
      const cancelUrl = `${window.location.origin}/payment/paypal/cancel?type=visa&bookingId=${groupId}`;

      const paymentOrderRes = await paymentService.createPayPalOrder({
        bookingId: groupId,
        bookingType: "visa",
        returnUrl,
        cancelUrl,
      });

      const redirectUrl =
        paymentOrderRes?.redirectUrl ||
        paymentOrderRes?.approvalUrl ||
        paymentOrderRes?.data?.redirectUrl ||
        paymentOrderRes?.data?.approvalUrl ||
        paymentOrderRes?.data?.links?.find((l) => l.rel === "approve")?.href;

      if (redirectUrl) {
        sessionStorage.setItem("lastVisaBookingId", String(groupId));
        sessionStorage.setItem("lastPaymentBookingType", "visa");
        toast.info("Redirecting to PayPal...");
        window.location.assign(redirectUrl);
      } else {
        throw new Error(
          paymentOrderRes?.message ||
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
    } finally {
      setIsPayingVisaId(null);
    }
  };

  const [autoSaveStatus, setAutoSaveStatus] = useState("saved"); // "saving" | "saved"

  const [applicants, setApplicants] = useState(() => {
    try {
      const raw = localStorage.getItem(`visa_draft_${countrySlug || "default"}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : parsed?.applicants;
        if (Array.isArray(list) && list.length > 0) {
          return list.map((a) => ({
            ...a,
            passportPhoto: null,
            photoPreview: a.photoPreview || null,
            travelerPhoto: null,
            travelerPhotoPreview: a.travelerPhotoPreview || null,
          }));
        }
      }
    } catch { }

    // Pre-fill Lead applicant if user logged in
    let defaultFullName = "";
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      if (u?.name) defaultFullName = u.name;
    } catch { }

    return [
      {
        id: 1,
        title: "Mr",
        fullName: defaultFullName,
        passportPhoto: null,
        photoPreview: null,
        travelerPhoto: null,
        travelerPhotoPreview: null,
        passportNumber: "",
      },
    ];
  });

  // Auto-save visa form details to storage in real-time
  useEffect(() => {
    const hasData = applicants.some(
      (a) =>
        a.fullName?.trim() ||
        a.passportNumber?.trim() ||
        a.photoPreview ||
        a.travelerPhotoPreview ||
        (a.title && a.title !== "Mr")
    );
    if (!hasData) return;

    setAutoSaveStatus("saving");
    const timer = setTimeout(() => {
      try {
        const serializable = {
          applicants: applicants.map((a) => ({
            id: a.id,
            title: a.title,
            fullName: a.fullName,
            passportNumber: a.passportNumber,
            photoPreview: a.photoPreview,
            travelerPhotoPreview: a.travelerPhotoPreview,
            passportValidated: a.passportValidated,
            passportValidationDetails: a.passportValidationDetails,
          })),
          modalStep,
          timestamp: Date.now(),
        };
        localStorage.setItem(
          `visa_draft_${countrySlug || "default"}`,
          JSON.stringify(serializable),
        );
        setAutoSaveStatus("saved");
      } catch (err) {
        console.warn("Failed to auto-save visa draft:", err);
        setAutoSaveStatus("saved");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [applicants, modalStep, countrySlug]);

  // Section Refs for Scroll Spy
  const infoRef = useRef(null);
  const processRef = useRef(null);
  const faqsRef = useRef(null);

  // Scroll to top & trigger anime.js entrance sequence on country change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Hero trust pill bounce
    anime({
      targets: ".hero-trust-pill",
      opacity: [0, 1],
      translateY: [-16, 0],
      duration: 650,
      easing: "easeOutBack",
    });

    // Hero main destination headline lift
    anime({
      targets: ".hero-title",
      opacity: [0, 1],
      translateY: [24, 0],
      duration: 750,
      delay: 80,
      easing: "cubicBezier(0.16, 1, 0.3, 1)",
    });

    // Hero glowing green timeline scale pop
    anime({
      targets: ".hero-timeline",
      opacity: [0, 1],
      scale: [0.88, 1],
      duration: 600,
      delay: 160,
      easing: "cubicBezier(0.34, 1.56, 0.64, 1)",
    });

    // Hero Apply CTA pill button entrance
    anime({
      targets: ".hero-cta-btn",
      opacity: [0, 1],
      translateY: [18, 0],
      scale: [0.94, 1],
      duration: 600,
      delay: 240,
      easing: "cubicBezier(0.16, 1, 0.3, 1)",
    });

    // Hero Subtext Highlights stagger
    anime({
      targets: ".hero-highlight-item",
      opacity: [0, 1],
      translateY: [12, 0],
      delay: anime.stagger(70, { start: 320 }),
      duration: 500,
      easing: "easeOutQuad",
    });

    // Metrics Overview Cards staggered entrance
    staggerEntrance(".visa-metric-card", {
      stagger: 60,
      startDelay: 380,
    });
  }, [countrySlug]);

  // Anime.js Modal Spring Entrance
  useEffect(() => {
    if (isApplyModalOpen) {
      springEntrance(".apply-modal-card", {
        duration: 380,
      });
    }
  }, [isApplyModalOpen]);

  // Anime.js Modal Step Transition
  useEffect(() => {
    if (isApplyModalOpen) {
      anime({
        targets: ".modal-step-container",
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 300,
        easing: "easeOutCubic",
      });
    }
  }, [modalStep, isApplyModalOpen]);

  // Scroll to section handler
  const scrollToSection = (tabName, ref) => {
    setActiveTab(tabName);
    if (ref && ref.current) {
      const yOffset = -120;
      const y =
        ref.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  // Open Application Modal
  const handleOpenApplication = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setSubmitted(false);
    setIsSubmitting(false);
    setSubmissionData(null);
    setModalStep(1);
    setApplicants([
      {
        id: Date.now(),
        title: "Mr",
        fullName: "",
        passportPhoto: null,
        photoPreview: null,
        travelerPhoto: null,
        travelerPhotoPreview: null,
        passportNumber: "",
        dateOfBirth: "1995-01-01",
        gender: "male",
        nationality: "Indian",
      },
    ]);
    setValidationErrors({});
    setIsApplyModalOpen(true);
  };

  // Applicant management
  const addApplicant = () => {
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    setApplicants((prev) => [
      ...prev,
      {
        id: newId,
        title: "Mr",
        fullName: "",
        passportPhoto: null,
        photoPreview: null,
        travelerPhoto: null,
        travelerPhotoPreview: null,
        passportNumber: "",
        dateOfBirth: "1995-01-01",
        gender: "male",
        nationality: "Indian",
      },
    ]);
  };

  const removeApplicant = (id) => {
    if (applicants.length <= 1) return;
    setApplicants((prev) => prev.filter((a) => a.id !== id));
  };

  const updateApplicant = (id, field, value) => {
    setApplicants((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    );
    if (validationErrors[id]?.[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        if (next[id]) {
          delete next[id][field];
          if (Object.keys(next[id]).length === 0) delete next[id];
        }
        return next;
      });
    }
  };

  // Automated Passport Bio / Front Page Authenticator & Validator
  const validatePassportFrontImage = (file, dataUrl) => {
    return new Promise((resolve) => {
      const allowedMimes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/jpg",
        "application/pdf",
      ];
      const isMimeOk =
        allowedMimes.includes(file.type?.toLowerCase()) ||
        Boolean(file.name?.match(/\.(jpe?g|png|webp|pdf)$/i));

      if (!isMimeOk) {
        return resolve({
          isValid: false,
          error:
            "Invalid file format. Please upload a clear JPG, PNG, or WEBP photo of your passport front page.",
        });
      }

      if (file.size < 15 * 1024) {
        return resolve({
          isValid: false,
          error:
            "File size too small (under 15KB). Please upload a clear, legible passport front / bio page scan.",
        });
      }

      if (file.size > 10 * 1024 * 1024) {
        return resolve({
          isValid: false,
          error: "File size exceeds 10MB. Please choose a smaller image under 10MB.",
        });
      }

      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        return resolve({
          isValid: true,
          details: {
            resolution: "PDF Document Scan",
            quality: "Official Document PDF",
            fileSize: `${(file.size / 1024).toFixed(0)} KB`,
          },
        });
      }

      const img = new Image();
      img.onload = () => {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        if (width < 380 || height < 260) {
          return resolve({
            isValid: false,
            error: `Image resolution (${width}×${height}px) is too low. Minimum 400×300px required for passport bio page authentication.`,
          });
        }

        const ratio = width / height;
        if (ratio < 0.4 || ratio > 2.5) {
          return resolve({
            isValid: false,
            error:
              "Unusual aspect ratio. Please upload a straight, full photo of the passport bio/front page.",
          });
        }

        try {
          const canvas = document.createElement("canvas");
          canvas.width = 64;
          canvas.height = 64;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, 64, 64);
          const imgData = ctx.getImageData(0, 0, 64, 64).data;

          let totalBrightness = 0;
          let count = 0;
          for (let i = 0; i < imgData.length; i += 4) {
            const brightness = (imgData[i] + imgData[i + 1] + imgData[i + 2]) / 3;
            totalBrightness += brightness;
            count++;
          }
          const avg = totalBrightness / count;

          let variance = 0;
          for (let i = 0; i < imgData.length; i += 4) {
            const brightness = (imgData[i] + imgData[i + 1] + imgData[i + 2]) / 3;
            variance += Math.pow(brightness - avg, 2);
          }
          const stdDev = Math.sqrt(variance / count);

          if (stdDev < 10) {
            return resolve({
              isValid: false,
              error:
                "Image appears to be blank or solid color. Please upload a genuine photo or scan of your passport front page.",
            });
          }
        } catch {
          // Canvas fallback
        }

        resolve({
          isValid: true,
          details: {
            resolution: `${width} × ${height} px`,
            quality: "High Quality Color Scan",
            fileSize: `${(file.size / 1024).toFixed(0)} KB`,
          },
        });
      };

      img.onerror = () => {
        resolve({
          isValid: false,
          error: "Unable to read image. Please upload a valid, uncorrupted image.",
        });
      };

      img.src = dataUrl;
    });
  };

  const handlePhotoUpload = async (id, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setApplicants((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, isAuthenticatingPassport: true } : a,
      ),
    );

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result;
      const authResult = await validatePassportFrontImage(file, dataUrl);

      setApplicants((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          if (authResult.isValid) {
            return {
              ...a,
              passportPhoto: file,
              photoPreview: dataUrl,
              isAuthenticatingPassport: false,
              passportValidated: true,
              passportValidationDetails: authResult.details,
            };
          } else {
            return {
              ...a,
              passportPhoto: null,
              photoPreview: null,
              isAuthenticatingPassport: false,
              passportValidated: false,
              passportValidationDetails: null,
            };
          }
        }),
      );

      if (authResult.isValid) {
        toast.success("Passport front bio page identified & validated!");
        if (validationErrors[id]?.passportImage) {
          setValidationErrors((prev) => {
            const next = { ...prev };
            if (next[id]) {
              delete next[id].passportImage;
              if (Object.keys(next[id]).length === 0) delete next[id];
            }
            return next;
          });
        }
      } else {
        toast.error(authResult.error);
        setValidationErrors((prev) => ({
          ...prev,
          [id]: {
            ...(prev[id] || {}),
            passportImage: authResult.error,
          },
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (id) => {
    setApplicants((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
            ...a,
            passportPhoto: null,
            photoPreview: null,
            passportValidated: false,
            passportValidationDetails: null,
          }
          : a,
      ),
    );
  };

  const handleTravelerPhotoUpload = (id, e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5MB. Please choose a smaller image.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setApplicants((prev) =>
          prev.map((a) =>
            a.id === id
              ? { ...a, travelerPhoto: file, travelerPhotoPreview: reader.result }
              : a,
          ),
        );
      };
      reader.readAsDataURL(file);

      if (validationErrors[id]?.travelerPhoto) {
        setValidationErrors((prev) => {
          const next = { ...prev };
          if (next[id]) {
            delete next[id].travelerPhoto;
            if (Object.keys(next[id]).length === 0) delete next[id];
          }
          return next;
        });
      }
    }
  };

  const removeTravelerPhoto = (id) => {
    setApplicants((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, travelerPhoto: null, travelerPhotoPreview: null }
          : a,
      ),
    );
  };

  const proceedToStep2 = (e) => {
    e.preventDefault();
    const errors = {};
    let hasError = false;

    applicants.forEach((app, idx) => {
      if (!app.fullName.trim()) {
        if (!errors[app.id]) errors[app.id] = {};
        errors[app.id].fullName = `Traveller ${idx + 1} requires a full name`;
        hasError = true;
      }
    });

    if (hasError) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setModalStep(2);
  };

  const submitApplication = async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (isSubmitting) return;

    if (!country?.country || !country?.type) {
      toast.error("Please select a valid visa before submitting.");
      return;
    }

    const errors = {};
    let hasError = false;

    applicants.forEach((app, idx) => {
      const hasImage =
        app.passportPhoto || app.passportImage || app.photoPreview;

      if (!hasImage) {
        if (!errors[app.id]) errors[app.id] = {};
        errors[app.id].passportImage =
          `Passport front / bio image is mandatory for Traveller ${idx + 1}`;
        hasError = true;
      } else if (app.isAuthenticatingPassport) {
        if (!errors[app.id]) errors[app.id] = {};
        errors[app.id].passportImage =
          `Authenticating passport front page for Traveller ${idx + 1}. Please wait a moment.`;
        hasError = true;
      }

      // Dynamic Photo Validation according to backend requiredDocuments
      if (isPhotoMandatory) {
        const hasPhoto = app.travelerPhoto || app.travelerPhotoPreview;
        if (!hasPhoto) {
          if (!errors[app.id]) errors[app.id] = {};
          errors[app.id].travelerPhoto =
            `${photoDocSpec?.label || "Photograph"} is mandatory for Traveller ${idx + 1} as per official requirements.`;
          hasError = true;
        }
      }
    });

    if (hasError) {
      setValidationErrors(errors);
      const firstErr = Object.values(errors)[0];
      const firstMsg =
        firstErr?.passportImage ||
        "Please upload the required passport front/bio image for all travellers";
      toast.error(firstMsg);
      return;
    }

    try {
      setIsSubmitting(true);
      const unitFee = country.priceNumber || 4500;
      const totalAmount = unitFee * applicants.length;

      const payload = {
        destinationCountry: country.country,
        visaType: country.type,
        totalAmount,
        visa: {
          visaId: country.id,
          country: country.country,
          code: country.code,
          flag: country.flag,
          type: country.type,
          valid: country.validity,
          fee: country.price,
          unitPrice: unitFee,
          visaDate: country.processingTime,
          category: country.category,
          delivery: country.delivery,
          image: country.cardImage,
        },
        applicants: applicants.map((app) => {
          const nameParts = (app.fullName || "").trim().split(/\s+/);
          const firstName = nameParts[0] || "Traveler";
          const lastName =
            nameParts.slice(1).join(" ") || nameParts[0] || "Traveler";
          return {
            title: app.title || "Mr",
            fullName: app.fullName?.trim() || "",
            firstName,
            lastName,
            passportNumber: (app.passportNumber || "VERIFY_FROM_IMAGE")
              .trim()
              .toUpperCase(),
            dateOfBirth: app.dateOfBirth || "1995-01-01",
            nationality: app.nationality || "Indian",
            gender: app.gender || "male",
            photoPreview: app.photoPreview || "",
            travelerPhotoPreview: app.travelerPhotoPreview || "",
            passportPhotoName: app.passportPhoto?.name || "passport-image.jpg",
            travelerPhotoName: app.travelerPhoto?.name || "passport-size-photo.jpg",
            documents: {
              passportScan: app.photoPreview || "",
              passport: app.photoPreview || "",
              photo: app.travelerPhotoPreview || app.photoPreview || "",
              travelerPhoto: app.travelerPhotoPreview || "",
              passportSizePhoto: app.travelerPhotoPreview || "",
              additionalDocs: [],
            },
          };
        }),
        applicantCount: applicants.length,
        unitFee,
        currency: "INR",
      };

      const response = await api.post(VisaAPI.UserApplicationsApi, payload);

      if (
        response.data?.success ||
        response.status === 201 ||
        response.status === 200
      ) {
        const saved = response.data?.data || response.data;
        setSubmissionData(saved);

        // Upload attached documents for each created application
        const createdApps = saved?.applications || [];
        if (Array.isArray(createdApps) && createdApps.length > 0) {
          for (let i = 0; i < applicants.length; i++) {
            const appDoc = createdApps[i];
            const appInput = applicants[i];
            if (appDoc?._id) {
              if (appInput.passportPhoto) {
                try {
                  const fd = new FormData();
                  fd.append("file", appInput.passportPhoto);
                  await api.post(
                    VisaAPI.UserUploadDocumentApi(appDoc._id, "passportScan"),
                    fd,
                    { headers: { "Content-Type": "multipart/form-data" } },
                  );
                } catch (uploadErr) {
                  console.warn("Passport scan upload error:", uploadErr);
                }
              }
              if (appInput.travelerPhoto) {
                try {
                  const fd = new FormData();
                  fd.append("file", appInput.travelerPhoto);
                  await api.post(
                    VisaAPI.UserUploadDocumentApi(appDoc._id, "photo"),
                    fd,
                    { headers: { "Content-Type": "multipart/form-data" } },
                  );
                } catch (uploadErr) {
                  console.warn("Traveler photo upload error:", uploadErr);
                }
              }
            }
          }
        }

        setSubmitted(true);
        try {
          localStorage.removeItem(`visa_draft_${countrySlug || "default"}`);
        } catch { }

        const groupId = saved?.group?._id || saved?._id;
        if (groupId) {
          toast.success("Visa application created! Connecting to PayPal checkout...");
          await handlePayVisaGroup(groupId);
        } else {
          toast.success(
            `Visa application for ${country.country} submitted successfully!`,
          );
        }
      } else {
        throw new Error(
          response.data?.message || "Failed to submit visa application",
        );
      }
    } catch (error) {
      console.error("Error submitting application:", error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to submit visa application. Please try again.";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-poppins antialiased text-slate-800">
      {/* =========================================================================
          TOP MINIMAL HEADER (Logo, Back to Visas, User Actions)
      ========================================================================== */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 sm:gap-5">
            <Link to="/" className="flex items-center gap-2 group">
              <img
                src={Logo}
                alt="Maqam Travels"
                className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-105"
              />
              <span className="hidden md:inline-block font-extrabold text-sm tracking-tight text-slate-900 border-l border-slate-300 pl-3">
                Visa Services
              </span>
            </Link>
          </div>

          {/* Right Navigation & User Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              to="/visa-card"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 text-xs font-bold transition border border-emerald-200/60 shadow-2xs group"
            >
              <Globe size={13} className="text-emerald-600 group-hover:rotate-12 transition-transform" />
              <span>Explore All Visas</span>
            </Link>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">
                  <User size={13} />
                </div>
                <span className="hidden sm:inline">My Account</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthModalView("login");
                  setShowAuthModal(true);
                }}
                className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <User size={14} />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          HERO BANNER SECTION (Matches User Screenshot Exact Design & Layout)
      ========================================================================== */}
      {!isAuthenticated ? (
        <main className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-8 pt-8 pb-20">
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="w-full max-w-lg mx-auto bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-400/30 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <Lock size={32} />
              </div>

              <div className="space-y-2">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800">
                  Authentication Mandatory
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Log In Required
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                  Log in is mandatory to view official {country.country} visa requirements, processing fees, and submit e-visa applications.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalView("login");
                    setShowAuthModal(true);
                  }}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-teal-900/20 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogIn size={16} />
                  <span>Log In / Sign Up Now</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/visa-card")}
                  className="w-full py-3.5 px-6 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={15} />
                  <span>Back to Visas</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <>
          <main className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-20">
            {/* Top Navigation Bar: Back to All Visas & Breadcrumb */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <Link
                to="/visa-card"
                className="group inline-flex items-center gap-2 px-3.5 py-1.5 sm:py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-emerald-700 font-semibold text-xs transition border border-slate-200/90 shadow-2xs"
              >
                <ArrowLeft
                  size={14}
                  className="transition-transform group-hover:-translate-x-1 text-slate-400 group-hover:text-emerald-600"
                />
                <span>Back to All Countries</span>
              </Link>

              <nav className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-400">
                <Link to="/" className="hover:text-slate-700 transition">
                  Home
                </Link>
                <span>/</span>
                <Link to="/visa-card" className="hover:text-slate-700 transition">
                  Visas
                </Link>
                <span>/</span>
                <span className="text-slate-800 font-semibold">
                  {country.country}
                </span>
              </nav>
            </div>

            {/* =========================================================================
                CINEMATIC DESTINATION HERO (Balanced Height, Rich Gradient & Typography)
            ========================================================================== */}
            <div className="relative w-full h-[280px] sm:h-[340px] md:h-[380px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl transition-all">
              {/* High-Resolution Scenic Backdrop */}
              <img
                src={country.heroImage}
                alt={`${country.country} scenery`}
                className="absolute inset-0 w-full h-full object-cover object-center transform scale-100 hover:scale-102 transition-transform duration-1000"
              />

              {/* Dark Luxury Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-slate-950/25" />

              {/* Top-Left Trust Badge */}
              <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 hero-trust-pill">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/75 backdrop-blur-md border border-white/20 text-white text-[11px] sm:text-xs font-semibold tracking-wide shadow-lg transition-all">
                  <CountryFlagIcon
                    flag={country.flag}
                    code={country.code}
                    name={country.country}
                    className="w-5 h-3.5 rounded-xs object-cover shadow-xs inline-block"
                  />
                  <span>Official {country.type} • Indian Citizens</span>
                </span>
              </div>

              {/* Bottom Content: Destination Title, Subtitle & Key Badges */}
              <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8 md:p-10 z-10">
                <div className="max-w-2xl space-y-2">
                  <h1 className="hero-title text-2xl sm:text-4xl md:text-[44px] font-black text-white tracking-tight drop-shadow-md leading-tight">
                    {country.country} Visa for Indians
                  </h1>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-5 pt-1 text-xs sm:text-sm text-slate-200 font-medium">
                    <span className="hero-highlight-item flex items-center gap-1.5 text-emerald-300 font-semibold">
                      <Clock size={15} />
                      <span>{country.timeline} Turnaround</span>
                    </span>
                    <span className="text-white/30">•</span>
                    <span className="hero-highlight-item flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-400" />
                      <span>99.8% Approval Rate</span>
                    </span>
                    <span className="text-white/30 hidden xs:inline">•</span>
                    <span className="hero-highlight-item hidden xs:flex items-center gap-1.5">
                      <ShieldCheck size={15} className="text-emerald-400" />
                      <span>No Embassy Visit</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* =========================================================================
                STICKY SUB-NAVIGATION TABS (Visa Info, Visa Process, FAQs)
            ========================================================================== */}
            <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 my-6 py-2 rounded-2xl shadow-xs px-2 sm:px-6">
              <nav className="flex items-center justify-center sm:justify-start gap-2 sm:gap-8 overflow-x-auto scrollbar-hide">
                {[
                  { id: "info", label: "Visa Overview", ref: infoRef },
                  { id: "process", label: "Application Process", ref: processRef },
                  // { id: "faqs", label: "FAQs & Guidelines", ref: faqsRef },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => scrollToSection(tab.id, tab.ref)}
                    className={`py-2 px-3 sm:px-4 text-xs sm:text-sm font-bold transition-all relative whitespace-nowrap cursor-pointer ${activeTab === tab.id
                      ? "text-emerald-700"
                      : "text-slate-500 hover:text-slate-900"
                      }`}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full animate-in fade-in duration-200" />
                    )}
                  </button>
                ))}

                {/* Quick CTA in Header on Mobile/Tablet */}
                <div className="ml-auto flex lg:hidden items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenApplication}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-full transition shadow-xs cursor-pointer active:scale-95"
                  >
                    Apply Now
                  </button>
                </div>
              </nav>
            </div>

            {/* =========================================================================
                SPLIT 2-COLUMN LUXURY COMMERCE LAYOUT
            ========================================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-6">
              {/* LEFT COLUMN: Specifications, Document Checklist, Process, FAQs (8 cols) */}
              <div className="lg:col-span-8 space-y-8">
                {/* SECTION 1: VISA INFO (Overview Cards & Required Documents) */}
                <section ref={infoRef} className="space-y-6">
                  {/* Visa Details / Packages Card (Reference Layout: Single Parent Div) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                        {allCountryVisas.length > 1
                          ? `All Visa Types Offered (${allCountryVisas.length})`
                          : `${country.country} Visa Specifications`}
                      </h2>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold shrink-0">
                        {country.type || "Tourist"} Visa
                      </span>
                    </div>

                    <div className="space-y-3.5">
                      {(allCountryVisas.length > 1 ? allCountryVisas : [country]).map((v, idx) => {
                        const isSelected = (v._id || v.id) === (country._id || country.id);
                        const vPrice = v.price || (v.fees?.totalPrice ? `₹${v.fees.totalPrice.toLocaleString()}` : (v.fees?.basePrice ? `₹${v.fees.basePrice.toLocaleString()}` : country.price));
                        const vValidity = v.validity || country.validity;
                        const vStay = v.stayDuration || country.stayDuration;
                        const vEntry = v.entryType || country.entryType || "Single";
                        const vTitle = v.title || v.headline || `${vStay || "30 Days"} · ${vEntry.toLowerCase().includes("multi") ? "Multi-entry" : "Single-entry"}`;
                        const vTimeline = v.processingTime || v.timeline || country.processingTime || "3-5 Working Days";

                        return (
                          <div
                            key={v._id || v.id || idx}
                            onClick={() => allCountryVisas.length > 1 && handleSelectVisa(v)}
                            className={`bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border transition-all ${allCountryVisas.length > 1 ? "cursor-pointer" : ""
                              } ${allCountryVisas.length > 1 && isSelected
                                ? "border-emerald-600 ring-2 ring-emerald-600/15 shadow-sm"
                                : "border-slate-200/90 shadow-2xs hover:border-slate-300"
                              }`}
                          >
                            {/* Top Line: Title on Left, Price on Right */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1.5">
                                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                                  {vTitle}
                                </h3>

                                {/* Inline Metadata Separated by Pipes */}
                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                                  <span>
                                    Valid for <strong className="font-bold text-slate-900">{vValidity}</strong>
                                  </span>
                                  <span className="text-slate-300">|</span>
                                  <span>
                                    Maximum stay of <strong className="font-bold text-slate-900">{vStay}</strong>
                                  </span>
                                  <span className="text-slate-300">|</span>
                                  <span>
                                    Entry <strong className="font-bold text-slate-900">{vEntry}</strong>
                                  </span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                  {vPrice}
                                </span>
                              </div>
                            </div>

                            {/* Processing Time Pill */}
                            <div className="mt-4 pt-1">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold">
                                <span className="text-slate-500">Visa in</span>
                                <span className="font-bold text-slate-950">{vTimeline}</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dynamic Official Fee Breakdown Card (from backend response) */}
                  {country.fees && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <CreditCard size={16} className="text-emerald-600" />
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                            Transparent Official Fee Structure ({country.fees.currency || "INR"})
                          </h4>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                          100% Transparent Rates
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
                        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                          <p className="text-slate-400 font-medium text-[11px]">Base Visa Fee</p>
                          <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                            {country.baseFee || `₹${(country.fees.basePrice || 0).toLocaleString()}`}
                          </p>
                        </div>
                        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                          <p className="text-slate-400 font-medium text-[11px]">Embassy / Govt. Fee</p>
                          <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                            {country.govtFee || `₹${(country.fees.governmentFee || 0).toLocaleString()}`}
                          </p>
                        </div>
                        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                          <p className="text-slate-400 font-medium text-[11px]">Service & Processing</p>
                          <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                            {country.serviceFee || `₹${(country.fees.serviceFee || 0).toLocaleString()}`}
                          </p>
                        </div>
                        <div className="bg-emerald-50/90 p-3 rounded-xl border border-emerald-200">
                          <p className="text-emerald-800 font-semibold text-[11px]">Total Price</p>
                          <p className="font-black text-emerald-950 text-sm mt-0.5">
                            {country.price}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Document Checklist for Indians (Rendered dynamically from backend requiredDocuments) */}
                  <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-7">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        Documents Required for Indian Passport Holders
                      </h3>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold shrink-0">
                        {country.documents.length} Required Items
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {country.documents.map((doc, idx) => (
                        <div
                          key={doc.id || idx}
                          className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:border-emerald-300 hover:bg-emerald-50/20 transition"
                        >
                          <div className="w-8 h-8 rounded-xl bg-white text-emerald-600 flex items-center justify-center shrink-0 border border-slate-200/80 shadow-2xs">
                            {doc.icon === "photo" ? (
                              <Camera size={16} />
                            ) : doc.icon === "flight" ? (
                              <Plane size={16} />
                            ) : doc.icon === "hotel" ? (
                              <Building size={16} />
                            ) : doc.icon === "finance" ? (
                              <CreditCard size={16} />
                            ) : (
                              <FileCheck2 size={16} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-bold text-xs sm:text-sm text-slate-900">
                                {doc.title || doc.label}
                              </p>
                              {doc.required ? (
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                                  Mandatory
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                  Optional
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                              {doc.desc}
                            </p>
                            {(doc.formatsText || doc.maxSizeText) && (
                              <div className="flex items-center gap-2 mt-2 pt-1 border-t border-slate-200/50 text-[10px] text-slate-400 font-medium">
                                {doc.formatsText && (
                                  <span>Formats: {doc.formatsText}</span>
                                )}
                                {doc.formatsText && doc.maxSizeText && <span>•</span>}
                                {doc.maxSizeText && (
                                  <span>Max: {doc.maxSizeText}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Rules and Guidelines (Temporarily commented out - to be implemented later) */}
                    {/*
                    <div className="mt-5 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
                      <p className="font-bold text-xs sm:text-sm text-emerald-950 flex items-center gap-1.5 mb-2">
                        <Info size={15} className="text-emerald-700" />
                        Key Travel Guidelines & Rules for {country.country}
                      </p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-900">
                        {country.rules.map((rule, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2
                              size={13}
                              className="text-emerald-600 shrink-0 mt-0.5"
                            />
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    */}
                  </div>
                </section>

                {/* SECTION 2: VISA PROCESS (3 Easy Steps) */}
                <section ref={processRef} className="space-y-6 pt-2">
                  <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-7 space-y-6">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        How the {country.country} Visa Process Works
                      </h3>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold shrink-0">
                        {country.steps?.length || 3} Simple Steps
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(country.steps || []).map((s, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/70 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all group space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                              0{s.step || idx + 1}
                            </div>
                            {s.time && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                {s.time}
                              </span>
                            )}
                          </div>

                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-emerald-700 transition">
                            {s.title}
                          </h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {s.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Trust Banner */}
                  <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                    <div className="text-center md:text-left space-y-1">
                      <p className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold">
                        100% On-Time Delivery Guarantee
                      </p>
                      <h3 className="text-base sm:text-lg font-black">
                        Ready to visit {country.country}?
                      </h3>
                      <p className="text-xs text-slate-300">
                        Join over 25,000+ Indian travelers who applied with Maqam.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenApplication}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-extrabold px-6 py-3 rounded-full shadow-md transition transform hover:-translate-y-0.5 active:scale-95 cursor-pointer shrink-0"
                    >
                      Start Application Now
                    </button>
                  </div>
                </section>

                {/* SECTION 3: FAQS (Temporarily commented out - to be implemented later) */}
                {/*
                <section ref={faqsRef} className="space-y-6 pt-2">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-[11px] font-bold uppercase tracking-wider mb-2">
                      <HelpCircle size={14} className="text-purple-600" />
                      Frequently Asked Questions
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                      Got Questions About {country.country} Visa?
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      Clear, transparent answers to help you travel with total confidence.
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
                    {country.faqs.map((faq, idx) => {
                      const isOpen = activeFaq === idx;
                      return (
                        <div key={idx} className="transition">
                          <button
                            type="button"
                            onClick={() => setActiveFaq(isOpen ? null : idx)}
                            className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition cursor-pointer"
                          >
                            <span className="font-bold text-xs sm:text-sm text-slate-900">
                              {faq.q}
                            </span>
                            <ChevronDown
                              size={16}
                              className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-emerald-600" : ""
                                }`}
                            />
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-5 sm:px-5 text-xs text-slate-600 leading-relaxed animate-in fade-in duration-150">
                              {faq.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
                */}
              </div>

              {/* RIGHT COLUMN (DESKTOP): STICKY ORDER & BOOKING SUMMARY WIDGET (4 cols) */}
              <div className="lg:col-span-4 hidden lg:block sticky top-28 space-y-5">
                {/* Main Booking Card */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xl space-y-6">
                  {/* Destination Header */}
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <CountryFlagIcon
                      flag={country.flag}
                      code={country.code}
                      name={country.country}
                      className="w-8 h-5.5 rounded-xs object-cover shadow-2xs"
                    />
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                        {country.country}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">
                        {country.type}
                      </p>
                    </div>
                  </div>

                  {/* Clean Price Row */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Total Payable
                    </span>
                    <div className="text-right">
                      <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                        {country.price}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        / traveller
                      </div>
                    </div>
                  </div>

                  {/* Key Specifications Breakdown */}
                  <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Entry Type</span>
                      <span className="font-bold text-slate-800">{country.entryType || "Single Entry"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Validity</span>
                      <span className="font-bold text-slate-800">{country.validity}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Stay Duration</span>
                      <span className="font-bold text-slate-800">{country.stayDuration}</span>
                    </div>
                    {country.fees && (
                      <div className="pt-2.5 mt-1 border-t border-slate-200/60 space-y-2 text-[11px]">
                        <div className="flex justify-between items-center text-slate-500">
                          <span>Base Visa Price</span>
                          <span className="font-semibold text-slate-700">
                            {country.baseFee || `₹${(country.fees.basePrice || 0).toLocaleString()}`}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500">
                          <span>Government / Embassy</span>
                          <span className="font-semibold text-slate-700">
                            {country.govtFee || `₹${(country.fees.governmentFee || 0).toLocaleString()}`}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500">
                          <span>Service & Verification</span>
                          <span className="font-semibold text-slate-700">
                            {country.serviceFee || `₹${(country.fees.serviceFee || 0).toLocaleString()}`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action CTA */}
                  <button
                    type="button"
                    onClick={(e) => {
                      clickSquash(e.currentTarget);
                      handleOpenApplication();
                    }}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-900/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 group"
                  >
                    <span>Start Visa Application</span>
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </div>
          </main>

          {/* =========================================================================
              STICKY BOTTOM FLOATING BAR (Mobile Only)
          ========================================================================== */}
          <aside
            aria-label="Quick application"
            className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl p-3 sm:p-4"
          >
            <div className="max-w-[1360px] mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="hidden xs:flex items-center justify-center">
                  <CountryFlagIcon
                    flag={country.flag}
                    code={country.code}
                    name={country.country}
                    className="w-8 h-5.5 rounded-xs object-cover shadow-xs"
                  />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase">
                    {country.country} {country.type}
                  </p>
                  <p className="text-base sm:text-xl font-black text-slate-900">
                    {country.price}{" "}
                    <span className="text-[11px] text-slate-400 font-medium">
                      / traveller
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    clickSquash(e.currentTarget);
                    handleOpenApplication();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm px-6 sm:px-8 py-3 rounded-full shadow-md transition transform hover:-translate-y-0.5 active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <span>Apply Now</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* =========================================================================
          APPLICATION MODAL (Enhanced Spacious Size & Premium UI)
      ========================================================================== */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="apply-modal-card relative w-full max-w-3xl lg:max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh] font-poppins transition-all">
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center shrink-0 overflow-hidden p-1">
                  <CountryFlagIcon
                    flag={country.flag}
                    code={country.code}
                    name={country.country}
                    className="w-full h-full object-cover rounded-md"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base sm:text-lg text-white tracking-tight">
                      Apply for {country.country} {country.type}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
                      {country.timeline}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800/90 border border-slate-700/80 text-[10px] font-medium flex items-center gap-1 text-slate-300">
                      {autoSaveStatus === "saving" ? (
                        <>
                          <Loader2 size={10} className="animate-spin text-amber-400" />
                          <span className="text-slate-400">Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check size={10} className="text-emerald-400" />
                          <span className="text-emerald-400">Draft auto-saved</span>
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Official e-Visa application for Indian passport holders •{" "}
                    <span className="text-emerald-400 font-semibold">
                      {country.price}
                    </span>{" "}
                    all-inclusive per traveler
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsApplyModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 sm:p-7 overflow-y-auto flex-1 bg-slate-50/50">
              {submitted ? (
                /* Success Confirmation State */
                <div className="text-center py-6 space-y-5 max-w-xl mx-auto">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={36} />
                  </div>
                  <div>
                    {submissionData?.applicationNumber && (
                      <span className="inline-block px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-full mb-2.5 font-mono">
                        Ref #{submissionData.applicationNumber}
                      </span>
                    )}
                    <h4 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      Application Submitted Successfully
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                      Your official{" "}
                      <strong>
                        {country.country} {country.type}
                      </strong>{" "}
                      application for{" "}
                      <strong>
                        {applicants.length} Traveller
                        {applicants.length > 1 ? "s" : ""}
                      </strong>{" "}
                      has been received and is currently being verified by our visa desk.
                    </p>
                  </div>

                  {/* Summary Card */}
                  <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs text-left text-xs sm:text-sm space-y-2.5">
                    {(submissionData?.group?._id || submissionData?._id) && (
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-500 font-medium">Batch Reference:</span>
                        <span className="font-mono font-bold text-slate-800">
                          #{submissionData?.group?._id || submissionData?._id}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-medium">Destination & Visa:</span>
                      <span className="font-semibold text-slate-800">
                        {country.country} • {country.type}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-medium">Processing Status:</span>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md text-xs capitalize">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        {submissionData?.group?.groupStatus || "In Verification"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-medium">Travelers Registered:</span>
                      <span className="font-semibold text-slate-800">
                        {applicants.length} Applicant(s)
                      </span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-500 font-medium">Total Payable:</span>
                      <span className="font-bold text-base text-slate-900">
                        ₹{((country.priceNumber || 4500) * applicants.length).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {submissionData?.group?.paymentStatus !== "paid" && (
                    <button
                      type="button"
                      disabled={!!isPayingVisaId}
                      onClick={() =>
                        handlePayVisaGroup(
                          submissionData?.group?._id || submissionData?._id
                        )
                      }
                      className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-60"
                    >
                      {isPayingVisaId ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CreditCard size={16} />
                      )}
                      <span>Proceed to Payment (PayPal)</span>
                      <ArrowRight size={16} />
                    </button>
                  )}

                  <div className="pt-1 flex flex-col sm:flex-row items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => navigate("/bookings?type=visa")}
                      className="w-full sm:flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer text-center"
                    >
                      Track in My Applications
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsApplyModalOpen(false)}
                      className="w-full sm:flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer text-center"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Step Progress Indicator */}
                  <div className="mb-5 bg-slate-100 p-1 rounded-xl">
                    <div className="grid grid-cols-2 gap-1">
                      {/* Step 1 */}
                      <button
                        type="button"
                        onClick={() => setModalStep(1)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition cursor-pointer ${modalStep === 1
                          ? "bg-white shadow-2xs text-slate-900 font-semibold"
                          : "text-slate-500 hover:text-slate-700"
                          }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${modalStep === 1
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-600"
                            }`}
                        >
                          1
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold truncate leading-tight">
                            Traveler Information
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            Names & applicant count
                          </p>
                        </div>
                      </button>

                      {/* Step 2 */}
                      <div
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition ${modalStep === 2
                          ? "bg-white shadow-2xs text-slate-900 font-semibold"
                          : "text-slate-400"
                          }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${modalStep === 2
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-500"
                            }`}
                        >
                          2
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold truncate leading-tight">
                            Passport & Documents
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            Bio page upload
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {modalStep === 1 ? (
                    /* STEP 1: Full Names */
                    <form onSubmit={proceedToStep2} className="modal-step-container space-y-5">
                      <div className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200/90 text-slate-700 text-xs flex items-start gap-2.5">
                        <Info
                          size={16}
                          className="text-slate-500 shrink-0 mt-0.5"
                        />
                        <p className="leading-relaxed">
                          Please enter traveler names{" "}
                          <strong>exactly as printed</strong> on Indian
                          passports to ensure 100% swift visa approval without
                          embassy rejection.
                        </p>
                      </div>

                      {/* Applicants List */}
                      <div className="space-y-3.5 max-h-[50vh] overflow-y-auto pr-1">
                        {applicants.map((app, idx) => (
                          <div
                            key={app.id}
                            className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3 transition hover:border-slate-300"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center text-[11px] font-bold">
                                  {idx + 1}
                                </span>
                                <span>
                                  Traveller {idx + 1}{" "}
                                  {idx === 0 ? "(Lead Applicant)" : ""}
                                </span>
                              </span>

                              {applicants.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    clickSquash(e.currentTarget);
                                    removeApplicant(app.id);
                                  }}
                                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                                >
                                  <Trash2 size={13} /> Remove
                                </button>
                              )}
                            </div>

                            {/* Inputs: Name Input Section Only */}
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                              <div className="sm:col-span-3">
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                  Title
                                </label>
                                <select
                                  value={app.title}
                                  onChange={(e) =>
                                    updateApplicant(
                                      app.id,
                                      "title",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 transition cursor-pointer"
                                >
                                  <option value="Mr">Mr.</option>
                                  <option value="Ms">Ms.</option>
                                  <option value="Mrs">Mrs.</option>
                                  <option value="Dr">Dr.</option>
                                </select>
                              </div>

                              <div className="sm:col-span-9">
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                  Full Name (as per Passport){" "}
                                  <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={app.fullName}
                                  onChange={(e) =>
                                    updateApplicant(
                                      app.id,
                                      "fullName",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="e.g. Rahul Sharma"
                                  className="w-full h-10 px-3.5 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 placeholder:text-slate-400 transition"
                                />
                              </div>
                            </div>

                            {validationErrors[app.id]?.fullName && (
                              <p className="text-xs text-rose-500 font-semibold mt-1">
                                {validationErrors[app.id].fullName}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add Another Traveller Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          clickSquash(e.currentTarget);
                          addApplicant();
                        }}
                        className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
                      >
                        <Plus size={15} /> Add Another Traveller
                      </button>

                      {/* Summary & Fee Calculation */}
                      <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                            Pricing Breakdown
                          </p>
                          <p className="text-xs sm:text-sm font-medium text-slate-700 mt-0.5">
                            {applicants.length} Traveller
                            {applicants.length > 1 ? "s" : ""} × {country.price}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 block font-medium">
                            Total Payable
                          </span>
                          <span className="text-lg sm:text-xl text-slate-900 font-bold">
                            ₹
                            {(
                              (country.priceNumber || 4500) * applicants.length
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        type="submit"
                        onClick={(e) => clickSquash(e.currentTarget)}
                        className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Continue to Step 2 (Passport & Documents)</span>
                        <ArrowRight size={15} />
                      </button>
                    </form>
                  ) : (
                    /* STEP 2: Passport Image (Mandatory) & Traveller Photo (Optional) Upload */
                    <form onSubmit={submitApplication} className="modal-step-container space-y-5">
                      <div className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200/90 text-slate-700 text-xs flex items-start gap-2.5">
                        <Info
                          size={16}
                          className="text-slate-500 shrink-0 mt-0.5"
                        />
                        <p className="leading-relaxed">
                          Please upload a clear color photo or scan of the{" "}
                          <strong className="text-slate-900">Passport Bio Page (Front Page)</strong> (Mandatory).
                          Our automated authenticator verifies document resolution & legibility. The{" "}
                          <strong className="text-slate-900">Traveller Photo</strong> is completely optional and can be submitted now or later.
                        </p>
                      </div>

                      <div className="space-y-3.5 max-h-[50vh] overflow-y-auto pr-1">
                        {applicants.map((app, idx) => {
                          const err = validationErrors[app.id]?.passportImage;
                          const hasPhoto =
                            app.photoPreview || app.passportPhoto;

                          return (
                            <div
                              key={app.id}
                              className={`p-4 sm:p-5 rounded-xl bg-white border shadow-2xs space-y-3.5 transition ${err
                                ? "border-rose-300 bg-rose-50/20"
                                : "border-slate-200"
                                }`}
                            >
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <span className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center text-[11px] font-bold">
                                    {idx + 1}
                                  </span>
                                  <span>
                                    Traveller {idx + 1}: {app.title}.{" "}
                                    {app.fullName || "Applicant"}
                                  </span>
                                </span>
                                <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                  Step 2 of 2
                                </span>
                              </div>

                              {/* Upload Sections Grid: Passport Bio Page (Mandatory) + Traveller Photo (Optional) */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {/* 1. Passport Image (Bio Page) - MANDATORY WITH AUTHENTICATOR */}
                                <div>
                                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <FileCheck2
                                        size={14}
                                        className="text-emerald-600 shrink-0"
                                      />
                                      <span className="text-xs font-semibold text-slate-800">
                                        Passport Front Bio Page
                                      </span>
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                                        Required
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                      JPG, PNG, PDF • Max 10MB
                                    </span>
                                  </div>

                                  {app.isAuthenticatingPassport ? (
                                    <div className="w-full min-h-[135px] border border-dashed border-emerald-400 bg-emerald-50/40 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2">
                                      <Loader2 size={22} className="text-emerald-600 animate-spin" />
                                      <div>
                                        <p className="font-semibold text-xs text-emerald-950">
                                          Authenticating Passport Front Page...
                                        </p>
                                        <p className="text-[11px] text-emerald-700 mt-0.5">
                                          Validating resolution, contrast & document clarity
                                        </p>
                                      </div>
                                    </div>
                                  ) : hasPhoto ? (
                                    <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-12 h-16 rounded-lg overflow-hidden bg-white border border-emerald-300 shadow-2xs shrink-0 flex items-center justify-center relative">
                                          {app.passportPhoto?.type === "application/pdf" || app.passportPhoto?.name?.endsWith(".pdf") ? (
                                            <div className="text-center p-1">
                                              <FileText size={20} className="text-rose-500 mx-auto" />
                                              <span className="text-[9px] font-bold text-slate-600 block mt-0.5">PDF</span>
                                            </div>
                                          ) : (
                                            <img
                                              src={app.photoPreview}
                                              alt="Passport Preview"
                                              className="w-full h-full object-cover"
                                            />
                                          )}
                                          <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                                            <Check size={9} strokeWidth={3} />
                                          </div>
                                        </div>
                                        <div className="min-w-0">
                                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded">
                                            <ShieldCheck
                                              size={11}
                                              className="text-emerald-700"
                                            />
                                            Bio Page Verified
                                          </span>
                                          <p className="text-xs font-semibold text-slate-900 truncate mt-1">
                                            {app.passportPhoto?.name ||
                                              "passport-image.jpg"}
                                          </p>
                                          <p className="text-[10px] text-slate-500 mt-0.5">
                                            {app.passportValidationDetails?.resolution || "High Resolution"} • {app.passportValidationDetails?.fileSize || "Verified Document"}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        <label className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-2xs transition cursor-pointer">
                                          Change
                                          <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={(e) =>
                                              handlePhotoUpload(app.id, e)
                                            }
                                            className="hidden"
                                          />
                                        </label>
                                        <button
                                          type="button"
                                          onClick={() => removePhoto(app.id)}
                                          className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                          title="Remove passport image"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <label className="w-full min-h-[135px] border border-dashed border-slate-300 hover:border-emerald-600 bg-slate-50/40 hover:bg-emerald-50/20 rounded-xl p-4 text-center transition cursor-pointer flex flex-col items-center justify-center group">
                                      <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-emerald-100 text-slate-500 group-hover:text-emerald-700 flex items-center justify-center mb-2 transition-colors">
                                        <UploadCloud size={18} />
                                      </div>
                                      <p className="font-semibold text-xs text-slate-800">
                                        Upload Passport Bio Page
                                      </p>
                                      <p className="text-[11px] text-slate-400 mt-0.5">
                                        Clear color photo or scan of front page
                                      </p>
                                      <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                                        <ShieldCheck size={11} /> Authenticator Verification
                                      </span>
                                      <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={(e) =>
                                          handlePhotoUpload(app.id, e)
                                        }
                                        className="hidden"
                                      />
                                    </label>
                                  )}

                                  {validationErrors[app.id]?.passportImage && (
                                    <p className="text-xs text-rose-500 font-semibold mt-1">
                                      {validationErrors[app.id].passportImage}
                                    </p>
                                  )}
                                </div>

                                {/* 2. Traveller Photo (Passport Size) */}
                                <div>
                                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <Camera
                                        size={14}
                                        className="text-slate-500 shrink-0"
                                      />
                                      <span className="text-xs font-semibold text-slate-800">
                                        {photoDocSpec?.label || "Traveller Photo"}
                                      </span>
                                      {isPhotoMandatory ? (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                                          Required
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium uppercase bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                          Optional
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                      {photoDocSpec?.formatsText ? `${photoDocSpec.formatsText} • Max ${photoDocSpec.maxSizeText}` : "JPG, PNG • Max 5MB"}
                                    </span>
                                  </div>

                                  {app.travelerPhotoPreview ? (
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-12 h-16 rounded-lg overflow-hidden bg-white border border-slate-200 shadow-2xs shrink-0 flex items-center justify-center">
                                          <img
                                            src={app.travelerPhotoPreview}
                                            alt="Passport Size Photo Preview"
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs font-semibold text-slate-900 truncate">
                                            {app.travelerPhoto?.name ||
                                              "passport-size-photo.jpg"}
                                          </p>
                                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 mt-1">
                                            <CheckCircle2
                                              size={12}
                                              className="text-slate-500"
                                            />
                                            Photo Attached
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        <label className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-2xs transition cursor-pointer">
                                          Change
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) =>
                                              handleTravelerPhotoUpload(app.id, e)
                                            }
                                            className="hidden"
                                          />
                                        </label>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            clickSquash(e.currentTarget);
                                            removeTravelerPhoto(app.id);
                                          }}
                                          className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                          title="Remove photo"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <label className="w-full min-h-[135px] border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/40 hover:bg-slate-100/50 rounded-xl p-4 text-center transition cursor-pointer flex flex-col items-center justify-center group">
                                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 mb-2 group-hover:scale-105 transition-transform">
                                        <Camera size={18} />
                                      </div>
                                      <p className="font-semibold text-xs text-slate-700">
                                        Upload Traveller Photo
                                      </p>
                                      <p className="text-[11px] text-slate-400 mt-0.5">
                                        Passport size or clear portrait
                                      </p>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                          handleTravelerPhotoUpload(app.id, e)
                                        }
                                        className="hidden"
                                      />
                                    </label>
                                  )}

                                  {validationErrors[app.id]?.travelerPhoto && (
                                    <p className="text-xs text-rose-500 font-semibold mt-1">
                                      {validationErrors[app.id].travelerPhoto}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Fee Preview Bar */}
                      <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-slate-600 font-medium">
                          Total Payable ({applicants.length} Applicant
                          {applicants.length > 1 ? "s" : ""}):
                        </span>
                        <span className="text-lg sm:text-xl font-bold text-slate-900">
                          ₹
                          {(
                            (country.priceNumber || 4500) * applicants.length
                          ).toLocaleString()}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            clickSquash(e.currentTarget);
                            setModalStep(1);
                          }}
                          className="flex-1 py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 font-semibold text-xs sm:text-sm text-slate-700 transition cursor-pointer"
                        >
                          Back to Step 1
                        </button>

                        <button
                          type="submit"
                          onClick={(e) => {
                            clickSquash(e.currentTarget);
                            submitApplication(e);
                          }}
                          disabled={isSubmitting || !!isPayingVisaId}
                          className="flex-[2] py-3.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {isSubmitting || isPayingVisaId ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              <span>Connecting to PayPal...</span>
                            </>
                          ) : (
                            <>
                              <CreditCard size={15} />
                              <span>Proceed to Payment (PayPal)</span>
                              <ArrowRight size={15} />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          LOGIN / REGISTER MODAL (If Not Logged In)
      ========================================================================== */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-100 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                <Lock size={22} />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">
                {authModalView === "login"
                  ? "Login to Apply for Visa"
                  : "Create Your Account"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Authentication is required to submit and track your visa
                application.
              </p>
            </div>

            <div className="relative min-h-[320px] flex flex-col justify-center">
              <Suspense
                fallback={
                  <div className="py-16 flex items-center justify-center">
                    <LumaSpin
                      size="lg"
                      variant="brand"
                      showProgress={true}
                      text="Loading authentication..."
                      subtext="Preparing secure login form..."
                    />
                  </div>
                }
              >
                {authModalView === "login" ? (
                  <Login
                    isLoading={false}
                    setShowLoginPopup={() => { }}
                    setShowRegisterPopup={() => setAuthModalView("register")}
                    onSuccess={() => {
                      setShowAuthModal(false);
                      toast.success("Welcome back! You can now apply for visas.");
                      handleOpenApplication();
                    }}
                    redirectPath=""
                  />
                ) : (
                  <Register
                    setShowLoginPopup={() => setAuthModalView("login")}
                    setShowRegisterPopup={() => { }}
                    onSuccess={() => {
                      setShowAuthModal(false);
                      toast.success("Account created successfully!");
                      handleOpenApplication();
                    }}
                    redirectPath=""
                  />
                )}
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}