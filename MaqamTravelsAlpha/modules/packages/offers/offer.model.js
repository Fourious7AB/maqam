const mongoose = require("mongoose");
const { Schema } = mongoose;

const offerSchema = new Schema(
  {
    title: { type: String, required: true },
    description: String,
    destination: { type: String, required: true },
    images: [String],

    itemType: { type: String, enum: ["flight", "hotel"], required: true },

    flightRef: {
      stock: { type: Schema.Types.ObjectId, ref: "TicketStock" },
      unitsPerBooking: { type: Number },
    },
    hotelRef: {
      stock: { type: Schema.Types.ObjectId, ref: "HotelStock" },
      unitsPerBooking: { type: Number },
    },

    sellPrice: { type: Number, required: true },
    originalPrice: { type: Number }, // for marketing display only, not used in price math
    discountPercentage: { type: Number, min: 0, max: 100 }, // display only, not used in price math

    inclusions: [String],
    exclusions: [String],

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Enforce exactly one of flightRef/hotelRef, matching itemType
offerSchema.pre("save", function (next) {
  const hasFlight = !!(this.flightRef && this.flightRef.stock);
  const hasHotel = !!(this.hotelRef && this.hotelRef.stock);

  if (hasFlight === hasHotel) {
    return next(
      new Error("Offer must reference exactly one of flightRef or hotelRef, not both or neither.")
    );
  }
  if (this.itemType === "flight" && !hasFlight) {
    return next(new Error("itemType is 'flight' but flightRef.stock is not set."));
  }
  if (this.itemType === "hotel" && !hasHotel) {
    return next(new Error("itemType is 'hotel' but hotelRef.stock is not set."));
  }
  next();
});

module.exports = mongoose.models.Offer || mongoose.model("Offer", offerSchema);
