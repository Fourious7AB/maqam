// tests/packages/package_guide_booking.test.js
const { describe, it, before } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
require("dotenv").config();

const Package = require("../../modules/packages/models/package.model");
const Offer = require("../../modules/packages/offers/offer.model");
const TicketStock = require("../../modules/packages/stock/ticketStock.model");
const HotelStock = require("../../modules/packages/stock/hotelStock.model");
const Hotel = require("../../modules/hotels/hotelEntity.model");
const PackageBooking = require("../../modules/packages/models/packageBooking.model");
const Payment = require("../../modules/payments/payment.model");
const MasterBooking = require("../../modules/bookings/booking.model");
const { Guide } = require("../../modules/guide/guide.model");
const packageService = require("../../modules/packages/core/package.service");
const packageBookingService = require("../../modules/packages/core/packageBooking.service");
require("../../modules/auth/auth.model");

describe("Package Guide Selection & Pricing Verification Suite", () => {
  let adminUserId;
  let testCustomerId;
  let flightStockId;
  let hotelStockId;
  let flightOfferId;
  let hotelOfferId;
  let packageWithGuideId;
  let sampleGuideId;

  before(async () => {
    const mongoUri = process.env.MONGO_URI;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, {
        family: 4,
        serverSelectionTimeoutMS: 10000,
      });
    }

    try {
      await Hotel.collection.dropIndex("srdvHotelId_1").catch(() => {});
    } catch (_) {}

    const User = require("../../modules/auth/auth.model");
    const adminUser = await User.create({
      firstName: "GuideTest",
      lastName: "Admin",
      password: "Password123!",
      email: `admin_guide_${Date.now()}@restructure.com`,
      phone: `9199${Math.floor(10000000 + Math.random() * 90000000)}`,
      role: "admin",
    });
    adminUserId = adminUser._id;
    testCustomerId = new mongoose.Types.ObjectId();

    // 1. Create TicketStock
    const flightStock = await TicketStock.create({
      airline: "Saudia",
      flightNumber: "SV-TEST",
      departureDate: new Date(Date.now() + 86400000 * 10),
      arrivalDate: new Date(Date.now() + 86400000 * 10 + 14400000),
      origin: "JED",
      destination: "MED",
      pnr: "PNRGUIDE123",
      nameAdditionDeadline: new Date(Date.now() + 86400000 * 5),
      costPerUnit: 15000,
      units: [
        { status: "available" },
        { status: "available" },
        { status: "available" },
        { status: "available" },
        { status: "available" },
      ],
      createdBy: adminUserId,
    });
    flightStockId = flightStock._id;

    // 2. Create Hotel & HotelStock
    const hotel = await Hotel.create({
      name: "Makkah Royal Palace",
      destination: "Makkah",
      address: "Ibrahim Al Khalil St",
      isActive: true,
      createdBy: adminUserId,
    });

    const hotelStock = await HotelStock.create({
      hotelId: hotel._id,
      hotelName: "Makkah Royal Palace",
      destination: "Makkah",
      roomType: "Deluxe Kaaba View",
      checkIn: new Date(Date.now() + 86400000 * 10),
      checkOut: new Date(Date.now() + 86400000 * 15),
      pricePerNight: 3000,
      reservationRef: "RESROYAL123",
      nameAdditionDeadline: new Date(Date.now() + 86400000 * 5),
      reviewStatus: "approved",
      units: [
        { status: "available" },
        { status: "available" },
        { status: "available" },
        { status: "available" },
        { status: "available" },
      ],
      createdBy: adminUserId,
    });
    hotelStockId = hotelStock._id;

    // 3. Create Retail Offers
    const flightOffer = await Offer.create({
      title: "Saudia Direct Flight",
      destination: "Makkah",
      itemType: "flight",
      sellPrice: 20000,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 30),
      isActive: true,
      flightRef: {
        stock: flightStockId,
        unitsPerBooking: 1,
      },
      createdBy: adminUserId,
    });
    flightOfferId = flightOffer._id;

    const hotelOffer = await Offer.create({
      title: "Makkah Royal Palace 5-Night Stay",
      destination: "Makkah",
      itemType: "hotel",
      sellPrice: 25000,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 30),
      isActive: true,
      hotelRef: {
        stock: hotelStockId,
        unitsPerBooking: 1,
      },
      createdBy: adminUserId,
    });
    hotelOfferId = hotelOffer._id;

    // 4. Create Guide Document in Guide catalog
    const sampleGuide = await Guide.create({
      fullName: "Sheikh Ahmad Al-Makki",
      phone: `+96650${Math.floor(1000000 + Math.random() * 9000000)}`,
      city: "Makkah",
      category: "Historical & Religious Tour",
      languages: ["Arabic", "English", "Urdu"],
      hourlyRate: 150,
      fullDayRate: 1200,
      status: "active",
      createdBy: adminUserId,
    });
    sampleGuideId = sampleGuide._id;

    // 5. Create Package with Guide Enabled
    // Base unbundled sum: 20000 + 25000 = 45000
    // Bundle discount: 10% -> 45000 * 0.9 = 40500 base offers price
    // Guide price: 1500 -> package final sellPrice = 42000
    const pkg = await Package.create({
      title: "Premium Umrah Spiritual Journey",
      destination: "Makkah",
      sellPrice: 42000,
      bundleDiscountPercentage: 10,
      guideActive: true,
      guideLocation: "Makkah",
      guidePrice: 1500,
      offerRefs: [
        { offer: flightOfferId, unitsPerBooking: 1, isOptional: false },
        { offer: hotelOfferId, unitsPerBooking: 1, isOptional: false },
      ],
      createdBy: adminUserId,
    });
    packageWithGuideId = pkg._id;
  });

  it("TC-01: calculateCustomQuote adds default package guide price when includeGuide is true", async () => {
    const quote = await packageService.calculateCustomQuote(
      packageWithGuideId,
      {
        quantity: 1,
        includeGuide: true,
      },
    );

    // Base package sellPrice = 40500, guidePrice = 1500 -> total = 42000
    assert.strictEqual(quote.basePackageSellPrice, 40500);
    assert.strictEqual(quote.guidePrice, 1500);
    assert.strictEqual(quote.finalSellPrice, 42000);
    assert.strictEqual(quote.totalAmount, 42000);
    assert.strictEqual(quote.guideSelected, "Guide (Makkah)");
    assert.deepStrictEqual(quote.guideLocation, ["Makkah"]);

    // Check itemized breakdown contains guide_tour
    const guideItem = quote.items.find((item) => item.type === "guide_tour");
    assert.ok(guideItem, "Quote items should include a guide_tour item");
    assert.strictEqual(guideItem.retailPrice, 1500);
  });

  it("TC-02: calculateCustomQuote respects custom guide selection and custom price override", async () => {
    const quote = await packageService.calculateCustomQuote(
      packageWithGuideId,
      {
        quantity: 2,
        guideSelected: "Dr. Tariq Umrah Guide",
        guideLocation: ["Makkah", "Madinah"],
        guidePrice: 2000,
      },
    );

    // Base package sellPrice = 40500 + guidePrice = 2000 -> finalSellPrice = 42500
    // Total for quantity 2 = 42500 * 2 = 85000
    assert.strictEqual(quote.guidePrice, 2000);
    assert.strictEqual(quote.guideSelected, "Dr. Tariq Umrah Guide");
    assert.deepStrictEqual(quote.guideLocation, ["Makkah", "Madinah"]);
    assert.strictEqual(quote.finalSellPrice, 42500);
    assert.strictEqual(quote.totalAmount, 85000);
  });

  it("TC-03: calculateCustomQuote resolves Guide catalog profile via guideId and includes full details", async () => {
    const quote = await packageService.calculateCustomQuote(
      packageWithGuideId,
      {
        quantity: 1,
        guideId: sampleGuideId.toString(),
      },
    );

    // Sample guide fullDayRate is 1200
    assert.strictEqual(quote.guidePrice, 1200);
    assert.strictEqual(quote.guideSelected, "Sheikh Ahmad Al-Makki");
    assert.deepStrictEqual(quote.guideLocation, ["Makkah"]);
    assert.strictEqual(quote.finalSellPrice, 40500 + 1200);
    assert.ok(quote.guideDetails, "Should return guideDetails object");
    assert.strictEqual(quote.guideDetails.fullName, "Sheikh Ahmad Al-Makki");
  });

  it("TC-04: Admin books package for customer with guide option and verifies total amount & guide fields", async () => {
    const directBooking = await packageBookingService.bookPackageForCustomer({
      customerId: testCustomerId,
      packageId: packageWithGuideId,
      quantity: 1,
      travellers: [
        {
          travellerId: new mongoose.Types.ObjectId(),
          isLead: true,
        },
      ],
      guideSelected: "Sheikh Ahmad Al-Makki",
      guideLocation: ["Makkah"],
      guidePrice: 1500,
      includeGuide: true,
      agentId: adminUserId,
      payment: {
        method: "bank_transfer",
        referenceNumber: "TXN-GUIDE-TEST-001",
        notes: "Direct booking with spiritual guide included",
      },
    });

    const { booking, payment, masterBooking } = directBooking;

    // 1. Verify PackageBooking document
    assert.strictEqual(booking.status, "confirmed");
    assert.strictEqual(booking.guideSelected, "Sheikh Ahmad Al-Makki");
    assert.deepStrictEqual(booking.guideLocation, ["Makkah"]);
    assert.strictEqual(booking.guidePrice, 1500);
    assert.strictEqual(booking.totalAmount, 42000); // 40500 + 1500
    assert.strictEqual(booking.packageSnapshot.guidePrice, 1500);
    assert.strictEqual(
      booking.packageSnapshot.guideSelected,
      "Sheikh Ahmad Al-Makki",
    );

    // 2. Verify Payment record
    assert.strictEqual(payment.status, "paid");
    assert.strictEqual(payment.amount, 42000);
    assert.strictEqual(payment.paymentMethod, "bank_transfer");

    // 3. Verify MasterBooking record
    assert.strictEqual(masterBooking.status, "confirmed");
    assert.strictEqual(masterBooking.details.totalPrice, 42000);

    // 4. Verify claimed stock units are marked as 'used'
    const updatedTicketStock = await TicketStock.findById(flightStockId);
    const updatedHotelStock = await HotelStock.findById(hotelStockId);

    const usedTicketUnits = updatedTicketStock.units.filter(
      (u) => u.status === "used",
    );
    const usedHotelUnits = updatedHotelStock.units.filter(
      (u) => u.status === "used",
    );

    assert.strictEqual(usedTicketUnits.length, 1);
    assert.strictEqual(usedHotelUnits.length, 1);
  });

  it("TC-05: Admin package create time adds guide price to package final sellPrice", async () => {
    // Flight (20000) + Hotel (25000) = 45000. 10% discount = 40500.
    // With guidePrice = 1500, final package sellPrice should be 40500 + 1500 = 42000.
    const createdPkg = await packageService.createPackage(
      {
        title: "Test Package Auto Added Guide Price",
        destination: "Makkah",
        offerRefs: [
          { offer: flightOfferId, unitsPerBooking: 1, isOptional: false },
          { offer: hotelOfferId, unitsPerBooking: 1, isOptional: false },
        ],
        bundleDiscountPercentage: 10,
        includeGuide: true,
        guidePrice: 1500,
        guideLocation: "Makkah",
      },
      adminUserId,
    );

    assert.strictEqual(createdPkg.guideActive, true);
    assert.strictEqual(createdPkg.guidePrice, 1500);
    assert.strictEqual(createdPkg.sellPrice, 42000); // 40500 offers + 1500 guide
  });
});
