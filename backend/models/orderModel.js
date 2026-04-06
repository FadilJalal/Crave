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

    promoCode: { type: String, default: null },
    discount: { type: Number, default: 0 },

    paymentMethod: {
      type: String,
      enum: ["cod", "stripe", "split"],
      default: "cod",
    },

    // Split payment breakdown
    splitCardTotal: { type: Number, default: 0 },   // total already charged to card(s)
    splitCashDue:   { type: Number, default: 0 },   // cash to collect on delivery
    splitCardCount: { type: Number, default: 0 },   // number of cards used

    stripeSessionId: { type: String, default: null },
  },
  { timestamps: true }
);

// ── Performance Indexes ──────────────────────────────────────────────────────
// Speed up queries by userId and restaurantId
orderSchema.index({ userId: 1 });
orderSchema.index({ restaurantId: 1 });
orderSchema.index({ createdAt: -1 }); // For sorting by date
orderSchema.index({ status: 1 }); // For filtering by status

const orderModel =
  mongoose.models.order || mongoose.model("order", orderSchema);

export default orderModel;