import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import orderModel from "../models/orderModel.js";
import reviewModel from "../models/reviewModel.js";
import restaurantModel from "../models/restaurantModel.js";
import userModel from "../models/userModel.js";
import foodModel from "../models/foodModel.js";
import { analyzeSentiment } from "../utils/aiHelpers.js";

const router = express.Router();

// ── 13. FRAUD DETECTION ─────────────────────────────────────────────────────
router.get("/fraud-alerts", adminAuth, async (req, res) => {
  try {
    const ago = new Date(Date.now() - 7 * 864e5);
    const recent = await orderModel.find({ createdAt: { $gte: ago } }).lean();
    const flags = [];

    // Rule 1: >10 orders/day from one user
    const daily = {};
    recent.forEach(o => {
      const k = `${o.userId}_${new Date(o.createdAt).toISOString().slice(0, 10)}`;
      daily[k] = (daily[k] || 0) + 1;
    });
    Object.entries(daily).forEach(([k, c]) => {
      if (c > 10) {
        const [userId, date] = k.split("_");
        flags.push({ type: "excessive_orders", severity: "high", userId, detail: `${c} orders on ${date}` });
      }
    });

    // Rule 2: Unusual order amount (>3 std devs above mean)
    const amounts = recent.map(o => o.amount).filter(a => a > 0);
    if (amounts.length > 5) {
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const std = Math.sqrt(amounts.reduce((s, a) => s + (a - avg) ** 2, 0) / amounts.length);
      recent.forEach(o => {
        if (o.amount > avg + 3 * std && o.amount > 500) {
          flags.push({ type: "unusual_amount", severity: "medium", userId: o.userId, orderId: o._id, detail: `AED ${o.amount} (avg: AED ${Math.round(avg)})` });
        }
      });
    }


        // ── 17. CUSTOMER SEGMENTATION ───────────────────────────────────────────────
    // Rule 3: Many cancellations
    const cancelled = await orderModel.find({ createdAt: { $gte: ago }, status: "Cancelled" }).lean();
    const cancelCnt = {};
    cancelled.forEach(o => { cancelCnt[String(o.userId)] = (cancelCnt[String(o.userId)] || 0) + 1; });
    Object.entries(cancelCnt).forEach(([userId, c]) => {
      if (c >= 5) flags.push({ type: "excessive_cancellations", severity: "medium", userId, detail: `${c} cancellations in 7 days` });
    });

    // Rule 4: Shared address across many users
    const addrMap = {};
    recent.forEach(o => {
      if (o.address?.street) {
        const k = `${o.address.street}_${o.address.building || ""}`.toLowerCase().trim();
        if (!addrMap[k]) addrMap[k] = new Set();
        addrMap[k].add(String(o.userId));
      }
    });
    Object.entries(addrMap).forEach(([addr, users]) => {
      if (users.size >= 4) flags.push({ type: "shared_address", severity: "low", detail: `${users.size} users at same address`, userIds: [...users] });
    });

    // Enrich
    const uids = [...new Set(flags.map(f => f.userId).filter(Boolean))];
    const users = await userModel.find({ _id: { $in: uids } }).select("name email").lean();
    const um = {}; users.forEach(u => { um[String(u._id)] = u; });

    const enriched = flags.map(f => ({
      ...f,
      userName: f.userId ? um[f.userId]?.name || "Unknown" : undefined,
      userEmail: f.userId ? um[f.userId]?.email || "" : undefined,
    })).sort((a, b) => {
      const s = { high: 0, medium: 1, low: 2 };
      return (s[a.severity] ?? 3) - (s[b.severity] ?? 3);
    });

    res.json({ success: true, data: { flags: enriched, summary: { high: enriched.filter(f => f.severity === "high").length, medium: enriched.filter(f => f.severity === "medium").length, low: enriched.filter(f => f.severity === "low").length }, totalOrdersAnalyzed: recent.length } });
  } catch (e) {
    console.error("[ai/fraud]", e);
    res.json({ success: false, message: "Fraud analysis failed" });
  }
});

