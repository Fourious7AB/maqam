import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { fetchHotelDetails, fetchHotels } from "../components/reducer/HotelSearchSlice";
import { OfferAPI, getApiBaseUrl } from "../configs/api";
import { toast } from "react-toastify";
import {
  Star,
  MapPin,
  ChevronRight,
  ChevronLeft,
  X,
  ZoomIn,
  Users,
  Check,
  ShieldCheck,
  Building,
  Loader2,
  Calendar,
} from "lucide-react";

import Modal from "../components/Modal";
import CommonHeader from "../components/CommonHeader";
import HotelDetails from "../components/hoteldetails/HotelDetails";
import ViewAllHotelImage from "../components/viewallhotelimage/ViewAllHotelImage";
import HotelSearch from "./HotelSearch";

const HotelBookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const hotelId = id;
  const isSrdvHotel =
    typeof hotelId === "string" &&
    (hotelId.toLowerCase().startsWith("hsid") || hotelId.includes("-"));
  const isMongoId = (val) =>
    typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val.trim());

  const searchParams = new URLSearchParams(location.search);
  const querySearchId = searchParams.get("searchId");
  const [activeSearchId, setActiveSearchId] = useState(
    location?.state?.searchId ||
      querySearchId ||
      localStorage.getItem("searchId") ||
      "",
  );
  const searchId =
    activeSearchId ||
    querySearchId ||
    localStorage.getItem("searchId") ||
    "";

  const [isRecovering, setIsRecovering] = useState(false);
  const hasAttemptedRecovery = useRef(false);

  const cachedHotel = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("selectedHotel") || "null");
    } catch {
      return null;
    }
  })();
  const incomingItem =
    location?.state?.item ||
    location?.state?.offer ||
    location?.state?.selectedOffer ||
    location?.state?.hotel;
  const item = incomingItem || cachedHotel;

  const itemRef = useRef(item);
  const locationStateRef = useRef(location?.state);
  useEffect(() => {
    itemRef.current = item;
    locationStateRef.current = location?.state;
  }, [item, location?.state]);

  const [liveOffer, setLiveOffer] = useState(null);
  const [offerLoading, setOfferLoading] = useState(false);

  useEffect(() => {
    if (incomingItem) {
      try {
        sessionStorage.setItem("selectedHotel", JSON.stringify(incomingItem));
      } catch {
        // Ignore session storage errors
      }
    }
  }, [incomingItem]);

  // Determine explicit target offer id — NEVER query /api/v1/offers/ for standard SRDV hotels (hsid...)
  const isGenuineOffer =
    !isSrdvHotel &&
    isMongoId(hotelId);

  const targetOfferId = isGenuineOffer
    ? (location?.state?.offerId && isMongoId(location.state.offerId)
        ? location.state.offerId
        : location?.state?.offer?._id && isMongoId(location.state.offer._id)
          ? location.state.offer._id
          : hotelId)
    : null;

  // Fetch live offer details from GET /api/v1/offers/{id} ONLY when it is a genuine offer
  useEffect(() => {
    if (!targetOfferId || !isMongoId(targetOfferId)) return;

    let isMounted = true;
    const fetchOfferDetails = async () => {
      try {
        setOfferLoading(true);
        const url = OfferAPI?.OfferDetailApi
          ? OfferAPI.OfferDetailApi(targetOfferId)
          : `${getApiBaseUrl()}/api/v1/offers/${targetOfferId}`;
        const res = await axios.get(url, { timeout: 8000 });
        if (!isMounted) return;

        const resolvedOffer =
          res?.data?.offer || (res?.data?.success ? res.data?.data : null);
        if (resolvedOffer) {
          setLiveOffer(resolvedOffer);
          try {
            sessionStorage.setItem(
              "selectedHotel",
              JSON.stringify(resolvedOffer),
            );
          } catch {
            // Ignore session storage errors
          }
        }
      } catch (err) {
        console.warn("Could not load offer details from /api/v1/offers/:id:", err?.message || err);
      } finally {
        if (isMounted) setOfferLoading(false);
      }
    };

    fetchOfferDetails();

    return () => {
      isMounted = false;
    };
  }, [targetOfferId]);

  const { hotelDetailsData, loading: reduxLoading } = useSelector(
    (state) => state?.hotelSearch,
  );

  const [isModalOpen, setModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showAllImages, setShowAllImages] = useState(false);

  // SRDV Hotel details & room fetching with refresh recovery ("proper search logic")
  useEffect(() => {
    // If it's an offer, SRDV hotel details logic is not needed
    if (targetOfferId && isMongoId(targetOfferId) && !isSrdvHotel) {
      return;
    }

    if (!hotelId) return;

    let isMounted = true;

    const loadHotelAndRooms = async () => {
      const currentSearchId =
        new URLSearchParams(window.location.search).get("searchId") ||
        localStorage.getItem("searchId");

      let roomsAvailable = false;
      if (isMounted) setIsRecovering(true);

      try {
        // ── Step 1: Attempt with existing searchId ──
        if (currentSearchId) {
          try {
            const res = await dispatch(
              fetchHotelDetails({ hotelId, searchId: currentSearchId }),
            ).unwrap();

            if (!isMounted) return;

            const rooms = res?.data?.rooms || res?.rooms || [];
            if (Array.isArray(rooms) && rooms.length > 0) {
              roomsAvailable = true;
              localStorage.setItem("searchId", currentSearchId);
              setActiveSearchId(currentSearchId);

              // Sync URL query param with the valid searchId if missing without unmounting
              const urlParams = new URLSearchParams(window.location.search);
              if (urlParams.get("searchId") !== currentSearchId) {
                const currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set("searchId", currentSearchId);
                window.history.replaceState(null, "", currentUrl.toString());
              }
              return;
            }
          } catch (err) {
            console.warn(
              "Initial hotel rooms fetch failed or search session expired for searchId:",
              currentSearchId,
              err?.message || err,
            );
          }
        }

        // Avoid running repeated recovery in the same mount cycle
        if (hasAttemptedRecovery.current) return;
        hasAttemptedRecovery.current = true;

        // ── Step 2: "Proper search logic" — auto-re-search using saved hotelSearch criteria ──
        let savedSearch = null;
        try {
          const rawHotelSearch = localStorage.getItem("hotelSearch");
          if (rawHotelSearch) savedSearch = JSON.parse(rawHotelSearch);
        } catch {
          // Ignore parse errors
          savedSearch = null;
        }

        if (!savedSearch) {
          try {
            const rawCity = localStorage.getItem("cityname");
            const savedCity = rawCity ? JSON.parse(rawCity) : null;
            if (savedCity && (savedCity.cityId || savedCity.cityName)) {
              const today = new Date();
              const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
              savedSearch = {
                cityId: savedCity.cityId,
                cityName: savedCity.cityName,
                countryCode: savedCity.countryCode || "",
                checkIn: today.toISOString().split("T")[0],
                checkOut: tomorrow.toISOString().split("T")[0],
                rooms: [{ adults: 2, children: 0, childAges: [] }],
                guestNationality: "IN",
                minRating: 3,
                maxRating: 5,
              };
            }
          } catch {
            // Ignore city parse errors
            savedSearch = null;
          }
        }

        const currentItem = itemRef.current;
        // Additional fallback: If hotel item from state/sessionStorage has city name, lookup cityId
        if (!savedSearch && (currentItem?.city || currentItem?.cityName || currentItem?.destination)) {
          try {
            const cityNameTarget = currentItem.city || currentItem.cityName || currentItem.destination;
            const cityLookupRes = await axios.get(
              `${getApiBaseUrl()}/api/v1/hotels/cities?q=${encodeURIComponent(cityNameTarget)}`,
              { timeout: 5000 },
            );
            const cityData = cityLookupRes?.data?.data?.[0];
            if (cityData?.cityId) {
              const today = new Date();
              const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
              savedSearch = {
                cityId: cityData.cityId,
                cityName: cityData.cityName || cityNameTarget,
                countryCode: cityData.countryCode || "",
                checkIn: today.toISOString().split("T")[0],
                checkOut: tomorrow.toISOString().split("T")[0],
                rooms: [{ adults: 2, children: 0, childAges: [] }],
                guestNationality: "IN",
                minRating: 3,
                maxRating: 5,
              };
            }
          } catch {
            // City lookup fallback failed
          }
        }

        if (savedSearch && (savedSearch.cityId || savedSearch.cityName)) {
          try {
            // Defensive date normalization: ensure checkIn is not in the past
            const searchPayload = { ...savedSearch };
            const todayStr = new Date().toISOString().split("T")[0];
            if (!searchPayload.checkIn || searchPayload.checkIn < todayStr) {
              const nextDayStr = new Date(Date.now() + 86400000)
                .toISOString()
                .split("T")[0];
              searchPayload.checkIn = todayStr;
              searchPayload.checkOut = nextDayStr;
            }

            console.log(
              "Search session expired on refresh. Re-executing hotel search for hotel:",
              hotelId,
            );
            const searchResult = await dispatch(
              fetchHotels(searchPayload),
            ).unwrap();

            if (!isMounted) return;

            const freshSearchId =
              searchResult?.data?.searchId || searchResult?.searchId;

            if (freshSearchId) {
              localStorage.setItem("searchId", freshSearchId);
              setActiveSearchId(freshSearchId);

              // ── Key Fix: Match hotel in fresh search results to handle SRDV session prefix change ──
              const freshHotels =
                searchResult?.data?.hotels || searchResult?.hotels || [];
              const hotelCode =
                typeof hotelId === "string" && hotelId.includes("-")
                  ? hotelId.split("-")[1]
                  : hotelId;
              const normalizedHotelId = String(hotelId || "").replace(/^:/, "");
              const targetName = (currentItem?.name || currentItem?.hotelName || "").toLowerCase().trim();

              const matchedHotel =
                freshHotels.find((h) => {
                  const hid = String(h?.id || "");
                  const hCode = String(h?.hotelCode || h?.HotelCode || "");
                  if (hid === hotelId || hid === normalizedHotelId) return true;
                  if (hotelCode && (hid.endsWith(`-${hotelCode}`) || hCode === hotelCode)) return true;
                  if (targetName && h?.name && h.name.toLowerCase().trim() === targetName) return true;
                  return false;
                }) || null;

              const targetHotelId = matchedHotel?.id || hotelId;

              // Fetch rooms with the fresh search session and targetHotelId
              const detailRes = await dispatch(
                fetchHotelDetails({ hotelId: targetHotelId, searchId: freshSearchId }),
              ).unwrap();

              if (!isMounted) return;

              const freshRooms =
                detailRes?.data?.rooms || detailRes?.rooms || [];
              if (Array.isArray(freshRooms) && freshRooms.length > 0) {
                roomsAvailable = true;
                console.log(
                  "Proper search recovery succeeded. Rooms loaded:",
                  freshRooms.length,
                );

                // Update URL to target hotel ID and searchId without unmounting
                const newPath = `/booking-details/${targetHotelId}?searchId=${encodeURIComponent(freshSearchId)}`;
                window.history.replaceState(null, "", newPath);
                return;
              }
            }
          } catch (recoveryErr) {
            console.error("Proper search recovery attempt failed:", recoveryErr);
          }
        }

        // ── Step 3: If not possible and the room is gone, redirect to /hotel-page ──
        if (!roomsAvailable) {
          console.warn(
            "Hotel rooms not available or search session lost. Redirecting to /hotel-page...",
          );
          toast.error(
            "This room is no longer available. Redirecting to hotel search...",
            { autoClose: 3000 },
          );
          navigate("/hotel-page", { replace: true });
        }
      } finally {
        if (isMounted) setIsRecovering(false);
      }
    };

    loadHotelAndRooms();

    return () => {
      isMounted = false;
    };
  }, [dispatch, hotelId, isSrdvHotel, targetOfferId, navigate]);

  const detail = hotelDetailsData?.data || hotelDetailsData || {};
  const activeOffer = liveOffer || item;
  const offerStock = activeOffer?.hotelRef?.stock;
  const stockHotel = offerStock?.hotelId;

  // Real Hotel Attributes (Dynamic based on live offer data or SRDV detail)
  const hotelName =
    offerStock?.hotelName ||
    stockHotel?.name ||
    detail?.name ||
    detail?.hotelName ||
    activeOffer?.title ||
    activeOffer?.name ||
    "Hotel Details";

  const hotelLocation =
    stockHotel?.address ||
    offerStock?.destination ||
    activeOffer?.destination ||
    detail?.address ||
    activeOffer?.address ||
    activeOffer?.subtitle ||
    "";

  const rating = Number(detail?.rating || activeOffer?.rating || 4.8).toFixed(1);
  const reviews =
    activeOffer?.reviews ||
    (activeOffer?.availableBookings ? activeOffer.availableBookings * 12 : 120);

  // High-res Cloudinary images from offer or hotelRef
  const offerImages = [
    ...(Array.isArray(activeOffer?.images) ? activeOffer.images : []),
    ...(Array.isArray(stockHotel?.images) ? stockHotel.images : []),
  ].filter(Boolean);

  const rawImages =
    (offerImages.length > 0
      ? offerImages
      : detail?.imageUrls?.length
        ? detail.imageUrls
        : Array.isArray(activeOffer?.imageUrls)
          ? activeOffer.imageUrls
          : []) || [];
  const hotelImages =
    rawImages.length > 0
      ? rawImages
      : [
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600",
        ];

  // Real Rooms from SRDV or synthesized from live Deal Stock
  const realRooms = Array.isArray(detail?.rooms) ? detail.rooms : [];

  const totalNights = offerStock?.totalNights || 1;
  const pricePerNight =
    offerStock?.pricePerNight ||
    (activeOffer?.sellPrice && totalNights
      ? Math.round(Number(activeOffer.sellPrice) / totalNights)
      : Number(activeOffer?.sellPrice || 2500));
  const totalPrice = Number(activeOffer?.sellPrice || pricePerNight * totalNights);
  const discountPercentage = Number(activeOffer?.discountPercentage) || 0;
  const availableUnits = activeOffer?.availableBookings ?? offerStock?.availableUnits;

  const checkInDateStr = offerStock?.checkIn
    ? new Date(offerStock.checkIn).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const checkOutDateStr = offerStock?.checkOut
    ? new Date(offerStock.checkOut).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const mealsList =
    Array.isArray(offerStock?.meals) && offerStock.meals.length > 0
      ? offerStock.meals
          .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
          .join(" & ")
      : "All Meals & Luxury Inclusions";

  const fallbackOfferRooms =
    offerStock || activeOffer?.sellPrice
      ? [
          {
            id: offerStock?._id || activeOffer?._id || "deal-room-1",
            name:
              offerStock?.roomType ||
              activeOffer?.subtitle ||
              activeOffer?.title ||
              "Executive Luxury Suite",
            capacity: 2,
            price: pricePerNight,
            totalPrice: totalPrice,
            nights: totalNights,
            checkIn: checkInDateStr,
            checkOut: checkOutDateStr,
            board: mealsList,
            refundable: true,
            availableUnits: availableUnits,
            discountPercentage: discountPercentage,
            cancellationPolicy:
              "Special Deal: Free cancellation up to 48 hours prior to check-in. Instant confirmation.",
            image:
              (offerImages && offerImages[0]) ||
              hotelImages[0],
          },
        ]
      : [];

  const displayRooms = realRooms.length > 0 ? realRooms : fallbackOfferRooms;
  const primaryRoom = displayRooms[0] || null;

  const rawPrimaryPrice =
    primaryRoom?.price ||
    activeOffer?.fromPrice?.perNightPrice ||
    pricePerNight ||
    2500;
  const primaryPrice = Number(rawPrimaryPrice) || 2500;
  const price = `₹ ${primaryPrice.toLocaleString("en-IN")}`;
  const taxes = "Includes taxes & fees";
  const loading = reduxLoading || (offerLoading && !activeOffer) || isRecovering;

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? hotelImages.length - 1 : prev - 1,
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === hotelImages.length - 1 ? 0 : prev + 1,
    );
  };

  const handleThumbnailClick = (index) => {
    setCurrentImageIndex(index);
  };

  const handleZoomToggle = () => {
    setIsZoomed(!isZoomed);
  };

  const handleNavigateToSelectedRoomInformation = (selectedRoom) => {
    const rawRoom = selectedRoom || primaryRoom;
    const chosenRoom = {
      ...rawRoom,
      price: rawRoom?.price || primaryPrice,
      retailPrice: rawRoom?.price || primaryPrice,
    };
    const effectiveSearchId =
      activeSearchId ||
      new URLSearchParams(window.location.search).get("searchId") ||
      localStorage.getItem("searchId") ||
      searchId;

    const resolvedOfferId = isGenuineOffer
      ? String(activeOffer?._id || targetOfferId || hotelId)
      : undefined;
    const isOffer = Boolean(isGenuineOffer && resolvedOfferId);

    const hotelPayload = {
      id: detail?.id || (isGenuineOffer ? activeOffer?._id : null) || hotelId,
      name: hotelName,
      address: hotelLocation,
      rating: rating,
      imageUrls: hotelImages,
      city:
        activeOffer?.city ||
        (hotelLocation ? hotelLocation.split(",")[0].trim() : ""),
      country: activeOffer?.country || "Saudi Arabia",
      offerId: resolvedOfferId || null,
    };

    try {
      sessionStorage.setItem(
        "selectedHotelDetails",
        JSON.stringify({
          hotel: hotelPayload,
          room: chosenRoom,
          searchId: effectiveSearchId,
          hotelId: hotelId,
          offerId: resolvedOfferId || null,
          isOffer,
        }),
      );
    } catch {
      // Ignore session storage errors
    }

    navigate("/selected-room-information", {
      state: {
        hotel: hotelPayload,
        room: chosenRoom,
        searchId: effectiveSearchId,
        hotelId: hotelId,
        offerId: resolvedOfferId || null,
        isOffer,
      },
    });
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {!showAllImages ? (
        <>
          <CommonHeader title="Hotel" />
          <div className="h-20 bg-gray-100 lg:block hidden" />
          <div className="sticky top-0 z-40 bg-white shadow-xs lg:block hidden">
            <HotelSearch />
          </div>
        </>
      ) : (
        <HotelDetails
          setShowAllImages={setShowAllImages}
          showAllImages={showAllImages}
        />
      )}

      {showAllImages ? (
        <ViewAllHotelImage
          hotelDetailsData={hotelDetailsData}
          onBack={() => setShowAllImages(false)}
        />
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-6 font-poppins">
          {/* Header Section */}
          <div className="mb-6 bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                  {hotelName}
                </h1>
                {hotelLocation && (
                  <div className="flex items-center gap-1.5 text-gray-600 mb-2">
                    <MapPin size={16} className="text-teal-600 shrink-0" />
                    <span className="text-sm font-medium">{hotelLocation}</span>
                  </div>
                )}
                {detail?.description ? (
                  <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 mt-1">
                    {detail.description}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (hotelLocation) {
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          hotelName + " " + hotelLocation,
                        )}`,
                        "_blank",
                      );
                    }
                  }}
                  className="border border-teal-600 text-teal-700 hover:bg-teal-50 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  View on Map
                </button>
              </div>
            </div>

            {/* Rating Section */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1 bg-teal-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold">
                <Star size={13} fill="white" />
                <span>{rating} / 5</span>
              </div>
              <span className="text-xs font-semibold text-gray-700">
                {Number(rating) >= 4.5
                  ? "Excellent"
                  : Number(rating) >= 3.8
                    ? "Very Good"
                    : "Good"}
              </span>
              <span className="text-xs text-teal-700 font-semibold">
                {reviews} Verified Guest Reviews
              </span>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Image Gallery */}
            <div className="lg:col-span-2">
              <div className="flex gap-2 h-[380px] sm:h-[420px]">
                {/* Main Image */}
                <div
                  className="relative rounded-2xl overflow-hidden group cursor-pointer flex-[2] bg-gray-100 shadow-xs"
                  onClick={handleZoomToggle}
                >
                  <div className="relative w-full h-full">
                    {loading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                          <span className="text-xs text-gray-500 font-medium">
                            Loading hotel details...
                          </span>
                        </div>
                      </div>
                    )}

                    <img
                      src={hotelImages[currentImageIndex] || hotelImages[0]}
                      alt={hotelName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600";
                      }}
                    />
                  </div>

                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-xs text-white px-3 py-1 rounded-xl text-xs font-semibold">
                    Photos ({hotelImages.length})
                  </div>

                  <button
                    type="button"
                    className="absolute bottom-4 right-4 bg-white/95 hover:bg-white text-gray-900 px-4 py-2 rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAllImages(true);
                    }}
                  >
                    View All Photos
                  </button>

                  <div className="absolute top-4 right-4 bg-black/60 p-2 rounded-full opacity-0 group-hover:opacity-100 transition">
                    <ZoomIn size={18} className="text-white" />
                  </div>

                  {hotelImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrevImage();
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-md text-gray-800 transition cursor-pointer"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNextImage();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-md text-gray-800 transition cursor-pointer"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnails Sidebar */}
                <div className="hidden sm:flex flex-col gap-2 flex-1">
                  <div
                    className="h-1/2 rounded-xl overflow-hidden cursor-pointer relative bg-gray-100 group shadow-xs"
                    onClick={() => handleThumbnailClick(1 % hotelImages.length)}
                  >
                    <img
                      src={hotelImages[1 % hotelImages.length]}
                      alt="Thumbnail 1"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>
                  <div
                    className="h-1/2 rounded-xl overflow-hidden cursor-pointer relative bg-gray-100 group shadow-xs"
                    onClick={() => handleThumbnailClick(2 % hotelImages.length)}
                  >
                    <img
                      src={hotelImages[2 % hotelImages.length]}
                      alt="Thumbnail 2"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Booking Details Sticky Card */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs sticky top-24">
                <div className="mb-4">
                  <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                    Recommended Room
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 mt-2 mb-1">
                    {primaryRoom?.name || "Standard Room"}
                  </h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Users size={14} className="text-teal-600" />
                    <span>{primaryRoom?.capacity || 2} Guests | 1 Room</span>
                  </p>
                </div>

                <div className="border-t border-gray-100 pt-4 mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-gray-900">
                      {price}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      Per Night
                    </span>
                  </div>
                  <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                    {taxes}
                  </p>
                  {primaryRoom?.totalPrice && primaryRoom.totalPrice > primaryPrice && (
                    <p className="text-xs text-gray-500 mt-1">
                      Total: ₹ {Math.round(primaryRoom.totalPrice).toLocaleString("en-IN")} ({primaryRoom.nights || 1} nights)
                    </p>
                  )}
                  {primaryRoom?.checkIn && primaryRoom?.checkOut && (
                    <p className="text-[11px] text-gray-500 mt-1">
                      Stay: {primaryRoom.checkIn} – {primaryRoom.checkOut}
                    </p>
                  )}
                  {primaryRoom?.availableUnits && (
                    <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                      <span>✓ {primaryRoom.availableUnits} units available in live stock</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("rooms-section");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-full bg-teal-700 hover:bg-teal-800 active:scale-95 text-white py-3 rounded-xl font-bold text-xs shadow-md transition mb-4 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>
                    {displayRooms.length > 0
                      ? `VIEW ${displayRooms.length} ROOM OPTION${displayRooms.length > 1 ? "S" : ""}`
                      : "VIEW ROOM OPTIONS"}
                  </span>
                  <ChevronRight size={14} />
                </button>

                {/* Promo Highlights */}
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                    <Check size={14} className="text-emerald-600 shrink-0" />
                    <span>Instant Confirmation</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-teal-800">
                    <ShieldCheck size={14} className="text-teal-600 shrink-0" />
                    <span>Best Price Guaranteed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Zoom Modal */}
          {isZoomed && (
            <div
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              onClick={handleZoomToggle}
            >
              <button
                type="button"
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-2 rounded-full transition cursor-pointer"
                onClick={handleZoomToggle}
              >
                <X size={32} className="text-white" />
              </button>
              <img
                src={hotelImages[currentImageIndex]}
                alt={hotelName}
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevImage();
                  }}
                  className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition cursor-pointer"
                >
                  <ChevronLeft size={24} className="text-white" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextImage();
                  }}
                  className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition cursor-pointer"
                >
                  <ChevronRight size={24} className="text-white" />
                </button>
              </div>
            </div>
          )}

          {/* Real Live Rooms Section */}
          <div id="rooms-section" className="mt-10 scroll-mt-28">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Select Your Room
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Live availability & room rates for {hotelName}
                </p>
              </div>
              <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                {displayRooms.length} Available Rate{displayRooms.length > 1 ? "s" : ""}
              </span>
            </div>

            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 bg-teal-800 text-white p-3.5 rounded-xl font-bold text-xs">
              <div className="col-span-5">Room Type</div>
              <div className="col-span-4">Inclusions & Policies</div>
              <div className="col-span-3 text-right">Price Details</div>
            </div>

            {/* Room Cards / Rows */}
            {loading ? (
              <div className="bg-white p-12 rounded-2xl mt-3 shadow-xs border border-gray-200 text-center flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                <p className="text-sm font-semibold text-gray-800">
                  Fetching live rooms and fares for {hotelName}...
                </p>
              </div>
            ) : displayRooms.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl mt-3 shadow-xs border border-gray-200 text-center">
                <Building className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-800">
                  No rate plans available for this property
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Rates may have expired or rooms are sold out for the selected dates. Please search again with different dates.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/hotel-page")}
                  className="mt-4 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Return to Hotel Search
                </button>
              </div>
            ) : (
              <div className="space-y-3 mt-3">
                {displayRooms.map((room, idx) => {
                  const roomPrice = room.price || 0;
                  const roomTotalPrice = room.totalPrice || roomPrice;
                  const isRefundable = Boolean(room.refundable);
                  const meal = room.board || "Room Only";
                  const roomImg =
                    room.image ||
                    hotelImages[idx % hotelImages.length] ||
                    hotelImages[0];

                  return (
                    <div
                      key={room.id || idx}
                      className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/90 shadow-xs hover:border-teal-300 transition-all duration-200"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* Room Type & Photo */}
                        <div className="md:col-span-5 flex flex-col sm:flex-row gap-3 sm:items-center">
                          <div className="w-full sm:w-28 h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                            <img
                              src={roomImg}
                              alt={room.name}
                              className="w-full h-full object-cover hover:scale-105 transition duration-300"
                              onError={(e) => {
                                e.target.src =
                                  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600";
                              }}
                            />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm sm:text-base text-gray-900 leading-snug">
                              {room.name}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <Users size={13} className="text-teal-600" />
                              <span>{room.capacity || 2} Guests | 1 Room</span>
                            </p>
                            {room.nights && (
                              <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                                <Calendar size={12} className="text-teal-600" />
                                <span>
                                  {room.nights} Nights Stay
                                  {room.checkIn && room.checkOut ? ` (${room.checkIn} – ${room.checkOut})` : ""}
                                </span>
                              </p>
                            )}
                            {room.availableUnits && (
                              <span className="inline-block mt-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                ✓ {room.availableUnits} units available in live stock
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Inclusions & Policies */}
                        <div className="md:col-span-4 space-y-1.5 border-t md:border-t-0 pt-2 md:pt-0">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                            <span>{meal}</span>
                          </div>

                          <div>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-md inline-block ${
                                isRefundable
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {isRefundable ? "Free Cancellation" : "Non-Refundable"}
                            </span>
                          </div>

                          {typeof room.cancellationPolicy === "string" && (
                            <p className="text-[11px] text-gray-500 line-clamp-2">
                              {room.cancellationPolicy}
                            </p>
                          )}
                        </div>

                        {/* Price Details & Select Button */}
                        <div className="md:col-span-3 text-left md:text-right border-t md:border-t-0 pt-3 md:pt-0">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">
                            Per Night
                          </span>
                          <span className="text-xl sm:text-2xl font-black text-gray-900">
                            ₹ {Math.round(roomPrice).toLocaleString("en-IN")}
                          </span>

                          {roomTotalPrice > roomPrice && (
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              Total: ₹ {Math.round(roomTotalPrice).toLocaleString("en-IN")}
                            </p>
                          )}

                          <p className="text-[10px] text-emerald-700 font-semibold mb-2">
                            Includes taxes & fees
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              handleNavigateToSelectedRoomInformation(room)
                            }
                            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-95 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                          >
                            SELECT ROOM
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Modal
            isModalOpen={isModalOpen}
            setModalOpen={setModalOpen}
            hotelDetailsData={hotelDetailsData}
          />
        </div>
      )}
    </div>
  );
};

export default HotelBookingDetails;
