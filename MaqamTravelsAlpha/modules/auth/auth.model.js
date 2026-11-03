const mongoose = require('mongoose');

const AVATAR_OPTIONS = [
  'https://cdn-icons-png.flaticon.com/512/1077/1077114.png',
  'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
  'https://cdn-icons-png.flaticon.com/512/6997/6997662.png',
  'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
  'https://cdn-icons-png.flaticon.com/512/236/236831.png',
];

const getRandomAvatar = () => AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];

/**
 * ─── AUTH MODEL (User Schema) ──────────────────────────
 * Only schema definition — no business logic
 */

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // exclude from queries by default
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    avatar: {
      type: String,
      enum: AVATAR_OPTIONS,
      default:null
      
      
    },

    role: {
      type: String,
      enum: ['customer', 'sales_agent', 'support_agent', 'admin', 'super_admin', 'hotelier'],
      default: 'customer',
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      
    },
    isVerified: {
      type: Boolean,
      default: false, 
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: {
      type: String,
      default: null,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    theme:{
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    createdBy: {
      type: String,
      default: null 
     } // who created the user like superadmin for crm
    // otp will be added later 
  },
  {
    timestamps: true, 
  }
);

userSchema.index({ createdAt: -1 });

const User = mongoose.model('User', userSchema);
User.AVATAR_OPTIONS = AVATAR_OPTIONS;
module.exports = User;
