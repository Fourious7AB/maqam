'use strict';

const mongoose = require('mongoose');
const Booking = require('./booking.model');
const HotelBooking = require('../hotels/hotel.model');
const FlightBooking = require('../flights/flight.model');
const PackageBooking = require('../packages/models/packageBooking.model');
const OfferBooking = require('../packages/offers/offerBooking.model');
const HotelStock = require('../packages/stock/hotelStock.model');
const TicketStock = require('../packages/stock/ticketStock.model');
const logger = require('../../utils/logger');
const { AppError } = require('../../middleware/errorHandler');

/**
 * ─── BOOKING SERVICE ───────────────────────────────────
 * Business logic: manage aggregated user bookings across all verticals
 * (Flight, Hotel, Package, Offer, and Master Booking)
 */

const normalizeStatus = (rawStatus, vertical) => {
  const s = String(rawStatus || '').toLowerCase();
  if (['confirmed', 'ticketed', 'completed', 'paid', 'payment_received'].includes(s)) {
    return 'confirmed';
  }
  if (['cancelled', 'cancellation_requested'].includes(s)) {
    return 'cancelled';
  }
  if (['failed', 'provider_failed', 'payment_failed', 'aborted'].includes(s)) {
    return 'failed';
  }
  return 'pending'; // initiated, awaiting_payment, pending
};

