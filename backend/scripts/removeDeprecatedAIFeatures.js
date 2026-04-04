import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import restaurantModel from "../models/restaurantModel.js";

dotenv.config();

const run = async () => {
  try {
    await connectDB();

    // Wait briefly if the connection is still being established by connectDB retries.
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    if (mongoose.connection.readyState !== 1) {
      console.error("Database connection is not ready. Aborting cleanup.");
      process.exit(1);
    }

    const result = await restaurantModel.updateMany(
      {},
      {
        $unset: {
          "subscription.features.aiMenuGenerator": "",
          "subscription.features.aIPriceOptimization": "",
        },
      }
    );

    console.log("Removed deprecated AI feature fields from restaurants.");
    console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
    process.exit(0);
  } catch (error) {
    console.error("Failed to remove deprecated AI features:", error.message);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

run();
