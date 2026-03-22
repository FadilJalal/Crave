import express from "express";
import Stripe from "stripe";
import restaurantModel from "../models/restaurantModel.js";
import adminAuth from "../middleware/adminAuth.js";
import restaurantAuth from "../middleware/restaurantAuth.js";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

const subRouter = express.Router();

const PLANS = {
  basic: { name: "Basic", price: 299 },
  pro:   { name: "Pro",   price: 399 },
};

// ── Restaurant: create Stripe checkout ────────────────────────────────────
subRouter.post("/checkout", restaurantAuth, async (req, res) => {
  try {
    if (!stripe) return res.json({ success: false, message: "Stripe is not configured." });

    const { plan, months } = req.body;
    if (!plan || !PLANS[plan]) return res.json({ success: false, message: "Invalid plan." });
    if (!months || isNaN(months) || Number(months) < 1)
      return res.json({ success: false, message: "Invalid duration." });

    const restaurant = await restaurantModel.findById(req.restaurantId).select("name");
    if (!restaurant) return res.json({ success: false, message: "Restaurant not found." });

    const planInfo = PLANS[plan];
    const total    = planInfo.price * Number(months);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "aed",
          product_data: {
            name: `Crave ${planInfo.name} Plan — ${months} month${months > 1 ? "s" : ""}`,
            description: `Subscription for ${restaurant.name}`,
          },
          unit_amount: Math.round(total * 100),
        },
        quantity: 1,
      }],
      metadata: {
        restaurantId: String(req.restaurantId),
        plan,
        months: String(months),
        price:  String(planInfo.price),
      },
      success_url: `${process.env.RESTAURANT_ADMIN_URL || "http://localhost:5175"}/subscription?success=1`,
      cancel_url:  `${process.env.RESTAURANT_ADMIN_URL || "http://localhost:5175"}/subscription?cancelled=1`,
    });

    res.json({ success: true, url: session.url });
  } catch (err) {
    console.error("[sub/checkout]", err);
    res.json({ success: false, message: "Failed to create checkout session." });
  }
});

// ── Stripe webhook ─────────────────────────────────────────────────────────
subRouter.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig    = req.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    event = secret
      ? stripe.webhooks.constructEvent(req.body, sig, secret)
      : JSON.parse(req.body);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const { restaurantId, plan, months, price } = event.data.object.metadata || {};
    if (restaurantId && plan && months) {
      const startDate = new Date();
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + Number(months));
      await restaurantModel.findByIdAndUpdate(restaurantId, {
        "subscription.plan":      plan,
        "subscription.status":    "active",
        "subscription.startDate": startDate,
        "subscription.expiresAt": expiresAt,
        "subscription.price":     Number(price),
        "subscription.notes":     "Self-serve payment via Stripe",
        isActive: true,
      });
    }
  }

  res.json({ received: true });
});

// ── Restaurant: view own subscription ─────────────────────────────────────
subRouter.get("/mine", restaurantAuth, async (req, res) => {
  try {
    const restaurant = await restaurantModel
      .findById(req.restaurantId)
      .select("name logo subscription isActive");
    if (!restaurant) return res.json({ success: false, message: "Restaurant not found." });

    const sub      = restaurant.subscription || {};
    const now      = new Date();
    const daysLeft = sub.expiresAt
      ? Math.ceil((new Date(sub.expiresAt) - now) / (1000 * 60 * 60 * 24))
      : null;

    res.json({
      success: true,
      data: {
        plan:         sub.plan      || "none",
        status:       sub.status    || "trial",
        price:        sub.price     || 0,
        startDate:    sub.startDate || null,
        expiresAt:    sub.expiresAt || null,
        daysLeft,
        expiringSoon: daysLeft !== null && daysLeft <= 7 && daysLeft > 0,
        isExpired:    daysLeft !== null && daysLeft <= 0,
        isActive:     restaurant.isActive,
      },
    });
  } catch (err) {
    console.error("[sub/mine]", err);
    res.json({ success: false, message: "Error fetching subscription." });
  }
});

// ── List all subscriptions (super admin) ──────────────────────────────────
subRouter.get("/list", adminAuth, async (req, res) => {
  try {
    const restaurants = await restaurantModel
      .find({})
      .select("name logo subscription isActive createdAt")
      .sort({ createdAt: -1 });

    const now  = new Date();
    const data = restaurants.map(r => {
      const sub      = r.subscription || {};
      const daysLeft = sub.expiresAt
        ? Math.ceil((new Date(sub.expiresAt) - now) / (1000 * 60 * 60 * 24))
        : null;
      return {
        _id:          r._id,
        name:         r.name,
        logo:         r.logo,
        isActive:     r.isActive,
        plan:         sub.plan   || "none",
        status:       sub.status || "trial",
        price:        sub.price  || 0,
        startDate:    sub.startDate,
        expiresAt:    sub.expiresAt,
        notes:        sub.notes  || "",
        daysLeft,
        expiringSoon: daysLeft !== null && daysLeft <= 7 && daysLeft > 0,
        isExpired:    daysLeft !== null && daysLeft <= 0,
      };
    });

    const mrr          = data.filter(r => r.status === "active").reduce((s, r) => s + (r.price || 0), 0);
    const activeCount  = data.filter(r => r.status === "active").length;
    const trialCount   = data.filter(r => r.status === "trial").length;
    const expiringSoon = data.filter(r => r.expiringSoon).length;

    res.json({ success: true, data, mrr, activeCount, trialCount, expiringSoon });
  } catch (err) {
    res.json({ success: false, message: "Error fetching subscriptions." });
  }
});

// ── Assign manually (super admin) ─────────────────────────────────────────
subRouter.post("/assign", adminAuth, async (req, res) => {
  try {
    const { restaurantId, plan, months, notes } = req.body;
    if (!restaurantId || !plan || !months)
      return res.json({ success: false, message: "restaurantId, plan, and months are required." });

    const planInfo = PLANS[plan];
    if (!planInfo) return res.json({ success: false, message: "Invalid plan." });

    const startDate = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + Number(months));

    const restaurant = await restaurantModel.findByIdAndUpdate(
      restaurantId,
      {
        "subscription.plan":      plan,
        "subscription.status":    "active",
        "subscription.startDate": startDate,
        "subscription.expiresAt": expiresAt,
        "subscription.price":     planInfo.price,
        "subscription.notes":     notes || "",
        isActive: true,
      },
      { new: true }
    );

    if (!restaurant) return res.json({ success: false, message: "Restaurant not found." });
    res.json({ success: true, message: `${planInfo.name} plan assigned for ${months} month(s).` });
  } catch (err) {
    res.json({ success: false, message: "Error assigning subscription." });
  }
});

// ── Cancel (super admin) ───────────────────────────────────────────────────
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

// ── Auto-expire overdue subscriptions ─────────────────────────────────────
subRouter.post("/check-expired", adminAuth, async (req, res) => {
  try {
    const now    = new Date();
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