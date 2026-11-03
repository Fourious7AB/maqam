const guideService = require("./guide.service");
const {
  sendSuccess,
  sendCreated,
  sendPaginated,
} = require("../../utils/apiResponse");

/**
 * ─── USER-SIDE CONTROLLERS ─────────────────────────────────
 */

/**
 * 1. GET /api/v1/guides - List and search published guides
 */
const getGuides = async (req, res, next) => {
  try {
    const { destination, category, language, page, limit } =
      req.query;

    const result = await guideService.getGuides({
      destination,
      category,
      language,
      
      page,
      limit,
    });

    return sendPaginated(res, {
      message: "Guides retrieved successfully",
      data: result.guides,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/v1/guides/:id - Get full guide details
 */
const getUserGuideById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const guide = await guideService.getGuideById(id);

    return sendSuccess(res, {
      message: "Guide details retrieved successfully",
      data: { guide },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. GET /api/v1/guides/:id/slots - Available dates/slots
 */
const getGuideSlots = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, date } = req.query;

    const result = await guideService.getGuideSlots(id, {
      startDate,
      endDate,
      date,
    });

    return sendSuccess(res, {
      message: "Available slots retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. GET /api/v1/guides/:id/reviews - Reviews for a specific guide
 */
const getGuideReviews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page, limit } = req.query;

    const result = await guideService.getGuideReviews(id, { page, limit });

    return sendSuccess(res, {
      message: "Reviews retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. POST /api/v1/guides/:id/reviews - Give review to a specific guide
 */
const createGuideReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;
    const { rating, comment, bookingId } = req.body;

    const result = await guideService.addGuideReview(id, userId, {
      rating,
      comment,
      bookingId,
    });

    return sendCreated(res, result, "Review submitted successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * 6. GET /api/v1/guides/categories - List available guide categories
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await guideService.getCategories();

    return sendSuccess(res, {
      message: "Categories retrieved successfully",
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ─── ADMIN-SIDE CONTROLLERS ────────────────────────────────
 */

/**
 * 1. POST /api/v1/guides/admin - Create new guide
 */
const createGuide = async (req, res, next) => {
  try {
    const adminId = req.user?._id || req.user?.id;
    const guide = await guideService.createGuideService(req.body, adminId);

    return sendCreated(res, { guide :{
      id: guide._id,
      fullName: guide.fullName,
      phone: guide.phone,
      city: guide.city,
      status: guide.status,
      hourlyRate: guide.hourlyRate,
      createdAt: guide.createdAt,
    }}, "Guide created successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/v1/guides/admin - List all guides (all statuses)
 */
const getAllGuides = async (req, res, next) => {
  try {
    const { status, city, category, search, page, limit } = req.query;

    const result = await guideService.getAllGuides({
      status,
      city,
      category,
      search,
      page,
      limit,
    });

    return sendPaginated(res, {
      message: "Admin guides list retrieved successfully",
      data: result.guides,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. GET /api/v1/guides/admin/:id - Access specific guide (internal dossier)
 */
const getAdminGuideById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await guideService.getAdminGuideById(id);

    return sendSuccess(res, {
      message: "Admin guide dossier retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. PATCH /api/v1/guides/admin/:id - Update guide profile & status
 */
const updateGuide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedGuide = await guideService.updateGuide(id, req.body);

    return sendSuccess(res, {
      message: "Guide profile updated successfully",
      data: { guide: updatedGuide },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. DELETE /api/v1/guides/admin/:id - Remove or archive a guide
 */
const deleteGuide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await guideService.deleteGuide(id);

    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * 6. PUT /api/v1/guides/admin/:id/slots - Set / bulk update available slots
 */
const setGuideSlots = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { slots } = req.body;

    const result = await guideService.setGuideSlots(id, slots);

    return sendSuccess(res, {
      message: `${result.updatedCount} slots configured successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // User
  getGuides,
  getUserGuideById,
  getGuideSlots,
  getGuideReviews,
  createGuideReview,
  getCategories,

  // Admin
  createGuide,
  getAllGuides,
  getAdminGuideById,
  updateGuide,
  deleteGuide,
  setGuideSlots,
};
