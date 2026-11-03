const paymentService = require('./payment.service');
const { sendSuccess, sendCreated, sendNotFound } = require('../../utils/apiResponse');

/**
 * ─── PAYMENT CONTROLLER ────────────────────────────────
 * Thin layer: calls service, sends response
 */

const getPaymentDetails = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user?.id;

    const payment = await paymentService.getPaymentById(paymentId, userId);
    if (!payment) {
      return sendNotFound(res, 'Payment not found');
    }

    return sendSuccess(res, { message: 'Payment details', data: payment });
  } catch (error) {
    next(error);
  }
};

const getMyPayments = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { status, page, limit } = req.query;

    const result = await paymentService.getUserPayments(userId, { status, page, limit });

    return sendSuccess(res, {
      message: 'Payments retrieved',
      data: result.payments,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

const createPayment = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { bookingId, amount, currency, paymentMethod } = req.body;

    const payment = await paymentService.createPayment(userId, {
      bookingId,
      amount,
      currency,
      paymentMethod,
    });

    return sendCreated(res, payment, 'Payment initiated');
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { paymentId, transactionId, status } = req.body;

    const payment = await paymentService.verifyPayment(paymentId, {
      transactionId,
      status,
    });

    if (!payment) {
      return sendNotFound(res, 'Payment not found');
    }

    return sendSuccess(res, { message: 'Payment verified', data: payment });
  } catch (error) {
    next(error);
  }
};

const requestRefund = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user?.id;
    const { reason } = req.body;

    const payment = await paymentService.requestRefund(paymentId, userId, reason);
    if (!payment) {
      return sendNotFound(res, 'Payment not found');
    }

    return sendSuccess(res, { message: 'Refund requested', data: payment });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPaymentDetails,
  getMyPayments,
  createPayment,
  verifyPayment,
  requestRefund,
};
