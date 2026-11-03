import { useEffect, useState, useCallback } from "react";
import { MdVerified } from "react-icons/md";
import { PiBowlFoodFill } from "react-icons/pi";
import { FaEarthAmericas } from "react-icons/fa6";
import { RiStarSmileFill } from "react-icons/ri";
import { X } from "lucide-react";
import image from "../assets/image.png";
import CommonHeader from "../components/CommonHeader";
import CommonFlightHotelSearchBox from "../components/commonflighthotelsearchbox/CommonFlightHotelSearchBox";
import HomeSearchSection from "../components/home-search/HomeSearchSection";
import CustomPackageBuilder from "../components/CustomPackageBuilder";
import packageService from "../services/packageService";
import PackageCard from "../components/PackageCard";
import HotelSearch from "./HotelSearch";
import Footer from "../components/Footer";
import { ChevronRight, Sparkles, Bot, ArrowRight } from "lucide-react";
import HorizontalCarousel from "../components/shared/HorizontalCarousel";
import { BsForkKnife } from "react-icons/bs";
import { FaUmbrellaBeach } from "react-icons/fa6";
import TravelerReviews from "../components/reviews/TravelerReviews";
import IslamicValuesSection from "../components/IslamicValuesSection";
import Logo from "../assets/logo.png";
import { useNavigate } from "react-router-dom";
import { SearchAPI, UserAPI, PackageAPI } from "../configs/api";
import ForgetPasswordPopModal from "../components/ForgetPasswordPopModal";
import { useAuth } from "../store/authContext";
import OffersSection from "../components/offerssection/OffersSection";
import FlightOffersSection from "../components/flightoffers/FlightOffersSection";
import HeroSlider from "../components/shared/HeroSlider";

