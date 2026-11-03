// modules/packages/models/package.model.js
//
// 3-Tier Package Architecture:
// Bundles standalone Offers (flight / hotel)
// with anchored bundle discount and minimum 2 components guardrail.

const mongoose = require("mongoose");
const { Schema } = mongoose;

const PackageOfferRefSchema = new Schema(
  {
    offer: { type: Schema.Types.ObjectId, ref: "Offer", required: true },
    unitsPerBooking: { type: Number, default: 1, min: 1 },
    isOptional: { type: Boolean, default: true },        // User can opt-out
    isDefaultSelected: { type: Boolean, default: true },  // Selected by default
    allowSwap: { type: Boolean, default: true },          // Swappable with matching offers
    notes: String,
  },
  { _id: true }
);

const ItineraryDaySchema = new Schema(
  {
    day: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    assignedOffers: [
      {
        offer: { type: Schema.Types.ObjectId, ref: "Offer" },
        role: {
          type: String,
          enum: [
            "flight_departure",
            "flight_arrival",
            "hotel_stay",
            "hotel_checkout",
            "guide_tour",
            "activity",
          ],
        },
        notes: String,
      },
    ],
  },
  { _id: false }
);

const PackageSchema = new Schema(
  {
    title: { type: String, required: true },
    description: String,
    destination: { type: String, required: true },
    images: [String],
    guideActive:{
      type:Boolean,
      default:false
    },
    guideLocation:{
      type:String,
      default:null
    }, 
    guidePrice:{
      type:Number,
      default:0
    },

    // Bundled Offers (Flights, Hotels, etc.)
    offerRefs: [PackageOfferRefSchema],

    // Bundle discount percentage applied on the base default sum
    bundleDiscountPercentage: { type: Number, default: 0, min: 0, max: 100 },

    // Base default Package sell price (anchored)
    sellPrice: { type: Number, required: true },

    inclusions: [String],
    itinerary: [ItineraryDaySchema],
    validity: { from: Date, to: Date },
  
    isActive: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Guardrail: Package must have at least 2 Offer components (e.g., Flight + Hotel)
PackageSchema.pre("validate", function (next) {
  const totalOffers = this.offerRefs?.length || 0;
  if (totalOffers < 2) {
    return next(new Error("A Package must contain at least 2 Offer components (e.g. Flight + Hotel)."));
  }
  next();
});

module.exports = mongoose.models.Package || mongoose.model("Package", PackageSchema);
