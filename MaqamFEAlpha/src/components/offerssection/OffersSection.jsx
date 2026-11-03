import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Gift,
  Star,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  MapPin,
  Building2,
  Sparkles,
} from "lucide-react";
import axios from "axios";
import { OfferAPI, getApiBaseUrl } from "../../configs/api";

// Fallback data provided by the user for `/api/v1/offers?itemType=hotel`
const FALLBACK_HOTEL_OFFERS = [
  {
    _id: "6abe105ae33c12a898c02ea1",
    title: "InterContinental Durrat Al Riyadh Resort & Spa",
    subtitle: "Executive Suite · Banban District",
    destination: "Riyadh 11566 Saudi Arabia",
    itemType: "hotel",
    sellPrice: 67620000,
    originalPrice: 79380000,
    discountPercentage: 15,
    rating: 4.9,
    availableBookings: 3,
    images: [
      "https://res.cloudinary.com/dsszjlw3u/image/upload/v1790840888/travel-agency/offers/wvsjb9p0ldwzd7yev8i3.jpg",
      "https://res.cloudinary.com/dsszjlw3u/image/upload/v1790840917/travel-agency/offers/swvlzb0klyhjiyibdzwa.jpg",
      "https://res.cloudinary.com/dsszjlw3u/image/upload/v1790840916/travel-agency/offers/u4clgddeew8wozhiw6i0.jpg",
    ],
    hotelRef: {
      stock: {
        _id: "6abe0fbae33c12a898c02aeb",
        hotelName: "InterContinental Durrat Al Riyadh Resort & Spa",
        roomType: "Executive Suite",
        meals: ["breakfast", "lunch", "dinner"],
        totalNights: 28,
        availableUnits: 3,
      },
    },
  },
  {
    _id: "6abe0f04e33c12a898c02a1a",
    title: "voco Riyadh",
    subtitle: "Executive Suite · King Fahad Road",
    destination: "Riyadh 13003 Saudi Arabia",
    itemType: "hotel",
    sellPrice: 714150,
    originalPrice: 838350,
    discountPercentage: 15,
    rating: 4.8,
    availableBookings: 11,
    images: [
      "https://res.cloudinary.com/dsszjlw3u/image/upload/v1790840562/travel-agency/offers/hbrlrmrnkpd0nyrxkisx.jpg",
      "https://res.cloudinary.com/dsszjlw3u/image/upload/v1790840577/travel-agency/offers/nihhggueuusxn1d88evn.jpg",
      "https://res.cloudinary.com/dsszjlw3u/image/upload/v1790840578/travel-agency/offers/qyeuzsndxwdg56egpwcd.jpg",
    ],
    hotelRef: {
      stock: {
        _id: "6abe0e8ce33c12a898c027e5",
        hotelName: "voco Riyadh",
        roomType: "Executive Suite",
        meals: ["dinner", "breakfast"],
        totalNights: 27,
        availableUnits: 11,
      },
    },
  },
  {
    _id: "6abe0da7e33c12a898c02730",
    title: "Crowne Plaza Riyadh Palace",
    subtitle: "Deluxe Room · Ministries Area",
    destination: "Riyadh 11461 Saudi Arabia",
    itemType: "hotel",
    sellPrice: 179400,
    originalPrice: 210600,
    discountPercentage: 15,
    rating: 4.7,
    availableBookings: 10,
    images: [
      "https://res.cloudinary.com/dsszjlw3u/image/upload/v1790840220/travel-agency/offers/wbsbra1fkqr3opozbmmi.jpg",
      "https://res.cloudinary.com/dsszjlw3u/image/upload/v1790840228/travel-agency/offers/xxnmi6auyvgz6ebwrxn8.jpg",
      "https://res.cloudinary.com/dsszjlw3u/image/upload/v1790840229/travel-agency/offers/xwy6ma1dihpw4eynyypu.jpg",
    ],
    hotelRef: {
      stock: {
        _id: "6abe0d28e33c12a898c02515",
        hotelName: "Crowne Plaza Riyadh Palace",
        roomType: "Deluxe Room",
        meals: ["lunch"],
        totalNights: 13,
        availableUnits: 10,
      },
    },
  },
  {
    _id: "6abcadb685ad66257ed120bd",
    title: "Holiday Inn Riyadh - Al Qasr",
    subtitle: "Standard Room · Olaya District",
    destination: "Riyadh 11482 Saudi Arabia",
    itemType: "hotel",
    sellPrice: 29900,
    originalPrice: 35100,
    discountPercentage: 10,
    rating: 4.6,
    availableBookings: 8,
    images: [
      "https://res.cloudinary.com/dsszjlw3u/image/upload/v1790750108/travel-agency/offers/b7d0ksh0ae7uohvt1xro.jpg",
      "https://res.cloudinary.com/dsszjlw3u/image/upload/v1790750117/travel-agency/offers/blrxe0pwnbri76uow8db.jpg",
      "https://res.cloudinary.com/dsszjlw3u/image/upload/v1790750117/travel-agency/offers/mwoihjiax2aejh23l7gd.jpg",
    ],
    hotelRef: {
      stock: {
        _id: "6abcac3285ad66257ed11b1d",
        hotelName: "Holiday Inn Riyadh - Al Qasr",
        roomType: "Standard Room",
        meals: ["breakfast", "lunch", "dinner"],
        totalNights: 2,
        availableUnits: 8,
      },
    },
  },
];

