const mongoose = require("mongoose");
const VisaGroup = require("../user/visaGroup.model");
const VisaApplication = require("../user/visaApplication.model");
const VisaInventory = require("./visaStock1.model");
const User = require("../../auth/auth.model");
const cloudinaryService = require("../../../services/cloudinary.service");
const { AppError } = require("../../../middleware/errorHandler");
const logger = require("../../../utils/logger");
const bcrypt = require("bcryptjs");

/**
 * Helper to upload buffer to Cloudinary using modular cloudinaryService
 */
const uploadBufferToCloudinary = (
  fileBuffer,
  folder = "maqam_travels/visa_countries_images",
  resourceType = "auto"
) => {
  return cloudinaryService.uploadBufferToUrl(fileBuffer, {
    folder,
    resourceType,
  });
};

/**
 * ─── ADMIN VISA SERVICE ──────────────────────────────────────────────
 * Contains all business logic for Visa Admin operations:
 * 1. Dashboard summary and metrics
 * 2. Application and Group batch listing with filters and search
 * 3. Single application and group details with deep population
 * 4. Assigning applications / batches to case officers / agents
 * 5. Updating application statuses, rejection reasons, issued visa URLs
 * 6. Listing & creating eligible case officers
 * 7. Visa Catalogue / Inventory Management (Create, List, Update, Stock Edit, Delete)
 * ────────────────────────────────────────────────────────────────────
 */

/* =========================================================================
   1. DASHBOARD & APPLICATIONS
   ========================================================================= */

/**
 * Get aggregated dashboard statistics for Visa management
 * @returns {Promise<object>} Dashboard metrics
 */
const getDashboardOverview = async () => {
  const [
    statusCounts,
    groupStatusCounts,
    revenueAgg,
    unassignedCount,
    recentApplications,
    totalInventoryCount,
  ] = await Promise.all([
    VisaApplication.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    VisaGroup.aggregate([{ $group: { _id: "$groupStatus", count: { $sum: 1 } } }]),
    VisaGroup.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
    ]),
    VisaApplication.countDocuments({ assignedAgent: null }),
    VisaApplication.find()
      .populate("groupId")
      .populate("submittedBy", "firstName lastName email phone avatar")
      .populate("assignedAgent", "firstName lastName email role avatar")
      .sort({ createdAt: -1 })
      .limit(5),
    VisaInventory.countDocuments({ status: "active", isDeleted: { $ne: true } }),
  ]);

  const summary = {
    totalApplications: 0,
    totalGroups: 0,
    submitted: 0,
    assigned: 0,
    inReview: 0,
    actionRequired: 0,
    approved: 0,
    rejected: 0,
    groupsProcessing: 0,
    groupsCompleted: 0,
    groupsPartiallyApproved: 0,
    groupsRejected: 0,
    unassigned: unassignedCount,
    totalRevenue: revenueAgg[0]?.totalRevenue || 0,
    activeVisaTypes: totalInventoryCount,
    recentApplications,
  };

  statusCounts.forEach((item) => {
    summary.totalApplications += item.count;
    if (item._id === "submitted") summary.submitted = item.count;
    if (item._id === "assigned") summary.assigned = item.count;
    if (item._id === "in_review") summary.inReview = item.count;
    if (item._id === "action_required") summary.actionRequired = item.count;
    if (item._id === "approved") summary.approved = item.count;
    if (item._id === "rejected") summary.rejected = item.count;
  });

  groupStatusCounts.forEach((item) => {
    summary.totalGroups += item.count;
    if (item._id === "processing") summary.groupsProcessing = item.count;
    if (item._id === "completed") summary.groupsCompleted = item.count;
    if (item._id === "partially_approved") summary.groupsPartiallyApproved = item.count;
    if (item._id === "rejected") summary.groupsRejected = item.count;
  });

  return summary;
};

/**
 * Get all visa applications with pagination, search, and filters
 */
