// modules/packages/offers/offer.service.js
//
// Standalone Retail Offer Service for Customer Storefront and CRM Management:
// Handles creation, listing, updating, live stock calculation, and direct customer bookings.

const Offer = require("./offer.model");
const OfferBooking = require("./offerBooking.model");
const TicketStock = require("../stock/ticketStock.model");
const HotelStock = require("../stock/hotelStock.model");
const User = require("../../auth/auth.model");
const Payment = require("../../payments/payment.model");
const MasterBooking = require("../../bookings/booking.model");
const { claimUnitsForRefs, releaseOneUnit } = require("../stock/stockClaim.service");
const { availabilityForOffer } = require("../core/availability.service");
const { AppError } = require("../../../middleware/errorHandler");
const logger = require("../../../utils/logger");

/**
 * ─────────────────────────────────────────────────────────────
 * OFFER CATALOG CRUD & LIVE AVAILABILITY
 * ─────────────────────────────────────────────────────────────
 */

const createOffer = async (data, userId) => {
  const {
    title,
    description,
    destination,
    images = [],
    itemType,
    flightRef,
    hotelRef,
    sellPrice,
    originalPrice,
    discountPercentage,
    inclusions = [],
    exclusions = [],
    startDate,
    endDate,
    isActive = true,
  } = data;

  if (!title || !destination || !itemType || sellPrice === undefined || !startDate || !endDate) {
    throw new AppError("Missing required offer fields (title, destination, itemType, sellPrice, startDate, endDate)", 400);
  }

  if (itemType !== "flight" && itemType !== "hotel") {
    throw new AppError("itemType must be 'flight' or 'hotel'", 400);
  }

  // Validate stock reference
  if (itemType === "flight") {
    if (!flightRef || !flightRef.stock) {
      throw new AppError("flightRef.stock is required for flight offers", 400);
    }
    const stock = await TicketStock.findById(flightRef.stock);
    if (!stock) throw new AppError(`TicketStock ${flightRef.stock} not found`, 404);
  } else {
    if (!hotelRef || !hotelRef.stock) {
      throw new AppError("hotelRef.stock is required for hotel offers", 400);
    }
    const stock = await HotelStock.findById(hotelRef.stock);
    if (!stock) throw new AppError(`HotelStock ${hotelRef.stock} not found`, 404);
  }

  const offer = await Offer.create({
    title: title.trim(),
    description,
    destination: destination.trim(),
    images,
    itemType,
    flightRef: itemType === "flight" ? {
      stock: flightRef.stock,
      unitsPerBooking: flightRef.unitsPerBooking || 1,
    } : undefined,
    hotelRef: itemType === "hotel" ? {
      stock: hotelRef.stock,
      unitsPerBooking: hotelRef.unitsPerBooking || 1,
    } : undefined,
    sellPrice: Number(sellPrice),
    originalPrice: originalPrice ? Number(originalPrice) : undefined,
    discountPercentage: discountPercentage ? Number(discountPercentage) : undefined,
    inclusions,
    exclusions,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    isActive,
    createdBy: userId,
  });

  logger.info(`[Offer Service] Offer created: ${offer._id} (${offer.title}, Type: ${offer.itemType})`);
  return offer;
};

