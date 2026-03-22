import express from "express";
import promoModel from "../models/promoModel.js";
import restaurantAuth from "../middleware/restaurantAuth.js";
import authMiddleware from "../middleware/auth.js";

const promoRouter = express.Router();

// ── Customer: validate a promo code ────────────────────────────────────────
// Needs restaurantId so we only match promos belonging to that restaurant
promoRouter.post("/validate", authMiddleware, async (req, res) => {
  try {
    const { code, subtotal, restaurantId } = req.body;
    const userId = req.body.userId;

    if (!code) return res.json({ success: false, message: "Please enter a promo code." });
    if (!restaurantId) return res.json({ success: false, message: "Restaurant info missing." });

    const promo = await promoModel.findOne({
      code: code.toUpperCase().trim(),
      restaurantId,
    });

    if (!promo || !promo.isActive)
      return res.json({ success: false, message: "Invalid promo code." });

    if (promo.expiresAt && new Date() > promo.expiresAt)
      return res.json({ success: false, message: "This promo code has expired." });

    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses)
      return res.json({ success: false, message: "This promo code has reached its usage limit." });

    if (promo.usedBy.includes(String(userId)))
      return res.json({ success: false, message: "You have already used this promo code." });

    if (subtotal < promo.minOrder)
      return res.json({
        success: false,
        message: `Minimum order of AED ${promo.minOrder} required for this code.`,
      });

    const discount = promo.type === "percent"
      ? Math.min((subtotal * promo.value) / 100, subtotal)
      : Math.min(promo.value, subtotal);

    res.json({
      success: true,
      discount: Math.round(discount * 100) / 100,
      type: promo.type,
      value: promo.value,
      message: promo.type === "percent"
        ? `${promo.value}% off applied!`
        : `AED ${promo.value} off applied!`,
    });
  } catch (err) {
    console.error("[promo/validate]", err);
    res.json({ success: false, message: "Error validating promo code." });
  }
});

// ── Customer: mark promo as used after successful order ─────────────────────
promoRouter.post("/use", authMiddleware, async (req, res) => {
  try {
    const { code, restaurantId } = req.body;
    const userId = req.body.userId;
    await promoModel.findOneAndUpdate(
      { code: code.toUpperCase().trim(), restaurantId },
      { $inc: { usedCount: 1 }, $addToSet: { usedBy: String(userId) } }
    );
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

// ── Public: list active promos for a restaurant (shown in cart) ────────────
promoRouter.get("/public/:restaurantId", async (req, res) => {
  try {
    const now = new Date();
    const promos = await promoModel.find({
      restaurantId: req.params.restaurantId,
      isActive: true,
      $and: [
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
        { $or: [{ maxUses: null }, { $expr: { $lt: ["$usedCount", "$maxUses"] } }] },
      ],
    }).select("code type value minOrder").sort({ value: -1 });
    res.json({ success: true, data: promos });
  } catch (err) {
    console.error("[promo/public]", err);
    res.json({ success: false, data: [] });
  }
});

// ── Restaurant admin: list own promos ───────────────────────────────────────
promoRouter.get("/list", restaurantAuth, async (req, res) => {
  try {
    const promos = await promoModel.find({ restaurantId: req.restaurantId }).sort({ createdAt: -1 });
    res.json({ success: true, data: promos });
  } catch (err) {
    res.json({ success: false, message: "Error fetching promos." });
  }
});

// ── Restaurant admin: create promo ──────────────────────────────────────────
promoRouter.post("/create", restaurantAuth, async (req, res) => {
  try {
    const { code, type, value, minOrder, maxUses, expiresAt } = req.body;
    if (!code || !type || !value)
      return res.json({ success: false, message: "Code, type, and value are required." });

    const exists = await promoModel.findOne({
      code: code.toUpperCase().trim(),
      restaurantId: req.restaurantId,
    });
    if (exists) return res.json({ success: false, message: "You already have a promo with this code." });

    const promo = await promoModel.create({
      restaurantId: req.restaurantId,
      code: code.toUpperCase().trim(),
      type,
      value: Number(value),
      minOrder: Number(minOrder) || 0,
      maxUses: maxUses ? Number(maxUses) : null,
      expiresAt: expiresAt || null,
    });
    res.json({ success: true, data: promo });
  } catch (err) {
    res.json({ success: false, message: "Error creating promo code." });
  }
});

// ── Restaurant admin: toggle active ─────────────────────────────────────────
promoRouter.post("/toggle", restaurantAuth, async (req, res) => {
  try {
    const promo = await promoModel.findOne({ _id: req.body.id, restaurantId: req.restaurantId });
    if (!promo) return res.json({ success: false, message: "Not found." });
    promo.isActive = !promo.isActive;
    await promo.save();
    res.json({ success: true, isActive: promo.isActive });
  } catch (err) {
    res.json({ success: false, message: "Error updating promo." });
  }
});

// ── Restaurant admin: delete promo ───────────────────────────────────────────
promoRouter.delete("/:id", restaurantAuth, async (req, res) => {
  try {
    await promoModel.findOneAndDelete({ _id: req.params.id, restaurantId: req.restaurantId });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: "Error deleting promo." });
  }
});

export default promoRouter;