const getAllVisaApplications = async ({
  status,
  caseOfficerId,
  assignedAgentId,
  groupId,
  search,
  fromDate,
  toDate,
  page = 1,
  limit = 10,
} = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNum - 1) * limitNum;

  const query = {};

  if (status) {
    query.status = status;
  }

  const agentFilter = assignedAgentId || caseOfficerId;
  if (agentFilter === "unassigned") {
    query.assignedAgent = null;
  } else if (agentFilter && mongoose.Types.ObjectId.isValid(agentFilter)) {
    query.assignedAgent = new mongoose.Types.ObjectId(agentFilter);
  }

  if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
    query.groupId = new mongoose.Types.ObjectId(groupId);
  }

  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = new Date(fromDate);
    if (toDate) query.createdAt.$lte = new Date(toDate);
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), "i");
    query.$or = [
      { "travelerDetails.firstName": searchRegex },
      { "travelerDetails.lastName": searchRegex },
      { "travelerDetails.passportNumber": searchRegex },
      { "travelerDetails.nationality": searchRegex },
    ];
  }

  const [applications, total] = await Promise.all([
    VisaApplication.find(query)
      .populate("groupId")
      .populate("submittedBy", "firstName lastName email phone")
      .populate("assignedAgent", "firstName lastName email phone role avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    VisaApplication.countDocuments(query),
  ]);

  return {
    applications,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  };
};

/**
 * Get all Visa Groups (batches) with pagination and filters
 */
const getAllVisaGroups = async ({
  groupStatus,
  paymentStatus,
  fromDate,
  toDate,
  page = 1,
  limit = 10,
} = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNum - 1) * limitNum;

  const query = {};

  if (groupStatus) {
    query.groupStatus = groupStatus;
  }
  if (paymentStatus) {
    query.paymentStatus = paymentStatus;
  }

  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = new Date(fromDate);
    if (toDate) query.createdAt.$lte = new Date(toDate);
  }

  const [groups, total] = await Promise.all([
    VisaGroup.find(query)
      .populate("submittedBy", "firstName lastName email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    VisaGroup.countDocuments(query),
  ]);

  return {
    groups,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  };
};

/**
 * Get single Visa Group details with all its individual applications
 */
const getVisaGroupById = async (groupId) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    throw new AppError("Invalid Visa Group ID format", 400);
  }

  const group = await VisaGroup.findById(groupId).populate(
    "submittedBy",
    "firstName lastName email phone avatar"
  );

  if (!group) {
    throw new AppError("Visa group batch not found", 404);
  }

  const applications = await VisaApplication.find({ groupId: group._id })
    .populate("assignedAgent", "firstName lastName email phone role avatar")
    .sort({ createdAt: 1 });

  return {
    group,
    applications,
  };
};

/**
 * Get detailed Visa Application by ID
 */
const getVisaApplicationById = async (visaId) => {
  if (!mongoose.Types.ObjectId.isValid(visaId)) {
    throw new AppError("Invalid Visa Application ID format", 400);
  }

  const application = await VisaApplication.findById(visaId)
    .populate("groupId")
    .populate("submittedBy", "firstName lastName email phone avatar createdAt")
    .populate("assignedAgent", "firstName lastName email phone role avatar");

  if (!application) {
    throw new AppError("Visa application not found", 404);
  }

  return application;
};

/**
 * Assign an individual Visa application or an entire group to a Case Officer
 */
const assignCaseOfficer = async ({
  visaId,
  caseOfficerId,
  assignedByAdminId,
  adminRemarks = "",
}) => {
  if (!mongoose.Types.ObjectId.isValid(visaId)) {
    throw new AppError("Invalid Visa ID", 400);
  }
  if (!mongoose.Types.ObjectId.isValid(caseOfficerId)) {
    throw new AppError("Invalid Case Officer ID", 400);
  }

  const officer = await User.findById(caseOfficerId);
  if (!officer) {
    throw new AppError("Case officer not found", 404);
  }

  const allowedRoles = ["admin", "super_admin", "sales_agent", "support_agent"];
  if (!allowedRoles.includes(officer.role)) {
    throw new AppError(
      `User with role '${officer.role}' cannot be assigned as a Case Officer. Allowed roles: ${allowedRoles.join(", ")}`,
      400
    );
  }

  if (officer.isActive === false) {
    throw new AppError("Selected case officer account is inactive", 400);
  }

  // Check if ID refers to a single application
  let application = await VisaApplication.findById(visaId);

  if (application) {
    application.assignedAgent = officer._id;
    if (adminRemarks && adminRemarks.trim()) {
      application.adminNotes = adminRemarks.trim();
    }
    if (application.status === "submitted") {
      application.status = "assigned";
    }
    await application.save();

    logger.info(
      `Visa Application ${visaId} assigned to Case Officer ${officer._id} by Admin ${assignedByAdminId}`
    );

    return await getVisaApplicationById(visaId);
  }

  // Otherwise check if ID refers to a VisaGroup batch
  const group = await VisaGroup.findById(visaId);
  if (group) {
    await VisaApplication.updateMany(
      { groupId: group._id },
      {
        $set: {
          assignedAgent: officer._id,
          status: "assigned",
        },
      }
    );

    logger.info(
      `Visa Group batch ${visaId} assigned to Case Officer ${officer._id} by Admin ${assignedByAdminId}`
    );

    return await getVisaGroupById(visaId);
  }

  throw new AppError("Visa application or group not found", 404);
};

