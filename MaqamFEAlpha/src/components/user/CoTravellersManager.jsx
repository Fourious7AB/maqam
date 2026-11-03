import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Phone,
  Mail,
  FileText,
  X,
  UserCheck,
  Baby,
  Smile,
  Shield,
  Loader2,
} from "lucide-react";
import { toast } from "react-toastify";
import travellerService from "../../services/travellerService";

const TITLE_OPTIONS = ["Mr", "Mrs", "Ms", "Miss", "Mstr"];
const GENDER_OPTIONS = ["Male", "Female"];
const PASSENGER_TYPE_OPTIONS = ["Adult", "Child", "Infant"];

const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)" },
  { code: "+966", label: "Saudi Arabia (+966)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+965", label: "Kuwait (+965)" },
  { code: "+974", label: "Qatar (+974)" },
  { code: "+968", label: "Oman (+968)" },
  { code: "+973", label: "Bahrain (+973)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+1", label: "USA/Canada (+1)" },
  { code: "+92", label: "Pakistan (+92)" },
  { code: "+880", label: "Bangladesh (+880)" },
  { code: "+60", label: "Malaysia (+60)" },
  { code: "+62", label: "Indonesia (+62)" },
];

const INITIAL_FORM_STATE = {
  title: "Mr",
  firstName: "",
  lastName: "",
  passengerType: "Adult",
  gender: "Male",
  dateOfBirth: "",
  cellCountryCode: "+91",
  phone: "",
  email: "",
  passportNo: "",
  passportIssueDate: "",
  passportExpiry: "",
  isDefault: false,
};

/**
 * Calculates age in full years from a date string (YYYY-MM-DD)
 */
const calculateAge = (dobString) => {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
};

