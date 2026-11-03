import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plane } from "lucide-react";

const FALLBACK_FLIGHT_IMAGE =
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop";

// Animation variants for Framer Motion
const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      when: "beforeChildren",
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

// Helper component for the bottom info items
const InfoItem = ({ label, value, align = "center" }) => {
  const alignClass =
    align === "left"
      ? "items-start text-left"
      : align === "right"
      ? "items-end text-right"
      : "items-center text-center";

  return (
    <motion.div
      variants={itemVariants}
      className={`flex flex-col min-w-0 ${alignClass}`}
    >
      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </span>
      <span
        className="mt-0.5 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate w-full"
        title={value}
      >
        {value}
      </span>
    </motion.div>
  );
};

export const FlightCard = ({
  imageUrl,
  airline,
  flightCode,
  flightClass,
  departureCode,
  departureCity,
  departureTime,
  arrivalCode,
  arrivalCity,
  arrivalTime,
  duration,
  price,
  originalPrice,
  discountPercentage,
  onClick,
  className = "",
}) => {
  const [imgSrc, setImgSrc] = useState(imageUrl || FALLBACK_FLIGHT_IMAGE);

  useEffect(() => {
    setImgSrc(imageUrl || FALLBACK_FLIGHT_IMAGE);
  }, [imageUrl]);

  const handleKeyDown = (e) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick(e);
    }
  };

  const formattedPrice =
    typeof price === "number" && !isNaN(price)
      ? price.toLocaleString("en-IN")
      : null;
  const formattedOrigPrice =
    typeof originalPrice === "number" && !isNaN(originalPrice)
      ? originalPrice.toLocaleString("en-IN")
      : null;

  return (
    <motion.div
      className={`group w-full font-poppins rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-[0_14px_32px_-6px_rgba(15,23,42,0.14)] hover:border-emerald-500/40 dark:hover:border-emerald-500/35 transition-all duration-300 cursor-pointer select-none flex flex-col justify-between ${className}`}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4, transition: { duration: 0.22 } }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Flight Image (prominent h-40 sm:h-44) */}
      <div className="relative h-40 sm:h-44 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
        <img
          src={imgSrc}
          alt={`View from airplane for flight from ${departureCity} to ${arrivalCity}`}
          onError={() => setImgSrc(FALLBACK_FLIGHT_IMAGE)}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/35 to-transparent" />

        {/* Top badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-black/60 text-white backdrop-blur-xs">
            <Plane className="h-3 w-3 text-sky-300" />
            {airline}
          </span>
        </div>

        {discountPercentage > 0 && (
          <div className="absolute top-2.5 right-2.5 rounded-md bg-[#085c44] text-white px-2 py-0.5 text-[11px] font-bold shadow-md">
            {discountPercentage}% OFF
          </div>
        )}
      </div>

      {/* Flight Details */}
      <div className="p-4 sm:p-4.5 pt-3.5 flex flex-col flex-1 justify-between">
        {/* Main flight path info */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between gap-2"
        >
          <div className="text-left min-w-0">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
              {departureTime}
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight my-0.5">
              {departureCode}
            </p>
            <p
              className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate max-w-[95px]"
              title={departureCity}
            >
              {departureCity}
            </p>
          </div>

          <div className="text-center shrink-0 px-1.5">
            <p className="text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-300 uppercase">
              {flightCode}
            </p>
            <div className="flex items-center justify-center gap-1.5 my-1.5">
              <div className="h-px w-7 bg-slate-200 dark:bg-slate-700" />
              <Plane className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="h-px w-7 bg-slate-200 dark:bg-slate-700" />
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {duration}
            </p>
          </div>

          <div className="text-right min-w-0">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
              {arrivalTime}
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight my-0.5">
              {arrivalCode}
            </p>
            <p
              className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate max-w-[95px] ml-auto"
              title={arrivalCity}
            >
              {arrivalCity}
            </p>
          </div>
        </motion.div>

        {/* Divider */}
        <motion.div
          variants={itemVariants}
          className="border-t border-dashed border-slate-200 dark:border-slate-700/80 my-3"
        />

        {/* Bottom flight metadata */}
        <div className="grid grid-cols-3 gap-2 pt-0.5">
          <InfoItem label="Airline" value={airline} align="left" />
          <InfoItem label="Flight Code" value={flightCode} align="center" />
          <InfoItem label="Class" value={flightClass} align="right" />
        </div>

        {/* Price & Booking Footer */}
        {formattedPrice && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                ₹{formattedPrice}
              </span>
              {formattedOrigPrice && (
                <span className="text-xs text-slate-400 dark:text-slate-500 line-through">
                  ₹{formattedOrigPrice}
                </span>
              )}
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                / traveler
              </span>
            </div>

            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:underline">
              Select →
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default FlightCard;
