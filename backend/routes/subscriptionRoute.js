import express from "express";
import Stripe from "stripe";
import restaurantModel from "../models/restaurantModel.js";
import adminAuth from "../middleware/adminAuth.js";
import restaurantAuth from "../middleware/restaurantAuth.js";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

const subRouter = express.Router();

const PLANS = {
  starter: {
    tier: 1,
    name: "Starter",
    price: 299,
    description: "Perfect for small restaurants",
    billingPeriod: "month",
    features: {
      // Basic Features
      dashboard: true,
      orders: true,
      menu: true,
      messages: true,
      reviews: true,
      menuItems: true,
      bulkUpload: true,
      // Marketing
      promoCodes: true,
      broadcasts: false,
      emailCampaigns: false,
      // Advanced
      inventory: false,
      inventoryAnalytics: false,
      customers: false,
      aiInsights: false,
      aiMenuGenerator: false,
      aIPriceOptimization: false,
      aiCustomerSegmentation: false,
      analytics: false,
    },
  },
  professional: {
    tier: 2,
    name: "Professional",
    price: 399,
    description: "For growing restaurants",
    billingPeriod: "month",
    features: {
      // Basic Features
      dashboard: true,
      orders: true,
      menu: true,
      messages: true,
      reviews: true,
      menuItems: true,
      bulkUpload: true,
      // Marketing
      promoCodes: true,
      broadcasts: true,
      emailCampaigns: true,
      // Advanced
      inventory: true,
      inventoryAnalytics: true,
      customers: true,
      aiInsights: true,
      aiMenuGenerator: true,
      aIPriceOptimization: true,
      aiCustomerSegmentation: true,
      analytics: true,
    },
  },
  enterprise: {
    tier: 3,
    name: "Enterprise",
    price: 599,
    description: "For large & established restaurants",
    billingPeriod: "month",
    features: {
      // Basic Features
      dashboard: true,
      orders: true,
      menu: true,
      messages: true,
      reviews: true,
      menuItems: true,
      bulkUpload: true,
      // Marketing
      promoCodes: true,
      broadcasts: true,
      emailCampaigns: true,
      // Advanced
      inventory: true,
      inventoryAnalytics: true,
      customers: true,
      aiInsights: true,
      aiMenuGenerator: true,
      aIPriceOptimization: true,
      aiCustomerSegmentation: true,
      analytics: true,
    },
  },
};

// ── SIMPLE TEST: Check if API is working ─────────────────────────────────
subRouter.get("/health", async (req, res) => {
  res.json({ 
    success: true, 
    message: "✅ Subscription API is working!",
    timestamp: new Date().toISOString()
  });
});

// ── Restaurant: confirm payment and activate subscription ──────────────────
subRouter.post("/confirm-payment", restaurantAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.json({ success: false, message: "Session ID required" });
    
    if (!stripe) return res.json({ success: false, message: "Stripe not configured" });

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log("🔍 Retrieved Stripe session:", {
      id: session.id,
      status: session.payment_status,
      metadata: session.metadata,
    });

    // Check if payment was successful
    if (session.payment_status !== "paid") {
      return res.json({ 
        success: false, 
        message: "Payment not completed",
        paymentStatus: session.payment_status 
      });
    }

    // Get metadata
    const { plan, months, price } = session.metadata || {};
    if (!plan || !months) {
      return res.json({ success: false, message: "Invalid session metadata" });
    }

    const planInfo = PLANS[plan];
    if (!planInfo) {
      return res.json({ success: false, message: "Invalid plan" });
    }

    // Update subscription
    const startDate = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + Number(months));

    console.log("✅ CONFIRMING PAYMENT: Updating subscription");
    const result = await restaurantModel.findByIdAndUpdate(
      req.restaurantId,
      {
        "subscription.plan": plan,
        "subscription.tier": planInfo.tier,
        "subscription.status": "active",
        "subscription.startDate": startDate,
        "subscription.expiresAt": expiresAt,
        "subscription.price": Number(price || planInfo.price),
        "subscription.features": planInfo.features,
        "subscription.notes": "Stripe payment confirmed via checkout session",
        isActive: true,
      },
      { new: true }
    );

    console.log("✅ Subscription activated:", {
      plan: result.subscription.plan,
      status: result.subscription.status,
      expiresAt: result.subscription.expiresAt,
    });

    res.json({
      success: true,
      message: "✅ Payment confirmed! Subscription activated.",
      data: result.subscription,
    });
  } catch (err) {
    console.error("❌ Confirm payment error:", err.message);
    res.json({ success: false, message: err.message });
  }
});

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
      success_url: `${process.env.RESTAURANT_ADMIN_URL || "http://localhost:5175"}/subscription?success=1&sessionId=${session.id}`,
      cancel_url:  `${process.env.RESTAURANT_ADMIN_URL || "http://localhost:5175"}/subscription?cancelled=1`,
    });

    res.json({ success: true, url: session.url, sessionId: session.id });
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
    console.log("✅ Webhook received:", { restaurantId, plan, months, price });
    
    if (restaurantId && plan && months) {
      const planInfo = PLANS[plan];
      if (planInfo) {
        const startDate = new Date();
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + Number(months));
        
        console.log("📝 Updating subscription:", {
          plan,
          status: "active",
          expiresAt,
          price: Number(price),
        });
        
        const result = await restaurantModel.findByIdAndUpdate(restaurantId, {
          "subscription.plan":      plan,
          "subscription.tier":      planInfo.tier,
          "subscription.status":    "active",
          "subscription.startDate": startDate,
          "subscription.expiresAt": expiresAt,
          "subscription.price":     Number(price),
          "subscription.features":  planInfo.features,
          "subscription.notes":     "Self-serve payment via Stripe",
          isActive: true,
        }, { new: true });
        
        console.log("✅ Update result:", result?.subscription);
      } else {
        console.error("❌ Plan not found:", plan);
      }
    } else {
      console.error("❌ Missing metadata:", { restaurantId, plan, months });
    }
  } else {
    console.log("ℹ️ Event type ignored:", event.type);
  }

  res.json({ received: true });
});

