import React, { useMemo, useState, useEffect } from "react";
import { staggerEntrance, clickSquash } from "../../animations/presets";
import AnimatedNumber from "../shared/AnimatedNumber";
import {
  ShieldCheck,
  Shield,
  Zap,
  Award,
  MapPin,
  CalendarDays,
  Clock3,
  UserRound,
  UsersRound,
  Plus,
  Check,
  Crown,
  LockKeyhole,
  Star,
} from "lucide-react";

const insurancePlans = [
  {
    id: "basic",
    name: "Basic Plan",
    subtitle: "Essential coverage for your trip",
    price: 299,
    icon: Shield,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    features: [
      "Medical Expenses Coverage",
      "Trip Cancellation",
      "Lost Baggage Coverage",
    ],
  },
  {
    id: "standard",
    name: "Standard Plan",
    subtitle: "Enhanced protection for travelers",
    price: 499,
    icon: ShieldCheck,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    popular: true,
    features: [
      "Medical Expenses Coverage",
      "Trip Cancellation",
      "Lost Baggage Coverage",
      "Flight Delay Coverage",
    ],
  },
  {
    id: "premium",
    name: "Premium Plan",
    subtitle: "Comprehensive coverage for worry-free travel",
    price: 799,
    icon: Crown,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
    features: [
      "Medical Expenses Coverage",
      "Trip Cancellation",
      "Lost Baggage Coverage",
      "Flight Delay Coverage",
      "Personal Accident Cover",
    ],
  },
];

const destinations = [
  "India",
  "United Arab Emirates",
  "Saudi Arabia",
  "United Kingdom",
  "United States",
  "Europe",
  "Singapore",
  "Malaysia",
];

const getToday = () => {
  const date = new Date();
  return date.toISOString().split("T")[0];
};

const formatDate = (date) => {
  if (!date) return "";

  const [year, month, day] = date.split("-");

  return `${day}-${month}-${year}`;
};

const calculateDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  const difference = end.getTime() - start.getTime();

  if (difference < 0) return 0;

  return Math.floor(difference / (1000 * 60 * 60 * 24)) + 1;
};

const createTraveler = () => ({
  id: Date.now() + Math.random(),
  age: "",
});

