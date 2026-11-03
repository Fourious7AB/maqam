// International Airport Directory & Location Matcher
export const INTERNATIONAL_AIRPORTS = [
  {
    iataCode: "DEL",
    name: "Delhi",
    airport: "Indira Gandhi International Airport",
    country: "India",
    countryCode: "IN",
    lat: 28.5562,
    lng: 77.1000,
    serves: [
      "delhi", "new delhi", "noida", "greater noida", "gurgaon", "gurugram",
      "faridabad", "ghaziabad", "meerut", "agra", "jaipur", "alwar", "rohtak",
      "panipat", "karnal", "sonipat", "dehradun", "chandigarh", "haryana",
      "punjab", "rajasthan", "uttar pradesh"
    ],
  },
  {
    iataCode: "BOM",
    name: "Mumbai",
    airport: "Chhatrapati Shivaji Maharaj International Airport",
    country: "India",
    countryCode: "IN",
    lat: 19.0896,
    lng: 72.8656,
    serves: [
      "mumbai", "bombay", "pune", "thane", "navi mumbai", "kalyan", "dombivli",
      "nashik", "aurangabad", "chhatrapati sambhajinagar", "kolhapur", "solapur",
      "ratnagiri", "maharashtra", "goa", "panaji"
    ],
  },
  {
    iataCode: "BLR",
    name: "Bengaluru",
    airport: "Kempegowda International Airport",
    country: "India",
    countryCode: "IN",
    lat: 13.1986,
    lng: 77.7066,
    serves: [
      "bengaluru", "bangalore", "mysuru", "mysore", "mangalore", "mangaluru",
      "hubballi", "hubli", "hosur", "karnataka"
    ],
  },
  {
    iataCode: "CCU",
    name: "Kolkata",
    airport: "Netaji Subhas Chandra Bose International Airport",
    country: "India",
    countryCode: "IN",
    lat: 22.6547,
    lng: 88.4467,
    serves: [
      "kolkata", "calcutta", "howrah", "hooghly", "durgapur", "asansol",
      "siliguri", "darjeeling", "kharagpur", "west bengal", "patna", "bihar",
      "ranchi", "jharkhand", "bhubaneswar", "odisha", "guwahati", "assam"
    ],
  },
  {
    iataCode: "HYD",
    name: "Hyderabad",
    airport: "Rajiv Gandhi International Airport",
    country: "India",
    countryCode: "IN",
    lat: 17.2403,
    lng: 78.4294,
    serves: [
      "hyderabad", "secunderabad", "warangal", "nizamabad", "karimnagar",
      "telangana", "andhra pradesh", "vijayawada", "guntur", "visakhapatnam"
    ],
  },
  {
    iataCode: "MAA",
    name: "Chennai",
    airport: "Chennai International Airport",
    country: "India",
    countryCode: "IN",
    lat: 12.9941,
    lng: 80.1709,
    serves: [
      "chennai", "madras", "coimbatore", "madurai", "tiruchirappalli", "trichy",
      "salem", "vellore", "kanchipuram", "tamil nadu", "pondicherry", "puducherry"
    ],
  },
  {
    iataCode: "AMD",
    name: "Ahmedabad",
    airport: "Sardar Vallabhbhai Patel International Airport",
    country: "India",
    countryCode: "IN",
    lat: 23.0772,
    lng: 72.6347,
    serves: [
      "ahmedabad", "gandhinagar", "vadodara", "baroda", "surat", "rajkot",
      "bhavnagar", "jamnagar", "gujarat"
    ],
  },
  {
    iataCode: "LKO",
    name: "Lucknow",
    airport: "Chaudhary Charan Singh International Airport",
    country: "India",
    countryCode: "IN",
    lat: 26.7606,
    lng: 80.8893,
    serves: [
      "lucknow", "kanpur", "prayagraj", "allahabad", "varanasi", "banaras",
      "ayodhya", "faizabad", "bareilly", "gorakhpur", "uttar pradesh"
    ],
  },
  {
    iataCode: "COK",
    name: "Kochi",
    airport: "Cochin International Airport",
    country: "India",
    countryCode: "IN",
    lat: 10.1518,
    lng: 76.3930,
    serves: [
      "kochi", "cochin", "ernakulam", "thiruvananthapuram", "trivandrum",
      "kozhikode", "calicut", "thrissur", "kollam", "alappuzha", "kerala"
    ],
  },
  {
    iataCode: "ATQ",
    name: "Amritsar",
    airport: "Sri Guru Ram Dass Jee International Airport",
    country: "India",
    countryCode: "IN",
    lat: 31.7096,
    lng: 74.7973,
    serves: [
      "amritsar", "jalandhar", "ludhiana", "pathankot", "punjab", "jammu"
    ],
  },
  {
    iataCode: "DXB",
    name: "Dubai",
    airport: "Dubai International Airport",
    country: "United Arab Emirates",
    countryCode: "AE",
    lat: 25.2532,
    lng: 55.3657,
    serves: ["dubai", "sharjah", "ajman", "abu dhabi", "uae", "al ain"],
  },
  {
    iataCode: "RUH",
    name: "Riyadh",
    airport: "King Khalid International Airport",
    country: "Saudi Arabia",
    countryCode: "SA",
    lat: 24.9576,
    lng: 46.6988,
    serves: ["riyadh", "al kharj", "ad diriyah"],
  },
  {
    iataCode: "JED",
    name: "Jeddah",
    airport: "King Abdulaziz International Airport",
    country: "Saudi Arabia",
    countryCode: "SA",
    lat: 21.6796,
    lng: 39.1565,
    serves: ["jeddah", "makkah", "mecca", "taif"],
  },
  {
    iataCode: "MED",
    name: "Medina",
    airport: "Prince Mohammad Bin Abdulaziz International Airport",
    country: "Saudi Arabia",
    countryCode: "SA",
    lat: 24.5534,
    lng: 39.7051,
    serves: ["medina", "madinah", "yanbu"],
  },
  {
    iataCode: "DAC",
    name: "Dhaka",
    airport: "Hazrat Shahjalal International Airport",
    country: "Bangladesh",
    countryCode: "BD",
    lat: 23.8433,
    lng: 90.3978,
    serves: ["dhaka", "bangladesh", "chittagong", "sylhet"],
  },
  {
    iataCode: "LHR",
    name: "London",
    airport: "Heathrow Airport",
    country: "United Kingdom",
    countryCode: "GB",
    lat: 51.4700,
    lng: -0.4543,
    serves: ["london", "united kingdom", "uk", "manchester", "birmingham"],
  },
];

