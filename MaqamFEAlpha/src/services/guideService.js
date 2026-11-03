import api from "../components/stores/api";
import { GuideAPI } from "../configs/api";

/**
 * Normalizes a guide object from any backend schema variant to ensure consistent
 * rendering in GuideCard, GuideProfileModal, and listings.
 */
export function normalizeGuide(raw) {
  if (!raw || typeof raw !== "object") return null;

  const id = raw._id || raw.id || "";

  // Support varying name fields
  const fullName =
    raw.fullName ||
    raw.name ||
    [raw.firstName, raw.lastName].filter(Boolean).join(" ").trim() ||
    "Licensed Guide";

  // Support varying avatar / photo fields
  const avatar =
    raw.avatar ||
    raw.photo ||
    raw.image ||
    raw.profileImage ||
    raw.profilePic ||
    raw.avatarUrl ||
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80";

  // City / destination
  const city = raw.city || raw.location || raw.destination || "Makkah";

  // Category / specialization
  const category = raw.category || raw.specialization || raw.tourType || "umrah-religious";

  // Languages array or string
  let languages = [];
  if (Array.isArray(raw.languages)) {
    languages = raw.languages;
  } else if (typeof raw.languages === "string") {
    languages = raw.languages.split(",").map((l) => l.trim()).filter(Boolean);
  } else if (Array.isArray(raw.languagesSpoken)) {
    languages = raw.languagesSpoken;
  }

  // Pricing
  const hourlyRate =
    Number(raw.hourlyRate ?? raw.rate ?? raw.pricePerHour ?? raw.price ?? 150) || 150;
  const fullDayRate =
    raw.fullDayRate ?? raw.dailyRate ?? raw.pricePerDay ?? (hourlyRate ? hourlyRate * 6 : null);
  const currency = raw.currency || "SAR";

  // Experience
  const yearsOfExperience =
    Number(raw.yearsOfExperience ?? raw.experience ?? raw.experienceYears ?? 5) || 5;

  // Rating & Review counts
  const rating = Number(raw.rating ?? raw.avgRating ?? raw.averageRating ?? 5.0) || 5.0;
  const reviewsCount =
    Number(raw.reviewsCount ?? raw.totalReviews ?? raw.numReviews ?? raw.reviewCount ?? 0);

  // Bio & descriptions
  const bio =
    raw.bio ||
    raw.about ||
    raw.description ||
    "Certified tour guide providing spiritual and historical guidance for pilgrims.";

  // Certifications & Areas
  let certifications = [];
  if (Array.isArray(raw.certifications)) {
    certifications = raw.certifications;
  } else if (typeof raw.certifications === "string") {
    certifications = raw.certifications.split(",").map((c) => c.trim()).filter(Boolean);
  }

  let coverageAreas = [];
  if (Array.isArray(raw.coverageAreas)) {
    coverageAreas = raw.coverageAreas;
  } else if (typeof raw.coverageAreas === "string") {
    coverageAreas = raw.coverageAreas.split(",").map((a) => a.trim()).filter(Boolean);
  }

  return {
    _id: id,
    id,
    fullName,
    city,
    category,
    languages: languages.length > 0 ? languages : ["Arabic", "English"],
    hourlyRate,
    fullDayRate,
    currency,
    bio,
    yearsOfExperience,
    avatar,
    badge: raw.badge || "Licensed Guide",
    licenseNumber: raw.licenseNumber || raw.license || "",
    certifications,
    coverageAreas,
    rating,
    reviewsCount,
    status: raw.status || "active",
    phone: raw.phone || raw.phoneNumber || raw.mobile || "",
    email: raw.email || "",
    raw,
  };
}

/**
 * Extracts array of guide objects from any common API response envelope
 */
export function extractGuidesList(resData) {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.data)) return resData.data;
  if (Array.isArray(resData.instructors)) return resData.instructors;
  if (Array.isArray(resData.guides)) return resData.guides;
  if (resData.data && typeof resData.data === "object") {
    if (Array.isArray(resData.data.instructors)) return resData.data.instructors;
    if (Array.isArray(resData.data.guides)) return resData.data.guides;
    if (Array.isArray(resData.data.data)) return resData.data.data;
    if (Array.isArray(resData.data.items)) return resData.data.items;
    if (Array.isArray(resData.data.results)) return resData.data.results;
  }
  return [];
}

/**
 * Extracts pagination metadata
 */
