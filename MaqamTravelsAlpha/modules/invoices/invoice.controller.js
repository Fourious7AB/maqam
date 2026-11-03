const invoiceService = require('./invoice.service');
const { sendSuccess } = require('../../utils/apiResponse');
const logger = require('../../utils/logger');

/**
 * Controller to handle invoice rendering and retrieval for live flights (GDS & LCC)
 */
class InvoiceController {
  /**
   * Get invoice as JSON data
   * Useful for frontend rendering (React, Next.js, Vue, mobile apps)
   */
  async getInvoiceData(req, res, next) {
    try {
      const bookingId = req.params.bookingId || req.params.id;
      const data = await invoiceService.getInvoiceData(bookingId, req.user);

      return sendSuccess(res, {
        message: 'Invoice data retrieved successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get invoice as rendered HTML document
   * Directly viewable in browser, iframe, or printed to PDF
   */
  async getInvoiceHtml(req, res, next) {
    try {
      const bookingId = req.params.bookingId || req.params.id;
      const rawToken = req.query?.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : '');
      const html = await invoiceService.getInvoiceHtml(bookingId, req.user, rawToken);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download invoice HTML attachment
   */
  async downloadInvoice(req, res, next) {
    try {
      const bookingId = req.params.bookingId || req.params.id;
      const rawToken = req.query?.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : '');
      const data = await invoiceService.getInvoiceData(bookingId, req.user);
      const html = invoiceService.renderInvoiceHtml(data, rawToken);

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

  /**
   * Get hotel invoice as JSON data
   */
  async getHotelInvoiceData(req, res, next) {
    try {
      const bookingId = req.params.bookingId || req.params.id;
      const data = await invoiceService.getHotelInvoiceData(bookingId, req.user);

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
   */
  async getHotelInvoiceHtml(req, res, next) {
    try {
      const bookingId = req.params.bookingId || req.params.id;
      const html = await invoiceService.getHotelInvoiceHtml(bookingId, req.user);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download hotel invoice HTML attachment
   */
  async downloadHotelInvoice(req, res, next) {
    try {
      const bookingId = req.params.bookingId || req.params.id;
      const data = await invoiceService.getHotelInvoiceData(bookingId, req.user);
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

  /**
   * Get package invoice as JSON data
   */
  async getPackageInvoiceData(req, res, next) {
    try {
      const { bookingId } = req.params;
      const data = await invoiceService.getPackageInvoiceData(bookingId, req.user);

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
   */
  async getPackageInvoiceHtml(req, res, next) {
    try {
      const { bookingId } = req.params;
      const rawToken = req.query.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : '');
      const html = await invoiceService.getPackageInvoiceHtml(bookingId, req.user, rawToken);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download package invoice HTML attachment
   */
  async downloadPackageInvoice(req, res, next) {
    try {
      const bookingId = req.params.bookingId || req.params.id;
      const rawToken = req.query.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : '');
      const data = await invoiceService.getPackageInvoiceData(bookingId, req.user);
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

  /**
   * Get offer invoice as JSON data
   */
  async getOfferInvoiceData(req, res, next) {
    try {
      const bookingId = req.params.bookingId || req.params.id;
      const data = await invoiceService.getOfferInvoiceData(bookingId, req.user);

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
   */
  async getOfferInvoiceHtml(req, res, next) {
    try {
      const bookingId = req.params.bookingId || req.params.id;
      const rawToken = req.query.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : '');
      const html = await invoiceService.getOfferInvoiceHtml(bookingId, req.user, rawToken);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download offer invoice HTML attachment
   */
  async downloadOfferInvoice(req, res, next) {
    try {
      const bookingId = req.params.bookingId || req.params.id;
      const rawToken = req.query.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : '');
      const data = await invoiceService.getOfferInvoiceData(bookingId, req.user);
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

  /**
   * Get visa invoice as JSON data
   */
  async getVisaInvoiceData(req, res, next) {
    try {
      const groupId = req.params.groupId || req.params.id;
      const data = await invoiceService.getVisaInvoiceData(groupId, req.user);

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
   */
  async getVisaInvoiceHtml(req, res, next) {
    try {
      const groupId = req.params.groupId || req.params.id;
      const rawToken = req.query.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : '');
      const html = await invoiceService.getVisaInvoiceHtml(groupId, req.user, rawToken);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download visa invoice HTML attachment
   */
  async downloadVisaInvoice(req, res, next) {
    try {
      const groupId = req.params.groupId || req.params.id;
      const rawToken = req.query.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : '');
      const data = await invoiceService.getVisaInvoiceData(groupId, req.user);
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

  // ─── ADMIN SPECIFIC INVOICES LISTING CONTROLLER METHODS (TIER 2) ──────────────

  /**
   * GET /api/v1/invoices/admin/flight
   */
  async adminListFlightInvoices(req, res, next) {
    try {
      const result = await invoiceService.adminListFlightInvoices(req.query);
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
   * GET /api/v1/invoices/admin/hotel
   */
  async adminListHotelInvoices(req, res, next) {
    try {
      const result = await invoiceService.adminListHotelInvoices(req.query);
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
   * GET /api/v1/invoices/admin/package
   */
  async adminListPackageInvoices(req, res, next) {
    try {
      const result = await invoiceService.adminListPackageInvoices(req.query);
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
   * GET /api/v1/invoices/admin/offer
   */
  async adminListOfferInvoices(req, res, next) {
    try {
      const result = await invoiceService.adminListOfferInvoices(req.query);
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
   * GET /api/v1/invoices/admin/visa
   */
  async adminListVisaInvoices(req, res, next) {
    try {
      const result = await invoiceService.adminListVisaInvoices(req.query);
      return sendSuccess(res, {
        message: 'Visa invoices retrieved successfully',
        data: result.invoices,
        meta: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InvoiceController();

