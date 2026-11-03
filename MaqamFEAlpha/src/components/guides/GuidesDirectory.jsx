import { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import anime from "animejs";
import { staggerEntrance, clickSquash } from "../../animations/presets";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Languages,
  MapPin,
  Search,
  Star,
  Users,
  Compass,
  Clock,
  Wrench,
  Sparkles,
  ShieldCheck,
  BookOpen,
  Calendar,
  Award,
} from "lucide-react";
import CommonHeader from "../CommonHeader";
import Footer from "../Footer";
import Heroimage2 from "../../assets/hero-slider/slide2-madinah-prophet-mosque.jpg";
import { instructorApi } from "../../services/instructorService";

const categoryLabel = (slug) =>
  String(slug || "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const LANGUAGES = [
  "Arabic",
  "English",
  "Urdu",
  "Hindi",
  "Turkish",
  "Malay",
  "Indonesian",
  "French",
  "Bengali",
];

const CITIES = ["Makkah", "Madinah", "Jeddah", "Riyadh", "Taif"];

const fallbackAvatar =
  "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

export default function GuidesDirectory() {
  const [destination, setDestination] = useState("");
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState("");
  const [page, setPage] = useState(1);

  const [categories, setCategories] = useState([]);
  const [result, setResult] = useState({ guides: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const compassIconRef = useRef(null);

  // Entrance animation & floating icon animation matching /food
  useEffect(() => {
    staggerEntrance(".guide-banner-card", { stagger: 70, startDelay: 100 });
    if (compassIconRef.current) {
      anime({
        targets: compassIconRef.current,
        translateY: [-4, 4],
        duration: 1500,
        direction: "alternate",
        loop: true,
        easing: "easeInOutSine",
      });
    }
  }, []);

  // Live category chips from GET /api/v1/instructor/categories.
  useEffect(() => {
    let active = true;
    instructorApi
      .listCategories()
      .then((data) => active && setCategories(data))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Guide search — GET /api/v1/instructor with filters + pagination.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    instructorApi
      .listGuides({ destination, category, language, page, limit: 9 })
      .then((data) => {
        if (!active) return;
        setResult(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || "Failed to load guides");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [destination, category, language, page]);

  const pagination = result.pagination;
  const guides = useMemo(() => result.guides, [result.guides]);

  const resetPage = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#fbfaf7] font-poppins text-slate-900">
      <CommonHeader />
      <main className="pt-[72px]">
        {/* ── Hero Dark Overlay with Title matching /food ── */}
        <section className="relative overflow-hidden bg-[#123d38] h-[380px] sm:h-[420px] text-white">
          <img
            src={Heroimage2}
            alt="Madinah mosque courtyard"
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70 flex flex-col items-center justify-center text-center px-4 pt-10">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/90 text-white font-bold text-xs uppercase tracking-wider mb-3 shadow-md backdrop-blur-xs">
              <Wrench className="w-3.5 h-3.5" />
              Under Development
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-md">
              Certified Guides & Ziyarat Companions
            </h1>
            <p className="text-xs sm:text-sm text-gray-200 mt-2 max-w-xl drop-shadow-xs">
              We are engineering a verified, scholar-led Ziyarat and local guide booking experience for your sacred pilgrimage in Makkah, Madinah, and historical heritage sites.
            </p>
          </div>
        </section>

        {/* ── Under Development / Feature In Progress Floating Banner Card (Same as /food) ── */}
        <div className="relative z-40 -mt-24 mb-14 w-[95%] max-w-6xl mx-auto px-2 sm:px-4">
          <div className="w-full bg-white dark:bg-[#0f172a] rounded-3xl p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-gray-100 dark:border-slate-800 relative overflow-hidden">
            <div className="guide-banner-card relative z-30 mb-6 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/70 to-teal-50/80 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 border border-amber-200/80 dark:border-slate-700 text-center shadow-xs">
              <div
                ref={compassIconRef}
                className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-amber-500/20"
              >
                <Compass className="w-7 h-7" />
              </div>

              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100/90 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-300 font-extrabold text-xs tracking-wider uppercase mb-2">
                <Clock className="w-3.5 h-3.5" />
                Feature In Progress
              </span>

              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
                Local Guide & Ziyarat Booking is Coming Soon!
              </h2>

              <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed mb-5">
                Online guide and religious companion booking is currently under active development. You will soon be able to book verified multilingual scholars, historic Ziyarat walking tours, and Umrah step-by-step mentors directly through Maqam.
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

            {/* ── Background Preview Layout (Blurred and Protected against Accidental Booking) ── */}
            <div className="opacity-60 pointer-events-none select-none filter blur-[0.3px] relative pb-6">
              {/* Filters */}
              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <MapPin size={13} /> Destination
                  </span>
                  <select
                    value={destination}
                    onChange={(event) =>
                      resetPage(setDestination)(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                  >
                    <option value="">All cities</option>
                    {CITIES.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <BadgeCheck size={13} /> Category
                  </span>
                  <select
                    value={category}
                    onChange={(event) =>
                      resetPage(setCategory)(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                  >
                    <option value="">All categories</option>
                    {(categories.length
                      ? categories.map((item) => ({
                          value: item.category,
                          label: `${categoryLabel(item.category)} (${item.activeGuidesCount})`,
                        }))
                      : []
                    ).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <Languages size={13} /> Language
                  </span>
                  <select
                    value={language}
                    onChange={(event) =>
                      resetPage(setLanguage)(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                  >
                    <option value="">Any language</option>
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Results */}
              {loading ? (
                <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white"
                    />
                  ))}
                </div>
              ) : error ? (
                <div className="mt-8 rounded-2xl border border-red-100 bg-red-50 p-10 text-center text-sm font-semibold text-red-600">
                  {error}
                </div>
              ) : guides.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center">
                  <Search size={28} className="mx-auto text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    No guides match your filters yet.
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Try a different city, category or language.
                  </p>
                </div>
              ) : (
                <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {guides.map((guide) => (
                    <article
                      key={guide._id}
                      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={guide.avatar || fallbackAvatar}
                          alt={guide.fullName}
                          className="h-14 w-14 shrink-0 rounded-xl object-cover"
                          onError={(event) => {
                            event.currentTarget.src = fallbackAvatar;
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="truncate text-base font-bold text-slate-900">
                              {guide.fullName}
                            </h3>
                            {guide.verified && (
                              <BadgeCheck
                                size={16}
                                className="shrink-0 text-emerald-600"
                              />
                            )}
                          </div>
                          <p className="truncate text-xs font-semibold text-amber-700">
                            {categoryLabel(guide.primaryCategory)}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                            <MapPin size={12} />
                            {(guide.destinations || []).slice(0, 2).join(", ") ||
                              "Saudi Arabia"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                        <span className="flex items-center gap-1 font-bold text-amber-600">
                          <Star
                            size={13}
                            className="fill-amber-400 stroke-amber-400"
                          />
                          {Number(guide.rating || 5).toFixed(1)}
                        </span>
                        <span>•</span>
                        <span>{guide.reviewCount || 12} reviews</span>
                        <span>•</span>
                        <span className="truncate">
                          {(guide.languages || ["Arabic", "English"]).join(", ")}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <div>
                          <p className="text-xs text-slate-400">Starting from</p>
                          <p className="text-sm font-bold text-emerald-700">
                            SAR {Number(guide.hourlyRate || 150).toLocaleString()}/hr
                          </p>
                        </div>
                        <span className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white opacity-80">
                          View profile
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && !loading && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-semibold text-slate-500">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= pagination.totalPages}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 opacity-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Upcoming Guide & Ziyarat Services Feature Showcase (Matching /food) ── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-4">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-widest text-emerald-700 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              What to Expect
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Upcoming Guide & Ziyarat Services
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Designed to enrich your spiritual pilgrimage with authentic historical knowledge and peace of mind.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <Award className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900 text-sm mb-1.5">
                Certified Scholars & Historians
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Licensed guides with deep theological and historical expertise in Makkah, Madinah, Badr, and Uhud.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
                <Languages className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900 text-sm mb-1.5">
                Multilingual Companions
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Fluency in English, Urdu, Hindi, Arabic, Bengali, Turkish, and Malay for effortless communication.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900 text-sm mb-1.5">
                Private Family & Group Tours
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Tailored pacing for elders, children, and families with personalized stops and private transportation.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900 text-sm mb-1.5">
                Transparent Hourly & Day Rates
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                No hidden tips or surprise fees. Clear upfront pricing with verified ratings and instant confirmation.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
