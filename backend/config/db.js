import mongoose from "mongoose";

let isConnecting = false;

export const connectDB = async () => {
  if (isConnecting) return;
  const uri = process.env.MONGO_URL;
  if (!uri) {
    console.error("[DB] MONGO_URL is not set in .env — cannot connect.");
    return;
  }

  isConnecting = true;
  mongoose.set("strictQuery", false);

  mongoose.connection.on("disconnected", () => {
    console.warn("[DB] Disconnected — reconnecting in 5s...");
    isConnecting = false;
    setTimeout(() => connectDB(), 5000);
  });

  mongoose.connection.on("error", (err) => {
    console.error("[DB] Connection error:", err.message);
  });

  mongoose.connection.on("connected", () => {
    isConnecting = false;
    console.log("[DB] Connected to MongoDB");
  });

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      heartbeatFrequencyMS: 10000,
    });
  } catch (error) {
    isConnecting = false;
    console.error("[DB] Initial connection failed:", error.message);
    console.warn("[DB] Retrying in 5s...");
    setTimeout(() => connectDB(), 5000);
  }
};