const mongoose = require("mongoose");
const VisaGroup = require("./visaGroup.model");
const VisaApplication = require("./visaApplication.model");
const VisaInventory = require("../visaAdmin/visaStock1.model");
const cloudinaryService = require("../../../services/cloudinary.service");
const { AppError } = require("../../../middleware/errorHandler");
const logger = require("../../../utils/logger");

/**
 * Helper to upload buffer to Cloudinary using modular cloudinaryService
 * @param {Buffer} fileBuffer - The file buffer from multer memory storage
 * @param {string} folder - Cloudinary destination folder
 * @param {string} resourceType - Resource type ('auto', 'image', 'raw')
 * @returns {Promise<string>} - The uploaded file's secure_url
 */
const uploadBufferToCloudinary = (
  fileBuffer,
  folder = "maqam_travels/visas",
  resourceType = "auto"
) => {
  return cloudinaryService.uploadBufferToUrl(fileBuffer, {
    folder,
    resourceType,
  });
};

/**
 * Normalizes applicant inputs into standardized travelerDetails objects
 */
const normalizeApplicantData = (applicant) => {
  if (!applicant) return null;

  // Extract namePrefix / title
  let namePrefix = (
    applicant.namePrefix ||
    applicant.title ||
    applicant.prefix ||
    applicant.nameTitle ||
    ""
  ).trim();

  // Support both firstName/lastName and single fullName string
  let firstName = (applicant.firstName || applicant.fname || "").trim();
  let lastName = (applicant.lastName || applicant.lname || "").trim();
  const rawFullName = (applicant.name || applicant.fullName || applicant.Name || "").trim();

  if ((!firstName || !lastName) && rawFullName) {
    const prefixRegex = /^(mr|mrs|ms|miss|mstr|master|dr|prof)\.?\s+/i;
    const match = rawFullName.match(prefixRegex);
    let cleanName = rawFullName;
    if (match) {
      if (!namePrefix) {
        namePrefix = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      }
      cleanName = rawFullName.replace(prefixRegex, "").trim();
    }

    const parts = cleanName.split(/\s+/);
    if (!firstName) {
      firstName = parts[0] || "Traveler";
    }
    if (!lastName) {
      lastName = parts.slice(1).join(" ") || parts[0] || "Applicant";
    }
  }

  if (!namePrefix) {
    namePrefix = "Mr";
  }

  const passportNumber = (
    applicant.passportNumber ||
    applicant.passportNo ||
    applicant.passport_number ||
    applicant.passport ||
    ""
  )
    .trim()
    .toUpperCase();

  let dateOfBirth = applicant.dateOfBirth || applicant.dob || applicant.birthDate;
  dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
  if (!dateOfBirth || isNaN(dateOfBirth.getTime())) {
    dateOfBirth = new Date("1990-01-01");
  }

  const nationality = (
    applicant.nationality ||
    applicant.country ||
    applicant.citizenOf ||
    "Indian"
  ).trim();

  let gender = (applicant.gender || "").toLowerCase().trim();
  if (!["male", "female", "other"].includes(gender)) {
    const p = namePrefix.toLowerCase().replace(".", "");
    if (["mrs", "ms", "miss"].includes(p)) {
      gender = "female";
    } else {
      gender = "male";
    }
  }

  const occupation = (
    applicant.occupation ||
    applicant.occupationOfTravller ||
    applicant.profession ||
    ""
  ).trim();

  return {
    namePrefix,
    title: namePrefix,
    firstName: firstName || "Traveler",
    lastName: lastName || "Applicant",
    passportNumber: passportNumber || "PENDING",
    dateOfBirth,
    nationality,
    gender,
    occupation,
  };
};

/**
 * Creates a VisaGroup (Parent Batch) and individual VisaApplication records
 * @param {object} params
 * @param {string} params.userId - Authenticated User ID
 * @param {string} params.destinationCountry - Target country (e.g. 'Saudi Arabia')
 * @param {string} params.visaType - Visa offering title/type (e.g. 'Umrah Visa')
 * @param {Array<object>} params.applicants - Array of applicant objects
 * @param {number} [params.totalAmount] - Total price
 * @returns {Promise<object>} Created VisaGroup and VisaApplications
 */
