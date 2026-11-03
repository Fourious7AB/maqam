import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Star,
  MapPin,
  Clock,
  ShieldCheck,
  Languages,
  Calendar,
  Award,
  Compass,
  Phone,
  Mail,
  CheckCircle,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Loader2,
  Check,
} from "lucide-react";
import {
  fetchGuideProfile,
  fetchGuideSlots,
  fetchGuideReviews,
} from "../../services/guideService";
import GuideReviewModal from "./GuideReviewModal";
import { springEntrance } from "../../animations/presets";

export default function GuideProfileModal({ isOpen, onClose, guide, onBookSuccess }) {
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'slots' | 'reviews'
  const [profile, setProfile] = useState(guide);
  const [slots, setSlots] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const modalBoxRef = useRef(null);

  useEffect(() => {
    if (isOpen && modalBoxRef.current) {
      springEntrance(modalBoxRef.current);
    }
  }, [isOpen]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    if (!guide || !isOpen) return;
    setProfile(guide);
    setBookingConfirmed(false);
    setSelectedSlot(null);

    // Fetch full profile
    fetchGuideProfile(guide._id).then((data) => {
      if (data) setProfile(data);
    });

    // Fetch initial slots
    loadSlots(selectedDate);

    // Fetch initial reviews
    setLoadingReviews(true);
    fetchGuideReviews(guide._id).then((revs) => {
      setReviews(revs || []);
      setLoadingReviews(false);
    });
  }, [guide, isOpen]);

  const loadSlots = async (dateStr) => {
    if (!guide) return;
    setLoadingSlots(true);
    const data = await fetchGuideSlots(guide._id, { date: dateStr });
    setSlots(data || []);
    setLoadingSlots(false);
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    setSelectedSlot(null);
    loadSlots(newDate);
  };

  const handleConfirmBooking = () => {
    if (!selectedSlot) return;
    setBookingConfirmed(true);
    if (onBookSuccess) {
      onBookSuccess({
        guide: profile,
        slot: selectedSlot,
        date: selectedDate,
      });
    }
  };

  if (!isOpen || !guide) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div ref={modalBoxRef} className="relative w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden rounded-3xl border border-amber-200/50 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
        {/* Modal Header */}
        <div className="relative overflow-hidden bg-linear-to-r from-[#123d38] via-emerald-900 to-teal-950 p-6 text-white shrink-0">
          <div className="absolute top-0 right-0 p-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-emerald-100/70 hover:bg-white/15 hover:text-white transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pr-10">
            <div className="relative shrink-0">
              <img
                src={
                  profile.avatar ||
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300"
                }
                alt={profile.fullName}
                className="h-20 w-20 rounded-2xl object-cover border-2 border-amber-300 shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-emerald-900">
                <Check size={14} />
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/20 border border-amber-300/40 px-2 py-0.5 text-xs font-semibold text-amber-200">
                  <ShieldCheck size={12} /> {profile.badge || "Licensed Guide"}
                </span>
                {profile.licenseNumber && (
                  <span className="text-[11px] text-emerald-200/80 font-mono">
                    Lic: {profile.licenseNumber}
                  </span>
                )}
              </div>

              <h2 className="mt-1 font-mirza text-3xl font-bold leading-tight">
                {profile.fullName}
              </h2>

              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-100/80">
                <span className="flex items-center gap-1 text-amber-200 font-medium">
                  <MapPin size={13} /> {profile.city}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={13} /> {profile.yearsOfExperience || 5}+ yrs experience
                </span>
                <span className="flex items-center gap-1 text-amber-300 font-bold">
                  <Star size={13} className="fill-amber-300 text-amber-300" />
                  {profile.rating || 4.9} ({profile.reviewsCount || reviews.length} reviews)
                </span>
              </div>
            </div>

            <div className="hidden sm:block text-right shrink-0">
              <div className="font-mirza text-3xl font-bold text-amber-300">
                {profile.hourlyRate} {profile.currency || "SAR"}
              </div>
              <p className="text-xs text-emerald-200/80">per hour</p>
              {profile.fullDayRate && (
                <p className="text-[11px] text-emerald-200/60 mt-0.5">
                  or {profile.fullDayRate} {profile.currency || "SAR"} full day
                </p>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 flex border-b border-emerald-800/80 gap-6 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`pb-2 transition cursor-pointer ${
                activeTab === "overview"
                  ? "border-b-2 border-amber-300 text-amber-300"
                  : "text-emerald-100/70 hover:text-white"
              }`}
            >
              Overview & Credentials
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("slots")}
              className={`pb-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "slots"
                  ? "border-b-2 border-amber-300 text-amber-300"
                  : "text-emerald-100/70 hover:text-white"
              }`}
            >
              <Calendar size={14} /> Available Slots
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("reviews")}
              className={`pb-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "reviews"
                  ? "border-b-2 border-amber-300 text-amber-300"
                  : "text-emerald-100/70 hover:text-white"
              }`}
            >
              <MessageSquare size={14} /> Reviews ({reviews.length})
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  About Guide
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {profile.bio ||
                    "Dedicated and certified tour guide offering comprehensive historical narratives, step-by-step Umrah guidance, and sacred site visits with high hospitality."}
                </p>
              </div>

              {/* Languages Spoken */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2.5">
                  Languages Spoken
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(profile.languages || ["Arabic", "English"]).map((lang) => (
                    <span
                      key={lang}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                    >
                      <Languages size={13} className="text-emerald-600" /> {lang}
                    </span>
                  ))}
                </div>
              </div>

              {/* Certifications & Badges */}
              {profile.certifications && profile.certifications.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2.5">
                    Official Certifications
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {profile.certifications.map((cert, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 rounded-xl border border-emerald-100 dark:border-emerald-950 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 text-xs font-medium text-emerald-900 dark:text-emerald-300"
                      >
                        <Award size={16} className="text-emerald-600 shrink-0" />
                        <span>{cert}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coverage Areas */}
              {profile.coverageAreas && profile.coverageAreas.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2.5">
                    Coverage & Landmark Tours
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.coverageAreas.map((area, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-200 border border-amber-200/50 dark:border-amber-800/40"
                      >
                        <Compass size={13} className="text-amber-600" /> {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Action to Check Slots */}
              <div className="rounded-2xl bg-linear-to-r from-orange-500 to-emerald-700 p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h5 className="font-mirza text-2xl font-bold">Ready to book this guide?</h5>
                  <p className="text-xs text-emerald-100/90">
                    Check available morning, afternoon, and evening shifts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("slots")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#123d38] shadow-md hover:bg-emerald-50 transition cursor-pointer shrink-0"
                >
                  View Available Slots <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SLOTS & BOOKING */}
          {activeTab === "slots" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Date Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Calendar size={14} className="text-emerald-600" /> Select Tour Date
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Slots update live from the guide's official schedule
                  </p>
                </div>

                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-xs focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Slot Options List */}
              {loadingSlots ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Loader2 size={32} className="animate-spin text-emerald-600 mb-2" />
                  <p className="text-xs">Checking live slot availability...</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                    No open slots scheduled for this date.
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Try choosing a different date or request a custom schedule.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?._id === slot._id;
                    const available = slot.isAvailable !== false;

                    return (
                      <div
                        key={slot._id}
                        onClick={() => available && setSelectedSlot(slot)}
                        className={`relative p-4 rounded-2xl border transition-all cursor-pointer ${
                          !available
                            ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                            : isSelected
                            ? "border-emerald-600 dark:border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/40 shadow-md ring-2 ring-emerald-500/20"
                            : "border-slate-200 dark:border-slate-700 hover:border-amber-400/80 bg-white dark:bg-slate-900 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                              {slot.shift || "Guiding Session"}
                            </span>
                            <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1">
                              <Clock size={15} className="text-slate-400" />
                              {slot.startTime} – {slot.endTime}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mirza text-xl font-bold text-[#123d38] dark:text-emerald-400">
                              {slot.price} SAR
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs">
                          <span
                            className={`font-semibold ${
                              available ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                            }`}
                          >
                            {available ? "● Available" : "● Booked"}
                          </span>

                          {available && (
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                              {isSelected ? "Selected ✓" : "Tap to Select"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Booking Confirmation Box */}
              {selectedSlot && !bookingConfirmed && (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                        Selected Guiding Window
                      </h5>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        Date: {selectedDate} | Time: {selectedSlot.startTime} - {selectedSlot.endTime}
                      </p>
                    </div>
                    <span className="font-mirza text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                      {selectedSlot.price} SAR
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmBooking}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-orange-500 to-emerald-700 py-3 text-xs font-bold text-white shadow-md hover:shadow-lg hover:brightness-105 transition cursor-pointer"
                  >
                    Confirm & Reserve Guide Slot <ArrowRight size={15} />
                  </button>
                </div>
              )}

              {bookingConfirmed && (
                <div className="rounded-2xl border border-emerald-300 dark:border-emerald-700 bg-emerald-100/70 dark:bg-emerald-950/60 p-5 text-center space-y-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white mx-auto shadow-md">
                    <Check size={24} />
                  </div>
                  <h5 className="font-mirza text-2xl font-bold text-emerald-900 dark:text-emerald-200">
                    Guide Booking Reserved!
                  </h5>
                  <p className="text-xs text-slate-700 dark:text-slate-300 max-w-md mx-auto">
                    Your guide request for {profile.fullName} on {selectedDate} ({selectedSlot?.startTime} - {selectedSlot?.endTime}) has been received. Our concierge will contact you via WhatsApp / phone.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REVIEWS */}
          {activeTab === "reviews" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Verified Pilgrim Reviews
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Authentic feedback from pilgrims who completed guided tours
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                >
                  <Sparkles size={13} /> Write a Review
                </button>
              </div>

              {loadingReviews ? (
                <div className="flex items-center justify-center py-10 text-slate-400">
                  <Loader2 size={28} className="animate-spin text-amber-500" />
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                    No reviews yet for this guide.
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Be the first to share your pilgrimage experience!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((rev) => (
                    <div
                      key={rev._id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={
                              rev.user?.avatar ||
                              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"
                            }
                            alt="Pilgrim"
                            className="h-8 w-8 rounded-full object-cover border border-slate-300"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {rev.user?.firstName || "Verified Pilgrim"}{" "}
                              {rev.user?.lastName || ""}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {rev.createdAt
                                ? new Date(rev.createdAt).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "Recent"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 text-amber-400">
                          {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                            <Star key={i} size={13} className="fill-amber-400" />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {rev.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Review Submission Modal Dialog */}
      <GuideReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        guide={profile}
        onReviewSubmitted={(newRev) => {
          setReviews((prev) => [newRev, ...prev]);
        }}
      />
    </div>
  );
}
