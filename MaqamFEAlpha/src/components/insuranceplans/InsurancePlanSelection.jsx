import React, { useState } from "react";
import {
  Shield,
  Heart,
  Plane,
  Briefcase,
  Stethoscope,
  Info,
  Check,
  Star,
  ChevronRight,
  X,
  CreditCard,
  Zap,
  FileCheck,
  Clock,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import {
  INSURANCE_PLANS,
  PLAN_COMPARISON_FIELDS,
  formatDisplayDate,
} from "../../data/insuranceData";

export default function InsurancePlanSelection({
  searchState,
  setSearchState,
  onModifySearch,
  onSelectPlan,
}) {
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [activeBenefitPlan, setActiveBenefitPlan] = useState(null);

  const startFormatted = formatDisplayDate(searchState.startDate);
  const endFormatted = formatDisplayDate(searchState.endDate);
  const countriesText =
    searchState.selectedCountries.map((c) => c.name).join(", ") || "Thailand";

  // Calculate pricing adjusted for number of travellers
  const travellersCount = searchState.travellerCount || 1;

  return (
    <div className="w-full bg-[#f4f7fb] min-h-screen pb-20">
      {/* Top Search Summary Bar (Screenshot 2) */}
      <div className="sticky top-16 z-30 bg-white border-b border-slate-200 shadow-2xs py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6 sm:gap-10 text-xs">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                COUNTRY/REGION
              </span>
              <span className="font-extrabold text-slate-800 text-sm">
                {countriesText}
              </span>
            </div>

            <div className="hidden xs:block h-6 w-px bg-slate-200" />

            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                START DATE
              </span>
              <span className="font-extrabold text-slate-800 text-sm">
                {startFormatted?.fullMonthFormat || searchState.startDate}
              </span>
            </div>

            <div className="hidden xs:block h-6 w-px bg-slate-200" />

            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                END DATE
              </span>
              <span className="font-extrabold text-slate-800 text-sm">
                {endFormatted?.fullMonthFormat || searchState.endDate}
              </span>
            </div>

            <div className="hidden xs:block h-6 w-px bg-slate-200" />

            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                NO. OF TRAVELLERS
              </span>
              <span className="font-extrabold text-slate-800 text-sm">
                {String(travellersCount).padStart(2, "0")}
              </span>
            </div>
          </div>

          {/* MODIFY SEARCH Button */}
          <button
            type="button"
            onClick={onModifySearch}
            className="px-5 py-2 rounded-xl bg-[#008cff] hover:bg-[#0073d8] active:scale-95 text-white text-xs font-black uppercase tracking-wider shadow-sm transition cursor-pointer"
          >
            MODIFY SEARCH
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* White Card Container wrapping the plans */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-8">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
            {/* Left: Heading & Insurance Icon */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs border border-blue-100">
                <Shield size={24} className="text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Choose Your Plan
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Pick your ideal travel insurance plan
                </p>
              </div>
            </div>

            {/* Right: Trip Mode Radio & Comparison Link */}
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="planTripType"
                    checked={searchState.tripType === "single"}
                    onChange={() =>
                      setSearchState((prev) => ({ ...prev, tripType: "single" }))
                    }
                    className="w-4 h-4 text-blue-600 accent-blue-600"
                  />
                  <span>Single Trip</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-500 hover:text-slate-800">
                  <input
                    type="radio"
                    name="planTripType"
                    checked={searchState.tripType === "multi"}
                    onChange={() =>
                      setSearchState((prev) => ({ ...prev, tripType: "multi" }))
                    }
                    className="w-4 h-4 text-blue-600 accent-blue-600"
                  />
                  <span>Annual Multi Trip</span>
                  <span className="text-blue-600 font-bold ml-1">
                    Save upto 60% ⓘ
                  </span>
                </label>
              </div>

              <button
                type="button"
                onClick={() => setShowComparisonModal(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition cursor-pointer"
              >
                <span>Show Detailed Comparison</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* 4 Plan Cards in a Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-8">
            {INSURANCE_PLANS.map((plan) => {
              const isRecommended = plan.isRecommended;
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl flex flex-col justify-between transition-all duration-200 ${
                    isRecommended
                      ? "border-2 border-blue-500 bg-white shadow-xl shadow-blue-500/10"
                      : "border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                  }`}
                >
                  {/* RECOMMENDED badge if applicable */}
                  {isRecommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#008cff] text-white text-[10px] font-black uppercase tracking-widest px-4 py-0.5 rounded-full shadow-sm">
                      RECOMMENDED
                    </div>
                  )}

                  {/* Card Content Top */}
                  <div className="p-6">
                    {/* Plan Title */}
                    <h3 className="text-base font-black text-slate-900 leading-snug">
                      {plan.title}
                    </h3>

                    {/* Price Block */}
                    <div className="mt-4 pb-4 border-b border-slate-100">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs text-slate-400 line-through">
                          ₹{plan.originalPrice}
                        </span>
                        <span className="text-2xl font-black text-slate-900">
                          ₹{plan.discountedPrice}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          /person
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-emerald-600">
                        Save ₹{plan.saveAmount}
                      </p>
                    </div>

                    {/* Key Highlights */}
                    <div className="mt-5 space-y-3">
                      {plan.highlights.map((h, i) => (
                        <div
                          key={i}
                          className="flex items-start justify-between text-xs gap-2"
                        >
                          <div className="flex items-center gap-2 text-slate-600">
                            {h.icon === "heart" && (
                              <Heart size={14} className="text-rose-500 fill-rose-100" />
                            )}
                            {h.icon === "plane" && (
                              <Plane size={14} className="text-blue-500" />
                            )}
                            {h.icon === "baggage" && (
                              <Briefcase size={14} className="text-amber-500" />
                            )}
                            {h.icon === "stethoscope" && (
                              <Stethoscope size={14} className="text-teal-500" />
                            )}
                            <span>{h.label}</span>
                          </div>
                          <span className="font-extrabold text-slate-800 text-right">
                            {h.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Clickable X more benefits link */}
                    <div className="mt-4 pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveBenefitPlan(plan)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>{plan.totalBenefitsCount} more benefits</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Bottom: BUY NOW Button + Footer Note */}
                  <div className="p-6 pt-0 space-y-3">
                    <button
                      type="button"
                      onClick={() => onSelectPlan(plan)}
                      className="w-full py-3 rounded-xl bg-[#008cff] hover:bg-[#0073d8] active:scale-95 text-white font-black text-xs uppercase tracking-wider transition shadow-md shadow-blue-500/20 cursor-pointer"
                    >
                      BUY NOW
                    </button>

                    {/* Optional Footer callout (for recommended card) */}
                    {plan.footerNote && (
                      <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl p-2.5 text-[11px] font-semibold text-amber-900 flex items-start gap-1.5 leading-tight">
                        <Star size={13} className="text-amber-500 shrink-0 fill-amber-400 mt-0.5" />
                        <span>{plan.footerNote}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Why Makemytrip / GoMaqam? Trust Section (Screenshot 2 bottom) */}
        <div className="mt-14">
          <h2 className="text-2xl font-black text-slate-900 text-left">
            Why GoMaqam?
          </h2>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex items-start gap-4 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CreditCard size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  Cashless Claims
                </h4>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Direct hospital settlement across 10,000+ accredited international healthcare networks.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex items-start gap-4 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Zap size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  Instant Policy
                </h4>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Immediate E-policy delivery to your WhatsApp and email right after purchase.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex items-start gap-4 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <FileCheck size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  No KYC
                </h4>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Quick purchase without tedious paperwork or physical documentation uploads.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Plan Comparison Modal */}
      {showComparisonModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Detailed Plan Comparison
                </h3>
                <p className="text-xs text-slate-500">
                  Compare coverages, deductibles and claim allowances across all available plans
                </p>
              </div>
              <button
                onClick={() => setShowComparisonModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 w-1/3">
                      Benefits & Features
                    </th>
                    {INSURANCE_PLANS.map((p) => (
                      <th
                        key={p.id}
                        className={`py-3 px-4 text-xs font-black uppercase text-center ${
                          p.isRecommended
                            ? "bg-blue-50 text-blue-700 rounded-t-xl"
                            : "text-slate-800"
                        }`}
                      >
                        {p.title}
                        <span className="block text-sm text-slate-900 font-black mt-1">
                          ₹{p.discountedPrice}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {PLAN_COMPARISON_FIELDS.map((field) => (
                    <tr key={field.key} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {field.label}
                      </td>
                      {INSURANCE_PLANS.map((p) => {
                        const val = p.details[field.key] || p[field.key] || "—";
                        return (
                          <td
                            key={p.id}
                            className={`py-3 px-4 text-center font-bold ${
                              p.isRecommended
                                ? "bg-blue-50/40 text-blue-900"
                                : "text-slate-700"
                            }`}
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
              <button
                onClick={() => setShowComparisonModal(false)}
                className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Plan Benefits Modal */}
      {activeBenefitPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {activeBenefitPlan.title} Coverages
                </h3>
                <p className="text-xs text-slate-500">
                  Sum Insured: {activeBenefitPlan.sumInsured}
                </p>
              </div>
              <button
                onClick={() => setActiveBenefitPlan(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-4 max-h-[60vh] overflow-y-auto space-y-2.5 divide-y divide-slate-100 text-xs">
              {Object.entries(activeBenefitPlan.details).map(([key, val]) => (
                <div key={key} className="pt-2 flex items-center justify-between">
                  <span className="text-slate-600 font-medium capitalize">
                    {key.replace(/([A-Z])/g, " $1")}
                  </span>
                  <span className="font-extrabold text-slate-900">{val}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400">Payable:</span>
                <span className="ml-1 text-lg font-black text-slate-900">
                  ₹{activeBenefitPlan.discountedPrice}
                </span>
              </div>
              <button
                onClick={() => {
                  onSelectPlan(activeBenefitPlan);
                  setActiveBenefitPlan(null);
                }}
                className="px-6 py-2.5 rounded-xl bg-[#008cff] hover:bg-[#0073d8] text-white text-xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer"
              >
                Choose this Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
