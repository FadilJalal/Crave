import express from "express";
import authMiddleware from "../middleware/auth.js";
import foodModel from "../models/foodModel.js";
import orderModel from "../models/orderModel.js";
import reviewModel from "../models/reviewModel.js";
import restaurantModel from "../models/restaurantModel.js";
import userModel from "../models/userModel.js";
import { analyzeSentiment, getDietaryTags, estimateCalories, MOOD_MAP } from "../utils/aiHelpers.js";

const router = express.Router();

// ── 1. SMART SEARCH ─────────────────────────────────────────────────────────
router.post("/smart-search", async (req, res) => {
  try {
    const { query, restaurantId } = req.body;
    if (!query) return res.json({ success: false, message: "Query required" });
    const q = query.toLowerCase().trim();
    const filter = { inStock: true };
    if (restaurantId) filter.restaurantId = restaurantId;

    let maxPrice = null, minPrice = null;
    const um = q.match(/under\s+(\d+)|below\s+(\d+)|less\s+than\s+(\d+)|max\s+(\d+)/);
    if (um) maxPrice = Number(um.slice(1).find(Boolean));
    const am = q.match(/above\s+(\d+)|over\s+(\d+)|more\s+than\s+(\d+)|min\s+(\d+)/);
    if (am) minPrice = Number(am.slice(1).find(Boolean));
    const rm = q.match(/(\d+)\s*(?:to|-)\s*(\d+)/);
    if (rm && !um && !am) { minPrice = Number(rm[1]); maxPrice = Number(rm[2]); }
    if (maxPrice) filter.price = { ...filter.price, $lte: maxPrice };
    if (minPrice) filter.price = { ...filter.price, $gte: minPrice };

    const dietaryTerms = [];
    if (/vegan/i.test(q)) dietaryTerms.push("vegan");
    if (/vegetarian|veg\b/i.test(q)) dietaryTerms.push("vegetarian");
    if (/spicy|hot\b/i.test(q)) dietaryTerms.push("spicy");
    if (/healthy|light|diet/i.test(q)) dietaryTerms.push("healthy");
    if (/keto/i.test(q)) dietaryTerms.push("keto");
    if (/gluten.?free/i.test(q)) dietaryTerms.push("glutenFree");

    const cats = ["salad","rolls","deserts","sandwich","cake","pure veg","pasta","noodles","burger","pizza","biryani","grills","seafood","drinks","soup","breakfast","snacks"];
    const matchedCat = cats.find(c => q.includes(c));
    if (matchedCat) filter.category = new RegExp(matchedCat, "i");

    const clean = q.replace(/under\s+\d+|below\s+\d+|less\s+than\s+\d+|above\s+\d+|over\s+\d+|\d+\s*to\s*\d+|aed|cheap|budget|spicy|hot|healthy|vegan|vegetarian|keto|gluten.?free/gi, "").trim();

    let foods = await foodModel.find(filter).populate("restaurantId", "name logo isActive").lean();

    if (clean.length > 1) {
      const sw = clean.split(/\s+/).filter(w => w.length > 1);
      foods = foods.map(f => {
        const t = `${f.name} ${f.description} ${f.category}`.toLowerCase();
        let rel = 0;
        sw.forEach(s => { if (t.includes(s)) rel += 2; });
        if (f.name.toLowerCase().includes(clean)) rel += 5;
        return { ...f, relevance: rel };
      }).filter(f => f.relevance > 0).sort((a, b) => b.relevance - a.relevance);
    }

    if (dietaryTerms.length > 0) {
      foods = foods.filter(f => {
        const tags = getDietaryTags(f.name, f.description, f.category);
        return dietaryTerms.some(d => tags.includes(d));
      });
    }

    const results = foods.slice(0, 20).map(f => ({
      ...f, dietaryTags: getDietaryTags(f.name, f.description, f.category),
      calories: estimateCalories(f.name, f.description, f.category, f.price),
    }));

    res.json({ success: true, data: results, count: results.length, parsed: { maxPrice, minPrice, category: matchedCat, dietary: dietaryTerms } });
  } catch (e) {
    console.error("[ai/smart-search]", e);
    res.json({ success: false, message: "Search failed" });
  }
});

// ── 2. SENTIMENT ANALYSIS ───────────────────────────────────────────────────
router.get("/sentiment/:restaurantId", async (req, res) => {
  try {
    const reviews = await reviewModel.find({ restaurantId: req.params.restaurantId }).lean();
    if (!reviews.length) return res.json({ success: true, data: { overall: "neutral", score: 0, total: 0, breakdown: { positive: 0, neutral: 0, negative: 0 }, keywords: { positive: [], negative: [] }, reviews: [] } });

    let totalScore = 0;
    const allPos = {}, allNeg = {};
    const bd = { positive: 0, neutral: 0, negative: 0 };

    const analyzed = reviews.map(r => {
      const s = analyzeSentiment(r.comment);
      totalScore += s.score;
      bd[s.label]++;
      s.positive.forEach(w => { allPos[w] = (allPos[w] || 0) + 1; });
      s.negative.forEach(w => { allNeg[w] = (allNeg[w] || 0) + 1; });
      return { ...r, sentiment: s };
    });

    const avg = totalScore / reviews.length;
    const topPos = Object.entries(allPos).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word, count]) => ({ word, count }));
    const topNeg = Object.entries(allNeg).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word, count]) => ({ word, count }));

    res.json({ success: true, data: { overall: avg > 0.5 ? "positive" : avg < -0.5 ? "negative" : "neutral", score: Math.round(avg * 100) / 100, total: reviews.length, breakdown: bd, keywords: { positive: topPos, negative: topNeg }, reviews: analyzed.slice(0, 30) } });
  } catch (e) {
    console.error("[ai/sentiment]", e);
    res.json({ success: false, message: "Sentiment analysis failed" });
  }
});

