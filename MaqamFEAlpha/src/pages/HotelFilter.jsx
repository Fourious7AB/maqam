import { useMemo } from "react";
import { Search, Star, ArrowRight, RotateCcw, X } from "lucide-react";

export const SUGGESTIONS_LIST = [
  { id: "free_cancellation", name: "Free Cancellation" },
  { id: "breakfast", name: "Breakfast Included" },
  { id: "villas", name: "Villas & Apartments" },
  { id: "five_star", name: "5-Star Luxury" },
  { id: "pool", name: "Swimming Pool" },
  { id: "wifi", name: "Wi-Fi" },
];

export const PRICE_RANGES_LIST = [
  { id: "0-3000", label: "Under ₹ 3,000", min: 0, max: 3000 },
  { id: "3000-6000", label: "₹ 3,000 - ₹ 6,000", min: 3000, max: 6000 },
  { id: "6000-12000", label: "₹ 6,000 - ₹ 12,000", min: 6000, max: 12000 },
  { id: "12000-25000", label: "₹ 12,000 - ₹ 25,000", min: 12000, max: 25000 },
  { id: "25000-max", label: "₹ 25,000+", min: 25000, max: Infinity },
];

export const RATINGS_LIST = [
  { id: "4.5", label: "Excellent: 4.5+", minRating: 4.5 },
  { id: "4.0", label: "Very Good: 4.0+", minRating: 4.0 },
  { id: "3.0", label: "Good: 3.0+", minRating: 3.0 },
  { id: "under3", label: "Under 3.0 Stars", maxRating: 3.0 },
];

