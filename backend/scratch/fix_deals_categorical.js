import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const foodSchema = new mongoose.Schema({}, { strict: false });
const Food = mongoose.model('food', foodSchema, 'foods');

async function fixDeals() {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to DB");

    // 1. Fix the expired 15 PC Strips
    const strips = await Food.findOne({ name: "15 PC Strips" });
    if (strips) {
        console.log("Updating 15 PC Strips...");
        await Food.updateOne({ _id: strips._id }, {
            $set: {
                isFlashDeal: true,
                flashDealExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
                salePrice: 44.20
            }
        });
    }

    // 2. Ensure "Super Star Burger Combo" is in a "Flash Deals" category for testing
    const burger = await Food.findOne({ name: "Super Star Burger Combo" });
    if (burger) {
        console.log("Setting Super Star Burger Combo to Flash Deals category...");
        await Food.updateOne({ _id: burger._id }, {
            $set: {
                category: "Flash Deals",
                isFlashDeal: false, // Testing categorical detection
                salePrice: 35.00,
                flashDealExpiresAt: null // Should not expire
            }
        });
    }

    await mongoose.disconnect();
    console.log("Done");
}

fixDeals();
