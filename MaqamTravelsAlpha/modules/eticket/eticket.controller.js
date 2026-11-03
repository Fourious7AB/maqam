// modules/eticket/eticket.controller.js
//
// Controller for E-Ticket Retrieval and File Downloads across Live Flights & In-House Inventory.
// Does NOT render HTML templates server-side; delivers rich, normalized JSON payloads
// for client-side frontend rendering and direct JSON document attachments.

const eticketService = require('./eticket.service');
const { sendSuccess } = require('../../utils/apiResponse');

class ETicketController {
  // ─── 1. LIVE FLIGHT SERVICES (GDS & LCC) ──────────────────────────────────

  /**
   * GET /api/v1/flights/bookings/:bookingId/eticket
   * GET /api/v1/eticket/live/:bookingId
   * Returns normalized live flight e-ticket JSON data for frontend component rendering.
   */
  async getLiveFlightETicket(req, res, next) {
    try {
      const { bookingId } = req.params;
      const data = await eticketService.getLiveFlightETicket(bookingId, req.user);

      return sendSuccess(res, {
        message: 'Live flight e-ticket retrieved successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/flights/bookings/:bookingId/eticket/download
   * GET /api/v1/eticket/live/:bookingId/download
   * Triggers direct browser attachment download of the verified e-ticket document.
   */
  async downloadLiveFlightETicket(req, res, next) {
    try {
      const { bookingId } = req.params;
      const data = await eticketService.getLiveFlightETicket(bookingId, req.user);

      const filename = `ETicket-${data.pnr || data.bookingReference || bookingId}.json`;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      return res.status(200).send(JSON.stringify({ success: true, eTicket: data }, null, 2));
    } catch (error) {
      next(error);
    }
  }

  // ─── 2. IN-HOUSE FLIGHT SERVICES: OFFERS ───────────────────────────────────

  /**
   * GET /api/v1/offers/bookings/:id/eticket
   * GET /api/v1/eticket/inhouse/offer/:bookingId
   * Returns normalized in-house standalone retail offer flight e-ticket JSON data.
   */
  async getOfferETicket(req, res, next) {
    try {
      const bookingId = req.params.id || req.params.bookingId;
      const data = await eticketService.getInhouseOfferETicket(bookingId, req.user);

      return sendSuccess(res, {
        message: 'In-house offer flight e-ticket retrieved successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/offers/bookings/:id/eticket/download
   * GET /api/v1/eticket/inhouse/offer/:bookingId/download
   * Triggers direct browser attachment download of the in-house offer e-ticket document.
   */
  async downloadOfferETicket(req, res, next) {
    try {
      const bookingId = req.params.id || req.params.bookingId;
      const data = await eticketService.getInhouseOfferETicket(bookingId, req.user);

      const filename = `ETicket-${data.customerPnr || bookingId}.json`;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      return res.status(200).send(JSON.stringify({ success: true, eTicket: data }, null, 2));
    } catch (error) {
      next(error);
    }
  }

  // ─── 3. IN-HOUSE FLIGHT SERVICES: PACKAGES ─────────────────────────────────

  /**
   * GET /api/v1/packages/bookings/:id/eticket
   * GET /api/v1/eticket/inhouse/package/:bookingId
   * Returns normalized in-house tour package flight e-ticket JSON data.
   */
  async getPackageETicket(req, res, next) {
    try {
      const bookingId = req.params.id || req.params.bookingId;
      const data = await eticketService.getInhousePackageETicket(bookingId, req.user);

      return sendSuccess(res, {
        message: 'In-house package flight e-ticket retrieved successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/packages/bookings/:id/eticket/download
   * GET /api/v1/eticket/inhouse/package/:bookingId/download
   * Triggers direct browser attachment download of the in-house package e-ticket document.
   */
  async downloadPackageETicket(req, res, next) {
    try {
      const bookingId = req.params.id || req.params.bookingId;
      const data = await eticketService.getInhousePackageETicket(bookingId, req.user);

      const filename = `ETicket-${data.customerPnr || bookingId}.json`;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      return res.status(200).send(JSON.stringify({ success: true, eTicket: data }, null, 2));
    } catch (error) {
      next(error);
    }
  }

  // ─── 4. PUBLIC TICKET VERIFICATION (AIRPORT GROUND STAFF) ──────────────────

  /**
   * GET /api/v1/eticket/verify?pnr=MQM-7K9P2W&lastName=Khan
   * Public lookup endpoint verifying validity across all booking sources without requiring login.
   */
  async verifyTicket(req, res, next) {
    try {
      const { pnr, lastName } = req.query;
      const data = await eticketService.verifyTicket(pnr, lastName);

      return sendSuccess(res, {
        message: 'Ticket verified successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ETicketController();
