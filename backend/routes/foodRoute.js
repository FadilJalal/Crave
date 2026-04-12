// backend/routes/foodRoute.js
import express from "express";
import multer from "multer";
import adminAuth from "../middleware/adminAuth.js";
import authMiddleware from "../middleware/auth.js";
import restaurantAuth from "../middleware/restaurantAuth.js";
import { listFood } from "../controllers/foodController.js";
import foodModel from "../models/foodModel.js";
import fs from "fs";

const foodRouter = express.Router();

const storage = multer.diskStorage({
  destination: "uploads",
  filename: (req, file, cb) => cb(null, `${Date.now()}${file.originalname}`),
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ── PUBLIC: customer food list (includes customizations) ───────────────────
foodRouter.get("/list/public", async (req, res) => {
  try {
    // Menu availability and counts must reflect admin changes immediately.
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });

    const foods = await foodModel
      .find({})
      .populate("restaurantId", "name logo isActive openingHours location deliveryRadius minimumOrder deliveryTiers")
      .lean();

    // 🧊 SOFT EXPIRY: Cleanly identifying expired deals for the current response
    // We no longer strip them from the DB here to avoid "disappearing" bugs.
    const now = new Date();
    foods.forEach(f => {
      if (f.isFlashDeal && f.flashDealExpiresAt && new Date(f.flashDealExpiresAt) <= now) {
        f.isFlashDeal = false; // Mark as inactive for this response only
      }
    });

    res.json({ success: true, data: foods });
  } catch (error) {
    console.error("[PUBLIC LIST ERROR]", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── ADMIN: protected food list ─────────────────────────────────────────────
foodRouter.get("/list", adminAuth, listFood);

// ── ADMIN: add food (superadmin — restaurantId sent in body) ───────────────
foodRouter.post("/add", adminAuth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.json({ success: false, message: "Image is required" });

    const restaurantId = req.body.restaurantId;
    if (!restaurantId) return res.json({ success: false, message: "restaurantId is required" });

    let customizations = [];
    if (req.body.customizations) {
      try { customizations = JSON.parse(req.body.customizations); } catch (e) {}
    }

    const food = new foodModel({
      name: req.body.name,
      description: req.body.description,
      price: Number(req.body.price),
      image: req.file.filename,
      category: req.body.category,
      restaurantId,
      customizations,
    });

    await food.save();
    res.json({ success: true, message: "Food Added" });
  } catch (error) {
    res.json({ success: false, message: "Error adding food" });
  }
});

// ── REMOVE: accepts both superadmin and restaurant admin ───────────────────
foodRouter.post("/remove", async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return adminAuth(req, res, next);
  }
  return restaurantAuth(req, res, next);
}, async (req, res) => {
  try {
    const food = await foodModel.findById(req.body.id);
    if (!food) return res.json({ success: false, message: "Food not found" });

    if (req.restaurantId && String(food.restaurantId) !== String(req.restaurantId)) {
      return res.status(403).json({ success: false, message: "Not your food item" });
    }

    try { fs.unlinkSync(`uploads/${food.image}`); } catch (e) {}
    await foodModel.findByIdAndDelete(req.body.id);
    res.json({ success: true, message: "Food Removed" });
  } catch (error) {
    res.json({ success: false, message: "Error removing food" });
  }
});