/**
 * Update Visa application status & admin remarks
 */
const updateVisaStatus = async ({
  visaId,
  status,
  adminRemarks = "",
  adminNotes = "",
  rejectionReason = "",
  issuedVisaUrl = null,
}) => {
  if (!mongoose.Types.ObjectId.isValid(visaId)) {
    throw new AppError("Invalid Visa ID", 400);
  }

  const allowedStatuses = [
    "submitted",
    "assigned",
    "in_review",
    "action_required",
    "approved",
    "rejected",
    // Backwards compatibility mappings
    "Pending",
    "Paid",
    "Under Review",
    "Processing",
    "Approved",
    "Rejected",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new AppError(`Invalid status '${status}'. Allowed values: submitted, assigned, in_review, action_required, approved, rejected`, 400);
  }

  // Normalize status to lowercase enum values
  let normalizedStatus = status.toLowerCase().replace(/ /g, "_");
  if (normalizedStatus === "under_review" || normalizedStatus === "processing") {
    normalizedStatus = "in_review";
  } else if (normalizedStatus === "pending" || normalizedStatus === "paid") {
    normalizedStatus = "submitted";
  }

  const updatePayload = {
    status: normalizedStatus,
  };

  const notes = adminNotes || adminRemarks;
  if (notes && notes.trim()) {
    updatePayload.adminNotes = notes.trim();
  }
  if (rejectionReason && rejectionReason.trim()) {
    updatePayload.rejectionReason = rejectionReason.trim();
  }
  if (issuedVisaUrl) {
    updatePayload.issuedVisaUrl = issuedVisaUrl;
  }

  const application = await VisaApplication.findByIdAndUpdate(visaId, updatePayload, {
    new: true,
    runValidators: true,
  });

  if (!application) {
    throw new AppError("Visa application not found", 404);
  }

  // Update parent VisaGroup status based on aggregate child statuses
  if (application.groupId) {
    const siblingApplications = await VisaApplication.find({ groupId: application.groupId });
    const totalCount = siblingApplications.length;
    const approvedCount = siblingApplications.filter((a) => a.status === "approved").length;
    const rejectedCount = siblingApplications.filter((a) => a.status === "rejected").length;

    let newGroupStatus = "processing";
    if (approvedCount === totalCount && totalCount > 0) {
      newGroupStatus = "completed";
    } else if (rejectedCount === totalCount && totalCount > 0) {
      newGroupStatus = "rejected";
    } else if (approvedCount > 0 || rejectedCount > 0) {
      newGroupStatus = "partially_approved";
    }

    await VisaGroup.findByIdAndUpdate(application.groupId, {
      groupStatus: newGroupStatus,
    });
  }

  return await getVisaApplicationById(visaId);
};

/**
 * Get list of eligible staff members who can be assigned as Case Officers
 */
const getEligibleCaseOfficers = async () => {
  return await User.find({
    role: { $in: ["admin", "super_admin", "sales_agent", "support_agent"] },
    isActive: true,
  }).select("firstName lastName email phone role avatar");
};

/**
 * Create a new Case Officer / Staff member
 * @param {object} staffData - Details: firstName, lastName, phone, email, password, role, avatar
 * @param {string} adminId - ID of admin creating the staff member
 * @returns {Promise<object>} Created staff member (sanitized)
 */
