const Payment = require('../modules/payments/payment.model');
const FlightBooking = require('../modules/flights/flight.model');
const razorpayService = require('../modules/payments/razorpay.service');
const bookingOrchestrator = require('./bookingOrchestrator');
const logger = require('./logger');
const { AppError } = require('../middleware/errorHandler');

/**
 * ─── PAYMENT ORCHESTRATOR ─────────────────────────────
 * Coordinates payment verification and post-payment actions
 * 
 * Flow after webhook:
 * 1. Verify payment signature
 * 2. Update payment status
 * 3. Update booking status to 'confirmed'
 * 4. Call GDS ticketing (if required)
 * 5. Send notification (email/SMS)
 * 
 * This orchestrator bridges payments → bookings → ticketing → notifications
 */

/**
 * Handle Successful Payment
 * Called from Razorpay webhook
 * @param {string} orderId - Razorpay order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Webhook signature
 * @returns {Promise}
 */
const handleSuccessfulPayment = async (orderId, paymentId, signature) => {
    try {
        logger.info(`Handling payment success - Order: ${orderId}, Payment: ${paymentId}`);

        // Step 1: Verify signature (security check)
        logger.info('Step 1: Verifying payment signature...');
        const isValid = require('../providers/razorpay/razorpay.adapter').verifyPaymentSignature(
            orderId,
            paymentId,
            signature
        );

        if (!isValid) {
            throw new AppError('Invalid payment signature', 400);
        }

        // Step 2: Update payment in DB
        logger.info('Step 2: Updating payment status...');
        const payment = await Payment.findOneAndUpdate(
            { razorpayOrderId: orderId },
            {
                razorpayPaymentId: paymentId,
                status: 'paid',
                verifiedAt: new Date(),
            },
            { new: true }
        ).populate('bookingId');

        if (!payment) {
            throw new AppError('Payment record not found', 404);
        }

        logger.info(`Payment updated - ID: ${payment._id}, Status: paid`);

        // Step 3: Update booking status to confirmed
        logger.info('Step 3: Updating booking status...');
        const booking = await FlightBooking.findByIdAndUpdate(
            payment.bookingId,
            {
                status: 'confirmed',
                razorpayPaymentId: paymentId,
            },
            { new: true }
        );

        if (!booking) {
            throw new AppError('Booking not found', 404);
        }

        logger.info(`Booking confirmed - ID: ${booking._id}, PNR: ${booking.pnr}`);

        // Step 4: Call GDS ticketing if booking has automatic ticketing enabled
        logger.info('Step 4: Processing ticketing...');
        let ticketingResult = null;

        try {
            // Check if should auto-ticket (e.g., not LCC or specific conditions)
            if (!booking.isLCC) {
                ticketingResult = await bookingOrchestrator.processTicketing(booking._id);
                logger.info(`Ticketing completed - Ticket: ${ticketingResult.ticketStatus}`);
            } else {
                logger.info('LCC booking - Ticketing skipped for auto-ticket');
            }
        } catch (ticketError) {
            logger.warn(`Ticketing failed: ${ticketError.message}`);
            // Don't fail entire process if ticketing fails
            // Will be retried later
        }

        // Step 5: Send notifications (email/SMS)
        logger.info('Step 5: Sending notifications...');
        try {
            // TODO: Implement notification service
            // await notificationService.sendBookingConfirmation(booking, payment);
            logger.info('Notification sent (TODO: implement)');
        } catch (notifError) {
            logger.warn(`Notification failed: ${notifError.message}`);
        }

        const result = {
            success: true,
            paymentId: payment._id,
            bookingId: booking._id,
            bookingStatus: booking.status,
            pnr: booking.pnr,
            ticketed: !!ticketingResult,
        };

        logger.info(`Payment handling complete - Result: ${JSON.stringify(result)}`);

        return result;
    } catch (error) {
        logger.error(`Payment handling failed: ${error.message}`);
        throw error;
    }
};

/**
 * Handle Failed Payment
 * @param {string} orderId
 * @param {string} failureReason
 * @returns {Promise}
 */
const handleFailedPayment = async (orderId, failureReason) => {
    try {
        logger.info(`Handling payment failure - Order: ${orderId}, Reason: ${failureReason}`);

        // Update payment status
        const payment = await Payment.findOneAndUpdate(
            { razorpayOrderId: orderId },
            {
                status: 'failed',
                failureReason,
            },
            { new: true }
        );

        if (!payment) {
            logger.warn(`Payment record not found: ${orderId}`);
            return;
        }

        logger.info(`Payment failed recorded - ID: ${payment._id}`);

        // TODO: Send failure notification to customer
        // await notificationService.sendPaymentFailed(payment);

        return {
            success: false,
            paymentId: payment._id,
            reason: failureReason,
        };
    } catch (error) {
        logger.error(`Failed payment handling error: ${error.message}`);
        throw error;
    }
};

/**
 * Handle Payment Refund
 * @param {string} paymentId - Razorpay payment ID
 * @param {number} amount
 * @param {string} reason
 * @returns {Promise}
 */
const handleRefund = async (paymentId, amount, reason) => {
    try {
        logger.info(`Processing refund - Payment: ${paymentId}, Amount: ${amount}`);

        // Step 1: Get payment details
        const payment = await Payment.findOne({ razorpayPaymentId: paymentId }).populate(
            'bookingId'
        );

        if (!payment) {
            throw new AppError('Payment not found', 404);
        }

        // Step 2: Call Razorpay refund
        const refundData = await razorpayService.refundPayment(payment._id, amount, reason);

        // Step 3: Update payment status
        await Payment.findByIdAndUpdate(payment._id, {
            status: 'refunded',
            refundAmount: amount,
            refundReason: reason,
            refundRefId: refundData.refundId,
            refundProcessedAt: new Date(),
        });

        // Step 4: Update booking status to cancelled
        await FlightBooking.findByIdAndUpdate(payment.bookingId, {
            status: 'cancelled',
            remark: `Refund: ${reason}`,
        });

        logger.info(`Refund processed - Refund ID: ${refundData.refundId}`);

        // TODO: Send refund notification
        // await notificationService.sendRefundConfirmation(payment, refundData);

        return {
            success: true,
            refundId: refundData.refundId,
            amount: refundData.amount,
            status: refundData.status,
        };
    } catch (error) {
        logger.error(`Refund handling failed: ${error.message}`);
        throw error;
    }
};

module.exports = {
    handleSuccessfulPayment,
    handleFailedPayment,
    handleRefund,
};
