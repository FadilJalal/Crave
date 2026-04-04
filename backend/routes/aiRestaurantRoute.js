import express from "express";
import restaurantAuth from "../middleware/restaurantAuth.js";
import foodModel from "../models/foodModel.js";
import orderModel from "../models/orderModel.js";
import reviewModel from "../models/reviewModel.js";
import userModel from "../models/userModel.js";

const router = express.Router();

// ── 9. SALES FORECAST ───────────────────────────────────────────────────────
router.get("/forecast", restaurantAuth, async (req, res) => {
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
router.get("/menu-insights", restaurantAuth, async (req, res) => {
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
router.get("/churn", restaurantAuth, async (req, res) => {
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
router.get("/stock-alerts", restaurantAuth, async (req, res) => {
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
router.get("/customer-segmentation", restaurantAuth, async (req, res) => {
  try {
    const orders = await orderModel.find({ restaurantId: req.restaurantId, status: { $ne: "Cancelled" } }).select("userId amount createdAt").lean();
    const users = await userModel.find().select("name email phone").lean();
    const uMap = {}; users.forEach(u => { uMap[String(u._id)] = u; });

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
        totalSpent: Math.round(data.spending),
        avgOrderValue: Math.round(avgOrder),
        lastOrderDate: data.lastOrder,
        segment: segmentType,
        daysActive: Math.round(daysActive)
      });
    }

    const metrics = {
      totalCustomers: Object.keys(byUser).length,
      totalRevenue: orders.reduce((s, o) => s + (o.amount || 0), 0),
      bySegment: Object.entries(segments).map(([type, ids]) => ({ segment: type, count: ids.length }))
    };

    res.json({ success: true, segments: Object.entries(segments).map(([type, ids]) => ({ type, count: ids.length, emoji: { "VIP": "👑", "Loyal": "💎", "Regular": "👤", "At Risk": "⚠️", "Lost": "💔", "New": "🌟" }[type] || "👤" })), customers: customers.sort((a, b) => b.totalSpent - a.totalSpent), metrics });
  } catch (e) {
    console.error("[ai/customer-segmentation]", e);
    res.json({ success: false, message: "Segmentation failed" });
  }
});

export default router;
