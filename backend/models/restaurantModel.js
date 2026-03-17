import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    address: { type: String, required: true },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    logo: { type: String, default: "" },
    avgPrepTime: { type: Number, default: 15 },
    isActive: { type: Boolean, default: true },
    deliveryRadius: { type: Number, default: 10 }, // km — 0 means unlimited

    // Opening hours per day: { open: "09:00", close: "22:00", closed: false }
    openingHours: {
      type: Object,
      default: () => ({
        monday:    { open: "09:00", close: "22:00", closed: false },
        tuesday:   { open: "09:00", close: "22:00", closed: false },
        wednesday: { open: "09:00", close: "22:00", closed: false },
        thursday:  { open: "09:00", close: "22:00", closed: false },
        friday:    { open: "09:00", close: "22:00", closed: false },
        saturday:  { open: "09:00", close: "22:00", closed: false },
        sunday:    { open: "09:00", close: "22:00", closed: false },
      }),
    },
  },
  { timestamps: true }
);

const restaurantModel =
  mongoose.models.restaurant || mongoose.model("restaurant", restaurantSchema);

export default restaurantModel;