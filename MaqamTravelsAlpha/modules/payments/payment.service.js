const Payment = require("./payment.model");
const logger = require("../../utils/logger");
const { AppError } = require("../../middleware/errorHandler");
const { PAYMENT_STATUS } = require("../../config/constants");

/**
 * ─── PAYMENT SERVICE ───────────────────────────────────
 * Business logic: handle payments via Stripe, Razorpay, etc.
 * TODO: Integrate actual payment gateway SDKs
 */

const getPaymentById = async (paymentId, userId) => {
  try {
    return await Payment.findOne({ _id: paymentId, userId });
  } catch (error) {
    logger.error(`Get payment failed: ${error.message}`);
    throw error;
  }
};

const getUserPayments = async (
  userId,
  { status, page = 1, limit = 10 } = {},
) => {
  try {
    const query = { userId };
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const payments = await Payment.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Payment.countDocuments(query);

    return {
      payments,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error(`Get user payments failed: ${error.message}`);
    throw error;
  }
};

const createPayment = async (
  userId,
  { bookingId, amount, currency, paymentMethod },
) => {
  try {
    // TODO: Call Stripe/Razorpay SDK to initiate payment
    // const paymentGatewayResponse = await stripeClient.charges.create({ ... });

    const payment = await Payment.create({
      userId,
      bookingId,
      amount,
      currency,
      paymentMethod,
      status: PAYMENT_STATUS.PENDING,
      // transactionId: paymentGatewayResponse.id,
    });

    logger.info(`Payment created: ${payment._id}`);
    return payment;
  } catch (error) {
    logger.error(`Create payment failed: ${error.message}`);
    throw error;
  }
};

const verifyPayment = async (paymentId, { transactionId, status }) => {
  try {
    // TODO: Verify payment status with gateway
    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      {
        status:
          status === "success" ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.FAILED,
        transactionId,
        verifiedAt: new Date(),
      },
      { new: true },
    );

    if (payment) {
      logger.info(`Payment verified: ${paymentId}`);
      // TODO: Update booking status to confirmed
    }

    return payment;
  } catch (error) {
    logger.error(`Verify payment failed: ${error.message}`);
    throw error;
  }
};

const requestRefund = async (paymentId, userId, reason) => {
  try {
    const payment = await Payment.findOne({ _id: paymentId, userId });
    if (!payment) {
      throw new AppError("Payment not found", 404);
    }

    if (payment.status !== PAYMENT_STATUS.PAID) {
      throw new AppError("Only paid payments can be refunded", 400);
    }

    // TODO: Call refund API on payment gateway
    const updated = await Payment.findByIdAndUpdate(
      paymentId,
      {
        status: PAYMENT_STATUS.REFUNDED,
        refundReason: reason,
        refundRequestedAt: new Date(),
      },
      { new: true },
    );

    logger.info(`Refund requested: ${paymentId}`);
    return updated;
  } catch (error) {
    logger.error(`Request refund failed: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getPaymentById,
  getUserPayments,
  createPayment,
  verifyPayment,
  requestRefund,
};
