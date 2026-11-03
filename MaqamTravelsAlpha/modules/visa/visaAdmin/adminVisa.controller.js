const adminVisaService = require("./adminVisa.service");
const {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendBadRequest,
} = require("../../../utils/apiResponse");

/**
 * ─── ADMIN VISA CONTROLLER ───────────────────────────────────────────
 * Thin HTTP layer:
 * - Application & Group Batch management: Dashboard, list, details, assign, status update
 * - Inventory & Catalogue management: Create visa, list catalogue, update details, edit stock, delete visa
 * ────────────────────────────────────────────────────────────────────
 */

/* =========================================================================
   1. DASHBOARD, GROUPS & APPLICATIONS
   ========================================================================= */

/**
 * Get aggregated statistics and recent applications for Admin Dashboard
 * GET /api/v1/visa/admin/dashboard
 */
const getDashboardOverview = async (req, res, next) => {
  try {
    const dashboardData = await adminVisaService.getDashboardOverview();
    return sendSuccess(res, {
      message: "Visa admin dashboard data retrieved successfully",
      data: dashboardData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all individual visa applications with filters, search, and pagination
 * GET /api/v1/visa/admin/applications
 */
const getAllVisaApplications = async (req, res, next) => {
  try {
    const {
      status,
      caseOfficerId,
      assignedAgentId,
      groupId,
      search,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
    } = req.query;

    const result = await adminVisaService.getAllVisaApplications({
      status,
      caseOfficerId,
      assignedAgentId,
      groupId,
      search,
      fromDate,
      toDate,
      page: Number(page),
      limit: Number(limit),
    });

    return sendPaginated(res, {
      message: "Visa applications retrieved successfully",
      data: result.applications,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Visa Group batches with pagination and filters
 * GET /api/v1/visa/admin/groups
 */
const getAllVisaGroups = async (req, res, next) => {
  try {
    const { groupStatus, paymentStatus, fromDate, toDate, page = 1, limit = 10 } = req.query;

    const result = await adminVisaService.getAllVisaGroups({
      groupStatus,
      paymentStatus,
      fromDate,
      toDate,
      page: Number(page),
      limit: Number(limit),
    });

    return sendPaginated(res, {
      message: "Visa group batches retrieved successfully",
      data: result.groups,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single Visa Group batch details with child applications
 * GET /api/v1/visa/admin/groups/:id
 */
const getVisaGroupDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await adminVisaService.getVisaGroupById(id);

    return sendSuccess(res, {
      message: "Visa group batch details retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get full application details for a specific individual visa application
 * GET /api/v1/visa/admin/applications/:id
 */
const getVisaApplicationDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const application = await adminVisaService.getVisaApplicationById(id);

    return sendSuccess(res, {
      message: "Visa application details retrieved successfully",
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign an individual application or group to a specific Case Officer / Agent
 * POST /api/v1/visa/admin/applications/:id/assign
 */
const assignCaseOfficer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { caseOfficerId, assignedAgentId, adminRemarks, adminNotes } = req.body;
    const adminId = req.user?._id || req.user?.id;

    const targetOfficerId = caseOfficerId || assignedAgentId;
    if (!targetOfficerId) {
      return sendBadRequest(res, "caseOfficerId (or assignedAgentId) is required");
    }

    const updatedApplication = await adminVisaService.assignCaseOfficer({
      visaId: id,
      caseOfficerId: targetOfficerId,
      assignedByAdminId: adminId,
      adminRemarks: adminRemarks || adminNotes || "",
    });

    return sendSuccess(res, {
      message: "Case officer / Agent assigned successfully",
      data: updatedApplication,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update visa application status, rejection reason, issued visa URL, admin remarks
 * PATCH /api/v1/visa/admin/applications/:id/status
 */
const updateVisaStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminRemarks, adminNotes, rejectionReason, issuedVisaUrl } = req.body;

    if (!status) {
      return sendBadRequest(res, "status is required");
    }

    const updatedApplication = await adminVisaService.updateVisaStatus({
      visaId: id,
      status,
      adminRemarks,
      adminNotes,
      rejectionReason,
      issuedVisaUrl,
    });

    return sendSuccess(res, {
      message: "Visa application status updated successfully",
      data: updatedApplication,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get list of all eligible staff members who can be assigned as Case Officers
 * GET /api/v1/visa/admin/case-officers
 */
const getEligibleCaseOfficers = async (req, res, next) => {
  try {
    const officers = await adminVisaService.getEligibleCaseOfficers();
    return sendSuccess(res, {
      message: "Eligible case officers retrieved successfully",
      data: officers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new agent / case officer / staff member
 * POST /api/v1/visa/admin/case-officers
 */
const createStaff = async (req, res, next) => {
  try {
    const adminId = req.user?._id || req.user?.id;
    const { firstName, lastName, email, phone, password, role, avatar } = req.body;

    if (!firstName || !lastName || !phone || !password) {
      return sendBadRequest(
        res,
        "firstName, lastName, phone, and password are required"
      );
    }

    const newStaff = await adminVisaService.createCaseOfficerStaff(
      { firstName, lastName, email, phone, password, role, avatar },
      adminId
    );

    return sendCreated(res, newStaff, "Case officer / staff created successfully");
  } catch (error) {
    next(error);
  }
};

/* =========================================================================
   2. VISA CATALOGUE & INVENTORY MANAGEMENT (ADMIN)
   ========================================================================= */

/**
 * Create a new Visa type / catalogue offering
 * POST /api/v1/visa/admin/inventory
 */
const createVisa = async (req, res, next) => {
  try {
    const adminId = req.user?._id || req.user?.id;
    let visaData = req.body;

    // Handle form-data JSON string parsing if sent via multipart
    if (typeof visaData.fees === "string") {
      try {
        visaData.fees = JSON.parse(visaData.fees);
      } catch (_) {}
    }
    if (typeof visaData.inventory === "string") {
      try {
        visaData.inventory = JSON.parse(visaData.inventory);
      } catch (_) {}
    }
    if (typeof visaData.requiredDocuments === "string") {
      try {
        visaData.requiredDocuments = JSON.parse(visaData.requiredDocuments);
      } catch (_) {}
    }
    if (typeof visaData.guidelines === "string") {
      try {
        visaData.guidelines = JSON.parse(visaData.guidelines);
      } catch (_) {}
    }
    if (typeof visaData.termsAndConditions === "string") {
      try {
        visaData.termsAndConditions = JSON.parse(visaData.termsAndConditions);
      } catch (_) {}
    }

    let newVisa = await adminVisaService.createVisaInventory(visaData, adminId);

    // If country image/picture or country flag files were attached, upload to Cloudinary
    const countryImgFile =
      req.files?.countryImage?.[0] ||
      req.files?.countryPicture?.[0] ||
      (req.file && ["countryImage", "countryPicture"].includes(req.file.fieldname)
        ? req.file
        : !req.files && req.file && req.file.fieldname !== "countryFlag"
        ? req.file
        : null);

    const countryFlagFile =
      req.files?.countryFlag?.[0] ||
      (req.file?.fieldname === "countryFlag" ? req.file : null);

    if (countryImgFile) {
      newVisa = await adminVisaService.uploadCountryImage(
        newVisa._id,
        countryImgFile.buffer,
        adminId,
        "countryImage"
      );
    }

    if (countryFlagFile) {
      newVisa = await adminVisaService.uploadCountryImage(
        newVisa._id,
        countryFlagFile.buffer,
        adminId,
        "countryFlag"
      );
    }

    return sendCreated(res, newVisa, "Visa created successfully in catalogue");
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Visa Catalogue / Inventory items with filters & pagination
 * GET /api/v1/visa/admin/inventory
 */
const getAllVisaInventory = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      country,
      visaType,
      status,
      search,
      includeDeleted,
    } = req.query;

    const result = await adminVisaService.getAllVisaInventory({
      page: Number(page),
      limit: Number(limit),
      country,
      visaType,
      status,
      search,
      includeDeleted: includeDeleted === "true" || includeDeleted === true,
    });

    return sendPaginated(res, {
      message: "Visa catalogue retrieved successfully",
      data: result.inventory,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single Visa Catalogue / Inventory item by ID
 * GET /api/v1/visa/admin/inventory/:id
 */
const getVisaInventoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await adminVisaService.getVisaInventoryById(id);
    return sendSuccess(res, {
      message: "Visa details retrieved successfully",
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Visa details, fees, requirements, and information
 * PUT /api/v1/visa/admin/inventory/:id
 */
const updateVisa = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user?._id || req.user?.id;
    let updateData = req.body;

    // Handle form-data JSON string parsing if sent via multipart
    if (typeof updateData.fees === "string") {
      try {
        updateData.fees = JSON.parse(updateData.fees);
      } catch (_) {}
    }
    if (typeof updateData.inventory === "string") {
      try {
        updateData.inventory = JSON.parse(updateData.inventory);
      } catch (_) {}
    }
    if (typeof updateData.requiredDocuments === "string") {
      try {
        updateData.requiredDocuments = JSON.parse(updateData.requiredDocuments);
      } catch (_) {}
    }
    if (typeof updateData.guidelines === "string") {
      try {
        updateData.guidelines = JSON.parse(updateData.guidelines);
      } catch (_) {}
    }
    if (typeof updateData.termsAndConditions === "string") {
      try {
        updateData.termsAndConditions = JSON.parse(updateData.termsAndConditions);
      } catch (_) {}
    }

    let updated = await adminVisaService.updateVisa(id, updateData, adminId);

    // If country image/picture or country flag files were attached during update, upload to Cloudinary
    const countryImgFile =
      req.files?.countryImage?.[0] ||
      req.files?.countryPicture?.[0] ||
      (req.file && ["countryImage", "countryPicture"].includes(req.file.fieldname)
        ? req.file
        : !req.files && req.file && req.file.fieldname !== "countryFlag"
        ? req.file
        : null);

    const countryFlagFile =
      req.files?.countryFlag?.[0] ||
      (req.file?.fieldname === "countryFlag" ? req.file : null);

    if (countryImgFile) {
      updated = await adminVisaService.uploadCountryImage(
        id,
        countryImgFile.buffer,
        adminId,
        "countryImage"
      );
    }

    if (countryFlagFile) {
      updated = await adminVisaService.uploadCountryImage(
        id,
        countryFlagFile.buffer,
        adminId,
        "countryFlag"
      );
    }

    return sendSuccess(res, {
      message: "Visa updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload Country Picture / Banner Image for a Visa Catalogue entry
 * POST /api/v1/visa/admin/inventory/:id/country-picture
 */
// const uploadCountryPicture = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const adminId = req.user?._id || req.user?.id;
//     const { imageType } = req.body; // e.g. "countryPicture", "bannerImage", "countryFlag", "gallery"

//     if (!req.file && !req.body.countryPicture && !req.body.countryImage && !req.body.imageUrl) {
//       return sendBadRequest(
//         res,
//         "Please provide an image file (multipart/form-data) or imageUrl in the request body"
//       );
//     }

//     let updated;
//     if (req.file) {
//       updated = await adminVisaService.uploadCountryPicture(
//         id,
//         req.file.buffer,
//         adminId,
//         imageType || "countryPicture"
//       );
//     } else {
//       const url = (req.body.countryPicture || req.body.countryImage || req.body.imageUrl || "").trim();
//       const updatePayload = {};
//       if (imageType === "bannerImage") {
//         updatePayload.bannerImage = url;
//       } else if (imageType === "countryFlag") {
//         updatePayload.countryFlag = url;
//       } else {
//         updatePayload.countryImage = url;
//         updatePayload.countryPicture = url;
//       }
//       updated = await adminVisaService.updateVisa(id, updatePayload, adminId);
//     }

//     return sendSuccess(res, {
//       message: "Country picture uploaded and updated successfully",
//       data: updated,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

/**
 * Edit / adjust Visa Stock & Quota availability
 * PATCH /api/v1/visa/admin/inventory/:id/stock
 */
const editVisaStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user?._id || req.user?.id;
    const updated = await adminVisaService.editVisaStock(id, req.body, adminId);
    return sendSuccess(res, {
      message: "Visa inventory stock updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a Visa Catalogue / Inventory item
 * DELETE /api/v1/visa/admin/inventory/:id
 */
const deleteVisa = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;
    const adminId = req.user?._id || req.user?.id;
    const result = await adminVisaService.deleteVisa(id, adminId, {
      permanent: permanent === "true" || permanent === true,
    });
    return sendSuccess(res, {
      message: "Visa deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardOverview,
  getAllVisaApplications,
  getAllVisaGroups,
  getVisaGroupDetails,
  getVisaApplicationDetails,
  assignCaseOfficer,
  updateVisaStatus,
  getEligibleCaseOfficers,
  createStaff,
  createCaseOfficer: createStaff,
  createCaseOfficerStaff: createStaff,
  createVisa,
  getAllVisaInventory,
  getVisaInventoryById,
  updateVisa,
  // uploadCountryPicture,
  editVisaStock,
  deleteVisa,
};
