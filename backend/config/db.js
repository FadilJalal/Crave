import mongoose from "mongoose";

let isConnecting = false;

// Move listeners OUTSIDE to prevent duplicate listeners on every retry
mongoose.connection.on("disconnected", () => {
  console.warn("[DB] Disconnected — reconnecting in 5s...");
  setTimeout(() => connectDB(), 5000);
});

mongoose.connection.on("error", (err) => {
  console.error("[DB] Connection error:", err.message);
});

mongoose.connection.on("connected", () => {
  console.log("✅ [DB] Connected to MongoDB");
});

export const connectDB = async () => {
  // 1. Check if already trying to connect
  if (isConnecting || mongoose.connection.readyState === 1) return;

  const uri = process.env.MONGO_URL;
  if (!uri) {
    console.error("❌ [DB] MONGO_URL is not set in .env");
    return;
  }

  isConnecting = true;
  mongoose.set("strictQuery", false);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // Give Atlas 10s to respond
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    isConnecting = false; // Reset on success
  } catch (error) {
    isConnecting = false;
    console.error("❌ [DB] Initial connection failed:", error.message);
    
    // Check if it's an auth error specifically
    if (error.message.includes("auth failed")) {
       console.error("👉 Tip: Check your DB username and password in .env");
    }

    console.warn("[DB] Retrying in 5s...");
    setTimeout(() => connectDB(), 5000);
  }
};