import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import HotelDatePicker from "../components/datepicker/HotelDatePicker";
import RoomGuestSelector from "../components/roomguestselector/RoomGuestSelector";
import { fetchHotels } from "../components/reducer/HotelSearchSlice";
import {
  getNationalism,
  getCityName,
  clearCityData,
} from "../components/reducer/NationalismSlice";
import CityWithCountry from "../components/citywithcountry/CityWithCountry";
import NationalityDropdown from "../components/nationalitydropdown/NationalityDropdown";
import { detectUserCountry } from "../data/worldCountries";

import {
  ChevronDown,
  MapPin,
  Calendar,
  Search,
  Users,
} from "lucide-react";

const travellingWay = ["All", "India"];

const HotelSearch = ({ setRooms, onSearchSuccess, embedded = false }) => {
  const debounceRef = useRef(null);
  const roomGuestRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { countryData, cityData } = useSelector(
    (state) => state.region,
  );

  useEffect(() => {
    dispatch(getNationalism());
  }, [dispatch]);

  const [activeTab, setActiveTab] = useState("All");
  const [bookByDate, setBookByDate] = useState(new Date());
  const [openPicker, setOpenPicker] = useState(false);
  const [openRoomguestselector, setOpenroomguestselector] = useState(false);

  // Billing Nationality state (independent of destination city)
  const [billingCountry, setBillingCountry] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("billingNationality"));
      if (saved && saved.code) return saved;
    } catch (_) {}
    return { name: "India", code: "IN", flag: "🇮🇳" };
  });

  // Destination City state (can be any international city)
  const [cityname, setCityname] = useState("");
  const [cityId, setCityId] = useState("");
  const [destinationCountryCode, setDestinationCountryCode] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [isCitySelected, setIsCitySelected] = useState(false);

  // Occupancy state (Default: 1 Room, 1 Adult, 0 Children)
  const [roomCount, setRoomCount] = useState(1);
  const [adultCount, setAdultCount] = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);
  const [childAges, setChildAges] = useState([]);

  // Click outside listener for room/guest dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        roomGuestRef.current &&
        !roomGuestRef.current.contains(event.target)
      ) {
        setOpenroomguestselector(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openRoomguestselector]);

  // Restore saved destination city from localStorage only when not embedded on landing page
  useEffect(() => {
    if (embedded) return;
    try {
      const savedCity = JSON.parse(localStorage.getItem("cityname"));
      if (savedCity && savedCity.cityId && savedCity.cityName) {
        setCityname(savedCity.cityName);
        setCityId(savedCity.cityId);
        setDestinationCountryCode(savedCity.countryCode || "");
        setDestinationCountry(savedCity.country || "");
        setIsCitySelected(true);
      }
    } catch {
      localStorage.removeItem("cityname");
    }
  }, [embedded]);

  // Auto-detect user's current billing country on mount if none saved
  useEffect(() => {
    const saved = localStorage.getItem("billingNationality");
    if (!saved) {
      detectUserCountry().then((detected) => {
        if (detected && detected.code) {
          setBillingCountry(detected);
          localStorage.setItem("billingNationality", JSON.stringify(detected));
        }
      });
    }
  }, []);

  const hotelPayload = {
    cityId: cityId,
    countryCode: destinationCountryCode,
    guestNationality: billingCountry?.code || "IN",
    checkIn: bookByDate?.toISOString().split("T")[0],
    checkOut: (new Date(bookByDate.getTime() + 86400000))?.toISOString().split("T")[0],
    rooms: [
      {
        adults: adultCount,
        children: childrenCount,
        childAges: childAges,
      },
    ],
    minRating: 3,
    maxRating: 5,
  };

  const handleHotelSearch = () => {
    const trimmedCity = cityname.trim();

    if (!trimmedCity || !cityId) {
      toast.error(
        "Please select a valid destination city from the suggestions list before searching.",
      );
      return false;
    }

    const payload = {
      ...hotelPayload,
      cityId,
      cityName: trimmedCity,
      countryCode: destinationCountryCode || "",
      guestNationality: billingCountry?.code || "IN",
      billingCountryName: billingCountry?.name || "India",
    };

    localStorage.setItem("hotelSearch", JSON.stringify(payload));
    localStorage.setItem("billingNationality", JSON.stringify(billingCountry));
    dispatch(fetchHotels(payload));
    return true;
  };

  const handleCitySearch = (e) => {
    const value = e.target.value;

    setCityname(value);
    setCityId("");
    setIsCitySelected(false);
    if (!value.trim()) {
      localStorage.removeItem("cityname");
      dispatch(clearCityData());
      return;
    }

    // Cancel previous timer
    clearTimeout(debounceRef.current);

    // Start a new timer: search all international cities globally
    debounceRef.current = setTimeout(() => {
      const search = value.trim();

      if (search.length < 2) {
        dispatch(clearCityData());
        return;
      }

      // Billing Nationality does NOT restrict city search; anyone can search all international cities
      dispatch(
        getCityName({
          userInput: search,
          countryCode: "",
        }),
      );
    }, 400);
  };

  return (
    <>
      <div
        className={
          embedded
            ? "w-full mx-auto"
            : "relative w-full mx-auto rounded-[28px] border border-white/40 dark:border-white/15 bg-white/25 dark:bg-slate-900/45 backdrop-blur-xl p-4 sm:p-6 lg:p-7 shadow-[0_24px_60px_rgba(15,23,42,0.22)] transition-all duration-300"
        }
      >
        <div className="flex flex-col">
          {/* Secondary Filter Pills */}
          <div className="w-full flex items-center justify-start mb-3.5">
            <div className="inline-flex items-center gap-2 flex-wrap">
              {travellingWay?.map((way, index) => {
                const isActive = activeTab === way;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveTab(way)}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full text-xs cursor-pointer transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? "bg-white text-[#085c44] font-bold shadow-sm border border-white"
                        : "bg-white/55 hover:bg-white/80 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 font-semibold border border-white/55 dark:border-white/15 backdrop-blur-sm"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full transition-colors ${
                        isActive ? "bg-[#085c44]" : "bg-slate-400/90"
                      }`}
                    />
                    <span>{way}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4 Separated Modular Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1.35fr] gap-2.5 lg:gap-3 overflow-visible relative">
            {/* CARD 1: CITY / AREA */}
            <div className="rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-900/95 border border-white/85 dark:border-slate-700/80 focus-within:border-[#085c44]/70 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.08)] px-4 sm:px-5 py-2.5 sm:py-3 min-h-[82px] sm:min-h-[86px] flex flex-col justify-between transition-all duration-200">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <MapPin size={13} className="text-slate-600 dark:text-slate-400 shrink-0" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  CITY / AREA
                </p>
              </div>

              <input
                value={cityname}
                onChange={handleCitySearch}
                placeholder="Search city..."
                className="mt-0.5 w-full bg-transparent outline-none text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight placeholder:text-slate-400 placeholder:font-semibold truncate"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {destinationCountry
                  ? `Selected: ${destinationCountry.toUpperCase()}`
                  : "Search any city worldwide"}
              </p>
            </div>

            {/* CARD 2: BOOK BY */}
            <div
              className={`relative rounded-2xl bg-white/85 hover:bg-white/95 dark:bg-slate-900/95 border border-white/85 dark:border-slate-700/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.08)] px-4 sm:px-5 py-2.5 sm:py-3 min-h-[82px] sm:min-h-[86px] flex flex-col justify-between cursor-pointer group transition-all duration-200 ${
                openPicker ? "z-50" : "z-30"
              }`}
              onClick={() => setOpenPicker(!openPicker)}
            >
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Calendar size={13} className="text-[#085c44] dark:text-emerald-400 shrink-0" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  BOOK BY
                </p>
              </div>

              <div className="flex items-baseline mt-0.5 gap-1.5">
                <span className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">
                  {bookByDate.getDate()}
                </span>
                <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
                  {bookByDate.toLocaleString("en-US", { month: "short" })}&#39;
                  {String(bookByDate.getFullYear()).slice(-2)}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {bookByDate.toLocaleDateString("en-US", { weekday: "long" })}
              </p>

              <HotelDatePicker
                open={openPicker}
                setOpen={setOpenPicker}
                selectedDate={bookByDate}
                setSelectedDate={setBookByDate}
                type="bookBy"
              />
            </div>

            {/* CARD 3: ROOMS & GUESTS */}
            <div
              className="relative rounded-2xl bg-white/90 hover:bg-white dark:bg-slate-900/95 border border-white/85 dark:border-slate-700/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.08)] px-4 sm:px-5 py-2.5 sm:py-3 min-h-[82px] sm:min-h-[86px] flex flex-col justify-between cursor-pointer group transition-all duration-200"
              onClick={() => setOpenroomguestselector(true)}
            >
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Users size={13} className="text-slate-600 dark:text-slate-400 shrink-0" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  ROOMS &amp; GUESTS
                </p>
              </div>

              <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight mt-0.5 truncate">
                {roomCount} Room{roomCount > 1 ? "s" : ""}, {adultCount} Adult
                {adultCount > 1 ? "s" : ""}
                {childrenCount > 0
                  ? `, ${childrenCount} Child${childrenCount > 1 ? "ren" : ""}`
                  : ""}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Configure occupancy
              </p>

              {openRoomguestselector && (
                <div
                  ref={roomGuestRef}
                  className="absolute top-full left-0 sm:left-auto sm:right-0 z-50 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-[95vw]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <RoomGuestSelector
                    openRoomguestselector={openRoomguestselector}
                    setOpenroomguestselector={setOpenroomguestselector}
                    roomCount={roomCount}
                    setRoomCount={setRoomCount}
                    adultCount={adultCount}
                    setAdultCount={setAdultCount}
                    childrenCount={childrenCount}
                    setChildrenCount={setChildrenCount}
                    childAges={childAges}
                    setChildAges={setChildAges}
                  />
                </div>
              )}
            </div>

            {/* CARD 4: DISPLAY CURRENCY + VERTICAL SEARCH HOTELS BUTTON */}
            <div className="rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-900/95 border border-white/85 dark:border-slate-700/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.08)] p-1.5 pl-4 sm:pl-5 min-h-[82px] sm:min-h-[86px] flex items-stretch justify-between gap-2 transition-all duration-200">
              <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                <NationalityDropdown
                  selectedCountry={billingCountry}
                  onSelectCountry={(country) => {
                    setBillingCountry(country);
                    localStorage.setItem(
                      "billingNationality",
                      JSON.stringify(country),
                    );
                  }}
                  countryData={countryData}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const isValidSearch = handleHotelSearch();
                  if (!isValidSearch) return;

                  if (onSearchSuccess) {
                    onSearchSuccess();
                  }

                  navigate("/hotel", {
                    state: {
                      hotels: [{ roomCount: roomCount }],
                    },
                  });
                }}
                className="shrink-0 w-[86px] sm:w-[92px] rounded-xl bg-[#085c44] hover:bg-[#064e3b] active:scale-[0.98] text-white font-bold text-xs sm:text-[13px] leading-tight flex flex-col items-center justify-center gap-0.5 shadow-sm transition-all cursor-pointer px-2 py-2 sm:py-2.5"
              >
                <span>Search</span>
                <span>Hotels</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {cityname.trim() !== "" &&
        !isCitySelected &&
        Array.isArray(cityData?.data) &&
        cityData.data.length > 0 && (
          <CityWithCountry
            cityData={cityData}
            setCityname={(value) => {
              setCityname(value);
              setIsCitySelected(true);
            }}
            setCityId={(value) => {
              setCityId(value);
              setIsCitySelected(true);
            }}
            setCountryCode={(value) => {
              setDestinationCountryCode(value);
              setIsCitySelected(true);
            }}
            onCitySelect={(selectedCity) => {
              setIsCitySelected(true);
              if (selectedCity?.country) {
                setDestinationCountry(selectedCity.country);
              }
              dispatch(clearCityData());
            }}
          />
        )}
    </>
  );
};

export default HotelSearch;
