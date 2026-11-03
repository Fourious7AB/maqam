import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  UserCheck,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  X,
  Mail,
  User,
  Phone,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { syncProfileAndDefaultTraveller, isGenericPlaceholder } from "../../utils/profileCompletionCheck";

const TITLE_OPTIONS = ["Mr", "Mrs", "Ms"];
const GENDER_OPTIONS = ["Male", "Female"];

/**
 * ProfileCompletionModal
 * 
 * Displayed when a phone-only logged-in user enters booking details
 * without having edited/completed their profile.
 * Prompts them to update their profile and add themselves as a traveler first.
 */
export default function ProfileCompletionModal({
  isOpen,
  onClose,
  user,
  prefillData = {},
  bookingType = "hotel", // "hotel" | "flight" | "package"
  onSuccess,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "Mr",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    gender: "Male",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const prevIsOpenRef = useRef(false);

  // Sync form data ONLY when modal transitions from closed to open.
  // This prevents parent countdown timers (which re-render every second) from wiping user input.
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      const existingFirst =
        prefillData?.firstName ||
        (!isGenericPlaceholder(user?.firstName) ? user?.firstName : "") ||
        "";
      const existingLast =
        prefillData?.lastName ||
        (!isGenericPlaceholder(user?.lastName) ? user?.lastName : "") ||
        "";
      const existingEmail =
        prefillData?.email ||
        (user?.email && !user.email.endsWith("@placeholder.com") ? user.email : "") ||
        "";
      const existingPhone =
        prefillData?.phone ||
        user?.phone ||
        "";
      const existingTitle = prefillData?.title || (user?.gender === "Female" ? "Mrs" : "Mr");
      const existingGender = prefillData?.gender || (existingTitle === "Mrs" || existingTitle === "Ms" ? "Female" : "Male");

      setFormData({
        title: existingTitle,
        firstName: existingFirst,
        lastName: existingLast,
        email: existingEmail,
        phone: existingPhone,
        gender: existingGender,
      });
      setError("");
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "title") {
        if (value === "Mrs" || value === "Ms") {
          updated.gender = "Female";
        } else {
          updated.gender = "Male";
        }
      }
      return updated;
    });
    if (error) setError("");
  };

  const handleSaveAndProceed = async (e) => {
    e?.preventDefault();
    setError("");

    const cleanFirst = formData.firstName.trim();
    const cleanLast = formData.lastName.trim();
    const cleanEmail = formData.email.trim();
    const cleanPhone = formData.phone.trim();

    if (!cleanFirst) {
      setError("Please enter your First Name.");
      return;
    }
    if (isGenericPlaceholder(cleanFirst)) {
      setError("Please enter a valid personal first name (not a generic placeholder).");
      return;
    }
    if (!cleanLast) {
      setError("Please enter your Last Name.");
      return;
    }
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!cleanPhone) {
      setError("Please enter your phone number.");
      return;
    }

    try {
      setSubmitting(true);
      const result = await syncProfileAndDefaultTraveller({
        user,
        firstName: cleanFirst,
        lastName: cleanLast,
        email: cleanEmail,
        phone: cleanPhone,
        gender: formData.gender,
        title: formData.title,
        dispatch,
      });

      toast.success("Profile updated and traveler profile created successfully!");
      if (onSuccess) {
        onSuccess(result?.traveller?._id || result?.traveller?.id, result);
      }
      onClose();
    } catch (err) {
      console.error("Failed to update profile & traveler:", err);
      const msg = err.response?.data?.message || err.message || "Failed to update profile. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNavigateToProfile = () => {
    try {
      sessionStorage.setItem("maqam_draft_checkout_return", window.location.pathname + window.location.search);
    } catch (_) {}
    onClose();
    navigate("/profile");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
      handleSaveAndProceed(e);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-6 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 rounded-xl backdrop-blur-md">
              <UserCheck className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Complete Your Profile</h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Required to add traveler and proceed with {bookingType} booking
              </p>
            </div>
          </div>
        </div>

        {/* Notice Alert Banner */}
        <div className="p-4 bg-amber-50 border-b border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-semibold text-amber-950">
                Edit your profile first then add that as traveler and then proceed to {bookingType} booking.
              </span>
              <p className="mt-1 text-amber-800">
                You logged in with your phone number only. Official hotel and travel regulations require verified passenger details.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Form Container (div to avoid nested <form> issues) */}
        <div onKeyDown={handleKeyDown} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <select
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {TITLE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* First Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="e.g. Mohammad"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Last Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="e.g. Khan"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="booking@example.com (for booking confirmation & vouchers)"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Booking confirmation and invoice will be sent here.
            </p>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleNavigateToProfile}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 font-medium py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Full Profile Page</span>
            </button>

            <div className="w-full sm:w-auto flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAndProceed}
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Save Profile & Proceed</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
