// backend/routes/restaurantAdminRoute.js
import express from "express";
import multer from "multer";
import restaurantAuth from "../middleware/restaurantAuth.js";
import foodModel from "../models/foodModel.js";
import restaurantModel from "../models/restaurantModel.js";

const router = express.Router();

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

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ── Get own restaurant profile ─────────────────────────────────────────────
router.get("/me", restaurantAuth, async (req, res) => {
  try {
    const restaurant = await restaurantModel.findById(req.restaurantId).select("-password");
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }
    res.json({ success: true, data: restaurant });
  } catch (e) {
    console.error("Error fetching restaurant profile:", e);
    res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
});

// ── List own foods ─────────────────────────────────────────────────────────
router.get("/foods", restaurantAuth, async (req, res) => {
  try {
    const foods = await foodModel
      .find({ restaurantId: req.restaurantId })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: foods });
  } catch (e) {
    console.error("Error loading foods:", e);
    res.status(500).json({ success: false, message: "Failed to load foods" });
  }
});

// ── Add food (with customizations) ────────────────────────────────────────
router.post("/food/add", restaurantAuth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image is required" });
    }
    if (!req.body.name || !req.body.price || !req.body.category || !req.body.description) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Parse customizations if sent
    let customizations = [];
    if (req.body.customizations) {
      try {
        customizations = JSON.parse(req.body.customizations);
      } catch (e) {
        customizations = [];
      }
    }

    const food = new foodModel({
      name: req.body.name,
      description: req.body.description,
      price: Number(req.body.price),
      image: req.file.filename,
      category: req.body.category,
      restaurantId: req.restaurantId,
      customizations,
    });

    await food.save();
    res.json({ success: true, message: "Food added" });
  } catch (e) {
    console.error("Error adding food:", e);
    res.status(500).json({ success: false, message: "Failed to add food" });
  }
});

export default router;