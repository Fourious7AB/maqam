// modules/packages/core/packageBooking.service.js
const mongoose = require("mongoose");
const Package = require("../models/package.model");
const PackageBooking = require("../models/packageBooking.model");
const Offer = require("../offers/offer.model");
const Traveller = require("../../account/traveller.model");
const User = require("../../auth/auth.model");
const stockClaim = require("../stock/stockClaim.service");
const packageService = require("./package.service");
const { AppError } = require("../../../middleware/errorHandler");
const logger = require("../../../utils/logger");

const TicketStock = require("../stock/ticketStock.model");
const HotelStock = require("../stock/hotelStock.model");
const Payment = require("../../payments/payment.model");
const MasterBooking = require("../../bookings/booking.model");
const {
  releaseOneUnit,
  markUnitsUsed,
} = require("../stock/stockClaim.service");

const STOCK_MODELS = {
  TicketStock,
  HotelStock,
};

const releaseBookingStockUnits = async (booking) => {
  let unitsReleased = 0;
  const releasedKeys = new Set();

  // 1. Release from generic claimedUnits
  for (const unit of booking.claimedUnits || []) {
    const StockModel = STOCK_MODELS[unit.stockModel];
    if (StockModel && unit.stock && unit.unitId) {
      const key = `${unit.stock}_${unit.unitId}`;
      if (!releasedKeys.has(key)) {
        await releaseOneUnit(StockModel, unit.stock, unit.unitId);
        releasedKeys.add(key);
        unitsReleased++;
      }
    }
  }

  // 2. Release from flight units (if not already released)
  for (const unit of booking.claimedFlightUnits || []) {
    if (unit.stock && unit.unitId) {
      const key = `${unit.stock}_${unit.unitId}`;
      if (!releasedKeys.has(key)) {
        await releaseOneUnit(TicketStock, unit.stock, unit.unitId);
        releasedKeys.add(key);
        unitsReleased++;
      }
    }
  }

  // 3. Release from hotel units (if not already released)
  for (const unit of booking.claimedHotelUnits || []) {
    if (unit.stock && unit.unitId) {
      const key = `${unit.stock}_${unit.unitId}`;
      if (!releasedKeys.has(key)) {
        await releaseOneUnit(HotelStock, unit.stock, unit.unitId);
        releasedKeys.add(key);
        unitsReleased++;
      }
    }
  }

  return unitsReleased;
};

