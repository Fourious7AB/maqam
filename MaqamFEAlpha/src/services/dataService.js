/**
 * Data Service Layer
 * This is a flexible abstraction that can be easily switched to backend API calls.
 * Currently uses mock data stored in localStorage for development.
 * Structure supports future migration to REST/GraphQL endpoints.
 */

// ============================================================================
// MOCK DATA STORE (Replace with API calls in production)
// ============================================================================

const STORAGE_KEYS = {
  FLIGHTS: 'maqam_flights',
  HOTELS: 'maqam_hotels',
  PACKAGES: 'maqam_packages',
  CABS: 'maqam_cabs',
  MEALS: 'maqam_meals',
  VISA: 'maqam_visa',
  BOOKINGS: 'maqam_bookings',
  USERS: 'maqam_users',
  INVOICES: 'maqam_invoices',
  PRICE_DISCOUNTS: 'maqam_price_discounts',
  CUSTOMERS: 'maqam_customers',
  HOTELIERS: 'maqam_hoteliers',
};

// Initialize mock data
const initializeMockData = () => {
  if (!localStorage.getItem(STORAGE_KEYS.FLIGHTS)) {
    localStorage.setItem(STORAGE_KEYS.FLIGHTS, JSON.stringify([
      {
        id: 'FL001',
        airline: 'Saudi Airlines',
        from: 'Bangalore',
        to: 'Jeddah',
        departure: '2024-09-15T06:00',
        arrival: '2024-09-15T10:30',
        duration: '4h 30m',
        basePrice: 8500,
        discount: 0,
        meal: 'Included',
        seats: 150,
      },
      {
        id: 'FL002',
        airline: 'Emirates',
        from: 'Delhi',
        to: 'Medina',
        departure: '2024-09-16T08:00',
        arrival: '2024-09-16T14:00',
        duration: '6h',
        basePrice: 12000,
        discount: 5,
        meal: 'Not Included',
        seats: 200,
      },
    ]));
  }

  if (!localStorage.getItem(STORAGE_KEYS.HOTELS)) {
    localStorage.setItem(STORAGE_KEYS.HOTELS, JSON.stringify([
      {
        id: 'HT001',
        name: 'Makkah Grand Hotel',
        city: 'Makkah',
        basePrice: 5000,
        priceIncrement: 0,
        discount: 0,
        rooms: 50,
        rating: 4.5,
        image: '/hotel1.jpg',
        amenities: ['WiFi', 'Parking', 'Restaurant'],
        selected: true,
      },
      {
        id: 'HT002',
        name: 'Medina Luxe',
        city: 'Medina',
        basePrice: 4500,
        priceIncrement: 0,
        discount: 10,
        rooms: 40,
        rating: 4.2,
        image: '/hotel2.jpg',
        amenities: ['WiFi', 'AC', 'Gym'],
        selected: true,
      },
    ]));
  }

  if (!localStorage.getItem(STORAGE_KEYS.CABS)) {
    localStorage.setItem(STORAGE_KEYS.CABS, JSON.stringify([
      {
        id: 'CB001',
        provider: 'Makkah Cabs',
        vehicleType: 'SUV',
        basePrice: 3000,
        discount: 0,
        capacity: 7,
        image: '/cab1.jpg',
      },
      {
        id: 'CB002',
        provider: 'Medina Express',
        vehicleType: 'Sedan',
        basePrice: 2500,
        discount: 5,
        capacity: 4,
        image: '/cab2.jpg',
      },
    ]));
  }

  if (!localStorage.getItem(STORAGE_KEYS.MEALS)) {
    localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify([
      {
        id: 'ML001',
        name: 'Breakfast Package',
        description: 'Daily breakfast',
        basePrice: 500,
        discount: 0,
        image: '/meal1.jpg',
      },
      {
        id: 'ML002',
        name: 'Full Day Meal',
        description: 'Breakfast, lunch, dinner',
        basePrice: 1200,
        discount: 10,
        image: '/meal2.jpg',
      },
    ]));
  }

  if (!localStorage.getItem(STORAGE_KEYS.VISA)) {
    localStorage.setItem(STORAGE_KEYS.VISA, JSON.stringify([
      {
        id: 'VS001',
        country: 'Saudi Arabia',
        type: 'Umrah Visa',
        basePrice: 2500,
        discount: 0,
        processingDays: 5,
        image: '/visa1.jpg',
      },
      {
        id: 'VS002',
        country: 'Egypt',
        type: 'Tourist Visa',
        basePrice: 1500,
        discount: 5,
        processingDays: 3,
        image: '/visa2.jpg',
      },
    ]));
  }

  if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify([
      {
        id: 'INV001',
        date: '2024-09-01',
        customerName: 'Ahmed Khan',
        amount: 45000,
        status: 'Paid',
        description: 'Umrah Package',
      },
      {
        id: 'INV002',
        date: '2024-09-02',
        customerName: 'Fatima Ali',
        amount: 350000,
        status: 'Pending',
        description: 'Hajj Package',
      },
    ]));
  }

  if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify([
      {
        id: 'BK001',
        customerId: 'CUST001',
        packageId: 'PKG001',
        status: 'Confirmed',
        totalPrice: 45000,
        travelers: [
          { name: 'Ahmed Khan', phone: '9876543210', visa: true, passport: true }
        ],
        createdAt: '2024-09-01',
      },
    ]));
  }

  if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([
      {
        id: 'CUST001',
        name: 'Ahmed Khan',
        email: 'ahmed@mail.com',
        phone: '9876543210',
        dob: '1985-05-10',
      },
    ]));
  }
};

