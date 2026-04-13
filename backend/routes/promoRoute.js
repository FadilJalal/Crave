import express from "express";
import mongoose from "mongoose";
import promoModel from "../models/promoModel.js";
import restaurantAuth from "../middleware/restaurantAuth.js";
import authMiddleware from "../middleware/auth.js";
import restaurantModel from "../models/restaurantModel.js";
import foodModel from "../models/foodModel.js";
import { requireFeature } from "../middleware/featureAccess.js";

const promoRouter = express.Router();
const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const normalizeId = (value) => String(value || "").trim();

const serializePromo = (promo) => ({
  ...promo,
  _id: normalizeId(promo?._id),
});

const extractJsonPayload = (content = "") => {
  const trimmed = String(content || "").trim();
  const fenced = trimmed.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in AI response");
  }
  return JSON.parse(fenced.slice(start, end + 1));
};

const normalizePromoSuggestion = (suggestion, index) => {
  const rawCode = String(suggestion?.code || `PROMO${index + 1}`)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 16);

  const type = suggestion?.type === "flat" ? "flat" : "percent";
  const value = Number(suggestion?.value || 0);
  const minOrder = Math.max(0, Number(suggestion?.minOrder || 0));
  const maxUsesValue = suggestion?.maxUses === null || suggestion?.maxUses === undefined || suggestion?.maxUses === ""
    ? null
    : Math.max(1, Number(suggestion.maxUses));
  const expiresInDaysValue = suggestion?.expiresInDays === null || suggestion?.expiresInDays === undefined || suggestion?.expiresInDays === ""
    ? null
    : Math.max(1, Number(suggestion.expiresInDays));

  return {
    title: String(suggestion?.title || `Strategy Idea ${index + 1}`).trim(),
    code: rawCode || `PROMO${index + 1}`,
    type,
    value: type === "percent" ? Math.min(Math.max(5, Math.round(value || 10)), 80) : Math.min(Math.max(5, Math.round(value || 10)), 200),
    minOrder: Math.round(minOrder),
    maxUses: Number.isFinite(maxUsesValue) ? Math.round(maxUsesValue) : null,
    expiresInDays: Number.isFinite(expiresInDaysValue) ? Math.round(expiresInDaysValue) : null,
    reason: String(suggestion?.reason || suggestion?.description || "AI-generated promotion idea.").trim(),
    estimatedImpact: {
       orders: suggestion?.estimatedImpact?.orders || "+15%",
       revenue: suggestion?.estimatedImpact?.revenue || "+10%"
    },
    tags: {
       audience: suggestion?.tags?.audience || "All Customers",
       bestTime: suggestion?.tags?.bestTime || "Weekends"
    }
  };
};

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
promoRouter.get("/list", restaurantAuth, requireFeature("aiPromoGenerator"), async (req, res) => {
  try {
    const promos = await promoModel
      .find({ restaurantId: req.restaurantId })
      .sort({ createdAt: -1 })
      .lean();

    const serialized = promos.map(serializePromo);
    res.json({ success: true, data: serialized, promos: serialized });
  } catch (err) {
    console.error("[promo/list]", err);
    res.json({ success: false, message: "Error fetching promos." });
  }
});

// ── Restaurant admin: generate promo ideas with Groq ───────────────────────
promoRouter.post("/ai-suggest", restaurantAuth, requireFeature("aiPromoGenerator"), async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({ success: false, message: "Groq AI is not configured on the server." });
    }

    const goal = String(req.body?.goal || "").trim();

    const [restaurant, promos, foods] = await Promise.all([
      restaurantModel.findById(req.restaurantId).select("name minimumOrder deliveryTiers").lean(),
      promoModel.find({ restaurantId: req.restaurantId }).select("code type value").lean(),
      foodModel.find({ restaurantId: req.restaurantId }).select("name category price").limit(15).lean(),
    ]);

    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found." });
    }

    const categories = [...new Set((foods || []).map((food) => food.category).filter(Boolean))];
    const avgMenuPrice = foods.length
      ? Math.round((foods.reduce((sum, food) => sum + Number(food.price || 0), 0) / foods.length) * 10) / 10
      : 25;

    const prompt = [
      "You are a restaurant marketing assistant.",
      "Generate exactly 3 practical promo code suggestions for a food delivery restaurant.",
      "Return JSON only with this shape:",
      '{"headline":"...","suggestions":[{"title":"Campaign Name","code":"...","type":"percent|flat","value":20,"minOrder":40,"maxUses":100,"expiresInDays":14,"reason":"...","estimatedImpact":{"orders":"+15%","revenue":"+10%"},"tags":{"audience":"VIP Customers","bestTime":"Weekend Night"}}]}',
      "Rules:",
      "- title must be catchy and relevant to the strategy.",
      "- Code must be uppercase, short, memorable, and DIRECTLY RELEVANT to the campaign goal or strategy.",
      "- Ensure codes are professional, brand-safe, and avoid any gibberish or inappropriate strings.",
      "- Use realistic restaurant promo values.",
      "- estimatedImpact should be a string like '+12%' or '+15%'.",
      "- tags.audience should be likely target (New Users, VIPs, Families).",
      "- tags.bestTime should be optimal window (Lunch, Weekends, Sluggish Mondays).",
      `Restaurant: ${restaurant.name}`,
      `Minimum order: AED ${Number(restaurant.minimumOrder || 0)}`,
      `Average menu price: AED ${avgMenuPrice}`,
      `Menu categories: ${categories.join(", ") || "General fast food"}`,
      `Existing promo codes to avoid: ${promos.map((promo) => promo.code).join(", ") || "none"}`,
      goal ? `Campaign goal from restaurant owner (MUST REFLECT IN CODE): ${goal}` : "Campaign goal: increase conversion and repeat orders this week.",
    ].join("\n");

    const response = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You return valid JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[promo/ai-suggest] Groq error:", errorText);
      return res.status(502).json({ success: false, message: "Groq could not generate promo suggestions right now." });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const parsed = extractJsonPayload(content);
    const suggestions = Array.isArray(parsed?.suggestions)
      ? parsed.suggestions.slice(0, 3).map(normalizePromoSuggestion)
      : [];

    if (!suggestions.length) {
      return res.status(502).json({ success: false, message: "AI returned no usable promo suggestions." });
    }

    res.json({
      success: true,
      data: {
        headline: parsed?.headline || "AI promo ideas",
        suggestions,
      },
    });
  } catch (err) {
    console.error("[promo/ai-suggest]", err);
    res.status(500).json({ success: false, message: "Failed to generate promo ideas." });
  }
});

