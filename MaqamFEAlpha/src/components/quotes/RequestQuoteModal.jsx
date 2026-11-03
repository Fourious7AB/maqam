import React, { useState, useEffect } from "react";
import {
  X,
  Send,
  Calendar,
  Users,
  Wallet,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  MapPin,
  Plane,
  Building,
  User,
  Mail,
  Phone,
  FileText,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { quoteService } from "../../services/quoteService";
import formatCurrency from "../../admin/utils/formatCurrency";

const DESTINATIONS = [
  "Makkah & Madinah",
  "Makkah Deluxe",
  "Madinah First",
  "Executive Umrah (5-Star)",
  "Economy Umrah Express",
  "VIP Ramadan Umrah",
  "Hajj Comprehensive Package",
  "Custom Multi-City Itinerary",
];

const TRIP_TYPES = [
  { id: "umrah", label: "Umrah Package" },
  { id: "hajj", label: "Hajj Journey" },
  { id: "ziyarat", label: "Ziyarat & Historical" },
  { id: "custom", label: "Custom Family / Group" },
];

export default function RequestQuoteModal({
  isOpen,
  onClose,
  initialData = {},
  onSuccess,
}) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    destination: "Makkah & Madinah",
    tripType: "umrah",
    from: "",
    to: "",
    numberOfPeople: 2,
    budget: "",
    specialRequests: "",
  });

  const [loading, setLoading] = useState(false);
  const [createdQuote, setCreatedQuote] = useState(null);
  const [copied, setCopied] = useState(false);

  // Prepopulate from stored user / initialData
  useEffect(() => {
    if (isOpen) {
      let storedUser = null;
      try {
        storedUser =
          JSON.parse(localStorage.getItem("maqam_auth_user")) ||
          JSON.parse(localStorage.getItem("user")) ||
          null;
      } catch {
        storedUser = null;
      }

      const first =
        initialData.firstName ||
        storedUser?.firstName ||
        (storedUser?.name ? storedUser.name.split(" ")[0] : "");
      const last =
        initialData.lastName ||
        storedUser?.lastName ||
        (storedUser?.name ? storedUser.name.split(" ").slice(1).join(" ") : "");

      // Default dates: next month
      const today = new Date();
      const defaultFrom = new Date(today.getTime() + 14 * 86400000)
        .toISOString()
        .slice(0, 10);
      const defaultTo = new Date(today.getTime() + 24 * 86400000)
        .toISOString()
        .slice(0, 10);

      setFormData({
        firstName: first || "",
        lastName: last || "",
        email: initialData.email || storedUser?.email || "",
        phone: initialData.phone || storedUser?.phone || "",
        destination: initialData.destination || "Makkah & Madinah",
        tripType: initialData.tripType || "umrah",
        from: initialData.from || defaultFrom,
        to: initialData.to || defaultTo,
        numberOfPeople: Number(initialData.numberOfPeople || 2),
        budget: initialData.budget ? String(initialData.budget) : "250000",
        specialRequests: initialData.specialRequests || "",
      });
      setCreatedQuote(null);
      setCopied(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCopyReference = (ref) => {
    if (!ref) return;
    navigator.clipboard.writeText(ref);
    setCopied(true);
    toast.success("Reference number copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.phone.trim()) {
      toast.warning("Please provide a valid phone number for quotation updates");
      return;
    }
    if (!formData.destination.trim()) {
      toast.warning("Please select your destination");
      return;
    }

    try {
      setLoading(true);
      const res = await quoteService.requestQuote({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        destination: formData.destination,
        tripType: formData.tripType,
        travelDates: {
          from: formData.from ? `${formData.from}T00:00:00.000Z` : null,
          to: formData.to ? `${formData.to}T00:00:00.000Z` : null,
        },
        numberOfPeople: Number(formData.numberOfPeople || 2),
        budget: Number(formData.budget || 0),
        specialRequests: formData.specialRequests,
      });

      setCreatedQuote(res.quote);
      toast.success(res.message || "Quotation request submitted successfully!");
      onSuccess?.(res.quote);
    } catch (err) {
      toast.error(err.message || "Failed to submit quotation request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/75 backdrop-blur-xs animate-fade-in font-poppins">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white dark:bg-[#0d1527] shadow-2xl border border-slate-100 dark:border-slate-800 transition-all my-6">
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-[#0f6b7b] via-[#0d7c89] to-[#0b5b73] px-5 sm:px-6 py-5 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-xs">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="text-xl font-extrabold tracking-tight">
                {createdQuote ? "Quotation Request Submitted!" : "Request a Custom Trip Quotation"}
              </h3>
              <p className="text-xs text-teal-100/90 mt-0.5">
                {createdQuote
                  ? "Your request has been registered with our specialist team"
                  : "Tell us your travel preferences and our specialists will craft the best proposal"}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 max-h-[80vh] overflow-y-auto">
          {createdQuote ? (
            /* Success confirmation screen */
            <div className="space-y-6 text-center py-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={36} />
              </div>

              <div className="space-y-2">
                <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                  Quotation Confirmed!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  We have received your custom Umrah / Hajj enquiry. Our assigned travel specialist is calculating flight options, Haram-view hotel room tariffs, and customized inclusions.
                </p>
              </div>

              {/* Reference Card */}
              <div className="rounded-2xl border border-teal-200 dark:border-teal-800/60 bg-teal-50/70 dark:bg-teal-950/30 p-4 max-w-md mx-auto">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                  Your Quotation Reference
                </span>
                <div className="mt-1 flex items-center justify-center gap-3">
                  <span className="text-2xl font-black tracking-wider text-[#0f6b7b] dark:text-teal-300">
                    {createdQuote.reference}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyReference(createdQuote.reference)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-[#0f6b7b] dark:text-teal-300 shadow-xs hover:bg-teal-100 dark:hover:bg-slate-700 transition cursor-pointer"
                    title="Copy reference number"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-teal-900/80 dark:text-teal-200/80">
                  Registered phone: <strong>{createdQuote.contact?.phone || formData.phone}</strong>
                </p>
              </div>

              {/* What happens next */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 text-left space-y-2.5 max-w-md mx-auto text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0f6b7b] text-[11px] font-bold text-white">
                    1
                  </span>
                  <span>Specialist prepares custom pricing and email/WhatsApp dispatch.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0f6b7b] text-[11px] font-bold text-white">
                    2
                  </span>
                  <span>Review proposal price & expiry date in your <strong>Customer Care</strong> tab.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0f6b7b] text-[11px] font-bold text-white">
                    3
                  </span>
                  <span>Accept proposal or request discount/adjustments with 1-click.</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-[#0f6b7b] to-[#0d7c89] px-6 py-3 text-sm font-bold text-white shadow-md hover:from-[#0d5f6f] hover:to-[#0a6572] transition cursor-pointer"
                >
                  View My Quotations in Customer Care
                </button>
              </div>
            </div>
          ) : (
            /* Form screen */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Trip Type Selector */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Select Trip Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TRIP_TYPES.map((t) => {
                    const isSelected = formData.tripType === t.id;
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => handleChange("tripType", t.id)}
                        className={`rounded-xl border px-3 py-2 text-xs font-bold transition text-center cursor-pointer ${
                          isSelected
                            ? "border-[#0f6b7b] bg-[#eaf7f8] dark:bg-teal-950/60 text-[#0f6b7b] dark:text-teal-300 shadow-xs"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Destination & Travelers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Destination / Itinerary
                  </label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3 top-3 text-slate-400" />
                    <select
                      value={formData.destination}
                      onChange={(e) => handleChange("destination", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f6b7b] dark:focus:border-teal-400 focus:bg-white"
                    >
                      {DESTINATIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Number of Travellers
                  </label>
                  <div className="relative">
                    <Users size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.numberOfPeople}
                      onChange={(e) => handleChange("numberOfPeople", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f6b7b] dark:focus:border-teal-400 focus:bg-white"
                      placeholder="e.g. 4"
                    />
                  </div>
                </div>
              </div>

              {/* Travel Dates & Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Travel From
                  </label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="date"
                      value={formData.from}
                      onChange={(e) => handleChange("from", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f6b7b] dark:focus:border-teal-400 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Travel To
                  </label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="date"
                      value={formData.to}
                      onChange={(e) => handleChange("to", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f6b7b] dark:focus:border-teal-400 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Target Budget (₹ INR)
                  </label>
                  <div className="relative">
                    <Wallet size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="number"
                      step="5000"
                      min="0"
                      value={formData.budget}
                      onChange={(e) => handleChange("budget", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f6b7b] dark:focus:border-teal-400 focus:bg-white"
                      placeholder="e.g. 350000"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Contact Information (For Quotation Delivery)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      First Name
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleChange("firstName", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f6b7b] dark:focus:border-teal-400 focus:bg-white"
                        placeholder="e.g. Ahmed"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleChange("lastName", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f6b7b] dark:focus:border-teal-400 focus:bg-white"
                      placeholder="e.g. Farooq"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Phone Number (WhatsApp updates) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f6b7b] dark:focus:border-teal-400 focus:bg-white"
                        placeholder="e.g. +91 98765 43210"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f6b7b] dark:focus:border-teal-400 focus:bg-white"
                        placeholder="e.g. ahmed.farooq@example.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Special Requests */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Special Requests & Hotel Room Preferences
                </label>
                <textarea
                  rows="2"
                  value={formData.specialRequests}
                  onChange={(e) => handleChange("specialRequests", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f6b7b] dark:focus:border-teal-400 focus:bg-white"
                  placeholder="e.g. 2 Quadruple rooms near Clock Tower, non-stop flights from Mumbai, elderly wheelchair assistance"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0f6b7b] to-[#0d7c89] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:from-[#0d5f6f] hover:to-[#0a6572] transition disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <span>Submitting Request...</span>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Request Quotation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
