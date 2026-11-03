const mongoose = require('mongoose');
const { BOOKING_MODEL_MAP } = require('./payment.constants');
const { AppError } = require('../../middleware/errorHandler');

// Ensure all target booking models are loaded/registered
try {
  require('../auth/auth.model');
} catch (e) { }
try {
  require('../flights/flight.model');
} catch (e) { }
try {
  require('../hotels/hotel.model');
} catch (e) { }
try {
  require('../packages/models/packageBooking.model');
} catch (e) { }
try {
  require('../bookings/booking.model');
} catch (e) { }
try {
  require('../packages/offers/offerBooking.model');
} catch (e) { }
try {
  require('../visa/user/visaGroup.model');
} catch (e) { }
try {
  require('../account/traveller.model');
} catch (e) { }

const getModelName = (bookingType) => {
  const modelName = BOOKING_MODEL_MAP[bookingType];
  if (!modelName) {
    throw new AppError(`Unsupported booking type: ${bookingType}`, 400);
  }
  return modelName;
};

const resolveBooking = async (bookingId, bookingType) => {
  const modelName = getModelName(bookingType);
  const Model = mongoose.model(modelName);

  let query;
  const isObjectId = mongoose.Types.ObjectId.isValid(bookingId) && String(new mongoose.Types.ObjectId(bookingId)) === String(bookingId);

  if (isObjectId) {
    query = Model.findById(bookingId);
  } else if (modelName === 'FlightBooking' && !isNaN(Number(bookingId))) {
    query = Model.findOne({ srdvBookingId: Number(bookingId) });
  } else if (modelName === 'HotelBooking') {
    query = Model.findOne({
      $or: [
        { providerBookingId: String(bookingId) },
        { bookingRefNo: String(bookingId) },
        { recheckId: String(bookingId) },
      ],
    });
  } else {
    query = Model.findById(bookingId);
  }

  // Handle different user reference fields across schemas
  if (modelName === 'FlightBooking') {
    query = query.populate('user', '_id email phone name').populate('passengers.travellerId');
  } else if (modelName === 'HotelBooking' || modelName === 'Booking') {
    query = query.populate('userId', '_id email phone name');
  } else if (modelName === 'PackageBooking' || modelName === 'OfferBooking') {
    query = query.populate('userId', '_id email phone name');
  } else if (modelName === 'VisaGroup') {
    query = query.populate('submittedBy', '_id email phone name');
  }

  const booking = await query;
  if (!booking) {
    throw new AppError(`${modelName} booking not found`, 404);
  }

  // Normalize user reference property
  if (!booking.user && booking.userId) {
    booking.user = booking.userId;
  } else if (!booking.user && booking.submittedBy) {
    booking.user = booking.submittedBy;
  }

  return booking;
};

module.exports = {
  getModelName,
  resolveBooking,
};
