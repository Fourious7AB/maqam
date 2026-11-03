const mongoose = require('mongoose');

/**
 * ─── GUIDE SCHEMA ──────────────────────────────────────────
 * Core identity, qualifications, status, and pricing for Tour Guides
 */
const guideSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    avatar: {
      type: String,
      default: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
    },
    gallery: [{ type: String }],
    city: {
      type: String,
      required: [true, 'City/Destination is required'],
      trim: true,
      index: true,
    },
    coverageAreas: [{ type: String, trim: true }],
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    languages: {
      type: [String],
      required: [true, 'At least one language is required'],
      default: ['Arabic', 'English'],
    },
    bio: {
      type: String,
      trim: true,
      default: '',
    },
    yearsOfExperience: {
      type: Number,
      default: 1,
      min: 0,
    },
    hourlyRate: {
      type: Number,
      required: [true, 'Hourly rate is required'],
      min: 0,
    },
    fullDayRate: {
      type: Number,
      default: null,
      min: 0,
    },
    currency: {
      type: String,
      default: 'SAR',
      trim: true,
    },
    licenseNumber: {
      type: String,
      trim: true,
      default: null,
    },
    nationalId: {
      type: String,
      trim: true,
      select: false, // Hidden by default for privacy
      default: null,
    },
    certifications: [{ type: String, trim: true }],
    badge: {
      type: String,
      default: 'Licensed Guide',
      trim: true,
    },
    status: {
      type: String,
      enum: [ 'active','inactive', 'suspended'],
      default: 'inactive', 
      index: true,
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 1,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedTours: {
      type: Number,
      default: 0,
      min: 0,
    },
    adminNotes: {
      type: String,
      select: false,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdAt: {
      type:Date,
      default:Date.now() 
    },
  },
  {
    timestamps: true,
  }
);

guideSchema.index({ fullName: 'text', bio: 'text', city: 'text' });
guideSchema.index({ status: 1, city: 1, category: 1, isDeleted: 1 });

/**
 * ─── GUIDE SLOT SCHEMA ─────────────────────────────────────
 * Calendar working shifts and bookable time windows
 */
const guideSlotSchema = new mongoose.Schema(
  {
    guide: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guide',
      required: true,
      index: true,
    },
    date: {
      type: String, // Format: "YYYY-MM-DD"
      required: [true, 'Slot date is required (YYYY-MM-DD)'],
      index: true,
    },
    startTime: {
      type: String, // e.g. "08:00"
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: String, // e.g. "12:00"
      required: [true, 'End time is required'],
    },
    slotType: {
      type: String,
      default: 'Standard Tour',
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Slot price is required'],
      min: 0,
    },
    currency: {
      type: String,
      default: 'SAR',
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    isBooked: {
      type: Boolean,
      default: false,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

guideSlotSchema.index({ guide: 1, date: 1, isAvailable: 1, isBooked: 1 });

/**
 * ─── GUIDE REVIEW SCHEMA ───────────────────────────────────
 * Authenticated customer feedback and star ratings
 */
const guideReviewSchema = new mongoose.Schema(
  {
    guide: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guide',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      maxlength: 1000,
    },
    verifiedBooking: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

guideReviewSchema.index({ guide: 1, createdAt: -1 });

const Guide = mongoose.model('Guide', guideSchema);
const GuideSlot = mongoose.model('GuideSlot', guideSlotSchema);
const GuideReview = mongoose.model('GuideReview', guideReviewSchema);

module.exports = {
  Guide,
  GuideSlot,
  GuideReview,
};
