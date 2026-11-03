const mongoose = require('mongoose');

/**
 * ─── CRM SETTINGS MODEL ────────────────────────────────
 * Stores configuration and operational settings grouped by section.
 * Supported default sections: general, financial, booking, notifications.
 */

const settingSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Setting', settingSchema);
