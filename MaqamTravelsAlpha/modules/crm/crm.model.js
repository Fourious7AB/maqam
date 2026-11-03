const mongoose = require('mongoose');

/**
 * ─── CRM MODEL (Lead Schema) ───────────────────────────
 * Tracks sales leads and conversions
 * Designed to align 1:1 with frontend Leads & Pipeline UI
 */

const timelineItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, default: 'note' },
    title: { type: String, default: '' },
    detail: { type: String, default: '' },
    time: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const leadSchema = new mongoose.Schema(
  {
    // Lead contact info
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      default: '',
      trim: true,
    },
    company: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },

    // Source & Classification
    source: {
      type: String,
      default: 'Website',
      trim: true,
    },
    tripType: {
      type: String,
      default: 'Leisure',
      trim: true,
    },

    // Travel & Requirement details
    destination: {
      type: String,
      default: '',
      trim: true,
    },
    travelDates: {
      from: { type: Date },
      to: { type: Date },
    },
    budget: {
      type: Number,
      default: 0,
    },
    numberOfPeople: {
      type: Number,
      default: 1,
    },
    specialRequests: {
      type: String,
      default: '',
      trim: true,
    },

    // Lead stage & Priority
    status: {
      type: String,
      default: 'new',
      trim: true,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },

    // Assignment
    assignedTo: {
      type: String,
      default: null,
      trim: true,
    },
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Follow-up tracking & Notes
    nextFollowUp: {
      type: Date,
      default: null,
    },
    nextFollowUpDate: {
      type: Date,
      default: null,
    },
    lastContactDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
    contactNotes: {
      type: String,
      default: '',
    },

    // Activity timeline feed
    timeline: [timelineItemSchema],

    // Quote details
    quotedPrice: {
      type: Number,
      default: 0,
    },
    quoteExpiresAt: {
      type: Date,
      default: null,
    },

    // Customer-side quotation request (modules/quotes)
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    quoteReference: {
      type: String,
      trim: true,
      uppercase: true,
      // no default: sparse unique index must skip leads created by staff
    },
    customerResponse: {
      action: {
        type: String,
        enum: ['accepted', 'rejected', 'changes_requested', null],
        default: null,
      },
      note: { type: String, default: '', trim: true },
      respondedAt: { type: Date, default: null },
    },

    // Conversion
    convertedBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    convertedCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    convertedAt: {
      type: Date,
      default: null,
    },

    // If lost
    lostReason: {
      type: String,
      default: '',
    },

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals for frontend compatibility
leadSchema.virtual('name').get(function () {
  const parts = [this.firstName, this.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : (this.company || 'Unknown');
});

leadSchema.virtual('travelers').get(function () {
  return this.numberOfPeople;
});

leadSchema.virtual('query').get(function () {
  return this.specialRequests;
});

// Indexes
leadSchema.index({ assignedAgent: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ customer: 1, createdAt: -1 });
leadSchema.index({ quoteReference: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Lead', leadSchema);

