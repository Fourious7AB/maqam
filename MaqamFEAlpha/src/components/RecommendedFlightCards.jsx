import { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock, MapPin, Star } from "lucide-react";
import { fetchFlights } from "./reducer/FlightSearchSlice";
import { staggerEntrance, clickSquash } from "../animations/presets";
import HorizontalCarousel from "./shared/HorizontalCarousel";

const recommendedFlights = [
  {
    name: "Mecca",
    airport: "JED",
    route: "Delhi-Mecca",
    duration: "3 Nights / 4 Days",
    price: "35,000",
    image:
      "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?q=80&w=900",
  },
  {
    name: "Medina",
    airport: "MED",
    route: "Delhi-Medina",
    duration: "3 Nights / 4 Days",
    price: "36,500",
    image:
      "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=900",
  },
  {
    name: "Istanbul",
    airport: "IST",
    route: "Delhi-Istanbul",
    duration: "5 Nights / 6 Days",
    price: "42,000",
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=900",
  },
  {
    name: "Morocco",
    airport: "CMN",
    route: "Delhi-Morocco",
    duration: "6 Nights / 7 Days",
    price: "99,999",
    image:
      "https://www.thetimes.com/imageserver/image/fa7df157-6f4f-4b23-8b5b-29af10fb1c4a.jpg?strip=all&format=webp&crop=1600px%2C900px%2C0px%2C0px&resize=1200",
  },
  {
    name: "Albania",
    airport: "TIR",
    route: "Delhi-Albania",
    duration: "3 Nights / 4 Days",
    price: "32,000",
    image:
      "https://marocmama.com/wp-content/uploads/2017/01/Muslim-Countries-in-2017-Albania-768x578.jpg.webp",
  },
];

const getDateString = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
};

const RecommendedFlightCards = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [openingAirport, setOpeningAirport] = useState("");
  const cardsContainerRef = useRef(null);

  useEffect(() => {
    if (cardsContainerRef.current) {
      const cards = cardsContainerRef.current.querySelectorAll(".rec-flight-card");
      if (cards.length > 0) {
        staggerEntrance(cards, { stagger: 70, startDelay: 100 });
      }
    }
  }, []);

  const getAirportObj = (airportCode, name) => {
    const map = {
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
    };
    return (
      map[airportCode] || {
        id: airportCode,
        name: name || airportCode,
        airport: `${name || airportCode} Airport`,
        iataCode: airportCode,
        countryCode: "",
      }
    );
  };

  const openFlightSearch = async (destination, airport) => {
    setOpeningAirport(airport);
    const departureDate = getDateString();
    const searchParams = {
      origin: "DEL",
      destination: airport,
      departureDate,
      passengers: { adults: 1, children: 0, infants: 0 },
      journeyType: "oneway",
    };

    const originAirport = getAirportObj("DEL", "Delhi");
    const destAirport = getAirportObj(airport, destination);

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
      console.error(`Unable to load flights for ${destination}:`, error);
      setOpeningAirport("");
    }
  };

  return (
    <section className="border-b border-gray-200 dark:border-slate-800 bg-[#f7f7f7] dark:bg-[#070c18] px-4 py-10 font-poppins sm:px-6 lg:px-10 xl:px-12 md:py-14 transition-colors">
      <div className="mx-auto w-full max-w-[1760px]">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
              Recommended flights
            </p>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white md:text-3xl">
              Popular destinations from Delhi
            </h2>
          </div>
          <p className="text-sm text-gray-500"></p>
        </div>

        <HorizontalCarousel ariaLabel="recommended flights" trackRef={cardsContainerRef} trackClassName="gap-4 pb-3">
          {recommendedFlights.map((flight) => (
            <article
              key={flight.airport}
              className="rec-flight-card group flex flex-none w-[78%] min-w-[240px] sm:w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.67rem)] lg:w-[calc(25%-0.75rem)] flex-col snap-start overflow-hidden rounded-2xl bg-white dark:bg-[#0f172a] border border-gray-100 dark:border-slate-800 shadow-[0_6px_20px_rgba(15,23,42,0.12)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(15,23,42,0.18)]"
            >
              <div className="relative aspect-[1.35/1] overflow-hidden">
                <img
                  src={flight.image}
                  alt={`${flight.name} destination`}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>

              <div className="flex flex-1 flex-col px-3.5 py-3">
                <h3 className="text-base font-bold text-emerald-600">
                  {flight.name}
                </h3>
                <div
                  className="mt-1 flex items-center gap-0.5 text-amber-500"
                  aria-label="5 star destination"
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={13} fill="currentColor" />
                  ))}
                </div>
                <div className="mt-2.5 space-y-1.5 text-xs text-gray-600">
                  <p className="flex items-center gap-2">
                    <Clock size={14} className="shrink-0 text-gray-700" />
                    {flight.duration}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin size={14} className="shrink-0 text-gray-700" />
                    {flight.route}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between bg-sky-100">
                <div className="px-3.5 py-1.5">
                  <p className="text-[10px] font-semibold text-gray-700">
                    Starting From
                  </p>
                  <p className="text-base font-extrabold text-gray-900">
                    ₹ {flight.price}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    clickSquash(e.currentTarget);
                    openFlightSearch(flight.name, flight.airport);
                  }}
                  disabled={openingAirport !== ""}
                  className="flex h-13 items-center gap-1 bg-orange-500 hover:bg-orange-600 px-4 text-xs font-extrabold text-white transition active:scale-95 disabled:cursor-wait disabled:opacity-70 cursor-pointer"
                >
                  {openingAirport === flight.airport ? "Loading" : "Book now"}
                  <ArrowRight size={15} />
                </button>
              </div>
            </article>
          ))}
</HorizontalCarousel>
      </div>
    </section>
  );
};

export default RecommendedFlightCards;