function formatPrice(amount) {
  if (typeof amount !== "number" || isNaN(amount)) return "0";
  return amount.toLocaleString("en-IN");
}

export default function OffersSection({ className = "" }) {
  const navigate = useNavigate();
  const trackRef = useRef(null);

  const [hotelOffers, setHotelOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const fetchHotelOffers = async () => {
    setLoading(true);
    try {
      const apiUrl = OfferAPI?.OffersApi || `${getApiBaseUrl()}/api/v1/offers`;
      const response = await axios.get(apiUrl, {
        params: { itemType: "hotel" },
        timeout: 10000,
      });

      const data = response?.data;
      let list = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data?.offers && Array.isArray(data.offers)) {
        list = data.offers;
      } else if (data?.data && Array.isArray(data.data)) {
        list = data.data;
      }

      const filtered = list.filter(
        (o) =>
          o &&
          (!o.itemType || String(o.itemType).toLowerCase() === "hotel") &&
          o.isActive !== false
      );

      if (filtered.length > 0) {
        setHotelOffers(filtered);
      } else {
        setHotelOffers(FALLBACK_HOTEL_OFFERS);
      }
    } catch (err) {
      console.warn("Using fallback hotel offers:", err);
      setHotelOffers(FALLBACK_HOTEL_OFFERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotelOffers();
  }, []);

  const updateScrollButtons = useCallback(() => {
    if (!trackRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = trackRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollWidth - scrollLeft - clientWidth > 10);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollButtons);
    updateScrollButtons();
    return () => el.removeEventListener("scroll", updateScrollButtons);
  }, [updateScrollButtons, hotelOffers]);

  const handleScroll = (direction) => {
    if (!trackRef.current) return;
    const scrollAmount = trackRef.current.clientWidth * 0.75;
    const target =
      direction === "right"
        ? trackRef.current.scrollLeft + scrollAmount
        : trackRef.current.scrollLeft - scrollAmount;

    trackRef.current.scrollTo({
      left: target,
      behavior: "smooth",
    });
  };

  const handleCardClick = (offer) => {
    if (!offer) return;
    const offerId = offer._id;

    if (offer.itemType === "flight") {
      const stock = offer.flightRef?.stock || {};
      const dest = stock.destination || offer.destination || "JED";
      const origin = stock.origin || "DEL";
      const fareAmount = Number(offer.sellPrice || stock.costPerUnit || 0);
      const departureDate = stock.departureDate || offer.startDate;
      const arrivalDate = stock.arrivalDate || offer.endDate;
      const flightNumber = stock.flightNumber || "FL-100";
      const airlineCode = flightNumber.includes("-")
        ? flightNumber.split("-")[0]
        : flightNumber.slice(0, 2);

      const bookingState = {
        flightId: offer._id,
        cardId: offer._id,
        offerId: offer._id,
        stockId: stock._id,
        isInHouse: true,
        isOffer: true,
        traceId: offer._id,
        resultIndex: "OB1",
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
          flightId: offer._id,
          cardId: offer._id,
          offerId: offer._id,
          stockId: stock._id,
          isInHouse: true,
          isOffer: true,
          resultIndex: "OB1",
          totalAmount: fareAmount,
          segments: [
            {
              origin,
              destination: dest,
              airline: stock.airline || "Airline",
              airlineCode,
              flightNumber,
              departure: departureDate,
              arrival: arrivalDate,
              cabinClass: stock.cabinClass || "Economy",
            },
          ],
        },
      };

      try {
        sessionStorage.setItem("selectedFlightBooking", JSON.stringify(bookingState));
        localStorage.setItem("selectedFlightBooking", JSON.stringify(bookingState));
      } catch (e) {
        console.warn("Storage warning:", e);
      }

      navigate("/fare-quote-details", { state: bookingState });
      return;
    }

    try {
      sessionStorage.setItem("selectedOfferId", offerId);
      sessionStorage.setItem("selectedHotel", JSON.stringify(offer));
    } catch {}
    navigate(`/booking-details/${offerId}`, {
      state: {
        item: offer,
        hotel: offer,
        offer,
        selectedOffer: offer,
        offerId,
        hotelId: offerId,
        isOffer: true,
        searchId: undefined,
      },
    });
  };

  return (
    <section
      className={`py-10 md:py-14 px-4 sm:px-6 lg:px-10 xl:px-12 font-poppins border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#070c18] transition-colors duration-300 ${className}`}
      aria-label="Exclusive Travel Deals and Special Offers"
    >
      <div className="w-full max-w-[1760px] mx-auto">
        {/* Unified Card Container (21st.dev offers-carousel structure) */}
        <div className="w-full rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900/90 p-5 sm:p-7 md:p-8 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] dark:shadow-none">
          <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
            {/* Left Column (Offer Banner): Title, Subtitle, CTA */}
            <div className="flex flex-col items-center text-center lg:col-span-4 xl:col-span-3 lg:items-start lg:text-left justify-center space-y-4">
              <div className="space-y-3">

                {/* Pre-header badge / Our Recommendations */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xs">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Our Recommendations</span>
                </div>

                {/* Main Heading */}
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
                  Exclusive Travel{" "}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Deals &amp; Special Offers
                  </span>
                </h2>

                {/* Subtitle */}
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                  Handpicked luxury suites with instant confirmation and guaranteed allotments across Makkah, Madinah, and premier destinations.
                </p>

                {/* Highlight Tag */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700">
                  <Gift className="h-3 w-3 text-[#045C45] dark:text-emerald-400" />
                  <span>Direct booking allotments &amp; transparent rates</span>
                </div>
              </div>

              {/* View all hotels CTA */}
              <button
                type="button"
                onClick={() => navigate("/hotel-page")}
                className="mt-1 sm:mt-2 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs sm:text-sm transition-all duration-200 cursor-pointer shadow-xs active:scale-95"
              >
                <span>View all hotels</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Right Column: Carousel Track with Next/Prev Buttons */}
            <div className="relative lg:col-span-8 xl:col-span-9 min-w-0">
              {/* Floating Prev Button */}
              {canScrollLeft && (
                <button
                  type="button"
                  onClick={() => handleScroll("left")}
                  aria-label="Previous offers"
                  className="absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-md hover:bg-emerald-50 dark:hover:bg-slate-700 hover:text-emerald-600 transition-all hidden md:flex items-center justify-center cursor-pointer active:scale-95"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}

              {/* Floating Next Button */}
              {canScrollRight && (
                <button
                  type="button"
                  onClick={() => handleScroll("right")}
                  aria-label="Next offers"
                  className="absolute -right-3 sm:-right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-md hover:bg-emerald-50 dark:hover:bg-slate-700 hover:text-emerald-600 transition-all hidden md:flex items-center justify-center cursor-pointer active:scale-95"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}

              {/* Scroll Track */}
              <div
                ref={trackRef}
                className="overflow-x-auto scrollbar-hide scroll-smooth flex gap-4 sm:gap-5 py-2 px-1 items-stretch"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {loading && hotelOffers.length === 0 ? (
                  [1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="w-[265px] sm:w-[285px] flex-shrink-0 h-[360px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 flex flex-col justify-between animate-pulse"
                    >
                      <div className="h-44 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
                      <div className="space-y-2 mt-3">
                        <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                        <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
                      </div>
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                        <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded" />
                      </div>
                    </div>
                  ))
                ) : (
                  hotelOffers.map((offer) => {
                  const stock = offer?.hotelRef?.stock || {};
                  const hotelName = stock.hotelName || offer.title;
                  const roomType = stock.roomType || "Executive Suite";
                  const destination = stock.destination || offer.destination;
                  const rating = offer.rating || 4.8;
                  const sellPrice = Number(offer.sellPrice) || 0;
                  const originalPrice = Number(offer.originalPrice) || 0;
                  const discount = Number(offer.discountPercentage) || 0;
                  const remaining =
                    offer.availableBookings ?? stock.availableUnits;
                  const imageSrc =
                    offer.images?.[0] ||
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200";

                  return (
                    <motion.div
                      key={offer._id || stock._id}
                      whileHover={{ y: -4 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      onClick={() => handleCardClick(offer)}
                      className="group w-[265px] sm:w-[285px] flex-shrink-0 flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-lg hover:border-emerald-500/40 dark:hover:border-emerald-500/35 transition-all duration-300 cursor-pointer select-none"
                    >
                      {/* Media container */}
                      <div className="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <img
                          src={imageSrc}
                          alt={hotelName}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200";
                          }}
                        />

                        {/* Top-left room badge */}
                        <div className="absolute top-2.5 left-2.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-black/60 text-white backdrop-blur-xs">
                            <Building2 className="h-3 w-3 text-emerald-300" />
                            {roomType}
                          </span>
                        </div>

                        {/* Bottom-right discount badge (21st.dev style) */}
                        {discount > 0 && (
                          <div className="absolute bottom-2.5 right-2.5 rounded-md bg-[#085c44] text-white px-2 py-1 text-xs font-bold shadow-md">
                            {discount}% OFF
                          </div>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="p-4 flex flex-col flex-1 justify-between space-y-2">
                        {/* Title and Rating row */}
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors"
                            title={hotelName}
                          >
                            {hotelName}
                          </h3>

                          {/* Star Rating Badge (21st.dev blue/emerald pill) */}
                          <div className="shrink-0 flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span>{rating.toFixed(1)}</span>
                          </div>
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-normal">
                          <MapPin className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="truncate">{destination}</span>
                        </div>

                        {/* Inventory info */}
                        {remaining && (
                          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            ✓ {remaining} units remaining
                          </p>
                        )}

                        {/* Price footer */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 mt-auto flex items-end justify-between">
                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                                ₹{formatPrice(sellPrice)}
                              </span>
                              {discount > 0 && originalPrice > sellPrice && (
                                <span className="text-xs text-slate-400 dark:text-slate-500 line-through">
                                  ₹{formatPrice(originalPrice)}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {stock.totalNights
                                ? `/ ${stock.totalNights} nights stay`
                                : "/ night"}
                            </span>
                          </div>

                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                            Book
                            <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                }))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
