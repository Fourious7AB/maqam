// tests/packages/full_package_and_payment_e2e.test.js
//
// Comprehensive End-to-End Test Suite:
// 1. Tier 1 Stock & Standalone Visa Catalog Creation (TicketStock, HotelStock, VisaInventory)
// 2. Tier 2 Offer Creation (Flight & Hotel Offers)
// 3. Tier 3 Package Creation (Offers Only) & CRM Profit Analytics
// 4. Interactive Customer Quote Recalculation (Upgrades & Deltas)
// 5. Package Booking Checkout (Offers Only, Clean Traveler Profiles)
// 6. Payment Gateway Integration & Post-Payment Inventory Settlement
// 7. CRM Operations Assignment & Standalone Visa Workflow

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
require("dotenv").config();

const Package = require("../../modules/packages/models/package.model");
const Offer = require("../../modules/packages/offers/offer.model");
const TicketStock = require("../../modules/packages/stock/ticketStock.model");
const HotelStock = require("../../modules/packages/stock/hotelStock.model");
const Hotel = require("../../modules/hotels/hotelEntity.model");
const VisaInventory = require("../../modules/visa/visaAdmin/visaStock1.model");
const VisaApplication = require("../../modules/visa/user/visaApplication.model");
const VisaGroup = require("../../modules/visa/user/visaGroup.model");
const PackageBooking = require("../../modules/packages/models/packageBooking.model");
const Payment = require("../../modules/payments/payment.model");
const MasterBooking = require("../../modules/bookings/booking.model");
const Traveller = require("../../modules/account/traveller.model");
const User = require("../../modules/auth/auth.model");

const packageService = require("../../modules/packages/core/package.service");
const packageBookingService = require("../../modules/packages/core/packageBooking.service");
const adminVisaService = require("../../modules/visa/visaAdmin/adminVisa.service");
const { ensureBookingConfirmed, getBookingAmount } = require("../../modules/payments/bookingSync");
const { resolveBooking } = require("../../modules/payments/bookingResolver");
const { PAYMENT_STATUS } = require("../../modules/payments/payment.constants");

