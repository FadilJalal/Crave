import mongoose from "mongoose";

const subscriptionPlanSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    tier: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, default: "", trim: true },
    billingPeriod: { type: String, default: "month", trim: true },
    features: { type: Map, of: Boolean, default: {} },
  },
  { timestamps: true }
);

const subscriptionPlanModel =
  mongoose.models.subscriptionPlan || mongoose.model("subscriptionPlan", subscriptionPlanSchema);

export default subscriptionPlanModel;
