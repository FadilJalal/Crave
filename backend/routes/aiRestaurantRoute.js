import express from "express";
import { Resend } from "resend";
import restaurantAuth from "../middleware/restaurantAuth.js";
import foodModel from "../models/foodModel.js";
import orderModel from "../models/orderModel.js";
import reviewModel from "../models/reviewModel.js";
import userModel from "../models/userModel.js";
import restaurantModel from "../models/restaurantModel.js";
import campaignModel from "../models/campaignModel.js";
import { requireFeature } from "../middleware/featureAccess.js";

const router = express.Router();
const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const SEGMENT_EMOJI = {
  VIP: "👑",
  Loyal: "💎",
  Regular: "👤",
  "At Risk": "⚠️",
  Lost: "💔",
  New: "🌟",
};

const SAFE_FALLBACK_DESCRIPTIONS = {
  VIP: "High value repeat customers with strong purchase history.",
  Loyal: "Frequent active customers likely to respond to rewards.",
  Regular: "Steady customers with moderate ordering behavior.",
  "At Risk": "Previously active customers showing declining engagement.",
  Lost: "Inactive customers with long gaps since their last order.",
  New: "Recently acquired customers with limited order history.",
};

async function ensureEnterpriseSubscription(restaurantId) {
  const restaurant = await restaurantModel
    .findById(restaurantId)
    .select("subscription name")
    .lean();

  if (!restaurant) {
    return { ok: false, message: "Restaurant not found." };
  }

  const plan = String(restaurant.subscription?.plan || "").toLowerCase();
  const status = String(restaurant.subscription?.status || "").toLowerCase();

  if (plan !== "enterprise" || status !== "active") {
    return {
      ok: false,
      message: "Campaign Playbook is available only on active Enterprise subscription.",
      restaurant,
    };
  }

  return { ok: true, restaurant };
}

function csvCell(value) {
  const raw = value == null ? "" : String(value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

function segmentTypeFromUserStats({ orders, spending, daysSinceLast, daysActive }) {
  if (orders >= 20 && spending > 500) return "VIP";
  if (orders >= 10 && daysSinceLast < 30) return "Loyal";
  if (daysSinceLast > 90) return "Lost";
  if (orders === 1 && daysSinceLast < 7) return "New";
  if (daysSinceLast > 60 && daysActive > 30) return "At Risk";
  return "Regular";
}

function parseFirstJsonObject(rawText = "") {
  if (!rawText || typeof rawText !== "string") return null;
  const fenced = rawText.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || rawText;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

async function getGroqSegmentInsights({ segmentStats, metrics }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { aiUsed: false, descriptions: {}, actions: [], notes: [] };

  const compactStats = segmentStats.map((s) => ({
    type: s.type,
    count: s.count,
    percentage: s.percentage,
    avgSpent: s.avgSpent,
    avgOrders: s.avgOrders,
  }));

  const prompt = {
    summary: {
      totalCustomers: metrics.totalCustomers,
      totalRevenue: metrics.totalRevenue,
      avgOrderValue: metrics.avgOrderValue,
      retentionRate: metrics.retentionRate,
    },
    segments: compactStats,
    task: "For each segment, provide one concise actionable description for restaurant operators and a campaign action list.",
    outputSchema: {
      descriptions: {
        VIP: "string",
        Loyal: "string",
        Regular: "string",
        "At Risk": "string",
        Lost: "string",
        New: "string",
      },
      actions: ["string"],
      notes: ["string"],
    },
  };

  const resp = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.2,
      max_tokens: 650,
      messages: [
        {
          role: "system",
          content:
            "You are a restaurant growth analyst. Return only valid JSON, no markdown, no extra text.",
        },
        {
          role: "user",
          content: JSON.stringify(prompt),
        },
      ],
    }),
  });

  if (!resp.ok) {
    throw new Error(`Groq failed (${resp.status})`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content || "";
  const parsed = parseFirstJsonObject(content);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Groq returned invalid JSON payload");
  }

  return {
    aiUsed: true,
    descriptions: parsed.descriptions || {},
    actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 6) : [],
    notes: Array.isArray(parsed.notes) ? parsed.notes.slice(0, 6) : [],
  };
}