// ── 14. PLATFORM TRENDS ─────────────────────────────────────────────────────
router.get("/trends", adminAuth, async (req, res) => {
  try {
    const ago = new Date(Date.now() - 30 * 864e5);
    const [orders, restaurants, foods] = await Promise.all([
      orderModel.find({ createdAt: { $gte: ago }, status: { $ne: "Cancelled" } }).lean(),
      restaurantModel.find().select("name logo isActive").lean(),
      foodModel.find().lean(),
    ]);

    // Trending foods
    const fc = {};
    orders.forEach(o => (o.items || []).forEach(it => {
      const k = it.name || String(it._id);
      if (!fc[k]) fc[k] = { name: it.name, count: 0, revenue: 0 };
      fc[k].count += it.quantity || 1;
      fc[k].revenue += (it.price || 0) * (it.quantity || 1);
    }));
    const trendingFoods = Object.values(fc).sort((a, b) => b.count - a.count).slice(0, 10);

    // Trending categories
    const foodMap = {};
    foods.forEach(f => { foodMap[String(f._id)] = f; });
    const cc = {};
    orders.forEach(o => (o.items || []).forEach(it => {
      const f = foodMap[String(it._id)];
      if (f?.category) cc[f.category] = (cc[f.category] || 0) + 1;
    }));
    const trendingCategories = Object.entries(cc).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([category, count]) => ({ category, count }));

    // Top restaurants
    const rc = {};
    orders.forEach(o => {
      const rid = String(o.restaurantId);
      if (!rc[rid]) rc[rid] = { orders: 0, revenue: 0 };
      rc[rid].orders++; rc[rid].revenue += o.amount || 0;
    });
    const rm = {}; restaurants.forEach(r => { rm[String(r._id)] = r; });
    const topRestaurants = Object.entries(rc).map(([id, s]) => ({ ...s, name: rm[id]?.name || "Unknown", logo: rm[id]?.logo || "", id })).sort((a, b) => b.orders - a.orders).slice(0, 10);

    // Growth
    const now = Date.now(), wk = now - 7 * 864e5, twk = now - 14 * 864e5;
    const tw = orders.filter(o => new Date(o.createdAt) >= new Date(wk));
    const lw = orders.filter(o => new Date(o.createdAt) >= new Date(twk) && new Date(o.createdAt) < new Date(wk));
    const orderGrowth = lw.length > 0 ? Math.round(((tw.length - lw.length) / lw.length) * 100) : 0;
    const twRev = tw.reduce((s, o) => s + (o.amount || 0), 0);
    const lwRev = lw.reduce((s, o) => s + (o.amount || 0), 0);
    const revenueGrowth = lwRev > 0 ? Math.round(((twRev - lwRev) / lwRev) * 100) : 0;

    // Daily order trend
    const daily = {};
    for (let i = 29; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); daily[d.toISOString().slice(0, 10)] = 0; }
    orders.forEach(o => { const k = new Date(o.createdAt).toISOString().slice(0, 10); if (k in daily) daily[k]++; });
    const orderTrend = Object.entries(daily).map(([date, count]) => ({ date, count }));

    res.json({ success: true, data: { trendingFoods, trendingCategories, topRestaurants, orderTrend, growth: { orderGrowth, revenueGrowth, thisWeekOrders: tw.length, lastWeekOrders: lw.length }, totals: { orders: orders.length, revenue: Math.round(orders.reduce((s, o) => s + (o.amount || 0), 0)), restaurants: restaurants.length, foods: foods.length } } });
  } catch (e) {
    console.error("[ai/trends]", e);
    res.json({ success: false, message: "Trend analysis failed" });
  }
});

