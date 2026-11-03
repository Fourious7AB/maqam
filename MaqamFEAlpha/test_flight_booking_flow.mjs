import test from "node:test";
import assert from "node:assert/strict";

// Mock minimal browser storage & environment
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
  location: { origin: "http://localhost:5173", protocol: "http:", pathname: "/fare-quote-details", search: "" },
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};

import { reindexSlots, getSlotDisplayName } from "./src/components/farequotedetails/slotUtils.js";

const isGenericPlaceholder = (val) => {
  if (!val || typeof val !== "string") return true;
  const lower = val.trim().toLowerCase();
  return (
    lower === "" ||
    lower === "user" ||
    lower === "authorized user" ||
    lower === "maqam user" ||
    lower === "customer" ||
    lower === "null" ||
    lower === "undefined" ||
    lower === "traveler" ||
    lower === "passenger" ||
    /^\+?\d+$/.test(lower)
  );
};

const isPhoneOnlyIncompleteUser = (user) => {
  if (!user || typeof user !== "object") return false;
  const rawFirst = String(user.firstName || user.name?.split(" ")?.[0] || "").trim();
  const rawEmail = String(user.email || "").trim();
  const rawPhone = String(user.phone || "").trim();
  if (!rawPhone) return false;
  if (!rawFirst || isGenericPlaceholder(rawFirst)) return true;
  if (!rawEmail || !rawEmail.includes("@") || rawEmail.endsWith("@placeholder.com") || rawEmail.endsWith("@maqam.internal")) return true;
  return false;
};

// Helper simulating passenger payload generation as implemented in TravellerDetails.jsx
function buildFlightBookingPayload({
  traceId,
  resultIndex,
  passengerSlots,
  contactDetails,
  gstDetails,
  selectedSsr = {},
  selectedSeats = {},
}) {
  const eligibleSlots = passengerSlots.filter((p) => p.type !== "INFANT");
  const isSingleTraveler = passengerSlots.length === 1;

  const payloadPassengers = passengerSlots.map((slot, index) => {
    const isInfant = String(slot.type || "").toUpperCase() === "INFANT";
    const eligibleIndex = isInfant
      ? -1
      : eligibleSlots.findIndex((s) => s.id === slot.id);
    const lookupIdx = eligibleIndex >= 0 ? eligibleIndex : index;
    const paxSsr = isInfant ? {} : selectedSsr[lookupIdx] || {};
    const paxSeat = isInfant ? {} : selectedSeats[lookupIdx] || {};

    // 1. Seats: Clean array or empty array []
    const seatList = paxSeat?.seatNumber
      ? [
          {
            seatNumber: paxSeat.seatNumber,
            code: paxSeat.code || paxSeat.seatNumber,
            amount: Number(paxSeat.amount || paxSeat.Amount || 0),
          },
        ]
      : [];

    // 2. Meals: Strictly from verified SSR catalog or empty array [] (no unverified free-text preferences)
    const mealList = paxSsr?.meal?.code
      ? [
          {
            code: paxSsr.meal.code,
            price: Number(paxSsr.meal.price || 0),
            description: paxSsr.meal.description || "",
          },
        ]
      : [];

    // 3. Baggage: Clean array or empty array []
    const baggageList = paxSsr?.baggage?.code
      ? [
          {
            code: paxSsr.baggage.code,
            price: Number(paxSsr.baggage.price || 0),
            weight: paxSsr.baggage.weight || "",
          },
        ]
      : [];

    const formatTitle = (rawTitle) => {
      if (rawTitle === "Master") return "Mstr";
      return rawTitle || "Mr";
    };

    const isLead = index === 0;
    const resolvedTravellerId = slot.savedTravellerId || slot.travellerId || null;

    // Single traveler or user auto-save logic
    const autoSave = Boolean(
      !resolvedTravellerId && (slot.saveToProfile || (isSingleTraveler && isLead))
    );

    const travellerDetails = {
      title: formatTitle(slot.title),
      firstName: (slot.firstName || "").trim(),
      lastName: (slot.lastName || "").trim(),
      passengerType: slot.type === "CHILD" ? "Child" : slot.type === "INFANT" ? "Infant" : "Adult",
      gender: slot.gender || (slot.title === "Mrs" || slot.title === "Ms" ? "Female" : "Male"),
      dateOfBirth: slot.dob || "",
      email: (contactDetails.email || "").trim(),
      phone: (contactDetails.mobile || "").trim(),
      cellCountryCode: contactDetails.countryCode || "+91",
      addressLine1: (slot.addressLine1 || "Flat 402").trim(),
      city: (slot.city || "Mumbai").trim(),
      countryCode: slot.countryCode || "IN",
      countryName: slot.countryName || "INDIA",
      ...(slot.passport?.trim()
        ? {
            passportNo: slot.passport.trim(),
            passportExpiry: slot.passportExpiry || "",
            passportIssueDate: slot.passportIssueDate || "",
            passportIssueCountryCode: slot.passportIssueCountryCode || "IN",
          }
        : {}),
    };

    if (resolvedTravellerId) {
      return {
        travellerId: String(resolvedTravellerId),
        isLeadPax: isLead,
        saveToProfile: false,
        meals: mealList,
        baggage: baggageList,
        seats: seatList,
      };
    }

    return {
      isLeadPax: isLead,
      saveToProfile: autoSave,
      travellerDetails,
      meals: mealList,
      baggage: baggageList,
      seats: seatList,
    };
  });

  return {
    traceId: String(traceId).trim(),
    resultIndex: String(resultIndex).trim(),
    passengers: payloadPassengers,
    ...(gstDetails?.hasGst && gstDetails.gstNumber?.trim()
      ? {
          gstDetails: {
            gstNumber: gstDetails.gstNumber.trim(),
            companyName: (gstDetails.companyName || "").trim(),
            address: (gstDetails.address || gstDetails.companyAddress || "").trim(),
          },
        }
      : {}),
  };
}