// ── 3. REORDER NUDGE ────────────────────────────────────────────────────────
router.post("/reorder-nudge", authMiddleware, async (req, res) => {
  try {
    const userId = req.body.userId;
    const orders = await orderModel.find({ userId, payment: true }).sort({ createdAt: -1 }).limit(20).lean();
    if (orders.length < 2) return res.json({ success: true, data: { shouldNudge: false } });

    const gaps = [];
    for (let i = 0; i < Math.min(orders.length - 1, 10); i++) {
      gaps.push((new Date(orders[i].createdAt) - new Date(orders[i + 1].createdAt)) / 864e5);
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const daysSince = (Date.now() - new Date(orders[0].createdAt)) / 864e5;
    const shouldNudge = daysSince >= avgGap * 0.8;

    const itemCounts = {};
    orders.forEach(o => (o.items || []).forEach(it => {
      const k = it.name || it._id;
      if (!itemCounts[k]) itemCounts[k] = { name: it.name, count: 0 };
      itemCounts[k].count++;
    }));
    const favorites = Object.values(itemCounts).sort((a, b) => b.count - a.count).slice(0, 3);

    const restCounts = {};
    orders.forEach(o => { if (o.restaurantId) restCounts[String(o.restaurantId)] = (restCounts[String(o.restaurantId)] || 0) + 1; });
    const topRestId = Object.entries(restCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topRest = topRestId ? await restaurantModel.findById(topRestId).select("name logo").lean() : null;

    res.json({ success: true, data: { shouldNudge, daysSinceLast: Math.round(daysSince * 10) / 10, avgOrderGap: Math.round(avgGap * 10) / 10, message: shouldNudge ? `It's been ${Math.round(daysSince)} days! You usually order every ${Math.round(avgGap)} days.` : `Next craving in ~${Math.max(1, Math.round(avgGap - daysSince))} days!`, favorites, topRestaurant: topRest, totalOrders: orders.length } });
  } catch (e) {
    console.error("[ai/reorder]", e);
    res.json({ success: false, message: "Failed" });
  }
});

// ── 4. SURGE DETECTION ──────────────────────────────────────────────────────
router.get("/surge/:restaurantId", async (req, res) => {
  try {
    const now = new Date();
    const hr = now.getHours();
    const ago = new Date(now - 30 * 864e5);
    const orders = await orderModel.find({ restaurantId: req.params.restaurantId, createdAt: { $gte: ago } }).select("createdAt").lean();

    const hourCounts = Array(24).fill(0);
    const dayCounts = Array(7).fill(0);
    orders.forEach(o => { const d = new Date(o.createdAt); hourCounts[d.getHours()]++; dayCounts[d.getDay()]++; });

    const avgH = orders.length / (30 * 24);
    const curH = hourCounts[hr] / 30;
    const mult = avgH > 0 ? curH / avgH : 1;

    let level = "normal";
    if (mult > 2) level = "high";
    else if (mult > 1.3) level = "moderate";
    else if (mult < 0.5) level = "low";

    const peakHours = hourCounts.map((c, h) => ({ hour: h, count: c })).sort((a, b) => b.count - a.count).slice(0, 3);
    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

    res.json({ success: true, data: { surgeLevel: level, surgeMultiplier: Math.round(mult * 100) / 100, message: level === "high" ? "🔥 Very busy! Expect longer wait." : level === "moderate" ? "⚡ Moderately busy." : level === "low" ? "😌 Quiet — fast delivery!" : "Normal activity.", peakHours, busiestDay: dayNames[dayCounts.indexOf(Math.max(...dayCounts))] } });
  } catch (e) {
    console.error("[ai/surge]", e);
    res.json({ success: false, message: "Surge detection failed" });
  }
});

// ── 5. ETA PREDICTION ───────────────────────────────────────────────────────
router.post("/eta", async (req, res) => {
  try {
    const { restaurantId, userLat, userLng } = req.body;
    const rest = await restaurantModel.findById(restaurantId).select("avgPrepTime location").lean();
    if (!rest) return res.json({ success: false, message: "Restaurant not found" });

    const prep = rest.avgPrepTime || 15;
    let dist = 5;
    if (userLat && userLng && rest.location?.lat && rest.location?.lng) {
      const R = 6371, dLat = (userLat - rest.location.lat) * Math.PI / 180, dLng = (userLng - rest.location.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(rest.location.lat * Math.PI / 180) * Math.cos(userLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    const travel = Math.round((dist / 25) * 60);

    let histAdj = 0;
    const delivered = await orderModel.find({ restaurantId, status: "Delivered" }).select("createdAt updatedAt").sort({ createdAt: -1 }).limit(50).lean();
    if (delivered.length >= 5) {
      const durations = delivered.map(o => (new Date(o.updatedAt) - new Date(o.createdAt)) / 60000);
      const avgActual = durations.reduce((a, b) => a + b, 0) / durations.length;
      histAdj = Math.round(avgActual - (prep + travel));
    }

    const hr = new Date().getHours();
    const peakAdj = ((hr >= 12 && hr <= 14) || (hr >= 19 && hr <= 21)) ? 5 : 0;
    const total = Math.max(10, prep + travel + Math.max(0, histAdj) + peakAdj);

    res.json({ success: true, data: { estimatedMinutes: total, breakdown: { prepTime: prep, travelMins: travel, historicalAdj: Math.max(0, histAdj), peakAdj }, distanceKm: Math.round(dist * 10) / 10, confidence: delivered.length >= 10 ? "high" : delivered.length >= 5 ? "medium" : "low", label: total <= 20 ? "⚡ Express" : total <= 35 ? "🚴 Standard" : total <= 50 ? "🕐 Busy" : "🐢 Long wait" } });
  } catch (e) {
    console.error("[ai/eta]", e);
    res.json({ success: false, message: "ETA failed" });
  }
});

// ── 6. MOOD RECOMMENDATIONS ─────────────────────────────────────────────────
router.post("/mood", async (req, res) => {
  try {
    const { mood, restaurantId } = req.body;
    if (!mood || !MOOD_MAP[mood]) {
      return res.json({ success: true, moods: Object.entries(MOOD_MAP).map(([k, v]) => ({ key: k, emoji: v.emoji, label: v.label })) });
    }
    const cfg = MOOD_MAP[mood];
    const filter = {};
    if (restaurantId) filter.restaurantId = restaurantId;

    const allFoods = await foodModel.find(filter).populate("restaurantId", "name logo isActive").lean();
    const scored = allFoods.map(f => {
      let s = 0;
      if (cfg.categories.some(c => f.category?.toLowerCase().includes(c))) s += 3;
      if (cfg.keywords.test(`${f.name} ${f.description}`)) s += 2;
      if (mood === "budget" && f.price <= 25) s += 2;
      else if (mood === "celebrating" && f.price >= 40) s += 1;
      return { ...f, moodScore: s };
    }).filter(f => f.moodScore > 0).sort((a, b) => b.moodScore - a.moodScore);

    const results = scored.slice(0, 12).map(f => ({
      ...f, dietaryTags: getDietaryTags(f.name, f.description, f.category),
      calories: estimateCalories(f.name, f.description, f.category, f.price),
    }));

    res.json({ success: true, mood: { key: mood, ...cfg, keywords: undefined }, data: results, count: results.length });
  } catch (e) {
    console.error("[ai/mood]", e);
    res.json({ success: false, message: "Mood recs failed" });
  }
});

// ── 7. CART UPSELL ──────────────────────────────────────────────────────────
router.post("/upsell", async (req, res) => {
  try {
    const { cartItemIds = [], restaurantId } = req.body;
    if (!cartItemIds.length) return res.json({ success: true, data: [] });

    const orders = await orderModel.find({ restaurantId, payment: true, "items._id": { $in: cartItemIds } }).lean();
    const cartSet = new Set(cartItemIds.map(String));
    const co = {};
    orders.forEach(o => (o.items || []).forEach(it => {
      const id = String(it._id);
      if (!cartSet.has(id)) {
        if (!co[id]) co[id] = { id, name: it.name, price: it.price, count: 0 };
        co[id].count++;
      }
    }));

    const top = Object.values(co).sort((a, b) => b.count - a.count).slice(0, 4);
    const foods = await foodModel.find({ _id: { $in: top.map(t => t.id) } }).populate("restaurantId", "name logo").lean();
    const enriched = top.map(t => { const f = foods.find(fd => String(fd._id) === t.id); return f ? { ...f, coOrderCount: t.count, reason: `Ordered together ${t.count} times` } : null; }).filter(Boolean);

    res.json({ success: true, data: enriched });
  } catch (e) {
    console.error("[ai/upsell]", e);
    res.json({ success: true, data: [] });
  }
});

// ── 8. DIETARY TAGS BULK ────────────────────────────────────────────────────
router.get("/dietary-bulk/:restaurantId", async (req, res) => {
  try {
    const foods = await foodModel.find({ restaurantId: req.params.restaurantId }).lean();
    const data = foods.map(f => ({ _id: f._id, name: f.name, dietaryTags: getDietaryTags(f.name, f.description, f.category), calories: estimateCalories(f.name, f.description, f.category, f.price) }));
    res.json({ success: true, data });
  } catch (e) {
    res.json({ success: false, message: "Failed" });
  }
});

export default router;
