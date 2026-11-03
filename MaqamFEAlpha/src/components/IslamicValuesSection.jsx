import React, { useRef, useEffect } from "react";
import {
  Landmark,
  UtensilsCrossed,
  Palmtree,
  ShoppingBag,
  MoonStar,
  Compass,
} from "lucide-react";
import islamicVideo from "../assets/a34aa172248a4464838a363e9b1b34a6.HD-1080p-7.2Mbps-87209081.mp4";

const VALUES = [
  {
    id: 1,
    title: "Historic Mosques & Heritage",
    desc: "Explore iconic holy mosques, Islamic heritage landmarks, and sacred history with verified access.",
    tag: "Sacred Heritage",
    icon: Landmark,
  },
  {
    id: 2,
    title: "Halal Food Trails",
    desc: "100% certified halal gastronomy, traditional souq delicacies, and hygienic dining for Muslim families.",
    tag: "Halal Certified",
    icon: UtensilsCrossed,
  },
  {
    id: 3,
    title: "Modesty-Friendly Stays",
    desc: "Private family accommodations, privacy-first environments, and prayer facilities across all retreats.",
    tag: "Family Privacy",
    icon: Palmtree,
  },
  {
    id: 4,
    title: "Traditional Souqs & Art",
    desc: "Authentic oud, attars, handwoven prayer mats, Turkish lanterns, abayas, and timeless Islamic craft.",
    tag: "Cultural Craft",
    icon: ShoppingBag,
  },
  {
    id: 5,
    title: "Spiritual Reflection Routes",
    desc: "Umrah preparation support, guided Ziyarat contemplation, and soul-enriching Islamic guidance.",
    tag: "Spiritual Peace",
    icon: MoonStar,
  },
  {
    id: 6,
    title: "Culture with Pure Values",
    desc: "Experience global culture curated with Muslim values, prayer schedules, and complete peace of mind.",
    tag: "Muslim Friendly",
    icon: Compass,
  },
];

