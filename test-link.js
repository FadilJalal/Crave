import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

import inventoryModel from './backend/models/inventoryModel.js';

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const item = await inventoryModel.findOne({});
    console.log("Before:", item.linkedMenuItems);
    
    // Simulate linkMenuItem
    if (!item.linkedMenuItems) item.linkedMenuItems = [];
    item.linkedMenuItems.push({ foodId: new mongoose.Types.ObjectId(), quantityPerOrder: 5 });
    
    await item.save();
    console.log("After:", item.linkedMenuItems);
    
    // Wait, let's also pull it back out to be sure
    const check = await inventoryModel.findById(item._id);
    console.log("From DB:", check.linkedMenuItems);
    
    process.exit(0);
}

run();
