import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './.env' });

const MONGO_URL = process.env.MONGO_URL;

const foodSchema = new mongoose.Schema({
    name: String,
    isFlashDeal: mongoose.Schema.Types.Mixed,
    salePrice: Number,
    price: Number,
    flashDealExpiresAt: Date
}, { strict: false });

const Food = mongoose.model('food', foodSchema, 'foods');

async function checkDeals() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to DB");

        const foods = await Food.find({});
        console.log(`Total foods found: ${foods.length}`);

        foods.forEach(f => {
            const isManualFlash = f.isFlashDeal === true || f.isFlashDeal === "true" || f.isFlashDeal === 1;
            const hasDiscount = f.salePrice && f.salePrice < f.price;
            const isCandidate = isManualFlash || hasDiscount;
            
            let isExpired = false;
            if (f.flashDealExpiresAt && new Date(f.flashDealExpiresAt).getTime() <= Date.now()) {
                isExpired = true;
            }

            if (isCandidate) {
                console.log(`- Item: "${f.name}"`);
                console.log(`  isFlashDeal: ${f.isFlashDeal} (${typeof f.isFlashDeal})`);
                console.log(`  salePrice: ${f.salePrice}, price: ${f.price}`);
                console.log(`  Expires At: ${f.flashDealExpiresAt}`);
                console.log(`  Is Expired (Node check): ${isExpired}`);
            }
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkDeals();