const createCaseOfficerStaff = async (staffData, adminId) => {
  const { firstName, lastName, phone, email, password, role = "sales_agent", avatar } = staffData;

  if (!firstName || !firstName.trim()) {
    throw new AppError("First name is required", 400);
  }
  if (!lastName || !lastName.trim()) {
    throw new AppError("Last name is required", 400);
  }
  if (!phone || !phone.trim()) {
    throw new AppError("Phone number is required", 400);
  }
  if (!password || !password.trim()) {
    throw new AppError("Password is required", 400);
  }

  const allowedRoles = ["sales_agent", "support_agent", "admin", "super_admin"];
  const targetRole = role ? role.trim() : "sales_agent";
  if (!allowedRoles.includes(targetRole)) {
    throw new AppError(
      `Invalid role '${targetRole}'. Allowed roles for case officer/staff: ${allowedRoles.join(", ")}`,
      400
    );
  }

  const normalizedPhone = phone.trim();
  const normalizedEmail = email ? email.trim().toLowerCase() : null;

  const existingPhone = await User.findOne({ phone: normalizedPhone });
  if (existingPhone) {
    throw new AppError("Phone number is already registered", 409);
  }

  if (normalizedEmail) {
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      throw new AppError("Email is already registered", 409);
    }
  }

  if (avatar && User.AVATAR_OPTIONS && !User.AVATAR_OPTIONS.includes(avatar)) {
    throw new AppError("Invalid avatar selection", 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phone: normalizedPhone,
    email: normalizedEmail || undefined,
    password: hashedPassword,
    role: targetRole,
    avatar: avatar || undefined,
    isActive: true,
    isVerified: true,
    createdBy: adminId ? String(adminId) : null,
  });

  logger.info(
    `Case officer / staff created: ${newUser._id} (${newUser.phone}) with role ${newUser.role} by Admin ${adminId}`
  );

  return {
    _id: newUser._id,
    id: newUser._id,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    phone: newUser.phone,
    email: newUser.email,
    role: newUser.role,
    avatar: newUser.avatar,
    isActive: newUser.isActive,
    isVerified: newUser.isVerified,
    createdAt: newUser.createdAt,
    updatedAt: newUser.updatedAt,
  };
};

/* =========================================================================
   2. VISA CATALOGUE & INVENTORY MANAGEMENT (ADMIN)
   ========================================================================= */

/**
 * Create a new Visa type / catalogue entry
 */
const createVisaInventory = async (data, adminId) => {
  const {
    country,
    countryCode,
    countryImage,
    countryFlag,
    visaType,
    title,
    entryType,
    validity,
    stayDuration,
    processingTime,
    fees,
    inventory,
    requiredDocuments,
    description,
    guidelines,
    termsAndConditions,
    status,
  } = data;

  if (!country || !country.trim()) {
    throw new AppError("Country is required", 400);
  }
  if (!visaType || !visaType.trim()) {
    throw new AppError("Visa type is required", 400);
  }
  if (!title || !title.trim()) {
    throw new AppError("Visa title is required", 400);
  }
  if (!fees || typeof fees.basePrice !== "number") {
    throw new AppError("Valid fees object with basePrice is required", 400);
  }

  const basePrice = Number(fees.basePrice) || 0;
  const govtFee = Number(fees.governmentFee) || 0;
  const serviceFee = Number(fees.serviceFee) || 0;
  const tax = Number(fees.tax) || 0;
  const totalPrice = fees.totalPrice
    ? Number(fees.totalPrice)
    : basePrice + govtFee + serviceFee + tax;

  const countryImg = (countryImage || "").trim();

  const newVisa = await VisaInventory.create({
    country: country.trim().toUpperCase(),
    countryCode: (countryCode || "").trim().toUpperCase(),
    countryImage: countryImg,
    countryFlag: (countryFlag || "").trim(),
    visaType: visaType.trim(),
    title: title.trim(),
    entryType: entryType || "Single Entry",
    validity: validity || "30 Days",
    stayDuration: stayDuration || "30 Days",
    processingTime: processingTime || "3-5 Working Days",
    fees: {
      basePrice,
      governmentFee: govtFee,
      serviceFee,
      tax,
      totalPrice,
      currency: (fees.currency || "INR").toUpperCase(),
    },
    inventory: {
      isUnlimited:
        inventory?.isUnlimited !== undefined ? Boolean(inventory.isUnlimited) : true,
      totalStock: Number(inventory?.totalStock) || 0,
      availableStock:
        Number(inventory?.availableStock) || Number(inventory?.totalStock) || 0,
      allocatedStock: Number(inventory?.allocatedStock) || 0,
    },
    requiredDocuments: Array.isArray(requiredDocuments) ? requiredDocuments : [],
    description: description || "",
    guidelines: Array.isArray(guidelines) ? guidelines : [],
    termsAndConditions: Array.isArray(termsAndConditions) ? termsAndConditions : [],
    status: status || "active",
    createdBy: adminId,
    updatedBy: adminId,
  });

  logger.info(
    `Visa Inventory created: ${newVisa._id} - ${newVisa.title} (${newVisa.country}) by Admin ${adminId}`
  );
  return newVisa;
};

