// tests/packages/crm_stocks.test.js
//
// Integration test suite for Phase 1: CRM Wholesale Stock Management
// Tests Flight TicketStock, HotelStock, and Inventory Overview metrics.

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
require("dotenv").config();

const stockService = require("../../modules/packages/stock/stock.service");
const TicketStock = require("../../modules/packages/stock/ticketStock.model");
const HotelStock = require("../../modules/packages/stock/hotelStock.model");
const Hotel = require("../../modules/hotels/hotelEntity.model");
const User = require("../../modules/auth/auth.model");

describe("Phase 1: CRM Stock Management Integration Suite", () => {
  let adminUserId;
  let testHotelId;
  let createdFlightStockId;
  let createdHotelStockId;

  before(async () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, { family: 4, serverSelectionTimeoutMS: 10000 });
    }

    // 1. Create Test Admin
    const adminUser = await User.create({
      firstName: "Stock",
      lastName: "Admin",
      password: "Password123!",
      email: `stockadmin_${Date.now()}@agency.com`,
      phone: `9199${Math.floor(10000000 + Math.random() * 90000000)}`,
      role: "admin",
    });
    adminUserId = adminUser._id;

    // 2. Create Test Hotel Entity
    const testHotel = await Hotel.create({
      name: "Burj Al Arab Luxury Suites",
      destination: "Dubai",
      city: "Dubai",
      country: "UAE",
      address: "Jumeirah Beach Road, Dubai",
      stars: 5,
      rating: 4.9,
    });
    testHotelId = testHotel._id;
  });

  after(async () => {
    // Cleanup created test records
    if (createdFlightStockId) await TicketStock.findByIdAndDelete(createdFlightStockId);
    if (createdHotelStockId) await HotelStock.findByIdAndDelete(createdHotelStockId);
    if (testHotelId) await Hotel.findByIdAndDelete(testHotelId);
    if (adminUserId) await User.findByIdAndDelete(adminUserId);
    await mongoose.connection.close();
  });

  it("ST-01: Admin creates bulk flight TicketStock with auto-generated units", async () => {
    const flightPayload = {
      airline: "Emirates",
      flightNumber: "EK-512",
      origin: "DEL",
      destination: "DXB",
      departureDate: new Date(Date.now() + 86400000 * 15),
      arrivalDate: new Date(Date.now() + 86400000 * 15 + 14400000),
      cabinClass: "Economy",
      pnr: "EKTEST99",
      nameAdditionDeadline: new Date(Date.now() + 86400000 * 10),
      costPerUnit: 14500,
      totalUnits: 25,
    };

    const stock = await stockService.createFlightStock(flightPayload, adminUserId);
    assert.ok(stock._id, "Flight stock ID should exist");
    assert.strictEqual(stock.airline, "Emirates");
    assert.strictEqual(stock.pnr, "EKTEST99");
    assert.strictEqual(stock.costPerUnit, 14500);
    assert.strictEqual(stock.units.length, 25, "Should have auto-generated 25 unit items");
    assert.strictEqual(stock.availableUnits, 25, "All 25 units should start in available status");

    createdFlightStockId = stock._id;
  });

  it("ST-02: Admin lists and filters flight ticket stocks", async () => {
    const result = await stockService.listFlightStocks({
      airline: "Emirates",
      destination: "DXB",
      availableOnly: "true",
      page: 1,
      limit: 10,
    });

    assert.ok(Array.isArray(result.stocks), "Should return array of flight stocks");
    assert.ok(result.pagination.total >= 1, "Total count should be at least 1");
    const found = result.stocks.find((s) => String(s._id) === String(createdFlightStockId));
    assert.ok(found, "Created flight stock should be in the search results");
  });

  it("ST-03: Admin retrieves single flight ticket stock by ID", async () => {
    const stock = await stockService.getFlightStockById(createdFlightStockId);
    assert.strictEqual(String(stock._id), String(createdFlightStockId));
    assert.strictEqual(stock.flightNumber, "EK-512");
  });

  it("ST-04: Admin creates contracted HotelStock allotment with auto-populated hotel info", async () => {
    const hotelPayload = {
      hotelId: testHotelId,
      roomType: "Royal Ocean Suite",
      checkIn: new Date(Date.now() + 86400000 * 15),
      checkOut: new Date(Date.now() + 86400000 * 20),
      pricePerNight: 8500,
      meals: ["breakfast", "dinner"],
      reservationRef: "RES-BURJ-102",
      nameAdditionDeadline: new Date(Date.now() + 86400000 * 10),
      totalUnits: 10,
    };

    const stock = await stockService.createHotelStock(hotelPayload, adminUserId);
    assert.ok(stock._id, "Hotel stock ID should exist");
    assert.strictEqual(stock.hotelName, "Burj Al Arab Luxury Suites", "Should auto-populate hotel name from entity");
    assert.strictEqual(stock.destination, "Dubai", "Should auto-populate destination from entity");
    assert.strictEqual(stock.reviewStatus, "approved", "Admin-created hotel stock should be approved");
    assert.strictEqual(stock.units.length, 10, "Should auto-generate 10 room units");
    assert.strictEqual(stock.availableUnits, 10, "All 10 units should start in available status");
    assert.strictEqual(stock.totalNights, 5, "CheckIn to CheckOut duration should be 5 nights");

    createdHotelStockId = stock._id;
  });

  it("ST-05: Admin lists and filters hotel stocks", async () => {
    const result = await stockService.listHotelStocks({
      destination: "Dubai",
      availableOnly: "true",
      page: 1,
      limit: 10,
    });

    assert.ok(Array.isArray(result.stocks), "Should return array of hotel stocks");
    assert.ok(result.pagination.total >= 1, "Total count should be at least 1");
    const found = result.stocks.find((s) => String(s._id) === String(createdHotelStockId));
    assert.ok(found, "Created hotel stock should be in the list");
  });

  it("ST-06: Admin retrieves single hotel stock by ID", async () => {
    const stock = await stockService.getHotelStockById(createdHotelStockId);
    assert.strictEqual(String(stock._id), String(createdHotelStockId));
    assert.strictEqual(stock.roomType, "Royal Ocean Suite");
  });

  it("ST-07: Admin views consolidated inventory utilization dashboard (overview)", async () => {
    const overview = await stockService.getStockOverview();
    assert.ok(overview.flights, "Should contain flights overview");
    assert.ok(overview.hotels, "Should contain hotels overview");
    assert.ok(overview.flights.totalSeats >= 25, "Should reflect flight seats");
    assert.ok(overview.hotels.totalRooms >= 10, "Should reflect hotel rooms");
  });
});