const createVisaBatch = async ({
  userId,
  destinationCountry,
  visaType,
  applicants = [],
  totalAmount = null,
}) => {
  if (!userId) {
    throw new AppError("User ID is required", 400);
  }
  if (!destinationCountry || !destinationCountry.trim()) {
    throw new AppError("destinationCountry is required", 400);
  }
  if (!visaType || !visaType.trim()) {
    throw new AppError("visaType is required", 400);
  }

  // Handle single applicant fallback or array
  let rawApplicants = Array.isArray(applicants) ? applicants : [];
  if (rawApplicants.length === 0) {
    throw new AppError("At least one applicant is required in 'applicants' array", 400);
  }

  const normalizedApplicants = rawApplicants.map((app, index) => {
    const normalized = normalizeApplicantData(app);
    if (!normalized.firstName || !normalized.lastName) {
      throw new AppError(`Applicant at index ${index} must have firstName and lastName`, 400);
    }
    if (!normalized.passportNumber) {
      throw new AppError(`Applicant at index ${index} must have a valid passportNumber`, 400);
    }

    let additionalDocs =
      app.documents?.additionalDocs ||
      app.additionalDocs ||
      app.existingVisaPhoto ||
      [];
    if (typeof additionalDocs === "string") {
      additionalDocs = [additionalDocs];
    } else if (!Array.isArray(additionalDocs)) {
      additionalDocs = [];
    }

    return {
      travelerDetails: normalized,
      documents: {
        passportScan:
          app.documents?.passportScan ||
          app.documents?.passportPhoto ||
          app.passportScan ||
          app.passportPhoto ||
          "",
        photo:
          app.documents?.photo ||
          app.documents?.travellerPhoto ||
          app.photo ||
          app.travellerPhoto ||
          "",
        additionalDocs,
      },
    };
  });

  const totalApplicants = normalizedApplicants.length;

  // Compute total amount if not explicitly passed
  let calculatedAmount = Number(totalAmount);
  if (isNaN(calculatedAmount) || calculatedAmount <= 0) {
    const inventoryItem = await VisaInventory.findOne({
      country: new RegExp(`^${destinationCountry.trim()}$`, "i"),
      status: "active",
    });

    if (inventoryItem && inventoryItem.fees?.totalPrice) {
      calculatedAmount = inventoryItem.fees.totalPrice * totalApplicants;
    } else {
      calculatedAmount = 0;
    }
  }

  // 1. Create VisaGroup (Parent Batch)
  const visaGroup = await VisaGroup.create({
    submittedBy: userId,
    destinationCountry: destinationCountry.trim(),
    visaType: visaType.trim(),
    totalApplicants,
    totalAmount: calculatedAmount,
    paymentStatus: "pending",
    groupStatus: "processing",
  });

  // 2. Create individual VisaApplication records
  const applicationsToInsert = normalizedApplicants.map((app) => ({
    groupId: visaGroup._id,
    submittedBy: userId,
    assignedAgent: null,
    travelerDetails: app.travelerDetails,
    documents: app.documents,
    status: "submitted",
    adminNotes: "",
    rejectionReason: "",
    issuedVisaUrl: null,
  }));

  const createdApplications = await VisaApplication.insertMany(applicationsToInsert);

  logger.info(
    `VisaGroup batch ${visaGroup._id} created with ${createdApplications.length} applications by User ${userId}`
  );

  return {
    group: visaGroup,
    applications: createdApplications,
  };
};

/**
 * Get all visa batches (groups) submitted by a user
 */
