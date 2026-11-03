// modules/packages/admin/packageAdmin.controller.js
const packageService = require("../core/package.service");
const {
  validateCreatePackage,
  validateUpdatePackage,
} = require("../core/package.validator");
const { sendSuccess, sendCreated } = require("../../../utils/apiResponse");

const adminListPackages = async (req, res) => {
  const result = await packageService.listPackagesAdmin(req.query);
  return sendSuccess(res, {
    message: "Packages retrieved successfully",
    data: result.packages,
    meta: result.meta,
  });
};

const adminGetPackage = async (req, res) => {
  const pkg = await packageService.getPackageByIdAdmin(req.params.id);
  return sendSuccess(res, {
    message: "Package details retrieved successfully",
    data: pkg,
  });
};

const cloudinaryService = require("../../../services/cloudinary.service");
const { AppError } = require("../../../middleware/errorHandler");

const parseFormDataPackageBody = (body) => {
  const parsed = { ...body };
  if (typeof parsed.offerRefs === "string") {
    try { parsed.offerRefs = JSON.parse(parsed.offerRefs); } catch {}
  }
  if (typeof parsed.itinerary === "string") {
    try { parsed.itinerary = JSON.parse(parsed.itinerary); } catch {}
  }
  if (typeof parsed.inclusions === "string") {
    try { parsed.inclusions = JSON.parse(parsed.inclusions); } catch {}
  }
  if (typeof parsed.validity === "string") {
    try { parsed.validity = JSON.parse(parsed.validity); } catch {}
  }
  if (typeof parsed.images === "string") {
    try { parsed.images = JSON.parse(parsed.images); } catch { parsed.images = [parsed.images]; }
  }
  if (parsed.bundleDiscountPercentage !== undefined && typeof parsed.bundleDiscountPercentage === "string") {
    parsed.bundleDiscountPercentage = Number(parsed.bundleDiscountPercentage);
  }
  if (parsed.sellPrice !== undefined && typeof parsed.sellPrice === "string") {
    parsed.sellPrice = Number(parsed.sellPrice);
  }
  if (parsed.isActive !== undefined && typeof parsed.isActive === "string") {
    parsed.isActive = parsed.isActive === "true";
  }
  if (parsed.isPublic !== undefined && typeof parsed.isPublic === "string") {
    parsed.isPublic = parsed.isPublic === "true";
  }
  return parsed;
};

const adminCreatePackage = async (req, res, next) => {
  try {
    const data = parseFormDataPackageBody(req.body);

    const files = req.files || (req.file ? [req.file] : []);
    if (files.length > 0) {
      const uploadResults = await cloudinaryService.uploadMultipleBuffers(files, {
        folder: "travel-agency/packages",
      });
      const fileUrls = uploadResults.map((r) => r.url);
      data.images = Array.isArray(data.images)
        ? [...data.images, ...fileUrls]
        : fileUrls;
    }

    validateCreatePackage(data);
    const pkg = await packageService.createPackage(data, req.user.id);
    sendCreated(res, { message: "Package created successfully", data: pkg });
  } catch (error) {
    next(error);
  }
};

const adminUpdatePackage = async (req, res, next) => {
  try {
    const data = parseFormDataPackageBody(req.body);

    const files = req.files || (req.file ? [req.file] : []);
    if (files.length > 0) {
      const uploadResults = await cloudinaryService.uploadMultipleBuffers(files, {
        folder: "travel-agency/packages",
      });
      const fileUrls = uploadResults.map((r) => r.url);
      data.images = Array.isArray(data.images)
        ? [...data.images, ...fileUrls]
        : fileUrls;
    }

    validateUpdatePackage(data);
    const pkg = await packageService.updatePackage(req.params.id, data);
    sendSuccess(res, { message: "Package updated successfully", data: pkg });
  } catch (error) {
    next(error);
  }
};

const adminDeactivatePackage = async (req, res) => {
  const pkg = await packageService.deactivatePackage(req.params.id);
  sendSuccess(res, { message: "Package deactivated successfully", data: pkg });
};

const adminUploadPackageImages = async (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    if (files.length === 0) {
      throw new AppError("No image files provided for upload", 400);
    }

    const uploadResults = await cloudinaryService.uploadMultipleBuffers(files, {
      folder: "travel-agency/packages",
    });

    const urls = uploadResults.map((r) => r.url);

    sendSuccess(res, {
      message: "Package images uploaded successfully",
      data: {
        urls,
        assets: uploadResults,
      },
    });
  } catch (error) {
    next(error);
  }
};

const adminAttachPackageImages = async (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    let newUrls = req.body.images || [];

    if (typeof newUrls === "string") {
      newUrls = [newUrls];
    }

    if (files.length > 0) {
      const uploadResults = await cloudinaryService.uploadMultipleBuffers(files, {
        folder: "travel-agency/packages",
      });
      newUrls = [...newUrls, ...uploadResults.map((r) => r.url)];
    }

    if (newUrls.length === 0) {
      throw new AppError("No image files or URLs provided", 400);
    }

    const pkg = await packageService.addPackageImages(req.params.id, newUrls);

    sendSuccess(res, {
      message: "Images attached to package successfully",
      data: pkg,
    });
  } catch (error) {
    next(error);
  }
};

const adminRemovePackageImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) throw new AppError("imageUrl is required in request body", 400);

    const pkg = await packageService.removePackageImage(req.params.id, imageUrl);

    // Optionally cleanup asset from Cloudinary in background
    const publicId = cloudinaryService.extractPublicIdFromUrl(imageUrl);
    if (publicId) {
      cloudinaryService.deleteByPublicId(publicId).catch(() => {});
    }

    sendSuccess(res, {
      message: "Image removed from package successfully",
      data: pkg,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  adminListPackages,
  adminGetPackage,
  adminCreatePackage,
  adminUpdatePackage,
  adminDeactivatePackage,
  adminUploadPackageImages,
  adminAttachPackageImages,
  adminRemovePackageImage,
};
