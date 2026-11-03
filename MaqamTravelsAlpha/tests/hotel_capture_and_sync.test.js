const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const mapper = require("../providers/hotels/srdv/srdv-hotel.mapper");
const { buildMasterBookingDetails } = require("../modules/payments/bookingSync");
const { getModelName } = require("../modules/payments/bookingResolver");
const { filterBookingResult, filterBookingsList } = require("../modules/hotels/hotel.controller");
const { withLock } = require("../modules/payments/distributedLock");

test("SRDV hotel mapper recognizes HotelBookingStatus: 'Confirmed'", () => {
  const rawResponse = {
    BookResult: {
      Error: { ErrorCode: 0, ErrorMessage: "" },
      VoucherStatus: false,
      ResponseStatus: 1,
      TraceId: 34072,
      Status: "Confirmed",
      HotelBookingStatus: "Confirmed",
      ConfirmationNo: "TJS206501794071",
      BookingRefNo: "TJS206501794071",
      BookingId: 685,
    },
  };

  const normalized = mapper.mapBookResponse(rawResponse);
  assert.equal(normalized.status, "confirmed");
  assert.equal(normalized.providerBookingId, "685");
  assert.equal(normalized.confirmationNo, "TJS206501794071");
  assert.equal(normalized.bookingRefNo, "TJS206501794071");
  assert.equal(normalized.voucherStatus, true);
});

test("SRDV hotel mapper recognizes VoucherStatus: true as confirmed", () => {
  const rawResponse = {
    BookResult: {
      VoucherStatus: true,
      BookingId: 1024,
      ConfirmationNo: "CONF-999",
    },
  };

  const normalized = mapper.mapBookResponse(rawResponse);
  assert.equal(normalized.status, "confirmed");
  assert.equal(normalized.providerBookingId, "1024");
  assert.equal(normalized.confirmationNo, "CONF-999");
});

test("SRDV hotel mapper recognizes pending status", () => {
  const rawResponse = {
    BookResult: {
      BookingStatus: "Pending",
      BookingId: 555,
      BookingRefNo: "TJS555",
    },
  };

  const normalized = mapper.mapBookResponse(rawResponse);
  assert.equal(normalized.status, "pending");
  assert.equal(normalized.providerBookingId, "555");
});

test("SRDV hotel mapper handles mapBookingDetailResponse with HotelBookingStatus", () => {
  const rawResponse = {
    BookingDetailResult: {
      HotelBookingStatus: "Confirmed",
      BookingId: 777,
      ConfirmationNo: "CONF-777",
    },
  };

  const normalized = mapper.mapBookingDetailResponse(rawResponse);
  assert.equal(normalized.status, "confirmed");
  assert.equal(normalized.providerBookingId, "777");
  assert.equal(normalized.confirmationNo, "CONF-777");
});

test("buildMasterBookingDetails constructs complete hotel details including roomName and hotelName", () => {
  const mockBooking = {
    _id: "6ae8dc653f53a262b004314c",
    hotelName: "Swissotel Al Maqam Makkah",
    destination: "Makkah",
    checkIn: new Date("2026-12-01"),
    checkOut: new Date("2026-12-06"),
    roomName: "Junior Suite Kaaba View",
    totalPrice: 45000,
    currency: "SAR",
    guests: [
      { firstName: "Farhan", lastName: "Ahmed", passengerType: "Adult" },
      { firstName: "Ayesha", lastName: "Ahmed", passengerType: "Adult" },
    ],
  };

  const mockPayment = {
    amount: 45000,
    currency: "SAR",
  };

  const details = buildMasterBookingDetails(mockBooking, "hotel", mockPayment);
  assert.equal(details.hotelName, "Swissotel Al Maqam Makkah");
  assert.equal(details.roomName, "Junior Suite Kaaba View");
  assert.equal(details.destination, "Swissotel Al Maqam Makkah, Makkah");
  assert.equal(details.passengers, 2);
  assert.equal(details.totalPrice, 45000);
  assert.equal(details.currency, "SAR");
  assert.ok(details.departureDate instanceof Date);
  assert.ok(details.returnDate instanceof Date);
});

test("getModelName maps 'hotel' to 'HotelBooking'", () => {
  assert.equal(getModelName("hotel"), "HotelBooking");
});

test("filterBookingResult includes public hotel fields for frontend", () => {
  const mockHotelBookingDoc = {
    _id: new mongoose.Types.ObjectId("6ae8dc653f53a262b004314c"),
    hotelName: "Grand Hyatt Dubai",
    destination: "Dubai",
    checkIn: new Date("2026-11-10"),
    checkOut: new Date("2026-11-15"),
    roomName: "Deluxe King Room",
    roomSnapshots: [{ roomName: "Deluxe King Room" }],
    guests: [{ firstName: "Sameer", lastName: "Khan" }],
    totalPrice: 32000,
    customerTotalMinor: 3200000,
    currency: "INR",
    status: "confirmed",
    providerBookingId: "98765",
    bookingRefNo: "TJS-DXB-98765",
    confirmationNo: "CONF-98765",
    voucherStatus: true,
    paymentId: new mongoose.Types.ObjectId("6ae8dc683f53a262b004315a"),
    createdAt: new Date(),
  };

  const filtered = filterBookingResult(mockHotelBookingDoc, false);
  assert.equal(filtered.id, "6ae8dc653f53a262b004314c");
  assert.equal(filtered.hotelName, "Grand Hyatt Dubai");
  assert.equal(filtered.roomName, "Deluxe King Room");
  assert.equal(filtered.destination, "Dubai");
  assert.equal(filtered.voucherRef, "98765");
  assert.equal(filtered.status, "CONFIRMED");
  assert.equal(filtered.rawStatus, "confirmed");
  assert.equal(filtered.paymentStatus, "PAID");
  assert.equal(filtered.paymentId.toString(), "6ae8dc683f53a262b004315a");
});

