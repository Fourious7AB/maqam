const mongoose = require("mongoose");
const { Schema } = mongoose;

const offerBookingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    offerId: { type: Schema.Types.ObjectId, ref: "Offer", required: true },
    offerSnapshot: { type: Schema.Types.Mixed, required: true },

    travellers: [
      {
        travellerId: { type: Schema.Types.ObjectId, ref: "Traveller" },
        isLead: { type: Boolean, default: false },
        title: { type: String },
        firstName: { type: String },
        lastName: { type: String },
        gender: { type: String },
        email: { type: String },
        phone: { type: String },
        dateOfBirth: { type: String },
        passportNumber: { type: String },
      },
    ],
    quantity: { type: Number, required: true, default: 1 },

    claimedFlightUnits: [
      {
        stock: { type: Schema.Types.ObjectId, ref: "TicketStock" },
        unitId: { type: Schema.Types.ObjectId },
      },
    ],
    claimedHotelUnits: [
      {
        stock: { type: Schema.Types.ObjectId, ref: "HotelStock" },
        unitId: { type: Schema.Types.ObjectId },
      },
    ],

    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["initiated", "pending", "confirmed", "cancelled"],
      default: "initiated",
    },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    cancellationReason: String,
    cancelledAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.models.OfferBooking || mongoose.model("OfferBooking", offerBookingSchema);
