// modules/invoices/adminInvoice.service.js
//
// Admin / CRM Operations Invoicing Service across all verticals:
// 1. Tour Packages (Umrah & Holiday Packages)
// 2. Standalone Retail Offers (Wholesale Flight & Hotel Allotments)
// 3. Visa Batches (In-House Consular & Facilitation Services)
// 4. Online Flights (Live GDS & LCC Aggregator Inventory)
// 5. Online Hotels (Live SRDV Supplier Inventory)

const FlightBooking = require('../flights/flight.model');
const HotelBooking = require('../hotels/hotel.model');
const PackageBooking = require('../packages/models/packageBooking.model');
const Package = require('../packages/models/package.model');
const OfferBooking = require('../packages/offers/offerBooking.model');
const VisaGroup = require('../visa/user/visaGroup.model');
const invoiceService = require('./invoice.service');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Normalizes user/customer contact details safely
 */
const formatCustomer = (user) => {
  if (!user) return { _id: null, name: 'Customer', email: '', phone: '' };
  const name =
    user.name ||
    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
    'Customer';
  return {
    _id: user._id || null,
    name,
    email: user.email || '',
    phone: user.phone || '',
  };
};

class AdminInvoiceService {
  // ─── 1. TOUR PACKAGES ─────────────────────────────────────────────────────────

