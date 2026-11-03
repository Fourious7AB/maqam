const Traveller = require('./traveller.model');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

const createTraveller = async (userId,travellerData) => {
     if (travellerData.isDefault) {
        await Traveller.updateMany(
            { userId },
            { isDefault: false }
        );
    }
    const traveller = new Traveller({
        userId,
        ...travellerData
    });

    await traveller.save();
    logger.info('Traveller created successfully');
    return traveller;
  
};

const getTravellersByUserId = async (userId) => {
    const travellers = await Traveller.find({ userId });
    logger.info(`Retrieved ${travellers?.length || 0} travellers for user ${userId}`);
    return travellers || [];
}   
    
const getTravellerById = async (userId, travellerId) => {
    const traveller = await Traveller.findOne({ _id: travellerId, userId });
    if (!traveller) {
        throw new AppError('Traveller not found or access denied', 404);
    }
    logger.info(`Traveller ${traveller._id} retrieved`);
    return traveller;
}       


const updateTraveller = async (userId, travellerId, travellerData) => {
    const traveller = await Traveller.findOne({ _id: travellerId, userId });
    if (!traveller) {
        throw new AppError('Traveller not found or access denied', 404);
    }
    if (travellerData.isDefault) {
        await Traveller.updateMany(
            { userId, _id: { $ne: travellerId } },
            { isDefault: false }
        );
    }
    Object.assign(traveller, travellerData);
    await traveller.save();
    logger.info(`Traveller ${traveller._id} updated`);
    return traveller;
}

const setDefaultTraveller = async (userId, travellerId) => {
    const traveller = await Traveller.findOne({ _id: travellerId, userId });
    if (!traveller) {
        throw new AppError('Traveller not found or access denied', 404);
    }
    await Traveller.updateMany(
        { userId },
        { isDefault: false }
    );
    traveller.isDefault = true;
    await traveller.save();
    logger.info(`Traveller ${traveller._id} marked as default for user ${userId}`);
    return traveller;
};

const deleteTraveller = async (userId, travellerId) => {
    const deletedTraveller = await Traveller.findOneAndDelete({ _id: travellerId, userId });
    if (!deletedTraveller) {
        throw new AppError('Traveller not found or access denied', 404);
    }   
    logger.info(`Traveller ${deletedTraveller._id} deleted`);
    return deletedTraveller;
}
module.exports = {
    createTraveller,
    getTravellersByUserId,
    getTravellerById,
    updateTraveller,
    setDefaultTraveller,
    deleteTraveller
};
