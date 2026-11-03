/**
 * Package Inventory Service
 *
 * This service provides inventory data for the package system.
 * All functions are designed to be easily replaceable with API calls
 * when the backend is ready.
 *
 * TODO: Replace mock implementations with API calls when backend is available.
 */

import { seedFlights, seedHotels, seedCabs, seedMeals } from '../store/seedData';

/**
 * Get active items from a collection.
 * @param {Array} items - Collection to filter
 * @returns {Array} - Active items only
 */
const getActiveItems = (items) => items.filter(item => item.active === true);

/**
 * Transform flight data to component-friendly format.
 * @param {Object} flight - Raw flight data
 * @returns {Object} - Transformed flight
 */
const transformFlight = (flight) => ({
  ...flight,
  displayName: `${flight.airline} (${flight.code})`,
  routeDisplay: `${flight.from} → ${flight.to}`,
  price: flight.sellPrice || 0,
  priceAfterDiscount: flight.sellPrice ? flight.sellPrice * (1 - (flight.discount || 0) / 100) : 0,
  label: `${flight.airline} - ${flight.from} → ${flight.to}`,
});

/**
 * Transform hotel data to component-friendly format.
 * @param {Object} hotel - Raw hotel data
 * @returns {Object} - Transformed hotel
 */
const transformHotel = (hotel) => ({
  ...hotel,
  displayName: `${hotel.name} (${hotel.starRating || hotel.rating || 0}★)`,
  starRating: hotel.starRating || hotel.rating || 0,
  price: hotel.sellPrice || 0,
  priceAfterDiscount: hotel.sellPrice ? hotel.sellPrice * (1 - (hotel.discount || 0) / 100) : 0,
  label: `${hotel.name} - ${hotel.city} (${hotel.starRating || hotel.rating || 0}★)`,
});

/**
 * Transform cab data to component-friendly format.
 * @param {Object} cab - Raw cab data
 * @returns {Object} - Transformed cab
 */
const transformCab = (cab) => ({
  ...cab,
  displayName: `${cab.name || cab.type || cab.vehicleType}`,
  type: cab.type || cab.vehicleType || 'Standard',
  seats: cab.seats || cab.capacity || 4,
  price: cab.sellPrice || 0,
  priceAfterDiscount: cab.sellPrice ? cab.sellPrice * (1 - (cab.discount || 0) / 100) : 0,
  label: `${cab.name || cab.type} - ${cab.route || cab.city}`,
});

/**
 * Transform meal data to component-friendly format.
 * @param {Object} meal - Raw meal data
 * @returns {Object} - Transformed meal
 */
const transformMeal = (meal) => ({
  ...meal,
  price: meal.sellPrice || 0,
  priceAfterDiscount: meal.sellPrice ? meal.sellPrice * (1 - (meal.discount || 0) / 100) : 0,
  label: `${meal.name} (${meal.type})`,
});

// ---- Public API ----

