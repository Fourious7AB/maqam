const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI ? process.env.MONGO_URI.trim() : undefined;
    const conn = await mongoose.connect(mongoUri, { family: 4, serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB connected: ${conn.connection.host}`);
    mongoose.connection.on('error', (err) => console.error(`MongoDB error: ${err.message}`));
    mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
  } catch (error) { 
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
