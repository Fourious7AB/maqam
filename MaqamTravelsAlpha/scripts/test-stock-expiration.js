'use strict';

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../modules/auth/auth.model');
const Hotel = require('../modules/hotels/hotelEntity.model');
const HotelStock = require('../modules/packages/stock/hotelStock.model');
const Offer = require('../modules/packages/offers/offer.model');
const OfferBooking = require('../modules/packages/offers/offerBooking.model');
const Package = require('../modules/packages/models/package.model');
const PackageBooking = require('../modules/packages/models/packageBooking.model');
const offerBookingService = require('../modules/packages/offers/offerBooking.service');
const { availabilityForStock } = require('../modules/packages/core/availability.service');
const { expireUnpaidStockBookings } = require('../modules/packages/stock/stockExpiration.service');

async function runTest() {
  console.log("=== STARTING STOCK EXPIRATION WORKER INTEGRATION TEST ===");

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/travel_agency_test';
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB.");

  try {
    // 1. Setup Test User, Hotel & Stock
    const adminUser = await User.create({
      phone: `+9100${Date.now().toString().slice(-6)}`,
      email: `exp_admin_${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'ExpAdmin',
      lastName: 'User',
      role: 'super_admin',
    });

    const hotel = await Hotel.create({
      name: 'Expiration Test Resort',
      destination: 'Goa',
      address: 'Beach Road',
      isActive: true,
      createdBy: adminUser._id,
    });

    const stockBatch = await HotelStock.create({
      hotelId: hotel._id,
      hotelName: hotel.name,
      destination: 'Goa',
      roomType: 'Sea View Suite',
      checkIn: new Date(Date.now() + 86400000),
      checkOut: new Date(Date.now() + 86400000 * 3),
      pricePerNight: 150,
      meals: ['breakfast'],
      reservationRef: 'RES-EXP-001',
      nameAdditionDeadline: new Date(Date.now() + 86400000 * 2),
      reviewStatus: 'approved',
      units: [
        { status: 'available' },
        { status: 'available' },
        { status: 'available' },
      ],
      createdBy: adminUser._id,
    });

    let stockDoc = await HotelStock.findById(stockBatch._id).populate('hotelId');
    console.log("✔ Initial available stock units:", availabilityForStock(stockDoc, 1));
    if (availabilityForStock(stockDoc, 1) !== 3) throw new Error("Expected 3 available units");

    // 2. Create Offer
    const offer = await Offer.create({
      title: 'Goa Beach Deal',
      description: 'Exclusive 2 night stay',
      destination: 'Goa',
      itemType: 'hotel',
      hotelRef: { stock: stockBatch._id, unitsPerBooking: 1 },
      sellPrice: 400,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 10),
      createdBy: adminUser._id,
    });

    // 3. Create Customer and Place Unpaid Offer Booking
    const customer = await User.create({
      phone: `+9111${Date.now().toString().slice(-6)}`,
      email: `exp_customer_${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'ExpCustomer',
      lastName: 'User',
      role: 'customer',
    });

    const booking = await offerBookingService.createOfferBooking({
      userId: customer._id,
      offerId: offer._id,
      travellers: [{ isLead: true }],
      quantity: 1,
    });

    console.log("✔ Created OfferBooking:", booking._id, "status:", booking.status);

    // Verify stock unit was assigned
    stockDoc = await HotelStock.findById(stockBatch._id).populate('hotelId');
    console.log("✔ Available units after booking (should be 2):", availabilityForStock(stockDoc, 1));
    if (availabilityForStock(stockDoc, 1) !== 2) throw new Error("Expected 2 available units remaining");

    // 4. Manually backdate booking.createdAt to simulate 35 minutes passing
    await OfferBooking.collection.updateOne({ _id: booking._id }, { $set: { createdAt: new Date(Date.now() - 35 * 60 * 1000) } });
    console.log("✔ Simulated 35 minutes passing (backdated createdAt)");

    // 5. Run Stock Expiration Routine (timeout: 30 minutes)
    const result = await expireUnpaidStockBookings({ timeoutMs: 30 * 60 * 1000 });
    console.log("✔ Expiration routine result:", result);
    if (result.totalExpired !== 1 || result.totalUnitsReleased !== 1) {
      throw new Error(`Expected 1 expired booking and 1 unit released, got ${JSON.stringify(result)}`);
    }

    // 6. Verify Booking status is now 'cancelled' and Stock is restored to 3 available
    const updatedBooking = await OfferBooking.findById(booking._id);
    console.log("✔ Expired booking status:", updatedBooking.status, "reason:", updatedBooking.cancellationReason);
    if (updatedBooking.status !== 'cancelled') throw new Error("Expected booking status 'cancelled'");

    stockDoc = await HotelStock.findById(stockBatch._id).populate('hotelId');
    const finalAvail = availabilityForStock(stockDoc, 1);
    console.log("✔ Restored stock availability after auto-expiration:", finalAvail);
    if (finalAvail !== 3) throw new Error(`Expected 3 available units, got ${finalAvail}`);

    console.log("\n==================================================");
    console.log("🎉 STOCK EXPIRATION WORKER TEST PASSED!");
    console.log("==================================================\n");
  } finally {
    await User.deleteMany({ email: { $regex: /exp_.*@test\.com/ } });
    await Hotel.deleteMany({ name: 'Expiration Test Resort' });
    await HotelStock.deleteMany({ reservationRef: 'RES-EXP-001' });
    await Offer.deleteMany({ title: 'Goa Beach Deal' });
    await OfferBooking.deleteMany({});
    await PackageBooking.deleteMany({});
    await mongoose.disconnect();
  }
}

runTest().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
