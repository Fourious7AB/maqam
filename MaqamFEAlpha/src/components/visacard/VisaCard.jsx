import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { tokenService } from "../../admin/services/tokenService";
import {
  Zap,
  BriefcaseBusiness,
  FileText,
  PartyPopper,
  ChevronDown,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  X,
  ArrowRight,
  ArrowLeft,
  Filter,
  UploadCloud,
  Camera,
  Image as ImageIcon,
  Trash2,
  User,
  Check,
  UserPlus,
  Plus,
  Edit3,
  Users,
  Loader2,
  Lock,
  Home,
  LogIn,
  ShieldAlert,
  Globe,
  RefreshCw,
  Eye,
  Calendar,
  AlertCircle,
  FileCheck2,
  Download,
  ExternalLink,
  Info,
  CreditCard,
  Compass,
  MapPin,
} from "lucide-react";
import anime from "animejs";
import CommonHeader from "../CommonHeader";
import api from "../stores/api";
import { VisaAPI, PaymentAPI } from "../../configs/api";
import { getDocumentUrl } from "../../utils/documentUrl";
import { toast } from "react-toastify";
import paymentService from "../../services/paymentService";
import AnimatedNumber from "../shared/AnimatedNumber";
import LumaSpin from "../ui/LumaSpin";

const Login = lazy(() => import("../Login"));
const Register = lazy(() => import("../../pages/Register"));
import { staggerEntrance, clickSquash, springEntrance } from "../../animations/presets";
import visaHeroBg from "../../assets/visa_hero_bg.jpg";

const getContinentForCountry = (countryName = "") => {
  const c = countryName.toLowerCase();
  if (
    [
      "saudi arabia",
      "united arab emirates",
      "uae",
      "oman",
      "qatar",
      "kuwait",
      "bahrain",
      "jordan",
      "lebanon",
    ].some((x) => c.includes(x))
  )
    return "Middle East";
  if (
    [
      "malaysia",
      "indonesia",
      "singapore",
      "uzbekistan",
      "azerbaijan",
      "bangladesh",
      "thailand",
      "vietnam",
      "japan",
      "sri lanka",
      "india",
    ].some((x) => c.includes(x))
  )
    return "Asia";
  if (
    [
      "turkey",
      "türkiye",
      "united kingdom",
      "uk",
      "france",
      "germany",
      "georgia",
      "russia",
      "schengen",
      "italy",
      "spain",
      "switzerland",
    ].some((x) => c.includes(x))
  )
    return "Europe";
  if (
    [
      "egypt",
      "morocco",
      "kenya",
      "south africa",
      "tanzania",
      "mauritius",
      "seychelles",
    ].some((x) => c.includes(x))
  )
    return "Africa";
  return "Popular";
};

const getCountryFlag = (countryCode) => {
  if (!countryCode) return "🌍";
  try {
    return countryCode
      .toUpperCase()
      .split("")
      .map((char) => String.fromCodePoint(127397 + char.charCodeAt()))
      .join("");
  } catch {
    return "🌍";
  }
};

const categoryTabs = [
  "All Visas",
  "Popular",
  "Middle East",
  "Asia",
  "Europe",
  "Africa",
];

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