const HotelFilter = ({
  filters = {},
  onFilterChange,
  onReset,
  hotels = [],
}) => {
  const searchQuery = filters.searchQuery || "";
  const selectedSuggestions = filters.selectedSuggestions || [];
  const priceType = filters.priceType || "total";
  const selectedPriceRanges = filters.selectedPriceRanges || [];
  const selectedRatings = filters.selectedRatings || [];
  const minBudget = filters.minBudget ?? "";
  const maxBudget = filters.maxBudget ?? "";

  // Helper to extract effective price of a hotel
  const getHotelPrice = (h) => {
    const val =
      priceType === "night"
        ? h?.fromPrice?.perNightPrice || h?.price || 0
        : h?.fromPrice?.totalPrice || h?.fromPrice?.perNightPrice || h?.price || 0;
    return Number(val) || 0;
  };

  // Compute live counts for each filter option based on current search inventory
  const counts = useMemo(() => {
    const res = {
      suggestions: {},
      priceRanges: {},
      ratings: {},
    };

    if (!Array.isArray(hotels) || hotels.length === 0) return res;

    // Suggestions counts
    SUGGESTIONS_LIST.forEach((s) => {
      res.suggestions[s.name] = hotels.filter((h) => {
        if (s.name === "Free Cancellation") {
          return (h?.description || "").toLowerCase().includes("free cancel") || true;
        }
        if (s.name === "Breakfast Included") {
          return (
            h?.amenities?.some((a) => /breakfast/i.test(a)) ||
            /breakfast/i.test(h?.description || "")
          );
        }
        if (s.name === "Villas & Apartments") {
          return (
            /villa|apartment/i.test(h?.category || "") ||
            /villa|apartment/i.test(h?.name || "")
          );
        }
        if (s.name === "5-Star Luxury") {
          return Number(h?.rating) >= 5;
        }
        if (s.name === "Swimming Pool") {
          return (
            h?.amenities?.some((a) => /pool/i.test(a)) ||
            /pool/i.test(h?.description || "")
          );
        }
        if (s.name === "Wi-Fi") {
          return (
            h?.amenities?.some((a) => /wifi|internet/i.test(a)) ||
            /wifi|internet/i.test(h?.description || "")
          );
        }
        return false;
      }).length;
    });

    // Price range counts
    PRICE_RANGES_LIST.forEach((r) => {
      res.priceRanges[r.id] = hotels.filter((h) => {
        const p = getHotelPrice(h);
        return p >= r.min && p <= r.max;
      }).length;
    });

    // Rating counts
    RATINGS_LIST.forEach((r) => {
      res.ratings[r.id] = hotels.filter((h) => {
        const star = Number(h?.rating || 0);
        if (r.minRating !== undefined) return star >= r.minRating;
        if (r.maxRating !== undefined) return star < r.maxRating;
        return false;
      }).length;
    });

    return res;
  }, [hotels, priceType]);

  const activeFiltersCount =
    (searchQuery ? 1 : 0) +
    selectedSuggestions.length +
    selectedPriceRanges.length +
    selectedRatings.length +
    (minBudget !== "" || maxBudget !== "" ? 1 : 0);

  const updateFilters = (updates) => {
    if (onFilterChange) {
      onFilterChange({ ...filters, ...updates });
    }
  };

  const handleSuggestionToggle = (name) => {
    const next = selectedSuggestions.includes(name)
      ? selectedSuggestions.filter((i) => i !== name)
      : [...selectedSuggestions, name];
    updateFilters({ selectedSuggestions: next });
  };

  const handlePriceRangeToggle = (id) => {
    const next = selectedPriceRanges.includes(id)
      ? selectedPriceRanges.filter((i) => i !== id)
      : [...selectedPriceRanges, id];
    updateFilters({ selectedPriceRanges: next });
  };

  const handleRatingToggle = (id) => {
    const next = selectedRatings.includes(id)
      ? selectedRatings.filter((i) => i !== id)
      : [...selectedRatings, id];
    updateFilters({ selectedRatings: next });
  };

  const handleResetAll = () => {
    if (onReset) {
      onReset();
    } else if (onFilterChange) {
      onFilterChange({
        searchQuery: "",
        selectedSuggestions: [],
        priceType: "total",
        selectedPriceRanges: [],
        minBudget: "",
        maxBudget: "",
        selectedRatings: [],
      });
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-200/90 shadow-sm p-4 sm:p-5 space-y-6">
      {/* Header & Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">Filters</h2>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-700 text-white">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">Refine your hotel search</p>
        </div>
        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={handleResetAll}
            className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline cursor-pointer transition"
          >
            <RotateCcw size={13} />
            Reset All
          </button>
        )}
      </div>

      {/* Locality & Hotel Name Search Box */}
      <div>
        <div className="relative flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2 transition focus-within:border-teal-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-100">
          <Search size={15} className="text-teal-600 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => updateFilters({ searchQuery: e.target.value })}
            placeholder="Search hotel name or area..."
            className="w-full bg-transparent text-xs sm:text-sm text-gray-800 outline-none placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => updateFilters({ searchQuery: "" })}
              className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200/60"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Suggested For You (Amenities & Tags) */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-2.5">
          Suggested For You
        </h3>
        <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-gray-200">
          {SUGGESTIONS_LIST.map((item) => {
            const isChecked = selectedSuggestions.includes(item.name);
            const count = counts.suggestions[item.name];
            return (
              <label
                key={item.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-teal-50/30 cursor-pointer transition text-xs sm:text-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleSuggestionToggle(item.name)}
                    className="h-4 w-4 rounded border-gray-300 accent-teal-600 cursor-pointer shrink-0"
                  />
                  <span
                    className={`truncate ${
                      isChecked
                        ? "font-semibold text-teal-900"
                        : "text-gray-700"
                    }`}
                  >
                    {item.name}
                  </span>
                </div>
                {count !== undefined && (
                  <span className="text-xs text-gray-400 font-medium shrink-0 ml-2">
                    ({count})
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* Preference (Price Display & Base) */}
      <div className="pt-4 border-t border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Price Display</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition">
            <input
              type="radio"
              name="priceType"
              checked={priceType === "night"}
              onChange={() => updateFilters({ priceType: "night" })}
              className="h-4 w-4 accent-teal-600 cursor-pointer"
            />
            <span className="text-xs sm:text-sm font-medium text-gray-700">
              Price per Night
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition">
            <input
              type="radio"
              name="priceType"
              checked={priceType === "total"}
              onChange={() => updateFilters({ priceType: "total" })}
              className="mt-1 h-4 w-4 accent-teal-600 cursor-pointer"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-gray-900">
                  Total Price
                </span>
                <span className="rounded bg-teal-100 px-1.5 py-0.2 text-[9px] font-extrabold uppercase text-teal-800">
                  POPULAR
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Total for all nights & rooms
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Price Ranges */}
      <div className="pt-4 border-t border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 mb-2.5">Price Range</h3>
        <div className="space-y-1">
          {PRICE_RANGES_LIST.map((item) => {
            const isChecked = selectedPriceRanges.includes(item.id);
            const count = counts.priceRanges[item.id];
            return (
              <label
                key={item.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-teal-50/30 cursor-pointer transition text-xs sm:text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handlePriceRangeToggle(item.id)}
                    className="h-4 w-4 rounded border-gray-300 accent-teal-600 cursor-pointer shrink-0"
                  />
                  <span
                    className={`${
                      isChecked
                        ? "font-semibold text-teal-900"
                        : "text-gray-700"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                {count !== undefined && (
                  <span className="text-xs text-gray-400 font-medium ml-2">
                    ({count})
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* Custom Budget Range */}
      <div className="pt-4 border-t border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 mb-2.5">Your Budget</h3>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-2 text-xs text-gray-400">
              ₹
            </span>
            <input
              type="number"
              value={minBudget}
              onChange={(e) => updateFilters({ minBudget: e.target.value })}
              placeholder="Min"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/70 pl-6 pr-2.5 py-2 text-xs text-gray-800 outline-none focus:border-teal-500 focus:bg-white"
            />
          </div>
          <span className="text-xs text-gray-400 font-medium">to</span>
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-2 text-xs text-gray-400">
              ₹
            </span>
            <input
              type="number"
              value={maxBudget}
              onChange={(e) => updateFilters({ maxBudget: e.target.value })}
              placeholder="Max"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/70 pl-6 pr-2.5 py-2 text-xs text-gray-800 outline-none focus:border-teal-500 focus:bg-white"
            />
          </div>
          {(minBudget !== "" || maxBudget !== "") && (
            <button
              type="button"
              onClick={() => updateFilters({ minBudget: "", maxBudget: "" })}
              title="Clear budget"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition shrink-0"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* User Rating */}
      <div className="pt-4 border-t border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 mb-2.5">User Rating</h3>
        <div className="space-y-1">
          {RATINGS_LIST.map((item) => {
            const isChecked = selectedRatings.includes(item.id);
            const count = counts.ratings[item.id];
            return (
              <label
                key={item.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-teal-50/30 cursor-pointer transition text-xs sm:text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleRatingToggle(item.id)}
                    className="h-4 w-4 rounded border-gray-300 accent-teal-600 cursor-pointer shrink-0"
                  />
                  <div className="flex items-center gap-1">
                    <Star
                      size={14}
                      className="text-amber-400 fill-amber-400 shrink-0"
                    />
                    <span
                      className={`${
                        isChecked
                          ? "font-semibold text-teal-900"
                          : "text-gray-700"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                </div>
                {count !== undefined && (
                  <span className="text-xs text-gray-400 font-medium ml-2">
                    ({count})
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HotelFilter;
