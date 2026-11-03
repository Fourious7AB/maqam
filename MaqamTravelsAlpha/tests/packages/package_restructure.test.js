// tests/packages/package_restructure.test.js
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
require("dotenv").config();

const Package = require("../../modules/packages/models/package.model");
const Offer = require("../../modules/packages/offers/offer.model");
const TicketStock = require("../../modules/packages/stock/ticketStock.model");
const HotelStock = require("../../modules/packages/stock/hotelStock.model");
const Hotel = require("../../modules/hotels/hotelEntity.model");
const PackageBooking = require("../../modules/packages/models/packageBooking.model");
const packageService = require("../../modules/packages/core/package.service");
const packageBookingService = require("../../modules/packages/core/packageBooking.service");
const { validateCreatePackage } = require("../../modules/packages/core/package.validator");
require("../../modules/auth/auth.model");

describe("Package Module Restructure & Handover Verification Suite", () => {
  let adminUserId;
  let testCustomerId;
  let flightStockId;
  let hotelStock3StarId;
  let hotelStock5StarId;
  let desertCampStockId;
  let flightOfferId;
  let hotelOffer3StarId;
  let hotelOffer5StarId;
  let desertCampOfferId;
  let packageId;

  before(async () => {
    const mongoUri = process.env.MONGO_URI;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, { family: 4, serverSelectionTimeoutMS: 10000 });
    }

    // Clean up any obsolete stale index on hotels collection if present in test DB
    try {
      await Hotel.collection.dropIndex("srdvHotelId_1").catch(() => {});
    } catch (_) {}

    const User = require("../../modules/auth/auth.model");
    const adminUser = await User.create({
      firstName: "Test",
      lastName: "Admin",
      password: "Password123!",
      email: `admin_${Date.now()}@restructure.com`,
      phone: `9199${Math.floor(10000000 + Math.random() * 90000000)}`,
      role: "admin",
    });
    adminUserId = adminUser._id;
    testCustomerId = new mongoose.Types.ObjectId();

    // 1. Create TicketStock
    const flightStock = await TicketStock.create({
      airline: "IndiGo",
      flightNumber: "6E-TEST",
      departureDate: new Date(Date.now() + 86400000 * 10),
      arrivalDate: new Date(Date.now() + 86400000 * 10 + 14400000),
      origin: "DEL",
      destination: "DXB",
      pnr: "PNRTEST123",
      nameAdditionDeadline: new Date(Date.now() + 86400000 * 5),
      costPerUnit: 10000,
      units: [
        { status: "available" },
        { status: "available" },
        { status: "available" },
      ],
      createdBy: adminUserId,
    });
    flightStockId = flightStock._id;

    // 2. Create Hotels & HotelStocks
    const hotel3Star = await Hotel.create({
      name: "City Marina 3-Star",
      destination: "Dubai",
      address: "Dubai Marina",
      isActive: true,
      createdBy: adminUserId,
    });

    const hotelStock3Star = await HotelStock.create({
      hotelId: hotel3Star._id,
      hotelName: "City Marina 3-Star",
      destination: "Dubai",
      roomType: "Deluxe Room",
      checkIn: new Date(Date.now() + 86400000 * 10),
      checkOut: new Date(Date.now() + 86400000 * 15), // 5 nights
      pricePerNight: 2400, // 2400 * 5 nights = 12000 costPerUnit
      reservationRef: "RES3STAR789",
      nameAdditionDeadline: new Date(Date.now() + 86400000 * 5),
      reviewStatus: "approved",
      units: [
        { status: "available" },
        { status: "available" },
        { status: "available" },
      ],
      createdBy: adminUserId,
    });
    hotelStock3StarId = hotelStock3Star._id;

    const hotel5Star = await Hotel.create({
      name: "Luxury Marina 5-Star Resort",
      destination: "Dubai",
      address: "Palm Jumeirah",
      isActive: true,
      createdBy: adminUserId,
    });

    const hotelStock5Star = await HotelStock.create({
      hotelId: hotel5Star._id,
      hotelName: "Luxury Marina 5-Star Resort",
      destination: "Dubai",
      roomType: "Presidential Suite",
      checkIn: new Date(Date.now() + 86400000 * 10),
      checkOut: new Date(Date.now() + 86400000 * 15), // 5 nights
      pricePerNight: 3600, // 3600 * 5 nights = 18000 costPerUnit
      reservationRef: "RES5STAR999",
      nameAdditionDeadline: new Date(Date.now() + 86400000 * 5),
      reviewStatus: "approved",
      units: [
        { status: "available" },
        { status: "available" },
        { status: "available" },
      ],
      createdBy: adminUserId,
    });
    hotelStock5StarId = hotelStock5Star._id;

    const desertCampHotel = await Hotel.create({
      name: "Dubai Desert Bedouin Camp",
      destination: "Dubai",
      address: "Al Marmoom Desert",
      isActive: true,
      createdBy: adminUserId,
    });

    const desertCampStock = await HotelStock.create({
      hotelId: desertCampHotel._id,
      hotelName: "Dubai Desert Bedouin Camp",
      destination: "Dubai",
      roomType: "Safari Tent",
      checkIn: new Date(Date.now() + 86400000 * 12),
      checkOut: new Date(Date.now() + 86400000 * 13), // 1 night
      pricePerNight: 3000, // 3000 costPerUnit
      reservationRef: "RESDESERT111",
      nameAdditionDeadline: new Date(Date.now() + 86400000 * 5),
      reviewStatus: "approved",
      units: [
        { status: "available" },
        { status: "available" },
        { status: "available" },
      ],
      createdBy: adminUserId,
    });
    desertCampStockId = desertCampStock._id;

    // 3. Create Flight & Hotel Offers
    const flightOffer = await Offer.create({
      title: "IndiGo DEL-DXB Direct Flight",
      destination: "Dubai",
      itemType: "flight",
      flightRef: { stock: flightStockId, unitsPerBooking: 1 },
      sellPrice: 15000,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 30),
      isActive: true,
      createdBy: adminUserId,
    });
    flightOfferId = flightOffer._id;

    const hotelOffer3Star = await Offer.create({
      title: "City Marina 3-Star Stay",
      destination: "Dubai",
      itemType: "hotel",
      hotelRef: { stock: hotelStock3StarId, unitsPerBooking: 1 },
      sellPrice: 20000,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 30),
      isActive: true,
      createdBy: adminUserId,
    });
    hotelOffer3StarId = hotelOffer3Star._id;

    const hotelOffer5Star = await Offer.create({
      title: "Luxury Marina Resort 5-Star Stay",
      destination: "Dubai",
      itemType: "hotel",
      hotelRef: { stock: hotelStock5StarId, unitsPerBooking: 1 },
      sellPrice: 26000,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 30),
      isActive: true,
      createdBy: adminUserId,
    });
    hotelOffer5StarId = hotelOffer5Star._id;

    const desertCampOffer = await Offer.create({
      title: "Desert Safari Bedouin Night",
      destination: "Dubai",
      itemType: "hotel",
      hotelRef: { stock: desertCampStockId, unitsPerBooking: 1 },
      sellPrice: 5000,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 30),
      isActive: true,
      createdBy: adminUserId,
    });
    desertCampOfferId = desertCampOffer._id;
  });

  after(async () => {
    // Cleanup created test records
    await Package.deleteMany({ createdBy: adminUserId });
    await Offer.deleteMany({ createdBy: adminUserId });
    await TicketStock.deleteMany({ createdBy: adminUserId });
    await HotelStock.deleteMany({ createdBy: adminUserId });
    await Hotel.deleteMany({ createdBy: adminUserId });
    await PackageBooking.deleteMany({ userId: testCustomerId });
    await mongoose.connection.close();
  });

  it("TC-01: Admin creating package with only 1 component must fail min-2 guardrail", async () => {
    const invalidPayload = {
      title: "Invalid Dubai Solo Offer Package",
      destination: "Dubai",
      offerRefs: [{ offer: flightOfferId, unitsPerBooking: 1 }],
      createdBy: adminUserId,
    };

    assert.throws(
      () => validateCreatePackage(invalidPayload),
      /A Package must contain at least 2 Offer components/
    );

    await assert.rejects(
      async () => {
        await Package.create(invalidPayload);
      },
      /A Package must contain at least 2 Offer components/
    );
  });

  it("TC-02: Package with 3 Offers + 10% discount calculates correct base sellPrice and gross margins", async () => {
    const pkgDoc = await packageService.createPackage(
      {
        title: "Complete Dubai Getaway Experience",
        destination: "Dubai",
        offerRefs: [
          { offer: flightOfferId, unitsPerBooking: 1, isOptional: true, allowSwap: false },
          { offer: hotelOffer3StarId, unitsPerBooking: 1, isOptional: true, allowSwap: true },
          { offer: desertCampOfferId, unitsPerBooking: 1, isOptional: true, allowSwap: false },
        ],
        bundleDiscountPercentage: 10,
        itinerary: [
          { day: 1, title: "Arrival in Dubai", description: "Flight arrival & Hotel check-in" },
          { day: 2, title: "Desert Safari", description: "Explore dunes & desert camp" },
        ],
      },
      adminUserId
    );

    packageId = pkgDoc._id;

    // Unbundled sum = 15,000 (Flight) + 20,000 (3-Star Hotel) + 5,000 (Desert Camp) = 40,000
    // Sell price with 10% discount = 40,000 * 0.90 = 36,000
    assert.strictEqual(pkgDoc.sellPrice, 36000);

    const adminPkg = await packageService.getPackageByIdAdmin(packageId);
    // Cost Price = 10,000 (Flight stock) + 12,000 (Hotel stock) + 3,000 (Camp stock) = 25,000
    assert.strictEqual(adminPkg.totalCostPrice, 25000);
    // Gross Profit = 36,000 - 25,000 = 11,000
    assert.strictEqual(adminPkg.grossProfit, 11000);
    // Profit Margin % = (11,000 / 36,000) * 100 = 30.56%
    assert.strictEqual(adminPkg.profitMarginPercentage, 30.56);
  });

  it("TC-03: User quote preview opting out of 1 optional item (Desert Camp) deducts item retail price", async () => {
    const quote = await packageService.calculateCustomQuote(packageId, {
      quantity: 1,
      excludedOfferIds: [desertCampOfferId],
    });

    assert.strictEqual(quote.basePackageSellPrice, 36000);
    assert.strictEqual(quote.deductions, 5000);
    assert.strictEqual(quote.swapDeltas, 0);
    // Final price = 36,000 - 5,000 = 31,000
    assert.strictEqual(quote.finalSellPrice, 31000);
    assert.strictEqual(quote.totalAmount, 31000);
    assert.strictEqual(quote.activeComponentsCount, 2);
  });

  it("TC-04: User opt-out leaving <2 active components fails with 400 error", async () => {
    await assert.rejects(
      async () => {
        await packageService.calculateCustomQuote(packageId, {
          quantity: 1,
          excludedOfferIds: [hotelOffer3StarId, desertCampOfferId],
        });
      },
      /A Package must contain at least 2 Offer components/
    );
  });

  it("TC-05: User hotel swap (3-star to 5-star luxury hotel) applies exact retail delta without inflating discount", async () => {
    const quote = await packageService.calculateCustomQuote(packageId, {
      quantity: 1,
      swappedOffers: [
        {
          originalOfferId: hotelOffer3StarId,
          replacementOfferId: hotelOffer5StarId,
        },
      ],
    });

    // Retail delta = 26,000 - 20,000 = +6,000
    assert.strictEqual(quote.basePackageSellPrice, 36000);
    assert.strictEqual(quote.deductions, 0);
    assert.strictEqual(quote.swapDeltas, 6000);
    // Final price = 36,000 + 6,000 = 42,000
    assert.strictEqual(quote.finalSellPrice, 42000);
    assert.strictEqual(quote.totalAmount, 42000);
  });

  it("TC-06: Customized package booking with swapped offer locks stock units", async () => {
    const travellerId = new mongoose.Types.ObjectId();

    const bookingResult = await packageBookingService.createBooking({
      userId: testCustomerId,
      packageId,
      travellers: [
        {
          travellerId,
          isLead: true,
        },
      ],
      quantity: 1,
      swappedOffers: [
        {
          originalOfferId: hotelOffer3StarId,
          replacementOfferId: hotelOffer5StarId,
        },
      ],
    });

    assert.strictEqual(bookingResult.status, "pending");
    assert.strictEqual(bookingResult.totalAmount, 42000);
    assert.strictEqual(bookingResult.claimedUnits.length, 3);

    // Verify 1 seat assigned in TicketStock
    const flightStockAfter = await TicketStock.findById(flightStockId);
    const assignedSeats = flightStockAfter.units.filter((u) => u.status === "assigned");
    assert.strictEqual(assignedSeats.length, 1);

    // Verify 1 room assigned in 5-star HotelStock
    const hotel5StarAfter = await HotelStock.findById(hotelStock5StarId);
    const assignedRooms = hotel5StarAfter.units.filter((u) => u.status === "assigned");
    assert.strictEqual(assignedRooms.length, 1);

    // Verify 1 unit assigned in Desert Camp HotelStock
    const desertCampAfter = await HotelStock.findById(desertCampStockId);
    const assignedCamps = desertCampAfter.units.filter((u) => u.status === "assigned");
    assert.strictEqual(assignedCamps.length, 1);

    // Test CRM Agent assignment
    const assignedBooking = await packageBookingService.assignPackageBookingAgent(
      bookingResult.bookingId,
      adminUserId
    );
    assert.strictEqual(String(assignedBooking.assignedTo._id), String(adminUserId));
  });

  it("TC-07: Booking cancellation releases claimed stock units back to available", async () => {
    const activeBooking = await PackageBooking.findOne({
      userId: testCustomerId,
      status: "pending",
    });
    assert.ok(activeBooking);

    const cancelledBooking = await packageBookingService.cancelBooking(
      activeBooking._id,
      testCustomerId,
      "Customer requested schedule change"
    );

    assert.strictEqual(cancelledBooking.status, "cancelled");

    // Verify seat released in TicketStock
    const flightStockAfter = await TicketStock.findById(flightStockId);
    const availableSeats = flightStockAfter.units.filter((u) => u.status === "available");
    assert.strictEqual(availableSeats.length, 3);

    // Verify room released in 5-star HotelStock
    const hotel5StarAfter = await HotelStock.findById(hotelStock5StarId);
    const availableRooms = hotel5StarAfter.units.filter((u) => u.status === "available");
    assert.strictEqual(availableRooms.length, 3);

    // Verify camp room released in Desert Camp HotelStock
    const desertCampAfter = await HotelStock.findById(desertCampStockId);
    const availableCamps = desertCampAfter.units.filter((u) => u.status === "available");
    assert.strictEqual(availableCamps.length, 3);
  });
});
