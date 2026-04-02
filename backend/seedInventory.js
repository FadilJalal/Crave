import mongoose from "mongoose";
import inventoryModel from "../models/inventoryModel.js";
import { connectDB } from "../config/db.js";

const seedInventory = async () => {
  try {
    await connectDB();
    console.log("🌱 Seeding inventory data...");

    // Find an existing restaurant
    const Restaurant = (await import('./models/restaurantModel.js')).default;
    const restaurant = await Restaurant.findOne();

    if (!restaurant) {
      console.log("❌ No restaurants found in database. Please create a restaurant first.");
      console.log("💡 You can create a restaurant through the admin panel or use the existing seed scripts.");
      process.exit(1);
    }

    const restaurantId = restaurant._id;
    console.log(`📍 Using restaurant: ${restaurant.name} (${restaurantId})`);

    const sampleItems = [
      {
        restaurantId: restaurantId,
        itemName: "Fresh Tomatoes",
        category: "food_ingredient",
        unit: "kg",
        currentStock: 25,
        minimumStock: 10,
        maximumStock: 50,
        unitCost: 2.50,
        supplier: {
          name: "Local Farm Co.",
          contact: "+1-555-0123",
          email: "orders@localfarm.com"
        },
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        notes: "Organic tomatoes, best before expiry"
      },
      {
        restaurantId: restaurantId,
        itemName: "Mozzarella Cheese",
        category: "food_ingredient",
        unit: "kg",
        currentStock: 8,
        minimumStock: 15,
        maximumStock: 30,
        unitCost: 8.75,
        supplier: {
          name: "Dairy Distributors Inc.",
          contact: "+1-555-0456",
          email: "sales@dairydist.com"
        },
        expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        notes: "Fresh mozzarella, refrigerate at 4°C"
      },
      {
        restaurantId: restaurantId,
        itemName: "Pizza Boxes (Large)",
        category: "packaging",
        unit: "pieces",
        currentStock: 45,
        minimumStock: 20,
        maximumStock: 100,
        unitCost: 0.85,
        supplier: {
          name: "Packaging Plus",
          contact: "+1-555-0789",
          email: "info@packagingplus.com"
        },
        notes: "Recyclable cardboard boxes"
      },
      {
        restaurantId: restaurantId,
        itemName: "Olive Oil",
        category: "food_ingredient",
        unit: "l",
        currentStock: 12,
        minimumStock: 5,
        maximumStock: 25,
        unitCost: 6.50,
        supplier: {
          name: "Mediterranean Imports",
          contact: "+1-555-0321",
          email: "contact@medimports.com"
        },
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        notes: "Extra virgin olive oil"
      },
      {
        restaurantId: restaurantId,
        itemName: "Pepperoni Slices",
        category: "food_ingredient",
        unit: "kg",
        currentStock: 3,
        minimumStock: 8,
        maximumStock: 20,
        unitCost: 12.00,
        supplier: {
          name: "Meat Masters Ltd.",
          contact: "+1-555-0654",
          email: "orders@meatmasters.com"
        },
        expiryDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days
        notes: "Frozen pepperoni slices, keep frozen"
      }
    ];

    // Clear existing inventory for this restaurant
    await inventoryModel.deleteMany({ restaurantId: restaurantId });

    // Insert sample data
    await inventoryModel.insertMany(sampleItems);

    console.log("✅ Inventory seeded successfully!");
    console.log(`📦 Added ${sampleItems.length} inventory items`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding inventory:", error);
    process.exit(1);
  }
};

seedInventory();