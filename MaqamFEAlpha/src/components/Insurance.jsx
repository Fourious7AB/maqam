import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import anime from "animejs";
import { staggerEntrance, clickSquash } from "../animations/presets";
import {
  ShieldCheck,
  Shield,
  Clock,
  Wrench,
  Sparkles,
  Plane,
  HeartPulse,
  Luggage,
  PhoneCall,
  CheckCircle2,
  Lock,
} from "lucide-react";
import CommonHeader from "./CommonHeader";
import Footer from "./Footer";
import Heroimage1 from "../assets/heroimage.jpg";
import InsuranceSearchHero from "./insuranceplans/InsuranceSearchHero";
import InsurancePlanSelection from "./insuranceplans/InsurancePlanSelection";
import InsuranceTravellerCheckout from "./insuranceplans/InsuranceTravellerCheckout";
import {
  WORLDWIDE_COUNTRIES,
  INSURANCE_PLANS,
} from "../data/insuranceData";

export default function Insurance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const shieldIconRef = useRef(null);

  // Entrance animation & floating shield icon animation matching /food
  useEffect(() => {
    staggerEntrance(".insurance-banner-card", { stagger: 70, startDelay: 100 });
    if (shieldIconRef.current) {
      anime({
        targets: shieldIconRef.current,
        translateY: [-4, 4],
        duration: 1500,
        direction: "alternate",
        loop: true,
        easing: "easeInOutSine",
      });
    }
  }, []);

  // Auth state (Accessible for guests AND logged-in users)
  const authUser = useSelector((state) => state.auth?.user);
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  })();
  const user = authUser || storedUser;

  // Step state: "search" | "plans" | "checkout"
  const [currentStep, setCurrentStep] = useState(() => {
    const stepParam = searchParams.get("step");
    if (stepParam === "plans" || stepParam === "checkout") return stepParam;
    return "search";
  });

  // Calculate default dates
  const today = new Date();
  const defaultStartDate = new Date(today);
  defaultStartDate.setDate(today.getDate() + 1);
  const defaultEndDate = new Date(today);
  defaultEndDate.setDate(today.getDate() + 5);

  const formatIsoDate = (d) => d.toISOString().split("T")[0];

  // Core Search State matching MMT
  const [searchState, setSearchState] = useState({
    tripType: "single",
    selectedCountries: [
      WORLDWIDE_COUNTRIES.find((c) => c.code === "SAU") ||
        WORLDWIDE_COUNTRIES.find((c) => c.code === "THA") || {
          code: "SAU",
          name: "Saudi Arabia",
          flag: "🇸🇦",
          region: "Middle East",
        },
    ],
    startDate: formatIsoDate(defaultStartDate),
    endDate: formatIsoDate(defaultEndDate),
    travellerCount: 1,
    planType: "regular",
  });

  // Selected Insurance Plan (default to $50k recommended plan)
  const [selectedPlan, setSelectedPlan] = useState(
    () => INSURANCE_PLANS.find((p) => p.isRecommended) || INSURANCE_PLANS[0]
  );

  const handleStepChange = (newStep) => {
    setCurrentStep(newStep);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newStep === "search") {
        next.delete("step");
      } else {
        next.set("step", newStep);
      }
      return next;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleExplorePlans = () => {
    handleStepChange("plans");
  };

  const handleModifySearch = () => {
    handleStepChange("search");
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    handleStepChange("checkout");
  };

  const handleBackToPlans = () => {
    handleStepChange("plans");
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] dark:bg-[#070c18] font-poppins text-slate-900 dark:text-slate-100 transition-colors flex flex-col">
      <CommonHeader />

      <main className="pt-[72px] flex-1">
        {/* ── Hero Dark Overlay with Title matching /food ── */}
        <section className="relative w-full h-[380px] sm:h-[420px] overflow-hidden bg-emerald-950">
          <img
            src={Heroimage1}
            alt="Travel protection background"
            className="absolute inset-0 w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70 flex flex-col items-center justify-center text-center px-4 pt-10">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/90 text-white font-bold text-xs uppercase tracking-wider mb-3 shadow-md backdrop-blur-xs">
              <Wrench className="w-3.5 h-3.5" />
              Under Development
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-md">
              Pilgrim & Travel Medical Insurance
            </h1>
            <p className="text-xs sm:text-sm text-gray-200 mt-2 max-w-xl drop-shadow-xs">
              We are engineering a comprehensive, visa-compliant travel insurance and emergency medical protection plan for your journey to Saudi Arabia and worldwide.
            </p>
          </div>
        </section>

        {/* ── Under Development / Feature In Progress Floating Banner Card (Same as /food) ── */}
        <div className="relative z-40 -mt-24 mb-14 w-[95%] max-w-6xl mx-auto px-2 sm:px-4">
          <div className="w-full bg-white dark:bg-[#0f172a] rounded-3xl p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-gray-100 dark:border-slate-800 relative overflow-hidden">
            <div className="insurance-banner-card relative z-30 mb-6 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/70 to-teal-50/80 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 border border-amber-200/80 dark:border-slate-700 text-center shadow-xs">
              <div
                ref={shieldIconRef}
                className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-amber-500/20"
              >
                <ShieldCheck className="w-7 h-7" />
              </div>

              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100/90 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-300 font-extrabold text-xs tracking-wider uppercase mb-2">
                <Clock className="w-3.5 h-3.5" />
                Feature In Progress
              </span>

              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
                Travel & Pilgrim Insurance Service is Coming Soon!
              </h2>

              <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed mb-5">
                Online travel medical insurance and visa-compliant pilgrim cover are currently under active development. You will soon be able to compare plans, select coverage for medical emergencies, flight cancellations, and baggage loss, and receive instant policy issuance directly through Maqam.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/flight"
                  onClick={(e) => clickSquash(e.currentTarget)}
                  className="px-6 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition active:scale-95 cursor-pointer"
                >
                  Explore Flights
                </Link>
                <Link
                  to="/hotel-page"
                  onClick={(e) => clickSquash(e.currentTarget)}
                  className="px-6 py-2.5 rounded-full bg-white hover:bg-gray-50 text-teal-800 border border-teal-300 font-bold text-xs uppercase tracking-wider shadow-xs transition active:scale-95 cursor-pointer"
                >
                  Explore Hotels
                </Link>
                <Link
                  to="/visa-card"
                  onClick={(e) => clickSquash(e.currentTarget)}
                  className="px-6 py-2.5 rounded-full bg-white hover:bg-gray-50 text-amber-800 border border-amber-300 font-bold text-xs uppercase tracking-wider shadow-xs transition active:scale-95 cursor-pointer"
                >
                  Apply Visa
                </Link>
              </div>
            </div>

            {/* ── Background Preview Layout (Blurred and Protected against Accidental Checkout) ── */}
            <div className="opacity-60 pointer-events-none select-none filter blur-[0.3px] relative pb-6">
              {currentStep === "search" && (
                <InsuranceSearchHero
                  searchState={searchState}
                  setSearchState={setSearchState}
                  onExplorePlans={handleExplorePlans}
                />
              )}

              {currentStep === "plans" && (
                <InsurancePlanSelection
                  searchState={searchState}
                  setSearchState={setSearchState}
                  onModifySearch={handleModifySearch}
                  onSelectPlan={handleSelectPlan}
                />
              )}

              {currentStep === "checkout" && (
                <InsuranceTravellerCheckout
                  searchState={searchState}
                  setSearchState={setSearchState}
                  selectedPlan={selectedPlan}
                  onBackToPlans={handleBackToPlans}
                  user={user}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── Upcoming Insurance Feature Showcase (Matching /food) ── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-4">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Comprehensive Cover
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Upcoming Travel Insurance Benefits
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
              Designed to give you and your family full financial peace of mind during your spiritual journey.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                <HeartPulse className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1.5">
                Emergency Medical & Hospitalization
              </h4>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                Cashless outpatient & inpatient treatment across certified hospitals in Makkah, Madinah, and Jeddah.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4">
                <Plane className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1.5">
                Trip Delay & Flight Cancellation
              </h4>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                Full reimbursement for flight reschedules, missed connections, and unforeseen pilgrimage cancellations.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                <Luggage className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1.5">
                Baggage & Passport Loss Cover
              </h4>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                Compensation for misplaced baggage, essential item allowances, and emergency travel document support.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4">
                <PhoneCall className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1.5">
                24/7 Global Pilgrim Helpline
              </h4>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                Dedicated emergency helpline with multilingual coordinators to assist you at every step of your trip.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
