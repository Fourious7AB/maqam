import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import LumaSpin from "../components/ui/LumaSpin";
import {
  Clock3,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Star,
  Sparkles,
  Plane,
  Hotel,
  CheckCircle2,
  Calendar,
  Users,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Share2,
  Bookmark,
  Check,
  PhoneCall,
  Info,
  Car,
  FileText,
  BadgeCheck,
  Percent,
} from "lucide-react";
import { toast } from "react-toastify";
import packageService from "../services/packageService";
import CommonHeader from "../components/CommonHeader";
import Footer from "../components/Footer";
import CustomPackageBuilder from "../components/CustomPackageBuilder";
import AnimatedNumber from "../components/shared/AnimatedNumber";
import { clickSquash } from "../animations/presets";

const PackageDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("itinerary"); // "itinerary" | "hotels" | "inclusions" | "policies"
  const [expandedDays, setExpandedDays] = useState({});
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [openCustomizer, setOpenCustomizer] = useState(false);
  const [customizerStep, setCustomizerStep] = useState("customize");
  const [isSaved, setIsSaved] = useState(false);

  // Fetch package details from MongoDB database
  useEffect(() => {
    let isMounted = true;

    packageService
      .getPackageDetail(id)
      .then((data) => {
        if (!isMounted) return;
        setPkg(data);
        // Expand all days by default
        if (data?.itinerary?.length > 0) {
          const initialExpanded = {};
          data.itinerary.forEach((_, idx) => {
            initialExpanded[idx] = true;
          });
          setExpandedDays(initialExpanded);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Error fetching package details:", err);
        setError(
          "Unable to load package details from the database. Please try again.",
        );
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const toggleDay = (idx) => {
    setExpandedDays((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: pkg?.title || "Maqam Travel Package",
          text: pkg?.description,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Package link copied to clipboard!");
    }
  };

  // Image Gallery Preparation
  const galleryImages = useMemo(() => {
    if (!pkg) return [];
    if (Array.isArray(pkg.images) && pkg.images.length > 0) return pkg.images;
    if (pkg.image) return [pkg.image];
    return [
      "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80",
    ];
  }, [pkg]);

  // Primary numerical price
  const basePrice = pkg?.sellPrice || 0;
  const originalPrice = Math.round(basePrice * 1.12);
  const discountAmount = originalPrice - basePrice;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070c18] flex flex-col">
        <CommonHeader />
        <div className="flex-1 flex flex-col items-center justify-center py-24">
          <LumaSpin
            size="xl"
            variant="brand"
            showProgress={true}
            text="Loading package details..."
            subtext="Fetching live package itinerary and room options..."
          />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070c18] flex flex-col">
        <CommonHeader />
        <div className="flex-1 max-w-xl mx-auto px-4 py-28 text-center">
          <div className="p-8 rounded-3xl bg-white dark:bg-[#0f172a] shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center mx-auto mb-4">
              <Info size={32} />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">
              Package Not Found
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              {error ||
                "The requested package could not be retrieved from the database."}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => navigate("/package-page")}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition"
              >
                Back to All Packages
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fa] dark:bg-[#070c18] text-slate-900 dark:text-slate-100 flex flex-col">
      <CommonHeader />

      {/* ============================================================ */}
      {/* TOP SEARCH / BREADCRUMB BAR (MakeMyTrip Style) */}
      {/* ============================================================ */}
      <div className="bg-[#0b1c39] text-white py-3 px-4 shadow-sm border-b border-slate-800">
        <div className="max-w-[1280px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Link
              to="/package-page"
              className="flex items-center gap-1 text-slate-300 hover:text-white font-semibold transition"
            >
              <ArrowLeft size={14} />
              <span>All Packages</span>
            </Link>
            <span className="text-slate-500">/</span>
            <span className="text-emerald-400 font-bold">
              {pkg.destination}
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-300 truncate max-w-[200px] sm:max-w-xs">
              {pkg.title}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-slate-300">
            <div>
              <span className="text-slate-400 uppercase text-[10px] font-bold block">
                Starting From
              </span>
              <span className="font-semibold text-white">Delhi (DEL)</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-700" />
            <div>
              <span className="text-slate-400 uppercase text-[10px] font-bold block">
                Duration
              </span>
              <span className="font-semibold text-white">
                {pkg.duration || "4 Nights / 5 Days"}
              </span>
            </div>
            <div className="h-6 w-[1px] bg-slate-700" />
            <div>
              <span className="text-slate-400 uppercase text-[10px] font-bold block">
                Availability
              </span>
              <span className="font-semibold text-emerald-400">
                {pkg.availableSlots !== undefined
                  ? `${pkg.availableSlots} Slots Available`
                  : "Instant Confirmation"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MAIN CONTAINER */}
      {/* ============================================================ */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 py-6">
        {/* Title & Badge Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black text-[11px] border border-emerald-200 dark:border-emerald-800">
                Curated Package
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                {pkg.duration || "5 Nights / 6 Days"}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold text-[11px] border border-sky-200 dark:border-sky-800">
                {pkg.destination}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {pkg.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
              {pkg.description}
            </p>
          </div>

          {/* Social / Action buttons */}
          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={() => {
                setIsSaved(!isSaved);
                toast.info(
                  isSaved
                    ? "Removed from saved packages"
                    : "Package saved to your wishlist",
                );
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer"
            >
              <Bookmark
                size={15}
                className={isSaved ? "fill-emerald-500 text-emerald-500" : ""}
              />
              <span>{isSaved ? "Saved" : "Save"}</span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer"
            >
              <Share2 size={15} />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* MAKEMYTRIP PHOTO GALLERY GRID */}
        {/* ============================================================ */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-8 rounded-2xl overflow-hidden">
          {/* Main Large Image (Left - 6 cols) */}
          <div className="md:col-span-6 relative h-[280px] sm:h-[360px] lg:h-[400px] overflow-hidden rounded-2xl group bg-slate-900">
            <img
              src={galleryImages[0]}
              alt={pkg.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
            <button
              onClick={() => setSelectedPhotoIndex(0)}
              className="absolute bottom-4 left-4 px-3.5 py-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white font-extrabold text-xs backdrop-blur-md flex items-center gap-1.5 shadow-md cursor-pointer transition"
            >
              <span>VIEW GALLERY ({galleryImages.length} Photos)</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Highlights Box (Middle - 3 cols) */}
          <div className="md:col-span-3 flex flex-col gap-3">
            <div className="flex-1 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-200/60 dark:bg-amber-900/50 px-2 py-0.5 rounded">
                  Package Highlights
                </span>
                <ul className="mt-3 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {(
                    pkg.inclusions?.slice(0, 4) || [
                      "Flights included",
                      "5-Star Haram-front hotel stay",
                      "Dedicated religious guided ziyarat",
                      "Air-conditioned private transfers",
                    ]
                  ).map((inc, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2
                        size={15}
                        className="text-emerald-500 shrink-0 mt-0.5"
                      />
                      <span className="line-clamp-2">{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => {
                  const section = document.getElementById("itinerary-section");
                  if (section) section.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 mt-3 cursor-pointer"
              >
                <span>VIEW ALL DETAILS</span>
                <ArrowRight size={12} />
              </button>
            </div>

            <div className="relative h-[130px] lg:h-[150px] rounded-2xl overflow-hidden group bg-slate-900">
              <img
                src={galleryImages[1] || galleryImages[0]}
                alt="Package highlight preview"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
            </div>
          </div>

          {/* Sightseeing & Property Photos (Right - 3 cols) */}
          <div className="md:col-span-3 flex flex-col gap-3">
            <div className="relative h-[140px] sm:h-[175px] lg:h-[195px] rounded-2xl overflow-hidden group bg-slate-900">
              <img
                src={galleryImages[2] || galleryImages[0]}
                alt="Activities & Sightseeing"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 text-white text-xs font-bold">
                Activities & Sightseeing
              </div>
            </div>

            <div className="relative h-[140px] sm:h-[175px] lg:h-[195px] rounded-2xl overflow-hidden group bg-slate-900">
              <img
                src={galleryImages[3] || galleryImages[1] || galleryImages[0]}
                alt="Property photos"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 text-white text-xs font-bold">
                Property & Hotel Photos
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* TWO-COLUMN LAYOUT: MAIN CONTENT + STICKY PRICING CARD */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── LEFT COLUMN (8 COLS): TABS & DETAILS ── */}
          <div className="lg:col-span-8 space-y-6">
            {/* STICKY TAB NAVIGATION BAR */}
            <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-1.5 shadow-md flex items-center gap-1 overflow-x-auto">
              {[
                { id: "itinerary", label: "ITINERARY", icon: Clock3 },
                { id: "hotels", label: "HOTELS & FLIGHTS", icon: Hotel },
                { id: "inclusions", label: "INCLUSIONS", icon: CheckCircle2 },
                {
                  id: "policies",
                  label: "POLICIES & TERMS",
                  icon: ShieldCheck,
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all whitespace-nowrap cursor-pointer
                      ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }
                    `}
                  >
                    <Icon size={15} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* INCLUDED IN THIS PACKAGE FEATURE CARDS */}
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-xs uppercase tracking-widest font-black text-slate-400 mb-3">
                Included in this package
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 flex items-center justify-center shrink-0">
                    <Plane size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">
                      Flights Included
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Round-trip Economy
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center shrink-0">
                    <Hotel size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">
                      5-Star Stays
                    </p>
                    <p className="text-[10px] text-slate-400">Close to Haram</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                    <Car size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">
                      Private Transfers
                    </p>
                    <p className="text-[10px] text-slate-400">AC Cabs</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shrink-0">
                    <Users size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">
                      Guided Ziyarat
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Certified Scholars
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center shrink-0">
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">
                      Visa & Insurance
                    </p>
                    <p className="text-[10px] text-slate-400">
                      E-Visa assistance
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-600 flex items-center justify-center shrink-0">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">
                      24x7 Onground
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Dedicated Support
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* TAB CONTENT: ITINERARY */}
            {(activeTab === "itinerary" || activeTab === "all") && (
              <section
                id="itinerary-section"
                className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      Day-by-Day Detailed Itinerary
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Comprehensive plan loaded live from the database for your
                      journey.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const allExpanded =
                        Object.values(expandedDays).every(Boolean);
                      const updated = {};
                      (pkg.itinerary || []).forEach((_, idx) => {
                        updated[idx] = !allExpanded;
                      });
                      setExpandedDays(updated);
                    }}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {Object.values(expandedDays).every(Boolean)
                      ? "Collapse All"
                      : "Expand All"}
                  </button>
                </div>

                {/* Timeline */}
                <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 dark:border-slate-800 ml-3">
                  {(pkg.itinerary && pkg.itinerary.length > 0
                    ? pkg.itinerary
                    : [
                        {
                          day: 1,
                          description:
                            "Arrival at destination and private transfer to luxury hotel.",
                        },
                        {
                          day: 2,
                          description:
                            "Full spiritual exploration, prayers, and orientation.",
                        },
                        {
                          day: 3,
                          description:
                            "Guided ziyarat of sacred historical monuments.",
                        },
                        {
                          day: 4,
                          description:
                            "Personal worship, shopping, and international departure.",
                        },
                      ]
                  ).map((item, idx) => {
                    const isExpanded = expandedDays[idx] !== false;
                    return (
                      <div key={idx} className="relative group">
                        {/* Dot indicator */}
                        <div className="absolute -left-[33px] top-1.5 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white dark:border-[#0f172a] shadow-sm" />

                        {/* Card */}
                        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 transition hover:border-emerald-500/40">
                          <button
                            onClick={() => toggleDay(idx)}
                            className="w-full flex items-center justify-between text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-xs font-extrabold">
                                Day {item.day || idx + 1}
                              </span>
                              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {item.description?.split(".")[0] ||
                                  `Day ${idx + 1} Schedule`}
                              </h3>
                            </div>
                            <ChevronDown
                              size={18}
                              className={`text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </button>

                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                              <p>{item.description}</p>
                              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                  <Hotel size={12} className="text-amber-500" />
                                  Stay Included
                                </span>
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                  <Car size={12} className="text-emerald-500" />
                                  Transfer Included
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* TAB CONTENT: HOTELS & FLIGHTS */}
            {(activeTab === "hotels" || activeTab === "all") && (
              <section className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Hotel & Flight Components
                </h2>

                {/* Hotel Component */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-600 dark:text-amber-400 mb-2">
                    <Hotel size={16} />
                    <span>Included Accommodation</span>
                  </div>

                  {pkg.hotels && pkg.hotels.length > 0 ? (
                    pkg.hotels.map((h, i) => (
                      <div
                        key={i}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2 border-b border-slate-200/60 dark:border-slate-800 last:border-0"
                      >
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {h.hotelName}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                            <MapPin size={13} className="text-slate-400" />
                            <span>
                              {h.destination} •{" "}
                              {h.roomType || "Deluxe City View"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: h.starRating || 5 }).map(
                            (_, si) => (
                              <Star
                                key={si}
                                size={14}
                                fill="#ff9800"
                                strokeWidth={0}
                                className="text-[#ff9800]"
                              />
                            ),
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      <p className="font-bold text-slate-800 dark:text-white">
                        Pullman Zamzam / Hilton Suites
                      </p>
                      <p className="text-slate-500 mt-0.5">
                        5-Star Luxury Stay within Haram Courtyard with daily
                        buffet breakfast.
                      </p>
                    </div>
                  )}
                </div>

                {/* Flight Component */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-sky-600 dark:text-sky-400 mb-2">
                    <Plane size={16} />
                    <span>Included Flights</span>
                  </div>

                  {pkg.flights && pkg.flights.length > 0 ? (
                    pkg.flights.map((f, i) => (
                      <div
                        key={i}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2 border-b border-slate-200/60 dark:border-slate-800 last:border-0"
                      >
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {f.airline} ({f.flightNumber})
                          </h4>
                          <p className="text-xs text-slate-500 mt-1">
                            {f.origin} → {f.destination} •{" "}
                            {f.cabinClass || "Economy"} Class
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs">
                          Confirmed Stock
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      <p className="font-bold text-slate-800 dark:text-white">
                        Direct Return Airline Tickets
                      </p>
                      <p className="text-slate-500 mt-0.5">
                        Includes Saudia / Air India with 30kg check-in baggage
                        and 7kg cabin baggage.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* TAB CONTENT: INCLUSIONS */}
            {(activeTab === "inclusions" || activeTab === "all") && (
              <section className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Package Inclusions & Features
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    pkg.inclusions || [
                      "Return flight tickets with all taxes included",
                      "Luxury 5-star hotel accommodation",
                      "Daily international breakfast buffet",
                      "Full historical ziyarat with verified scholars",
                      "VIP air-conditioned transport & Haramain high-speed train",
                      "Complete visa issuance and insurance coverage",
                    ]
                  ).map((inc, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                    >
                      <Check
                        size={16}
                        className="text-emerald-500 shrink-0 mt-0.5"
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {inc}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* TAB CONTENT: POLICIES */}
            {(activeTab === "policies" || activeTab === "all") && (
              <section className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Policies & Booking Terms
                </h2>
                <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <h4 className="font-bold text-slate-800 dark:text-white mb-1">
                      Cancellation Policy
                    </h4>
                    <p>
                      Free cancellation up to 15 days prior to departure. 50%
                      refund between 7 to 14 days. Non-refundable within 7 days
                      of travel date.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <h4 className="font-bold text-slate-800 dark:text-white mb-1">
                      Visa & Documentation
                    </h4>
                    <p>
                      Passport must have minimum 6 months validity from
                      departure date. E-Visa copy and travel insurance documents
                      will be emailed 72 hours prior to travel.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <h4 className="font-bold text-slate-800 dark:text-white mb-1">
                      Dynamic Customization
                    </h4>
                    <p>
                      You can upgrade your flights, hotels, room occupancy, and
                      opt for private guide add-ons during the live customizer
                      step.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* ── RIGHT COLUMN (4 COLS): STICKY PRICING WIDGET (MakeMyTrip Style) ── */}
          <div className="lg:col-span-4 sticky top-20 space-y-4">
            <div className="p-6 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
              {/* Savings Ribbon */}
              <div className="absolute top-0 right-0 px-4 py-1 rounded-bl-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-extrabold text-[11px] shadow-sm flex items-center gap-1">
                <Percent size={13} />
                <span>12% SPECIAL SAVINGS</span>
              </div>

              {/* Price Details */}
              <div className="pt-2">
                <span className="text-xs font-semibold text-slate-400 line-through">
                  ₹ {originalPrice.toLocaleString()}
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                    ₹ {basePrice.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    / Adult
                  </span>
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                  You save ₹ {discountAmount.toLocaleString()} on this Maqam
                  deal!
                </p>
              </div>

              {/* Deposit Banner */}
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <BadgeCheck size={18} className="text-emerald-600 shrink-0" />
                <span>
                  Lock this package reservation with zero risk deposit.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 space-y-3">
                {/* Primary Button */}
                <button
                  onClick={(e) => {
                    clickSquash(e.currentTarget);
                    setCustomizerStep("booking");
                    setOpenCustomizer(true);
                  }}
                  className="
                    w-full
                    py-3.5
                    px-4
                    rounded-2xl
                    bg-gradient-to-r
                    from-[#ff7a00]
                    to-[#ff9800]
                    hover:from-[#ed6c00]
                    hover:to-[#f57c00]
                    text-white
                    font-black
                    text-sm
                    shadow-lg
                    shadow-orange-500/25
                    transition-all
                    duration-200
                    flex
                    items-center
                    justify-center
                    gap-2
                    cursor-pointer
                  "
                >
                  <span>BOOK NOW</span>
                  <ArrowRight size={17} strokeWidth={2.5} />
                </button>
              </div>

              {/* Guarantee highlights */}
              <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Verified All-Inclusive Travel Plan</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>100% Halal-certified travel arrangements</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Direct API confirmation from live stock</span>
                </div>
              </div>
            </div>

            {/* Coupons & Deals Card (MakeMyTrip Style) */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-black uppercase text-purple-600 bg-purple-100 dark:bg-purple-950 px-2 py-0.5 rounded">
                Coupons & Offers
              </span>
              <h4 className="text-xs font-bold text-slate-800 dark:text-white mt-2">
                Use Code: MAQAMSPECIAL
              </h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Get instant ₹1,500 off on bookings of 2 or more travellers.
                Applied at checkout.
              </p>
            </div>

            {/* Need Help Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md flex items-center justify-between">
              <div>
                <p className="text-xs font-bold">Have questions?</p>
                <p className="text-[11px] text-slate-300">
                  Speak with our Umrah/Travel specialist
                </p>
              </div>
              <a
                href="tel:1800123456"
                className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition shadow"
              >
                <PhoneCall size={16} />
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* FLOATING "BOOK THIS PACKAGE" BUTTON */}
      {/* ============================================================ */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={(e) => {
            clickSquash(e.currentTarget);
            setCustomizerStep("booking");
            setOpenCustomizer(true);
          }}
          className="
            px-5
            py-3
            rounded-full
            bg-emerald-600
            hover:bg-emerald-700
            text-white
            font-black
            text-xs
            sm:text-sm
            shadow-2xl
            shadow-emerald-600/50
            flex
            items-center
            gap-2
            cursor-pointer
            border-2
            border-white/30
            hover:scale-105
            transition-all
          "
        >
          <Calendar size={17} />
          <span>Book This Package</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* DYNAMIC CUSTOMIZER MODAL (OPTION A) */}
      {/* ============================================================ */}
      {openCustomizer && (
        <CustomPackageBuilder
          open={openCustomizer}
          onClose={() => setOpenCustomizer(false)}
          packageId={pkg?._id || pkg?.id}
          initialPackage={pkg}
          initialStep={customizerStep}
          onBookingCreated={() => {
            toast.success("Package booking successful!");
          }}
        />
      )}

      {/* Photo Lightbox */}
      {selectedPhotoIndex !== null && (
        <div
          onClick={() => setSelectedPhotoIndex(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full bg-black rounded-2xl overflow-hidden"
          >
            <img
              src={galleryImages[selectedPhotoIndex]}
              alt="Gallery Preview"
              className="w-full max-h-[80vh] object-contain mx-auto"
            />
            <div className="p-4 bg-slate-900 flex items-center justify-between text-white text-xs">
              <span>
                Photo {selectedPhotoIndex + 1} of {galleryImages.length}
              </span>
              <div className="flex gap-2">
                {galleryImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedPhotoIndex(i)}
                    className={`w-2.5 h-2.5 rounded-full ${selectedPhotoIndex === i ? "bg-emerald-400" : "bg-slate-600"}`}
                  />
                ))}
              </div>
              <button
                onClick={() => setSelectedPhotoIndex(null)}
                className="px-3 py-1 bg-white/20 rounded-lg hover:bg-white/30"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default PackageDetail;