// ── 15. RESTAURANT SCORING ──────────────────────────────────────────────────
router.get("/restaurant-scores", adminAuth, async (req, res) => {
  try {
    const [restaurants, allOrders, allReviews] = await Promise.all([
      restaurantModel.find().select("-password").lean(),
      orderModel.find().lean(),
      reviewModel.find().lean(),
    ]);

    const scores = restaurants.map(r => {
      const rid = String(r._id);
      const orders = allOrders.filter(o => String(o.restaurantId) === rid);
      const reviews = allReviews.filter(rv => String(rv.restaurantId) === rid);
      const nonCancelled = orders.filter(o => o.status !== "Cancelled");

      const avgRating = reviews.length > 0 ? reviews.reduce((s, rv) => s + rv.rating, 0) / reviews.length : 3;
      const ratingScore = Math.round((avgRating / 5) * 100);

      const maxVol = Math.max(1, ...restaurants.map(r2 => allOrders.filter(o => String(o.restaurantId) === String(r2._id) && o.status !== "Cancelled").length));
      const volumeScore = Math.min(100, Math.round((nonCancelled.length / maxVol) * 100));

      const delivered = nonCancelled.filter(o => o.status === "Delivered" && o.updatedAt);
      let speedScore = 50;
      if (delivered.length >= 3) {
        const avg = delivered.map(o => (new Date(o.updatedAt) - new Date(o.createdAt)) / 60000).reduce((a, b) => a + b, 0) / delivered.length;
        speedScore = avg <= 20 ? 100 : avg <= 30 ? 85 : avg <= 45 ? 70 : avg <= 60 ? 50 : 30;
      }

      const completionRate = orders.length > 0 ? Math.round(((orders.length - orders.filter(o => o.status === "Cancelled").length) / orders.length) * 100) : 100;

      let sentimentScore = 50;
      if (reviews.length > 0) {
        let ts = 0; reviews.forEach(rv => { ts += analyzeSentiment(rv.comment).score; });
        sentimentScore = Math.max(0, Math.min(100, Math.round(50 + (ts / reviews.length) * 25)));
      }

      const composite = Math.round(ratingScore * 0.25 + volumeScore * 0.2 + speedScore * 0.2 + completionRate * 0.2 + sentimentScore * 0.15);
      let grade = "A+";
      if (composite < 30) grade = "D";
      else if (composite < 50) grade = "C";
      else if (composite < 65) grade = "B";
      else if (composite < 80) grade = "A";

      const revenue = nonCancelled.reduce((s, o) => s + (o.amount || 0), 0);

      return { _id: r._id, name: r.name, logo: r.logo, isActive: r.isActive, scores: { rating: ratingScore, volume: volumeScore, speed: speedScore, completion: completionRate, sentiment: sentimentScore }, composite, grade, stats: { orders: nonCancelled.length, reviews: reviews.length, avgRating: Math.round(avgRating * 10) / 10, revenue: Math.round(revenue) } };
    }).sort((a, b) => b.composite - a.composite);

    res.json({ success: true, data: { restaurants: scores, avgPlatformScore: Math.round(scores.reduce((s, r) => s + r.composite, 0) / Math.max(scores.length, 1)) } });
  } catch (e) {
    console.error("[ai/scores]", e);
    res.json({ success: false, message: "Scoring failed" });
  }
});

// ── 16. AI INSIGHTS ─────────────────────────────────────────────────────────
router.get("/insights", adminAuth, async (req, res) => {
  try {
    const [orders, users, restaurants, foods, reviews] = await Promise.all([
      orderModel.find().lean(),
      userModel.find().lean(),
      restaurantModel.find().lean(),
      foodModel.find().lean(),
      reviewModel.find().lean(),
    ]);

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((s, o) => s + (o.amount || 0), 0);
    const totalUsers = users.length;
    const activeUsers = new Set(orders.map(o => String(o.userId))).size;
    const avgOrderValue = totalOrders > 0 ? Math.round(2 * totalRevenue / totalOrders) / 2 : 0;
    const avgRating = reviews.length > 0 ? Math.round(10 * reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) / 10 : 0;

    const cancelledOrders = orders.filter(o => o.status === "Cancelled").length;
    const cancellationRate = totalOrders > 0 ? Math.round(1000 * cancelledOrders / totalOrders) / 10 : 0;

    const lastMonth = new Date(Date.now() - 30 * 864e5);
    const monthOrders = orders.filter(o => new Date(o.createdAt) >= lastMonth).length;
    const monthRevenue = orders.filter(o => new Date(o.createdAt) >= lastMonth).reduce((s, o) => s + (o.amount || 0), 0);

    const topRestaurants = restaurants.slice(0, 3).map(r => ({
      name: r.name,
      orders: orders.filter(o => String(o.restaurantId) === String(r._id) && o.status !== "Cancelled").length,
      revenue: Math.round(orders.filter(o => String(o.restaurantId) === String(r._id) && o.status !== "Cancelled").reduce((s, o) => s + (o.amount || 0), 0)),
    }));

    const recommendations = [];
    if (cancellationRate > 10) recommendations.push("High cancellation rate detected. Consider reviewing restaurant quality or delivery speed.");
    if (activeUsers < totalUsers * 0.3) recommendations.push("Low repeat user rate. Focus on customer retention campaigns.");
    if (avgOrderValue < 50) recommendations.push("Average order value is low. Consider bundling strategies or promotions.");
    if (monthOrders < totalOrders / 3) recommendations.push("Monthly orders trending down. Launch targeted promotions.");

    res.json({
      success: true,
      data: {
        summary: {
          totalOrders,
          totalRevenue: Math.round(totalRevenue),
          avgOrderValue,
          totalUsers,
          activeUsers,
          avgPlatformRating: avgRating,
          cancellationRate,
        },
        monthComparison: { orders: monthOrders, revenue: Math.round(monthRevenue) },
        topRestaurants,
        recommendations,
      },
    });
  } catch (e) {
    console.error("[ai/insights]", e);
    res.json({ success: false, message: "Insights analysis failed" });
  }
});


