// modules/packages/core/package.service.js
const Package = require("../models/package.model");
const Offer = require("../offers/offer.model");
const TicketStock = require("../stock/ticketStock.model");
const HotelStock = require("../stock/hotelStock.model");
const { availabilityForStock } = require("./availability.service");
const logger = require("../../../utils/logger");
const { AppError } = require("../../../middleware/errorHandler");

/**
 * ─── POPULATE DEFINITIONS ──────────────────────────────
 */
const CUSTOMER_OFFER_POPULATE = {
  path: "offerRefs.offer",
  populate: [
    {
      path: "flightRef.stock",
      select: "airline flightNumber departure arrival origin destination units",
    },
    {
      path: "hotelRef.stock",
      select: "hotelId roomType checkIn checkOut units reviewStatus",
      populate: {
        path: "hotelId",
        select: "name location starRating isActive",
      },
    },
  ],
};

const ADMIN_OFFER_POPULATE = {
  path: "offerRefs.offer",
  populate: [
    {
      path: "flightRef.stock",
    },
    {
      path: "hotelRef.stock",
      populate: { path: "hotelId" },
    },
  ],
};

/**
 * ─── AVAILABILITY & PRICING CALCULATIONS ───────────────
 */

/**
 * Calculate availability for a package based on populated offerRefs
 */
const calculateAvailability = (pkg) => {
  const counts = [];

  // Check offer availability
  for (const ref of pkg.offerRefs || []) {
    const offer = ref.offer;
    if (!offer) continue;
    const unitsMultiplier = ref.unitsPerBooking || 1;

    if (offer.itemType === "flight" && offer.flightRef?.stock) {
      const flightUnits =
        (offer.flightRef.unitsPerBooking || 1) * unitsMultiplier;
      counts.push(availabilityForStock(offer.flightRef.stock, flightUnits));
    } else if (offer.itemType === "hotel" && offer.hotelRef?.stock) {
      const hotelUnits =
        (offer.hotelRef.unitsPerBooking || 1) * unitsMultiplier;
      counts.push(availabilityForStock(offer.hotelRef.stock, hotelUnits));
    }
  }

  if (counts.length === 0) return 99; // Default unlimited if no physical stock capped
  return Math.min(...counts);
};

/**
 * Calculate base unbundled sum & base package sell price
 */
const calculateBasePackagePricing = (pkgData) => {
  let unbundledTotal = 0;

  for (const ref of pkgData.offerRefs || []) {
    const offer = ref.offer;
    if (offer && typeof offer.sellPrice === "number") {
      unbundledTotal += offer.sellPrice * (ref.unitsPerBooking || 1);
    }
  }

  const discountPercent = pkgData.bundleDiscountPercentage || 0;
  const sellPrice = Math.round(unbundledTotal * (1 - discountPercent / 100));

  return {
    unbundledTotal,
    discountPercent,
    sellPrice,
  };
};

/**
 * Calculate total vendor wholesale cost price, gross profit & margin %
 */
const calculateCostPrice = (pkg) => {
  let totalCostPrice = 0;

  for (const ref of pkg.offerRefs || []) {
    const offer = ref.offer;
    if (!offer) continue;
    const units = ref.unitsPerBooking || 1;

    if (offer.itemType === "flight" && offer.flightRef?.stock) {
      const stockCost = offer.flightRef.stock.costPerUnit || 0;
      const stockUnits = offer.flightRef.unitsPerBooking || 1;
      totalCostPrice += stockCost * stockUnits * units;
    } else if (offer.itemType === "hotel" && offer.hotelRef?.stock) {
      const stockCost = offer.hotelRef.stock.costPerUnit || 0;
      const stockUnits = offer.hotelRef.unitsPerBooking || 1;
      totalCostPrice += stockCost * stockUnits * units;
    }
  }

  const baseSellPrice = pkg.sellPrice || 0;
  const grossProfit = baseSellPrice - totalCostPrice;
  const profitMarginPercentage =
    baseSellPrice > 0
      ? Number(((grossProfit / baseSellPrice) * 100).toFixed(2))
      : 0;

  return {
    totalCostPrice,
    grossProfit,
    profitMarginPercentage,
  };
};