const FALLBACK_PACKAGES = [
  {
    _id: "6ac4cc8fdd7f83ab2e5a4cd3",
    title: "Zam-zam Executive Pilgrimage",
    destination: "Madina",
    images: [
      "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1000",
      "https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?q=80&w=1000",
      "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?q=80&w=1000",
    ],
    bundleDiscountPercentage: 10,
    sellPrice: 85000,
    inclusions: ["Emirates Flights", "InterContinental Executive Suite", "VIP Ground Transfers"],
    itinerary: [
      { day: 1, title: "Day 1", description: "Arrival in Madinah & Hotel Check-in" },
      { day: 2, title: "Day 2", description: "Prophet's Mosque Ziyarat & Rawdah Visit" },
      { day: 3, title: "Day 3", description: "Historic Mosques (Quba, Qiblatayn, Uhud)" },
      { day: 4, title: "Day 4", description: "Private Haramain High-Speed Train Transfer" },
    ],
    validity: {
      from: "2026-10-07T00:00:00.000Z",
      to: "2026-10-15T18:29:59.999Z",
    },
    availableSlots: 3,
    priceBreakdown: [
      {
        id: "6abe105ae33c12a898c02ea1",
        title: "InterContinental Durrat Al Riyadh — Executive Suite",
        itemType: "hotel",
        retailPrice: 94000,
        details: {
          destination: "Riyadh & Madina, Saudi Arabia",
          hotelDetails: {
            hotelId: { name: "InterContinental Durrat Al Riyadh" },
            roomType: "Executive Suite",
            totalNights: 8,
          },
        },
      },
      {
        id: "6abba3790d38868cbc2e389c",
        title: "Emirates EK-512 DEL → DXB → MED",
        itemType: "flight",
        retailPrice: 21275,
        details: {
          destination: "MED",
          flightDetails: {
            airline: "Emirates",
            flightNumber: "EK-512",
            origin: "DEL",
            destination: "MED",
          },
        },
      },
    ],
  },
  {
    _id: "6aa931aecedad95f28debbda",
    title: "Makkah Premium VIP Package",
    description: "Exclusive Umrah pilgrimage package featuring luxury 5-star hotel facing the Holy Kaaba, private transfers, and dedicated scholar guidance.",
    destination: "Makkah",
    images: [
      "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1000",
      "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?q=80&w=1000",
    ],
    bundleDiscountPercentage: 12,
    sellPrice: 45000,
    inclusions: ["Direct Flights", "5-Star Clock Tower Fairmont", "Full Halal Board", "Private Transfers"],
    itinerary: [
      { day: 1, title: "Day 1", description: "Direct Flight Arrival & Umrah Performance" },
      { day: 2, title: "Day 2", description: "Haram Worship & Scholar Q&A Session" },
      { day: 3, title: "Day 3", description: "Jabal Al-Noor & Cave of Hira Guided Tour" },
    ],
    validity: {
      from: "2026-09-15T00:00:00.000Z",
      to: "2026-09-30T18:29:59.999Z",
    },
    availableSlots: 8,
    priceBreakdown: [
      {
        itemType: "hotel",
        title: "Fairmont Makkah Clock Royal Tower",
        details: {
          hotelDetails: {
            hotelId: { name: "Fairmont Makkah Clock Royal Tower" },
            roomType: "Haram View Deluxe",
            totalNights: 7,
          },
        },
      },
      {
        itemType: "flight",
        title: "Saudia Airlines SV-757",
        details: {
          flightDetails: {
            airline: "Saudia",
            flightNumber: "SV-757",
            origin: "DEL",
            destination: "JED",
          },
        },
      },
    ],
  },
  {
    _id: "6aa92be7cedad95f28deb9ea",
    title: "Madinah Tour Special Offer Package",
    description: "Comprehensive spiritual package in the City of the Prophet, including roundtrip airfare, 4-star central hotel, daily breakfast, and private local ziyarat.",
    destination: "Madinah",
    images: [
      "https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?q=80&w=1000",
      "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?q=80&w=1000",
    ],
    bundleDiscountPercentage: 8,
    sellPrice: 45000,
    inclusions: ["Roundtrip Airfare", "Central Central Hotel", "Daily Halal Breakfast", "Private Cab Ziyarat"],
    itinerary: [
      { day: 1, title: "Day 1", description: "Arrival in Madinah & Check-in" },
      { day: 2, title: "Day 2", description: "Prophet's Mosque & Rawdah Prayer" },
      { day: 3, title: "Day 3", description: "Mount Uhud & Quba Mosque Visit" },
    ],
    validity: {
      from: "2026-09-15T00:00:00.000Z",
      to: "2026-09-30T18:29:59.999Z",
    },
    availableSlots: 12,
    priceBreakdown: [
      {
        itemType: "hotel",
        title: "Oberoi Madinah",
        details: {
          hotelDetails: {
            hotelId: { name: "The Oberoi Madinah" },
            roomType: "Premier Courtyard Room",
            totalNights: 6,
          },
        },
      },
      {
        itemType: "flight",
        title: "Flynas XY-342",
        details: {
          flightDetails: {
            airline: "Flynas",
            flightNumber: "XY-342",
            origin: "BOM",
            destination: "MED",
          },
        },
      },
    ],
  },
  {
    _id: "6aa7bffb92b1b9c8f89ae79e",
    title: "7D6N Istanbul & Cappadocia Wonders",
    description: "Explore the historic Ottoman marvels of Istanbul, Blue Mosque, Hagia Sophia, and the fairytale landscapes and hot air balloons of Cappadocia.",
    destination: "Turkey",
    images: [
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1000&q=80",
    ],
    bundleDiscountPercentage: 15,
    sellPrice: 62000,
    inclusions: [
      "Turkish Airlines Flights",
      "Cave Hotel in Cappadocia",
      "Bosphorus Dinner Cruise",
      "Hot Air Balloon Tour",
    ],
    itinerary: [
      { day: 1, description: "Arrival in Istanbul & Bosphorus Dinner Cruise" },
      { day: 2, description: "Hagia Sophia, Blue Mosque & Grand Bazaar" },
      { day: 3, description: "Flight to Cappadocia & check-in to Cave Hotel" },
      { day: 4, description: "Early morning hot air balloon watching & Goreme tour" },
      { day: 5, description: "Underground city of Derinkuyu & Ihlara Valley" },
      { day: 6, description: "Return flight to Istanbul & Taksim leisure" },
      { day: 7, description: "Spice Market shopping & international departure" },
    ],
    validity: {
      from: "2026-10-01T00:00:00.000Z",
      to: "2026-10-25T18:29:59.999Z",
    },
    availableSlots: 15,
    priceBreakdown: [
      {
        itemType: "hotel",
        title: "Museum Hotel Cappadocia & Sultanahmet Palace",
        details: {
          hotelDetails: {
            hotelId: { name: "Museum Hotel Cappadocia" },
            roomType: "Deluxe Cave Suite",
            totalNights: 6,
          },
        },
      },
      {
        itemType: "flight",
        title: "Turkish Airlines TK-717",
        details: {
          flightDetails: {
            airline: "Turkish Airlines",
            flightNumber: "TK-717",
            origin: "DEL",
            destination: "IST",
          },
        },
      },
    ],
  },
  {
    _id: "6aa8dca9cedad95f28dea9d5",
    title: "Morocco Heritage & Cultural Tour",
    description: "Discover the captivating culture of Marrakech, Fez Medina, historic mosques, and Atlas mountain retreats with private licensed guides.",
    destination: "Morocco",
    images: [
      "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1000&q=80",
    ],
    bundleDiscountPercentage: 10,
    sellPrice: 45000,
    inclusions: ["Flights Included", "Boutique Riad Stay", "Halal Dining", "Atlas Mountain Day Trip"],
    itinerary: [
      { day: 1, title: "Day 1", description: "Arrival in Marrakech & Riad Welcome" },
      { day: 2, title: "Day 2", description: "Bahia Palace & Koutoubia Mosque" },
      { day: 3, title: "Day 3", description: "Atlas Mountains & Ourika Valley" },
    ],
    validity: {
      from: "2026-09-15T00:00:00.000Z",
      to: "2026-10-10T18:29:59.999Z",
    },
    availableSlots: 10,
    priceBreakdown: [],
  },
  {
    _id: "pkg-dubai",
    title: "Dubai Luxury Escape & Desert Safari",
    description: "5-star Arabian Gulf holiday with luxury Dubai Marina accommodation, thrilling 4x4 desert safari, and private city excursions.",
    destination: "Dubai",
    images: [
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=1000&q=80",
    ],
    bundleDiscountPercentage: 10,
    sellPrice: 55000,
    inclusions: ["Emirates Direct Flights", "5-Star Marina Hotel", "Desert Safari BBQ", "Burj Khalifa At The Top"],
    itinerary: [
      { day: 1, title: "Day 1", description: "Arrival in Dubai & Marina Dhow Cruise" },
      { day: 2, title: "Day 2", description: "Burj Khalifa, Dubai Mall & Fountain Show" },
      { day: 3, title: "Day 3", description: "Afternoon 4x4 Desert Safari & BBQ Dinner" },
    ],
    validity: {
      from: "2026-10-01T00:00:00.000Z",
      to: "2026-10-20T18:29:59.999Z",
    },
    availableSlots: 6,
    priceBreakdown: [
      {
        itemType: "flight",
        title: "Emirates EK-501",
        details: {
          flightDetails: {
            airline: "Emirates",
            flightNumber: "EK-501",
            origin: "BOM",
            destination: "DXB",
          },
        },
      },
    ],
  },
];