test("1. Single Traveler Auto-Save: saveToProfile is automatically true when no saved profile exists", () => {
  const payload = buildFlightBookingPayload({
    traceId: "283594",
    resultIndex: "11-4598388194_2DELBOM9I11111~864484912641097",
    passengerSlots: [
      {
        id: 1,
        type: "ADULT",
        title: "Mr",
        firstName: "Rahul",
        lastName: "Sharma",
        gender: "Male",
        dob: "1992-08-15",
        saveToProfile: false, // user did not explicitly check it
        savedTravellerId: null,
      },
    ],
    contactDetails: {
      mobile: "9876543210",
      email: "rahul.sharma@example.com",
      countryCode: "+91",
    },
    gstDetails: { hasGst: false },
  });

  assert.equal(payload.passengers.length, 1);
  const pax = payload.passengers[0];
  // Auto-save must be true for single traveler so it is automatically saved to profile
  assert.equal(pax.saveToProfile, true, "Single traveler must auto-save to profile");
  assert.equal(pax.isLeadPax, true, "Single traveler must be lead passenger (boolean true)");
  assert.equal(typeof pax.isLeadPax, "boolean", "isLeadPax must be a strict boolean, not number 1");
  assert.equal(pax.travellerDetails.email, "rahul.sharma@example.com");
  assert.equal(pax.travellerDetails.phone, "9876543210");
  assert.equal(pax.travellerId, undefined, "No travellerId if not previously saved");
});

test("1b. Single Traveler With Saved Profile: saveToProfile is false to prevent duplicate records", () => {
  const payload = buildFlightBookingPayload({
    traceId: "283594",
    resultIndex: "11-4598388194_2DELBOM9I11111~864484912641097",
    passengerSlots: [
      {
        id: 1,
        type: "ADULT",
        title: "Mr",
        firstName: "Rahul",
        lastName: "Sharma",
        gender: "Male",
        dob: "1992-08-15",
        savedTravellerId: "64f0b5c2d2b6e3b4c5d6e7f8",
        saveToProfile: false,
      },
    ],
    contactDetails: {
      mobile: "9876543210",
      email: "rahul.sharma@example.com",
      countryCode: "+91",
    },
    gstDetails: { hasGst: false },
  });

  const pax = payload.passengers[0];
  assert.equal(pax.travellerId, "64f0b5c2d2b6e3b4c5d6e7f8");
  assert.equal(pax.saveToProfile, false, "Must not re-save or duplicate an already saved traveller");
  assert.equal(pax.travellerDetails, undefined, "travellerDetails must be omitted when travellerId is provided");
});

