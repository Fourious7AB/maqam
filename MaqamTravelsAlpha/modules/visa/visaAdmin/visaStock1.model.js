const mongoose = require("mongoose");

const documentRequirementSchema = new mongoose.Schema({
  docType: {
    type: String,
    required: true,
    trim: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ""
  },
  isRequired: {
    type: Boolean,
    default: true
  },
  allowedMimes: {
    type: [String],
    default: ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
  },
  maxSizeBytes: {
    type: Number,
    default: 5 * 1024 * 1024 // 5MB default
  }
}, { _id: false });

const visaInventorySchema = new mongoose.Schema({
  country: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  countryCode: {
    type: String,
    trim: true,
    uppercase: true,
    default: ""
  },
  countryImage: {
    type: String,
    trim: true,
    default: ""
  },
  countryPicture: {
    type: String,
    trim: true,
    default: ""
  },
  countryFlag: {
    type: String,
    trim: true,
    default: ""
  },
  flagEmoji: {
    type: String,
    trim: true,
    default: ""
  },
  bannerImage: {
    type: String,
    trim: true,
    default: ""
  },
  gallery: {
    type: [String],
    default: []
  },
  visaType: {
    type: String,
    required: true,
    trim: true // e.g. "Tourist", "Umrah", "Business", "Work", "Student"
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  entryType: {
    type: String,
    enum: ["Single Entry", "Multiple Entry"],
    default: "Single Entry"
  },
  validity: {
    type: String,
    default: "30 Days"
  },
  stayDuration: {
    type: String,
    default: "30 Days"
  },
  processingTime: {
    type: String,
    default: "3-5 Working Days"
  },
  fees: {
    basePrice: {
      type: Number,
      required: true,
      min: 0
    },
    governmentFee: {
      type: Number,
      default: 0,
      min: 0
    },
    serviceFee: {
      type: Number,
      default: 0,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true
    }
  },
  inventory: {
    isUnlimited: {
      type: Boolean,
      default: true
    },
    totalStock: {
      type: Number,
      default: 0,
      min: 0
    },
    availableStock: {
      type: Number,
      default: 0,
      min: 0
    },
    allocatedStock: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  requiredDocuments: [documentRequirementSchema],
  description: {
    type: String,
    default: ""
  },
  guidelines: [String],
  termsAndConditions: [String],
  status: {
    type: String,
    enum: ["active", "inactive", "out_of_stock", "draft", "archived", "deleted"],
    default: "active"
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  }
}, {
  timestamps: true
});

visaInventorySchema.index({ country: 1, visaType: 1 });
visaInventorySchema.index({ status: 1 });
visaInventorySchema.index({ isDeleted: 1 });
visaInventorySchema.index({ createdAt: -1 });

// Pre-save calculate totalPrice if not provided & sync country image fields
visaInventorySchema.pre("save", function (next) {
  if (this.fees) {
    const base = Number(this.fees.basePrice) || 0;
    const govt = Number(this.fees.governmentFee) || 0;
    const service = Number(this.fees.serviceFee) || 0;
    const tax = Number(this.fees.tax) || 0;
    if (!this.fees.totalPrice) {
      this.fees.totalPrice = base + govt + service + tax;
    }
  }

  // Ensure countryImage and countryPicture are synced
  if (this.countryPicture && !this.countryImage) {
    this.countryImage = this.countryPicture;
  } else if (this.countryImage && !this.countryPicture) {
    this.countryPicture = this.countryImage;
  }

  next();
});

const VisaInventory = mongoose.models.VisaInventory || mongoose.model("VisaInventory", visaInventorySchema);
module.exports = VisaInventory;