async function generateGroqCampaignScript({ restaurantName, segmentType, supportersOnly }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      aiUsed: false,
      script: supportersOnly
        ? `Hi! As one of our top ${segmentType} supporters at ${restaurantName}, enjoy an exclusive offer this week. Use code VIP20 and treat yourself today.`
        : `Hi! Special offer for our ${segmentType} customers at ${restaurantName}. Enjoy this limited-time deal and order now.`,
    };
  }

  const prompt = {
    task: "Write one short marketing message for an email campaign.",
    constraints: {
      language: "English",
      maxChars: 280,
      plainTextOnly: true,
      includeEmoji: true,
      includeUrgency: true,
      includeClearCTA: true,
      noMarkdown: true,
      noQuotes: true,
    },
    context: {
      restaurantName,
      segmentType,
      audience: supportersOnly ? "Top supporters in this segment" : "All customers in this segment",
      tone: "Friendly, premium, action-oriented",
    },
  };

  const resp = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.7,
      max_tokens: 180,
      messages: [
        {
          role: "system",
          content:
            "You are a restaurant campaign copywriter. Return only the final message as plain text, no preface, no markdown.",
        },
        {
          role: "user",
          content: JSON.stringify(prompt),
        },
      ],
    }),
  });

  if (!resp.ok) {
    throw new Error(`Groq failed (${resp.status})`);
  }

  const data = await resp.json();
  const content = String(data?.choices?.[0]?.message?.content || "").trim();
  if (!content) {
    throw new Error("Groq returned empty script");
  }

  return { aiUsed: true, script: content.slice(0, 600) };
}

// ── 9. SALES FORECAST ───────────────────────────────────────────────────────
router.get("/forecast", restaurantAuth, requireFeature("aiInsights"), async (req, res) => {
  try {
    const orders = await orderModel.find({ restaurantId: req.restaurantId, status: { $ne: "Cancelled" } }).select("amount createdAt").lean();
    if (orders.length < 7) return res.json({ success: true, data: { message: "Need at least 7 orders for forecasting", forecast: [] } });

    const dailyRev = {}, dailyOrd = {};
    orders.forEach(o => {
      const k = new Date(o.createdAt).toISOString().slice(0, 10);
      dailyRev[k] = (dailyRev[k] || 0) + (o.amount || 0);
      dailyOrd[k] = (dailyOrd[k] || 0) + 1;
    });

    const dowRev = Array(7).fill(0), dowCnt = Array(7).fill(0);
    Object.entries(dailyRev).forEach(([d, r]) => { const dow = new Date(d).getDay(); dowRev[dow] += r; dowCnt[dow]++; });
    const dowAvg = dowRev.map((r, i) => dowCnt[i] > 0 ? Math.round(r / dowCnt[i]) : 0);

    const sorted = Object.entries(dailyRev).sort((a, b) => a[0].localeCompare(b[0]));
    const last7 = sorted.slice(-7);
    const ma7 = last7.reduce((s, [, r]) => s + r, 0) / Math.max(last7.length, 1);

    const avgOrderVal = orders.reduce((s, o) => s + (o.amount || 0), 0) / orders.length;
    const forecast = [];
    const today = new Date();
    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today); d.setDate(d.getDate() + i);
      const dow = d.getDay();
      const rev = Math.round(dowAvg[dow] * 0.6 + ma7 * 0.4);
      forecast.push({ date: d.toISOString().slice(0, 10), dayName: dayNames[dow], predictedRevenue: rev, predictedOrders: Math.max(1, Math.round(rev / avgOrderVal)), confidence: sorted.length >= 30 ? "high" : sorted.length >= 14 ? "medium" : "low" });
    }

    res.json({ success: true, data: { forecast, weekTotal: forecast.reduce((s, f) => s + f.predictedRevenue, 0), movingAverage: Math.round(ma7), dayOfWeekPattern: dowAvg.map((a, i) => ({ day: dayNames[i], avgRevenue: a })), dataPoints: sorted.length } });
  } catch (e) {
    console.error("[ai/forecast]", e);
    res.json({ success: false, message: "Forecast failed" });
  }
});

