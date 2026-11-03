import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin,
  Clock,
  ArrowRight,
  Star,
  Plane,
  Building2,
  Calendar,
} from "lucide-react";
import { parsePackageData, getPackageFallbackImage, FALLBACK_PACKAGE_IMAGE } from "../utils/packageHelper";

const PackageCard = ({ pkg, onSelect, onBookNow }) => {
  const navigate = useNavigate();
  const [activeImageIndex] = useState(0);

  const data = parsePackageData(pkg);
  if (!data) return null;

  const {
    id,
    title,
    destination,
    description,
    formattedPrice,
    formattedOriginalPrice,
    bundleDiscount,
    availableSlots,
    isUrgentSlots,
    durationText,
    travelDates,
    flightInfo,
    hotelInfo,
    images,
    rating,
  } = data;

  const destinationFallback = getPackageFallbackImage(destination, title);
  const currentImage = images?.[activeImageIndex] || images?.[0] || destinationFallback;

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(pkg);
      return;
    }
    if (onBookNow) {
      onBookNow(pkg);
      return;
    }
    if (id) {
      navigate(`/package-detail/${id}`);
    } else {
      navigate("/package-page");
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onClick={handleCardClick}
      className="
        group w-full h-full flex flex-col justify-between
        overflow-hidden rounded-2xl
        border border-slate-200/80 dark:border-slate-800
        bg-white dark:bg-slate-900
        shadow-xs hover:shadow-xl
        hover:border-emerald-500/40 dark:hover:border-emerald-500/35
        transition-all duration-300
        cursor-pointer select-none font-jakarta
      "
    >
      {/* ── Media container ── */}
      <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
        <img
          src={currentImage}
          alt={title}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = destinationFallback;
          }}
        />

        {/* Top-left room / package type badge */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-black/60 text-white backdrop-blur-xs">
            <Building2 className="h-3 w-3 text-emerald-300" />
            {hotelInfo?.roomType || (flightInfo ? "Flight + Hotel" : "Curated Tour")}
          </span>
        </div>

        {/* Top-right rating badge (signature blue/emerald pill from OffersSection) */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <div className="flex items-center gap-1 rounded-full bg-blue-50/95 dark:bg-blue-950/80 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50 shadow-xs backdrop-blur-xs">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span>{Number(rating).toFixed(1)}</span>
          </div>
        </div>

        {/* Bottom-right signature discount badge (21st.dev style from OffersSection) */}
        {bundleDiscount > 0 && (
          <div className="absolute bottom-2.5 right-2.5 z-10 rounded-md bg-[#085c44] text-white px-2.5 py-1 text-xs font-bold shadow-md">
            {bundleDiscount}% OFF
          </div>
        )}

        {/* Bottom-left duration chip */}
        {durationText && (
          <div className="absolute bottom-2.5 left-2.5 z-10">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-black/60 text-emerald-300 backdrop-blur-xs">
              <Clock className="h-3 w-3" />
              {durationText}
            </span>
          </div>
        )}
      </div>

      {/* ── Card Body ── */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between space-y-3">
        {/* Title and Location */}
        <div>
          <h3
            className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors"
            title={title}
          >
            {title}
          </h3>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">{destination}</span>
            {travelDates && (
              <>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="truncate text-slate-400 dark:text-slate-500">{travelDates}</span>
              </>
            )}
          </div>
        </div>

        {/* Rich Specifications Box: Flight & Hotel (Big size layout enhancement) */}
        {(flightInfo || hotelInfo) && (
          <div className="space-y-1.5 bg-slate-50 dark:bg-white/[0.03] p-2.5 rounded-xl border border-slate-100 dark:border-white/5">
            {flightInfo && (
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 min-w-0">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                  <Plane className="h-3 w-3" />
                </span>
                <span className="truncate font-medium">
                  {flightInfo.airline} {flightInfo.flightNumber && `(${flightInfo.flightNumber})`} • {flightInfo.route}
                </span>
              </div>
            )}

            {hotelInfo && (
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 min-w-0">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Building2 className="h-3 w-3" />
                </span>
                <span className="truncate font-medium">
                  {hotelInfo.name} {hotelInfo.roomType && `— ${hotelInfo.roomType}`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {description}
        </p>

        {/* Inventory info */}
        {availableSlots != null && (
          <p
            className={`text-xs font-semibold ${
              isUrgentSlots
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            ✓ {isUrgentSlots ? `Only ${availableSlots} slots remaining` : `${availableSlots} units remaining`}
          </p>
        )}

        {/* Price footer (matching OffersSection with big size CTA) */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-auto flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {formattedPrice}
              </span>
              {formattedOriginalPrice && (
                <span className="text-xs text-slate-400 dark:text-slate-500 line-through">
                  {formattedOriginalPrice}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              / person • all-inclusive
            </span>
          </div>

          <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
            Book
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default PackageCard;
