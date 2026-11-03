import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Sparkles, Plane, ShieldCheck } from "lucide-react";
import { OfferAPI } from "../../configs/api";
import HorizontalCarousel from "../shared/HorizontalCarousel";
import { FlightCard } from "../ui/FlightCard1";

// Directory of supported airport codes & cities
const LOCATION_DIRECTORY = {
  DEL: { code: "DEL", city: "New Delhi" },
  "NEW DELHI": { code: "DEL", city: "New Delhi" },
  DELHI: { code: "DEL", city: "New Delhi" },
  BOM: { code: "BOM", city: "Mumbai" },
  MUMBAI: { code: "BOM", city: "Mumbai" },
  CCU: { code: "CCU", city: "Kolkata" },
  KOLKATA: { code: "CCU", city: "Kolkata" },
  BLR: { code: "BLR", city: "Bengaluru" },
  BENGALURU: { code: "BLR", city: "Bengaluru" },
  HYD: { code: "HYD", city: "Hyderabad" },
  HYDERABAD: { code: "HYD", city: "Hyderabad" },
  MAA: { code: "MAA", city: "Chennai" },
  CHENNAI: { code: "MAA", city: "Chennai" },
  JED: { code: "JED", city: "Jeddah" },
  JEDDAH: { code: "JED", city: "Jeddah" },
  MED: { code: "MED", city: "Medina" },
  MADINAH: { code: "MED", city: "Medina" },
  RUH: { code: "RUH", city: "Riyadh" },
  RIYADH: { code: "RUH", city: "Riyadh" },
  DMM: { code: "DMM", city: "Dammam" },
  DAMMAM: { code: "DMM", city: "Dammam" },
  DXB: { code: "DXB", city: "Dubai" },
  DUBAI: { code: "DXB", city: "Dubai" },
  DOH: { code: "DOH", city: "Doha" },
  IST: { code: "IST", city: "Istanbul" },
  ISTANBUL: { code: "IST", city: "Istanbul" },
  GOI: { code: "GOI", city: "Goa" },
  GOA: { code: "GOI", city: "Goa" },
  JFK: { code: "JFK", city: "New York" },
  "NEW YORK": { code: "JFK", city: "New York" },
  LHR: { code: "LHR", city: "London" },
  LONDON: { code: "LHR", city: "London" },
  AUH: { code: "AUH", city: "Abu Dhabi" },
  SIN: { code: "SIN", city: "Singapore" },
};

const resolveAirportInfo = (rawLocation) => {
  if (!rawLocation) {
    return { code: "---", city: "Unknown" };
  }
  const normalized = String(rawLocation).trim().toUpperCase();
  if (LOCATION_DIRECTORY[normalized]) {
    return LOCATION_DIRECTORY[normalized];
  }
  if (normalized.length === 3) {
    return { code: normalized, city: normalized };
  }
  const toTitleCase = String(rawLocation)
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
  return {
    code: normalized.slice(0, 3),
    city: toTitleCase,
  };
};

