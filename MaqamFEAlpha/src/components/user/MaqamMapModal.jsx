import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  X,
  Search,
  MapPin,
  Plane,
  LocateFixed,
  Layers,
  Check,
  Loader2,
  Navigation,
  Compass,
  Building,
  Sparkles,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  findNearestAirportByCoords,
  reverseGeocodeCoords,
  searchMapLocations,
} from "../../utils/airportLocator";

// Create custom animated SVG Leaflet marker
const createMaqamMarkerIcon = () => {
  return L.divIcon({
    className: "maqam-custom-marker",
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; transform: translate(-22px, -38px);">
        <!-- Pulse Ring -->
        <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(15, 107, 123, 0.35); animation: maqamPulse 2s infinite ease-out;"></div>
        <!-- Pin SVG -->
        <svg width="38" height="44" viewBox="0 0 38 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 10px rgba(15, 23, 42, 0.35)); position: relative; z-index: 10;">
          <path d="M19 0C8.50659 0 0 8.50659 0 19C0 29.5 14.5 41 18.0697 43.5807C18.6309 43.9877 19.3691 43.9877 19.9303 43.5807C23.5 41 38 29.5 38 19C38 8.50659 29.4934 0 19 0Z" fill="#0f6b7b"/>
          <circle cx="19" cy="18" r="8" fill="#ffffff"/>
          <circle cx="19" cy="18" r="4.5" fill="#0d9488"/>
        </svg>
      </div>
      <style>
        @keyframes maqamPulse {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      </style>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 38],
  });
};

