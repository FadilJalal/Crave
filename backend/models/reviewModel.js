import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "restaurant",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "order",
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      default: "Customer",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: "",
      maxlength: 500,
    },
    reply: {
      text: { type: String, default: "" },
      repliedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

// One review per user per order
reviewSchema.index({ orderId: 1, userId: 1 }, { unique: true });

const reviewModel =
  mongoose.models.review || mongoose.model("review", reviewSchema);

export default reviewModel;