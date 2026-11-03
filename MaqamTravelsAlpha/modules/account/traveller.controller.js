const travellerService = require("./traveller.service");
const {
  sendSuccess,
  sendCreated,
  sendNotFound,
  sendError,
} = require("../../utils/apiResponse");

const createTraveller = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const travellerData = req.body;
    const traveller = await travellerService.createTraveller(
      userId,
      travellerData,
    );
    sendCreated(res, traveller, "Traveller created successfully");
  } catch (error) {
    next(error);
  }
};

const getTravellersByUserId = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const data = await travellerService.getTravellersByUserId(userId);
    sendSuccess(res, {data});
  } catch (error) {
    next(error);
  }
};

const getTravellerById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const traveller = await travellerService.getTravellerById(
      userId,
      req.params.travellerId,
    );
    sendSuccess(res, {data: traveller});
  } catch (error) {
    next(error);
  }
};
const updateTraveller = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const travellerData = req.body;
    const traveller = await travellerService.updateTraveller(
      userId,
      req.params.travellerId,
      travellerData,
    );
    sendSuccess(res,{ data: traveller});
  } catch (error) {
    next(error);
  }
};
const deleteTraveller = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const traveller = await travellerService.deleteTraveller(
      userId,
      req.params.travellerId,
    );
    sendSuccess(res,{data: traveller});
  } catch (error) {
    next(error);
  }
};

const setDefaultTraveller = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const traveller = await travellerService.setDefaultTraveller(
      userId,
      req.params.travellerId
    );
    sendSuccess(res, { data: traveller, message: "Default traveller set successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTraveller,
  getTravellersByUserId,
  getTravellerById,
  updateTraveller,
  setDefaultTraveller,
  deleteTraveller,
};