// ── 10. MENU OPTIMIZATION ───────────────────────────────────────────────────
router.get("/menu-insights", restaurantAuth, requireFeature("aiInsights"), async (req, res) => {
  try {
    const [foods, orders] = await Promise.all([
      foodModel.find({ restaurantId: req.restaurantId }).lean(),
      orderModel.find({ restaurantId: req.restaurantId, status: { $ne: "Cancelled" } }).lean(),
    ]);

    const itemStats = {};
    orders.forEach(o => (o.items || []).forEach(it => {
      const id = String(it._id);
      if (!itemStats[id]) itemStats[id] = { orders: 0, revenue: 0 };
      itemStats[id].orders += it.quantity || 1;
      itemStats[id].revenue += (it.price || 0) * (it.quantity || 1);
    }));

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((s, o) => s + (o.amount || 0), 0);

    const insights = foods.map(f => {
      const id = String(f._id);
      const st = itemStats[id] || { orders: 0, revenue: 0 };
      const ordShare = totalOrders > 0 ? st.orders / totalOrders * 100 : 0;
      const revShare = totalRevenue > 0 ? st.revenue / totalRevenue * 100 : 0;
      const popScore = Math.min(100, ordShare * 5);
      const revScore = Math.min(100, revShare * 5);
      const ratScore = f.avgRating ? (f.avgRating / 5 * 100) : 50;
      const composite = Math.round(popScore * 0.4 + revScore * 0.4 + ratScore * 0.2);

      let status = "star";
      if (st.orders === 0) status = "dead";
      else if (composite < 20) status = "underperformer";
      else if (composite < 40) status = "average";
      else if (composite < 70) status = "good";

      let suggestion = "";
      if (status === "dead") suggestion = "Zero orders — consider removing or promoting this item.";
      else if (status === "underperformer") suggestion = "Try lowering the price or improving the photo.";
      else if (status === "star") suggestion = "Top performer! Feature it or create combos around it.";

      return { _id: f._id, name: f.name, category: f.category, price: f.price, image: f.image, orders: st.orders, revenue: Math.round(st.revenue), orderShare: Math.round(ordShare * 10) / 10, revenueShare: Math.round(revShare * 10) / 10, avgRating: f.avgRating || 0, compositeScore: composite, status, suggestion };
    }).sort((a, b) => b.compositeScore - a.compositeScore);

    const catStats = {};
    insights.forEach(i => {
      if (!catStats[i.category]) catStats[i.category] = { orders: 0, revenue: 0, items: 0 };
      catStats[i.category].orders += i.orders;
      catStats[i.category].revenue += i.revenue;
      catStats[i.category].items++;
    });

    res.json({ success: true, data: { items: insights, stars: insights.filter(i => i.status === "star").map(i => i.name), underperformers: insights.filter(i => i.status === "underperformer" || i.status === "dead").map(i => i.name), categoryBreakdown: Object.entries(catStats).map(([cat, s]) => ({ category: cat, ...s })).sort((a, b) => b.revenue - a.revenue), totalItems: foods.length } });
  } catch (e) {
    console.error("[ai/menu-insights]", e);
    res.json({ success: false, message: "Menu analysis failed" });
  }
});

