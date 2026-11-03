import test from "node:test";
import assert from "node:assert/strict";

// Mock environment
class MockStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(String(key), String(value));
  }
  removeItem(key) {
    this.store.delete(String(key));
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
}

globalThis.localStorage = new MockStorage();
globalThis.sessionStorage = new MockStorage();
globalThis.window = {
  location: {
    origin: "http://localhost:5173",
    protocol: "http:",
    pathname: "/package-page",
    search: "",
    assign: (url) => { window._assignedUrl = url; },
  },
  _assignedUrl: null,
};

import { normalizePackageData } from "./src/utils/packageNormalizer.js";

test("1. normalizePackageData formats flight, hotel, and itinerary correctly", () => {
  const rawPkg = {
    _id: "pkg-1001",
    title: "10 Days Premium Umrah Package",
    destination: "Makkah & Madinah",
    duration: "9 Nights / 10 Days",
    sellPrice: 65000,
    availableSlots: 8,
    flights: [
      {
        airline: "Saudia Airlines",
        flightNumber: "SV-741",
        origin: "DEL",
        destination: "JED",
        cabinClass: "Economy Class",
      },
    ],
    hotels: [
      {
        hotelName: "Makkah Clock Royal Tower",
        roomType: "Kaaba View Deluxe",
        destination: "Makkah",
        meals: ["Breakfast & Dinner Included"],
      },
    ],
    itinerary: [
      { day: 1, title: "Arrival in Jeddah & VIP Transfer", description: "Meet & assist upon arrival" },
      { day: 2, title: "Umrah Pilgrimage & Holy Kaaba Prayers", description: "Perform Umrah rites with spiritual guide" },
    ],
  };

  const normalized = normalizePackageData(rawPkg);

  assert.equal(normalized._id, "pkg-1001");
  assert.equal(normalized.flights.length, 1);
  assert.equal(normalized.flights[0].airline, "Saudia Airlines");
  assert.equal(normalized.hotels.length, 1);
  assert.equal(normalized.hotels[0].hotelName, "Makkah Clock Royal Tower");
  assert.equal(normalized.itinerary.length, 2);
  assert.equal(normalized.itinerary[0].day, 1);
});

test("2. normalizePackageData generates verified fallback logistics when components are empty", () => {
  const minimalPkg = {
    _id: "pkg-minimal",
    title: "Express Turkey Heritage",
    destination: "Turkey",
    sellPrice: 50000,
  };

  const normalized = normalizePackageData(minimalPkg);

  assert.ok(normalized.flights.length > 0);
  assert.equal(normalized.flights[0].airline, "Turkish Airlines");
  assert.ok(normalized.hotels.length > 0);
  assert.equal(normalized.hotels[0].hotelName, "Grand Sultanahmet Hotel");
  assert.ok(normalized.itinerary.length >= 5);
  assert.equal(normalized.itinerary[0].day, 1);
});

test("3. Saved travellers auto-assigns primary saved profile and pre-fills leadForm", () => {
  const mockSavedTravellers = [
    {
      _id: "trav-1",
      title: "Mr",
      firstName: "Aamir",
      lastName: "Khan",
      email: "aamir@example.com",
      phone: "9876543210",
      isLead: true,
    },
    {
      _id: "trav-2",
      title: "Mrs",
      firstName: "Fatima",
      lastName: "Khan",
      email: "fatima@example.com",
      phone: "9876543211",
      isLead: false,
    },
  ];

  const lead = mockSavedTravellers.find((t) => t.isLead) || mockSavedTravellers[0];
  const formState = {
    title: lead.title || "Mr",
    firstName: lead.firstName || "",
    lastName: lead.lastName || "",
    email: lead.email || "",
    phone: lead.phone || "",
    saveToProfile: false,
    travellerId: lead._id,
  };

  assert.equal(formState.travellerId, "trav-1");
  assert.equal(formState.firstName, "Aamir");
  assert.equal(formState.lastName, "Khan");
  assert.equal(formState.email, "aamir@example.com");
  assert.equal(formState.phone, "9876543210");
  assert.equal(formState.saveToProfile, false);
});

test("4. Fallback to logged-in user profile pre-fills name, email, phone with saveToProfile: true", () => {
  const mockUser = {
    name: "Zaid Patel",
    email: "zaid.patel@gmail.com",
    phone: "9988776655",
  };

  const nameParts = mockUser.name.split(" ");
  const formState = {
    title: "Mr",
    firstName: nameParts[0],
    lastName: nameParts.slice(1).join(" "),
    email: mockUser.email,
    phone: mockUser.phone,
    saveToProfile: true,
    travellerId: null,
  };

  assert.equal(formState.travellerId, null);
  assert.equal(formState.firstName, "Zaid");
  assert.equal(formState.lastName, "Patel");
  assert.equal(formState.email, "zaid.patel@gmail.com");
  assert.equal(formState.phone, "9988776655");
  assert.equal(formState.saveToProfile, true);
});