const getUserVisaGroups = async (userId, { page = 1, limit = 10, groupStatus } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNum - 1) * limitNum;

  const query = { submittedBy: userId };
  if (groupStatus) {
    query.groupStatus = groupStatus;
  }

  const [groups, total] = await Promise.all([
    VisaGroup.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
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
 * Get details of a single VisaGroup along with all its individual applications
 */
const getUserVisaGroupDetails = async (groupId, userId = null) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    throw new AppError("Invalid Visa Group ID format", 400);
  }

  const groupQuery = { _id: groupId };
  if (userId) {
    groupQuery.submittedBy = userId;
  }

  const group = await VisaGroup.findOne(groupQuery).populate(
    "submittedBy",
    "firstName lastName email phone avatar"
  );

  if (!group) {
    throw new AppError("Visa group submission not found", 404);
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
 * Get a single individual VisaApplication by ID
 */
const getVisaApplicationById = async (applicationId, userId = null) => {
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    throw new AppError("Invalid Visa Application ID format", 400);
  }

  const query = { _id: applicationId };
  if (userId) {
    query.submittedBy = userId;
  }

  const application = await VisaApplication.findOne(query)
    .populate("groupId")
    .populate("submittedBy", "firstName lastName email phone avatar")
    .populate("assignedAgent", "firstName lastName email phone role avatar");

  if (!application) {
    throw new AppError("Visa application not found", 404);
  }

  return application;
};

/**
 * Upload an applicant document (passportScan, photo, additionalDocs) to Cloudinary
 */
const uploadApplicationDocument = async ({
  applicationId,
  docType,
  file,
  userId = null,
}) => {
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    throw new AppError("Invalid Visa Application ID format", 400);
  }

  const allowedDocTypes = ["passportScan", "photo", "additionalDocs"];
  if (!allowedDocTypes.includes(docType)) {
    throw new AppError(
      `Invalid docType '${docType}'. Allowed: ${allowedDocTypes.join(", ")}`,
      400
    );
  }

  if (!file || !file.buffer) {
    throw new AppError("File is required for upload", 400);
  }

  const query = { _id: applicationId };
  if (userId) {
    query.submittedBy = userId;
  }

  const application = await VisaApplication.findOne(query);
  if (!application) {
    throw new AppError("Visa application not found", 404);
  }

  // Upload to Cloudinary
  const fileUrl = await uploadBufferToCloudinary(
    file.buffer,
    `maqam_travels/visas/${applicationId}`
  );

  if (docType === "passportScan") {
    application.documents.passportScan = fileUrl;
  } else if (docType === "photo") {
    application.documents.photo = fileUrl;
  } else if (docType === "additionalDocs") {
    if (!Array.isArray(application.documents.additionalDocs)) {
      application.documents.additionalDocs = [];
    }
    application.documents.additionalDocs.push(fileUrl);
  }

  await application.save();
  logger.info(`Document '${docType}' uploaded for Visa Application ${applicationId}`);

  return application;
};

/**
 * Append additional applicant(s) to an existing VisaGroup
 */
const addApplicantToGroup = async ({ groupId, userId, applicantData }) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    throw new AppError("Invalid Visa Group ID format", 400);
  }

  const groupQuery = { _id: groupId };
  if (userId) {
    groupQuery.submittedBy = userId;
  }

  const group = await VisaGroup.findOne(groupQuery);
  if (!group) {
    throw new AppError("Visa group not found", 404);
  }

  const normalized = normalizeApplicantData(applicantData);
  if (!normalized.firstName || !normalized.lastName) {
    throw new AppError("Applicant must have firstName and lastName", 400);
  }
  if (!normalized.passportNumber) {
    throw new AppError("Applicant must have a valid passportNumber", 400);
  }

  const newApplication = await VisaApplication.create({
    groupId: group._id,
    submittedBy: group.submittedBy,
    assignedAgent: null,
    travelerDetails: normalized,
    documents: {
      passportScan: applicantData.documents?.passportScan || applicantData.passportScan || "",
      photo: applicantData.documents?.photo || applicantData.photo || "",
      additionalDocs: applicantData.documents?.additionalDocs || [],
    },
    status: "submitted",
  });

  group.totalApplicants += 1;
  await group.save();

  logger.info(`Applicant ${newApplication._id} added to VisaGroup ${group._id}`);

  return {
    group,
    application: newApplication,
  };
};

