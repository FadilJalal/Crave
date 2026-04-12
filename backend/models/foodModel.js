import mongoose from "mongoose";

const foodSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    category: { type: String, required: true },

    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "restaurant",
        required: true
    },

    avgRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    ratings: [{ userId: String, score: Number }],

    inStock: { type: Boolean, default: true },

    customizations: [
        {
            title: { type: String, required: true },
            required: { type: Boolean, default: false },
            multiSelect: { type: Boolean, default: false },
            options: [
                {
                    label: { type: String, required: true },
                    extraPrice: { type: Number, default: 0 }
                }
            ]
        }
    ],

    // ⚡ Flash Deal Fields
    isFlashDeal: { type: Boolean, default: false },
    salePrice: { type: Number, default: null },
    flashDealExpiresAt: { type: Date, default: null },
    flashDealTotalStock: { type: Number, default: null },
    flashDealClaimed: { type: Number, default: 0 },

    // 📦 Bundle Fields (Merge Sandwich + Beverage)
    isBundle: { type: Boolean, default: false },
    bundledItems: [{ type: mongoose.Schema.Types.ObjectId, ref: "food" }]
}, { strict: false });

// ── Performance Indexes ──────────────────────────────────────────────────────
// These indexes dramatically speed up queries on commonly filtered fields
foodSchema.index({ restaurantId: 1 });
foodSchema.index({ category: 1 });
foodSchema.index({ restaurantId: 1, category: 1 });
foodSchema.index({ inStock: 1 });

const foodModel = mongoose.models.food || mongoose.model("food", foodSchema);
export default foodModel;