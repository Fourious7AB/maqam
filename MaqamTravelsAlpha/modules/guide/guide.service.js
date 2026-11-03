const { Guide, GuideSlot, GuideReview } = require("./guide.model");
const { AppError } = require("../../middleware/errorHandler");
const logger = require("../../utils/logger");

/**
 * ─── USER-FACING SERVICES ──────────────────────────────────
 */

/**
 * 1. Get published & active guides with search, filter, and pagination
 */
const getGuides = async ({
  destination,
  category,
  language,
  // search,
  // date,
  // sort = 'rating',
  page = 1,
  limit = 10,
}) => {
  const query = {
    isDeleted: false,
    status: "active",
  };

  if (destination) {
    query.city = { $regex: new RegExp(`^${destination.trim()}$`, "i") };
  }

  if (category) {
    query.category = { $regex: new RegExp(`^${category.trim()}$`, "i") };
  }

  if (language) {
    query.languages = { $in: [new RegExp(`^${language.trim()}$`, "i")] };
  }

  // if (search) {
  //   const searchRegex = new RegExp(search.trim(), 'i');
  //   query.$or = [
  //     { fullName: searchRegex },
  //     { city: searchRegex },
  //     { category: searchRegex },
  //     { bio: searchRegex },
  //   ];
  // }

  // If a specific date is requested, filter guides with available slots on that date
  // if (date) {
  //   const availableGuideIds = await GuideSlot.distinct('guide', {
  //     date: date.trim(),
  //     isAvailable: true,
  //     isBooked: false,
  //   });
  //   query._id = { $in: availableGuideIds };
  // }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  // Sorting
  // let sortOption = { rating: -1, totalReviews: -1 };
  // if (sort === 'price_asc') sortOption = { hourlyRate: 1 };
  // if (sort === 'price_desc') sortOption = { hourlyRate: -1 };
  // if (sort === 'newest') sortOption = { createdAt: -1 };
  // if (sort === 'experience') sortOption = { yearsOfExperience: -1 };

  const [guides, total] = await Promise.all([
    Guide.find(query)
      // .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .select("-adminNotes -nationalId"),
    Guide.countDocuments(query),
  ]);

  return {
    guides,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  };
};

/**
 * 2. Get full details of a specific guide by ID
 */
const getGuideById = async (guideId) => {
  const guide = await Guide.findOne({
    _id: guideId,
    isDeleted: false,
    status: "active",
  }).select("-adminNotes -nationalId");

  if (!guide) {
    throw new AppError("Guide not found or inactive", 404);
  }

  return guide;
};

/**
 * 3. Get available dates/slots for a guide
 */
const getGuideSlots = async (guideId, { startDate, endDate, date }) => {
  const guide = await Guide.findOne({
    _id: guideId,
    isDeleted: false,
    status: "active",
  });

  if (!guide) {
    throw new AppError("Guide not found or inactive", 404);
  }

  const slotQuery = {
    guide: guideId,
    isAvailable: true,
    isBooked: false,
  };

  const todayStr = new Date().toISOString().split("T")[0];

  if (date) {
    slotQuery.date = date;
  } else if (startDate && endDate) {
    slotQuery.date = { $gte: startDate, $lte: endDate };
  } else if (startDate) {
    slotQuery.date = { $gte: startDate };
  } else {
    // Default to future slots from today
    slotQuery.date = { $gte: todayStr };
  }

  const rawSlots = await GuideSlot.find(slotQuery).sort({
    date: 1,
    startTime: 1,
  });

  // Group slots by date for intuitive calendar consumption
  const calendarMap = {};
  rawSlots.forEach((slot) => {
    if (!calendarMap[slot.date]) {
      calendarMap[slot.date] = [];
    }
    calendarMap[slot.date].push({
      slotId: slot._id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      slotType: slot.slotType,
      price: slot.price,
      currency: slot.currency,
      isAvailable: slot.isAvailable && !slot.isBooked,
    });
  });

  const calendar = Object.keys(calendarMap).map((dateKey) => ({
    date: dateKey,
    slots: calendarMap[dateKey],
  }));

  return {
    guideId,
    calendar,
    totalAvailableSlots: rawSlots.length,
  };
};

/**
 * 4. Get reviews for a specific guide
 */
