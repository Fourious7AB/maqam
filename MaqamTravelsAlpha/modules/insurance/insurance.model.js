const mongoose = require('mongoose');

/**
 * ─── COVERAGE DETAIL SUB-SCHEMA ───────────────────────────
 */
const coverageDetailSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Coverage title is required'],
      trim: true,
    },
    coverageAmount: {
      type: Number,
      required: [true, 'Coverage amount is required'],
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    deductible: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: true }
);

/**
 * ─── DURATION OPTION SUB-SCHEMA ───────────────────────────
 */
const durationOptionSchema = new mongoose.Schema(
  {
    minDays: {
      type: Number,
      required: [true, 'minDays is required'],
      min: 1,
    },
    maxDays: {
      type: Number,
      required: [true, 'maxDays is required'],
      min: 1,
    },
    price: {
      type: Number,
      required: [true, 'Duration price is required'],
      min: 0,
    },
  },
  { _id: true }
);

/**
 * ─── ADD-ON SUB-SCHEMA ────────────────────────────────────
 */
// const addOnSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: [true, 'Add-on name is required'],
//       trim: true,
//     },
//     price: {
//       type: Number,
//       required: [true, 'Add-on price is required'],
//       min: 0,
//     },
//     description: {
//       type: String,
//       trim: true,
//       default: '',
//     },
//   },
//   { _id: true }
// );

/**
 * ─── INSURANCE PLAN SCHEMA ────────────────────────────────
 */
const insurancePlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      index: true,
    },
    provider: {
      type: String,
      required: [true, 'Insurance provider is required'],
      trim: true,
      index: true,
    },
    planType: {
      type: String,
      enum: [
        'comprehensive',
        'medical',
        'travel_delay',
        'cancellation',
        'student',
        'schengen',
        'senior_citizen',
        'custom',
      ],
      default: 'comprehensive',
      index: true,
    },
    destinationScope: {
      type: String,
      enum: [
        'worldwide',
        'worldwide_excluding_usa_canada',
        'schengen',
        'asia',
        'middle_east',
        'domestic',
        'custom',
      ],
      default: 'worldwide',
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    coverageDetails: [coverageDetailSchema],
    durationOptions: [durationOptionSchema],
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
    },
    // addOns: [addOnSchema], 
    minAge: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAge: {
      type: Number,
      default: 99,
      max: 120,
    },
    termsUrl: {
      type: String,
      trim: true,
      default: null,
    },
    policyDocumentTemplateUrl: {
      type: String,
      trim: true,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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
  },
  {
    timestamps: true,
  }
);

insurancePlanSchema.index({ name: 'text', provider: 'text', description: 'text' });
insurancePlanSchema.index({ isActive: 1, isDeleted: 1, planType: 1, destinationScope: 1 });

/**
 * ─── TRAVELER SUB-SCHEMA ──────────────────────────────────
 */
const travelerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Traveler name is required'],
      trim: true,
    },
    age: {
      type: Number,
      required: [true, 'Traveler age is required'],
      min: 0,
    },
    passportNumber: {
      type: String,
      trim: true,
      default: null,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'other',
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    relationship: {
      type: String,
      trim: true,
      default: 'primary',
    },
  },
  { _id: true }
);

/**
 * ─── CLAIM SUB-SCHEMA ─────────────────────────────────────
 */
const claimSchema = new mongoose.Schema(
  {
    claimNumber: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Claim description is required'],
      trim: true,
    },
    amountClaimed: {
      type: Number,
      required: [true, 'Claim amount is required'],
      min: 0,
    },
    amountApproved: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
    },
    documents: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected', 'paid'],
      default: 'pending',
      index: true,
    },
    adminNotes: {
      type: String,
      trim: true,
      default: null,
    },
    filedAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { _id: true, timestamps: true }
);

/**
 * ─── INSURANCE POLICY SCHEMA ──────────────────────────────
 */
const insurancePolicySchema = new mongoose.Schema(
  {
    policyNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InsurancePlan',
      required: [true, 'Insurance plan reference is required'],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    tripDetails: {
      origin: {
        type: String,
        required: [true, 'Trip origin is required'],
        trim: true,
      },
      destination: {
        type: String,
        required: [true, 'Trip destination is required'],
        trim: true,
      },
      startDate: {
        type: Date,
        required: [true, 'Trip start date is required'],
      },
      endDate: {
        type: Date,
        required: [true, 'Trip end date is required'],
      },
      durationDays: {
        type: Number,
        required: true,
        min: 1,
      },
    },
    travelers: {
      type: [travelerSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'At least one traveler is required',
      },
    },
    addOns: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
      },
    ],
    pricingBreakdown: {
      baseRate: { type: Number, required: true },
      durationDays: { type: Number, required: true },
      travelersCount: { type: Number, required: true },
      addOnsTotal: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      totalPremium: { type: Number, required: true },
      currency: { type: String, default: 'USD' },
    },
    linkedTo: {
      type: {
        type: String,
        enum: ['flight', 'visa', 'package', 'hotel', 'none'],
        default: 'none',
      },
      refId: {
        type: String,
        default: null,
      },
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'paid',
      index: true,
    },
    paymentReference: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'claimed'],
      default: 'active',
      index: true,
    },
    policyDocumentUrl: {
      type: String,
      trim: true,
      default: null,
    },
    claims: [claimSchema],
  },
  {
    timestamps: true,
  }
);

insurancePolicySchema.index({ user: 1, status: 1, createdAt: -1 });
insurancePolicySchema.index({ 'tripDetails.startDate': 1, 'tripDetails.endDate': 1 });

const InsurancePlan = mongoose.model('InsurancePlan', insurancePlanSchema);
const InsurancePolicy = mongoose.model('InsurancePolicy', insurancePolicySchema);

module.exports = {
  InsurancePlan,
  InsurancePolicy,
};
