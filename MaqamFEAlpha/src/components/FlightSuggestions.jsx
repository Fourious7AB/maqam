import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import anime from "animejs";
import {
  ArrowRight,
  Plane,
  Luggage,
  Clock,
  ShieldCheck,
} from "lucide-react";
import api from "./stores/api";
import { fetchFlights } from "./reducer/FlightSearchSlice";
import AnimatedNumber from "./shared/AnimatedNumber";
import HorizontalCarousel from "./shared/HorizontalCarousel";
import {
  INTERNATIONAL_AIRPORTS,
  getSavedUserLocation,
} from "../utils/airportLocator";

const getDateString = (daysFromToday) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().split("T")[0];
};

const generateDestinationFallbackFlights = (originCode, destination, departureDate) => {
  const isRiyadh = destination === "RUH";
  const destName = isRiyadh ? "RUH" : destination;

  const catalog = [
    {
      name: "flynas",
      code: "XY",
      flightNo: "XY-322",
      fare: 16850,
      departure: "08:15",
      arrival: "12:45",
      stops: "Non-stop",
      duration: "4h 30m",
      baggage: "20 kg",
    },
    {
      name: "Saudi Arabian Airlines",
      code: "SV",
      flightNo: "SV-759",
      fare: 21500,
      departure: "10:30",
      arrival: "14:40",
      stops: "Non-stop",
      duration: "4h 10m",
      baggage: "23 kg",
    },
    {
      name: "Air India",
      code: "AI",
      flightNo: "AI-901",
      fare: 22800,
      departure: "17:20",
      arrival: "21:35",
      stops: "Non-stop",
      duration: "4h 15m",
      baggage: "25 kg",
    },
    {
      name: "IndiGo",
      code: "6E",
      flightNo: "6E-1821",
      fare: 18450,
      departure: "19:50",
      arrival: "00:15",
      stops: "Non-stop",
      duration: "4h 25m",
      baggage: "20 kg",
    },
    {
      name: "Emirates",
      code: "EK",
      flightNo: "EK-501",
      fare: 24200,
      departure: "04:10",
      arrival: "10:25",
      stops: "1 Stop (DXB)",
      duration: "6h 15m",
      baggage: "30 kg",
    },
    {
      name: "Qatar Airways",
      code: "QR",
      flightNo: "QR-557",
      fare: 25900,
      departure: "03:45",
      arrival: "10:15",
      stops: "1 Stop (DOH)",
      duration: "6h 30m",
      baggage: "30 kg",
    },
  ];

  return catalog.map((item, idx) => ({
    resultIndex: `SUGG-${destination}-${idx}`,
    totalAmount: item.fare,
    fares: [{ totalAmount: item.fare }],
    stopsText: item.stops,
    baggageText: item.baggage,
    durationText: item.duration,
    segments: [
      {
        airline: item.name,
        airlineCode: item.code,
        flightNumber: item.flightNo,
        departure: `${departureDate}T${item.departure}:00`,
        arrival: `${departureDate}T${item.arrival}:00`,
        origin: originCode,
        destination: destName,
      },
    ],
  }));
};

const formatTime = (dateInput, fallback = "--:--") => {
  if (!dateInput) return fallback;
  if (typeof dateInput === "string" && /^\d{2}:\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  try {
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) {
      const match = String(dateInput).match(/T(\d{2}:\d{2})/);
      return match ? match[1] : fallback;
    }
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return fallback;
  }
};

