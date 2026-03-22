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
    minimumOrder:  { type: Number, default: 0 },   // AED — 0 means no minimum
    deliveryTiers: {
      type: Array,
      default: [
        { upToKm: 3,    fee: 5  },
        { upToKm: 7,    fee: 10 },
        { upToKm: null, fee: 15 },
      ]
    },

    subscription: {
      plan:      { type: String, enum: ["none", "basic", "pro", "standard"], default: "none" },
      status:    { type: String, enum: ["active", "expired", "trial", "cancelled"], default: "trial" },
      startDate: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
      price:     { type: Number, default: 0 },   // AED per month
      notes:     { type: String, default: "" },
    },

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