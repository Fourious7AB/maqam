const crmService = require("./crm.service");
const {
  sendSuccess,
  sendCreated,
  sendNotFound,
  sendPaginated,
} = require("../../utils/apiResponse");

/**
 * ─── CRM CONTROLLER ────────────────────────────────────
 * Thin layer: calls service, sends response
 */

const listLeads = async (req, res, next) => {
  try {
    const { status, stage, priority, source, assignedTo, search, page, limit } = req.query;

    const result = await crmService.listLeads({
      status,
      stage,
      priority,
      source,
      assignedTo,
      search,
      page: page || 1,
      limit: limit || 20,
    });


    return sendSuccess(res, {
      message: 'Leads retrieved',
      data: {
        leads: result.leads,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getLeadDetails = async (req, res, next) => {
  try {
    const leadId = req.params.id || req.params.leadId;
    const lead = await crmService.getLeadById(leadId);
    if (!lead) return sendNotFound(res, 'Lead not found');
    return sendSuccess(res, { message: 'Lead retrieved', data: { lead } });
  } catch (error) {
    next(error);
  }
};

const createLead = async (req, res, next) => {
  try {
    const agentId = req.user?.id || req.user?._id;
    const lead = await crmService.createLead(agentId, req.body);
    return sendCreated(res, { lead }, 'Lead created successfully');
  } catch (error) {
    next(error);
  }
};

const updateLead = async (req, res, next) => {
  try {
    const leadId = req.params.id || req.params.leadId;
    const lead = await crmService.updateLead(leadId, req.body);
    if (!lead) return sendNotFound(res, 'Lead not found');
    return sendSuccess(res, { message: 'Lead updated', data: { lead } });
  } catch (error) {
    next(error);
  }
};

const addLeadNote = async (req, res, next) => {
  try {
    const leadId = req.params.id || req.params.leadId;
    const { note } = req.body;
    const lead = await crmService.addLeadNote(leadId, note);
    if (!lead) return sendNotFound(res, 'Lead not found');
    return sendSuccess(res, { message: 'Note added', data: { lead } });
  } catch (error) {
    next(error);
  }
};

const convertLead = async (req, res, next) => {
  try {
    const leadId = req.params.id || req.params.leadId;
    const { customerType, bookingId, bookingData } = req.body;
    const lead = await crmService.convertLeadToBooking(leadId, {
      customerType,
      bookingId,
      bookingData,
    });
    if (!lead) return sendNotFound(res, 'Lead not found');
    return sendSuccess(res, { message: 'Lead converted', data: { lead } });
  } catch (error) {
    next(error);
  }
};


const getAgentStats = async (req, res, next) => {
  try {
    const agentId = req.user?.id;
    const stats = await crmService.getAgentStatistics(agentId);
    return sendSuccess(res, { message: "Agent statistics", data: stats });
  } catch (error) {
    next(error);
  }
};

const getPipelineOverview = async (req, res, next) => {
  try {
    const overview = await crmService.getPipelineOverview();
    return sendSuccess(res, { message: "Pipeline overview", data: overview });
  } catch (error) {
    next(error);
  }
};

// ─── CRM HOTEL HANDLERS ─────────────────────────────────

const createHotel = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const hotel = await crmService.createHotel(req.body, userId);
    return sendCreated(res, hotel, "Hotel created successfully");
  } catch (error) {
    next(error);
  }
};

const listHotels = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    const result = await crmService.listHotels({ page, limit, search });
    return sendSuccess(res, {
      message: "Hotels retrieved",
      data: result.hotels,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

const getHotelDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const hotel = await crmService.getHotelById(id);
    return sendSuccess(res, {
      message: "Hotel details retrieved",
      data: hotel,
    });
  } catch (error) {
    next(error);
  }
};

const updateHotel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const hotel = await crmService.updateHotel(id, req.body);
    return sendSuccess(res, {
      message: "Hotel updated successfully",
      data: hotel,
    });
  } catch (error) {
    next(error);
  }
};

const deleteHotel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;
    const result = await crmService.deleteHotel(id, { permanent });
    return sendSuccess(res, { message: result.message, data: result });
  } catch (error) {
    next(error);
  }
};

// ─── CRM USER HANDLER ───────────────────────────────────

const createCrmUser = async (req, res, next) => {
  try {
    const adminUserId = req.user?._id;
    const user = await crmService.createCrmUser(req.body, adminUserId);
    return sendCreated(res, user, "CRM user created successfully");
  } catch (error) {
    next(error);
  }
};

// ─── CRM HOTEL STOCK REVIEW HANDLERS ─────────────────────

const listPendingHotelStock = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await crmService.listPendingHotelStock({ page, limit });
    return sendSuccess(res, {
      message: "Pending hotel stock retrieved",
      data: result.stocks,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

const reviewHotelStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reviewerUserId = req.user?._id;
    const stock = await crmService.reviewHotelStock(
      id,
      req.body,
      reviewerUserId,
    );
    return sendSuccess(res, {
      message: `Stock batch ${stock.reviewStatus}`,
      data: stock,
    });
  } catch (error) {
    next(error);
  }
};