export const PackageInventoryService = {
  /**
   * Get all active flights, transformed for UI.
   * @returns {Array} - Active flights
   */
  getActiveFlights: () => {
    return getActiveItems(seedFlights).map(transformFlight);
  },

  /**
   * Get active flights filtered by route.
   * @param {string} from - Departure city
   * @param {string} to - Arrival city
   * @returns {Array} - Filtered flights
   */
  getFlightsByRoute: (from, to) => {
    return PackageInventoryService.getActiveFlights().filter(flight => {
      const matchesFrom = !from || flight.from?.toLowerCase().includes(from.toLowerCase());
      const matchesTo = !to || flight.to?.toLowerCase().includes(to.toLowerCase());
      return matchesFrom && matchesTo;
    });
  },

  /**
   * Get all active hotels, transformed for UI.
   * @returns {Array} - Active hotels
   */
  getActiveHotels: () => {
    return getActiveItems(seedHotels).map(transformHotel);
  },

  /**
   * Get active hotels filtered by star rating.
   * @param {number} rating - Star rating (3, 4, 5)
   * @returns {Array} - Hotels with that rating
   */
  getHotelsByRating: (rating) => {
    return PackageInventoryService.getActiveHotels().filter(hotel => {
      const hotelRating = hotel.starRating || hotel.rating || 0;
      return Math.floor(hotelRating) === rating;
    });
  },

  /**
   * Get active hotels filtered by city.
   * @param {string} city - City name
   * @returns {Array} - Hotels in that city
   */
  getHotelsByCity: (city) => {
    return PackageInventoryService.getActiveHotels().filter(hotel =>
      hotel.city?.toLowerCase() === city?.toLowerCase()
    );
  },

  /**
   * Get available hotel ratings (3, 4, 5) that have active hotels.
   * @returns {Array} - Available ratings
   */
  getAvailableHotelRatings: () => {
    const hotels = PackageInventoryService.getActiveHotels();
    const ratings = new Set();
    hotels.forEach(h => {
      const r = h.starRating || h.rating || 0;
      if (r >= 3 && r <= 5) ratings.add(Math.floor(r));
    });
    return Array.from(ratings).sort();
  },

  /**
   * Get all active cabs, transformed for UI.
   * @returns {Array} - Active cabs
   */
  getActiveCabs: () => {
    return getActiveItems(seedCabs).map(transformCab);
  },

  /**
   * Get active cabs filtered by city.
   * @param {string} city - City name
   * @returns {Array} - Cabs in that city
   */
  getCabsByCity: (city) => {
    return PackageInventoryService.getActiveCabs().filter(cab =>
      cab.city?.toLowerCase() === city?.toLowerCase()
    );
  },

  /**
   * Get active cabs filtered by route.
   * @param {string} route - Route string
   * @returns {Array} - Cabs matching route
   */
  getCabsByRoute: (route) => {
    return PackageInventoryService.getActiveCabs().filter(cab =>
      cab.route?.toLowerCase().includes(route?.toLowerCase())
    );
  },

  /**
   * Get all active meals, transformed for UI.
   * @returns {Array} - Active meals
   */
  getActiveMeals: () => {
    return getActiveItems(seedMeals).map(transformMeal);
  },

  /**
   * Get active meals filtered by type.
   * @param {string} type - 'Veg' or 'Non-Veg'
   * @returns {Array} - Meals of that type
   */
  getMealsByType: (type) => {
    return PackageInventoryService.getActiveMeals().filter(meal =>
      meal.type?.toLowerCase() === type?.toLowerCase()
    );
  },

  /**
   * Calculate the total price of selected services.
   * @param {Object} selections - { flights: [], hotels: [], cabs: [], meals: [] }
   * @param {number} discount - Package discount percentage
   * @param {number} extraPrice - Extra price to add
   * @returns {Object} - { subtotal, discountAmount, finalTotal }
   */
  calculatePackagePrice: (selections, discount = 0, extraPrice = 0) => {
    const { flights = [], hotels = [], cabs = [], meals = [] } = selections;

    const sumPrices = (items) => items.reduce((sum, item) => sum + (item.priceAfterDiscount || item.price || 0), 0);

    const flightTotal = sumPrices(flights);
    const hotelTotal = sumPrices(hotels);
    const cabTotal = sumPrices(cabs);
    const mealTotal = sumPrices(meals);

    const subtotal = flightTotal + hotelTotal + cabTotal + mealTotal + extraPrice;
    const discountAmount = subtotal * (discount / 100);
    const finalTotal = subtotal - discountAmount;

    return {
      subtotal,
      flightTotal,
      hotelTotal,
      cabTotal,
      mealTotal,
      extraPrice,
      discount,
      discountAmount,
      finalTotal,
      breakdown: [
        { label: 'Flights', amount: flightTotal },
        { label: 'Hotels', amount: hotelTotal },
        { label: 'Cabs', amount: cabTotal },
        { label: 'Meals', amount: mealTotal },
        { label: 'Extra Price', amount: extraPrice },
      ].filter(item => item.amount > 0),
    };
  },

  /**
   * Check if a package has all required data to be valid.
   * @param {Object} pkg - Package data
   * @returns {Object} - { valid, errors: [] }
   */
  validatePackage: (pkg) => {
    const errors = [];

    if (!pkg.name?.trim()) errors.push('Package name is required');
    if (!pkg.from?.trim()) errors.push('Departure city is required');
    if (!pkg.to?.trim()) errors.push('Destination city is required');
    if (!pkg.days || pkg.days < 1) errors.push('Duration must be at least 1 day');

    // At least one service must be selected
    const hasFlight = pkg.flights?.length > 0;
    const hasHotel = pkg.hotels?.length > 0;
    const hasCab = pkg.cabs?.length > 0;
    const hasMeal = pkg.meals?.length > 0;

    if (!hasFlight && !hasHotel && !hasCab && !hasMeal) {
      errors.push('At least one service (flight, hotel, cab, or meal) must be selected');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Generate a unique ID for a new package.
   * @param {Array} existing - Existing packages
   * @returns {string} - New ID
   */
  generatePackageId: (existing) => {
    const ids = existing.map(p => p.id || '').filter(id => id.startsWith('PK-'));
    const numbers = ids.map(id => parseInt(id.replace('PK-', ''), 10)).filter(n => !isNaN(n));
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 7000;
    return `PK-${String(maxNum + 1).padStart(4, '0')}`;
  },
};

export default PackageInventoryService;
