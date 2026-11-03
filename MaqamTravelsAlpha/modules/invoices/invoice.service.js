const fs = require('fs');
const path = require('path');
const FlightBooking = require('../flights/flight.model');
const HotelBooking = require('../hotels/hotel.model');
const PackageBooking = require('../packages/models/packageBooking.model');
const Package = require('../packages/models/package.model');
const Booking = require('../bookings/booking.model');
const OfferBooking = require('../packages/offers/offerBooking.model');
const TicketStock = require('../packages/stock/ticketStock.model');
const HotelStock = require('../packages/stock/hotelStock.model');
const settingsService = require('../crm/settings.service');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');
const VisaGroup = require('../visa/user/visaGroup.model');
const VisaApplication = require('../visa/user/visaApplication.model'); 

// Agency tax & company configuration (fallbacks or env-driven)
const AGENCY_CONFIG = {
  name: process.env.AGENCY_NAME || 'Maqam Travels Private Limited',
  address: process.env.AGENCY_ADDRESS || 'Worldmark 1, Aerocity, New Delhi, Delhi 110037, India',
  gstin: process.env.AGENCY_GSTIN || '07AAACM1234F1Z8',
  pan: process.env.AGENCY_PAN || 'AAACM1234F',
  sacDomestic: '996411', // Passenger transport service by air (Domestic)
  sacInternational: '996412', // Passenger transport service by air (International)
  sacHotelStay: '996311', // Room or unit accommodation services provided by Hotels, Inns, Guest Houses
  sacTravelService: '998555', // Tour operator / Travel agency reservation services
  email: process.env.AGENCY_EMAIL || 'support@maqamtravels.com',
  phone: process.env.AGENCY_PHONE || '+91 11 4000 8899',
  website: process.env.AGENCY_WEBSITE || 'https://maqamtravels.com',
};

/**
 * Format date string into "DD MMM YYYY"
 */
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format currency amount with 2 decimals
 */
