const { resolveBooking } = require('./bookingResolver');
const Booking = require('../bookings/booking.model');
const { BOOKING_STATUS } = require('../../config/constants');
const logger = require('../../utils/logger');

const BOOKING_CONFIRMATION_STATUS = {
    flight: BOOKING_STATUS.CONFIRMED,
    hotel: BOOKING_STATUS.CONFIRMED,
    package: BOOKING_STATUS.CONFIRMED,
    visa: BOOKING_STATUS.CONFIRMED,
};

const getBookingAmount = (booking, bookingType) => {
    if (!booking) return 0;

    switch (bookingType) {
        case 'hotel':
            return booking.totalPrice || booking.details?.totalPrice || booking.price || 0;
        case 'flight':
            return booking.totalAmount || booking.details?.totalPrice || booking.totalPrice || 0;
        case 'package':
            return booking.totalAmount || booking.price || booking.totalPrice || booking.details?.price || booking.details?.totalPrice || 0;
        case 'offer':
            return booking.totalAmount || booking.price || booking.totalPrice || 0;
        case 'visa':
            return booking.totalAmount || 0;
        default:
            return booking.totalAmount || booking.totalPrice || booking.details?.totalPrice || booking.price || 0;
    }
};

const getBookingConfirmationStatus = (bookingType) => {
    return BOOKING_CONFIRMATION_STATUS[bookingType] || BOOKING_STATUS.CONFIRMED;
};

const resolveMasterBooking = async (booking, bookingType, session = null) => {
    if (!booking) return null;

    if (booking.constructor.modelName === 'Booking') {
        return booking;
    }

    const query = Booking.findOne({ itemId: booking._id, bookingType });
    if (session) query.session(session);
    return await query;
};

const buildMasterBookingDetails = (booking, bookingType, payment) => {
    let details = {};

    if (bookingType === 'flight') {
        const itin = booking.eTicketData || {};
        const firstSeg = itin.Segments?.[0]?.[0] || itin.Segments?.[0];
        const lastSeg = itin.Segments?.[itin.Segments?.length - 1]?.[0] || itin.Segments?.[itin.Segments?.length - 1];
        const origin = firstSeg?.Origin?.AirportCode || firstSeg?.Origin || itin.Origin || '';
        const destination = lastSeg?.Destination?.AirportCode || lastSeg?.Destination || itin.Destination || booking.destination || '';
        const departureDate = firstSeg?.Origin?.DepTime || firstSeg?.DepartureTime || booking.departureDate || booking.createdAt || null;
        const returnDate = itin.Segments?.length > 1 ? (lastSeg?.Destination?.ArrTime || lastSeg?.ArrivalTime) : null;
        const passCount = Array.isArray(booking.passengers) ? booking.passengers.length : (booking.passengers || null);

        details = {
            destination: origin && destination ? `${origin}-${destination}` : (destination || null),
            departureDate,
            returnDate,
            totalPrice: booking.totalAmount || booking.totalPrice || payment.amount || null,
            currency: booking.currency || payment.currency || 'INR',
            passengers: passCount,
        };
    } else if (bookingType === 'hotel') {
        const passCount = Array.isArray(booking.guests)
            ? booking.guests.length
            : (typeof booking.passengers === 'number' ? booking.passengers : (booking.adultCount || booking.numberOfGuests || 1));
        const hotelName = booking.hotelName || booking.hotelSnapshot?.name || booking.name || 'Hotel Reservation';
        const destination = booking.destination ? `${hotelName}, ${booking.destination}` : hotelName;
        details = {
            destination,
            hotelName,
            departureDate: booking.checkIn || null,
            returnDate: booking.checkOut || null,
            totalPrice: booking.totalPrice || (booking.customerTotalMinor ? booking.customerTotalMinor / 100 : payment.amount) || null,
            currency: booking.currency || payment.currency || 'INR',
            passengers: passCount,
            roomName: booking.roomName || booking.roomSnapshots?.[0]?.roomName || booking.roomSnapshots?.[0]?.name || null,
        };
    } else if (bookingType === 'visa') {
        details = {
            destination: booking.destinationCountry || null,
            totalPrice: booking.totalAmount || payment.amount || null,
            currency: payment.currency || 'INR',
            passengers: booking.totalApplicants || 1,
            visaType: booking.visaType || null,
        };
    } else {
        // Handle package and offer snapshots cleanly
        const snapshot = booking.packageSnapshot || booking.offerSnapshot || {};
        const passCount = Array.isArray(booking.travellers)
            ? booking.travellers.length
            : (typeof booking.passengers === 'number' ? booking.passengers : (booking.quantity || booking.adultCount || booking.numberOfGuests || 1));
        details = {
            destination: snapshot.destination || snapshot.title || booking.destination || booking.details?.destination || booking.hotelName || booking.title || null,
            departureDate: snapshot.validity?.startDate || booking.checkIn || booking.startDate || booking.departureDate || null,
            returnDate: snapshot.validity?.endDate || booking.checkOut || booking.endDate || booking.returnDate || null,
            totalPrice: booking.totalAmount || booking.totalPrice || booking.budget || payment.amount || booking.price || booking.details?.totalPrice || null,
            currency: booking.currency || booking.details?.currency || payment.currency || 'INR',
            passengers: passCount,
        };
    }

    return Object.entries(details).reduce((acc, [key, value]) => {
        if (value !== null && typeof value !== 'undefined') {
            acc[key] = value;
        }
        return acc;
    }, {});
};

