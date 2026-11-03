const mongoose = require('mongoose');
const { Schema } = mongoose;

const hotelSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    images: [{ type: String }],
    amenities: [{ type: String }],
    contactPerson: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    contactEmail: { type: String, trim: true },
    tieUpStartDate: { type: Date },
    contractNotes: { type: String }, // internal, admin-only
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

hotelSchema.index({ name: 1, destination: 1 });

module.exports = mongoose.models.Hotel || mongoose.model('Hotel', hotelSchema);
