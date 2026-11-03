const visaService = require("./visa.service");
const {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendBadRequest,
} = require("../../../utils/apiResponse");

/**
 * ─── USER VISA CONTROLLER ─────────────────────────────────────────────
 * Implements the batch submission and traveler management flow:
 * 1. POST /api/v1/visa/user/applications (Batch submit: VisaGroup + N VisaApplications)
 * 2. GET /api/v1/visa/user/groups (List user's batch submissions)
 * 3. GET /api/v1/visa/user/groups/:id (Single batch details with all applications)
 * 4. GET /api/v1/visa/user/applications/:id (Individual visa application details)
 * 5. POST /api/v1/visa/user/applications/:id/documents/:docType (Upload passportScan/photo/additionalDocs)
 * 6. POST /api/v1/visa/user/groups/:id/applicants (Add traveler to existing batch)
 * ────────────────────────────────────────────────────────────────────
 */

/**
 * Helper to safely parse JSON strings if coming from multipart form data
 */
const parseJsonSafely = (value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        return JSON.parse(trimmed);
      } catch (e) {
        // Return as-is if JSON parsing fails
      }
    }
  }
  return value;
};

/**
 * Create a new Visa Application (Single or Batch / Group with Documents)
 * Handles both single applicant (object) and multiple applicants (array of objects)
 * Handles direct multipart file uploads or document URLs
 * POST /api/v1/visa/user/applications
 */
const createApplication = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return sendBadRequest(res, "Authenticated user is required");
    }

    const body = req.body || {};

    let destinationCountry =
      body.destinationCountry || body.country || body.targetCountry;
    let visaType = body.visaType || body.visaCategory;
    let totalAmount = body.totalAmount;

    // Extract applicant details from various supported formats:
    // 1. userDetails (Object for single, Array of Objects for multiple)
    // 2. applicants (Object or Array)
    // 3. applicant (Object)
    // 4. travelers / travelerDetails (Object or Array)
    // 5. Flat fields in body (for single applicant form submission)
    let userDetails = parseJsonSafely(body.userDetails);
    let applicants = parseJsonSafely(body.applicants);
    let applicant = parseJsonSafely(body.applicant);
    let travelers = parseJsonSafely(body.travelers);
    let travelerDetails = parseJsonSafely(body.travelerDetails);

    let rawApplicants = [];

    if (Array.isArray(userDetails)) {
      rawApplicants = userDetails;
    } else if (userDetails && typeof userDetails === "object") {
      rawApplicants = [userDetails];
    } else if (Array.isArray(applicants)) {
      rawApplicants = applicants;
    } else if (applicants && typeof applicants === "object") {
      rawApplicants = [applicants];
    } else if (Array.isArray(travelers)) {
      rawApplicants = travelers;
    } else if (travelers && typeof travelers === "object") {
      rawApplicants = [travelers];
    } else if (applicant && typeof applicant === "object") {
      rawApplicants = [applicant];
    } else if (travelerDetails && typeof travelerDetails === "object") {
      rawApplicants = Array.isArray(travelerDetails)
        ? travelerDetails
        : [travelerDetails];
    } else if (
      body.name ||
      body.firstName ||
      body.Name ||
      body.passportNumber ||
      body.namePrefix ||
      body.title
    ) {
      // Single applicant fields sent flat in request body
      rawApplicants = [
        {
          namePrefix: body.namePrefix || body.title,
          title: body.title || body.namePrefix,
          firstName: body.firstName || body.Name?.split(" ")?.[0],
          lastName:
            body.lastName || body.Name?.split(" ")?.slice(1)?.join(" "),
          name: body.name || body.Name,
          passportNumber: body.passportNumber || body.passportNo,
          dateOfBirth: body.dateOfBirth || body.dob,
          nationality: body.nationality,
          gender: body.gender,
          occupation: body.occupation || body.occupationOfTravller,
          passportScan: body.passportScan || body.passportPhoto,
          photo: body.photo || body.travellerPhoto,
          additionalDocs: body.additionalDocs || body.existingVisaPhoto,
        },
      ];
    }

    if (!destinationCountry) {
      return sendBadRequest(res, "destinationCountry is required");
    }
    if (!visaType) {
      return sendBadRequest(res, "visaType is required");
    }

    if (!rawApplicants || rawApplicants.length === 0) {
      return sendBadRequest(
        res,
        "User details / applicant information is required (object for single visa, or array of objects for multiple visas)"
      );
    }

    // Process file uploads if present (multipart/form-data)
    const uploadedFiles = req.files || (req.file ? [req.file] : []);

    if (uploadedFiles.length > 0) {
      // Track counts of generic field names (e.g. passportScan, photo) for sequential assignment
      const genericFieldCounts = {};

      for (const file of uploadedFiles) {
        const field = file.fieldname;
        let targetIndex = 0;
        let docType = "additionalDocs";

        // Check for indexed fieldnames like:
        // passportScan_0, photo_1, passportScan[0], applicants[0][photo], userDetails[1][passportScan]
        const indexedMatch = field.match(
          /([a-zA-Z0-9_]+)[\[_](\d+)[\]_]?(\[?([a-zA-Z0-9_]+)\]?)?/
        );

        if (indexedMatch && !isNaN(parseInt(indexedMatch[2], 10))) {
          targetIndex = parseInt(indexedMatch[2], 10);
          const subField = (
            indexedMatch[4] ||
            indexedMatch[1] ||
            ""
          ).toLowerCase();
          if (subField.includes("passport")) {
            docType = "passportScan";
          } else if (
            subField.includes("photo") ||
            subField.includes("traveller") ||
            subField.includes("avatar")
          ) {
            docType = "photo";
          } else {
            docType = "additionalDocs";
          }
        } else {
          // Generic unindexed fieldname
          const lower = field.toLowerCase();
          if (lower.includes("passport")) {
            docType = "passportScan";
          } else if (
            lower.includes("photo") ||
            lower.includes("traveller") ||
            lower.includes("avatar")
          ) {
            docType = "photo";
          } else {
            docType = "additionalDocs";
          }

          if (!genericFieldCounts[docType]) {
            genericFieldCounts[docType] = 0;
          }
          if (rawApplicants.length > 1) {
            targetIndex =
              genericFieldCounts[docType] < rawApplicants.length
                ? genericFieldCounts[docType]
                : 0;
          } else {
            targetIndex = 0;
          }
          genericFieldCounts[docType]++;
        }

        // Upload buffer to Cloudinary
        const fileUrl = await visaService.uploadBufferToCloudinary(
          file.buffer,
          "maqam_travels/visas/documents"
        );

        if (!rawApplicants[targetIndex]) {
          rawApplicants[targetIndex] = {};
        }

        if (!rawApplicants[targetIndex].documents) {
          rawApplicants[targetIndex].documents = {
            passportScan: "",
            photo: "",
            additionalDocs: [],
          };
        }

        if (docType === "passportScan") {
          rawApplicants[targetIndex].documents.passportScan = fileUrl;
          rawApplicants[targetIndex].passportScan = fileUrl;
        } else if (docType === "photo") {
          rawApplicants[targetIndex].documents.photo = fileUrl;
          rawApplicants[targetIndex].photo = fileUrl;
        } else {
          if (
            !Array.isArray(rawApplicants[targetIndex].documents.additionalDocs)
          ) {
            rawApplicants[targetIndex].documents.additionalDocs = [];
          }
          rawApplicants[targetIndex].documents.additionalDocs.push(fileUrl);
        }
      }
    }

    const result = await visaService.createVisaBatch({
      userId,
      destinationCountry,
      visaType,
      applicants: rawApplicants,
      totalAmount,
    });

    const isSingle = result.applications.length === 1;
    const message = isSingle
      ? "Visa application created successfully"
      : "Visa group batch and application(s) created successfully";

    return sendCreated(res, result, message);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Visa Group submissions for the authenticated user
 * GET /api/v1/visa/user/groups
 */
