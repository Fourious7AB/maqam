import { useEffect, useState } from "react";
import { Building2, ShieldCheck } from "lucide-react";
import api from "./stores/api";
import HorizontalCarousel from "./shared/HorizontalCarousel";
import DestinationCard from "./DestinationCard";

const getNextMonthDate = (day) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + 1);
  date.setDate(day);
  return date.toISOString().split("T")[0];
};

const hotelDestinations = {
  JED: { cityName: "Mecca", countryCode: "SA" },
  MED: { cityName: "Medina", countryCode: "SA" },
  IST: { cityName: "Istanbul", countryCode: "TR" },
};

const HotelSuggestions = ({ title, description, destination }) => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const fetchHotels = async () => {
      try {
        setLoading(true);
        setError(null);
        const checkIn = getNextMonthDate(15);
        const checkOut = getNextMonthDate(16);

        const city = hotelDestinations[destination] || {
          cityName: destination,
          countryCode: "IN",
        };
        const cityLookup = await api.get("/api/v1/hotels/cities", {
          params: {
            q: city.cityName,
            countryCode: city.countryCode,
          },
        });
        const matchingCity = cityLookup?.data?.data?.find(
          (item) =>
            item?.countryCode === city.countryCode &&
            item?.cityName?.toLowerCase() === city.cityName.toLowerCase(),
        );

        if (!matchingCity?.cityId) {
          throw new Error(`No hotel city ID found for ${city.cityName}.`);
        }

        const response = await api.post("/api/v1/hotels/search", {
          cityId: matchingCity.cityId,
          cityName: matchingCity.cityName,
          countryCode: city.countryCode,
          checkIn,
          checkOut,
          adults: 1,
          children: 0,
          childAges: [],
          numRooms: 1,
          guestNationality: "IN",
          currency: "INR",
          rooms: [{ adults: 1, children: 0, childAges: [] }],
          minRating: 1,
          maxRating: 5,
        });

        const result = response?.data?.data;
        const liveHotels = result?.hotels || result?.data?.hotels;
        const normalizedHotels = Array.isArray(liveHotels) ? liveHotels : [];
        if (active) {
          setSearchId(result?.searchId || null);
          setHotels(normalizedHotels);
        }
      } catch (requestError) {
        console.error(
          `Hotel suggestions error for ${destination}:`,
          requestError,
        );
        if (active) {
          setHotels([]);
          setError(
            requestError?.response?.data?.message ||
              "Unable to load live hotel availability.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchHotels();
    return () => {
      active = false;
    };
  }, [destination]);

  return (
    <section
      id={`hotel-suggestions-${destination}`}
      className="scroll-mt-6 border-b border-emerald-100 dark:border-slate-800 bg-emerald-50/60 dark:bg-[#070c18] py-10 md:py-14 font-poppins transition-colors"
    >
      <div className="mx-auto max-w-[1760px] px-4 sm:px-6 lg:px-10 xl:px-12">
        <div className="mb-6 px-1">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <Building2 size={14} />
            Live availability for next month
          </p>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white md:text-3xl">
            {title}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{description}</p>
        </div>

        {loading && (
          <div className="px-1">
            <div className="mb-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Fetching live SRDV room rates &amp; availability...</span>
            </div>

            {/* Skeleton Cards Grid matching DestinationCard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 py-2">
              {[1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className="rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm animate-pulse flex flex-col"
                >
                  <div className="h-48 sm:h-52 bg-slate-200 dark:bg-slate-800 w-full relative">
                    <div className="absolute top-3 left-3 h-5 w-12 bg-white/40 dark:bg-slate-700/60 rounded-full" />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
                      <div className="h-4.5 w-5/6 bg-slate-200 dark:bg-slate-800 rounded-md" />
                      <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-md" />
                    </div>
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="h-2.5 w-14 bg-slate-200 dark:bg-slate-800 rounded" />
                        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                      </div>
                      <div className="h-7 w-20 bg-emerald-100 dark:bg-emerald-950/80 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!loading && hotels.length > 0 && (
          <HorizontalCarousel
            ariaLabel="hotels"
            arrowOffset="padding"
            trackClassName="gap-5 pb-4 pt-1 items-stretch"
          >
            {hotels.slice(0, 10).map((hotel, index) => (
              <div
                key={hotel?.id || hotel?._id || hotel?.hotelId || index}
                className="flex-none w-[84%] min-w-[270px] snap-start sm:w-[calc(50%-0.625rem)] sm:min-w-[280px] md:w-[calc(33.333%-0.85rem)] lg:w-[calc(25%-0.95rem)] xl:w-[calc(20%-1rem)]"
              >
                <DestinationCard item={hotel} searchId={searchId} fluid />
              </div>
            ))}
          </HorizontalCarousel>
        )}
        {!loading && hotels.length === 0 && (
          <div className="px-1">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 p-8 text-center shadow-xs">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#045C45] dark:text-emerald-400 flex items-center justify-center border border-emerald-200/70 dark:border-emerald-800/60 mb-3 shadow-2xs">
                <ShieldCheck size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Live Hotel Rates Updating
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                {error || "Real-time room rates and allotments from our SRDV supplier network are refreshing. Please browse our featured partner suites above or check back shortly."}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default HotelSuggestions;
