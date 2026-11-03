// modules/packages/offers/offerAdmin.controller.js
//
// Controller handling CRM / Admin standalone offer management and direct bookings.
const {sendSuccess, sendError} = require("../../../utils/apiResponse.js");
const offerService = require("./offer.service");
const cloudinaryService = require("../../../services/cloudinary.service");
const { AppError } = require("../../../middleware/errorHandler");

const parseFormDataOfferBody = (body) => {
  const parsed = { ...body };
  if (typeof parsed.flightRef === "string") {
    try { parsed.flightRef = JSON.parse(parsed.flightRef); } catch {}
  }
  if (typeof parsed.hotelRef === "string") {
    try { parsed.hotelRef = JSON.parse(parsed.hotelRef); } catch {}
  }
  if (typeof parsed.inclusions === "string") {
    try { parsed.inclusions = JSON.parse(parsed.inclusions); } catch {}
  }
  if (typeof parsed.exclusions === "string") {
    try { parsed.exclusions = JSON.parse(parsed.exclusions); } catch {}
  }
  if (typeof parsed.images === "string") {
    try { parsed.images = JSON.parse(parsed.images); } catch { parsed.images = [parsed.images]; }
  }
  if (parsed.sellPrice !== undefined && typeof parsed.sellPrice === "string") {
    parsed.sellPrice = Number(parsed.sellPrice);
  }
  if (parsed.originalPrice !== undefined && typeof parsed.originalPrice === "string") {
    parsed.originalPrice = Number(parsed.originalPrice);
  }
  if (parsed.discountPercentage !== undefined && typeof parsed.discountPercentage === "string") {
    parsed.discountPercentage = Number(parsed.discountPercentage);
  }
  if (parsed.isActive !== undefined && typeof parsed.isActive === "string") {
    parsed.isActive = parsed.isActive === "true";
  }
  return parsed;
};

const adminCreateOffer = async (req, res, next) => {
  try {
    const data = parseFormDataOfferBody(req.body);

    const files = req.files || (req.file ? [req.file] : []);
    if (files.length > 0) {
      const uploadResults = await cloudinaryService.uploadMultipleBuffers(files, {
        folder: "travel-agency/offers",
      });
      const fileUrls = uploadResults.map((r) => r.url);
      data.images = Array.isArray(data.images)
        ? [...data.images, ...fileUrls]
        : fileUrls;
    }

    const offer = await offerService.createOffer(data, req.user.id);
    res.status(201).json({
      success: true,
      message: "Standalone retail offer created successfully",
      offer,
    });
  } catch (error) {
    next(error);
  }
};

const adminListOffers = async (req, res) => {
  const result = await offerService.listOffers(req.query, true);
 

  return sendSuccess(res, {message:"Offers retrieved successfully", data:result.offers, meta:result.meta})
};

const adminGetOffer = async (req, res) => {
  const offer = await offerService.getOfferById(req.params.id, true);
 

  return sendSuccess(res, {message:"Offer retrieved successfully", data:offer})
};

const adminUpdateOffer = async (req, res, next) => {
  try {
    const data = parseFormDataOfferBody(req.body);

    const files = req.files || (req.file ? [req.file] : []);
    if (files.length > 0) {
      const uploadResults = await cloudinaryService.uploadMultipleBuffers(files, {
        folder: "travel-agency/offers",
      });
      const fileUrls = uploadResults.map((r) => r.url);
      data.images = Array.isArray(data.images)
        ? [...data.images, ...fileUrls]
        : fileUrls;
    }

    const offer = await offerService.updateOffer(req.params.id, data);
    res.status(200).json({
      success: true,
      message: "Offer updated successfully",
      offer,
    });
  } catch (error) {
    next(error);
  }
};

const adminToggleOfferStatus = async (req, res) => {
  const offer = await offerService.toggleOfferStatus(req.params.id);
  

  return sendSuccess(res, {message:`Offer status changed to ${offer.isActive ?"active":"inactive"}`, data:offer})
};

const adminListOfferBookings = async (req, res) => {
  const result = await offerService.listOfferBookingsAdmin(req.query);


  return sendSuccess(res, {message:"Offer bookings retrieved successfully", data:result.bookings,  meta:result.meta})
};

const adminBookOfferForCustomer = async (req, res) => {
  const { customerId, offerId, travellers, quantity, payment } = req.body;
  const result = await offerService.bookOfferForCustomer({
    customerId,
    offerId,
    travellers,
    quantity,
    payment,
    agentId: req.user.id,
  });

  

  return sendCreated(res, {message:"Offer booked successfully", data:result.booking})

};

const adminCancelOfferBooking = async (req, res) => {
  const { reason } = req.body;
  const booking = await offerService.cancelOfferBookingAdmin(req.params.id, reason);
  res.status(200).json({
    success: true,
    message: "Offer booking cancelled and stock released back to inventory",
    booking,
  });
};

const adminUploadOfferImages = async (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    if (files.length === 0) {
      throw new AppError("No image files provided for upload", 400);
    }

    const uploadResults = await cloudinaryService.uploadMultipleBuffers(files, {
      folder: "travel-agency/offers",
    });

    const urls = uploadResults.map((r) => r.url);

    sendSuccess(res, {
      message: "Offer images uploaded successfully",
      data: {
        urls,
        assets: uploadResults,
      },
    });
  } catch (error) {
    next(error);
  }
};

const adminAttachOfferImages = async (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    let newUrls = req.body.images || [];

    if (typeof newUrls === "string") {
      newUrls = [newUrls];
    }

    if (files.length > 0) {
      const uploadResults = await cloudinaryService.uploadMultipleBuffers(files, {
        folder: "travel-agency/offers",
      });
      newUrls = [...newUrls, ...uploadResults.map((r) => r.url)];
    }

    if (newUrls.length === 0) {
      throw new AppError("No image files or URLs provided", 400);
    }

    const offer = await offerService.addOfferImages(req.params.id, newUrls);

    sendSuccess(res, {message: "Images attached to offer successfully", data: offer,});
  } catch (error) {
    next(error);
  }
};

const adminRemoveOfferImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) throw new AppError("imageUrl is required in request body", 400);

    const offer = await offerService.removeOfferImage(req.params.id, imageUrl);

    const publicId = cloudinaryService.extractPublicIdFromUrl(imageUrl);
    if (publicId) {
      cloudinaryService.deleteByPublicId(publicId).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: "Image removed from offer successfully",
      offer,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  adminCreateOffer,
  adminListOffers,
  adminGetOffer,
  adminUpdateOffer,
  adminToggleOfferStatus,
  adminListOfferBookings,
  adminBookOfferForCustomer,
  adminCancelOfferBooking,
  adminUploadOfferImages,
  adminAttachOfferImages,
  adminRemoveOfferImage,
};
