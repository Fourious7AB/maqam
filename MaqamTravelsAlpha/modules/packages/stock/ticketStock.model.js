// modules/packages/stock/ticketStock.model.js
//
// Represents a batch of block/series-fare tickets admin bought in bulk under one shared
// PNR, unnamed until sold. Confirmed pattern from conversation: one PNR, N interchangeable
// seats, names get added to the real airline PNR by admin (outside this system) as units sell.

const mongoose = require("mongoose");
const { Schema } = mongoose;

const TicketUnitSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["available", "assigned", "used"],
      default: "available",
    },
    ticketNumber: { type: String, default: null },

    assignedToBooking: { type: Schema.Types.ObjectId, default: null },
    assignedToBookingModel: {
      type: String,
      enum: ["PackageBooking", "OfferBooking"],
      default: null,
    },
    assignedAt: Date,
  },
  { _id: true } // each unit needs its own id — it's the thing /book will atomically claim
);

const TicketStockSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["flight"],
      default: "flight",
      required: true,
    },

    airline: { type: String, required: true },
    flightNumber: { type: String, required: true },
    origin: { type: String, required: true, uppercase: true },
    destination: { type: String, required: true, uppercase: true },
    departureDate: { type: Date, required: true },
    arrivalDate: Date,
    cabinClass: String,

    pnr: { type: String, required: true },
    nameAdditionDeadline: { type: Date, required: true },

    costPerUnit: { type: Number, required: true },

    units: {
      type: [TicketUnitSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: "TicketStock must have at least one unit",
      },
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

TicketStockSchema.virtual("totalUnits").get(function () {
  return this.units.length;
});
TicketStockSchema.virtual("availableUnits").get(function () {
  return this.units.filter((u) => u.status === "available").length;
});

TicketStockSchema.set("toJSON", { virtuals: true });
TicketStockSchema.set("toObject", { virtuals: true });

module.exports = mongoose.models.TicketStock || mongoose.model("TicketStock", TicketStockSchema);
