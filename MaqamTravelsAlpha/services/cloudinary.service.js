// services/cloudinary.service.js
//
// Modular Cloudinary service for streaming file buffers, multiple uploads,
// and resource deletion across all modules (Packages, Offers, Hotels, Visa, etc.)

const cloudinary = require("../utils/cloudinary");
const logger = require("../utils/logger");
const { AppError } = require("../middleware/errorHandler");

/**
 * Upload a single in-memory buffer to Cloudinary using upload_stream
 * @param {Buffer} fileBuffer - Binary buffer from Multer memoryStorage
 * @param {Object} options - Cloudinary options (folder, resourceType, tags, transformation, etc.)
 * @returns {Promise<{ url: string, publicId: string, format: string, bytes: number }>}
 */
const uploadBuffer = (fileBuffer, options = {}) => {
  const {
    folder = "travel-agency",
    resourceType = "auto",
    tags = [],
    transformation = [],
  } = options;

  return new Promise((resolve, reject) => {
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      return reject(new AppError("Invalid or missing file buffer for upload", 400));
    }

    const uploadOptions = {
      folder,
      resource_type: resourceType,
      tags,
      transformation,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          logger.error(`Cloudinary stream upload error: ${error.message}`);
          return reject(
            new AppError(`Cloudinary upload failed: ${error.message}`, 500)
          );
        }

        logger.info(
          `Cloudinary asset uploaded successfully: ${result.public_id} (${result.secure_url})`
        );

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Upload multiple in-memory buffers in parallel to Cloudinary
 * @param {Array<{ buffer: Buffer, originalname?: string }>} files - Array of Multer file objects
 * @param {Object} options - Cloudinary options (folder, resourceType, etc.)
 * @returns {Promise<Array<{ url: string, publicId: string }>>}
 */
const uploadMultipleBuffers = async (files = [], options = {}) => {
  if (!Array.isArray(files) || files.length === 0) {
    throw new AppError("No files provided for upload", 400);
  }

  const uploadPromises = files.map((file) =>
    uploadBuffer(file.buffer, options)
  );

  return Promise.all(uploadPromises);
};

/**
 * Delete an asset from Cloudinary by public ID
 * @param {string} publicId - Cloudinary asset public ID
 * @param {string} resourceType - 'image', 'raw', or 'video' (defaults to 'image')
 * @returns {Promise<Object>} Cloudinary deletion result
 */
const deleteByPublicId = async (publicId, resourceType = "image") => {
  try {
    if (!publicId) throw new AppError("publicId is required for deletion", 400);

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    logger.info(`Cloudinary asset deleted: ${publicId} (result: ${result.result})`);
    return result;
  } catch (error) {
    logger.error(`Cloudinary deletion failed: ${error.message}`);
    throw new AppError(`Failed to delete Cloudinary asset: ${error.message}`, 500);
  }
};

/**
 * Helper to extract the public_id from a Cloudinary URL
 * Example: "https://res.cloudinary.com/.../travel-agency/packages/sample.jpg" -> "travel-agency/packages/sample"
 * @param {string} url - Cloudinary secure_url
 * @returns {string|null} - extracted publicId
 */
const extractPublicIdFromUrl = (url) => {
  if (!url || typeof url !== "string") return null;
  try {
    const parts = url.split("/");
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return null;

    // Join remaining segments after optional version (e.g. v12345678)
    const postUpload = parts.slice(uploadIndex + 1);
    if (postUpload[0] && /^v\d+$/.test(postUpload[0])) {
      postUpload.shift();
    }
    const filenameWithExt = postUpload.join("/");
    // Remove extension
    return filenameWithExt.replace(/\.[^/.]+$/, "");
  } catch {
    return null;
  }
};

/**
 * Upload buffer and return just the secure HTTPS URL string
 */
const uploadBufferToUrl = async (fileBuffer, options = {}) => {
  const result = await uploadBuffer(fileBuffer, options);
  return result.url;
};

module.exports = {
  uploadBuffer,
  uploadBufferToUrl,
  uploadMultipleBuffers,
  deleteByPublicId,
  extractPublicIdFromUrl,
};
