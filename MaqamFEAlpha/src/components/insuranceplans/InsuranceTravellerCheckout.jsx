import React, { useState, useEffect } from "react";
import {
  Shield,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  Phone,
  Mail,
  FileText,
  Printer,
  Download,
  Share2,
  ArrowLeft,
  Sparkles,
  Check,
  CreditCard,
  Building,
} from "lucide-react";
import {
  formatDisplayDate,
  calculateDaysCount,
  generatePolicyNumber,
} from "../../data/insuranceData";

export default function InsuranceTravellerCheckout({
  searchState,
  setSearchState,
  selectedPlan,
  onBackToPlans,
  user,
}) {
  const [travellers, setTravellers] = useState(() => {
    const initialCount = searchState.travellerCount || 1;
    return Array.from({ length: initialCount }, (_, index) => ({
      id: index + 1,
      fullName: index === 0 && user?.name ? user.name : "",
      dob: "",
      gender: "Male",
      passportNumber: "",
      nomineeName: "",
      isExpanded: true,
    }));
  });

  const [primaryContact, setPrimaryContact] = useState({
    mobile: user?.phone || user?.mobile || "9876543210",
    email: user?.email || "traveller@example.com",
  });

  const [declaration1, setDeclaration1] = useState(true);
  const [declaration2, setDeclaration2] = useState(true);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedPolicy, setIssuedPolicy] = useState(null);

  // Keep searchState traveller count in sync
  useEffect(() => {
    setSearchState((prev) => ({
      ...prev,
      travellerCount: travellers.length,
    }));
  }, [travellers.length, setSearchState]);

  const startFormatted = formatDisplayDate(searchState.startDate);
  const endFormatted = formatDisplayDate(searchState.endDate);
  const countriesText =
    searchState.selectedCountries.map((c) => c.name).join(", ") || "Thailand";

  const totalPayable = (selectedPlan.discountedPrice || 295) * travellers.length;
  const originalTotal = (selectedPlan.originalPrice || 394) * travellers.length;
  const totalSavings = (selectedPlan.saveAmount || 99) * travellers.length;

  const handleTravellerChange = (id, field, value) => {
    setTravellers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
    // clear error for this field
    if (errors[`${id}_${field}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`${id}_${field}`];
        return next;
      });
    }
  };

  const toggleExpand = (id) => {
    setTravellers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExpanded: !t.isExpanded } : t))
    );
  };

  const addAnotherTraveller = () => {
    const nextId = travellers.length + 1;
    setTravellers((prev) => [
      ...prev,
      {
        id: nextId,
        fullName: "",
        dob: "",
        gender: "Male",
        passportNumber: "",
        nomineeName: "",
        isExpanded: true,
      },
    ]);
  };

  const removeTraveller = (id) => {
    if (travellers.length <= 1) return;
    setTravellers((prev) => prev.filter((t) => t.id !== id));
  };

  const validateForm = () => {
    const newErrors = {};

    travellers.forEach((t, i) => {
      if (!t.fullName.trim()) {
        newErrors[`${t.id}_fullName`] = "Full name is required";
      }
      if (!t.dob) {
        newErrors[`${t.id}_dob`] = "Date of birth is required";
      }
    });

    if (!primaryContact.mobile.trim() || primaryContact.mobile.length < 10) {
      newErrors.mobile = "Enter a valid 10-digit mobile number";
    }
    if (
      !primaryContact.email.trim() ||
      !primaryContact.email.includes("@")
    ) {
      newErrors.email = "Enter a valid email address";
    }

    if (!declaration1 || !declaration2) {
      newErrors.declarations = "Please accept both mandatory declarations";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBuyNow = () => {
    if (!validateForm()) {
      window.scrollTo({ top: 300, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);

    // Simulate instant policy generation
    setTimeout(() => {
      const policyNo = generatePolicyNumber();
      const policyData = {
        policyNumber: policyNo,
        provider: "Authorized Insurance Partner",
        planName: selectedPlan.title,
        sumInsured: selectedPlan.sumInsured,
        destination: countriesText,
        startDate: searchState.startDate,
        endDate: searchState.endDate,
        travellersCount: travellers.length,
        travellersList: travellers.map((t) => ({
          name: t.fullName,
          dob: t.dob,
          gender: t.gender,
          passport: t.passportNumber || "Not Provided",
        })),
        contact: primaryContact,
        amountPaid: totalPayable,
        issueDate: new Date().toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      };

      // Save to localStorage for persistence
      try {
        const existing = JSON.parse(
          localStorage.getItem("userInsurancePolicies") || "[]"
        );
        localStorage.setItem(
          "userInsurancePolicies",
          JSON.stringify([policyData, ...existing])
        );
      } catch (err) {
        console.error("Storage error:", err);
      }

      setIssuedPolicy(policyData);
      setIsSubmitting(false);
    }, 1000);
  };

  const handlePrint = () => {
    window.print();
  };

  // If policy was successfully issued, show Policy Confirmation Certificate
  if (issuedPolicy) {
    return (
      <div className="min-h-screen bg-[#f4f7fb] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden print:shadow-none print:border-none">
          {/* Certificate Header Banner */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-blue-800 text-white p-6 sm:p-8 text-center relative">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center mx-auto mb-4 border border-white/40 shadow-lg">
              <CheckCircle2 size={36} className="text-white" />
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full border border-white/30">
              Policy Successfully Issued
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-3">
              Travel Insurance Certificate
            </h1>
            <p className="text-xs text-white/80 mt-1">
              Co-branded with {issuedPolicy.provider}
            </p>
          </div>

          {/* Certificate Details */}
          <div className="p-6 sm:p-8 space-y-6 text-slate-800">
            {/* Policy Key Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  POLICY NUMBER
                </span>
                <span className="text-sm font-black text-blue-700 font-mono">
                  {issuedPolicy.policyNumber}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  SUM INSURED
                </span>
                <span className="text-sm font-black text-slate-900">
                  {issuedPolicy.sumInsured}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  DESTINATION
                </span>
                <span className="text-sm font-black text-slate-900 truncate block">
                  {issuedPolicy.destination}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  VALIDITY
                </span>
                <span className="text-sm font-black text-slate-900">
                  {issuedPolicy.startDate} to {issuedPolicy.endDate}
                </span>
              </div>
            </div>

            {/* Insured Travellers List */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Insured Travellers ({issuedPolicy.travellersList.length})
              </h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {issuedPolicy.travellersList.map((tr, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 flex flex-wrap items-center justify-between text-xs hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      <User size={15} className="text-blue-600" />
                      <span className="font-extrabold text-slate-900">
                        {tr.name}
                      </span>
                      <span className="text-slate-400">({tr.gender})</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-500">
                      <span>DOB: {tr.dob}</span>
                      <span>Passport: {tr.passport}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Primary Contact & Emergency Assistance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-1">
                  Primary Contact
                </h4>
                <p className="text-slate-600">
                  Email: <strong>{issuedPolicy.contact.email}</strong>
                </p>
                <p className="text-slate-600">
                  Mobile: <strong>+91 {issuedPolicy.contact.mobile}</strong>
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50">
                <h4 className="font-bold text-blue-900 mb-1">
                  24x7 Worldwide Emergency Helpline
                </h4>
                <p className="text-blue-700">
                  International Toll-Free: <strong>+1-800-425-2255</strong>
                </p>
                <p className="text-blue-700">
                  Email: <strong>claims@gomaqam.com</strong>
                </p>
              </div>
            </div>

            {/* Price Paid Badge */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs">
              <span className="font-bold text-emerald-900">
                Total Premium Paid (Inclusive of all taxes):
              </span>
              <span className="text-lg font-black text-emerald-700">
                ₹{issuedPolicy.amountPaid}
              </span>
            </div>

            {/* Action Buttons (Hidden on Print) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 print:hidden">
              <button
                type="button"
                onClick={onBackToPlans}
                className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer transition"
              >
                Book Another Policy
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition shadow-sm"
                >
                  <Printer size={15} />
                  <span>Print / Save as PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#f4f7fb] min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Link */}
        <button
          type="button"
          onClick={onBackToPlans}
          className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 mb-6 transition cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>Back to Plan Selection</span>
        </button>

        {/* Two Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ========================================================= */}
          {/* LEFT COLUMN: TRIP & PLAN SUMMARY (Screenshot 3 left) */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 space-y-6">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Add Travellers
            </h1>

            {/* Trip Summary Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {countriesText}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {startFormatted?.formatted || searchState.startDate} -{" "}
                    {endFormatted?.formatted || searchState.endDate} |{" "}
                    {travellers.length}{" "}
                    {travellers.length === 1 ? "traveller" : "travellers"}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="my-5 border-t border-slate-100" />

              {/* Insurance Details */}
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      INSURANCE
                    </span>
                    <h3 className="text-sm font-black text-slate-900 mt-0.5">
                      {selectedPlan.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Sum Insured: {selectedPlan.sumInsured}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onBackToPlans}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-blue-600 transition cursor-pointer"
                    title="Change Plan"
                  >
                    <Edit2 size={15} />
                  </button>
                </div>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-xs text-slate-500">Amount to pay:</span>
                  <span className="text-xs text-slate-400 line-through">
                    ₹{originalTotal}
                  </span>
                  <span className="text-xl font-black text-slate-900">
                    ₹ {totalPayable}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="text-emerald-600 font-bold">
                    You save ₹{totalSavings}
                  </span>
                  <a
                    href="#terms"
                    onClick={(e) => {
                      e.preventDefault();
                      alert(
                        "Standard Travel Insurance Terms & Conditions apply."
                      );
                    }}
                    className="text-blue-600 hover:underline"
                  >
                    T&Cs
                  </a>
                </div>
              </div>
            </div>

            {/* Trust Alert Box (Screenshot 3 Left) */}
            <div className="bg-emerald-50/70 rounded-3xl border border-emerald-200/70 p-5 flex items-start gap-3.5 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black text-emerald-950">
                  Great Choice!
                </h4>
                <p className="mt-1 text-xs text-emerald-800 leading-relaxed">
                  Valid for {countriesText} travel. Over 1 Million Travellers
                  insured in the last month.
                </p>
              </div>
            </div>

            {/* Price Breakdown Details */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs text-xs space-y-2.5">
              <div className="flex justify-between text-slate-600">
                <span>
                  Base Premium ({travellers.length} × ₹{selectedPlan.originalPrice})
                </span>
                <span>₹{originalTotal}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>GoMaqam Discount</span>
                <span>- ₹{totalSavings}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST (18% Included)</span>
                <span>Included</span>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-between text-sm font-black text-slate-900">
                <span>Total Amount Due</span>
                <span className="text-blue-600 text-lg">₹ {totalPayable}</span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: TRAVELLER DETAILS & PRIMARY CONTACT FORM */}
          {/* ========================================================= */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Traveller Details
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Covers Indian citizens between age of 6 months and 70 years
                  </p>
                </div>
                <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  Travellers: {travellers.length}/{travellers.length} Added
                </div>
              </div>

              {/* Dynamic Traveller Form Accordions */}
              <div className="mt-6 space-y-4">
                {travellers.map((traveller, index) => (
                  <div
                    key={traveller.id}
                    className="border border-slate-200 rounded-2xl overflow-hidden transition"
                  >
                    {/* Accordion Header */}
                    <div
                      onClick={() => toggleExpand(traveller.id)}
                      className="p-4 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-xs">
                          ✓
                        </div>
                        <span className="text-sm font-black text-slate-900">
                          Traveller {index + 1}
                          {traveller.fullName && ` (${traveller.fullName})`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {travellers.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTraveller(traveller.id);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition"
                            title="Remove Traveller"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                        {traveller.isExpanded ? (
                          <ChevronUp size={16} className="text-slate-400" />
                        ) : (
                          <ChevronDown size={16} className="text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Accordion Body */}
                    {traveller.isExpanded && (
                      <div className="p-5 space-y-4">
                        {/* Full Name & DOB */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                              FULL NAME *
                            </label>
                            <input
                              type="text"
                              placeholder="Full Name as on passport"
                              value={traveller.fullName}
                              onChange={(e) =>
                                handleTravellerChange(
                                  traveller.id,
                                  "fullName",
                                  e.target.value
                                )
                              }
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                                errors[`${traveller.id}_fullName`]
                                  ? "border-rose-400 bg-rose-50/20"
                                  : "border-slate-200 focus:border-blue-500"
                              }`}
                            />
                            {errors[`${traveller.id}_fullName`] && (
                              <p className="mt-1 text-[11px] text-rose-500 font-medium">
                                {errors[`${traveller.id}_fullName`]}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                              DATE OF BIRTH *
                            </label>
                            <input
                              type="date"
                              value={traveller.dob}
                              max={new Date().toISOString().split("T")[0]}
                              onChange={(e) =>
                                handleTravellerChange(
                                  traveller.id,
                                  "dob",
                                  e.target.value
                                )
                              }
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                                errors[`${traveller.id}_dob`]
                                  ? "border-rose-400 bg-rose-50/20"
                                  : "border-slate-200 focus:border-blue-500"
                              }`}
                            />
                            {errors[`${traveller.id}_dob`] && (
                              <p className="mt-1 text-[11px] text-rose-500 font-medium">
                                {errors[`${traveller.id}_dob`]}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Gender Pill Radios */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                            Gender *
                          </label>
                          <div className="flex gap-2">
                            {["Male", "Female", "Others"].map((genderOption) => (
                              <button
                                key={genderOption}
                                type="button"
                                onClick={() =>
                                  handleTravellerChange(
                                    traveller.id,
                                    "gender",
                                    genderOption
                                  )
                                }
                                className={`px-5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                  traveller.gender === genderOption
                                    ? "bg-blue-50 text-blue-700 border-blue-500"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                {genderOption}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Passport Number (Optional) & Nominee Name */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                              Passport Number (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="Passport Number"
                              value={traveller.passportNumber}
                              onChange={(e) =>
                                handleTravellerChange(
                                  traveller.id,
                                  "passportNumber",
                                  e.target.value.toUpperCase()
                                )
                              }
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                              Nominee Name (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="Nominee Name"
                              value={traveller.nomineeName}
                              onChange={(e) =>
                                handleTravellerChange(
                                  traveller.id,
                                  "nomineeName",
                                  e.target.value
                                )
                              }
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* + ADD ANOTHER TRAVELLER */}
                <button
                  type="button"
                  onClick={addAnotherTraveller}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50/40 text-blue-600 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Plus size={15} />
                  <span>ADD ANOTHER TRAVELLER</span>
                </button>
              </div>

              {/* Primary Contact Details (Screenshot 3) */}
              <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Primary Contact Details
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    All communication related to insurance and assistance will
                    be sent to this contact.
                  </p>
                  {user && (
                    <span className="inline-block mt-1 text-[11px] font-bold text-emerald-600">
                      ✓ Logged in as {user.name || user.email}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Mobile No *
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="Mobile Number"
                        value={primaryContact.mobile}
                        onChange={(e) =>
                          setPrimaryContact((prev) => ({
                            ...prev,
                            mobile: e.target.value.replace(/\D/g, ""),
                          }))
                        }
                        className={`w-full px-3.5 py-2.5 rounded-r-xl border text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                          errors.mobile
                            ? "border-rose-400 bg-rose-50/20"
                            : "border-slate-200 focus:border-blue-500"
                        }`}
                      />
                    </div>
                    {errors.mobile && (
                      <p className="mt-1 text-[11px] text-rose-500 font-medium">
                        {errors.mobile}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email ID *
                    </label>
                    <input
                      type="email"
                      placeholder="Enter Email ID"
                      value={primaryContact.email}
                      onChange={(e) =>
                        setPrimaryContact((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                        errors.email
                          ? "border-rose-400 bg-rose-50/20"
                          : "border-slate-200 focus:border-blue-500"
                      }`}
                    />
                    {errors.email && (
                      <p className="mt-1 text-[11px] text-rose-500 font-medium">
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Declarations (Screenshot 3 checkboxes) */}
              <div className="mt-8 pt-6 border-t border-slate-100 space-y-3.5 text-xs text-slate-600">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declaration1}
                    onChange={(e) => setDeclaration1(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-blue-600 accent-blue-600 shrink-0 cursor-pointer"
                  />
                  <span className="leading-relaxed">
                    I declare that all travellers are Indian citizens between 6
                    months and 70 years of age, currently present in India and
                    journey originates in India on the Trip start date &amp; due
                    consent for insurance has been obtained from all travellers
                    listed.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declaration2}
                    onChange={(e) => setDeclaration2(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-blue-600 accent-blue-600 shrink-0 cursor-pointer"
                  />
                  <span className="leading-relaxed">
                    I declare all travellers are in good health, fit for travel
                    and aware pre-existing medical conditions or its
                    complications aren&apos;t covered.
                  </span>
                </label>

                {errors.declarations && (
                  <p className="text-xs text-rose-500 font-bold">
                    {errors.declarations}
                  </p>
                )}

                {/* Legal Disclaimer */}
                <p className="text-[11px] text-slate-400 pt-2 leading-relaxed">
                  GoMaqam hereby disclaims warranties of any kind, whether
                  express or implied, including the warranty of title,
                  merchantability, non-infringement and fitness for a particular
                  purpose with regard to the travel insurances available on its
                  platform.
                </p>
              </div>

              {/* BUY FOR Button (Screenshot 3) */}
              <div className="mt-8 pt-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleBuyNow}
                  className="w-full py-3.5 rounded-xl bg-[#008cff] hover:bg-[#0073d8] active:scale-98 disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Issuing Policy...</span>
                  ) : (
                    <span>BUY FOR ₹ {totalPayable}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
