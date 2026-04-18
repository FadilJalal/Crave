import mongoose from "mongoose";

const payoutSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "restaurant",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "AED",
    },
    status: {
      type: String,
      enum: ["Pending", "Processed", "Failed", "Cancelled"],
      default: "Pending",
    },
    referenceId: {
      type: String,
      unique: true,
      required: true,
    }, // Bank transaction ID
    payoutMethod: {
      type: String,
      default: "Bank Transfer",
    },
    notes: String,
    processedAt: Date,
  },
  { timestamps: true }
);

const payoutModel = mongoose.models.payout || mongoose.model("payout", payoutSchema);
export default payoutModel;