  /**
   * List all Tour Package invoices with filtering and pagination
   */
  async listPackageInvoices(query = {}) {
    const { page = 1, limit = 10, status, search, startDate, endDate } = query;
    const filter = {};

    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      const pkgIds = await Package.find({
        $or: [
          { title: new RegExp(search.trim(), 'i') },
          { destination: new RegExp(search.trim(), 'i') },
        ],
      }).distinct('_id');
      filter.packageId = { $in: pkgIds };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      PackageBooking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'firstName lastName name email phone')
        .populate('packageId', 'title destination durationDays sellPrice')
        .lean(),
      PackageBooking.countDocuments(filter),
    ]);

    const invoices = bookings.map((booking) => {
      const bookingDate = new Date(booking.createdAt || Date.now());
      const yearMonth = `${bookingDate.getFullYear()}${String(bookingDate.getMonth() + 1).padStart(2, '0')}`;
      const refSuffix = booking._id.toString().slice(-6).toUpperCase();
      const invoiceNumber = `MT-INV-PKG-${yearMonth}-${refSuffix}`;
      const customer = formatCustomer(booking.userId);

      return {
        invoiceNumber,
        bookingId: booking._id,
        vertical: 'package',
        packageTitle: booking.packageId?.title || 'Tour Package',
        destination: booking.packageId?.destination || '',
        durationDays: booking.packageId?.durationDays || null,
        quantity: booking.quantity || 1,
        pilgrimCount: booking.travellers?.length || booking.quantity || 1,
        customer,
        totalAmount: booking.totalAmount || 0,
        currency: 'INR',
        status: booking.status,
        issuedAt: booking.createdAt,
        links: {
          viewJson: `/api/v1/crm/invoices/package/${booking._id}`,
          viewHtml: `/api/v1/crm/invoices/package/${booking._id}/html`,
          download: `/api/v1/crm/invoices/package/${booking._id}/download`,
        },
      };
    });

    return {
      invoices,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getPackageInvoiceData(bookingId, currentUser) {
    return invoiceService.getPackageInvoiceData(bookingId, currentUser);
  }

  async getPackageInvoiceHtml(bookingId, currentUser, rawToken) {
    return invoiceService.getPackageInvoiceHtml(bookingId, currentUser, rawToken);
  }

  // ─── 2. STANDALONE RETAIL OFFERS ──────────────────────────────────────────────

  /**
   * List all Retail Offer invoices with filtering and pagination
   */
  async listOfferInvoices(query = {}) {
    const { page = 1, limit = 10, status, itemType, search, startDate, endDate } = query;
    const filter = {};

    if (status) filter.status = status;
    if (itemType) filter['offerSnapshot.itemType'] = itemType;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { 'offerSnapshot.title': regex },
        { 'offerSnapshot.destination': regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      OfferBooking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'firstName lastName name email phone')
        .populate('offerId', 'title destination itemType sellPrice')
        .lean(),
      OfferBooking.countDocuments(filter),
    ]);

    const invoices = bookings.map((booking) => {
      const isFlight = (booking.offerSnapshot?.itemType || booking.offerId?.itemType) === 'flight';
      const serviceType = isFlight ? 'FLT' : 'HTL';
      const bookingDate = new Date(booking.createdAt || Date.now());
      const yearMonth = `${bookingDate.getFullYear()}${String(bookingDate.getMonth() + 1).padStart(2, '0')}`;
      const refSuffix = booking._id.toString().slice(-6).toUpperCase();
      const invoiceNumber = `MT-INV-OFR-${serviceType}-${yearMonth}-${refSuffix}`;
      const customer = formatCustomer(booking.userId);

      return {
        invoiceNumber,
        bookingId: booking._id,
        vertical: 'offer',
        itemType: isFlight ? 'flight' : 'hotel',
        offerTitle: booking.offerSnapshot?.title || booking.offerId?.title || 'Retail Offer',
        destination: booking.offerSnapshot?.destination || booking.offerId?.destination || '',
        quantity: booking.quantity || 1,
        travellersCount: booking.travellers?.length || booking.quantity || 1,
        customer,
        totalAmount: booking.totalAmount || 0,
        currency: 'INR',
        status: booking.status,
        issuedAt: booking.createdAt,
        links: {
          viewJson: `/api/v1/crm/invoices/offer/${booking._id}`,
          viewHtml: `/api/v1/crm/invoices/offer/${booking._id}/html`,
          download: `/api/v1/crm/invoices/offer/${booking._id}/download`,
        },
      };
    });

    return {
      invoices,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getOfferInvoiceData(bookingId, currentUser) {
    return invoiceService.getOfferInvoiceData(bookingId, currentUser);
  }

  async getOfferInvoiceHtml(bookingId, currentUser, rawToken) {
    return invoiceService.getOfferInvoiceHtml(bookingId, currentUser, rawToken);
  }

  // ─── 3. VISA BATCHES ──────────────────────────────────────────────────────────

  /**
   * List all Visa Batch invoices with filtering and pagination
   */
  async listVisaInvoices(query = {}) {
    const { page = 1, limit = 10, paymentStatus, groupStatus, search, startDate, endDate } = query;
    const filter = {};

    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (groupStatus) filter.groupStatus = groupStatus;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { destinationCountry: regex },
        { visaType: regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [groups, total] = await Promise.all([
      VisaGroup.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('submittedBy', 'firstName lastName name email phone')
        .lean(),
      VisaGroup.countDocuments(filter),
    ]);

    const invoices = groups.map((group) => {
      const groupDate = new Date(group.createdAt || Date.now());
      const yearMonth = `${groupDate.getFullYear()}${String(groupDate.getMonth() + 1).padStart(2, '0')}`;
      const refSuffix = group._id.toString().slice(-6).toUpperCase();
      const invoiceNumber = `MT-INV-VSA-${yearMonth}-${refSuffix}`;
      const customer = formatCustomer(group.submittedBy);

      return {
        invoiceNumber,
        groupId: group._id,
        vertical: 'visa',
        destinationCountry: group.destinationCountry || '',
        visaType: group.visaType || 'Tourist Visa',
        totalApplicants: group.totalApplicants || 1,
        customer,
        totalAmount: group.totalAmount || 0,
        currency: 'INR',
        paymentStatus: group.paymentStatus,
        groupStatus: group.groupStatus,
        issuedAt: group.createdAt,
        links: {
          viewJson: `/api/v1/crm/invoices/visa/${group._id}`,
          viewHtml: `/api/v1/crm/invoices/visa/${group._id}/html`,
          download: `/api/v1/crm/invoices/visa/${group._id}/download`,
        },
      };
    });

    return {
      invoices,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getVisaInvoiceData(groupId, currentUser) {
    return invoiceService.getVisaInvoiceData(groupId, currentUser);
  }

  async getVisaInvoiceHtml(groupId, currentUser, rawToken) {
    return invoiceService.getVisaInvoiceHtml(groupId, currentUser, rawToken);
  }

  // ─── 4. ONLINE FLIGHTS (SRDV GDS & LCC) ────────────────────────────────────────

  /**
   * List all Flight invoices with filtering and pagination
   */
  async listFlightInvoices(query = {}) {
    const { page = 1, limit = 10, status, search, startDate, endDate, isLCC } = query;
    const filter = {};

    if (status) filter.status = status;
    if (typeof isLCC !== 'undefined') filter.isLCC = isLCC === 'true' || isLCC === true;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { pnr: regex },
        { gdsPnr: regex },
        { srdvBookingId: regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      FlightBooking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('user', 'firstName lastName name email phone')
        .populate('passengers.travellerId', 'firstName lastName title')
        .populate('paymentId')
        .lean(),
      FlightBooking.countDocuments(filter),
    ]);

    const invoices = bookings.map((booking) => {
      const isLCCVal = Boolean(booking.isLCC);
      const serviceType = isLCCVal ? 'LCC' : 'GDS';
      const bookingDate = new Date(booking.createdAt || Date.now());
      const yearMonth = `${bookingDate.getFullYear()}${String(bookingDate.getMonth() + 1).padStart(2, '0')}`;
      const refSuffix = (booking.srdvBookingId || booking._id.toString().slice(-6)).toString().toUpperCase();
      const invoiceNumber = `MT-INV-${serviceType}-${yearMonth}-${refSuffix}`;
      const customer = formatCustomer(booking.user);

      const firstSeg = booking.segments?.[0] || {};
      const lastSeg = booking.segments?.[booking.segments.length - 1] || firstSeg;

      return {
        invoiceNumber,
        bookingId: booking._id,
        vertical: 'flight',
        serviceType,
        isLCC: isLCCVal,
        pnr: booking.pnr || booking.gdsPnr || null,
        srdvBookingId: booking.srdvBookingId || null,
        airline: firstSeg.airline || firstSeg.airlineCode || 'Flight',
        flightNumber: firstSeg.flightNumber || '',
        route: firstSeg.origin && lastSeg.destination ? `${firstSeg.origin} → ${lastSeg.destination}` : '',
        customer,
        passengersCount: booking.passengers?.length || 1,
        totalAmount: booking.totalAmount || 0,
        currency: 'INR',
        status: booking.status,
        issuedAt: booking.createdAt,
        links: {
          viewJson: `/api/v1/crm/invoices/flight/${booking._id}`,
          viewHtml: `/api/v1/crm/invoices/flight/${booking._id}/html`,
          download: `/api/v1/crm/invoices/flight/${booking._id}/download`,
        },
      };
    });

    return {
      invoices,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getFlightInvoiceData(bookingId, currentUser) {
    return invoiceService.getInvoiceData(bookingId, currentUser);
  }

  async getFlightInvoiceHtml(bookingId, currentUser, rawToken) {
    return invoiceService.getInvoiceHtml(bookingId, currentUser);
  }

  // ─── 5. ONLINE HOTELS (SRDV LIVE INVENTORY) ───────────────────────────────────

  /**
   * List all Hotel invoices with filtering and pagination
   */
  async listHotelInvoices(query = {}) {
    const { page = 1, limit = 10, status, search, startDate, endDate } = query;
    const filter = {};

    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { hotelName: regex },
        { city: regex },
        { confirmationNo: regex },
        { providerBookingId: regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      HotelBooking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'firstName lastName name email phone')
        .lean(),
      HotelBooking.countDocuments(filter),
    ]);

    const invoices = bookings.map((booking) => {
      const bookingDate = new Date(booking.createdAt || Date.now());
      const yearMonth = `${bookingDate.getFullYear()}${String(bookingDate.getMonth() + 1).padStart(2, '0')}`;
      const refSuffix = (
        booking.confirmationNo ||
        booking.providerBookingId ||
        booking._id.toString().slice(-6)
      ).toString().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-6);
      const invoiceNumber = `MT-INV-HTL-${yearMonth}-${refSuffix}`;
      const customer = formatCustomer(booking.userId);
      const totalAmount = booking.pricing?.totalAmount || booking.totalAmount || 0;

      return {
        invoiceNumber,
        bookingId: booking._id,
        vertical: 'hotel',
        confirmationNo: booking.confirmationNo || null,
        providerBookingId: booking.providerBookingId || null,
        hotelName: booking.hotelName || 'Hotel Accommodation',
        city: booking.city || '',
        checkIn: booking.checkIn || null,
        checkOut: booking.checkOut || null,
        nights: booking.nights || 1,
        roomsCount: booking.rooms?.length || 1,
        customer,
        totalAmount,
        currency: 'INR',
        status: booking.status,
        issuedAt: booking.createdAt,
        links: {
          viewJson: `/api/v1/crm/invoices/hotel/${booking._id}`,
          viewHtml: `/api/v1/crm/invoices/hotel/${booking._id}/html`,
          download: `/api/v1/crm/invoices/hotel/${booking._id}/download`,
        },
      };
    });

    return {
      invoices,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getHotelInvoiceData(bookingId, currentUser) {
    return invoiceService.getHotelInvoiceData(bookingId, currentUser);
  }

  async getHotelInvoiceHtml(bookingId, currentUser, rawToken) {
    return invoiceService.getHotelInvoiceHtml(bookingId, currentUser);
  }

  // ─── 6. SUMMARY & DASHBOARD METRICS ───────────────────────────────────────────

  /**
   * Cross-vertical financial overview for CRM finance & operations
   */
  async getInvoicesSummary() {
    const [
      packageTotal,
      offerTotal,
      visaTotal,
      flightTotal,
      hotelTotal,
      packageRevenueAgg,
      offerRevenueAgg,
      visaRevenueAgg,
      flightRevenueAgg,
      hotelRevenueAgg,
    ] = await Promise.all([
      PackageBooking.countDocuments(),
      OfferBooking.countDocuments(),
      VisaGroup.countDocuments(),
      FlightBooking.countDocuments(),
      HotelBooking.countDocuments(),
      PackageBooking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      OfferBooking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      VisaGroup.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      FlightBooking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      HotelBooking.aggregate([
        { $match: { status: 'CONFIRMED' } },
        { $group: { _id: null, total: { $sum: '$pricing.totalAmount' } } },
      ]),
    ]);

    const packageRev = packageRevenueAgg[0]?.total || 0;
    const offerRev = offerRevenueAgg[0]?.total || 0;
    const visaRev = visaRevenueAgg[0]?.total || 0;
    const flightRev = flightRevenueAgg[0]?.total || 0;
    const hotelRev = hotelRevenueAgg[0]?.total || 0;
    const grandTotalRevenue = packageRev + offerRev + visaRev + flightRev + hotelRev;
    const totalInvoicesCount = packageTotal + offerTotal + visaTotal + flightTotal + hotelTotal;

    return {
      totalInvoicesCount,
      grandTotalRevenue,
      currency: 'INR',
      byVertical: {
        package: { totalInvoices: packageTotal, confirmedRevenue: packageRev },
        offer: { totalInvoices: offerTotal, confirmedRevenue: offerRev },
        visa: { totalInvoices: visaTotal, confirmedRevenue: visaRev },
        flight: { totalInvoices: flightTotal, confirmedRevenue: flightRev },
        hotel: { totalInvoices: hotelTotal, confirmedRevenue: hotelRev },
      },
    };
  }
}

module.exports = new AdminInvoiceService();

