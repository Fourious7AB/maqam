import React, { useState, useRef, useEffect } from "react";
import {
  Shield,
  Plane,
  Calendar,
  Users,
  ChevronDown,
  Search,
  Check,
  Sparkles,
  Briefcase,
  Globe,
  X,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import {
  WORLDWIDE_COUNTRIES,
  PROTECTION_ADDONS,
  formatDisplayDate,
} from "../../data/insuranceData";

export default function InsuranceSearchHero({
  searchState,
  setSearchState,
  onExplorePlans,
}) {
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [showTravellerModal, setShowTravellerModal] = useState(false);
  const countryModalRef = useRef(null);
  const travellerModalRef = useRef(null);

  // Close modals on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        countryModalRef.current &&
        !countryModalRef.current.contains(e.target)
      ) {
        setShowCountryModal(false);
      }
      if (
        travellerModalRef.current &&
        !travellerModalRef.current.contains(e.target)
      ) {
        setShowTravellerModal(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered countries
  const filteredCountries = WORLDWIDE_COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
      c.region.toLowerCase().includes(countrySearchQuery.toLowerCase())
  );

  const popularCountries = WORLDWIDE_COUNTRIES.filter((c) => c.popular);

  const toggleCountry = (country) => {
    const exists = searchState.selectedCountries.some(
      (c) => c.code === country.code
    );
    if (exists) {
      if (searchState.selectedCountries.length > 1) {
        setSearchState((prev) => ({
          ...prev,
          selectedCountries: prev.selectedCountries.filter(
            (c) => c.code !== country.code
          ),
        }));
      }
    } else {
      setSearchState((prev) => ({
        ...prev,
        selectedCountries: [...prev.selectedCountries, country],
      }));
    }
  };

  const selectSingleCountry = (country) => {
    setSearchState((prev) => ({
      ...prev,
      selectedCountries: [country],
    }));
    setShowCountryModal(false);
  };

  const startFormatted = formatDisplayDate(searchState.startDate);
  const endFormatted = formatDisplayDate(searchState.endDate);

  const primaryCountryText =
    searchState.selectedCountries.map((c) => c.name).join(", ") || "Thailand";

  return (
    <div className="w-full">
      {/* Hero Section with scenic backdrop */}
      <div
        className="relative min-h-[580px] bg-slate-900 bg-cover bg-center text-white px-4 sm:px-6 lg:px-8 pt-10 pb-28 overflow-visible"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(8, 22, 44, 0.88) 0%, rgba(12, 35, 75, 0.84) 50%, rgba(6, 17, 34, 0.94) 100%), url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=80')`,
        }}
      >
        {/* Subtle decorative glowing background orbs */}
        <div className="absolute top-12 left-1/5 w-80 h-80 bg-sky-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute bottom-16 right-1/4 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Hero Header Text */}
          <div className="mb-8 max-w-3xl text-left animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sky-200 text-xs font-semibold mb-3.5 shadow-sm transition-transform hover:scale-105 duration-300">
              <Shield size={14} className="text-sky-300 animate-bounce" />
              <span>International Travel Protection • Instant E-Policy Delivery</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
              Explore the World with <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
                Complete Peace of Mind
              </span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-300 font-normal leading-relaxed max-w-2xl">
              Cashless international hospitalization, trip cancellation & 24/7 global medical concierge across 190+ countries worldwide.
            </p>
          </div>

          {/* Search Card Container */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_25px_70px_-15px_rgba(2,12,27,0.35)] text-slate-800 p-6 sm:p-8 relative border border-white/80 transition-all duration-300 hover:shadow-[0_30px_80px_-15px_rgba(2,12,27,0.45)]">
            {/* Top row with trip type radio and discount badge */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2.5 cursor-pointer text-sm font-bold text-slate-800 transition hover:text-blue-600">
                  <input
                    type="radio"
                    name="tripType"
                    checked={searchState.tripType === "single"}
                    onChange={() =>
                      setSearchState((prev) => ({ ...prev, tripType: "single" }))
                    }
                    className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer"
                  />
                  <span>Single Trip</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-sm font-bold text-slate-600 hover:text-blue-600 transition">
                  <input
                    type="radio"
                    name="tripType"
                    checked={searchState.tripType === "multi"}
                    onChange={() =>
                      setSearchState((prev) => ({ ...prev, tripType: "multi" }))
                    }
                    className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer"
                  />
                  <span>Annual Multi Trip</span>
                  <span className="relative flex h-2 w-2 mr-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                  </span>
                  <span className="bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                    new
                  </span>
                </label>
              </div>

              {/* Promotional pill with shimmer */}
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all duration-300 hover:scale-[1.02]">
                <Sparkles size={13} className="text-yellow-300 animate-spin" style={{ animationDuration: "3s" }} />
                <span>Exclusive Offer: We Cover upto 40% of Insurance Premium For you!</span>
              </div>

              <div className="text-xs font-semibold text-slate-500 hidden sm:flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>International Travel + Medical Insurance</span>
              </div>
            </div>

            {/* 4 Main Search Input Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 py-6">
              {/* 1. TRAVELLING TO */}
              <div
                onClick={() => setShowCountryModal(true)}
                className="group relative p-4 rounded-2xl border-2 border-slate-200/80 hover:border-blue-500 bg-white hover:bg-blue-50/20 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500 group-hover:text-blue-600 transition-colors">
                  <span>TRAVELLING TO</span>
                  <ChevronDown size={15} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-y-0.5 transition-all" />
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <span className="text-2xl drop-shadow-sm group-hover:scale-110 transition-transform">
                    {searchState.selectedCountries[0]?.flag || "🌐"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-xl font-black text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors">
                      {primaryCountryText}
                    </p>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      {searchState.selectedCountries.length} {searchState.selectedCountries.length === 1 ? "country selected" : "countries selected"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. START DATE */}
              <div className="group relative p-4 rounded-2xl border-2 border-slate-200/80 hover:border-blue-500 bg-white hover:bg-blue-50/20 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500 group-hover:text-blue-600 transition-colors">
                  <span>START DATE</span>
                  <Calendar size={15} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <div className="mt-2.5">
                  <input
                    type="date"
                    value={searchState.startDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) =>
                      setSearchState((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                        endDate:
                          prev.endDate < e.target.value
                            ? e.target.value
                            : prev.endDate,
                      }))
                    }
                    className="w-full text-lg sm:text-xl font-black text-slate-900 bg-transparent outline-none cursor-pointer group-hover:text-blue-600 transition-colors"
                  />
                  <p className="text-xs text-slate-500 font-semibold capitalize mt-0.5">
                    {startFormatted?.weekday || "Departure Day"}
                  </p>
                </div>
              </div>

              {/* 3. END DATE */}
              <div className="group relative p-4 rounded-2xl border-2 border-slate-200/80 hover:border-blue-500 bg-white hover:bg-blue-50/20 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500 group-hover:text-blue-600 transition-colors">
                  <span>END DATE</span>
                  <Calendar size={15} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <div className="mt-2.5">
                  <input
                    type="date"
                    value={searchState.endDate}
                    min={searchState.startDate || new Date().toISOString().split("T")[0]}
                    onChange={(e) =>
                      setSearchState((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                    className="w-full text-lg sm:text-xl font-black text-slate-900 bg-transparent outline-none cursor-pointer group-hover:text-blue-600 transition-colors"
                  />
                  <p className="text-xs text-slate-500 font-semibold capitalize mt-0.5">
                    {endFormatted?.weekday || "Return Day"}
                  </p>
                </div>
              </div>

              {/* 4. NO. OF TRAVELLERS */}
              <div
                onClick={() => setShowTravellerModal(true)}
                className="group relative p-4 rounded-2xl border-2 border-slate-200/80 hover:border-blue-500 bg-white hover:bg-blue-50/20 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500 group-hover:text-blue-600 transition-colors">
                  <span>NO. OF TRAVELLERS</span>
                  <ChevronDown size={15} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-y-0.5 transition-all" />
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center transition-all duration-300">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                      {searchState.travellerCount}{" "}
                      {searchState.travellerCount === 1 ? "Traveller" : "Travellers"}
                    </p>
                    <p className="text-xs text-slate-500 font-semibold">
                      Age: 6 months to 70 yrs
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Plan Type & Explore Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  TYPE OF PLAN:
                </span>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-800 hover:text-blue-600 transition">
                  <input
                    type="radio"
                    name="planType"
                    checked={searchState.planType === "regular"}
                    onChange={() =>
                      setSearchState((prev) => ({ ...prev, planType: "regular" }))
                    }
                    className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer"
                  />
                  <span>Regular</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-600 hover:text-blue-600 transition">
                  <input
                    type="radio"
                    name="planType"
                    checked={searchState.planType === "student"}
                    onChange={() =>
                      setSearchState((prev) => ({ ...prev, planType: "student" }))
                    }
                    className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer"
                  />
                  <span>Student</span>
                </label>
              </div>

              {/* Glowing Gradient Button with smooth hover animation */}
              <button
                type="button"
                onClick={onExplorePlans}
                className="group w-full sm:w-auto px-10 py-3.5 rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-black text-sm tracking-widest uppercase shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <span>EXPLORE PLANS</span>
                <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1.5" />
              </button>
            </div>
          </div>

          {/* Below Search Box: Trust Indicators */}
          <div className="mt-6 flex flex-wrap items-center justify-between text-xs text-slate-200 gap-4 px-2">
            <div className="flex items-center gap-2.5 font-bold">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
                ✓
              </span>
              <span>12 Lakh+ Travellers Insured last month</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-300 font-semibold cursor-pointer hover:text-white transition">
              <span>Explore Travel Protection Plans</span>
              <ChevronDown size={14} />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-400">Offered In Partnership With</span>
              <span className="font-black tracking-wider bg-white/10 px-3.5 py-1.5 rounded-xl text-white border border-white/20 shadow-xs">
                Certified Insurance Partners
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Travel Protection Plans Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/80 p-3.5 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl text-blue-700 font-black text-xs sm:text-sm border border-blue-100/60 shadow-2xs">
            <Shield size={16} className="text-blue-600" />
            <span>Protection Add-ons</span>
            <Sparkles size={14} className="text-amber-500" />
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-around gap-4 w-full">
            {PROTECTION_ADDONS.map((addon) => (
              <div
                key={addon.id}
                className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-2xl transition-all duration-300 cursor-pointer group hover:-translate-y-0.5 hover:shadow-sm"
              >
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/80 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-2xs">
                  {addon.id === "flight-delay" && <Plane size={18} />}
                  {addon.id === "passport-loss" && <ShieldAlert size={18} />}
                  {addon.id === "baggage-loss" && <Briefcase size={18} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-black text-slate-800 group-hover:text-blue-600 transition">
                      {addon.title}
                    </p>
                    {addon.badge && (
                      <span className="bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider shadow-2xs">
                        {addon.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">{addon.desc}</p>
                </div>
                <ArrowRight size={13} className="text-blue-500 group-hover:translate-x-1 transition-transform" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Promotional Banner Section: "We Pay to Secure Your Travel Plans" */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-8 sm:p-12 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-2xl border border-slate-700/50">
          {/* Subtle decorative glowing background orbs */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Left Text */}
          <div className="max-w-xl text-white relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold mb-3">
              <Sparkles size={13} />
              <span>Special GoMaqam Co-Contribution</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight">
              We Pay to Secure Your Travel Plans
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
              Book your travel insurance through GoMaqam and we'll contribute{" "}
              <strong className="text-amber-400 font-bold">upto 40%</strong> of your
              premium. Enjoy premium international protection without paying high costs.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5 text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15">
                <Check size={14} className="text-emerald-400" /> Cashless Global Hospitalization
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15">
                <Check size={14} className="text-emerald-400" /> Zero Paperwork & Instant Delivery
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15">
                <Check size={14} className="text-emerald-400" /> Medical Evacuation & Repatriation
              </span>
            </div>
          </div>

          {/* Right Live Calculation Card */}
          <div className="relative flex items-center justify-center relative z-10">
            {/* White floating price breakdown card */}
            <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-7 w-72 sm:w-80 text-left border border-slate-100 transition-transform duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Coverage: $250,000
                </p>
                <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Save 30%
                </span>
              </div>
              <div className="mt-4 space-y-2.5 border-b border-slate-100 pb-4 text-xs font-semibold">
                <div className="flex justify-between text-slate-500">
                  <span>Standard Premium</span>
                  <span className="text-slate-700">₹466</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>GoMaqam Contribution</span>
                  <span>- ₹140</span>
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-xs font-bold text-slate-700">
                  You Pay Only
                </span>
                <span className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  ₹ 326
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Worldwide Country Selector Modal */}
      {showCountryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            ref={countryModalRef}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Select Destination Countries
                </h3>
                <p className="text-xs text-slate-500">
                  Choose one or multiple destinations worldwide
                </p>
              </div>
              <button
                onClick={() => setShowCountryModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search any country worldwide (e.g. Thailand, Saudi Arabia, USA, Europe)..."
                  value={countrySearchQuery}
                  onChange={(e) => setCountrySearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  autoFocus
                />
              </div>

              {/* Popular countries quick chips */}
              <div className="mt-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Popular Destinations:
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {popularCountries.map((c) => {
                    const isSelected = searchState.selectedCountries.some(
                      (sc) => sc.code === c.code
                    );
                    return (
                      <button
                        key={c.code}
                        onClick={() => toggleCountry(c)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition cursor-pointer ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/30"
                        }`}
                      >
                        <span>{c.flag}</span>
                        <span>{c.name}</span>
                        {isSelected && <Check size={12} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Countries Scrollable List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1 divide-y divide-slate-50">
              {filteredCountries.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No countries found matching "{countrySearchQuery}"
                </div>
              ) : (
                filteredCountries.map((country) => {
                  const isSelected = searchState.selectedCountries.some(
                    (sc) => sc.code === country.code
                  );
                  return (
                    <div
                      key={country.code}
                      onClick={() => toggleCountry(country)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                        isSelected
                          ? "bg-blue-50/80 text-blue-900 font-semibold"
                          : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{country.flag}</span>
                        <div>
                          <p className="text-sm font-medium">{country.name}</p>
                          <p className="text-[11px] text-slate-400">
                            {country.region} • {country.code}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="text-xs text-slate-500 font-medium">
                Selected:{" "}
                <strong className="text-slate-800">
                  {searchState.selectedCountries.length} countries
                </strong>
              </div>
              <button
                onClick={() => setShowCountryModal(false)}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Apply Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Traveller Selection Popover Modal */}
      {showTravellerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            ref={travellerModalRef}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Select Number of Travellers
                </h3>
                <p className="text-xs text-slate-500">
                  Eligible age: 6 months to 70 years
                </p>
              </div>
              <button
                onClick={() => setShowTravellerModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Total Travellers
              </p>
              <div className="grid grid-cols-6 gap-2">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      setSearchState((prev) => ({
                        ...prev,
                        travellerCount: num,
                      }));
                    }}
                    className={`py-3 rounded-xl font-bold text-sm transition cursor-pointer border ${
                      searchState.travellerCount === num
                        ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/30"
                        : "bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/20"
                    }`}
                  >
                    {num === 6 ? "6+" : num}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-500 leading-relaxed bg-blue-50/60 border border-blue-100 p-3 rounded-xl">
                ℹ️ Each traveller is entitled to full individual sum insured
                benefits. Details for all travellers can be entered in the final
                checkout step.
              </p>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowTravellerModal(false)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
