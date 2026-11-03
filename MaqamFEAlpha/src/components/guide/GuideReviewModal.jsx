import React, { useState } from "react";
import { Star, X, CheckCircle, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { submitGuideReview } from "../../services/guideService";

export default function GuideReviewModal({ isOpen, onClose, guide, onReviewSubmitted }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen || !guide) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (comment.trim().length < 5) {
      setErrorMsg("Please provide at least 5 characters in your review comment.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const payload = {
      rating,
      comment: comment.trim(),
    };
    if (bookingId.trim()) {
      payload.bookingId = bookingId.trim();
    }

    const res = await submitGuideReview(guide._id, payload);
    setLoading(false);

    if (res.success) {
      setSuccessMsg(res.message || "Thank you! Your review has been submitted.");
      if (onReviewSubmitted) {
        onReviewSubmitted({
          _id: `temp-${Date.now()}`,
          rating,
          comment: comment.trim(),
          createdAt: new Date().toISOString(),
          user: { firstName: "You", lastName: "(Verified Pilgrim)" },
        });
      }
      setTimeout(() => {
        onClose();
        setComment("");
        setSuccessMsg("");
      }, 1500);
    } else {
      setErrorMsg(res.message || "Unable to submit review. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-amber-200/50 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
        {/* Header decoration */}
        <div className="bg-linear-to-r from-[#123d38] via-emerald-800 to-teal-900 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/20 text-amber-300">
                <Sparkles size={16} />
              </span>
              <div>
                <h3 className="font-mirza text-2xl font-bold leading-none">
                  Review Guide
                </h3>
                <p className="text-xs text-emerald-100/80 mt-0.5 truncate max-w-[280px]">
                  {guide.fullName} ({guide.city})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-emerald-100/70 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-600 dark:text-red-400">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Star Rating selector */}
          <div className="text-center">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
              Rate your experience
            </label>
            <div className="inline-flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 cursor-pointer transition-transform hover:scale-115 focus:outline-hidden"
                >
                  <Star
                    size={32}
                    className={`transition-colors ${
                      (hoverRating || rating) >= star
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300 dark:text-slate-600"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {rating === 5 && "Outstanding — Highly recommended"}
              {rating === 4 && "Very Good — Great experience"}
              {rating === 3 && "Satisfactory — Met expectations"}
              {rating <= 2 && "Needs improvement"}
            </p>
          </div>

          {/* Feedback textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Detailed Feedback *
              </label>
              <span className="text-[11px] text-slate-400">
                {comment.length}/1000
              </span>
            </div>
            <textarea
              required
              rows={4}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your spiritual journey, punctuality, knowledge of holy sites, and helpfulness..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden transition"
            />
          </div>

          {/* Optional Booking ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Booking Reference (Optional)
            </label>
            <input
              type="text"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="e.g. BK-98214 or leave blank"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-orange-500 to-emerald-700 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg hover:brightness-105 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
