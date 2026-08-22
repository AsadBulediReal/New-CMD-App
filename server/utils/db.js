const mongoose = require("mongoose");

/**
 * Global cache across serverless function invocations on platforms like Vercel.
 * In a serverless environment, global variables persist between warm invocations.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/cmd_app";

const MONGO_OPTIONS = {
  maxPoolSize: 10,                 // Limit pool size per serverless container
  minPoolSize: 0,                  // Allow connections to close when idle
  serverSelectionTimeoutMS: 5000,  // Fast fail instead of 30s freeze
  socketTimeoutMS: 45000,          // Keep-alive timeout
  connectTimeoutMS: 10000,         // Initial connection timeout
  family: 4                        // Force IPv4 to prevent DNS lookup delays
};

/**
 * Establishes or reuses an active MongoDB connection.
 */
async function connectDB() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise || mongoose.connection.readyState === 0) {
    cached.promise = mongoose.connect(MONGODB_URI, MONGO_OPTIONS).then((m) => {
      console.log("Connected to MongoDB");
      return m;
    }).catch((err) => {
      cached.promise = null;
      console.error("MongoDB connection error:", err.message);
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

/**
 * Express middleware that guarantees an active MongoDB connection before handling requests.
 */
async function dbMiddleware(req, res, next) {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("Database connection failure:", err.message);
    res.status(503).json({ error: "Database unavailable" });
  }
}

module.exports = { connectDB, dbMiddleware };
