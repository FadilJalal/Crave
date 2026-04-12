import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const MONGO_URL = process.env.MONGO_URL;

const foodSchema = new mongoose.Schema({
    name: String,
    isFlashDeal: Boolean,
    salePrice: Number,
    price: Number,
    flashDealExpiresAt: Date,
    flashDealTotalStock: Number,
    flashDealClaimed: Number
}, { strict: false });

const Food = mongoose.model('food', foodSchema, 'foods');

async function activateDeals() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to DB");

        // Set expiry to 24 hours from now
        const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const itemsToUpdate = [
            "Cheese Steak Burger Combo",
            "Super Star Burger Combo",
            "15 PC Strips"
        ];

        for (const itemName of itemsToUpdate) {
            const item = await Food.findOne({ name: itemName });
            if (item) {
                console.log(`Updating "${itemName}"...`);
                await Food.updateOne({ _id: item._id }, {
                    $set: {
                        isFlashDeal: true,
                        salePrice: Math.floor(item.price * 0.8), // 20% off
                        flashDealExpiresAt: expiry,
                        flashDealTotalStock: 50,
                        flashDealClaimed: Math.floor(Math.random() * 20)
                    }
                });
                console.log(`✅ Activated flash deal for ${itemName}`);
            } else {
                console.log(`❌ Could not find item: ${itemName}`);
            }
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

activateDeals();
