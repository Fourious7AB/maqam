// tests/packages/crm_direct_booking_and_stock.test.js
//
// Integration Test Suite for Phase 3: Package Operations & Direct CRM Booking
// Tests:
// 1. Direct CRM package booking for walk-in customer via Bank Transfer
// 2. Stock unit allocation and automatic transition to "used"
// 3. Offline Payment & Master Booking record creation
// 4. Listing package bookings with filters (page, status, etc.)
// 5. CRM editing travel dates, contact details, and operational remark on confirmed booking
// 6. Strict Guardrail check: Disallows structural component additions/removals/swaps on confirmed booking
// 7. Admin cancellation: releases claimed stock units back to "available"

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
const Payment = require("../../modules/payments/payment.model");
const MasterBooking = require("../../modules/bookings/booking.model");
const Traveller = require("../../modules/account/traveller.model");
const User = require("../../modules/auth/auth.model");

const stockService = require("../../modules/packages/stock/stock.service");
const offerService = require("../../modules/packages/offers/offer.service");
const packageService = require("../../modules/packages/core/package.service");
const packageBookingService = require("../../modules/packages/core/packageBooking.service");

describe("Phase 3: Package Operations & Direct CRM Booking Suite", () => {
  let adminUserId;
  let customerUserId;
  let travellerProfileId;
  let testHotelId;
  let flightStockId;
  let hotelStockId;
  let flightOfferId;
  let hotelOfferId;
  let testPackageId;
  let confirmedBookingId;

  before(async () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, { family: 4, serverSelectionTimeoutMS: 10000 });
    }

    // 1. Create Admin & Customer Users
    const adminUser = await User.create({
      firstName: "Pkg",
      lastName: "Admin",
      password: "Password123!",
      email: `pkgadmin_${Date.now()}@agency.com`,
      phone: `9199${Math.floor(10000000 + Math.random() * 90000000)}`,
      role: "admin",
    });
    adminUserId = adminUser._id;

    const customerUser = await User.create({
      firstName: "WalkIn",
      lastName: "PkgBuyer",
      password: "Password123!",
      email: `pkgbuyer_${Date.now()}@gmail.com`,
      phone: `9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      role: "customer",
    });
    customerUserId = customerUser._id;

    // 2. Create Traveller Profile for Customer
    const traveller = await Traveller.create({
      userId: customerUserId,
      passengerType: "Adult",
      title: "Mr",
      firstName: "Amit",
      lastName: "Sharma",
      gender: "Male",
      dateOfBirth: new Date("1992-06-15"),
      email: "amit.sharma@example.com",
      phone: "9876543210",
      passportNo: "Z1234567",
      nationality: "Indian",
      isDefault: true,
    });
    travellerProfileId = traveller._id;

    // 3. Create Hotel Entity
    const hotel = await Hotel.create({
      name: "Burj Al Arab Luxury Suites",
      destination: "Dubai",
      address: "Jumeirah Beach Road, Dubai, UAE",
      stars: 5,
      rating: 4.9,
    });
    testHotelId = hotel._id;

    // 4. Create Flight Stock (TicketStock)
    const flightStock = await stockService.createFlightStock(
      {
        airline: "Emirates",
        flightNumber: "EK-501",
        origin: "BOM",
        destination: "DXB",
        departureDate: new Date(Date.now() + 86400000 * 20),
        pnr: "EKOFFER99",
        nameAdditionDeadline: new Date(Date.now() + 86400000 * 15),
        costPerUnit: 15000,
        totalUnits: 10,
      },
      adminUserId
    );
    flightStockId = flightStock._id;

    // 5. Create Hotel Stock (HotelStock)
    const hotelStock = await stockService.createHotelStock(
      {
        hotelId: testHotelId,
        roomType: "Deluxe Sea View Suite",
        checkIn: new Date(Date.now() + 86400000 * 20),
        checkOut: new Date(Date.now() + 86400000 * 23),
        pricePerNight: 20000,
        meals: ["breakfast"],
        reservationRef: "BURJ-REF-777",
        nameAdditionDeadline: new Date(Date.now() + 86400000 * 15),
        totalUnits: 10,
      },
      adminUserId
    );
    hotelStockId = hotelStock._id;

    // 6. Create Retail Flight Offer
    const flightOffer = await offerService.createOffer(
      {
        title: "Emirates Deluxe BOM-DXB Flight Deal",
        destination: "Dubai",
        itemType: "flight",
        sellPrice: 20000,
        startDate: new Date(Date.now() + 86400000 * 20),
        endDate: new Date(Date.now() + 86400000 * 20 + 14400000),
        flightRef: {
          stock: flightStockId,
          unitsPerBooking: 1,
        },
      },
      adminUserId
    );
    flightOfferId = flightOffer._id;

    // 7. Create Retail Hotel Offer
    const hotelOffer = await offerService.createOffer(
      {
        title: "Burj Al Arab 3-Night Stay Deal",
        destination: "Dubai",
        itemType: "hotel",
        sellPrice: 30000,
        startDate: new Date(Date.now() + 86400000 * 20),
        endDate: new Date(Date.now() + 86400000 * 23),
        hotelRef: {
          stock: hotelStockId,
          unitsPerBooking: 1,
        },
      },
      adminUserId
    );
    hotelOfferId = hotelOffer._id;

    // 8. Create Package Bundle with 2 Offers
    const pkg = await Package.create({
      title: "Royal Dubai Ultimate Experience",
      destination: "Dubai",
      sellPrice: 45000, // 50000 default retail - 10% discount
      bundleDiscountPercentage: 10,
      offerRefs: [
        { offer: flightOfferId, unitsPerBooking: 1, isOptional: false, isDefaultSelected: true },
        { offer: hotelOfferId, unitsPerBooking: 1, isOptional: true, isDefaultSelected: true },
      ],
      inclusions: ["Roundtrip flights", "5-Star Hotel Stay", "Airport Transfers"],
      createdBy: adminUserId,
      isActive: true,
      isPublic: true,
    });
    testPackageId = pkg._id;
  });

  after(async () => {
    // Cleanup created test records
    await PackageBooking.deleteMany({ userId: customerUserId });
    await Payment.deleteMany({ userId: customerUserId });
    await MasterBooking.deleteMany({ userId: customerUserId });
    await Package.deleteMany({ _id: testPackageId });
    await Offer.deleteMany({ _id: { $in: [flightOfferId, hotelOfferId] } });
    await TicketStock.deleteMany({ _id: flightStockId });
    await HotelStock.deleteMany({ _id: hotelStockId });
    await Hotel.deleteMany({ _id: testHotelId });
    await Traveller.deleteMany({ userId: customerUserId });
    await User.deleteMany({ _id: { $in: [adminUserId, customerUserId] } });
  });

  it("PKG-01: Admin executes Direct Package Booking for Customer via Bank Transfer", async () => {
    const result = await packageBookingService.bookPackageForCustomer({
      customerId: customerUserId,
      packageId: testPackageId,
      quantity: 1,
      travellers: [
        {
          travellerId: travellerProfileId,
          isLead: true,
        },
      ],
      travelDates: {
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-05"),
      },
      contactDetails: {
        email: "customer.walkin@example.com",
        phone: "+91-9876543210",
        emergencyContact: "+91-9811122233",
      },
      payment: {
        method: "bank_transfer",
        referenceNumber: "NEFT-PKG-20260904-789",
        notes: "Paid in full at counter via NEFT reference",
      },
      agentId: adminUserId,
    });

    assert.ok(result.booking, "Booking should be created");
    assert.strictEqual(result.booking.status, "confirmed");
    assert.strictEqual(String(result.booking.userId), String(customerUserId));
    assert.strictEqual(String(result.booking.assignedTo), String(adminUserId));
    assert.strictEqual(result.booking.contactDetails.email, "customer.walkin@example.com");

    confirmedBookingId = result.booking._id;

    // Check Payment
    assert.ok(result.payment, "Payment record should be created");
    assert.strictEqual(result.payment.status, "paid");
    assert.strictEqual(result.payment.paymentMethod, "bank_transfer");
    assert.strictEqual(result.payment.bookingModel, "PackageBooking");
    assert.strictEqual(result.payment.gatewayData.transactionId, "NEFT-PKG-20260904-789");
    assert.strictEqual(result.payment.gatewayData.raw.referenceNumber, "NEFT-PKG-20260904-789");

    // Check Master Booking
    assert.ok(result.masterBooking, "MasterBooking should be created");
    assert.strictEqual(result.masterBooking.status, "confirmed");
    assert.strictEqual(result.masterBooking.bookingType, "package");

    // Verify stock units transitioned to 'used'
    const flightStockDoc = await TicketStock.findById(flightStockId);
    const usedFlightUnits = flightStockDoc.units.filter((u) => u.status === "used");
    assert.ok(usedFlightUnits.length >= 1, "At least 1 flight ticket unit must be marked 'used'");

    const hotelStockDoc = await HotelStock.findById(hotelStockId);
    const usedHotelUnits = hotelStockDoc.units.filter((u) => u.status === "used");
    assert.ok(usedHotelUnits.length >= 1, "At least 1 hotel room unit must be marked 'used'");
  });

  it("PKG-02: CRM lists package bookings with filters and customer details", async () => {
    const listResult = await packageBookingService.listBookingsAdmin({
      status: "confirmed",
      packageId: testPackageId,
    });

    assert.ok(Array.isArray(listResult.bookings), "Bookings should be an array");
    assert.ok(listResult.bookings.length >= 1, "Should contain at least 1 booking");
    const found = listResult.bookings.find((b) => String(b._id) === String(confirmedBookingId));
    assert.ok(found, "Newly created booking must be in the list");
    assert.strictEqual(found.status, "confirmed");
  });

  it("PKG-03: CRM modifies travel dates, contact info, and operational remarks on confirmed booking", async () => {
    const updated = await packageBookingService.updateConfirmedBookingAdmin(
      confirmedBookingId,
      {
        travelDates: {
          startDate: "2026-10-05T00:00:00.000Z",
          endDate: "2026-10-10T00:00:00.000Z",
        },
        contactDetails: {
          phone: "+91-9999988888",
          emergencyContact: "+91-8888877777",
        },
        remark: "Customer requested travel date postponement by 4 days; airline notified.",
      },
      adminUserId
    );

    assert.strictEqual(new Date(updated.travelDates.startDate).toISOString(), "2026-10-05T00:00:00.000Z");
    assert.strictEqual(updated.contactDetails.phone, "+91-9999988888");
    assert.strictEqual(updated.remark, "Customer requested travel date postponement by 4 days; airline notified.");
    assert.ok(updated.remarks.length >= 1, "Remarks log should contain the new entry");

    // Verify MasterBooking synchronization
    const masterBooking = await MasterBooking.findOne({ itemId: confirmedBookingId });
    assert.strictEqual(
      new Date(masterBooking.details.departureDate).toISOString(),
      "2026-10-05T00:00:00.000Z"
    );
  });

  it("PKG-04: Guardrail strictly rejects structural modifications (adding/removing/swapping items) on confirmed booking", async () => {
    await assert.rejects(
      async () => {
        await packageBookingService.updateConfirmedBookingAdmin(
          confirmedBookingId,
          {
            excludedOfferIds: [flightOfferId],
          },
          adminUserId
        );
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.ok(err.message.includes("Structural modifications"));
        return true;
      },
      "Must throw 400 when attempting structural modifications on confirmed booking"
    );
  });

  it("PKG-05: Admin cancels package booking — releases stock units back to available", async () => {
    const cancelled = await packageBookingService.cancelBookingAdmin(confirmedBookingId, {
      reason: "Customer emergency cancellation requested at branch",
      agentId: adminUserId,
    });

    assert.strictEqual(cancelled.status, "cancelled");
    assert.strictEqual(cancelled.cancellationReason, "Customer emergency cancellation requested at branch");

    // Verify claimed stock units reverted to 'available'
    const flightStockDoc = await TicketStock.findById(flightStockId);
    const flightAvailableCount = flightStockDoc.units.filter((u) => u.status === "available").length;
    assert.strictEqual(flightAvailableCount, 10, "All 10 flight seats should be available again");

    const hotelStockDoc = await HotelStock.findById(hotelStockId);
    const hotelAvailableCount = hotelStockDoc.units.filter((u) => u.status === "available").length;
    assert.strictEqual(hotelAvailableCount, 10, "All 10 hotel room units should be available again");

    // Verify Payment is marked refunded
    const payment = await Payment.findOne({ bookingId: confirmedBookingId });
    assert.strictEqual(payment.status, "refunded");

    // Verify Master Booking is cancelled
    const masterBooking = await MasterBooking.findOne({ itemId: confirmedBookingId });
    assert.strictEqual(masterBooking.status, "cancelled");
  });

  after(async () => {
    if (confirmedBookingId) {
      await PackageBooking.findByIdAndDelete(confirmedBookingId);
      await Payment.deleteMany({ bookingId: confirmedBookingId });
      await MasterBooking.deleteMany({ itemId: confirmedBookingId });
    }
    if (testPackageId) await Package.findByIdAndDelete(testPackageId);
    if (flightOfferId) await Offer.findByIdAndDelete(flightOfferId);
    if (hotelOfferId) await Offer.findByIdAndDelete(hotelOfferId);
    if (flightStockId) await TicketStock.findByIdAndDelete(flightStockId);
    if (hotelStockId) await HotelStock.findByIdAndDelete(hotelStockId);
    if (testHotelId) await Hotel.findByIdAndDelete(testHotelId);
    if (adminUserId) await User.findByIdAndDelete(adminUserId);
    if (customerUserId) await User.findByIdAndDelete(customerUserId);
    if (travellerProfileId) await Traveller.findByIdAndDelete(travellerProfileId);
    await mongoose.connection.close();
  });
});
