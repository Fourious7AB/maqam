// modules/invoices/adminInvoice.controller.js
//
// Admin / CRM Controller for invoice operations across all travel verticals:
// 1. Tour Packages (Umrah & Holiday Packages)
// 2. Standalone Retail Offers (Wholesale Flight & Hotel Allotments)
// 3. Visa Batches (In-House Consular & Facilitation Services)
// 4. Online Flights (Live GDS & LCC Aggregator Inventory)
// 5. Online Hotels (Live SRDV Supplier Inventory)
// 6. Cross-Vertical Financial Overview & Summary

const adminInvoiceService = require('./adminInvoice.service');
const invoiceService = require('./invoice.service');
const { sendSuccess } = require('../../utils/apiResponse');
const logger = require('../../utils/logger');

class AdminInvoiceController {
  // ─── 0. FINANCIAL SUMMARY & METRICS ──────────────────────────────────────────

  /**
   * Cross-vertical financial overview for CRM finance & operations
   * GET /summary
   */
  async getInvoicesSummary(req, res, next) {
    try {
      const data = await adminInvoiceService.getInvoicesSummary();
      return sendSuccess(res, {
        message: 'Invoices summary retrieved successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── 1. TOUR PACKAGES ─────────────────────────────────────────────────────────

  /**
   * List all Tour Package invoices with filtering and pagination
   * GET /package
   */
  async listPackageInvoices(req, res, next) {
    try {
      const result = await adminInvoiceService.listPackageInvoices(req.query);
      return sendSuccess(res, {
        message: 'Package invoices retrieved successfully',
        data: result.invoices,
        meta: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get package invoice as JSON data
   * GET /package/:id
   */
  async getPackageInvoiceData(req, res, next) {
    try {
      const bookingId = req.params.bookingId || req.params.id;
      const data = await adminInvoiceService.getPackageInvoiceData(bookingId, req.user);
      return sendSuccess(res, {
        message: 'Package invoice data retrieved successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get package invoice as rendered HTML document
   * GET /package/:id/html
   */
  async getPackageInvoiceHtml(req, res, next) {
    try {
      const bookingId = req.params.bookingId || req.params.id;
      const rawToken = req.query.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : '');
      const html = await adminInvoiceService.getPackageInvoiceHtml(bookingId, req.user, rawToken);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download package invoice HTML attachment
   * GET /package/:id/download
   */
  async downloadPackageInvoice(req, res, next) {
    try {
      const bookingId = req.params.bookingId || req.params.id;
      const rawToken = req.query.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : '');
      const data = await adminInvoiceService.getPackageInvoiceData(bookingId, req.user);
      const html = invoiceService.renderPackageInvoiceHtml(data, rawToken);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${data.invoiceNumber || 'Package-Invoice'}.html"`
      );
      return res.status(200).send(html);
    } catch (error) {
      next(error);
    }
  }

  // ─── 2. STANDALONE RETAIL OFFERS ──────────────────────────────────────────────

  /**
   * List all Retail Offer invoices with filtering and pagination
   * GET /offer
   */
  async listOfferInvoices(req, res, next) {
    try {
      const result = await adminInvoiceService.listOfferInvoices(req.query);
      return sendSuccess(res, {
        message: 'Offer invoices retrieved successfully',
        data: result.invoices,
        meta: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get offer invoice as JSON data
   * GET /offer/:id
   */
  async getOfferInvoiceData(req, res, next) {
    try {
      const bookingId = req.params.bookingId || req.params.id;
      const data = await adminInvoiceService.getOfferInvoiceData(bookingId, req.user);
      return sendSuccess(res, {
        message: 'Offer invoice data retrieved successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get offer invoice as rendered HTML document
   * GET /offer/:id/html
   */
  async getOfferInvoiceHtml(req, res, next) {
    try {
      const bookingId = req.params.bookingId || req.params.id;
      const rawToken = req.query.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : '');
      const html = await adminInvoiceService.getOfferInvoiceHtml(bookingId, req.user, rawToken);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download offer invoice HTML attachment
   * GET /offer/:id/download
   */
  async downloadOfferInvoice(req, res, next) {
    try {
      const bookingId = req.params.bookingId || req.params.id;
      const rawToken = req.query.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : '');
      const data = await adminInvoiceService.getOfferInvoiceData(bookingId, req.user);
      const html = invoiceService.renderOfferInvoiceHtml(data, rawToken);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${data.invoiceNumber || 'Offer-Invoice'}.html"`
      );
      return res.status(200).send(html);
    } catch (error) {
      next(error);
    }
  }

  // ─── 3. VISA BATCHES ──────────────────────────────────────────────────────────

  /**
   * List all Visa Batch invoices with filtering and pagination
   * GET /visa
   */
  async listVisaInvoices(req, res, next) {
    try {
      const result = await adminInvoiceService.listVisaInvoices(req.query);
      return sendSuccess(res, {
        message: 'Visa invoices retrieved successfully',
        data: result.invoices,
        meta: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get visa invoice as JSON data
   * GET /visa/:id
   */
  async getVisaInvoiceData(req, res, next) {
    try {
      const groupId = req.params.groupId || req.params.id;
      const data = await adminInvoiceService.getVisaInvoiceData(groupId, req.user);
      return sendSuccess(res, {
        message: 'Visa invoice data retrieved successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get visa invoice as rendered HTML document
   * GET /visa/:id/html
   */
  async getVisaInvoiceHtml(req, res, next) {
    try {
      const groupId = req.params.groupId || req.params.id;
      const rawToken = req.query.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : '');
      const html = await adminInvoiceService.getVisaInvoiceHtml(groupId, req.user, rawToken);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download visa invoice HTML attachment
   * GET /visa/:id/download
   */
  async downloadVisaInvoice(req, res, next) {
    try {
      const groupId = req.params.groupId || req.params.id;
      const rawToken = req.query.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : '');
      const data = await adminInvoiceService.getVisaInvoiceData(groupId, req.user);
      const html = invoiceService.renderVisaInvoiceHtml(data, rawToken);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${data.invoiceNumber || 'Visa-Invoice'}.html"`
      );
      return res.status(200).send(html);
    } catch (error) {
      next(error);
    }
  }

  // ─── 4. ONLINE FLIGHTS (SRDV GDS & LCC) ────────────────────────────────────────

  /**
   * List all Flight invoices with filtering and pagination
   * GET /flight
   */
  async listFlightInvoices(req, res, next) {
    try {
      const result = await adminInvoiceService.listFlightInvoices(req.query);
      return sendSuccess(res, {
        message: 'Flight invoices retrieved successfully',
        data: result.invoices,
        meta: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get flight invoice as JSON data
   * GET /flight/:id
   */
  async getFlightInvoiceData(req, res, next) {
    try {
      const bookingId = req.params.bookingId || req.params.id;
      const data = await adminInvoiceService.getFlightInvoiceData(bookingId, req.user);
      return sendSuccess(res, {
        message: 'Flight invoice data retrieved successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get flight invoice as rendered HTML document
   * GET /flight/:id/html
   */
  async getFlightInvoiceHtml(req, res, next) {
    try {
      const bookingId = req.params.bookingId || req.params.id;
      const rawToken = req.query.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : '');
      const html = await adminInvoiceService.getFlightInvoiceHtml(bookingId, req.user, rawToken);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download flight invoice HTML attachment
   * GET /flight/:id/download
   */
  async downloadFlightInvoice(req, res, next) {
    try {
      const bookingId = req.params.bookingId || req.params.id;
      const data = await adminInvoiceService.getFlightInvoiceData(bookingId, req.user);
      const html = invoiceService.renderInvoiceHtml(data);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${data.invoiceNumber || 'Flight-Invoice'}.html"`
      );
      return res.status(200).send(html);
    } catch (error) {
      next(error);
    }
  }

  // ─── 5. ONLINE HOTELS (SRDV LIVE INVENTORY) ───────────────────────────────────

  /**
   * List all Hotel invoices with filtering and pagination
   * GET /hotel
   */
  async listHotelInvoices(req, res, next) {
    try {
      const result = await adminInvoiceService.listHotelInvoices(req.query);
      return sendSuccess(res, {
        message: 'Hotel invoices retrieved successfully',
        data: result.invoices,
        meta: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get hotel invoice as JSON data
   * GET /hotel/:id
   */
  async getHotelInvoiceData(req, res, next) {
    try {
      const bookingId = req.params.bookingId || req.params.id;
      const data = await adminInvoiceService.getHotelInvoiceData(bookingId, req.user);
      return sendSuccess(res, {
        message: 'Hotel invoice data retrieved successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get hotel invoice as rendered HTML document
   * GET /hotel/:id/html
   */
  async getHotelInvoiceHtml(req, res, next) {
    try {
      const bookingId = req.params.bookingId || req.params.id;
      const rawToken = req.query.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : '');
      const html = await adminInvoiceService.getHotelInvoiceHtml(bookingId, req.user, rawToken);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download hotel invoice HTML attachment
   * GET /hotel/:id/download
   */
  async downloadHotelInvoice(req, res, next) {
    try {
      const bookingId = req.params.bookingId || req.params.id;
      const data = await adminInvoiceService.getHotelInvoiceData(bookingId, req.user);
      const html = invoiceService.renderHotelInvoiceHtml(data);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${data.invoiceNumber || 'Hotel-Invoice'}.html"`
      );
      return res.status(200).send(html);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminInvoiceController();