/**
 * ─── UNIFIED VISA ROUTE FOR USERS ────────────────────────────────────
 * Fetches in a single endpoint without query:
 * 1. All available Visa Offerings created by Admin (VisaInventory) with country picture/flag.
 * 2. All Visas applied by the user themself (VisaGroup + child VisaApplications with statuses).
 * 3. Overview summary metrics.
 */
const getUserVisasOverview = async ({ userId } = {}) => {
  // 1. Prepare available visa query (Admin catalogue - active & non-deleted)
  const catalogueQuery = {
    isDeleted: { $ne: true },
    status: { $in: ["active", "out_of_stock"] },
  };

  // 2. Prepare user applied visas query (My Submissions)
  const userAppsQuery = {};
  if (userId) {
    userAppsQuery.submittedBy = userId;
  }

  const [
    availableVisas,
    totalAvailable,
    userGroups,
    totalUserSubmissions,
    userProcessingCount,
    userCompletedCount,
  ] = await Promise.all([
    VisaInventory.find(catalogueQuery)
      .select("-createdBy -updatedBy")
      .sort({ createdAt: -1 }),
    VisaInventory.countDocuments(catalogueQuery),
    userId
      ? VisaGroup.find(userAppsQuery).sort({ createdAt: -1 }).lean()
      : Promise.resolve([]),
    userId ? VisaGroup.countDocuments(userAppsQuery) : Promise.resolve(0),
    userId
      ? VisaGroup.countDocuments({
          submittedBy: userId,
          groupStatus: "processing",
        })
      : Promise.resolve(0),
    userId
      ? VisaGroup.countDocuments({
          submittedBy: userId,
          groupStatus: "completed",
        })
      : Promise.resolve(0),
  ]);

  let myApplications = [];

  // Populate individual traveler application records for each VisaGroup
  if (userGroups && userGroups.length > 0) {
    const groupIds = userGroups.map((g) => g._id);
    const allChildApps = await VisaApplication.find({ groupId: { $in: groupIds } })
      .populate("assignedAgent", "firstName lastName email phone avatar")
      .lean();

    const appsByGroup = {};
    allChildApps.forEach((app) => {
      const gId = String(app.groupId);
      if (!appsByGroup[gId]) appsByGroup[gId] = [];
      appsByGroup[gId].push(app);
    });

    myApplications = userGroups.map((grp) => ({
      ...grp,
      applications: appsByGroup[String(grp._id)] || [],
    }));
  }

  const summary = {
    totalAvailableVisas: totalAvailable,
    totalMyApplications: totalUserSubmissions,
    myProcessingApplications: userProcessingCount,
    myCompletedApplications: userCompletedCount,
  };

  return {
    availableVisas: availableVisas || [],
    myApplications,
    summary,
  };
};

module.exports = {
  uploadBufferToCloudinary,
  getUserVisasOverview,
  createVisaBatch,
  getUserVisaGroups,
  getUserVisaGroupDetails,
  getVisaApplicationById,
  uploadApplicationDocument,
  addApplicantToGroup,
  // Backwards compatibility alias
  createApplicationWithName: async ({
    userId,
    Name,
    occupationOfTravller,
    visaType = "Umrah Visa",
    destinationCountry = "Saudi Arabia",
    totalAmount = 0,
  }) => {
    return await createVisaBatch({
      userId,
      destinationCountry,
      visaType,
      totalAmount,
      applicants: [
        {
          Name,
          occupationOfTravller,
          firstName: Name?.split(" ")?.[0] || "Traveler",
          lastName: Name?.split(" ")?.slice(1)?.join(" ") || "Applicant",
          passportNumber: "PENDING",
          dateOfBirth: "1990-01-01",
          nationality: "Indian",
        },
      ],
    });
  },
};
