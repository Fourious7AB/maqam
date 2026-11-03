import React, { useEffect, useRef } from "react";
import { ChevronDown, Users } from "lucide-react";
import { springEntrance, clickSquash } from "../../animations/presets";

const TravellerClass = ({
  setSelectedClass,
  travellers,
  setTravellers,
  selectedClass,
  onDone,
}) => {
  const currentTravellersRef = useRef(travellers);
  const dropdownRef = useRef(null);

  useEffect(() => {
    currentTravellersRef.current = travellers;
  }, [travellers]);

  useEffect(() => {
    if (selectedClass && dropdownRef.current) {
      springEntrance(dropdownRef.current);
    }
  }, [selectedClass]);

  const updateTravellerField = (field, value) => {
    const next = {
      ...currentTravellersRef.current,
      [field]: value,
    };
    currentTravellersRef.current = next;
    setTravellers(next);
  };

  const totalTravellers =
    (travellers?.adult || 1) + (travellers?.child || 0) + (travellers?.infant || 0);

  return (
    <div className="relative flex-1 min-w-0 flex flex-col justify-between">
      <div
        className="cursor-pointer h-full flex flex-col justify-between"
        onClick={() => setSelectedClass((prev) => !prev)}
      >
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Users size={13} className="text-slate-600 dark:text-slate-400 shrink-0" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              TRAVELLERS &amp; CLASS
            </p>
          </div>
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${
              selectedClass ? "rotate-180 text-[#085c44]" : "text-slate-400"
            }`}
          />
        </div>

        <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight mt-1 truncate">
          {totalTravellers} Traveller{totalTravellers > 1 ? "s" : ""}
        </p>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
          {travellers?.travelClass || "Economy"}
        </p>
      </div>

      {/* Dropdown */}
      {selectedClass && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 sm:left-auto sm:right-0 top-full mt-3 w-full sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 sm:p-5 z-[100] transform-gpu"
        >
          {/* Adult */}
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Adults</p>
              <p className="text-[11px] text-slate-400">12+ years</p>
            </div>
            <select
              value={travellers?.adult || 1}
              onChange={(e) => updateTravellerField("adult", Number(e.target.value))}
              className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 focus:border-[#085c44] focus:outline-none"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* Child */}
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Children</p>
              <p className="text-[11px] text-slate-400">2 - 11 years</p>
            </div>
            <select
              value={travellers?.child || 0}
              onChange={(e) => updateTravellerField("child", Number(e.target.value))}
              className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 focus:border-[#085c44] focus:outline-none"
            >
              {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* Infant */}
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Infants</p>
              <p className="text-[11px] text-slate-400">Under 2 years</p>
            </div>
            <select
              value={travellers?.infant || 0}
              onChange={(e) => updateTravellerField("infant", Number(e.target.value))}
              className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 focus:border-[#085c44] focus:outline-none"
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div className="flex items-center justify-between mb-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Cabin Class
            </label>
            <select
              className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 focus:border-[#085c44] focus:outline-none"
              value={travellers?.travelClass || "Economy"}
              onChange={(e) => updateTravellerField("travelClass", e.target.value)}
            >
              <option>Economy</option>
              <option>Premium Economy</option>
              <option>Business</option>
              <option>First Class</option>
            </select>
          </div>

          {/* Button */}
          <div className="text-right">
            <button
              type="button"
              onClick={(e) => {
                clickSquash(e.currentTarget);
                setSelectedClass(false);
                if (onDone) {
                  onDone(currentTravellersRef.current);
                }
              }}
              className="w-full bg-[#085c44] hover:bg-[#064e3b] text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravellerClass;
