// backend/routes/recommendationRoute.js
// 100% FREE — Collaborative Filtering + Category + Popularity fallbacks

import express from "express";
import authMiddleware from "../middleware/auth.js";
import orderModel from "../models/orderModel.js";
import foodModel from "../models/foodModel.js";

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.body.userId;

    // ── Step 1: Get user's paid orders ──────────────────────────────
    const myOrders = await orderModel
      .find({ userId, payment: true })
      .sort({ createdAt: -1 })
      .lean();

    const myItemIds       = new Set();
    const myCategoryCounts = {};
    const lastOrderedItems = [];

    myOrders.forEach((order, idx) => {
      (order.items || []).forEach((item) => {
        if (item._id) {
          myItemIds.add(String(item._id));
          if (idx === 0 && lastOrderedItems.length < 3) {
            if (!lastOrderedItems.find(i => String(i._id) === String(item._id))) {
              lastOrderedItems.push(item);
            }
          }
        }
        if (item.category) {
          myCategoryCounts[item.category] = (myCategoryCounts[item.category] || 0) + 1;
        }
      });
    });

    const hasHistory = myItemIds.size > 0;
    let recommendedIds = [];
    const cardTags = {};

    // ── Step 2: Collaborative Filtering ─────────────────────────────
    if (hasHistory) {
      const similarOrders = await orderModel.find({
        userId: { $ne: userId },
        payment: true,
        "items._id": { $in: [...myItemIds] },
      }).lean();

      const itemScore = {};
      similarOrders.forEach((order) => {
        (order.items || []).forEach((item) => {
          const id = String(item._id);
          if (!myItemIds.has(id)) {
            itemScore[id] = (itemScore[id] || 0) + 1;
          }
        });
      });

      const topCollaborative = Object.entries(itemScore)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([id]) => id);

      topCollaborative.forEach(id => {
        cardTags[id] = { label: "Similar users loved this", color: "blue" };
      });
      recommendedIds = topCollaborative;
    }

    // ── Step 3: Category-based fill ─────────────────────────────────
    const topCategories = Object.entries(myCategoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);

    if (recommendedIds.length < 4) {
      const catQuery = topCategories.length > 0
        ? { category: { $in: topCategories } } : {};

      const catFoods = await foodModel
        .find({ _id: { $nin: [...myItemIds, ...recommendedIds] }, ...catQuery })
        .lean();

      const shuffled = catFoods.sort(() => Math.random() - 0.5);
      shuffled.slice(0, 4 - recommendedIds.length).forEach(f => {
        const id = String(f._id);
        cardTags[id] = { label: `Top in ${f.category}`, color: "orange" };
        recommendedIds.push(id);
      });
    }

    // ── Step 4: Popularity fallback ─────────────────────────────────
    if (recommendedIds.length < 4) {
      const popular = await orderModel.aggregate([
        { $match: { payment: true } },
        { $unwind: "$items" },
        { $group: { _id: "$items._id", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]);

      popular
        .map(p => String(p._id))
        .filter(id => !recommendedIds.includes(id))
        .slice(0, 4 - recommendedIds.length)
        .forEach(id => {
          cardTags[id] = { label: "🔥 Most Popular", color: "red" };
          recommendedIds.push(id);
        });
    }

    // ── Step 5: Random fallback ──────────────────────────────────────
    if (recommendedIds.length < 4) {
      const all = await foodModel.find({ _id: { $nin: recommendedIds } }).lean();
      all.sort(() => Math.random() - 0.5)
        .slice(0, 4 - recommendedIds.length)
        .forEach(f => {
          const id = String(f._id);
          cardTags[id] = { label: "New Pick", color: "green" };
          recommendedIds.push(id);
        });
    }

    // ── Step 6: Fetch full food docs ─────────────────────────────────
    const recFoods = await foodModel
      .find({ _id: { $in: recommendedIds } })
      .populate("restaurantId", "name logo isActive openingHours")
      .lean();

    const recommendations = recommendedIds
      .map(id => recFoods.find(f => String(f._id) === id))
      .filter(Boolean)
      .map(f => ({ ...f, tag: cardTags[String(f._id)] || null }));

    // ── Step 7: Order Again ──────────────────────────────────────────
    const orderAgainIds = lastOrderedItems.map(i => String(i._id));
    const orderAgainFoods = await foodModel
      .find({ _id: { $in: orderAgainIds } })
      .populate("restaurantId", "name logo isActive openingHours")
      .lean();

    // ── Step 8: Taste Profile ────────────────────────────────────────
    const totalCat = Object.values(myCategoryCounts).reduce((a, b) => a + b, 0);
    const tasteProfile = Object.entries(myCategoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({
        category,
        count,
        percent: Math.round((count / totalCat) * 100),
      }));

    // ── Step 9: Reason text ──────────────────────────────────────────
    let reason = "Most ordered by our customers";
    if (hasHistory && topCategories.length > 0) {
      reason = `Based on your love for ${topCategories.slice(0, 2).join(" & ")}`;
    } else if (hasHistory) {
      reason = "People with similar tastes also loved these";
    }

    res.json({
      success: true,
      recommendations,
      orderAgain: orderAgainFoods,
      tasteProfile,
      reason,
      hasHistory,
      totalOrders: myOrders.length,
    });
  } catch (error) {
    console.error("Recommendation error:", error);
    res.json({ success: false, message: "Could not generate recommendations" });
  }
});

export default router;