// ── 11. CHURN PREDICTION ────────────────────────────────────────────────────
router.get("/churn", restaurantAuth, requireFeature("aiInsights"), async (req, res) => {
  try {
    const orders = await orderModel.find({ restaurantId: req.restaurantId, status: { $ne: "Cancelled" } }).select("userId createdAt amount").lean();
    const byUser = {};
    orders.forEach(o => { const u = String(o.userId); if (!byUser[u]) byUser[u] = []; byUser[u].push(o); });

    const now = Date.now();
    const atRisk = [];

    for (const [userId, uo] of Object.entries(byUser)) {
      if (uo.length < 2) continue;
      uo.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const gaps = [];
      for (let i = 0; i < uo.length - 1; i++) gaps.push((new Date(uo[i].createdAt) - new Date(uo[i + 1].createdAt)) / 864e5);
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const daysSince = (now - new Date(uo[0].createdAt)) / 864e5;
      const spent = uo.reduce((s, o) => s + (o.amount || 0), 0);

      let risk = "low";
      if (daysSince > avgGap * 3) risk = "critical";
      else if (daysSince > avgGap * 2) risk = "high";
      else if (daysSince > avgGap * 1.5) risk = "medium";

      if (risk !== "low") atRisk.push({ userId, orderCount: uo.length, totalSpent: Math.round(spent), avgGapDays: Math.round(avgGap), daysSinceLast: Math.round(daysSince), risk, lastOrderDate: uo[0].createdAt });
    }

    const users = await userModel.find({ _id: { $in: atRisk.map(c => c.userId) } }).select("name email").lean();
    const uMap = {}; users.forEach(u => { uMap[String(u._id)] = u; });

    const enriched = atRisk.map(c => ({ ...c, name: uMap[c.userId]?.name || "Unknown", email: uMap[c.userId]?.email || "" }))
      .sort((a, b) => { const o = { critical: 0, high: 1, medium: 2 }; return (o[a.risk] ?? 3) - (o[b.risk] ?? 3); });

    res.json({ success: true, data: { atRisk: enriched, summary: { critical: enriched.filter(c => c.risk === "critical").length, high: enriched.filter(c => c.risk === "high").length, medium: enriched.filter(c => c.risk === "medium").length }, totalCustomers: Object.keys(byUser).length, potentialRevenueLoss: enriched.reduce((s, c) => s + Math.round(c.totalSpent / c.orderCount), 0) } });
  } catch (e) {
    console.error("[ai/churn]", e);
    res.json({ success: false, message: "Churn analysis failed" });
  }
});

// ── 12. STOCK ALERTS ────────────────────────────────────────────────────────
router.get("/stock-alerts", restaurantAuth, requireFeature("aiInsights"), async (req, res) => {
  try {
    const ago = new Date(Date.now() - 7 * 864e5);
    const [foods, recent] = await Promise.all([
      foodModel.find({ restaurantId: req.restaurantId }).lean(),
      orderModel.find({ restaurantId: req.restaurantId, createdAt: { $gte: ago }, status: { $ne: "Cancelled" } }).lean(),
    ]);

    const vel = {};
    recent.forEach(o => (o.items || []).forEach(it => { const id = String(it._id); vel[id] = (vel[id] || 0) + (it.quantity || 1); }));

    const items = foods.map(f => {
      const id = String(f._id);
      const wk = vel[id] || 0;
      const daily = Math.round((wk / 7) * 10) / 10;
      let trend = "stable";
      if (daily > 5) trend = "high_demand";
      else if (daily > 2) trend = "moderate_demand";
      else if (daily === 0) trend = "no_orders";

      return { _id: f._id, name: f.name, category: f.category, inStock: f.inStock, weeklyOrders: wk, dailyAvg: daily, trend, alert: !f.inStock ? "Currently out of stock" : trend === "high_demand" ? "High demand — ensure stock!" : trend === "no_orders" ? "No orders this week" : null };
    }).sort((a, b) => b.dailyAvg - a.dailyAvg);

    res.json({ success: true, data: { items, highDemand: items.filter(a => a.trend === "high_demand").length, outOfStock: items.filter(a => !a.inStock).length, noOrders: items.filter(a => a.trend === "no_orders").length } });
  } catch (e) {
    console.error("[ai/stock]", e);
    res.json({ success: false, message: "Stock analysis failed" });
  }
});