const createBooking = async ({
  userId,
  packageId,
  travellers,
  quantity = 1,
  excludedOfferIds = [],
  swappedOffers = [],
  includedOfferIds,
  includeGuide,
  guideSelected,
  guideLocation,
  guidePrice,
}) => {
  if (!Array.isArray(travellers) || travellers.length === 0) {
    throw new AppError("At least one traveller is required", 400);
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new AppError("quantity must be an integer >= 1", 400);
  }
  if (travellers.filter((t) => t.isLead).length !== 1) {
    throw new AppError("Exactly one traveller must be marked isLead", 400);
  }

  // Calculate dynamic quote & verify active items >= 2
  const quote = await packageService.calculateCustomQuote(packageId, {
    quantity,
    excludedOfferIds,
    swappedOffers,
    includedOfferIds,
    includeGuide,
    guideSelected,
    guideLocation,
    guidePrice,
  });

  const pkg = await Package.findById(packageId);
  if (!pkg || !pkg.isActive) {
    throw new AppError("Package not found or inactive", 404);
  }

  // Build stock reservation items from active offers
  const itemsToClaim = [];
  const activeOfferIds = [];

  for (const item of quote.items) {
    if (!item.isIncluded) continue;

    if (item.type === "flight" || item.type === "hotel") {
      activeOfferIds.push(item.id);
      const offerDoc = await Offer.findById(item.id);
      if (!offerDoc) continue;

      const offerUnitsMultiplier = item.units || 1;

      if (offerDoc.itemType === "flight" && offerDoc.flightRef?.stock) {
        const flightCount =
          (offerDoc.flightRef.unitsPerBooking || 1) *
          offerUnitsMultiplier *
          quantity;
        itemsToClaim.push({
          stockModel: "TicketStock",
          stockId: offerDoc.flightRef.stock,
          count: flightCount,
        });
      } else if (offerDoc.itemType === "hotel" && offerDoc.hotelRef?.stock) {
        const hotelCount =
          (offerDoc.hotelRef.unitsPerBooking || 1) *
          offerUnitsMultiplier *
          quantity;
        itemsToClaim.push({
          stockModel: "HotelStock",
          stockId: offerDoc.hotelRef.stock,
          count: hotelCount,
        });
      }
    }
  }

  // 1. Initial PackageBooking creation
  const allIncludedOfferIds = quote.items
    .filter((item) => item.isIncluded && item.type !== "guide_tour")
    .map((item) => item.id);

  const customizedSelections = { 
    includedOfferIds: Array.isArray(includedOfferIds) ? includedOfferIds.map(String) :[],
    excludedOfferIds: (quote.excludedOfferIds || excludedOfferIds || []).map(String),
    swappedOffers: swappedOffers || [],   
  };

  const packageSnapshot = {
    title: pkg.title,
    destination: pkg.destination,
    basePackageSellPrice: quote.basePackageSellPrice,
    bundleDiscountPercentage: quote.bundleDiscountPercentage,
    deductions: quote.deductions,
    swapDeltas: quote.swapDeltas,
    finalSellPrice: quote.finalSellPrice,
    guidePrice: quote.guidePrice || 0,
    guideSelected: quote.guideSelected || null,
    guideLocation: quote.guideLocation || [],
    guideDetails: quote.guideDetails || null,
    inclusions: pkg.inclusions,
    itinerary: pkg.itinerary,
    validity: pkg.validity,
    items: quote.items,
  };

  const cleanTravellers = travellers.map((t) => ({
    travellerId: t.travellerId || (mongoose.Types.ObjectId.isValid(t._id || t.id) ? (t._id || t.id) : undefined),
    firstName: t.firstName || t.name || "",
    lastName: t.lastName || "",
    title: t.title || "Mr",
    gender: t.gender || "male",
    email: t.email || "",
    phone: t.phone || "",
    isLead: !!t.isLead,
  }));

  const booking = await PackageBooking.create({
    userId,
    packageId,
    guideSelected: quote.guideSelected || null,
    guideLocation:
      quote.guideLocation && quote.guideLocation.length > 0
        ? quote.guideLocation
        : [],
    guidePrice: quote.guidePrice || 0,
    packageSnapshot,
    customizedSelections,
    travellers: cleanTravellers,
    quantity,
    totalAmount: quote.totalAmount,
    status: "initiated",
  });

  // 2. Attempt atomic stock claim
  try {
    const { claimedUnits, claimedFlightUnits, claimedHotelUnits } =
      await stockClaim.claimUnitsForItems({
        items: itemsToClaim,
        bookingId: booking._id,
        bookingModel: "PackageBooking",
      });

    booking.claimedUnits = claimedUnits;
    booking.claimedFlightUnits = claimedFlightUnits;
    booking.claimedHotelUnits = claimedHotelUnits;
    booking.status = "pending";
    await booking.save();

    try {
      await MasterBooking.findOneAndUpdate(
        { itemId: booking._id, bookingType: "package" },
        {
          userId,
          bookingType: "package",
          itemId: booking._id,
          details: {
            destination: packageSnapshot?.destination || packageSnapshot?.title || "Package Trip",
            departureDate: packageSnapshot?.validity?.startDate,
            returnDate: packageSnapshot?.validity?.endDate,
            totalPrice: quote.totalAmount,
            currency: "INR",
            passengers: cleanTravellers.length,
          },
          status: "pending",
        },
        { upsert: true, new: true }
      );
    } catch (mbErr) {
      logger.error(`[Package Master Booking] Failed to sync master booking: ${mbErr.message}`);
    }
  } catch (error) {
    booking.status = "cancelled";
    booking.remark = `Claim failed: ${error.message}`;
    await booking.save();
    logger.error(`Package booking stock claim failed: ${error.message}`);
    throw new AppError(`Stock reservation failed: ${error.message}`, 400);
  }

  return {
    _id: booking._id,
    bookingId: booking._id,
    packageId: booking.packageId,
    totalAmount: booking.totalAmount,
    guideSelected: booking.guideSelected,
    guideLocation: booking.guideLocation,
    guidePrice: booking.guidePrice,
    status: booking.status,
    quantity: booking.quantity,
    customizedSelections: booking.customizedSelections,
    packageSnapshot: booking.packageSnapshot,
    claimedUnits: booking.claimedUnits,
  };
};

