import express from "express";
import authMiddleware from "../middleware/auth.js";
import restaurantAuth from "../middleware/restaurantAuth.js";
import reviewModel from "../models/reviewModel.js";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";

const reviewRouter = express.Router();

// ── POST /api/review/submit — customer submits a review after delivery ──────
reviewRouter.post("/submit", authMiddleware, async (req, res) => {
  try {
    const userId = String(req.body.userId);
    const { orderId, rating, comment } = req.body;

    if (!orderId || !rating || rating < 1 || rating > 5) {
      return res.json({ success: false, message: "Rating must be between 1 and 5." });
    }

    const order = await orderModel.findById(orderId);
    if (!order) return res.json({ success: false, message: "Order not found." });
    if (String(order.userId) !== userId) {
      return res.status(403).json({ success: false, message: "Not your order." });
    }
    if ((order.status || "").toLowerCase().trim() !== "delivered") {
      return res.json({ success: false, message: "You can only review delivered orders." });
    }

    const user = await userModel.findById(userId).lean();
    const userName = user?.name || "Customer";

    const existing = await reviewModel.findOne({ orderId, userId });
    if (existing) {
      existing.rating = Number(rating);
      existing.comment = (comment || "").trim().slice(0, 500);
      await existing.save();
      return res.json({ success: true, message: "Review updated.", updated: true });
    }

    await reviewModel.create({
      restaurantId: order.restaurantId,
      orderId,
      userId,
      userName,
      rating: Number(rating),
      comment: (comment || "").trim().slice(0, 500),
    });

    res.json({ success: true, message: "Review submitted. Thank you!" });
  } catch (err) {
    console.error("[review/submit]", err);
    if (err.code === 11000) {
      return res.json({ success: false, message: "You already reviewed this order." });
    }
    res.json({ success: false, message: "Error submitting review." });
  }
});

// ── GET /api/review/restaurant/:restaurantId — public list of reviews ────────
reviewRouter.get("/restaurant/:restaurantId", async (req, res) => {
  try {
    const reviews = await reviewModel
      .find({ restaurantId: req.params.restaurantId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const total = reviews.length;
    const avg =
      total > 0
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10
        : 0;

    res.json({ success: true, data: reviews, avgRating: avg, total });
  } catch (err) {
    console.error("[review/list]", err);
    res.json({ success: false, message: "Error fetching reviews." });
  }
});

// ── GET /api/review/check/:orderId — has this user already reviewed? ─────────
reviewRouter.get("/check/:orderId", authMiddleware, async (req, res) => {
  try {
    const userId = String(req.body.userId);
    const review = await reviewModel
      .findOne({ orderId: req.params.orderId, userId })
      .lean();
    res.json({ success: true, reviewed: !!review, review: review || null });
  } catch (err) {
    res.json({ success: false, message: "Error checking review." });
  }
});

// ── GET /api/review/restaurant-admin/list — restaurant sees their own reviews ─
reviewRouter.get("/restaurant-admin/list", restaurantAuth, async (req, res) => {
  try {
    const reviews = await reviewModel
      .find({ restaurantId: req.restaurantId })
      .sort({ createdAt: -1 })
      .lean();

    const total = reviews.length;
    const avg =
      total > 0
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10
        : 0;

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => { breakdown[r.rating] = (breakdown[r.rating] || 0) + 1; });

    res.json({ success: true, data: reviews, avgRating: avg, total, breakdown });
  } catch (err) {
    console.error("[review/restaurant-admin/list]", err);
    res.json({ success: false, message: "Error fetching reviews." });
  }
});

// ── POST /api/review/reply/:reviewId — restaurant owner replies ──────────────
reviewRouter.post("/reply/:reviewId", restaurantAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.json({ success: false, message: "Reply text is required." });
    }

    const review = await reviewModel.findById(req.params.reviewId);
    if (!review) return res.json({ success: false, message: "Review not found." });

    if (String(review.restaurantId) !== String(req.restaurantId)) {
      return res.status(403).json({ success: false, message: "Not your review." });
    }

    review.reply = { text: text.trim().slice(0, 500), repliedAt: new Date() };
    await review.save();

    res.json({ success: true, message: "Reply posted.", reply: review.reply });
  } catch (err) {
    console.error("[review/reply]", err);
    res.json({ success: false, message: "Error posting reply." });
  }
});

export default reviewRouter;