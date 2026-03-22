import express from "express";
import restaurantModel from "../models/restaurantModel.js";
import adminAuth from "../middleware/adminAuth.js";

const subRouter = express.Router();

const PLANS = {
  standard: { name: "Standard", price: 299 },
};

// ── Get all subscriptions overview ─────────────────────────────────────────
subRouter.get("/list", adminAuth, async (req, res) => {
  try {
    const restaurants = await restaurantModel
      .find({})
      .select("name logo subscription isActive createdAt")
      .sort({ createdAt: -1 });

    const now = new Date();
    const data = restaurants.map(r => {
      const sub = r.subscription || {};
      const daysLeft = sub.expiresAt
        ? Math.ceil((new Date(sub.expiresAt) - now) / (1000 * 60 * 60 * 24))
        : null;
      return {
        _id: r._id,
        name: r.name,
        logo: r.logo,
        isActive: r.isActive,
        plan: sub.plan || "none",
        status: sub.status || "trial",
        price: sub.price || 0,
        startDate: sub.startDate,
        expiresAt: sub.expiresAt,
        notes: sub.notes || "",
        daysLeft,
        expiringSoon: daysLeft !== null && daysLeft <= 7 && daysLeft > 0,
        isExpired: daysLeft !== null && daysLeft <= 0,
      };
    });

    // MRR = sum of active subscription prices
    const mrr = data
      .filter(r => r.status === "active")
      .reduce((sum, r) => sum + (r.price || 0), 0);

    const activeCount   = data.filter(r => r.status === "active").length;
    const trialCount    = data.filter(r => r.status === "trial").length;
    const expiredCount  = data.filter(r => r.status === "expired" || r.isExpired).length;
    const expiringSoon  = data.filter(r => r.expiringSoon).length;

    res.json({ success: true, data, mrr, activeCount, trialCount, expiredCount, expiringSoon });
  } catch (err) {
    console.error("[sub/list]", err);
    res.json({ success: false, message: "Error fetching subscriptions." });
  }
});

// ── Assign / update subscription for a restaurant ──────────────────────────
subRouter.post("/assign", adminAuth, async (req, res) => {
  try {
    const { restaurantId, plan, months, notes } = req.body;
    if (!restaurantId || !plan || !months)
      return res.json({ success: false, message: "restaurantId, plan, and months are required." });

    const price = PLANS[plan]?.price || 0;
    const startDate = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + Number(months));

    const restaurant = await restaurantModel.findByIdAndUpdate(
      restaurantId,
      {
        "subscription.plan": plan,
        "subscription.status": "active",
        "subscription.startDate": startDate,
        "subscription.expiresAt": expiresAt,
        "subscription.price": 299,
        "subscription.notes": notes || "",
        isActive: true,
      },
      { new: true }
    );

    if (!restaurant) return res.json({ success: false, message: "Restaurant not found." });
    res.json({ success: true, message: `${PLANS[plan].name} plan assigned for ${months} month(s).` });
  } catch (err) {
    res.json({ success: false, message: "Error assigning subscription." });
  }
});

// ── Cancel / expire a subscription ────────────────────────────────────────
subRouter.post("/cancel", adminAuth, async (req, res) => {
  try {
    const { restaurantId } = req.body;
    await restaurantModel.findByIdAndUpdate(restaurantId, {
      "subscription.status": "cancelled",
      isActive: false,
    });
    res.json({ success: true, message: "Subscription cancelled." });
  } catch (err) {
    res.json({ success: false, message: "Error cancelling subscription." });
  }
});

// ── Auto-expire overdue subscriptions (call periodically or on load) ───────
subRouter.post("/check-expired", adminAuth, async (req, res) => {
  try {
    const now = new Date();
    const result = await restaurantModel.updateMany(
      { "subscription.status": "active", "subscription.expiresAt": { $lt: now } },
      { "subscription.status": "expired", isActive: false }
    );
    res.json({ success: true, expiredCount: result.modifiedCount });
  } catch (err) {
    res.json({ success: false, message: "Error checking expirations." });
  }
});

export default subRouter;
export { PLANS };