const listApprovedHotelStock = async (req, res, next) => {
  try {
    const stocks = await crmService.listApprovedHotelStock();
    return sendSuccess(res, {
      message: "Approved hotel stock retrieved",
      data: stocks,
    });
  } catch (error) {
    next(error);
  }
};

// ─── CRM USER MANAGEMENT HANDLERS ───────────────────────

const listUsers = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      role,
      isActive,
      isVerified,
      isPhoneVerified,
      search,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await crmService.listUsers({
      page,
      limit,
      role,
      isActive,
      isVerified,
      isPhoneVerified,
      search,
      sortBy,
      sortOrder,
    });

    const total = result.meta?.total ?? result.total ?? 0;
    const pageNum = result.meta?.page ?? result.page ?? (parseInt(page, 10) || 1);
    const limitNum = result.meta?.limit ?? result.limit ?? (parseInt(limit, 10) || 10);

    return sendPaginated(res, {
      data: result.users,
      total,
      page: pageNum,
      limit: limitNum,
      message: "Users retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getUserDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await crmService.getUserById(id);
    return sendSuccess(res, {
      message: "User details retrieved successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminUser = req.user;
    const updated = await crmService.updateUser(id, req.body, adminUser);
    return sendSuccess(res, {
      message: "User updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;
    const adminUser = req.user;
    const result = await crmService.deleteUser(id, adminUser, { permanent });
    return sendSuccess(res, { message: result.message, data: result });
  } catch (error) {
    next(error);
  }
};

// ─── CRM FINANCE & REVENUE CONTROLLER ─────────────────────

const getFinanceOverview = async (req, res, next) => {
  try {
    const startDate = req.query?.startDate || req.body?.startDate;
    const endDate = req.query?.endDate || req.body?.endDate;
    const currency = req.query?.currency || req.body?.currency;

    const result = await crmService.getFinanceOverview({
      startDate,
      endDate,
      currency,
    });

    return sendSuccess(res, {
      message: 'Finance overview retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const listTransactions = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      status,
      paymentMethod,
      bookingType,
      currency,
      startDate,
      endDate,
      search,
      sortBy,
      sortOrder,
    } = { ...req.query, ...req.body };

    const result = await crmService.listTransactions({
      page,
      limit,
      status,
      paymentMethod,
      bookingType,
      currency,
      startDate,
      endDate,
      search,
      sortBy,
      sortOrder,
    });

    return sendPaginated(res, {
      data: result.transactions,
      total: result.meta.total,
      page: result.meta.page,
      limit: result.meta.limit,
      message: 'Transactions retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

const getTransactionDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const transaction = await crmService.getTransactionById(id);
    return sendSuccess(res, {
      message: 'Transaction details retrieved successfully',
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

const listRefunds = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      status,
      currency,
      paymentMethod,
      bookingType,
      startDate,
      endDate,
      search,
      sortBy,
      sortOrder,
    } = { ...req.query, ...req.body };

    const result = await crmService.listRefunds({
      page,
      limit,
      status,
      currency,
      paymentMethod,
      bookingType,
      startDate,
      endDate,
      search,
      sortBy,
      sortOrder,
    });

    return sendPaginated(res, {
      data: result.refunds,
      total: result.meta.total,
      page: result.meta.page,
      limit: result.meta.limit,
      message: 'Payment refunds history retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

const updateRefundStatus = async (req, res, next) => {
  try {
    const refundId = req.params.refundId || req.params.id;
    const { status, reason, gatewayResponse } = req.body;

    const updated = await crmService.updateRefundStatus(refundId, {
      status,
      reason,
      gatewayResponse,
    });

    return sendSuccess(res, {
      message: 'Payment refund status updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ─── CRM CUSTOMERS CONTROLLER ────────────────────────────

const listCustomers = async (req, res, next) => {
  try {
    const { page, limit, search, isActive, sortBy, sortOrder } = req.query;

    const result = await crmService.listCustomers({
      page,
      limit,
      search,
      isActive,
      sortBy,
      sortOrder,
    });

    return sendPaginated(res, {
      data: result.customers,
      total: result.meta.total,
      page: result.meta.page,
      limit: result.meta.limit,
      message: 'Customers retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

const getCustomerDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customer = await crmService.getCustomerById(id);
    return sendSuccess(res, {
      message: 'Customer details retrieved successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

const getCustomerTravellers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await crmService.getCustomerTravellers(id);
    return sendSuccess(res, {
      message: 'Customer travellers retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listLeads,
  getLeadDetails,
  createLead,
  updateLead,
  addLeadNote,
  convertLead,
  getAgentStats,
  getPipelineOverview,
  createHotel,
  listHotels,
  getHotelDetails,
  updateHotel,
  deleteHotel,
  createCrmUser,
  listPendingHotelStock,
  reviewHotelStock,
  listApprovedHotelStock,
  listUsers,
  getUserDetails,
  updateUser,
  deleteUser,
  getFinanceOverview,
  listTransactions,
  getTransactionDetails,
  listRefunds,
  updateRefundStatus,
  listCustomers,
  getCustomerDetails,
  getCustomerTravellers,
};
