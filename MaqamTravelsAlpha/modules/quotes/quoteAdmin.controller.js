'use strict';

const quoteService = require('./quote.service');
const { sendSuccess } = require('../../utils/apiResponse');

/**
 * ─── ADMIN / CRM QUOTATIONS CONTROLLER ────────────────
 * Management of quotation requests, agent assignments, and proposal dispatches.
 */

/**
 * 1. List all quotations with search and filters (status, agentId, date ranges, search)
 */
const listQuotations = async (req, res, next) => {
  try {
    const {
      status,
      agentId,
      assignedTo,
      fromDate,
      toDate,
      startDate,
      endDate,
      dateFrom,
      dateTo,
      search,
      page,
      limit,
    } = req.query;

    const result = await quoteService.listQuotationsAdmin({
      status,
      agentId,
      assignedTo,
      fromDate,
      toDate,
      startDate,
      endDate,
      dateFrom,
      dateTo,
      search,
      page,
      limit,
    });

    return sendSuccess(res, {
      message: 'Quotations retrieved successfully',
      data: {
        quotations: result.quotations,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get a single quotation by ID
 */
const getQuotationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quotation = await quoteService.getQuotationByIdAdmin(id);
    return sendSuccess(res, {
      message: 'Quotation details retrieved successfully',
      data: { quotation },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Assign an unhandled quotation lead to a specific travel specialist
 */
const assignQuotation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { agentId, assignedTo, specialistId } = req.body;

    const quotation = await quoteService.assignQuotationAdmin(id, {
      agentId: agentId || assignedTo || specialistId,
    });

    return sendSuccess(res, {
      message: 'Quotation lead successfully assigned to travel specialist',
      data: { quotation },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Send/Issue specific quotation proposal to customer
 */
const sendQuotationToCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quotedPrice, price, quoteExpiresAt, expiresAt, notes, remark } = req.body;

    const quotation = await quoteService.sendQuotationToCustomer(id, {
      quotedPrice: quotedPrice ?? price,
      quoteExpiresAt: quoteExpiresAt ?? expiresAt,
      notes: notes ?? remark,
    });

    return sendSuccess(res, {
      message: 'Quotation proposal issued and sent to customer successfully',
      data: { quotation },
    });
  } catch (error) {
    next(error);
  }
};


/**
 * 5. Create new quotation lead (Admin / Staff)
 */
const createQuotation = async (req, res, next) => {
  try {
    const agentId = req.user?._id;
    const quotation = await quoteService.createQuotationAdmin(agentId, req.body);
    return sendSuccess(res, {
      message: 'Quotation created successfully',
      data: { quotation },
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Update existing quotation lead (Admin / Staff)
 */
const updateQuotation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quotation = await quoteService.updateQuotationAdmin(id, req.body);
    return sendSuccess(res, {
      message: 'Quotation updated successfully',
      data: { quotation },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Add conversation / follow-up note to quotation timeline
 */
const addQuotationNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quotation = await quoteService.addQuotationNoteAdmin(id, req.body);
    return sendSuccess(res, {
      message: 'Note added to quotation timeline',
      data: { quotation },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listQuotations,
  getQuotationById,
  assignQuotation,
  sendQuotationToCustomer,
  createQuotation,
  updateQuotation,
  addQuotationNote,
};
