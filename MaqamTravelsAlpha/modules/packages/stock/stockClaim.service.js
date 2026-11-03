// modules/packages/stock/stockClaim.service.js
//
// Atomic unit claiming for TicketStock, HotelStock, and future stock models.

const TicketStock = require("./ticketStock.model");
const HotelStock = require("./hotelStock.model");

const STOCK_MODELS = {
  TicketStock,
  HotelStock,
};

const claimOneUnit = async (StockModel, stockId, bookingId, bookingModel, alreadyClaimedIds = []) => {
  const query = { _id: stockId, "units.status": "available" };
  if (StockModel.modelName === "HotelStock") {
    query.reviewStatus = "approved";
  }

  const result = await StockModel.findOneAndUpdate(
    query,
    {
      $set: {
        "units.$.status": "assigned",
        "units.$.assignedToBooking": bookingId,
        "units.$.assignedToBookingModel": bookingModel,
        "units.$.assignedAt": new Date(),
      },
    },
    { new: true }
  );
  if (!result) return null; // sold out, lost a race, or not approved
  const alreadyClaimedSet = new Set(alreadyClaimedIds.map(String));
  const claimed = result.units.find(
    (u) => String(u.assignedToBooking) === String(bookingId) && !alreadyClaimedSet.has(String(u._id))
  );
  return claimed ? claimed._id : null;
};

const releaseOneUnit = async (StockModel, stockId, unitId) => {
  await StockModel.updateOne(
    { _id: stockId, "units._id": unitId },
    {
      $set: {
        "units.$.status": "available",
        "units.$.assignedToBooking": null,
        "units.$.assignedToBookingModel": null,
        "units.$.assignedAt": null,
      },
    }
  );
};

const claimUnitsFromStock = async (StockModel, stockId, count, bookingId, bookingModel) => {
  if (StockModel.modelName === "HotelStock") {
    const stockDoc = await StockModel.findById(stockId).populate("hotelId");
    if (
      !stockDoc ||
      stockDoc.reviewStatus !== "approved" ||
      (stockDoc.hotelId && stockDoc.hotelId.isActive === false)
    ) {
      throw new Error(`HotelStock ${stockId} is not approved or associated hotel is inactive`);
    }
  }

  const claimedUnitIds = [];
  for (let i = 0; i < count; i++) {
    const unitId = await claimOneUnit(StockModel, stockId, bookingId, bookingModel, claimedUnitIds);
    if (!unitId) {
      for (const id of claimedUnitIds) await releaseOneUnit(StockModel, stockId, id);
      throw new Error(`Insufficient available units on stock ${stockId}`);
    }
    claimedUnitIds.push(unitId);
  }
  return claimedUnitIds;
};

/**
 * Claims across generic stock items (dynamic multi-stock support)
 * items: [{ stockModel: 'TicketStock'|'HotelStock', stockId, count }]
 */
const claimUnitsForItems = async ({ items = [], bookingId, bookingModel }) => {
  const claimedUnits = [];
  const claimedFlightUnits = [];
  const claimedHotelUnits = [];

  try {
    for (const item of items) {
      const StockModel = STOCK_MODELS[item.stockModel];
      if (!StockModel) {
        throw new Error(`Unsupported stock model: ${item.stockModel}`);
      }
      const unitIds = await claimUnitsFromStock(
        StockModel,
        item.stockId,
        item.count,
        bookingId,
        bookingModel
      );
      for (const unitId of unitIds) {
        claimedUnits.push({
          stockModel: item.stockModel,
          stock: item.stockId,
          unitId,
        });
        if (item.stockModel === "TicketStock") {
          claimedFlightUnits.push({ stock: item.stockId, unitId });
        } else if (item.stockModel === "HotelStock") {
          claimedHotelUnits.push({ stock: item.stockId, unitId });
        }
      }
    }
    return { claimedUnits, claimedFlightUnits, claimedHotelUnits };
  } catch (error) {
    // Atomic rollback on any failure
    for (const c of claimedUnits) {
      const StockModel = STOCK_MODELS[c.stockModel];
      if (StockModel) {
        await releaseOneUnit(StockModel, c.stock, c.unitId);
      }
    }
    throw error;
  }
};

// Legacy support: claims across flightRefs and hotelRefs
const claimUnitsForRefs = async ({ flightRefs = [], hotelRefs = [], quantity, bookingId, bookingModel }) => {
  const items = [
    ...flightRefs.map((r) => ({
      stockModel: "TicketStock",
      stockId: r.stock,
      count: (r.unitsPerBooking || 1) * quantity,
    })),
    ...hotelRefs.map((r) => ({
      stockModel: "HotelStock",
      stockId: r.stock,
      count: (r.unitsPerBooking || 1) * quantity,
    })),
  ];
  return claimUnitsForItems({ items, bookingId, bookingModel });
};

const markUnitsUsed = async (arg1 = [], arg2 = []) => {
  // 1. If called with single generic array: [{ stockModel, stock, unitId }]
  if (Array.isArray(arg1) && arg1.length > 0 && arg1[0].stockModel) {
    for (const c of arg1) {
      const StockModel = STOCK_MODELS[c.stockModel];
      if (StockModel) {
        await StockModel.updateOne(
          { _id: c.stock, "units._id": c.unitId },
          { $set: { "units.$.status": "used" } }
        );
      }
    }
    return;
  }

  // 2. If called with (claimedFlightUnits, claimedHotelUnits)
  for (const c of arg1 || []) {
    await TicketStock.updateOne(
      { _id: c.stock, "units._id": c.unitId },
      { $set: { "units.$.status": "used" } }
    );
  }
  for (const c of arg2 || []) {
    await HotelStock.updateOne(
      { _id: c.stock, "units._id": c.unitId },
      { $set: { "units.$.status": "used" } }
    );
  }
};

module.exports = {
  STOCK_MODELS,
  claimOneUnit,
  releaseOneUnit,
  claimUnitsFromStock,
  claimUnitsForItems,
  claimUnitsForRefs,
  markUnitsUsed,
};
