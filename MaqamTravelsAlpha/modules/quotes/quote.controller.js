'use strict';

const quoteService = require('./quote.service');
const { sendSuccess, sendCreated, sendPaginated } = require('../../utils/apiResponse');

/**
 * ─── QUOTE CONTROLLER (Customer Side) ───────────────────
 * Controller layer handling customer quotation requests, tracking, and responses.
 */

const requestQuote = async (req, res, next) => {
  try {
    const user = req.user || null;
    const result = await quoteService.requestQuote({ user, data: req.body });

    if (result.duplicate) {
      return sendSuccess(res, {
        message: 'A quotation request with these details was recently submitted',
        data: { quote: result.quote },
        statusCode: 200,
      });
    }

    return sendCreated(
      res,
      { quote: result.quote },
      'Quotation request submitted successfully. You will receive updates via Email/WhatsApp.'
    );
  } catch (error) {
    next(error);
  }
};

const listMyQuotes = async (req, res, next) => {
  try {
    const user = req.user;
    const { page, limit } = req.query;
    const result = await quoteService.listMyQuotes(user, { page, limit });

    return sendPaginated(res, {
      data: result.quotes,
      total: result.pagination.total,
      page: result.pagination.page,
      limit: result.pagination.limit,
      message: 'My quotation requests retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

const getMyQuote = async (req, res, next) => {
  try {
    const user = req.user;
    const quoteId = req.params.id;
    const quote = await quoteService.getMyQuote(user, quoteId);

    return sendSuccess(res, {
      message: 'Quotation details retrieved successfully',
      data: { quote },
    });
  } catch (error) {
    next(error);
  }
};

const trackQuote = async (req, res, next) => {
  try {
    const { reference, phone } = req.body;
    const quote = await quoteService.trackQuote({ reference, phone });

    return sendSuccess(res, {
      message: 'Quotation status retrieved successfully',
      data: { quote },
    });
  } catch (error) {
    next(error);
  }
};

const respondToQuote = async (req, res, next) => {
  try {
    const user = req.user;
    const quoteId = req.params.id;
    const { action, note } = req.body;
    const quote = await quoteService.respondToQuote(user, quoteId, { action, note });

    return sendSuccess(res, {
      message: `Quotation response (${action}) submitted successfully`,
      data: { quote },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestQuote,
  listMyQuotes,
  getMyQuote,
  trackQuote,
  respondToQuote,
};
