// src/modules/account/traveller.model.js
const mongoose = require("mongoose");

const travellerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    passengerType: {
      type: String,
      enum: ["Adult", "Child", "Infant"],
      default: "Adult",
      required: true,
    },

    title: {
      type: String,
      enum: ["Mr", "Mrs", "Ms", "Miss", "Mstr"],
      required: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    middleName: {
      type: String,
      trim: true,
    },
    nationality: {
      type: String,
      default: "Indian",
      trim: true,
    },
    gender: { type: String, enum: ["Male", "Female"], required: true },
    dateOfBirth: { type: Date }, // optional for general travellers, populated when available

    // Contact
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    cellCountryCode: { type: String, default: "+91" },

    // Address (required by SRDV)
    addressLine1: { type: String, trim: true },
    city: { type: String, trim: true },
    countryCode: { type: String, default: "IN" },
    countryName: { type: String, default: "INDIA" },

    // Passport (international flights)
    passportNo: { type: String, trim: true },
    passportExpiry: { type: Date, optional: true },
    passportIssueCountryCode: { type: String, trim: true }, // ISO alpha-2 e.g. "IN",
    passportIssueDate: { type: Date, optional: true },
    documentType: { type: String, trim: true }, // e.g. "Passport", "Student ID"
    documentId: { type: String, trim: true }, // e.g. "Eky12LKH"
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);
travellerSchema.index({ userId: 1 });

travellerSchema.index({ userId: 1, isDefault: 1 });
module.exports = mongoose.model("Traveller", travellerSchema);
