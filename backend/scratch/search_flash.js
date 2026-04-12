import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const foodSchema = new mongoose.Schema({}, { strict: false });
const Food = mongoose.model('food', foodSchema, 'foods');

async function search() {
    await mongoose.connect(process.env.MONGO_URL);
    const flashItems = await Food.find({
        $or: [
            { category: /flash/i },
            { name: /flash/i },
            { description: /flash/i }
        ]
    });
    console.log('Potential Flash items:', JSON.stringify(flashItems, null, 2));
    await mongoose.disconnect();
}

search();
