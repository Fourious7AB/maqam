import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  Luggage,
  ShieldCheck,
  Plane,
  AlertTriangle,
  FileText,
  Smartphone,
  ChevronRight,
  ChevronLeft,
  Info,
  Droplets,
  BatteryCharging,
} from "lucide-react";
import step1Img from "../../assets/boarding-guide/step1-saudi-visa-passport.jpg";
import step2Img from "../../assets/boarding-guide/step2-jeddah-terminal-arrival.jpg";
import step3Img from "../../assets/boarding-guide/step3-saudi-immigration-check.jpg";
import step4Img from "../../assets/boarding-guide/step4-saudia-aircraft-boarding.jpg";

const BOARDING_STEPS = [
  {
    step: "01",
    tag: "Pre-Departure (24–48h Prior)",
    title: "Web Check-In & Saudi Visa",
    image: step1Img,
    alt: "Official Saudi Passport, Umrah visa documents, and digital boarding pass",
    summary:
      "Avoid long airport queues by completing online check-in in advance through the airline website or mobile app.",
    tips: [
      "Confirm passport validity (minimum 6 months required for entry into Saudi Arabia).",
      "Ensure your electronic Saudi Tourist / Umrah Visa matches your passport details exactly.",
      "Save the digital boarding pass (with QR code) on your smartphone and carry a printed backup copy.",
      "Select your preferred seats and request Halal pilgrimage meals in advance.",
    ],
  },
  {
    step: "02",
    tag: "Airport Arrival (3–4h Prior)",
    title: "Terminal Arrival & Bag Drop",
    image: step2Img,
    alt: "King Abdulaziz International Airport Terminal 1 arrival concourse in Jeddah",
    summary:
      "Arrive early at the departure terminal to complete luggage tagging, Ihram readiness, and airline counter verification.",
    tips: [
      "Arrive at least 3.5 to 4 hours prior for international flights bound for Jeddah or Madinah.",
      "Use self-service kiosk machines to print your luggage tags or proceed to the airline bag-drop counter.",
      "Check baggage allowances (typically 20–30 kg checked luggage and 7 kg cabin baggage).",
      "Attach durable luggage tags with your full name, contact number, and destination address in Makkah/Madinah.",
    ],
  },
  {
    step: "03",
    tag: "Clearing Controls (2h Prior)",
    title: "Security & Immigration Clearance",
    image: step3Img,
    alt: "Immigration control and security checkpoint at Saudi International Airport",
    summary:
      "Pass through security inspection, metal detectors, and international passport control smoothly.",
    tips: [
      "Keep your original passport, visa copy, and boarding pass readily accessible in hand.",
      "Place laptops, power banks, and electronics in separate scanning trays at security checkpoints.",
      "Liquid rules: containers must not exceed 100ml each and must fit inside a clear 1-litre resealable bag.",
      "Proceed through biometric e-gates or officer counters for exit stamp clearance.",
    ],
  },
  {
    step: "04",
    tag: "Boarding Gate (45–60m Prior)",
    title: "Gate Arrival & Aircraft Boarding",
    image: step4Img,
    alt: "Saudia aircraft boarding at King Abdulaziz International Airport in Jeddah",
    summary:
      "Arrive at your assigned departure gate well before boarding commences and board according to your seat zone.",
    tips: [
      "Monitor terminal Flight Information Display Systems (FIDS) frequently for gate changes.",
      "Boarding gates open 45 minutes prior and strictly close 20 minutes before departure.",
      "Listen for boarding calls by designated seating zones (e.g., Zone 1, Zone 2, Families).",
      "Present your boarding pass and passport to the gate attendants before entering the jet bridge.",
    ],
  },
];

const ESSENTIAL_TIPS = [
  {
    icon: Droplets,
    badge: "Pilgrimage Standard",
    title: "Zamzam Water Rules",
    description:
      "On return flights from Jeddah (JED) or Madinah (MED), most certified airlines permit one complimentary 5-litre factory-sealed Zamzam water container per pilgrim as checked baggage. Note that unsealed bottles inside regular bags are strictly confiscated.",
  },
  {
    icon: BatteryCharging,
    badge: "Safety Regulation",
    title: "Batteries & Power Banks",
    description:
      "Spare lithium batteries, power banks, and e-cigarettes must ALWAYS be packed in your cabin carry-on luggage. They are strictly prohibited in checked luggage due to aviation fire safety regulations.",
  },
  {
    icon: Luggage,
    badge: "Carry-On Limits",
    title: "Cabin Bag Dimensions",
    description:
      "Cabin baggage is usually restricted to 1 piece (up to 7 kg) plus 1 personal item (laptop bag or lady's purse). Keep your critical travel documents, daily medicines, and Ihram/valuables inside this bag.",
  },
];

