// backend/models/foodModel.js
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
    ratings: [{ userId: String, score: Number }],  // one rating per user

    // ✅ CUSTOMIZATIONS FIELD
    customizations: [
        {
            title: { type: String, required: true },        // e.g. "Size", "Extras"
            required: { type: Boolean, default: false },    // must user pick one?
            multiSelect: { type: Boolean, default: false }, // can pick multiple?
            options: [
                {
                    label: { type: String, required: true },  // e.g. "Large"
                    extraPrice: { type: Number, default: 0 }  // e.g. 5 (added to base price)
                }
            ]
        }
    ]
});

const foodModel = mongoose.models.food || mongoose.model("food", foodSchema);
export default foodModel;