// ── EDIT: accepts both superadmin and restaurant admin (with customizations) 
foodRouter.post("/edit", (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return adminAuth(req, res, next);
  }
  return restaurantAuth(req, res, next);
}, upload.single("image"), async (req, res) => {
  try {
    const { id, name, description, price, category } = req.body;

    if (!id) return res.json({ success: false, message: "Food id is required" });

    const food = await foodModel.findById(id);
    if (!food) return res.json({ success: false, message: "Food not found" });

    if (req.restaurantId && String(food.restaurantId) !== String(req.restaurantId)) {
      return res.status(403).json({ success: false, message: "Not your food item" });
    }

    if (name)        food.name        = name;
    if (description) food.description = description;
    if (price)       food.price       = Number(price);
    if (category)    food.category    = category;

    // ✅ Update customizations if provided
    if (req.body.customizations !== undefined) {
      try {
        food.customizations = JSON.parse(req.body.customizations);
      } catch (e) {
        food.customizations = [];
      }
    }

    // ⚡ Lightning Deal fields
    if (req.body.isFlashDeal !== undefined) {
      food.isFlashDeal = req.body.isFlashDeal === "true";
    }
    if (req.body.salePrice !== undefined) {
      food.salePrice = req.body.salePrice === "" ? null : Number(req.body.salePrice);
    }
    if (req.body.flashDealExpiresAt !== undefined) {
      food.flashDealExpiresAt = req.body.flashDealExpiresAt === "" ? null : new Date(req.body.flashDealExpiresAt);
    }
    if (req.body.flashDealTotalStock !== undefined) {
      food.flashDealTotalStock = req.body.flashDealTotalStock === "" ? null : Number(req.body.flashDealTotalStock);
    }
    
    // 📦 Bundle fields
    if (req.body.isBundle !== undefined) {
      food.isBundle = req.body.isBundle === "true";
    }
    if (req.body.bundledItems !== undefined) {
      try {
        food.bundledItems = JSON.parse(req.body.bundledItems);
      } catch (e) {
        food.bundledItems = [];
      }
    }

    // If deal is being turned off, clear the sale price too
    if (req.body.isFlashDeal === "false") {
      food.salePrice = null;
      food.flashDealExpiresAt = null;
    }

    if (req.file) {
      try { fs.unlinkSync(`uploads/${food.image}`); } catch (e) {}
      food.image = req.file.filename;
    }

    await food.save();
    res.json({ success: true, message: "Food updated", data: food });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Error updating food" });
  }
});

// ── DELETE ALL ITEMS IN A CATEGORY (restaurant admin) ─────────────────────
foodRouter.post("/remove-by-category", (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return adminAuth(req, res, next);
  }
  return restaurantAuth(req, res, next);
}, async (req, res) => {
  try {
    const { category } = req.body;
    if (!category) return res.json({ success: false, message: "Category is required" });

    // Build query: restaurant admins can only delete their own items
    const query = { category };
    if (req.restaurantId) {
      query.restaurantId = req.restaurantId;
    }

    const foods = await foodModel.find(query);
    if (foods.length === 0) {
      return res.json({ success: false, message: "No items found in this category" });
    }

    // Delete image files for each food
    for (const food of foods) {
      try { fs.unlinkSync(`uploads/${food.image}`); } catch (e) {}
    }

    await foodModel.deleteMany(query);

    res.json({ success: true, message: `Deleted ${foods.length} item(s) from "${category}"`, deleted: foods.length });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Error deleting category items" });
  }
});

// ── Customer: rate a food item ─────────────────────────────────────────────
foodRouter.post("/rate", authMiddleware, async (req, res) => {
  try {
    const userId = String(req.body.userId);
    const { foodId, score } = req.body;

    if (!foodId || !score || score < 1 || score > 5)
      return res.json({ success: false, message: "Score must be between 1 and 5." });

    const food = await foodModel.findById(foodId);
    if (!food) return res.json({ success: false, message: "Food not found." });

    // Update or insert rating — use $set to force Mongoose to detect the change
    const existingIndex = food.ratings.findIndex(r => r.userId === userId);
    if (existingIndex >= 0) {
      food.ratings[existingIndex].score = Number(score);
    } else {
      food.ratings.push({ userId, score: Number(score) });
    }

    // Mark modified so Mongoose saves the nested array change
    food.markModified("ratings");

    // Recalculate average
    const total = food.ratings.reduce((sum, r) => sum + r.score, 0);
    food.avgRating = Math.round((total / food.ratings.length) * 10) / 10;
    food.ratingCount = food.ratings.length;
    await food.save();
    console.log("[food/rate] saved rating for food", foodId, "user", userId, "score", score, "avg", food.avgRating);

    res.json({ success: true, avgRating: food.avgRating, ratingCount: food.ratingCount });
  } catch (err) {
    console.error("[food/rate]", err);
    res.json({ success: false, message: "Error submitting rating." });
  }
});

export default foodRouter;