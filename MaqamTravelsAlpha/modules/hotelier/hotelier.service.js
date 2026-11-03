const HotelStock = require('../packages/stock/hotelStock.model');
const Hotel = require('../hotels/hotelEntity.model');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');
const User = require('../auth/auth.model')

/**
 * ─── HOTELIER SERVICE ──────────────────────────────────
 * Service layer for hotelier self-service stock management.
 * Enforces ownership: req.user.hotelId === stock.hotelId
 */

const sanitizeUnitForHotelier = (unit) => ({
  _id: unit._id,
  status: unit.status === 'blocked' ? 'blocked' : unit.status === 'available' ? 'available' : 'unavailable',
});

const sanitizeStockForHotelier = (stock) => {
  const obj = stock.toObject ? stock.toObject({ virtuals: true }) : stock;
  return {
    _id: obj._id,
    hotelId: obj.hotelId,
    hotelName: obj.hotelName,
    destination: obj.destination,
    roomType: obj.roomType,
    checkIn: obj.checkIn,
    checkOut: obj.checkOut,
    pricePerNight: obj.pricePerNight,
    meals: obj.meals,
    reservationRef: obj.reservationRef,
    nameAdditionDeadline: obj.nameAdditionDeadline,
    reviewStatus: obj.reviewStatus,
    reviewNotes: obj.reviewNotes,
    totalNights: obj.totalNights,
    costPerUnit: obj.costPerUnit,
    totalUnits: obj.totalUnits,
    availableUnits: obj.availableUnits,
    units: (obj.units || []).map(sanitizeUnitForHotelier),
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

const listOwnStock = async (hotelId) => {
  if (!hotelId) throw new AppError('Hotelier user must be assigned to a hotel', 400);

  const stocks = await HotelStock.find({ hotelId }).sort({ createdAt: -1 });
  return stocks.map(sanitizeStockForHotelier);  
};

const createStockBatch = async (hotelId, userId, data) => {
  if (!hotelId) throw new AppError('Hotelier user must be assigned to a hotel', 400);

  const hotel = await Hotel.findById(hotelId);
  if (!hotel) throw new AppError('Associated hotel record not found', 44);
  if (!hotel.isActive) throw new AppError('Hotel is currently inactive', 403);

  const unitCount = Number(data.unitCount) || (Array.isArray(data.units) ? data.units.length : 0);
  if (unitCount <= 0) throw new AppError('Must create at least one unit', 400);

  const units = Array.from({ length: unitCount }, () => ({ status: 'available' }));

  const stockDoc = await HotelStock.create({
    hotelId,
    hotelName: hotel.name,
    destination: data.destination || hotel.destination,
    roomType: data.roomType,
    checkIn: data.checkIn,
    checkOut: data.checkOut,
    pricePerNight: data.pricePerNight,
    meals: data.meals || [],
    reservationRef: data.reservationRef,
    nameAdditionDeadline: data.nameAdditionDeadline,
    reviewStatus: 'pending_review',
    units,
    createdBy: userId,
  });

  logger.info(`HotelStock batch ${stockDoc._id} created by hotelier for hotel ${hotelId}`);
  return sanitizeStockForHotelier(stockDoc);
};

const updateStockBatch = async (hotelId, stockId, updates) => {
  const stock = await HotelStock.findOne({ _id: stockId, hotelId });
  if (!stock) throw new AppError('Stock batch not found or permission denied', 404);

  // Guard 1: Protect batches with existing customer bookings (assigned / used units)
  const hasBookings = (stock.units || []).some((u) => u.status === 'assigned' || u.status === 'used');
  if (hasBookings) {
    const criticalFields = ['checkIn', 'checkOut', 'roomType', 'destination'];
    const isEditingCritical = criticalFields.some((field) => updates[field] !== undefined);
    if (isEditingCritical) {
      throw new AppError(
        'Cannot modify dates, destination, or room type on a stock batch with active customer bookings. Please contact agency admin.',
        400
      );
    }
  }

  // Allowed updates: rate/dates/roomType/meals/reservationRef/nameAdditionDeadline
  const allowedFields = ['pricePerNight', 'checkIn', 'checkOut', 'roomType', 'meals', 'reservationRef', 'nameAdditionDeadline', 'destination'];
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      stock[field] = updates[field];
    }
  });

  // Editing rate/dates resets batch to pending_review
  stock.reviewStatus = 'pending_review';
  stock.reviewedBy = undefined;
  stock.reviewNotes = undefined;

  await stock.save();
  logger.info(`HotelStock batch ${stockId} updated by hotelier, reviewStatus reset to pending_review`);
  return sanitizeStockForHotelier(stock);
};

