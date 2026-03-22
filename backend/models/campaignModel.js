import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "restaurant", required: true },
  type:         { type: String, enum: ["offer", "menu", "general"], default: "general" },
  subject:      { type: String, required: true },
  heading:      { type: String, required: true },
  body:         { type: String, required: true },
  ctaText:      { type: String, default: "" },
  ctaUrl:       { type: String, default: "" },
  status:       { type: String, enum: ["sent", "scheduled", "failed"], default: "sent" },
  scheduledAt:  { type: Date, default: null },
  sentAt:       { type: Date, default: null },
  recipientCount: { type: Number, default: 0 },
  sentCount:    { type: Number, default: 0 },
  failedCount:  { type: Number, default: 0 },
}, { timestamps: true });

const campaignModel = mongoose.models.campaign || mongoose.model("campaign", campaignSchema);
export default campaignModel;