export default function TravelInsurance() {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return tomorrow.toISOString().split("T")[0];
  });

  const [pax, setPax] = useState("1");

  const [travelers, setTravelers] = useState([
    {
      id: 1,
      age: "",
    },
  ]);

  const [selectedPlan, setSelectedPlan] = useState("standard");

  useEffect(() => {
    staggerEntrance(".insurance-plan-card", {
      stagger: 60,
      startDelay: 60,
    });
  }, []);

  const duration = useMemo(
    () => calculateDays(startDate, endDate),
    [startDate, endDate]
  );

  const updateTravelerAge = (id, value) => {
    // Allow only numbers
    if (!/^\d*$/.test(value)) return;

    // Limit age to 70
    if (Number(value) > 70) return;

    setTravelers((prev) =>
      prev.map((traveler) =>
        traveler.id === id
          ? {
              ...traveler,
              age: value,
            }
          : traveler
      )
    );
  };

  const addTraveler = () => {
    setTravelers((prev) => [...prev, createTraveler()]);
  };

  const handlePaxChange = (value) => {
    setPax(value);

    const count = Number(value);

    setTravelers((prev) => {
      if (count > prev.length) {
        const additionalTravelers = Array.from(
          { length: count - prev.length },
          () => createTraveler()
        );

        return [...prev, ...additionalTravelers];
      }

      return prev.slice(0, count);
    });
  };

  const resetForm = () => {
    setDestination("");
    setStartDate(getToday());

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    setEndDate(tomorrow.toISOString().split("T")[0]);
    setPax("1");

    setTravelers([
      {
        id: 1,
        age: "",
      },
    ]);

    setSelectedPlan("standard");
  };

  const handleGetQuote = () => {
    const data = {
      destination,
      startDate,
      endDate,
      duration,
      pax: Number(pax),
      travelers,
      plan: selectedPlan,
    };

    console.log("Insurance Quote:", data);

    alert("Quote request submitted successfully!");
  };

  return (
    <div className="w-full overflow-y-auto h-[75vh] scrollbar-hide">
      <div className="w-full  rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* =========================================================
            HEADER
        ========================================================== */}
        <div className="border-b border-slate-100 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            {/* Logo / Title */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600">
                  <ShieldCheck
                    size={20}
                    strokeWidth={2.5}
                    className="text-white"
                  />
                </div>
              </div>

              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-800 sm:text-xl">
                  Get Your Travel Insurance
                </h1>

                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                  Secure your journey with comprehensive protection
                </p>
              </div>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-6">
              <BenefitItem
                icon={<Shield size={16} />}
                title="Trusted Protection"
                description="24/7 worldwide support"
              />

              <BenefitItem
                icon={<Zap size={16} />}
                title="Quick & Easy"
                description="Takes less than 2 mins"
              />

              <BenefitItem
                icon={<Award size={16} />}
                title="Best Price Guarantee"
                description="Lowest prices assured"
              />
            </div>
          </div>
        </div>

        {/* =========================================================
            FORM CONTENT
        ========================================================== */}
        <div className="px-4 py-5 sm:px-6 lg:px-8">
          {/* =====================================================
              BASIC TRAVEL INFORMATION
          ====================================================== */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 5xl:grid-cols-5">
            {/* Destination */}
            <FormField label="Destination">
              <div className="relative">
                <MapPin
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="h-11 w-full appearance-none rounded-md border border-slate-300 bg-white pl-10 pr-9 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Select Destination</option>

                  {destinations.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <svg
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </FormField>

            {/* Start Date */}
            <FormField label="Travel Start Date">
              <div className="relative">
                <CalendarDays
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="date"
                  value={startDate}
                  min={getToday()}
                  onChange={(e) => {
                    const value = e.target.value;
                    setStartDate(value);

                    if (endDate && value > endDate) {
                      setEndDate(value);
                    }
                  }}
                  className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 pl-10 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <span className="mt-1 block text-[11px] text-slate-400">
                {formatDate(startDate)}
              </span>
            </FormField>

            {/* End Date */}
            <FormField label="Travel End Date">
              <div className="relative">
                <CalendarDays
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="date"
                  value={endDate}
                  min={startDate || getToday()}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 pl-10 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <span className="mt-1 block text-[11px] text-slate-400">
                {formatDate(endDate)}
              </span>
            </FormField>

            {/* Duration */}
            <FormField label="Day Duration">
              <div className="relative">
                <Clock3
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600"
                />

                <input
                  type="text"
                  value={duration || ""}
                  readOnly
                  placeholder="0"
                  className="h-11 w-full rounded-md border border-emerald-100 bg-emerald-50/50 pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none"
                />
              </div>
            </FormField>

            {/* Pax */}
            <FormField
              label={
                <span>
                  No. of Pax{" "}
                  <span className="text-[10px] font-medium text-amber-600">
                    (Min age: 6 Months - Max age 70 Yrs)
                  </span>
                </span>
              }
            >
              <div className="relative">
                <UserRound
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <select
                  value={pax}
                  onChange={(e) => handlePaxChange(e.target.value)}
                  className="h-11 w-full appearance-none rounded-md border border-slate-300 bg-white pl-10 pr-9 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  {Array.from({ length: 10 }, (_, index) => index + 1).map(
                    (number) => (
                      <option key={number} value={number}>
                        {number} {number === 1 ? "Pax" : "Pax"}
                      </option>
                    )
                  )}
                </select>

                <svg
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </FormField>
          </div>

          {/* =====================================================
              TRAVELLER DETAILS
          ====================================================== */}
          <section className="mt-5 rounded-xl border border-slate-200 bg-white">
            {/* Section Header */}
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                  <UsersRound
                    size={17}
                    className="text-emerald-600"
                  />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-slate-800">
                    Traveller Details
                  </h2>

                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Please enter the age of all travellers
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={addTraveler}
                className="inline-flex h-9 items-center justify-center gap-1.5 self-start rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 sm:self-auto"
              >
                <Plus size={14} />
                Add Traveller
              </button>
            </div>

            {/* Travellers */}
            <div className="p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {travelers.map((traveler, index) => (
                  <div key={traveler.id}>
                    <label className="mb-1 block text-[11px] font-medium text-slate-700">
                      Traveller {index + 1}
                    </label>

                    <label className="mb-1.5 block text-[10px] text-slate-500">
                      Age (Years)
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      value={traveler.age}
                      onChange={(e) =>
                        updateTravelerAge(
                          traveler.id,
                          e.target.value
                        )
                      }
                      placeholder="Enter age"
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                ))}

                {/* Add More */}
                <button
                  type="button"
                  onClick={addTraveler}
                  className="flex min-h-[72px] flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-slate-600 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600"
                >
                  <span className="mb-1 flex h-6 w-6 items-center justify-center rounded-full border border-emerald-500">
                    <Plus
                      size={14}
                      className="text-emerald-600"
                    />
                  </span>

                  <span className="text-[11px] font-semibold">
                    Add More
                  </span>
                </button>
              </div>
            </div>
          </section>

          {/* =====================================================
              COVERAGE PLANS
          ====================================================== */}
          <section className="mt-5">
            {/* Heading */}
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50">
                <ShieldCheck
                  size={17}
                  className="text-emerald-600"
                />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Coverage Plans
                </h2>

                <p className="text-[10px] text-slate-500">
                  Choose the plan that suits you best
                </p>
              </div>
            </div>

            {/* Plan Cards */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {insurancePlans.map((plan) => {
                const Icon = plan.icon;
                const isSelected = selectedPlan === plan.id;

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={(e) => {
                      clickSquash(e.currentTarget);
                      setSelectedPlan(plan.id);
                    }}
                    className={`insurance-plan-card relative text-left cursor-pointer active:scale-95 transition-transform ${
                      plan.popular ? "mt-2 lg:mt-0" : ""
                    }`}
                  >
                    {/* Popular badge */}
                    {plan.popular && (
                      <div className="absolute -top-2.5 left-5 z-10 rounded-full bg-emerald-600 px-3 py-1 text-[9px] font-bold text-white shadow-sm">
                        Most Popular
                      </div>
                    )}

                    <div
                      className={`h-full rounded-xl border p-4 transition-all ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50/20 shadow-sm"
                          : "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-lg ${plan.iconBg}`}
                          >
                            <Icon
                              size={18}
                              className={plan.iconColor}
                            />
                          </div>

                          <div>
                            <h3 className="text-xs font-bold text-slate-800">
                              {plan.name}
                            </h3>

                            <p className="mt-0.5 text-[10px] text-slate-500">
                              {plan.subtitle}
                            </p>
                          </div>
                        </div>

                        {/* Radio */}
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            isSelected
                              ? "border-emerald-500"
                              : "border-slate-300"
                          }`}
                        >
                          {isSelected && (
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          )}
                        </span>
                      </div>

                      {/* Price */}
                      <div className="mt-3">
                        <span className="text-base font-bold text-slate-800">
                          <AnimatedNumber value={plan.price} prefix="₹" />
                        </span>

                        <span className="ml-1 text-[9px] text-slate-500">
                          /Traveller
                        </span>
                      </div>

                      {/* Features */}
                      <div className="mt-3 space-y-1.5">
                        {plan.features.map((feature) => (
                          <div
                            key={feature}
                            className="flex items-start gap-2"
                          >
                            <Check
                              size={13}
                              strokeWidth={2.5}
                              className="mt-0.5 shrink-0 text-emerald-600"
                            />

                            <span className="text-[10px] font-medium text-slate-700">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* =====================================================
              TRUST BANNER
          ====================================================== */}
          <div className="mt-4 flex flex-col gap-4 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Left */}
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                <ShieldCheck
                  size={17}
                  className="text-emerald-600"
                />
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-800">
                  Secure Your Trip with Confidence
                </h3>

                <p className="mt-0.5 text-[10px] text-slate-500">
                  Our policies are designed to provide you with
                  the best protection and peace of mind.
                </p>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-600">
                Trusted by 10,000+ Travelers
              </span>

              {/* Avatars */}
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div
                    key={item}
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[9px] font-bold text-slate-600"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1 whitespace-nowrap">
                <span className="text-xs font-bold text-emerald-600">
                  4.8
                </span>

                <Star
                  size={12}
                  fill="currentColor"
                  className="text-amber-400"
                />

                <span className="text-[10px] text-slate-500">
                  Rating
                </span>
              </div>
            </div>
          </div>

          {/* =====================================================
              FOOTER ACTIONS
          ====================================================== */}
          <div className="mt-4 flex flex-col-reverse gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Security */}
            <div className="flex items-center gap-2">
              <LockKeyhole
                size={16}
                className="text-slate-500"
              />

              <span className="text-[10px] text-slate-500 sm:text-xs">
                Your information is 100% secure and encrypted
              </span>
            </div>

            {/* Buttons */}
            <div className="flex w-full gap-2 sm:w-auto">
              <button
                type="button"
                onClick={resetForm}
                className="h-10 flex-1 rounded-md border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:flex-none"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={handleGetQuote}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-emerald-600 px-6 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] sm:min-w-[180px] sm:flex-none"
              >
                <ShieldCheck size={15} />
                Get Quote
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===============================================================
   REUSABLE FORM FIELD
================================================================ */
function FormField({ label, children }) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block min-h-[16px] text-[11px] font-semibold text-slate-700">
        {label}
      </label>

      {children}
    </div>
  );
}

/* ===============================================================
   BENEFIT ITEM
================================================================ */
function BenefitItem({ icon, title, description }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600">
        {icon}
      </div>

      <div>
        <p className="text-[10px] font-bold text-slate-700">
          {title}
        </p>

        <p className="mt-0.5 text-[9px] text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}