const getUserBookings = async (userId, { status, bookingType, type, search, page = 1, limit = 20 } = {}) => {
  try {
    if (!userId) {
      throw new AppError('User authentication required to fetch bookings', 401);
    }

    const uId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const requestedVertical = (bookingType || type || '').toLowerCase().trim();
    const requestedStatus = (status || '').toLowerCase().trim();

    // 1. Fetch domain bookings and master bookings in parallel
    const [
      masterBookings,
      flightBookings,
      hotelBookings,
      packageBookings,
      offerBookings,
    ] = await Promise.all([
      Booking.find({ userId: uId }).sort({ createdAt: -1 }).lean(),
      FlightBooking.find({ $or: [{ user: uId }, { userId: uId }] }).sort({ createdAt: -1 }).lean(),
      HotelBooking.find({ userId: uId }).sort({ createdAt: -1 }).lean(),
      PackageBooking.find({ userId: uId }).populate('packageId').sort({ createdAt: -1 }).lean(),
      OfferBooking.find({ userId: uId }).populate('offerId').sort({ createdAt: -1 }).lean(),
    ]);

    const unifiedMap = new Map();

    // A. Process Flight Bookings
    flightBookings.forEach((f) => {
      const idStr = f._id.toString();
      const normStatus = normalizeStatus(f.status, 'flight');
      const origin = f.fareSnapshot?.origin || f.eTicketData?.flight?.origin || 'Origin';
      const destination = f.fareSnapshot?.destination || f.eTicketData?.flight?.destination || 'Destination';
      const pnr = f.pnr || f.eTicketData?.pnr || (f.srdvBookingId ? String(f.srdvBookingId) : 'N/A');
      const airline = f.eTicketData?.flight?.airline || f.fareSnapshot?.airline || 'Airline Flight';

      unifiedMap.set(idStr, {
        _id: f._id,
        id: idStr,
        bookingId: idStr,
        bookingType: 'flight',
        vertical: 'flight',
        title: `${origin} → ${destination} (${airline})`,
        headline: `${origin} → ${destination}`,
        airline,
        pnr,
        destination,
        origin,
        status: normStatus,
        rawStatus: f.status,
        totalPrice: f.totalAmount || f.fareSnapshot?.totalFare || 0,
        amount: f.totalAmount || f.fareSnapshot?.totalFare || 0,
        currency: f.currency || 'INR',
        passengersCount: Array.isArray(f.passengers) ? f.passengers.length : 1,
        canCancel: normStatus !== 'cancelled' && normStatus !== 'failed',
        createdAt: f.createdAt || new Date(),
        updatedAt: f.updatedAt || new Date(),
        rawBooking: f,
      });
    });

    // B. Process Hotel Bookings
    hotelBookings.forEach((h) => {
      const idStr = h._id.toString();
      const normStatus = normalizeStatus(h.status, 'hotel');
      const hotelName = h.hotelName || h.hotelSnapshot?.name || 'Hotel Reservation';
      const roomType = h.roomSnapshots?.[0]?.roomTypeName || h.roomType || 'Standard Room';
      const price = h.customerTotalMinor ? h.customerTotalMinor / 100 : (h.totalPrice || 0);

      unifiedMap.set(idStr, {
        _id: h._id,
        id: idStr,
        bookingId: idStr,
        bookingType: 'hotel',
        vertical: 'hotel',
        title: `${hotelName} (${roomType})`,
        headline: hotelName,
        hotelName,
        roomType,
        destination: h.destination || h.hotelSnapshot?.city || 'Saudi Arabia',
        checkIn: h.checkIn,
        checkOut: h.checkOut,
        status: normStatus,
        rawStatus: h.status,
        totalPrice: price,
        amount: price,
        currency: h.currency || 'INR',
        guestsCount: Array.isArray(h.guests) ? h.guests.length : 1,
        canCancel: normStatus !== 'cancelled' && normStatus !== 'failed',
        createdAt: h.createdAt || new Date(),
        updatedAt: h.updatedAt || new Date(),
        rawBooking: h,
      });
    });

    // C. Process Package Bookings
    packageBookings.forEach((p) => {
      const idStr = p._id.toString();
      const normStatus = normalizeStatus(p.status, 'package');
      const title = p.packageId?.title || p.packageSnapshot?.title || 'Custom Travel Package';
      const destination = p.packageId?.destination || p.packageSnapshot?.destination || 'Makkah';
      const price = p.pricing?.totalSellPrice || p.totalPrice || p.customQuote?.totalSellPrice || 0;

      unifiedMap.set(idStr, {
        _id: p._id,
        id: idStr,
        bookingId: idStr,
        bookingType: 'package',
        vertical: 'package',
        title,
        headline: title,
        destination,
        status: normStatus,
        rawStatus: p.status,
        totalPrice: price,
        amount: price,
        currency: p.pricing?.currency || p.currency || 'INR',
        passengersCount: Array.isArray(p.travellers) ? p.travellers.length : 1,
        canCancel: normStatus !== 'cancelled' && normStatus !== 'failed',
        createdAt: p.createdAt || new Date(),
        updatedAt: p.updatedAt || new Date(),
        rawBooking: p,
      });
    });

    // D. Process Offer Bookings
    offerBookings.forEach((o) => {
      const idStr = o._id.toString();
      const normStatus = normalizeStatus(o.status, 'offer');
      const title = o.offerId?.title || o.offerSnapshot?.title || 'Special Travel Offer';
      const destination = o.offerId?.destination || o.offerSnapshot?.destination || 'Special Offer';
      const price = o.totalPrice || (o.offerId?.sellPrice ? o.offerId.sellPrice * (o.quantity || 1) : 0);

      unifiedMap.set(idStr, {
        _id: o._id,
        id: idStr,
        bookingId: idStr,
        bookingType: 'offer',
        vertical: 'offer',
        title,
        headline: title,
        destination,
        status: normStatus,
        rawStatus: o.status,
        totalPrice: price,
        amount: price,
        currency: o.currency || 'INR',
        passengersCount: Array.isArray(o.travellers) ? o.travellers.length : (o.quantity || 1),
        canCancel: normStatus !== 'cancelled' && normStatus !== 'failed',
        createdAt: o.createdAt || new Date(),
        updatedAt: o.updatedAt || new Date(),
        rawBooking: o,
      });
    });

    // E. Merge Master Bookings
    masterBookings.forEach((m) => {
      const itemKey = m.itemId ? m.itemId.toString() : null;
      if (itemKey && unifiedMap.has(itemKey)) {
        // Link master booking record id
        const existing = unifiedMap.get(itemKey);
        existing.masterBookingId = m._id.toString();
        if (m.status === 'cancelled') existing.status = 'cancelled';
        return;
      }

      // If standalone master booking without duplicate domain record
      const mIdStr = m._id.toString();
      const normStatus = normalizeStatus(m.status, m.bookingType);
      const title = m.details?.hotelName || m.details?.destination || `${m.bookingType} Booking`;

      unifiedMap.set(mIdStr, {
        _id: m._id,
        id: mIdStr,
        bookingId: mIdStr,
        masterBookingId: mIdStr,
        bookingType: m.bookingType || 'general',
        vertical: m.bookingType || 'general',
        title,
        headline: title,
        destination: m.details?.destination || 'Travel Reservation',
        status: normStatus,
        rawStatus: m.status,
        totalPrice: m.details?.totalPrice || 0,
        amount: m.details?.totalPrice || 0,
        currency: m.details?.currency || 'INR',
        passengersCount: m.details?.passengers || 1,
        canCancel: normStatus !== 'cancelled' && normStatus !== 'failed',
        createdAt: m.createdAt || new Date(),
        updatedAt: m.updatedAt || new Date(),
        rawBooking: m,
      });
    });

    // 2. Filter list
    let allBookings = Array.from(unifiedMap.values());

    if (requestedVertical && requestedVertical !== 'all') {
      allBookings = allBookings.filter((b) => b.bookingType === requestedVertical || b.vertical === requestedVertical);
    }

    if (requestedStatus && requestedStatus !== 'all') {
      allBookings = allBookings.filter((b) => b.status === requestedStatus);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      allBookings = allBookings.filter((b) => {
        return (
          b.title?.toLowerCase().includes(q) ||
          b.headline?.toLowerCase().includes(q) ||
          b.destination?.toLowerCase().includes(q) ||
          b.pnr?.toLowerCase().includes(q) ||
          b.id?.toLowerCase().includes(q)
        );
      });
    }

    // 3. Sort by createdAt descending
    allBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 4. Paginate
    const total = allBookings.length;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;
    const paginated = allBookings.slice(skip, skip + limitNum);

    return {
      bookings: paginated,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  } catch (error) {
    logger.error(`Get user bookings failed: ${error.message}`);
    throw error;
  }
};

const getBookingById = async (bookingId, userId) => {
  try {
    const uId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    // Check Master Booking
    let booking = await Booking.findOne({ _id: bookingId, userId: uId }).lean();
    if (booking) return booking;

    // Check Flight
    booking = await FlightBooking.findOne({ _id: bookingId, $or: [{ user: uId }, { userId: uId }] }).lean();
    if (booking) return { ...booking, bookingType: 'flight' };

    // Check Hotel
    booking = await HotelBooking.findOne({ _id: bookingId, userId: uId }).lean();
    if (booking) return { ...booking, bookingType: 'hotel' };

    // Check Package
    booking = await PackageBooking.findOne({ _id: bookingId, userId: uId }).populate('packageId').lean();
    if (booking) return { ...booking, bookingType: 'package' };

    // Check Offer
    booking = await OfferBooking.findOne({ _id: bookingId, userId: uId }).populate('offerId').lean();
    if (booking) return { ...booking, bookingType: 'offer' };

    return null;
  } catch (error) {
    logger.error(`Get booking failed: ${error.message}`);
    throw error;
  }
};

const createBooking = async (userId, { bookingType, itemId, details }) => {
  try {
    const booking = await Booking.create({
      userId,
      bookingType,
      itemId,
      details,
      status: 'pending',
    });

    logger.info(`Master booking created: ${booking._id}`);
    return booking;
  } catch (error) {
    logger.error(`Create booking failed: ${error.message}`);
    throw error;
  }
};

const updateBooking = async (bookingId, userId, updates) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: bookingId, userId },
      updates,
      { new: true }
    );

    if (booking) logger.info(`Booking updated: ${bookingId}`);
    return booking;
  } catch (error) {
    logger.error(`Update booking failed: ${error.message}`);
    throw error;
  }
};

