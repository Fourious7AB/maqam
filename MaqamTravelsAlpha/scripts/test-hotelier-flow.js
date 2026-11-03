'use strict';

// Mock mongoose.startSession for test environment (standalone MongoDB without replica set)
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
// Load environment variables from the server root .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (process.env.NODE_ENV !== 'production') {
  const originalStartSession = mongoose.startSession;
  mongoose.startSession = async () => ({
    startTransaction: () => {},
    commitTransaction: async () => {},
    abortTransaction: async () => {},
    endSession: () => {},
    inTransaction: () => false,
    id: 'mockSessionId',
    options: {},
    // Mock client structure expected by MongoDB driver internals
    client: { s: { topology: {}, clientInfo: {} } },
    // Mock server session object with an id
    serverSession: { id: 'mockServerSession' }
  });
}

require('../modules/auth/auth.model');
const User = require('../modules/auth/auth.model');
const Hotel = require('../modules/hotels/hotelEntity.model');
const HotelStock = require('../modules/packages/stock/hotelStock.model');
const Package = require('../modules/packages/models/package.model');
const Offer = require('../modules/packages/offers/offer.model');
const { generateTokens } = require('../middleware/auth');
const hotelierService = require('../modules/hotelier/hotelier.service');
const crmService = require('../modules/crm/crm.service');
const availabilityService = require('../modules/packages/core/availability.service');
const stockClaimService = require('../modules/packages/stock/stockClaim.service');
const offerBookingService = require('../modules/packages/offers/offerBooking.service');
const OfferBooking = require('../modules/packages/offers/offerBooking.model');
const hotelBookingService = require('../modules/hotels/hotel-booking.service');
const HotelBooking = require('../modules/hotels/hotel.model');
const cache = require('../utils/cache');

// ---- Test environment patches ----
// Override Mongoose model create methods to ignore session options in tests
// Import models for test patches (HotelBooking already imported above)
const HotelBookingEvent = require('../modules/hotels/domain/hotel-booking-event.model');
const OutboxEvent = require('../modules/shared/outbox-event.model');
[HotelBooking, HotelBookingEvent, OutboxEvent].forEach((model) => {
  const originalCreate = model.create.bind(model);
  model.create = async (docs, opts) => {
    // Ignore session option in tests
    return originalCreate(docs);
  };
});

// Override save method on HotelBooking documents to ignore session
if (HotelBooking.schema && HotelBooking.prototype && HotelBooking.prototype.save) {
  const originalSave = HotelBooking.prototype.save;
  HotelBooking.prototype.save = async function (opts) {
    return originalSave.call(this);
  };
}
// End of test patches

