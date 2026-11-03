// modules/packages/core/package.validator.js
//
// Manual validation throwing AppError(400) for package endpoints and quote calculations.

const mongoose = require("mongoose");
const { AppError } = require("../../../middleware/errorHandler");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const validateOfferRefs = (refs) => {
  if (refs === undefined) return;
  if (!Array.isArray(refs))
    throw new AppError("offerRefs must be an array", 400);
  refs.forEach((ref, i) => {
    if (!ref.offer || !isValidObjectId(ref.offer)) {
      throw new AppError(`offerRefs[${i}].offer must be a valid ObjectId`, 400);
    }
    if (ref.unitsPerBooking !== undefined) {
      if (!Number.isInteger(ref.unitsPerBooking) || ref.unitsPerBooking < 1) {
        throw new AppError(
          `offerRefs[${i}].unitsPerBooking must be an integer >= 1`,
          400,
        );
      }
    }
  });
};

const validateItinerary = (itinerary) => {
  if (itinerary === undefined) return;
  if (!Array.isArray(itinerary))
    throw new AppError("itinerary must be an array", 400);
  const validRoles = [
    "flight_departure",
    "flight_arrival",
    "hotel_stay",
    "hotel_checkout",
    "guide_tour",
    "activity",
  ];

  itinerary.forEach((day, i) => {
    if (!Number.isInteger(day.day) || day.day < 1) {
      throw new AppError(`itinerary[${i}].day must be an integer >= 1`, 400);
    }
    if (!day.title || typeof day.title !== "string") {
      throw new AppError(`itinerary[${i}].title is required`, 400);
    }
    if (day.assignedOffers) {
      if (!Array.isArray(day.assignedOffers)) {
        throw new AppError(
          `itinerary[${i}].assignedOffers must be an array`,
          400,
        );
      }
      day.assignedOffers.forEach((assign, j) => {
        if (assign.offer && !isValidObjectId(assign.offer)) {
          throw new AppError(
            `itinerary[${i}].assignedOffers[${j}].offer must be a valid ObjectId`,
            400,
          );
        }
        if (assign.role && !validRoles.includes(assign.role)) {
          throw new AppError(
            `itinerary[${i}].assignedOffers[${j}].role must be one of: ${validRoles.join(", ")}`,
            400,
          );
        }
      });
    }
  });
};

