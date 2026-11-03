import React from "react";
import {
  Star,
  MapPin,
  Clock,
  ShieldCheck,
  Languages,
  ArrowRight,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import AnimatedNumber from "../shared/AnimatedNumber";
import { clickSquash } from "../../animations/presets";

export default function GuideCard({ guide, onSelectGuide, onBookSlot }) {
  if (!guide) return null;

  const {
    _id,
    fullName,
    city,
    category,
    languages = [],
    hourlyRate = 150,
    fullDayRate,
    currency = "SAR",
    bio,
    yearsOfExperience = 5,
    avatar,
    badge = "Licensed Guide",
    rating = 5.0,
    reviewsCount = 0,
  } = guide;

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case "umrah-religious":
        return "Umrah & Religious";
      case "ziyarat-historical":
        return "Historical Ziyarat";
      case "city-heritage":
        return "City & Heritage";
      case "desert-adventure":
        return "Desert Adventure";
      default:
        return cat || "Licensed Guide";
    }
  };

  return (
    <div className="guide-card-item group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl hover:border-amber-400/50 dark:hover:border-amber-400/30 transition-all duration-300">
      {/* Top Banner Accent */}
      <div className="h-2 w-full bg-linear-to-r from-emerald-600 via-teal-500 to-amber-500 opacity-80 group-hover:opacity-100 transition-opacity" />

      <div className="p-5 sm:p-6 flex-1 flex flex-col">
        {/* Header: Avatar, Badge, Rating */}
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <img
              src={
                avatar ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
              }
              alt={fullName}
              className="h-18 w-18 sm:h-20 sm:w-20 rounded-2xl object-cover border-2 border-amber-200/60 dark:border-amber-500/30 shadow-md group-hover:scale-105 transition-transform duration-300"
            />
            <span
              title="Verified Authority Licensed Guide"
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm ring-2 ring-white dark:ring-slate-900"
            >
              <CheckCircle2 size={14} />
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                <ShieldCheck size={12} /> {badge}
              </span>
              <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                <span className="text-slate-800 dark:text-slate-100">{rating}</span>
                <span className="text-slate-400 font-normal">({reviewsCount})</span>
              </div>
            </div>

            <h3 className="mt-1.5 font-mirza text-2xl font-bold text-slate-900 dark:text-white leading-tight truncate">
              {fullName}
            </h3>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                <MapPin size={13} /> {city}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={13} /> {yearsOfExperience}+ yrs experience
              </span>
            </div>
          </div>
        </div>

        {/* Category & Languages */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/30">
            {getCategoryLabel(category)}
          </span>
          {languages.slice(0, 3).map((lang) => (
            <span
              key={lang}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300"
            >
              <Languages size={11} className="text-slate-400" /> {lang}
            </span>
          ))}
          {languages.length > 3 && (
            <span className="text-[11px] font-semibold text-slate-400">
              +{languages.length - 3} more
            </span>
          )}
        </div>

        {/* Bio Snippet */}
        <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300 line-clamp-2">
          {bio || "Experienced, certified guide providing comprehensive pilgrimage instruction and sacred tours."}
        </p>

        {/* Pricing Breakdown */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-baseline justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-extrabold text-[#123d38] dark:text-emerald-400">
                <AnimatedNumber value={hourlyRate} suffix={` ${currency}`} />
              </span>
              <span className="text-xs text-slate-400">/ hour</span>
            </div>
            {fullDayRate && (
              <p className="text-[11px] text-slate-400">
                or <AnimatedNumber value={fullDayRate} suffix={` ${currency}`} /> full-day
              </p>
            )}
          </div>
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Calendar size={13} /> Flexible Slots
          </span>
        </div>
      </div>

      {/* Card Action Buttons */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            clickSquash(e.currentTarget);
            onSelectGuide(guide);
          }}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-700 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition shadow-xs cursor-pointer active:scale-95"
        >
          View Profile & Slots
        </button>

        <button
          type="button"
          onClick={(e) => {
            clickSquash(e.currentTarget);
            onBookSlot(guide);
          }}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-linear-to-r from-orange-500 to-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg hover:brightness-105 transition cursor-pointer active:scale-95"
        >
          Book Guide <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