const createOrUpdateMasterBooking = async (payment, booking, session = null) => {
    if (!payment || !booking) return null;

    let masterBooking = await resolveMasterBooking(booking, payment.bookingType, session);
    if (!masterBooking) {
        const userId = payment.userId || booking.user?._id || booking.userId?._id || booking.user || booking.userId || booking.submittedBy;
        const details = buildMasterBookingDetails(booking, payment.bookingType, payment);

        if (!userId) {
            return null;
        }

        const createdBookings = await Booking.create([
            {
                userId,
                bookingType: payment.bookingType,
                itemId: booking._id,
                details,
                status: BOOKING_STATUS.CONFIRMED,
                paymentId: payment._id,
            },
        ], { session });

        masterBooking = createdBookings[0];
    } else {
        masterBooking.status = BOOKING_STATUS.CONFIRMED;
        masterBooking.paymentId = payment._id;
        if (!masterBooking.details?.currency && payment.currency) {
            masterBooking.details = {
                ...masterBooking.details,
                currency: payment.currency,
            };
        }
        await masterBooking.save({ session });
    }

    return masterBooking;
};

const updateBookingConfirmation = async (payment, booking, session = null) => {
    if (!payment || !booking) return null;

    const status = getBookingConfirmationStatus(payment.bookingType);

    booking.status = status;
    if (typeof booking.paymentId !== 'undefined') {
        booking.paymentId = payment._id;
    }
    if (payment.gatewayData?.captureId || payment.gatewayData?.transactionId) {
        booking.razorpayPaymentId = payment.gatewayData.captureId || payment.gatewayData.transactionId;
    }
    await booking.save({ session });

    const masterBooking = await createOrUpdateMasterBooking(payment, booking, session);
    return { booking, masterBooking };
};

