import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import HotelLoader from "../components/loader/HotelLoader";
import {
  Heart,
  Check,
  Star,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Building2,
  RotateCcw,
} from "lucide-react";
import { fetchHotels } from "../components/reducer/HotelSearchSlice";

const filtersTabs = [
  "Popularity",
  "Price (Low to High)",
  "Price (High to Low)",
  "User Rating (Highest)",
  "Lowest Price & Best Rated",
];

const HotelListing = ({ roomCount = 1, filters = {}, onResetFilters }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const sortTabsRef = useRef(null);
  const { hotelData, loading, error } = useSelector(
    (state) => state.hotelSearch,
  );
  const [activeSort, setActiveSort] = useState("Popularity");
  const [guestOnly, setGuestOnly] = useState(false);

  // Dynamic city name
  const savedCity = (() => {
    try {
      return JSON.parse(localStorage.getItem("cityname"))?.cityName || "";
    } catch {
      return "";
    }
  })();

  const cityName =
    hotelData?.data?.city || savedCity || "Hotels & Accommodations";

  useEffect(() => {
    if (hotelData?.data) return;

    try {
      const savedSearch = JSON.parse(localStorage.getItem("hotelSearch"));
      if (savedSearch) {
        dispatch(fetchHotels(savedSearch));
      }
    } catch {
      // Ignored
    }
  }, [dispatch, hotelData]);

  const handleHotelDetails = (hotel) => {
    const currentSearchId = hotelData?.data?.searchId || localStorage.getItem("searchId");
    if (currentSearchId) {
      localStorage.setItem("searchId", currentSearchId);
    }
    try {
      sessionStorage.setItem("selectedHotel", JSON.stringify(hotel));
    } catch {
      // Ignored
    }
    navigate(
      `/booking-details/${hotel.id}${currentSearchId ? `?searchId=${encodeURIComponent(currentSearchId)}` : ""}`,
      {
        state: {
          searchId: currentSearchId,
          hotelId: hotel.id,
          item: hotel,
        },
      },
    );
  };

  const scrollSortTabs = (direction) => {
    if (sortTabsRef.current) {
      const amount = direction === "left" ? -200 : 200;
      sortTabsRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  const hotelsList = useMemo(
    () => hotelData?.data?.hotels || [],
    [hotelData?.data?.hotels],
  );

  // Helper to extract effective price based on preference
  const getHotelPrice = useCallback(
    (h) => {
      const isNight = filters?.priceType === "night";
      const rawVal = isNight
        ? h?.fromPrice?.perNightPrice || h?.price || 0
        : h?.fromPrice?.totalPrice ||
          h?.fromPrice?.perNightPrice ||
          h?.price ||
          0;
      return Number(rawVal) || 0;
    },
    [filters?.priceType],
  );

  // Filter and Sort hotel inventory
  const filteredAndSortedHotels = useMemo(() => {
    let list = [...hotelsList];

    // 1. Locality & Hotel Name search query
    if (filters?.searchQuery?.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      list = list.filter((h) => {
        const name = (h.name || "").toLowerCase();
        const address = (h.address || "").toLowerCase();
        const city = (h.city || "").toLowerCase();
        const desc = (h.description || "").toLowerCase();
        return (
          name.includes(q) ||
          address.includes(q) ||
          city.includes(q) ||
          desc.includes(q)
        );
      });
    }

    // 2. Suggested For You tags
    if (filters?.selectedSuggestions?.length > 0) {
      list = list.filter((h) => {
        return filters.selectedSuggestions.every((tag) => {
          if (tag === "Free Cancellation") {
            return (
              (h.description || "").toLowerCase().includes("free cancel") || true
            );
          }
          if (tag === "Breakfast Included") {
            return (
              h.amenities?.some((a) => /breakfast/i.test(a)) ||
              /breakfast/i.test(h.description || "")
            );
          }
          if (tag === "Villas & Apartments") {
            return (
              /villa|apartment/i.test(h.category || "") ||
              /villa|apartment/i.test(h.name || "")
            );
          }
          if (tag === "5-Star Luxury") {
            return Number(h.rating || 0) >= 5;
          }
          if (tag === "Swimming Pool") {
            return (
              h.amenities?.some((a) => /pool/i.test(a)) ||
              /pool/i.test(h.description || "")
            );
          }
          if (tag === "Wi-Fi") {
            return (
              h.amenities?.some((a) => /wifi|internet/i.test(a)) ||
              /wifi|internet/i.test(h.description || "")
            );
          }
          return true;
        });
      });
    }

    // 3. Price range checkboxes
    if (filters?.selectedPriceRanges?.length > 0) {
      list = list.filter((h) => {
        const price = getHotelPrice(h);
        return filters.selectedPriceRanges.some((rangeId) => {
          const [minStr, maxStr] = rangeId.split("-");
          const min = Number(minStr);
          const max = maxStr === "max" ? Infinity : Number(maxStr);
          return price >= min && price <= max;
        });
      });
    }

    // 4. Custom Min & Max Budget
    if (filters?.minBudget !== "" && !isNaN(Number(filters.minBudget))) {
      const min = Number(filters.minBudget);
      list = list.filter((h) => getHotelPrice(h) >= min);
    }
    if (filters?.maxBudget !== "" && !isNaN(Number(filters.maxBudget))) {
      const max = Number(filters.maxBudget);
      list = list.filter((h) => getHotelPrice(h) <= max);
    }

    // 5. Star / User Ratings
    if (filters?.selectedRatings?.length > 0) {
      list = list.filter((h) => {
        const star = Number(h.rating || 0);
        return filters.selectedRatings.some((id) => {
          if (id === "4.5") return star >= 4.5;
          if (id === "4.0") return star >= 4.0;
          if (id === "3.0") return star >= 3.0;
          if (id === "under3") return star < 3.0;
          return true;
        });
      });
    }

    // 6. Guest capacity toggle
    if (guestOnly) {
      list = list.filter((h) => {
        return /family|quad|villa|apartment|suite|4\s*guest/i.test(
          `${h.name} ${h.category} ${h.description}`,
        );
      });
    }

    // 7. Sort
    if (activeSort === "Price (Low to High)") {
      list.sort((a, b) => getHotelPrice(a) - getHotelPrice(b));
    } else if (activeSort === "Price (High to Low)") {
      list.sort((a, b) => getHotelPrice(b) - getHotelPrice(a));
    } else if (activeSort === "User Rating (Highest)") {
      list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    } else if (activeSort === "Lowest Price & Best Rated") {
      list.sort((a, b) => {
        const rDiff = Number(b.rating || 0) - Number(a.rating || 0);
        if (rDiff !== 0) return rDiff;
        return getHotelPrice(a) - getHotelPrice(b);
      });
    }

    return list;
  }, [hotelsList, filters, guestOnly, activeSort, getHotelPrice]);

  // 20 hotels per page responsive pagination
  const HOTELS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const hotelListSectionRef = useRef(null);

  // Adjust to page 1 whenever filters, sorting, guestOnly, or hotel list length changes
  const filterKey = `${filters?.searchQuery || ""}_${filters?.priceType || ""}_${(filters?.selectedPriceRanges || []).join(",")}_${(filters?.selectedRatings || []).join(",")}_${filters?.minBudget || ""}_${filters?.maxBudget || ""}_${activeSort}_${guestOnly}_${hotelsList.length}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setCurrentPage(1);
  }

  const totalHotels = filteredAndSortedHotels.length;
  const totalPages = Math.max(1, Math.ceil(totalHotels / HOTELS_PER_PAGE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedHotels = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * HOTELS_PER_PAGE;
    return filteredAndSortedHotels.slice(
      startIndex,
      startIndex + HOTELS_PER_PAGE,
    );
  }, [filteredAndSortedHotels, safeCurrentPage]);

  const startHotelIndex =
    totalHotels === 0 ? 0 : (safeCurrentPage - 1) * HOTELS_PER_PAGE + 1;
  const endHotelIndex = Math.min(
    safeCurrentPage * HOTELS_PER_PAGE,
    totalHotels,
  );

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (safeCurrentPage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [
      1,
      "...",
      safeCurrentPage - 1,
      safeCurrentPage,
      safeCurrentPage + 1,
      "...",
      totalPages,
    ];
  }, [safeCurrentPage, totalPages]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === safeCurrentPage) return;
    setCurrentPage(newPage);
    if (hotelListSectionRef.current) {
      hotelListSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else {
      window.scrollTo({ top: 350, behavior: "smooth" });
    }
  };

  const hasActiveFilters =
    Boolean(filters?.searchQuery?.trim()) ||
    (filters?.selectedSuggestions?.length || 0) > 0 ||
    (filters?.selectedPriceRanges?.length || 0) > 0 ||
    (filters?.selectedRatings?.length || 0) > 0 ||
    filters?.minBudget !== "" ||
    filters?.maxBudget !== "" ||
    guestOnly;

  return (
    <div className="w-full">
      {loading && <HotelLoader />}

      {!loading && (
        <div className="w-full space-y-4">
          {/* Breadcrumb & Heading Bar */}
          <div ref={hotelListSectionRef} className="scroll-mt-24 bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
              <span
                onClick={() => navigate("/")}
                className="text-teal-600 font-semibold cursor-pointer hover:underline"
              >
                Home
              </span>
              <span>&gt;</span>
              <span className="text-gray-700 font-medium truncate">
                Hotels and stays in {cityName}
              </span>
            </div>

            <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">
                  {hotelsList.length > 0 ? (
                    hasActiveFilters ? (
                      <span>
                        {filteredAndSortedHotels.length} properties in {cityName}{" "}
                        <span className="text-sm font-medium text-gray-500">
                          (filtered from {hotelsList.length})
                        </span>
                      </span>
                    ) : (
                      `${hotelsList.length} properties in ${cityName}`
                    )
                  ) : (
                    `Properties in ${cityName}`
                  )}
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Best price guaranteed • Instant confirmation
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200/80 bg-teal-50/70 px-3.5 py-1.5 text-xs text-teal-800 font-semibold self-start sm:self-auto">
                <span>💡</span>
                <span>Exclusive Member Deals</span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="mt-5 flex items-center rounded-xl bg-gray-50/80 border border-gray-200/80 overflow-hidden">
              <button
                type="button"
                onClick={() => scrollSortTabs("left")}
                className="flex h-11 w-9 sm:w-11 shrink-0 items-center justify-center text-gray-500 hover:bg-gray-200/60 hover:text-gray-900 transition cursor-pointer"
                aria-label="Scroll left"
              >
                <ChevronLeft size={18} />
              </button>

              <div
                ref={sortTabsRef}
                className="flex flex-1 items-center overflow-x-auto scrollbar-hide py-1 px-1 gap-1"
              >
                {filtersTabs.map((item) => (
                  <button
                    key={item}
                    onClick={() => setActiveSort(item)}
                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0
                      ${
                        activeSort === item
                          ? "bg-teal-700 text-white shadow-xs"
                          : "text-gray-600 hover:text-gray-900 hover:bg-white/80"
                      }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => scrollSortTabs("right")}
                className="flex h-11 w-9 sm:w-11 shrink-0 items-center justify-center text-gray-500 hover:bg-gray-200/60 hover:text-gray-900 transition cursor-pointer"
                aria-label="Scroll right"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Guest Toggle */}
            <div className="mt-3.5 flex items-center justify-between rounded-xl bg-teal-50/40 px-4 py-2.5 border border-teal-100 text-xs sm:text-sm">
              <p className="font-medium text-teal-950">
                Show results where 4 guests can be accommodated in 1 room only
              </p>

              <button
                type="button"
                onClick={() => setGuestOnly(!guestOnly)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-all duration-300 cursor-pointer ${
                  guestOnly ? "bg-teal-700" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all duration-300 ${
                    guestOnly ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Hotel Cards List */}
          <div className="space-y-4">
            {filteredAndSortedHotels.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-xs">
                <Building2 className="mb-3 h-10 w-10 text-gray-400" />
                <h3 className="text-base font-bold text-gray-800">
                  {hasActiveFilters
                    ? "No hotels match your filters"
                    : "No hotels found"}
                </h3>
                <p className="mt-1 max-w-md text-xs sm:text-sm text-gray-500">
                  {hasActiveFilters
                    ? "Try loosening or clearing your filter criteria to see more available properties."
                    : error ||
                      "No hotel listings are available for the selected dates. Try different dates or nearby cities."}
                </p>
                {hasActiveFilters && onResetFilters && (
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    Reset All Filters
                  </button>
                )}
              </div>
            ) : (
              paginatedHotels.map((hotel) => {
                const hotelRating = Number(hotel?.rating || 0);
                const ratingLabel =
                  hotelRating >= 4.5
                    ? "Excellent"
                    : hotelRating >= 3.8
                      ? "Very Good"
                      : hotelRating >= 3.0
                        ? "Good"
                        : "";

                const isTotalPrice = filters?.priceType === "total";
                const rawBasePrice = isTotalPrice
                  ? hotel?.fromPrice?.totalPrice ||
                    hotel?.fromPrice?.perNightPrice ||
                    hotel?.price ||
                    2500
                  : hotel?.fromPrice?.perNightPrice || hotel?.price || 2500;
                const displayPrice = rawBasePrice;

                return (
                  <div
                    key={hotel.id}
                    onClick={() => handleHotelDetails(hotel)}
                    className="w-full rounded-2xl border border-gray-200/90 bg-white overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr_220px]">
                      {/* Left Image Section */}
                      <div className="relative p-3 sm:p-4">
                        <div className="w-full h-48 sm:h-full min-h-[160px] rounded-xl overflow-hidden bg-gray-100 relative">
                          <img
                            src={
                              hotel?.imageUrls?.[0] ||
                              "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80"
                            }
                            alt={hotel?.name || "Hotel"}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              e.target.src =
                                "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80";
                            }}
                          />
                        </div>

                        {/* Wishlist Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="absolute top-6 right-6 h-8 w-8 rounded-full bg-white/90 backdrop-blur-xs shadow-md flex items-center justify-center text-gray-500 hover:text-red-500 transition cursor-pointer"
                          aria-label="Add to wishlist"
                        >
                          <Heart size={16} />
                        </button>

                        {/* Photos badge */}
                        <div className="absolute bottom-6 left-6 rounded-full bg-black/70 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-xs">
                          Photos & Details →
                        </div>
                      </div>

                      {/* Middle Details Section */}
                      <div className="p-4 sm:p-5 flex flex-col justify-between border-t md:border-t-0 md:border-r border-gray-100">
                        <div>
                          {/* Hotel Name & Stars */}
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base sm:text-lg font-extrabold text-gray-900 leading-tight">
                              {hotel?.name}
                            </h2>

                            <div className="flex text-amber-400">
                              {Array.from({ length: 5 }, (_, i) => {
                                const filled = i < Math.round(hotelRating);
                                return (
                                  <Star
                                    key={i}
                                    size={13}
                                    fill={filled ? "currentColor" : "none"}
                                    className={
                                      filled
                                        ? "text-amber-400"
                                        : "text-gray-300"
                                    }
                                    strokeWidth={filled ? 0 : 1}
                                  />
                                );
                              })}
                            </div>
                          </div>

                          {/* Address / Location */}
                          <div className="mt-1.5 flex items-start gap-1.5 text-xs text-gray-600">
                            <MapPin
                              size={14}
                              className="text-teal-600 shrink-0 mt-0.5"
                            />
                            <span className="truncate">
                              {hotel.address ||
                                `${hotel?.city || ""}, ${hotel?.country || ""}`}
                              {hotel?.pinCode ? ` - ${hotel.pinCode}` : ""}
                            </span>
                          </div>

                          {/* Amenities & Highlights */}
                          <div className="mt-3.5 space-y-1.5 text-xs">
                            {hotel?.category && (
                              <div className="flex items-center gap-2 text-teal-800 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0"></span>
                                <span>Category: {hotel.category}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-1.5 text-teal-700 font-medium">
                              <span>🍸</span>
                              <span>
                                {hotel?.amenities?.some((a) =>
                                  /breakfast/i.test(a),
                                )
                                  ? "Complimentary Breakfast included"
                                  : "Enjoy happy hours with stay"}
                              </span>
                            </div>

                            {hotel?.description && (
                              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                                <Check size={14} className="shrink-0" />
                                <span className="truncate">
                                  {hotel.description}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-1.5 text-amber-700 pt-0.5 font-medium">
                              <Lightbulb size={14} className="shrink-0" />
                              <span>Free Cancellation & Instant Booking</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Price & Action Section */}
                      <div className="p-4 sm:p-5 bg-gray-50/70 flex flex-col justify-between items-start md:items-end border-t lg:border-t-0 border-gray-100">
                        <div className="text-left md:text-right w-full">
                          {hotelRating > 0 && (
                            <div className="flex items-center md:justify-end gap-1.5">
                              {ratingLabel && (
                                <span className="text-xs font-bold text-teal-800">
                                  {ratingLabel}
                                </span>
                              )}
                              <span className="rounded-lg bg-teal-700 px-2 py-0.5 text-xs text-white font-bold">
                                {hotelRating.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="text-left md:text-right mt-3 md:mt-0 w-full">
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">
                            {isTotalPrice ? "Total Price" : "Starting from"}
                          </span>
                          <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                            ₹ {Number(displayPrice).toLocaleString("en-IN")}
                          </h2>

                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {hotel?.priceDisclosure?.includesTaxes
                              ? "Includes taxes & fees"
                              : "+ taxes & fees"}
                          </p>

                          <p className="text-[11px] text-gray-400 font-medium">
                            {isTotalPrice
                              ? `All nights for ${roomCount} room(s)`
                              : `Per night for ${roomCount} room(s)`}
                          </p>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleHotelDetails(hotel);
                            }}
                            className="mt-3 w-full md:w-auto px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
                          >
                            VIEW ROOMS
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Hotels Pagination Bar */}
            {totalHotels > 0 && (
              <div className="mt-8 pt-4 pb-6 border-t border-gray-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Summary Text */}
                <div className="text-xs sm:text-sm text-gray-600 font-medium text-center sm:text-left">
                  Showing <span className="font-bold text-gray-900">{startHotelIndex}–{endHotelIndex}</span> of{" "}
                  <span className="font-bold text-gray-900">{totalHotels}</span> Hotels
                  {totalPages > 1 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200/60">
                      Page {safeCurrentPage} of {totalPages}
                    </span>
                  )}
                </div>

                {/* Serial Numbered Pagination Controls */}
                {totalPages > 1 && (
                  <nav
                    className="inline-flex items-center gap-1 sm:gap-1.5 p-1 rounded-2xl bg-white border border-gray-200 shadow-2xs"
                    aria-label="Hotels pagination"
                  >
                    {/* Previous Button */}
                    <button
                      type="button"
                      onClick={() => handlePageChange(safeCurrentPage - 1)}
                      disabled={safeCurrentPage === 1}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 text-gray-700"
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} />
                      <span className="hidden sm:inline">Prev</span>
                    </button>

                    {/* Serial Numbered Buttons */}
                    {pageNumbers.map((p, pIdx) => {
                      if (p === "...") {
                        return (
                          <span
                            key={`ellipsis-${pIdx}`}
                            className="px-2 py-1 text-xs sm:text-sm text-gray-400 font-bold select-none"
                          >
                            …
                          </span>
                        );
                      }
                      const isCurrent = p === safeCurrentPage;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handlePageChange(p)}
                          aria-current={isCurrent ? "page" : undefined}
                          className={`min-w-8 sm:min-w-9 h-8 sm:h-9 px-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center justify-center ${
                            isCurrent
                              ? "bg-teal-700 text-white shadow-xs"
                              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}

                    {/* Next Button */}
                    <button
                      type="button"
                      onClick={() => handlePageChange(safeCurrentPage + 1)}
                      disabled={safeCurrentPage === totalPages}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 text-gray-700"
                      aria-label="Next page"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight size={16} />
                    </button>
                  </nav>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelListing;
