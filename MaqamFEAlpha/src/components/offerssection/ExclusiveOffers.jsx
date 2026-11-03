import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Gift,
  ArrowRight,
  Star,
  MapPin,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { OfferAPI, getApiBaseUrl } from "../../configs/api";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200";

const FALLBACK_OFFERS = [
  {
    _id: "6abe105ae33c12a898c02ea1",
    title: "InterContinental Durrat Al Riyadh Resort & Spa — Executive Suite",
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
      "https://res.cloudinary.com/dsszjlw3u/image/upload/v1790840917/travel-agency/offers/nokacndsdpzkti0lwm11.jpg",
      "https://res.cloudinary.com/dsszjlw3u/image/upload/v1790840917/travel-agency/offers/sgok1b8i1hfgpllpmrad.jpg",
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
    title: "voco Riyadh — Executive Suite",
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
    title: "Crowne Plaza Riyadh Palace — Deluxe Room",
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
    title: "Holiday Inn Riyadh - Al Qasr — Standard Room",
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

const ExclusiveOffers = () => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeHotelIndex, setActiveHotelIndex] = useState(0);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showAllOffersModal, setShowAllOffersModal] = useState(false);

  // Drag-to-scroll refs for side cards container
  const listRef = useRef(null);
  const cardRefs = useRef([]);
  const isMouseDownRef = useRef(false);
  const startYRef = useRef(0);
  const scrollTopRef = useRef(0);
  const isDraggingRef = useRef(false);
  const [isGrabbing, setIsGrabbing] = useState(false);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const apiUrl = OfferAPI?.OffersApi || `${getApiBaseUrl()}/api/v1/offers`;
      const res = await axios.get(apiUrl, {
        params: { itemType: "hotel" },
        timeout: 10000,
      });
      const data = res?.data;
      let list = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (Array.isArray(data?.offers)) {
        list = data.offers;
      } else if (Array.isArray(data?.data)) {
        list = data.data;
      }

      const filtered = list.filter(
        (o) =>
          o &&
          (!o.itemType || String(o.itemType).toLowerCase() === "hotel") &&
          o.isActive !== false,
      );

      setOffers(filtered.length > 0 ? filtered : FALLBACK_OFFERS);
    } catch (err) {
      console.warn("Using fallback hotel offers in ExclusiveOffers:", err);
      setOffers(FALLBACK_OFFERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const activeHotel = offers[activeHotelIndex] || offers[0] || FALLBACK_OFFERS[0];
  const activeStock = activeHotel?.hotelRef?.stock || {};
  const activeImages =
    Array.isArray(activeHotel?.images) && activeHotel.images.length > 0
      ? activeHotel.images
      : [FALLBACK_IMAGE];

  // Sequential Auto-Loop:
  // Shows every image of the active hotel in order. When the last image finishes,
  // it advances to the next hotel in the list and resets to image 0, continuing in an infinite loop.
  useEffect(() => {
    if (!offers.length) return;

    const currentHotel = offers[activeHotelIndex];
    const imgs =
      Array.isArray(currentHotel?.images) && currentHotel.images.length > 0
        ? currentHotel.images
        : [FALLBACK_IMAGE];

    const timer = setInterval(() => {
      if (currentImgIndex < imgs.length - 1) {
        // Advance to next photo of current hotel
        setCurrentImgIndex((prev) => prev + 1);
      } else {
        // All photos of current hotel shown! Advance to next hotel
        setActiveHotelIndex((prev) => (prev + 1) % offers.length);
        setCurrentImgIndex(0);
      }
    }, 3500);

    return () => clearInterval(timer);
  }, [offers, activeHotelIndex, currentImgIndex]);

  // 2. Scroll active card smoothly into view in side list when user clicks a hotel
  useEffect(() => {
    if (cardRefs.current[activeHotelIndex] && listRef.current) {
      cardRefs.current[activeHotelIndex].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
    setCurrentImgIndex(0);
  }, [activeHotelIndex]);

  // Hold-and-drag logic for vertical list
  const handleMouseDown = (e) => {
    if (!listRef.current) return;
    isMouseDownRef.current = true;
    isDraggingRef.current = false;
    startYRef.current = e.pageY - listRef.current.offsetTop;
    scrollTopRef.current = listRef.current.scrollTop;
    setIsGrabbing(true);
  };

  const handleMouseMove = (e) => {
    if (!isMouseDownRef.current || !listRef.current) return;
    e.preventDefault();
    const currentY = e.pageY - listRef.current.offsetTop;
    const walk = (currentY - startYRef.current) * 1.3;
    if (Math.abs(walk) > 5) {
      isDraggingRef.current = true;
    }
    listRef.current.scrollTop = scrollTopRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isMouseDownRef.current = false;
    setIsGrabbing(false);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  };

  const handleSmallCardClick = (idx) => {
    if (isDraggingRef.current) return; // Prevent selection if mouse was dragging
    setActiveHotelIndex(idx);
    setCurrentImgIndex(0);
  };

  // Redirect user to hotel or flight booking details page
  const handleOfferClick = (offer) => {
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
      sessionStorage.setItem("selectedOfferId", offer._id);
      sessionStorage.setItem("selectedHotel", JSON.stringify(offer));
    } catch {}
    navigate(`/booking-details/${offerId}`, {
      state: {
        item: offer,
        hotel: offer,
        offer,
        offerId,
        hotelId: offerId,
        isOffer: true,
        searchId: undefined,
      },
    });
  };

  if (loading) {
    return (
      <section className="py-16 px-4 sm:px-6 lg:px-10 xl:px-12 bg-white dark:bg-[#070c18]">
        <div className="max-w-[1760px] mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center animate-pulse">
              <Sparkles className="text-emerald-600 h-5 w-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Exclusive Travel Deals &amp; Special Offers
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-[500px] rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const hotelName = activeStock.hotelName || activeHotel.title;
  const destination = activeStock.destination || activeHotel.destination;
  const sellPrice = Number(activeHotel.sellPrice) || 0;
  const originalPrice = Number(activeHotel.originalPrice) || 0;
  const discount = Number(activeHotel.discountPercentage) || 0;

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-10 xl:px-12 bg-white dark:bg-[#070c18] border-b border-slate-100 dark:border-slate-800 transition-colors">
      <div className="max-w-[1760px] mx-auto">
        {/* Header Section (Restored Previous Header Layout) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 shadow-sm border border-emerald-200 dark:border-emerald-800/50">
              <Sparkles className="text-emerald-600 h-5 w-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 mb-1.5 shadow-2xs">
                <span>Our Recommendations</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Exclusive Travel{" "}
                <span className="text-emerald-600 dark:text-emerald-400">
                  Deals &amp; Special Offers
                </span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Handpicked luxury stays with exclusive member rates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAllOffersModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-xs hover:shadow-sm cursor-pointer group"
          >
            <span>View All Offers</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Main Grid: lg:col-span-2 on Left (Featured Big Card) + lg:col-span-1 on Right (Side Cards List) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* 1. Left Featured Big Card */}
          <div
            className="lg:col-span-2 relative group cursor-pointer"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeHotel._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="w-full"
                onClick={() => handleOfferClick(activeHotel)}
              >
                <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 min-h-[500px] sm:min-h-[540px] flex flex-col shadow-sm hover:shadow-md transition-all duration-300">
                  {/* Media Section: Multi-Image Smooth Crossfade Slideshow */}
                  <div className="relative h-[260px] sm:h-[300px] md:h-[340px] w-full overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0">
                    {activeImages.map((img, i) => (
                      <img
                        key={img || i}
                        src={img}
                        alt={`${hotelName} photo ${i + 1}`}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out select-none group-hover:scale-105 transition-transform ${
                          i === currentImgIndex
                            ? "opacity-100 z-1"
                            : "opacity-0 z-0 pointer-events-none"
                        }`}
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_IMAGE;
                        }}
                      />
                    ))}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none z-5" />

                    {/* Top-Left Badges */}
                    <div className="absolute top-4 left-4 flex gap-2 z-10">
                      <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-medium flex items-center gap-1 shadow-xs">
                        <Gift className="h-3 w-3 text-emerald-400" />
                        Featured Deal
                      </span>
                      {discount > 0 && (
                        <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-md">
                          {discount}% OFF
                        </span>
                      )}
                    </div>

                    {/* Top-Right Star Rating */}
                    <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-medium flex items-center gap-1 z-10 shadow-xs">
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                      <span>{Number(activeHotel.rating || 4.9).toFixed(1)}</span>
                    </div>

                    {/* Previous/Next Manual Hover Arrows */}
                    {activeImages.length > 1 && (
                      <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex justify-between items-center pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImgIndex((prev) =>
                              prev === 0 ? activeImages.length - 1 : prev - 1,
                            );
                          }}
                          className="pointer-events-auto h-9 w-9 rounded-full bg-black/55 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs transition cursor-pointer shadow-md active:scale-95"
                          aria-label="Previous photo"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImgIndex(
                              (prev) => (prev + 1) % activeImages.length,
                            );
                          }}
                          className="pointer-events-auto h-9 w-9 rounded-full bg-black/55 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs transition cursor-pointer shadow-md active:scale-95"
                          aria-label="Next photo"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {/* Bottom Dot Indicators */}
                    {activeImages.length > 1 && (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                        {activeImages.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImgIndex(i);
                            }}
                            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                              i === currentImgIndex
                                ? "w-5 bg-white shadow-sm"
                                : "w-1.5 bg-white/50 hover:bg-white/80"
                            }`}
                            aria-label={`Slide ${i + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Content: Responsive Text & Spacing */}
                  <div className="p-5 sm:p-6 md:p-7 flex flex-col justify-between flex-1 bg-white dark:bg-slate-900">
                    <div>
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{destination}</span>
                      </div>

                      <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2 leading-tight line-clamp-2">
                        {hotelName}
                      </h3>

                      <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm line-clamp-2 sm:line-clamp-3 mb-4 leading-relaxed">
                        {activeHotel.description ||
                          activeHotel.subtitle ||
                          "Experience unparalleled luxury and world-class service at one of our most exclusive partner properties."}
                      </p>
                    </div>

                    {/* Footer: Responsive Starting Price + Book Now Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          Starting from
                        </span>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                            ₹{sellPrice.toLocaleString("en-IN")}
                          </span>
                          {discount > 0 && originalPrice > sellPrice && (
                            <span className="text-sm text-slate-400 line-through">
                              ₹{originalPrice.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOfferClick(activeHotel);
                        }}
                        className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all active:scale-95 shadow-xs hover:shadow-sm cursor-pointer text-center"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 2. Right Side Cards Column (Restored Previous Design & Heights, with Hold-Drag Scroll) */}
          <div
            ref={listRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onMouseEnter={() => setIsPaused(true)}
            className={`h-[500px] overflow-y-auto space-y-3.5 pr-1 select-none transition-colors duration-150 ${
              isGrabbing ? "cursor-grabbing" : "cursor-grab"
            }`}
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {offers.map((offer, idx) => {
              const isSelected = idx === activeHotelIndex;
              const stock = offer.hotelRef?.stock || {};
              const title = stock.hotelName || offer.title;
              const thumb =
                (Array.isArray(offer.images) && offer.images[0]) ||
                FALLBACK_IMAGE;
              const priceNum = Number(offer.sellPrice) || 0;
              const disc = Number(offer.discountPercentage) || 0;

              return (
                <div
                  key={offer._id || idx}
                  ref={(el) => (cardRefs.current[idx] = el)}
                  onClick={() => handleSmallCardClick(idx)}
                  className={`group relative overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 p-3 flex gap-4 items-center transition-all cursor-pointer ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs"
                  }`}
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                    <img
                      src={thumb}
                      alt={title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 pointer-events-none"
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_IMAGE;
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                        {isSelected ? "Active Deal" : "Special Deal"}
                      </span>
                      {disc > 0 && (
                        <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                          -{disc}%
                        </span>
                      )}
                    </div>

                    <h4
                      className="text-sm font-bold text-slate-900 dark:text-white truncate"
                      title={title}
                    >
                      {title}
                    </h4>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                        ₹{priceNum.toLocaleString("en-IN")}
                      </span>
                      <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── All Exclusive Hotel Offers Modal (/api/v1/offers?itemType=hotel) ── */}
      <AnimatePresence>
        {showAllOffersModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-[#0f172a] rounded-3xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                    <Sparkles className="text-emerald-600 h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                      All Exclusive Hotel Offers ({offers.length})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Verified live hotel deals from /api/v1/offers?itemType=hotel
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllOffersModal(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body: Grid of all hotel offers */}
              <div className="p-5 sm:p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {offers.map((offer, idx) => {
                  const stock = offer.hotelRef?.stock || {};
                  const title = stock.hotelName || offer.title;
                  const thumb =
                    (Array.isArray(offer.images) && offer.images[0]) ||
                    FALLBACK_IMAGE;
                  const priceNum = Number(offer.sellPrice) || 0;
                  const disc = Number(offer.discountPercentage) || 0;
                  const dest = stock.destination || offer.destination || "Saudi Arabia";

                  return (
                    <div
                      key={offer._id || idx}
                      onClick={() => {
                        setShowAllOffersModal(false);
                        handleOfferClick(offer);
                      }}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                    >
                      <div className="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <img
                          src={thumb}
                          alt={title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                        <div className="absolute top-3 left-3 flex gap-1.5">
                          {disc > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-sm">
                              {disc}% OFF
                            </span>
                          )}
                        </div>
                        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-black/60 backdrop-blur-md">
                          <Star size={11} className="fill-amber-400 text-amber-400" />
                          <span>{Number(offer.rating || 4.8).toFixed(1)}</span>
                        </div>
                      </div>

                      <div className="p-4 flex flex-col flex-1 justify-between">
                        <div>
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{dest}</span>
                          </div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-base line-clamp-1 group-hover:text-emerald-600 transition-colors">
                            {title}
                          </h4>
                          <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 mt-1">
                            {offer.description || offer.subtitle || "Premium luxury stay with exclusive member benefits."}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Starting from</span>
                            <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">
                              ₹{priceNum.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                            View Details <ArrowRight size={13} />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default ExclusiveOffers;
