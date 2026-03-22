import mongoose from "mongoose";

const promoSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "restaurant", required: true },
  code: { type: String, required: true, uppercase: true, trim: true },
  type: { type: String, enum: ["percent", "flat"], required: true },
  value: { type: Number, required: true },       // 20 = 20% off or AED 20 off
  minOrder: { type: Number, default: 0 },        // minimum cart subtotal to apply
  maxUses: { type: Number, default: null },       // null = unlimited
  usedCount: { type: Number, default: 0 },
  expiresAt: { type: Date, default: null },       // null = never expires
  isActive: { type: Boolean, default: true },
  usedBy: [{ type: String }],                    // array of userIds (one use per user)
}, { timestamps: true });

const promoModel = mongoose.models.promo || mongoose.model("promo", promoSchema);
export default promoModel;