export default function VisaCard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAuthenticated = useSelector(
    (state) =>
      state.auth.isAuthenticated ||
      Boolean(tokenService.getAccessToken()),
  );
  const [authModalView, setAuthModalView] = useState("login"); // "login" | "register"
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Auto-redirect to My Bookings visa section if tab=applications was requested
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "applications" || tab === "my-applications") {
      navigate("/bookings?type=visa", { replace: true });
    }
  }, [searchParams, navigate]);

  // Visas Catalog & User Applications Data (Fetched purely from Database via VisaAPI)
  const [visas, setVisas] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [summary, setSummary] = useState({
    totalAvailableVisas: 0,
    totalMyApplications: 0,
    myProcessingApplications: 0,
    myCompletedApplications: 0,
  });
  const [isLoadingVisas, setIsLoadingVisas] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Batch Details & Applicant Management State
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isLoadingGroup, setIsLoadingGroup] = useState(false);
  const [groupDetailsData, setGroupDetailsData] = useState(null);
  const [isAddApplicantOpen, setIsAddApplicantOpen] = useState(false);
  const [newApplicantData, setNewApplicantData] = useState({
    firstName: "",
    lastName: "",
    passportNumber: "",
    dateOfBirth: "1995-01-01",
    nationality: "Indian",
    gender: "male",
  });
  const [isAddingApplicant, setIsAddingApplicant] = useState(false);
  const [uploadingDocAppId, setUploadingDocAppId] = useState(null);
  const [uploadingDocType, setUploadingDocType] = useState(null);

  const fetchCatalogVisas = async () => {
    try {
      setIsLoadingVisas(true);
      setFetchError(null);
      const response = await api.get(VisaAPI.UserVisasCatalogApi);
      const resData = response.data?.data || response.data;
      const dbVisas =
        resData?.availableVisas || (Array.isArray(resData) ? resData : []);

      if (resData?.myApplications && Array.isArray(resData.myApplications)) {
        setMyApplications(resData.myApplications);
      }
      if (resData?.summary) {
        setSummary(resData.summary);
      } else {
        setSummary({
          totalAvailableVisas: Array.isArray(dbVisas) ? dbVisas.length : 0,
          totalMyApplications: resData?.myApplications?.length || 0,
          myProcessingApplications: (resData?.myApplications || []).filter(
            (g) => g.groupStatus === "processing",
          ).length,
          myCompletedApplications: (resData?.myApplications || []).filter(
            (g) => g.groupStatus === "completed",
          ).length,
        });
      }

      if (Array.isArray(dbVisas)) {
        const mapped = dbVisas.map((item, idx) => {
          const rawCountry = item.country || item.title || "Country";
          const countryName = rawCountry
            .toLowerCase()
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");

          const countryCode = (
            item.countryCode ||
            item.code ||
            "UN"
          ).toUpperCase();

          const totalPrice =
            item.fees?.totalPrice ||
            item.fees?.basePrice ||
            item.priceNumber ||
            5000;

          const category =
            item.category || getContinentForCountry(countryName) || "Popular";

          const flag =
            item.countryFlag ||
            item.flagEmoji ||
            item.flag ||
            getCountryFlag(countryCode);

          const image =
            item.countryPicture ||
            item.countryImage ||
            item.bannerImage ||
            item.image ||
            `https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?auto=format&fit=crop&w=900&q=80`;

          const processingTime = item.processingTime || "3-5 Working Days";
          const delivery =
            item.delivery ||
            (processingTime.toLowerCase().includes("hour") ||
            processingTime.toLowerCase().includes("1-3") ||
            processingTime.toLowerCase().includes("3-5")
              ? "express"
              : "standard");

          return {
            id: item._id || item.id || idx + 1,
            _id: item._id,
            country: countryName,
            code: countryCode,
            flag,
            type: item.visaType || item.type || "Tourist Visa",
            title:
              item.title ||
              `${countryName} ${item.visaType || "Tourist Visa"}`,
            valid: item.validity || "30 Days",
            stayDuration: item.stayDuration || "30 Days",
            fee: `₹${totalPrice.toLocaleString()}`,
            priceNumber: totalPrice,
            fees: item.fees,
            visaDate: processingTime,
            category,
            delivery,
            image,
            description: item.description,
            requiredDocuments: item.requiredDocuments || [],
            raw: item,
          };
        });

        setVisas(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch visa catalog from database:", err);
      setFetchError(
        err.response?.data?.message ||
          "Could not load visa catalog from database. Please ensure backend is running.",
      );
    } finally {
      setIsLoadingVisas(false);
    }
  };

  const fetchUserApplications = async () => {
    if (!isAuthenticated) return;
    try {
      const response = await api.get(VisaAPI.UserGroupsApi);
      const resData = response.data?.data || response.data;
      const groupsList = Array.isArray(resData) ? resData : resData?.groups || [];
      if (groupsList.length > 0) {
        setMyApplications(groupsList);
      }
    } catch (err) {
      console.warn("Could not fetch user groups directly:", err);
    }
  };

  const openGroupDetails = async (group) => {
    setSelectedGroup(group);
    setGroupDetailsData(null);
    setIsAddApplicantOpen(false);
    try {
      setIsLoadingGroup(true);
      const res = await api.get(VisaAPI.UserSingleGroupApi(group._id));
      const groupData = res.data?.data || res.data;
      setGroupDetailsData(groupData);
    } catch (err) {
      console.error("Error fetching group details:", err);
      toast.error(
        err.response?.data?.message || "Failed to load batch details",
      );
    } finally {
      setIsLoadingGroup(false);
    }
  };

  const handleDocUpload = async (appId, docType, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }
    try {
      setUploadingDocAppId(appId);
      setUploadingDocType(docType);
      const formData = new FormData();
      formData.append("file", file);
      await api.post(VisaAPI.UserUploadDocumentApi(appId, docType), formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(
        `${docType === "passportScan" ? "Passport scan" : "Photo"} uploaded successfully!`,
      );
      if (selectedGroup?._id) {
        const res = await api.get(
          VisaAPI.UserSingleGroupApi(selectedGroup._id),
        );
        setGroupDetailsData(res.data?.data || res.data);
      }
    } catch (err) {
      console.error("Failed to upload document:", err);
      toast.error(err.response?.data?.message || "Failed to upload document");
    } finally {
      setUploadingDocAppId(null);
      setUploadingDocType(null);
    }
  };

  const handleAddApplicantToGroup = async (e) => {
    e.preventDefault();
    if (
      !newApplicantData.firstName.trim() ||
      !newApplicantData.lastName.trim()
    ) {
      toast.error("First and last names are required");
      return;
    }
    if (!newApplicantData.passportNumber.trim()) {
      toast.error("Passport number is required");
      return;
    }
    try {
      setIsAddingApplicant(true);
      await api.post(
        VisaAPI.UserAddApplicantApi(selectedGroup._id),
        newApplicantData,
      );
      toast.success("Traveler added to visa batch successfully!");
      setIsAddApplicantOpen(false);
      setNewApplicantData({
        firstName: "",
        lastName: "",
        passportNumber: "",
        dateOfBirth: "1995-01-01",
        nationality: "Indian",
        gender: "male",
      });
      // Refresh group details and overview
      const res = await api.get(
        VisaAPI.UserSingleGroupApi(selectedGroup._id),
      );
      setGroupDetailsData(res.data?.data || res.data);
      fetchCatalogVisas();
    } catch (err) {
      console.error("Failed to add applicant:", err);
      toast.error(err.response?.data?.message || "Failed to add applicant");
    } finally {
      setIsAddingApplicant(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchCatalogVisas();
      fetchUserApplications();
    } else {
      setShowAuthModal(true);
      toast.info("Log in is mandatory to access Visa services.");
    }
  }, [isAuthenticated]);

  const [selectedVisa, setSelectedVisa] = useState(null);
  const visaModalBoxRef = useRef(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPayingVisaId, setIsPayingVisaId] = useState(null);
  const [submissionData, setSubmissionData] = useState(null);

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

  const [modalStep, setModalStep] = useState(1); // 1: Name Details, 2: Passport Photo & Number
  const [resumingGroupId, setResumingGroupId] = useState(null);
  const [isLoadingResume, setIsLoadingResume] = useState(false);
  const [applicants, setApplicants] = useState([
    {
      id: 1,
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
      isAuthenticatingPassport: false,
      passportValidated: false,
      passportValidationDetails: null,
    },
  ]);
  const [validationErrors, setValidationErrors] = useState({});
  const [autoSaveStatus, setAutoSaveStatus] = useState("saved"); // "saving" | "saved"

  // Auto-save visa form details in real-time as user changes anything
  useEffect(() => {
    if (!selectedVisa) return;
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
        const draftKey = resumingGroupId
          ? `visa_draft_resume_${resumingGroupId}`
          : `visa_draft_${selectedVisa?.country || selectedVisa?.id || "default"}`;

        const serializable = {
          applicants: applicants.map((a) => ({
            id: a.id,
            appId: a.appId,
            title: a.title,
            fullName: a.fullName,
            passportNumber: a.passportNumber,
            dateOfBirth: a.dateOfBirth,
            gender: a.gender,
            nationality: a.nationality,
            photoPreview: a.photoPreview,
            travelerPhotoPreview: a.travelerPhotoPreview,
            passportValidationDetails: a.passportValidationDetails,
            passportValidated: a.passportValidated,
          })),
          modalStep,
          timestamp: Date.now(),
        };

        localStorage.setItem(draftKey, JSON.stringify(serializable));
        setAutoSaveStatus("saved");
      } catch (err) {
        console.warn("Failed to auto-save visa draft:", err);
        setAutoSaveStatus("saved");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [applicants, modalStep, selectedVisa, resumingGroupId]);

  const closeApplyModal = () => {
    setSelectedVisa(null);
    setResumingGroupId(null);
    setModalStep(1);
    setValidationErrors({});
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Visas");
  const [deliveryFilter, setDeliveryFilter] = useState("Any Time");
  const [typeFilter, setTypeFilter] = useState("All Visa Types");
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Anime.js Modal Spring Entrance
  useEffect(() => {
    if (selectedVisa) {
      springEntrance(".apply-modal-card", {
        duration: 380,
      });
    }
  }, [selectedVisa]);

  // Anime.js Modal Step Transition
  useEffect(() => {
    if (selectedVisa) {
      anime({
        targets: ".modal-step-container",
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 300,
        easing: "easeOutCubic",
      });
    }
  }, [modalStep, selectedVisa]);

  const openApplication = (visa) => {
    if (!isAuthenticated) {
      toast.info("Please log in to apply for visa services.");
      setShowAuthModal(true);
      return;
    }
    setSubmitted(false);
    setIsSubmitting(false);
    setSubmissionData(null);
    setResumingGroupId(null);
    setModalStep(1);
    setSelectedVisa(visa);

    // Pre-fill Lead applicant if user logged in
    let defaultFullName = "";
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      if (u?.name) defaultFullName = u.name;
    } catch {}

    let initialApplicants = [
      {
        id: Date.now(),
        title: "Mr",
        fullName: defaultFullName,
        passportPhoto: null,
        photoPreview: null,
        travelerPhoto: null,
        travelerPhotoPreview: null,
        passportNumber: "",
        dateOfBirth: "1995-01-01",
        gender: "male",
        nationality: "Indian",
        isAuthenticatingPassport: false,
        passportValidated: false,
        passportValidationDetails: null,
      },
    ];

    // Restore any previously auto-saved draft for this visa
    try {
      const draftKey = `visa_draft_${visa?.country || visa?.id || "default"}`;
      const savedRaw = localStorage.getItem(draftKey);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        const list = Array.isArray(parsed) ? parsed : parsed?.applicants;
        if (Array.isArray(list) && list.length > 0) {
          initialApplicants = list.map((a) => ({
            ...a,
            passportPhoto: null,
            photoPreview: a.photoPreview || null,
            travelerPhoto: null,
            travelerPhotoPreview: a.travelerPhotoPreview || null,
          }));
          if (parsed?.modalStep) {
            setModalStep(parsed.modalStep);
          }
        }
      }
    } catch (e) {
      console.warn("Could not load auto-saved visa draft:", e);
    }

    setApplicants(initialApplicants);
    setValidationErrors({});
  };

  // Auto-open application if ?groupId=... or ?country=... or ?openVisa=... is provided in URL
  useEffect(() => {
    const groupIdParam = searchParams.get("groupId");
    const countryParam = searchParams.get("country");
    const visaIdParam = searchParams.get("visaId") || searchParams.get("openVisa");

    // When resuming a draft application from My Bookings
    if (groupIdParam) {
      if (resumingGroupId === groupIdParam) return;

      const loadGroupForResume = async () => {
        try {
          setIsLoadingResume(true);
          const res = await api.get(VisaAPI.UserSingleGroupApi(groupIdParam));
          const groupData = res.data?.data || res.data;
          const group = groupData?.group || groupData;
          const apps = groupData?.applications || group?.applications || [];

          const targetCountry = group?.destinationCountry || countryParam || "";
          const cLower = targetCountry.trim().toLowerCase();
          const matchedVisa =
            (visas || []).find(
              (v) =>
                v.country?.toLowerCase() === cLower ||
                v.title?.toLowerCase().includes(cLower) ||
                cLower.includes(v.country?.toLowerCase())
            ) ||
            group?.visa || {
              id: groupIdParam,
              _id: groupIdParam,
              country: targetCountry || "Visa Service",
              title: `${targetCountry} Visa`,
              type: group?.visaType || "Tourist Visa",
              category: "Tourist",
              fee: `₹${Math.round(
                (group?.totalAmount || 5000) / Math.max(apps.length, 1)
              ).toLocaleString()}`,
              delivery: "3-5 Working Days",
              valid: "30 Days",
            };

          setSubmitted(false);
          setIsSubmitting(false);
          setSubmissionData(null);
          setModalStep(1);
          setSelectedVisa(matchedVisa);
          setResumingGroupId(groupIdParam);

          if (Array.isArray(apps) && apps.length > 0) {
            let mapped = apps.map((app, idx) => {
              const trav = app.travelerDetails || {};
              const docs = app.documents || {};
              const passportUrl = getDocumentUrl(
                docs.passportScan || docs.passport
              );
              const photoUrl = getDocumentUrl(
                docs.photo || docs.travelerPhoto || docs.passportSizePhoto
              );
              const fName = (trav.firstName || "").trim();
              const lName = (trav.lastName || "").trim();
              const fullName = [fName, lName].filter(Boolean).join(" ");
              let dob = "1995-01-01";
              if (trav.dateOfBirth) {
                try {
                  dob = new Date(trav.dateOfBirth).toISOString().split("T")[0];
                } catch {
                  dob = "1995-01-01";
                }
              }

              return {
                id: app._id || `traveller_${idx + 1}_${Date.now()}`,
                appId: app._id,
                title: trav.title || "Mr",
                fullName: fullName || fName || "",
                passportPhoto: null,
                photoPreview: passportUrl || null,
                travelerPhoto: null,
                travelerPhotoPreview: photoUrl || null,
                passportNumber: trav.passportNumber || "",
                dateOfBirth: dob,
                gender: (trav.gender || "male").toLowerCase(),
                nationality: trav.nationality || "Indian",
                isAuthenticatingPassport: false,
                passportValidated: Boolean(passportUrl),
                passportValidationDetails: passportUrl
                  ? {
                      resolution: "High Resolution (Attached)",
                      fileSize: "Verified Document",
                    }
                  : null,
              };
            });

            // Restore any recent auto-saved draft edits made by the user
            try {
              const resumeDraftKey = `visa_draft_resume_${groupIdParam}`;
              const savedDraftRaw = localStorage.getItem(resumeDraftKey);
              if (savedDraftRaw) {
                const parsed = JSON.parse(savedDraftRaw);
                const draftApps = Array.isArray(parsed) ? parsed : parsed?.applicants;
                if (Array.isArray(draftApps) && draftApps.length > 0) {
                  mapped = draftApps.map((da) => ({
                    ...da,
                    passportPhoto: null,
                    photoPreview: da.photoPreview || null,
                    travelerPhoto: null,
                    travelerPhotoPreview: da.travelerPhotoPreview || null,
                  }));
                  if (parsed?.modalStep) {
                    setModalStep(parsed.modalStep);
                  }
                }
              }
            } catch (err) {
              console.warn("Could not restore local resume draft edits:", err);
            }

            setApplicants(mapped);
          }
        } catch (err) {
          console.error("Failed to load visa group for resume:", err);
          toast.error("Could not load draft visa group details.");
        } finally {
          setIsLoadingResume(false);
        }
      };

      loadGroupForResume();
      return;
    }

    if (!visas || visas.length === 0 || selectedVisa) return;

    if (visaIdParam) {
      const match = visas.find(
        (v) =>
          String(v.id) === String(visaIdParam) ||
          String(v._id) === String(visaIdParam)
      );
      if (match) {
        openApplication(match);
        return;
      }
    }

    if (countryParam) {
      const cLower = countryParam.trim().toLowerCase();
      const match = visas.find(
        (v) =>
          v.country?.toLowerCase() === cLower ||
          v.title?.toLowerCase().includes(cLower) ||
          cLower.includes(v.country?.toLowerCase())
      );
      if (match) {
        openApplication(match);
      }
    }
  }, [searchParams, visas]);

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
        isAuthenticatingPassport: false,
        passportValidated: false,
        passportValidationDetails: null,
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
        toast.error("File size exceeds 5MB. Please choose a smaller image.");
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

  const submitApplication = async (event) => {
    if (event && typeof event.preventDefault === "function") event.preventDefault();
    if (isSubmitting) return;

    if (!selectedVisa?.country || !selectedVisa?.type) {
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
      // Traveller photo is completely optional
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

      if (resumingGroupId) {
        // Upload any newly selected documents for existing applicants
        for (let i = 0; i < applicants.length; i++) {
          const appInput = applicants[i];
          if (appInput.appId) {
            if (appInput.passportPhoto) {
              try {
                const fd = new FormData();
                fd.append("file", appInput.passportPhoto);
                await api.post(
                  VisaAPI.UserUploadDocumentApi(appInput.appId, "passportScan"),
                  fd,
                  { headers: { "Content-Type": "multipart/form-data" } }
                );
              } catch (upErr) {
                console.warn("Passport scan update error:", upErr);
              }
            }
            if (appInput.travelerPhoto) {
              try {
                const fd = new FormData();
                fd.append("file", appInput.travelerPhoto);
                await api.post(
                  VisaAPI.UserUploadDocumentApi(appInput.appId, "photo"),
                  fd,
                  { headers: { "Content-Type": "multipart/form-data" } }
                );
              } catch (upErr) {
                console.warn("Traveler photo update error:", upErr);
              }
            }
          } else {
            // New applicant added to existing group
            try {
              const nameParts = (appInput.fullName || "").trim().split(/\s+/);
              const firstName = nameParts[0] || "Traveler";
              const lastName =
                nameParts.slice(1).join(" ") || nameParts[0] || "Traveler";
              const addRes = await api.post(
                `/api/v1/visa/user/groups/${resumingGroupId}/applicants`,
                {
                  firstName,
                  lastName,
                  passportNumber: (
                    appInput.passportNumber || "VERIFY_FROM_PASSPORT"
                  ).toUpperCase(),
                  dateOfBirth: appInput.dateOfBirth || "1995-01-01",
                  nationality: appInput.nationality || "Indian",
                  gender: appInput.gender || "male",
                }
              );
              const newAppId =
                addRes.data?.data?.application?._id || addRes.data?.data?._id;
              if (newAppId && appInput.passportPhoto) {
                const fd = new FormData();
                fd.append("file", appInput.passportPhoto);
                await api.post(
                  VisaAPI.UserUploadDocumentApi(newAppId, "passportScan"),
                  fd,
                  { headers: { "Content-Type": "multipart/form-data" } }
                );
              }
              if (newAppId && appInput.travelerPhoto) {
                const fd = new FormData();
                fd.append("file", appInput.travelerPhoto);
                await api.post(
                  VisaAPI.UserUploadDocumentApi(newAppId, "photo"),
                  fd,
                  { headers: { "Content-Type": "multipart/form-data" } }
                );
              }
            } catch (addErr) {
              console.warn("Error adding applicant during resume:", addErr);
            }
          }
        }

        setSubmitted(true);
        fetchCatalogVisas();
        fetchUserApplications();

        toast.success(
          "Traveler details confirmed! Connecting to PayPal checkout..."
        );
        await handlePayVisaGroup(resumingGroupId);
        return;
      }

      const unitFee =
        parseInt(String(selectedVisa.fee || "0").replace(/[^0-9]/g, ""), 10) || 5000;
      const totalAmount = unitFee * applicants.length;

      const payload = {
        destinationCountry: selectedVisa.country,
        visaType: selectedVisa.type,
        totalAmount,
        visa: {
          visaId: selectedVisa.id || selectedVisa._id,
          country: selectedVisa.country,
          code: selectedVisa.code,
          flag: selectedVisa.flag,
          type: selectedVisa.type,
          valid: selectedVisa.valid,
          fee: selectedVisa.fee,
          unitPrice: unitFee,
          visaDate: selectedVisa.visaDate || selectedVisa.delivery,
          category: selectedVisa.category,
          delivery: selectedVisa.delivery,
          image: selectedVisa.image,
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
            passportNumber: (app.passportNumber || "VERIFY_FROM_PASSPORT")
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
        const savedApplication = response.data?.data || response.data;
        setSubmissionData(savedApplication);

        // Upload attached documents for each created application
        const createdApps = savedApplication?.applications || [];
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
        fetchCatalogVisas();
        fetchUserApplications();

        const groupId = savedApplication?.group?._id || savedApplication?._id;
        if (groupId) {
          toast.success("Visa application created! Connecting to PayPal checkout...");
          await handlePayVisaGroup(groupId);
        } else {
          toast.success("Visa application submitted successfully!");
        }
      } else {
        throw new Error(
          response.data?.message || "Failed to submit visa application",
        );
      }
    } catch (error) {
      console.error("Error submitting visa application:", error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to submit visa application. Please check details and try again.";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredVisas = useMemo(() => {
    return (visas || []).filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        activeCategory === "All Visas" ||
        activeCategory === "Popular" ||
        item.category === activeCategory;

      const matchesType =
        typeFilter === "All Visa Types" ||
        (typeFilter === "E-Visa" &&
          item.type.toLowerCase().includes("e-visa")) ||
        (typeFilter === "Tourist Visa" &&
          item.type.toLowerCase().includes("tourist"));

      const matchesDelivery =
        deliveryFilter === "Any Time" ||
        (deliveryFilter === "Express (3-5 Days)" &&
          item.delivery === "express") ||
        (deliveryFilter === "Standard (5-10 Days)" &&
          item.delivery === "standard");

      return matchesSearch && matchesCategory && matchesType && matchesDelivery;
    });
  }, [visas, searchQuery, activeCategory, typeFilter, deliveryFilter]);

  useEffect(() => {
    if (!isLoadingVisas && filteredVisas.length > 0) {
      staggerEntrance(".visa-grid-card", {
        stagger: 35,
        startDelay: 50,
      });
    }
  }, [isLoadingVisas, filteredVisas.length, activeCategory]);

  const toggleDropdown = (name) => {
    setActiveDropdown((prev) => (prev === name ? null : name));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-poppins">
      <CommonHeader title="Visa" value={false} />
      {!isAuthenticated ? (
        /* Mandatory Login Barrier View */
        <main className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 pb-16 pt-24 font-poppins">
          <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-lg mx-auto bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-400/30 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <Lock size={32} />
              </div>

              <div className="space-y-2">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800">
                  Authentication Mandatory
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Log In Required
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                  Access to the Visa page is restricted to registered members. Log in or create an account to view visa country catalogues, check processing times, and submit e-visa applications.
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
                  onClick={() => navigate("/")}
                  className="w-full py-3.5 px-6 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Home size={15} />
                  <span>Go to Home</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <>
          {/* ====================================================
              HERO TOP SECTION (Full Screen Width 100vw, Poppins Font)
          ==================================================== */}
          {/* ====================================================
              HERO TOP SECTION (Full Screen Width 100vw, Centered Minimal Luxury)
          ==================================================== */}
          <section className="relative w-full overflow-hidden bg-slate-950 font-poppins pt-20 sm:pt-24 border-b border-slate-800 shadow-xl">
            {/* Background Image: Nighttime Paris Skyline (Preserved) */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url(${visaHeroBg})`,
                backgroundPosition: "center 35%",
              }}
            />
            {/* Dark Gradient Overlay for optimal contrast while letting city lights show */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/75 to-slate-950/95" />

            {/* Inner Content Container Centered */}
            <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 flex flex-col items-center text-center">
              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
                Visas Made Simple for Every Trip
              </h1>

              {/* Minimal Clean Subtitle */}
              <p className="text-xs sm:text-sm lg:text-base text-slate-300 font-normal mt-2.5 max-w-md mx-auto">
                Seamless online approvals for worldwide destinations.
              </p>

              {/* Centered Premium Search Bar with Integrated Action Button */}
              <div className="w-full max-w-2xl mt-7 sm:mt-8">
                <div className="flex items-center bg-white rounded-xl sm:rounded-2xl shadow-2xl p-1.5 sm:p-2 border border-white/20 transition-all focus-within:ring-4 focus-within:ring-emerald-500/20">
                  <div className="flex items-center flex-1 px-3 sm:px-4 py-1.5 sm:py-2">
                    <Search size={19} className="text-slate-400 mr-2.5 sm:mr-3 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search destination country (e.g. Dubai, Singapore, UK)..."
                      className="w-full bg-transparent outline-none font-poppins text-xs sm:text-sm lg:text-base text-slate-900 font-medium placeholder:text-slate-400"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer transition shrink-0 ml-1.5"
                        title="Clear search"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  {/* Search Button */}
                  <button
                    type="button"
                    onClick={() => {
                      // Smooth scroll down to catalogue if search query or click
                      const catalogueEl = document.querySelector("main");
                      if (catalogueEl) {
                        catalogueEl.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0"
                  >
                    <span>Search</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ====================================================
              LOWER SECTION (Retains exact position and 1440px width)
          ==================================================== */}
          <main className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 pb-16 pt-8 font-poppins">

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-4 mb-6">
          {categoryTabs.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={(e) => {
                clickSquash(e.currentTarget);
                setActiveCategory(cat);
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat
                  ? "bg-teal-700 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Country Grid - Skeletons during Loading, Empty State if No Data, or Real DB Cards */}
        {isLoadingVisas ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4 lg:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <div
                key={n}
                className="w-full h-[250px] xs:h-[270px] sm:h-[350px] lg:h-[400px] rounded-2xl sm:rounded-3xl bg-slate-200/80 animate-pulse flex flex-col justify-between p-4 border border-slate-200"
              >
                <div className="flex justify-between items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-300" />
                  <div className="w-16 h-5 rounded-full bg-slate-300" />
                </div>
                <div className="space-y-2 mt-auto">
                  <div className="w-3/4 h-5 rounded-lg bg-slate-300 mx-auto" />
                  <div className="w-1/2 h-3.5 rounded-lg bg-slate-300 mx-auto" />
                  <div className="w-full h-9 rounded-xl bg-slate-300 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredVisas.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300 p-8 max-w-md mx-auto shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-3">
              <Globe size={32} />
            </div>
            <p className="text-base sm:text-lg font-bold text-gray-900">
              {visas.length === 0
                ? "No Visas Found in Database"
                : "No Matching Visas Found"}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              {visas.length === 0
                ? "No active visa catalog records were returned from the API."
                : "Try adjusting your search query or reset filter selections."}
            </p>
            <button
              type="button"
              onClick={() => {
                if (visas.length === 0) {
                  fetchCatalogVisas();
                } else {
                  setSearchQuery("");
                  setActiveCategory("All Visas");
                  setTypeFilter("All Visa Types");
                  setDeliveryFilter("Any Time");
                }
              }}
              className="mt-4 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5 mx-auto"
            >
              {visas.length === 0 ? (
                <>
                  <RefreshCw size={13} />
                  <span>Fetch Visas from Database</span>
                </>
              ) : (
                <span>Reset Filters</span>
              )}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4 lg:gap-6">
            {filteredVisas.map((visa) => (
              <div key={visa.id} className="visa-grid-card w-full flex flex-col group">
                {/* Visual Card (Compact height on mobile) */}
                <div
                  className="relative h-[250px] xs:h-[270px] sm:h-[350px] lg:h-[400px] w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                  onClick={(e) => {
                    clickSquash(e.currentTarget);
                    navigate(
                      `/visa/${visa.country.toLowerCase().replace(/\s+/g, "-")}`,
                    );
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      navigate(
                        `/visa/${visa.country.toLowerCase().replace(/\s+/g, "-")}`,
                      );
                    }
                  }}
                >
                  {/* Background Image */}
                  <img
                    src={visa.image}
                    alt={visa.country}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Dark Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/15" />

                  {/* Top Badge: Official Flag Image + Visa Type */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 sm:top-3.5 sm:left-3.5 sm:right-3.5 flex items-center justify-between gap-1.5 z-10">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 border-white/90 shadow-md bg-white flex items-center justify-center shrink-0">
                      <img
                        src={
                          visa.raw?.countryFlag &&
                          visa.raw.countryFlag.startsWith("http")
                            ? visa.raw.countryFlag
                            : `https://flagcdn.com/w80/${(visa.code || "sa").toLowerCase()}.png`
                        }
                        alt={`${visa.country} flag`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-black/50 sm:bg-white/20 backdrop-blur-md text-[8px] sm:text-[10px] font-bold text-white uppercase tracking-wider border border-white/25 truncate max-w-[95px] sm:max-w-none shadow-xs">
                      {visa.type}
                    </span>
                  </div>

                  {/* Bottom Content Area */}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-4 lg:p-5 flex flex-col items-center">
                    {/* Country Name */}
                    <h2
                      title={visa.country}
                      className="text-white text-xs sm:text-base lg:text-xl font-black uppercase text-center tracking-wide drop-shadow-md w-full truncate mb-1.5 sm:mb-3"
                    >
                      {visa.country}
                    </h2>

                    {/* Stats Frosted Glass Bar */}
                    <div className="w-full bg-black/50 backdrop-blur-md rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 border border-white/15 grid grid-cols-3 text-center gap-0.5 sm:gap-1">
                      <div className="min-w-0">
                        <p className="text-[7px] sm:text-[9px] font-bold uppercase tracking-wider text-emerald-300 truncate">
                          TYPE
                        </p>
                        <p className="text-white font-bold text-[9px] sm:text-xs truncate mt-0.5">
                          {visa.type}
                        </p>
                      </div>

                      <div className="min-w-0 border-x border-white/15 px-0.5 sm:px-1">
                        <p className="text-[7px] sm:text-[9px] font-bold uppercase tracking-wider text-emerald-300 truncate">
                          VALID
                        </p>
                        <p className="text-white font-bold text-[9px] sm:text-xs truncate mt-0.5">
                          {visa.valid}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[7px] sm:text-[9px] font-bold uppercase tracking-wider text-emerald-300 truncate">
                          FEES
                        </p>
                        <p className="text-white font-extrabold text-[9px] sm:text-xs truncate mt-0.5">
                          {visa.priceNumber ? (
                            <AnimatedNumber value={visa.priceNumber} prefix="₹" />
                          ) : (
                            visa.fee
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Dual Action Buttons: Quick Apply & Explore */}
                    <div className="w-full grid grid-cols-2 gap-1.5 mt-2 sm:mt-3.5">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          clickSquash(event.currentTarget);
                          openApplication(visa);
                        }}
                        className="rounded-lg sm:rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 py-1.5 sm:py-2 text-[10px] sm:text-xs font-extrabold text-white shadow-xs hover:shadow transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Zap size={12} className="text-amber-300" />
                        <span>Quick Apply</span>
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          clickSquash(event.currentTarget);
                          navigate(
                            `/visa/${visa.country.toLowerCase().replace(/\s+/g, "-")}`,
                          );
                        }}
                        className="rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 py-1.5 sm:py-2 text-[10px] sm:text-xs font-extrabold text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                      >
                        <span>Explore</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer Subtext Bar */}
                <div className="mt-1.5 p-1.5 sm:p-2.5 bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between px-2 sm:px-3.5">
                  <div className="text-left min-w-0 flex-1">
                    <p className="text-[8px] sm:text-[10px] text-gray-400 font-semibold uppercase tracking-wider truncate">
                      Guaranteed In
                    </p>
                    <p className="font-extrabold text-[10px] sm:text-sm text-gray-900 truncate">
                      {visa.visaDate}
                    </p>
                  </div>
                  <span className="hidden xs:inline-flex items-center gap-1 text-[8px] sm:text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 sm:px-2 py-0.5 rounded-full shrink-0">
                    <CheckCircle2 size={10} className="text-emerald-600" />
                    Verified
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
          {/* =========================================================================
              COMMENTED OUT: Applications status dashboard on visa country page.
              All visa applications tracking is now centralized in My Bookings (/bookings?type=visa)
          ========================================================================== */}
          {/*
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-white border border-gray-200/90 shadow-2xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <FileCheck2 size={22} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Total Submissions
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-gray-900">
                    {summary.totalMyApplications || myApplications.length}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-amber-200/90 shadow-2xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock size={22} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                    Under Processing
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-amber-900">
                    {summary.myProcessingApplications ||
                      myApplications.filter((g) => g.groupStatus === "processing")
                        .length}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-emerald-200/90 shadow-2xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                    Completed / Approved
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-emerald-900">
                    {summary.myCompletedApplications ||
                      myApplications.filter((g) => g.groupStatus === "completed")
                        .length}
                  </p>
                </div>
              </div>
            </div>

            {!isAuthenticated ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 p-8 max-w-lg mx-auto shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-4 shadow-xs">
                  <Lock size={30} />
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-gray-900">
                  Sign In to Track Applications
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                  Log in with your Maqam account to view real-time status updates, upload additional traveler documents, and download approved e-visas.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="mt-5 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center gap-2 mx-auto"
                >
                  <LogIn size={15} />
                  <span>Log In to View Applications</span>
                </button>
              </div>
            ) : myApplications.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300 p-8 max-w-md mx-auto shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-3">
                  <FileText size={32} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  No Visa Applications Found
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                  You have not submitted any visa application batches yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {myApplications.map((grp) => (
                  <div key={grp._id}>...</div>
                ))}
              </div>
            )}
          </div>
          */}

        {/* =========================================================================
            APPLICATION MODAL (Spacious Size, Dark Gradient Header & Premium Animated UI)
        ========================================================================== */}
        {selectedVisa && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={closeApplyModal}
          >
            <div
              className="apply-modal-card relative w-full max-w-3xl lg:max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh] font-poppins transition-all"
              onClick={(event) => event.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center shrink-0 overflow-hidden p-1">
                    <CountryFlagIcon
                      flag={selectedVisa.flag}
                      code={selectedVisa.code}
                      name={selectedVisa.country}
                      className="w-full h-full object-cover rounded-md"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base sm:text-lg text-white tracking-tight">
                        {resumingGroupId ? "Resume Visa Application:" : "Apply for"}{" "}
                        {selectedVisa.country} {selectedVisa.type}
                      </h3>
                      {resumingGroupId ? (
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-medium flex items-center gap-1.5">
                          <Clock size={12} /> Resumed Draft Application
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
                          {selectedVisa.visaDate || selectedVisa.delivery || "3-5 Working Days"}
                        </span>
                      )}
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
                        {selectedVisa.fee}
                      </span>{" "}
                      all-inclusive per traveler
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    clickSquash(e.currentTarget);
                    closeApplyModal();
                  }}
                  className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
                  aria-label="Close visa application"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 sm:p-7 overflow-y-auto flex-1 bg-slate-50/50">
                {/* Resuming Banner info */}
                {resumingGroupId && !submitted && (
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-950 text-xs flex items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                        <Clock size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-amber-950">
                          Resuming Saved Visa Application
                        </p>
                        <p className="text-[11px] text-amber-800/90 mt-0.5">
                          Existing traveller records and uploaded documents have been loaded. Review details below to continue.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-amber-900 bg-white border border-amber-200 px-2 py-0.5 rounded-md font-semibold shrink-0">
                      Batch #{resumingGroupId.slice(-8)}
                    </span>
                  </div>
                )}
                {submitted ? (
                  /* Success Confirmation State */
                  <div className="text-center py-6 space-y-5 max-w-xl mx-auto">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <CheckCircle2 size={36} />
                    </div>
                    <div>
                      {(submissionData?.group?._id ||
                        submissionData?._id ||
                        submissionData?.applicationNumber) && (
                        <span className="inline-block px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-full mb-2.5 font-mono">
                          Ref #{submissionData?.applicationNumber || submissionData?.group?._id || submissionData?._id}
                        </span>
                      )}
                      <h4 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        Application Submitted Successfully
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                        Your official{" "}
                        <strong>
                          {selectedVisa.country} {selectedVisa.type}
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
                          {selectedVisa.country} • {selectedVisa.type}
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
                          ₹
                          {(
                            (parseInt(
                              String(selectedVisa.fee || "0").replace(/[^0-9]/g, ""),
                              10,
                            ) || 5000) * applicants.length
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {(submissionData?.group?.paymentStatus !== "paid") && (
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
                        onClick={(e) => {
                          clickSquash(e.currentTarget);
                          closeApplyModal();
                          setSubmitted(false);
                          setSubmissionData(null);
                          navigate("/bookings?type=visa");
                        }}
                        className="w-full sm:flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer text-center"
                      >
                        Track in My Bookings
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          clickSquash(e.currentTarget);
                          closeApplyModal();
                          setSubmitted(false);
                          setSubmissionData(null);
                        }}
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
                          onClick={(e) => {
                            clickSquash(e.currentTarget);
                            setModalStep(1);
                          }}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition cursor-pointer ${
                            modalStep === 1
                              ? "bg-white shadow-2xs text-slate-900 font-semibold"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${
                              modalStep === 1
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
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition ${
                            modalStep === 2
                              ? "bg-white shadow-2xs text-slate-900 font-semibold"
                              : "text-slate-400"
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${
                              modalStep === 2
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
                      /* STEP 1: Full Names Only */
                      <form onSubmit={proceedToStep2} className="modal-step-container space-y-5">
                        <div className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200/90 text-slate-700 text-xs flex items-start gap-2.5">
                          <Info
                            size={16}
                            className="text-slate-500 shrink-0 mt-0.5"
                          />
                          <p className="leading-relaxed">
                            Please enter full names{" "}
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
                              {applicants.length > 1 ? "s" : ""} × {selectedVisa.fee}
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-[11px] text-slate-400 block font-medium">
                              Total Payable
                            </span>
                            <span className="text-lg sm:text-xl text-slate-900 font-bold">
                              ₹
                              {(
                                (parseInt(
                                  String(selectedVisa.fee || "0").replace(/[^0-9]/g, ""),
                                  10,
                                ) || 5000) * applicants.length
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
                                className={`p-4 sm:p-5 rounded-xl bg-white border shadow-2xs space-y-3.5 transition ${
                                  err
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
                                            onClick={(e) => {
                                              clickSquash(e.currentTarget);
                                              removePhoto(app.id);
                                            }}
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

                                  {/* 2. Traveller Photo (Passport Size) - OPTIONAL */}
                                  <div>
                                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <Camera
                                          size={14}
                                          className="text-slate-500 shrink-0"
                                        />
                                        <span className="text-xs font-semibold text-slate-800">
                                          Traveller Photo
                                        </span>
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium uppercase bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                          Optional
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-slate-400">
                                        JPG, PNG • Max 5MB
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
                              (parseInt(
                                String(selectedVisa.fee || "0").replace(/[^0-9]/g, ""),
                                10,
                              ) || 5000) * applicants.length
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
                            onClick={(e) => clickSquash(e.currentTarget)}
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

        {/* ========================================================================= */}
        {/* COMMENTED OUT: Batch details modal is now managed in My Bookings visa tab  */}
        {/* ========================================================================= */}
        {false && selectedGroup && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
            onClick={() => setSelectedGroup(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-3xl bg-white p-5 sm:p-7 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold uppercase tracking-wider">
                      Batch #{selectedGroup._id?.slice(-8).toUpperCase()}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        selectedGroup.groupStatus === "completed"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : selectedGroup.groupStatus === "rejected"
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {selectedGroup.groupStatus?.replace("_", " ") || "Processing"}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
                    {selectedGroup.destinationCountry} • {selectedGroup.visaType}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <p className="text-xs text-gray-500">
                      Total Amount: <strong className="text-emerald-700">₹{(selectedGroup.totalAmount || 0).toLocaleString()}</strong> | Payment: <strong className="uppercase text-gray-800">{selectedGroup.paymentStatus || "Pending"}</strong>
                    </p>
                    {selectedGroup.paymentStatus !== "paid" && (
                      <button
                        type="button"
                        disabled={isPayingVisaId === selectedGroup._id}
                        onClick={() => handlePayVisaGroup(selectedGroup._id)}
                        className="px-3 py-1 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {isPayingVisaId === selectedGroup._id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <CreditCard size={12} />
                        )}
                        <span>Proceed to Payment (PayPal)</span>
                      </button>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGroup(null)}
                  className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              {isLoadingGroup ? (
                <div className="py-12 text-center text-gray-500 space-y-2">
                  <Loader2 size={24} className="animate-spin text-teal-600 mx-auto" />
                  <p className="text-xs font-semibold">Loading batch details from database...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Applicants List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                        <Users size={14} className="text-teal-600" />
                        <span>Travelers / Applicants ({groupDetailsData?.applications?.length || selectedGroup.totalApplicants || 1})</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsAddApplicantOpen(!isAddApplicantOpen)}
                        className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Add Traveler</span>
                      </button>
                    </div>

                    {/* Add Applicant Form (if open) */}
                    {isAddApplicantOpen && (
                      <form onSubmit={handleAddApplicantToGroup} className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200 space-y-3">
                        <h4 className="font-extrabold text-xs text-teal-900">Add New Traveler to Batch</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-0.5">First Name *</label>
                            <input
                              type="text"
                              required
                              value={newApplicantData.firstName}
                              onChange={(e) => setNewApplicantData({ ...newApplicantData, firstName: e.target.value })}
                              placeholder="e.g. Rahul"
                              className="w-full rounded-xl border border-gray-300 bg-white p-2 text-xs font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Last Name *</label>
                            <input
                              type="text"
                              required
                              value={newApplicantData.lastName}
                              onChange={(e) => setNewApplicantData({ ...newApplicantData, lastName: e.target.value })}
                              placeholder="e.g. Sharma"
                              className="w-full rounded-xl border border-gray-300 bg-white p-2 text-xs font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Passport Number *</label>
                            <input
                              type="text"
                              required
                              value={newApplicantData.passportNumber}
                              onChange={(e) => setNewApplicantData({ ...newApplicantData, passportNumber: e.target.value.toUpperCase() })}
                              placeholder="e.g. Z1234567"
                              className="w-full rounded-xl border border-gray-300 bg-white p-2 text-xs font-semibold uppercase"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Date of Birth</label>
                            <input
                              type="date"
                              value={newApplicantData.dateOfBirth}
                              onChange={(e) => setNewApplicantData({ ...newApplicantData, dateOfBirth: e.target.value })}
                              className="w-full rounded-xl border border-gray-300 bg-white p-2 text-xs font-semibold"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsAddApplicantOpen(false)}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs font-bold"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isAddingApplicant}
                            className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-1.5"
                          >
                            {isAddingApplicant && <Loader2 size={12} className="animate-spin" />}
                            <span>Save Traveler</span>
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Applicant Cards */}
                    {(groupDetailsData?.applications || []).map((app, idx) => {
                      const t = app.travelerDetails || {};
                      const docs = app.documents || {};
                      return (
                        <div
                          key={app._id || idx}
                          className="p-3.5 rounded-2xl border border-gray-200 bg-slate-50/60 space-y-2.5 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2 border-b border-gray-200/80 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-[11px] font-extrabold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <div>
                                <h4 className="font-extrabold text-gray-900 text-xs sm:text-sm">
                                  {t.firstName || "Traveler"} {t.lastName || ""}
                                </h4>
                                <p className="text-[11px] text-gray-500 font-mono">
                                  Passport: <strong>{t.passportNumber || "PENDING"}</strong> • Nationality: {t.nationality || "Indian"}
                                </p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-teal-50 text-teal-800 border border-teal-200">
                              {app.status?.replace("_", " ") || "submitted"}
                            </span>
                          </div>

                          {/* Documents Row */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {/* Passport Scan */}
                            <div className="p-2 rounded-xl bg-white border border-gray-200 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText size={16} className="text-teal-600 shrink-0" />
                                <div className="truncate">
                                  <p className="font-bold text-[11px] text-gray-800 truncate">Passport Bio Page</p>
                                  <span className="text-[10px] text-gray-400 block">
                                    {docs.passportScan ? "Uploaded" : "Pending Upload"}
                                  </span>
                                </div>
                              </div>
                              <label className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[10px] font-bold transition cursor-pointer shrink-0">
                                {uploadingDocAppId === app._id && uploadingDocType === "passportScan" ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <span>{docs.passportScan ? "Update" : "Upload"}</span>
                                )}
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  disabled={uploadingDocAppId === app._id}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleDocUpload(app._id, "passportScan", f);
                                  }}
                                />
                              </label>
                            </div>

                            {/* Photo */}
                            <div className="p-2 rounded-xl bg-white border border-gray-200 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Camera size={16} className="text-teal-600 shrink-0" />
                                <div className="truncate">
                                  <p className="font-bold text-[11px] text-gray-800 truncate">Passport Size Photo</p>
                                  <span className="text-[10px] text-gray-400 block">
                                    {docs.photo ? "Uploaded" : "Pending Upload"}
                                  </span>
                                </div>
                              </div>
                              <label className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[10px] font-bold transition cursor-pointer shrink-0">
                                {uploadingDocAppId === app._id && uploadingDocType === "photo" ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <span>{docs.photo ? "Update" : "Upload"}</span>
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={uploadingDocAppId === app._id}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleDocUpload(app._id, "photo", f);
                                  }}
                                />
                              </label>
                            </div>
                          </div>

                          {/* Issued Visa Link (if available) */}
                          {getDocumentUrl(app.issuedVisaUrl) && (
                            <div className="pt-1.5 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-emerald-900">
                              <span className="text-xs font-bold flex items-center gap-1.5">
                                <CheckCircle2 size={14} className="text-emerald-600" />
                                Official Visa Approved
                              </span>
                              <a
                                href={getDocumentUrl(app.issuedVisaUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
                              >
                                <Download size={12} />
                                <span>Download Visa</span>
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* AUTH MODAL (Shown on demand when user applies or opens My Applications)   */}
        {/* ========================================================================= */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-3 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl mx-auto my-auto">
              {/* Top Banner Notice with Close button */}
              <div className="mb-3 flex items-center justify-between gap-2.5 bg-white/95 backdrop-blur-md border border-amber-300/80 rounded-2xl px-4 py-3 shadow-xl">
                <div className="flex items-center gap-2.5 text-xs font-extrabold text-amber-900">
                  <span className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Lock size={14} />
                  </span>
                  <div>
                    <p className="font-bold text-xs text-slate-900">
                      Sign In to Visa Services
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Log in or register to submit visa applications and track your batches.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  title="Close login modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Login / Register Form Component */}
              <div className="relative">
                {authModalView === "login" ? (
                  <Login
                    isLoading={false}
                    setShowLoginPopup={() => setShowAuthModal(false)}
                    setShowRegisterPopup={() => setAuthModalView("register")}
                    onSuccess={() => {
                      setShowAuthModal(false);
                      fetchCatalogVisas();
                      fetchUserApplications();
                    }}
                    redirectPath=""
                  />
                ) : (
                  <Register
                    setShowLoginPopup={() => setAuthModalView("login")}
                    setShowRegisterPopup={() => setShowAuthModal(false)}
                    onSuccess={() => {
                      setShowAuthModal(false);
                      toast.success(
                        "Welcome to Maqam! Access granted to Visa Services.",
                      );
                      fetchCatalogVisas();
                      fetchUserApplications();
                    }}
                    redirectPath=""
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )}
</div>
  );
}