const cancelBooking = async (
  bookingId,
  userId,
  reason = "User requested cancellation",
) => {
  const booking = await PackageBooking.findOne({ _id: bookingId, userId });
  if (!booking) throw new AppError("Booking not found", 404);

  if (booking.status === "cancelled") {
    return booking;
  }

  // Release claimed stock units back to available
  await releaseBookingStockUnits(booking);

  booking.status = "cancelled";
  booking.cancellationReason = reason;
  booking.cancelledAt = new Date();
  await booking.save();

  // Update Master Booking if exists
  const Booking = require("../../bookings/booking.model");
  const masterBooking = await Booking.findOne({
    itemId: booking._id,
    bookingType: "package",
  });
  if (masterBooking) {
    masterBooking.status = "cancelled";
    masterBooking.cancellationReason = reason;
    masterBooking.cancelledAt = new Date();
    await masterBooking.save();
  }

  logger.info(
    `[Package Booking] Booking ${booking._id} cancelled and stock released.`,
  );
  return booking;
};

const getBookingById = async (bookingId, userId) => {
  const query = { _id: bookingId };
  if (userId) query.userId = userId;
  const booking = await PackageBooking.findOne(query).populate("assignedTo", "firstName lastName email phone avatar");
  if (!booking) throw new AppError("Booking not found", 404);
  return booking;
};

/**
 * Get all package bookings for the authenticated user's profile
 */
