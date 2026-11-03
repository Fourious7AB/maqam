// modules/packages/stock/stock.service.js
//
// Inventory Service for CRM / Admin:
// Managing bulk Flight TicketStock and wholesale HotelStock allotments.

const TicketStock = require("./ticketStock.model");
const HotelStock = require("./hotelStock.model");
const Hotel = require("../../hotels/hotelEntity.model");
const { AppError } = require("../../../middleware/errorHandler");
const logger = require("../../../utils/logger");

/**
 * ─────────────────────────────────────────────────────────────
 * FLIGHT TICKET STOCK (TicketStock)
 * ─────────────────────────────────────────────────────────────
 */

const createFlightStock = async (data, userId) => {
  const {
    airline,
    flightNumber,
    origin,
    destination,
    departureDate,
    arrivalDate,
    cabinClass = "Economy",
    pnr,
    nameAdditionDeadline,
    costPerUnit,
    totalUnits,
    units,
  } = data;

  if (!airline || !flightNumber || !origin || !destination || !departureDate || !pnr || !nameAdditionDeadline || costPerUnit === undefined) {
    throw new AppError("Missing required flight stock fields (airline, flightNumber, origin, destination, departureDate, pnr, nameAdditionDeadline, costPerUnit)", 400);
  }

  const seatCount = totalUnits || (Array.isArray(units) ? units.length : 0);
  if (!seatCount || seatCount < 1) {
    throw new AppError("totalUnits must be at least 1", 400);
  }

  const unitList = Array.isArray(units) && units.length > 0
    ? units
    : Array.from({ length: seatCount }, () => ({ status: "available" }));

  const stock = await TicketStock.create({
    airline: airline.trim(),
    flightNumber: flightNumber.trim().toUpperCase(),
    origin: origin.trim().toUpperCase(),
    destination: destination.trim().toUpperCase(),
    departureDate: new Date(departureDate),
    arrivalDate: arrivalDate ? new Date(arrivalDate) : undefined,
    cabinClass,
    pnr: pnr.trim().toUpperCase(),
    nameAdditionDeadline: new Date(nameAdditionDeadline),
    costPerUnit: Number(costPerUnit),
    units: unitList,
    createdBy: userId,
  });

  logger.info(`[Stock Service] Flight stock created: ${stock._id} (PNR: ${stock.pnr}, Seats: ${seatCount})`);
  return stock;
};

