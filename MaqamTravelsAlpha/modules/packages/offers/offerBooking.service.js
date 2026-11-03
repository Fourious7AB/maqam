const Offer = require("./offer.model");
const OfferBooking = require("./offerBooking.model");
const TicketStock = require("../stock/ticketStock.model");
const HotelStock = require("../stock/hotelStock.model");

const { claimUnitsForRefs, releaseOneUnit } = require("../stock/stockClaim.service");
const { availabilityForOffer } = require("../core/availability.service");
const { AppError } = require("../../../middleware/errorHandler");
const logger = require("../../../utils/logger");

const releaseOfferBookingStockUnits = async (booking) => {
  let unitsReleased = 0;
  for (const unit of booking.claimedFlightUnits || []) {
    if (unit.stock && unit.unitId) {
      await releaseOneUnit(TicketStock, unit.stock, unit.unitId);
      unitsReleased++;
    }
  }
  for (const unit of booking.claimedHotelUnits || []) {
    if (unit.stock && unit.unitId) {
      await releaseOneUnit(HotelStock, unit.stock, unit.unitId);
      unitsReleased++;
    }
  }
  return unitsReleased;
};

/**
 * Create an OfferBooking — mirrors createPackageBooking, but there's only
 * ever ONE stock ref (flightRef or hotelRef, per itemType).
 */
async function createOfferBooking({ userId, offerId, travellers, quantity = 1 }) {
  if (!Array.isArray(travellers) || travellers.length === 0) {
    throw new AppError("At least one traveller is required", 400);
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new AppError("quantity must be an integer >= 1", 400);
  }

  const offer = await Offer.findById(offerId)
    .populate("flightRef.stock")
    .populate({ path: "hotelRef.stock", populate: { path: "hotelId" } });

  if (!offer || !offer.isActive) {
    throw new AppError("Offer not found or not active.", 404);
  }

  const isFlight = offer.itemType === "flight";
  const ref = isFlight ? offer.flightRef : offer.hotelRef;
  const stockDoc = ref.stock;

  if (!stockDoc) {
    throw new AppError("Referenced stock document not found.", 404);
  }

  const availableBookings = availabilityForOffer(stockDoc, ref.unitsPerBooking);
  if (availableBookings < quantity) {
    throw new AppError(
      `Only ${availableBookings} booking(s) worth of stock left for this offer.`,
      409
    );
  }

  const booking = new OfferBooking({
    userId,
    offerId,
    offerSnapshot: {
      title: offer.title,
      destination: offer.destination,
      sellPrice: offer.sellPrice,
      itemType: offer.itemType,
      startDate: offer.startDate,
      endDate: offer.endDate,
      validity: {
        startDate: offer.startDate,
        endDate: offer.endDate,
      },
      detail: stockDoc,
    },
    travellers,
    quantity,
    totalAmount: offer.sellPrice * quantity,
    status: "initiated",
  });

  const flightRefs = isFlight ? [{ stock: stockDoc._id, unitsPerBooking: ref.unitsPerBooking }] : [];
  const hotelRefs = !isFlight ? [{ stock: stockDoc._id, unitsPerBooking: ref.unitsPerBooking }] : [];

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
    logger.error(`Offer booking claim failed: ${err.message}`);
    throw new AppError(`Could not reserve stock for this booking: ${err.message}`, 409);
  }

  booking.claimedFlightUnits = claimed.claimedFlightUnits;
  booking.claimedHotelUnits = claimed.claimedHotelUnits;
  booking.status = "pending";

  await booking.save();

  try {
    const MasterBooking = require("../../bookings/booking.model");
    await MasterBooking.findOneAndUpdate(
      { itemId: booking._id, bookingType: "offer" },
      {
        userId,
        bookingType: "offer",
        itemId: booking._id,
        details: {
          destination: offer.destination || offer.title || "Offer Booking",
          departureDate: offer.startDate,
          returnDate: offer.endDate,
          totalPrice: booking.totalAmount,
          currency: "INR",
          passengers: travellers.length,
        },
        status: "pending",
      },
      { upsert: true, new: true }
    );
  } catch (mbErr) {
    logger.error(`[Offer Master Booking] Failed to sync master booking: ${mbErr.message}`);
  }
  return {
    _id: booking._id,
    bookingId: booking._id,
    totalAmount: booking.totalAmount,
    currency: "INR",
    status: booking.status,
    quantity: booking.quantity,
    offerSnapshot: booking.offerSnapshot,
    claimedFlightUnits: booking.claimedFlightUnits,
    claimedHotelUnits: booking.claimedHotelUnits,
  };
}

async function cancelOfferBooking(bookingId, userId, reason = "User requested cancellation") {
  const booking = await OfferBooking.findOne({ _id: bookingId, userId });
  if (!booking) throw new AppError("Booking not found", 404);

  if (booking.status === "cancelled") {
    return booking;
  }

  // Release claimed stock units back to available
  await releaseOfferBookingStockUnits(booking);

  booking.status = "cancelled";
  booking.cancellationReason = reason;
  booking.cancelledAt = new Date();
  await booking.save();

  // Update Master Booking if exists
  const Booking = require("../../bookings/booking.model");
  const masterBooking = await Booking.findOne({ itemId: booking._id, bookingType: "offer" });
  if (masterBooking) {
    masterBooking.status = "cancelled";
    masterBooking.cancellationReason = reason;
    masterBooking.cancelledAt = new Date();
    await masterBooking.save();
  }

  logger.info(`[Offer Booking] Booking ${booking._id} cancelled and stock released.`);
  return booking;
}

async function getOfferBookingById(bookingId, userId) {
  const query = userId ? { _id: bookingId, userId } : { _id: bookingId };
  const booking = await OfferBooking.findOne(query)
    .populate("offerId")
    .populate("claimedFlightUnits.stock")
    .populate({ path: "claimedHotelUnits.stock", populate: { path: "hotelId" } });
  if (!booking) throw new AppError("Booking not found", 404);
  return booking;
}

async function getMyOfferBookings(userId, query = {}) {
  const { page = 1, limit = 10, status } = query;
  const filter = { userId };
  if (status) filter.status = status;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [bookings, total] = await Promise.all([
    OfferBooking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("offerId", "title destination itemType sellPrice images startDate endDate")
      .populate("claimedFlightUnits.stock")
      .populate({ path: "claimedHotelUnits.stock", populate: { path: "hotelId" } })
      .lean(),
    OfferBooking.countDocuments(filter),
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
}

async function getOfferBookingByIdAdmin(bookingId) {
  const booking = await OfferBooking.findById(bookingId).populate("userId", "name phone email");
  if (!booking) throw new AppError("Booking not found", 404);
  return booking;
}

module.exports = {
  createOfferBooking,
  cancelOfferBooking,
  releaseOfferBookingStockUnits,
  getOfferBookingById,
  getMyOfferBookings,
  getOfferBookingByIdAdmin,
};
