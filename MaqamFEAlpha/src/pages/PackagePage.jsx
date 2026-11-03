import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Clock3,
  MapPin,
  ArrowRight,
  Star,
  Sparkles,
  ChevronRight,
  Moon,
  Search,
  RefreshCw,
  SlidersHorizontal,
  Compass,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";
import { staggerEntrance, clickSquash } from "../animations/presets";
import HajjPopupModal from "../components/modal/HajjPopupModal";
import UmrahPopupModal from "../components/modal/UmrahPopupModal";
import CustomPackageBuilder from "../components/CustomPackageBuilder";
import CommonHeader from "../components/CommonHeader";
import Footer from "../components/Footer";
import HeroSlider from "../components/shared/HeroSlider";
import packageService from "../services/packageService";
import PackageCard from "../components/PackageCard";

// MAIN PACKAGE PAGE COMPONENT
const PackagePage = () => {
  const [activeTab, setActiveTab] = useState("all"); // "all" | "hajj" | "umrah"
  const [openHajjPopup, setOpenHajjPopup] = useState(false);
  const [openUmrahPopup, setOpenUmrahPopup] = useState(false);

  // Dynamic Packages State
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Customizer Modal State
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [openCustomizer, setOpenCustomizer] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Handle PayPal return query parameters (?token=... or ?status=confirmed&bookingId=... or ?status=cancelled)
  useEffect(() => {
    const status = searchParams.get("status");
    const bookingId = searchParams.get("bookingId");
    const errorMsg = searchParams.get("error");
    const orderId =
      searchParams.get("token") ||
      searchParams.get("orderId") ||
      searchParams.get("paypalOrderId");

    if (status === "cancelled" || searchParams.get("cancel") === "true") {
      const timer = setTimeout(() => {
        toast.info(
          "PayPal payment was cancelled. Your package booking reservation remains held.",
        );
        if (bookingId) {
          setActiveBookingId(bookingId);
          setOpenCustomizer(true);
        }
        setSearchParams({}, { replace: true });
      }, 0);
      return () => clearTimeout(timer);
    }

    if (orderId) {
      navigate(`/payment/paypal/success?type=package&${searchParams.toString()}`, {
        replace: true,
      });
      return;
    }

    if (status === "confirmed" && bookingId) {
      const timer = setTimeout(() => {
        toast.success(
          "Package booking and PayPal payment successfully confirmed!",
        );
        setActiveBookingId(bookingId);
        setOpenCustomizer(true);
        setSearchParams({}, { replace: true });
      }, 0);
      return () => clearTimeout(timer);
    } else if (status === "failed") {
      const timer = setTimeout(() => {
        toast.error(
          errorMsg
            ? decodeURIComponent(errorMsg)
            : "PayPal payment capture failed. Please try again.",
        );
        if (bookingId) {
          setActiveBookingId(bookingId);
          setOpenCustomizer(true);
        }
        setSearchParams({}, { replace: true });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams, setSearchParams, navigate]);

  // Fetch packages directly from MongoDB via backend API
  const loadPackages = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await packageService.getPackages();
      const pkgList =
        data?.packages ||
        data?.data?.packages ||
        data?.data ||
        (Array.isArray(data) ? data : []);

      setPackages(Array.isArray(pkgList) ? pkgList : []);
    } catch (err) {
      console.error("Failed to fetch packages from database:", err);
      setError(
        "Unable to load packages from database. Please verify your backend server is running.",
      );
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPackages();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Animations on card mount
  useEffect(() => {
    if (!loading && packages.length > 0) {
      staggerEntrance(".package-card-item", {
        stagger: 55,
        startDelay: 120,
      });
    }
  }, [loading, packages]);

  // Filtered packages based on search query and category
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        pkg.title?.toLowerCase().includes(q) ||
        pkg.destination?.toLowerCase().includes(q) ||
        pkg.description?.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (activeTab === "hajj") {
        return (
          pkg.destination?.toLowerCase().includes("makkah") ||
          pkg.destination?.toLowerCase().includes("mecca") ||
          pkg.title?.toLowerCase().includes("hajj")
        );
      }
      if (activeTab === "umrah") {
        return (
          pkg.destination?.toLowerCase().includes("madinah") ||
          pkg.destination?.toLowerCase().includes("medina") ||
          pkg.destination?.toLowerCase().includes("makkah") ||
          pkg.destination?.toLowerCase().includes("mecca") ||
          pkg.title?.toLowerCase().includes("umrah")
        );
      }
      return true;
    });
  }, [packages, searchQuery, activeTab]);

  const handleOpenCustomizer = (pkg) => {
    setSelectedPackage(pkg);
    setOpenCustomizer(true);
  };

  const handleViewPackage = (pkg) => {
    const pkgId = pkg?._id || pkg?.id;
    if (pkgId) {
      navigate(`/package-detail/${pkgId}`);
    } else {
      handleOpenCustomizer(pkg);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="relative pb-36 md:pb-24 lg:pb-16">
        <CommonHeader />

        {/* ── Modern Curated Hero Slider ── */}
        <HeroSlider heightClass="h-[460px] sm:h-[500px] md:h-[530px] lg:h-[550px]">
          <div className="flex flex-col items-center justify-center text-center px-4 text-white">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight max-w-2xl drop-shadow-md">
              Curated Travel Packages
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-200 max-w-xl">
              Transparent, halal-certified packages with customizable flights,
              hotels, and local guidance.
            </p>
          </div>
        </HeroSlider>

        {/* Floating Glassmorphism Search Bar */}
        <div className="absolute bottom-12 translate-y-1/2 left-1/2 -translate-x-1/2 w-[92%] max-w-4xl px-2 z-40">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              document.getElementById("packages-catalog-section")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="w-full bg-white/85 dark:bg-[#0f172a]/85 backdrop-blur-md rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] border border-white/60 dark:border-slate-800/80 p-2 sm:p-2.5 flex flex-col sm:flex-row items-center gap-2 sm:gap-3 transition-all"
          >
            <div className="relative w-full flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search packages by destination, title, or keywords (e.g., Makkah, Madinah, Umrah)..."
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition-all cursor-pointer whitespace-nowrap"
            >
              <Search size={16} />
              <span>Search</span>
            </button>
          </form>
        </div>
      </div>

      {/* ====================== PACKAGES CATALOG ========================== */}
      <section id="packages-catalog-section" className="w-full bg-slate-50/50 dark:bg-[#070c18] py-12 transition-colors">
        <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 xl:px-12">


          {/* Header & Filter Controls Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-slate-200/80 dark:border-slate-800">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#062b61] dark:text-white">
                Available Travel Packages
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Showing {filteredPackages.length} active live package{" "}
                {filteredPackages.length === 1 ? "deal" : "deals"}
                {searchQuery ? ` matching "${searchQuery}"` : " with dynamic Option A pricing."}
              </p>
            </div>

            {/* Filter Category Tabs & Refresh */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <button
                onClick={(e) => {
                  clickSquash(e.currentTarget);
                  setActiveTab("all");
                }}
                className={`
                  flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 cursor-pointer
                  ${
                    activeTab === "all"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20"
                      : "text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }
                `}
              >
                <Compass size={16} />
                <span>All Packages</span>
              </button>

              <button
                onClick={(e) => {
                  clickSquash(e.currentTarget);
                  setActiveTab("hajj");
                  setOpenHajjPopup(true);
                }}
                className={`
                  flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 cursor-pointer
                  ${
                    activeTab === "hajj"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20"
                      : "text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }
                `}
              >
                <Moon size={16} />
                <span>Hajj</span>
              </button>

              <button
                onClick={(e) => {
                  clickSquash(e.currentTarget);
                  setActiveTab("umrah");
                  setOpenUmrahPopup(true);
                }}
                className={`
                  flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 cursor-pointer
                  ${
                    activeTab === "umrah"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20"
                      : "text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }
                `}
              >
                <Moon size={16} />
                <span>Umrah</span>
              </button>

              <button
                onClick={(e) => {
                  clickSquash(e.currentTarget);
                  if (packages.length > 0) {
                    handleOpenCustomizer(packages[0]);
                  } else {
                    toast.info("No packages currently available to customize.");
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all cursor-pointer"
              >
                <Sparkles size={16} />
                <span>Customize</span>
              </button>

              <button
                onClick={loadPackages}
                title="Refresh Catalog"
                className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition cursor-pointer"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin text-emerald-500" : ""}
                />
              </button>
            </div>
          </div>

          {/* ===================================================== */}
          {/* PACKAGE CARDS GRID */}
          {/* ===================================================== */}
          <div className="mt-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw
                  size={36}
                  className="animate-spin text-emerald-500"
                />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Fetching packages from database...
                </p>
              </div>
            ) : error ? (
              <div className="text-center py-16 px-4 bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900/40">
                <AlertCircle size={40} className="mx-auto text-red-500 mb-3" />
                <h3 className="text-base font-bold text-red-700 dark:text-red-400">
                  Database Connection Error
                </h3>
                <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1 max-w-sm mx-auto">
                  {error}
                </p>
                <button
                  onClick={loadPackages}
                  className="mt-4 px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition cursor-pointer"
                >
                  Retry Fetching from Database
                </button>
              </div>
            ) : filteredPackages.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
                {filteredPackages.map((pkg, index) => (
                  <div
                    key={pkg._id || pkg.id || index}
                    className="package-card-item w-full flex flex-col h-full"
                  >
                    <PackageCard
                      pkg={pkg}
                      onSelect={handleViewPackage}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 px-4 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800">
                <Compass size={40} className="mx-auto text-slate-400 mb-3" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No packages found in database
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  {packages.length === 0
                    ? "The database currently has no active packages."
                    : 'No packages matched your filter criteria. Try selecting "All Packages" or clearing the search keyword.'}
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveTab("all");
                    loadPackages();
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition cursor-pointer"
                >
                  {packages.length === 0 ? "Refresh Database" : "Clear Filters"}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* MODALS */}
      <HajjPopupModal
        openHajjPopup={openHajjPopup}
        setOpenHajjPopup={setOpenHajjPopup}
        open={false}
        setOpen={() => {}}
        onClose={() => setOpenHajjPopup(false)}
      />

      <UmrahPopupModal
        openUmrahPopup={openUmrahPopup}
        setOpenUmrahPopup={setOpenUmrahPopup}
        open={false}
        setOpen={() => {}}
        onClose={() => setOpenUmrahPopup(false)}
      />

      {/* Dynamic Package Customizer & Booking Modal */}
      <CustomPackageBuilder
        open={openCustomizer}
        onClose={() => {
          setOpenCustomizer(false);
          setActiveBookingId(null);
        }}
        packageId={selectedPackage?._id || selectedPackage?.id}
        initialPackage={selectedPackage}
        initialBookingId={activeBookingId}
        onBookingCreated={() => {
          loadPackages(); // refresh inventory availability after booking
        }}
      />

      {/* Footer */}
      <Footer />
    </>
  );
};

export default PackagePage;