// ── 17. CUSTOMER SEGMENTATION ───────────────────────────────────────────────
router.get("/customer-segments", adminAuth, async (req, res) => {
  try {
    const [users, orders] = await Promise.all([
      userModel.find().lean(),
      orderModel.find().lean(),
    ]);

    const userProfiles = {};
    users.forEach(u => {
      userProfiles[String(u._id)] = {
        _id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        totalOrders: 0,
        totalSpent: 0,
        lastOrderDate: null,
        daysActive: 0,
        firstOrderDate: null,
        avgOrderValue: 0,
      };
    });

    orders.forEach(o => {
      const uid = String(o.userId);
      if (userProfiles[uid]) {
        userProfiles[uid].totalOrders++;
        userProfiles[uid].totalSpent += o.amount || 0;
        userProfiles[uid].lastOrderDate = new Date(o.createdAt);
        if (!userProfiles[uid].firstOrderDate) userProfiles[uid].firstOrderDate = new Date(o.createdAt);
      }
    });

    Object.values(userProfiles).forEach(u => {
      if (u.firstOrderDate && u.lastOrderDate) {
        u.daysActive = Math.ceil((u.lastOrderDate - u.firstOrderDate) / (1000 * 60 * 60 * 24));
      }
      u.avgOrderValue = u.totalOrders > 0 ? Math.round(100 * u.totalSpent / u.totalOrders) / 100 : 0;
    });

    // Segment users
    const segments = { vip: [], loyal: [], occasional: [], atRisk: [], dormant: [], new: [] };

    const now = Date.now();
    Object.values(userProfiles).forEach(u => {
      if (u.totalOrders === 0) {
        segments.new.push(u);
      } else if (u.totalOrders >= 20 && u.totalSpent >= 1000) {
        segments.vip.push(u);
      } else if (u.totalOrders >= 10 && u.avgOrderValue >= 100) {
        segments.loyal.push(u);
      } else if (u.totalOrders >= 3 && u.totalOrders < 10) {
        const daysSinceOrder = u.lastOrderDate ? (now - u.lastOrderDate) / (1000 * 60 * 60 * 24) : 999;
        if (daysSinceOrder > 30) segments.atRisk.push(u);
        else segments.occasional.push(u);
      } else if (u.totalOrders <= 2) {
        segments.atRisk.push(u);
      }

      if (u.lastOrderDate && (now - u.lastOrderDate) / (1000 * 60 * 60 * 24) > 90) {
        segments.dormant.push(u);
        const idx = Object.values(segments).flat().findIndex(x => x._id === u._id);
      }
    });

    const segmentSummary = Object.entries(segments).map(([name, users]) => ({
      name,
      count: users.length,
      avgSpent: users.length > 0 ? Math.round(users.reduce((s, u) => s + u.totalSpent, 0) / users.length) : 0,
      avgOrders: users.length > 0 ? Math.round(10 * users.reduce((s, u) => s + u.totalOrders, 0) / users.length) / 10 : 0,
      recommendation: {
        vip: "VIP rewards, exclusive offers, priority support",
        loyal: "Cross-sell, referral bonuses, special discounts",
        occasional: "Engagement campaigns, feedback collection",
        atRisk: "Re-engagement offers, surveys to understand churn",
        dormant: "Win-back campaigns, special incentives",
        new: "Onboarding, first-order discount, track experience",
      }[name],
    }));

    res.json({
      success: true,
      data: {
        segments: segmentSummary,
        total: users.length,
        detailedSegments: segments,
      },
    });
  } catch (e) {
    console.error("[ai/customer-segments]", e);
    res.json({ success: false, message: "Customer segmentation failed" });
  }
});

export default router;
