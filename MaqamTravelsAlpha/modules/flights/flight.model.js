// models/FlightBooking.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const PassengerSchema = new Schema(
  {
    travellerId: { type: Schema.Types.ObjectId, ref: "Traveller", required: true },
    isLeadPax: { type: Boolean, default: false },

    // Filled in only after Book/TicketGDS response, or the webhook
    paxId: Number,                        // SRDV's PaxId (GDS responses)
    ticketNumber: { type: String, default: "" },
    ticketId: String,
    ticketIssueDate: Date,
    ticketStatus: String,                 // e.g. "OK"
  },
  { _id: false }
);

const GstDetailsSchema = new Schema(
  {
    wantsInvoice: { type: Boolean, default: false },
    companyName: String,
    gstNumber: String,
    companyAddress: String,
    companyEmail: String,
    companyContactNumber: String,
  },
  { _id: false }
);

const FlightBookingSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // ---- Pre-call: from Search → FareQuote, needed for Book & TicketGDS ----
    traceId: { type: String, required: true },
    srdvType: String,
    srdvIndex: String,
    resultIndex: [String],
    isLCC: { type: Boolean, required: true },

    fareSnapshot: Schema.Types.Mixed,     // Fare object from FareQuote, sent as-is to Book
    totalAmount: Number,                  // your price incl. markup
    markupAmount: Number,
    currency: { type: String, default: 'INR' },

    isGstMandatory: Boolean,              // recorded from FareQuote response
    gstDetails: GstDetailsSchema,         // optional unless isGstMandatory was true

    // ---- Post-call: filled by Book response, or later by webhook/TicketGDS ----
    pnr: String,
    gdsPnr: String,
    srdvBookingId: { type: Number, index: true },
    lastTicketDate: Date,                 // GDS hold only — ticketing deadline

    status: {
      type: String,
      enum: ["initiated", "pending", "confirmed", "failed", "aborted", "cancelled"],
      default: "initiated",
    },
    remark: String,
    cancellationReason: String,
    cancelledAt: Date,

    ticketStatus: String,
    invoiceNo: String,
    invoiceStatus: String,

    passengers: [PassengerSchema],

    eTicketData: Schema.Types.Mixed,      // full FlightItinerary snapshot, for support/debugging

    // ---- Payment ----
    paymentOrderId: String,
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },

  },
  { timestamps: true }
);

module.exports = mongoose.model("FlightBooking", FlightBookingSchema);
