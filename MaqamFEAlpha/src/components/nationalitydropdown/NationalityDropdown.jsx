import { useState, useEffect, useRef, useMemo } from "react";
import { Globe, ChevronDown, Search, Check, X, Navigation, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import {
  getSortedBillingCountries,
  getBillingCountryByCode,
  detectUserCountry,
} from "../../data/worldCountries";

export default function NationalityDropdown({
  selected,
  setSelected,
  selectedCountry,
  onSelectCountry,
  open: externalOpen,
  setOpen: externalSetOpen,
  countryData,
  setCountryCode,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const isControlled = typeof externalOpen === "boolean";
  const isOpen = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled ? externalSetOpen : setInternalOpen;

  // Derive active country from props
  const activeCountry = useMemo(() => {
    if (selectedCountry?.code) {
      return getBillingCountryByCode(selectedCountry.code);
    }
    if (typeof selected === "string" && selected && selected !== "All Countries") {
      const all = getSortedBillingCountries();
      const match = all.find(
        (c) =>
          c.name.toLowerCase() === selected.toLowerCase() ||
          c.code.toLowerCase() === selected.toLowerCase(),
      );
      if (match) return match;
    }
    return { name: "India", code: "IN", flag: "🇮🇳" };
  }, [selectedCountry, selected]);

  // Combined country list: prioritize worldCountries with fallback
  const allCountries = useMemo(() => {
    const list = getSortedBillingCountries();
    if (Array.isArray(countryData) && countryData.length > 0) {
      const knownCodes = new Set(list.map((c) => c.code.toUpperCase()));
      countryData.forEach((c) => {
        const code = (c.alpha2Code || c.code || "").toUpperCase();
        if (code && !knownCodes.has(code) && c.name && c.name !== "All Countries") {
          list.push({
            name: c.name,
            code,
            flag: "🌍",
          });
          knownCodes.add(code);
        }
      });
    }
    return list;
  }, [countryData]);

  // Filtered countries based on user search query
  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allCountries;
    return allCountries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [allCountries, searchQuery]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen?.(false);
        setSearchQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, setOpen]);

  const handleSelect = (country) => {
    if (onSelectCountry) {
      onSelectCountry(country);
    }
    if (setSelected) {
      setSelected(country.name);
    }
    if (setCountryCode) {
      setCountryCode(country.code);
    }
    setOpen?.(false);
    setSearchQuery("");
  };

  const handleDetectLocation = async (e) => {
    e.stopPropagation();
    try {
      setIsDetecting(true);
      const detected = await detectUserCountry();
      if (detected && detected.code) {
        handleSelect(detected);
        toast.info(`Display currency set to ${detected.name} (${detected.code})`, {
          position: "top-right",
          autoClose: 2500,
        });
      }
    } catch (err) {
      toast.error("Could not determine location. Please select your country manually.");
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative w-full select-none">
      {/* Clickable Card Header */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          setOpen?.(!isOpen);
        }}
        className="w-full h-full flex flex-col justify-between cursor-pointer"
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Globe size={13} className="text-slate-600 dark:text-slate-400 shrink-0" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              DISPLAY CURRENCY
            </p>
          </div>
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[#085c44]" : "text-slate-400"
            }`}
          />
        </div>

        {/* Selected Country Display */}
        <div className="flex items-center gap-2 mt-1">
          <img
            src={`https://flagcdn.com/w40/${activeCountry.code.toLowerCase()}.png`}
            alt={activeCountry.name}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            className="w-6 h-4 rounded-xs object-cover border border-slate-200 shadow-2xs shrink-0"
          />
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight truncate">
            {activeCountry.name}
          </p>
          <span className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100/80 dark:bg-emerald-950/60 text-[#085c44] dark:text-emerald-300 shrink-0">
            {activeCountry.code}
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
          For accurate pricing for {activeCountry.code === "IN" ? "Indian" : activeCountry.name} residents
        </p>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full left-0 sm:left-auto sm:right-0 z-50 mt-2 w-[310px] sm:w-[370px] max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Search & Location Detection Header */}
          <div className="p-3 border-b border-gray-100 bg-gray-50/70 flex flex-col gap-2">
            <div className="relative flex items-center">
              <Search
                size={14}
                className="absolute left-3 text-gray-400 pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country or code (e.g. US, AE)..."
                className="w-full pl-9 pr-8 py-2 bg-white text-xs font-semibold text-gray-800 placeholder:text-gray-400 rounded-xl border border-gray-200 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Quick Detect Location Button */}
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={isDetecting}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold rounded-lg transition border border-teal-200/70 cursor-pointer disabled:opacity-60"
            >
              {isDetecting ? (
                <>
                  <Loader2 size={13} className="animate-spin text-teal-700" />
                  <span>Detecting your location...</span>
                </>
              ) : (
                <>
                  <Navigation size={13} className="text-teal-700" />
                  <span>Use Current Location</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between px-1 text-[11px] text-gray-400">
              <span>All international countries</span>
              <span className="font-semibold text-teal-700">
                {filteredCountries.length} countries
              </span>
            </div>
          </div>

          {/* Country List */}
          <div className="max-h-[290px] overflow-y-auto divide-y divide-gray-50 overscroll-contain scrollbar-thin scrollbar-thumb-gray-200">
            {filteredCountries.length === 0 ? (
              <div className="py-8 text-center px-4">
                <p className="text-xs font-medium text-gray-500">
                  No countries matching "{searchQuery}"
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-2 text-xs font-semibold text-teal-600 hover:underline cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            ) : (
              filteredCountries.map((country) => {
                const isSelected = activeCountry.code === country.code;
                return (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleSelect(country)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left transition-colors cursor-pointer group ${
                      isSelected
                        ? "bg-teal-50/70 text-teal-900"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <img
                        src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
                        alt={country.name}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                        className="w-5 h-3.5 rounded-xs object-cover border border-gray-200 shrink-0"
                      />
                      <span className="text-xs font-semibold truncate group-hover:text-teal-700 transition-colors">
                        {country.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isSelected
                            ? "bg-teal-700 text-white"
                            : "bg-gray-100 text-gray-600 group-hover:bg-teal-100 group-hover:text-teal-800"
                        }`}
                      >
                        {country.code}
                      </span>
                      {isSelected && (
                        <Check size={14} className="text-teal-700 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