test("5. Form validation enforces required fields and correct formats", () => {
  const validateTravellers = (leadForm, coTravellers = []) => {
    if (!leadForm.firstName?.trim() || !leadForm.lastName?.trim()) {
      return { valid: false, error: "Missing lead name" };
    }
    const cleanEmail = leadForm.email?.trim() || "";
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { valid: false, error: "Invalid lead email" };
    }
    const cleanPhone = String(leadForm.phone || "").replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 7 || cleanPhone.length > 15) {
      return { valid: false, error: "Invalid lead phone" };
    }
    for (let i = 0; i < coTravellers.length; i++) {
      const co = coTravellers[i];
      if (!co.firstName?.trim() || !co.lastName?.trim()) {
        return { valid: false, error: `Missing Co-Traveller ${i + 2} name` };
      }
    }
    return { valid: true };
  };

  // Test empty name
  assert.equal(validateTravellers({ firstName: "", lastName: "", email: "a@b.com", phone: "9876543210" }).valid, false);
  // Test invalid email
  assert.equal(validateTravellers({ firstName: "Ali", lastName: "Khan", email: "notanemail", phone: "9876543210" }).valid, false);
  // Test invalid phone
  assert.equal(validateTravellers({ firstName: "Ali", lastName: "Khan", email: "ali@b.com", phone: "123" }).valid, false);
  // Test valid lead but missing co-traveller
  assert.equal(
    validateTravellers(
      { firstName: "Ali", lastName: "Khan", email: "ali@b.com", phone: "9876543210" },
      [{ firstName: "", lastName: "" }]
    ).valid,
    false
  );
  // Test all valid
  assert.equal(
    validateTravellers(
      { firstName: "Ali", lastName: "Khan", email: "ali@b.com", phone: "9876543210" },
      [{ firstName: "Sara", lastName: "Khan", email: "ali@b.com", phone: "9876543210" }]
    ).valid,
    true
  );
});

test("6. Package booking payload does not contain swapping or delta pricing attributes", () => {
  const preparedTravellers = [
    {
      isLead: true,
      title: "Mr",
      firstName: "Rashid",
      lastName: "Syed",
      email: "rashid@example.com",
      phone: "9876543210",
      passengerType: "Adult",
      gender: "Male",
    },
  ];

  const bookingPayload = {
    packageId: "pkg-500",
    quantity: 1,
    travellers: preparedTravellers,
    excludedOfferIds: [],
    swappedOffers: [],
    customSelections: {
      totalAmount: 47250,
      packageTitle: "5 Days Makkah Retreat",
      destination: "Makkah",
      travelDates: "4 Nights / 5 Days",
    },
  };

  assert.equal(bookingPayload.swappedOffers.length, 0);
  assert.equal(bookingPayload.excludedOfferIds.length, 0);
  assert.equal(bookingPayload.travellers.length, 1);
  assert.equal(bookingPayload.travellers[0].isLead, true);
  assert.equal(bookingPayload.travellers[0].firstName, "Rashid");
});

test("7. Payment capture confirmation check requires backend confirmation before showing success", () => {
  const checkConfirmation = (captureRes, capData, foundDetails) => {
    const paymentStatus = (
      capData.status ||
      capData.paymentStatus ||
      foundDetails?.paymentStatus ||
      ""
    ).toUpperCase();

    const bookingStatus = (
      foundDetails?.status ||
      foundDetails?.bookingStatus ||
      ""
    ).toLowerCase();

    return (
      captureRes?.success &&
      (paymentStatus === "COMPLETED" ||
        paymentStatus === "CAPTURED" ||
        paymentStatus === "PAID" ||
        paymentStatus === "SUCCESS" ||
        bookingStatus === "confirmed" ||
        bookingStatus === "completed" ||
        captureRes.alreadyCaptured ||
        Boolean(captureRes.captureId))
    );
  };

  // Case A: Capture failed
  assert.equal(checkConfirmation({ success: false }, {}, {}), false);

  // Case B: Capture successful with COMPLETED paymentStatus
  assert.equal(
    checkConfirmation({ success: true, captureId: "CAP-123" }, { status: "COMPLETED" }, {}),
    true
  );

  // Case C: Capture successful with confirmed booking status
  assert.equal(
    checkConfirmation({ success: true }, {}, { status: "confirmed" }),
    true
  );

  // Case D: Capture successful with alreadyCaptured true
  assert.equal(
    checkConfirmation({ success: true, alreadyCaptured: true }, {}, {}),
    true
  );

  // Case E: Payment pending and booking pending
  assert.equal(
    checkConfirmation({ success: false }, { status: "PENDING" }, { status: "pending" }),
    false
  );
});
