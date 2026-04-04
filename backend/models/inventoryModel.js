import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "restaurant",
        required: true
    },

    itemName: {
        type: String,
        required: true
    },

    category: {
        type: String,
        required: true,
        enum: ["food_ingredient", "beverage", "packaging", "equipment", "other"]
    },

    unit: {
        type: String,
        required: true,
        enum: ["kg", "g", "l", "ml", "pieces", "boxes", "bottles", "cans", "packets"]
    },

    currentStock: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },

    minimumStock: {
        type: Number,
        required: true,
        default: 10,
        min: 0
    },

    maximumStock: {
        type: Number,
        default: 100,
        min: 0
    },

    unitCost: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },

    supplier: {
        name: String,
        contact: String,
        email: String
    },

    expiryDate: {
        type: Date
    },

    lastRestocked: {
        type: Date,
        default: Date.now
    },

    isActive: {
        type: Boolean,
        default: true
    },

    linkedMenuItems: [{
        foodId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "food",
            required: true
        },
        quantityPerOrder: {
            type: Number,
            required: true,
            default: 1,
            min: 0.01
        }
    }],

    deductionLog: [{
        orderId: String,
        foodId: String,
        foodName: String,
        qtyOrdered: Number,
        qtyDeducted: Number,
        stockBefore: Number,
        stockAfter: Number,
        date: { type: Date, default: Date.now }
    }],

    notes: String
}, {
    timestamps: true
});

// Indexes for efficient queries and analytics
inventorySchema.index({ restaurantId: 1, isActive: 1 });
inventorySchema.index({ restaurantId: 1, category: 1 });
inventorySchema.index({ restaurantId: 1, itemName: 1 });
inventorySchema.index({ restaurantId: 1, unitCost: 1 });
inventorySchema.index({ restaurantId: 1, expiryDate: 1 });
inventorySchema.index({ restaurantId: 1, lastRestocked: 1 });
inventorySchema.index({ restaurantId: 1, currentStock: 1 });
inventorySchema.index({ restaurantId: 1, createdAt: -1 });
inventorySchema.index({ "deductionLog.date": -1 });

const inventoryModel = mongoose.models.inventory || mongoose.model("inventory", inventorySchema);
export default inventoryModel;