const addUnitsToBatch = async (hotelId, stockId, count) => {
  const numUnits = Number(count);
  if (!numUnits || numUnits < 1) throw new AppError('count must be an integer >= 1', 400);

  const stock = await HotelStock.findOne({ _id: stockId, hotelId });
  if (!stock) throw new AppError('Stock batch not found or permission denied', 404);

  const newUnits = Array.from({ length: numUnits }, () => ({ status: 'available' }));
  stock.units.push(...newUnits);

  // Adding units resets batch to pending_review
  stock.reviewStatus = 'pending_review';
  stock.reviewedBy = undefined;
  stock.reviewNotes = undefined;

  await stock.save();
  logger.info(`Added ${numUnits} units to HotelStock batch ${stockId}, reviewStatus reset to pending_review`);
  return sanitizeStockForHotelier(stock);
};

const updateUnitStatus = async (hotelId, stockId, unitId, status) => {
  if (!['available', 'blocked'].includes(status)) {
    throw new AppError("Hoteliers may only set unit status to 'available' or 'blocked'", 400);
  }

  const stock = await HotelStock.findOne({ _id: stockId, hotelId });
  if (!stock) throw new AppError('Stock batch not found or permission denied', 404);

  const unit = stock.units.id(unitId);
  if (!unit) throw new AppError('Unit not found in batch', 404);

  if (['assigned', 'used'].includes(unit.status)) {
    throw new AppError(`Cannot change status of a unit that is currently '${unit.status}'`, 400);
  }

  unit.status = status;

  // Toggling available <-> blocked does NOT change reviewStatus
  await stock.save();
  logger.info(`Unit ${unitId} in batch ${stockId} status updated to ${status} by hotelier`);
  return sanitizeStockForHotelier(stock);
};

// fetch amenities of hotel

const getHotelAmenities = async(hotelId)=>{
  if(!hotelId){
    throw new AppError('Hotelier user nust be assigned to a hotel', 400)
  }

  const hotel = await Hotel.findById(hotelId).select('-contractNotes')

  if(!hotel){
    throw new AppError('Hotel is currently inactive. Contact agency admin.', 403)
  }
  if(!hotel.isActive){
    throw new AppError('Hotel is currently inactive. Contact agency admin.', 403)
  }

  return {
    hotelId:hotel._id,
    hotelName:hotel.name,
    destination:hotel.destination,
    address:hotel.address,
    amenities:hotel.amenities || [],
    images:hotel.images || [],
    contactPerson:hotel.contactPerson,
    contactEmail:hotel.contactEmail,
    contactPhone:hotel.contactPhone,
    isActive:hotel.isActive

  };

};

const updateHotelAmenities = async(hotelId, amenities)=>{
  if(!hotelId){
    throw new AppError('Hotelier user must be assignes to a hotel', 400)
  }
  const hotel = await Hotel.findById(hotelId);

  if(!hotel){
    throw new AppError('associated hotel record not found', 404)
  }

  if(!hotel.isActive){
    throw new AppError('Hotel is currently inactive. Contact agency admin', 403)
  }

  const cleanAmenities = [...new Set(
    amenities
      .map((item) => (typeof item === 'string' ? item.trim(): ''))

      .filter((item)=>(item.length>0))
  )];

  hotel.amenities = cleanAmenities;

  await hotel.save();

  logger.info(`Hotelier updated amenities for hotel ${hotelId}`)

  return {
    hotelId:hotel._id,
    hotelName:hotel.name,
    amenities:hotel.amenities,
    updatedAt:hotel.updatedAt,
  }




}

// create service to get hotelier profile
const getHotelierProfile = async (userId, hotelId) => {
  if (!hotelId) {
    throw new AppError('Hotelier must be assigned to a hotel', 400);
  }

  const [user, hotel] = await Promise.all([
    User.findById(userId).select('-password -resetPasswordToken -resetPasswordExpires'),
    Hotel.findById(hotelId).select('-contractNotes'),
  ]);

  if (!user) {
    throw new AppError('Hotelier account not found', 404);
  }

  if (!user.isActive) {
    throw new AppError('Hotelier account is deactivated. Contact agency admin', 403);
  }

  if (!hotel) {
    throw new AppError('Associated hotel record not found', 404);
  }

  return {
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      isVerified: user.isVerified,
      isPhoneVerified: user.isPhoneVerified,
      createdAt: user.createdAt,
    },
    hotel: {
      _id: hotel._id,
      name: hotel.name,
      destination: hotel.destination,
      address: hotel.address,
      amenities: hotel.amenities || [],
      images: hotel.images || [],
      contactPerson: hotel.contactPerson,
      contactEmail: hotel.contactEmail,
      contactPhone: hotel.contactPhone,
      isActive: hotel.isActive,
    },
  };
};

module.exports = {
  listOwnStock,
  createStockBatch,
  updateStockBatch,
  addUnitsToBatch,
  updateUnitStatus,
  sanitizeStockForHotelier,
  getHotelAmenities,
  updateHotelAmenities,
  getHotelierProfile,
};