// Haversine distance in km
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Find airport by GPS coordinates
export function findNearestAirportByCoords(latitude, longitude) {
  let best = INTERNATIONAL_AIRPORTS[0];
  let minDistance = Infinity;

  for (const airport of INTERNATIONAL_AIRPORTS) {
    if (airport.lat && airport.lng) {
      const dist = calculateDistanceKm(latitude, longitude, airport.lat, airport.lng);
      if (dist < minDistance) {
        minDistance = dist;
        best = { ...airport, distanceKm: dist };
      }
    }
  }

  return best;
}

// Find airport by city, state, or address string
export function findNearestAirportByQuery(text) {
  if (!text || typeof text !== "string") {
    return INTERNATIONAL_AIRPORTS[0]; // default DEL
  }

  const clean = text.trim().toLowerCase();

  // 1. Direct IATA code match
  const codeMatch = INTERNATIONAL_AIRPORTS.find(
    (a) => a.iataCode.toLowerCase() === clean
  );
  if (codeMatch) return codeMatch;

  // 2. Exact city or airport name match
  const nameMatch = INTERNATIONAL_AIRPORTS.find(
    (a) =>
      a.name.toLowerCase() === clean ||
      a.airport.toLowerCase().includes(clean)
  );
  if (nameMatch) return nameMatch;

  // 3. Search in 'serves' list (e.g. Pune, Noida, Gurgaon, Howrah, etc.)
  for (const airport of INTERNATIONAL_AIRPORTS) {
    if (airport.serves?.some((sub) => clean.includes(sub) || sub.includes(clean))) {
      return airport;
    }
  }

  // 4. Default fallback: Delhi (DEL)
  return INTERNATIONAL_AIRPORTS[0];
}

// Get user present address and airport from localStorage
export function getSavedUserLocation() {
  try {
    const addressData = JSON.parse(
      localStorage.getItem("userPresentAddress") || "null"
    );
    const userData = JSON.parse(localStorage.getItem("user") || "null");

    const savedCode =
      addressData?.originAirport ||
      userData?.originAirport ||
      addressData?.departureAirport ||
      userData?.departureAirport;

    let matchedAirport = null;
    if (savedCode) {
      matchedAirport = INTERNATIONAL_AIRPORTS.find(
        (a) => a.iataCode.toUpperCase() === savedCode.toUpperCase()
      );
    }

    if (!matchedAirport) {
      const cityQuery =
        addressData?.city || userData?.city || addressData?.addressLine1 || "";
      matchedAirport = findNearestAirportByQuery(cityQuery);
    }

    return {
      addressLine1: addressData?.addressLine1 || userData?.addressLine1 || "",
      addressLine2: addressData?.addressLine2 || userData?.addressLine2 || "",
      city: addressData?.city || userData?.city || matchedAirport.name,
      state: addressData?.state || userData?.state || "",
      country: addressData?.country || userData?.country || matchedAirport.country,
      zipCode: addressData?.zipCode || userData?.zipCode || "",
      originAirport: matchedAirport.iataCode,
      originAirportName: matchedAirport.airport,
      originCity: matchedAirport.name,
      airportDetails: matchedAirport,
    };
  } catch {
    const def = INTERNATIONAL_AIRPORTS[0];
    return {
      addressLine1: "",
      addressLine2: "",
      city: "Delhi",
      state: "Delhi",
      country: "India",
      zipCode: "110001",
      originAirport: def.iataCode,
      originAirportName: def.airport,
      originCity: def.name,
      airportDetails: def,
    };
  }
}