const getGuideReviews = async (guideId, { page = 1, limit = 10 }) => {
  const guide = await Guide.findOne({ _id: guideId, isDeleted: false });
  if (!guide) {
    throw new AppError("Guide not found", 404);
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(50, Number(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [reviews, total, allGuideReviews] = await Promise.all([
    GuideReview.find({ guide: guideId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("user", "firstName lastName avatar"),
    GuideReview.countDocuments({ guide: guideId }),
    GuideReview.find({ guide: guideId }).select("rating"),
  ]);

  // Compute stars breakdown
  const starsBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  allGuideReviews.forEach((r) => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating)));
    starsBreakdown[star] = (starsBreakdown[star] || 0) + 1;
  });

  return {
    summary: {
      averageRating: guide.rating,
      totalReviews: guide.totalReviews,
      starsBreakdown,
    },
    reviews,
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * 5. Add a customer review for a specific guide
 */
const addGuideReview = async (
  guideId,
  userId,
  { rating, comment, bookingId },
) => {
  const guide = await Guide.findOne({ _id: guideId, isDeleted: false });
  if (!guide) {
    throw new AppError("Guide not found", 404);
  }

  const review = await GuideReview.create({
    guide: guideId,
    user: userId,
    booking: bookingId || null,
    rating: Number(rating),
    comment: comment.trim(),
    verifiedBooking: !!bookingId,
  });

  // Recalculate average rating for the guide
  const allReviews = await GuideReview.find({ guide: guideId });
  const totalReviews = allReviews.length;
  const avgRating =
    totalReviews > 0
      ? Number(
          (
            allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
          ).toFixed(2),
        )
      : 5.0;

  guide.rating = avgRating;
  guide.totalReviews = totalReviews;
  await guide.save();

  return {
    review,
    newGuideAverage: avgRating,
  };
};

/**
 * 6. List guide categories directly from the database with dynamic counts
 */
const getCategories = async () => {
  const categories = await Guide.aggregate([
    {
      $match: {
        isDeleted: false,
        category: { $ne: null, $exists: true },
      },
    },
    {
      $group: {
        _id: "$category",
        category: { $first: "$category" },
        activeGuidesCount: {
          $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
        },
        totalGuidesCount: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        category: "$_id",
        activeGuidesCount: 1,
        totalGuidesCount: 1,
      },
    },
    {
      $sort: { activeGuidesCount: -1, category: 1 },
    },
  ]);

  return categories;
};

/**
 * ─── ADMIN-FACING SERVICES ─────────────────────────────────
 */

/**
 * 1. Admin: Create a new guide
 */
const createGuideService = async (guideData, adminId) => {
  const normalizedPhone = guideData.phone?.trim();

  const existingGuide = await Guide.findOne({
    phone: normalizedPhone,
    isDeleted: false,
  });

  if (existingGuide) {
    throw new AppError("Guide with this phone number already exists", 409);
  }

  const newGuide = await Guide.create({
    ...guideData,
    phone: normalizedPhone,
    createdBy: adminId || null,
  });

  logger.info(`[Admin] Guide created: ${newGuide.fullName} (${newGuide._id})`);
  return newGuide;
};

/**
 * 2. Admin: List all guides (all statuses)
 */
const getAllGuides = async ({
  status,
  city,
  category,
  search,
  page = 1,
  limit = 20,
}) => {
  const query = { isDeleted: false };

  if (status) {
    query.status = status.trim();
  }

  if (city) {
    query.city = { $regex: new RegExp(city.trim(), "i") };
  }

  if (category) {
    query.category = { $regex: new RegExp(category.trim(), "i") };
  }

  if (search) {
    const searchRegex = new RegExp(search.trim(), "i");
    query.$or = [
      { fullName: searchRegex },
      { phone: searchRegex },
      { licenseNumber: searchRegex },
      { city: searchRegex },
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [guides, total] = await Promise.all([
    Guide.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Guide.countDocuments(query),
  ]);

  return {
    guides,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  };
};

/**
 * 3. Admin: Access a specific guide with internal CRM dossier
 */
const getAdminGuideById = async (guideId) => {
  const guide = await Guide.findOne({ _id: guideId, isDeleted: false })
    .select("+nationalId +adminNotes")
    .populate("createdBy", "firstName lastName email");

  if (!guide) {
    throw new AppError("Guide record not found", 404);
  }

  const totalSlotsCount = await GuideSlot.countDocuments({ guide: guideId });
  const bookedSlotsCount = await GuideSlot.countDocuments({
    guide: guideId,
    isBooked: true,
  });

  return {
    guideDetails: {
      id: guide._id,
      fullName: guide.fullName,
      phone: guide.phone,
      email: guide.email,
      nationalId: guide.nationalId,
      status: guide.status,
      lifetimeBookings: 0,
      lifetimeRevenue: 0,
      createdAt: guide.createdAt,
    },
    stats: {
      totalSlotsConfigured: totalSlotsCount,
      bookedSlotsCount,
      completedTours: guide.completedTours,
      lifetimeReviews: guide.totalReviews,
      rating: guide.rating,
    },
  };
};

/**
 * 4. Admin: Update guide profile & status (approved, active, suspended, pending)
 */
const updateGuide = async (guideId, updateData) => {
  const guide = await Guide.findOne({ _id: guideId, isDeleted: false });
  if (!guide) {
    throw new AppError("Guide record not found", 404);
  }

  // If phone is modified, ensure uniqueness
  if (updateData.phone && updateData.phone !== guide.phone) {
    const phoneExists = await Guide.findOne({
      phone: updateData.phone.trim(),
      _id: { $ne: guideId },
      isDeleted: false,
    });
    if (phoneExists) {
      throw new AppError("Phone number already in use by another guide", 409);
    }
  }

  const updatedGuide = await Guide.findByIdAndUpdate(
    guideId,
    { $set: updateData },
    { new: true, runValidators: true },
  ).select("+nationalId +adminNotes");

  logger.info(
    `[Admin] Guide updated: ${guideId} - status: ${updatedGuide.status}`,
  );
  return updatedGuide;
};

/**
 * 5. Admin: Remove / Archive a guide (soft-delete)
 */
const deleteGuide = async (guideId) => {
  const guide = await Guide.findOne({ _id: guideId, isDeleted: false });
  if (!guide) {
    throw new AppError("Guide record not found", 404);
  }

  guide.isDeleted = true;
  guide.status = "suspended";
  await guide.save();

  // Deactivate unbooked future slots
  await GuideSlot.updateMany(
    { guide: guideId, isBooked: false },
    { $set: { isAvailable: false } },
  );

  logger.info(`[Admin] Guide soft-deleted & archived: ${guideId}`);
  return {
    message: "Guide successfully archived and removed from active operations",
  };
};

/**
 * 6. Admin: Set and bulk-update a guide's available slots
 */
const setGuideSlots = async (guideId, slotsArray) => {
  const guide = await Guide.findOne({ _id: guideId, isDeleted: false });
  if (!guide) {
    throw new AppError("Guide record not found", 404);
  }

  if (!Array.isArray(slotsArray) || slotsArray.length === 0) {
    throw new AppError("slots must be a non-empty array", 400);
  }

  const slotOperations = slotsArray.map((slot) => ({
    updateOne: {
      filter: {
        guide: guideId,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      },
      update: {
        $set: {
          guide: guideId,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          slotType: slot.slotType || "Standard Tour",
          price: Number(slot.price),
          currency: slot.currency || guide.currency || "SAR",
          isAvailable:
            slot.isAvailable !== undefined ? Boolean(slot.isAvailable) : true,
        },
      },
      upsert: true,
    },
  }));

  const bulkResult = await GuideSlot.bulkWrite(slotOperations);

  // Auto-activate guide if currently approved and slots are now present
  if (guide.status === "approved") {
    guide.status = "active";
    await guide.save();
  }

  const activeDates = [...new Set(slotsArray.map((s) => s.date))];

  logger.info(
    `[Admin] Configured ${slotsArray.length} slots for guide: ${guideId}`,
  );

  return {
    guideId,
    updatedCount: bulkResult.upsertedCount + bulkResult.modifiedCount,
    activeDates,
  };
};

module.exports = {
  // User Services
  getGuides,
  getGuideById,
  getGuideSlots,
  getGuideReviews,
  addGuideReview,
  getCategories,

  // Admin Services
  createGuideService,
  createGuide: createGuideService,
  getAllGuides,
  getAdminGuideById,
  updateGuide,
  deleteGuide,
  setGuideSlots,
};
