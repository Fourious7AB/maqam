// Public / customer-facing Tour Guides API (backend module: /api/v1/instructor).
// Uses the shared customer axios instance so the user bearer token is attached
// automatically (only POST /:id/reviews actually requires authentication).
import api from "../components/stores/api";

const ROOT = "/api/v1/instructor";

const qs = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== "" && value !== undefined && value !== null,
    ),
  );

// GET /api/v1/instructor/categories
// Public categories with active/total guide counts.
async function listCategories() {
  const { data } = await api.get(`${ROOT}/categories`);
  return data?.data ?? [];
}

// GET /api/v1/instructor
// Search and list active guides with pagination.
async function listGuides({
  destination = "",
  category = "",
  language = "",
  page = 1,
  limit = 10,
} = {}) {
  const { data } = await api.get(ROOT, {
    params: qs({ destination, category, language, page, limit }),
  });
  return {
    guides: data?.data ?? [],
    pagination: data?.meta ?? { total: 0, page, limit, totalPages: 1 },
  };
}

// GET /api/v1/instructor/:id
// Public profile of an active guide.
async function getGuide(id) {
  const { data } = await api.get(`${ROOT}/${id}`);
  return data?.data?.guide ?? null;
}

// GET /api/v1/instructor/:id/slots
// Bookable, unbooked slots grouped by date.
async function getGuideSlots(id, { date = "", startDate = "", endDate = "" } = {}) {
  const { data } = await api.get(`${ROOT}/${id}/slots`, {
    params: qs({ date, startDate, endDate }),
  });
  return data?.data ?? { guideId: id, calendar: [], totalAvailableSlots: 0 };
}

// GET /api/v1/instructor/:id/reviews
// Verified customer reviews + summary stats, paginated.
async function getGuideReviews(id, { page = 1, limit = 10 } = {}) {
  const { data } = await api.get(`${ROOT}/${id}/reviews`, {
    params: qs({ page, limit }),
  });
  return {
    summary: data?.data?.summary ?? null,
    reviews: data?.data?.reviews ?? [],
    pagination: data?.data?.meta ?? { total: 0, page, limit, totalPages: 1 },
  };
}

// POST /api/v1/instructor/:id/reviews
// Submit a 1-5 star rating and comment (requires a logged-in user).
async function submitGuideReview(id, { rating, comment, bookingId } = {}) {
  const { data } = await api.post(`${ROOT}/${id}/reviews`, {
    rating,
    comment,
    ...(bookingId ? { bookingId } : {}),
  });
  return {
    review: data?.data?.review ?? null,
    newGuideAverage: data?.data?.newGuideAverage ?? null,
  };
}

export const instructorApi = {
  listCategories,
  listGuides,
  getGuide,
  getGuideSlots,
  getGuideReviews,
  submitGuideReview,
};