const ensureBookingConfirmed = async (payment, session = null) => {
    if (!payment) return null;

    const booking = await resolveBooking(payment.bookingId, payment.bookingType);
    if (!booking) return null;

    // A hotel payment authorizes supplier confirmation and marks booking paid/confirmed in system
    if (payment.bookingType === 'hotel') {
        const { confirmBookingAfterPayment } = require('../hotels/hotel-booking.service');
        const hotelBooking = await confirmBookingAfterPayment({ bookingId: booking._id, payment, session });
        const masterBooking = await createOrUpdateMasterBooking(payment, hotelBooking || booking, session);
        return { booking: hotelBooking || booking, masterBooking };
    }

    if (payment.bookingType === 'flight') {
        const OutboxEvent = require('../shared/outbox-event.model');
        const { getFlightGDSQueue, processGDSTicketing } = require('../../workers/flights/flight-ticket-gds.worker');
        let flightBooking = booking;

        flightBooking.paymentId = payment._id;

        if (flightBooking.isLCC) {
            // LCC ticket is already issued; immediately confirm
            flightBooking.status = BOOKING_STATUS.CONFIRMED;
            await flightBooking.save({ session });
            const masterBooking = await createOrUpdateMasterBooking(payment, flightBooking, session);
            return { booking: flightBooking, masterBooking };
        }

        // GDS Flight: Record payment and enqueue async ticketing job
        await flightBooking.save({ session });

        // Record Outbox PAYMENT_RECEIVED event
        await OutboxEvent.create([{
            aggregateType: 'FlightBooking',
            aggregateId: flightBooking._id,
            eventType: 'PAYMENT_RECEIVED',
            payload: { bookingId: flightBooking._id, paymentId: payment._id },
        }], { session });

        const queue = getFlightGDSQueue();
        if (queue) {
            const jobId = `flight-ticket-gds-${flightBooking._id}`;
            await queue.add('ticket-gds', { bookingId: flightBooking._id }, {
                jobId,
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
            });
            logger.info(`[Booking Sync] Enqueued async GDS ticketing job ${jobId} on BullMQ.`);
        } else {
            // Synchronous in-process fallback for local dev / non-Redis environments
            setTimeout(async () => {
                try {
                    await processGDSTicketing(flightBooking._id);
                } catch (err) {
                    logger.error(`[Booking Sync] Fallback GDS ticketing failed: ${err.message}`);
                }
            }, 100);
        }

        const masterBooking = await createOrUpdateMasterBooking(payment, flightBooking, session);
        return { booking: flightBooking, masterBooking };
    }

    if (payment.bookingType === 'package' || payment.bookingType === 'offer') {
        const stockClaim = require('../packages/stock/stockClaim.service');

        // 1. Mark held stock units as 'used'
        if (booking.claimedUnits?.length) {
            await stockClaim.markUnitsUsed(booking.claimedUnits);
        } else if (booking.claimedFlightUnits?.length || booking.claimedHotelUnits?.length) {
            await stockClaim.markUnitsUsed(booking.claimedFlightUnits, booking.claimedHotelUnits);
        }

        // 2. Mark domain booking as confirmed
        booking.status = BOOKING_STATUS.CONFIRMED;
        if (payment.gatewayData?.captureId || payment.gatewayData?.transactionId) {
            booking.razorpayPaymentId = payment.gatewayData.captureId || payment.gatewayData.transactionId;
        }
        await booking.save({ session });

        // 3. Create or update Master Booking record
        const masterBooking = await createOrUpdateMasterBooking(payment, booking, session);

        // 4. Trigger Omnichannel Confirmation Notification
        try {
            const notificationService = require('../notifications/notification.service');
            const User = require('../auth/auth.model');
            const recipientUserId = booking.userId || payment.userId;
            const userDoc = recipientUserId ? await User.findById(recipientUserId).lean() : null;

            const baseUrl = process.env.CLIENT_URL || process.env.APP_URL || 'https://maqamtravels.com';
            const invoiceUrl = baseUrl + '/api/v1/invoices/package/' + booking._id + '/download';

            const bookingWithDetails = {
                ...(booking.toObject ? booking.toObject() : booking),
                destination: masterBooking?.details?.destination || booking.packageSnapshot?.destination || booking.packageSnapshot?.title || booking.offerSnapshot?.destination || booking.offerSnapshot?.title || booking.destination || 'Tour Package',
                bookingReference: masterBooking?.bookingReference || ('BK-' + booking._id),
            };

            notificationService.sendBookingConfirmation({
                booking: bookingWithDetails,
                user: {
                    _id: userDoc?._id || recipientUserId,
                    name: ((userDoc?.firstName || '') + ' ' + (userDoc?.lastName || '')).trim() || 'Valued Customer',
                    email: userDoc?.email || booking.contactDetails?.email,
                    phone: userDoc?.phone || booking.contactDetails?.phone,
                },
                invoicePdfUrl: invoiceUrl,
            }).catch((err) => {
                logger.warn('[Booking Sync] Package/Offer notification dispatch failed: ' + err.message);
            });
        } catch (notifErr) {
            logger.warn('[Booking Sync] Notification trigger error: ' + notifErr.message);
        }
        return { booking, masterBooking };
    }

    if (payment.bookingType === 'visa') {
        booking.paymentStatus = 'paid';
        booking.paymentId = payment._id;
        await booking.save({ session });

        const masterBooking = await createOrUpdateMasterBooking(payment, booking, session);
        return { booking, masterBooking };
    }

    const status = getBookingConfirmationStatus(payment.bookingType);
    let bookingUpdated = false;

    if (payment.bookingType !== 'package') {
        if (booking.status !== status) {
            booking.status = status;
            bookingUpdated = true;
        }

        if (typeof booking.paymentId !== 'undefined' && booking.paymentId?.toString() !== payment._id.toString()) {
            booking.paymentId = payment._id;
            bookingUpdated = true;
        }
    }

    if (bookingUpdated) {
        await booking.save({ session });
    }

    const masterBooking = await createOrUpdateMasterBooking(payment, booking, session);
    return { booking, masterBooking };
};

module.exports = {
    getBookingAmount,
    buildMasterBookingDetails,
    updateBookingConfirmation,
    ensureBookingConfirmed,
    createOrUpdateMasterBooking,
};
