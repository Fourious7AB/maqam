import React, { useEffect, useState, useRef, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import DeparturePlace from "../../pages/DeparturePlace";
import ArrivalPlace from "../../pages/ArrivalPlace";
import TravellerClass from "../travellerclasses/TravellerClass";
import HotelSearch from "../../pages/HotelSearch";
import { useNavigate, useLocation } from "react-router-dom";
import { fetchFlights } from "../reducer/FlightSearchSlice";
import {
  ChevronDown,
  Plus,
  X,
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  CalendarDays,
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  Building2,
  Home,
  Package,
  Search,
  Trash2,
  Users,
} from "lucide-react";

// import { FlightAPI } from "../../configs/api";
import { toast } from "react-toastify";
// import FlightCard from "../FlightList";

import { rotateSwap, clickSquash } from "../../animations/presets";
const travellingWay = ["One Way", "Round Trip", "Multi City"];

const AIRPORTS_URL =
  "https://raw.githubusercontent.com/mwgg/Airports/master/airports.json";

const formatLocalDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fallbackAirports = [
  {
    id: 1,
    name: "Delhi",
    airport: "Indira Gandhi International Airport",
    iataCode: "DEL",
    countryCode: "IN",
  },
  {
    id: 2,
    name: "Mumbai",
    airport: "Chhatrapati Shivaji Maharaj International Airport",
    iataCode: "BOM",
    countryCode: "IN",
  },
  {
    id: 3,
    name: "Bengaluru",
    airport: "Kempegowda International Airport",
    iataCode: "BLR",
    countryCode: "IN",
  },
  {
    id: 4,
    name: "Hyderabad",
    airport: "Rajiv Gandhi International Airport",
    iataCode: "HYD",
    countryCode: "IN",
  },
  {
    id: 5,
    name: "Kolkata",
    airport: "Netaji Subhas Chandra Bose International Airport",
    iataCode: "CCU",
    countryCode: "IN",
  },
  {
    id: "JED",
    name: "Jeddah",
    airport: "King Abdulaziz International Airport",
    iataCode: "JED",
    countryCode: "SA",
  },
  {
    id: "MED",
    name: "Medina",
    airport: "Prince Mohammad Bin Abdulaziz International Airport",
    iataCode: "MED",
    countryCode: "SA",
  },
  {
    id: "IST",
    name: "Istanbul",
    airport: "Istanbul Airport",
    iataCode: "IST",
    countryCode: "TR",
  },
  {
    id: "CMN",
    name: "Casablanca",
    airport: "Mohammed V International Airport",
    iataCode: "CMN",
    countryCode: "MA",
  },
  {
    id: "TIR",
    name: "Tirana",
    airport: "Tirana International Airport",
    iataCode: "TIR",
    countryCode: "AL",
  },
];

const KNOWN_AIRPORTS = {
  DEL: {
    id: 1,
    name: "Delhi",
    airport: "Indira Gandhi International Airport",
    iataCode: "DEL",
    countryCode: "IN",
  },
  JED: {
    id: "JED",
    name: "Jeddah",
    airport: "King Abdulaziz International Airport",
    iataCode: "JED",
    countryCode: "SA",
  },
  MED: {
    id: "MED",
    name: "Medina",
    airport: "Prince Mohammad Bin Abdulaziz International Airport",
    iataCode: "MED",
    countryCode: "SA",
  },
  IST: {
    id: "IST",
    name: "Istanbul",
    airport: "Istanbul Airport",
    iataCode: "IST",
    countryCode: "TR",
  },
  CMN: {
    id: "CMN",
    name: "Casablanca",
    airport: "Mohammed V International Airport",
    iataCode: "CMN",
    countryCode: "MA",
  },
  TIR: {
    id: "TIR",
    name: "Tirana",
    airport: "Tirana International Airport",
    iataCode: "TIR",
    countryCode: "AL",
  },
  BOM: {
    id: 2,
    name: "Mumbai",
    airport: "Chhatrapati Shivaji Maharaj International Airport",
    iataCode: "BOM",
    countryCode: "IN",
  },
  BLR: {
    id: 3,
    name: "Bengaluru",
    airport: "Kempegowda International Airport",
    iataCode: "BLR",
    countryCode: "IN",
  },
  HYD: {
    id: 4,
    name: "Hyderabad",
    airport: "Rajiv Gandhi International Airport",
    iataCode: "HYD",
    countryCode: "IN",
  },
  CCU: {
    id: 5,
    name: "Kolkata",
    airport: "Netaji Subhas Chandra Bose International Airport",
    iataCode: "CCU",
    countryCode: "IN",
  },
};

const resolveAirport = (iataCode, airportList, fallbackObj) => {
  if (!iataCode) return fallbackObj || null;
  const code = iataCode.toUpperCase();
  if (fallbackObj && fallbackObj.iataCode?.toUpperCase() === code) {
    return fallbackObj;
  }
  const match = airportList?.find(
    (a) => a.iataCode?.toUpperCase() === code,
  );
  if (match) return match;
  if (KNOWN_AIRPORTS[code]) {
    return KNOWN_AIRPORTS[code];
  }
  return {
    id: code,
    name: code,
    airport: `${code} Airport`,
    iataCode: code,
    countryCode: "",
  };
};

const farePrice = [
  {
    date: "2026-11-08",
    price: 4299,
  },
  {
    date: "2026-11-09",
    price: 3899,
  },
  {
    date: "2026-11-10",
    price: 5199,
  },
];

const travellClass = [
  "All",
  "Economy",
  "Premium Economy",
  "Business",
  "Premium Business",
  "First Class",
];

const services = [
  {
    name: "FLIGHT",
    icon: Plane,
    active: true,
  },
  {
    name: "HOTEL",
    icon: Building2,
    active: false,
  },
];

const MultiCityAirportDropdown = ({ airports, onSelect, onClose }) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (!airports || airports.length === 0) {
    return (
      <div
        ref={dropdownRef}
        onClick={(e) => e.stopPropagation()}
        className="absolute left-0 top-full mt-2 w-[calc(100vw-32px)] sm:w-[380px] max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)] z-[9999] border border-gray-100 dark:border-slate-800 p-6 text-center text-xs text-gray-500"
      >
        No matching airports found
      </div>
    );
  }

  return (
    <div
      ref={dropdownRef}
      onClick={(e) => e.stopPropagation()}
      className="absolute left-0 top-full mt-2 w-[calc(100vw-32px)] sm:w-[400px] max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)] z-[9999] border border-gray-100 dark:border-slate-800 overflow-hidden"
    >
      <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-800/80 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between select-none">
        <div className="flex items-center gap-1.5">
          <Plane className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 rotate-45" />
          <span className="text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-300 uppercase">
            Select Airport
          </span>
        </div>
        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-full">
          {airports.length} found
        </span>
      </div>

      <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {airports.map((airport) => (
          <button
            key={airport.id || airport.iataCode}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(airport);
            }}
            className="group flex w-full items-center justify-between px-3 py-2.5 rounded-xl hover:bg-teal-50/40 dark:hover:bg-slate-800/70 border border-transparent transition-all duration-150 text-left cursor-pointer"
          >
            {/* Left */}
            <div className="flex items-center gap-3 min-w-0 pr-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-2xs shrink-0">
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

            {/* Right */}
            <div className="flex flex-col items-end shrink-0 pl-1">
              <div className="px-2.5 py-1 rounded-lg transition-all font-mono shadow-2xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700 group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600">
                <span className="text-xs font-black tracking-wider">
                  {airport.iataCode}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const CommonFlightHotelSearchBox = ({
  selectedFare,
  setSelectedFare,
  headerChange,
  onSearchSuccess,
  departureDate,
  embedded = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const fromDebounceRef = useRef(null);
  const toDebounceRef = useRef(null);
  const { flightsData, loading, error } = useSelector(
    (state) => state.flightSearch,
  );
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("activeTab") || "One Way";
  });
  const [searchbox, setSearchbox] = useState("FLIGHT");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d;
  });

  const departurePickerRef = useRef(null);
  const returnPickerRef = useRef(null);
  const swapDegRef = useRef(0);

  const handleStartDateChange = (date) => {
    if (!date) return;
    setStartDate(date);
    if (endDate && endDate < date) {
      const nextEnd = new Date(date);
      nextEnd.setDate(nextEnd.getDate() + 3);
      setEndDate(nextEnd);
    }
  };

  const handleTabClick = (way) => {
    if (activeTab === way) return;

    setActiveTab(way);
    localStorage.setItem("activeTab", way);

    let nextEndDate = endDate;
    if (way === "Round Trip") {
      if (!endDate || endDate < startDate) {
        const nextEnd = new Date(startDate || new Date());
        nextEnd.setDate(nextEnd.getDate() + 3);
        setEndDate(nextEnd);
        nextEndDate = nextEnd;
      }
    }

    // Only auto-trigger search if the results list is open (e.g. on /flight-list or headerChange mode)
    const isListOpen = Boolean(headerChange) || location.pathname === "/flight-list";

    if (isListOpen && (way === "One Way" || way === "Round Trip")) {
      const storedFlightSearch = (() => {
        try {
          return JSON.parse(localStorage.getItem("flightSearch")) || {};
        } catch {
          return {};
        }
      })();

      const originCode = selectedFrom?.iataCode || storedFlightSearch.origin;
      const destCode = selectedTo?.iataCode || storedFlightSearch.destination;

      if (!originCode || !destCode) {
        return;
      }

      const activePassengers = travellers?.adult
        ? {
            adults: travellers?.adult ?? 1,
            children: travellers?.child ?? 0,
            infants: travellers?.infant ?? 0,
          }
        : storedFlightSearch.passengers || { adults: 1, children: 0, infants: 0 };

      const departDateStr = formatLocalDate(startDate) || storedFlightSearch.departureDate;

      const payload = {
        origin: originCode,
        destination: destCode,
        departureDate: departDateStr,
        passengers: activePassengers,
        journeyType: way === "Round Trip" ? "roundtrip" : "oneway",
      };

      if (way === "Round Trip") {
        const retDate =
          nextEndDate && !Number.isNaN(nextEndDate.getTime())
            ? formatLocalDate(nextEndDate)
            : storedFlightSearch.returnDate ||
              formatLocalDate(new Date(Date.now() + 3 * 86400000));
        payload.returnDate = retDate;
      }

      // Update stored flightSearch in localStorage
      localStorage.setItem("flightSearch", JSON.stringify(payload));
      if (travellers) {
        localStorage.setItem("travellers", JSON.stringify(travellers));
      }

      // Dispatch search to update Redux store and refresh flight results
      dispatch(fetchFlights(payload));
      if (onSearchSuccess) {
        onSearchSuccess();
      }
    }
  };

  const toggleReturnTicket = (enable) => {
    if (enable) {
      handleTabClick("Round Trip");
      let nextEnd = endDate;
      if (!endDate || endDate < startDate) {
        nextEnd = new Date(startDate || new Date());
        nextEnd.setDate(nextEnd.getDate() + 3);
        setEndDate(nextEnd);
      }
      setTimeout(() => {
        returnPickerRef.current?.setOpen(true);
      }, 120);
    } else {
      handleTabClick("One Way");
    }
  };

  const handleEndDateChange = (date) => {
    if (date) {
      setEndDate(date);
      if (activeTab === "One Way") {
        handleTabClick("Round Trip");
      }
    }
  };

  const handleReturnClick = (e) => {
    if (activeTab !== "Round Trip") {
      handleTabClick("Round Trip");
      setTimeout(() => {
        returnPickerRef.current?.setOpen(true);
      }, 100);
    } else {
      if (!e || (e.target && e.target.tagName !== "INPUT")) {
        returnPickerRef.current?.setOpen(true);
      }
    }
  };

  useEffect(() => {
    if (departureDate) {
      const d =
        departureDate instanceof Date
          ? departureDate
          : new Date(`${departureDate}T00:00:00`);
      if (!Number.isNaN(d.getTime())) {
        setStartDate(d);
      }
    }
  }, [departureDate]);
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [airportDirectory, setAirportDirectory] = useState(fallbackAirports);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [selectedFrom, setSelectedFrom] = useState(null);
  const [selectedTo, setSelectedTo] = useState(null);
  const [selectedTravellers, setSelectedTravellers] = useState(1);
  const [selectedClass, setSelectedClass] = useState(false);
  const [travellers, setTravellers] = useState({
    adult: 1,
    child: 0,
    infant: 0,
    travelClass: "Economy",
  });

  const [multiCity, setMultiCity] = useState(() => {
    if (!embedded) {
      const saved = localStorage.getItem("multiCity");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length >= 2) {
            return parsed.map((leg, idx) => ({
              id: leg.id || Date.now() + idx,
              fromQuery: leg.fromQuery || leg.selectedFrom?.name || leg.from || "",
              selectedFrom: leg.selectedFrom || null,
              toQuery: leg.toQuery || leg.selectedTo?.name || leg.to || "",
              selectedTo: leg.selectedTo || null,
              departureDate: leg.departureDate ? new Date(leg.departureDate) : new Date(),
            }));
          }
        } catch (e) {
          console.error("Failed to parse multiCity from localStorage:", e);
        }
      }
    }
    const defaultDate1 = new Date();
    const defaultDate2 = new Date();
    defaultDate2.setDate(defaultDate2.getDate() + 3);
    return [
      {
        id: 1,
        fromQuery: "",
        selectedFrom: null,
        toQuery: "",
        selectedTo: null,
        departureDate: defaultDate1,
      },
      {
        id: 2,
        fromQuery: "",
        selectedFrom: null,
        toQuery: "",
        selectedTo: null,
        departureDate: defaultDate2,
      },
    ];
  });

  const [activeMultiCityDropdown, setActiveMultiCityDropdown] = useState(null);

  const isMultiCityValid = useMemo(() => {
    if (activeTab !== "Multi City") return true;
    if (!Array.isArray(multiCity) || multiCity.length < 2) return false;
    return multiCity.every(
      (leg) =>
        leg.selectedFrom?.iataCode &&
        leg.selectedTo?.iataCode &&
        leg.departureDate &&
        !Number.isNaN(new Date(leg.departureDate).getTime()),
    );
  }, [activeTab, multiCity]);

  // Synchronize Leg 0 and Leg 1 from selectedFrom/selectedTo if empty
  useEffect(() => {
    if (selectedFrom || selectedTo) {
      setMultiCity((prev) => {
        if (!Array.isArray(prev) || prev.length < 2) return prev;
        let changed = false;
        const next = prev.map((item) => ({ ...item }));
        if (!next[0].selectedFrom && selectedFrom) {
          next[0].selectedFrom = selectedFrom;
          next[0].fromQuery = formatSuggestion(selectedFrom);
          changed = true;
        }
        if (!next[0].selectedTo && selectedTo) {
          next[0].selectedTo = selectedTo;
          next[0].toQuery = formatSuggestion(selectedTo);
          if (!next[1].selectedFrom) {
            next[1].selectedFrom = selectedTo;
            next[1].fromQuery = formatSuggestion(selectedTo);
          }
          changed = true;
        }
        return changed ? next : prev;
      });
    }
  }, [selectedFrom, selectedTo]);

  const [showNavbar, setShowNavbar] = useState(true);
  const [isDisabled, setIsDisabled] = useState(true);
  const formatSuggestion = (item) => item?.name || item?.iataCode || "";

  const findAirports = (query) => {
    const search = (query || "").trim().toLowerCase();
    if (!search) return airportDirectory.slice(0, 30);

    return airportDirectory
      .filter((airport) =>
        [airport.name, airport.airport, airport.iataCode].some((value) =>
          value?.toLowerCase().includes(search),
        ),
      )
      .slice(0, 30);
  };
  const handleSwapLocations = (e) => {
    if (e?.currentTarget) {
      swapDegRef.current += 180;
      rotateSwap(e.currentTarget, swapDegRef.current);
    }
    const nextFrom = selectedTo;
    const nextTo = selectedFrom;
    const nextFromQuery = toQuery;
    const nextToQuery = fromQuery;

    setFromQuery(nextFromQuery);
    setToQuery(nextToQuery);
    setSelectedFrom(nextFrom);
    setSelectedTo(nextTo);
    setFromSuggestions([]);
    setToSuggestions([]);
    setShowFromSuggestions(false);
    setShowToSuggestions(false);

    if (nextFrom) {
      localStorage.setItem("selectedFrom", JSON.stringify(nextFrom));
    }
    if (nextTo) {
      localStorage.setItem("selectedTo", JSON.stringify(nextTo));
    }
  };

  const handleNavbar = () => {
    setShowNavbar(true);
  };

  const searchFlights = {
    origin: selectedFrom?.iataCode,
    destination: selectedTo?.iataCode,
    departureDate: formatLocalDate(startDate),
    passengers: {
      adults: travellers?.adult,
      children: travellers?.child,
      infants: travellers?.infant,
    },
    journeyType:
      activeTab === "Round Trip"
        ? "roundtrip"
        : activeTab === "Multi City"
          ? "multicity"
          : "oneway",
  };

  if (activeTab === "Round Trip") {
    searchFlights.returnDate = formatLocalDate(endDate);
  }

  const handleFlightSearch = (overrideTravellers) => {
    const activeTravellers = overrideTravellers || travellers;

    if (activeTab === "Round Trip") {
      if (!endDate || Number.isNaN(endDate.getTime())) {
        toast.warning("Please select a return date for your round trip flight.");
        setTimeout(() => returnPickerRef.current?.setOpen(true), 100);
        return false;
      }
      if (endDate < startDate) {
        toast.warning("Return date cannot be earlier than departure date.");
        setTimeout(() => returnPickerRef.current?.setOpen(true), 100);
        return false;
      }
    }

    if (activeTab === "Multi City") {
      if (!isMultiCityValid) {
        toast.warning("Please select departure airport, arrival airport and date for all city legs.");
        return false;
      }
      for (let i = 0; i < multiCity.length; i++) {
        const leg = multiCity[i];
        if (leg.selectedFrom.iataCode === leg.selectedTo.iataCode) {
          toast.warning(`Departure and arrival airport cannot be the same for Flight Leg ${i + 1}.`);
          return false;
        }
      }

      const formattedSegments = multiCity.map((leg) => ({
        origin: leg.selectedFrom.iataCode,
        destination: leg.selectedTo.iataCode,
        departureDate: formatLocalDate(new Date(leg.departureDate)),
      }));

      const payload = {
        origin: multiCity[0].selectedFrom.iataCode,
        destination: multiCity[multiCity.length - 1].selectedTo.iataCode,
        departureDate: formatLocalDate(new Date(multiCity[0].departureDate)),
        passengers: {
          adults: activeTravellers?.adult ?? 1,
          children: activeTravellers?.child ?? 0,
          infants: activeTravellers?.infant ?? 0,
        },
        journeyType: "multicity",
        segments: formattedSegments,
      };

      localStorage.setItem("flightSearch", JSON.stringify(payload));
      localStorage.setItem("multiCity", JSON.stringify(multiCity));
      if (activeTravellers) {
        localStorage.setItem("travellers", JSON.stringify(activeTravellers));
      }
      if (multiCity[0]?.selectedFrom) {
        localStorage.setItem("selectedFrom", JSON.stringify(multiCity[0].selectedFrom));
      }
      if (multiCity[multiCity.length - 1]?.selectedTo) {
        localStorage.setItem("selectedTo", JSON.stringify(multiCity[multiCity.length - 1].selectedTo));
      }

      dispatch(fetchFlights(payload));
      if (onSearchSuccess) {
        onSearchSuccess();
      }
      return true;
    }

    const payload = {
      origin: selectedFrom?.iataCode,
      destination: selectedTo?.iataCode,
      departureDate: formatLocalDate(startDate),
      passengers: {
        adults: activeTravellers?.adult ?? 1,
        children: activeTravellers?.child ?? 0,
        infants: activeTravellers?.infant ?? 0,
      },
      journeyType: activeTab === "Round Trip" ? "roundtrip" : "oneway",
    };

    if (activeTab === "Round Trip") {
      payload.returnDate = formatLocalDate(endDate);
    }

    // Save search payload
    localStorage.setItem("flightSearch", JSON.stringify(payload));
    if (activeTravellers) {
      localStorage.setItem("travellers", JSON.stringify(activeTravellers));
    }
    if (selectedFrom) {
      localStorage.setItem("selectedFrom", JSON.stringify(selectedFrom));
    }
    if (selectedTo) {
      localStorage.setItem("selectedTo", JSON.stringify(selectedTo));
    }
    // Dispatch API
    dispatch(fetchFlights(payload));
    if (onSearchSuccess) {
      onSearchSuccess();
    }
    return true;
  };

  const handleTravellerDone = (updatedTravellers) => {
    const active = updatedTravellers || travellers;
    if (active) {
      localStorage.setItem("travellers", JSON.stringify(active));
    }
    if (headerChange) {
      handleFlightSearch(active);
    }
  };

  const handleFromChange = (e) => {
    const value = e.target.value;

    setFromQuery(value);
    setSelectedFrom(null);

    // Cancel previous timer
    clearTimeout(fromDebounceRef.current);

    // Start a new timer
    fromDebounceRef.current = setTimeout(() => {
      setFromSuggestions(findAirports(value));
      setShowFromSuggestions(true);
    }, 500);
  };

  const handleToChange = (e) => {
    const value = e.target.value;

    setToQuery(value);
    setSelectedTo(null);

    // Cancel previous timer
    clearTimeout(toDebounceRef.current);

    // Start a new timer
    toDebounceRef.current = setTimeout(() => {
      setToSuggestions(findAirports(value));
      setShowToSuggestions(true);
    }, 500);
  };

  const handleMultiCityQueryChange = (index, field, value) => {
    setMultiCity((prev) => {
      const next = [...prev];
      if (field === "from") {
        next[index] = {
          ...next[index],
          fromQuery: value,
          selectedFrom: null,
        };
      } else {
        next[index] = {
          ...next[index],
          toQuery: value,
          selectedTo: null,
        };
      }
      return next;
    });
    setActiveMultiCityDropdown({ legIndex: index, field, query: value });
  };

  const handleSelectMultiCityAirport = (index, field, airport) => {
    setMultiCity((prev) => {
      const next = [...prev];
      if (field === "from") {
        next[index] = {
          ...next[index],
          selectedFrom: airport,
          fromQuery: formatSuggestion(airport),
        };
      } else {
        next[index] = {
          ...next[index],
          selectedTo: airport,
          toQuery: formatSuggestion(airport),
        };
        // Auto-populate next leg origin if it's currently empty
        if (next[index + 1] && !next[index + 1].selectedFrom) {
          next[index + 1] = {
            ...next[index + 1],
            selectedFrom: airport,
            fromQuery: formatSuggestion(airport),
          };
        }
      }
      return next;
    });
    setActiveMultiCityDropdown(null);
  };

  const handleMultiCityDateChange = (index, date) => {
    if (!date) return;
    setMultiCity((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], departureDate: date };
      // Cascade forward dates if subsequent leg date is earlier
      for (let j = index + 1; j < next.length; j++) {
        const curDate = new Date(next[j].departureDate || date);
        if (curDate < date) {
          const cascadeDate = new Date(date);
          cascadeDate.setDate(cascadeDate.getDate() + (j - index) * 2);
          next[j] = { ...next[j], departureDate: cascadeDate };
        }
      }
      return next;
    });
  };

  const addMultiCity = () => {
    if (multiCity.length < 5) {
      const lastLeg = multiCity[multiCity.length - 1];
      const nextDate = new Date(lastLeg?.departureDate || new Date());
      nextDate.setDate(nextDate.getDate() + 3);

      setMultiCity([
        ...multiCity,
        {
          id: Date.now(),
          fromQuery: lastLeg?.toQuery || "",
          selectedFrom: lastLeg?.selectedTo || null,
          toQuery: "",
          selectedTo: null,
          departureDate: nextDate,
        },
      ]);
    }
  };

  const removeMultiCity = (id) => {
    if (multiCity.length > 2) {
      setMultiCity(multiCity.filter((city) => city.id !== id));
    } else {
      toast.warning("Multi-city trip requires at least 2 flight legs.");
    }
  };

  // Synchronize state from location state or flightSearch in localStorage
  useEffect(() => {
    // Only restore previous search data if user is actively modifying a search (e.g. on /flight-list or headerChange)
    const isEditingSearch =
      Boolean(headerChange) ||
      location.pathname === "/flight-list" ||
      Boolean(location.state?.flights);

    if (!isEditingSearch || embedded) {
      setSelectedFrom(null);
      setFromQuery("");
      setSelectedTo(null);
      setToQuery("");
      setStartDate(new Date());
      const nextEnd = new Date();
      nextEnd.setDate(nextEnd.getDate() + 3);
      setEndDate(nextEnd);
      return;
    }

    let savedSearch = null;
    try {
      savedSearch =
        location.state?.flights?.[0]?.searchFlights ||
        JSON.parse(localStorage.getItem("flightSearch"));
    } catch {
      savedSearch = null;
    }

    let stateFrom = location.state?.flights?.[0]?.selectedFrom;
    let stateTo = location.state?.flights?.[0]?.selectedTo;

    if (!stateFrom) {
      try {
        stateFrom = JSON.parse(localStorage.getItem("selectedFrom"));
      } catch {
        stateFrom = null;
      }
    }

    if (!stateTo) {
      try {
        stateTo = JSON.parse(localStorage.getItem("selectedTo"));
      } catch {
        stateTo = null;
      }
    }

    if (savedSearch?.origin) {
      const resolvedFrom = resolveAirport(
        savedSearch.origin,
        airportDirectory,
        stateFrom?.iataCode === savedSearch.origin ? stateFrom : null,
      );
      setSelectedFrom(resolvedFrom);
      setFromQuery(resolvedFrom?.name || savedSearch.origin);
    } else if (stateFrom) {
      setSelectedFrom(stateFrom);
      setFromQuery(stateFrom.name || stateFrom.iataCode || "");
    }

    if (savedSearch?.destination) {
      const resolvedTo = resolveAirport(
        savedSearch.destination,
        airportDirectory,
        stateTo?.iataCode === savedSearch.destination ? stateTo : null,
      );
      setSelectedTo(resolvedTo);
      setToQuery(resolvedTo?.name || savedSearch.destination);
    } else if (stateTo) {
      setSelectedTo(stateTo);
      setToQuery(stateTo.name || stateTo.iataCode || "");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Departure Date: Always show current date on landing page (!headerChange) and never allow past dates
    if (headerChange && savedSearch?.departureDate) {
      const d = new Date(`${savedSearch.departureDate}T00:00:00`);
      if (!Number.isNaN(d.getTime()) && d >= today) {
        setStartDate(d);
      } else {
        setStartDate(new Date());
      }
    } else {
      setStartDate(new Date());
    }

    // Return Date: Ensure return date is always after or equal to departure date
    if (headerChange && savedSearch?.returnDate) {
      const d = new Date(`${savedSearch.returnDate}T00:00:00`);
      if (!Number.isNaN(d.getTime()) && d >= today) {
        setEndDate(d);
      } else {
        const nextEnd = new Date();
        nextEnd.setDate(nextEnd.getDate() + 3);
        setEndDate(nextEnd);
      }
    } else {
      const nextEnd = new Date();
      nextEnd.setDate(nextEnd.getDate() + 3);
      setEndDate(nextEnd);
    }

    if (savedSearch?.journeyType) {
      const jt = String(savedSearch.journeyType).toLowerCase();
      if (jt.includes("round")) {
        setActiveTab("Round Trip");
      } else if (jt.includes("multi")) {
        setActiveTab("Multi City");
      } else {
        setActiveTab("One Way");
      }
    }

    if (savedSearch?.passengers) {
      setTravellers((prev) => ({
        ...prev,
        adult: savedSearch.passengers.adults ?? prev.adult,
        child: savedSearch.passengers.children ?? prev.child,
        infant: savedSearch.passengers.infants ?? prev.infant,
      }));
    }
  }, [location.state, location.pathname, headerChange, embedded, airportDirectory]);

  useEffect(() => {
    if (activeTab === "Multi City") {
      setIsDisabled(!isMultiCityValid);
    } else {
      setIsDisabled(!(selectedFrom && selectedTo));
    }
  }, [activeTab, isMultiCityValid, selectedFrom, selectedTo]);

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem("activeTab", activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem("multiCity", JSON.stringify(multiCity));
  }, [multiCity]);

  useEffect(() => {
    let active = true;
    const cached = sessionStorage.getItem("flight-airport-directory");

    if (cached) {
      try {
        setAirportDirectory(JSON.parse(cached));
        return undefined;
      } catch {
        sessionStorage.removeItem("flight-airport-directory");
      }
    }

    fetch(AIRPORTS_URL)
      .then((response) => {
        if (!response.ok) throw new Error("Airport directory unavailable");
        return response.json();
      })
      .then((airports) => {
        const normalized = Object.values(airports)
          .filter((airport) => airport.iata && airport.name && airport.city)
          .map((airport, index) => ({
            id: airport.icao || `${airport.iata}-${index}`,
            name: airport.city,
            airport: airport.name,
            iataCode: airport.iata,
            countryCode: airport.country || "",
          }))
          .sort((first, second) => first.name.localeCompare(second.name));

        if (active && normalized.length > 0) {
          setAirportDirectory(normalized);
          sessionStorage.setItem(
            "flight-airport-directory",
            JSON.stringify(normalized),
          );
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      {headerChange ? (
        <div className="relative w-full px-2 sm:px-4 py-3 z-40">
          <div className="relative flex flex-col items-center max-w-7xl mx-auto w-full">
            {/* Flight Search Card Container */}
            {searchbox === "FLIGHT" && (
              <div className="relative w-full rounded-[28px] border border-white/40 dark:border-white/15 bg-white/25 dark:bg-slate-900/45 backdrop-blur-xl p-4 sm:p-6 shadow-[0_24px_60px_rgba(15,23,42,0.22)] transition-all">
                {/* Trip Type Selector */}
                <div className="w-full flex items-center justify-start mb-3.5">
                  <div className="inline-flex items-center gap-2 flex-wrap">
                    {travellingWay?.map((way, index) => {
                      const isActive = activeTab === way;
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleTabClick(way)}
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

                {(activeTab === "One Way" || activeTab === "Round Trip") && (
                  <div className="relative">
                    {/* 4 Separated Modular Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2.15fr_1.45fr_1.4fr] gap-2.5 lg:gap-3 overflow-visible">
                      {/* CARD 1 & CARD 2: FROM & TO WITH BRIDGE SWAP BUTTON */}
                      <div className="sm:col-span-2 lg:col-span-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 lg:gap-3 relative">
                        {/*Swap Button Bridging Card 1 & Card 2*/}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSwapLocations(e);
                          }}
                          title="Swap Departure & Arrival"
                          className="flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 sm:rotate-0 w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-[#085c44] hover:text-white hover:border-[#085c44] items-center justify-center shadow-sm z-30 cursor-pointer transition-all duration-200 active:scale-95"
                        >
                          <ArrowLeftRight size={13} strokeWidth={2.2} />
                        </button>

                        {/* CARD 1: FROM */}
                        <div
                          onClick={() => {
                            setFromSuggestions(findAirports(fromQuery));
                            setShowFromSuggestions(true);
                          }}
                          className="departure-field-container relative rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-900/95 border border-white/85 dark:border-slate-700/80 focus-within:border-[#085c44]/70 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.08)] cursor-pointer group transition-all duration-200 px-4 sm:px-5 py-3.5 flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <PlaneTakeoff className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
                              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                FROM
                              </p>
                            </div>
                            {selectedFrom?.iataCode && (
                              <span className="text-[10px] font-bold tracking-wider text-[#085c44] dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md">
                                {selectedFrom.iataCode}
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={fromQuery}
                            onFocus={() => {
                              setFromSuggestions(findAirports(fromQuery));
                              setShowFromSuggestions(true);
                              setShowToSuggestions(false);
                              setToSuggestions([]);
                            }}
                            onChange={handleFromChange}
                            placeholder="City or airport"
                            className="mt-1 text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight placeholder:text-slate-400 placeholder:font-semibold outline-none bg-transparent w-full truncate"
                          />
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal truncate">
                            {selectedFrom?.airport || "Select departure airport"}
                          </p>

                          <DeparturePlace
                            fromSuggestions={fromSuggestions}
                            showFromSuggestions={showFromSuggestions}
                            setFromQuery={setFromQuery}
                            formatSuggestion={formatSuggestion}
                            selectedFrom={selectedFrom}
                            setSelectedFrom={setSelectedFrom}
                            setFromSuggestions={setFromSuggestions}
                            setShowFromSuggestions={setShowFromSuggestions}
                            isDisabled={isDisabled}
                            setIsDisabled={setIsDisabled}
                            showToSuggestions={showToSuggestions}
                          />
                        </div>

                        {/* CARD 2: TO */}
                        <div
                          onClick={() => {
                            setToSuggestions(findAirports(toQuery));
                            setShowToSuggestions(true);
                          }}
                          className="arrival-field-container relative rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-900/95 border border-white/85 dark:border-slate-700/80 focus-within:border-[#085c44]/70 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.08)] cursor-pointer group transition-all duration-200 px-4 sm:px-5 py-3.5 sm:pl-6 flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <PlaneLanding className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
                              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                TO
                              </p>
                            </div>
                            {selectedTo?.iataCode && (
                              <span className="text-[10px] font-bold tracking-wider text-[#085c44] dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md">
                                {selectedTo.iataCode}
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={toQuery}
                            onFocus={() => {
                              setToSuggestions(findAirports(toQuery));
                              setShowToSuggestions(true);
                              setFromSuggestions([]);
                            }}
                            onChange={handleToChange}
                            placeholder="City or airport"
                            className="mt-1 text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight placeholder:text-slate-400 placeholder:font-semibold outline-none bg-transparent w-full truncate"
                          />
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal truncate">
                            {selectedTo?.airport || "Select arrival airport"}
                          </p>

                          <ArrivalPlace
                            toSuggestions={toSuggestions}
                            showToSuggestions={showToSuggestions}
                            setToQuery={setToQuery}
                            formatSuggestion={formatSuggestion}
                            selectedTo={selectedTo}
                            setToSuggestions={setToSuggestions}
                            setSelectedTo={setSelectedTo}
                            setShowToSuggestions={setShowToSuggestions}
                            setShowFromSuggestions={setShowFromSuggestions}
                            isDisabled={isDisabled}
                            setIsDisabled={setIsDisabled}
                          />
                        </div>
                      </div>

                      {/* CARD 3: DATE SECTION (Single Departure or Round Trip) */}
                      {activeTab !== "Round Trip" ? (
                        /* Single Departure Mode with "Book also Return Ticket" Action */
                        <div
                          onClick={() => {
                            departurePickerRef.current?.setOpen(true);
                          }}
                          className="rounded-2xl bg-white/85 hover:bg-white/95 dark:bg-slate-900/95 border border-white/85 dark:border-slate-700/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.08)] px-4 sm:px-5 py-3.5 flex flex-col justify-between cursor-pointer group transition-all duration-200 relative overflow-visible"
                        >
                          <div>
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                              <CalendarDays className="w-3.5 h-3.5 text-[#085c44] dark:text-emerald-400 shrink-0" />
                              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                DEPARTURE
                              </p>
                            </div>

                            <DatePicker
                              ref={departurePickerRef}
                              selected={startDate}
                              onChange={handleStartDateChange}
                              dateFormat="d MMM''yy"
                              minDate={new Date()}
                              wrapperClassName="w-full"
                              popperClassName="z-[99999]"
                              customInput={
                                <div className="flex items-baseline gap-1.5 mt-1 cursor-pointer select-none">
                                  <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">
                                    {startDate ? startDate.getDate() : "--"}
                                  </span>
                                  <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
                                    {startDate
                                      ? `${startDate.toLocaleString("en-US", { month: "short" })}'${String(startDate.getFullYear()).slice(-2)}`
                                      : ""}
                                  </span>
                                </div>
                              }
                              renderCustomHeader={({
                                monthDate,
                                decreaseMonth,
                                increaseMonth,
                              }) => (
                                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-t-2xl">
                                  <button
                                    type="button"
                                    onClick={decreaseMonth}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-[#045C45] dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition active:scale-90 cursor-pointer"
                                    aria-label="Previous Month"
                                  >
                                    <ArrowLeft size={15} />
                                  </button>
                                  <span className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                                    {monthDate.toLocaleString("default", {
                                      month: "long",
                                      year: "numeric",
                                    })}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={increaseMonth}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-[#045C45] dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition active:scale-90 cursor-pointer"
                                    aria-label="Next Month"
                                  >
                                    <ArrowRight size={15} />
                                  </button>
                                </div>
                              )}
                            >
                              <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 flex items-center justify-between gap-2 rounded-b-2xl">
                                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                  Quick Pick:
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartDateChange(new Date());
                                      departurePickerRef.current?.setOpen(false);
                                    }}
                                    className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-slate-200/90 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500 text-slate-700 dark:text-slate-200 hover:text-[#045C45] dark:hover:text-emerald-300 transition-all text-xs font-semibold cursor-pointer whitespace-nowrap shadow-2xs"
                                  >
                                    Today
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const d = new Date();
                                      d.setDate(d.getDate() + 1);
                                      handleStartDateChange(d);
                                      departurePickerRef.current?.setOpen(false);
                                    }}
                                    className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-slate-200/90 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500 text-slate-700 dark:text-slate-200 hover:text-[#045C45] dark:hover:text-emerald-300 transition-all text-xs font-semibold cursor-pointer whitespace-nowrap shadow-2xs"
                                  >
                                    Tomorrow
                                  </button>
                                </div>
                              </div>
                            </DatePicker>

                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal truncate">
                              {startDate
                                ? startDate.toLocaleDateString("en-US", {
                                    weekday: "long",
                                  })
                                : ""}
                            </p>
                          </div>

                          {/* "Book also Return Ticket" Interactive Component */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleReturnTicket(true);
                            }}
                            className="mt-2 w-full py-1.5 px-2.5 rounded-xl bg-teal-50 hover:bg-teal-100/90 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 border border-dashed border-teal-300 dark:border-emerald-600/60 text-teal-800 dark:text-emerald-300 transition-all flex items-center justify-between group/return cursor-pointer active:scale-95 shadow-2xs"
                          >
                            <div className="flex items-center gap-1.5 text-[11px] font-bold">
                              <Plus className="w-3.5 h-3.5 text-teal-600 dark:text-emerald-400 group-hover/return:rotate-90 transition-transform duration-200" />
                              <span>Book also Return Ticket</span>
                            </div>
                            <span className="text-[9px] font-bold text-teal-700 dark:text-emerald-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded shadow-2xs">
                              Round Trip
                            </span>
                          </button>
                        </div>
                      ) : (
                        /* Dual Mode: DEPARTURE + RETURN */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {/* Departure Half */}
                          <div
                            onClick={() => {
                              departurePickerRef.current?.setOpen(true);
                            }}
                            className="rounded-2xl bg-white/85 hover:bg-white/95 dark:bg-slate-900/95 border border-white/85 dark:border-slate-700/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.08)] px-3 py-2.5 flex flex-col justify-between cursor-pointer group transition-all duration-200 relative overflow-visible"
                          >
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                              <CalendarDays className="w-3.5 h-3.5 text-[#085c44] dark:text-emerald-400 shrink-0" />
                              <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                DEPARTURE
                              </p>
                            </div>

                            <DatePicker
                              ref={departurePickerRef}
                              selected={startDate}
                              onChange={handleStartDateChange}
                              dateFormat="d MMM''yy"
                              minDate={new Date()}
                              wrapperClassName="w-full"
                              popperClassName="z-[99999]"
                              customInput={
                                <div className="flex items-baseline gap-1 mt-0.5 cursor-pointer select-none">
                                  <span className="text-lg font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">
                                    {startDate ? startDate.getDate() : "--"}
                                  </span>
                                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                    {startDate
                                      ? `${startDate.toLocaleString("en-US", { month: "short" })}'${String(startDate.getFullYear()).slice(-2)}`
                                      : ""}
                                  </span>
                                </div>
                              }
                            />

                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate mt-0.5">
                              {startDate
                                ? startDate.toLocaleDateString("en-US", { weekday: "short" })
                                : ""}
                            </p>
                          </div>

                          {/* Return Half */}
                          <div
                            onClick={(e) => {
                              handleReturnClick(e);
                            }}
                            className="rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-900/95 border border-emerald-300 dark:border-emerald-600/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.08)] px-3 py-2.5 flex flex-col justify-between cursor-pointer group transition-all duration-200 relative overflow-visible ring-1 ring-emerald-400/20"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                                <CalendarDays className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <p className="text-[10px] font-bold uppercase tracking-wider">
                                  RETURN
                                </p>
                              </div>
                              <button
                                type="button"
                                title="Remove Return (Switch to One Way)"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleReturnTicket(false);
                                }}
                                className="p-0.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition cursor-pointer"
                              >
                                <X size={13} />
                              </button>
                            </div>

                            <DatePicker
                              ref={returnPickerRef}
                              selected={endDate}
                              onChange={handleEndDateChange}
                              dateFormat="d MMM''yy"
                              minDate={startDate || new Date()}
                              wrapperClassName="w-full"
                              popperClassName="z-[99999]"
                              customInput={
                                <div className="flex items-baseline gap-1 mt-0.5 cursor-pointer select-none">
                                  <span className="text-lg font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">
                                    {endDate ? endDate.getDate() : "--"}
                                  </span>
                                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                    {endDate
                                      ? `${endDate.toLocaleString("en-US", { month: "short" })}'${String(endDate.getFullYear()).slice(-2)}`
                                      : ""}
                                  </span>
                                </div>
                              }
                            >
                              <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-1 text-[10px]">
                                <span className="text-slate-400 font-bold uppercase">Quick:</span>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const d = new Date(startDate || new Date());
                                      d.setDate(d.getDate() + 3);
                                      handleEndDateChange(d);
                                      returnPickerRef.current?.setOpen(false);
                                    }}
                                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 hover:bg-emerald-50 border text-slate-700 text-[10px] font-semibold"
                                  >
                                    +3D
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const d = new Date(startDate || new Date());
                                      d.setDate(d.getDate() + 7);
                                      handleEndDateChange(d);
                                      returnPickerRef.current?.setOpen(false);
                                    }}
                                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 hover:bg-emerald-50 border text-slate-700 text-[10px] font-semibold"
                                  >
                                    +7D
                                  </button>
                                </div>
                              </div>
                            </DatePicker>

                            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium truncate mt-0.5">
                              {endDate
                                ? `${endDate.toLocaleDateString("en-US", { weekday: "short" })}${
                                    startDate && endDate > startDate
                                      ? ` (${Math.round((endDate - startDate) / (1000 * 60 * 60 * 24))}d)`
                                      : ""
                                  }`
                                : "Pick return"}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* CARD 4: TRAVELLERS & CLASS + VERTICAL SEARCH FLIGHTS BUTTON */}
                      <div className="rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-900/95 border border-white/85 dark:border-slate-700/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.08)] p-2 pl-4 sm:pl-5 flex items-stretch justify-between gap-3 transition-all duration-200">
                        <div className="flex-1 min-w-0 py-1.5 flex flex-col justify-between">
                          <TravellerClass
                            travellers={travellers}
                            setTravellers={setTravellers}
                            setSelectedClass={setSelectedClass}
                            selectedClass={selectedClass}
                            onDone={handleTravellerDone}
                          />
                        </div>

                        <button
                          type="button"
                          disabled={isDisabled}
                          onClick={(e) => {
                            clickSquash(e.currentTarget);
                            handleFlightSearch();
                          }}
                          className={`shrink-0 w-[86px] sm:w-[92px] rounded-xl bg-[#085c44] hover:bg-[#064e3b] text-white shadow-md flex flex-col items-center justify-center gap-1.5 px-3 py-3 transition-all duration-200 ${
                            isDisabled
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer active:scale-[0.98]"
                          }`}
                        >
                          <Search className="w-4 h-4 shrink-0 stroke-[2.2]" />
                          <span className="text-xs font-bold leading-tight text-center">
                            Search
                            <br />
                            Flights
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Multi City Mode */}
                {activeTab === "Multi City" && (
                  <div className="space-y-3 mt-2">
                    {multiCity?.map((leg, index) => (
                      <div
                        key={leg.id || index}
                        className="relative bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-4 transition-colors"
                      >
                        {/* Leg Header */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Flight {index + 1}
                          </span>
                          {multiCity.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeMultiCity(leg.id)}
                              className="flex items-center gap-1 text-slate-400 hover:text-rose-600 px-2 py-1 rounded-lg text-xs font-medium transition cursor-pointer"
                              title="Remove this city leg"
                            >
                              <Trash2 size={13} />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>

                        {/* Inputs Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 divide-y md:divide-y-0 md:divide-x divide-slate-200/90 dark:divide-slate-800 overflow-visible">
                          {/* From */}
                          <div
                            onClick={() => {
                              setActiveMultiCityDropdown({ legIndex: index, field: "from", query: leg.fromQuery });
                            }}
                            className="relative p-3 sm:p-3.5 cursor-pointer hover:bg-slate-50/70 transition rounded-t-xl md:rounded-tr-none md:rounded-l-xl"
                          >
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                              From
                            </p>
                            <input
                              type="text"
                              value={leg.fromQuery}
                              onChange={(e) => handleMultiCityQueryChange(index, "from", e.target.value)}
                              onFocus={() => setActiveMultiCityDropdown({ legIndex: index, field: "from", query: leg.fromQuery })}
                              placeholder="City or airport"
                              className="text-sm sm:text-base font-bold text-slate-900 dark:text-white outline-none bg-transparent w-full truncate"
                            />
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {leg.selectedFrom?.airport || "Select departure airport"}
                            </p>

                            {activeMultiCityDropdown?.legIndex === index && activeMultiCityDropdown?.field === "from" && (
                              <MultiCityAirportDropdown
                                airports={findAirports(activeMultiCityDropdown.query || leg.fromQuery)}
                                onSelect={(airport) => handleSelectMultiCityAirport(index, "from", airport)}
                                onClose={() => setActiveMultiCityDropdown(null)}
                              />
                            )}
                          </div>

                          {/* To */}
                          <div
                            onClick={() => {
                              setActiveMultiCityDropdown({ legIndex: index, field: "to", query: leg.toQuery });
                            }}
                            className="relative p-3 sm:p-3.5 cursor-pointer hover:bg-slate-50/70 transition"
                          >
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                              To
                            </p>
                            <input
                              type="text"
                              value={leg.toQuery}
                              onChange={(e) => handleMultiCityQueryChange(index, "to", e.target.value)}
                              onFocus={() => setActiveMultiCityDropdown({ legIndex: index, field: "to", query: leg.toQuery })}
                              placeholder="City or airport"
                              className="text-sm sm:text-base font-bold text-slate-900 dark:text-white outline-none bg-transparent w-full truncate"
                            />
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {leg.selectedTo?.airport || "Select arrival airport"}
                            </p>

                            {activeMultiCityDropdown?.legIndex === index && activeMultiCityDropdown?.field === "to" && (
                              <MultiCityAirportDropdown
                                airports={findAirports(activeMultiCityDropdown.query || leg.toQuery)}
                                onSelect={(airport) => handleSelectMultiCityAirport(index, "to", airport)}
                                onClose={() => setActiveMultiCityDropdown(null)}
                              />
                            )}
                          </div>

                          {/* Departure Date */}
                          <div className="relative p-3 sm:p-3.5 cursor-pointer hover:bg-slate-50/70 transition rounded-b-xl md:rounded-bl-none md:rounded-r-xl flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                Departure
                              </p>
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <DatePicker
                              selected={leg.departureDate ? new Date(leg.departureDate) : new Date()}
                              onChange={(date) => handleMultiCityDateChange(index, date)}
                              dateFormat="d MMM''yy"
                              minDate={index === 0 ? new Date() : new Date(multiCity[index - 1]?.departureDate || new Date())}
                              wrapperClassName="w-full"
                              popperClassName="z-[9999]"
                              className="w-full text-sm sm:text-base font-bold text-slate-900 dark:text-white outline-none bg-transparent cursor-pointer"
                            />
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {leg.departureDate
                                ? new Date(leg.departureDate).toLocaleDateString("en-US", { weekday: "long" })
                                : "Select date"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Controls below legs */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        {multiCity.length < 5 ? (
                          <button
                            type="button"
                            onClick={addMultiCity}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/85 hover:bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs border border-white/80 transition cursor-pointer shadow-xs"
                          >
                            <Plus size={15} />
                            Add Flight ({multiCity.length}/5)
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 px-3 py-2">
                            Maximum 5 flights
                          </span>
                        )}

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setSelectedClass((prev) => !prev)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/95 dark:bg-slate-800 hover:bg-white text-slate-800 dark:text-white font-bold text-xs border border-white/85 dark:border-slate-700 transition cursor-pointer shadow-xs"
                          >
                            <Users size={14} className="text-[#085c44] dark:text-emerald-400" />
                            <span>
                              {(travellers?.adult || 1) + (travellers?.child || 0) + (travellers?.infant || 0)} Traveller{((travellers?.adult || 1) + (travellers?.child || 0) + (travellers?.infant || 0)) > 1 ? "s" : ""}, {travellers?.travelClass || "Economy"}
                            </span>
                            <ChevronDown size={14} className="text-slate-400" />
                          </button>

                          {selectedClass && (
                            <div className="absolute left-0 top-full mt-2 z-50">
                              <TravellerClass
                                travellers={travellers}
                                setTravellers={setTravellers}
                                selectedClass={selectedClass}
                                setSelectedClass={setSelectedClass}
                                onDone={handleTravellerDone}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={(e) => {
                          clickSquash(e.currentTarget);
                          handleFlightSearch();
                        }}
                        className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#085c44] hover:bg-[#064e3b] text-white font-bold text-sm px-7 py-2.5 rounded-xl shadow-sm transition-colors ${
                          isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                        }`}
                      >
                        <Search className="w-4 h-4 shrink-0" />
                        <span>Search Flights</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {searchbox === "HOTEL" && <HotelSearch searchbox={searchbox} />}
          </div>
        </div>
      ) : (
        <div className={embedded ? "w-full relative z-40 pointer-events-auto" : "w-full px-1 sm:px-4 relative z-40 pointer-events-auto"}>
          <div className="relative flex flex-col items-center justify-center">
            {searchbox === "FLIGHT" && (
              <div
                className={
                  embedded
                    ? "relative w-full bg-transparent p-0 pointer-events-auto"
                    : "relative w-full rounded-[28px] border border-white/40 dark:border-white/15 bg-white/25 dark:bg-slate-900/45 backdrop-blur-xl p-4 sm:p-6 lg:p-7 shadow-[0_24px_60px_rgba(15,23,42,0.22)] pointer-events-auto"
                }
              >
                {/* Trip Type Selector Chips (• One Way / • Round Trip / • Multi City) */}
                <div className="w-full flex items-center justify-between mb-3.5">
                  <div className="inline-flex w-full sm:w-auto gap-2 flex-wrap">
                    {travellingWay?.map((way, index) => {
                      const isActive = activeTab === way;
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleTabClick(way)}
                          className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full text-xs cursor-pointer transition-all duration-200 whitespace-nowrap ${
                            isActive
                              ? "bg-white dark:bg-slate-800 text-[#085c44] dark:text-emerald-300 font-bold shadow-sm border border-white dark:border-slate-700"
                              : "bg-white/55 hover:bg-white/80 dark:bg-slate-800/55 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border border-white/55 dark:border-slate-700/60 backdrop-blur-sm"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full transition-colors ${
                              isActive
                                ? "bg-[#085c44] dark:bg-emerald-400"
                                : "bg-slate-400/90 dark:bg-slate-500"
                            }`}
                          />
                          <span>{way}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* One Way & Round Trip — Separated Modular Cards */}
                {(activeTab === "Round Trip" || activeTab === "One Way") && (
                  <div className="relative z-30 w-full mx-auto">
                    <div
                      className={`grid grid-cols-1 sm:grid-cols-2 ${
                        activeTab === "Round Trip"
                          ? "lg:grid-cols-[2fr_1.6fr_1.4fr]"
                          : "lg:grid-cols-[2.2fr_1.2fr_1.4fr]"
                      } gap-2.5 lg:gap-3 items-stretch`}
                    >
                      {/* Card 1 & Card 2: FROM & TO with Bridge Swap Badge */}
                      <div className="sm:col-span-2 lg:col-span-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 lg:gap-3 relative">
                        {/* Card 1: FROM */}
                        <div
                          onClick={() => {
                            setFromSuggestions(findAirports(fromQuery));
                            setShowFromSuggestions(true);
                          }}
                          className="departure-field-container relative rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-white/85 dark:border-slate-800 px-3.5 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer flex flex-col justify-between min-h-[82px] sm:min-h-[86px]"
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              <PlaneTakeoff size={13} className="text-[#085c44] dark:text-emerald-400 shrink-0" />
                              <span>From</span>
                            </div>
                            {selectedFrom?.iataCode && (
                              <span className="text-[10px] font-extrabold tracking-wider text-[#085c44] dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                {selectedFrom.iataCode}
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={fromQuery}
                            onFocus={() => {
                              setFromSuggestions(findAirports(fromQuery));
                              setShowFromSuggestions(true);
                              setToSuggestions([]);
                            }}
                            onChange={handleFromChange}
                            placeholder="City or airport"
                            className="w-full text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight placeholder:text-slate-400 placeholder:font-semibold outline-none bg-transparent truncate"
                          />
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {selectedFrom?.airport || "Select departure airport"}
                          </p>

                          <DeparturePlace
                            fromSuggestions={fromSuggestions}
                            showFromSuggestions={showFromSuggestions}
                            setFromQuery={setFromQuery}
                            formatSuggestion={formatSuggestion}
                            selectedFrom={selectedFrom}
                            setSelectedFrom={setSelectedFrom}
                            setFromSuggestions={setFromSuggestions}
                            setShowFromSuggestions={setShowFromSuggestions}
                            setIsDisabled={setIsDisabled}
                          />
                        </div>

                        {/* Swap Button Bridging Card 1 & Card 2 */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSwapLocations(e);
                          }}
                          title="Swap Departure & Arrival"
                          className="flex absolute right-4 top-1/2 -translate-y-1/2 rotate-90 sm:rotate-0 sm:right-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-7.5 h-7.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-[#085c44] dark:text-emerald-400 hover:bg-[#085c44] hover:text-white hover:border-[#085c44] items-center justify-center shadow-md z-30 cursor-pointer transition-all duration-200 active:scale-95"
                        >
                          <ArrowLeftRight size={13} strokeWidth={2.2} />
                        </button>

                        {/* Card 2: TO */}
                        <div
                          onClick={() => {
                            setToSuggestions(findAirports(toQuery));
                            setShowToSuggestions(true);
                          }}
                          className="arrival-field-container relative rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-white/85 dark:border-slate-800 px-3.5 sm:px-4 py-2.5 sm:py-3 sm:pl-5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer flex flex-col justify-between min-h-[82px] sm:min-h-[86px]"
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              <PlaneLanding size={13} className="text-[#085c44] dark:text-emerald-400 shrink-0" />
                              <span>To</span>
                            </div>
                            {selectedTo?.iataCode && (
                              <span className="text-[10px] font-extrabold tracking-wider text-[#085c44] dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                {selectedTo.iataCode}
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={toQuery}
                            onFocus={() => {
                              setToSuggestions(findAirports(toQuery));
                              setShowToSuggestions(true);
                              setFromSuggestions([]);
                            }}
                            onChange={handleToChange}
                            placeholder="City or airport"
                            className="w-full text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight placeholder:text-slate-400 placeholder:font-semibold outline-none bg-transparent truncate"
                          />
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {selectedTo?.airport || "Select arrival airport"}
                          </p>

                          <ArrivalPlace
                            toSuggestions={toSuggestions}
                            showToSuggestions={showToSuggestions}
                            setToQuery={setToQuery}
                            formatSuggestion={formatSuggestion}
                            selectedTo={selectedTo}
                            setToSuggestions={setToSuggestions}
                            setSelectedTo={setSelectedTo}
                            setShowToSuggestions={setShowToSuggestions}
                            setIsDisabled={setIsDisabled}
                          />
                        </div>
                      </div>

                      {/* Card 3: DATE SECTION */}
                      {activeTab !== "Round Trip" ? (
                        /* Single Departure Mode with "Book also Return Ticket" Action */
                        <div
                          onClick={() => {
                            departurePickerRef.current?.setOpen(true);
                          }}
                          className="relative rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-white/85 dark:border-slate-800 px-3.5 sm:px-4 py-2.5 sm:py-3 shadow-[0_4px_16px_rgba(15,23,42,0.06)] hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer flex flex-col justify-between min-h-[82px] sm:min-h-[86px]"
                        >
                          <div>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
                              <CalendarDays size={13} className="text-[#085c44] dark:text-emerald-400 shrink-0" />
                              <span>Departure</span>
                            </div>

                            <DatePicker
                              ref={departurePickerRef}
                              selected={startDate}
                              onChange={handleStartDateChange}
                              dateFormat="d MMM''yy"
                              minDate={new Date()}
                              wrapperClassName="w-full"
                              popperClassName="z-[99999]"
                              showPopperArrow={false}
                              customInput={
                                <div className="flex items-baseline gap-1 mt-0.5 cursor-pointer select-none">
                                  <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
                                    {startDate ? startDate.getDate() : "--"}
                                  </span>
                                  <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {startDate
                                      ? `${startDate.toLocaleString("en-US", { month: "short" })}'${String(startDate.getFullYear()).slice(-2)}`
                                      : ""}
                                  </span>
                                </div>
                              }
                            >
                              <div className="pt-2 pb-0.5 px-0.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 text-[11px] w-full">
                                <span className="text-slate-400 dark:text-slate-500 pl-0.5 text-[10px] uppercase font-bold tracking-wider shrink-0">Quick:</span>
                                <div className="flex gap-1 items-center">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const d = new Date();
                                      handleStartDateChange(d);
                                      departurePickerRef.current?.setOpen(false);
                                    }}
                                    className="px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-slate-200 hover:border-emerald-300 dark:border-slate-700 dark:hover:border-emerald-500 text-slate-700 dark:text-slate-200 hover:text-[#085c44] dark:hover:text-emerald-300 transition-colors text-[11px] font-semibold cursor-pointer whitespace-nowrap shadow-2xs"
                                  >
                                    Today
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const d = new Date();
                                      d.setDate(d.getDate() + 1);
                                      handleStartDateChange(d);
                                      departurePickerRef.current?.setOpen(false);
                                    }}
                                    className="px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-slate-200 hover:border-emerald-300 dark:border-slate-700 dark:hover:border-emerald-500 text-slate-700 dark:text-slate-200 hover:text-[#085c44] dark:hover:text-emerald-300 transition-colors text-[11px] font-semibold cursor-pointer whitespace-nowrap shadow-2xs"
                                  >
                                    Tomorrow
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const d = new Date();
                                      d.setDate(d.getDate() + 7);
                                      handleStartDateChange(d);
                                      departurePickerRef.current?.setOpen(false);
                                    }}
                                    className="px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-slate-200 hover:border-emerald-300 dark:border-slate-700 dark:hover:border-emerald-500 text-slate-700 dark:text-slate-200 hover:text-[#085c44] dark:hover:text-emerald-300 transition-colors text-[11px] font-semibold cursor-pointer whitespace-nowrap shadow-2xs"
                                  >
                                    +1 Wk
                                  </button>
                                </div>
                              </div>
                            </DatePicker>

                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 truncate">
                              {startDate
                                ? startDate.toLocaleDateString("en-US", {
                                    weekday: "long",
                                  })
                                : ""}
                            </p>
                          </div>

                          {/* "Book also Return Ticket" Interactive Component */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleReturnTicket(true);
                            }}
                            className="mt-2.5 w-full py-1.5 px-3 rounded-xl bg-teal-50 hover:bg-teal-100/90 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 border border-dashed border-teal-300 dark:border-emerald-600/60 text-teal-800 dark:text-emerald-300 transition-all flex items-center justify-between group/return cursor-pointer active:scale-95 shadow-2xs"
                          >
                            <div className="flex items-center gap-1.5 text-xs font-bold">
                              <Plus className="w-3.5 h-3.5 text-teal-600 dark:text-emerald-400 group-hover/return:rotate-90 transition-transform duration-200" />
                              <span>Book also Return Ticket</span>
                            </div>
                            <span className="text-[10px] font-semibold text-teal-700 dark:text-emerald-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md shadow-2xs">
                              Round Trip
                            </span>
                          </button>
                        </div>
                      ) : (
                        /* Dual Mode: DEPARTURE + RETURN */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {/* Departure Half */}
                          <div
                            onClick={() => {
                              departurePickerRef.current?.setOpen(true);
                            }}
                            className="relative rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-white/85 dark:border-slate-800 px-3 py-2.5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer flex flex-col justify-between min-h-[82px] sm:min-h-[86px]"
                          >
                            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
                              <CalendarDays size={13} className="text-[#085c44] dark:text-emerald-400 shrink-0" />
                              <span>Departure</span>
                            </div>

                            <DatePicker
                              ref={departurePickerRef}
                              selected={startDate}
                              onChange={handleStartDateChange}
                              dateFormat="d MMM''yy"
                              minDate={new Date()}
                              wrapperClassName="w-full"
                              popperClassName="z-[99999]"
                              showPopperArrow={false}
                              customInput={
                                <div className="flex items-baseline gap-1 mt-0.5 cursor-pointer select-none">
                                  <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
                                    {startDate ? startDate.getDate() : "--"}
                                  </span>
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                    {startDate
                                      ? `${startDate.toLocaleString("en-US", { month: "short" })}'${String(startDate.getFullYear()).slice(-2)}`
                                      : ""}
                                  </span>
                                </div>
                              }
                            />

                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 truncate">
                              {startDate
                                ? startDate.toLocaleDateString("en-US", { weekday: "short" })
                                : ""}
                            </p>
                          </div>

                          {/* Return Half */}
                          <div
                            onClick={(e) => {
                              handleReturnClick(e);
                            }}
                            className="relative rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-emerald-300/90 dark:border-emerald-600/90 px-3 py-2.5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer flex flex-col justify-between min-h-[82px] sm:min-h-[86px] ring-1 ring-emerald-400/20"
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                                <CalendarDays size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>Return</span>
                              </div>
                              <button
                                type="button"
                                title="Remove Return (Switch to One Way)"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleReturnTicket(false);
                                }}
                                className="p-0.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition cursor-pointer"
                              >
                                <X size={13} />
                              </button>
                            </div>

                            <DatePicker
                              ref={returnPickerRef}
                              selected={endDate}
                              onChange={handleEndDateChange}
                              dateFormat="d MMM''yy"
                              minDate={startDate || new Date()}
                              wrapperClassName="w-full"
                              popperClassName="z-[99999]"
                              showPopperArrow={false}
                              customInput={
                                <div className="flex items-baseline gap-1 mt-0.5 cursor-pointer select-none">
                                  <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
                                    {endDate ? endDate.getDate() : "--"}
                                  </span>
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                    {endDate
                                      ? `${endDate.toLocaleString("en-US", { month: "short" })}'${String(endDate.getFullYear()).slice(-2)}`
                                      : ""}
                                  </span>
                                </div>
                              }
                            >
                              <div className="pt-2 pb-0.5 px-0.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 text-[11px] w-full">
                                <span className="text-slate-400 dark:text-slate-500 pl-0.5 text-[10px] uppercase font-bold tracking-wider shrink-0">Quick:</span>
                                <div className="flex gap-1 items-center">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const d = new Date(startDate || new Date());
                                      d.setDate(d.getDate() + 3);
                                      handleEndDateChange(d);
                                      returnPickerRef.current?.setOpen(false);
                                    }}
                                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 hover:bg-emerald-50 border text-slate-700 text-[10px] font-semibold"
                                  >
                                    +3D
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const d = new Date(startDate || new Date());
                                      d.setDate(d.getDate() + 7);
                                      handleEndDateChange(d);
                                      returnPickerRef.current?.setOpen(false);
                                    }}
                                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 hover:bg-emerald-50 border text-slate-700 text-[10px] font-semibold"
                                  >
                                    +7D
                                  </button>
                                </div>
                              </div>
                            </DatePicker>

                            <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 mt-1 truncate">
                              {endDate
                                ? `${endDate.toLocaleDateString("en-US", { weekday: "short" })}${
                                    startDate && endDate > startDate
                                      ? ` (${Math.round((endDate - startDate) / (1000 * 60 * 60 * 24))}d)`
                                      : ""
                                  }`
                                : "Pick return"}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Card 4: TRAVELLERS & CLASS + Integrated Vertical Search Flights Button */}
                      <div className="relative rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-white/85 dark:border-slate-800 p-1.5 pl-4 sm:pl-5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] hover:bg-white dark:hover:bg-slate-900 transition-all flex items-stretch justify-between gap-2 min-h-[82px] sm:min-h-[86px]">
                        <TravellerClass
                          travellers={travellers}
                          setTravellers={setTravellers}
                          setSelectedClass={setSelectedClass}
                          selectedClass={selectedClass}
                          isDisabled={isDisabled}
                          setIsDisabled={setIsDisabled}
                          onDone={handleTravellerDone}
                        />

                        <button
                          type="button"
                          onClick={(e) => {
                            clickSquash(e.currentTarget);
                            const ok = handleFlightSearch();
                            if (!ok) return;
                            const storedSearch = (() => {
                              try {
                                return JSON.parse(localStorage.getItem("flightSearch"));
                              } catch {
                                return null;
                              }
                            })();
                            navigate("/flight-list", {
                              state: {
                                flights: [
                                  {
                                    searchFlights: storedSearch || searchFlights,
                                    selectedFrom: activeTab === "Multi City" ? multiCity[0]?.selectedFrom : selectedFrom,
                                    selectedTo: activeTab === "Multi City" ? multiCity[multiCity.length - 1]?.selectedTo : selectedTo,
                                    showNavbar: showNavbar,
                                  },
                                ],
                              },
                            });
                          }}
                          className="shrink-0 w-[86px] sm:w-[92px] rounded-xl bg-[#085c44] hover:bg-[#064e3b] active:scale-[0.98] text-white font-bold text-xs sm:text-[13px] leading-tight flex flex-col items-center justify-center gap-0.5 shadow-sm transition-all cursor-pointer px-2 py-2 sm:py-2.5"
                        >
                          <span>Search</span>
                          <span>Flights</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Multi City */}
                {activeTab === "Multi City" && (
                  <div className="space-y-3 mt-1">
                    {multiCity?.map((leg, index) => (
                      <div
                        key={leg.id || index}
                        className="relative bg-white/95 dark:bg-slate-900/95 border border-white/85 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition-colors"
                      >
                        {/* Leg Header */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Flight {index + 1}
                          </span>
                          {multiCity.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeMultiCity(leg.id)}
                              className="flex items-center gap-1 text-slate-400 hover:text-rose-600 px-2 py-1 rounded-lg text-xs font-medium transition cursor-pointer"
                              title="Remove this city leg"
                            >
                              <Trash2 size={14} />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>

                        {/* Inputs Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 divide-y md:divide-y-0 md:divide-x divide-slate-200/90 dark:divide-slate-800 overflow-visible">
                          {/* From */}
                          <div
                            onClick={() => {
                              setActiveMultiCityDropdown({ legIndex: index, field: "from", query: leg.fromQuery });
                            }}
                            className="relative px-4 py-3 cursor-pointer hover:bg-slate-50/70 transition rounded-t-xl md:rounded-tr-none md:rounded-l-xl"
                          >
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                              From
                            </p>
                            <input
                              type="text"
                              value={leg.fromQuery}
                              onChange={(e) => handleMultiCityQueryChange(index, "from", e.target.value)}
                              onFocus={() => setActiveMultiCityDropdown({ legIndex: index, field: "from", query: leg.fromQuery })}
                              placeholder="City or airport"
                              className="text-[15px] sm:text-base font-bold text-slate-900 dark:text-white outline-none bg-transparent w-full truncate"
                            />
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {leg.selectedFrom?.airport || "Select departure airport"}
                            </p>

                            {activeMultiCityDropdown?.legIndex === index && activeMultiCityDropdown?.field === "from" && (
                              <MultiCityAirportDropdown
                                airports={findAirports(activeMultiCityDropdown.query || leg.fromQuery)}
                                onSelect={(airport) => handleSelectMultiCityAirport(index, "from", airport)}
                                onClose={() => setActiveMultiCityDropdown(null)}
                              />
                            )}
                          </div>

                          {/* To */}
                          <div
                            onClick={() => {
                              setActiveMultiCityDropdown({ legIndex: index, field: "to", query: leg.toQuery });
                            }}
                            className="relative px-4 py-3 cursor-pointer hover:bg-slate-50/70 transition"
                          >
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                              To
                            </p>
                            <input
                              type="text"
                              value={leg.toQuery}
                              onChange={(e) => handleMultiCityQueryChange(index, "to", e.target.value)}
                              onFocus={() => setActiveMultiCityDropdown({ legIndex: index, field: "to", query: leg.toQuery })}
                              placeholder="City or airport"
                              className="text-[15px] sm:text-base font-bold text-slate-900 dark:text-white outline-none bg-transparent w-full truncate"
                            />
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {leg.selectedTo?.airport || "Select arrival airport"}
                            </p>

                            {activeMultiCityDropdown?.legIndex === index && activeMultiCityDropdown?.field === "to" && (
                              <MultiCityAirportDropdown
                                airports={findAirports(activeMultiCityDropdown.query || leg.toQuery)}
                                onSelect={(airport) => handleSelectMultiCityAirport(index, "to", airport)}
                                onClose={() => setActiveMultiCityDropdown(null)}
                              />
                            )}
                          </div>

                          {/* Departure Date */}
                          <div className="relative px-4 py-3 cursor-pointer hover:bg-slate-50/70 transition rounded-b-xl md:rounded-bl-none md:rounded-r-xl flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Departure
                              </p>
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <DatePicker
                              selected={leg.departureDate ? new Date(leg.departureDate) : new Date()}
                              onChange={(date) => handleMultiCityDateChange(index, date)}
                              dateFormat="d MMM''yy"
                              minDate={index === 0 ? new Date() : new Date(multiCity[index - 1]?.departureDate || new Date())}
                              wrapperClassName="w-full"
                              popperClassName="z-[9999]"
                              className="w-full text-[15px] sm:text-base font-bold text-slate-900 dark:text-white outline-none bg-transparent cursor-pointer"
                            />
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {leg.departureDate
                                ? new Date(leg.departureDate).toLocaleDateString("en-US", { weekday: "long" })
                                : "Select date"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Multi City Bottom Controls + Search CTA */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        {multiCity.length < 5 ? (
                          <button
                            type="button"
                            onClick={addMultiCity}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/85 hover:bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs border border-white/80 transition cursor-pointer shadow-xs"
                          >
                            <Plus size={15} />
                            Add Flight ({multiCity.length}/5)
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 px-3 py-2">
                            Maximum 5 flights
                          </span>
                        )}

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setSelectedClass((prev) => !prev)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/95 dark:bg-slate-800 hover:bg-white text-slate-800 dark:text-white font-bold text-xs border border-white/85 dark:border-slate-700 transition cursor-pointer shadow-xs"
                          >
                            <Users size={15} className="text-[#085c44] dark:text-emerald-400" />
                            <span>
                              {(travellers?.adult || 1) + (travellers?.child || 0) + (travellers?.infant || 0)} Traveller{((travellers?.adult || 1) + (travellers?.child || 0) + (travellers?.infant || 0)) > 1 ? "s" : ""}, {travellers?.travelClass || "Economy"}
                            </span>
                            <ChevronDown size={14} className="text-slate-400" />
                          </button>

                          {selectedClass && (
                            <div className="absolute left-0 top-full mt-2 z-50">
                              <TravellerClass
                                travellers={travellers}
                                setTravellers={setTravellers}
                                selectedClass={selectedClass}
                                setSelectedClass={setSelectedClass}
                                onDone={handleTravellerDone}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          clickSquash(e.currentTarget);
                          const ok = handleFlightSearch();
                          if (!ok) return;
                          const storedSearch = (() => {
                            try {
                              return JSON.parse(localStorage.getItem("flightSearch"));
                            } catch {
                              return null;
                            }
                          })();
                          navigate("/flight-list", {
                            state: {
                              flights: [
                                {
                                  searchFlights: storedSearch || searchFlights,
                                  selectedFrom: activeTab === "Multi City" ? multiCity[0]?.selectedFrom : selectedFrom,
                                  selectedTo: activeTab === "Multi City" ? multiCity[multiCity.length - 1]?.selectedTo : selectedTo,
                                  showNavbar: showNavbar,
                                },
                              ],
                            },
                          });
                        }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#085c44] hover:bg-[#064e3b] text-white font-bold text-sm px-7 py-3 rounded-xl shadow-sm transition-colors cursor-pointer whitespace-nowrap active:scale-98"
                      >
                        <Search className="w-4 h-4 shrink-0" />
                        <span>Search Flights</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {searchbox === "HOTEL" && (
              <HotelSearch
                handleFlightSearch={handleFlightSearch}
                onSearchSuccess={onSearchSuccess}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default CommonFlightHotelSearchBox;