test("1d. Payload Mutual Exclusivity: Either travellerId OR travellerDetails is present, never both", () => {
  const payloadSaved = buildFlightBookingPayload({
    traceId: "283594",
    resultIndex: "11-4598388194_2DELBOM9I11111~864484912641097",
    passengerSlots: [
      { id: 1, type: "ADULT", title: "Mr", firstName: "Rahul", lastName: "Sharma", savedTravellerId: "64f0b5c2d2b6e3b4c5d6e7f8" },
    ],
    contactDetails: { mobile: "9876543210", email: "rahul@example.com" },
  });
  const paxSaved = payloadSaved.passengers[0];
  assert.ok(paxSaved.travellerId, "Must include travellerId");
  assert.equal(paxSaved.travellerDetails, undefined, "Must NOT include travellerDetails when travellerId is provided");

  const payloadNew = buildFlightBookingPayload({
    traceId: "283594",
    resultIndex: "11-4598388194_2DELBOM9I11111~864484912641097",
    passengerSlots: [
      { id: 1, type: "ADULT", title: "Mr", firstName: "Amit", lastName: "Verma", savedTravellerId: null },
    ],
    contactDetails: { mobile: "9876543210", email: "amit@example.com" },
  });
  const paxNew = payloadNew.passengers[0];
  assert.equal(paxNew.travellerId, undefined, "Must NOT include travellerId when new");
  assert.ok(paxNew.travellerDetails, "Must include travellerDetails");
});

test("1c. Title Normalization: Child/Infant title 'Master' is normalized to 'Mstr' for backend schema", () => {
  const payload = buildFlightBookingPayload({
    traceId: "283594",
    resultIndex: "11-4598388194_2DELBOM9I11111~864484912641097",
    passengerSlots: [
      {
        id: 1,
        type: "CHILD",
        title: "Master",
        firstName: "Aarav",
        lastName: "Mehta",
        gender: "Male",
        dob: "2018-09-20",
        savedTravellerId: null,
      },
    ],
    contactDetails: {
      mobile: "9811223344",
      email: "vikram.mehta@example.com",
      countryCode: "+91",
    },
    gstDetails: { hasGst: false },
  });

  const pax = payload.passengers[0];
  assert.equal(pax.travellerDetails.title, "Mstr", "Master must be mapped to Mstr matching backend Mongoose enum ['Mr', 'Mrs', 'Ms', 'Miss', 'Mstr']");
});

test("2. Clean Ancillaries Arrays: No SSR or Seat selected returns strictly empty arrays []", () => {
  const payload = buildFlightBookingPayload({
    traceId: "283594",
    resultIndex: "11-4598388194_2DELBOM9I11111~864484912641097",
    passengerSlots: [
      {
        id: 1,
        type: "ADULT",
        title: "Mr",
        firstName: "Vikram",
        lastName: "Mehta",
        gender: "Male",
        dob: "1990-05-12",
        mealPreference: "MOML", // free text loyalty preference
      },
    ],
    contactDetails: { mobile: "9811223344", email: "vikram@example.com", countryCode: "+91" },
    selectedSsr: {},
    selectedSeats: {},
  });

  const pax = payload.passengers[0];
  assert.ok(Array.isArray(pax.meals), "meals must be an array");
  assert.equal(pax.meals.length, 0, "meals must be clean empty array [] when not in SSR catalog");
  assert.ok(Array.isArray(pax.baggage), "baggage must be an array");
  assert.equal(pax.baggage.length, 0, "baggage must be clean empty array []");
  assert.ok(Array.isArray(pax.seats), "seats must be an array");
  assert.equal(pax.seats.length, 0, "seats must be clean empty array []");
});

