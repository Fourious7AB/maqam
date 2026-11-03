import React, { useEffect, useRef } from "react";
import { Plane, SearchX } from "lucide-react";

const ArrivalPlace = ({
  toSuggestions,
  showToSuggestions,
  setToQuery,
  formatSuggestion,
  selectedTo,
  setSelectedTo,
  setToSuggestions,
  setShowToSuggestions,
  setIsDisabled,
}) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // Also ensure click isn't on the parent input container
        const parentContainer = dropdownRef.current.closest(".arrival-field-container");
        if (parentContainer && parentContainer.contains(event.target)) {
          return;
        }
        setShowToSuggestions(false);
      }
    };

    if (showToSuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showToSuggestions, setShowToSuggestions]);

  if (!showToSuggestions) {
    return null;
  }

  const handleSelectTo = (suggestion, e) => {
    if (e) {
      e.stopPropagation();
    }
    const formatted = formatSuggestion
      ? formatSuggestion(suggestion)
      : suggestion.name || suggestion.iataCode || "";
    setToQuery(formatted);
    setSelectedTo(suggestion);
    setToSuggestions([]);
    setShowToSuggestions(false);
    if (setIsDisabled) setIsDisabled(false);
    // Save selected arrival airport
    localStorage.setItem("selectedTo", JSON.stringify(suggestion));
  };

  const isEmpty = !toSuggestions || toSuggestions.length === 0;

  return (
    <div
      ref={dropdownRef}
      onClick={(e) => e.stopPropagation()}
      className="absolute left-0 sm:right-0 sm:left-auto lg:left-0 lg:right-auto top-full mt-2 w-[calc(100vw-32px)] sm:w-[420px] max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)] z-[9999] border border-gray-100 dark:border-slate-800 overflow-hidden transition-all duration-200"
    >
      {/* Dropdown Header Bar */}
      <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-800/80 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between select-none">
        <div className="flex items-center gap-1.5">
          <Plane className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 rotate-45" />
          <span className="text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-300 uppercase">
            Arrival Airport
          </span>
        </div>
        {!isEmpty && (
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-full">
            {toSuggestions.length} found
          </span>
        )}
      </div>

      {/* Airport Suggestions List or Empty State */}
      {isEmpty ? (
        <div className="py-8 px-4 text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <SearchX size={18} />
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            No airports found
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Try searching by city name, airport name, or 3-letter IATA code
          </p>
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {toSuggestions.map((airport) => {
            const isSelected = selectedTo?.iataCode === airport.iataCode;
            return (
              <button
                key={airport.id || airport.iataCode}
                type="button"
                onClick={(e) => handleSelectTo(airport, e)}
                className={`group flex w-full items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-left cursor-pointer ${
                  isSelected
                    ? "bg-teal-50 dark:bg-teal-950/50 border border-teal-200/80 dark:border-teal-800/80"
                    : "hover:bg-teal-50/40 dark:hover:bg-slate-800/70 border border-transparent"
                }`}
              >
                {/* Left: Airport Icon & City / Airport Details */}
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? "bg-teal-600 text-white shadow-xs"
                        : "bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 group-hover:bg-teal-600 group-hover:text-white"
                    }`}
                  >
                    <Plane
                      size={15}
                      className="rotate-45 transition-transform duration-200 group-hover:scale-110"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                        {airport.name}
                      </span>
                      {airport.countryCode && (
                        <span className="text-xs text-slate-400 font-medium">
                          ({airport.countryCode})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[210px] sm:max-w-[260px] mt-0.5 leading-4">
                      {airport.airport}
                    </p>
                  </div>
                </div>

                {/* Right: IATA Code Badge */}
                <div className="flex flex-col items-end shrink-0 pl-1">
                  <div
                    className={`px-2.5 py-1 rounded-lg transition-all font-mono shadow-2xs ${
                      isSelected
                        ? "bg-teal-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700 group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600"
                    }`}
                  >
                    <span className="text-xs font-black tracking-wider">
                      {airport.iataCode}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ArrivalPlace;
