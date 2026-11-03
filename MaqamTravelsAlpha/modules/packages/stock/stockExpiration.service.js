const PackageBooking = require("../models/packageBooking.model");
const OfferBooking = require("../offers/offerBooking.model");
const TicketStock = require("./ticketStock.model");
const HotelStock = require("./hotelStock.model");
const { releaseOneUnit } = require("./stockClaim.service");
const logger = require("../../../utils/logger");

const STOCK_MODEL_MAP = {
  TicketStock,
  HotelStock,
};

/**
 * ─── STOCK EXPIRATION SERVICE ──────────────────────────────
 * Sweeps pending PackageBooking & OfferBooking records where payment
 * window has expired (default: 30 mins) and releases claimed stock back to 'available'.
 */
const expireUnpaidStockBookings = async ({ timeoutMs = 30 * 60 * 1000 } = {}) => {
  const cutoff = new Date(Date.now() - timeoutMs);
  let totalExpired = 0;
  let totalUnitsReleased = 0;

  const models = [
    { Model: PackageBooking, name: "PackageBooking" },
    { Model: OfferBooking, name: "OfferBooking" },
  ];

  for (const { Model, name } of models) {
    const expiredBookings = await Model.find({
      status: { $in: ["initiated", "pending"] },
      createdAt: { $lt: cutoff },
    });

    for (const booking of expiredBookings) {
      let unitsReleasedForBooking = 0;
      const releasedKeys = new Set();

      // 1. Release generic claimedUnits
      for (const unit of booking.claimedUnits || []) {
        const StockModel = STOCK_MODEL_MAP[unit.stockModel];
        if (StockModel && unit.stock && unit.unitId) {
          const key = `${unit.stock}_${unit.unitId}`;
          if (!releasedKeys.has(key)) {
            await releaseOneUnit(StockModel, unit.stock, unit.unitId);
            releasedKeys.add(key);
            unitsReleasedForBooking++;
          }
        }
      }

      // 2. Release legacy/specialized flight units (if not already released)
      for (const unit of booking.claimedFlightUnits || []) {
        if (unit.stock && unit.unitId) {
          const key = `${unit.stock}_${unit.unitId}`;
          if (!releasedKeys.has(key)) {
            await releaseOneUnit(TicketStock, unit.stock, unit.unitId);
            releasedKeys.add(key);
            unitsReleasedForBooking++;
          }
        }
      }

      // 3. Release legacy/specialized hotel units (if not already released)
      for (const unit of booking.claimedHotelUnits || []) {
        if (unit.stock && unit.unitId) {
          const key = `${unit.stock}_${unit.unitId}`;
          if (!releasedKeys.has(key)) {
            await releaseOneUnit(HotelStock, unit.stock, unit.unitId);
            releasedKeys.add(key);
            unitsReleasedForBooking++;
          }
        }
      }

      booking.status = "cancelled";
      booking.cancellationReason = "Payment window expired (auto-released stock)";
      booking.cancelledAt = new Date();
      await booking.save();

      totalExpired++;
      totalUnitsReleased += unitsReleasedForBooking;
      logger.info(
        `[Stock Expiration] Expired ${name} ${booking._id} and released ${unitsReleasedForBooking} unit(s).`
      );
    }
  }

  return { totalExpired, totalUnitsReleased };
};

module.exports = { expireUnpaidStockBookings };