/**
 * Get all Visa Catalogue / Inventory items with filters & pagination
 */
const getAllVisaInventory = async ({
  page = 1,
  limit = 10,
  country,
  visaType,
  status,
  search,
  includeDeleted = false,
} = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNum - 1) * limitNum;

  const query = {};

  if (!includeDeleted) {
    query.isDeleted = { $ne: true };
  }

  if (status) {
    query.status = status;
  }

  if (country && country.trim()) {
    query.country = new RegExp(`^${country.trim()}$`, "i");
  }

  if (visaType && visaType.trim()) {
    query.visaType = new RegExp(visaType.trim(), "i");
  }

  if (search && search.trim()) {
    const term = search.trim();
    query.$or = [
      { country: new RegExp(term, "i") },
      { title: new RegExp(term, "i") },
      { visaType: new RegExp(term, "i") },
      { description: new RegExp(term, "i") },
    ];
  }

  const [items, total] = await Promise.all([
    VisaInventory.find(query)
      .populate("createdBy", "firstName lastName email")
      .populate("updatedBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    VisaInventory.countDocuments(query),
  ]);

  return {
    inventory: items,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  };
};

/**
 * Get single Visa Catalogue / Inventory item by ID
 */
const getVisaInventoryById = async (id, { includeDeleted = false } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid Visa Inventory ID format", 400);
  }

  const query = { _id: id };
  if (!includeDeleted) {
    query.isDeleted = { $ne: true };
  }

  const item = await VisaInventory.findOne(query)
    .populate("createdBy", "firstName lastName email")
    .populate("updatedBy", "firstName lastName email");

  if (!item) {
    throw new AppError("Visa inventory item not found or has been deleted", 404);
  }

  return item;
};

/**
 * Update Visa Details, Pricing, Requirements, and General Info
 */
const updateVisa = async (id, updateData, adminId) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid Visa Inventory ID format", 400);
  }

  const existing = await VisaInventory.findById(id);
  if (!existing) {
    throw new AppError("Visa inventory item not found", 404);
  }

  if (updateData.fees) {
    const base =
      Number(
        updateData.fees.basePrice !== undefined
          ? updateData.fees.basePrice
          : existing.fees.basePrice
      ) || 0;
    const govt =
      Number(
        updateData.fees.governmentFee !== undefined
          ? updateData.fees.governmentFee
          : existing.fees.governmentFee
      ) || 0;
    const service =
      Number(
        updateData.fees.serviceFee !== undefined
          ? updateData.fees.serviceFee
          : existing.fees.serviceFee
      ) || 0;
    const tax =
      Number(
        updateData.fees.tax !== undefined
          ? updateData.fees.tax
          : existing.fees.tax
      ) || 0;
    updateData.fees.totalPrice = updateData.fees.totalPrice
      ? Number(updateData.fees.totalPrice)
      : base + govt + service + tax;
  }

  if (updateData.country) {
    updateData.country = updateData.country.trim().toUpperCase();
  }

  if ( updateData.countryImage !== undefined) {
    const img = (updateData.countryImage || "").trim();
    updateData.countryImage = img;
    
  }
  if (updateData.countryFlag !== undefined) {
    updateData.countryFlag = (updateData.countryFlag || "").trim();
  }


  updateData.updatedBy = adminId;

  const updated = await VisaInventory.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  })
    .populate("createdBy", "firstName lastName email")
    .populate("updatedBy", "firstName lastName email");

  logger.info(`Visa Inventory updated: ${id} by Admin ${adminId}`);
  return updated;
};

/**
 * Upload and set a Country Picture / Banner Image for a Visa Catalogue entry
 */
