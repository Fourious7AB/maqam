import { useState } from "react";
import { useSelector } from "react-redux";
import CommonHeader from "../components/CommonHeader";
import HotelSearch from "./HotelSearch";
import HotelFilter from "./HotelFilter";
import HotelListing from "./HotelListing";
import { useLocation } from "react-router-dom";
import { Filter, X } from "lucide-react";

const initialFilters = {
  searchQuery: "",
  selectedSuggestions: [],
  priceType: "total",
  selectedPriceRanges: [],
  minBudget: "",
  maxBudget: "",
  selectedRatings: [],
};

const Hotel = () => {
  const location = useLocation();
  const hotelInformation = location?.state;
  const roomCount = hotelInformation?.hotels?.[0]?.roomCount || 1;
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [rooms, setRooms] = useState(roomCount);
  const [filters, setFilters] = useState(initialFilters);

  const { hotelData } = useSelector((state) => state.hotelSearch);
  const hotelsList = hotelData?.data?.hotels || [];

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070c18] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Header */}
      <CommonHeader title="Hotel" />

      {/* Hotel Search Section with elevated stacking context */}
      <div className="relative z-40 bg-slate-100/95 dark:bg-[#0b1120]/95 backdrop-blur-md border-b border-gray-200/80 dark:border-slate-800 shadow-2xs mt-16 sm:mt-20 py-4 px-4 sm:px-6 lg:px-10 xl:px-12">
        <div className="max-w-[1760px] mx-auto w-full">
          <HotelSearch setRooms={setRooms} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[1760px] w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6 sm:py-8">
        {/* Mobile Filter Trigger Button (< lg) */}
        <div className="flex justify-between items-center lg:hidden mb-4 bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Filter Hotels</h2>
            <p className="text-xs text-gray-500">
              Filter by price, ratings, amenities & location
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowMobileFilter(true)}
            className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-xl font-semibold text-xs transition cursor-pointer shadow-sm active:scale-95"
          >
            <Filter size={15} />
            <span>Filters</span>
          </button>
        </div>

        {/* Mobile Filter Drawer Modal (< lg) */}
        {showMobileFilter && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs lg:hidden">
            <div className="w-full max-w-xs sm:max-w-sm h-full bg-white p-4 overflow-y-auto flex flex-col justify-between shadow-2xl">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
                  <div className="flex items-center gap-2">
                    <Filter size={18} className="text-teal-700" />
                    <h2 className="text-lg font-bold text-gray-900">
                      Hotel Filters
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMobileFilter(false)}
                    className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
                <HotelFilter
                  filters={filters}
                  onFilterChange={setFilters}
                  onReset={handleResetFilters}
                  hotels={hotelsList}
                />
              </div>
              <div className="pt-4 border-t border-gray-200 mt-6 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setShowMobileFilter(false)}
                  className="w-full py-3 px-4 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition cursor-pointer shadow-sm"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Two-Column Responsive Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Desktop Left Filter Sidebar */}
          <aside className="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-24 self-start z-20">
            <div className="max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pr-1">
              <HotelFilter
                filters={filters}
                onFilterChange={setFilters}
                onReset={handleResetFilters}
                hotels={hotelsList}
              />
            </div>
          </aside>

          {/* Right Hotel Listing Container */}
          <main className="flex-1 min-w-0 w-full">
            <HotelListing
              roomCount={rooms}
              filters={filters}
              onResetFilters={handleResetFilters}
            />
          </main>
        </div>
      </div>
    </div>
  );
};

export default Hotel;
