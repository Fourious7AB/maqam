// modules/packages/user/packageUser.controller.js
const packageService = require("../core/package.service");
const { validateQuotePreview } = require("../core/package.validator");

const {sendSuccess}=require("../../../utils/apiResponse")

// GET /api/v1/packages — handles both "browse all" and "filtered search"
const getPackages = async (req, res) => {
  const result = await packageService.searchPackages(req.query);
  

  return sendSuccess(res, {message:"Packages fetched successfully", data:result, meta:result.meta})


};

// GET /api/v1/packages/:id — returns package details, itemized breakdown & swap alternatives
const getPackageDetail = async (req, res) => {
  const pkg = await packageService.getPackageById(req.params.id);
  

  return sendSuccess(res, {message:"Package details fetched successfully", data:pkg})
};

// POST /api/v1/packages/:id/quote — dynamic customizer quote recalculation (Option A)
const getQuotePreview = async (req, res) => {
  validateQuotePreview(req.body);
  const quote = await packageService.calculateCustomQuote(req.params.id, req.body);

  return sendSuccess(res, {message:"Quote review fetched successfully", data:quote})
};

module.exports = {
  getPackages,
  getPackageDetail,
  getQuotePreview,
};
