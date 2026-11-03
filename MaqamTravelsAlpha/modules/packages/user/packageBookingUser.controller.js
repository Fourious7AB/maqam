// modules/packages/user/packageBookingUser.controller.js
const service = require("../core/packageBooking.service");
const { validateBookCustomizedPackage } = require("../core/package.validator");
const {
  sendSuccess,
  sendError,
  sendCreated,
} = require("../../../utils/apiResponse");

const createBooking = async (req, res) => {
  validateBookCustomizedPackage(req.body);
  const result = await service.createBooking({
    userId: req.user.id,
    packageId: req.body.packageId,
    travellers: req.body.travellers,
    quantity: req.body.quantity || 1,
    excludedOfferIds: req.body.excludedOfferIds,
    swappedOffers: req.body.swappedOffers,
    // includedOfferIds: req.body.includedOfferIds,
    guideSelected: req.body.guideSelected,
    guidePrice: req.body.guidePrice,
    includeGuide: req.body.includeGuide,
  });

  return sendCreated(res, {
    message: "Customized package booking created. Proceed to payment.",
    data: result,
  });
};

const cancelBooking = async (req, res) => {
  const { reason } = req.body;
  const booking = await service.cancelBooking(
    req.params.id,
    req.user.id,
    reason,
  );

  return sendSuccess(res, {
    message: "Cancel the package successfully",
    data: booking,
  });
};

const getBooking = async (req, res) => {
  const userId = req.user?.id || req.user?._id;
  const booking = await service.getBookingById(req.params.id, userId);

  return sendSuccess(res, {
    message: "Fetch the booking successfully",
    data: booking,
  });
};

const getAllBookingPackage = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await service.getAllBookingPackage(userId, req.query);

    return sendSuccess(res, {
      message:
        result.bookings.length > 0
          ? "Package bookings retrieved successfully"
          : "No package bookings found",
      data: result.bookings,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  cancelBooking,
  getBooking,
  getAllBookingPackage,
};