const validateCreatePackage = (data) => {
  if (!data.title) throw new AppError("title is required", 400);
  if (!data.destination) throw new AppError("destination is required", 400);

  const offerCount = Array.isArray(data.offerRefs) ? data.offerRefs.length : 0;
  if (offerCount < 2) {
    throw new AppError(
      "A Package must contain at least 2 Offer components (e.g. Flight + Hotel).",
      400,
    );
  }

  if (data.bundleDiscountPercentage !== undefined) {
    if (
      typeof data.bundleDiscountPercentage !== "number" ||
      data.bundleDiscountPercentage < 0 ||
      data.bundleDiscountPercentage > 100
    ) {
      throw new AppError(
        "bundleDiscountPercentage must be a number between 0 and 100",
        400,
      );
    }
  }

  if (data.sellPrice !== undefined) {
    if (typeof data.sellPrice !== "number" || data.sellPrice < 0) {
      throw new AppError("sellPrice must be a number >= 0", 400);
    }
  }

    validateOfferRefs(data.offerRefs);
    validateItinerary(data.itinerary);
    validateGuideInput(data);
  };

  const validateUpdatePackage = (data) => {
    if (data.bundleDiscountPercentage !== undefined) {
      if (
        typeof data.bundleDiscountPercentage !== "number" ||
        data.bundleDiscountPercentage < 0 ||
        data.bundleDiscountPercentage > 100
      ) {
        throw new AppError(
          "bundleDiscountPercentage must be a number between 0 and 100",
          400,
        );
      }
    }

    if (
      data.sellPrice !== undefined &&
      (typeof data.sellPrice !== "number" || data.sellPrice < 0)
    ) {
      throw new AppError("sellPrice must be a number >= 0", 400);
    }

    if (data.offerRefs !== undefined) validateOfferRefs(data.offerRefs);
    if (data.itinerary !== undefined) validateItinerary(data.itinerary);
    validateGuideInput(data);
  };

  const validateGuideInput = (data) => {
    if (
      data.includeGuide !== undefined &&
      typeof data.includeGuide !== "boolean" &&
      data.includeGuide !== "true" &&
      data.includeGuide !== "false"
    ) {
      throw new AppError("includeGuide must be a boolean", 400);
    }

    if (
      data.guideActive !== undefined &&
      typeof data.guideActive !== "boolean" &&
      data.guideActive !== "true" &&
      data.guideActive !== "false"
    ) {
      throw new AppError("guideActive must be a boolean", 400);
    }

    if (data.guidePrice !== undefined && data.guidePrice !== null && data.guidePrice !== "") {
      if (isNaN(Number(data.guidePrice)) || Number(data.guidePrice) < 0) {
        throw new AppError("guidePrice must be a number >= 0", 400);
      }
    }

    if (data.guideLocation !== undefined && data.guideLocation !== null) {
      if (
        typeof data.guideLocation !== "string" &&
        !Array.isArray(data.guideLocation)
      ) {
        throw new AppError(
          "guideLocation must be a string or an array of strings",
          400,
        );
      }
    }

    if (data.guideId !== undefined && data.guideId !== null && data.guideId !== "") {
      if (!isValidObjectId(data.guideId)) {
        throw new AppError("guideId must be a valid ObjectId", 400);
      }
    }
  };

  const validateQuotePreview = (data) => {
    if (data.quantity !== undefined) {
      if (!Number.isInteger(data.quantity) || data.quantity < 1) {
        throw new AppError("quantity must be an integer >= 1", 400);
      }
    }

    if (data.includedOfferIds !== undefined) {
      if (!Array.isArray(data.includedOfferIds)) {
        throw new AppError("includedOfferIds must be an array", 400);
      }
      data.includedOfferIds.forEach((id, i) => {
        if (!isValidObjectId(id)) {
          throw new AppError(
            `includedOfferIds[${i}] must be a valid ObjectId`,
            400,
          );
        }
      });
    }

    if (data.excludedOfferIds !== undefined) {
      if (!Array.isArray(data.excludedOfferIds)) {
        throw new AppError("excludedOfferIds must be an array", 400);
      }
      data.excludedOfferIds.forEach((id, i) => {
        if (!isValidObjectId(id)) {
          throw new AppError(
            `excludedOfferIds[${i}] must be a valid ObjectId`,
            400,
          );
        }
      });
    }

    if (data.swappedOffers !== undefined) {
      if (!Array.isArray(data.swappedOffers)) {
        throw new AppError("swappedOffers must be an array", 400);
      }
      data.swappedOffers.forEach((swap, i) => {
        if (!swap.originalOfferId || !isValidObjectId(swap.originalOfferId)) {
          throw new AppError(
            `swappedOffers[${i}].originalOfferId must be a valid ObjectId`,
            400,
          );
        }
        if (
          !swap.replacementOfferId ||
          !isValidObjectId(swap.replacementOfferId)
        ) {
          throw new AppError(
            `swappedOffers[${i}].replacementOfferId must be a valid ObjectId`,
            400,
          );
        }
      });
    }

    validateGuideInput(data);
  };

const validateBookCustomizedPackage = (data) => {
  if (!Array.isArray(data.travellers) || data.travellers.length === 0) {
    throw new AppError("At least one traveller is required", 400);
  }
  if (!Number.isInteger(data.quantity) || data.quantity < 1) {
    throw new AppError("quantity must be an integer >= 1", 400);
  }
  if (data.travellers.filter((t) => t.isLead).length !== 1) {
    throw new AppError("Exactly one traveller must be marked isLead", 400);
  }
  data.travellers.forEach((t, i) => {
    if (!t.travellerId || !isValidObjectId(t.travellerId)) {
      throw new AppError(
        `travellers[${i}].travellerId must be a valid ObjectId`,
        400,
      );
    }
  });

  validateQuotePreview(data);
};

module.exports = {
  isValidObjectId,
  validateOfferRefs,
  validateItinerary,
  validateCreatePackage,
  validateUpdatePackage,
  validateQuotePreview,
  validateBookCustomizedPackage,
};