// ── 15. CUSTOMER SEGMENTATION ───────────────────────────────────────────────
router.get("/customer-segmentation", restaurantAuth, requireFeature("aiCustomerSegmentation"), async (req, res) => {
  try {
    const orders = await orderModel.find({ restaurantId: req.restaurantId, status: { $ne: "Cancelled" } }).select("userId amount createdAt").lean();
    const users = await userModel.find().select("name email phone").lean();
    const uMap = {}; users.forEach(u => { uMap[String(u._id)] = u; });

    if (!orders.length) {
      return res.json({
        success: true,
        segments: [],
        customers: [],
        metrics: {
          totalCustomers: 0,
          totalRevenue: 0,
          avgOrderValue: 0,
          retentionRate: 0,
          bySegment: [],
        },
        insights: { actions: [], notes: [] },
        meta: { aiUsed: false, mode: "rules", reason: "No orders yet" },
      });
    }

    const byUser = {};
    orders.forEach(o => {
      const uid = String(o.userId);
      if (!byUser[uid]) byUser[uid] = { orders: 0, spending: 0, lastOrder: o.createdAt, firstOrder: o.createdAt };
      byUser[uid].orders++;
      byUser[uid].spending += o.amount || 0;
      byUser[uid].lastOrder = new Date(o.createdAt) > new Date(byUser[uid].lastOrder) ? o.createdAt : byUser[uid].lastOrder;
    });

    const now = Date.now();
    const segments = {};
    const customers = [];

    for (const [uid, data] of Object.entries(byUser)) {
      const avgOrder = data.spending / data.orders;
      const daysSinceLast = (now - new Date(data.lastOrder)) / 864e5;
      const daysActive = (now - new Date(data.firstOrder)) / 864e5;
      
      let segmentType = "Regular";
      if (data.orders >= 20 && data.spending > 500) segmentType = "VIP";
      else if (data.orders >= 10 && daysSinceLast < 30) segmentType = "Loyal";
      else if (daysSinceLast > 90) segmentType = "Lost";
      else if (data.orders === 1 && daysSinceLast < 7) segmentType = "New";
      else if (daysSinceLast > 60 && daysActive > 30) segmentType = "At Risk";

      if (!segments[segmentType]) segments[segmentType] = [];
      segments[segmentType].push(uid);

      const user = uMap[uid] || { name: "Unknown", email: "", phone: "" };
      customers.push({
        userId: uid,
        name: user.name,
        email: user.email,
        orderCount: data.orders,
        totalOrders: data.orders,
        totalSpent: Math.round(data.spending),
        avgOrderValue: Math.round(avgOrder),
        avgOrder: Math.round(avgOrder),
        lastOrderDate: data.lastOrder,
        lastOrder: new Date(data.lastOrder).toISOString().slice(0, 10),
        segment: segmentType,
        daysActive: Math.round(daysActive)
      });
    }

    const segmentStats = Object.entries(segments).map(([type, ids]) => {
      const segCustomers = customers.filter((c) => c.segment === type);
      const count = ids.length;
      const totalSpent = segCustomers.reduce((s, c) => s + (c.totalSpent || 0), 0);
      const totalOrders = segCustomers.reduce((s, c) => s + (c.totalOrders || 0), 0);
      const percentage = Math.round((count / Math.max(customers.length, 1)) * 1000) / 10;

      return {
        type,
        count,
        customers: count,
        emoji: SEGMENT_EMOJI[type] || "👤",
        percentage,
        avgSpent: Math.round(totalSpent / Math.max(count, 1)),
        avgOrders: Math.round((totalOrders / Math.max(count, 1)) * 10) / 10,
      };
    }).sort((a, b) => b.count - a.count);

    const totalRevenue = orders.reduce((s, o) => s + (o.amount || 0), 0);
    const totalCustomers = Object.keys(byUser).length;
    const avgOrderValue = Math.round(totalRevenue / Math.max(orders.length, 1));
    const activeLast30Days = customers.filter((c) => (now - new Date(c.lastOrderDate)) / 864e5 <= 30).length;
    const retentionRate = Math.round((activeLast30Days / Math.max(totalCustomers, 1)) * 1000) / 10;

    const metrics = {
      totalCustomers,
      totalRevenue,
      avgOrderValue,
      retentionRate,
      bySegment: segmentStats.map((s) => ({ segment: s.type, count: s.count, percentage: s.percentage })),
    };

    let aiInsights = { aiUsed: false, descriptions: {}, actions: [], notes: [] };
    try {
      aiInsights = await getGroqSegmentInsights({ segmentStats, metrics });
    } catch (aiErr) {
      console.warn("[ai/customer-segmentation][groq] fallback to rules:", aiErr.message);
    }

    const enrichedSegments = segmentStats.map((s) => ({
      ...s,
      description: aiInsights.descriptions?.[s.type] || SAFE_FALLBACK_DESCRIPTIONS[s.type] || "Customer segment",
    }));

    res.json({
      success: true,
      segments: enrichedSegments,
      customers: customers.sort((a, b) => b.totalSpent - a.totalSpent),
      metrics,
      insights: {
        actions: aiInsights.actions,
        notes: aiInsights.notes,
      },
      meta: {
        aiUsed: aiInsights.aiUsed,
        mode: aiInsights.aiUsed ? "groq+rules" : "rules",
      },
    });
  } catch (e) {
    console.error("[ai/customer-segmentation]", e);
    res.json({ success: false, message: "Segmentation failed" });
  }
});

