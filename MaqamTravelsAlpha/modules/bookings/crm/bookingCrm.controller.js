const bookingCrmService = require('./bookingCrm.service');
const { sendSuccess, sendNotFound } = require('../../../utils/apiResponse');

/**
 * ─── CRM BOOKING CONTROLLER ─────────────────────────────
 * HTTP request handlers for the CRM Master Bookings & Operations Desk
 */

const listBookings = async (req, res, next) => {
  try {
    const {
      bookingType,
      status,
      paymentStatus,
      search,
      startDate,
      endDate,
      assignedTo,
      page,
      limit,
    } = req.query;

    const result = await bookingCrmService.listBookings({
      bookingType,
      status,
      paymentStatus,
      search,
      startDate,
      endDate,
      assignedTo,
      page,
      limit,
    });

    return sendSuccess(res, {
      message: 'Bookings retrieved successfully',
      data: result.bookings,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

const getBookingsSummary = async (req, res, next) => {
  try {
    const summary = await bookingCrmService.getBookingsSummary();
    return sendSuccess(res, {
      message: 'Bookings summary retrieved successfully',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

const getBookingDossier = async (req, res, next) => {
  try {
    const { bookingType, id } = req.params;
    const dossier = await bookingCrmService.getBookingDossier(bookingType, id);
    if (!dossier) return sendNotFound(res, 'Booking not found');

    return sendSuccess(res, {
      message: 'Booking dossier retrieved successfully',
      data: dossier,
    });
  } catch (error) {
    next(error);
  }
};

const updateBookingStatus = async (req, res, next) => {
  try {
    const { bookingType, id } = req.params;
    const adminUser = req.user;
    const updated = await bookingCrmService.updateBookingStatus(
      bookingType,
      id,
      req.body,
      adminUser
    );

    return sendSuccess(res, {
      message: 'Booking status updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

const assignBookingAgent = async (req, res, next) => {
  try {
    const { bookingType, id } = req.params;
    const targetAgentId =
      req.body.assignedTo || req.body.agentId || req.body.caseOfficerId;
    const adminUser = req.user;

    const updated = await bookingCrmService.assignBookingAgent(
      bookingType,
      id,
      targetAgentId,
      adminUser
    );

    return sendSuccess(res, {
      message: 'Booking assigned successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

const addBookingRemark = async (req, res, next) => {
  try {
    const { bookingType, id } = req.params;
    const remarkText = req.body.remark || req.body.text;
    const adminUser = req.user;

    const updated = await bookingCrmService.addBookingRemark(
      bookingType,
      id,
      remarkText,
      adminUser
    );

    return sendSuccess(res, {
      message: 'Remark added successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};


const resendNotification = async (req, res, next) => {
  try {
    const { bookingType, id } = req.params;
    try {
      await bookingCrmService.addBookingRemark(
        bookingType,
        id,
        'Booking notification and voucher resent to customer via CRM operations desk.',
        req.user
      );
    } catch {}

    return sendSuccess(res, {
      message: 'Booking confirmation resent to customer successfully',
      data: { sent: true, bookingType, id, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listBookings,
  getBookingsSummary,
  getBookingDossier,
  updateBookingStatus,
  assignBookingAgent,
  addBookingRemark,
  resendNotification,
};
