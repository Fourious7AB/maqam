import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Clock3,
  Languages,
  MapPin,
  ShieldCheck,
  Star,
} from "lucide-react";
import CommonHeader from "../CommonHeader";
import Footer from "../Footer";
import { instructorApi } from "../../services/instructorService";
import { useAuth } from "../../store/authContext";

const fallbackAvatar =
  "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

const categoryLabel = (slug) =>
  String(slug || "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function StarBar({ stars, count, total }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="flex w-10 items-center gap-0.5 font-semibold text-slate-600">
        {stars} <Star size={10} className="fill-amber-500 text-amber-500" />
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-amber-400"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="w-8 text-right text-slate-400">{count}</span>
    </div>
  );
}

export default function GuideProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [guide, setGuide] = useState(null);
  const [guideError, setGuideError] = useState("");
  const [slots, setSlots] = useState({ calendar: [], totalAvailableSlots: 0 });
  const [reviewsData, setReviewsData] = useState({
    summary: null,
    reviews: [],
    pagination: null,
  });
  const [reviewsPage, setReviewsPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Review form state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setGuideError("");

    // Public profile — GET /api/v1/instructor/:id
    instructorApi
      .getGuide(id)
      .then((data) => {
        if (!active) return;
        if (!data) {
          setGuideError("Guide not found or currently inactive.");
          setLoading(false);
          return;
        }
        setGuide(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setGuideError(err?.message || "Failed to load guide profile");
        setLoading(false);
      });

    // Bookable slots — GET /api/v1/instructor/:id/slots
    instructorApi
      .getGuideSlots(id)
      .then((data) => active && setSlots(data))
      .catch(() => {});

    // Reviews + summary — GET /api/v1/instructor/:id/reviews
    instructorApi
      .getGuideReviews(id, { page: reviewsPage, limit: 5 })
      .then((data) => active && setReviewsData(data))
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [id, reviewsPage]);

  const submitReview = async (event) => {
    event.preventDefault();
    if (!rating || comment.trim().length < 5) return;
    setSubmitting(true);
    setSubmitMessage(null);
    try {
      await instructorApi.submitGuideReview(id, {
        rating,
        comment: comment.trim(),
      });
      setSubmitMessage({
        type: "success",
        text: "Thank you! Your review has been submitted.",
      });
      setRating(0);
      setComment("");
      setReviewsPage(1);
      // Refresh summary + list.
      const [freshReviews, freshGuide] = await Promise.all([
        instructorApi.getGuideReviews(id, { page: 1, limit: 5 }),
        instructorApi.getGuide(id),
      ]);
      setReviewsData(freshReviews);
      if (freshGuide) setGuide(freshGuide);
    } catch (error) {
      setSubmitMessage({
        type: "error",
        text:
          error?.response?.data?.message ||
          "Failed to submit review. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] font-poppins text-slate-900">
        <CommonHeader />
        <main className="mx-auto max-w-7xl px-4 pt-[120px] pb-20 sm:px-6">
          <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </main>
        <Footer />
      </div>
    );
  }

  if (guideError || !guide) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] font-poppins text-slate-900">
        <CommonHeader />
        <main className="mx-auto max-w-3xl px-4 pt-[140px] pb-20 text-center sm:px-6">
          <h1 className="font-mirza text-4xl text-[#123d38]">
            Guide unavailable
          </h1>
          <p className="mt-3 text-sm text-slate-500">{guideError}</p>
          <button
            type="button"
            onClick={() => navigate("/guides")}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#123d38] px-5 py-2.5 text-xs font-bold text-white"
          >
            <ArrowLeft size={14} /> Back to all guides
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  const summary = reviewsData.summary;

  return (
    <div className="min-h-screen bg-[#fbfaf7] font-poppins text-slate-900">
      <CommonHeader />
      <main className="pt-[72px]">
        {/* Profile header */}
        <section className="relative overflow-hidden bg-[#123d38] px-4 py-12 text-white sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-linear-to-r from-[#123d38] via-[#123d38]/95 to-[#123d38]/70" />
          <div className="relative mx-auto max-w-7xl">
            <button
              type="button"
              onClick={() => navigate("/guides")}
              className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-200 transition hover:text-amber-100"
            >
              <ArrowLeft size={14} /> All guides
            </button>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <img
                src={guide.avatar || fallbackAvatar}
                alt={guide.fullName}
                className="h-28 w-28 rounded-2xl border-4 border-white/15 object-cover"
                onError={(event) => {
                  event.currentTarget.src = fallbackAvatar;
                }}
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-mirza text-4xl sm:text-5xl">
                    {guide.fullName}
                  </h1>
                  {guide.badge && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/20 px-3 py-1 text-xs font-semibold text-amber-200">
                      <BadgeCheck size={13} /> {guide.badge}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-emerald-50/85">
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} /> {guide.city}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Languages size={14} /> {(guide.languages || []).join(", ")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={14} /> {guide.yearsOfExperience} years
                    experience
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-amber-200">
                    <Star size={14} className="fill-amber-300 text-amber-300" />
                    {Number(guide.rating || 0).toFixed(2)} ({guide.totalReviews}{" "}
                    reviews)
                  </span>
                </div>
                {guide.category && (
                  <span className="mt-4 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                    {categoryLabel(guide.category)}
                  </span>
                )}
              </div>
              <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-2xl font-bold">
                  {guide.currency} {Number(guide.hourlyRate || 0).toLocaleString()}
                </p>
                <p className="text-xs text-white/70">per hour</p>
                {guide.fullDayRate != null && (
                  <p className="mt-2 border-t border-white/15 pt-2 text-sm font-semibold">
                    {guide.currency} {Number(guide.fullDayRate).toLocaleString()}
                    <span className="text-xs font-normal text-white/60">
                      {" "}
                      full day
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
            {/* Left column */}
            <div className="space-y-10">
              <div>
                <h2 className="font-mirza text-3xl text-[#123d38]">About</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {guide.bio || "No biography provided yet."}
                </p>
              </div>

              {guide.coverageAreas?.length > 0 && (
                <div>
                  <h2 className="font-mirza text-3xl text-[#123d38]">
                    Coverage areas
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {guide.coverageAreas.map((area) => (
                      <span
                        key={area}
                        className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
                      >
                        <MapPin size={12} className="text-emerald-600" />
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {guide.certifications?.length > 0 && (
                <div>
                  <h2 className="font-mirza text-3xl text-[#123d38]">
                    Certifications
                  </h2>
                  <div className="mt-3 space-y-2">
                    {guide.certifications.map((cert) => (
                      <div
                        key={cert}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-600"
                      >
                        <ShieldCheck size={17} className="shrink-0 text-emerald-600" />
                        {cert}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {guide.gallery?.length > 0 && (
                <div>
                  <h2 className="font-mirza text-3xl text-[#123d38]">Gallery</h2>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {guide.gallery.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`${guide.fullName} tour ${index + 1}`}
                        className="h-36 w-full rounded-xl object-cover"
                        loading="lazy"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews */}
              <div>
                <h2 className="font-mirza text-3xl text-[#123d38]">Reviews</h2>
                {summary && (
                  <div className="mt-4 grid gap-6 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-[auto_1fr]">
                    <div className="text-center sm:pr-6">
                      <p className="font-mirza text-5xl text-[#123d38]">
                        {Number(summary.averageRating || 0).toFixed(1)}
                      </p>
                      <div className="mt-1 flex justify-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            size={14}
                            className={
                              index < Math.round(summary.averageRating)
                                ? "fill-amber-500 text-amber-500"
                                : "text-slate-200"
                            }
                          />
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {summary.totalReviews} reviews
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {[5, 4, 3, 2, 1].map((stars) => (
                        <StarBar
                          key={stars}
                          stars={stars}
                          count={Number(summary.starsBreakdown?.[String(stars)] || 0)}
                          total={summary.totalReviews}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5 space-y-3">
                  {reviewsData.reviews.length === 0 ? (
                    <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                      No reviews yet. Be the first to share your experience.
                    </p>
                  ) : (
                    reviewsData.reviews.map((review) => (
                      <div
                        key={review._id}
                        className="rounded-2xl border border-slate-200 bg-white p-5"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={review.user?.avatar || fallbackAvatar}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                            onError={(event) => {
                              event.currentTarget.src = fallbackAvatar;
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-[#123d38]">
                              {review.user
                                ? [review.user.firstName, review.user.lastName]
                                    .filter(Boolean)
                                    .join(" ")
                                : "Verified traveler"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatDate(review.createdAt)}
                            </p>
                          </div>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Star
                                key={index}
                                size={13}
                                className={
                                  index < review.rating
                                    ? "fill-amber-500 text-amber-500"
                                    : "text-slate-200"
                                }
                              />
                            ))}
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {review.comment}
                        </p>
                        {review.verifiedBooking && (
                          <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                            <BadgeCheck size={12} /> Verified booking
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {reviewsData.pagination?.totalPages > 1 && (
                  <div className="mt-5 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={reviewsPage <= 1}
                      onClick={() => setReviewsPage((current) => current - 1)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="text-xs font-semibold text-slate-500">
                      Page {reviewsData.pagination.page} of{" "}
                      {reviewsData.pagination.totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={
                        reviewsPage >= reviewsData.pagination.totalPages
                      }
                      onClick={() => setReviewsPage((current) => current + 1)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right column: slots + review form */}
            <div className="space-y-8">
              <div className="h-fit rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-24">
                <h3 className="flex items-center gap-2 text-sm font-bold text-[#123d38]">
                  <CalendarDays size={16} className="text-emerald-600" />
                  Available slots
                </h3>
                {slots.calendar.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-500">
                    No open slots right now. Check back soon.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {slots.calendar.map((day) => (
                      <div key={day.date}>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          {formatDate(day.date)}
                        </p>
                        <div className="mt-2 space-y-2">
                          {day.slots.map((slot) => (
                            <div
                              key={slot.slotId}
                              className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                            >
                              <div className="min-w-0">
                                <p className="flex items-center gap-1.5 truncate text-xs font-bold text-slate-700">
                                  <Clock3 size={12} className="text-emerald-600" />
                                  {slot.startTime} – {slot.endTime}
                                </p>
                                <p className="truncate text-[11px] text-slate-400">
                                  {slot.slotType}
                                </p>
                              </div>
                              <span className="shrink-0 text-xs font-bold text-[#123d38]">
                                {slot.currency}{" "}
                                {Number(slot.price || 0).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Review form */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-bold text-[#123d38]">
                  Rate this guide
                </h3>
                {!isAuthenticated ? (
                  <div className="mt-3">
                    <p className="text-xs leading-5 text-slate-500">
                      Please log in to share your review.
                    </p>
                    <Link
                      to="/login"
                      className="mt-3 inline-flex rounded-lg bg-[#123d38] px-4 py-2 text-xs font-bold text-white"
                    >
                      Go to login
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={submitReview} className="mt-3 space-y-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onMouseEnter={() => setHoverRating(value)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(value)}
                          className="p-0.5"
                        >
                          <Star
                            size={22}
                            className={
                              (hoverRating || rating) >= value
                                ? "fill-amber-500 text-amber-500"
                                : "text-slate-300"
                            }
                          />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      rows={4}
                      maxLength={1000}
                      placeholder="Share your experience (5–1000 characters)…"
                      className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                    />
                    {submitMessage && (
                      <p
                        className={`text-xs font-semibold ${
                          submitMessage.type === "success"
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {submitMessage.text}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={
                        submitting || !rating || comment.trim().length < 5
                      }
                      className="w-full rounded-lg bg-linear-to-r from-orange-500 to-emerald-700 py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                      {submitting ? "Submitting…" : "Submit review"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
