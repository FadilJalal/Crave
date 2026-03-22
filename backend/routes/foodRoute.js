// backend/routes/foodRoute.js
import express from "express";
import multer from "multer";
import adminAuth from "../middleware/adminAuth.js";
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
    const foods = await foodModel
      .find({})
      .populate("restaurantId", "name logo isActive openingHours location deliveryRadius");
    res.json({ success: true, data: foods });
  } catch (error) {
    res.json({ success: false, message: "Error listing foods" });
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

export default foodRouter;