const TILE_PROVIDERS = {
  street: {
    name: "Street View",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  satellite: {
    name: "Satellite Imagery",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    maxZoom: 18,
  },
};

const MaqamMapModal = ({ isOpen, onClose, initialLocation, onApplyLocation }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const tileLayerRef = useRef(null);

  // Map state
  const [mapMode, setMapMode] = useState("street"); // 'street' | 'satellite'
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [addressDetails, setAddressDetails] = useState(null);
  const [nearestAirport, setNearestAirport] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGpsLocating, setIsGpsLocating] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Initial center coordinates (Defaults to user's saved location or Kolkata / Delhi)
  const defaultLat = 22.5726;
  const defaultLng = 88.3639;

  // Initialize and tear down Leaflet map
  useEffect(() => {
    if (!isOpen) return;

    // Small delay to ensure modal DOM is mounted and sized
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      // Clean up previous instance if exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const startLat = initialLocation?.lat || defaultLat;
      const startLng = initialLocation?.lng || defaultLng;

      // Initialize map
      const map = L.map(mapContainerRef.current, {
        center: [startLat, startLng],
        zoom: 13,
        zoomControl: false, // We'll render custom styled zoom controls
      });

      // Add tile layer
      const activeTile = TILE_PROVIDERS[mapMode];
      const layer = L.tileLayer(activeTile.url, {
        attribution: activeTile.attribution,
        maxZoom: activeTile.maxZoom,
      }).addTo(map);

      tileLayerRef.current = layer;

      // Add draggable pin marker
      const marker = L.marker([startLat, startLng], {
        icon: createMaqamMarkerIcon(),
        draggable: true,
      }).addTo(map);

      markerRef.current = marker;

      // Marker drag event
      marker.on("dragend", (e) => {
        const { lat, lng } = e.target.getLatLng();
        handlePositionChange(lat, lng, false);
      });

      // Map click event: Move marker to clicked spot
      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        handlePositionChange(lat, lng, false);
      });

      mapInstanceRef.current = map;

      // Invalidate size once rendered to prevent grey tile glitches
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);

      // Trigger initial location reverse geocoding
      handlePositionChange(startLat, startLng, true);
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // Switch tile layers when mapMode toggles (Street vs Satellite)
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    const activeTile = TILE_PROVIDERS[mapMode];
    const newLayer = L.tileLayer(activeTile.url, {
      attribution: activeTile.attribution,
      maxZoom: activeTile.maxZoom,
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newLayer;
  }, [mapMode]);

  // Handle position change: Update coordinates, airport, and reverse geocode address
  const handlePositionChange = async (lat, lng, shouldPan = true) => {
    setSelectedCoords({ lat, lng });

    if (shouldPan && mapInstanceRef.current) {
      mapInstanceRef.current.panTo([lat, lng], { animate: true });
    }

    // Match nearest international airport
    const matchedAirport = findNearestAirportByCoords(lat, lng);
    setNearestAirport(matchedAirport);

    // Reverse geocode street address & postal code
    setIsGeocoding(true);
    try {
      const geo = await reverseGeocodeCoords(lat, lng);
      if (geo) {
        setAddressDetails(geo);
      } else {
        setAddressDetails({
          addressLine1: "",
          addressLine2: "",
          city: matchedAirport?.name || "",
          state: matchedAirport?.name || "",
          zipCode: "",
          country: matchedAirport?.country || "India",
        });
      }
    } catch (err) {
      console.warn("Geocoding failed for coordinates:", err);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Search input change handler with debounced Nominatim autocomplete
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!value || value.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchMapLocations(value);
        setSearchResults(results);
        setShowSearchResults(results.length > 0);
      } catch (err) {
        console.warn("Location search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  // Select location from search dropdown
  const handleSelectSearchResult = (result) => {
    setSearchQuery(result.displayName);
    setShowSearchResults(false);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([result.lat, result.lng], 15, {
        animate: true,
      });
      markerRef.current.setLatLng([result.lat, result.lng]);
    }

    handlePositionChange(result.lat, result.lng, true);
  };

  // Auto-detect location via browser GPS inside map
  const handleMapGpsDetect = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsGpsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 16, {
            animate: true,
          });
          markerRef.current.setLatLng([latitude, longitude]);
        }
        handlePositionChange(latitude, longitude, true);
        setIsGpsLocating(false);
        toast.success("GPS Location pinned on Maqam Map!");
      },
      (err) => {
        setIsGpsLocating(false);
        console.warn("Map GPS notice:", err.message);
        toast.info("Could not detect GPS location. Please allow browser location access.");
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  // Zoom controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  // Apply location to profile form
  const handleConfirmLocation = () => {
    if (!addressDetails && !nearestAirport) {
      toast.warn("Please wait for address details to resolve or click on the map.");
      return;
    }

    const payload = {
      addressLine1: addressDetails?.addressLine1 || "",
      addressLine2: addressDetails?.addressLine2 || "",
      city: addressDetails?.city || nearestAirport?.name || "",
      state: addressDetails?.state || nearestAirport?.name || "",
      zipCode: addressDetails?.zipCode || "",
      country: addressDetails?.country || nearestAirport?.country || "India",
      originAirport: nearestAirport?.iataCode || "DEL",
      originAirportName: nearestAirport?.airport || "Indira Gandhi International Airport",
      coords: selectedCoords,
    };

    onApplyLocation(payload);
    toast.success("📍 Address & Departure Airport applied from Maqam Map!");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-4xl h-[90vh] max-h-[760px] rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden font-poppins animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-white z-20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-[#0f6b7b] border border-teal-100/80 shadow-xs">
              <Compass size={20} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  Maqam Map
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-100/80 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide text-teal-800">
                  <Sparkles size={10} /> Google Maps Style
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Click or drag the pin anywhere to autofill your address &amp; nearest airport
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close Map"
          >
            <X size={18} />
          </button>
        </div>

        {/* Map Container and Overlay Controls */}
        <div className="relative flex-1 w-full bg-slate-100 overflow-hidden">
          {/* Floating Search Bar (Google Maps Style) */}
          <div className="absolute top-3 left-3 right-3 sm:right-auto sm:w-[380px] z-[1000]">
            <div className="relative">
              <div className="flex items-center gap-2 rounded-2xl bg-white/95 px-3.5 py-2.5 shadow-lg border border-slate-200/80 backdrop-blur-md transition focus-within:ring-2 focus-within:ring-[#0f6b7b] focus-within:border-transparent">
                {isSearching ? (
                  <Loader2 size={16} className="text-[#0f6b7b] animate-spin shrink-0" />
                ) : (
                  <Search size={16} className="text-slate-400 shrink-0" />
                )}
                <input
                  type="text"
                  placeholder="Search street, area, city, landmark..."
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                  className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                      setShowSearchResults(false);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto rounded-2xl bg-white p-1.5 shadow-xl border border-slate-100 z-[1001] animate-in fade-in">
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSearchResult(item)}
                      className="flex items-start gap-2.5 w-full rounded-xl px-3 py-2 text-left text-xs transition hover:bg-teal-50/80 hover:text-teal-900 cursor-pointer"
                    >
                      <MapPin size={14} className="text-[#0f6b7b] shrink-0 mt-0.5" />
                      <span className="line-clamp-2 text-slate-700 font-medium">
                        {item.displayName}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Floating Controls: Satellite Toggle & Locate Me */}
          <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
            {/* Satellite / Street View Toggle */}
            <div className="flex rounded-xl bg-white/95 p-1 shadow-md border border-slate-200 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setMapMode("street")}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  mapMode === "street"
                    ? "bg-[#0f6b7b] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Map
              </button>
              <button
                type="button"
                onClick={() => setMapMode("satellite")}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  mapMode === "satellite"
                    ? "bg-[#0f6b7b] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Satellite
              </button>
            </div>

            {/* GPS Locate Me Button */}
            <button
              type="button"
              onClick={handleMapGpsDetect}
              disabled={isGpsLocating}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md border border-slate-200 text-slate-700 hover:text-[#0f6b7b] hover:bg-teal-50 transition active:scale-95 cursor-pointer disabled:opacity-60"
              title="Locate my GPS position"
            >
              <LocateFixed size={18} className={isGpsLocating ? "animate-spin text-[#0f6b7b]" : ""} />
            </button>

            {/* Zoom In & Zoom Out Buttons */}
            <div className="flex flex-col rounded-xl bg-white shadow-md border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={handleZoomIn}
                className="flex h-8 w-10 items-center justify-center text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer border-b border-slate-100"
                title="Zoom in"
              >
                +
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="flex h-8 w-10 items-center justify-center text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                title="Zoom out"
              >
                −
              </button>
            </div>
          </div>

          {/* Leaflet Map DOM Element */}
          <div ref={mapContainerRef} className="h-full w-full" />
        </div>

        {/* Bottom Details Drawer: Resolved Address & Airport Info */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white z-20 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Live Address & Airport Preview */}
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#0f6b7b]">
                  <MapPin size={12} /> Pinpoint Location
                </span>
                {isGeocoding && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <Loader2 size={11} className="animate-spin" /> Resolving address...
                  </span>
                )}
              </div>

              {/* Formatted Address Preview */}
              <div className="text-xs sm:text-sm text-slate-800 font-medium">
                {addressDetails?.addressLine1 || addressDetails?.addressLine2 ? (
                  <p className="line-clamp-1 font-semibold text-slate-900">
                    {[addressDetails.addressLine1, addressDetails.addressLine2]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                ) : (
                  <p className="text-slate-400 italic">
                    {isGeocoding ? "Fetching street details..." : "Click or drag pin on the map to inspect address"}
                  </p>
                )}

                <p className="text-xs text-slate-500 mt-0.5">
                  {[
                    addressDetails?.city,
                    addressDetails?.state,
                    addressDetails?.zipCode ? `PIN: ${addressDetails.zipCode}` : null,
                    addressDetails?.country,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Select a location"}
                </p>
              </div>

              {/* Matched Nearest Airport Badge */}
              {nearestAirport && (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 border border-teal-200/70 px-2.5 py-1 text-[11px] font-semibold text-teal-900 mt-1">
                  <Plane size={12} className="text-[#0f6b7b] rotate-45" />
                  <span>
                    Nearest Airport: <strong>{nearestAirport.airport} ({nearestAirport.iataCode})</strong>
                    {nearestAirport.distanceKm ? ` · ~${nearestAirport.distanceKm} km away` : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLocation}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0f6b7b] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0d5f6f] transition active:scale-95 cursor-pointer"
              >
                <Check size={14} />
                <span>Apply Address to Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaqamMapModal;