// ============================================================================
// GENERIC CRUD OPERATIONS
// ============================================================================

export const createItem = (key, item) => {
  const items = JSON.parse(localStorage.getItem(key) || '[]');
  const newItem = { ...item, id: `${key.split('_')[1].toLowerCase()}_${Date.now()}` };
  items.push(newItem);
  localStorage.setItem(key, JSON.stringify(items));
  return newItem;
};

export const getItems = (key) => {
  initializeMockData();
  return JSON.parse(localStorage.getItem(key) || '[]');
};

export const getItemById = (key, id) => {
  const items = getItems(key);
  return items.find(item => item.id === id);
};

export const updateItem = (key, id, updates) => {
  const items = getItems(key);
  const index = items.findIndex(item => item.id === id);
  if (index !== -1) {
    items[index] = { ...items[index], ...updates };
    localStorage.setItem(key, JSON.stringify(items));
    return items[index];
  }
  return null;
};

export const deleteItem = (key, id) => {
  const items = getItems(key);
  const filtered = items.filter(item => item.id !== id);
  localStorage.setItem(key, JSON.stringify(filtered));
  return true;
};

// ============================================================================
// FLIGHT OPERATIONS
// ============================================================================

export const flightService = {
  getAll: () => getItems(STORAGE_KEYS.FLIGHTS),
  getById: (id) => getItemById(STORAGE_KEYS.FLIGHTS, id),
  create: (data) => createItem(STORAGE_KEYS.FLIGHTS, data),
  update: (id, data) => updateItem(STORAGE_KEYS.FLIGHTS, id, data),
  delete: (id) => deleteItem(STORAGE_KEYS.FLIGHTS, id),
  updatePrice: (id, discount) => {
    const flight = getItemById(STORAGE_KEYS.FLIGHTS, id);
    if (flight) {
      return updateItem(STORAGE_KEYS.FLIGHTS, id, { discount });
    }
    return null;
  },
};

// ============================================================================
// HOTEL OPERATIONS
// ============================================================================

export const hotelService = {
  getAll: () => getItems(STORAGE_KEYS.HOTELS),
  getById: (id) => getItemById(STORAGE_KEYS.HOTELS, id),
  create: (data) => createItem(STORAGE_KEYS.HOTELS, data),
  update: (id, data) => updateItem(STORAGE_KEYS.HOTELS, id, data),
  delete: (id) => deleteItem(STORAGE_KEYS.HOTELS, id),
  updatePrice: (id, priceIncrement) => {
    const hotel = getItemById(STORAGE_KEYS.HOTELS, id);
    if (hotel) {
      return updateItem(STORAGE_KEYS.HOTELS, id, { priceIncrement });
    }
    return null;
  },
  search: (query) => {
    const hotels = getItems(STORAGE_KEYS.HOTELS);
    return hotels.filter(h =>
      h.name.toLowerCase().includes(query.toLowerCase()) ||
      h.city.toLowerCase().includes(query.toLowerCase())
    );
  },
};

// ============================================================================
// PACKAGE OPERATIONS
// ============================================================================

export const packageService = {
  getAll: () => getItems(STORAGE_KEYS.PACKAGES),
  getById: (id) => getItemById(STORAGE_KEYS.PACKAGES, id),
  create: (data) => createItem(STORAGE_KEYS.PACKAGES, data),
  update: (id, data) => updateItem(STORAGE_KEYS.PACKAGES, id, data),
  delete: (id) => deleteItem(STORAGE_KEYS.PACKAGES, id),
  calculatePrice: (services) => {
    let total = 0;
    services.forEach(service => {
      if (service.enabled && service.price) {
        total += service.price * (service.quantity || 1);
      }
    });
    return total;
  },
};

// ============================================================================
// CAB OPERATIONS
// ============================================================================

export const cabService = {
  getAll: () => getItems(STORAGE_KEYS.CABS),
  getById: (id) => getItemById(STORAGE_KEYS.CABS, id),
  create: (data) => createItem(STORAGE_KEYS.CABS, data),
  update: (id, data) => updateItem(STORAGE_KEYS.CABS, id, data),
  delete: (id) => deleteItem(STORAGE_KEYS.CABS, id),
};