// Save user location & broadcast update
export function saveUserLocation(locationData) {
  try {
    const currentAddress = JSON.parse(
      localStorage.getItem("userPresentAddress") || "{}"
    );
    const updatedAddress = { ...currentAddress, ...locationData };
    localStorage.setItem("userPresentAddress", JSON.stringify(updatedAddress));

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const updatedUser = { ...currentUser, ...locationData };
    localStorage.setItem("user", JSON.stringify(updatedUser));

    // Broadcast event so UI updates instantly across components
    window.dispatchEvent(
      new CustomEvent("userLocationUpdated", { detail: updatedAddress })
    );
    return true;
  } catch (err) {
    console.error("Failed to save location:", err);
    return false;
  }
}

// Major cities metadata for instant lookup of state & postal codes
export const KNOWN_CITIES_DATA = {
  kolkata: {
    city: "Kolkata",
    state: "West Bengal",
    country: "India",
    zipCode: "700001",
    iataCode: "CCU",
  },
  delhi: {
    city: "Delhi",
    state: "Delhi",
    country: "India",
    zipCode: "110001",
    iataCode: "DEL",
  },
  mumbai: {
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    zipCode: "400001",
    iataCode: "BOM",
  },
  bengaluru: {
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    zipCode: "560001",
    iataCode: "BLR",
  },
  hyderabad: {
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    zipCode: "500001",
    iataCode: "HYD",
  },
  chennai: {
    city: "Chennai",
    state: "Tamil Nadu",
    country: "India",
    zipCode: "600001",
    iataCode: "MAA",
  },
  ahmedabad: {
    city: "Ahmedabad",
    state: "Gujarat",
    country: "India",
    zipCode: "380001",
    iataCode: "AMD",
  },
  lucknow: {
    city: "Lucknow",
    state: "Uttar Pradesh",
    country: "India",
    zipCode: "226001",
    iataCode: "LKO",
  },
  kochi: {
    city: "Kochi",
    state: "Kerala",
    country: "India",
    zipCode: "682001",
    iataCode: "COK",
  },
  dubai: {
    city: "Dubai",
    state: "Dubai",
    country: "United Arab Emirates",
    zipCode: "00000",
    iataCode: "DXB",
  },
};

/**
 * Reverse geocodes GPS coordinates (latitude, longitude) to street address,
 * area/suburb, city, state, postal/PIN code, and country.
 * Uses OpenStreetMap Nominatim with fallback to BigDataCloud.
 */
export async function reverseGeocodeCoords(latitude, longitude) {
  // 1. Primary: OpenStreetMap Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      const addr = data?.address || {};

      const houseNumber =
        addr.house_number || addr.building || addr.house_name || "";
      const road =
        addr.road ||
        addr.street ||
        addr.pedestrian ||
        addr.footway ||
        addr.path ||
        "";

      const addressLine1 =
        [houseNumber, road].filter(Boolean).join(", ") ||
        addr.amenity ||
        addr.commercial ||
        addr.residential ||
        "";

      const addressLine2 =
        addr.suburb ||
        addr.neighbourhood ||
        addr.subdistrict ||
        addr.locality ||
        addr.city_district ||
        "";

      const city =
        addr.city ||
        addr.town ||
        addr.municipality ||
        addr.village ||
        addr.hamlet ||
        addr.county ||
        "";

      const state = addr.state || addr.province || addr.state_district || "";
      const zipCode = addr.postcode || addr.postal_code || "";
      const country = addr.country || "India";

      if (city || state || zipCode || addressLine1) {
        return {
          addressLine1,
          addressLine2,
          city,
          state,
          zipCode,
          country,
          displayName: data?.display_name || "",
        };
      }
    }
  } catch (err) {
    console.warn("Nominatim reverse geocode notice, using fallback:", err?.message);
  }

  // 2. Fallback: BigDataCloud
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const res = await fetch(bdcUrl);
    if (res.ok) {
      const data = await res.json();
      const adminLevels = data?.localityInfo?.administrative || [];
      const locality = data?.locality || "";
      const state = data?.principalSubdivision || "";
      const city = data?.city || locality || "";
      const country = data?.countryName || "India";
      const zipCode = data?.postcode || "";

      const subdistrict =
        adminLevels.find((a) => a.adminLevel >= 6 && a.adminLevel <= 8)?.name || locality;

      return {
        addressLine1: "",
        addressLine2: subdistrict,
        city,
        state,
        zipCode,
        country,
        displayName: "",
      };
    }
  } catch (fallbackErr) {
    console.warn("BigDataCloud fallback failed:", fallbackErr?.message);
  }

  return null;
}

/**
 * Search locations by query string for map search autocomplete
 */
export async function searchMapLocations(query) {
  if (!query || query.trim().length < 2) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query.trim(),
    )}&addressdetails=1&limit=6`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });
    if (res.ok) {
      const data = await res.json();
      return (data || []).map((item) => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        displayName: item.display_name,
        address: item.address || {},
      }));
    }
  } catch (err) {
    console.warn("Search location error:", err?.message);
  }
  return [];
}


