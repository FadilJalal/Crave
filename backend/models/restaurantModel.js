import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },

    address: { type: String, required: true },

    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },

    // ✅ NEW: logo (served via /images/<filename>)
    logo: { type: String, default: "" },

    avgPrepTime: { type: Number, default: 15 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const restaurantModel =
  mongoose.models.restaurant || mongoose.model("restaurant", restaurantSchema);

export default restaurantModel;