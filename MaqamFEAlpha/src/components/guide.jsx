import { useState, useEffect, useMemo } from "react";
import {
  ArrowRight,
  Backpack,
  Check,
  Clock3,
  HeartHandshake,
  MapPin,
  Moon,
  Plane,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Search,
  Filter,
  Languages,
  Calendar,
  Compass,
  Star,
  RefreshCw,
  BookOpen,
  Award,
  AlertCircle,
  Database,
} from "lucide-react";
import CommonHeader from "./CommonHeader";
import Heroimage2 from "../assets/hero-slider/slide2-madinah-prophet-mosque.jpg";
import GuideCard from "./guide/GuideCard";
import GuideProfileModal from "./guide/GuideProfileModal";
import { fetchGuideCategories, fetchGuides } from "../services/guideService";
import { staggerEntrance, clickSquash } from "../animations/presets";

const guideSections = [
  {
    id: "before-you-go",
    title: "Before you go",
    icon: Backpack,
    intro: "Settle the practical details before your journey begins.",
    steps: [
      "Check your passport validity, visa and travel documents.",
      "Visit your doctor and carry prescriptions in original packaging.",
      "Learn the essential rites of Umrah and save emergency contacts.",
      "Pack comfortable modest clothing, walking shoes and a small prayer bag.",
    ],
  },
  {
    id: "umrah-steps",
    title: "Umrah steps",
    icon: Moon,
    intro: "A simple overview to keep close during your worship.",
    steps: [
      "Enter Ihram at the Miqat with the intention for Umrah.",
      "Perform Tawaf by completing seven circuits around the Kaaba.",
      "Pray two units where possible, then drink Zamzam respectfully.",
      "Complete Sa'i between Safa and Marwah, followed by cutting the hair.",
    ],
  },
  {
    id: "on-the-ground",
    title: "On the ground",
    icon: MapPin,
    intro: "Move through Makkah and Madinah with calm and care.",
    steps: [
      "Keep your hotel card and group leader contact with you.",
      "Use the official shuttle or trusted transport after prayer times.",
      "Stay hydrated and take rest between long periods of worship.",
      "Respect local guidance, prayer areas and the privacy of other pilgrims.",
    ],
  },
];

const quickTips = [
  {
    icon: HeartHandshake,
    title: "Lead with patience",
    text: "Crowds are part of the journey. Give space, help others and keep your intention sincere.",
  },
  {
    icon: Sun,
    title: "Plan around prayer",
    text: "Arrive early for congregational prayers and keep your daily schedule flexible.",
  },
  {
    icon: ShieldCheck,
    title: "Keep essentials close",
    text: "Carry water, identification, medication and a charged phone in a small day bag.",
  },
];

