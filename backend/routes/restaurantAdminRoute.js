// backend/routes/restaurantAdminRoute.js
import express from "express";
import multer from "multer";
import restaurantAuth from "../middleware/restaurantAuth.js";
import foodModel from "../models/foodModel.js";
import restaurantModel from "../models/restaurantModel.js";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";

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

// ── Update restaurant settings (hours, active status, prepTime) ────────────
router.post("/settings", restaurantAuth, async (req, res) => {
  try {
    const { openingHours, isActive, avgPrepTime, deliveryRadius, address, minimumOrder, deliveryTiers } = req.body;
    const update = {};
    if (openingHours    !== undefined) update.openingHours    = openingHours;
    if (isActive        !== undefined) update.isActive        = isActive;
    if (avgPrepTime     !== undefined) update.avgPrepTime     = Number(avgPrepTime);
    if (deliveryRadius  !== undefined) update.deliveryRadius  = Number(deliveryRadius);
    if (minimumOrder    !== undefined) update.minimumOrder    = Number(minimumOrder);
    if (deliveryTiers   !== undefined) update.deliveryTiers   = deliveryTiers;
    if (address         !== undefined && address.trim()) update.address = address.trim();

    const restaurant = await restaurantModel.findByIdAndUpdate(
      req.restaurantId,
      { $set: update },
      { new: true }
    ).select("-password");

    if (!restaurant) return res.json({ success: false, message: "Restaurant not found" });
    res.json({ success: true, data: restaurant, message: "Settings saved" });
  } catch (e) {
    console.error("Settings update error:", e);
    res.status(500).json({ success: false, message: "Failed to save settings" });
  }
});

// ── Update restaurant location ────────────────────────────────────────────────
router.post("/location", restaurantAuth, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    console.log("[location] restaurantId:", req.restaurantId, "lat:", lat, "lng:", lng);

    if (lat === undefined || lng === undefined) {
      return res.json({ success: false, message: "lat and lng are required" });
    }

    // Reverse-geocode to get a human-readable address
    let addressText = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const nominatimRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { "Accept-Language": "en", "User-Agent": "CraveApp/1.0 (contact@crave.ae)" }, signal: controller.signal }
      );
      clearTimeout(timeout);
      const nominatimData = await nominatimRes.json();
      if (nominatimData && nominatimData.address) {
        const a = nominatimData.address;
        // Build a clean short address: neighbourhood/suburb, city/state
        const parts = [
          a.neighbourhood || a.suburb || a.quarter || a.village || a.road,
          a.city || a.town || a.state_district || a.state,
        ].filter(Boolean);
        if (parts.length) addressText = parts.join(", ");
        else if (nominatimData.display_name) {
          // Fallback: first 2 parts of the full display name
          addressText = nominatimData.display_name.split(",").slice(0, 2).join(",").trim();
        }
      }
    } catch (geoErr) {
      console.warn("[location] reverse-geocode failed:", geoErr.message);
    }

    const updateFields = { "location.lat": Number(lat), "location.lng": Number(lng) };
    if (addressText) updateFields.address = addressText;

    const restaurant = await restaurantModel.findByIdAndUpdate(
      req.restaurantId,
      { $set: updateFields },
      { new: true, runValidators: false }
    ).select("-password");

    if (!restaurant) return res.json({ success: false, message: "Restaurant not found" });
    console.log("[location] saved:", restaurant.location, "address:", restaurant.address);
    res.json({ success: true, data: restaurant, message: "Location updated" });
  } catch (e) {
    console.error("Location update error:", e);
    res.status(500).json({ success: false, message: "Failed to update location" });
  }
});

// ── GET /api/restaurantadmin/customers — all plans ────────────────────────
router.get("/customers", restaurantAuth, async (req, res) => {
  try {
    const orders = await orderModel
      .find({ restaurantId: req.restaurantId })
      .select("userId")
      .lean();

    const uniqueUserIds = [...new Set(orders.map(o => String(o.userId)))];
    const users = await userModel
      .find({ _id: { $in: uniqueUserIds } })
      .select("name email phone")
      .lean();

    res.json({ success: true, count: users.length, customers: users });
  } catch (err) {
    console.error("[customers list]", err);
    res.json({ success: false, message: "Failed to load customers." });
  }
});

// ── GET /api/restaurantadmin/customer/:userId ─────────────────────────────
router.get("/customer/:userId", restaurantAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const restaurantId = req.restaurantId;

    const [user, orders] = await Promise.all([
      userModel.findById(userId).select("name email phone").lean(),
      orderModel.find({ restaurantId, userId }).sort({ createdAt: -1 }).lean(),
    ]);

    if (!user) return res.json({ success: false, message: "Customer not found." });

    const totalSpent    = orders.filter(o => o.status !== "Cancelled").reduce((s, o) => s + (o.amount || 0), 0);
    const orderCount    = orders.filter(o => o.status !== "Cancelled").length;
    const lastOrder     = orders[0] || null;
    const lastAddress   = lastOrder?.address || {};

    res.json({
      success: true,
      data: {
        name:        user.name,
        email:       user.email,
        phone:       user.phone || lastAddress.phone || "",
        address: {
          street:    lastAddress.street    || "",
          building:  lastAddress.building  || "",
          apartment: lastAddress.apartment || "",
          area:      lastAddress.area      || "",
          city:      lastAddress.city      || "",
          country:   lastAddress.country   || "",
        },
        orderCount,
        totalSpent,
        firstOrderDate: orders.length > 0 ? orders[orders.length - 1].createdAt : null,
        lastOrderDate:  lastOrder?.createdAt || null,
      },
    });
  } catch (err) {
    console.error("[customer profile]", err);
    res.json({ success: false, message: "Failed to load customer profile." });
  }
});

export default router;