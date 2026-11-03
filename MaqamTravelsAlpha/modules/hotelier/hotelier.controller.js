const hotelierService = require('./hotelier.service');
const { sendSuccess, sendCreated } = require('../../utils/apiResponse');

const listStock = async (req, res, next) => {
  try {
    const hotelId = req.user?.hotelId;
    const stocks = await hotelierService.listOwnStock(hotelId);
    return sendSuccess(res, { message: 'Stock batches retrieved successfully', data: stocks });
  } catch (error) {
    next(error);
  }
};

const createStock = async (req, res, next) => {
  try {
    const hotelId = req.user?.hotelId;
    const userId = req.user?._id;
    const stock = await hotelierService.createStockBatch(hotelId, userId, req.body);
    return sendCreated(res, stock, 'Stock batch submitted for review');
  } catch (error) {
    next(error);
  }
};

const updateStock = async (req, res, next) => {
  try {
    const hotelId = req.user?.hotelId;
    const { id } = req.params;
    const stock = await hotelierService.updateStockBatch(hotelId, id, req.body);
    return sendSuccess(res, { message: 'Stock batch updated and resubmitted for review', data: stock });
  } catch (error) {
    next(error);
  }
};

const addUnits = async (req, res, next) => {
  try {
    const hotelId = req.user?.hotelId;
    const { id } = req.params;
    const { count } = req.body;
    const stock = await hotelierService.addUnitsToBatch(hotelId, id, count);
    return sendSuccess(res, { message: 'Units added and batch resubmitted for review', data: stock });
  } catch (error) {
    next(error);
  }
};

const updateUnitStatus = async (req, res, next) => {
  try {
    const hotelId = req.user?.hotelId;
    const { id, unitId } = req.params;
    const { status } = req.body;
    const stock = await hotelierService.updateUnitStatus(hotelId, id, unitId, status);
    return sendSuccess(res, { message: 'Unit status updated successfully', data: stock });
  } catch (error) {
    next(error);
  }
};

// Get facilities controller

const getHotelAmenities = async(req, res, next)=>{

  try{
    const hotelId = req.user?.hotelId;
    const facilities = await hotelierService.getHotelAmenities(hotelId);
    return sendSuccess(res, {message:"Hotel amenities fetched successfully", data: facilities})
  }catch(error){
    next(error)
  }

}


// update hotel amenities

const updateHotelAmenities = async(req, res, next)=>{
  try{
    const hotelId = req.user?.hotelId;
    const {amenities} = req.body;

    const result =  await hotelierService.updateHotelAmenities(hotelId, amenities);

    return sendSuccess(res, {message:"Hotel amenities updated successfully",data:result})
  }
  catch(error){
    next(error)
  }
}

// get hotelier profile

const getHotelierProfile = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const hotelId = req.user?.hotelId;
    const profile = await hotelierService.getHotelierProfile(userId, hotelId);

    return sendSuccess(res, {
      message: 'Hotelier profile retrieved successfully',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listStock,
  createStock,
  updateStock,
  addUnits,
  updateUnitStatus,
  getHotelAmenities,
  updateHotelAmenities,
  getHotelierProfile

};
