import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const foodSchema = new mongoose.Schema({}, { strict: false });
const Food = mongoose.model('food', foodSchema, 'foods');

async function revert() {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to DB");

    const burger = await Food.findOne({ name: "Super Star Burger Combo" });
    if (burger) {
        console.log("Reverting Super Star Burger Combo...");
        await Food.updateOne({ _id: burger._id }, {
            $set: {
                category: "Chargrilled Burgers",
                isFlashDeal: false,
                salePrice: null,
                flashDealExpiresAt: null
            }
        });
    }

    await mongoose.disconnect();
    console.log("Done");
}

revert();