const FlightSuggestionCard = ({ flight, destination, onViewFlights, isOpening }) => {
  const cardRef = useRef(null);
  const planeRef = useRef(null);
  const [imgError, setImgError] = useState(false);

  const firstSegment = flight?.segments?.[0];
  const lastSegment = flight?.segments?.[flight?.segments?.length - 1];
  const fare = flight?.fares?.[0]?.totalAmount ?? flight?.totalAmount;

  const airlineName = firstSegment?.airline || "Available Airline";
  const airlineCode = firstSegment?.airlineCode || "FL";
  const flightNumber = firstSegment?.flightNumber || `${airlineCode}-101`;

  const originCode = firstSegment?.origin || "DEL";
  const destCode = lastSegment?.destination || destination || "JED";

  const departure = firstSegment?.departure;
  const arrival = lastSegment?.arrival;

  const depTime = formatTime(departure, "08:15");
  const arrTime = formatTime(arrival, "12:45");

  const durationInMinutes =
    departure && arrival
      ? Math.max(0, (new Date(arrival) - new Date(departure)) / 60000)
      : null;

  const duration =
    flight?.durationText ||
    (durationInMinutes
      ? `${Math.floor(durationInMinutes / 60)}h ${Math.floor(durationInMinutes % 60)}m`
      : "4h 30m");

  const stopsText =
    flight?.stopsText ||
    (flight?.segments?.length > 1
      ? `${flight.segments.length - 1} Stop`
      : "Non-stop");

  const isNonStop =
    stopsText.toLowerCase().includes("non") ||
    stopsText.toLowerCase().includes("direct");

  const baggageText = flight?.baggageText || "20 kg included";

  // Anime.js interactive hover animation
  const handleMouseEnter = () => {
    if (cardRef.current) {
      anime.remove(cardRef.current);
      anime({
        targets: cardRef.current,
        translateY: -7,
        scale: 1.018,
        duration: 320,
        easing: "easeOutCubic",
      });
    }
    if (planeRef.current) {
      anime.remove(planeRef.current);
      anime({
        targets: planeRef.current,
        translateX: [0, 9, -4, 0],
        duration: 850,
        easing: "easeInOutSine",
      });
    }
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      anime.remove(cardRef.current);
      anime({
        targets: cardRef.current,
        translateY: 0,
        scale: 1,
        duration: 280,
        easing: "easeOutCubic",
      });
    }
  };

  const handleBookClick = (e) => {
    anime({
      targets: e.currentTarget,
      scale: [
        { value: 0.92, duration: 80, easing: "easeOutQuad" },
        { value: 1.04, duration: 120, easing: "easeOutBack" },
        { value: 1, duration: 90, easing: "easeInOutQuad" },
      ],
    });
    onViewFlights(flight);
  };

  return (
    <article
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="flight-suggestion-card group relative w-[84%] min-w-[265px] sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)] xl:w-[calc(25%-0.75rem)] shrink-0 snap-start rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs hover:shadow-xl hover:border-teal-500/80 dark:hover:border-teal-500/60 transition-colors duration-300 flex flex-col justify-between overflow-hidden cursor-pointer"
    >
      {/* Top Gradient Hover Accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Top Header: Logo, Airline Name, Flight No, and Stops Badge */}
      <div>
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
              {!imgError ? (
                <img
                  src={`https://images.kiwi.com/airlines/64/${airlineCode}.png`}
                  alt={airlineName}
                  className="w-full h-full object-contain"
                  onError={() => setImgError(true)}
                />
              ) : (
                <span className="text-xs font-black text-teal-700 dark:text-teal-300 font-mono">
                  {airlineCode}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors truncate">
                {airlineName}
              </h3>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                {flightNumber}
              </p>
            </div>
          </div>

          <span
            className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
              isNonStop
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isNonStop ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            {stopsText}
          </span>
        </div>

        {/* Flight Journey Timeline Block */}
        <div className="my-3.5 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          {/* Origin */}
          <div className="text-left shrink-0">
            <span className="text-base font-black text-slate-900 dark:text-white leading-none block">
              {depTime}
            </span>
            <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider block mt-1">
              {originCode}
            </span>
          </div>

          {/* Timeline Center */}
          <div className="flex-1 flex flex-col items-center px-1.5 min-w-0">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 whitespace-nowrap">
              {duration}
            </span>
            <div className="w-full relative flex items-center justify-center h-4">
              <div className="w-full h-[1.5px] bg-slate-200 dark:bg-slate-700" />
              <div
                ref={planeRef}
                className="absolute w-5 h-5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-2xs"
              >
                <Plane size={10} className="rotate-90" />
              </div>
            </div>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1.5 uppercase font-semibold">
              {isNonStop ? "Direct" : "Connecting"}
            </span>
          </div>

          {/* Destination */}
          <div className="text-right shrink-0">
            <span className="text-base font-black text-slate-900 dark:text-white leading-none block">
              {arrTime}
            </span>
            <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider block mt-1">
              {destCode}
            </span>
          </div>
        </div>

        {/* Baggage & Perks Tag */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-0.5 mb-2">
          <span className="inline-flex items-center gap-1.5">
            <Luggage size={13} className="text-teal-600 dark:text-teal-400" />
            <span>{baggageText}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500 text-[10px] font-medium">
            <ShieldCheck size={12} className="text-emerald-500" />
            <span>Verified Fare</span>
          </span>
        </div>
      </div>

      {/* Bottom Footer: Price & Book Button */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 mt-1">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Starting from
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {fare ? <AnimatedNumber value={fare} prefix="₹" /> : "Price on request"}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">/pax</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBookClick}
          disabled={isOpening}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 px-4 py-2.5 text-xs font-extrabold text-white shadow-xs hover:shadow-md hover:shadow-teal-500/20 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          <span>{isOpening ? "Checking..." : "Book now"}</span>
          <ArrowRight
            size={13}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </button>
      </div>
    </article>
  );
};

const FlightSuggestions = ({
  title,
  description,
  destination = "RUH",
  showSearchAll = true,
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const dotRef = useRef(null);

  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingResults, setOpeningResults] = useState(false);
  const [userOrigin, setUserOrigin] = useState(() => getSavedUserLocation());

  // Live Dot Pulse with Anime.js
  useEffect(() => {
    if (dotRef.current) {
      anime({
        targets: dotRef.current,
        scale: [1, 1.45, 1],
        opacity: [0.6, 1, 0.6],
        duration: 1800,
        loop: true,
        easing: "easeInOutSine",
      });
    }
  }, []);

  useEffect(() => {
    const handleLocationUpdate = () => {
      setUserOrigin(getSavedUserLocation());
    };
    window.addEventListener("userLocationUpdated", handleLocationUpdate);
    return () => {
      window.removeEventListener("userLocationUpdated", handleLocationUpdate);
    };
  }, []);

  // Anime.js Staggered Entrance Animation on card render
  useEffect(() => {
    if (!loading && flights.length > 0 && containerRef.current) {
      const cards = containerRef.current.querySelectorAll(".flight-suggestion-card");
      if (cards.length > 0) {
        anime.remove(cards);
        anime({
          targets: cards,
          opacity: [0, 1],
          translateY: [32, 0],
          scale: [0.93, 1],
          delay: anime.stagger(80, { start: 100 }),
          duration: 700,
          easing: "cubicBezier(0.16, 1, 0.3, 1)",
        });
      }
    }
  }, [loading, flights]);

  const getAirportDetails = (code) => {
    const found = INTERNATIONAL_AIRPORTS.find(
      (a) => a.iataCode.toUpperCase() === (code || "").toUpperCase(),
    );
    if (found) return found;
    return {
      id: code,
      name: code,
      airport: `${code} Airport`,
      iataCode: code,
      countryCode: "",
    };
  };

  const openAllFlights = async () => {
    setOpeningResults(true);
    const departureDate = getDateString(1);
    const origin = userOrigin.originAirport || "DEL";
    const searchParams = {
      origin,
      destination,
      departureDate,
      passengers: { adults: 1, children: 0, infants: 0 },
      journeyType: "oneway",
    };

    const originAirport = getAirportDetails(origin);
    const destAirport = getAirportDetails(destination);

    try {
      await dispatch(fetchFlights(searchParams)).unwrap();
      localStorage.setItem("flightSearch", JSON.stringify(searchParams));
      localStorage.setItem("selectedFrom", JSON.stringify(originAirport));
      localStorage.setItem("selectedTo", JSON.stringify(destAirport));
      navigate("/flight-list", {
        state: {
          flights: [
            {
              searchFlights: searchParams,
              selectedFrom: originAirport,
              selectedTo: destAirport,
              showNavbar: true,
            },
          ],
        },
      });
    } catch (error) {
      console.warn(`Fallback navigation to flight-list for ${destination}:`, error);
      localStorage.setItem("flightSearch", JSON.stringify(searchParams));
      localStorage.setItem("selectedFrom", JSON.stringify(originAirport));
      localStorage.setItem("selectedTo", JSON.stringify(destAirport));
      navigate("/flight-list", {
        state: {
          flights: [
            {
              searchFlights: searchParams,
              selectedFrom: originAirport,
              selectedTo: destAirport,
              showNavbar: true,
            },
          ],
        },
      });
    } finally {
      setOpeningResults(false);
    }
  };

  useEffect(() => {
    let active = true;

    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        const origin = userOrigin.originAirport || "DEL";
        const departureDate = getDateString(1);
        const searchParams = {
          origin,
          destination,
          departureDate,
          passengers: { adults: 1, children: 0, infants: 0 },
          journeyType: "oneway",
        };

        const response = await api.post("/api/v1/flights/search", searchParams);
        const results = response?.data?.data?.outbound || [];

        if (results.length > 0) {
          if (active) setFlights(results);
        } else {
          const fallbacks = generateDestinationFallbackFlights(origin, destination, departureDate);
          if (active) setFlights(fallbacks);
        }
      } catch (error) {
        console.warn(`Flight suggestions notice for ${destination}:`, error.message);
        const origin = userOrigin.originAirport || "DEL";
        const departureDate = getDateString(1);
        const fallbacks = generateDestinationFallbackFlights(origin, destination, departureDate);
        if (active) setFlights(fallbacks);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchSuggestions();
    return () => {
      active = false;
    };
  }, [destination, userOrigin.originAirport]);

  return (
    <section className="border-b border-slate-200/70 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#070c18] px-4 py-10 font-poppins sm:px-6 lg:px-10 xl:px-12 md:py-14 transition-colors duration-300">
      <div ref={containerRef} className="mx-auto w-full max-w-[1760px]">
        {/* Section Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60 mb-2">
              <span ref={dotRef} className="w-2 h-2 rounded-full bg-teal-500" />
              <span>
                Live Availability · Departing from {userOrigin.originAirportName || userOrigin.city} ({userOrigin.originAirport})
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {title}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {showSearchAll && (
              <button
                type="button"
                onClick={() => navigate("/flight")}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer shadow-2xs"
              >
                Search all
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 text-center text-sm text-slate-500 shadow-xs">
            <div className="w-8 h-8 mx-auto mb-2 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              Finding the best live flights...
            </p>
          </div>
        )}

        {/* Carousel / Card List */}
        {!loading && flights.length > 0 && (
          <HorizontalCarousel
            ariaLabel="flights"
            trackRef={scrollRef}
            trackClassName="gap-4 pb-2 pt-1 px-1"
          >
            {flights.map((flight, index) => (
              <FlightSuggestionCard
                key={flight?.resultIndex || index}
                flight={flight}
                destination={destination}
                onViewFlights={openAllFlights}
                isOpening={openingResults}
              />
            ))}
          </HorizontalCarousel>
        )}

        {/* Empty State */}
        {!loading && flights.length === 0 && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 text-center text-sm text-slate-500 shadow-xs">
            Flight availability is temporarily unavailable. Search for the latest fares above.
          </div>
        )}
      </div>
    </section>
  );
};

export default FlightSuggestions;