// ── 16. EXPORT SEGMENT CSV ─────────────────────────────────────────────────
router.post("/export-segment", restaurantAuth, requireFeature("aiCustomerSegmentation"), async (req, res) => {
  try {
    const segmentType = String(req.body?.segmentType || "").trim();
    if (!segmentType) {
      return res.json({ success: false, message: "segmentType is required" });
    }

    const orders = await orderModel
      .find({ restaurantId: req.restaurantId, status: { $ne: "Cancelled" } })
      .select("userId amount createdAt")
      .lean();

    const users = await userModel.find().select("name email phone").lean();
    const uMap = {};
    users.forEach((u) => {
      uMap[String(u._id)] = u;
    });

    const byUser = {};
    orders.forEach((o) => {
      const uid = String(o.userId);
      if (!byUser[uid]) {
        byUser[uid] = {
          orders: 0,
          spending: 0,
          lastOrder: o.createdAt,
          firstOrder: o.createdAt,
        };
      }
      byUser[uid].orders += 1;
      byUser[uid].spending += o.amount || 0;
      byUser[uid].lastOrder = new Date(o.createdAt) > new Date(byUser[uid].lastOrder)
        ? o.createdAt
        : byUser[uid].lastOrder;
    });

    const now = Date.now();
    const rows = [];

    for (const [uid, data] of Object.entries(byUser)) {
      const avgOrder = data.spending / Math.max(data.orders, 1);
      const daysSinceLast = (now - new Date(data.lastOrder)) / 864e5;
      const daysActive = (now - new Date(data.firstOrder)) / 864e5;

      let computedType = "Regular";
      if (data.orders >= 20 && data.spending > 500) computedType = "VIP";
      else if (data.orders >= 10 && daysSinceLast < 30) computedType = "Loyal";
      else if (daysSinceLast > 90) computedType = "Lost";
      else if (data.orders === 1 && daysSinceLast < 7) computedType = "New";
      else if (daysSinceLast > 60 && daysActive > 30) computedType = "At Risk";

      if (computedType !== segmentType) continue;

      const user = uMap[uid] || { name: "Unknown", email: "", phone: "" };
      rows.push({
        userId: uid,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        totalOrders: data.orders,
        totalSpent: Math.round(data.spending),
        avgOrder: Math.round(avgOrder),
        lastOrderDate: new Date(data.lastOrder).toISOString().slice(0, 10),
        daysActive: Math.round(daysActive),
        segment: computedType,
      });
    }

    const header = [
      "User ID",
      "Name",
      "Email",
      "Phone",
      "Total Orders",
      "Total Spent",
      "Average Order",
      "Last Order Date",
      "Days Active",
      "Segment",
    ];

    const csvLines = [header.map(csvCell).join(",")];
    rows.forEach((r) => {
      csvLines.push(
        [
          r.userId,
          r.name,
          r.email,
          r.phone,
          r.totalOrders,
          r.totalSpent,
          r.avgOrder,
          r.lastOrderDate,
          r.daysActive,
          r.segment,
        ]
          .map(csvCell)
          .join(",")
      );
    });

    return res.json({
      success: true,
      csv: csvLines.join("\n"),
      filename: `${segmentType}_customers.csv`,
      count: rows.length,
    });
  } catch (e) {
    console.error("[ai/export-segment]", e);
    return res.json({ success: false, message: "Export failed" });
  }
});

