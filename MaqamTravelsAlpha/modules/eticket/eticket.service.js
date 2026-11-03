// modules/eticket/eticket.service.js
//
// Universal E-Ticket Normalization Engine
// Handles:
// 1. Live Flight Services (GDS & LCC via FlightBooking)
// 2. In-House Flight Services:
//    - Standalone Retail Offers (OfferBooking + TicketStock)
//    - Holiday & Tour Packages (PackageBooking + TicketStock)
//
// Delivers normalized JSON payload consumed by Frontend UI to render
// interactive boarding passes and client-side PDF downloads.

const FlightBooking = require('../flights/flight.model');
const OfferBooking = require('../packages/offers/offerBooking.model');
const PackageBooking = require('../packages/models/packageBooking.model');
const TicketStock = require('../packages/stock/ticketStock.model');
const { AppError } = require('../../middleware/errorHandler');

class ETicketService {
  /**
   * Helper: Format ISO date string into readable date-time "DD MMM YYYY, HH:mm"
   */
  formatDateTime(dateStr) {
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
  }

  /**
   * Helper: Format duration minutes into "Xh Ym"
   */
  formatDuration(mins) {
    if (!mins) return 'Direct';
    const num = parseInt(mins, 10);
    if (isNaN(num)) return String(mins);
    const h = Math.floor(num / 60);
    const m = num % 60;
    return `${h}h ${m}m`;
  }

