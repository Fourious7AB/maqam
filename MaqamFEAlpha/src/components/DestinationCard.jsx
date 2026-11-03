import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Star,
  Clock,
  MapPin,
  ArrowRight,
  Heart,
  Sparkles,
  Shield,
} from "lucide-react";

const DestinationCard = ({
  item,
  variant = "default",
  fluid = false,
  searchId,
}) => {
  const navigation = useNavigate();

  const detailId = item?.id || item?._id || item?.hotelId || item?.slug;
  const cardTitle =
    item?.title || item?.name || item?.hotelName || "Destination";
  const cardSubtitle =
    item?.duration || item?.stay || item?.durationText || "Flexible itinerary";
  const rawPrice =
    item?.fromPrice?.perNightPrice ??
    item?.sellPrice ??
    item?.price ??
    item?.priceRange ??
    item?.startingPrice ??
    item?.amount ??
    "Contact us";

  const displayPrice = useMemo(() => {
    if (typeof rawPrice === "number") {
      const curr =
        item?.fromPrice?.currency === "INR" || !item?.fromPrice?.currency
          ? "₹"
          : `${item.fromPrice.currency} `;
      return `${curr}${rawPrice.toLocaleString("en-IN")}`;
    }
    if (typeof rawPrice === "string" && rawPrice.trim()) {
      return rawPrice.startsWith("₹") ? rawPrice : `₹${rawPrice}`;
    }
    return "Contact us";
  }, [rawPrice, item?.fromPrice?.currency]);

  const cardLocation = item?.location || item?.city || item?.country || "";
  const cardRating = item?.rating || "4.9";
  const cardImage =
    item?.image ||
    item?.imageUrl ||
    item?.thumbnail ||
    item?.photo ||
    item?.main_photo ||
    item?.mainPhoto ||
    item?.imageUrls?.[0] ||
    "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?q=80&w=800";

  const handleViewDetails = (event) => {
    event?.stopPropagation();
    if (detailId) {
      navigation(`/details/${detailId}`, {
        state: {
          searchId: searchId || undefined,
          hotel: item,
          item: item,
        },
      });
    }
  };

  // Default variant — modern, authentic hotel card without artificial slop
  if (variant === "default") {
    return (
      <div
        className={`${
          fluid
            ? "w-full"
            : "min-w-[240px] max-w-[240px] sm:min-w-[270px] sm:max-w-[275px]"
        } relative overflow-hidden rounded-2xl group transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl h-full`}
        onClick={handleViewDetails}
      >
        {/* ── Hotel Image ── */}
        <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
          <img
            src={cardImage}
            alt={cardTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              e.currentTarget.src =
                "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?q=80&w=800";
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

          {/* Star Rating Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white bg-black/60 backdrop-blur-md shadow-xs">
            <Star size={11} className="fill-amber-400 text-amber-400" />
            <span>{Number(cardRating || 4.8).toFixed(1)}</span>
          </div>

          {/* Wishlist Heart */}
          <button
            type="button"
            className="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-black/65 backdrop-blur-md text-white hover:text-rose-400 transition-transform active:scale-90 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
            }}
            aria-label="Save to favorites"
          >
            <Heart size={14} />
          </button>
        </div>

        {/* ── Hotel Info Body ── */}
        <div className="p-4 flex flex-col flex-1 justify-between bg-white dark:bg-slate-900">
          <div>
            {/* Location Pill */}
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold mb-1.5">
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">{cardLocation || "Saudi Arabia"}</span>
            </div>

            {/* Hotel Title */}
            <h3 className="font-bold text-slate-900 dark:text-white text-[15px] sm:text-base leading-snug line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors mb-2">
              {cardTitle}
            </h3>

            {/* Room / Stay note if available */}
            {cardSubtitle && !cardSubtitle.toLowerCase().includes("flexible") && (
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
                {cardSubtitle}
              </p>
            )}
          </div>

          {/* Price & Action Footer */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">
                Starting From
              </span>
              <p className="text-base sm:text-lg font-extrabold text-emerald-700 dark:text-emerald-400 leading-tight">
                {displayPrice}
              </p>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                per night
              </span>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition shadow-sm cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetails(e);
              }}
            >
              <span>View Details</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List variant — clean hotel list card
  if (variant === "list") {
    return (
      <div
        className="max-w-[600px] w-full rounded-2xl flex flex-col cursor-pointer overflow-hidden transition-all duration-400 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,187,146,0.15)] bg-white"
        style={{
          border: "1px solid #E5E7EB",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
        }}
        onClick={handleViewDetails}
      >
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={cardImage}
            alt={cardTitle}
            className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
          />
          <button
            className="absolute top-3 right-3 p-2 rounded-full transition bg-black/40 backdrop-blur-md border border-white/20 hover:bg-black/60"
            onClick={(e) => e.stopPropagation()}
            aria-label="Save to favorites"
          >
            <Heart
              size={16}
              className="text-white hover:text-rose-400 transition"
            />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-gray-900 text-[16px] font-bold line-clamp-2 leading-snug mb-2">
            {cardTitle}
          </h3>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-0.5 text-amber-400">
              {[...Array(4)].map((_, i) => (
                <Star key={i} size={12} fill="currentColor" stroke="none" />
              ))}
              <Star size={12} className="text-gray-300" />
            </div>
            <span className="text-xs text-gray-500 font-medium">({cardRating})</span>
          </div>
          <div className="space-y-1.5 mb-4">
            <div className="flex items-center gap-2 text-gray-600 text-xs font-medium">
              <Clock size={13} className="text-emerald-600" />
              <span>{cardSubtitle}</span>
            </div>
            {cardLocation && (
              <div className="flex items-center gap-2 text-gray-600 text-xs font-medium">
                <MapPin size={13} className="text-emerald-600" />
                <span>{cardLocation}</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                From
              </span>
              <div className="text-lg font-extrabold text-emerald-700">
                {displayPrice}
              </div>
            </div>
            <button className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:shadow-md transition active:scale-95 cursor-pointer">
              View Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default DestinationCard;