describe("Full Package, Offer, Stock, Standalone Visa & Payment E2E Verification", () => {
  let adminUser;
  let customerUser;
  let opsAgentUser;
  let visaOfficerUser;
  let travellerProfile;

  let flightStockId;
  let hotelStock3StarId;
  let hotelStock5StarId;
  let visaInventoryId;

  let flightOfferId;
  let hotelOffer3StarId;
  let hotelOffer5StarId;

  let packageId;
  let createdBookingId;
  let createdVisaGroupId;
  let createdVisaAppId;

  before(async () => {
    const mongoUri = process.env.MONGO_URI;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, { family: 4, serverSelectionTimeoutMS: 10000 });
    }

    // Clean up test collections
    try {
      await Hotel.collection.dropIndex("srdvHotelId_1").catch(() => {});
    } catch (_) {}

    // 1. Create Users
    adminUser = await User.create({
      firstName: "Super",
      lastName: "Admin",
      password: "Password123!",
      email: `admin_${Date.now()}@agency.com`,
      phone: `9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      role: "admin",
      isActive: true,
    });

    customerUser = await User.create({
      firstName: "Arun",
      lastName: "Customer",
      password: "Password123!",
      email: `customer_${Date.now()}@gmail.com`,
      phone: `9197${Math.floor(10000000 + Math.random() * 90000000)}`,
      role: "customer",
      isActive: true,
    });

    opsAgentUser = await User.create({
      firstName: "Operations",
      lastName: "Officer",
      password: "Password123!",
      email: `ops_${Date.now()}@agency.com`,
      phone: `9196${Math.floor(10000000 + Math.random() * 90000000)}`,
      role: "admin",
      isActive: true,
    });

    visaOfficerUser = await User.create({
      firstName: "Visa",
      lastName: "Specialist",
      password: "Password123!",
      email: `visa_${Date.now()}@agency.com`,
      phone: `9195${Math.floor(10000000 + Math.random() * 90000000)}`,
      role: "admin",
      isActive: true,
    });

    // 2. Create Customer Traveller Profile
    travellerProfile = await Traveller.create({
      userId: customerUser._id,
      title: "Mr",
      firstName: "Arun",
      lastName: "Shaw",
      gender: "Male",
      dateOfBirth: new Date("1992-05-15"),
      nationality: "Indian",
      passportNo: "Z1234567",
      email: customerUser.email,
      phone: customerUser.phone,
    });
  });

  after(async () => {
    // Cleanup records
    if (adminUser) await User.deleteMany({ _id: { $in: [adminUser._id, customerUser._id, opsAgentUser._id, visaOfficerUser._id] } });
    if (travellerProfile) await Traveller.deleteMany({ userId: customerUser._id });
    if (packageId) await Package.deleteMany({ _id: packageId });
    if (flightOfferId) await Offer.deleteMany({ _id: { $in: [flightOfferId, hotelOffer3StarId, hotelOffer5StarId] } });
    if (flightStockId) await TicketStock.deleteMany({ _id: flightStockId });
    if (hotelStock3StarId) await HotelStock.deleteMany({ _id: { $in: [hotelStock3StarId, hotelStock5StarId] } });
    if (visaInventoryId) await VisaInventory.deleteMany({ _id: visaInventoryId });
    if (createdVisaGroupId) await VisaGroup.deleteMany({ _id: createdVisaGroupId });
    if (createdVisaAppId) await VisaApplication.deleteMany({ _id: createdVisaAppId });
    if (createdBookingId) {
      await PackageBooking.deleteMany({ _id: createdBookingId });
      await Payment.deleteMany({ bookingId: createdBookingId });
      await MasterBooking.deleteMany({ itemId: createdBookingId });
    }
    await mongoose.connection.close();
  });

  it("Step 1: Create Tier 1 Stocks (TicketStock & HotelStock) and Visa Catalog (VisaInventory)", async () => {
    // 1.1 Create TicketStock
    const flightStock = await TicketStock.create({
      airline: "Emirates",
      flightNumber: "EK-511",
      departureDate: new Date(Date.now() + 86400000 * 15),
      arrivalDate: new Date(Date.now() + 86400000 * 15 + 18000000),
      origin: "DEL",
      destination: "DXB",
      pnr: "EKDXB999",
      nameAdditionDeadline: new Date(Date.now() + 86400000 * 5),
      costPerUnit: 10000,
      units: [{ status: "available" }, { status: "available" }, { status: "available" }],
      createdBy: adminUser._id,
    });
    flightStockId = flightStock._id;
    assert.strictEqual(flightStock.units.length, 3);

    // 1.2 Create 3-Star HotelStock
    const hotel3Star = await Hotel.create({
      name: "Dubai Grand Marina Hotel",
      destination: "Dubai",
      address: "Dubai Marina Promenade",
      isActive: true,
      createdBy: adminUser._id,
    });

    const hotelStock3Star = await HotelStock.create({
      hotelId: hotel3Star._id,
      hotelName: "Dubai Grand Marina Hotel",
      destination: "Dubai",
      roomType: "Superior Room",
      checkIn: new Date(Date.now() + 86400000 * 15),
      checkOut: new Date(Date.now() + 86400000 * 20), // 5 nights
      pricePerNight: 2400, // 2400 * 5 nights = 12000 costPerUnit
      reservationRef: "RES-MARINA-333",
      nameAdditionDeadline: new Date(Date.now() + 86400000 * 5),
      reviewStatus: "approved",
      units: [{ status: "available" }, { status: "available" }, { status: "available" }],
      createdBy: adminUser._id,
    });
    hotelStock3StarId = hotelStock3Star._id;

    // 1.3 Create 5-Star Luxury Upgrade HotelStock
    const hotel5Star = await Hotel.create({
      name: "Atlantis Palm Luxury Resort",
      destination: "Dubai",
      address: "Crescent Rd, The Palm",
      isActive: true,
      createdBy: adminUser._id,
    });

    const hotelStock5Star = await HotelStock.create({
      hotelId: hotel5Star._id,
      hotelName: "Atlantis Palm Luxury Resort",
      destination: "Dubai",
      roomType: "Ocean Suite",
      checkIn: new Date(Date.now() + 86400000 * 15),
      checkOut: new Date(Date.now() + 86400000 * 20), // 5 nights
      pricePerNight: 3600, // 3600 * 5 nights = 18000 costPerUnit
      reservationRef: "RES-ATLANTIS-777",
      nameAdditionDeadline: new Date(Date.now() + 86400000 * 5),
      reviewStatus: "approved",
      units: [{ status: "available" }, { status: "available" }, { status: "available" }],
      createdBy: adminUser._id,
    });
    hotelStock5StarId = hotelStock5Star._id;

    // 1.4 Create Visa Catalog Offering for Standalone Visas
    const visaDoc = await VisaInventory.create({
      country: "UNITED ARAB EMIRATES",
      countryCode: "AE",
      visaType: "Tourist",
      title: "Dubai 30 Days Tourist Visa",
      processingTime: "3-5 Working Days",
      fees: {
        basePrice: 2000,
        governmentFee: 1000,
        serviceFee: 500,
        tax: 0,
        totalPrice: 3500,
        currency: "INR",
      },
      status: "active",
      createdBy: adminUser._id,
    });
    visaInventoryId = visaDoc._id;
    assert.strictEqual(visaDoc.fees.totalPrice, 3500);
  });

  it("Step 2: Create Tier 2 Standalone Retail Offers (Flights & Hotels)", async () => {
    // Flight Offer (Retail: ₹15,000)
    const flightOffer = await Offer.create({
      title: "Emirates DEL-DXB Direct Flight",
      destination: "Dubai",
      itemType: "flight",
      flightRef: { stock: flightStockId, unitsPerBooking: 1 },
      sellPrice: 15000,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 60),
      isActive: true,
      createdBy: adminUser._id,
    });
    flightOfferId = flightOffer._id;

    // 3-Star Hotel Offer (Retail: ₹20,000)
    const hotelOffer3Star = await Offer.create({
      title: "Dubai Grand Marina 5N Stay",
      destination: "Dubai",
      itemType: "hotel",
      hotelRef: { stock: hotelStock3StarId, unitsPerBooking: 1 },
      sellPrice: 20000,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 60),
      isActive: true,
      createdBy: adminUser._id,
    });
    hotelOffer3StarId = hotelOffer3Star._id;

    // 5-Star Hotel Upgrade Offer (Retail: ₹26,000)
    const hotelOffer5Star = await Offer.create({
      title: "Atlantis Palm Luxury Ocean Suite 5N",
      destination: "Dubai",
      itemType: "hotel",
      hotelRef: { stock: hotelStock5StarId, unitsPerBooking: 1 },
      sellPrice: 26000,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 60),
      isActive: true,
      createdBy: adminUser._id,
    });
    hotelOffer5StarId = hotelOffer5Star._id;

    assert.ok(flightOfferId && hotelOffer3StarId && hotelOffer5StarId);
  });

  it("Step 3: Create Package with 10% Bundle Discount & Verify CRM Gross Margin Analytics", async () => {
    const createdPkg = await packageService.createPackage(
      {
        title: "Dubai Signature Holiday Experience 6D5N",
        destination: "Dubai",
        offerRefs: [
          { offer: flightOfferId, unitsPerBooking: 1, isOptional: false, allowSwap: false },
          { offer: hotelOffer3StarId, unitsPerBooking: 1, isOptional: true, allowSwap: true },
        ],
        bundleDiscountPercentage: 10,
        itinerary: [
          { day: 1, title: "Arrival & Marina Check-in", description: "Emirates flight & check-in" },
          { day: 2, title: "Desert Safari", description: "Dune bashing & BBQ dinner" },
        ],
      },
      adminUser._id
    );

    packageId = createdPkg._id;

    // Unbundled sum = 15,000 (Flight) + 20,000 (Hotel) = 35,000
    // Sell price with 10% discount = 35,000 * 0.90 = 31,500
    assert.strictEqual(createdPkg.sellPrice, 31500);

    // Verify Admin CRM calculations:
    const adminPkg = await packageService.getPackageByIdAdmin(packageId);
    // Cost price = 10,000 (Flight cost) + 12,000 (Hotel cost) = 22,000
    assert.strictEqual(adminPkg.totalCostPrice, 22000);
    // Gross Profit = 31,500 - 22,000 = 9,500
    assert.strictEqual(adminPkg.grossProfit, 9500);
    // Margin % = (9,500 / 31,500) * 100 = 30.16%
    assert.strictEqual(adminPkg.profitMarginPercentage, 30.16);
  });

  it("Step 4: Customer Customizer Live Quote — Upgrade from 3-Star to 5-Star Hotel", async () => {
    const quote = await packageService.calculateCustomQuote(packageId, {
      quantity: 1,
      swappedOffers: [
        {
          originalOfferId: hotelOffer3StarId,
          replacementOfferId: hotelOffer5StarId,
        },
      ],
    });

    // Retail Delta = 26,000 - 20,000 = +6,000
    assert.strictEqual(quote.basePackageSellPrice, 31500);
    assert.strictEqual(quote.swapDeltas, 6000);
    assert.strictEqual(quote.deductions, 0);
    // Final price = 31,500 + 6,000 = 37,500
    assert.strictEqual(quote.finalSellPrice, 37500);
    assert.strictEqual(quote.totalAmount, 37500);
  });

  it("Step 5: Customer Books Customized Package with Swapped Luxury Hotel", async () => {
    const bookingResult = await packageBookingService.createBooking({
      userId: customerUser._id,
      packageId,
      quantity: 1,
      travellers: [
        {
          travellerId: travellerProfile._id,
          isLead: true,
        },
      ],
      swappedOffers: [
        {
          originalOfferId: hotelOffer3StarId,
          replacementOfferId: hotelOffer5StarId,
        },
      ],
    });

    createdBookingId = bookingResult.bookingId;

    assert.strictEqual(bookingResult.status, "pending");
    assert.strictEqual(bookingResult.totalAmount, 37500);
    assert.strictEqual(bookingResult.claimedUnits.length, 2);

    // 5.1 Verify physical inventory units are marked 'assigned'
    const flightStockDoc = await TicketStock.findById(flightStockId);
    assert.strictEqual(flightStockDoc.units.filter((u) => u.status === "assigned").length, 1);

    const hotelStock5StarDoc = await HotelStock.findById(hotelStock5StarId);
    assert.strictEqual(hotelStock5StarDoc.units.filter((u) => u.status === "assigned").length, 1);
  });

  it("Step 6: Payment Gateway Integration — Order Creation, Capture & Inventory Settlement", async () => {
    // 6.1 Resolve booking for payment
    const resolved = await resolveBooking(createdBookingId, "package");
    assert.strictEqual(String(resolved._id), String(createdBookingId));
    const payableAmount = getBookingAmount(resolved, "package");
    assert.strictEqual(payableAmount, 37500);

    // 6.2 Simulate Payment record creation (as Razorpay/PayPal would do)
    const payment = await Payment.create({
      userId: customerUser._id,
      bookingId: createdBookingId,
      bookingModel: "PackageBooking",
      bookingType: "package",
      amount: payableAmount,
      currency: "INR",
      paymentMethod: "razorpay",
      status: PAYMENT_STATUS.PAID,
      gatewayData: {
        orderId: "order_mock_12345",
        captureId: "pay_mock_67890",
      },
    });

    // 6.3 Execute Payment Confirmation Sync
    const syncResult = await ensureBookingConfirmed(payment);
    assert.ok(syncResult.booking);
    assert.strictEqual(syncResult.booking.status, "confirmed");

    // 6.4 Verify Flight & Hotel stock units flipped from 'assigned' to 'used'
    const flightStockAfter = await TicketStock.findById(flightStockId);
    assert.strictEqual(flightStockAfter.units.filter((u) => u.status === "used").length, 1);
    assert.strictEqual(flightStockAfter.units.filter((u) => u.status === "available").length, 2);

    const hotelStockAfter = await HotelStock.findById(hotelStock5StarId);
    assert.strictEqual(hotelStockAfter.units.filter((u) => u.status === "used").length, 1);
    assert.strictEqual(hotelStockAfter.units.filter((u) => u.status === "available").length, 2);

    // 6.5 Verify Master Booking is created
    const masterBooking = await MasterBooking.findOne({ itemId: createdBookingId, bookingType: "package" });
    assert.ok(masterBooking);
    assert.strictEqual(masterBooking.status, "confirmed");
  });

  it("Step 7: CRM Operations Assignment & Standalone Visa Processing Workflow", async () => {
    // 7.1 Assign Operations Case Officer to the Package Booking
    const assignedPackage = await packageBookingService.assignPackageBookingAgent(
      createdBookingId,
      opsAgentUser._id
    );
    assert.strictEqual(String(assignedPackage.assignedTo._id), String(opsAgentUser._id));

    // 7.2 Verify CRM Package detail view reflects confirmed booking & assigned agent
    const crmBookingView = await packageBookingService.getBookingByIdAdmin(createdBookingId);
    assert.strictEqual(crmBookingView.status, "confirmed");
    assert.strictEqual(crmBookingView.assignedTo.firstName, "Operations");

    // 7.3 Standalone Visa Application: Customer submits independent visa application
    const visaGroup = await VisaGroup.create({
      submittedBy: customerUser._id,
      destinationCountry: "UNITED ARAB EMIRATES",
      visaType: "Tourist",
      totalApplicants: 1,
      totalAmount: 3500,
      currency: "INR",
      paymentStatus: "paid",
      bookingSource: "standalone",
    });
    createdVisaGroupId = visaGroup._id;

    const visaApp = await VisaApplication.create({
      groupId: visaGroup._id,
      submittedBy: customerUser._id,
      travelerDetails: {
        firstName: "Arun",
        lastName: "Shaw",
        passportNumber: "Z1234567",
        nationality: "Indian",
        dateOfBirth: new Date("1992-05-15"),
      },
      documents: {
        passportScan: "https://res.cloudinary.com/travelagency/image/upload/passport_arun.jpg",
        photo: "https://res.cloudinary.com/travelagency/image/upload/photo_arun.jpg",
      },
      status: "submitted",
    });
    createdVisaAppId = visaApp._id;

    // 7.4 Visa Admin assigns Visa Specialist to the standalone VisaApplication
    const assignedVisaApp = await adminVisaService.assignCaseOfficer({
      visaId: createdVisaAppId,
      caseOfficerId: visaOfficerUser._id,
      assignedByAdminId: adminUser._id,
      adminRemarks: "Assigned to Dubai visa processing desk",
    });
    assert.strictEqual(String(assignedVisaApp.assignedAgent._id), String(visaOfficerUser._id));
    assert.strictEqual(assignedVisaApp.status, "assigned");

    // 7.5 Visa Specialist approves the standalone visa and uploads issued e-visa PDF
    const finalizedVisaApp = await adminVisaService.updateVisaStatus({
      visaId: createdVisaAppId,
      status: "approved",
      adminNotes: "Visa issued successfully by GDRFA Dubai",
      issuedVisaUrl: "https://res.cloudinary.com/travelagency/raw/upload/issued_dubai_evisa_123.pdf",
    });
    assert.strictEqual(finalizedVisaApp.status, "approved");
    assert.strictEqual(
      finalizedVisaApp.issuedVisaUrl,
      "https://res.cloudinary.com/travelagency/raw/upload/issued_dubai_evisa_123.pdf"
    );
  });
});