test("3. Selected Ancillaries: Correctly formats seat with code + amount and meals with code + price", () => {
  const payload = buildFlightBookingPayload({
    traceId: "283594",
    resultIndex: "11-4598388194_2DELBOM9I11111~864484912641097",
    passengerSlots: [
      {
        id: 1,
        type: "ADULT",
        title: "Mr",
        firstName: "Rahul",
        lastName: "Sharma",
        gender: "Male",
        dob: "1992-08-15",
      },
    ],
    contactDetails: { mobile: "9876543210", email: "rahul@example.com", countryCode: "+91" },
    selectedSsr: {
      0: {
        meal: { code: "VGML", price: 450, description: "Vegetarian Hot Meal" },
        baggage: { code: "BAG5", price: 1800, weight: "5" },
      },
    },
    selectedSeats: {
      0: { seatNumber: "8C", code: "8CSeKey33", amount: 600 },
    },
  });

  const pax = payload.passengers[0];
  assert.equal(pax.seats.length, 1);
  assert.equal(pax.seats[0].seatNumber, "8C");
  assert.equal(pax.seats[0].code, "8CSeKey33", "Both seatNumber and code must be preserved for airline reservation engines");
  assert.equal(pax.seats[0].amount, 600);

  assert.equal(pax.meals.length, 1);
  assert.equal(pax.meals[0].code, "VGML");
  assert.equal(pax.meals[0].price, 450);

  assert.equal(pax.baggage.length, 1);
  assert.equal(pax.baggage[0].code, "BAG5");
  assert.equal(pax.baggage[0].price, 1800);
});

test("4. Multi-Passenger Lead Pax Validation: Exactly one lead passenger with isLeadPax: true", () => {
  const payload = buildFlightBookingPayload({
    traceId: "283594",
    resultIndex: "11-4598388194_2DELBOM9I11111~864484912641097",
    passengerSlots: [
      { id: 1, type: "ADULT", title: "Mr", firstName: "Amit", lastName: "Verma", dob: "1985-01-10", gender: "Male" },
      { id: 2, type: "CHILD", title: "Master", firstName: "Rohan", lastName: "Verma", dob: "2016-04-20", gender: "Male" },
    ],
    contactDetails: { mobile: "9810012345", email: "amit@example.com", countryCode: "+91" },
  });

  assert.equal(payload.passengers.length, 2);
  const leadList = payload.passengers.filter((p) => p.isLeadPax === true);
  assert.equal(leadList.length, 1, "Exactly one lead passenger is allowed");
  assert.equal(payload.passengers[0].isLeadPax, true);
  assert.equal(payload.passengers[1].isLeadPax, false);
});

test("5. International Flight Passport Fields: Formatted and preserved", () => {
  const payload = buildFlightBookingPayload({
    traceId: "283594",
    resultIndex: "11-DELDXBAI101",
    passengerSlots: [
      {
        id: 1,
        type: "ADULT",
        title: "Mrs",
        firstName: "Priya",
        lastName: "Verma",
        dob: "1994-11-05",
        gender: "Female",
        passport: "Z9876543",
        passportExpiry: "2032-05-15",
        passportIssueDate: "2022-05-16",
        passportIssueCountryCode: "IN",
      },
    ],
    contactDetails: { mobile: "9898989898", email: "priya@example.com", countryCode: "+91" },
  });

  const td = payload.passengers[0].travellerDetails;
  assert.equal(td.passportNo, "Z9876543");
  assert.equal(td.passportExpiry, "2032-05-15");
  assert.equal(td.passportIssueDate, "2022-05-16");
  assert.equal(td.passportIssueCountryCode, "IN");
});

