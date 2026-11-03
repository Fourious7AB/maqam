// modules/packages/stock/stockAdmin.controller.js
//
// Controller handling CRM / Admin Stock Management for wholesale bulk seats and hotel room allotments.

const stockService = require("./stock.service");
const {
  sendSuccess,
  sendError,
  sendCreated,
} = require("../../../utils/apiResponse");

const adminCreateFlightStock = async (req, res) => {
  const stock = await stockService.createFlightStock(req.body, req.user.id);

  return sendCreated(res, {
    message: "Flight ticket stock batch created successfully",
    data: stock,
  });
};

const adminListFlightStocks = async (req, res) => {
  const result = await stockService.listFlightStocks(req.query);

  return sendSuccess(res, {
    message: "Flight ticket stock batch list retrieved successfully",
    data: result.stocks,
    meta: result.meta,
  });
};

const adminGetFlightStock = async (req, res) => {
  const stock = await stockService.getFlightStockById(req.params.id);
  return sendSuccess(res, {
    message: "Flight ticket stock batch retrieved successfully",
    data: stock,
  });
};

const adminUpdateFlightStock = async (req, res) => {
  const stock = await stockService.updateFlightStock(
    req.params.id,
    req.body,
    req.user.id,
  );
  return sendSuccess(res, {
    message: "Flight ticket stock batch updated successfully",
    data: stock,
  });
};

const adminCreateHotelStock = async (req, res) => {
  const stock = await stockService.createHotelStock(req.body, req.user.id);
  return sendCreated(res, {
    message: "Hotel room allotment stock created successfully",
    data: stock,
  });
};

const adminListHotelStocks = async (req, res) => {
  const result = await stockService.listHotelStocks(req.query);
  return sendSuccess(res, {
    message: "Hotel room allotment stock list retrieved successfully",
    data: result.stocks,
    meta: result.pagination,
  });
};

const adminGetHotelStock = async (req, res) => {
  const stock = await stockService.getHotelStockById(req.params.id);
  return sendSuccess(res, {
    message: "Hotel stock retrieved successfully",
    data: stock,
  });
};

const adminUpdateHotelStock = async (req, res) => {
  const stock = await stockService.updateHotelStock(
    req.params.id,
    req.body,
    req.user.id,
  );
  return sendSuccess(res, {
    message: "Hotel room allotment stock updated successfully",
    data: stock,
  });
};

const adminGetStockOverview = async (req, res) => {
  const overview = await stockService.getStockOverview();
  return sendSuccess(res, {
    message: "Stock overview retrieved successfully",
    data: overview,
  });
};

module.exports = {
  adminCreateFlightStock,
  adminListFlightStocks,
  adminGetFlightStock,
  adminUpdateFlightStock,
  adminCreateHotelStock,
  adminListHotelStocks,
  adminGetHotelStock,
  adminUpdateHotelStock,
  adminGetStockOverview,
};