const listFlightStocks = async (query = {}) => {
  const {
    page = 1,
    limit = 20,
    airline,
    origin,
    destination,
    pnr,
    departureDateMin,
    departureDateMax,
    availableOnly,
  } = query;

  const filter = {};
  if (airline) filter.airline = new RegExp(airline, "i");
  if (origin) filter.origin = origin.toUpperCase();
  if (destination) filter.destination = destination.toUpperCase();
  if (pnr) filter.pnr = new RegExp(pnr, "i");

  if (departureDateMin || departureDateMax) {
    filter.departureDate = {};
    if (departureDateMin) filter.departureDate.$gte = new Date(departureDateMin);
    if (departureDateMax) filter.departureDate.$lte = new Date(departureDateMax);
  }

  if (String(availableOnly) === "true") {
    filter["units.status"] = "available";
  }

  const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
  const [stocks, total] = await Promise.all([
    TicketStock.find(filter)
      .sort({ departureDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("createdBy", "firstName lastName email"),
    TicketStock.countDocuments(filter),
  ]);

  return {
    stocks,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const getFlightStockById = async (id) => {
  const stock = await TicketStock.findById(id).populate("createdBy", "firstName lastName email");
  if (!stock) {
    throw new AppError(`Flight stock with ID ${id} not found`, 404);
  }
  return stock;
};

const updateFlightStock = async (id, data, userId) => {
  const stock = await TicketStock.findById(id);
  if (!stock) {
    throw new AppError(`Flight stock with ID ${id} not found`, 404);
  }

  // 1. Update flight batch times
  if (data.departureDate) stock.departureDate = new Date(data.departureDate);
  if (data.arrivalDate) stock.arrivalDate = new Date(data.arrivalDate);
  if (data.nameAdditionDeadline) stock.nameAdditionDeadline = new Date(data.nameAdditionDeadline);

  // 2. Update cost per unit
  if (data.costPerUnit !== undefined) {
    const cost = Number(data.costPerUnit);
    if (isNaN(cost) || cost < 0) {
      throw new AppError("costPerUnit must be a valid non-negative number", 400);
    }
    stock.costPerUnit = cost;
  }

  // 3. Update totalUnits (adding or removing available seats)
  if (data.totalUnits !== undefined) {
    const targetUnits = Number(data.totalUnits);
    if (isNaN(targetUnits) || targetUnits < 1) {
      throw new AppError("totalUnits must be at least 1", 400);
    }
    const currentUnits = stock.units.length;
    if (targetUnits > currentUnits) {
      const addedCount = targetUnits - currentUnits;
      for (let i = 0; i < addedCount; i++) {
        stock.units.push({ status: "available" });
      }
    } else if (targetUnits < currentUnits) {
      const toRemove = currentUnits - targetUnits;
      const availableIndices = [];
      for (let i = stock.units.length - 1; i >= 0; i--) {
        if (stock.units[i].status === "available") {
          availableIndices.push(i);
          if (availableIndices.length === toRemove) break;
        }
      }
      if (availableIndices.length < toRemove) {
        throw new AppError(
          `Cannot reduce totalUnits to ${targetUnits}. Only ${availableIndices.length} units are currently available to remove (the rest are assigned or used).`,
          400
        );
      }
      for (const idx of availableIndices) {
        stock.units.splice(idx, 1);
      }
    }
  }

  // 4. Update specific units or array of units
  if (Array.isArray(data.units)) {
    for (const unitUpdate of data.units) {
      if (unitUpdate._id || unitUpdate.unitId) {
        const u = stock.units.id(unitUpdate._id || unitUpdate.unitId);
        if (u) {
          if (unitUpdate.status) {
            if (!["available", "assigned", "used"].includes(unitUpdate.status)) {
              throw new AppError(`Invalid unit status: ${unitUpdate.status}`, 400);
            }
            u.status = unitUpdate.status;
          }
          if (unitUpdate.ticketNumber !== undefined) {
            u.ticketNumber = unitUpdate.ticketNumber;
          }
        }
      } else {
        stock.units.push({
          status: unitUpdate.status || "available",
          ticketNumber: unitUpdate.ticketNumber || null,
        });
      }
    }
  } else if (data.unitId && data.unitStatus) {
    const u = stock.units.id(data.unitId);
    if (!u) {
      throw new AppError(`Unit with ID ${data.unitId} not found in this flight stock`, 404);
    }
    if (!["available", "assigned", "used"].includes(data.unitStatus)) {
      throw new AppError(`Invalid unit status: ${data.unitStatus}`, 400);
    }
    u.status = data.unitStatus;
    if (data.ticketNumber !== undefined) u.ticketNumber = data.ticketNumber;
  }

  // 5. Optional other flight info updates
  if (data.airline) stock.airline = data.airline.trim();
  if (data.flightNumber) stock.flightNumber = data.flightNumber.trim().toUpperCase();
  if (data.origin) stock.origin = data.origin.trim().toUpperCase();
  if (data.destination) stock.destination = data.destination.trim().toUpperCase();
  if (data.cabinClass) stock.cabinClass = data.cabinClass;
  if (data.pnr) stock.pnr = data.pnr.trim().toUpperCase();

  await stock.save();
  await stock.populate("createdBy", "firstName lastName email");

  logger.info(`[Stock Service] Flight stock updated: ${stock._id} by user ${userId}`);
  return stock;
};

/**
 * ─────────────────────────────────────────────────────────────
 * HOTEL ROOM STOCK (HotelStock)
 * ─────────────────────────────────────────────────────────────
 */

const createHotelStock = async (data, userId) => {
  const {
    hotelId,
    hotelName: customHotelName,
    destination: customDestination,
    roomType,
    checkIn,
    checkOut,
    pricePerNight,
    meals = ["breakfast"],
    reservationRef,
    nameAdditionDeadline,
    totalUnits,
    units,
  } = data;

  if (!hotelId || !roomType || !checkIn || !checkOut || pricePerNight === undefined || !reservationRef || !nameAdditionDeadline) {
    throw new AppError("Missing required hotel stock fields (hotelId, roomType, checkIn, checkOut, pricePerNight, reservationRef, nameAdditionDeadline)", 400);
  }

  let finalHotelName = customHotelName;
  let finalDestination = customDestination;

  // Resolve hotel name & destination from Hotel entity if available
  const hotelDoc = await Hotel.findById(hotelId);
  if (hotelDoc) {
    if (!finalHotelName) finalHotelName = hotelDoc.name;
    if (!finalDestination) finalDestination = hotelDoc.destination || hotelDoc.city || hotelDoc.country || "General";
  } else if (!finalHotelName || !finalDestination) {
    throw new AppError(`Hotel entity ${hotelId} not found and hotelName/destination not provided`, 404);
  }

  const roomCount = totalUnits || (Array.isArray(units) ? units.length : 0);
  if (!roomCount || roomCount < 1) {
    throw new AppError("totalUnits must be at least 1", 400);
  }

  const unitList = Array.isArray(units) && units.length > 0
    ? units
    : Array.from({ length: roomCount }, () => ({ status: "available" }));

  const stock = await HotelStock.create({
    hotelId,
    hotelName: finalHotelName,
    destination: finalDestination,
    roomType: roomType.trim(),
    checkIn: new Date(checkIn),
    checkOut: new Date(checkOut),
    pricePerNight: Number(pricePerNight),
    meals,
    reservationRef: reservationRef.trim().toUpperCase(),
    nameAdditionDeadline: new Date(nameAdditionDeadline),
    reviewStatus: "approved",
    reviewedBy: userId,
    units: unitList,
    createdBy: userId,
  });

  logger.info(`[Stock Service] Hotel stock created: ${stock._id} (Hotel: ${stock.hotelName}, Rooms: ${roomCount})`);
  return stock;
};

const listHotelStocks = async (query = {}) => {
  const {
    page = 1,
    limit = 20,
    hotelId,
    destination,
    roomType,
    reservationRef,
    checkInMin,
    checkOutMax,
    availableOnly,
  } = query;

  const filter = {};
  if (hotelId) filter.hotelId = hotelId;
  if (destination) filter.destination = new RegExp(destination, "i");
  if (roomType) filter.roomType = new RegExp(roomType, "i");
  if (reservationRef) filter.reservationRef = new RegExp(reservationRef, "i");

  if (checkInMin) {
    filter.checkIn = { $gte: new Date(checkInMin) };
  }
  if (checkOutMax) {
    filter.checkOut = { ...(filter.checkOut || {}), $lte: new Date(checkOutMax) };
  }

  if (String(availableOnly) === "true") {
    filter["units.status"] = "available";
  }

  const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
  const [stocks, total] = await Promise.all([
    HotelStock.find(filter)
      .sort({ checkIn: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("hotelId", "name destination address images")
      .populate("createdBy", "firstName lastName email"),
    HotelStock.countDocuments(filter),
  ]);

  return {
    stocks,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const getHotelStockById = async (id) => {
  const stock = await HotelStock.findById(id)
    .populate("hotelId", "name destination address images")
    .populate("createdBy", "firstName lastName email");
  if (!stock) {
    throw new AppError(`Hotel stock with ID ${id} not found`, 404);
  }
  return stock;
};

const updateHotelStock = async (id, data, userId) => {
  const stock = await HotelStock.findById(id);
  if (!stock) {
    throw new AppError(`Hotel stock with ID ${id} not found`, 404);
  }

  // 1. Update review status
  if (data.reviewStatus) {
    const allowedReviewStatuses = ["pending_review", "approved", "rejected"];
    if (!allowedReviewStatuses.includes(data.reviewStatus)) {
      throw new AppError(`Invalid reviewStatus. Allowed: ${allowedReviewStatuses.join(", ")}`, 400);
    }
    stock.reviewStatus = data.reviewStatus;
    stock.reviewedBy = userId;
  }
  if (data.reviewNotes !== undefined) {
    stock.reviewNotes = data.reviewNotes;
  }

  // 2. Update meals
  if (data.meals !== undefined) {
    if (!Array.isArray(data.meals)) {
      throw new AppError("meals must be an array of strings ('breakfast', 'lunch', 'dinner')", 400);
    }
    const allowedMeals = ["breakfast", "lunch", "dinner"];
    for (const m of data.meals) {
      if (!allowedMeals.includes(m)) {
        throw new AppError(`Invalid meal type: ${m}. Allowed: ${allowedMeals.join(", ")}`, 400);
      }
    }
    stock.meals = data.meals;
  }

  // 3. Update totalUnits (adding or removing available room units)
  if (data.totalUnits !== undefined) {
    const targetUnits = Number(data.totalUnits);
    if (isNaN(targetUnits) || targetUnits < 1) {
      throw new AppError("totalUnits must be at least 1", 400);
    }
    const currentUnits = stock.units.length;
    if (targetUnits > currentUnits) {
      const addedCount = targetUnits - currentUnits;
      for (let i = 0; i < addedCount; i++) {
        stock.units.push({ status: "available" });
      }
    } else if (targetUnits < currentUnits) {
      const toRemove = currentUnits - targetUnits;
      const availableIndices = [];
      for (let i = stock.units.length - 1; i >= 0; i--) {
        if (stock.units[i].status === "available") {
          availableIndices.push(i);
          if (availableIndices.length === toRemove) break;
        }
      }
      if (availableIndices.length < toRemove) {
        throw new AppError(
          `Cannot reduce totalUnits to ${targetUnits}. Only ${availableIndices.length} units are currently available to remove (the rest are blocked, assigned, or used).`,
          400
        );
      }
      for (const idx of availableIndices) {
        stock.units.splice(idx, 1);
      }
    }
  }

  // 4. Update specific room unit status or array of units
  if (Array.isArray(data.units)) {
    for (const unitUpdate of data.units) {
      if (unitUpdate._id || unitUpdate.unitId) {
        const u = stock.units.id(unitUpdate._id || unitUpdate.unitId);
        if (u) {
          if (unitUpdate.status) {
            if (!["available", "blocked", "assigned", "used"].includes(unitUpdate.status)) {
              throw new AppError(`Invalid unit status: ${unitUpdate.status}`, 400);
            }
            u.status = unitUpdate.status;
          }
          if (unitUpdate.guestConfirmationRef !== undefined) {
            u.guestConfirmationRef = unitUpdate.guestConfirmationRef;
          }
        }
      } else {
        stock.units.push({
          status: unitUpdate.status || "available",
          guestConfirmationRef: unitUpdate.guestConfirmationRef || null,
        });
      }
    }
  } else if (data.unitId && data.unitStatus) {
    const u = stock.units.id(data.unitId);
    if (!u) {
      throw new AppError(`Unit with ID ${data.unitId} not found in this hotel stock`, 404);
    }
    if (!["available", "blocked", "assigned", "used"].includes(data.unitStatus)) {
      throw new AppError(`Invalid unit status: ${data.unitStatus}`, 400);
    }
    u.status = data.unitStatus;
    if (data.guestConfirmationRef !== undefined) u.guestConfirmationRef = data.guestConfirmationRef;
  }

  // 5. Update dates, pricing and reservation info
  if (data.checkIn) stock.checkIn = new Date(data.checkIn);
  if (data.checkOut) stock.checkOut = new Date(data.checkOut);
  if (data.pricePerNight !== undefined) {
    const price = Number(data.pricePerNight);
    if (isNaN(price) || price < 0) {
      throw new AppError("pricePerNight must be a non-negative number", 400);
    }
    stock.pricePerNight = price;
  }
  if (data.reservationRef) stock.reservationRef = data.reservationRef.trim().toUpperCase();
  if (data.nameAdditionDeadline) stock.nameAdditionDeadline = new Date(data.nameAdditionDeadline);
  if (data.roomType) stock.roomType = data.roomType.trim();
  if (data.hotelName) stock.hotelName = data.hotelName.trim();
  if (data.destination) stock.destination = data.destination.trim();

  await stock.save();
  await stock.populate([
    { path: "hotelId", select: "name destination address images" },
    { path: "createdBy", select: "firstName lastName email" },
    { path: "reviewedBy", select: "firstName lastName email" },
  ]);

  logger.info(`[Stock Service] Hotel stock updated: ${stock._id} by user ${userId}`);
  return stock;
};

/**
 * ─────────────────────────────────────────────────────────────
 * CRM OVERVIEW & INVENTORY UTILIZATION DASHBOARD
 * ─────────────────────────────────────────────────────────────
 */

const getStockOverview = async () => {
  const [flightStocks, hotelStocks] = await Promise.all([
    TicketStock.find({}).lean(),
    HotelStock.find({}).lean(),
  ]);

  let flightTotalUnits = 0;
  let flightAvailableUnits = 0;
  let flightAssignedUnits = 0;
  let flightUsedUnits = 0;

  for (const s of flightStocks) {
    for (const u of s.units || []) {
      flightTotalUnits++;
      if (u.status === "available") flightAvailableUnits++;
      else if (u.status === "assigned") flightAssignedUnits++;
      else if (u.status === "used") flightUsedUnits++;
    }
  }

  let hotelTotalUnits = 0;
  let hotelAvailableUnits = 0;
  let hotelAssignedUnits = 0;
  let hotelUsedUnits = 0;

  for (const s of hotelStocks) {
    for (const u of s.units || []) {
      hotelTotalUnits++;
      if (u.status === "available") hotelAvailableUnits++;
      else if (u.status === "assigned" || u.status === "blocked") hotelAssignedUnits++;
      else if (u.status === "used") hotelUsedUnits++;
    }
  }

  const now = new Date();
  const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  const flightExpiringSoon = flightStocks.filter(
    (s) => s.nameAdditionDeadline && new Date(s.nameAdditionDeadline) <= threeDaysLater && new Date(s.nameAdditionDeadline) >= now
  ).length;

  const hotelExpiringSoon = hotelStocks.filter(
    (s) => s.nameAdditionDeadline && new Date(s.nameAdditionDeadline) <= threeDaysLater && new Date(s.nameAdditionDeadline) >= now
  ).length;

  return {
    flights: {
      totalBatches: flightStocks.length,
      totalSeats: flightTotalUnits,
      availableSeats: flightAvailableUnits,
      heldSeats: flightAssignedUnits,
      usedSeats: flightUsedUnits,
      expiringWithin3Days: flightExpiringSoon,
    },
    hotels: {
      totalAllotments: hotelStocks.length,
      totalRooms: hotelTotalUnits,
      availableRooms: hotelAvailableUnits,
      heldRooms: hotelAssignedUnits,
      usedRooms: hotelUsedUnits,
      expiringWithin3Days: hotelExpiringSoon,
    },
  };
};

module.exports = {
  createFlightStock,
  listFlightStocks,
  getFlightStockById,
  updateFlightStock,
  createHotelStock,
  listHotelStocks,
  getHotelStockById,
  updateHotelStock,
  getStockOverview,
};
