// modules/packages/models/packageBooking.model.js
//
// One document per customer purchase of a Package. Ties together everything decided during
// planning: which travellers are on this booking, which specific TicketStock/HotelStock
// units got claimed for it, user customization choices, and a frozen snapshot of what the customer actually bought.
//
// Note: Visas are standalone products and are never bundled inside Packages.

const mongoose = require("mongoose");
const { Schema } = mongoose;

const ClaimedUnitSchema = new Schema(
  {
    stockModel: {
      type: String,
      enum: ["TicketStock", "HotelStock", "GuideStock", "InsuranceStock"],
      required: true,
    },
    stock: { type: Schema.Types.ObjectId, required: true },
    unitId: { type: Schema.Types.ObjectId, required: true },
  },
  { _id: false }
);

const ClaimedFlightUnitSchema = new Schema(
  {
    stock: { type: Schema.Types.ObjectId, ref: "TicketStock", required: true },
    unitId: { type: Schema.Types.ObjectId, required: true },
  },
  { _id: false }
);

const ClaimedHotelUnitSchema = new Schema(
  {
    stock: { type: Schema.Types.ObjectId, ref: "HotelStock", required: true },
    unitId: { type: Schema.Types.ObjectId, required: true },
  },
  { _id: false }
);

const PackageBookingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    packageId: { type: Schema.Types.ObjectId, ref: "Package", required: true },
    guideSelected:{
      type:String,
      default:null
    },
    guideLocation:{
      type:[String],
      default:[null]
    }, 
    guidePrice:{
      type:Number,
      default:0
    },

    // Snapshot frozen at checkout: includes customized choices, full hotel/flight details, and itinerary
    packageSnapshot: Schema.Types.Mixed,

    // User's custom configuration
    customizedSelections: {
      includedOfferIds: [{ type: Schema.Types.ObjectId, ref: "Offer" }],
      excludedOfferIds: [{ type: Schema.Types.ObjectId, ref: "Offer" }],
      swappedOffers: [
        {
          originalOfferId: { type: Schema.Types.ObjectId, ref: "Offer" },
          replacementOfferId: { type: Schema.Types.ObjectId, ref: "Offer" },
        },
      ],
    },

    travellers: [
      {
        travellerId: { type: Schema.Types.ObjectId, ref: "Traveller" },
        firstName: { type: String },
        lastName: { type: String },
        title: { type: String },
        gender: { type: String },
        email: { type: String },
        phone: { type: String },
        isLead: { type: Boolean, default: false },
      },
    ],

    quantity: { type: Number, required: true, min: 1 },

    // All claimed units across all stock types
    claimedUnits: [ClaimedUnitSchema],
    claimedFlightUnits: [ClaimedFlightUnitSchema],
    claimedHotelUnits: [ClaimedHotelUnitSchema],

    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["initiated", "pending", "confirmed", "cancelled"],
      default: "initiated",
    },

    // Operations / CRM agent assigned to oversee the package
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },

    // Travel dates (editable by CRM/Agent for confirmed bookings)
    travelDates: {
      startDate: { type: Date },
      endDate: { type: Date },
    },

    // Passenger / Contact details for booking operations
    contactDetails: {
      email: { type: String },
      phone: { type: String },
      emergencyContact: { type: String },
    },

    razorpayOrderId: String,
    razorpayPaymentId: String,
    cancellationReason: String,
    cancelledAt: Date,
    remark: String,
    remarks: [
      {
        text: { type: String, required: true },
        author: { type: Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.models.PackageBooking || mongoose.model("PackageBooking", PackageBookingSchema);