// ── Restaurant admin: create promo ──────────────────────────────────────────
promoRouter.post("/create", restaurantAuth, requireFeature("aiPromoGenerator"), async (req, res) => {
  try {
    const code = String(req.body?.code || "").toUpperCase().trim();
    const type = req.body?.type === "flat" ? "flat" : req.body?.type === "percent" ? "percent" : "";
    const value = Number(req.body?.value);
    const minOrder = Number(req.body?.minOrder || 0);
    const maxUsesRaw = req.body?.maxUses;
    const expiresAtRaw = req.body?.expiresAt;

    if (!code || !type || !Number.isFinite(value) || value <= 0) {
      return res.json({ success: false, message: "Code, type, and value are required." });
    }

    if (type === "percent" && value > 100) {
      return res.json({ success: false, message: "Percentage promo value cannot exceed 100." });
    }

    if (Number.isFinite(minOrder) && minOrder < 0) {
      return res.json({ success: false, message: "Minimum order cannot be negative." });
    }

    const maxUses = maxUsesRaw === null || maxUsesRaw === undefined || maxUsesRaw === ""
      ? null
      : Number(maxUsesRaw);

    if (maxUses !== null && (!Number.isFinite(maxUses) || maxUses < 1)) {
      return res.json({ success: false, message: "Max uses must be at least 1." });
    }

    const parsedExpiry = expiresAtRaw ? new Date(expiresAtRaw) : null;
    if (parsedExpiry && Number.isNaN(parsedExpiry.getTime())) {
      return res.json({ success: false, message: "Invalid expiry date." });
    }

    const exists = await promoModel.findOne({
      code,
      restaurantId: req.restaurantId,
    });
    if (exists) return res.json({ success: false, message: "You already have a promo with this code." });

    const promo = await promoModel.create({
      restaurantId: req.restaurantId,
      code,
      type,
      value,
      minOrder: Number.isFinite(minOrder) ? minOrder : 0,
      maxUses: maxUses === null ? null : Math.floor(maxUses),
      expiresAt: parsedExpiry || null,
    });
    res.json({ success: true, data: serializePromo(promo.toObject()) });
  } catch (err) {
    console.error("[promo/create]", err);
    res.json({ success: false, message: "Error creating promo code." });
  }
});

// ── Restaurant admin: toggle active ─────────────────────────────────────────
promoRouter.post("/toggle", restaurantAuth, requireFeature("aiPromoGenerator"), async (req, res) => {
  try {
    const promoId = normalizeId(req.body?.id);
    if (!mongoose.Types.ObjectId.isValid(promoId)) {
      return res.json({ success: false, message: "Invalid promo id." });
    }

    const promo = await promoModel.findOne({ _id: promoId, restaurantId: req.restaurantId });
    if (!promo) return res.json({ success: false, message: "Not found." });
    promo.isActive = !promo.isActive;
    await promo.save();
    res.json({ success: true, isActive: promo.isActive });
  } catch (err) {
    res.json({ success: false, message: "Error updating promo." });
  }
});

// ── Restaurant admin: delete promo ───────────────────────────────────────────
promoRouter.delete("/:id", restaurantAuth, requireFeature("aiPromoGenerator"), async (req, res) => {
  try {
    const promoId = normalizeId(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(promoId)) {
      return res.json({ success: false, message: "Invalid promo id." });
    }

    const deleted = await promoModel.findOneAndDelete({ _id: promoId, restaurantId: req.restaurantId });
    if (!deleted) return res.json({ success: false, message: "Promo not found." });
    res.json({ success: true, deletedId: promoId });
  } catch (err) {
    console.error("[promo/delete]", err);
    res.json({ success: false, message: "Error deleting promo." });
  }
});

// Fallback for clients/environments where DELETE requests may be blocked.
promoRouter.post("/delete", restaurantAuth, requireFeature("aiPromoGenerator"), async (req, res) => {
  try {
    const promoId = normalizeId(req.body?.id);
    if (!mongoose.Types.ObjectId.isValid(promoId)) {
      return res.json({ success: false, message: "Invalid promo id." });
    }

    const deleted = await promoModel.findOneAndDelete({ _id: promoId, restaurantId: req.restaurantId });
    if (!deleted) return res.json({ success: false, message: "Promo not found." });

    res.json({ success: true, deletedId: promoId });
  } catch (err) {
    console.error("[promo/delete-fallback]", err);
    res.json({ success: false, message: "Error deleting promo." });
  }
});

export default promoRouter;