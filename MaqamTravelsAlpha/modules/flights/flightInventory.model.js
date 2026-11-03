const mongoose = require('mongoose');
const { Schema } = mongoose;

const flightRouteSchema = new Schema(
    {
        airport: { type: String, trim: true },
        city: { type: String, trim: true },
        time: Date,
    },
    { _id: false }
);

const flightSchema = new Schema(
    {
        srdvFlightId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        airline: { type: String, trim: true },
        flightNumber: { type: String, trim: true },
        departure: flightRouteSchema,
        arrival: flightRouteSchema,
        duration: Number,
        seatsAvailable: Number,
        price: Number,
        currency: { type: String, trim: true },
        bookingClass: { type: String, trim: true },
        amenities: [String],
    },
    {
        timestamps: true,
    }
);

flightSchema.index({ airline: 1 });

module.exports = mongoose.model('Flight', flightSchema);