export default function IslamicValuesSection() {
  const sectionRef = useRef(null);
  const desktopVideoRef = useRef(null);
  const tabletVideoRef = useRef(null);
  const mobileVideoRef = useRef(null);
  const hasStartedPlayback = useRef(false);

  // Play video once user reaches this section; remains playing continuously in loop, permanently muted
  useEffect(() => {
    const startPlayback = () => {
      if (hasStartedPlayback.current) return;
      hasStartedPlayback.current = true;

      const triggerPlay = (ref) => {
        if (ref.current) {
          ref.current.muted = true;
          ref.current.play().catch(() => {
            // Browser autoplay safety
          });
        }
      };

      triggerPlay(desktopVideoRef);
      triggerPlay(tabletVideoRef);
      triggerPlay(mobileVideoRef);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          startPlayback();
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-10 xl:px-12 font-poppins bg-white dark:bg-[#070c18] border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-300"
      aria-labelledby="islamic-values-heading"
    >
      <div className="w-full max-w-[1760px] mx-auto">
        {/* ========================================================= */}
        {/* SECTION HEADER                                            */}
        {/* ========================================================= */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <h2
            id="islamic-values-heading"
            className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight"
          >
            Experience Travel Through{" "}
            <span className="text-[#045C45] dark:text-emerald-400">
              Islamic Values
            </span>
          </h2>

          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-2.5 leading-relaxed">
            Curated pilgrimage and family travel adhering to authentic halal
            principles, comfortable accommodations, and spiritual serenity.
          </p>
        </div>

        {/* ========================================================= */}
        {/* 1. DESKTOP LAYOUT (WIREFRAME 1: >= lg screens)             */}
        {/* Center Video flanked by 6 Cards:                          */}
        {/* Row 1: Top 2 Cards                                        */}
        {/* Row 2: Left Card, Center Video, Right Card                */}
        {/* Row 3: Bottom 2 Cards                                     */}
        {/* ========================================================= */}
        <div className="hidden lg:grid grid-cols-[1fr_1.35fr_1.35fr_1fr] gap-4 xl:gap-5 items-stretch">
          {/* ── ROW 1: TOP 2 CARDS (Spans 2 cols each) ── */}
          <div className="col-span-2">
            <ValueCardWide item={VALUES[0]} />
          </div>
          <div className="col-span-2">
            <ValueCardWide item={VALUES[1]} />
          </div>

          {/* ── ROW 2: MIDDLE (Card 3, Center Video, Card 4) ── */}
          {/* Middle Left Card (Card 3) */}
          <div className="col-span-1">
            <ValueCardSquare item={VALUES[2]} />
          </div>

          {/* Central Featured Video (Spans Columns 2 & 3) */}
          <div className="col-span-2 relative rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-xl bg-slate-950 group">
            <video
              ref={desktopVideoRef}
              src={islamicVideo}
              muted
              loop
              playsInline
              preload="auto"
              className="w-full h-full object-cover min-h-[300px] xl:min-h-[340px]"
            />
            {/* Elegant Ambient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

          </div>

          {/* Middle Right Card (Card 4) */}
          <div className="col-span-1">
            <ValueCardSquare item={VALUES[3]} />
          </div>

          {/* ── ROW 3: BOTTOM 2 CARDS (Spans 2 cols each) ── */}
          <div className="col-span-2">
            <ValueCardWide item={VALUES[4]} />
          </div>
          <div className="col-span-2">
            <ValueCardWide item={VALUES[5]} />
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. TABLET LAYOUT (WIREFRAME 2: md to lg screens)          */}
        {/* Left: Vertical Portrait Video                             */}
        {/* Right: 6 Stacked Value Cards                              */}
        {/* ========================================================= */}
        <div className="hidden md:grid lg:hidden grid-cols-12 gap-5 items-stretch">
          {/* Left Column: Portrait Video */}
          <div className="col-span-5 relative rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-lg bg-slate-950">
            <video
              ref={tabletVideoRef}
              src={islamicVideo}
              muted
              loop
              playsInline
              preload="auto"
              className="w-full h-full object-cover min-h-[520px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

          </div>

          {/* Right Column: 6 Stacked Cards */}
          <div className="col-span-7 flex flex-col justify-between gap-3">
            {VALUES.map((item) => (
              <ValueCardStacked key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. MOBILE LAYOUT (< md screens)                           */}
        {/* Video on Top + 6 Cards Below                              */}
        {/* ========================================================= */}
        <div className="md:hidden flex flex-col gap-4">
          {/* Video Player */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md bg-slate-950 aspect-video">
            <video
              ref={mobileVideoRef}
              src={islamicVideo}
              muted
              loop
              playsInline
              preload="auto"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

          </div>

          {/* 6 Stacked Cards */}
          <div className="flex flex-col gap-3">
            {VALUES.map((item) => (
              <ValueCardStacked key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Wide Card used in Desktop Rows 1 and 3
 */
function ValueCardWide({ item }) {
  const Icon = item.icon;
  return (
    <article className="h-full p-5 xl:p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 shadow-xs hover:shadow-md hover:border-emerald-500/50 dark:hover:border-emerald-500/40 transition-all duration-300 flex items-start gap-4 group">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/60 text-[#045C45] dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 group-hover:bg-[#045C45] group-hover:text-white dark:group-hover:bg-emerald-600 transition-colors shrink-0 shadow-2xs">
        <Icon size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="text-sm xl:text-base font-bold text-slate-900 dark:text-white group-hover:text-[#045C45] dark:group-hover:text-emerald-400 transition-colors">
            {item.title}
          </h3>
          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/70 px-2 py-0.5 rounded-md shrink-0">
            {item.tag}
          </span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
          {item.desc}
        </p>
      </div>
    </article>
  );
}

/**
 * Square / Tall Card used in Desktop Middle Row (Cards 3 and 4)
 */
function ValueCardSquare({ item }) {
  const Icon = item.icon;
  return (
    <article className="h-full p-5 xl:p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 shadow-xs hover:shadow-md hover:border-emerald-500/50 dark:hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between group">
      <div>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/60 text-[#045C45] dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 group-hover:bg-[#045C45] group-hover:text-white dark:group-hover:bg-emerald-600 transition-colors mb-3.5 shadow-2xs">
          <Icon size={22} />
        </div>
        <h3 className="text-sm xl:text-base font-bold text-slate-900 dark:text-white group-hover:text-[#045C45] dark:group-hover:text-emerald-400 transition-colors mb-1.5">
          {item.title}
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
          {item.desc}
        </p>
      </div>
      <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-800/60">
        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/70 px-2 py-0.5 rounded-md inline-block">
          {item.tag}
        </span>
      </div>
    </article>
  );
}

/**
 * Stacked Card used in Tablet (Wireframe 2) & Mobile
 */
function ValueCardStacked({ item }) {
  const Icon = item.icon;
  return (
    <article className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 shadow-2xs hover:border-emerald-500/50 dark:hover:border-emerald-500/40 transition-colors flex items-center gap-3.5 group">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/60 text-[#045C45] dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 shrink-0 group-hover:bg-[#045C45] group-hover:text-white transition-colors">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
            {item.title}
          </h3>
          <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/70 px-1.5 py-0.5 rounded shrink-0">
            {item.tag}
          </span>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5">
          {item.desc}
        </p>
      </div>
    </article>
  );
}