// ── 17. AUTO-GENERATE CAMPAIGN SCRIPT (GROQ) ─────────────────────────────
router.post("/generate-campaign-script", restaurantAuth, requireFeature("aiCustomerSegmentation"), async (req, res) => {
  try {
    const segmentType = String(req.body?.segmentType || "").trim();
    const supportersOnly = Boolean(req.body?.supportersOnly);
    if (!segmentType) {
      return res.json({ success: false, message: "segmentType is required" });
    }

    const enterpriseCheck = await ensureEnterpriseSubscription(req.restaurantId);
    if (!enterpriseCheck.ok) {
      return res.json({ success: false, message: enterpriseCheck.message });
    }
    const restaurant = enterpriseCheck.restaurant;

    let generated = { aiUsed: false, script: "" };
    try {
      generated = await generateGroqCampaignScript({
        restaurantName: restaurant.name,
        segmentType,
        supportersOnly,
      });
    } catch (aiErr) {
      console.warn("[ai/generate-campaign-script][groq] fallback:", aiErr.message);
      generated = {
        aiUsed: false,
        script: supportersOnly
          ? `Hi! As one of our top ${segmentType} supporters at ${restaurant.name}, enjoy an exclusive reward this week. Order now and claim your benefit today.`
          : `Hi! Special offer for our ${segmentType} customers from ${restaurant.name}. Don’t miss this limited-time deal and order now.`,
      };
    }

    return res.json({
      success: true,
      script: generated.script,
      meta: { aiUsed: generated.aiUsed, mode: generated.aiUsed ? "groq" : "fallback" },
    });
  } catch (e) {
    console.error("[ai/generate-campaign-script]", e);
    return res.json({ success: false, message: "Failed to generate campaign script." });
  }
});