const listOffers = async (query = {}, isAdmin = false) => {
  const {
    page = 1,
    limit = 20,
    itemType,
    destination,
    minPrice,
    maxPrice,
    search,
    isActive,
  } = query;

  const filter = {};
  if (!isAdmin) {
    filter.isActive = true;
  } else if (isActive !== undefined) {
    filter.isActive = String(isActive) === "true";
  }

  if (itemType) filter.itemType = itemType;
  if (destination) filter.destination = new RegExp(destination, "i");
  if (search) filter.title = new RegExp(search, "i");

  if (minPrice || maxPrice) {
    filter.sellPrice = {};
    if (minPrice) filter.sellPrice.$gte = Number(minPrice);
    if (maxPrice) filter.sellPrice.$lte = Number(maxPrice);
  }

  const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
  const [offers, total] = await Promise.all([
    Offer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("flightRef.stock")
      .populate({ path: "hotelRef.stock", populate: { path: "hotelId" } })
      .populate("createdBy", "firstName lastName email"),
    Offer.countDocuments(filter),
  ]);

  // Compute live availability & wholesale cost margin for each offer
  const enrichedOffers = offers.map((offer) => {
    const offerObj = offer.toObject();
    const isFlight = offer.itemType === "flight";
    const ref = isFlight ? offer.flightRef : offer.hotelRef;
    const stockDoc = ref?.stock;

    if (stockDoc) {
      const unitsPerBooking = ref.unitsPerBooking || 1;
      offerObj.availableBookings = availabilityForOffer(stockDoc, unitsPerBooking);
      
      if (isAdmin) {
        // Compute wholesale cost and gross profit margin
        const wholesaleCost = (stockDoc.costPerUnit || stockDoc.pricePerNight || 0) * unitsPerBooking;
        const grossMargin = offer.sellPrice - wholesaleCost;
        const marginPercent = offer.sellPrice > 0 ? Math.round((grossMargin / offer.sellPrice) * 100) : 0;
        offerObj.financials = {
          wholesaleCost,
          grossMargin,
          marginPercent,
        };
      }
    } else {
      offerObj.availableBookings = 0;
    }

    return offerObj;
  });

  return {
    offers: enrichedOffers,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const getOfferById = async (id, isAdmin = false) => {
  const query = { _id: id };
  if (!isAdmin) query.isActive = true;

  const offer = await Offer.findOne(query)
    .populate("flightRef.stock")
    .populate({ path: "hotelRef.stock", populate: { path: "hotelId" } })
    .populate("createdBy", "firstName lastName email");

  if (!offer) {
    throw new AppError(`Offer with ID ${id} not found`, 404);
  }

  const offerObj = offer.toObject();
  const isFlight = offer.itemType === "flight";
  const ref = isFlight ? offer.flightRef : offer.hotelRef;
  const stockDoc = ref?.stock;

  if (stockDoc) {
    const unitsPerBooking = ref.unitsPerBooking || 1;
    offerObj.availableBookings = availabilityForOffer(stockDoc, unitsPerBooking);
    
    if (isAdmin) {
      const wholesaleCost = (stockDoc.costPerUnit || stockDoc.pricePerNight || 0) * unitsPerBooking;
      const grossMargin = offer.sellPrice - wholesaleCost;
      const marginPercent = offer.sellPrice > 0 ? Math.round((grossMargin / offer.sellPrice) * 100) : 0;
      offerObj.financials = {
        wholesaleCost,
        grossMargin,
        marginPercent,
      };
    }
  } else {
    offerObj.availableBookings = 0;
  }

  return offerObj;
};

const updateOffer = async (id, updateData) => {
  const allowedFields = [
    "title",
    "description",
    "destination",
    "images",
    "sellPrice",
    "originalPrice",
    "discountPercentage",
    "inclusions",
    "exclusions",
    "startDate",
    "endDate",
    "isActive",
  ];

  const filteredData = {};
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      filteredData[field] = updateData[field];
    }
  }

  const offer = await Offer.findByIdAndUpdate(id, { $set: filteredData }, { new: true, runValidators: true });
  if (!offer) {
    throw new AppError(`Offer with ID ${id} not found`, 404);
  }
  return offer;
};

const toggleOfferStatus = async (id) => {
  const offer = await Offer.findById(id);
  if (!offer) {
    throw new AppError(`Offer with ID ${id} not found`, 404);
  }
  offer.isActive = !offer.isActive;
  await offer.save();
  return offer;
};

/**
 * ─────────────────────────────────────────────────────────────
 * CRM DIRECT OFFER BOOKINGS & OPERATIONS
 * ─────────────────────────────────────────────────────────────
 */

const bookOfferForCustomer = async ({
  customerId,
  offerId,
  travellers,
  quantity = 1,
  payment = {},
  agentId,
}) => {
  if (!customerId) {
    throw new AppError("customerId is required", 400);
  }
  if (!Array.isArray(travellers) || travellers.length === 0) {
    throw new AppError("At least one traveller is required", 400);
  }

  const offer = await Offer.findById(offerId)
    .populate("flightRef.stock")
    .populate({ path: "hotelRef.stock", populate: { path: "hotelId" } });

  if (!offer) {
    throw new AppError("Offer not found.", 404);
  }

  const isFlight = offer.itemType === "flight";
  const ref = isFlight ? offer.flightRef : offer.hotelRef;
  const stockDoc = ref?.stock;

  if (!stockDoc) {
    throw new AppError("Referenced stock document not found.", 404);
  }

  const availableBookings = availabilityForOffer(stockDoc, ref.unitsPerBooking || 1);
  if (availableBookings < quantity) {
    throw new AppError(`Insufficient stock. Only ${availableBookings} available for this offer.`, 409);
  }

  const totalAmount = offer.sellPrice * quantity;

  // 1. Create OfferBooking
  const booking = new OfferBooking({
    userId: customerId,
    offerId,
    offerSnapshot: {
      title: offer.title,
      destination: offer.destination,
      sellPrice: offer.sellPrice,
      itemType: offer.itemType,
      startDate: offer.startDate,
      endDate: offer.endDate,
      detail: stockDoc,
    },
    travellers,
    quantity,
    totalAmount,
    status: "initiated",
  });

  // 2. Claim Stock Units
  const flightRefs = isFlight ? [{ stock: stockDoc._id, unitsPerBooking: ref.unitsPerBooking || 1 }] : [];
  const hotelRefs = !isFlight ? [{ stock: stockDoc._id, unitsPerBooking: ref.unitsPerBooking || 1 }] : [];

  let claimed;
  try {
    claimed = await claimUnitsForRefs({
      flightRefs,
      hotelRefs,
      quantity,
      bookingId: booking._id,
      bookingModel: "OfferBooking",
    });
  } catch (err) {
    booking.status = "cancelled";
    await booking.save();
    throw new AppError(`Stock allocation failed: ${err.message}`, 409);
  }

  // 3. Mark units immediately as 'used' (Direct settlement)
  for (const u of claimed.claimedFlightUnits || []) {
    await TicketStock.updateOne(
      { _id: u.stock, "units._id": u.unitId },
      { $set: { "units.$.status": "used" } }
    );
  }
  for (const u of claimed.claimedHotelUnits || []) {
    await HotelStock.updateOne(
      { _id: u.stock, "units._id": u.unitId },
      { $set: { "units.$.status": "used" } }
    );
  }

  booking.claimedFlightUnits = claimed.claimedFlightUnits;
  booking.claimedHotelUnits = claimed.claimedHotelUnits;
  booking.status = "confirmed";
  await booking.save();

  // 4. Create Payment Record (Offline Bank Transfer)
  const refNum = payment.referenceNumber || `OFFLINE-${Date.now()}`;
  const paymentRecord = await Payment.create({
    userId: customerId,
    bookingId: booking._id,
    bookingModel: "OfferBooking",
    bookingType: "offer",
    amount: totalAmount,
    currency: "INR",
    paymentMethod: payment.method || "bank_transfer",
    status: "paid",
    gatewayData: {
      orderId: refNum,
      transactionId: refNum,
      raw: {
        referenceNumber: refNum,
        notes: payment.notes || "Direct CRM booking by agent",
        settledByAgent: agentId,
      },
    },
  });

  // 5. Create Master Booking
  const masterBooking = await MasterBooking.create({
    userId: customerId,
    bookingType: "offer",
    itemId: booking._id,
    paymentId: paymentRecord._id,
    details: {
      destination: offer.destination,
      departureDate: offer.startDate,
      returnDate: offer.endDate,
      totalPrice: totalAmount,
      currency: "INR",
      passengers: travellers.length,
    },
    status: "confirmed",
  });

  logger.info(`[Offer Service] Direct CRM booking completed: ${booking._id} for customer ${customerId} by agent ${agentId}`);

  return {
    booking,
    payment: paymentRecord,
    masterBooking,
  };
};

