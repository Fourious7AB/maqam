const Payment = require('../../payment.model');
const { resolveBooking } = require('../../bookingResolver');
const phonePeClient = require('./phonepe.client');
const logger = require('../../../../utils/logger');
const { AppError } = require('../../../../middleware/errorHandler');
const { PAYMENT_STATUS } = require('../../../../config/constants');
const { getBookingAmount, ensureBookingConfirmed } = require('../../bookingSync');

/**
 * ─── PHONEPE SERVICE ──────────────────────────────────
 * PhonePe-specific payment business logic
 * 
 * PhonePe is popular for UPI payments in India
 */

/**
 * Create PhonePe payment request
 * @param {string} userId
 * @param {string} bookingId
 * @param {string} bookingType
 * @returns {Promise}
 */
const createPaymentRequest = async (userId, bookingId, bookingType) => {
    try {
        logger.info(`[PhonePe Service] Creating payment request - User: ${userId}, Booking: ${bookingId}`);

        // 1. Fetch booking details from dynamic resolver
        const booking = await resolveBooking(bookingId, bookingType);

        if (!booking) {
            throw new AppError('Booking not found', 404);
        }

        const bookingUserId = booking.user?._id || booking.userId?._id || booking.user || booking.userId;
        if (bookingUserId && bookingUserId.toString() !== userId.toString()) {
            throw new AppError('Unauthorized to pay for this booking', 403);
        }

        // 2. Check if already paid
        const existingPayment = await Payment.findOne({
            bookingId,
            status: PAYMENT_STATUS.PAID,
        });

        if (existingPayment) {
            throw new AppError('This booking is already paid', 400);
        }

        // 3. Get amount
        const amount = getBookingAmount(booking, bookingType);
        if (amount <= 0) {
            throw new AppError('Invalid booking amount', 400);
        }

        // 4. Create PhonePe payment request
        const customerName = booking.user?.name || booking.userId?.name || booking.guestName || 'Customer';
        const customerEmail = booking.user?.email || booking.userId?.email || booking.guestEmail || '';
        const customerPhone = booking.user?.phone || booking.userId?.phone || booking.guestPhone || '';

        const paymentRequest = await phonePeClient.payments.create(
            amount,
            bookingId,
            {
                name: customerName,
                email: customerEmail,
                phone: customerPhone,
            }
        );

        // 5. Create Payment record
        const payment = await Payment.create({
            userId,
            bookingId,
            bookingModel: booking.constructor.modelName,
            bookingType,
            amount,
            currency: 'INR',
            paymentMethod: 'phonepe',
            gatewayData: {
                transactionId: paymentRequest.transactionId,
            },
            phonePeTransactionId: paymentRequest.transactionId,
            status: PAYMENT_STATUS.PENDING,
        });

        logger.info(`[PhonePe Service] Payment request created - ID: ${payment._id}`);

        return {
            paymentId: payment._id,
            transactionId: paymentRequest.transactionId,
            redirectUrl: paymentRequest.redirectUrl,
            amount,
            currency: 'INR',
            bookingId,
            bookingType,
        };
    } catch (error) {
        logger.error(`[PhonePe Service] Payment request creation failed: ${error.message}`);
        throw error;
    }
};

/**
 * Verify PhonePe payment callback
 * @param {string} transactionId
 * @param {string} paymentId - Internal payment ID
 * @returns {Promise}
 */
const verifyPaymentCallback = async (transactionId, paymentId) => {
    try {
        logger.info(`[PhonePe Service] Verifying callback - Transaction: ${transactionId}`);

        // 1. Verify with PhonePe
        const verificationResult = await phonePeClient.payments.verify(transactionId);

        if (!verificationResult.success) {
            throw new AppError('Payment verification failed', 400);
        }

        // 2. Update Payment record
        const payment = await Payment.findByIdAndUpdate(
            paymentId,
            {
                status: PAYMENT_STATUS.PAID,
                verifiedAt: new Date(),
                'gatewayData.transactionId': transactionId,
                phonePeTransactionId: transactionId,
            },
            { new: true }
        );

        if (!payment) {
            throw new AppError('Payment record not found', 404);
        }

        logger.info(`[PhonePe Service] Payment verified - ID: ${payment._id}`);

        return {
            paymentId: payment._id,
            transactionId,
            status: payment.status,
        };
    } catch (error) {
        logger.error(`[PhonePe Service] Payment verification failed: ${error.message}`);
        throw error;
    }
};

/**
 * Process successful payment
 * @param {string} paymentId
 * @returns {Promise}
 */
const processSuccessfulPayment = async (paymentId) => {
    try {
        logger.info(`[PhonePe Service] Processing successful payment: ${paymentId}`);

        const payment = await Payment.findById(paymentId)
            .populate('bookingId')
            .populate('userId', 'email phone name');

        if (!payment) {
            throw new AppError('Payment not found', 404);
        }

        // Update booking
        await ensureBookingConfirmed(payment);

        logger.info(`[PhonePe Service] Booking confirmed - Payment: ${payment._id}`);

        // TODO: Call GDS ticketing, send notifications

        return {
            success: true,
            paymentId: payment._id,
            bookingId: payment.bookingId,
            status: 'confirmed',
        };
    } catch (error) {
        logger.error(`[PhonePe Service] Payment processing failed: ${error.message}`);
        throw error;
    }
};

/**
 * Refund payment
 * @param {string} paymentId
 * @param {number} amount
 * @param {string} reason
 * @returns {Promise}
 */
const refundPayment = async (paymentId, amount, reason = 'Booking cancelled') => {
    try {
        logger.info(`[PhonePe Service] Processing refund for payment: ${paymentId}`);

        const payment = await Payment.findById(paymentId);

        if (!payment) {
            throw new AppError('Payment not found', 404);
        }

        if (payment.status !== PAYMENT_STATUS.PAID) {
            throw new AppError('Only paid payments can be refunded', 400);
        }

        // Call PhonePe refund
        const refundAmount = amount || payment.amount;
        const refundData = await phonePeClient.payments.refund(
            payment.phonePeTransactionId,
            refundAmount,
            reason
        );

        // Update payment record
        payment.status = PAYMENT_STATUS.REFUNDED;
        payment.refundAmount = refundAmount;
        payment.refundReason = reason;
        payment.refundProcessedAt = new Date();
        payment.refundRefId = refundData.refundId;
        await payment.save();

        logger.info(`[PhonePe Service] Refund processed - Refund ID: ${refundData.refundId}`);

        return {
            paymentId: payment._id,
            refundId: refundData.refundId,
            amount: refundData.amount,
            status: refundData.status,
        };
    } catch (error) {
        logger.error(`[PhonePe Service] Refund failed: ${error.message}`);
        throw error;
    }
};

module.exports = {
    createPaymentRequest,
    verifyPaymentCallback,
    processSuccessfulPayment,
    refundPayment,
};