const getAllBookingPackage = async (userId, query = {}) => {
  if (!userId) {
    throw new AppError("User ID is required", 401);
  }
  const { page = 1, limit = 10, status, packageId } = query;

  const filter = { userId };
  if (status) filter.status = status;
  if (packageId) filter.packageId = packageId;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [bookings, total] = await Promise.all([
    PackageBooking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate(
        "packageId",
        "title destination sellPrice durationDays images itinerary",
      )
      .populate("assignedTo", "firstName lastName email phone avatar")
      .lean(),
    PackageBooking.countDocuments(filter),
  ]);

  return {
    bookings,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

const getBookingByIdAdmin = async (bookingId) => {
  const booking = await PackageBooking.findById(bookingId)
    .populate("userId", "name phone email")
    .populate("assignedTo", "firstName lastName email phone role avatar");
  if (!booking) throw new AppError("Booking not found", 404);
  return booking;
};

const assignPackageBookingAgent = async (bookingId, agentUserId) => {
  const booking = await PackageBooking.findByIdAndUpdate(
    bookingId,
    { assignedTo: agentUserId },
    { new: true },
  )
    .populate("userId", "name phone email")
    .populate("assignedTo", "firstName lastName email phone role avatar");

  if (!booking) throw new AppError("Booking not found", 404);
  return booking;
};

const listBookingsAdmin = async (query = {}) => {
  const { page = 1, limit = 20, status, packageId, userId, assignedTo } = query;

  const filter = {};
  if (status) filter.status = status;
  if (packageId) filter.packageId = packageId;
  if (userId) filter.userId = userId;
  if (assignedTo) filter.assignedTo = assignedTo;

  const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
  const [bookings, total] = await Promise.all([
    PackageBooking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("packageId", "title destination sellPrice")
      .populate("userId", "firstName lastName name email phone")
      .populate("assignedTo", "firstName lastName name email phone avatar"),
    PackageBooking.countDocuments(filter),
  ]);

  return {
    bookings,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

/**
 * Direct CRM Package Booking for a Customer via Offline / Bank Transfer Payment
 */
const bookPackageForCustomer = async ({
  customerId,
  packageId,
  quantity = 1,
  excludedOfferIds = [],
  swappedOffers = [],
  includedOfferIds,
  travellers = [],
  travelDates = {},
  contactDetails = {},
  payment = {},
  agentId,
  includeGuide,
  guideSelected,
  guideLocation,
  guidePrice,
}) => {
  if (!customerId)
    throw new AppError("customerId is required for direct booking", 400);
  if (!packageId) throw new AppError("packageId is required", 400);
  if (!Array.isArray(travellers) || travellers.length === 0) {
    throw new AppError("At least one traveller is required", 400);
  }

  // 1. Initiate booking & claim stock units atomically
  const created = await createBooking({
    userId: customerId,
    packageId,
    travellers,
    quantity,
    excludedOfferIds,
    swappedOffers,
    includedOfferIds,
    includeGuide,
    guideSelected,
    guideLocation,
    guidePrice,
  });

  const booking = await PackageBooking.findById(created._id);
  if (!booking) throw new AppError("Failed to retrieve initiated booking", 500);

  // 2. Mark claimed stock units as 'used' (confirmed booking)
  await markUnitsUsed(booking.claimedUnits);

  // 3. Update booking status, assignment, dates, and contact
  booking.status = "confirmed";
  if (agentId) booking.assignedTo = agentId;
  if (travelDates?.startDate || travelDates?.endDate) {
    booking.travelDates = {
      startDate: travelDates.startDate
        ? new Date(travelDates.startDate)
        : undefined,
      endDate: travelDates.endDate ? new Date(travelDates.endDate) : undefined,
    };
  }
  if (contactDetails) {
    booking.contactDetails = {
      email: contactDetails.email || "",
      phone: contactDetails.phone || "",
      emergencyContact: contactDetails.emergencyContact || "",
    };
  }
  if (payment.notes) {
    booking.remark = payment.notes;
  }
  await booking.save();

  // 4. Create Payment Record (Offline Bank Transfer)
  const refNum = payment.referenceNumber || `OFFLINE-PKG-${Date.now()}`;
  const paymentRecord = await Payment.create({
    userId: customerId,
    bookingId: booking._id,
    bookingModel: "PackageBooking",
    bookingType: "package",
    amount: booking.totalAmount,
    currency: "INR",
    paymentMethod: payment.method || "bank_transfer",
    status: "paid",
    gatewayData: {
      orderId: refNum,
      transactionId: refNum,
      raw: {
        referenceNumber: refNum,
        notes: payment.notes || "Direct CRM package booking by agent",
        settledByAgent: agentId,
      },
    },
  });

  // 5. Create Master Booking record
  const masterBooking = await MasterBooking.create({
    userId: customerId,
    bookingType: "package",
    itemId: booking._id,
    paymentId: paymentRecord._id,
    details: {
      destination: booking.packageSnapshot?.destination || "Package Trip",
      departureDate: booking.travelDates?.startDate || undefined,
      returnDate: booking.travelDates?.endDate || undefined,
      totalPrice: booking.totalAmount,
      currency: "INR",
      passengers: travellers.length,
    },
    status: "confirmed",
  });

  logger.info(
    `[Package Service] Direct CRM booking completed: ${booking._id} for customer ${customerId} by agent ${agentId}`,
  );

  return {
    booking,
    payment: paymentRecord,
    masterBooking,
  };
};

/**
 * Cancel a Package Booking via CRM / Admin
 */
const cancelBookingAdmin = async (
  bookingId,
  { reason = "Admin cancelled booking", agentId } = {},
) => {
  const booking = await PackageBooking.findById(bookingId);
  if (!booking) throw new AppError("Package booking not found", 404);

  if (booking.status === "cancelled") {
    return booking;
  }

  // 1. Release claimed stock units back to available
  await releaseBookingStockUnits(booking);

  // 2. Mark booking cancelled
  booking.status = "cancelled";
  booking.cancellationReason = reason;
  booking.cancelledAt = new Date();
  if (booking.remarks) {
    booking.remarks.push({
      text: `Cancelled by agent: ${reason}`,
      author: agentId || null,
      createdAt: new Date(),
    });
  }
  await booking.save();

  // 3. Update Master Booking
  const masterBooking = await MasterBooking.findOne({
    itemId: booking._id,
    bookingType: "package",
  });
  if (masterBooking) {
    masterBooking.status = "cancelled";
    masterBooking.cancellationReason = reason;
    masterBooking.cancelledAt = new Date();
    await masterBooking.save();
  }

  // 4. Update Payment if exists
  await Payment.findOneAndUpdate(
    { bookingId: booking._id, bookingModel: "PackageBooking" },
    { status: "refunded" },
  );

  logger.info(
    `[Package Service] Admin cancelled package booking ${booking._id} and released stock units.`,
  );
  return booking;
};

/**
 * Update confirmed package booking details (Travel Dates, Contact Info, Operational Remark)
 * Strict Guardrail: Does NOT allow adding, removing, or swapping bundled Offers.
 */
const updateConfirmedBookingAdmin = async (
  bookingId,
  updateData = {},
  agentId,
) => {
  const booking = await PackageBooking.findById(bookingId);
  if (!booking) throw new AppError("Package booking not found", 404);

  if (booking.status === "cancelled") {
    throw new AppError("Cannot modify a cancelled booking", 400);
  }

  // Guardrail: explicitly disallow altering component selections
  if (
    updateData.includedOfferIds ||
    updateData.excludedOfferIds ||
    updateData.swappedOffers ||
    updateData.customizedSelections ||
    updateData.packageId
  ) {
    throw new AppError(
      "Structural modifications (adding, removing, or swapping offers) are not allowed on confirmed bookings.",
      400,
    );
  }

  // 1. Update Travel Dates if provided
  if (updateData.travelDates) {
    booking.travelDates = {
      startDate: updateData.travelDates.startDate
        ? new Date(updateData.travelDates.startDate)
        : booking.travelDates?.startDate,
      endDate: updateData.travelDates.endDate
        ? new Date(updateData.travelDates.endDate)
        : booking.travelDates?.endDate,
    };
  }

  // 2. Update Contact Details if provided
  if (updateData.contactDetails) {
    booking.contactDetails = {
      email:
        updateData.contactDetails.email !== undefined
          ? updateData.contactDetails.email
          : booking.contactDetails?.email,
      phone:
        updateData.contactDetails.phone !== undefined
          ? updateData.contactDetails.phone
          : booking.contactDetails?.phone,
      emergencyContact:
        updateData.contactDetails.emergencyContact !== undefined
          ? updateData.contactDetails.emergencyContact
          : booking.contactDetails?.emergencyContact,
    };
  }

  // 3. Update Operational Remark if provided
  if (updateData.remark) {
    booking.remark = updateData.remark;
    booking.remarks.push({
      text: updateData.remark,
      author: agentId || null,
      createdAt: new Date(),
    });
  }

  await booking.save();

  // Keep Master Booking details synchronized if dates were changed
  if (updateData.travelDates) {
    await MasterBooking.findOneAndUpdate(
      { itemId: booking._id, bookingType: "package" },
      {
        "details.departureDate": booking.travelDates?.startDate,
        "details.returnDate": booking.travelDates?.endDate,
      },
    );
  }

  return booking;
};

/**
 * Add operational remark to a package booking
 */
const addBookingRemarkAdmin = async (bookingId, remarkText, agentId) => {
  if (!remarkText || typeof remarkText !== "string") {
    throw new AppError("Remark text is required", 400);
  }
  const booking = await PackageBooking.findById(bookingId);
  if (!booking) throw new AppError("Package booking not found", 404);

  booking.remark = remarkText;
  booking.remarks.push({
    text: remarkText,
    author: agentId || null,
    createdAt: new Date(),
  });
  await booking.save();

  return booking;
};

module.exports = {
  createBooking,
  cancelBooking,
  releaseBookingStockUnits,
  getBookingById,
  getAllBookingPackage,
  getBookingByIdAdmin,
  assignPackageBookingAgent,
  listBookingsAdmin,
  bookPackageForCustomer,
  cancelBookingAdmin,
  updateConfirmedBookingAdmin,
  addBookingRemarkAdmin,
};
