/**
 * Session storage caching utility with TTL support
 */

const DEFAULT_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds
export const FLIGHT_SESSION_TTL = 9 * 60 * 1000; // 9 minutes (SRDV airline sessions expire after 10-15 min)

/**
 * Checks if a session timestamp is still within validity limits
 * @param {number|string} timestamp
 * @param {number} [maxAgeMs=FLIGHT_SESSION_TTL]
 * @returns {boolean}
 */
export const isSessionValid = (timestamp, maxAgeMs = FLIGHT_SESSION_TTL) => {
  if (!timestamp) return false;
  const numTime = typeof timestamp === "string" ? new Date(timestamp).getTime() : Number(timestamp);
  if (isNaN(numTime)) return false;
  return Date.now() - numTime < maxAgeMs;
};

/**
 * Retrieves an item from sessionStorage if it exists and hasn't expired.
 * @param {string} key
 * @param {number} [ttl=DEFAULT_TTL]
 * @returns {any|null}
 */
export const getStoredItem = (key, ttl = DEFAULT_TTL) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const record = JSON.parse(raw);
    if (!record || typeof record !== "object") return null;

    if (Date.now() - record.timestamp > ttl) {
      sessionStorage.removeItem(key);
      return null;
    }

    return record.data;
  } catch (error) {
    console.warn(`Error reading ${key} from sessionStorage:`, error);
    return null;
  }
};

/**
 * Stores an item in sessionStorage with a timestamp.
 * @param {string} key
 * @param {any} data
 */
export const setStoredItem = (key, data) => {
  try {
    const record = {
      timestamp: Date.now(),
      data,
    };
    sessionStorage.setItem(key, JSON.stringify(record));
  } catch (error) {
    // If quota exceeded, clear stale items and retry once
    console.warn(`Failed to write ${key} to sessionStorage:`, error);
    try {
      cleanupOldStorage();
      sessionStorage.setItem(
        key,
        JSON.stringify({ timestamp: Date.now(), data }),
      );
    } catch {
      // Ignored
    }
  }
};

/**
 * Removes an item from sessionStorage.
 * @param {string} key
 */
export const removeStoredItem = (key) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignored
  }
};

/**
 * Removes expired and legacy search cache entries from sessionStorage.
 */
export const cleanupOldStorage = () => {
  try {
    if (typeof sessionStorage === "undefined") return;
    const keys = Object.keys(sessionStorage);
    for (const key of keys) {
      if (
        key.startsWith("flight_search_") ||
        key.startsWith("hotel_search_") ||
        key.startsWith("cal_fare_") ||
        key.startsWith("flight-suggestions:") ||
        key.startsWith("hotel-suggestions:")
      ) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Ignored
  }
};

// Automatically purge legacy live search cache keys on initialization
cleanupOldStorage();

// ----------------------------------------------------
// Key Generators
// ----------------------------------------------------

/**
 * Generates a normalized cache key for flight searches.
 */
export const getFlightSearchCacheKey = (params) => {
  if (!params) return "flight_search_empty";
  const origin = params.origin || "";
  const destination = params.destination || "";
  const departureDate = params.departureDate || "";
  const returnDate = params.returnDate || "";
  const journeyType = params.journeyType || "oneway";
  const adults = params.passengers?.adults ?? 1;
  const children = params.passengers?.children ?? 0;
  const infants = params.passengers?.infants ?? 0;

  return `flight_search_${origin}_${destination}_${departureDate}_${returnDate}_${journeyType}_${adults}_${children}_${infants}`;
};

/**
 * Generates a normalized cache key for hotel searches.
 */
export const getHotelSearchCacheKey = (params) => {
  if (!params) return "hotel_search_empty";
  const cityId = params.cityId || "";
  const countryCode = params.countryCode || "";
  const checkIn = params.checkIn || "";
  const checkOut = params.checkOut || "";
  const roomCount = params.rooms?.length || 1;
  const adults = params.rooms?.[0]?.adults || 1;
  const children = params.rooms?.[0]?.children || 0;

  return `hotel_search_${cityId}_${countryCode}_${checkIn}_${checkOut}_${roomCount}_${adults}_${children}`;
};

/**
 * Generates a normalized cache key for calendar fare searches.
 */
export const getCalendarFareCacheKey = ({
  origin,
  destination,
  journeyType,
  baseDate,
  returnDate,
}) => {
  return `cal_fare_${origin || ""}_${destination || ""}_${journeyType || "oneway"}_${baseDate || ""}_${returnDate || ""}`;
};