const CoTravellersManager = () => {
  const [travellers, setTravellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTravellerId, setEditingTravellerId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [settingDefaultId, setSettingDefaultId] = useState(null);

  // Form input state & validation error state
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState({});

  // Fetch all saved travellers on mount
  useEffect(() => {
    fetchTravellers();
  }, []);

  const fetchTravellers = async () => {
    setLoading(true);
    try {
      const data = await travellerService.getAllTravellers();
      setTravellers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching travellers:", err);
      toast.error(err?.response?.data?.message || "Failed to load co-travellers");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Auto-clear validation error on edit
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    // Auto-adjust title or gender if passenger type changes
    if (field === "passengerType") {
      if (value === "Child" || value === "Infant") {
        if (formData.gender === "Male") {
          setFormData((prev) => ({ ...prev, passengerType: value, title: "Mstr" }));
        } else {
          setFormData((prev) => ({ ...prev, passengerType: value, title: "Miss" }));
        }
      } else if (value === "Adult") {
        if (formData.title === "Mstr" || formData.title === "Miss") {
          setFormData((prev) => ({
            ...prev,
            passengerType: value,
            title: prev.gender === "Female" ? "Ms" : "Mr",
          }));
        }
      }
    }
  };

  /**
   * Validate user input fields according to business logic and OpenAPI specifications
   */
  const validateForm = () => {
    const errs = {};

    // First Name
    if (!formData.firstName || formData.firstName.trim().length < 2) {
      errs.firstName = "First name is required (min 2 characters)";
    }

    // Last Name
    if (!formData.lastName || formData.lastName.trim().length < 2) {
      errs.lastName = "Last name is required (min 2 characters)";
    }

    // Email (required for Adult if default/primary, otherwise validated only if provided)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email.trim())) {
      errs.email = "Please enter a valid email address (e.g. name@domain.com)";
    } else if (!formData.email && formData.passengerType === "Adult" && formData.isDefault) {
      errs.email = "Primary traveller email is required";
    }

    // Mobile Phone (digits only, length 7 to 15, optional for child/infant)
    const cleanPhone = String(formData.phone || "").replace(/\D/g, "");
    if (formData.phone && (cleanPhone.length < 7 || cleanPhone.length > 15)) {
      errs.phone = "Phone number must be between 7 and 15 digits";
    } else if (!cleanPhone && formData.passengerType === "Adult" && formData.isDefault) {
      errs.phone = "Primary traveller phone number is required";
    }

    // Date of Birth & Age Bracket Validation
    if (!formData.dateOfBirth) {
      errs.dateOfBirth = "Date of birth is required";
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      if (birthDate > today) {
        errs.dateOfBirth = "Date of birth cannot be in the future";
      } else {
        const age = calculateAge(formData.dateOfBirth);
        if (age === null) {
          errs.dateOfBirth = "Invalid date of birth format";
        } else if (formData.passengerType === "Adult" && age < 12) {
          errs.dateOfBirth = `Adult must be at least 12 years old (current age is ${age} yrs)`;
        } else if (formData.passengerType === "Child" && (age < 2 || age >= 12)) {
          errs.dateOfBirth = `Child must be between 2 and 11 years old (current age is ${age} yrs)`;
        } else if (formData.passengerType === "Infant" && age >= 2) {
          errs.dateOfBirth = `Infant must be under 2 years old (current age is ${age} yrs)`;
        }
      }
    }

    // Passport Dates (if provided)
    if (formData.passportIssueDate && formData.passportExpiry) {
      const issue = new Date(formData.passportIssueDate);
      const expiry = new Date(formData.passportExpiry);
      if (expiry <= issue) {
        errs.passportExpiry = "Passport expiry date must be after the issue date";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleOpenAddForm = () => {
    setEditingTravellerId(null);
    setFormData(INITIAL_FORM_STATE);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (traveller) => {
    setEditingTravellerId(traveller._id || traveller.id);
    setFormData({
      title: traveller.title || "Mr",
      firstName: traveller.firstName || "",
      lastName: traveller.lastName || "",
      passengerType: traveller.passengerType || "Adult",
      gender: traveller.gender || "Male",
      dateOfBirth: traveller.dateOfBirth ? String(traveller.dateOfBirth).split("T")[0] : "",
      cellCountryCode: traveller.cellCountryCode || "+91",
      phone: traveller.phone || "",
      email: traveller.email || "",
      passportNo: traveller.passportNo || "",
      passportIssueDate: traveller.passportIssueDate
        ? String(traveller.passportIssueDate).split("T")[0]
        : "",
      passportExpiry: traveller.passportExpiry
        ? String(traveller.passportExpiry).split("T")[0]
        : "",
      isDefault: Boolean(traveller.isDefault),
    });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleCancelForm = () => {
    setIsFormOpen(false);
    setEditingTravellerId(null);
    setFormData(INITIAL_FORM_STATE);
    setErrors({});
  };

  const handleSetDefault = async (travellerId) => {
    try {
      setSettingDefaultId(travellerId);
      await travellerService.setDefaultTraveller(travellerId);
      setTravellers((prev) =>
        prev.map((t) => ({
          ...t,
          isDefault: (t._id || t.id) === travellerId,
        }))
      );
      toast.success("Primary traveller updated successfully!");
    } catch (err) {
      console.error("Set default traveller error:", err);
      toast.error(err?.response?.data?.message || "Failed to set default traveller");
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleSaveTraveller = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) {
      toast.error("Please correct the form validation errors before saving.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        gender: formData.gender,
        passengerType: formData.passengerType,
        dateOfBirth: new Date(formData.dateOfBirth).toISOString(),
        isDefault: Boolean(formData.isDefault),
      };

      if (formData.cellCountryCode) {
        payload.cellCountryCode = formData.cellCountryCode;
      }
      if (formData.phone) {
        payload.phone = String(formData.phone).replace(/\D/g, "");
      }
      if (formData.email) {
        payload.email = formData.email.trim().toLowerCase();
      }

      // Include optional passport fields only if entered
      if (formData.passportNo?.trim()) {
        payload.passportNo = formData.passportNo.trim().toUpperCase();
      }
      if (formData.passportIssueDate) {
        payload.passportIssueDate = new Date(formData.passportIssueDate).toISOString();
      }
      if (formData.passportExpiry) {
        payload.passportExpiry = new Date(formData.passportExpiry).toISOString();
      }

      if (editingTravellerId) {
        await travellerService.updateTraveller(editingTravellerId, payload);
        toast.success("Co-traveller updated successfully!");
      } else {
        await travellerService.createTraveller(payload);
        toast.success("Co-traveller added successfully!");
      }

      handleCancelForm();
      fetchTravellers();
    } catch (err) {
      console.error("Save traveller error:", err);
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to save traveller profile";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTraveller = async (id) => {
    if (!window.confirm("Are you sure you want to remove this co-traveller?")) {
      return;
    }

    setDeletingId(id);
    try {
      await travellerService.deleteTraveller(id);
      toast.success("Co-traveller deleted successfully");
      setTravellers((prev) => prev.filter((t) => (t._id || t.id) !== id));
    } catch (err) {
      console.error("Delete traveller error:", err);
      toast.error(err?.response?.data?.message || "Failed to delete co-traveller");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0f766e] dark:text-teal-400">
              Saved Profiles
            </p>
            <span className="rounded-full bg-teal-100 dark:bg-teal-950/60 px-2.5 py-0.5 text-xs font-bold text-teal-800 dark:text-teal-300 border border-transparent dark:border-teal-800/40">
              {travellers.length} {travellers.length === 1 ? "Traveller" : "Travellers"}
            </span>
          </div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Co-Travellers
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage profiles for family &amp; companions for fast 1-click booking autofill.
          </p>
        </div>

        {!isFormOpen && (
          <button
            type="button"
            onClick={handleOpenAddForm}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0f6b7b] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d5f6f] active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <UserPlus size={16} />
            <span>Add New Co-Traveller</span>
          </button>
        )}
      </div>

      {/* Add / Edit Form Modal / Card */}
      {isFormOpen && (
        <div className="rounded-[24px] border-2 border-teal-600/30 dark:border-teal-700/40 bg-white dark:bg-[#0d1527] p-5 sm:p-7 shadow-lg animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40 text-[#0f6b7b] dark:text-teal-400">
                <UserCheck size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {editingTravellerId ? "Edit Co-Traveller" : "Add New Co-Traveller"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Must match government issued photo ID or passport
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancelForm}
              className="p-1.5 rounded-full text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              Please ensure First and Last Name, Gender, and Date of Birth match government ID.
              Airlines enforce strict name validation for ticket issuance.
            </span>
          </div>

          <form onSubmit={handleSaveTraveller} className="mt-6 space-y-5">
            {/* Row 1: Passenger Type, Title, First Name, Last Name */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Passenger Type */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                  Passenger Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.passengerType}
                  onChange={(e) => handleInputChange("passengerType", e.target.value)}
                  className="w-full rounded-xl border border-[#dfe7ee] dark:border-slate-700 bg-[#f7fafc] dark:bg-slate-800/80 px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 outline-none transition focus:border-[#0f6b7b] dark:focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800"
                >
                  {PASSENGER_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type} {type === "Adult" ? "(12+ yrs)" : type === "Child" ? "(2-11 yrs)" : "(< 2 yrs)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                  Title <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  className="w-full rounded-xl border border-[#dfe7ee] dark:border-slate-700 bg-[#f7fafc] dark:bg-slate-800/80 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none transition focus:border-[#0f6b7b] dark:focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800"
                >
                  {TITLE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* First Name */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. John"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none transition ${
                    errors.firstName
                      ? "border-rose-400 dark:border-rose-500/80 bg-rose-50/50 dark:bg-rose-950/30 focus:border-rose-500"
                      : "border-[#dfe7ee] dark:border-slate-700 bg-[#f7fafc] dark:bg-slate-800/80 focus:border-[#0f6b7b] dark:focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800"
                  }`}
                />
                {errors.firstName && (
                  <p className="mt-1 text-[11px] font-medium text-rose-500">
                    {errors.firstName}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Doe"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none transition ${
                    errors.lastName
                      ? "border-rose-400 dark:border-rose-500/80 bg-rose-50/50 dark:bg-rose-950/30 focus:border-rose-500"
                      : "border-[#dfe7ee] dark:border-slate-700 bg-[#f7fafc] dark:bg-slate-800/80 focus:border-[#0f6b7b] dark:focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800"
                  }`}
                />
                {errors.lastName && (
                  <p className="mt-1 text-[11px] font-medium text-rose-500">
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Gender, Date of Birth */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Gender */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange("gender", e.target.value)}
                  className="w-full rounded-xl border border-[#dfe7ee] dark:border-slate-700 bg-[#f7fafc] dark:bg-slate-800/80 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none transition focus:border-[#0f6b7b] dark:focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800"
                >
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date of Birth */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                    Date of Birth <span className="text-rose-500">*</span>
                  </label>
                  {formData.dateOfBirth && (
                    <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                      Age: {calculateAge(formData.dateOfBirth)} years
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none transition ${
                    errors.dateOfBirth
                      ? "border-rose-400 dark:border-rose-500/80 bg-rose-50/50 dark:bg-rose-950/30 focus:border-rose-500"
                      : "border-[#dfe7ee] dark:border-slate-700 bg-[#f7fafc] dark:bg-slate-800/80 focus:border-[#0f6b7b] dark:focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800"
                  }`}
                />
                {errors.dateOfBirth ? (
                  <p className="mt-1 text-[11px] font-medium text-rose-500">
                    {errors.dateOfBirth}
                  </p>
                ) : (
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    {formData.passengerType === "Adult" && "Must be at least 12 years old"}
                    {formData.passengerType === "Child" && "Must be between 2 and 11 years old"}
                    {formData.passengerType === "Infant" && "Must be under 2 years old"}
                  </p>
                )}
              </div>
            </div>

            {/* Row 3: Contact Details (Country Code, Mobile, Email) */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Country Code */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                  Country Code <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.cellCountryCode}
                  onChange={(e) => handleInputChange("cellCountryCode", e.target.value)}
                  className="w-full rounded-xl border border-[#dfe7ee] dark:border-slate-700 bg-[#f7fafc] dark:bg-slate-800/80 px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 outline-none transition focus:border-[#0f6b7b] dark:focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mobile Phone */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none transition ${
                    errors.phone
                      ? "border-rose-400 dark:border-rose-500/80 bg-rose-50/50 dark:bg-rose-950/30 focus:border-rose-500"
                      : "border-[#dfe7ee] dark:border-slate-700 bg-[#f7fafc] dark:bg-slate-800/80 focus:border-[#0f6b7b] dark:focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800"
                  }`}
                />
                {errors.phone && (
                  <p className="mt-1 text-[11px] font-medium text-rose-500">
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. traveller@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none transition ${
                    errors.email
                      ? "border-rose-400 dark:border-rose-500/80 bg-rose-50/50 dark:bg-rose-950/30 focus:border-rose-500"
                      : "border-[#dfe7ee] dark:border-slate-700 bg-[#f7fafc] dark:bg-slate-800/80 focus:border-[#0f6b7b] dark:focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800"
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-[11px] font-medium text-rose-500">
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            {/* Optional Passport Section */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                <Shield size={14} className="text-[#0f6b7b] dark:text-teal-400" />
                Passport Information (Optional for International Flights)
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Passport Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. A1234567"
                    value={formData.passportNo}
                    onChange={(e) => handleInputChange("passportNo", e.target.value)}
                    className="w-full rounded-xl border border-[#dfe7ee] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f6b7b] dark:focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={formData.passportIssueDate}
                    onChange={(e) => handleInputChange("passportIssueDate", e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl border border-[#dfe7ee] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f6b7b] dark:focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.passportExpiry}
                    onChange={(e) => handleInputChange("passportExpiry", e.target.value)}
                    className="w-full rounded-xl border border-[#dfe7ee] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f6b7b] dark:focus:border-teal-500"
                  />
                  {errors.passportExpiry && (
                    <p className="mt-1 text-[11px] font-medium text-rose-500">
                      {errors.passportExpiry}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Mark as Primary / Default Traveller */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isDefaultCheckbox"
                checked={Boolean(formData.isDefault)}
                onChange={(e) => handleInputChange("isDefault", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
              <label
                htmlFor="isDefaultCheckbox"
                className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
              >
                Set as Primary / Default Traveller (Pre-selected during booking checkout)
              </label>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCancelForm}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0f6b7b] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0d5f6f] transition active:scale-95 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{editingTravellerId ? "Update Traveller" : "Save Traveller"}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Traveller Cards List */}
      <div className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1527] p-12 text-center">
            <Loader2 className="w-8 h-8 text-[#0f6b7b] dark:text-teal-400 animate-spin mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Loading co-traveller profiles...</p>
          </div>
        ) : travellers.length === 0 ? (
          <div className="rounded-[20px] border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1527] p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-[#0f6b7b] dark:text-teal-400 mb-3">
              <Users size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Co-Travellers Saved Yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Add details for family members and co-passengers once so you can quickly autofill flight bookings and hotel guest forms.
            </p>
            {!isFormOpen && (
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0f6b7b] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0d5f6f] transition cursor-pointer"
              >
                <UserPlus size={14} />
                <span>Add Your First Co-Traveller</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {travellers.map((traveller) => {
              const id = traveller._id || traveller.id;
              const type = traveller.passengerType || "Adult";
              const isDeletingThis = deletingId === id;

              return (
                <div
                  key={id}
                  className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0d1527] p-4 shadow-xs transition hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            type === "Child"
                              ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                              : type === "Infant"
                              ? "bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300"
                              : "bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300"
                          }`}
                        >
                          {type === "Infant" ? (
                            <Baby size={12} />
                          ) : type === "Child" ? (
                            <Smile size={12} />
                          ) : (
                            <UserCheck size={12} />
                          )}
                          {type}
                        </span>
                        {traveller.isDefault && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                            <CheckCircle2 size={11} /> Primary
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-400">
                          · {traveller.gender || "Gender"}
                        </span>
                      </div>
                      <h4 className="mt-1 text-base font-extrabold text-slate-900 dark:text-slate-100">
                        {traveller.title ? `${traveller.title}. ` : ""}
                        {traveller.firstName} {traveller.lastName}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {!traveller.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(id)}
                          disabled={settingDefaultId === id}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-teal-700 hover:text-teal-800 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 border border-teal-200 dark:border-teal-800 transition cursor-pointer disabled:opacity-50"
                          title="Set as Primary / Default Traveller"
                        >
                          {settingDefaultId === id ? "Setting..." : "Set as Primary"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEditForm(traveller)}
                        className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-[#0f6b7b] dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Edit traveller profile"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        disabled={isDeletingThis}
                        onClick={() => handleDeleteTraveller(id)}
                        className="p-2 rounded-xl text-slate-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer disabled:opacity-50"
                        title="Delete traveller"
                      >
                        {isDeletingThis ? (
                          <Loader2 size={15} className="animate-spin text-rose-500" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>
                        DOB:{" "}
                        <strong className="text-slate-700 dark:text-slate-200">
                          {traveller.dateOfBirth
                            ? new Date(traveller.dateOfBirth).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "N/A"}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <Phone size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="truncate">
                        {traveller.cellCountryCode || "+91"} {traveller.phone || "N/A"}
                      </span>
                    </div>

                    <div className="col-span-2 flex items-center gap-1.5 truncate">
                      <Mail size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="truncate">{traveller.email || "N/A"}</span>
                    </div>

                    {traveller.passportNo && (
                      <div className="col-span-2 flex items-center gap-1.5 text-teal-800 dark:text-teal-300 bg-teal-50/70 dark:bg-teal-950/50 rounded-lg px-2 py-1 mt-1 font-mono text-[11px] border border-teal-200/50 dark:border-teal-800/40">
                        <Shield size={12} className="text-[#0f6b7b] dark:text-teal-400 shrink-0" />
                        <span>Passport: {traveller.passportNo}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoTravellersManager;
