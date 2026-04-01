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

// ── Update restaurant settings ────────────────────────────────────────────
router.post("/settings", restaurantAuth, async (req, res) => {
  try {
    const { openingHours, isActive, avgPrepTime, deliveryRadius, address, minimumOrder, deliveryTiers } = req.body;
    const update = {};
    if (openingHours   !== undefined) update.openingHours   = openingHours;
    if (isActive       !== undefined) update.isActive       = isActive;
    if (avgPrepTime    !== undefined) update.avgPrepTime    = Number(avgPrepTime);
    if (deliveryRadius !== undefined) update.deliveryRadius = Number(deliveryRadius);
    if (minimumOrder   !== undefined) update.minimumOrder   = Number(minimumOrder);
    if (deliveryTiers  !== undefined) update.deliveryTiers  = deliveryTiers;
    if (address        !== undefined && address.trim()) update.address = address.trim();

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

// ── Update restaurant logo ─────────────────────────────────────────────────
router.post("/logo", restaurantAuth, upload.single("logo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Logo image is required" });
    }

    const restaurant = await restaurantModel.findByIdAndUpdate(
      req.restaurantId,
      { $set: { logo: req.file.filename } },
      { new: true }
    ).select("-password");

    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    res.json({ success: true, data: restaurant, message: "Logo updated" });
  } catch (e) {
    console.error("Logo update error:", e);
    res.status(500).json({ success: false, message: "Failed to update logo" });
  }
});

// ── Update restaurant location ────────────────────────────────────────────
router.post("/location", restaurantAuth, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.json({ success: false, message: "lat and lng are required" });
    }

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
        const parts = [
          a.neighbourhood || a.suburb || a.quarter || a.village || a.road,
          a.city || a.town || a.state_district || a.state,
        ].filter(Boolean);
        if (parts.length) addressText = parts.join(", ");
        else if (nominatimData.display_name) {
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
    res.json({ success: true, data: restaurant, message: "Location updated" });
  } catch (e) {
    console.error("Location update error:", e);
    res.status(500).json({ success: false, message: "Failed to update location" });
  }
});

// ── GET /api/restaurantadmin/customers ────────────────────────────────────
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

    const totalSpent  = orders.filter(o => o.status !== "Cancelled").reduce((s, o) => s + (o.amount || 0), 0);
    const orderCount  = orders.filter(o => o.status !== "Cancelled").length;
    const lastOrder   = orders[0] || null;
    const lastAddress = lastOrder?.address || {};

    res.json({
      success: true,
      data: {
        name:     user.name,
        email:    user.email,
        phone:    user.phone || lastAddress.phone || "",
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

// ── GET /api/restaurantadmin/analytics ───────────────────────────────────
router.get("/analytics", restaurantAuth, async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const now = new Date();

    const allOrders = await orderModel
      .find({ restaurantId, status: { $ne: "Cancelled" } })
      .lean();

    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const revenueByDay = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      revenueByDay[d.toISOString().slice(0, 10)] = 0;
    }
    allOrders.forEach(o => {
      const d = new Date(o.createdAt);
      if (d >= thirtyDaysAgo) {
        const key = d.toISOString().slice(0, 10);
        if (key in revenueByDay) revenueByDay[key] += o.amount || 0;
      }
    });
    const revenueChart = Object.entries(revenueByDay).map(([date, revenue]) => ({ date, revenue }));

    const hourBuckets = Array(24).fill(0);
    allOrders.forEach(o => { hourBuckets[new Date(o.createdAt).getHours()]++; });
    const peakHours = hourBuckets.map((count, hour) => ({ hour, count }));

    const itemMap = {};
    allOrders.forEach(o => {
      (o.items || []).forEach(item => {
        if (!itemMap[item.name]) itemMap[item.name] = { name: item.name, qty: 0, revenue: 0 };
        itemMap[item.name].qty += item.quantity || 1;
        itemMap[item.name].revenue += (item.price || 0) * (item.quantity || 1);
      });
    });
    const bestSellers = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 8);

    const deliveredOrders = await orderModel
      .find({ restaurantId, status: "Delivered" })
      .select("createdAt updatedAt")
      .lean();
    let avgDeliveryMins = null;
    if (deliveredOrders.length > 0) {
      const totalMins = deliveredOrders.reduce((sum, o) => sum + (new Date(o.updatedAt) - new Date(o.createdAt)) / 60000, 0);
      avgDeliveryMins = Math.round(totalMins / deliveredOrders.length);
    }

    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
    const thisWeekOrders = allOrders.filter(o => new Date(o.createdAt) >= weekAgo);
    const lastWeekOrders = allOrders.filter(o => new Date(o.createdAt) >= twoWeeksAgo && new Date(o.createdAt) < weekAgo);
    const thisWeekRevenue = thisWeekOrders.reduce((s, o) => s + (o.amount || 0), 0);
    const lastWeekRevenue = lastWeekOrders.reduce((s, o) => s + (o.amount || 0), 0);
    const revenueGrowth = lastWeekRevenue > 0
      ? Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100)
      : null;

    const todayStr = now.toDateString();
    const todayOrders = allOrders.filter(o => new Date(o.createdAt).toDateString() === todayStr);
    const todayRevenue = todayOrders.reduce((s, o) => s + (o.amount || 0), 0);
    const totalRevenue = allOrders.reduce((s, o) => s + (o.amount || 0), 0);

    res.json({
      success: true,
      data: {
        revenueChart, peakHours, bestSellers, avgDeliveryMins,
        thisWeekRevenue, lastWeekRevenue, revenueGrowth,
        todayRevenue, todayOrders: todayOrders.length,
        totalOrders: allOrders.length, totalRevenue,
      },
    });
  } catch (err) {
    console.error("[analytics]", err);
    res.json({ success: false, message: "Error loading analytics." });
  }
});

