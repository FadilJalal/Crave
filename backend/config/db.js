import mongoose from "mongoose";

export const connectDB = async () => {
  const uri = process.env.MONGO_URL;
  if (!uri) {
    console.error("[DB] MONGO_URL is not set in .env — cannot connect.");
    return;
  }

  mongoose.set("strictQuery", false);

  // Auto-reconnect on disconnect
  mongoose.connection.on("disconnected", () => {
    console.warn("[DB] Disconnected — attempting reconnect in 5s...");
    setTimeout(() => connectDB(), 5000);
  });

  mongoose.connection.on("error", (err) => {
    console.error("[DB] Connection error:", err.message);
  });

  mongoose.connection.on("connected", () => {
    console.log("[DB] Connected to MongoDB");
  });

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,   // 10s to find a server
      socketTimeoutMS: 45000,            // 45s socket timeout
      maxPoolSize: 10,                   // connection pool
      heartbeatFrequencyMS: 10000,       // ping every 10s to keep alive
    });
  } catch (error) {
    console.error("[DB] Initial connection failed:", error.message);
    console.warn("[DB] Retrying in 5s...");
    setTimeout(() => connectDB(), 5000);
  }
};