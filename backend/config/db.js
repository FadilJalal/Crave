import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    console.log("MONGO_URL VALUE:", process.env.MONGO_URL);

    await mongoose.connect(process.env.MONGO_URL);

    console.log("DB Connected");
  } catch (error) {
    console.error("DB Connection Error:", error);
  }
};