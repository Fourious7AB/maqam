// middleware/upload.js
//
// Modular Multer upload middleware using memoryStorage for streaming to Cloudinary.
// Supports single file, arrays of files, and multiple custom field mappings.

const multer = require("multer");
const { AppError } = require("./errorHandler");

const storage = multer.memoryStorage();

/**
 * Standard image file filter (jpg, jpeg, png, webp, gif)
 */
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new AppError("Invalid file type: Only image files are allowed", 400), false);
  }
};

/**
 * Document file filter (images + pdfs + doc/docx)
 */
const documentFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError("Invalid file type: Only images and PDF/Word documents are allowed", 400), false);
  }
};

/**
 * Base multer instance generator
 */
const createUploader = (options = {}) => {
  const {
    fileSize = 5 * 1024 * 1024, // 5 MB default limit
    fileFilter = imageFileFilter,
  } = options;

  return multer({
    storage,
    limits: { fileSize },
    fileFilter,
  });
};

/**
 * Convenience middleware generators
 */
const uploadSingle = (fieldName = "image", options = {}) => {
  return createUploader(options).single(fieldName);
};

const uploadArray = (fieldName = "images", maxCount = 10, options = {}) => {
  return createUploader(options).array(fieldName, maxCount);
};

const uploadFields = (fieldsArray = [], options = {}) => {
  return createUploader(options).fields(fieldsArray);
};

module.exports = {
  uploadSingle,
  uploadArray,
  uploadFields,
  createUploader,
  imageFileFilter,
  documentFileFilter,
};