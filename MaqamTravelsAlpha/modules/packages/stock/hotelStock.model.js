// modules/packages/stock/hotelStock.model.js
//
// Hotel counterpart to ticketStock.model.js.

const mongoose = require("mongoose");
const { Schema } = mongoose;

const HotelUnitSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["available", "blocked", "assigned", "used"],
      default: "available",
    },
    guestConfirmationRef: { type: String, default: null }, 
    assignedToBooking: { type: Schema.Types.ObjectId, default: null },
    assignedToBookingModel: {
      type: String,
      enum: ["PackageBooking", "OfferBooking"],
      default: null,
    },
    assignedAt: Date,
  },
  { _id: true },
);

const HotelStockSchema = new Schema(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: "Hotel", required: true },
    hotelName: { type: String, required: true },
    destination: { type: String, required: true },
    roomType: { type: String, required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    pricePerNight: { type: Number, required: true },
    
    meals: [{type: String, enum: ["breakfast", "lunch", "dinner"]}],

    reservationRef: { type: String, required: true },
    nameAdditionDeadline: { type: Date, required: true },

    reviewStatus: {
      type: String,
      enum: ["pending_review", "approved", "rejected"],
      default: "pending_review",
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewNotes: { type: String },

    units: {
      type: [HotelUnitSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: "HotelStock must have at least one unit",
      },
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

HotelStockSchema.virtual("totalNights").get(function () {
  if (!this.checkIn || !this.checkOut) return 0;
  const msPerNight = 1000 * 60 * 60 * 24;
  return Math.round((this.checkOut - this.checkIn) / msPerNight);
});
HotelStockSchema.virtual("costPerUnit").get(function () {
  return this.pricePerNight * this.totalNights;
});
HotelStockSchema.virtual("totalUnits").get(function () {
  return this.units.length;
});
HotelStockSchema.virtual("availableUnits").get(function () {
  return this.units.filter((u) => u.status === "available").length;
});

HotelStockSchema.set("toJSON", { virtuals: true });
HotelStockSchema.set("toObject", { virtuals: true });

module.exports = mongoose.models.HotelStock || mongoose.model("HotelStock", HotelStockSchema);