/**
 * Itemized breakdown of default components in the package
 */
const calculatePriceBreakdown = (pkg) => {
  const items = [];

  for (const ref of pkg.offerRefs || []) {
    const offer = ref.offer;
    if (!offer) continue;
    items.push({
      id: offer._id,
      refId: ref._id,
      title: offer.title,
      itemType: offer.itemType,
      retailPrice: offer.sellPrice,
      unitsPerBooking: ref.unitsPerBooking || 1,
      totalRetail: (offer.sellPrice || 0) * (ref.unitsPerBooking || 1),
      isOptional: ref.isOptional,
      isDefaultSelected: ref.isDefaultSelected,
      allowSwap: ref.allowSwap,
      details: {
        destination: offer.destination,
        images: offer.images,
        flightDetails: offer.flightRef?.stock || null,
        hotelDetails: offer.hotelRef?.stock || null,
      },
    });
  }

  return items;
};

/**
 * Find eligible swap alternatives for swappable components
 */
const getAvailableAlternatives = async (pkg) => {
  const alternatives = {
    offers: {},
  };

  for (const ref of pkg.offerRefs || []) {
    if (!ref.allowSwap || !ref.offer) continue;
    const originalOffer = ref.offer;

    const candidateOffers = await Offer.find({
      _id: { $ne: originalOffer._id },
      itemType: originalOffer.itemType,
      destination: { $regex: new RegExp(`^${pkg.destination}$`, "i") },
      isActive: true,
    })
      .populate(
        "flightRef.stock",
        "airline flightNumber departure arrival origin destination units",
      )
      .populate({
        path: "hotelRef.stock",
        select: "hotelId roomType checkIn checkOut units reviewStatus",
        populate: {
          path: "hotelId",
          select: "name location starRating isActive",
        },
      })
      .limit(10);

    alternatives.offers[originalOffer._id] = candidateOffers.map(
      (candidate) => ({
        _id: candidate._id,
        title: candidate.title,
        itemType: candidate.itemType,
        destination: candidate.destination,
        sellPrice: candidate.sellPrice,
        priceDelta: candidate.sellPrice - originalOffer.sellPrice,
        images: candidate.images,
        flightDetails: candidate.flightRef?.stock || null,
        hotelDetails: candidate.hotelRef?.stock || null,
      }),
    );
  }

  return alternatives;
};

/**
 * ─── DYNAMIC CUSTOMIZER QUOTE CALCULATION (OPTION A) ───────
 */