// ── 18. CREATE SEGMENT CAMPAIGN (DIRECT SEND) ─────────────────────────────
router.post("/create-campaign", restaurantAuth, requireFeature("aiCustomerSegmentation"), async (req, res) => {
  try {
    const segmentType = String(req.body?.segmentType || "").trim();
    const supportersOnly = Boolean(req.body?.supportersOnly);
    const supporterLimit = Math.max(1, Math.min(100, Number(req.body?.supporterLimit) || 20));
    const customMessage = String(req.body?.message || "").trim();

    if (!segmentType) {
      return res.json({ success: false, message: "segmentType is required" });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.json({
        success: false,
        message: "RESEND_API_KEY is not configured. Campaign cannot be sent.",
      });
    }

    const enterpriseCheck = await ensureEnterpriseSubscription(req.restaurantId);
    if (!enterpriseCheck.ok) {
      return res.json({ success: false, message: enterpriseCheck.message });
    }
    const restaurant = enterpriseCheck.restaurant;

    const orders = await orderModel
      .find({ restaurantId: req.restaurantId, status: { $ne: "Cancelled" } })
      .select("userId amount createdAt")
      .lean();

    if (!orders.length) {
      return res.json({ success: false, message: "No customer orders found yet." });
    }

    const users = await userModel.find().select("name email").lean();
    const uMap = {};
    users.forEach((u) => {
      uMap[String(u._id)] = u;
    });

    const byUser = {};
    orders.forEach((o) => {
      const uid = String(o.userId);
      if (!byUser[uid]) {
        byUser[uid] = {
          orders: 0,
          spending: 0,
          firstOrder: o.createdAt,
          lastOrder: o.createdAt,
        };
      }

      byUser[uid].orders += 1;
      byUser[uid].spending += o.amount || 0;
      byUser[uid].firstOrder = new Date(o.createdAt) < new Date(byUser[uid].firstOrder)
        ? o.createdAt
        : byUser[uid].firstOrder;
      byUser[uid].lastOrder = new Date(o.createdAt) > new Date(byUser[uid].lastOrder)
        ? o.createdAt
        : byUser[uid].lastOrder;
    });

    const now = Date.now();
    let recipients = Object.entries(byUser)
      .map(([uid, stats]) => {
        const daysSinceLast = (now - new Date(stats.lastOrder)) / 864e5;
        const daysActive = (now - new Date(stats.firstOrder)) / 864e5;
        const computedSegment = segmentTypeFromUserStats({
          orders: stats.orders,
          spending: stats.spending,
          daysSinceLast,
          daysActive,
        });

        return {
          userId: uid,
          segment: computedSegment,
          totalOrders: stats.orders,
          totalSpent: Math.round(stats.spending),
          lastOrderDate: stats.lastOrder,
          name: uMap[uid]?.name || "Customer",
          email: uMap[uid]?.email || "",
        };
      })
      .filter((r) => r.segment === segmentType && r.email);

    if (supportersOnly) {
      recipients = recipients
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, supporterLimit);
    }

    if (!recipients.length) {
      return res.json({
        success: false,
        message: supportersOnly
          ? `No eligible top supporters found in ${segmentType}.`
          : `No eligible customers found in ${segmentType}.`,
      });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.FROM_EMAIL || "onboarding@resend.dev";

    const defaultMessage = supportersOnly
      ? `Thanks for being one of our top supporters in ${segmentType}. Enjoy this exclusive reward from ${restaurant.name}.`
      : `Special offer for our ${segmentType} customers from ${restaurant.name}.`;
    const finalMessage = customMessage || defaultMessage;

    const BATCH = 10;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map((r) =>
          resend.emails.send({
            from: `${restaurant.name} via Crave <${from}>`,
            to: r.email,
            subject: supportersOnly
              ? `${restaurant.name}: Exclusive top supporter offer`
              : `${restaurant.name}: Offer for ${segmentType} customers`,
            html: `
              <div style="font-family:Inter,Arial,sans-serif;padding:24px;background:#f8fafc;color:#0f172a;">
                <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
                  <div style="padding:18px 20px;background:#111827;color:#ffffff;">
                    <div style="font-size:12px;opacity:0.8;">${restaurant.name}</div>
                    <div style="font-size:22px;font-weight:900;margin-top:4px;">${supportersOnly ? "Top Supporter" : segmentType} Campaign</div>
                  </div>
                  <div style="padding:20px;line-height:1.6;white-space:pre-line;">
                    <p style="margin:0 0 10px;">Hi ${r.name || "there"},</p>
                    <p style="margin:0;">${finalMessage}</p>
                  </div>
                </div>
              </div>
            `,
          })
        )
      );

      results.forEach((result) => {
        if (result.status === "fulfilled") sent += 1;
        else failed += 1;
      });
    }

    await campaignModel.create({
      restaurantId: req.restaurantId,
      type: "general",
      subject: supportersOnly
        ? `Top supporters campaign (${segmentType})`
        : `Segment campaign (${segmentType})`,
      heading: supportersOnly ? "Top Supporter Campaign" : "Segment Campaign",
      body: finalMessage,
      status: sent > 0 ? "sent" : "failed",
      sentAt: new Date(),
      recipientCount: recipients.length,
      sentCount: sent,
      failedCount: failed,
    });

    return res.json({
      success: true,
      message: `Campaign sent to ${sent} customer${sent !== 1 ? "s" : ""}${failed ? ` (${failed} failed)` : ""}.`,
      sent,
      failed,
      recipientCount: recipients.length,
      supportersOnly,
      segmentType,
    });
  } catch (e) {
    console.error("[ai/create-campaign]", e);
    return res.json({ success: false, message: "Failed to create campaign." });
  }
});

export default router;
