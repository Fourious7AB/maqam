import React, { useRef, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar, X, Clock, Check } from "lucide-react";

const HotelDatePicker = ({
  open,
  setOpen,
  selectedDate,
  setSelectedDate,
  type,
  minDate,
  checkInDate,
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, setOpen]);

  if (!open) return null;

  const isBookBy = type === "bookBy" || (!type?.includes("checkOut") && !type?.includes("checkIn"));
  const isCheckIn = type === "checkIn";
  const effectiveMinDate = minDate || new Date();

  const handleQuickSelect = (daysOffset) => {
    const base = new Date();
    const target = new Date(base);
    target.setDate(target.getDate() + daysOffset);
    setSelectedDate(target);
    setOpen(false);
  };

  const formattedDate = selectedDate
    ? selectedDate.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  const titleText = isBookBy
    ? "Select Book By Date"
    : isCheckIn
      ? "Select Check-in Date"
      : "Select Check-out Date";

  return (
    <>
      {/* Mobile Backdrop Overlay to eliminate visual overlap */}
      <div
        className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px] z-[9998] sm:hidden animate-in fade-in duration-200"
        onClick={() => setOpen(false)}
      />

      <div
        ref={containerRef}
        className={`
          fixed inset-x-3 top-1/2 -translate-y-1/2 sm:translate-y-0 z-[9999]
          sm:absolute sm:top-full sm:mt-3 sm:inset-x-auto
          w-auto sm:w-[340px] max-w-[340px] mx-auto sm:mx-0
          bg-white dark:bg-slate-900
          border border-slate-200/90 dark:border-slate-800
          rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)]
          p-4 sm:p-5
          animate-in fade-in zoom-in-95 duration-200
          left-0 sm:left-0
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-[#045C45] dark:text-emerald-400">
              <Calendar size={15} strokeWidth={2.5} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {titleText}
              </h4>
              <p className="text-[11px] font-semibold text-[#045C45] dark:text-emerald-400 truncate">
                {formattedDate}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 flex items-center justify-center transition cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          <button
            type="button"
            onClick={() => handleQuickSelect(0)}
            className="px-3 py-1 text-[11px] font-semibold rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition whitespace-nowrap cursor-pointer shadow-2xs"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect(1)}
            className="px-3 py-1 text-[11px] font-semibold rounded-full bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition whitespace-nowrap cursor-pointer shadow-2xs"
          >
            Tomorrow
          </button>
          <button
            type="button"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() + ((5 + 7 - d.getDay()) % 7 || 7));
              setSelectedDate(d);
              setOpen(false);
            }}
            className="px-3 py-1 text-[11px] font-semibold rounded-full bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition whitespace-nowrap cursor-pointer shadow-2xs"
          >
            This Weekend
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect(7)}
            className="px-3 py-1 text-[11px] font-semibold rounded-full bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition whitespace-nowrap cursor-pointer shadow-2xs"
          >
            +1 Week
          </button>
        </div>

        {/* DatePicker Calendar */}
        <div className="hotel-calendar-wrapper flex justify-center">
          <DatePicker
            selected={selectedDate}
            onChange={(date) => {
              if (date) {
                setSelectedDate(date);
                setOpen(false);
              }
            }}
            inline
            minDate={effectiveMinDate}
          />
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {isBookBy
              ? "Choose your booking date"
              : isCheckIn
                ? "Pick your arrival"
                : "Pick your departure"}
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-1.5 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-full shadow hover:shadow-md hover:scale-105 active:scale-95 transition cursor-pointer flex items-center gap-1"
          >
            <Check size={12} strokeWidth={3} />
            Done
          </button>
        </div>
      </div>
    </>
  );
};

export default HotelDatePicker;