// ============================================================================
// MEAL OPERATIONS
// ============================================================================

export const mealService = {
  getAll: () => getItems(STORAGE_KEYS.MEALS),
  getById: (id) => getItemById(STORAGE_KEYS.MEALS, id),
  create: (data) => createItem(STORAGE_KEYS.MEALS, data),
  update: (id, data) => updateItem(STORAGE_KEYS.MEALS, id, data),
  delete: (id) => deleteItem(STORAGE_KEYS.MEALS, id),
};

// ============================================================================
// VISA OPERATIONS
// ============================================================================

export const visaService = {
  getAll: () => getItems(STORAGE_KEYS.VISA),
  getById: (id) => getItemById(STORAGE_KEYS.VISA, id),
  create: (data) => createItem(STORAGE_KEYS.VISA, data),
  update: (id, data) => updateItem(STORAGE_KEYS.VISA, id, data),
  delete: (id) => deleteItem(STORAGE_KEYS.VISA, id),
};

// ============================================================================
// BOOKING OPERATIONS
// ============================================================================

export const bookingService = {
  getAll: () => getItems(STORAGE_KEYS.BOOKINGS),
  getById: (id) => getItemById(STORAGE_KEYS.BOOKINGS, id),
  create: (data) => createItem(STORAGE_KEYS.BOOKINGS, data),
  update: (id, data) => updateItem(STORAGE_KEYS.BOOKINGS, id, data),
  delete: (id) => deleteItem(STORAGE_KEYS.BOOKINGS, id),
  getByStatus: (status) => {
    const bookings = getItems(STORAGE_KEYS.BOOKINGS);
    return bookings.filter(b => b.status === status);
  },
  approve: (id, notes = '') => {
    return updateItem(STORAGE_KEYS.BOOKINGS, id, { status: 'Confirmed', adminNotes: notes });
  },
  reject: (id, reason) => {
    return updateItem(STORAGE_KEYS.BOOKINGS, id, { status: 'Rejected', rejectionReason: reason });
  },
};

// ============================================================================
// INVOICE OPERATIONS
// ============================================================================

export const invoiceService = {
  getAll: () => getItems(STORAGE_KEYS.INVOICES),
  getById: (id) => getItemById(STORAGE_KEYS.INVOICES, id),
  create: (data) => createItem(STORAGE_KEYS.INVOICES, data),
  update: (id, data) => updateItem(STORAGE_KEYS.INVOICES, id, data),
  delete: (id) => deleteItem(STORAGE_KEYS.INVOICES, id),
  search: (query) => {
    const invoices = getItems(STORAGE_KEYS.INVOICES);
    return invoices.filter(inv =>
      inv.customerName.toLowerCase().includes(query.toLowerCase()) ||
      inv.id.includes(query)
    );
  },
  filterByDate: (startDate, endDate) => {
    const invoices = getItems(STORAGE_KEYS.INVOICES);
    return invoices.filter(inv => {
      const invDate = new Date(inv.date);
      return invDate >= new Date(startDate) && invDate <= new Date(endDate);
    });
  },
};

// ============================================================================
// USER/CUSTOMER OPERATIONS
// ============================================================================

export const userService = {
  getAll: () => getItems(STORAGE_KEYS.USERS),
  getById: (id) => getItemById(STORAGE_KEYS.USERS, id),
  create: (data) => createItem(STORAGE_KEYS.USERS, data),
  update: (id, data) => updateItem(STORAGE_KEYS.USERS, id, data),
  delete: (id) => deleteItem(STORAGE_KEYS.USERS, id),
};

export const customerService = {
  getAll: () => getItems(STORAGE_KEYS.CUSTOMERS),
  getById: (id) => getItemById(STORAGE_KEYS.CUSTOMERS, id),
  create: (data) => createItem(STORAGE_KEYS.CUSTOMERS, data),
  update: (id, data) => updateItem(STORAGE_KEYS.CUSTOMERS, id, data),
  delete: (id) => deleteItem(STORAGE_KEYS.CUSTOMERS, id),
};

// ============================================================================
// PRICE CONTROL (Global discounts/changes)
// ============================================================================

export const priceControlService = {
  getAll: () => getItems(STORAGE_KEYS.PRICE_DISCOUNTS),
  setFlightDiscount: (flightId, discount) => {
    const flight = flightService.getById(flightId);
    if (flight) {
      flightService.update(flightId, { discount });
      return flight;
    }
    return null;
  },
  setHotelPriceIncrement: (hotelId, increment) => {
    const hotel = hotelService.getById(hotelId);
    if (hotel) {
      hotelService.update(hotelId, { priceIncrement: increment });
      return hotel;
    }
    return null;
  },
};

// Initialize on first load
initializeMockData();

export default {
  flightService,
  hotelService,
  packageService,
  cabService,
  mealService,
  visaService,
  bookingService,
  invoiceService,
  userService,
  customerService,
  priceControlService,
};