  /**
   * Helper: Check if user owns the booking or is an admin/staff
   */
  checkAuthorization(ownerId, currentUser) {
    if (!currentUser) return; // public or internal call
    if (currentUser.role === 'admin' || currentUser.role === 'operations' || currentUser.role === 'agent') {
      return;
    }
    const currentUserId = (currentUser.id || currentUser._id)?.toString();
    const targetOwnerId = (ownerId?._id || ownerId)?.toString();
    if (currentUserId && targetOwnerId && currentUserId !== targetOwnerId) {
      throw new AppError('Unauthorized: You can only view e-tickets for your own bookings', 403);
    }
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────────
   * 1. LIVE FLIGHT E-TICKET (GDS & LCC via SRDV Aggregator)
   * ─────────────────────────────────────────────────────────────────────────────
   */
  async getLiveFlightETicket(bookingId, currentUser = null) {
    let query = {};
    if (typeof bookingId === 'string' && bookingId.match(/^[0-9a-fA-F]{24}$/)) {
      query = { _id: bookingId };
    } else if (!isNaN(Number(bookingId))) {
      query = { srdvBookingId: Number(bookingId) };
    } else {
      query = { pnr: String(bookingId).toUpperCase() };
    }

    const booking = await FlightBooking.findOne(query)
      .populate('user', 'firstName lastName name email phone')
      .populate('passengers.travellerId')
      .populate('paymentId')
      .lean();

    if (!booking) {
      throw new AppError(`Live flight booking not found for reference: ${bookingId}`, 404);
    }

    // Authorization check
    this.checkAuthorization(booking.user, currentUser);

    // Guard: Must be confirmed or have issued e-ticket
    if (booking.status !== 'confirmed') {
      const isLCC = Boolean(booking.isLCC);
      if (!isLCC && booking.lastTicketDate) {
        throw new AppError(
          `E-Ticket is pending issuance. Payment is being confirmed with the GDS airline. Deadline: ${this.formatDateTime(booking.lastTicketDate)}`,
          400
        );
      }
      throw new AppError(
        `E-Ticket is not ready. Current booking status: ${booking.status.toUpperCase()}`,
        400
      );
    }

    const isLCC = Boolean(booking.isLCC);
    const pnr = booking.pnr || 'PENDING';
    const gdsPnr = booking.gdsPnr || null;
    const bookingReference = `FLT-${booking.srdvBookingId || booking._id.toString().slice(-6).toUpperCase()}`;

    // Extract segments from eTicketData or fareSnapshot fallback
    const rawSegments = booking.eTicketData?.Segments?.[0] || booking.eTicketData?.Segments || booking.fareSnapshot?.Segments || [];
    const segments = [];

    if (Array.isArray(rawSegments) && rawSegments.length > 0) {
      rawSegments.forEach((seg, idx) => {
        const airlineCode = seg.Airline?.AirlineCode || seg.AirlineCode || '';
        const airlineName = seg.Airline?.AirlineName || airlineCode || 'Commercial Airline';
        const flightNumber = seg.Airline?.FlightNumber || seg.FlightNumber || '';
        const originCode = seg.Origin?.AirportCode || seg.OriginAirportCode || seg.Origin || '';
        const originCity = seg.Origin?.CityName || originCode;
        const originTerminal = seg.Origin?.Terminal ? `T${seg.Origin.Terminal}` : '';

        const destCode = seg.Destination?.AirportCode || seg.DestinationAirportCode || seg.Destination || '';
        const destCity = seg.Destination?.CityName || destCode;
        const destTerminal = seg.Destination?.Terminal ? `T${seg.Destination.Terminal}` : '';

        segments.push({
          segmentIndex: idx + 1,
          airline: {
            name: airlineName,
            code: airlineCode,
            flightNumber: `${airlineCode} ${flightNumber}`.trim(),
            cabinClass: seg.CabinClass || 'Economy',
          },
          origin: {
            code: originCode,
            city: originCity,
            airportName: seg.Origin?.AirportName || `${originCity} Airport`,
            terminal: originTerminal,
          },
          destination: {
            code: destCode,
            city: destCity,
            airportName: seg.Destination?.AirportName || `${destCity} Airport`,
            terminal: destTerminal,
          },
          departureTime: seg.Origin?.DepTime || seg.DepTime,
          departureTimeFormatted: this.formatDateTime(seg.Origin?.DepTime || seg.DepTime),
          arrivalTime: seg.Destination?.ArrTime || seg.ArrTime,
          arrivalTimeFormatted: this.formatDateTime(seg.Destination?.ArrTime || seg.ArrTime),
          duration: this.formatDuration(seg.Duration),
          baggage: {
            checkIn: seg.Baggage || (isLCC ? '15 KG' : '20-25 KG per airline policy'),
            cabin: seg.CabinBaggage || '7 KG',
          },
        });
      });
    } else {
      segments.push({
        segmentIndex: 1,
        airline: {
          name: isLCC ? 'Low-Cost Carrier' : 'Full Service Airline',
          code: '',
          flightNumber: 'Scheduled Flight',
          cabinClass: 'Economy',
        },
        origin: {
          code: booking.eTicketData?.Origin || 'ORIGIN',
          city: booking.eTicketData?.Origin || 'Origin',
          airportName: 'Departure Airport',
          terminal: '',
        },
        destination: {
          code: booking.eTicketData?.Destination || 'DEST',
          city: booking.eTicketData?.Destination || 'Destination',
          airportName: 'Arrival Airport',
          terminal: '',
        },
        departureTime: booking.createdAt,
        departureTimeFormatted: this.formatDateTime(booking.createdAt),
        arrivalTime: booking.createdAt,
        arrivalTimeFormatted: this.formatDateTime(booking.createdAt),
        duration: 'Direct',
        baggage: {
          checkIn: isLCC ? '15 KG' : 'Standard allowance',
          cabin: '7 KG',
        },
      });
    }

    // Extract passengers
    const rawETicketPax = booking.eTicketData?.Passenger || [];
    const dbPassengers = booking.passengers || [];
    const paxCount = Math.max(rawETicketPax.length, dbPassengers.length, 1);
    const passengers = [];

    for (let i = 0; i < paxCount; i++) {
      const ePax = rawETicketPax[i] || {};
      const dbPax = dbPassengers[i] || {};
      const traveller = dbPax.travellerId || {};

      const title = ePax.Title || traveller.title || 'Mr';
      const firstName = ePax.FirstName || traveller.firstName || '';
      const lastName = ePax.LastName || traveller.lastName || '';
      const fullName = `${title} ${firstName} ${lastName}`.trim().toUpperCase() || `PASSENGER ${i + 1}`;

      let ticketNum = dbPax.ticketNumber || ePax.Ticket?.TicketNumber || dbPax.ticketId || ePax.Ticket?.TicketId;
      if (!ticketNum || ticketNum === '') {
        ticketNum = isLCC ? (pnr ? `${pnr} (LCC Direct)` : 'Confirmed') : 'Confirmed';
      }

      const passportNo = traveller.passportNo || traveller.passportNumber || null;
      const maskedPassport = passportNo ? `••••${passportNo.slice(-4)}` : null;

      passengers.push({
        passengerIndex: i + 1,
        fullName,
        passengerType: (traveller.passengerType || (ePax.PaxType === '2' ? 'Child' : ePax.PaxType === '3' ? 'Infant' : 'Adult')).toUpperCase(),
        isLeadPassenger: Boolean(dbPax.isLeadPax || i === 0),
        ticketNumber: ticketNum,
        ticketStatus: dbPax.ticketStatus || ePax.Ticket?.Status || 'OK',
        seatNumber: dbPax.seat?.seatNumber || ePax.Seat || 'Allocated at Check-in',
        meal: dbPax.meal?.code || null,
        passportNumberMasked: maskedPassport,
        qrCodePayload: `M1${lastName}/${firstName} ${pnr} ${segments[0]?.origin?.code}${segments[0]?.destination?.code} ${ticketNum}`,
      });
    }

    return {
      serviceType: 'LIVE_FLIGHT',
      bookingId: booking._id,
      bookingReference,
      pnr,
      gdsPnr,
      carrierType: isLCC ? 'LCC' : 'GDS',
      ticketStatus: 'CONFIRMED',
      issuedAt: booking.updatedAt || booking.createdAt,
      issuedAtFormatted: this.formatDateTime(booking.updatedAt || booking.createdAt),
      customer: {
        name: `${booking.user?.firstName || ''} ${booking.user?.lastName || ''}`.trim() || booking.user?.name || 'Customer',
        email: booking.user?.email || null,
        phone: booking.user?.phone || null,
      },
      segments,
      passengers,
      advisories: [
        'Airport check-in counters open 3 hours prior to international departure and 2 hours prior for domestic flights.',
        'Check-in counters close strictly 60 minutes prior to scheduled departure.',
        'All passengers must present a valid government-issued photo ID or international passport matching the ticket name.',
        'Boarding gates close 25 minutes prior to scheduled departure.',
      ],
    };
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────────
   * 2. IN-HOUSE STANDALONE RETAIL OFFER E-TICKET
   * ─────────────────────────────────────────────────────────────────────────────
   */
  async getInhouseOfferETicket(bookingId, currentUser = null) {
    const booking = await OfferBooking.findById(bookingId)
      .populate('userId', 'firstName lastName name email phone')
      .populate('claimedFlightUnits.stock')
      .populate('travellers.travellerId')
      .lean();

    if (!booking) {
      throw new AppError(`Offer booking not found for reference: ${bookingId}`, 404);
    }

    // Authorization check
    this.checkAuthorization(booking.userId, currentUser);

    // Guard: Must include flight units
    if (!booking.claimedFlightUnits || booking.claimedFlightUnits.length === 0) {
      throw new AppError('This retail offer booking does not contain wholesale flight inventory.', 400);
    }

    const firstClaim = booking.claimedFlightUnits[0];
    const stockDoc = firstClaim?.stock;
    if (!stockDoc) {
      throw new AppError('Referenced TicketStock inventory document was not found.', 404);
    }

    // Dual-PNR Architecture:
    // 1. Customer PNR (Unique 6-character reference for self-service)
    // 2. Master Airline Group PNR (For airport check-in desk)
    const customerPnr = `MQM-${booking._id.toString().slice(-6).toUpperCase()}`;
    const airlineGroupPnr = stockDoc.pnr;
    const bookingReference = `OFFER-FLT-${booking._id.toString().slice(-6).toUpperCase()}`;

    const segment = {
      segmentIndex: 1,
      airline: {
        name: stockDoc.airline,
        code: stockDoc.airline?.slice(0, 2).toUpperCase() || 'SV',
        flightNumber: stockDoc.flightNumber,
        cabinClass: stockDoc.cabinClass || 'Economy',
      },
      origin: {
        code: stockDoc.origin,
        city: stockDoc.origin,
        airportName: `${stockDoc.origin} International Airport`,
        terminal: 'Main Terminal',
      },
      destination: {
        code: stockDoc.destination,
        city: stockDoc.destination,
        airportName: `${stockDoc.destination} International Airport`,
        terminal: 'Main Terminal',
      },
      departureTime: stockDoc.departureDate,
      departureTimeFormatted: this.formatDateTime(stockDoc.departureDate),
      arrivalTime: stockDoc.arrivalDate || stockDoc.departureDate,
      arrivalTimeFormatted: this.formatDateTime(stockDoc.arrivalDate || stockDoc.departureDate),
      duration: 'Direct Series Flight',
      baggage: {
        checkIn: '2 x 23 KG (Series Allowance)',
        cabin: '7 KG',
      },
    };

    const passengers = (booking.travellers || []).map((trav, idx) => {
      const t = trav.travellerId || {};
      const claimedUnit = booking.claimedFlightUnits[idx];
      const fullName = `${t.title || 'Mr'} ${t.firstName || ''} ${t.lastName || ''}`.trim().toUpperCase() || `PASSENGER ${idx + 1}`;
      const passportNo = t.passportNo || t.passportNumber || null;

      // Check if CRM agent assigned individual ticket number to this unit
      const allocatedUnitId = claimedUnit?.unitId ? claimedUnit.unitId.toString().slice(-4).toUpperCase() : `${idx + 1}`;
      const unitDoc = stockDoc.units?.find((u) => u._id?.toString() === claimedUnit?.unitId?.toString());
      const ticketNum = unitDoc?.ticketNumber || `CONFIRMED (Group PNR: ${airlineGroupPnr})`;

      return {
        passengerIndex: idx + 1,
        fullName,
        passengerType: (t.passengerType || 'Adult').toUpperCase(),
        isLeadPassenger: Boolean(trav.isLead || idx === 0),
        ticketNumber: ticketNum,
        seatNumber: `Seat Block Unit #${allocatedUnitId}`,
        ticketStatus: 'CONFIRMED',
        passportNumberMasked: passportNo ? `••••${passportNo.slice(-4)}` : 'ON FILE',
        qrCodePayload: `M1${t.lastName || 'PAX'}/${t.firstName || ''} ${customerPnr} ${stockDoc.origin}${stockDoc.destination} ${airlineGroupPnr}`,
      };
    });

    return {
      serviceType: 'INHOUSE_OFFER_FLIGHT',
      bookingId: booking._id,
      bookingReference,
      customerPnr,
      airlineGroupPnr,
      ticketStatus: 'CONFIRMED',
      issuedAt: booking.createdAt,
      issuedAtFormatted: this.formatDateTime(booking.createdAt),
      customer: {
        name: `${booking.userId?.firstName || ''} ${booking.userId?.lastName || ''}`.trim() || booking.userId?.name || 'Customer',
        email: booking.userId?.email || null,
        phone: booking.userId?.phone || null,
      },
      segments: [segment],
      passengers,
      advisories: [
        `This e-ticket is issued under pre-contracted Wholesale Group PNR: ${airlineGroupPnr}.`,
        'Present this document with your original passport at the airline check-in counter.',
        'Complimentary Zamzam 5L water allowance included for Umrah pilgrims on return flights.',
        'Reporting time: 3 hours prior to scheduled departure.',
      ],
    };
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────────
   * 3. IN-HOUSE PACKAGE FLIGHT E-TICKET
   * ─────────────────────────────────────────────────────────────────────────────
   */
  async getInhousePackageETicket(bookingId, currentUser = null) {
    const booking = await PackageBooking.findById(bookingId)
      .populate('userId', 'firstName lastName name email phone')
      .populate('claimedFlightUnits.stock')
      .populate('travellers.travellerId')
      .lean();

    if (!booking) {
      throw new AppError(`Package booking not found for reference: ${bookingId}`, 404);
    }

    // Authorization check
    this.checkAuthorization(booking.userId, currentUser);

    // Guard: Must include flight inventory units
    if (!booking.claimedFlightUnits || booking.claimedFlightUnits.length === 0) {
      throw new AppError('This tour package booking does not contain wholesale flight inventory.', 400);
    }

    const firstClaim = booking.claimedFlightUnits[0];
    const stockDoc = firstClaim?.stock;
    if (!stockDoc) {
      throw new AppError('Referenced TicketStock inventory document was not found.', 404);
    }

    const customerPnr = `MQM-${booking._id.toString().slice(-6).toUpperCase()}`;
    const airlineGroupPnr = stockDoc.pnr;
    const bookingReference = `PKG-FLT-${booking._id.toString().slice(-6).toUpperCase()}`;

    const segment = {
      segmentIndex: 1,
      airline: {
        name: stockDoc.airline,
        code: stockDoc.airline?.slice(0, 2).toUpperCase() || 'SV',
        flightNumber: stockDoc.flightNumber,
        cabinClass: stockDoc.cabinClass || 'Economy',
      },
      origin: {
        code: stockDoc.origin,
        city: stockDoc.origin,
        airportName: `${stockDoc.origin} International Airport`,
        terminal: 'Main Terminal',
      },
      destination: {
        code: stockDoc.destination,
        city: stockDoc.destination,
        airportName: `${stockDoc.destination} International Airport`,
        terminal: 'Main Terminal',
      },
      departureTime: stockDoc.departureDate,
      departureTimeFormatted: this.formatDateTime(stockDoc.departureDate),
      arrivalTime: stockDoc.arrivalDate || stockDoc.departureDate,
      arrivalTimeFormatted: this.formatDateTime(stockDoc.arrivalDate || stockDoc.departureDate),
      duration: 'Group Charter / Series Flight',
      baggage: {
        checkIn: '2 x 23 KG (Group Tour Allowance)',
        cabin: '7 KG',
      },
    };

    const passengers = (booking.travellers || []).map((trav, idx) => {
      const t = trav.travellerId || {};
      const claimedUnit = booking.claimedFlightUnits[idx];
      const fullName = `${t.title || 'Mr'} ${t.firstName || ''} ${t.lastName || ''}`.trim().toUpperCase() || `PASSENGER ${idx + 1}`;
      const passportNo = t.passportNo || t.passportNumber || null;

      const allocatedUnitId = claimedUnit?.unitId ? claimedUnit.unitId.toString().slice(-4).toUpperCase() : `${idx + 1}`;
      const unitDoc = stockDoc.units?.find((u) => u._id?.toString() === claimedUnit?.unitId?.toString());
      const ticketNum = unitDoc?.ticketNumber || `CONFIRMED (Group PNR: ${airlineGroupPnr})`;

      return {
        passengerIndex: idx + 1,
        fullName,
        passengerType: (t.passengerType || 'Adult').toUpperCase(),
        isLeadPassenger: Boolean(trav.isLead || idx === 0),
        ticketNumber: ticketNum,
        seatNumber: `Group Unit #${allocatedUnitId}`,
        ticketStatus: 'CONFIRMED',
        passportNumberMasked: passportNo ? `••••${passportNo.slice(-4)}` : 'ON FILE',
        qrCodePayload: `M1${t.lastName || 'PAX'}/${t.firstName || ''} ${customerPnr} ${stockDoc.origin}${stockDoc.destination} ${airlineGroupPnr}`,
      };
    });

    return {
      serviceType: 'INHOUSE_PACKAGE_FLIGHT',
      bookingId: booking._id,
      bookingReference,
      packageTitle: booking.packageSnapshot?.title || 'Tour Package Flight',
      customerPnr,
      airlineGroupPnr,
      ticketStatus: 'CONFIRMED',
      issuedAt: booking.createdAt,
      issuedAtFormatted: this.formatDateTime(booking.createdAt),
      customer: {
        name: `${booking.userId?.firstName || ''} ${booking.userId?.lastName || ''}`.trim() || booking.userId?.name || 'Customer',
        email: booking.userId?.email || null,
        phone: booking.userId?.phone || null,
      },
      segments: [segment],
      passengers,
      advisories: [
        `This e-ticket is part of an organized group travel package under Airline Series PNR: ${airlineGroupPnr}.`,
        'Tour manager / airport coordinator will assist travelers at the departure terminal.',
        'Complimentary Zamzam 5L allowance included for pilgrims upon return.',
        'Check-in desk opens 3 hours prior to departure.',
      ],
    };
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────────
   * 4. PUBLIC 2-FACTOR TICKET VERIFICATION (Airport & Mobile Lookup)
   * ─────────────────────────────────────────────────────────────────────────────
   */
  async verifyTicket(pnr, lastName) {
    if (!pnr || !lastName) {
      throw new AppError('Both PNR and passenger last name are required for verification', 400);
    }

    const cleanPnr = String(pnr).trim().toUpperCase();
    const cleanLastName = String(lastName).trim().toLowerCase();

    // 1. Check Live Flights
    const liveBooking = await FlightBooking.findOne({
      $or: [{ pnr: cleanPnr }, { gdsPnr: cleanPnr }],
    })
      .populate('passengers.travellerId')
      .lean();

    if (liveBooking) {
      const match = (liveBooking.passengers || []).some((p) => {
        const t = p.travellerId || {};
        return (t.lastName || '').toLowerCase() === cleanLastName;
      });
      if (match) {
        return this.getLiveFlightETicket(liveBooking._id, null);
      }
    }

    // 2. Check In-House Offers
    const offerBookings = await OfferBooking.find()
      .populate('claimedFlightUnits.stock')
      .populate('travellers.travellerId')
      .lean();

    for (const ob of offerBookings) {
      const custPnr = `MQM-${ob._id.toString().slice(-6).toUpperCase()}`;
      const groupPnr = ob.claimedFlightUnits?.[0]?.stock?.pnr?.toUpperCase();

      if (custPnr === cleanPnr || groupPnr === cleanPnr) {
        const match = (ob.travellers || []).some((t) => {
          const trav = t.travellerId || {};
          return (trav.lastName || '').toLowerCase() === cleanLastName;
        });
        if (match) {
          return this.getInhouseOfferETicket(ob._id, null);
        }
      }
    }

    // 3. Check In-House Packages
    const packageBookings = await PackageBooking.find()
      .populate('claimedFlightUnits.stock')
      .populate('travellers.travellerId')
      .lean();

    for (const pb of packageBookings) {
      const custPnr = `MQM-${pb._id.toString().slice(-6).toUpperCase()}`;
      const groupPnr = pb.claimedFlightUnits?.[0]?.stock?.pnr?.toUpperCase();

      if (custPnr === cleanPnr || groupPnr === cleanPnr) {
        const match = (pb.travellers || []).some((t) => {
          const trav = t.travellerId || {};
          return (trav.lastName || '').toLowerCase() === cleanLastName;
        });
        if (match) {
          return this.getInhousePackageETicket(pb._id, null);
        }
      }
    }

    throw new AppError('No matching confirmed e-ticket found for the provided PNR and Last Name', 404);
  }
}

module.exports = new ETicketService();