const formatFlightTime = (isoDate) => {
  if (!isoDate) return "--:--";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatFlightDuration = (departureIso, arrivalIso) => {
  if (!departureIso || !arrivalIso) return "--";
  const start = new Date(departureIso).getTime();
  const end = new Date(arrivalIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return "--";
  }
  const totalMinutes = Math.round((end - start) / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
};

const formatShortDuration = (departureIso, arrivalIso) => {
  if (!departureIso || !arrivalIso) return "--";
  const start = new Date(departureIso).getTime();
  const end = new Date(arrivalIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return "--";
  }
  const totalMinutes = Math.round((end - start) / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

const getDestinationIcon = (code) => {
  switch (code) {
    case "JED":
      return "🕋";
    case "MED":
      return "🕌";
    case "RUH":
      return "🏙️";
    case "DXB":
      return "🌇";
    case "IST":
      return "🕌";
    default:
      return "✈️";
  }
};

const PopularSaudiFlightsSection = () => {
  const [flightOffers, setFlightOffers] = useState([]);
  const [availableDestinations, setAvailableDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState("ALL");
  const navigate = useNavigate();

  // Fetch in-house offers from live API with itemType=flight and optional destination filter
  useEffect(() => {
    let isMounted = true;

    const fetchOffers = async () => {
      try {
        setLoading(true);

        const params = { itemType: "flight" };
        if (selectedDestination && selectedDestination !== "ALL") {
          params.destination = selectedDestination;
        }

        const res = await axios.get(OfferAPI.OffersApi, {
          params,
          timeout: 10000,
        });

        const rawList = res?.data?.offers || res?.data?.data || res?.data || [];
        const liveList = Array.isArray(rawList)
          ? rawList.filter(
              (item) =>
                (!item.itemType ||
                  String(item.itemType).toLowerCase() === "flight") &&
                item.isActive !== false
            )
          : [];

        if (isMounted) {
          setFlightOffers(liveList);

          // On initial "ALL" load, discover all unique destinations present in the database
          if (selectedDestination === "ALL") {
            const destMap = new Map();
            liveList.forEach((offer) => {
              const stock = offer?.flightRef?.stock || {};
              const destCode = (
                stock.destination ||
                offer.destination ||
                ""
              )
                .trim()
                .toUpperCase();
              if (destCode && !destMap.has(destCode)) {
                const info = resolveAirportInfo(destCode);
                destMap.set(destCode, {
                  id: destCode,
                  label: info.city || destCode,
                  code: destCode,
                  icon: getDestinationIcon(destCode),
                });
              }
            });
            setAvailableDestinations(Array.from(destMap.values()));
          }
        }
      } catch (err) {
        console.error("Failed to fetch in-house flight offers:", err);
        if (isMounted) {
          setFlightOffers([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOffers();

    return () => {
      isMounted = false;
    };
  }, [selectedDestination]);

  // Combined destination tabs: All Flights + destinations discovered from in-house data
  const destinationTabs = useMemo(() => {
    const defaultTabs = [{ id: "ALL", label: "All Flights", icon: "✨" }];
    return [...defaultTabs, ...availableDestinations];
  }, [availableDestinations]);

  const handleCardClick = (offer) => {
    const stock = offer?.flightRef?.stock || {};
    const depInfo = resolveAirportInfo(stock.origin);
    const arrInfo = resolveAirportInfo(stock.destination || offer?.destination);
    const departureDate = stock.departureDate || offer?.startDate;
    const arrivalDate = stock.arrivalDate || offer?.endDate;
    const flightNumber = stock.flightNumber || "FL-100";
    const airlineCode = flightNumber.includes("-")
      ? flightNumber.split("-")[0]
      : flightNumber.slice(0, 2);
    const fareAmount = Number(offer?.sellPrice || stock.costPerUnit || 0);

    const flightId = offer?._id || stock?._id || offer?.id;
    const cardId = offer?._id || offer?.id;
    const resultIndex = flightId || stock?.pnr || flightNumber || "OB1";
    const traceId = flightId || `OFFER-${Date.now()}`;

    const bookingState = {
      flightId,
      cardId,
      offerId: offer?._id,
      stockId: stock?._id,
      isInHouse: true,
      isOffer: true,
      traceId,
      resultIndex,
      selectedFareTier: stock.cabinClass || "Economy",
      isRoundTrip: false,
      passengers: {
        adults: 1,
        children: 0,
        infants: 0,
      },
      selectedTier: {
        id: "offer-fare",
        title: stock.cabinClass || "Economy",
        priceMultiplier: 1,
        unitPrice: fareAmount,
        price: fareAmount,
      },
      selectedOffer: offer,
      flight: {
        flightId,
        cardId,
        offerId: offer?._id,
        stockId: stock?._id,
        isInHouse: true,
        resultIndex,
        totalAmount: fareAmount,
        fares: [
          {
            resultIndex,
            totalAmount: fareAmount,
            isRefundable: true,
          },
        ],
        segments: [
          {
            flightId,
            origin: depInfo.code,
            originCity: depInfo.city,
            destination: arrInfo.code,
            destinationCity: arrInfo.city,
            airline: stock.airline || "Airline",
            airlineCode,
            flightNumber,
            departure: departureDate,
            arrival: arrivalDate,
            duration: formatShortDuration(departureDate, arrivalDate),
            cabinClass: stock.cabinClass || "Economy",
          },
        ],
      },
    };

    try {
      sessionStorage.setItem(
        "selectedFlightBooking",
        JSON.stringify(bookingState)
      );
      localStorage.setItem(
        "selectedFlightBooking",
        JSON.stringify(bookingState)
      );
    } catch (e) {
      console.warn("Storage warning:", e);
    }

    navigate("/fare-quote-details", { state: bookingState });
  };

  return (
    <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-10 xl:px-12 font-poppins bg-slate-50/70 dark:bg-[#070c18] border-b border-slate-200/70 dark:border-slate-800/80 transition-colors duration-300">
      <div className="w-full max-w-[1760px] mx-auto">
        {/* Modern Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>In-House Verified Flights</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Popular Flights to{" "}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 bg-clip-text text-transparent">
                Saudi Arabia & Holy Destinations
              </span>
            </h2>

            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Explore live, verified flight deals to Jeddah, Madinah, Riyadh, and premier international hubs directly from our inventory. Select any flight to lock in exclusive fares and proceed to booking.
            </p>
          </div>

          {/* Dynamic Destination Filter Tabs */}
          {destinationTabs.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {destinationTabs.map((filter) => {
                const active = selectedDestination === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setSelectedDestination(filter.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-2xs ${
                      active
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-[1.02]"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80"
                    }`}
                  >
                    <span>{filter.icon}</span>
                    <span>{filter.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 py-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="w-full rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 animate-pulse"
              >
                <div className="h-40 bg-slate-200 dark:bg-slate-800" />
                <div className="p-4 pt-3.5 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="h-10 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-10 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                  <div className="border-t border-dashed border-slate-200 dark:border-slate-700 my-3" />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : flightOffers.length === 0 ? (
          /* Empty State */
          <div className="py-16 text-center bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-xs">
            <Plane className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              No Flights Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              No in-house flight offers available for this destination filter right now. Try selecting "All Flights" to see other active inventory.
            </p>
          </div>
        ) : (
          /* Live Horizontal Carousel with arrowOffset="padding" */
          <HorizontalCarousel
            ariaLabel="popular flights"
            arrowOffset="padding"
            trackClassName="gap-5 pb-4 pt-1 items-stretch"
          >
            {flightOffers.map((offer, index) => {
              const stock = offer?.flightRef?.stock || {};
              const depInfo = resolveAirportInfo(stock.origin);
              const arrInfo = resolveAirportInfo(
                stock.destination || offer?.destination
              );
              const departureDate = stock.departureDate || offer?.startDate;
              const arrivalDate = stock.arrivalDate || offer?.endDate;
              const price = Number(offer?.sellPrice || stock.costPerUnit || 0);
              const originalPrice = Number(offer?.originalPrice || 0);
              const discountPercentage = Number(offer?.discountPercentage || 0);

              return (
                <div
                  key={offer._id || stock._id || index}
                  className="flex-none w-full sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)] xl:w-[calc((100%-3.75rem)/4)] flex flex-col snap-start"
                >
                  <FlightCard
                    imageUrl={offer?.images?.[0]}
                    airline={stock.airline || "Airline"}
                    flightCode={stock.flightNumber || "--"}
                    flightClass={stock.cabinClass || "Economy"}
                    departureCode={depInfo.code}
                    departureCity={depInfo.city}
                    departureTime={formatFlightTime(departureDate)}
                    arrivalCode={arrInfo.code}
                    arrivalCity={arrInfo.city}
                    arrivalTime={formatFlightTime(arrivalDate)}
                    duration={formatFlightDuration(departureDate, arrivalDate)}
                    price={price > 0 ? price : undefined}
                    originalPrice={
                      originalPrice > price ? originalPrice : undefined
                    }
                    discountPercentage={discountPercentage}
                    onClick={() => handleCardClick(offer)}
                  />
                </div>
              );
            })}
          </HorizontalCarousel>
        )}
      </div>
    </section>
  );
};

export default PopularSaudiFlightsSection;