const calculateCustomQuote = async (
  packageId,
  {
    quantity = 1,
    excludedOfferIds = [],
    swappedOffers = [],
    includedOfferIds,
    includeGuide,
    guideSelected,
    guidePrice,
    guideLocation,
    guideId,
  } = {},
) => {
  const pkg = await Package.findById(packageId).populate(
    CUSTOMER_OFFER_POPULATE,
  );

  if (!pkg || !pkg.isActive) {
    throw new AppError("Package not found or inactive", 404);
  }

  const excludedOfferSet = new Set((excludedOfferIds || []).map(String));

  const swappedOfferMap = new Map();
  for (const swap of swappedOffers || []) {
    swappedOfferMap.set(
      String(swap.originalOfferId),
      String(swap.replacementOfferId),
    );
  }

  // If client explicitly passed includedOfferIds, any optional package offer not in the list is excluded
  if (Array.isArray(includedOfferIds)) {
    const includedOfferSet = new Set(includedOfferIds.map(String));
    for (const ref of pkg.offerRefs || []) {
      const offer = ref.offer;
      if (!offer) continue;
      const offerIdStr = String(offer._id);
      const isReplacementIncluded =
        swappedOfferMap.has(offerIdStr) &&
        includedOfferSet.has(swappedOfferMap.get(offerIdStr));
      const isOriginalIncluded = includedOfferSet.has(offerIdStr);

      if (!isOriginalIncluded && !isReplacementIncluded) {
        if (!ref.isOptional) {
          throw new AppError(
            `Offer '${offer.title}' is mandatory and must be included in includedOfferIds`,
            400,
          );
        }
        excludedOfferSet.add(offerIdStr);
      } else {
        excludedOfferSet.delete(offerIdStr);
      }
    }
  }

  let totalDeductions = 0;
  let totalSwapDeltas = 0;
  const quoteItems = [];
  let activeComponentsCount = 0;

  // Process Offers
  for (const ref of pkg.offerRefs || []) {
    const offer = ref.offer;
    if (!offer) continue;
    const offerIdStr = String(offer._id);
    const units = ref.unitsPerBooking || 1;

    // Check if opted out
    if (excludedOfferSet.has(offerIdStr)) {
      if (!ref.isOptional) {
        throw new AppError(
          `Offer '${offer.title}' is mandatory and cannot be excluded`,
          400,
        );
      }
      const deductionAmount = (offer.sellPrice || 0) * units;
      totalDeductions += deductionAmount;
      quoteItems.push({
        id: offer._id,
        name: offer.title,
        type: offer.itemType,
        retailPrice: offer.sellPrice,
        units,
        isIncluded: false,
        isOptedOut: true,
        deduction: deductionAmount,
      });
      continue;
    }

    // Check if swapped
    if (swappedOfferMap.has(offerIdStr)) {
      if (!ref.allowSwap) {
        throw new AppError(`Offer '${offer.title}' cannot be swapped`, 400);
      }
      const replacementOfferId = swappedOfferMap.get(offerIdStr);
      const replacementOffer = await Offer.findById(replacementOfferId)
        .populate("flightRef.stock")
        .populate({ path: "hotelRef.stock", populate: { path: "hotelId" } });

      if (!replacementOffer || !replacementOffer.isActive) {
        throw new AppError(
          `Replacement offer ${replacementOfferId} not found or inactive`,
          400,
        );
      }

      const originalRetail = (offer.sellPrice || 0) * units;
      const replacementRetail = (replacementOffer.sellPrice || 0) * units;
      const delta = replacementRetail - originalRetail;
      totalSwapDeltas += delta;
      activeComponentsCount++;

      quoteItems.push({
        id: replacementOffer._id,
        originalOfferId: offer._id,
        name: replacementOffer.title,
        type: replacementOffer.itemType,
        retailPrice: replacementOffer.sellPrice,
        units,
        isIncluded: true,
        isSwapped: true,
        originalPrice: offer.sellPrice,
        delta,
        replacementDetails: {
          flightDetails: replacementOffer.flightRef?.stock || null,
          hotelDetails: replacementOffer.hotelRef?.stock || null,
        },
      });
      continue;
    }

    // Default included
    activeComponentsCount++;
    quoteItems.push({
      id: offer._id,
      name: offer.title,
      type: offer.itemType,
      retailPrice: offer.sellPrice,
      units,
      isIncluded: true,
    });
  }

  // Guardrail: must have at least 2 active Offer components
  if (activeComponentsCount < 2) {
    throw new AppError(
      "A Package must contain at least 2 Offer components (e.g. Flight + Hotel).",
      400,
    );
  }

  // Handle Guide selection and pricing
  let isGuideSelected = false;
  let resolvedGuideSelected = null;
  let resolvedGuidePrice = 0;
  let resolvedGuideLocation = [];
  let guideDetails = null;

  const hasGuideIntent =
    includeGuide === true ||
    includeGuide === "true" ||
    (guideSelected !== undefined &&
      guideSelected !== null &&
      guideSelected !== "" &&
      guideSelected !== false &&
      guideSelected !== "false") ||
    (guideId !== undefined && guideId !== null && guideId !== "");

  if (hasGuideIntent) {
    isGuideSelected = true;

    const targetGuideId =
      guideId ||
      (guideSelected && typeof guideSelected === "string" && guideSelected.match(/^[0-9a-fA-F]{24}$/)
        ? guideSelected
        : null);

    if (targetGuideId) {
      try {
        const { Guide } = require("../../guide/guide.model");
        const guideDoc = await Guide.findById(targetGuideId);
        if (guideDoc) {
          resolvedGuideSelected = guideDoc.fullName;
          resolvedGuidePrice =
            guidePrice !== undefined && guidePrice !== null
              ? Number(guidePrice)
              : (guideDoc.fullDayRate || guideDoc.hourlyRate || pkg.guidePrice || 0);
          resolvedGuideLocation = guideLocation
            ? (Array.isArray(guideLocation) ? guideLocation : [guideLocation])
            : [guideDoc.city || pkg.guideLocation || pkg.destination].filter(Boolean);
          guideDetails = {
            guideId: guideDoc._id,
            fullName: guideDoc.fullName,
            city: guideDoc.city,
            category: guideDoc.category,
            languages: guideDoc.languages,
            avatar: guideDoc.avatar,
            rating: guideDoc.rating,
            hourlyRate: guideDoc.hourlyRate,
            fullDayRate: guideDoc.fullDayRate,
            price: resolvedGuidePrice,
          };
        }
      } catch (err) {
        logger.warn(`Failed to resolve Guide by ID ${targetGuideId}: ${err.message}`);
      }
    }

    if (!resolvedGuideSelected) {
      if (
        typeof guideSelected === "string" &&
        guideSelected.trim() !== "" &&
        guideSelected !== "true" &&
        guideSelected !== "false"
      ) {
        resolvedGuideSelected = guideSelected.trim();
      } else {
        resolvedGuideSelected = pkg.guideLocation
          ? `Guide (${pkg.guideLocation})`
          : (pkg.destination ? `Guide (${pkg.destination})` : "Tour Guide");
      }

      resolvedGuidePrice =
        guidePrice !== undefined && guidePrice !== null
          ? Number(guidePrice)
          : (pkg.guidePrice || 0);

      resolvedGuideLocation = guideLocation
        ? (Array.isArray(guideLocation) ? guideLocation : [guideLocation])
        : (pkg.guideLocation ? [pkg.guideLocation] : (pkg.destination ? [pkg.destination] : []));
    }

    // Add guide item into quote itemized breakdown
    quoteItems.push({
      id: guideDetails?.guideId || "guide-tour-addon",
      name: `Guide: ${resolvedGuideSelected}`,
      type: "guide_tour",
      retailPrice: resolvedGuidePrice,
      units: 1,
      isIncluded: true,
      guideLocation: resolvedGuideLocation,
      guideDetails: guideDetails || { name: resolvedGuideSelected },
    });
  }

  // Option A calculation: Anchored Base - Deductions + Swap Deltas + Guide Price
  // If package was created with guide included in sellPrice, deduct guidePrice to resolve base offer price
  const packageHasGuideIncluded = pkg.guideActive && (pkg.guidePrice || 0) > 0;
  const basePackageSellPrice = packageHasGuideIncluded
    ? Math.max(0, pkg.sellPrice - (pkg.guidePrice || 0))
    : pkg.sellPrice;

  const unitGuidePrice = isGuideSelected ? resolvedGuidePrice : 0;
  const finalSellPrice = Math.max(
    0,
    basePackageSellPrice - totalDeductions + totalSwapDeltas + unitGuidePrice,
  );
  const totalAmount = finalSellPrice * quantity;

  return {
    packageId: pkg._id,
    packageTitle: pkg.title,
    basePackageSellPrice,
    bundleDiscountPercentage: pkg.bundleDiscountPercentage || 0,
    deductions: totalDeductions,
    swapDeltas: totalSwapDeltas,
    guidePrice: unitGuidePrice,
    guideSelected: isGuideSelected ? resolvedGuideSelected : null,
    guideLocation: isGuideSelected ? resolvedGuideLocation : [],
    guideDetails: isGuideSelected ? guideDetails : null,
    finalSellPrice,
    quantity,
    totalAmount,
    activeComponentsCount,
    items: quoteItems,
    includedOfferIds: quoteItems
      .filter((item) => item.isIncluded && item.type !== "guide_tour")
      .map((item) => item.id),
    excludedOfferIds: Array.from(excludedOfferSet),
  };
};

