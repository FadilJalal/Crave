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
    ]
});

const foodModel = mongoose.models.food || mongoose.model("food", foodSchema);
export default foodModel;