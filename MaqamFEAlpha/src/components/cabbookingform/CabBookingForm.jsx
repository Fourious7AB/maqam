import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import CommonHeader from "../CommonHeader";
import Footer from "../../components/Footer";
import anime from "animejs";
import { staggerEntrance, clickSquash } from "../../animations/presets";
import {
  CalendarDays,
  MapPin,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  Car,
  Clock,
  Sparkles,
  ShieldCheck,
  Wrench,
  Navigation,
  Compass,
  CheckCircle2,
} from "lucide-react";

import Heroimage1 from "../../assets/heroimage.jpg";
import Heroimage2 from "../../assets/hero-slider/slide2-madinah-prophet-mosque.jpg";
import Heroimage3 from "../../assets/hero-slider/slide3-madinah-green-dome.jpg";

const travellingWay = ["One Way", "Round Trip", "Multi City"];
const fareTypes = [
  "Regular Fare",
  "Student Fare",
  "Armed Force",
  "Senior Citizen",
];

const heroSlides = [
  { src: Heroimage1, alt: "Maqam hero background" },
  { src: Heroimage2, alt: "Maqam hero background 2" },
  { src: Heroimage3, alt: "Maqam hero background 3" },
  { src: Heroimage2, alt: "Maqam hero background 4" },
  { src: Heroimage1, alt: "Maqam hero background 5" },
];