export function extractMeta(resData, listLength = 0) {
  const meta =
    resData?.meta ||
    resData?.pagination ||
    resData?.data?.meta ||
    resData?.data?.pagination ||
    {};
  const total = meta.total ?? meta.totalCount ?? meta.count ?? resData?.total ?? listLength;
  const page = meta.page ?? meta.currentPage ?? resData?.page ?? 1;
  const limit = meta.limit ?? meta.pageSize ?? resData?.limit ?? 10;
  const calculatedLimit = limit || 10;
  const totalPages =
    meta.totalPages ?? Math.max(1, Math.ceil(total / calculatedLimit));
  return { total, page, limit, totalPages };
}

/**
 * Fetch Guide Categories from GET /api/v1/instructor/categories
 */
export async function fetchGuideCategories() {
  try {
    const res = await api.get(GuideAPI.CategoriesApi);
    const data = res.data?.data || res.data;
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return [];
  } catch (error) {
    console.warn("fetchGuideCategories: unable to fetch from backend", error.message);
    return [];
  }
}

/**
 * Fetch published guides directly from database via GET /api/v1/instructor
 * Query parameters: destination, city, category, language, search, page, limit
 *
 * Absolutely NO hardcoded fallback guides. Real database records only.
 */
export async function fetchGuides(params = {}) {
  try {
    const cleanParams = {};
    if (params.destination && params.destination !== "all") {
      cleanParams.destination = params.destination;
      cleanParams.city = params.destination;
    }
    if (params.city && params.city !== "all") {
      cleanParams.city = params.city;
    }
    if (params.category && params.category !== "all") {
      cleanParams.category = params.category;
    }
    if (params.language && params.language !== "all") {
      cleanParams.language = params.language;
    }
    if (params.search) {
      cleanParams.search = params.search;
      cleanParams.q = params.search;
    }
    if (params.page) cleanParams.page = params.page;
    if (params.limit) cleanParams.limit = params.limit;

    const res = await api.get(GuideAPI.GuidesApi, { params: cleanParams });
    const rawList = extractGuidesList(res.data);
    const normalized = rawList.map(normalizeGuide).filter(Boolean);
    const meta = extractMeta(res.data, normalized.length);

    return {
      guides: normalized,
      meta,
      isLive: true,
      error: null,
    };
  } catch (error) {
    const errorMsg =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch guides from database";
    console.error("fetchGuides: API error", errorMsg);
    return {
      guides: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
      isLive: false,
      error: errorMsg,
    };
  }
}

/**
 * Fetch public guide profile from GET /api/v1/instructor/{id}
 */
export async function fetchGuideProfile(id) {
  try {
    if (!id) return null;
    const res = await api.get(GuideAPI.GuideProfileApi(id));
    const data = res.data?.data || res.data;
    if (data) {
      return normalizeGuide(data);
    }
    return null;
  } catch (error) {
    console.warn(`fetchGuideProfile(${id}): failed to fetch profile`, error.message);
    return null;
  }
}

/**
 * Fetch available slots from GET /api/v1/instructor/{id}/slots
 * Query parameters: date, startDate, endDate
 */
export async function fetchGuideSlots(id, params = {}) {
  try {
    if (!id) return [];
    const res = await api.get(GuideAPI.GuideSlotsApi(id), { params });
    const slots = res.data?.data || res.data;
    if (Array.isArray(slots)) {
      return slots;
    }
    return [];
  } catch (error) {
    console.warn(`fetchGuideSlots(${id}): unable to fetch slots`, error.message);
    return [];
  }
}

/**
 * Fetch guide reviews from GET /api/v1/instructor/{id}/reviews
 * Query parameters: page, limit
 */
export async function fetchGuideReviews(id, params = {}) {
  try {
    if (!id) return [];
    const res = await api.get(GuideAPI.GuideReviewsApi(id), { params });
    const reviews = res.data?.data || res.data;
    if (Array.isArray(reviews)) {
      return reviews;
    }
    return [];
  } catch (error) {
    console.warn(`fetchGuideReviews(${id}): unable to fetch reviews`, error.message);
    return [];
  }
}

/**
 * Submit review for a guide using POST /api/v1/instructor/{id}/reviews
 * Payload: { rating: number (1-5), comment: string, bookingId?: string }
 */
export async function submitGuideReview(id, payload) {
  try {
    const res = await api.post(GuideAPI.GuideReviewsApi(id), payload);
    return {
      success: true,
      message: res.data?.message || "Review submitted successfully!",
      data: res.data?.data || res.data,
    };
  } catch (error) {
    const message =
      error.response?.data?.message ||
      (error.response?.status === 401
        ? "Please login to submit your review"
        : "Failed to submit review");
    return {
      success: false,
      message,
      status: error.response?.status,
    };
  }
}