/**
 * ─── CUSTOMER-FACING READS ──────────────────────────────
 */
const toCustomerShape = (pkg) => {
  // If package has no custom images, fallback to images from bundled offers
  const offerImages = (pkg.offerRefs || []).flatMap(
    (ref) => (ref.offer && Array.isArray(ref.offer.images) ? ref.offer.images : [])
  );
  const resolvedImages =
    pkg.images && pkg.images.length > 0 ? pkg.images : offerImages;

  return {
    _id: pkg._id,
    title: pkg.title,
    description: pkg.description,
    destination: pkg.destination,
    images: resolvedImages,
    bundleDiscountPercentage: pkg.bundleDiscountPercentage || 0,
    sellPrice: pkg.sellPrice,
    inclusions: pkg.inclusions,
    itinerary: pkg.itinerary,
    validity: pkg.validity,
    availableSlots: calculateAvailability(pkg),
    priceBreakdown: calculatePriceBreakdown(pkg),
  };
};

const listPackages = async ({ page = 1, limit = 10 } = {}) => {
  try {
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    const skip = (page - 1) * limit;

    const packages = await Package.find({ isActive: true, isPublic: true })
      .populate(CUSTOMER_OFFER_POPULATE)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Package.countDocuments({
      isActive: true,
      isPublic: true,
    });

    return {
      packages: packages.map(toCustomerShape),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    logger.error(`List packages failed: ${error.message}`);
    throw error;
  }
};

const getPackageById = async (packageId) => {
  try {
    const pkg = await Package.findOne({
      _id: packageId,
      isActive: true,
      isPublic: true,
    }).populate(CUSTOMER_OFFER_POPULATE);

    if (!pkg) throw new AppError("Package not found", 404);

    const baseShape = toCustomerShape(pkg);
    const availableAlternatives = await getAvailableAlternatives(pkg);

    return {
      ...baseShape,
      availableAlternatives,
    };
  } catch (error) {
    logger.error(`Get package failed: ${error.message}`);
    throw error;
  }
};

const searchPackages = async ({
  destination,
  sellPriceMin,
  sellPriceMax,
  page = 1,
  limit = 10,
}) => {
  try {
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    const query = { isActive: true, isPublic: true };

    if (destination) query.destination = { $regex: destination, $options: "i" };
    if (sellPriceMin || sellPriceMax) {
      query.sellPrice = {};
      if (sellPriceMin) query.sellPrice.$gte = Number(sellPriceMin);
      if (sellPriceMax) query.sellPrice.$lte = Number(sellPriceMax);
    }

    const skip = (page - 1) * limit;
    const packages = await Package.find(query)
      .populate(CUSTOMER_OFFER_POPULATE)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Package.countDocuments(query);

    return {
      packages: packages.map(toCustomerShape),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    logger.error(`Search packages failed: ${error.message}`);
    throw error;
  }
};

/**
 * ─── ADMIN READS & ANALYTICS ─────────────────────────────
 */
const toAdminShape = (pkg) => {
  const costAnalysis = calculateCostPrice(pkg);
  return {
    ...pkg.toObject(),
    availableSlots: calculateAvailability(pkg),
    priceBreakdown: calculatePriceBreakdown(pkg),
    ...costAnalysis,
  };
};

const getPackageByIdAdmin = async (packageId) => {
  try {
    const pkg =
      await Package.findById(packageId).populate(ADMIN_OFFER_POPULATE);
    if (!pkg) throw new AppError("Package not found", 404);
    return toAdminShape(pkg);
  } catch (error) {
    logger.error(`Get package (admin) failed: ${error.message}`);
    throw error;
  }
};

const listPackagesAdmin = async ({ page = 1, limit = 10 } = {}) => {
  try {
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    const skip = (page - 1) * limit;

    const packages = await Package.find({})
      .populate(ADMIN_OFFER_POPULATE)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Package.countDocuments({});

    return {
      packages: packages.map(toAdminShape),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    logger.error(`List packages (admin) failed: ${error.message}`);
    throw error;
  }
};

/**
 * ─── ADMIN WRITES ─────────────────────────────────────────
 */
const createPackage = async (data, adminUserId) => {
  try {
    // Normalize guide options (admin can supply includeGuide or guideActive, guidePrice, and guideLocation)
    const isGuideEnabled =
      data.includeGuide === true ||
      data.includeGuide === "true" ||
      data.guideActive === true ||
      data.guideActive === "true";

    data.guideActive = isGuideEnabled;

    if (data.guidePrice !== undefined && data.guidePrice !== null && data.guidePrice !== "") {
      data.guidePrice = Number(data.guidePrice) >= 0 ? Number(data.guidePrice) : 0;
    } else {
      data.guidePrice = 0;
    }

    if (data.guideLocation) {
      data.guideLocation = Array.isArray(data.guideLocation)
        ? data.guideLocation.join(", ")
        : String(data.guideLocation).trim();
    } else if (isGuideEnabled) {
      data.guideLocation = data.destination || null;
    } else {
      data.guideLocation = null;
    }

    // If sellPrice is not provided manually, auto-calculate from underlying offers
    if (data.sellPrice === undefined || data.sellPrice === null) {
      const populatedOfferRefs = await Promise.all(
        (data.offerRefs || []).map(async (ref) => ({
          ...ref,
          offer: await Offer.findById(ref.offer),
        })),
      );
      const pricing = calculateBasePackagePricing({
        offerRefs: populatedOfferRefs,
        bundleDiscountPercentage: data.bundleDiscountPercentage || 0,
      });
      data.sellPrice = pricing.sellPrice + (isGuideEnabled ? (data.guidePrice || 0) : 0);
    }

    return await Package.create({ ...data, createdBy: adminUserId });
  } catch (error) {
    logger.error(`Create package failed: ${error.message}`);
    throw error;
  }
};

const updatePackage = async (packageId, data) => {
  try {
    if (data.includeGuide !== undefined || data.guideActive !== undefined) {
      data.guideActive =
        data.includeGuide === true ||
        data.includeGuide === "true" ||
        data.guideActive === true ||
        data.guideActive === "true";
    }

    if (data.guidePrice !== undefined && data.guidePrice !== null && data.guidePrice !== "") {
      data.guidePrice = Number(data.guidePrice) >= 0 ? Number(data.guidePrice) : 0;
    }

    if (data.guideLocation !== undefined) {
      data.guideLocation = Array.isArray(data.guideLocation)
        ? data.guideLocation.join(", ")
        : (data.guideLocation ? String(data.guideLocation).trim() : null);
    }

    const pkg = await Package.findByIdAndUpdate(packageId, data, {
      new: true,
      runValidators: true,
    });
    if (!pkg) throw new AppError("Package not found", 404);
    return pkg;
  } catch (error) {
    logger.error(`Update package failed: ${error.message}`);
    throw error;
  }
};

const deactivatePackage = async (packageId) => {
  try {
    const pkg = await Package.findByIdAndUpdate(
      packageId,
      { isActive: false },
      { new: true },
    );
    if (!pkg) throw new AppError("Package not found", 404);
    return pkg;
  } catch (error) {
    logger.error(`Deactivate package failed: ${error.message}`);
    throw error;
  }
};

const addPackageImages = async (packageId, imageUrls = []) => {
  try {
    const pkg = await Package.findById(packageId);
    if (!pkg) throw new AppError("Package not found", 404);

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new AppError("imageUrls must be a non-empty array", 400);
    }

    pkg.images = [...new Set([...(pkg.images || []), ...imageUrls])];
    await pkg.save();
    return pkg;
  } catch (error) {
    logger.error(`Add package images failed: ${error.message}`);
    throw error;
  }
};

const removePackageImage = async (packageId, imageUrl) => {
  try {
    const pkg = await Package.findById(packageId);
    if (!pkg) throw new AppError("Package not found", 404);

    pkg.images = (pkg.images || []).filter((img) => img !== imageUrl);
    await pkg.save();
    return pkg;
  } catch (error) {
    logger.error(`Remove package image failed: ${error.message}`);
    throw error;
  }
};

module.exports = {
  calculateAvailability,
  calculateBasePackagePricing,
  calculateCostPrice,
  calculatePriceBreakdown,
  getAvailableAlternatives,
  calculateCustomQuote,
  listPackages,
  getPackageById,
  searchPackages,
  getPackageByIdAdmin,
  listPackagesAdmin,
  createPackage,
  updatePackage,
  deactivatePackage,
  addPackageImages,
  removePackageImage,
  toCustomerShape,
};