const listOfferBookingsAdmin = async (query = {}) => {
  const {
    page = 1,
    limit = 20,
    status,
    offerId,
    userId,
  } = query;

  const filter = {};
  if (status) filter.status = status;
  if (offerId) filter.offerId = offerId;
  if (userId) filter.userId = userId;

  const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
  const [bookings, total] = await Promise.all([
    OfferBooking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("offerId", "title destination itemType sellPrice images")
      .populate("userId", "firstName lastName email phone"),
    OfferBooking.countDocuments(filter),
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

const cancelOfferBookingAdmin = async (bookingId, reason = "Admin cancellation") => {
  const booking = await OfferBooking.findById(bookingId);
  if (!booking) throw new AppError(`Offer booking ${bookingId} not found`, 404);

  if (booking.status === "cancelled") {
    return booking;
  }

  // Release claimed units back to available
  for (const u of booking.claimedFlightUnits || []) {
    if (u.stock && u.unitId) await releaseOneUnit(TicketStock, u.stock, u.unitId);
  }
  for (const u of booking.claimedHotelUnits || []) {
    if (u.stock && u.unitId) await releaseOneUnit(HotelStock, u.stock, u.unitId);
  }

  booking.status = "cancelled";
  booking.cancellationReason = reason;
  booking.cancelledAt = new Date();
  await booking.save();

  // Sync Master Booking
  await MasterBooking.findOneAndUpdate(
    { itemId: booking._id, bookingType: "offer" },
    { $set: { status: "cancelled", cancellationReason: reason, cancelledAt: new Date() } }
  );

  // Sync Payment
  await Payment.findOneAndUpdate(
    { bookingId: booking._id, bookingModel: "OfferBooking" },
    { $set: { status: "refunded" } }
  );

  logger.info(`[Offer Service] Admin cancelled offer booking ${bookingId} and released stock units.`);
  return booking;
};

const addOfferImages = async (offerId, imageUrls = []) => {
  try {
    const offer = await Offer.findById(offerId);
    if (!offer) throw new AppError("Offer not found", 404);

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new AppError("imageUrls must be a non-empty array", 400);
    }

    offer.images = [...new Set([...(offer.images || []), ...imageUrls])];
    await offer.save();
    return offer;
  } catch (error) {
    logger.error(`Add offer images failed: ${error.message}`);
    throw error;
  }
};

const removeOfferImage = async (offerId, imageUrl) => {
  try {
    const offer = await Offer.findById(offerId);
    if (!offer) throw new AppError("Offer not found", 404);

    offer.images = (offer.images || []).filter((img) => img !== imageUrl);
    await offer.save();
    return offer;
  } catch (error) {
    logger.error(`Remove offer image failed: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createOffer,
  listOffers,
  getOfferById,
  updateOffer,
  toggleOfferStatus,
  bookOfferForCustomer,
  listOfferBookingsAdmin,
  cancelOfferBookingAdmin,
  addOfferImages,
  removeOfferImage,
};