const uploadCountryImage = async (id, fileBuffer, adminId, imageType = "countryImage") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid Visa Inventory ID format", 400);
  }
 
  const visa = await VisaInventory.findById(id);
  if (!visa) {
    throw new AppError("Visa inventory item not found", 404);
  }

  const countrySlug = (visa.country || "general").toLowerCase().replace(/\s+/g, "_");
  const folder = `maqam_travels/visa_countries/${countrySlug}`;
  const secureUrl = await uploadBufferToCloudinary(fileBuffer, folder);

  if (imageType === "bannerImage") {
    visa.bannerImage = secureUrl;
  } else if (imageType === "countryFlag") {
    visa.countryFlag = secureUrl;
  } else if (imageType === "gallery") {
    if (!Array.isArray(visa.gallery)) visa.gallery = [];
    visa.gallery.push(secureUrl);
  } else {
    // Default  countryImage
    visa.countryImage = secureUrl;
  
  }

  visa.updatedBy = adminId;
  await visa.save();

  logger.info(
    `Country image (${imageType}) uploaded for Visa ${id} (${visa.country}): ${secureUrl} by Admin ${adminId}`
  );

  return visa;
};

/**
 * Edit / Adjust Visa Stock & Quota
 */
const editVisaStock = async (id, stockData, adminId) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid Visa Inventory ID format", 400);
  }

  const item = await VisaInventory.findById(id);
  if (!item) {
    throw new AppError("Visa inventory item not found", 404);
  }

  if (stockData.isUnlimited !== undefined) {
    item.inventory.isUnlimited = Boolean(stockData.isUnlimited);
  }

  if (stockData.totalStock !== undefined) {
    item.inventory.totalStock = Math.max(0, Number(stockData.totalStock));
    item.inventory.availableStock = Math.max(
      0,
      item.inventory.totalStock - item.inventory.allocatedStock
    );
  }

  if (stockData.adjustment !== undefined) {
    const adj = Number(stockData.adjustment);
    item.inventory.totalStock = Math.max(0, item.inventory.totalStock + adj);
    item.inventory.availableStock = Math.max(0, item.inventory.availableStock + adj);
  }

  if (stockData.availableStock !== undefined) {
    item.inventory.availableStock = Math.max(0, Number(stockData.availableStock));
  }

  if (!item.inventory.isUnlimited && item.inventory.availableStock <= 0) {
    item.status = "out_of_stock";
  } else if (
    item.status === "out_of_stock" &&
    (item.inventory.isUnlimited || item.inventory.availableStock > 0)
  ) {
    item.status = "active";
  }

  item.updatedBy = adminId;
  await item.save();

  logger.info(
    `Visa stock updated for ${id}: total=${item.inventory.totalStock}, available=${item.inventory.availableStock}`
  );
  return item;
};

/**
 * Delete a Visa Catalogue / Inventory item
 * Marks as isDeleted: true, status: "deleted", recording deletedBy & deletedAt.
 * This guarantees immediate removal from both Admin active catalogue & User available visa pages.
 * Supports permanent=true if hard delete is explicitly requested.
 */
const deleteVisa = async (id, adminId, { permanent = false } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid Visa Inventory ID format", 400);
  }

  let item;
  if (permanent) {
    item = await VisaInventory.findByIdAndDelete(id);
  } else {
    item = await VisaInventory.findByIdAndUpdate(
      id,
      {
        $set: {
          isDeleted: true,
          status: "deleted",
          deletedAt: new Date(),
          deletedBy: adminId,
          updatedBy: adminId,
        },
      },
      { new: true }
    );
  }

  if (!item) {
    throw new AppError("Visa inventory item not found", 404);
  }

  logger.info(
    `Visa inventory item ${id} (${item.title}) ${permanent ? "permanently deleted" : "soft-deleted"} by Admin ${adminId}`
  );

  return {
    id,
    title: item.title,
    country: item.country,
    status: item.status,
    isDeleted: true,
    deletedAt: item.deletedAt || new Date(),
    message: "Visa deleted successfully and removed from active catalogue for admin and user pages",
  };
};

module.exports = {
  getDashboardOverview,
  getAllVisaApplications,
  getAllVisaGroups,
  getVisaGroupById,
  getVisaApplicationById,
  assignCaseOfficer,
  updateVisaStatus,
  getEligibleCaseOfficers,
  createCaseOfficerStaff,
  createStaff: createCaseOfficerStaff,
  createVisaInventory,
  getAllVisaInventory,
  getVisaInventoryById,
  updateVisa,
  uploadCountryImage,
  editVisaStock,
  deleteVisa,
};
