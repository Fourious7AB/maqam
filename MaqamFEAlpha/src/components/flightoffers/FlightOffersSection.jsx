import React, { useEffect, useState } from "react";
import offerService from "../../services/offerService";
import { useNavigate } from "react-router-dom";
import { OfferAPI } from "../../configs/api";
import HorizontalCarousel from "../shared/HorizontalCarousel";
import { FlightCard } from "../ui/FlightCard1";

// Lookup table mapping IATA codes & city names to { code, city }
const LOCATION_DIRECTORY = {
  DEL: { code: "DEL", city: "New Delhi" },
  "NEW DELHI": { code: "DEL", city: "New Delhi" },
  DELHI: { code: "DEL", city: "New Delhi" },
  IST: { code: "IST", city: "Istanbul" },
  ISTANBUL: { code: "IST", city: "Istanbul" },
  DXB: { code: "DXB", city: "Dubai" },
  DUBAI: { code: "DXB", city: "Dubai" },
  JED: { code: "JED", city: "Jeddah" },
  JEDDAH: { code: "JED", city: "Jeddah" },
  MED: { code: "MED", city: "Medina" },
  MADINAH: { code: "MED", city: "Medina" },
  RUH: { code: "RUH", city: "Riyadh" },
  RIYADH: { code: "RUH", city: "Riyadh" },
  GOI: { code: "GOI", city: "Goa" },
  GOA: { code: "GOI", city: "Goa" },
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
  JFK: { code: "JFK", city: "New York" },
  "NEW YORK": { code: "JFK", city: "New York" },
  LHR: { code: "LHR", city: "London" },
  LONDON: { code: "LHR", city: "London" },
  DOH: { code: "DOH", city: "Doha" },
  DOHA: { code: "DOH", city: "Doha" },
  AUH: { code: "AUH", city: "Abu Dhabi" },
  "ABU DHABI": { code: "AUH", city: "Abu Dhabi" },
  SIN: { code: "SIN", city: "Singapore" },
  SINGAPORE: { code: "SIN", city: "Singapore" },
  SFO: { code: "SFO", city: "San Francisco" },
  LAX: { code: "LAX", city: "Los Angeles" },
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

const FlightOffersSection = () => {
  const [flightOffers, setFlightOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const fetchFlightOffers = async () => {
      try {
        setLoading(true);
        const rawList = await offerService.getOffers({ itemType: "flight" });
        const list = Array.isArray(rawList)
          ? rawList.filter(
              (item) =>
                (!item.itemType ||
                  String(item.itemType).toLowerCase() === "flight") &&
                item.isActive !== false
            )
          : [];

        if (isMounted) {
          setFlightOffers(list);
        }
      } catch (err) {
        console.error("Failed to fetch flight offers:", err);
        if (isMounted) {
          setFlightOffers([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchFlightOffers();
    return () => {
      isMounted = false;
    };
  }, []);

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
    const flightId = offer?._id || stock?._id || offer?.id;
    const cardId = offer?._id || offer?.id;
    const resultIndex = null;
    const traceId = null;
    const fareAmount = Number(offer?.sellPrice || stock?.costPerUnit || 0);

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

  if (!loading && flightOffers.length === 0) {
    return null;
  }

  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-10 xl:px-12 font-poppins bg-slate-50/70 dark:bg-[#070c18] border-b border-slate-200/70 dark:border-slate-800/80 transition-colors duration-300">
      <div className="w-full max-w-[1760px] mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Featured Flight{" "}
              <span className="text-emerald-600 dark:text-emerald-400">
                Offers
              </span>
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Select a flight below to proceed directly to booking
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 py-1">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="w-full rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 animate-pulse"
              >
                <div className="h-32 bg-slate-200 dark:bg-slate-800" />
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
        ) : (
          <HorizontalCarousel
            ariaLabel="flight offers"
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
                    originalPrice={originalPrice > price ? originalPrice : undefined}
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

export default FlightOffersSection;