const CabBookingForm = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("activeTab") || "One Way";
  });
  const [tripType, setTripType] = useState("oneway");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const carIconRef = useRef(null);

  useEffect(() => {
    staggerEntrance(".cab-banner-card", { stagger: 70, startDelay: 100 });
    if (carIconRef.current) {
      anime({
        targets: carIconRef.current,
        translateY: [-4, 4],
        duration: 1500,
        direction: "alternate",
        loop: true,
        easing: "easeInOutSine",
      });
    }
  }, []);

  const tripTypes = [
    { value: "oneway", label: "OneWay" },
    { value: "roundtrip", label: "Round Trip" },
    { value: "local", label: "Local" },
  ];

  useEffect(() => {
    if (isHovered) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) =>
        prev === heroSlides.length - 1 ? 0 : prev + 1,
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [isHovered]);

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem("activeTab", activeTab);
    }
  }, [activeTab]);

  return (
    <div className="w-full bg-white dark:bg-[#070c18] font-poppins transition-colors">
      <CommonHeader />

      {/* ── BG slides (fullscreen) ── */}
      <div
        className="relative w-full h-[460px] sm:h-[500px] overflow-hidden"
        style={{
          borderBottomLeftRadius: "50% 18%",
          borderBottomRightRadius: "50% 18%",
        }}
      >
        {/* Hero Slides */}
        <div
          className="flex h-full transition-transform duration-1000 ease-in-out"
          style={{
            transform: `translateX(-${currentSlide * 100}%)`,
          }}
        >
          {heroSlides.map((slide, i) => (
            <img
              key={i}
              src={slide.src}
              alt={slide.alt}
              className="w-full h-full object-cover shrink-0"
            />
          ))}
        </div>

        {/* Hero Dark Overlay with Title */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60 flex flex-col items-center justify-center text-center px-4 pt-12">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/90 text-white font-bold text-xs uppercase tracking-wider mb-3 shadow-md backdrop-blur-xs">
            <Wrench className="w-3.5 h-3.5" />
            Under Development
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-md">
            Cab & Transfer Booking
          </h1>
          <p className="text-xs sm:text-sm text-gray-200 mt-2 max-w-xl drop-shadow-xs">
            We are engineering a fast, reliable, and premium chauffeur and cab booking experience for your city and airport travels.
          </p>
        </div>
      </div>

      <div className="relative z-40 -mt-24 mb-16 w-[95%] max-w-5xl mx-auto px-2 sm:px-4">
        <div className="w-full bg-white dark:bg-[#0f172a] rounded-3xl p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-gray-100 dark:border-slate-800 relative overflow-hidden">
          
          {/* Under Development Overlay / Banner Card */}
          <div className="cab-banner-card relative z-30 mb-6 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/70 to-teal-50/80 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 border border-amber-200/80 dark:border-slate-700 text-center shadow-xs">
            <div ref={carIconRef} className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-amber-500/20">
              <Car className="w-7 h-7" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100/90 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-300 font-extrabold text-xs tracking-wider uppercase mb-2">
              <Clock className="w-3.5 h-3.5" />
              Feature In Progress
            </span>

            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
              Cab Booking Service is Coming Soon!
            </h2>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed mb-5">
              Online cab and chauffeur booking is currently under active development. You will soon be able to book local taxis, airport pickups, and intercity rides directly from Maqam.
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

          {/* Original Form Layout (Kept for preview & when feature launches) */}
          <div className="opacity-60 pointer-events-none select-none filter blur-[0.3px]">
            <div className="w-full mx-auto flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
              {/* Left Side: travellingWay selection */}
              <div className="flex justify-center lg:justify-start">
                <div className="inline-flex flex-wrap gap-1 bg-gray-100 p-1 rounded-full border border-gray-200/50">
                  {travellingWay?.map((way, index) => (
                    <div
                      key={index}
                      onClick={() => setActiveTab(way)}
                      className={`px-5 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all duration-300 whitespace-nowrap ${
                        activeTab === way
                          ? "bg-teal-600 text-white shadow-sm"
                          : "bg-transparent text-gray-600 hover:bg-gray-200/60"
                      }`}
                    >
                      {way}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side Info */}
              <div className="text-center lg:text-right">
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-widest bg-teal-50 px-3 py-1.5 rounded-full">
                  Book Local & Outstation Cabs
                </span>
              </div>
            </div>

          {/* one way, round trip, */}
          {(activeTab === "Round Trip" || activeTab === "One Way") && (
            <div className="relative z-30 w-full mx-auto mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-0 border border-gray-100 rounded-2xl w-full mx-auto bg-white overflow-hidden shadow-sm divide-y lg:divide-y-0 lg:divide-x divide-gray-100 my-4">
                {/* From */}
                <div
                  onClick={() => {
                    setFromSuggestions(dummySuggestions);
                    setShowFromSuggestions(true);
                  }}
                  className="relative p-4 cursor-pointer hover:bg-teal-50/15 group transition duration-300 flex flex-col justify-between"
                >
                  <p className="text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    From
                  </p>
                  <input
                    type="text"
                    // value={fromQuery}
                    value={""}
                    onFocus={() => {
                      setFromSuggestions(dummySuggestions);
                      setShowFromSuggestions(true);
                      setToSuggestions([]);
                    }}
                    // onChange={handleFromChange}
                    placeholder="Enter city or airport"
                    className="w-full text-lg font-extrabold text-gray-900 outline-none bg-transparent focus:text-teal-700 transition"
                  />
                  <p className="text-xs text-gray-400 mt-1 font-medium truncate group-hover:text-teal-600 transition">
                    {/* {selectedFrom?.airport || "Search Airport"} */}
                  </p>
                </div>

                {/* <DeparturePlace
                fromSuggestions={fromSuggestions}
                showFromSuggestions={showFromSuggestions}
                setFromQuery={setFromQuery}
                formatSuggestion={formatSuggestion}
                selectedFrom={selectedFrom}
                setSelectedFrom={setSelectedFrom}
                setFromSuggestions={setFromSuggestions}
                setShowFromSuggestions={setShowFromSuggestions}
                setIsDisabled={setIsDisabled}
              /> */}

                {/* To */}
                <div
                  onClick={() => {
                    setToSuggestions(dummySuggestions);
                    setShowToSuggestions(true);
                  }}
                  className="p-4 border-t md:border-t-0 md:border-l border-gray-100 cursor-pointer hover:bg-teal-50/15 group transition duration-300 flex flex-col justify-between"
                >
                  <p className="text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    To
                  </p>
                  <input
                    type="text"
                    // value={toQuery}
                    value={""}
                    onFocus={() => {
                      setToSuggestions(dummySuggestions);
                      setShowToSuggestions(true);
                      setFromSuggestions([]);
                    }}
                    // onChange={handleToChange}
                    placeholder="Enter city or airport"
                    className="w-full box-border px-3 text-lg font-extrabold text-gray-900 outline-none bg-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1 font-medium truncate group-hover:text-teal-600 transition">
                    {/* {selectedTo?.airport || "Search Airport"} */}
                  </p>
                </div>

                {/* <ArrivalPlace
                toSuggestions={toSuggestions}
                showToSuggestions={showToSuggestions}
                setToQuery={setToQuery}
                formatSuggestion={formatSuggestion}
                selectedTo={selectedTo}
                setToSuggestions={setToSuggestions}
                setSelectedTo={setSelectedTo}
                setShowToSuggestions={setShowToSuggestions}
                setIsDisabled={setIsDisabled}
              /> */}

                {/* Departure */}
                <div className="p-4 border-t md:border-t-0 md:border-l border-gray-100 cursor-pointer hover:bg-teal-50/15 group transition duration-300 flex flex-col justify-between relative z-30">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-bold text-teal-700 uppercase tracking-widest">
                      Departure
                    </p>
                    <ChevronDown className="w-3.5 h-3.5 text-teal-600 transition-transform group-hover:translate-y-0.5" />
                  </div>

                  <DatePicker
                    selected={startDate}
                    onChange={(date) => setStartDate(date)}
                    dateFormat="d MMM''yy"
                    minDate={new Date()}
                    wrapperClassName="w-full"
                    popperClassName="z-[9999]"
                    className="w-full text-lg font-extrabold text-gray-900 outline-none bg-transparent cursor-pointer focus:text-teal-700 transition"
                  />

                  <p className="text-xs text-gray-400 mt-1 font-medium truncate group-hover:text-teal-600 transition">
                    {startDate
                      ? startDate.toLocaleDateString("en-US", {
                          weekday: "long",
                        })
                      : ""}
                  </p>
                </div>

                {/* Return */}
                <div className="p-4 border-t md:border-t-0 md:border-l border-gray-100 cursor-pointer hover:bg-teal-50/15 group transition duration-300 flex flex-col justify-between relative z-30">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-bold text-teal-700 uppercase tracking-widest">
                      Return
                    </p>
                    <ChevronDown className="w-3.5 h-3.5 text-teal-600 transition-transform group-hover:translate-y-0.5" />
                  </div>
                  <DatePicker
                    selected={endDate}
                    onChange={(date) => setEndDate(date)}
                    minDate={startDate || new Date()}
                    dateFormat="d MMM''yy"
                    wrapperClassName="w-full"
                    popperClassName="z-[9999]"
                    className={`w-full text-sm font-extrabold text-gray-900 outline-none bg-transparent cursor-pointer focus:text-teal-700 transition ${activeTab === "One Way" ? "opacity-50 pointer-events-none" : ""}`}
                  />

                  <p className="text-xs text-gray-400 mt-1 font-medium truncate group-hover:text-teal-600 transition">
                    {endDate
                      ? endDate.toLocaleDateString("en-US", {
                          weekday: "long",
                        })
                      : ""}
                  </p>
                </div>

                {/* Travellers & Class */}
                {/* <TravellerClass
                travellers={travellers}
                setTravellers={setTravellers}
                setSelectedClass={setSelectedClass}
                selectedClass={selectedClass}
                isDisabled={isDisabled}
                setIsDisabled={setIsDisabled}
              /> */}
              </div>
              {/* Swap Button */}
              <button
                // onClick={handleSwapLocations}
                title="Swap Departure & Arrival"
                className="
                      hidden 
                      lg:flex
                      absolute
                      left-[20%]
                      top-12
                      -translate-x-1/2
                      -translate-y-1/2
                      w-10
                      h-10
                      rounded-full
                      bg-white
                      border
                      border-gray-100
                      text-teal-700
                      hover:bg-teal-600
                      hover:text-white
                      items-center
                      justify-center
                      shadow-md
                      z-30
                      cursor-pointer
                      transition-all
                      duration-500
                      hover:rotate-180
                      active:scale-95
                    "
              >
                <div className="flex flex-col -space-y-1">
                  <ArrowLeft size={14} strokeWidth={2.5} />
                  <ArrowRight size={14} strokeWidth={2.5} />
                </div>
              </button>
            </div>
          )}

          {/* Search Button centered floating at the bottom */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-20">
            <button
              type="button"
              disabled
              className="bg-gray-400 text-white font-bold text-xs sm:text-sm uppercase tracking-wider px-8 sm:px-10 py-3 sm:py-3.5 rounded-full shadow-md cursor-not-allowed whitespace-nowrap opacity-90"
            >
              Coming Soon
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* Upcoming Cab Features Showcase */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-8">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles size={13} className="text-teal-600" />
            What to Expect
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Upcoming Cab Services
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Tailored transportation solutions for pilgrims, business travellers, and families.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-3.5">
              <Navigation className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-base text-gray-900 mb-1">
              Airport Transfers
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Guaranteed on-time pickups from Jeddah & Madinah airports with luggage assistance.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3.5">
              <Compass className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-base text-gray-900 mb-1">
              Makkah - Madinah Rides
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Comfortable intercity private AC sedans, SUVs, and vans between holy cities.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3.5">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-base text-gray-900 mb-1">
              Hourly Ziyarat Rental
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Flexible hourly chauffeur bookings for local Ziyarat tours and city sight-seeing.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-base text-gray-900 mb-1">
              Verified Drivers & Fleet
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Professional, courteous, multi-lingual drivers with sanitized, modern vehicles.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CabBookingForm;