export default function Guide() {
  // Main view switcher: "guides" (Licensed Guides Directory) | "rites" (Educational Rites)
  const [mainTab, setMainTab] = useState("guides");

  // Filters & Search
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDestination, setSelectedDestination] = useState("all");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Guide Listing Data from Database
  const [guides, setGuides] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [isLiveApi, setIsLiveApi] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Selected Guide Modal State
  const [activeModalGuide, setActiveModalGuide] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [bookingSuccessBanner, setBookingSuccessBanner] = useState(null);

  // Rites educational section active tab
  const [activeSection, setActiveSection] = useState("before-you-go");
  const activeGuideSection = guideSections.find(
    (section) => section.id === activeSection
  );
  const ActiveIcon = activeGuideSection?.icon || Backpack;

  // 1. Fetch Categories on mount
  useEffect(() => {
    fetchGuideCategories().then((cats) => {
      setCategories(cats || []);
    });
  }, []);

  // 2. Fetch Guides from database when filters change
  const loadGuides = () => {
    let isCancelled = false;
    setLoading(true);
    setApiError(null);

    fetchGuides({
      destination: selectedDestination,
      category: selectedCategory,
      language: selectedLanguage,
    }).then((result) => {
      if (isCancelled) return;
      setGuides(result.guides || []);
      setMeta(result.meta || { total: (result.guides || []).length, page: 1, limit: 10 });
      setIsLiveApi(result.isLive ?? false);
      if (result.error) {
        setApiError(result.error);
      }
      setLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  };

  useEffect(() => {
    const cancel = loadGuides();
    return () => {
      if (cancel) cancel();
    };
  }, [selectedCategory, selectedDestination, selectedLanguage]);

  const getCategoryTitle = (cat) => {
    const found = categories.find((c) => c.category === cat);
    if (found?.label) return found.label;
    switch (cat) {
      case "all":
        return "All Guides";
      case "umrah-religious":
        return "Umrah & Religious";
      case "ziyarat-historical":
        return "Historical Ziyarat";
      case "city-heritage":
        return "City & Heritage";
      case "desert-adventure":
        return "Desert Adventure";
      default:
        return cat
          ? cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, " ")
          : "Guide";
    }
  };

  // Derived dynamic categories from database records
  const dynamicCategories = useMemo(() => {
    const list = [...categories];
    guides.forEach((g) => {
      if (g.category && !list.some((c) => c.category === g.category)) {
        list.push({
          category: g.category,
          label: getCategoryTitle(g.category),
        });
      }
    });

    if (list.length === 0) {
      list.push(
        { category: "all", label: "All Guides" },
        { category: "umrah-religious", label: "Umrah & Religious" },
        { category: "ziyarat-historical", label: "Historical Ziyarat" },
        { category: "city-heritage", label: "City & Heritage" },
        { category: "desert-adventure", label: "Desert Adventure" }
      );
    }

    return list.map((c) => {
      if (c.category === "all") {
        return { ...c, activeGuidesCount: meta.total || guides.length };
      }
      const count = guides.filter((g) => g.category === c.category).length;
      return { ...c, activeGuidesCount: count };
    });
  }, [categories, guides, meta.total]);

  // Derived available cities
  const dynamicCities = useMemo(() => {
    const base = ["Makkah", "Madinah", "Jeddah", "Riyadh"];
    guides.forEach((g) => {
      if (g.city && !base.some((c) => c.toLowerCase() === g.city.toLowerCase())) {
        base.push(g.city);
      }
    });
    return base;
  }, [guides]);

  const filteredGuides = useMemo(() => {
    if (!searchQuery.trim()) return guides;
    const q = searchQuery.toLowerCase().trim();
    return guides.filter(
      (g) =>
        g.fullName?.toLowerCase().includes(q) ||
        g.city?.toLowerCase().includes(q) ||
        g.bio?.toLowerCase().includes(q) ||
        g.languages?.some((l) => l.toLowerCase().includes(q)) ||
        g.coverageAreas?.some((a) => a.toLowerCase().includes(q))
    );
  }, [guides, searchQuery]);

  useEffect(() => {
    if (!loading && filteredGuides.length > 0) {
      staggerEntrance(".guide-card-item", {
        stagger: 50,
        startDelay: 60,
      });
    }
  }, [loading, filteredGuides.length, selectedCategory]);

  const handleOpenProfile = (guide) => {
    setActiveModalGuide(guide);
    setIsProfileModalOpen(true);
  };

  const handleOpenBooking = (guide) => {
    setActiveModalGuide(guide);
    setIsProfileModalOpen(true);
  };

  const handleBookSuccess = ({ guide, slot, date }) => {
    setBookingSuccessBanner(
      `Booking request reserved for ${guide.fullName} on ${date} (${slot.startTime} - ${slot.endTime})!`
    );
    setTimeout(() => {
      setBookingSuccessBanner(null);
    }, 6000);
  };

  return (
    <div className="min-h-screen bg-[#fbfaf7] dark:bg-[#070c18] font-poppins text-slate-900 dark:text-slate-100 transition-colors">
      <CommonHeader />

      <main className="pt-[72px]">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-[#123d38] px-4 py-14 text-white sm:px-6 lg:px-8 lg:py-20">
          <img
            src={Heroimage2}
            alt="Madinah mosque courtyard"
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-linear-to-r from-[#123d38] via-[#123d38]/95 to-[#123d38]/60" />

          <div className="relative mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200/35 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-amber-200 shadow-xs">
                <Database size={13} className={isLiveApi ? "text-emerald-400" : "text-amber-300"} />
                <span>{isLiveApi ? "Live Database Connected" : "Official Licensed Guiding Platform"}</span>
              </div>

              <h1 className="font-mirza text-5xl leading-tight sm:text-6xl lg:text-7xl font-bold">
                Certified Tour Guides.
                <span className="block text-amber-200">Enriched Spiritual Journey.</span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-emerald-50/85 sm:text-base">
                Discover verified Saudi Tourism Authority licensed guides in Makkah, Madinah,
                and historical landmarks. Check bookable time slots, read verified reviews,
                or explore essential rites of Umrah.
              </p>

              {/* View Selector Tabs */}
              <div className="mt-8 inline-flex p-1.5 rounded-2xl bg-black/25 backdrop-blur-md border border-white/15">
                <button
                  type="button"
                  onClick={() => setMainTab("guides")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    mainTab === "guides"
                      ? "bg-amber-400 text-slate-900 shadow-md"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  <Users size={15} /> Find Licensed Guides
                </button>
                <button
                  type="button"
                  onClick={() => setMainTab("rites")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    mainTab === "rites"
                      ? "bg-amber-400 text-slate-900 shadow-md"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  <BookOpen size={15} /> Pilgrimage Guide & Rites
                </button>
              </div>
            </div>

            {/* LIVE SEARCH & FILTER CARD (When in guides tab) */}
            {mainTab === "guides" && (
              <div className="mt-8 rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xl border border-amber-200/40 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Search Query */}
                  <div className="relative">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Search Guide / Landmark
                    </label>
                    <div className="relative">
                      <Search
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="e.g. Mount Uhud, Tariq, Tawaf..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Destination Dropdown */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Destination / City
                    </label>
                    <div className="relative">
                      <MapPin
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <select
                        value={selectedDestination}
                        onChange={(e) => setSelectedDestination(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:border-amber-500 focus:outline-hidden cursor-pointer"
                      >
                        <option value="all">All Holy Cities & Hubs</option>
                        {dynamicCities.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Language Selector */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Spoken Language
                    </label>
                    <div className="relative">
                      <Languages
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:border-amber-500 focus:outline-hidden cursor-pointer"
                      >
                        <option value="all">All Languages</option>
                        <option value="Arabic">Arabic (العربية)</option>
                        <option value="English">English</option>
                        <option value="Urdu">Urdu (اردو)</option>
                        <option value="Turkish">Turkish (Türkçe)</option>
                        <option value="French">French (Français)</option>
                      </select>
                    </div>
                  </div>

                  {/* Reset / Actions */}
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory("all");
                        setSelectedDestination("all");
                        setSelectedLanguage("all");
                        setSearchQuery("");
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                    >
                      <RefreshCw size={13} /> Reset Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* NOTIFICATION BANNER */}
        {bookingSuccessBanner && (
          <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-600 px-5 py-3 text-white shadow-md animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Check size={18} />
                <span>{bookingSuccessBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setBookingSuccessBanner(null)}
                className="text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* MAIN BODY: VIEW 1 - LICENSED GUIDES DIRECTORY */}
        {mainTab === "guides" && (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            {/* Category Filter Chips Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 pt-1 no-scrollbar">
              <button
                type="button"
                onClick={(e) => {
                  clickSquash(e.currentTarget);
                  setSelectedCategory("all");
                }}
                className={`shrink-0 inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer ${
                  selectedCategory === "all"
                    ? "bg-[#123d38] text-white ring-2 ring-amber-400/40"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400"
                }`}
              >
                <Compass size={14} />
                <span>All Guides</span>
                <span className="ml-1 rounded-full bg-black/10 dark:bg-white/10 px-2 py-0.5 text-[10px]">
                  {meta.total || guides.length}
                </span>
              </button>

              {dynamicCategories
                .filter((c) => c.category !== "all")
                .map((catItem) => {
                  const isSelected = selectedCategory === catItem.category;
                  return (
                    <button
                      key={catItem.category}
                      type="button"
                      onClick={(e) => {
                        clickSquash(e.currentTarget);
                        setSelectedCategory(catItem.category);
                      }}
                      className={`shrink-0 inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer ${
                        isSelected
                          ? "bg-[#123d38] text-white ring-2 ring-amber-400/40"
                          : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400"
                      }`}
                    >
                      <Award size={14} />
                      <span>{getCategoryTitle(catItem.category)}</span>
                      {catItem.activeGuidesCount !== undefined && (
                        <span className="ml-1 rounded-full bg-amber-400/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-[10px]">
                          {catItem.activeGuidesCount}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>

            {/* API Connection Error Banner */}
            {apiError && (
              <div className="mt-4 mb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 text-red-800 dark:text-red-300 shadow-sm">
                <div className="flex items-center gap-2.5 text-xs font-medium">
                  <AlertCircle size={18} className="shrink-0 text-red-500" />
                  <div>
                    <p className="font-bold">Database Connection Notice</p>
                    <p className="text-red-600 dark:text-red-400 mt-0.5">{apiError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadGuides}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition cursor-pointer shrink-0"
                >
                  <RefreshCw size={13} /> Retry API
                </button>
              </div>
            )}

            {/* Results Header Status */}
            <div className="mt-4 mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-mirza text-3xl font-bold text-[#123d38] dark:text-white">
                  Available Guides ({filteredGuides.length})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Showing {getCategoryTitle(selectedCategory)}
                  {selectedDestination !== "all" && ` in ${selectedDestination}`}
                  {selectedLanguage !== "all" && ` fluent in ${selectedLanguage}`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                  <ShieldCheck size={14} /> Saudi Tourism Authority Verified
                </span>
              </div>
            </div>

            {/* Guides Grid */}
            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 py-8">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="h-80 rounded-2xl bg-white dark:bg-slate-800/60 p-6 animate-pulse border border-slate-200 dark:border-slate-800"
                  />
                ))}
              </div>
            ) : filteredGuides.length === 0 ? (
              <div className="my-12 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
                <Compass size={40} className="mx-auto text-amber-500/70 mb-3" />
                <h3 className="font-mirza text-2xl font-bold text-slate-800 dark:text-white">
                  {guides.length === 0 ? "No Guides in Database" : "No Guides Found Matching Filters"}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {guides.length === 0
                    ? "There are currently no tour guides stored in the database. When guides are registered through the backend, they will appear here live."
                    : "Try clearing specific language or destination criteria to see all available licensed tour guides."}
                </p>
                {guides.length === 0 ? (
                  <button
                    type="button"
                    onClick={loadGuides}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 transition cursor-pointer"
                  >
                    <RefreshCw size={13} /> Check Live Database Again
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("all");
                      setSelectedDestination("all");
                      setSelectedLanguage("all");
                      setSearchQuery("");
                    }}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 transition cursor-pointer"
                  >
                    <RefreshCw size={13} /> Reset All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredGuides.map((guide) => (
                  <GuideCard
                    key={guide._id}
                    guide={guide}
                    onSelectGuide={handleOpenProfile}
                    onBookSlot={handleOpenBooking}
                  />
                ))}
              </div>
            )}

            {/* Bottom Callout */}
            <div className="mt-16 rounded-3xl bg-linear-to-r from-orange-500 to-emerald-700 p-8 text-white shadow-xl">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                    <Sparkles size={13} /> Customized Guiding & Logistics
                  </span>
                  <h3 className="mt-2 font-mirza text-4xl font-bold leading-tight">
                    Planning a VIP or Large Group Pilgrimage?
                  </h3>
                  <p className="mt-1 max-w-xl text-sm text-emerald-100/90">
                    Connect with our pilgrim concierge for private scholars, dedicated female guides,
                    and personalized multi-day historical itineraries.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-bold text-[#123d38] shadow-md hover:bg-emerald-50 transition"
                  >
                    Contact Concierge
                  </a>
                  <a
                    href="/ai-package-generator"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-xs font-bold text-white hover:bg-white/20 transition"
                  >
                    Open AI Package Planner <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* MAIN BODY: VIEW 2 - PILGRIMAGE GUIDE & RITES */}
        {mainTab === "rites" && (
          <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
              <nav className="h-fit lg:sticky lg:top-24">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c58223]">
                  Explore the guide
                </p>
                <div className="mt-4 space-y-2">
                  {guideSections.map(({ id, title, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveSection(id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition cursor-pointer ${
                        activeSection === id
                          ? "bg-linear-to-r from-orange-500 to-emerald-700 text-white shadow-md"
                          : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-[#123d38] dark:hover:text-emerald-400"
                      }`}
                    >
                      <Icon size={18} />
                      <span>{title}</span>
                      <ArrowRight size={15} className="ml-auto" />
                    </button>
                  ))}
                </div>

                <div className="mt-8 rounded-2xl bg-[#f5efe3] dark:bg-slate-900 p-5 border border-amber-200/40 dark:border-slate-800">
                  <p className="font-mirza text-2xl text-[#123d38] dark:text-amber-200">
                    A gentle reminder
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
                    This guide supports your preparation. For religious rulings, follow your trusted
                    scholar or group leader.
                  </p>
                </div>
              </nav>

              <div>
                <div className="mb-8 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c58223] dark:text-amber-400">
                      Step{" "}
                      {guideSections.findIndex(
                        (section) => section.id === activeSection
                      ) + 1}{" "}
                      of {guideSections.length}
                    </p>
                    <h2 className="mt-1 font-mirza text-4xl text-[#123d38] dark:text-white sm:text-5xl">
                      {activeGuideSection.title}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {activeGuideSection.intro}
                    </p>
                  </div>
                  <ActiveIcon
                    size={34}
                    className="hidden text-emerald-600 dark:text-emerald-400 sm:block"
                  />
                </div>

                <div className="space-y-3">
                  {activeGuideSection.steps.map((step, index) => (
                    <div
                      key={step}
                      className="flex items-start gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">
                        {index + 1}
                      </span>
                      <p className="pt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {step}
                      </p>
                      <Check
                        size={17}
                        className="ml-auto mt-1 shrink-0 text-emerald-500"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-12">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c58223]">
                    Keep in mind
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {quickTips.map(({ icon: Icon, title, text }) => (
                      <div
                        key={title}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs"
                      >
                        <Icon size={21} className="text-emerald-600" />
                        <h3 className="mt-4 text-sm font-bold text-[#123d38] dark:text-emerald-400">
                          {title}
                        </h3>
                        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-10 rounded-2xl bg-linear-to-r from-orange-500 to-emerald-700 p-6 text-white sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-mirza text-3xl">Ready for a licensed guide?</p>
                      <p className="mt-1 text-sm text-white/85">
                        Book a certified scholar or historian to walk through these sacred rites with you.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMainTab("guides")}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-bold text-[#123d38] shadow-md hover:bg-emerald-50 transition cursor-pointer shrink-0"
                    >
                      Browse Guides <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Guide Profile, Live Slots & Reviews Modal */}
      <GuideProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        guide={activeModalGuide}
        onBookSuccess={handleBookSuccess}
      />

      <Footer />
    </div>
  );
}