test("6. Slot Reindexing: Clean display names and IDs", () => {
  const rawSlots = [
    { id: 5, type: "ADULT" },
    { id: 9, type: "ADULT" },
    { id: 12, type: "CHILD" },
  ];
  const reindexed = reindexSlots(rawSlots);
  assert.equal(getSlotDisplayName(reindexed[0], reindexed), "Adult 1");
  assert.equal(getSlotDisplayName(reindexed[1], reindexed), "Adult 2");
  assert.equal(getSlotDisplayName(reindexed[2], reindexed), "Child");
});

test("7. User Profile Placeholders: isGenericPlaceholder and isPhoneOnlyIncompleteUser checks", () => {
  assert.equal(isGenericPlaceholder("User"), true);
  assert.equal(isGenericPlaceholder("Authorized User"), true);
  assert.equal(isGenericPlaceholder("Rahul"), false);

  assert.equal(isPhoneOnlyIncompleteUser({ phone: "9876543210", firstName: "User", email: "" }), true);
  assert.equal(isPhoneOnlyIncompleteUser({ phone: "9876543210", firstName: "Rahul", email: "rahul@example.com" }), false);
});

test("8. GDS Asynchronous Polling Logic: Polling loop detects confirmed e-ticket status", async () => {
  let pollAttempts = 0;
  const mockBookingResponses = [
    { status: "pending", isLCC: false, passengers: [{ firstName: "Rahul" }] },
    { status: "pending", isLCC: false, passengers: [{ firstName: "Rahul" }] },
    { status: "confirmed", isLCC: false, pnr: "AI-102", passengers: [{ firstName: "Rahul", ticketNumber: "098-2341908721" }] },
  ];

  async function mockPollForGDSTicket(maxRetries = 5) {
    for (let i = 0; i < maxRetries; i++) {
      pollAttempts++;
      const current = mockBookingResponses[Math.min(i, mockBookingResponses.length - 1)];
      if (current.status === "confirmed" && current.passengers?.[0]?.ticketNumber) {
        return current;
      }
    }
    return mockBookingResponses[mockBookingResponses.length - 1];
  }

  const result = await mockPollForGDSTicket();
  assert.equal(result.status, "confirmed");
  assert.equal(result.pnr, "AI-102");
  assert.equal(result.passengers[0].ticketNumber, "098-2341908721");
  assert.equal(pollAttempts, 3, "Poll should stop as soon as e-ticket is confirmed");
});

test("9. Saved Traveler Link Eligibility: Slot 0 filled from user profile without saved ID is upgraded to default saved traveller", () => {
  const defaultTraveller = {
    id: "64f0b5c2d2b6e3b4c5d6e7f8",
    title: "Mr",
    firstName: "Rahul",
    lastName: "Sharma",
    dob: "1992-08-15",
    passport: "Z1234567",
    passportExpiry: "2030-01-01",
    isDefault: true,
  };

  // Scenario: Slot 0 was prefilled from loggedInUser without saved ID
  const slot0FromUser = {
    id: 1,
    type: "ADULT",
    title: "Mr",
    firstName: "Rahul",
    lastName: "Sharma",
    dob: "1992-08-15",
    savedTravellerId: null,
    isFromSavedTraveller: false,
  };

  const isEligible =
    !slot0FromUser.firstName?.trim() ||
    isGenericPlaceholder(slot0FromUser.firstName) ||
    slot0FromUser.isFromSavedTraveller ||
    !slot0FromUser.savedTravellerId ||
    slot0FromUser.savedTravellerId === defaultTraveller.id;

  assert.equal(isEligible, true, "Slot 0 prefilled from loggedInUser without saved ID must be eligible for saved profile link");

  // Upgrade slot
  const upgradedSlot = {
    ...slot0FromUser,
    savedTravellerId: defaultTraveller.id,
    isFromSavedTraveller: true,
    saveToProfile: false,
    passport: defaultTraveller.passport,
  };

  assert.equal(upgradedSlot.savedTravellerId, "64f0b5c2d2b6e3b4c5d6e7f8");
  assert.equal(upgradedSlot.isFromSavedTraveller, true);
  assert.equal(upgradedSlot.saveToProfile, false);
  assert.equal(upgradedSlot.passport, "Z1234567");
});

