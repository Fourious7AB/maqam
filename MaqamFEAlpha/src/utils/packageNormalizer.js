/**
 * Normalizes raw package data from API for clean presentation of the traveling plan.
 */
export const normalizePackageData = (pkgData) => {
  if (!pkgData) return null;

  const priceBreakdown = Array.isArray(pkgData.priceBreakdown) ? pkgData.priceBreakdown : [];

  // Default Included Flight
  let flights = [];
  if (Array.isArray(pkgData.flights) && pkgData.flights.length > 0) {
    flights = pkgData.flights;
  } else {
    const flightBreakdowns = priceBreakdown.filter(
      (it) => it.itemType?.toLowerCase() === "flight" || it.itemType?.toLowerCase() === "flights"
    );
    if (flightBreakdowns.length > 0) {
      flights = flightBreakdowns.map((it) => {
        const fd = it.details?.flightDetails || {};
        return {
          _id: it.id || it._id || fd._id || "default-flight-id",
          offerId: it.id || it._id,
          airline: fd.airline || it.title || "Saudia Direct Flight",
          flightNumber: fd.flightNumber || "SV-Direct",
          origin: fd.origin || "DEL",
          destination: fd.destination || pkgData.destination || "MED",
          cabinClass: fd.cabinClass || "Economy Class",
          availableSeats: fd.availableUnits ?? pkgData.availableSlots ?? 4,
          retailPrice: it.retailPrice || 20000,
          title: it.title || "Saudia Direct Flight",
        };
      });
    } else if (Array.isArray(pkgData.flightRefs) && pkgData.flightRefs.length > 0) {
      flights = pkgData.flightRefs.map((ref) => {
        const st = ref.stock || {};
        return {
          _id: st._id || ref._id || "default-flight-ref",
          offerId: ref._id,
          airline: st.airline || "Saudia Direct Flight",
          flightNumber: st.flightNumber || "SV-402",
          origin: st.origin || "DEL",
          destination: st.destination || pkgData.destination || "JED",
          cabinClass: st.cabinClass || "Economy Class",
          availableSeats: (st.units || []).filter((u) => u.status === "available").length || pkgData.availableSlots || 4,
          retailPrice: 20000,
          title: st.airline || "Saudia Direct Flight",
        };
      });
    } else {
      flights = [
        {
          _id: "default-flight-included",
          offerId: "default-flight-included",
          airline: pkgData.destination?.toLowerCase().includes("turkey") ? "Turkish Airlines" : "Saudia Airlines",
          flightNumber: "SV-380",
          origin: "DEL",
          destination: pkgData.destination || "JED",
          cabinClass: "Economy Class",
          availableSeats: pkgData.availableSlots || 4,
          retailPrice: 20000,
          title: "Standard Direct Flight",
        },
      ];
    }
  }

  // Default Included Hotel
  let hotels = [];
  if (Array.isArray(pkgData.hotels) && pkgData.hotels.length > 0) {
    hotels = pkgData.hotels;
  } else {
    const hotelBreakdowns = priceBreakdown.filter(
      (it) => it.itemType?.toLowerCase() === "hotel" || it.itemType?.toLowerCase() === "hotels"
    );
    if (hotelBreakdowns.length > 0) {
      hotels = hotelBreakdowns.map((it) => {
        const hd = it.details?.hotelDetails || {};
        const hInfo = hd.hotelId || {};
        return {
          _id: it.id || it._id || hd._id || "default-hotel-id",
          offerId: it.id || it._id,
          hotelName: hInfo.name || hd.hotelName || it.title || "Makkah Royal Palace",
          roomType: hd.roomType || "Deluxe Kaaba View",
          destination: hd.destination || it.details?.destination || pkgData.destination || "Makkah",
          meals: hd.meals || ["Breakfast Included"],
          availableRooms: hd.availableUnits ?? pkgData.availableSlots ?? 4,
          totalNights: hd.totalNights || 5,
          retailPrice: it.retailPrice || 25000,
          title: it.title || "Makkah Royal Palace 5-Night Stay",
        };
      });
    } else if (Array.isArray(pkgData.hotelRefs) && pkgData.hotelRefs.length > 0) {
      hotels = pkgData.hotelRefs.map((ref) => {
        const st = ref.stock || {};
        return {
          _id: st._id || ref._id || "default-hotel-ref",
          offerId: ref._id,
          hotelName: st.hotelName || "Makkah Royal Palace",
          roomType: st.roomType || "Standard Room",
          destination: st.destination || pkgData.destination || "Makkah",
          meals: st.meals || ["Breakfast Included"],
          availableRooms: (st.units || []).filter((u) => u.status === "available").length || pkgData.availableSlots || 4,
          retailPrice: 25000,
          title: st.hotelName || "Makkah Royal Palace",
        };
      });
    } else {
      hotels = [
        {
          _id: "default-hotel-included",
          offerId: "default-hotel-included",
          hotelName: pkgData.destination?.toLowerCase().includes("turkey")
            ? "Grand Sultanahmet Hotel"
            : "Makkah Clock Royal Tower",
          roomType: "Superior City View",
          destination: pkgData.destination || "Makkah",
          meals: ["Breakfast Included"],
          availableRooms: pkgData.availableSlots || 4,
          totalNights: 5,
          retailPrice: 25000,
          title: "Makkah Clock Royal Tower Stay",
        },
      ];
    }
  }

  // Format Itinerary Array
  let itinerary = [];
  if (Array.isArray(pkgData.itinerary) && pkgData.itinerary.length > 0) {
    itinerary = pkgData.itinerary;
  } else if (typeof pkgData.itinerary === "string" && pkgData.itinerary.trim()) {
    itinerary = [
      {
        day: 1,
        title: "Departure & Arrival Welcome",
        description: pkgData.itinerary,
        activities: ["Airport meet & assist", "Transfer to accommodation"],
      },
    ];
  } else {
    const dest = pkgData.destination || "Sacred Sanctuary";
    itinerary = [
      {
        day: 1,
        title: `Departure & Arrival in ${dest}`,
        description: `Board your confirmed flight. Meet our representative upon arrival for a seamless VIP transfer to your hotel.`,
        activities: ["Airport meet & assist", "Check-in at verified hotel", "Evening orientation"],
      },
      {
        day: 2,
        title: "Guided Holy Sanctuary Orientation & Ziyarat",
        description: "Perform your spiritual rites and visit historic landmarks with a dedicated multi-lingual guide.",
        activities: ["Guided walking tour", "Historical landmarks visit", "Spiritual guidance"],
      },
      {
        day: 3,
        title: "Personal Devotion & Cultural Exploration",
        description: "Full day dedicated to prayers, spiritual contemplation, and exploring local traditional souks and cuisine.",
        activities: ["Independent reflection", "Local culinary experience", "Optional evening ziarat"],
      },
      {
        day: 4,
        title: "Historic Site Excursion & Scenic Tours",
        description: "Guided private excursion to historic sites, monuments, and iconic viewpoints around the city.",
        activities: ["Air-conditioned private tour", "Photo stops & museum visits", "Special group dinner"],
      },
      {
        day: 5,
        title: "Farewell & Return Departure Flight",
        description: "Check out of your accommodation. Enjoy private transfer back to the airport for your return flight home.",
        activities: ["Hotel check-out", "Private airport transfer", "Return flight departure"],
      },
    ];
  }

  return {
    ...pkgData,
    flights,
    hotels,
    itinerary,
  };
};

export default normalizePackageData;
