const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI ? process.env.MONGO_URI.trim() : undefined;
    console.log("DEBUG: Resolved MONGO_URI is ->", mongoUri); 

    // Using family: 4 handles Windows network loopbacks safely
    const conn = await mongoose.connect(mongoUri, {
      family: 4,
      serverSelectionTimeoutMS: 5000
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    try {
      const dbName = conn.connection.name || (mongoose.connection.db && mongoose.connection.db.databaseName) || "unknown";
      console.log(`✅ MongoDB database: ${dbName}`);
    } catch (e) {
      // ignore
    }

    mongoose.connection.on("error", (err) => {
      console.error(` MongoDB error: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn(" MongoDB disconnected");
    });
  } catch (error) {
    console.error(` MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