test("filterBookingsList includes public hotel fields for list endpoint", () => {
  const mockHotelBookingDoc = {
    _id: new mongoose.Types.ObjectId("6ae8dc653f53a262b004314c"),
    hotelName: "Grand Hyatt Dubai",
    destination: "Dubai",
    checkIn: new Date("2026-11-10"),
    checkOut: new Date("2026-11-15"),
    roomName: "Deluxe King Room",
    roomSnapshots: [{ roomName: "Deluxe King Room" }],
    guests: [{ firstName: "Sameer", lastName: "Khan" }],
    totalPrice: 32000,
    customerTotalMinor: 3200000,
    currency: "INR",
    status: "payment_received",
    providerBookingId: "98765",
    bookingRefNo: "TJS-DXB-98765",
    confirmationNo: "CONF-98765",
    voucherStatus: false,
    paymentId: new mongoose.Types.ObjectId("6ae8dc683f53a262b004315a"),
    createdAt: new Date(),
  };

  const filteredList = filterBookingsList([mockHotelBookingDoc], false);
  assert.equal(filteredList.length, 1);
  assert.equal(filteredList[0].id, "6ae8dc653f53a262b004314c");
  assert.equal(filteredList[0].hotelName, "Grand Hyatt Dubai");
  assert.equal(filteredList[0].status, "PAYMENT_RECEIVED");
  assert.equal(filteredList[0].rawStatus, "payment_received");
  assert.equal(filteredList[0].voucherRef, "98765");
});

test("MasterBooking (Booking) schema supports hotelName and roomName in details", () => {
  const Booking = require("../modules/bookings/booking.model");
  const detailsPaths = Booking.schema.paths;
  assert.ok(detailsPaths["details.hotelName"], "details.hotelName must exist in Booking schema");
  assert.ok(detailsPaths["details.roomName"], "details.roomName must exist in Booking schema");
  assert.ok(detailsPaths["details.destination"], "details.destination must exist in Booking schema");
});

test("Hotel deduplication prevents duplicate display when domain hotel and master hotel share itemId", () => {
  const domainHotels = [
    {
      _id: "6ae8dc653f53a262b004314c",
      hotelName: "Swissotel Al Maqam Makkah",
      status: "confirmed",
      bookingSource: "SRDV_LIVE",
    },
  ];

  const masterHotels = [
    {
      _id: "6ae8dc777777777777777777", // Different MasterBooking ObjectId
      itemId: "6ae8dc653f53a262b004314c", // References the exact same domain hotel
      hotelName: "Swissotel Al Maqam Makkah",
      status: "confirmed",
      bookingSource: "INHOUSE_MASTER",
    },
  ];

  // Emulate Bookings.jsx deduplication algorithm
  const mergedHotels = [...domainHotels];
  const seenHotelIds = new Set();
  domainHotels.forEach((h) => {
    if (h._id) seenHotelIds.add(String(h._id));
    if (h.id) seenHotelIds.add(String(h.id));
    if (h.bookingId) seenHotelIds.add(String(h.bookingId));
  });
  for (const mh of masterHotels) {
    const id = String(mh._id || mh.id || mh.bookingId);
    const itemId = mh.itemId ? String(mh.itemId) : null;
    if (id && !seenHotelIds.has(id) && (!itemId || !seenHotelIds.has(itemId))) {
      seenHotelIds.add(id);
      if (itemId) seenHotelIds.add(itemId);
      mergedHotels.push(mh);
    }
  }

  // Must only contain 1 booking (the live supplier domain hotel), NOT 2 duplicates
  assert.equal(mergedHotels.length, 1);
  assert.equal(mergedHotels[0].bookingSource, "SRDV_LIVE");
});

test("PaymentSuccessPage refund guard does not falsely trigger on paymentStatus 'PAID' or 'COMPLETED'", () => {
  const bookingDetails = {
    status: "CONFIRMED",
    rawStatus: "confirmed",
    paymentStatus: "PAID",
    voucherRef: "TJS206501794071",
  };

  const rawStatus = (
    bookingDetails?.rawStatus ||
    bookingDetails?.status ||
    bookingDetails?.bookingStatus ||
    ""
  ).toLowerCase();

  const rawRefundStatus = (
    bookingDetails?.refundStatus ||
    bookingDetails?.refund?.status ||
    ""
  ).toLowerCase();

  const isRefundInitiated =
    rawRefundStatus === "initiated" ||
    rawRefundStatus === "refund_pending" ||
    rawRefundStatus === "refund_initiated" ||
    rawRefundStatus === "refunded" ||
    rawStatus === "refund_pending" ||
    rawStatus === "refunded";

  const isConfirmedOrActive =
    rawStatus === "confirmed" ||
    rawStatus === "completed" ||
    rawStatus === "ticketed" ||
    rawStatus === "paid" ||
    rawStatus === "payment_received" ||
    Boolean(bookingDetails?.pnr || bookingDetails?.confirmationNo || bookingDetails?.voucherRef);

  const isSupplierFailed = !isConfirmedOrActive && rawStatus === "failed";
  const hasSupplierRefundConflict = isSupplierFailed || isRefundInitiated;

  assert.equal(isConfirmedOrActive, true);
  assert.equal(isRefundInitiated, false);
  assert.equal(hasSupplierRefundConflict, false);
});

