/* ═══════════════════════════════════════════════
   DATABASE CONNECTION
   Connects the app to MongoDB using Mongoose
═══════════════════════════════════════════════ */

const mongoose = require('mongoose');

async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1); // stop the server if the DB is not reachable
  }
}

module.exports = connectDB;