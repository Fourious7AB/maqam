/**
 * modules/packages/core/availability.service.js
 *
 * Nothing here is stored — everything is computed fresh on every call.
 * TicketStock/HotelStock hold the real counts (units[]); Package/Offer never
 * cache a copy, so there's nothing that can drift out of sync.
 */

/**
 * Checks whether a stock document is eligible for selling.
 * A HotelStock is only usable if reviewStatus === 'approved' AND hotel.isActive !== false.
 */
function isStockUsable(stockDoc) {
  if (!stockDoc) return false;
  if (stockDoc.reviewStatus !== undefined && stockDoc.reviewStatus !== "approved") {
    return false;
  }
  if (
    stockDoc.hotelId &&
    typeof stockDoc.hotelId === "object" &&
    stockDoc.hotelId.isActive === false
  ) {
    return false;
  }
  return true;
}

/**
 * How many bookings' worth of units are left on ONE stock document.
 * Both Package and Offer bottom out at this same single-ref calculation.
 *
 * @param {Object} stockDoc - a TicketStock or HotelStock document (must have units[])
 * @param {number} unitsPerBooking - how many units one sale consumes
 * @returns {number}
 */
function availabilityForStock(stockDoc, unitsPerBooking) {
  if (!unitsPerBooking || unitsPerBooking <= 0 || !stockDoc) return 0;
  if (!isStockUsable(stockDoc)) return 0;
  const availableUnits = (stockDoc.units || []).filter((u) => u.status === "available").length;
  return Math.floor(availableUnits / unitsPerBooking);
}

/**
 * Package availability = min across every referenced stock.
 * refs: [{ stockDoc, unitsPerBooking }, ...] — already-populated stock docs
 */
function availabilityForPackage(refs) {
  if (!refs || !refs.length) return 0;
  const counts = refs.map((r) => availabilityForStock(r.stockDoc, r.unitsPerBooking));
  return Math.min(...counts);
}

/**
 * Offer availability = the single-ref calculation, no min needed.
 */
function availabilityForOffer(stockDoc, unitsPerBooking) {
  return availabilityForStock(stockDoc, unitsPerBooking);
}

/**
 * Package's internal cost price — admin-only, never sent to the customer.
 */
function costPriceForPackage(refs, otherItems = []) {
  const stockCost = (refs || []).reduce(
    (sum, r) => sum + (r.stockDoc?.costPerUnit || 0) * r.unitsPerBooking,
    0
  );
  const otherCost = (otherItems || []).reduce((sum, item) => sum + (item.cost || 0), 0);
  return stockCost + otherCost;
}

module.exports = {
  isStockUsable,
  availabilityForStock,
  availabilityForPackage,
  availabilityForOffer,
  costPriceForPackage,
};
