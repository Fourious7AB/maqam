const mongoose = require('mongoose');

const visaApplicationSchema = new mongoose.Schema(
  {
    applicationNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    // Links back to the parent batch
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VisaGroup',
      required: true,
      index: true,
    },
    // Account holder who owns this submission
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Assigned Agent or Case Officer (Assigned by Admin)
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    // Individual Traveler Personal Details
    travelerDetails: {
      namePrefix: { type: String, trim: true, default: "Mr" },
      title: { type: String, trim: true, default: "Mr" },
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      passportNumber: { type: String, required: true, uppercase: true, trim: true },
      dateOfBirth: { type: Date, required: true },
      nationality: { type: String, required: true, trim: true },
      gender: { type: String, enum: ['male', 'female', 'other'], default: 'male' },
      occupation: { type: String, trim: true, default: '' },
    },

    // File Upload References (Cloudinary URLs)
    documents: {
      passportScan: { type: String, default: '' },
      photo: { type: String, default: '' },
      additionalDocs: [{ type: String }], // Optional supporting files
    },

    // Individual Visa Lifecycle Status
    status: {
      type: String,
      enum: [
        'submitted', // Applied, waiting for Admin to review
        'assigned', // Admin assigned an Agent
        'in_review', // Agent is processing with Embassy
        'action_required', // Missing info/documents from traveler
        'approved', // Visa issued
        'rejected', // Embassy rejected
      ],
      default: 'submitted',
      index: true,
    },
    createdAt:{
      type:Date,
      default:Date.now,
      index:true
    },
    updatedAt:{
      type:Date,
      default:Date.now,
      index:true
    },

    // Outcome Data
    adminNotes: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },
    issuedVisaUrl: { type: String, default: null }, // Path/Cloudinary URL of finalized PDF visa
  },
  {
    timestamps: true,
  }
);

visaApplicationSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.VisaApplication ||
  mongoose.model('VisaApplication', visaApplicationSchema);