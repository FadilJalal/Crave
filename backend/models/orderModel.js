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

    // Shared delivery selection metadata (MVP)
    isSharedDelivery: {
      type: Boolean,
      default: false,
    },

    sharedMatchedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "order",
      default: null,
    },

    sharedSavings: {
      type: Number,
      default: 0,
    },

    sharedRole: {
      type: String,
      enum: ["pioneer", "matcher", null],
      default: null,
    },

    distanceFromRestaurant: {
      type: Number,
      default: 0,
    },

    deliverySequence: {
      type: Number,
      default: 1, // 1 = First stop, 2 = Second stop
    },

    address: {
      type: Object,
      required: true,
    },

    status: {
      type: String,
      default: "Order Placed",
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
    splitCashDue: { type: Number, default: 0 },   // cash to collect on delivery
    splitCardCount: { type: Number, default: 0 },   // number of cards used

    stripeSessionId: { type: String, default: null },
    inventoryDeducted: { type: Boolean, default: false },
    deliveryPreference: {
      type: String,
      enum: ["express", "shared"],
      default: "express",
    },
    // 🔥 Prep Tracking (KDS)
    prepStartedAt: { type: Date, default: null },
    prepCompletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── Performance Indexes ──────────────────────────────────────────────────────
orderSchema.index({ userId: 1, createdAt: -1 });               // Order history page
orderSchema.index({ restaurantId: 1, status: 1 });             // Kitchen view
orderSchema.index({ restaurantId: 1, createdAt: -1 });         // Revenue queries
orderSchema.index({ isSharedDelivery: 1, status: 1, createdAt: -1 }); // Shared matching
orderSchema.index({ stripeSessionId: 1 }, { sparse: true });   // Stripe webhook lookup

const orderModel =
  mongoose.models.order || mongoose.model("order", orderSchema);

export default orderModel;