const formatAmount = (num) => {
  const val = Number(num) || 0;
  return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Format ISO date string into readable date-time
 */
const formatDateTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format duration minutes into "Xh Ym"
 */
const formatDuration = (mins) => {
  if (!mins) return 'N/A';
  const num = parseInt(mins, 10);
  if (isNaN(num)) return String(mins);
  const h = Math.floor(num / 60);
  const m = num % 60;
  return `${h}h ${m}m`;
};

/**
 * Service to generate flight invoices for both GDS and LCC live bookings
 * without modifying existing database schemas.
 */
class InvoiceService {
  /**
   * Fetch and normalize flight booking data into standard invoice payload.
   * Works on existing FlightBooking, User, and Payment records.
   *
   * @param {string} bookingId - FlightBooking _id, srdvBookingId, or PNR
   * @param {Object} currentUser - req.user object for access control
   * @returns {Promise<Object>} Normalized invoice JSON data
   */
  async getInvoiceData(bookingId, currentUser = null) {
    if (!bookingId) {
      throw new AppError('Booking reference or ID is required', 400);
    }
    // 1. Locate the booking using existing identifiers
    const cleanId = String(bookingId || '').trim();
    let query = {};
    if (cleanId.match(/^[0-9a-fA-F]{24}$/)) {
      query = { _id: cleanId };
    } else if (!isNaN(Number(cleanId))) {
      query = { srdvBookingId: Number(cleanId) };
    } else {
      query = { pnr: cleanId.toUpperCase() };
    }

    const booking = await FlightBooking.findOne(query)
      .populate('user', 'firstName lastName name email phone')
      .populate('paymentId')
      .populate('passengers.travellerId')
      .lean();

    if (!booking) {
      return await this.getInHouseFlightInvoiceData(cleanId, currentUser);
    }

    // 2. Authorization check (Customers can only view their own bookings)
    if (currentUser && currentUser.role === 'customer') {
      const bookingUserId = booking.user?._id?.toString() || booking.user?.toString();
      const currentUserId = currentUser.id?.toString() || currentUser._id?.toString();
      if (bookingUserId !== currentUserId) {
        throw new AppError('Unauthorized: You can only view invoices for your own bookings', 403);
      }
    }

    // 3. Extract GDS vs LCC specifics
    const isLCC = Boolean(booking.isLCC);
    const serviceType = isLCC ? 'LCC' : 'GDS';
    const serviceTypeBadge = isLCC
      ? 'LCC (Low-Cost Carrier)'
      : 'GDS (Full-Service Carrier)';

    // Deterministic invoice number (e.g. MT-INV-LCC-202610-A1B2C3)
    const bookingDate = new Date(booking.createdAt || Date.now());
    const yearMonth = `${bookingDate.getFullYear()}${String(bookingDate.getMonth() + 1).padStart(2, '0')}`;
    const refSuffix = (booking.srdvBookingId || booking._id.toString().slice(-6)).toString().toUpperCase();
    const invoiceNumber = `MT-INV-${serviceType}-${yearMonth}-${refSuffix}`;

    const supplierInvoiceNo = booking.invoiceNo || booking.eTicketData?.InvoiceNo || null;

    // 4. Passenger list extraction (combines eTicketData & DB passengers)
    const rawETicketPax = booking.eTicketData?.Passenger || [];
    const dbPassengers = booking.passengers || [];

    const passengers = [];
    const paxCount = Math.max(rawETicketPax.length, dbPassengers.length, 1);

    for (let i = 0; i < paxCount; i++) {
      const ePax = rawETicketPax[i] || {};
      const dbPax = dbPassengers[i] || {};
      const traveller = dbPax.travellerId || {};

      const title = ePax.Title || traveller.title || '';
      const firstName = ePax.FirstName || traveller.firstName || traveller.name || '';
      const lastName = ePax.LastName || traveller.lastName || '';
      const fullName = `${title} ${firstName} ${lastName}`.trim() || 'Passenger ' + (i + 1);

      // Determine E-ticket number:
      // GDS has standard 13-digit ticket numbers.
      // LCC may have airline ticket id, or pnr confirmation.
      let ticketNum = dbPax.ticketNumber || ePax.Ticket?.TicketNumber || dbPax.ticketId || ePax.Ticket?.TicketId;
      if (!ticketNum || ticketNum === '') {
        ticketNum = isLCC ? (booking.pnr ? `${booking.pnr} (LCC Direct)` : 'Confirmed') : 'Issued';
      }

      let ticketStatus = dbPax.ticketStatus || ePax.Ticket?.Status || booking.ticketStatus || 'Confirmed';

      passengers.push({
        index: i + 1,
        name: fullName,
        paxType: ePax.PaxType === '2' ? 'Child' : ePax.PaxType === '3' ? 'Infant' : 'Adult',
        ticketNumber: ticketNum,
        ticketStatus: ticketStatus || 'OK',
        seat: ePax.Seat || dbPax.seat || 'Standard',
      });
    }

    // 5. Segments & Itinerary extraction
    const rawSegments =
      booking.eTicketData?.FlightItinerary?.Segments ||
      booking.eTicketData?.Segments ||
      booking.fareSnapshot?.Segments ||
      booking.fareSnapshot?.FlightItinerary?.Segments ||
      booking.fareSnapshot?.Results?.Segments ||
      booking.flightDetails?.segments ||
      booking.flightDetails?.Segments ||
      booking.segments ||
      [];
    const segments = [];

    if (Array.isArray(rawSegments) && rawSegments.length > 0) {
      const flattened = Array.isArray(rawSegments[0]) ? rawSegments[0] : rawSegments;
      flattened.forEach((seg, idx) => {
        const airlineCode = seg.Airline?.AirlineCode || seg.AirlineCode || '';
        const airlineName = seg.Airline?.AirlineName || airlineCode || 'Airline';
        const flightNumber = seg.Airline?.FlightNumber || seg.FlightNumber || '';
        const originCode = seg.Origin?.AirportCode || seg.OriginAirportCode || seg.Origin || '';
        const originCity = seg.Origin?.CityName || originCode;
        const originTerminal = seg.Origin?.Terminal ? ` (T${seg.Origin.Terminal})` : '';

        const destCode = seg.Destination?.AirportCode || seg.DestinationAirportCode || seg.Destination || '';
        const destCity = seg.Destination?.CityName || destCode;
        const destTerminal = seg.Destination?.Terminal ? ` (T${seg.Destination.Terminal})` : '';

        segments.push({
          segmentIndex: idx + 1,
          airline: `${airlineName} (${airlineCode}-${flightNumber})`,
          airlineCode,
          flightNumber,
          route: `${originCity} [${originCode}] → ${destCity} [${destCode}]`,
          departureAirport: `${originCity} (${originCode})${originTerminal}`,
          departureTime: formatDateTime(seg.DepTime),
          arrivalAirport: `${destCity} (${destCode})${destTerminal}`,
          arrivalTime: formatDateTime(seg.ArrTime),
          duration: formatDuration(seg.Duration),
          cabinClass: seg.CabinClass || 'Economy',
          checkInBaggage: seg.Baggage || (isLCC ? '15 Kg' : '20-25 Kg per airline'),
          cabinBaggage: seg.CabinBaggage || '7 Kg',
        });
      });
    } else {
      // Fallback single route display if segments not populated in snapshot
      segments.push({
        segmentIndex: 1,
        airline: isLCC ? 'LCC Carrier' : 'Scheduled Airline',
        route: `${booking.eTicketData?.Origin || booking.fareSnapshot?.Origin || booking.origin || 'Origin'} → ${booking.eTicketData?.Destination || booking.fareSnapshot?.Destination || booking.destination || 'Destination'}`,
        departureAirport: booking.eTicketData?.Origin || booking.fareSnapshot?.Origin || booking.origin || 'Departure City',
        departureTime: formatDateTime(booking.createdAt),
        arrivalAirport: booking.eTicketData?.Destination || booking.fareSnapshot?.Destination || booking.destination || 'Arrival City',
        arrivalTime: 'Per schedule',
        duration: 'Direct',
        cabinClass: 'Economy',
        checkInBaggage: isLCC ? '15 Kg' : 'Standard allowance',
        cabinBaggage: '7 Kg',
      });
    }

    // 6. Financial Fare breakdown
    const fareObj = booking.eTicketData?.Fare || booking.fareSnapshot?.Fare || booking.fareSnapshot || {};
    const currency = fareObj.Currency || 'INR';

    const baseFare = Number(fareObj.BaseFare || 0);
    const tax = Number(fareObj.Tax || 0);
    const yqTax = Number(fareObj.YQTax || 0);
    const airlineTaxes = tax + yqTax;

    const baggageCharges = Number(fareObj.TotalBaggageCharges || 0);
    const mealCharges = Number(fareObj.TotalMealCharges || 0);
    const seatCharges = Number(fareObj.TotalSeatCharges || 0);
    const ancillaryCharges = baggageCharges + mealCharges + seatCharges;

    const markupAmount = Number(booking.markupAmount || 0);
    const totalAmount = Number(booking.totalAmount || (baseFare + airlineTaxes + ancillaryCharges + markupAmount));

    // Calculate GST tax component (18% on agency convenience/markup)
    let serviceTaxCgst = 0;
    let serviceTaxSgst = 0;
    let serviceTaxIgst = 0;
    const isInterstate = false; // Configurable per state GSTIN

    if (markupAmount > 0) {
      if (isInterstate) {
        serviceTaxIgst = Number((markupAmount * 0.18).toFixed(2));
      } else {
        serviceTaxCgst = Number((markupAmount * 0.09).toFixed(2));
        serviceTaxSgst = Number((markupAmount * 0.09).toFixed(2));
      }
    }

    // 7. Customer & GST information
    const customer = booking.user || {};
    const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
      customer.name ||
      passengers[0]?.name ||
      'Valued Customer';

    const gstDetails = booking.gstDetails || {};
    const hasCorporateGst = Boolean(gstDetails.wantsInvoice && gstDetails.gstNumber);

    // 8. Payment information
    const payment = booking.paymentId || {};
    const paymentGateway = payment.paymentMethod || booking.paymentOrderId?.split('_')[0] || 'Online Payment';
    const paymentTxnId = payment.gatewayData?.orderId ||
      payment.gatewayData?.captureId ||
      booking.paymentOrderId ||
      'TXN-' + refSuffix;

    const isDomestic = booking.eTicketData?.IsDomestic === true || booking.eTicketData?.IsDomestic === 'true';
    const applicableSacCode = isDomestic ? AGENCY_CONFIG.sacDomestic : AGENCY_CONFIG.sacInternational;

    return {
      invoiceNumber,
      supplierInvoiceNumber: supplierInvoiceNo,
      invoiceDate: formatDateTime(booking.createdAt),
      bookingReference: String(booking.srdvBookingId || booking._id),
      bookingStatus: (booking.status || 'confirmed').toUpperCase(),
      serviceType,
      serviceTypeBadge,
      isLCC,
      airlinePnr: booking.pnr || 'PENDING',
      gdsPnr: !isLCC ? (booking.gdsPnr || booking.pnr || 'N/A') : null,
      placeOfSupply: gstDetails.companyAddress || 'Delhi (07)',

      // Agency details
      agency: {
        ...AGENCY_CONFIG,
        sacCode: applicableSacCode,
      },

      // Customer & GST details
      customer: {
        name: customerName,
        email: customer.email || 'N/A',
        phone: customer.phone || 'N/A',
        hasCorporateGst,
        companyName: gstDetails.companyName || null,
        gstNumber: gstDetails.gstNumber || null,
        companyAddress: gstDetails.companyAddress || null,
        companyEmail: gstDetails.companyEmail || null,
        companyContactNumber: gstDetails.companyContactNumber || null,
      },

      // Journey & Passengers
      segments,
      passengers,

      // Financials
      pricing: {
        currency,
        baseFare: formatAmount(baseFare),
        taxAmount: formatAmount(airlineTaxes),
        ancillaryCharges: ancillaryCharges > 0 ? formatAmount(ancillaryCharges) : null,
        baggageCharges: baggageCharges > 0 ? formatAmount(baggageCharges) : null,
        mealCharges: mealCharges > 0 ? formatAmount(mealCharges) : null,
        seatCharges: seatCharges > 0 ? formatAmount(seatCharges) : null,
        serviceFee: formatAmount(markupAmount),
        cgst: serviceTaxCgst > 0 ? formatAmount(serviceTaxCgst) : null,
        sgst: serviceTaxSgst > 0 ? formatAmount(serviceTaxSgst) : null,
        igst: serviceTaxIgst > 0 ? formatAmount(serviceTaxIgst) : null,
        totalAmount: formatAmount(totalAmount),
        raw: {
          baseFare,
          airlineTaxes,
          ancillaryCharges,
          markupAmount,
          totalAmount,
        },
      },

      // Payment details
      payment: {
        method: paymentGateway.toUpperCase(),
        transactionId: paymentTxnId,
        status: (payment.status || (booking.status === 'confirmed' ? 'PAID' : 'PENDING')).toUpperCase(),
      },
    };
  }

  /**
   * Render invoice HTML string by interpolating normalized data into the HTML template.
   *
   * @param {Object} data - Normalized invoice data from getInvoiceData()
   * @returns {string} Rendered HTML
   */
  renderInvoiceHtml(data, rawToken = '') {
    const templatePath = path.join(__dirname, 'templates', 'flight-invoice.html');
    let template = fs.readFileSync(templatePath, 'utf8');

    // 1. Build GDS PNR row (only shown if GDS)
    const gdsPnrRow = data.gdsPnr
      ? `<div class="detail-row">
          <span class="detail-label">GDS PNR:</span>
          <span class="detail-val highlight-mono">${data.gdsPnr}</span>
        </div>`
      : '';

    // 2. Build Supplier Invoice Row (if SRDV provides it)
    const supplierInvoiceRow = data.supplierInvoiceNumber
      ? `<div class="detail-row">
          <span class="detail-label">Supplier Invoice:</span>
          <span class="detail-val">${data.supplierInvoiceNumber}</span>
        </div>`
      : '';

    // 3. Build Corporate GST Block
    let corporateGstBlock = '';
    if (data.customer.hasCorporateGst) {
      corporateGstBlock = `
        <div class="detail-row" style="margin-top: 6px; border-top: 1px dashed #e2e8f0; padding-top: 6px;">
          <span class="detail-label">Company:</span>
          <span class="detail-val"><strong>${data.customer.companyName || 'N/A'}</strong></span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Buyer GSTIN:</span>
          <span class="detail-val highlight-mono">${data.customer.gstNumber || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Company Address:</span>
          <span class="detail-val" style="max-width: 200px;">${data.customer.companyAddress || 'N/A'}</span>
        </div>
      `;
    }

    // 4. Build Segments Rows HTML
    const segmentsRows = data.segments
      .map(
        (seg) => `
        <tr>
          <td>
            <strong>${seg.airline}</strong><br>
            <span style="color: var(--slate-500); font-size: 11px;">${seg.route}</span>
          </td>
          <td>
            <strong>${seg.departureAirport}</strong><br>
            <span style="color: var(--slate-600);">${seg.departureTime}</span>
          </td>
          <td>
            <strong>${seg.arrivalAirport}</strong><br>
            <span style="color: var(--slate-600);">${seg.arrivalTime}</span>
          </td>
          <td>
            ${seg.duration}<br>
            <span style="color: var(--slate-500); font-size: 11px;">Class: ${seg.cabinClass}</span>
          </td>
          <td>
            Check-in: <strong>${seg.checkInBaggage}</strong><br>
            Cabin: ${seg.cabinBaggage}
          </td>
        </tr>
      `
      )
      .join('');

    // 5. Build Passengers Rows HTML
    const passengersRows = data.passengers
      .map(
        (pax) => `
        <tr>
          <td>${pax.index}</td>
          <td><strong>${pax.name}</strong></td>
          <td><span class="badge" style="background: #f1f5f9; color: #475569;">${pax.paxType}</span></td>
          <td><span class="highlight-mono">${pax.ticketNumber}</span></td>
          <td>
            <span class="badge badge-status-confirmed">${pax.ticketStatus}</span>
          </td>
        </tr>
      `
      )
      .join('');

    // 6. Build Ancillary & GST Rows in Fare Box
    let ancillaryChargesRow = '';
    if (data.pricing.ancillaryCharges) {
      ancillaryChargesRow = `
        <tr>
          <td>Ancillary Services (Baggage / Meals / Seats):</td>
          <td>${data.pricing.currency} ${data.pricing.ancillaryCharges}</td>
        </tr>
      `;
    }

    let gstTaxRows = '';
    if (data.pricing.cgst && data.pricing.sgst) {
      gstTaxRows = `
        <tr>
          <td>CGST @ 9%:</td>
          <td>${data.pricing.currency} ${data.pricing.cgst}</td>
        </tr>
        <tr>
          <td>SGST @ 9%:</td>
          <td>${data.pricing.currency} ${data.pricing.sgst}</td>
        </tr>
      `;
    } else if (data.pricing.igst) {
      gstTaxRows = `
        <tr>
          <td>IGST @ 18%:</td>
          <td>${data.pricing.currency} ${data.pricing.igst}</td>
        </tr>
      `;
    }

    // Status class
    const statusBadgeClass =
      data.bookingStatus === 'CONFIRMED' || data.bookingStatus === 'PAID'
        ? 'badge-status-confirmed'
        : 'badge-status-pending';

    // 7. Replace all template tokens
    const replacements = {
      '{{invoiceNumber}}': data.invoiceNumber,
      '{{bookingReference}}': data.bookingReference,
      '{{rawToken}}': rawToken || '',
      '{{bookingStatus}}': data.bookingStatus,
      '{{statusBadgeClass}}': statusBadgeClass,
      '{{serviceTypeBadge}}': data.serviceTypeBadge,
      '{{invoiceDate}}': data.invoiceDate,
      '{{placeOfSupply}}': data.placeOfSupply,
      '{{airlinePnr}}': data.airlinePnr,
      '{{gdsPnrRow}}': gdsPnrRow,
      '{{supplierInvoiceRow}}': supplierInvoiceRow,
      '{{customerName}}': data.customer.name,
      '{{customerEmail}}': data.customer.email,
      '{{customerPhone}}': data.customer.phone,
      '{{corporateGstBlock}}': corporateGstBlock,
      '{{agencyAddress}}': data.agency.address,
      '{{agencyGst}}': data.agency.gstin,
      '{{agencyPan}}': data.agency.pan,
      '{{sacCode}}': data.agency.sacCode,
      '{{agencyEmail}}': data.agency.email,
      '{{agencyPhone}}': data.agency.phone,
      '{{segmentsRows}}': segmentsRows,
      '{{passengersRows}}': passengersRows,
      '{{currency}}': data.pricing.currency,
      '{{baseFare}}': data.pricing.baseFare,
      '{{taxAmount}}': data.pricing.taxAmount,
      '{{ancillaryChargesRow}}': ancillaryChargesRow,
      '{{serviceFee}}': data.pricing.serviceFee,
      '{{gstTaxRows}}': gstTaxRows,
      '{{totalAmount}}': data.pricing.totalAmount,
      '{{paymentGateway}}': data.payment.method,
      '{{paymentTransactionId}}': data.payment.transactionId,
      '{{paymentStatus}}': data.payment.status,
    };

    Object.entries(replacements).forEach(([key, val]) => {
      template = template.replaceAll(key, val || '');
    });

    return template;
  }

  /**
   * Helper to retrieve and render HTML directly
   */
  async getInvoiceHtml(bookingId, currentUser = null, rawToken = '') {
    const data = await this.getInvoiceData(bookingId, currentUser);
    return this.renderInvoiceHtml(data, rawToken);
  }

  /**
   * Fetch and normalize hotel booking data into standard invoice payload.
   * Works on existing HotelBooking, User, and Payment records without schema alterations.
   *
   * @param {string} bookingId - HotelBooking _id, providerBookingId, bookingRefNo, or confirmationNo
   * @param {Object} currentUser - req.user object for access control
   * @returns {Promise<Object>} Normalized hotel invoice JSON data
   */
  async getHotelInvoiceData(bookingId, currentUser = null) {
    if (!bookingId) {
      throw new AppError('Booking reference or ID is required', 400);
    }

    // 1. Locate the booking using existing identifiers
    let query = {};
    if (typeof bookingId === 'string' && bookingId.match(/^[0-9a-fA-F]{24}$/)) {
      query = { _id: bookingId };
    } else if (!isNaN(Number(bookingId))) {
      query = {
        $or: [
          { providerBookingId: String(bookingId) },
          { bookingRefNo: String(bookingId) },
          { confirmationNo: String(bookingId) },
          { srdvHotelId: String(bookingId) },
        ],
      };
    } else {
      query = {
        $or: [
          { confirmationNo: bookingId },
          { bookingRefNo: bookingId },
          { providerBookingId: bookingId },
          { invoiceNumber: bookingId },
          { recheckId: bookingId },
        ],
      };
    }

    const booking = await HotelBooking.findOne(query)
      .populate('userId', 'firstName lastName name email phone')
      .populate('paymentId')
      .lean();

    if (!booking) {
      return await this.getInHouseHotelInvoiceData(bookingId, currentUser);
    }

    // 2. Authorization check (Customers can only view their own bookings)
    if (currentUser && currentUser.role === 'customer') {
      const bookingUserId = booking.userId?._id?.toString() || booking.userId?.toString();
      const currentUserId = currentUser.id?.toString() || currentUser._id?.toString();
      if (bookingUserId && currentUserId && bookingUserId !== currentUserId) {
        throw new AppError('Unauthorized: You can only view invoices for your own bookings', 403);
      }
    }

    // 3. Stay dates & Duration
    const checkInDate = booking.checkIn ? new Date(booking.checkIn) : null;
    const checkOutDate = booking.checkOut ? new Date(booking.checkOut) : null;
    let nights = Number(booking.priceSnapshot?.nights);
    if (!nights || isNaN(nights)) {
      if (checkInDate && checkOutDate) {
        const diffMs = checkOutDate.getTime() - checkInDate.getTime();
        nights = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      } else {
        nights = 1;
      }
    }

    // 4. Deterministic invoice numbering (e.g. MT-INV-HTL-202610-CONF123)
    const bookingDate = new Date(booking.createdAt || Date.now());
    const yearMonth = `${bookingDate.getFullYear()}${String(bookingDate.getMonth() + 1).padStart(2, '0')}`;
    const rawRef = booking.confirmationNo || booking.bookingRefNo || booking.providerBookingId || booking._id.toString().slice(-6);
    const refSuffix = String(rawRef).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const invoiceNumber = `MT-INV-HTL-${yearMonth}-${refSuffix}`;

    const supplierInvoiceNo = booking.invoiceNumber || null;

    // 5. Property snapshot extraction
    const hotelSnapshot = booking.hotelSnapshot || {};
    const hotelName = hotelSnapshot.name || booking.hotelName || 'Hotel Accommodation';
    const hotelAddress = hotelSnapshot.address || booking.destination || 'Address on file';
    const city = hotelSnapshot.city || '';
    const state = hotelSnapshot.state || '';
    const country = hotelSnapshot.country || '';
    const pinCode = hotelSnapshot.pinCode || '';
    const locationParts = [city, state, country].filter(Boolean).join(', ') || booking.destination || 'Global';
    const starRating = Number(hotelSnapshot.rating || hotelSnapshot.starRating || 0);
    const starDisplay = starRating > 0 ? '★'.repeat(Math.min(starRating, 5)) : 'Standard Rating';
    const hotelCategory = hotelSnapshot.category || (starRating > 0 ? `${starRating}-Star Hotel` : 'Premium Stay');
    const propertyContact = hotelSnapshot.contactNo || '24/7 Hotel Reception Desk';

    // 6. Rooms extraction
    const rawRooms = Array.isArray(booking.roomSnapshots) && booking.roomSnapshots.length > 0
      ? booking.roomSnapshots
      : [];

    const currency = booking.currency || booking.priceSnapshot?.currency || 'INR';
    const rooms = [];

    if (rawRooms.length > 0) {
      rawRooms.forEach((rm, idx) => {
        const perNight = Number(rm.price || (rm.totalPrice ? rm.totalPrice / nights : 0));
        const totalRoom = Number(rm.totalPrice || perNight * nights);
        rooms.push({
          index: idx + 1,
          name: rm.name || 'Standard Room',
          mealPlan: rm.board || 'Room Only',
          capacity: rm.capacity || 2,
          pricePerNight: formatAmount(perNight),
          totalPrice: formatAmount(totalRoom),
          refundable: rm.refundable ? 'Refundable' : 'Non-Refundable',
          cancellationPolicy: rm.cancellationPolicy || 'Standard cancellation policy applies.',
        });
      });
    } else {
      rooms.push({
        index: 1,
        name: 'Standard Room',
        mealPlan: 'Room Only',
        capacity: 2,
        pricePerNight: formatAmount(booking.totalPrice / nights),
        totalPrice: formatAmount(booking.totalPrice),
        refundable: 'Standard Terms',
        cancellationPolicy: 'Standard cancellation policy applies.',
      });
    }

    // 7. Guests extraction
    const rawGuests = Array.isArray(booking.guests) && booking.guests.length > 0
      ? booking.guests
      : [];
    const guests = [];

    if (rawGuests.length > 0) {
      rawGuests.forEach((g, idx) => {
        const fullName = `${g.title || ''} ${g.firstName || ''} ${g.lastName || ''}`.trim() || `Guest ${idx + 1}`;
        guests.push({
          index: idx + 1,
          name: fullName,
          type: g.type === 'child' ? 'Child' : 'Adult',
          age: g.age ? String(g.age) : 'N/A',
          isLead: Boolean(g.leadPassenger || idx === 0),
          phone: g.phone || 'N/A',
          email: g.email || 'N/A',
          passportNo: g.passportNo || null,
          pan: g.pan || null,
        });
      });
    } else {
      const u = booking.userId || {};
      const uName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'Valued Guest';
      guests.push({
        index: 1,
        name: uName,
        type: 'Adult',
        age: 'N/A',
        isLead: true,
        phone: u.phone || 'N/A',
        email: u.email || 'N/A',
        passportNo: null,
        pan: null,
      });
    }

    // 8. Financials & GST calculation
    const totalPaid = Number(booking.totalPrice || (booking.customerTotalMinor ? booking.customerTotalMinor / 100 : 0));
    const supplierCost = Number(
      booking.supplierAmountMinor
        ? booking.supplierAmountMinor / 100
        : (booking.priceSnapshot?.supplierAmountMinor ? booking.priceSnapshot.supplierAmountMinor / 100 : 0)
    );
    const markupAmount = Number(
      booking.markupMinor
        ? booking.markupMinor / 100
        : (booking.priceSnapshot?.markupMinor ? booking.priceSnapshot.markupMinor / 100 : 0)
    );
    const feeAmount = Number(
      booking.feeMinor
        ? booking.feeMinor / 100
        : (booking.priceSnapshot?.feeMinor ? booking.priceSnapshot.feeMinor / 100 : 0)
    );
    const serviceFee = markupAmount + feeAmount;
    const roomCharges = supplierCost > 0 ? supplierCost : Math.max(0, totalPaid - serviceFee);

    // 18% GST on agency markup + service fee
    let serviceTaxCgst = 0;
    let serviceTaxSgst = 0;
    let serviceTaxIgst = 0;
    const isInterstate = false;

    if (serviceFee > 0) {
      if (isInterstate) {
        serviceTaxIgst = Number((serviceFee * 0.18).toFixed(2));
      } else {
        serviceTaxCgst = Number((serviceFee * 0.09).toFixed(2));
        serviceTaxSgst = Number((serviceFee * 0.09).toFixed(2));
      }
    }

    // 9. Customer Details
    const customer = booking.userId || {};
    const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
      customer.name ||
      guests[0]?.name ||
      'Valued Guest';

    // 10. Payment details
    const payment = booking.paymentId || {};
    const paymentGateway = payment.paymentMethod || 'Online Payment';
    const paymentTxnId = payment.gatewayData?.orderId ||
      payment.gatewayData?.captureId ||
      payment._id?.toString() ||
      'TXN-' + refSuffix;

    const applicableSacCode = AGENCY_CONFIG.sacTravelService;

    // Cancellation policy snippet
    let cancellationPolicyText = 'Standard cancellation and reservation policies apply.';
    if (booking.cancellationPolicySnapshot) {
      if (typeof booking.cancellationPolicySnapshot === 'string') {
        cancellationPolicyText = booking.cancellationPolicySnapshot;
      } else if (Array.isArray(booking.cancellationPolicySnapshot)) {
        cancellationPolicyText = booking.cancellationPolicySnapshot.filter(Boolean).join(' | ');
      } else if (typeof booking.cancellationPolicySnapshot === 'object') {
        cancellationPolicyText = JSON.stringify(booking.cancellationPolicySnapshot);
      }
    }

    return {
      invoiceNumber,
      supplierInvoiceNumber: supplierInvoiceNo,
      invoiceDate: formatDateTime(booking.createdAt),
      bookingReference: String(booking.bookingRefNo || booking._id),
      confirmationNo: booking.confirmationNo || 'CONF-PENDING',
      providerBookingId: booking.providerBookingId ? String(booking.providerBookingId) : null,
      bookingStatus: (booking.status || 'confirmed').toUpperCase(),
      serviceType: 'HOTEL',
      serviceTypeBadge: 'Hotel Accommodation',
      placeOfSupply: city ? `${city} (${country})` : 'Delhi (07)',

      // Agency details
      agency: {
        ...AGENCY_CONFIG,
        sacCode: applicableSacCode,
      },

      // Hotel property
      hotel: {
        name: hotelName,
        address: hotelAddress,
        city,
        state,
        country,
        pinCode,
        destination: locationParts,
        starRating,
        starDisplay,
        category: hotelCategory,
        contactNo: propertyContact,
      },

      // Stay details
      stay: {
        checkIn: formatDate(booking.checkIn),
        checkInRaw: booking.checkIn,
        checkOut: formatDate(booking.checkOut),
        checkOutRaw: booking.checkOut,
        nights,
        roomsCount: rooms.length,
        guestsCount: guests.length,
        cancellationPolicyText,
      },

      // Customer
      customer: {
        name: customerName,
        email: customer.email || 'N/A',
        phone: customer.phone || 'N/A',
      },

      // Rooms & Guests
      rooms,
      guests,

      // Financials
      pricing: {
        currency,
        roomCharges: formatAmount(roomCharges),
        serviceFee: formatAmount(serviceFee),
        cgst: serviceTaxCgst > 0 ? formatAmount(serviceTaxCgst) : null,
        sgst: serviceTaxSgst > 0 ? formatAmount(serviceTaxSgst) : null,
        igst: serviceTaxIgst > 0 ? formatAmount(serviceTaxIgst) : null,
        totalAmount: formatAmount(totalPaid),
        raw: {
          roomCharges,
          serviceFee,
          totalPaid,
          cgst: serviceTaxCgst,
          sgst: serviceTaxSgst,
          igst: serviceTaxIgst,
        },
      },

      // Payment
      payment: {
        method: String(paymentGateway).toUpperCase(),
        transactionId: paymentTxnId,
        status: (payment.status || (booking.status === 'confirmed' ? 'PAID' : 'PENDING')).toUpperCase(),
      },
    };
  }

  /**
   * Render hotel invoice HTML string by interpolating normalized data into the HTML template.
   *
   * @param {Object} data - Normalized invoice data from getHotelInvoiceData()
   * @returns {string} Rendered HTML
   */
  renderHotelInvoiceHtml(data) {
    const templatePath = path.join(__dirname, 'templates', 'hotel-invoice.html');
    let template = fs.readFileSync(templatePath, 'utf8');

    // 1. Supplier Booking ID Row
    const supplierBookingIdRow = data.providerBookingId
      ? `<div class="detail-row">
          <span class="detail-label">Supplier Booking ID:</span>
          <span class="detail-val highlight-mono">${data.providerBookingId}</span>
        </div>`
      : '';

    // 2. Supplier Invoice Row
    const supplierInvoiceRow = data.supplierInvoiceNumber
      ? `<div class="detail-row">
          <span class="detail-label">Supplier Invoice:</span>
          <span class="detail-val">${data.supplierInvoiceNumber}</span>
        </div>`
      : '';

    // 3. Corporate GST Block (placeholder / clean fallback)
    const corporateGstBlock = '';

    // 4. Room Rows
    const roomsRows = data.rooms
      .map(
        (rm) => `
        <tr>
          <td>${rm.index}</td>
          <td><strong>${rm.name}</strong></td>
          <td><span style="color: var(--primary-dark); font-weight: 600;">${rm.mealPlan}</span></td>
          <td>${rm.capacity} Guests</td>
          <td>${data.pricing.currency} ${rm.pricePerNight}</td>
          <td><strong>${data.pricing.currency} ${rm.totalPrice}</strong></td>
          <td><span class="badge ${rm.refundable === 'Refundable' ? 'badge-status-confirmed' : 'badge-status-pending'}">${rm.refundable}</span></td>
        </tr>`
      )
      .join('');

    // 5. Guest Rows
    const guestsRows = data.guests
      .map(
        (g) => `
        <tr>
          <td>${g.index}</td>
          <td><strong>${g.name}</strong></td>
          <td>${g.type}</td>
          <td>${g.isLead ? '<span class="badge badge-status-confirmed">Lead Guest</span>' : 'Guest'}</td>
          <td>${g.phone}</td>
          <td>${g.passportNo || g.pan || 'N/A'}</td>
        </tr>`
      )
      .join('');

    // 6. Tax Rows
    let gstTaxRows = '';
    if (data.pricing.cgst && data.pricing.sgst) {
      gstTaxRows = `
        <tr>
          <td>CGST on Service Fee (9%):</td>
          <td>${data.pricing.currency} ${data.pricing.cgst}</td>
        </tr>
        <tr>
          <td>SGST on Service Fee (9%):</td>
          <td>${data.pricing.currency} ${data.pricing.sgst}</td>
        </tr>`;
    } else if (data.pricing.igst) {
      gstTaxRows = `
        <tr>
          <td>IGST on Service Fee (18%):</td>
          <td>${data.pricing.currency} ${data.pricing.igst}</td>
        </tr>`;
    }

    // 7. Cancellation Policy Box
    const cancellationPolicyBlock = data.stay.cancellationPolicyText
      ? `<div class="policy-box">
          <strong>Important Stay &amp; Cancellation Policy:</strong><br>
          ${data.stay.cancellationPolicyText}
        </div>`
      : '';

    // 8. Status Badge Class
    const statusBadgeClass =
      data.bookingStatus === 'CONFIRMED' || data.bookingStatus === 'COMPLETED'
        ? 'badge-status-confirmed'
        : 'badge-status-pending';

    // 9. Replacements
    const replacements = {
      '{{invoiceNumber}}': data.invoiceNumber,
      '{{confirmationNo}}': data.confirmationNo,
      '{{bookingReference}}': data.bookingReference,
      '{{supplierBookingIdRow}}': supplierBookingIdRow,
      '{{supplierInvoiceRow}}': supplierInvoiceRow,
      '{{bookingStatus}}': data.bookingStatus,
      '{{statusBadgeClass}}': statusBadgeClass,
      '{{serviceTypeBadge}}': data.serviceTypeBadge,
      '{{invoiceDate}}': data.invoiceDate,
      '{{placeOfSupply}}': data.placeOfSupply,
      '{{customerName}}': data.customer.name,
      '{{customerEmail}}': data.customer.email,
      '{{customerPhone}}': data.customer.phone,
      '{{corporateGstBlock}}': corporateGstBlock,
      '{{agencyAddress}}': data.agency.address,
      '{{agencyGst}}': data.agency.gstin,
      '{{agencyPan}}': data.agency.pan,
      '{{sacCode}}': data.agency.sacCode,
      '{{agencyEmail}}': data.agency.email,
      '{{agencyPhone}}': data.agency.phone,
      '{{hotelName}}': data.hotel.name,
      '{{starRatingDisplay}}': data.hotel.starDisplay,
      '{{hotelAddress}}': data.hotel.address,
      '{{destination}}': data.hotel.destination,
      '{{propertyContact}}': data.hotel.contactNo,
      '{{hotelCategory}}': data.hotel.category,
      '{{checkInDate}}': data.stay.checkIn,
      '{{checkOutDate}}': data.stay.checkOut,
      '{{nightsCount}}': String(data.stay.nights),
      '{{roomsCount}}': String(data.stay.roomsCount),
      '{{guestsCount}}': String(data.stay.guestsCount),
      '{{roomsRows}}': roomsRows,
      '{{guestsRows}}': guestsRows,
      '{{currency}}': data.pricing.currency,
      '{{roomCharges}}': data.pricing.roomCharges,
      '{{serviceFee}}': data.pricing.serviceFee,
      '{{gstTaxRows}}': gstTaxRows,
      '{{totalAmount}}': data.pricing.totalAmount,
      '{{cancellationPolicyBlock}}': cancellationPolicyBlock,
      '{{paymentGateway}}': data.payment.method,
      '{{paymentTransactionId}}': data.payment.transactionId,
      '{{paymentStatus}}': data.payment.status,
    };

    Object.entries(replacements).forEach(([key, val]) => {
      template = template.replaceAll(key, val || '');
    });

    return template;
  }

  /**
   * Helper to retrieve and render Hotel HTML directly
   */
  async getHotelInvoiceHtml(bookingId, currentUser = null) {
    const data = await this.getHotelInvoiceData(bookingId, currentUser);
    return this.renderHotelInvoiceHtml(data);
  }

  /**
   * Fetch and normalize Package booking data into standardized invoice payload.
   *
   * @param {string} bookingId - PackageBooking _id or transaction ref
   * @param {Object} currentUser - req.user object for access control
   * @returns {Promise<Object>} Normalized invoice JSON data
   */
  async getPackageInvoiceData(bookingId, currentUser = null) {
    if (!bookingId) {
      throw new AppError('Booking reference or ID is required', 400);
    }
    const cleanId = String(bookingId).trim();
    let query = {};
    if (cleanId.match(/^[0-9a-fA-F]{24}$/)) {
      query = { _id: cleanId };
    } else {
      query = {
        $or: [
          { razorpayPaymentId: cleanId },
          { razorpayOrderId: cleanId },
          { bookingReference: cleanId },
          { orderId: cleanId },
        ],
      };
    }

    const booking = await PackageBooking.findOne(query)
      .populate('userId', 'firstName lastName name email phone')
      .populate('travellers.travellerId')
      .populate('packageId')
      .populate('assignedTo', 'firstName lastName name email phone')
      .lean();

    if (!booking) {
      throw new AppError(`Package booking not found for reference: ${bookingId}`, 404);
    }

    // Authorization check (Customers can only view their own bookings)
    if (currentUser && currentUser.role === 'customer') {
      const bookingUserId = booking.userId?._id?.toString() || booking.userId?.toString();
      const currentUserId = currentUser.id?.toString() || currentUser._id?.toString();
      if (bookingUserId && currentUserId && bookingUserId !== currentUserId) {
        throw new AppError('Unauthorized: You can only view invoices for your own bookings', 403);
      }
    }

    // Deterministic invoice numbering (e.g. MT-INV-PKG-202610-A1B2C3)
    const bookingDate = new Date(booking.createdAt || Date.now());
    const yearMonth = `${bookingDate.getFullYear()}${String(bookingDate.getMonth() + 1).padStart(2, '0')}`;
    const refSuffix = (booking._id.toString().slice(-6)).toUpperCase();
    const invoiceNumber = `MT-INV-PKG-${yearMonth}-${refSuffix}`;
    const bookingReference = `BK-PKG-${refSuffix}`;

    // Package details & snapshots
    const pkgSnapshot = booking.packageSnapshot || {};
    const pkgDoc = booking.packageId || {};
    const packageTitle = pkgSnapshot.title || pkgDoc.title || 'Umrah Tour Package';
    const destination = pkgSnapshot.destination || pkgDoc.destination || 'Holy Makkah & Madinah';
    const inclusions = pkgSnapshot.inclusions || pkgDoc.inclusions || ['Hotel Accommodation', 'Flight Tickets', 'Airport Transfers', 'Ziyarat Tours'];

    // Travel dates & duration
    const startDate = booking.travelDates?.startDate || (pkgSnapshot.validity?.from ? new Date(pkgSnapshot.validity.from) : null);
    const endDate = booking.travelDates?.endDate || (pkgSnapshot.validity?.to ? new Date(pkgSnapshot.validity.to) : null);
    let durationText = '10 Nights / 11 Days';
    if (startDate && endDate) {
      const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime();
      const nights = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      durationText = `${nights} Night(s) / ${nights + 1} Day(s)`;
    } else if (Array.isArray(pkgSnapshot.itinerary) && pkgSnapshot.itinerary.length > 0) {
      durationText = `${pkgSnapshot.itinerary.length} Day(s)`;
    }

    // Travellers & Lead Passenger
    const travellers = (booking.travellers || []).map((t, idx) => {
      const p = t.travellerId || {};
      const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim() || `Pilgrim ${idx + 1}`;
      return {
        index: idx + 1,
        name: fullName,
        paxType: p.passengerType || 'Adult',
        gender: p.gender || 'N/A',
        isLead: Boolean(t.isLead),
        passportNo: p.passport?.number || 'N/A',
        nationality: p.nationality || 'Indian',
      };
    });

    const leadTraveller = travellers.find((t) => t.isLead) || travellers[0] || null;
    const leadPassengerName = leadTraveller ? leadTraveller.name : (booking.userId?.name || 'Valued Pilgrim');

    // Tour Guide Add-on
    const guideSelected = Boolean(booking.guideSelected || pkgSnapshot.guideSelected || (booking.guidePrice && booking.guidePrice > 0));
    const guidePrice = Number(booking.guidePrice || pkgSnapshot.guidePrice || 0);
    const guideLocations = Array.isArray(booking.guideLocation)
      ? booking.guideLocation.filter(Boolean).join(', ')
      : (booking.guideLocation || pkgSnapshot.guideLocation || 'Holy Makkah & Madinah');

    // Financials & Personal GST Tax
    const totalPaid = Number(booking.totalAmount || 0);
    const currency = 'INR';
    const basePackageFare = Math.max(0, totalPaid - guidePrice);

    // Fetch personal GST from CRM settings
    let agencyPersonalGst = 0;
    try {
      const gstSettings = await settingsService.getAgencyGstSettings();
      agencyPersonalGst = Number(gstSettings.agencyPersonalGst || 0);
    } catch (e) {
      agencyPersonalGst = 0;
    }

    const personalGstAmount = agencyPersonalGst > 0
      ? Number((totalPaid * (agencyPersonalGst / 100)).toFixed(2))
      : 0;

    // Payment Details
    const paymentGateway = booking.razorpayPaymentId ? 'RAZORPAY' : 'ONLINE PAYMENT';
    const paymentTransactionId = booking.razorpayPaymentId || `TXN-PKG-${refSuffix}`;
    const paymentStatus = String(booking.status).toUpperCase() === 'CONFIRMED' ? 'PAID' : String(booking.status || 'PENDING').toUpperCase();

    // Assigned Agent
    const assignedAgent = booking.assignedTo
      ? `${booking.assignedTo.firstName || ''} ${booking.assignedTo.lastName || ''}`.trim() || booking.assignedTo.email || 'Maqam Operations Team'
      : 'Maqam Concierge Desk';

    return {
      invoiceNumber,
      bookingReference,
      bookingDate: formatDateTime(booking.createdAt),
      invoiceDate: formatDateTime(booking.updatedAt || booking.createdAt),
      bookingStatus: String(booking.status || 'CONFIRMED').toUpperCase(),
      serviceType: 'PACKAGE',
      packageTitle,
      destination,
      quantity: booking.quantity || travellers.length || 1,
      travelDates: {
        startDate: startDate ? formatDate(startDate) : 'Open Schedule',
        endDate: endDate ? formatDate(endDate) : 'Open Schedule',
        durationText,
      },
      customer: {
        name: booking.userId?.name || `${booking.userId?.firstName || ''} ${booking.userId?.lastName || ''}`.trim() || 'Valued Pilgrim',
        email: booking.contactDetails?.email || booking.userId?.email || 'N/A',
        phone: booking.contactDetails?.phone || booking.userId?.phone || 'N/A',
        leadPassengerName,
      },
      assignedAgent,
      inclusions,
      guide: {
        isSelected: guideSelected,
        location: guideLocations,
        price: guidePrice > 0 ? formatAmount(guidePrice) : '0.00',
      },
      travellers,
      pricing: {
        currency,
        basePackageFare: formatAmount(basePackageFare),
        guideFee: guidePrice > 0 ? formatAmount(guidePrice) : null,
        personalGstRate: agencyPersonalGst,
        personalGstAmount: personalGstAmount > 0 ? formatAmount(personalGstAmount) : null,
        totalAmount: formatAmount(totalPaid),
      },
      payment: {
        method: paymentGateway,
        transactionId: paymentTransactionId,
        status: paymentStatus,
      },
      agency: {
        ...AGENCY_CONFIG,
        sacCode: AGENCY_CONFIG.sacTravelService, // 998555
      },
    };
  }

  /**
   * Render Package invoice as an executive HTML document
   *
   * @param {Object} data - Normalized package invoice payload
   * @param {string} rawToken - Optional token for print/download buttons
   * @returns {string} Rendered HTML string
   */
  renderPackageInvoiceHtml(data, rawToken = '') {
    const templatePath = path.join(__dirname, 'templates', 'package-invoice.html');
    let template = fs.readFileSync(templatePath, 'utf8');

    // Status badge class
    const statusBadgeClass = data.bookingStatus === 'CONFIRMED'
      ? 'badge-status-confirmed'
      : 'badge-status-pending';

    // Inclusions tags
    const inclusionsTags = (data.inclusions || [])
      .map((item) => `<span class="inclusion-tag">✓ ${item}</span>`)
      .join(' ');

    // Tour guide addon card (if selected)
    let guideAddonCard = '';
    if (data.guide.isSelected) {
      guideAddonCard = `
        <div style="background: var(--purple-50); border: 1px solid rgba(124, 58, 237, 0.2); border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: var(--purple-600);">🕌 Certified Tour Guide / Instructor Included</strong>
            <div style="font-size: 11px; color: var(--slate-600); margin-top: 2px;">Assigned for: ${data.guide.location}</div>
          </div>
          <span style="font-weight: 700; color: var(--purple-600);">${data.pricing.currency} ${data.guide.price}</span>
        </div>
      `;
    }

    // Travellers manifest rows
    const travellersRows = (data.travellers || [])
      .map(
        (t) => `
        <tr>
          <td>${t.index}</td>
          <td><strong>${t.name}</strong></td>
          <td>${t.paxType} (${t.gender})</td>
          <td class="highlight-mono">${t.passportNo}</td>
          <td>${t.nationality}</td>
          <td>${t.isLead ? '<span style="color: var(--primary); font-weight: 700;">★ Lead Pilgrim</span>' : 'Companion'}</td>
        </tr>
      `
      )
      .join('');

    // Financial rows
    let guideFeeRow = '';
    if (data.pricing.guideFee) {
      guideFeeRow = `
        <tr>
          <td>Tour Guide Add-on Service:</td>
          <td>${data.pricing.currency} ${data.pricing.guideFee}</td>
        </tr>
      `;
    }

    let personalGstRow = '';
    if (data.pricing.personalGstAmount && data.pricing.personalGstRate > 0) {
      personalGstRow = `
        <tr>
          <td>Agency Personal GST (${data.pricing.personalGstRate}%):</td>
          <td>${data.pricing.currency} ${data.pricing.personalGstAmount}</td>
        </tr>
      `;
    }

    const replacements = {
      '{{invoiceNumber}}': data.invoiceNumber,
      '{{bookingReference}}': data.bookingReference,
      '{{rawToken}}': rawToken || '',
      '{{agencyAddress}}': data.agency.address,
      '{{agencyGst}}': data.agency.gstin,
      '{{agencyPan}}': data.agency.pan,
      '{{agencyEmail}}': data.agency.email,
      '{{agencyPhone}}': data.agency.phone,
      '{{sacCode}}': data.agency.sacCode,
      '{{statusBadgeClass}}': statusBadgeClass,
      '{{bookingStatus}}': data.bookingStatus,
      '{{customerName}}': data.customer.name,
      '{{customerEmail}}': data.customer.email,
      '{{customerPhone}}': data.customer.phone,
      '{{leadPassengerName}}': data.customer.leadPassengerName,
      '{{bookingDate}}': data.bookingDate,
      '{{invoiceDate}}': data.invoiceDate,
      '{{assignedAgent}}': data.assignedAgent,
      '{{packageTitle}}': data.packageTitle,
      '{{destination}}': data.destination,
      '{{quantity}}': String(data.quantity),
      '{{travelStartDate}}': data.travelDates.startDate,
      '{{travelEndDate}}': data.travelDates.endDate,
      '{{durationText}}': data.travelDates.durationText,
      '{{paxCount}}': String(data.travellers.length || data.quantity),
      '{{inclusionsTags}}': inclusionsTags || '<span class="inclusion-tag">Standard Umrah Package Inclusions</span>',
      '{{guideAddonCard}}': guideAddonCard,
      '{{travellersRows}}': travellersRows || '<tr><td colspan="6" style="text-align: center; color: var(--slate-500);">Individual Pilgrim Package</td></tr>',
      '{{currency}}': data.pricing.currency,
      '{{basePackageFare}}': data.pricing.basePackageFare,
      '{{guideFeeRow}}': guideFeeRow,
      '{{discountRow}}': '',
      '{{personalGstRow}}': personalGstRow,
      '{{totalAmount}}': data.pricing.totalAmount,
      '{{paymentGateway}}': data.payment.method,
      '{{paymentTransactionId}}': data.payment.transactionId,
      '{{paymentStatus}}': data.payment.status,
    };

    Object.entries(replacements).forEach(([key, val]) => {
      template = template.replaceAll(key, val || '');
    });

    return template;
  }

  /**
   * Helper to retrieve and render Package HTML directly
   */
  async getPackageInvoiceHtml(bookingId, currentUser = null, rawToken = '') {
    const data = await this.getPackageInvoiceData(bookingId, currentUser);
    return this.renderPackageInvoiceHtml(data, rawToken);
  }

  /**
   * Generates normalized invoice data for In-House / Offer / Master / Package flight bookings.
   */
  async getInHouseFlightInvoiceData(bookingId, currentUser = null) {
    let doc = null;
    let bkgType = 'master';
    const cleanId = String(bookingId || '').trim();
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(cleanId);

    // 1. Check OfferBooking
    const offerQuery = isObjectId
      ? { _id: cleanId }
      : {
          $or: [
            { razorpayOrderId: cleanId },
            { razorpayPaymentId: cleanId },
            { pnr: cleanId },
            { orderId: cleanId },
            { bookingReference: cleanId },
            { "claimedFlightUnits.stock.pnr": cleanId },
            { "offerSnapshot.pnr": cleanId },
          ],
        };
    doc = await OfferBooking.findOne(offerQuery)
      .populate('userId', 'firstName lastName name email phone')
      .populate('claimedFlightUnits.stock')
      .populate('travellers.travellerId')
      .lean();
    if (doc) bkgType = 'offer';

    // 2. Check Master Booking
    if (!doc) {
      const masterQuery = isObjectId
        ? { _id: cleanId }
        : {
            $or: [
              { bookingReference: cleanId },
              { orderId: cleanId },
              { pnr: cleanId },
              { "details.pnr": cleanId },
            ],
          };
      doc = await Booking.findOne({
        ...masterQuery,
        bookingType: { $regex: /^flight$/i },
      })
        .populate('userId', 'firstName lastName name email phone')
        .populate('paymentId')
        .lean();
      if (doc) bkgType = 'master';
    }

    // 3. Check PackageBooking
    if (!doc) {
      const pkgQuery = isObjectId
        ? { _id: cleanId }
        : {
            $or: [
              { bookingReference: cleanId },
              { orderId: cleanId },
              { "claimedFlightUnits.stock.pnr": cleanId },
              { "packageSnapshot.bundledFlight.pnr": cleanId },
            ],
          };
      doc = await PackageBooking.findOne(pkgQuery)
        .populate('userId', 'firstName lastName name email phone')
        .populate('claimedFlightUnits.stock')
        .populate('travellers.travellerId')
        .lean();
      if (doc) bkgType = 'package';
    }

    if (!doc) {
      throw new AppError(`Flight reservation not found for reference: ${bookingId}`, 404);
    }

    // Authorization
    if (currentUser && currentUser.role === 'customer') {
      const docUserId = (doc.userId?._id || doc.userId || doc.user?._id || doc.user)?.toString();
      const currentUserId = (currentUser.id || currentUser._id)?.toString();
      if (docUserId && currentUserId && docUserId !== currentUserId) {
        throw new AppError('Unauthorized: You can only view invoices for your own bookings', 403);
      }
    }

    const id = doc._id.toString();
    const snap = doc.offerSnapshot || doc.packageSnapshot?.bundledFlight || doc.details || {};
    const stock = doc.claimedFlightUnits?.[0]?.stock || {};
    const bookingDate = new Date(doc.createdAt || Date.now());
    const yearMonth = `${bookingDate.getFullYear()}${String(bookingDate.getMonth() + 1).padStart(2, '0')}`;
    const refSuffix = id.slice(-6).toUpperCase();
    const invoiceNumber = `MT-INV-INHOUSE-${yearMonth}-${refSuffix}`;

    const pnr = stock.pnr || snap.pnr || `MQM-FLT-${refSuffix}`;
    const user = doc.userId || doc.user || {};
    const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'Valued Customer';

    // Segments
    let origin = (stock.origin || snap.origin || 'DEL').toUpperCase();
    let destination = (stock.destination || snap.destination || 'BOM').toUpperCase();
    if (!origin && destination.includes('-')) {
      const pts = destination.split('-');
      origin = pts[0].trim();
      destination = pts[1].trim();
    }
    const airlineName = stock.airline || snap.airline || snap.title || 'In-House Partner Airline';
    const airlineCode = airlineName.toLowerCase().includes('saudia') ? 'SV' : 'AI';
    const flightNumber = stock.flightNumber || snap.flightNumber || `${airlineCode} 501`;
    const depTime = stock.departureDate || snap.departureDate || doc.createdAt || new Date();
    const arrTime = stock.arrivalDate || snap.returnDate || new Date(new Date(depTime).getTime() + 3 * 3600000);

    const segments = [
      {
        segmentIndex: 1,
        airline: `${airlineName} (${airlineCode}-${flightNumber})`,
        airlineCode,
        flightNumber,
        route: `${origin} → ${destination}`,
        departureAirport: `${origin} International Airport`,
        departureTime: formatDateTime(depTime),
        arrivalAirport: `${destination} International Airport`,
        arrivalTime: formatDateTime(arrTime),
        duration: 'Direct Flight',
        cabinClass: stock.cabinClass || snap.cabinClass || 'Economy',
        checkInBaggage: '2 x 23 KG (Series Allowance)',
        cabinBaggage: '7 KG',
      },
    ];

    // Passengers
    const rawTravellers = doc.travellers || [];
    const stockUnits = stock.units || [];
    const passengers = (rawTravellers.length > 0 ? rawTravellers : [{}]).map((t, idx) => {
      const tr = (t.travellerId && typeof t.travellerId === 'object') ? t.travellerId : t;
      const title = tr.title || tr.namePrefix || 'Mr';
      const fName = tr.firstName || (idx === 0 ? user.firstName : 'Guest');
      const lName = tr.lastName || (idx === 0 ? user.lastName : String(idx + 1));
      const cleanName = [title, fName, lName].filter(Boolean).filter(v => v !== 'undefined').join(' ').trim();
      const passengerName = cleanName || customerName;
      const claimedUnitId = doc.claimedFlightUnits?.[idx]?.unitId;
      const matchedUnit = stockUnits.find((u) => u._id?.toString() === claimedUnitId?.toString());
      const ticketNumber = matchedUnit?.ticketNumber || `${pnr}-TKT${idx + 1}`;

      return {
        index: idx + 1,
        name: passengerName,
        paxType: tr.passengerType || 'Adult',
        ticketNumber,
        ticketStatus: 'Confirmed',
        seat: `Seat ${12 + idx}${idx % 2 === 0 ? 'A' : 'C'}`,
      };
    });

    // Pricing
    const totalAmount = doc.totalAmount || doc.totalPrice || snap.totalPrice || 0;
    const baseFare = Math.round(totalAmount * 0.82);
    const taxAmount = totalAmount - baseFare;
    const isInterstate = false;
    const gstRate = 18;
    const gstAmount = Number(((totalAmount * 0.18) / 1.18).toFixed(2));
    const cgst = Number((gstAmount / 2).toFixed(2));
    const sgst = Number((gstAmount / 2).toFixed(2));

    return {
      invoiceNumber,
      supplierInvoiceNumber: `INHOUSE-REF-${refSuffix}`,
      invoiceDate: formatDateTime(doc.createdAt),
      bookingReference: refSuffix,
      bookingStatus: (doc.status || 'CONFIRMED').toUpperCase(),
      serviceType: 'LCC',
      serviceTypeBadge: 'In-House Pre-Purchased Flight Series',
      isLCC: true,
      airlinePnr: pnr,
      gdsPnr: pnr,
      placeOfSupply: 'Delhi (07)',
      agency: {
        ...AGENCY_CONFIG,
        sacCode: AGENCY_CONFIG.sacInternational,
      },
      customer: {
        name: customerName,
        email: user.email || 'N/A',
        phone: user.phone || 'N/A',
        hasCorporateGst: false,
      },
      segments,
      passengers,
      pricing: {
        currency: 'INR',
        baseFare: formatAmount(baseFare),
        taxAmount: formatAmount(taxAmount),
        ancillaryCharges: null,
        baggageCharges: null,
        mealCharges: null,
        seatCharges: null,
        serviceFee: formatAmount(0),
        subTotal: formatAmount(totalAmount),
        personalGstRate: '18%',
        personalGstAmount: formatAmount(gstAmount),
        cgstRatePercent: isInterstate ? '0%' : '9%',
        cgstAmount: isInterstate ? '0.00' : formatAmount(cgst),
        sgstRatePercent: isInterstate ? '0%' : '9%',
        sgstAmount: isInterstate ? '0.00' : formatAmount(sgst),
        igstRatePercent: isInterstate ? '18%' : '0%',
        igstAmount: isInterstate ? formatAmount(gstAmount) : '0.00',
        totalTaxes: formatAmount(gstAmount),
        totalAmount: formatAmount(totalAmount),
      },
      payment: {
        paymentGateway: 'Online Checkout / Series Settlement',
        paymentTxnId: doc.razorpayPaymentId || `TXN-INHOUSE-${refSuffix}`,
        isPaid: doc.status === 'confirmed' || doc.status === 'completed',
        paymentDate: formatDateTime(doc.updatedAt || doc.createdAt),
      },
      notes: [
        'Electronic tax invoice generated automatically under pre-contracted airline inventory allocation.',
        'Official e-ticket and boarding pass available under your /bookings account portal.',
      ],
    };
  }

  /**
   * Generates normalized invoice data for In-House / Offer / Master hotel bookings.
   */
  async getInHouseHotelInvoiceData(bookingId, currentUser = null) {
    let doc = null;
    const cleanId = String(bookingId || '').trim();
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(cleanId);

    // 1. Check OfferBooking
    const offerQuery = isObjectId
      ? { _id: cleanId }
      : {
          $or: [
            { razorpayOrderId: cleanId },
            { razorpayPaymentId: cleanId },
            { orderId: cleanId },
            { bookingReference: cleanId },
            { pnr: cleanId },
          ],
        };
    doc = await OfferBooking.findOne(offerQuery)
      .populate('userId', 'firstName lastName name email phone')
      .populate('claimedHotelUnits.stock')
      .populate('travellers.travellerId')
      .lean();

    // 2. Check Master Booking
    if (!doc) {
      const masterQuery = isObjectId
        ? { _id: cleanId }
        : {
            $or: [
              { bookingReference: cleanId },
              { orderId: cleanId },
              { pnr: cleanId },
            ],
          };
      doc = await Booking.findOne({
        ...masterQuery,
        bookingType: { $regex: /^hotel$/i },
      })
        .populate('userId', 'firstName lastName name email phone')
        .populate('paymentId')
        .lean();
    }

    // 3. Check PackageBooking
    if (!doc) {
      const pkgQuery = isObjectId
        ? { _id: cleanId }
        : {
            $or: [
              { bookingReference: cleanId },
              { orderId: cleanId },
            ],
          };
      doc = await PackageBooking.findOne(pkgQuery)
        .populate('userId', 'firstName lastName name email phone')
        .populate('claimedHotelUnits.stock')
        .populate('travellers.travellerId')
        .lean();
    }

    if (!doc) {
      throw new AppError(`Hotel reservation not found for reference: ${bookingId}`, 404);
    }

    if (currentUser && currentUser.role === 'customer') {
      const docUserId = (doc.userId?._id || doc.userId || doc.user?._id || doc.user)?.toString();
      const currentUserId = (currentUser.id || currentUser._id)?.toString();
      if (docUserId && currentUserId && docUserId !== currentUserId) {
        throw new AppError('Unauthorized: You can only view invoices for your own bookings', 403);
      }
    }

    const id = doc._id.toString();
    const snap = doc.offerSnapshot || doc.packageSnapshot?.bundledHotel || doc.details || {};
    const stock = doc.claimedHotelUnits?.[0]?.stock || {};
    const bookingDate = new Date(doc.createdAt || Date.now());
    const yearMonth = `${bookingDate.getFullYear()}${String(bookingDate.getMonth() + 1).padStart(2, '0')}`;
    const refSuffix = id.slice(-6).toUpperCase();
    const invoiceNumber = `MT-INV-HTL-${yearMonth}-${refSuffix}`;

    const user = doc.userId || doc.user || {};
    const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'Valued Guest';

    const checkInDate = new Date(stock.checkInDate || snap.checkInDate || snap.departureDate || doc.createdAt || Date.now());
    const checkOutDate = new Date(stock.checkOutDate || snap.checkOutDate || snap.returnDate || (checkInDate.getTime() + 2 * 86400000));
    const totalNights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));

    const hotelName = stock.hotelName || snap.hotelName || snap.title || snap.destination || 'Selected Hotel Partner';
    const hotelCity = stock.city || snap.city || 'Destination City';

    const rawTravellers = doc.travellers || [];
    const guests = (rawTravellers.length > 0 ? rawTravellers : [{}]).map((t, idx) => {
      const tr = (t.travellerId && typeof t.travellerId === 'object') ? t.travellerId : t;
      const title = tr.title || tr.namePrefix || 'Mr';
      const fName = tr.firstName || (idx === 0 ? user.firstName : 'Guest');
      const lName = tr.lastName || (idx === 0 ? user.lastName : String(idx + 1));
      const cleanName = [title, fName, lName].filter(Boolean).filter(v => v !== 'undefined').join(' ').trim();
      const guestName = cleanName || customerName;

      return {
        index: idx + 1,
        name: guestName,
        guestType: tr.passengerType || 'Adult',
        isLeadGuest: idx === 0,
        age: 30,
        roomAssignment: 'Room 1',
        mealPreference: 'Complimentary Breakfast',
      };
    });

    const totalAmount = doc.totalAmount || doc.totalPrice || snap.totalPrice || 0;
    const roomRent = Math.round(totalAmount * 0.85);
    const taxesAndCharges = totalAmount - roomRent;
    const gstAmount = Number(((totalAmount * 0.12) / 1.12).toFixed(2));
    const cgst = Number((gstAmount / 2).toFixed(2));
    const sgst = Number((gstAmount / 2).toFixed(2));

    const rooms = [
      {
        index: 1,
        name: stock.roomType || snap.roomType || snap.roomName || 'Standard Luxury Room',
        mealPlan: 'Room with Breakfast (BB)',
        capacity: 2,
        pricePerNight: formatAmount(totalAmount / totalNights),
        totalPrice: formatAmount(totalAmount),
        refundable: 'Non-Refundable Guaranteed Stay',
        cancellationPolicy: 'Pre-contracted hotel allocation terms apply.',
      },
    ];

    return {
      invoiceNumber,
      voucherNumber: `VCH-${refSuffix}`,
      invoiceDate: formatDateTime(doc.createdAt),
      bookingReference: refSuffix,
      bookingStatus: (doc.status || 'CONFIRMED').toUpperCase(),
      placeOfSupply: 'Delhi (07)',
      agency: {
        ...AGENCY_CONFIG,
        sacCode: AGENCY_CONFIG.sacHotelStay,
      },
      customer: {
        name: customerName,
        email: user.email || 'N/A',
        phone: user.phone || 'N/A',
        hasCorporateGst: false,
      },
      hotel: {
        hotelName,
        hotelAddress: `${hotelName}, Central District`,
        locationParts: `${hotelCity}, International`,
        starRating: 4,
        starDisplay: '★★★★',
        hotelCategory: '4-Star Premium Accommodation',
        propertyContact: '24/7 Concierge & Operations Desk',
      },
      stay: {
        checkInDateFormatted: formatDate(checkInDate),
        checkOutDateFormatted: formatDate(checkOutDate),
        totalNights,
        totalRooms: 1,
      },
      rooms,
      guests,
      pricing: {
        currency: 'INR',
        roomRent: formatAmount(roomRent),
        taxesAndServiceCharges: formatAmount(taxesAndCharges),
        convenienceFee: formatAmount(0),
        subTotal: formatAmount(totalAmount),
        personalGstRate: '12%',
        personalGstAmount: formatAmount(gstAmount),
        cgstRatePercent: '6%',
        cgstAmount: formatAmount(cgst),
        sgstRatePercent: '6%',
        sgstAmount: formatAmount(sgst),
        igstRatePercent: '0%',
        igstAmount: '0.00',
        totalTaxes: formatAmount(gstAmount),
        totalAmount: formatAmount(totalAmount),
      },
      payment: {
        paymentGateway: 'Online Checkout / Series Settlement',
        paymentTxnId: doc.razorpayPaymentId || `TXN-HOTEL-${refSuffix}`,
        isPaid: doc.status === 'confirmed' || doc.status === 'completed',
        paymentDate: formatDateTime(doc.updatedAt || doc.createdAt),
      },
      notes: [
        'Official hotel tax invoice issued for confirmed inventory reservation.',
        'Standard check-in time: 14:00 hrs | Check-out time: 12:00 hrs local property time.',
      ],
    };
  }

  // ─── 4. STANDALONE RETAIL OFFERS INVOICES ─────────────────────────────────

  /**
   * Fetch and normalize Standalone Retail Offer booking invoice data.
   * Dispatches dynamically to in-house flight or hotel allotment engines based on itemType.
   */
  async getOfferInvoiceData(bookingId, currentUser = null) {
    if (!bookingId) {
      throw new AppError('Booking reference or ID is required', 400);
    }
    const cleanId = String(bookingId).trim();
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(cleanId);
    const query = isObjectId
      ? { _id: cleanId }
      : { $or: [{ razorpayOrderId: cleanId }, { razorpayPaymentId: cleanId }, { orderId: cleanId }, { bookingReference: cleanId }, { pnr: cleanId }] };

    const booking = await OfferBooking.findOne(query).populate('offerId').lean();

    if (booking) {
      const isFlight =
        (booking.offerSnapshot?.itemType || booking.offerId?.itemType) === 'flight' ||
        (booking.claimedFlightUnits && booking.claimedFlightUnits.length > 0);

      if (isFlight) {
        const data = await this.getInHouseFlightInvoiceData(bookingId, currentUser);
        data.itemType = 'flight';
        data.serviceTypeBadge = 'Wholesale Flight Series';
        return data;
      } else {
        const data = await this.getInHouseHotelInvoiceData(bookingId, currentUser);
        data.itemType = 'hotel';
        data.serviceTypeBadge = 'Wholesale Hotel Allocation';
        return data;
      }
    }

    // Fallback: try flight allotment then hotel allotment
    try {
      const data = await this.getInHouseFlightInvoiceData(bookingId, currentUser);
      data.itemType = 'flight';
      return data;
    } catch (err) {
      const data = await this.getInHouseHotelInvoiceData(bookingId, currentUser);
      data.itemType = 'hotel';
      return data;
    }
  }

  /**
   * Renders Standalone Retail Offer invoice HTML using dedicated offer-invoice.html template
   */
  renderOfferInvoiceHtml(data, rawToken = '') {
    const templatePath = path.join(__dirname, 'templates', 'offer-invoice.html');
    let template = fs.readFileSync(templatePath, 'utf8');

    const statusBadgeClass = data.bookingStatus === 'CONFIRMED'
      ? 'badge-status-confirmed'
      : 'badge-status-pending';

    const isFlight = (data.itemType === 'flight') || Boolean(data.segments);

    let variantDetailsBlock = '';
    let manifestHeading = isFlight ? 'Passenger Manifest' : 'Guest List';
    let manifestRows = '';

    if (isFlight) {
      const seg = (data.segments && data.segments[0]) || data.flightDetails || {};
      variantDetailsBlock = `
        <div class="table-section">
          <div class="section-title">Flight Routing &amp; Inventory Details</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Airline</th>
                <th>Flight No</th>
                <th>Route</th>
                <th>Departure</th>
                <th>Arrival</th>
                <th>Class / Baggage</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${seg.airline || 'Partner Airline'}</strong></td>
                <td class="highlight-mono">${seg.flightNumber || 'FLT-Series'}</td>
                <td>${seg.route || (data.destination || 'Direct')}</td>
                <td>${seg.departureTime || 'Scheduled'}</td>
                <td>${seg.arrivalTime || 'Scheduled'}</td>
                <td>${seg.cabinClass || 'Economy'} (${seg.checkInBaggage || seg.baggage || '20 KG'})</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;

      manifestRows = (data.passengers || []).map((p) => `
        <tr>
          <td>${p.index}</td>
          <td><strong>${p.name}</strong></td>
          <td>${p.paxType}</td>
          <td class="highlight-mono">${p.ticketNumber || 'Ticket Confirmed'}</td>
          <td>${p.seat || p.seatNumber || 'Assigned at Check-in'}</td>
          <td><span class="badge badge-status-confirmed">${p.ticketStatus || p.status || 'CONFIRMED'}</span></td>
        </tr>
      `).join('') || '<tr><td colspan="6" style="text-align: center; color: var(--slate-500);">No passengers registered</td></tr>';
    } else {
      const hotelDet = data.hotelDetails || {};
      const room = (data.rooms && data.rooms[0]) || {};
      const stay = data.stay || {};
      variantDetailsBlock = `
        <div class="table-section">
          <div class="section-title">Hotel Stay &amp; Room Specifications</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Room Type</th>
                <th>Reservation Ref</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Meal Plan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${data.hotel?.hotelName || hotelDet.hotelName || 'Selected Hotel Partner'}</strong></td>
                <td>${room.name || hotelDet.roomType || 'Standard Luxury Room'}</td>
                <td class="highlight-mono">${hotelDet.reservationRef || data.bookingReference || 'CONFIRMED'}</td>
                <td>${stay.checkInDateFormatted || hotelDet.checkIn || 'Check-in'}</td>
                <td>${stay.checkOutDateFormatted || hotelDet.checkOut || 'Check-out'}</td>
                <td>${room.mealPlan || hotelDet.mealPlan || 'Complimentary Breakfast'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;

      manifestRows = (data.guests || []).map((g) => `
        <tr>
          <td>${g.index}</td>
          <td><strong>${g.name}</strong></td>
          <td>${g.guestType}</td>
          <td class="highlight-mono">${g.roomAssignment || 'Room 1'}</td>
          <td>${g.mealPreference || 'Standard'}</td>
          <td><span class="badge badge-status-confirmed">RESERVED</span></td>
        </tr>
      `).join('') || '<tr><td colspan="6" style="text-align: center; color: var(--slate-500);">No guests registered</td></tr>';
    }

    const taxRows = `
      <tr>
        <td class="label">Applicable GST (${data.pricing.personalGstRate || '18%'}):</td>
        <td class="amount">${data.pricing.currency || 'INR'} ${data.pricing.totalTaxes || data.pricing.personalGstAmount || '0.00'}</td>
      </tr>
    `;

    const replacements = {
      '{{invoiceNumber}}': data.invoiceNumber,
      '{{agencyName}}': data.agency.name,
      '{{agencyAddress}}': data.agency.address,
      '{{agencyGst}}': data.agency.gstin,
      '{{agencyPan}}': data.agency.pan,
      '{{sacCode}}': data.agency.sacCode,
      '{{agencyEmail}}': data.agency.email,
      '{{agencyPhone}}': data.agency.phone,
      '{{serviceTypeBadge}}': data.serviceTypeBadge || (isFlight ? 'Wholesale Flight Series' : 'Hotel Room Allocation'),
      '{{bookingReference}}': data.bookingReference,
      '{{invoiceDate}}': data.invoiceDate,
      '{{statusBadgeClass}}': statusBadgeClass,
      '{{bookingStatus}}': data.bookingStatus,
      '{{customerName}}': data.customer.name,
      '{{customerEmail}}': data.customer.email,
      '{{customerPhone}}': data.customer.phone,
      '{{placeOfSupply}}': data.placeOfSupply || 'Delhi (07)',
      '{{offerItemType}}': (isFlight ? 'FLIGHT SERIES' : 'HOTEL ALLOTMENT'),
      '{{quantity}}': String(data.quantity || 1),
      '{{offerTitle}}': data.offerTitle || (isFlight ? 'Retail Flight Series Allotment' : 'Retail Hotel Allocation Stay'),
      '{{destination}}': data.destination || data.hotel?.locationParts || 'Destination Sector',
      '{{variantDetailsBlock}}': variantDetailsBlock,
      '{{manifestHeading}}': manifestHeading,
      '{{manifestRows}}': manifestRows,
      '{{inclusionsBlock}}': '',
      '{{currency}}': data.pricing.currency || 'INR',
      '{{baseFareAmount}}': data.pricing.baseFare || data.pricing.roomRent || data.pricing.subTotal || '0.00',
      '{{serviceFee}}': data.pricing.serviceFee || '0.00',
      '{{taxRows}}': taxRows,
      '{{totalAmount}}': data.pricing.totalAmount,
      '{{paymentGateway}}': data.payment?.paymentGateway || 'Online Checkout',
      '{{paymentTransactionId}}': data.payment?.paymentTxnId || 'N/A',
      '{{paymentStatus}}': data.payment?.isPaid ? 'PAID' : 'PENDING',
    };

    Object.entries(replacements).forEach(([key, val]) => {
      template = template.replaceAll(key, val || '');
    });

    return template;
  }

  async getOfferInvoiceHtml(bookingId, currentUser = null, rawToken = '') {
    const data = await this.getOfferInvoiceData(bookingId, currentUser);
    return this.renderOfferInvoiceHtml(data, rawToken);
  }

  // ─── 5. VISA BATCHES INVOICES ─────────────────────────────────────────────

  /**
   * Fetch and normalize Visa Group booking invoice data.
   */
  async getVisaInvoiceData(groupId, currentUser = null) {
    if (!groupId) {
      throw new AppError('Visa group ID is required', 400);
    }

    const cleanId = String(groupId).trim();
    let group = null;
    if (cleanId.match(/^[0-9a-fA-F]{24}$/)) {
      group = await VisaGroup.findById(cleanId)
        .populate('submittedBy', 'firstName lastName name email phone')
        .lean();
    } else {
      group = await VisaGroup.findOne({
        $or: [{ _id: cleanId }, { packageBookingId: cleanId }],
      })
        .populate('submittedBy', 'firstName lastName name email phone')
        .lean();
    }

    if (!group) {
      throw new AppError(`Visa batch not found for reference: ${groupId}`, 404);
    }

    // Authorization check
    if (currentUser && currentUser.role === 'customer') {
      const ownerId = (group.submittedBy?._id || group.submittedBy)?.toString();
      const currentId = (currentUser.id || currentUser._id)?.toString();
      if (ownerId && currentId && ownerId !== currentId) {
        throw new AppError('Unauthorized: You can only view invoices for your own visa applications', 403);
      }
    }

    const applications = await VisaApplication.find({ groupId: group._id }).lean();

    const groupDate = new Date(group.createdAt || Date.now());
    const yearMonth = `${groupDate.getFullYear()}${String(groupDate.getMonth() + 1).padStart(2, '0')}`;
    const refSuffix = group._id.toString().slice(-6).toUpperCase();
    const invoiceNumber = `MT-INV-VSA-${yearMonth}-${refSuffix}`;

    const user = group.submittedBy || {};
    const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'Valued Client';

    const totalAmount = Number(group.totalAmount || 0);
    const govtFeeRatio = 0.70;
    const governmentFees = Math.round(totalAmount * govtFeeRatio);
    const agencyFeeWithTax = totalAmount - governmentFees;
    const agencyProcessingFee = Math.round(agencyFeeWithTax / 1.18);
    const gstAmount = Number((agencyFeeWithTax - agencyProcessingFee).toFixed(2));
    const cgst = Number((gstAmount / 2).toFixed(2));
    const sgst = Number((gstAmount / 2).toFixed(2));

    const applicants = applications.map((app, idx) => {
      const td = app.travelerDetails || {};
      const fullName = `${td.namePrefix || 'Mr'} ${td.firstName || ''} ${td.lastName || ''}`.trim() || `Applicant ${idx + 1}`;
      return {
        index: idx + 1,
        applicationNumber: app.applicationNumber || `VSA-${refSuffix}-${idx + 1}`,
        name: fullName,
        passportNumber: td.passportNumber || 'N/A',
        nationality: td.nationality || 'Indian',
        status: (app.status || 'submitted').toUpperCase(),
      };
    });

    return {
      invoiceNumber,
      batchReference: `VSA-BATCH-${refSuffix}`,
      groupId: group._id.toString(),
      invoiceDate: formatDateTime(group.createdAt),
      bookingStatus: (group.paymentStatus === 'paid' ? 'CONFIRMED' : group.paymentStatus || 'PENDING').toUpperCase(),
      placeOfSupply: 'Delhi (07)',
      agency: {
        ...AGENCY_CONFIG,
        sacCode: AGENCY_CONFIG.sacTravelService,
      },
      customer: {
        name: customerName,
        email: user.email || 'N/A',
        phone: user.phone || 'N/A',
      },
      visa: {
        destinationCountry: group.destinationCountry || 'International',
        visaType: group.visaType || 'Tourist / Consular Visa',
        totalApplicants: group.totalApplicants || applicants.length || 1,
        bookingSource: group.bookingSource === 'package' ? 'Tour Package Bundle' : 'Direct Standalone Application',
      },
      applicants,
      pricing: {
        currency: 'INR',
        governmentFees: formatAmount(governmentFees),
        agencyProcessingFee: formatAmount(agencyProcessingFee),
        cgstRate: '9%',
        cgstAmount: formatAmount(cgst),
        sgstRate: '9%',
        sgstAmount: formatAmount(sgst),
        totalTaxes: formatAmount(gstAmount),
        totalAmount: formatAmount(totalAmount),
      },
      payment: {
        paymentGateway: 'Online Checkout / Series Settlement',
        paymentTxnId: group.paymentId?.toString() || `TXN-VSA-${refSuffix}`,
        isPaid: group.paymentStatus === 'paid',
        paymentStatus: (group.paymentStatus || 'pending').toUpperCase(),
        paymentDate: formatDateTime(group.updatedAt || group.createdAt),
      },
      notes: [
        'Tax invoice for consular processing and visa facilitation services under SAC 998555.',
        'Visa grant or rejection remains at the sole prerogative of destination sovereign consulates.',
      ],
    };
  }

  /**
   * Renders Visa Group invoice HTML using dedicated visa-invoice.html template
   */
  renderVisaInvoiceHtml(data, rawToken = '') {
    const templatePath = path.join(__dirname, 'templates', 'visa-invoice.html');
    let template = fs.readFileSync(templatePath, 'utf8');

    const statusBadgeClass = data.bookingStatus === 'CONFIRMED'
      ? 'badge-status-confirmed'
      : 'badge-status-pending';

    const applicantsRows = (data.applicants || []).map((a) => `
      <tr>
        <td>${a.index}</td>
        <td class="highlight-mono">${a.applicationNumber}</td>
        <td><strong>${a.name}</strong></td>
        <td class="highlight-mono">${a.passportNumber}</td>
        <td>${a.nationality}</td>
        <td><span class="badge ${a.status === 'APPROVED' ? 'badge-status-confirmed' : 'badge-visa'}">${a.status}</span></td>
      </tr>
    `).join('') || '<tr><td colspan="6" style="text-align: center; color: var(--slate-500);">No individual applications logged</td></tr>';

    const taxRows = `
      <tr>
        <td class="label">CGST (${data.pricing.cgstRate || '9%'}):</td>
        <td class="amount">${data.pricing.currency} ${data.pricing.cgstAmount}</td>
      </tr>
      <tr>
        <td class="label">SGST (${data.pricing.sgstRate || '9%'}):</td>
        <td class="amount">${data.pricing.currency} ${data.pricing.sgstAmount}</td>
      </tr>
    `;

    const replacements = {
      '{{invoiceNumber}}': data.invoiceNumber,
      '{{agencyName}}': data.agency.name,
      '{{agencyAddress}}': data.agency.address,
      '{{agencyGst}}': data.agency.gstin,
      '{{agencyPan}}': data.agency.pan,
      '{{sacCode}}': data.agency.sacCode,
      '{{agencyEmail}}': data.agency.email,
      '{{agencyPhone}}': data.agency.phone,
      '{{batchReference}}': data.batchReference || data.groupId,
      '{{rawToken}}': rawToken || '',
      '{{invoiceDate}}': data.invoiceDate,
      '{{statusBadgeClass}}': statusBadgeClass,
      '{{bookingStatus}}': data.bookingStatus,
      '{{customerName}}': data.customer.name,
      '{{customerEmail}}': data.customer.email,
      '{{customerPhone}}': data.customer.phone,
      '{{placeOfSupply}}': data.placeOfSupply || 'Delhi (07)',
      '{{destinationCountry}}': data.visa?.destinationCountry || data.destinationCountry || 'Saudi Arabia',
      '{{visaType}}': data.visa?.visaType || data.visaType || 'Tourist / Umrah Visa',
      '{{totalApplicants}}': String(data.visa?.totalApplicants || data.totalApplicants || 1),
      '{{bookingSource}}': data.visa?.bookingSource || data.bookingSource || 'Direct Online Submission',
      '{{applicantsRows}}': applicantsRows,
      '{{currency}}': data.pricing.currency,
      '{{governmentFees}}': data.pricing.governmentFees,
      '{{agencyProcessingFee}}': data.pricing.agencyProcessingFee,
      '{{taxRows}}': taxRows,
      '{{totalAmount}}': data.pricing.totalAmount,
      '{{paymentGateway}}': data.payment?.method || data.payment?.paymentGateway || 'Online Checkout',
      '{{paymentTransactionId}}': data.payment?.transactionId || data.payment?.paymentTxnId || 'N/A',
      '{{paymentStatus}}': data.payment?.status || (data.payment?.isPaid ? 'PAID' : 'PENDING'),
    };

    Object.entries(replacements).forEach(([key, val]) => {
      template = template.replaceAll(key, val || '');
    });

    return template;
  }

  async getVisaInvoiceHtml(groupId, currentUser = null, rawToken = '') {
    const data = await this.getVisaInvoiceData(groupId, currentUser);
    return this.renderVisaInvoiceHtml(data, rawToken);
  }


  // ─── ADMIN SPECIFIC INVOICES LISTING DELEGATION (TIER 2) ──────────────────

  /**
   * Delegates admin flight invoices listing to adminInvoiceService
   */
  async adminListFlightInvoices(query = {}) {
    const adminInvoiceService = require('./adminInvoice.service');
    return adminInvoiceService.listFlightInvoices(query);
  }

  /**
   * Delegates admin hotel invoices listing to adminInvoiceService
   */
  async adminListHotelInvoices(query = {}) {
    const adminInvoiceService = require('./adminInvoice.service');
    return adminInvoiceService.listHotelInvoices(query);
  }

  /**
   * Delegates admin package invoices listing to adminInvoiceService
   */
  async adminListPackageInvoices(query = {}) {
    const adminInvoiceService = require('./adminInvoice.service');
    return adminInvoiceService.listPackageInvoices(query);
  }

  /**
   * Delegates admin offer invoices listing to adminInvoiceService
   */
  async adminListOfferInvoices(query = {}) {
    const adminInvoiceService = require('./adminInvoice.service');
    return adminInvoiceService.listOfferInvoices(query);
  }

  /**
   * Delegates admin visa invoices listing to adminInvoiceService
   */
  async adminListVisaInvoices(query = {}) {
    const adminInvoiceService = require('./adminInvoice.service');
    return adminInvoiceService.listVisaInvoices(query);
  }

}

module.exports = new InvoiceService();