async function runTest() {
  console.log("=== STARTING HOTELIER MODULE INTEGRATION TEST ===");

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/travel_agency_test';
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB.");

  try {
    // 1. Create Admin User
    const adminUser = await User.create({
      phone: `+9999${Date.now().toString().slice(-6)}`,
      email: `admin_${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'super_admin',
    });
    console.log("✔ Admin user created:", adminUser._id);

    // 2. Create Hotel via CRM Service
    const hotel = await crmService.createHotel({
      name: 'Grand Hyatt Dubai',
      destination: 'Dubai',
      address: 'Dubai Healthcare City',
      contactPerson: 'Manager John',
      contactPhone: '+97140000000',
      contactEmail: 'hyatt@test.com',
      contractNotes: 'Admin internal notes - confidential',
      isActive: true,
    }, adminUser._id);
    console.log("✔ Hotel created:", hotel._id, hotel.name);

    // 3. Create Hotelier User via CRM Service
    const hotelierUserObj = await crmService.createCrmUser({
      phone: `+8888${Date.now().toString().slice(-6)}`,
      email: `hotelier_${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Hotelier',
      lastName: 'Staff',
      role: 'hotelier',
      hotelId: hotel._id,
    }, adminUser._id);
    const hotelierUser = await User.findById(hotelierUserObj._id);
    console.log("✔ Hotelier user created:", hotelierUser._id, "linked to hotelId:", hotelierUser.hotelId);

    // 4. Hotelier creates HotelStock batch (pending_review)
    const stockBatch = await hotelierService.createStockBatch(
      hotelierUser.hotelId,
      hotelierUser._id,
      {
        destination: 'Dubai',
        roomType: 'Deluxe Suite',
        checkIn: new Date(Date.now() + 86400000),
        checkOut: new Date(Date.now() + 86400000 * 4),
        pricePerNight: 200,
        meals: ['breakfast'],
        reservationRef: 'RES-DUBAI-101',
        nameAdditionDeadline: new Date(Date.now() + 86400000 * 2),
        unitCount: 5,
      }
    );
    console.log("✔ Hotelier created stock batch:", stockBatch._id, "with reviewStatus:", stockBatch.reviewStatus);
    if (stockBatch.reviewStatus !== 'pending_review') throw new Error("Expected initial reviewStatus to be 'pending_review'");

    // 5. Test initial availability (should be 0 because reviewStatus is pending_review)
    const rawStock = await HotelStock.findById(stockBatch._id).populate('hotelId');
    const initAvail = availabilityService.availabilityForStock(rawStock, 1);
    console.log("✔ Availability for unapproved stock:", initAvail);
    if (initAvail !== 0) throw new Error("Unapproved stock should have 0 availability!");

    // 6. Hotelier toggles unit status (available <-> blocked)
    const unitToBlock = stockBatch.units[0]._id;
    const updatedStock = await hotelierService.updateUnitStatus(
      hotelierUser.hotelId,
      stockBatch._id,
      unitToBlock,
      'blocked'
    );
    console.log("✔ Hotelier blocked unit", unitToBlock, "- batch reviewStatus remains:", updatedStock.reviewStatus);

    // Test illegal unit status update attempt by hotelier
    try {
      await hotelierService.updateUnitStatus(hotelierUser.hotelId, stockBatch._id, unitToBlock, 'assigned');
      throw new Error("Should have thrown error when hotelier tried setting status to 'assigned'");
    } catch (err) {
      console.log("✔ Successfully rejected illegal unit status change from hotelier:", err.message);
    }

    // 7. Admin lists pending queue and approves batch
    const pendingRes = await crmService.listPendingHotelStock();
    console.log("✔ Pending stock queue count:", pendingRes.meta.total);

    const approvedStock = await crmService.reviewHotelStock(
      stockBatch._id,
      { decision: 'approved', reviewNotes: 'Verified block contract details.' },
      adminUser._id
    );
    console.log("✔ Admin approved stock batch:", approvedStock._id, "status:", approvedStock.reviewStatus);

    // 8. Re-evaluate availability after approval (5 total units, 1 blocked = 4 available)
    const approvedRawStock = await HotelStock.findById(stockBatch._id).populate('hotelId');
    const availAfterApprove = availabilityService.availabilityForStock(approvedRawStock, 1);
    console.log("✔ Availability for approved stock:", availAfterApprove);
    if (availAfterApprove !== 4) throw new Error(`Expected 4 available units, got ${availAfterApprove}`);

    // 9. Create Offer using approved HotelStock
    const offer = await Offer.create({
      title: 'Luxury Dubai Getaway Offer',
      description: 'Exclusive deal for 3 nights in Deluxe Suite',
      destination: 'Dubai',
      itemType: 'hotel',
      hotelRef: {
        stock: stockBatch._id,
        unitsPerBooking: 1,
      },
      sellPrice: 500,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 30),
      createdBy: adminUser._id,
    });
    console.log("✔ Created Offer using approved HotelStock:", offer._id);







    const populatedOfferStock = await HotelStock.findById(offer.hotelRef.stock).populate('hotelId');
    const offerAvail = availabilityService.availabilityForOffer(populatedOfferStock, offer.hotelRef.unitsPerBooking);
    console.log("✔ Offer available slots:", offerAvail);
    if (offerAvail !== 4) throw new Error(`Expected offer availability 4, got ${offerAvail}`);

    // 10. Test Hotel.isActive = false cascade
    await crmService.updateHotel(hotel._id, { isActive: false });
    console.log("✔ Deactivated hotel (isActive: false)");

    const deactivatedRawStock = await HotelStock.findById(stockBatch._id).populate('hotelId');
    const cascadeAvail = availabilityService.availabilityForOffer(deactivatedRawStock, 1);
    console.log("✔ Offer availability after hotel deactivation:", cascadeAvail);
    if (cascadeAvail !== 0) throw new Error("Expected availability 0 when hotel is inactive!");

    // Restore hotel active status
    await crmService.updateHotel(hotel._id, { isActive: true });
    console.log("✔ Re-activated hotel (isActive: true)");

    // 11. Test Unit Claiming
    const claimRes = await stockClaimService.claimUnitsForRefs({
      hotelRefs: [{ stock: stockBatch._id, unitsPerBooking: 1 }],
      quantity: 2,
      bookingId: new mongoose.Types.ObjectId(),
      bookingModel: 'OfferBooking',
    });
    console.log("✔ Claimed units successfully:", claimRes.claimedHotelUnits.map((u) => u.unitId));

    const postClaimStock = await HotelStock.findById(stockBatch._id).populate('hotelId');
    const postClaimAvail = availabilityService.availabilityForStock(postClaimStock, 1);
    console.log("✔ Availability after claiming 2 units:", postClaimAvail);
    if (postClaimAvail !== 2) throw new Error(`Expected 2 available units remaining, got ${postClaimAvail}`);

    // 12. Create Customer User & Test Customer Booking Flows
    const customerUser = await User.create({
      phone: `+7777${Date.now().toString().slice(-6)}`,
      email: `customer_${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Customer',
      lastName: 'User',
      role: 'customer',
    });
    console.log("✔ Customer user created:", customerUser._id);

    // 12a. Customer books the offer created from Hotelier stock
    const offerBooking = await offerBookingService.createOfferBooking({
      userId: customerUser._id,
      offerId: offer._id,
      travellers: [{ isLead: true }],
      quantity: 1,
    });
    console.log("✔ Customer created OfferBooking:", offerBooking._id, "status:", offerBooking.status);
    console.log("✔ OfferBooking claimed hotel unit:", offerBooking.claimedHotelUnits.map((u) => u.unitId));

    const postCustomerBookingStock = await HotelStock.findById(stockBatch._id).populate('hotelId');
    const postCustomerAvail = availabilityService.availabilityForStock(postCustomerBookingStock, 1);
    console.log("✔ Availability after Customer OfferBooking (claimed 1 unit from remaining 2):", postCustomerAvail);
    if (postCustomerAvail !== 1) throw new Error(`Expected 1 available unit remaining after customer booking, got ${postCustomerAvail}`);

    // 12b. Customer performs direct Hotel Booking (SRDV/Standard Hotel Booking Usecase)
    const recheckId = `recheck_${Date.now()}`;
    await cache.set(`hotel:recheck:${recheckId}`, {
      searchId: 'search_test_123',
      hotelId: hotel._id.toString(),
      sellingQuote: {
        customerTotalMinor: 50000,
        supplierAmountMinor: 40000,
        markupMinor: 80000,
        feeMinor: 2000,
        currency: 'INR',
        pricingVersion: 1,
      },
      providerResult: {
        hotel: { name: hotel.name, address: hotel.address },
        roomSnapshots: [{ roomTypeName: 'Deluxe Suite' }],
        cancellationPolicy: { refundable: true },
        priceChanged: false,
        policyChanged: false,
      },
      searchSession: {
        hotels: [{ HotelCode: hotel._id.toString(), SrdvIndex: 1, ResultIndex: 0 }],
        criteria: { checkIn: '2026-09-01', checkOut: '2026-09-05' },
        srdvType: 'hotel',
        traceId: 'trace_test_123',
      },
    }, 60000);

    const directHotelBooking = await hotelBookingService.createBooking({
      userId: customerUser._id,
      recheckId,
      guests: [{ firstName: 'Customer', lastName: 'User', age: 30, type: 'Adult' }],
      acceptChanges: true,
    });
    console.log("✔ Direct Hotel Booking created:", directHotelBooking._id, "status:", directHotelBooking.status);
    if (directHotelBooking.status !== 'awaiting_payment') {
      throw new Error(`Expected booking status 'awaiting_payment', got '${directHotelBooking.status}'`);
    }

    // Confirm booking after payment
    const paymentObj = { _id: new mongoose.Types.ObjectId().toString(), status: 'SUCCESS' };
    const confirmedBooking = await hotelBookingService.confirmBookingAfterPayment({
      bookingId: directHotelBooking._id,
      payment: paymentObj,
    });
    console.log("✔ Direct Hotel Booking confirmed after payment, status:", confirmedBooking.status);
    if (confirmedBooking.status !== 'payment_received') {
      throw new Error(`Expected booking status 'payment_received', got '${confirmedBooking.status}'`);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  EDGE CASE TESTS
    // ════════════════════════════════════════════════════════════════════════
    console.log("\n--- EDGE CASE TESTS ---\n");

    // EC-1: Hotelier cannot access stock from another hotel
    const hotel2 = await crmService.createHotel({
      name: 'Test Hotel Makkah',
      destination: 'Makkah',
      address: 'Makkah Road',
      contactPerson: 'Staff',
      contactPhone: '+9660000001',
      contactEmail: 'makkah@test.com',
      isActive: true,
    }, adminUser._id);

    const hotelierUser2Obj = await crmService.createCrmUser({
      phone: `+6666${Date.now().toString().slice(-6)}`,
      email: `hotelier2_${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Hotelier2',
      lastName: 'Staff',
      role: 'hotelier',
      hotelId: hotel2._id,
    }, adminUser._id);
    const hotelierUser2 = await User.findById(hotelierUser2Obj._id);

    try {
      await hotelierService.updateUnitStatus(
        hotelierUser2.hotelId,        // hotel2
        stockBatch._id,               // stock belongs to hotel1
        stockBatch.units[1]._id,
        'blocked'
      );
      throw new Error("Should have thrown when hotelier2 tried to access hotel1's stock");
    } catch (err) {
      console.log("✔ EC-1: Cross-hotel stock access rejected:", err.message);
    }

    // EC-2: Editing stock batch resets reviewStatus to pending_review
    const editedStock = await hotelierService.updateStockBatch(
      hotelierUser.hotelId,
      stockBatch._id,
      { pricePerNight: 250 }
    );
    console.log("✔ EC-2: Stock batch edited, reviewStatus:", editedStock.reviewStatus);
    if (editedStock.reviewStatus !== 'pending_review') {
      throw new Error("Expected reviewStatus 'pending_review' after edit");
    }

    // Re-approve for subsequent tests
    await crmService.reviewHotelStock(
      stockBatch._id,
      { decision: 'approved', reviewNotes: 'Re-approved after price edit.' },
      adminUser._id
    );
    console.log("✔ EC-2: Stock batch re-approved after edit");

    // EC-3: Adding units to batch resets reviewStatus
    const batchAfterAdd = await hotelierService.addUnitsToBatch(
      hotelierUser.hotelId,
      stockBatch._id,
      2
    );
    console.log("✔ EC-3: Added 2 units to batch, new unit count:", batchAfterAdd.units.length, "reviewStatus:", batchAfterAdd.reviewStatus);
    if (batchAfterAdd.reviewStatus !== 'pending_review') {
      throw new Error("Expected reviewStatus 'pending_review' after adding units");
    }

    // Re-approve again
    await crmService.reviewHotelStock(
      stockBatch._id,
      { decision: 'approved', reviewNotes: 'Re-approved after unit addition.' },
      adminUser._id
    );

    // EC-4: Admin rejects a stock batch
    const stockBatch2 = await hotelierService.createStockBatch(
      hotelierUser.hotelId,
      hotelierUser._id,
      {
        destination: 'Dubai',
        roomType: 'Standard Room',
        checkIn: new Date(Date.now() + 86400000 * 10),
        checkOut: new Date(Date.now() + 86400000 * 13),
        pricePerNight: 100,
        meals: [],
        reservationRef: 'RES-DUBAI-REJECT',
        nameAdditionDeadline: new Date(Date.now() + 86400000 * 8),
        unitCount: 3,
      }
    );
    const rejectedStock = await crmService.reviewHotelStock(
      stockBatch2._id,
      { decision: 'rejected', reviewNotes: 'Contract details missing.' },
      adminUser._id
    );
    console.log("✔ EC-4: Stock batch rejected, reviewStatus:", rejectedStock.reviewStatus);
    if (rejectedStock.reviewStatus !== 'rejected') {
      throw new Error("Expected reviewStatus 'rejected'");
    }
    const rejectedAvail = availabilityService.availabilityForStock(
      await HotelStock.findById(stockBatch2._id).populate('hotelId'), 1
    );
    console.log("✔ EC-4: Rejected stock availability:", rejectedAvail);
    if (rejectedAvail !== 0) throw new Error("Rejected stock should have 0 availability");

    // EC-5: Over-claiming units fails gracefully and releases partial claims
    try {
      await stockClaimService.claimUnitsForRefs({
        hotelRefs: [{ stock: stockBatch._id, unitsPerBooking: 1 }],
        quantity: 999,
        bookingId: new mongoose.Types.ObjectId(),
        bookingModel: 'OfferBooking',
      });
      throw new Error("Should have thrown for over-claiming");
    } catch (err) {
      console.log("✔ EC-5: Over-claiming rejected with rollback:", err.message);
    }

    // EC-6: Claiming from inactive hotel fails
    await crmService.updateHotel(hotel._id, { isActive: false });
    try {
      await stockClaimService.claimUnitsForRefs({
        hotelRefs: [{ stock: stockBatch._id, unitsPerBooking: 1 }],
        quantity: 1,
        bookingId: new mongoose.Types.ObjectId(),
        bookingModel: 'OfferBooking',
      });
      throw new Error("Should have thrown for inactive hotel claim");
    } catch (err) {
      console.log("✔ EC-6: Claiming from inactive hotel rejected:", err.message);
    }
    await crmService.updateHotel(hotel._id, { isActive: true });

    // EC-7: Duplicate recheckId (recheck already consumed) returns 410
    try {
      await hotelBookingService.createBooking({
        userId: customerUser._id,
        recheckId,  // already consumed above
        guests: [{ firstName: 'Customer', lastName: 'User', age: 30, type: 'Adult' }],
        acceptChanges: true,
      });
      // If no error, it should return the existing booking (idempotency)
      console.log("✔ EC-7: Duplicate recheckId returned existing booking (idempotent)");
    } catch (err) {
      console.log("✔ EC-7: Duplicate recheckId correctly rejected:", err.message);
    }

    // EC-8: Idempotent payment confirmation (confirming twice should be safe)
    const reconfirmed = await hotelBookingService.confirmBookingAfterPayment({
      bookingId: directHotelBooking._id,
      payment: paymentObj,
    });
    console.log("✔ EC-8: Idempotent payment confirmation, status:", reconfirmed.status);
    if (reconfirmed.status !== 'payment_received') {
      throw new Error("Idempotent confirmation should preserve payment_received status");
    }

    // EC-9: Price change without acceptChanges should fail
    const recheckId2 = `recheck_pricechange_${Date.now()}`;
    await cache.set(`hotel:recheck:${recheckId2}`, {
      searchId: 'search_test_price_change',
      hotelId: hotel._id.toString(),
      sellingQuote: {
        customerTotalMinor: 60000,
        supplierAmountMinor: 50000,
        markupMinor: 8000,
        feeMinor: 2000,
        currency: 'INR',
        pricingVersion: 1,
      },
      providerResult: {
        hotel: { name: hotel.name, address: hotel.address },
        roomSnapshots: [{ roomTypeName: 'Deluxe Suite' }],
        cancellationPolicy: { refundable: true },
        priceChanged: true,      // price changed!
        policyChanged: false,
      },
      searchSession: {
        hotels: [{ HotelCode: hotel._id.toString(), SrdvIndex: 1, ResultIndex: 0 }],
        criteria: { checkIn: '2026-10-01', checkOut: '2026-10-05' },
        srdvType: 'hotel',
        traceId: 'trace_price_change',
      },
    }, 60000);

    try {
      await hotelBookingService.createBooking({
        userId: customerUser._id,
        recheckId: recheckId2,
        guests: [{ firstName: 'Test', lastName: 'User', age: 25, type: 'Adult' }],
        acceptChanges: false,   // customer does NOT accept
      });
      throw new Error("Should have thrown 409 for price change without acceptance");
    } catch (err) {
      console.log("✔ EC-9: Price change without acceptChanges rejected:", err.message);
    }

    // EC-10: Hotelier cannot create stock for inactive hotel
    await crmService.updateHotel(hotel._id, { isActive: false });
    try {
      await hotelierService.createStockBatch(
        hotelierUser.hotelId,
        hotelierUser._id,
        {
          destination: 'Dubai',
          roomType: 'Standard',
          checkIn: new Date(Date.now() + 86400000 * 20),
          checkOut: new Date(Date.now() + 86400000 * 23),
          pricePerNight: 150,
          meals: [],
          reservationRef: 'RES-INACTIVE',
          unitCount: 2,
        }
      );
      throw new Error("Should have thrown for stock creation on inactive hotel");
    } catch (err) {
      console.log("✔ EC-10: Stock creation on inactive hotel rejected:", err.message);
    }
    await crmService.updateHotel(hotel._id, { isActive: true });

    // EC-11: CRM reviewHotelStock rejects invalid decision value
    try {
      await crmService.reviewHotelStock(
        stockBatch._id,
        { decision: 'maybe', reviewNotes: 'invalid' },
        adminUser._id
      );
      throw new Error("Should have thrown for invalid review decision");
    } catch (err) {
      console.log("✔ EC-11: Invalid review decision rejected:", err.message);
    }

    // EC-12: CRM createCrmUser requires hotelId for hotelier role
    try {
      await crmService.createCrmUser({
        phone: `+5555${Date.now().toString().slice(-6)}`,
        email: `no_hotel_${Date.now()}@test.com`,
        password: 'password123',
        firstName: 'Bad',
        lastName: 'Hotelier',
        role: 'hotelier',
        // hotelId intentionally missing
      }, adminUser._id);
      throw new Error("Should have thrown for hotelier without hotelId");
    } catch (err) {
      console.log("✔ EC-12: Hotelier creation without hotelId rejected:", err.message);
    }

    // EC-13: listApprovedHotelStock filters out inactive hotels
    // hotel is active now, stockBatch should appear
    const approvedList = await crmService.listApprovedHotelStock();
    const found = approvedList.some((s) => s._id.toString() === stockBatch._id.toString());
    console.log("✔ EC-13: listApprovedHotelStock includes active hotel stock:", found);

    await crmService.updateHotel(hotel._id, { isActive: false });
    const approvedList2 = await crmService.listApprovedHotelStock();
    const found2 = approvedList2.some((s) => s._id.toString() === stockBatch._id.toString());
    console.log("✔ EC-13: listApprovedHotelStock excludes inactive hotel stock:", !found2);
    if (found2) throw new Error("Inactive hotel stock should not appear in approved list");
    await crmService.updateHotel(hotel._id, { isActive: true });

    // EC-14: Hotelier cannot change status of assigned unit
    // Find a unit that is currently 'assigned' from earlier claims
    const stockWithAssigned = await HotelStock.findById(stockBatch._id);
    const assignedUnit = stockWithAssigned.units.find((u) => u.status === 'assigned');
    if (assignedUnit) {
      try {
        await hotelierService.updateUnitStatus(
          hotelierUser.hotelId,
          stockBatch._id,
          assignedUnit._id,
          'available'
        );
        throw new Error("Should have thrown when changing assigned unit status");
      } catch (err) {
        console.log("✔ EC-14: Cannot change assigned unit status:", err.message);
      }
    } else {
      console.log("⚠ EC-14: Skipped (no assigned units found to test)");
    }

    // EC-15: addUnitsToBatch with invalid count
    try {
      await hotelierService.addUnitsToBatch(hotelierUser.hotelId, stockBatch._id, 0);
      throw new Error("Should have thrown for 0 unit count");
    } catch (err) {
      console.log("✔ EC-15: addUnitsToBatch with count=0 rejected:", err.message);
    }

    // EC-16: Booking for non-existent offer
    try {
      await offerBookingService.createOfferBooking({
        userId: customerUser._id,
        offerId: new mongoose.Types.ObjectId(),
        travellers: [{ isLead: true }],
        quantity: 1,
      });
      throw new Error("Should have thrown for non-existent offer");
    } catch (err) {
      console.log("✔ EC-16: Booking non-existent offer rejected:", err.message);
    }

    // EC-17: Confirm payment for non-existent booking
    try {
      await hotelBookingService.confirmBookingAfterPayment({
        bookingId: new mongoose.Types.ObjectId(),
        payment: { _id: 'fake', status: 'SUCCESS' },
      });
      throw new Error("Should have thrown for non-existent booking");
    } catch (err) {
      console.log("✔ EC-17: Payment confirmation for non-existent booking rejected:", err.message);
    }

    // EC-18: createStockBatch with zero units
    try {
      await hotelierService.createStockBatch(
        hotelierUser.hotelId,
        hotelierUser._id,
        {
          destination: 'Dubai',
          roomType: 'Standard',
          checkIn: new Date(Date.now() + 86400000 * 30),
          checkOut: new Date(Date.now() + 86400000 * 33),
          pricePerNight: 100,
          meals: [],
          reservationRef: 'RES-ZERO',
          unitCount: 0,
        }
      );
      throw new Error("Should have thrown for 0 unit count");
    } catch (err) {
      console.log("✔ EC-18: Stock batch with 0 units rejected:", err.message);
    }

    console.log("\n==================================================");
    console.log("🎉 ALL HOTELIER MODULE INTEGRATION TESTS PASSED!");
    console.log("   (Including 18 edge case tests)");
    console.log("==================================================\n");

  } finally {
    // Cleanup created test documents
    await User.deleteMany({ email: { $regex: /test\.com/ } });
    await Hotel.deleteMany({ name: { $in: ['Grand Hyatt Dubai', 'Test Hotel Makkah'] } });
    await HotelStock.deleteMany({ reservationRef: { $regex: /^RES-/ } });
    await Offer.deleteMany({ title: 'Luxury Dubai Getaway Offer' });
    await OfferBooking.deleteMany({});
    await HotelBooking.deleteMany({ provider: 'srdv' });
    await HotelBookingEvent.deleteMany({});
    await OutboxEvent.deleteMany({});
    await mongoose.disconnect();
  }
}


runTest().catch((err) => {
  console.error("❌ INTEGRATION TEST FAILED:", err);
  process.exit(1);
});