const Home = () => {
  const navigator = useNavigate();
  const [packagesList, setPackagesList] = useState(FALLBACK_PACKAGES);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const { openLoginModal, openRegisterModal } = useAuth();
  const setShowLoginPopup = useCallback(
    (show) => {
      if (show) openLoginModal();
    },
    [openLoginModal],
  );
  const setShowRegisterPopup = useCallback(
    (show) => {
      if (show) openRegisterModal();
    },
    [openRegisterModal],
  );
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showForgetPopup, setShowForgetPopup] = useState(false);
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);
  const [confirmpasswordchange, setConfirmpasswordchange] = useState(false);
  const [reset_Token, setReset_Token] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showconfirmPassword, setShowconfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("flight");
  const [showSearchSheet, setShowSearchSheet] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);


  const features = [
    {
      name: "Verified Stay",
      icon: MdVerified,
    },
    {
      name: "Healthy Food",
      icon: PiBowlFoodFill,
    },
    {
      name: "Safe Location",
      icon: RiStarSmileFill,
    },
    {
      name: "Curated Destinations",
      icon: FaEarthAmericas,
    },
  ];

  useEffect(() => {
    let isMounted = true;
    const fetchLivePackages = async () => {
      try {
        setIsLoadingPackages(true);
        const data = await packageService.getPackages();
        const pkgs =
          data?.packages ||
          data?.data?.packages ||
          data?.data ||
          (Array.isArray(data) ? data : []);
        if (isMounted && Array.isArray(pkgs) && pkgs.length > 0) {
          setPackagesList(pkgs);
        }
      } catch (error) {
        console.warn("Could not fetch live packages, displaying curated packages:", error);
      } finally {
        if (isMounted) setIsLoadingPackages(false);
      }
    };

    fetchLivePackages();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setIsLoading(false);
  };



  return (
    <>
      {/* HERO  —  Full screen, all breakpoints */}
      <div className="relative">
        <CommonHeader />

        {/* ── Modern Curated Hero Slider ── */}
        <HeroSlider heightClass="h-[460px] sm:h-[500px] md:h-[530px] lg:h-[550px]" />

        <HomeSearchSection />

              {/* ── MOBILE: Bottom sheet ── */}
              {showSearchSheet && (
                <div
                  className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 lg:hidden"
                  onClick={() => setShowSearchSheet(false)}
                />
              )}
              <div
                className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[#07111f] rounded-t-3xl border-t border-white/10 shadow-2xl transition-all duration-500 ease-out ${
                  showSearchSheet
                    ? "translate-y-0 opacity-100"
                    : "translate-y-full opacity-0 pointer-events-none"
                }`}
                style={{ maxHeight: "92vh", overflowY: "auto" }}
              >
                {/* Drag handle */}
                <div className="flex flex-col items-center pt-3 pb-2">
                  <div className="w-10 h-1 rounded-full bg-white/20" />
                  <p className="text-slate-400 text-[11px] mt-2">
                    Swipe down or tap outside to close
                  </p>
                </div>

                {/* Sheet header */}
                <div className="flex items-center justify-between px-5 pb-4 pt-1 border-b border-white/8">
                  <div>
                    <p className="text-white font-bold text-base">
                      Search & Book
                    </p>
                    <p className="text-slate-400 text-xs">
                      Best prices, guaranteed
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSearchSheet(false)}
                    className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-slate-300 hover:bg-white/20 transition-all active:scale-95"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Tabs */}
                <div
                  className="flex gap-1.5 mx-5 my-4 p-1 rounded-2xl"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {[
                    {
                      id: "flight",
                      label: "✈ Flight",
                      active: "from-blue-500 to-indigo-600",
                    },
                    {
                      id: "hotel",
                      label: "🏨 Hotel",
                      active: "from-violet-500 to-purple-600",
                    },
                    {
                      id: "package",
                      label: "📦 Packages",
                      active: "from-emerald-500 to-teal-600",
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-300 ${
                        activeTab === tab.id
                          ? `bg-gradient-to-r ${tab.active} text-white shadow-md`
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Search components */}
                <div className="px-5 pb-8">
                  <div className={activeTab === "flight" ? "block" : "hidden"}>
                    <CommonFlightHotelSearchBox embedded />
                  </div>
                  <div className={activeTab === "hotel" ? "block" : "hidden"}>
                    <HotelSearch embedded />
                  </div>
                  <div className={activeTab === "package" ? "block" : "hidden"}>
                    <div className="space-y-3">
                      {packagesList.slice(0, 4).map((pkg, i) => {
                        const img =
                          (Array.isArray(pkg.images) && pkg.images.length > 0 ? pkg.images[0] : null) ||
                          pkg.image ||
                          "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=800";
                        const price =
                          pkg.sellPrice != null
                            ? `₹${Number(pkg.sellPrice).toLocaleString("en-IN")}`
                            : pkg.price || "₹45,000";
                        const duration =
                          pkg.duration ||
                          (Array.isArray(pkg.itinerary) && pkg.itinerary.length > 0
                            ? `${pkg.itinerary.length} Days`
                            : "Pilgrimage Journey");

                        return (
                          <div
                            key={pkg._id || pkg.id || i}
                            onClick={() => navigator(pkg._id ? `/packages/${pkg._id}` : "/package-page")}
                            className="flex gap-3 items-center rounded-2xl p-2.5 cursor-pointer hover:bg-white/10 transition-colors"
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.08)",
                            }}
                          >
                            <img
                              src={img}
                              alt={pkg.title}
                              className="w-12 h-12 object-cover rounded-xl shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs font-bold line-clamp-1">
                                {pkg.title}
                              </p>
                              <p className="text-slate-400 text-[10px] mt-0.5">
                                ⏱ {duration}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-emerald-400 text-sm font-extrabold">
                                {price}
                              </p>
                              <button
                                className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white cursor-pointer"
                                style={{
                                  background:
                                    "linear-gradient(135deg,#10b981,#059669)",
                                }}
                              >
                                Book
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* \u2500\u2500 Desktop Search Overlay (CommonFlightHotelSearchBox) \u2500\u2500 */}
              {showSearchOverlay && (
                <div
                  className="fixed inset-0 z-[90] flex items-center justify-center p-4"
                  style={{
                    background: "rgba(0,0,0,0.72)",
                    backdropFilter: "blur(10px)",
                  }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget)
                      setShowSearchOverlay(false);
                  }}
                >
                  <div
                    className="relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-[fadeInUp_0.3s_ease]"
                    style={{
                      background:
                        "linear-gradient(145deg,#0d1f3c,#0a1628,#060e1c)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      boxShadow:
                        "0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)",
                    }}
                  >
                    {/* Glow top border */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />

                    {/* Header */}
                    <div
                      className="flex items-center justify-between px-6 py-4 border-b"
                      style={{ borderColor: "rgba(255,255,255,0.08)" }}
                    >
                      <div>
                        <p className="text-white font-extrabold text-base">
                          Search &amp; Book
                        </p>
                        <p className="text-slate-400 text-xs mt-0.5">
                          Flights, Hotels &amp; Packages at best prices
                        </p>
                      </div>
                      <button
                        onClick={() => setShowSearchOverlay(false)}
                        className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.12)",
                        }}
                      >
                        <X size={16} className="text-white/70" />
                      </button>
                    </div>

                    {/* Tabs */}
                    <div
                      className="flex gap-1.5 mx-6 mt-4 mb-4 p-1 rounded-2xl"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {[
                        {
                          id: "flight",
                          label: "\u2708 Flight",
                          active: "from-blue-500 to-indigo-600",
                        },
                        {
                          id: "hotel",
                          label: "\ud83c\udfe8 Hotel",
                          active: "from-violet-500 to-purple-600",
                        },
                        {
                          id: "package",
                          label: "\ud83d\udce6 Packages",
                          active: "from-emerald-500 to-teal-600",
                        },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                            activeTab === tab.id
                              ? `bg-gradient-to-r ${tab.active} text-white shadow-md`
                              : "text-slate-300 hover:text-white"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Search components */}
                    <div className="px-6 pb-7">
                      <div
                        className={activeTab === "flight" ? "block" : "hidden"}
                      >
                        <CommonFlightHotelSearchBox embedded />
                      </div>
                      <div
                        className={activeTab === "hotel" ? "block" : "hidden"}
                      >
                        <HotelSearch embedded />
                      </div>
                      <div
                        className={activeTab === "package" ? "block" : "hidden"}
                      >
                        <div className="space-y-3">
                          {packagesList.slice(0, 4).map((pkg, i) => {
                            const img =
                              (Array.isArray(pkg.images) && pkg.images.length > 0 ? pkg.images[0] : null) ||
                              pkg.image ||
                              "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=800";
                            const price =
                              pkg.sellPrice != null
                                ? `₹${Number(pkg.sellPrice).toLocaleString("en-IN")}`
                                : pkg.price || "₹45,000";
                            const duration =
                              pkg.duration ||
                              (Array.isArray(pkg.itinerary) && pkg.itinerary.length > 0
                                ? `${pkg.itinerary.length} Days`
                                : "Pilgrimage Journey");

                            return (
                              <div
                                key={pkg._id || pkg.id || i}
                                onClick={() => navigator(pkg._id ? `/packages/${pkg._id}` : "/package-page")}
                                className="flex gap-3 items-center rounded-2xl p-2.5 cursor-pointer hover:bg-white/10 transition-colors"
                                style={{
                                  background: "rgba(255,255,255,0.05)",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                }}
                              >
                                <img
                                  src={img}
                                  alt={pkg.title}
                                  className="w-12 h-12 object-cover rounded-xl shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-xs font-bold line-clamp-1">
                                    {pkg.title}
                                  </p>
                                  <p className="text-slate-400 text-[10px] mt-0.5">
                                    ⏱ {duration}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-emerald-400 text-sm font-extrabold">
                                    {price}
                                  </p>
                                  <button
                                    className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white cursor-pointer"
                                    style={{
                                      background:
                                        "linear-gradient(135deg,#10b981,#059669)",
                                    }}
                                  >
                                    Book
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          <button
                            onClick={() => navigator("/package-page")}
                            className="w-full py-2.5 mt-2 rounded-xl text-center text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition cursor-pointer"
                          >
                            Explore All Packages →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
      </div>

      <OffersSection />

      <FlightOffersSection />

      {/* ── 3D AI TRAVEL PLANNER HERO BANNER (from maqamh.pages.dev) ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#07131b] via-[#0b242e] to-[#041d1a] py-14 px-4 sm:px-6 lg:px-8 border-y border-teal-500/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.15),transparent_50%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Plan Your Journey with our{" "}
              <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-300 bg-clip-text text-transparent">
                AI Travel Planner
              </span>
            </h2>
            <p className="mt-2.5 text-sm sm:text-base text-slate-300 leading-relaxed">
              Tell our AI your dream destination, budget, or pilgrimage dates. Get personalized Umrah packages, verified hotels near Haram, and instant flight comparisons in seconds.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-3">
              <button
                onClick={() => navigator("/ai-package-generator")}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold text-sm shadow-[0_8px_25px_rgba(20,184,166,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Bot size={18} />
                <span>Launch AI Planner Chat</span>
                <ArrowRight size={16} className="stroke-[2.5]" />
              </button>
              <button
                onClick={() => navigator("/ai-package-generator?prompt=Plan+Umrah+package+with+5-star+hotel")}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white border border-white/10 text-xs sm:text-sm font-semibold transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles size={14} className="text-amber-400" />
                <span>Plan Umrah 2026</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center w-full lg:w-auto">
            <div
              onClick={() => navigator("/ai-package-generator")}
              className="relative p-6 sm:p-7 rounded-3xl bg-white/5 border border-teal-500/30 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center max-w-sm w-full group hover:border-teal-400 hover:shadow-[0_12px_40px_rgba(20,184,166,0.25)] transition-all duration-300 cursor-pointer"
            >
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-teal-500/30 group-hover:scale-110 transition-transform duration-300">
                <Bot size={40} />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
              </div>
              <h3 className="mt-4 font-bold text-lg text-white">AI Travel Chatbot</h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Live natural language conversation, dynamic flight & hotel recommendations.
              </p>
              <div className="mt-4 text-xs font-bold text-teal-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                <span>Start Chatting Now</span>
                <ArrowRight size={14} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── RECOMMENDED PACKAGES SECTION (Horizontal Carousel with Click-Scrolling) ── */}
      <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-10 xl:px-12 font-jakarta bg-slate-50/70 dark:bg-[#070c18] border-b border-slate-200/80 dark:border-white/10 transition-colors duration-300">
        <div className="w-full max-w-[1760px] mx-auto">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Recommended <span className="text-emerald-600 dark:text-emerald-400">Packages</span>
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1.5 max-w-xl leading-relaxed">
                Handcrafted, verified pilgrimage and leisure packages with direct flights, luxury hotel accommodations, and guaranteed availability.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => navigator("/package-page")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                <span>View All Packages</span>
                <ChevronRight size={15} className="stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Horizontal Packages Carousel (Exact-fit Cards without remaining card cut-offs) */}
          <HorizontalCarousel
            ariaLabel="packages"
            arrowOffset="padding"
            trackClassName="gap-6 py-3 px-0 items-stretch"
          >
            {isLoadingPackages ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`pkg-skel-${i}`}
                  className="flex-none w-full sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)] xl:w-[calc((100%-4.5rem)/4)] flex flex-col snap-start"
                >
                  <div className="w-full h-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 animate-pulse p-4 flex flex-col justify-between">
                    <div className="w-full h-44 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                    <div className="space-y-2 mt-3">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-20" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              packagesList.map((pkg, index) => (
                <div
                  key={pkg._id || pkg.id || index}
                  className="flex-none w-full sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)] xl:w-[calc((100%-4.5rem)/4)] flex flex-col snap-start"
                >
                  <PackageCard pkg={pkg} />
                </div>
              ))
            )}
          </HorizontalCarousel>
        </div>
      </section>

      {/* ── TRAVELER REVIEWS SECTION ── */}
      <TravelerReviews />

      {/* ── EXPERIENCE TRAVEL THROUGH ISLAMIC VALUES ── */}
      <IslamicValuesSection />

      <section className="bg-[#FAFAF8] dark:bg-[#0b1120] py-16 px-4 sm:px-6 lg:px-10 xl:px-12 font-poppins transition-colors">
        <div className="w-full max-w-[1760px] mx-auto grid md:grid-cols-[1fr_400px] gap-12 items-center">
          {/* Left Content */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              About Maqam Travels
            </h2>

            <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed mb-4">
              Maqam is a dedicated travel platform committed to providing seamless, verified Hajj, Umrah, and halal-friendly travel experiences worldwide. We partner directly with certified airlines and reputable hotels across Makkah and Madinah to ensure transparent pricing, reliable service, and dedicated support.
            </p>

            <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed">
              From personalized pilgrimage packages and comfortable private transfers to knowledgeable guides and bespoke itineraries, our priority is to ensure every journey is spiritually rewarding, comfortable, and stress-free.
            </p>

            {/* Why Choose */}
            <h3 className="mt-8 font-semibold text-gray-900 dark:text-white">Why Choose Us</h3>

            <div className="flex flex-wrap gap-4 mt-4">
              {features.map((item, index) => {
                const Icon = item.icon;

                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 dark:border dark:border-teal-800/40 px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    <Icon size={18} />
                    {item.name}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Images */}
          <div className=" flex justify-center">
            {/* Back Image */}
            <img
              src={image}
              alt="Decorative background"
              className=" w-[360px]"
            />
          </div>
        </div>
      </section>

      {showForgetPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-md sm:max-w-lg mx-auto">
            <button
              onClick={() => {
                setShowForgetPopup(false);
                setShowLoginPopup(true);
                setShowVerificationPopup(false);
              }}
              className="absolute -top-3 -right-3 z-30 w-9 h-9 bg-white text-gray-700 hover:text-red-600 hover:scale-110 rounded-full shadow-xl flex items-center justify-center cursor-pointer transition-all border border-gray-200"
              aria-label="Close forget modal"
            >
              <X size={18} />
            </button>
            <Forget
              handleSubmit={handleSubmit}
              email={email}
              setEmail={setEmail}
              submitted={submitted}
              setSubmitted={setSubmitted}
              isLoading={isLoading}
              setShowLoginPopup={setShowLoginPopup}
              setShowRegisterPopup={setShowRegisterPopup}
              setShowForgetPopup={setShowForgetPopup}
              setShowVerificationPopup={setShowVerificationPopup}
              setReset_Token={setReset_Token}
            />
          </div>
        </div>
      )}

      {showVerificationPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-md sm:max-w-lg mx-auto">
            <button
              onClick={() => {
                setShowVerificationPopup(false);
                setShowForgetPopup(false);
                setShowLoginPopup(true);

                sessionStorage.setItem("loginPopupShown", "true");
              }}
              className="absolute -top-3 -right-3 z-30 w-9 h-9 bg-white text-gray-700 hover:text-red-600 hover:scale-110 rounded-full shadow-xl flex items-center justify-center cursor-pointer transition-all border border-gray-200"
              aria-label="Close login modal"
            >
              <X size={18} />
            </button>
            <VerificatinOtp
              handleSubmit={handleSubmit}
              email={email}
              setEmail={setEmail}
              submitted={submitted}
              setSubmitted={setSubmitted}
              isLoading={isLoading}
              setShowLoginPopup={setShowLoginPopup}
              setShowRegisterPopup={setShowRegisterPopup}
              setShowForgetPopup={setShowForgetPopup}
              setShowVerificationPopup={setShowVerificationPopup}
              reset_Token={reset_Token}
              setReset_Token={setReset_Token}
              setConfirmpasswordchange={setConfirmpasswordchange}
            />
          </div>
        </div>
      )}

      {confirmpasswordchange && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative bg-white  shadow-2xl w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto max-h-[90vh] overflow-auto">
            <button
              onClick={() => {
                setShowVerificationPopup(false);
                setShowForgetPopup(false);
                setShowLoginPopup(true);
                setConfirmpasswordchange(false);
                sessionStorage.setItem("loginPopupShown", "true");
              }}
              className="absolute top-2 right-2 text-red-600 hover:text-red-700 z-10 bg-red-200 p-1 rounded-full cursor-pointer"
              aria-label="Close login modal"
            >
              <X size={15} />
            </button>
            <ForgetPasswordPopModal
              handleSubmit={handleSubmit}
              email={email}
              setEmail={setEmail}
              submitted={submitted}
              setSubmitted={setSubmitted}
              isLoading={isLoading}
              setShowLoginPopup={setShowLoginPopup}
              setShowRegisterPopup={setShowRegisterPopup}
              setShowForgetPopup={setShowForgetPopup}
              setShowVerificationPopup={setShowVerificationPopup}
              reset_Token={reset_Token}
              setReset_Token={setReset_Token}
              setConfirmpasswordchange={setConfirmpasswordchange}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              showconfirmPassword={showconfirmPassword}
              setShowconfirmPassword={setShowconfirmPassword}
            />
          </div>
        </div>
      )}
      {/* ── Custom Package Builder Modal (opened from hero AI Custom Package btn) ── */}
      {showCustomForm && (
        <CustomPackageBuilder
          open={showCustomForm}
          onClose={() => setShowCustomForm(false)}
        />
      )}
      <Footer />
    </>
  );
};

export default Home;
