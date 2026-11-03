// modules/packages/admin/packageBookingAdmin.controller.js
const service = require("../core/packageBooking.service");
const { sendSuccess, sendCreated } = require("../../../utils/apiResponse");

const adminListBookings = async (req, res) => {
  const result = await service.listBookingsAdmin(req.query);
  return sendSuccess(res, {
    message: "Package bookings fetched successfully",
    data: result.bookings,
    meta: result.pagination,
  });
};

const adminGetBooking = async (req, res) => {
  const booking = await service.getBookingByIdAdmin(req.params.id);
  return sendSuccess(res, {
    message: "Booking details fetched successfully",
    data: booking,
  });
};

const adminAssignBooking = async (req, res) => {
  const { assignedTo, agentId, caseOfficerId } = req.body;
  const targetAgentId = assignedTo || agentId || caseOfficerId;
  const booking = await service.assignPackageBookingAgent(
    req.params.id,
    targetAgentId,
  );

  return sendSuccess(res, {
    message: "Package booking assignes successfully",
    data: booking,
  });
};

const adminBookPackageForCustomer = async (req, res) => {
  const {
    customerId,
    packageId,
    quantity,
    excludedOfferIds,
    swappedOffers,
    travellers,
    travelDates,
    contactDetails,
    payment,
  } = req.body;

  const result = await service.bookPackageForCustomer({
    customerId,
    packageId,
    quantity,
    excludedOfferIds,
    swappedOffers,
    travellers,
    travelDates,
    contactDetails,
    payment,
    agentId: req.user.id,
  });

  // res.status(201).json({
  //   success: true,
  //   message: "Direct package booking completed successfully via bank transfer",
  //   ...result,
  // });

  return sendCreated(res, {
    message: "Package booking completed successfully",
    ...result,
  });
};

const adminCancelBooking = async (req, res) => {
  const { reason } = req.body;
  const booking = await service.cancelBookingAdmin(req.params.id, {
    reason,
    agentId: req.user.id,
  });

  return sendSuccess(res, {
    message:
      "Package booking concelled successfully and claimed stock released",
    data: booking,
  });
};

const adminUpdateConfirmedBooking = async (req, res) => {
  const booking = await service.updateConfirmedBookingAdmin(
    req.params.id,
    req.body,
    req.user.id,
  );

  return sendSuccess(res, {
    message: "Confirmed package booking updated successfully",
    data: booking,
  });
};

const adminAddRemark = async (req, res) => {
  const { remark, text } = req.body;
  const booking = await service.addBookingRemarkAdmin(
    req.params.id,
    remark || text,
    req.user.id,
  );

  return sendSuccess(res, {
    message: "Remark added successfully",
    data: booking,
  });
};

module.exports = {
  adminListBookings,
  adminGetBooking,
  adminAssignBooking,
  adminBookPackageForCustomer,
  adminCancelBooking,
  adminUpdateConfirmedBooking,
  adminAddRemark,
};