const FlightBoardingGuide = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Automatic Step Cycling (every 4.5 seconds)
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % BOARDING_STEPS.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [isPaused, activeStep]);

  const handlePrev = () => {
    setActiveStep((prev) => (prev === 0 ? BOARDING_STEPS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveStep((prev) => (prev + 1) % BOARDING_STEPS.length);
  };

  return (
    <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-10 xl:px-12 font-poppins bg-[#f8fafc] dark:bg-[#070d19] border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-300">
      <div className="w-full max-w-[1760px] mx-auto">
        {/* Section Header */}
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            How to Complete Your Flight Boarding:{" "}
            <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Step-by-Step
            </span>
          </h2>

          <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Ensure a smooth journey to Saudi Arabia and international destinations. Follow these 4 standard procedures for seamless airport clearance and flight boarding.
          </p>

        </div>

        {/* 4-Step Grid with Downloaded Imagery */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {BOARDING_STEPS.map((item, index) => {
            const isSelected = activeStep === index;
            return (
              <div
                key={item.step}
                onClick={() => setActiveStep(index)}
                className={`group relative rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border transition-all duration-300 flex flex-col justify-between shadow-xs hover:shadow-xl cursor-pointer ${
                  isSelected
                    ? "border-teal-500 ring-2 ring-teal-500/25 dark:border-teal-400 scale-[1.01]"
                    : "border-slate-200/80 dark:border-slate-800 hover:border-teal-400/60"
                }`}
              >
                {/* Step Image */}
                <div className="relative h-48 sm:h-52 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                  <img
                    src={item.image}
                    alt={item.alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                  {/* Step Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span
                      className={`flex items-center justify-center w-7 h-7 rounded-xl text-white font-extrabold text-xs shadow-md transition-colors ${
                        isSelected ? "bg-emerald-600 ring-2 ring-white/50" : "bg-teal-600"
                      }`}
                    >
                      {item.step}
                    </span>
                  </div>

                  {/* Timing tag */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-300 drop-shadow">
                      <Clock size={12} />
                      {item.tag}
                    </span>
                    <h3 className="text-base font-extrabold text-white leading-tight drop-shadow-md mt-0.5">
                      {item.title}
                    </h3>
                  </div>
                </div>

                {/* Step Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                    {item.summary}
                  </p>

                  <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    {item.tips.slice(0, 2).map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Step Detailed Walkthrough Box (with Manual Previous/Next & Pause on Hover) */}
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-white via-slate-50 to-white dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-900 border border-teal-500/30 dark:border-teal-500/20 shadow-md mb-14 transition-all duration-300"
        >
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            {/* Left Preview Image with smooth key transition */}
            <div className="w-full lg:w-5/12 h-64 sm:h-80 rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 shrink-0 relative">
              <img
                key={`preview-${activeStep}`}
                src={BOARDING_STEPS[activeStep].image}
                alt={BOARDING_STEPS[activeStep].alt}
                className="w-full h-full object-cover transition-opacity duration-500 animate-fadeIn"
              />
            </div>

            {/* Right Instructions */}
            <div className="w-full lg:w-7/12">
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-[#045C45] dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/70">
                  <Clock size={12} className="text-[#045C45] dark:text-emerald-400" />
                  <span>{BOARDING_STEPS[activeStep].tag}</span>
                </div>

                {/* Navigation arrows for manual control */}
                <div className="hidden sm:flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Previous step"
                    className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Next step"
                    className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {BOARDING_STEPS[activeStep].title}
              </h3>

              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {BOARDING_STEPS[activeStep].summary}
              </p>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BOARDING_STEPS[activeStep].tips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60"
                  >
                    <CheckCircle2 size={16} className="text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug">
                      {tip}
                    </span>
                  </div>
                ))}
              </div>

              {/* Indicator dots */}
              <div className="mt-5 flex items-center gap-1.5">
                {BOARDING_STEPS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveStep(i)}
                    aria-label={`Jump to step ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      activeStep === i
                        ? "w-8 bg-teal-600 dark:bg-teal-400 shadow-sm"
                        : "w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Essential Travel & Regulations Highlight Cards */}
        <div className="mt-8">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#045C45] dark:text-emerald-400 flex items-center justify-center border border-emerald-200/70 dark:border-emerald-800/60 shrink-0">
                <ShieldCheck size={18} />
              </div>
              <span>Important Regulations for Domestic &amp; International Travelers</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ESSENTIAL_TIPS.map((tip, idx) => {
              const Icon = tip.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 shadow-xs hover:shadow-md hover:border-emerald-500/50 dark:hover:border-emerald-500/40 transition-all duration-300 group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/60 text-[#045C45] dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 group-hover:bg-[#045C45] group-hover:text-white dark:group-hover:bg-emerald-600 transition-colors duration-300 shrink-0 shadow-2xs">
                        <Icon size={22} />
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
                        {tip.badge}
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-[#045C45] dark:group-hover:text-emerald-400 transition-colors mb-2">
                      {tip.title}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                      {tip.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlightBoardingGuide;