// ── TEST: Manually trigger webhook (for testing only) ──────────────────────
subRouter.post("/test-webhook", restaurantAuth, async (req, res) => {
  try {
    const { plan, months, price } = req.body;
    if (!plan || !months) {
      return res.json({ success: false, message: "Missing plan or months" });
    }

    const restaurantId = req.restaurantId;
    const planInfo = PLANS[plan];
    
    if (!planInfo) {
      return res.json({ success: false, message: "Invalid plan" });
    }

    const startDate = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + Number(months));

    console.log("🧪 TEST WEBHOOK: Simulating payment completion");
    console.log("📝 Updating subscription:", {
      restaurantId,
      plan,
      status: "active",
      expiresAt,
    });

    const result = await restaurantModel.findByIdAndUpdate(
      restaurantId,
      {
        "subscription.plan": plan,
        "subscription.tier": planInfo.tier,
        "subscription.status": "active",
        "subscription.startDate": startDate,
        "subscription.expiresAt": expiresAt,
        "subscription.price": Number(price || planInfo.price),
        "subscription.features": planInfo.features,
        "subscription.notes": "TEST: Manual webhook trigger",
        isActive: true,
      },
      { new: true }
    );

    console.log("✅ TEST UPDATE SUCCEEDED:", result?.subscription);

    res.json({
      success: true,
      message: "Test webhook executed. Reload your subscription page.",
      data: result?.subscription,
    });
  } catch (err) {
    console.error("❌ TEST WEBHOOK ERROR:", err);
    res.json({ success: false, message: err.message });
  }
});

// ── TEST: Check current subscription data ────────────────────────────────────
subRouter.get("/test-data", restaurantAuth, async (req, res) => {
  try {
    const restaurant = await restaurantModel
      .findById(req.restaurantId)
      .select("_id name subscription isActive");
    
    console.log("🔍 DEBUG DATA:");
    console.log("Restaurant ID:", restaurant._id);
    console.log("Restaurant Name:", restaurant.name);
    console.log("Full Subscription Object:", JSON.stringify(restaurant.subscription, null, 2));

    res.json({
      success: true,
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      subscription: restaurant.subscription || {},
      isActive: restaurant.isActive,
    });
  } catch (err) {
    console.error("❌ Test data error:", err);
    res.json({ success: false, message: err.message });
  }
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

    console.log("📊 Subscription data retrieved:", {
      plan: sub.plan || "none",
      status: sub.status || "trial",
      expiresAt: sub.expiresAt,
      daysLeft,
    });

    const baseFeatures = { ...PLANS.starter.features };
    const mergedFeatures = {
      ...baseFeatures,
      ...(sub.features && typeof sub.features === "object" ? sub.features : {}),
    };

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
        features:     mergedFeatures,
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
        "subscription.tier":      planInfo.tier,
        "subscription.status":    "active",
        "subscription.startDate": startDate,
        "subscription.expiresAt": expiresAt,
        "subscription.price":     planInfo.price,
        "subscription.features":  planInfo.features,
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