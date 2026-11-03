// -----------------------------------------------------------------------------
// Image upload & media management — handled by the backend.
//
// The CRM API owns the Cloudinary integration. Files are posted as multipart
// form data and the backend returns the hosted Cloudinary URLs:
//
//   POST /api/v1/crm/packages/upload-images  (packages)
//   POST /api/v1/crm/offers/upload-images    (offers)
//
// Photos management on existing packages & offers:
//   POST   /api/v1/crm/packages/:id/images   (add photos)
//   DELETE /api/v1/crm/packages/:id/images   (delete photo with { imageUrl })
//   POST   /api/v1/crm/offers/:id/images     (add photos)
//   DELETE /api/v1/crm/offers/:id/images     (delete photo with { imageUrl })
//
// Request:  FormData with one or more entries under the "images" key.
// Response: { success: true, data: { urls: ["https://res.cloudinary.com/..."] } }
//
// Constraints & Specs:
//   - Field name: "images"
//   - Accepted formats: JPG, JPEG, PNG, WEBP, GIF
//   - Max file size: 5 MB per image (strictly validated before upload)
//   - Max files per upload: up to 10 images at once
// -----------------------------------------------------------------------------

import { apiClient } from "../admin/services/apiClient";

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_FILES_PER_UPLOAD = 10;
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];
export const ACCEPTED_EXTENSIONS_STRING = ".jpg,.jpeg,.png,.webp,.gif";

/**
 * Validate image files against size and type constraints.
 * @param {File[]|FileList} files
 * @param {number} [maxSize=MAX_FILE_SIZE_BYTES]
 * @returns {{ validFiles: File[], rejectedFiles: Array<{ file: File, reason: string }> }}
 */
export function validateImageFiles(files, maxSize = MAX_FILE_SIZE_BYTES) {
  const validFiles = [];
  const rejectedFiles = [];

  for (const file of Array.from(files || [])) {
    const isImage =
      ACCEPTED_IMAGE_TYPES.includes(file.type.toLowerCase()) ||
      /\.(jpe?g|png|webp|gif)$/i.test(file.name);

    if (!isImage) {
      rejectedFiles.push({
        file,
        reason: `Unsupported format. Allowed: JPG, PNG, WEBP, GIF.`,
      });
      continue;
    }

    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      rejectedFiles.push({
        file,
        reason: `File size (${sizeMB} MB) exceeds maximum allowed 5 MB limit.`,
      });
      continue;
    }

    validFiles.push(file);
  }

  return { validFiles, rejectedFiles };
}

// Compat flag for existing uploaders
export function isCloudinaryEnabled() {
  return true;
}

/**
 * Upload image files through the backend and return descriptors:
 *   { url, name, uploaded }
 *
 * @param {File[]|FileList} files
 * @param {"packages"|"offers"|string} [section="packages"]
 * @returns {Promise<Array<{url:string,name:string,uploaded:boolean}>>}
 */
export async function uploadImages(files, section = "packages") {
  const { validFiles, rejectedFiles } = validateImageFiles(files);

  if (rejectedFiles.length > 0 && validFiles.length === 0) {
    const errorMsg = rejectedFiles.map((r) => `${r.file.name}: ${r.reason}`).join("\n");
    throw new Error(errorMsg);
  }

  if (validFiles.length === 0) return [];

  const uploadData = new FormData();
  for (const file of validFiles) {
    uploadData.append("images", file);
  }

  const normalizedSection = section === "offers" ? "offers" : "packages";
  const candidates = [
    `/api/v1/crm/${normalizedSection}/upload-images`,
    `/api/v1/crm/packages/upload-images`,
  ];

  let data = null;
  let lastError = null;
  for (const url of candidates) {
    try {
      // Do NOT set "Content-Type" manually so browser computes the multipart boundary
      const response = await apiClient.post(url, uploadData);
      data = response.data;
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      if (status !== 404 && status !== 405) throw error;
    }
  }
  if (lastError) throw lastError;

  const rawUrls =
    data?.data?.urls ??
    data?.urls ??
    (Array.isArray(data?.data) ? data.data : []);

  const urls = Array.isArray(rawUrls) ? rawUrls : [];
  return urls
    .filter((url) => typeof url === "string" && url.trim().length > 0)
    .map((url) => ({ url, name: "", uploaded: true }));
}

/**
 * Helper to upload image files and return pure string URLs.
 * @param {File[]|FileList} files
 * @param {"packages"|"offers"|string} [section="packages"]
 * @returns {Promise<string[]>}
 */
export async function uploadImageUrls(files, section = "packages") {
  const descriptors = await uploadImages(files, section);
  return descriptors.map((item) => item.url);
}

/**
 * Add photos to an existing package or offer:
 *   POST /api/v1/crm/:section/:id/images
 *
 * @param {"packages"|"offers"} section
 * @param {string} id - Package or offer ID
 * @param {File[]|FileList} files
 * @returns {Promise<Object>}
 */
export async function addEntityImages(section, id, files) {
  if (!id) throw new Error("Entity ID is required to add photos.");
  const { validFiles, rejectedFiles } = validateImageFiles(files);

  if (rejectedFiles.length > 0 && validFiles.length === 0) {
    const errorMsg = rejectedFiles.map((r) => `${r.file.name}: ${r.reason}`).join("\n");
    throw new Error(errorMsg);
  }

  const formData = new FormData();
  for (const file of validFiles) {
    formData.append("images", file);
  }

  const targetUrl = `/api/v1/crm/${section}/${id}/images`;
  const response = await apiClient.post(targetUrl, formData);
  return response?.data;
}

/**
 * Delete a photo from an existing package or offer:
 *   DELETE /api/v1/crm/:section/:id/images
 *   Body: { imageUrl: "https://res.cloudinary.com/..." }
 *
 * @param {"packages"|"offers"} section
 * @param {string} id - Package or offer ID
 * @param {string} imageUrl - Exact Cloudinary URL to delete
 * @returns {Promise<Object>}
 */
export async function deleteEntityImage(section, id, imageUrl) {
  if (!id) throw new Error("Entity ID is required to delete photo.");
  if (!imageUrl) throw new Error("Image URL is required to delete photo.");

  const targetUrl = `/api/v1/crm/${section}/${id}/images`;
  const response = await apiClient.delete(targetUrl, {
    data: { imageUrl },
  });
  return response?.data;
}

/**
 * Upload a single profile avatar and update user profile on the backend:
 *   Uploads image -> PATCH /api/v1/auth/me with { avatar: url }
 *
 * @param {File} file
 * @returns {Promise<{ url: string, user: Object }>}
 */
export async function uploadAvatar(file) {
  if (!file) throw new Error("No image file provided.");
  const { validFiles, rejectedFiles } = validateImageFiles([file]);

  if (rejectedFiles.length > 0) {
    throw new Error(rejectedFiles[0].reason);
  }

  // Upload the avatar image file via packages upload-images endpoint
  const results = await uploadImages([validFiles[0]], "packages");
  const avatarUrl = results[0]?.url;

  if (!avatarUrl) {
    throw new Error("Failed to obtain uploaded image URL.");
  }

  // Update authenticated user profile
  const patchResponse = await apiClient.patch("/api/v1/auth/me", { avatar: avatarUrl });
  const updatedUser = patchResponse?.data?.data?.user ?? patchResponse?.data?.data ?? patchResponse?.data?.user ?? patchResponse?.data;

  return {
    url: avatarUrl,
    user: updatedUser,
  };
}
