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
      plan:      { type: String, enum: ["free", "basic", "starter", "professional", "enterprise"], default: "free" },
      status:    { type: String, enum: ["active", "expired", "trial", "cancelled", "paused"], default: "trial" },
      tier:      { type: Number, enum: [0, 1, 2, 3], default: 0 }, // 0=free, 1=starter, 2=pro, 3=enterprise
      startDate: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
      price:     { type: Number, default: 0 },   // AED per month
      notes:     { type: String, default: "" },
      // Feature flags
      features: {
        // Basic Features
        dashboard:             { type: Boolean, default: true },
        orders:                { type: Boolean, default: true },
        menu:                  { type: Boolean, default: true },
        messages:              { type: Boolean, default: true },
        reviews:               { type: Boolean, default: true },
        menuItems:             { type: Boolean, default: true },
        bulkUpload:            { type: Boolean, default: true },
        // Marketing
        promoCodes:            { type: Boolean, default: true },
        broadcasts:            { type: Boolean, default: false },
        emailCampaigns:        { type: Boolean, default: false },
        // Advanced
        inventory:             { type: Boolean, default: false },
        inventoryAnalytics:    { type: Boolean, default: false },
        customers:             { type: Boolean, default: false },
        // AI Features
        aiInsights:            { type: Boolean, default: false },
        aiCustomerSegmentation:{ type: Boolean, default: false },
        // Analytics
        analytics:             { type: Boolean, default: false },
      },
      stripeCustomerId: String,
      stripeSubscriptionId: String,
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