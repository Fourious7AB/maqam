// tests/packages/crm_offers.test.js
//
// Integration test suite for Phase 2: CRM Standalone Offers & Direct Booking via Bank Transfer
// Tests Offer CRUD, live availability, margin analytics, direct CRM customer booking, and admin cancellation.

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
require("dotenv").config();

const offerService = require("../../modules/packages/offers/offer.service");
const stockService = require("../../modules/packages/stock/stock.service");
const Offer = require("../../modules/packages/offers/offer.model");
const OfferBooking = require("../../modules/packages/offers/offerBooking.model");
const TicketStock = require("../../modules/packages/stock/ticketStock.model");
const HotelStock = require("../../modules/packages/stock/hotelStock.model");
const Hotel = require("../../modules/hotels/hotelEntity.model");
const User = require("../../modules/auth/auth.model");
const Payment = require("../../modules/payments/payment.model");
const MasterBooking = require("../../modules/bookings/booking.model");

describe("Phase 2: CRM Standalone Offers & Direct Booking Suite", () => {
  let adminUserId;
  let customerUserId;
  let testHotelId;
  let flightStockId;
  let hotelStockId;
  let flightOfferId;
  let hotelOfferId;
  let createdBookingId;

  before(async () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, { family: 4, serverSelectionTimeoutMS: 10000 });
    }

    // 1. Create Test Admin & Customer Users
    const adminUser = await User.create({
      firstName: "Offer",
      lastName: "Admin",
      password: "Password123!",
      email: `offeradmin_${Date.now()}@agency.com`,
      phone: `9199${Math.floor(10000000 + Math.random() * 90000000)}`,
      role: "admin",
    });
    adminUserId = adminUser._id;

    const customerUser = await User.create({
      firstName: "WalkIn",
      lastName: "Customer",
      password: "Password123!",
      email: `customer_${Date.now()}@gmail.com`,
      phone: `9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      role: "customer",
    });
    customerUserId = customerUser._id;

    // 2. Create Hotel Entity
    const hotel = await Hotel.create({
      name: "Atlantis The Palm",
      destination: "Dubai",
      address: "Crescent Road, The Palm, Dubai",
      stars: 5,
      rating: 4.8,
    });
    testHotelId = hotel._id;

    // 3. Create Flight Stock (TicketStock)
    const flightStock = await stockService.createFlightStock({
      airline: "Air India",
      flightNumber: "AI-995",
      origin: "BOM",
      destination: "DXB",
      departureDate: new Date(Date.now() + 86400000 * 20),
      pnr: "AIOFFER12",
      nameAdditionDeadline: new Date(Date.now() + 86400000 * 15),
      costPerUnit: 12000,
      totalUnits: 10,
    }, adminUserId);
    flightStockId = flightStock._id;

    // 4. Create Hotel Stock (HotelStock)
    const hotelStock = await stockService.createHotelStock({
      hotelId: testHotelId,
      roomType: "Palm King Room",
      checkIn: new Date(Date.now() + 86400000 * 20),
      checkOut: new Date(Date.now() + 86400000 * 23),
      pricePerNight: 7000,
      meals: ["breakfast"],
      reservationRef: "ATL-REF-992",
      nameAdditionDeadline: new Date(Date.now() + 86400000 * 15),
      totalUnits: 10,
    }, adminUserId);
    hotelStockId = hotelStock._id;
  });

  after(async () => {
    // Cleanup
    if (createdBookingId) {
      await OfferBooking.findByIdAndDelete(createdBookingId);
      await MasterBooking.deleteMany({ itemId: createdBookingId });
      await Payment.deleteMany({ bookingId: createdBookingId });
    }
    if (flightOfferId) await Offer.findByIdAndDelete(flightOfferId);
    if (hotelOfferId) await Offer.findByIdAndDelete(hotelOfferId);
    if (flightStockId) await TicketStock.findByIdAndDelete(flightStockId);
    if (hotelStockId) await HotelStock.findByIdAndDelete(hotelStockId);
    if (testHotelId) await Hotel.findByIdAndDelete(testHotelId);
    if (adminUserId) await User.findByIdAndDelete(adminUserId);
    if (customerUserId) await User.findByIdAndDelete(customerUserId);
    await mongoose.connection.close();
  });

  it("OF-01: Admin creates standalone retail flight offer from wholesale TicketStock", async () => {
    const offerPayload = {
      title: "Direct Mumbai to Dubai Flight Super Deal",
      description: "Non-stop flight aboard Air India with 30kg baggage",
      destination: "Dubai",
      itemType: "flight",
      flightRef: {
        stock: flightStockId,
        unitsPerBooking: 1,
      },
      sellPrice: 15500, // Cost is 12000 -> Gross profit 3500
      originalPrice: 18000,
      discountPercentage: 14,
      startDate: new Date(Date.now() + 86400000 * 20),
      endDate: new Date(Date.now() + 86400000 * 20 + 14400000),
      inclusions: ["30kg Check-in Baggage", "Complimentary Meal"],
    };

    const offer = await offerService.createOffer(offerPayload, adminUserId);
    assert.ok(offer._id);
    assert.strictEqual(offer.itemType, "flight");
    assert.strictEqual(offer.sellPrice, 15500);
    assert.strictEqual(String(offer.flightRef.stock), String(flightStockId));
    assert.strictEqual(offer.isActive, true);

    flightOfferId = offer._id;
  });

  it("OF-02: Admin creates standalone retail hotel offer from wholesale HotelStock", async () => {
    const offerPayload = {
      title: "Atlantis The Palm 3-Night Luxury Escape",
      description: "Stay in Palm King Room with daily breakfast and Aquaventure access",
      destination: "Dubai",
      itemType: "hotel",
      hotelRef: {
        stock: hotelStockId,
        unitsPerBooking: 1,
      },
      sellPrice: 28000,
      startDate: new Date(Date.now() + 86400000 * 20),
      endDate: new Date(Date.now() + 86400000 * 23),
      inclusions: ["Daily Buffet Breakfast", "Free Waterpark Access"],
    };

    const offer = await offerService.createOffer(offerPayload, adminUserId);
    assert.ok(offer._id);
    assert.strictEqual(offer.itemType, "hotel");
    assert.strictEqual(offer.sellPrice, 28000);

    hotelOfferId = offer._id;
  });

  it("OF-03: CRM lists offers with wholesale cost, gross profit & margin % analytics", async () => {
    const result = await offerService.listOffers({ destination: "Dubai" }, true);
    assert.ok(Array.isArray(result.offers));
    assert.ok(result.pagination.total >= 2);

    const flightOffer = result.offers.find((o) => String(o._id) === String(flightOfferId));
    assert.ok(flightOffer);
    assert.ok(flightOffer.financials, "CRM view should compute financials");
    assert.strictEqual(flightOffer.financials.wholesaleCost, 12000);
    assert.strictEqual(flightOffer.financials.grossMargin, 3500);
    assert.strictEqual(flightOffer.financials.marginPercent, 23); // (3500 / 15500) * 100 = 22.58 -> 23%
    assert.strictEqual(flightOffer.availableBookings, 10, "Should compute live available bookings from stock");
  });

  it("OF-04: Admin updates offer and toggles active status", async () => {
    // 1. Update sellPrice
    const updated = await offerService.updateOffer(flightOfferId, { sellPrice: 16000 });
    assert.strictEqual(updated.sellPrice, 16000);

    // 2. Toggle status
    const toggled = await offerService.toggleOfferStatus(flightOfferId);
    assert.strictEqual(toggled.isActive, false, "Should be deactivated");

    // 3. Verify public listing hides inactive offer
    const publicResult = await offerService.listOffers({}, false);
    const hiddenInPublic = publicResult.offers.find((o) => String(o._id) === String(flightOfferId));
    assert.strictEqual(hiddenInPublic, undefined, "Inactive offer must not appear in public store");

    // Reactivate for subsequent tests
    await offerService.toggleOfferStatus(flightOfferId);
  });

  it("OF-05: Direct CRM booking for walk-in customer via Bank Transfer", async () => {
    const bookingResult = await offerService.bookOfferForCustomer({
      customerId: customerUserId,
      offerId: flightOfferId,
      quantity: 2,
      travellers: [
        { travellerId: new mongoose.Types.ObjectId(), isLead: true },
        { travellerId: new mongoose.Types.ObjectId(), isLead: false },
      ],
      payment: {
        method: "bank_transfer",
        referenceNumber: "NEFT-HDFC-8827110",
        notes: "Paid in full at Connaught Place office",
      },
      agentId: adminUserId,
    });

    assert.ok(bookingResult.booking._id);
    assert.strictEqual(bookingResult.booking.status, "confirmed", "Booking should immediately be confirmed");
    assert.strictEqual(bookingResult.booking.totalAmount, 32000, "16000 * 2 = 32000");
    assert.strictEqual(bookingResult.booking.claimedFlightUnits.length, 2, "Should have claimed 2 flight units");

    // Verify stock units transitioned directly to 'used'
    const stockAfterBooking = await TicketStock.findById(flightStockId);
    const usedUnits = stockAfterBooking.units.filter((u) => u.status === "used");
    assert.strictEqual(usedUnits.length, 2, "2 units should be marked as used in TicketStock");
    assert.strictEqual(stockAfterBooking.availableUnits, 8, "Available units should decrease from 10 to 8");

    // Verify Payment record
    assert.ok(bookingResult.payment._id);
    assert.strictEqual(bookingResult.payment.status, "paid");
    assert.strictEqual(bookingResult.payment.paymentMethod, "bank_transfer");
    assert.strictEqual(bookingResult.payment.amount, 32000);

    // Verify Master Booking
    assert.ok(bookingResult.masterBooking._id);
    assert.strictEqual(bookingResult.masterBooking.status, "confirmed");
    assert.strictEqual(String(bookingResult.masterBooking.paymentId), String(bookingResult.payment._id));

    createdBookingId = bookingResult.booking._id;
  });

  it("OF-06: Admin cancels offer booking — releases stock units back to available", async () => {
    const cancelledBooking = await offerService.cancelOfferBookingAdmin(createdBookingId, "Customer requested cancellation");
    assert.strictEqual(cancelledBooking.status, "cancelled");

    // Verify stock units returned to 'available'
    const stockAfterCancel = await TicketStock.findById(flightStockId);
    assert.strictEqual(stockAfterCancel.availableUnits, 10, "Stock units should be released back to 10 available");

    // Verify Master Booking synced to cancelled
    const masterBooking = await MasterBooking.findOne({ itemId: createdBookingId });
    assert.strictEqual(masterBooking.status, "cancelled");

    // Verify Payment synced to refunded
    const payment = await Payment.findOne({ bookingId: createdBookingId });
    assert.strictEqual(payment.status, "refunded");
  });
});