// ── POST /api/restaurantadmin/re-engagement ───────────────────────────────
router.post("/re-engagement", restaurantAuth, async (req, res) => {
  try {
    const { daysSince = 7, subject, heading, body, ctaText, ctaUrl, promoCode } = req.body;

    const restaurant = await restaurantModel.findById(req.restaurantId).select("name subscription");
    if (!restaurant) return res.json({ success: false, message: "Restaurant not found." });
    if (restaurant.subscription?.plan !== "pro" || restaurant.subscription?.status !== "active") {
      return res.json({ success: false, message: "Re-engagement emails are a Pro feature." });
    }

    const cutoff = new Date(Date.now() - daysSince * 24 * 60 * 60 * 1000);
    const allOrders = await orderModel.find({ restaurantId: req.restaurantId }).select("userId createdAt").lean();

    const latestByUser = {};
    allOrders.forEach(o => {
      const uid = String(o.userId);
      if (!latestByUser[uid] || new Date(o.createdAt) > new Date(latestByUser[uid])) {
        latestByUser[uid] = o.createdAt;
      }
    });

    const lapsedUserIds = Object.entries(latestByUser)
      .filter(([, lastDate]) => new Date(lastDate) < cutoff)
      .map(([uid]) => uid);

    if (lapsedUserIds.length === 0) {
      return res.json({ success: true, sent: 0, message: "No lapsed customers found." });
    }

    const users = await userModel.find({ _id: { $in: lapsedUserIds } }).select("name email").lean();

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";

    let sent = 0, failed = 0;
    for (const user of users) {
      if (!user.email) { failed++; continue; }
      const personalBody = `Hi ${user.name},\n\n${body}${promoCode ? `\n\nUse code: ${promoCode}` : ""}`;
      const html = `<!DOCTYPE html>
<html><body style="font-family:Inter,Arial,sans-serif;background:#f9fafb;margin:0;padding:40px 20px;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#ff4e2a;padding:28px 32px;">
    <p style="color:rgba(255,255,255,0.8);margin:0 0 4px;font-size:13px;">${restaurant.name}</p>
    <h1 style="color:white;margin:0;font-size:24px;font-weight:900;">${heading}</h1>
  </div>
  <div style="padding:32px;">
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;white-space:pre-line;">${personalBody}</p>
    ${ctaText && ctaUrl ? `<a href="${ctaUrl}" style="display:inline-block;background:#ff4e2a;color:white;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:800;font-size:15px;">${ctaText}</a>` : ""}
    ${promoCode ? `<div style="margin-top:20px;padding:16px;background:#fff7ed;border-radius:12px;border:2px dashed #f97316;text-align:center;"><span style="font-size:20px;font-weight:900;letter-spacing:2px;color:#ea580c;">${promoCode}</span><p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Use this code at checkout</p></div>` : ""}
  </div>
  <div style="padding:20px 32px;border-top:1px solid #f3f4f6;background:#fafafa;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">You're receiving this because you ordered from ${restaurant.name} on Crave.</p>
  </div>
</div></body></html>`;

      try {
        await resend.emails.send({ from: fromEmail, to: user.email, subject, html });
        sent++;
      } catch { failed++; }
    }

    res.json({ success: true, sent, failed, total: users.length, message: `Sent to ${sent} lapsed customers.` });
  } catch (err) {
    console.error("[re-engagement]", err);
    res.json({ success: false, message: "Error sending re-engagement emails." });
  }
});

// ── POST /api/restaurantadmin/update-delivery-time ────────────────────────
router.post("/update-delivery-time", restaurantAuth, async (req, res) => {
  try {
    const deliveredOrders = await orderModel
      .find({ restaurantId: req.restaurantId, status: "Delivered" })
      .select("createdAt updatedAt")
      .lean();

    if (deliveredOrders.length < 3) {
      return res.json({ success: false, message: "Not enough delivered orders yet (need at least 3)." });
    }

    const totalMins = deliveredOrders.reduce((sum, o) => {
      return sum + (new Date(o.updatedAt) - new Date(o.createdAt)) / 60000;
    }, 0);
    const avgMins = Math.round(totalMins / deliveredOrders.length);
    const capped = Math.max(10, Math.min(avgMins, 120));

    await restaurantModel.findByIdAndUpdate(req.restaurantId, { avgPrepTime: capped });

    res.json({ success: true, avgPrepTime: capped, basedOn: deliveredOrders.length, message: `Avg delivery time updated to ${capped} min.` });
  } catch (err) {
    console.error("[update-delivery-time]", err);
    res.json({ success: false, message: "Error updating delivery time." });
  }
});

// ── POST /api/restaurantadmin/food/stock — toggle in/out of stock ─────────
router.post("/food/stock", restaurantAuth, async (req, res) => {
  try {
    const { foodId, inStock } = req.body;
    if (!foodId || inStock === undefined) {
      return res.json({ success: false, message: "foodId and inStock required." });
    }

    const food = await foodModel.findById(foodId);
    if (!food) return res.json({ success: false, message: "Food not found." });

    if (String(food.restaurantId) !== String(req.restaurantId)) {
      return res.status(403).json({ success: false, message: "Not your item." });
    }

    food.inStock = Boolean(inStock);
    await food.save();

    res.json({ success: true, inStock: food.inStock, message: `Item marked as ${food.inStock ? "in stock" : "out of stock"}.` });
  } catch (err) {
    console.error("[food/stock]", err);
    res.json({ success: false, message: "Error updating stock." });
  }
});

export default router;