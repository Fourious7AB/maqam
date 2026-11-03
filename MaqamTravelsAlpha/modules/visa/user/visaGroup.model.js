const mongoose = require('mongoose');

const visaGroupSchema = new mongoose.Schema(
  {
    // Account holder who submitted the batch
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    destinationCountry: {
      type: String,
      required: true,
      trim: true,
    },
    visaType: {
      type: String,
      required: true,
      trim: true,
    }, // e.g. "Tourist 30 Days", "Umrah Visa"
    totalApplicants: {
      type: Number,
      required: true,
      min: 1,
    },

    // Source tracking if created through a Package Booking
    bookingSource: {
      type: String,
      enum: ['standalone', 'package'],
      default: 'standalone',
      index: true,
    },
    packageBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PackageBooking',
      default: null,
      index: true,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
      default: null,
    },

    // Billing and Group Status
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    groupStatus: {
      type: String,
      enum: ['processing', 'completed', 'partially_approved', 'rejected'],
      default: 'processing',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

visaGroupSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.VisaGroup || mongoose.model('VisaGroup', visaGroupSchema);