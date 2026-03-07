import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },

    // 🔥 Store restaurant reference (VERY IMPORTANT)
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "restaurant",
      required: true,
    },

    items: {
      type: Array,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    // 🔥 Delivery fee per user (after split)
    deliveryFee: {
      type: Number,
      default: 0,
    },

    address: {
      type: Object,
      required: true,
    },

    status: {
      type: String,
      default: "Food Processing",
    },

    // 🔥 Batching fields
    isBatched: {
      type: Boolean,
      default: false,
    },

    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "batch",
      default: null,
    },

    date: {
      type: Date,
      default: Date.now,
    },

    payment: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const orderModel =
  mongoose.models.order || mongoose.model("order", orderSchema);

export default orderModel;