const cancelBooking = async (bookingId, userId, reason = 'Customer requested cancellation') => {
  try {
    const uId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    let cancelledRecord = null;

    // Check if target is a Master Booking first, to resolve underlying domain record if needed
    const masterBooking = await Booking.findOne({
      $or: [
        { _id: bookingId, userId: uId },
        { itemId: bookingId, userId: uId }
      ]
    });

    const targetDomainId = masterBooking && masterBooking._id.toString() === bookingId.toString()
      ? masterBooking.itemId
      : bookingId;

    // 1. Try Hotel Booking
    const hotelBooking = await HotelBooking.findOne({ _id: targetDomainId, userId: uId });
    if (hotelBooking) {
      if (hotelBooking.providerBookingId) {
        try {
          const hotelCancelUseCase = require('../hotels/application/hotel-cancel.usecase');
          await hotelCancelUseCase.cancelBooking({ bookingId: targetDomainId, userId: uId });
        } catch (srdvErr) {
          logger.warn(`SRDV hotel cancel notification: ${srdvErr.message}`);
        }
      }
      hotelBooking.status = 'cancelled';
      hotelBooking.cancellationReason = reason;
      hotelBooking.cancelledAt = new Date();
      await hotelBooking.save();
      cancelledRecord = { ...hotelBooking.toObject(), bookingType: 'hotel' };
      logger.info(`Hotel booking cancelled: ${targetDomainId}`);
    }

    // 2. Try Flight Booking
    if (!cancelledRecord) {
      const flightBooking = await FlightBooking.findOne({ _id: targetDomainId, $or: [{ user: uId }, { userId: uId }] });
      if (flightBooking) {
        if (flightBooking.srdvBookingId) {
          try {
            const flightService = require('../flights/flight.service');
            await flightService.cancelFlightBookingService({ bookingId: targetDomainId, userId: uId, reason });
          } catch (srdvErr) {
            logger.warn(`SRDV flight cancel notification: ${srdvErr.message}`);
          }
        }
        flightBooking.status = 'cancelled';
        flightBooking.cancelledAt = new Date();
        flightBooking.cancellationReason = reason;
        await flightBooking.save();
        cancelledRecord = { ...flightBooking.toObject(), bookingType: 'flight' };
        logger.info(`Flight booking cancelled: ${targetDomainId}`);
      }
    }

    // 3. Try Package Booking (and release stock)
    if (!cancelledRecord) {
      const packageBooking = await PackageBooking.findOne({ _id: targetDomainId, userId: uId });
      if (packageBooking) {
        packageBooking.status = 'cancelled';
        packageBooking.cancelledAt = new Date();
        packageBooking.cancellationReason = reason;
        await packageBooking.save();

        // Release claimed units
        if (Array.isArray(packageBooking.claimedHotelUnits)) {
          for (const u of packageBooking.claimedHotelUnits) {
            await HotelStock.updateOne(
              { _id: u.stockId, 'units._id': u.unitId },
              { $set: { 'units.$.status': 'available', 'units.$.assignedToBooking': null } }
            ).catch((err) => logger.warn(`Stock release error: ${err.message}`));
          }
        }
        if (Array.isArray(packageBooking.claimedTicketUnits)) {
          for (const u of packageBooking.claimedTicketUnits) {
            await TicketStock.updateOne(
              { _id: u.stockId, 'units._id': u.unitId },
              { $set: { 'units.$.status': 'available', 'units.$.assignedToBooking': null } }
            ).catch((err) => logger.warn(`Stock release error: ${err.message}`));
          }
        }

        cancelledRecord = { ...packageBooking.toObject(), bookingType: 'package' };
        logger.info(`Package booking cancelled and stock released: ${targetDomainId}`);
      }
    }

    // 4. Try Offer Booking (and release stock)
    if (!cancelledRecord) {
      const offerBooking = await OfferBooking.findOne({ _id: targetDomainId, userId: uId });
      if (offerBooking) {
        offerBooking.status = 'cancelled';
        offerBooking.cancelledAt = new Date();
        offerBooking.cancellationReason = reason;
        await offerBooking.save();

        if (Array.isArray(offerBooking.claimedHotelUnits)) {
          for (const u of offerBooking.claimedHotelUnits) {
            await HotelStock.updateOne(
              { _id: u.stockId, 'units._id': u.unitId },
              { $set: { 'units.$.status': 'available', 'units.$.assignedToBooking': null } }
            ).catch((err) => logger.warn(`Stock release error: ${err.message}`));
          }
        }

        cancelledRecord = { ...offerBooking.toObject(), bookingType: 'offer' };
        logger.info(`Offer booking cancelled: ${targetDomainId}`);
      }
    }

    // 5. Update Master Booking record
    if (masterBooking) {
      masterBooking.status = 'cancelled';
      masterBooking.cancelledAt = new Date();
      masterBooking.cancellationReason = reason;
      await masterBooking.save();
      if (!cancelledRecord) {
        cancelledRecord = masterBooking.toObject();
      }
      logger.info(`Master booking cancelled: ${masterBooking._id}`);
    }

    return cancelledRecord;
  } catch (error) {
    logger.error(`Cancel booking failed: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getUserBookings,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
};