const getUserGroups = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { page = 1, limit = 10, groupStatus } = req.query;

    const result = await visaService.getUserVisaGroups(userId, {
      page: Number(page),
      limit: Number(limit),
      groupStatus,
    });

    return sendPaginated(res, {
      message: "User visa groups retrieved successfully",
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
 * Get details of a single VisaGroup with its child VisaApplications
 * GET /api/v1/visa/user/groups/:id
 */
const getUserGroupDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const result = await visaService.getUserVisaGroupDetails(id, userId);

    return sendSuccess(res, {
      message: "Visa group details retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single individual VisaApplication
 * GET /api/v1/visa/user/applications/:id
 */
const getApplicationDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const application = await visaService.getVisaApplicationById(id, userId);

    return sendSuccess(res, {
      message: "Visa application details retrieved successfully",
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload document for a specific VisaApplication (passportScan, photo, additionalDocs)
 * POST /api/v1/visa/user/applications/:id/documents/:docType
 */
const uploadDocument = async (req, res, next) => {
  try {
    const { id, docType } = req.params;
    const userId = req.user?._id || req.user?.id;
    const file = req.file || req.files?.file?.[0];

    if (!file) {
      return sendBadRequest(res, `No file provided for upload (${docType})`);
    }

    const application = await visaService.uploadApplicationDocument({
      applicationId: id,
      docType,
      file,
      userId,
    });

    return sendSuccess(res, {
      message: `Document '${docType}' uploaded successfully`,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add an applicant to an existing VisaGroup
 * POST /api/v1/visa/user/groups/:id/applicants
 */
const addApplicant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const result = await visaService.addApplicantToGroup({
      groupId: id,
      userId,
      applicantData: req.body,
    });

    return sendCreated(res, result, "Applicant added to visa group successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * Unified Visa Route for Users:
 * Returns available catalogue visas created by admin AND visas applied by the authenticated user in one route.
 * GET /api/v1/visa/user/visas
 */
const getUserVisasOverview = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const result = await visaService.getUserVisasOverview({ userId });

    return sendSuccess(res, {
      message: "All visas retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserVisasOverview,
  createApplication,
  getUserGroups,
  getUserGroupDetails,
  getApplicationDetails,
  uploadDocument,
  addApplicant,
  // Backwards compatibility aliases
  getTravelerDocuments: async (req, res, next) => {
    try {
      const { travelerId } = req.params;
      const app = await visaService.getVisaApplicationById(travelerId);
      return sendSuccess(res, {
        message: "Traveler details retrieved",
        data: app,
      });
    } catch (err) {
      next(err);
    }
  },
  addTraveler: addApplicant,
};
