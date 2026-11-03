const invoiceRoutes = require('./invoice.routes');
const invoiceService = require('./invoice.service');
const invoiceController = require('./invoice.controller');
const adminInvoiceRoutes = require('./adminInvoice.routes');
const adminInvoiceService = require('./adminInvoice.service');
const adminInvoiceController = require('./adminInvoice.controller');

module.exports = {
  invoiceRoutes,
  invoiceService,
  invoiceController,
  adminInvoiceRoutes,
  adminInvoiceService,
  adminInvoiceController,
};
