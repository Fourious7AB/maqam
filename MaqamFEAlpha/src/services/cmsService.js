import { apiClient } from "../admin/services/apiClient";

/**
 * ─── CMS SERVICE ──────────────────────────────────────────────
 * Manages CMS endpoints: Hero banner, static pages, FAQs, etc.
 * Conforms to CMS Module API Specification v1.0.0
 */

/**
 * Public: Fetch current active frontend hero banner picture & headlines.
 * GET /api/v1/cms/heroPic
 *
 * @returns {Promise<{
 *   _id?: string,
 *   type: string,
 *   slug: string,
 *   title: string,
 *   subTitle?: string,
 *   imageUrl?: string,
 *   publicId?: string,
 *   isPublished: boolean,
 *   updatedAt?: string
 * } | null>}
 */
export async function fetchHeroPic() {
  try {
    const res = await apiClient.get("/api/v1/cms/heroPic");
    // API returns { success: true, message: "...", data: { ... } }
    return res?.data?.data ?? null;
  } catch {
    // If not found or network error, return null so component falls back to default slides
    return null;
  }
}

/**
 * Admin: Change / replace hero banner picture.
 * POST /api/v1/cms/changeHeroPic
 *
 * Supports:
 *   - File upload (file binary under 'heroPic')
 *   - Direct imageUrl (string)
 *   - Optional metadata: title, subTitle
 *
 * @param {Object} params
 * @param {File} [params.file] - Image file (max 10MB; jpg, jpeg, png, webp, gif)
 * @param {string} [params.imageUrl] - Direct image URL
 * @param {string} [params.title] - Main banner headline
 * @param {string} [params.subTitle] - Sub-headline / descriptive tagline
 * @returns {Promise<Object>}
 */
export async function changeHeroPic({ file, imageUrl, title, subTitle } = {}) {
  let response;

  if (file instanceof File) {
    const formData = new FormData();
    formData.append("heroPic", file);
    if (title !== undefined && title !== null) formData.append("title", title);
    if (subTitle !== undefined && subTitle !== null) formData.append("subTitle", subTitle);

    response = await apiClient.post("/api/v1/cms/changeHeroPic", formData);
  } else {
    const payload = {};
    if (imageUrl) payload.imageUrl = imageUrl.trim();
    if (title !== undefined && title !== null) payload.title = title;
    if (subTitle !== undefined && subTitle !== null) payload.subTitle = subTitle;

    response = await apiClient.post("/api/v1/cms/changeHeroPic", payload);
  }

  // Dispatch global event so public hero banners refresh without reload
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cms:hero-updated", { detail: response?.data?.data }));
  }

  return response?.data?.data ?? response?.data;
}

/**
 * Admin: Edit hero banner metadata (headline, subtitle, publication status) or swap image.
 * PUT /api/v1/cms/heroPic
 *
 * @param {Object} params
 * @param {File} [params.file]
 * @param {string} [params.imageUrl]
 * @param {string} [params.title]
 * @param {string} [params.subTitle]
 * @param {boolean} [params.isPublished]
 * @returns {Promise<Object>}
 */
export async function editHeroPic({ file, imageUrl, title, subTitle, isPublished } = {}) {
  let response;

  if (file instanceof File) {
    const formData = new FormData();
    formData.append("heroPic", file);
    if (title !== undefined && title !== null) formData.append("title", title);
    if (subTitle !== undefined && subTitle !== null) formData.append("subTitle", subTitle);
    if (isPublished !== undefined && isPublished !== null) {
      formData.append("isPublished", String(isPublished));
    }

    response = await apiClient.put("/api/v1/cms/heroPic", formData);
  } else {
    const payload = {};
    if (imageUrl) payload.imageUrl = imageUrl.trim();
    if (title !== undefined && title !== null) payload.title = title;
    if (subTitle !== undefined && subTitle !== null) payload.subTitle = subTitle;
    if (isPublished !== undefined && isPublished !== null) payload.isPublished = Boolean(isPublished);

    response = await apiClient.put("/api/v1/cms/heroPic", payload);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cms:hero-updated", { detail: response?.data?.data }));
  }

  return response?.data?.data ?? response?.data;
}

/**
 * Admin: Permanently delete hero banner record and purge asset from Cloudinary.
 * DELETE /api/v1/cms/heroPic
 *
 * @returns {Promise<{ deleted: boolean, herorId?: string }>}
 */
export async function deleteHeroPic() {
  const response = await apiClient.delete("/api/v1/cms/heroPic");

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cms:hero-updated", { detail: null }));
  }

  return response?.data?.data ?? response?.data;
}
