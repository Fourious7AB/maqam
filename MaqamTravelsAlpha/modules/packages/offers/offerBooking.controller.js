const {
  createOfferBooking,
  cancelOfferBooking,
  getOfferBookingById,
  getMyOfferBookings,
  getOfferBookingByIdAdmin,
} = require("./offerBooking.service");


const{sendSuccess, sendError, sendCreated}=require("../../../utils/apiResponse")

/**
 * POST /api/v1/offers/:id/book
 * Auth: customer
 */
async function bookOffer(req, res) {
  const booking = await createOfferBooking({
    userId: req.user.id,
    offerId: req.params.id,
    travellers: req.body.travellers,
    quantity: req.body.quantity || 1,
  });

  return sendSuccess(res, {message:"Offer booking created", data:booking})
}

/**
 * POST /api/v1/offers/bookings/:id/cancel
 * Auth: customer
 */
async function cancelBooking(req, res) {
  const { reason } = req.body;
  const booking = await cancelOfferBooking(req.params.id, req.user.id, reason);
  

  return sendSuccess(res, {message:"Offer booking canceled successfully" , data:booking})
}

/**
 * GET /api/v1/offers/bookings/:id
 * Auth: customer
 */
async function getBooking(req, res) {
  const booking = await getOfferBookingById(req.params.id, req.user.id);
 
  return sendSuccess(res, {message:"Booking fetched successfully", data:booking})
}

/**
 * GET /api/v1/offers/admin/bookings/:id
 * Auth: admin / finance
 */
/**
 * GET /api/v1/offers/bookings/me
 * Auth: customer
 */
async function getMyBookings(req, res, next) {
  try {
    const userId = req.user.id || req.user._id;
    const result = await getMyOfferBookings(userId, req.query);

    return sendSuccess(res, {
      message:
        result.bookings.length > 0
          ? "Offer bookings retrieved successfully"
          : "No offer bookings found",
      data: result.bookings,
      meta: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

async function adminGetBooking(req, res) {
  const booking = await getOfferBookingByIdAdmin(req.params.id);
  

  return sendSuccess(res, {message:"Offer booking fetched successfully", date:booking})
}

module.exports = {
  bookOffer,
  cancelBooking,
  getBooking,
  getMyBookings,
  adminGetBooking,
};
