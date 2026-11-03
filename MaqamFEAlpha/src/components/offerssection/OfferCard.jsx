import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Star,
  ArrowRight,
  MapPin,
  Plane,
  Building2,
  Sparkles,
  Calendar,
} from 'lucide-react';

const FALLBACK_FLIGHT_IMG =
  'https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=1200&auto=format&fit=crop';
const FALLBACK_HOTEL_IMG =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop';

/**
 * Format currency with Indian Rupee (INR) or standard locale notation.
 */
function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format human-readable date ranges (e.g. "Aug 26 – Aug 27, 2026").
 */
function formatDateRange(start, end) {
  if (!start && !end) return 'Flexible Dates';
  const s = typeof start === 'object' && start?.$date ? start.$date : start;
  const e = typeof end === 'object' && end?.$date ? end.$date : end;

  try {
    const d1 = s ? new Date(s) : null;
    const d2 = e ? new Date(e) : null;
    if (d1 && isNaN(d1.getTime())) return 'Flexible Dates';
    if (d1 && (!d2 || isNaN(d2.getTime()))) {
      return d1.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (d1 && d2) {
      const startStr = d1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = d2.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${startStr} – ${endStr}`;
    }
  } catch {
    return 'Flexible Dates';
  }
  return 'Flexible Dates';
}

/**
 * Clean up destination strings into clean, readable labels.
 */
function formatDestination(dest) {
  if (!dest) return 'Saudi Arabia';
  // Common airport codes
  const iataMap = {
    DEL: 'New Delhi (DEL)',
    GOI: 'Goa (GOI)',
    JED: 'Jeddah (JED)',
    RUH: 'Riyadh (RUH)',
    MED: 'Madinah (MED)',
    DXB: 'Dubai (DXB)',
    DMM: 'Dammam (DMM)',
    BOM: 'Mumbai (BOM)',
    KOLKATA: 'Kolkata (CCU)',
    'NEW YORK': 'New York (JFK)',
  };
  if (iataMap[dest]) return iataMap[dest];
  // Remove zip codes or redundant country codes for clean display
  return dest.replace(/\b\d{4,6}\b/g, '').replace(/,\s*,/g, ',').trim();
}

/**
 * OfferCard — Production-grade interactive card implementing the PlaceCard design pattern.
 * Features:
 * - Framer Motion interactive image carousel with hover nav & pagination
 * - Top-left category & discount badges with glassmorphism backdrop
 * - Top-right rating badge
 * - Dedicated destination pin icon and date range
 * - Transparent live stock info (units remaining, flight/hotel highlights)
 * - Selling price with strikethrough original price
 * - Smooth spring hover lift and interactive Book Now CTA
 */
export const OfferCard = ({
  offer,
  onBook,
  className = '',
}) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  if (!offer) return null;

  const handleCardClick = () => {
    if (typeof onBook === 'function') {
      onBook(offer);
      return;
    }
    if (offer.itemType === 'flight') {
      const stock = offer.flightRef?.stock || {};
      const dest = stock.destination || offer.destination || 'JED';
      const origin = stock.origin || 'DEL';
      const fareAmount = Number(offer.sellPrice || stock.costPerUnit || 0);
      const departureDate = stock.departureDate || offer.startDate;
      const arrivalDate = stock.arrivalDate || offer.endDate;
      const flightNumber = stock.flightNumber || 'FL-100';
      const airlineCode = flightNumber.includes('-') ? flightNumber.split('-')[0] : flightNumber.slice(0, 2);

      const bookingState = {
        flightId: offer._id,
        cardId: offer._id,
        offerId: offer._id,
        stockId: stock._id,
        isInHouse: true,
        isOffer: true,
        traceId: offer._id,
        resultIndex: 'OB1',
        selectedFareTier: stock.cabinClass || 'Economy',
        isRoundTrip: false,
        passengers: {
          adults: 1,
          children: 0,
          infants: 0,
        },
        selectedTier: {
          id: 'offer-fare',
          title: stock.cabinClass || 'Economy',
          priceMultiplier: 1,
          unitPrice: fareAmount,
          price: fareAmount,
        },
        selectedOffer: offer,
        flight: {
          flightId: offer._id,
          cardId: offer._id,
          offerId: offer._id,
          stockId: stock._id,
          isInHouse: true,
          isOffer: true,
          resultIndex: 'OB1',
          totalAmount: fareAmount,
          segments: [
            {
              origin,
              destination: dest,
              airline: stock.airline || 'Airline',
              airlineCode,
              flightNumber,
              departure: departureDate,
              arrival: arrivalDate,
              cabinClass: stock.cabinClass || 'Economy',
            },
          ],
        },
      };

      try {
        sessionStorage.setItem('selectedFlightBooking', JSON.stringify(bookingState));
        localStorage.setItem('selectedFlightBooking', JSON.stringify(bookingState));
      } catch (e) {
        console.warn('Storage warning:', e);
      }

      navigate('/fare-quote-details', { state: bookingState });
    } else {
      const offerId = offer._id;
      try {
        sessionStorage.setItem('selectedOfferId', offerId);
        sessionStorage.setItem('selectedHotel', JSON.stringify(offer));
      } catch {}
      navigate(`/booking-details/${offerId}`, {
        state: { hotelId: offerId, offerId, selectedOffer: offer, isOffer: true, item: offer },
      });
    }
  };

  // Resolve images array
  const rawImages = Array.isArray(offer.images) && offer.images.length > 0 ? offer.images : [];
  const defaultImage = offer.itemType === 'flight' ? FALLBACK_FLIGHT_IMG : FALLBACK_HOTEL_IMG;
  const images = rawImages.length > 0 ? rawImages : [defaultImage];

  // Carousel navigation
  const changeImage = (newDirection, e) => {
    if (e) e.stopPropagation();
    setDirection(newDirection);
    setCurrentIndex((prevIndex) => {
      const nextIndex = prevIndex + newDirection;
      if (nextIndex < 0) return images.length - 1;
      if (nextIndex >= images.length) return 0;
      return nextIndex;
    });
  };

  const isFlight = offer.itemType === 'flight';
  const hasDiscount = Number(offer.discountPercentage) > 0;
  const destinationText = formatDestination(offer.destination);
  const dateRangeText = formatDateRange(offer.startDate, offer.endDate);

  // Subtitle / stock details
  let metaInfo = '';
  if (isFlight) {
    const airline = offer.flightRef?.stock?.airline || 'Verified Airline';
    const cabin = offer.flightRef?.stock?.cabinClass || 'Economy';
    const seats = offer.availableBookings ?? offer.flightRef?.stock?.availableUnits;
    metaInfo = `${airline} · ${cabin}${seats ? ` · ${seats} seats left` : ''}`;
  } else {
    const room = offer.hotelRef?.stock?.roomType || 'Standard Room';
    const nights = offer.hotelRef?.stock?.totalNights;
    const units = offer.availableBookings ?? offer.hotelRef?.stock?.availableUnits;
    metaInfo = `${room}${nights ? ` · ${nights} Nights` : ''}${units ? ` · ${units} rooms left` : ''}`;
  }

  // Description fallback
  const descriptionText =
    offer.description && offer.description.trim().length > 0
      ? offer.description
      : isFlight
        ? 'Live airline inventory allotment with confirmed seats and transparent fares.'
        : 'Direct property allotment with verified luxury amenities and seamless check-in.';

  // Price calculations
  const sellPrice = Number(offer.sellPrice) || 0;
  const originalPrice = Number(offer.originalPrice) || 0;
  const priceUnit = isFlight ? '/ traveler' : offer.hotelRef?.stock?.totalNights ? '/ stay' : '/ night';

  // Animation variants
  const carouselVariants = {
    enter: (dir) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (dir) => ({
      zIndex: 0,
      x: dir < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  };

  return (
    <div
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      role="button"
      className={`group relative flex flex-col h-full w-full overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:border-emerald-500/40 dark:hover:border-emerald-500/35 hover:shadow-[0_12px_32px_-6px_rgba(16,185,129,0.14)] cursor-pointer font-poppins transition-all duration-300 before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-transparent before:via-emerald-500/70 before:to-transparent before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-300 before:z-20 ${className}`}
    >
      {/* Top Media / Carousel Section */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
        <AnimatePresence initial={false} custom={direction}>
          <motion.img
            key={currentIndex}
            src={images[currentIndex]}
            alt={offer.title || 'Special travel offer'}
            custom={direction}
            variants={carouselVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover select-none"
          />
        </AnimatePresence>

        {/* Carousel Navigation Buttons */}
        {images.length > 1 && (
          <div className="absolute inset-0 hidden md:flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
            <button
              type="button"
              onClick={(e) => changeImage(-1, e)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 hover:bg-black/75 text-white backdrop-blur-xs transition-colors cursor-pointer"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => changeImage(1, e)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 hover:bg-black/75 text-white backdrop-blur-xs transition-colors cursor-pointer"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Top-Left Badges: Category & Discount */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-black/60 text-white backdrop-blur-xs">
            {isFlight ? (
              <Plane className="h-3 w-3 text-sky-300" />
            ) : (
              <Building2 className="h-3 w-3 text-amber-300" />
            )}
            {isFlight ? 'Flight' : 'Hotel'}
          </span>

          {hasDiscount && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-700 text-white shadow-xs">
              <Sparkles className="h-3 w-3 text-emerald-200" />
              {offer.discountPercentage}% OFF
            </span>
          )}
        </div>

        {/* Top-Right Rating Badge */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-black/60 text-white backdrop-blur-xs">
            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
            4.9
          </span>
        </div>

        {/* Bottom Pagination Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                  currentIndex === index ? 'w-3.5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content Section - Uniform alignment and clean typography */}
      <div className="flex flex-col flex-1 p-4 justify-between space-y-2">
        {/* Destination & Date Row */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-normal">
          <div className="flex items-center gap-1 min-w-0 max-w-[62%]">
            <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">{destinationText}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            <span>{dateRangeText}</span>
          </div>
        </div>

        {/* Offer Title */}
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white line-clamp-1 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {offer.title}
          </h3>
        </div>

        {/* Subtitle / Host / Stock Info */}
        <div className="text-xs text-slate-600 dark:text-slate-400 font-normal line-clamp-1">
          {metaInfo}
        </div>

        {/* Description - clean font-normal */}
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-normal min-h-[32px]">
          {descriptionText}
        </p>

        {/* Price & CTA Footer - anchored with mt-auto */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 mt-auto">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {formatCurrency(sellPrice)}
              </span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                {priceUnit}
              </span>
            </div>

            {hasDiscount && originalPrice > sellPrice && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 line-through">
                {formatCurrency(originalPrice)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-colors cursor-pointer"
          >
            <span>Book Now</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfferCard;
