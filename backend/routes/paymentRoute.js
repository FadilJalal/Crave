import express from "express";
import Stripe from "stripe";

const router = express.Router();

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

// Create multiple PaymentIntents for a split bill
router.post("/create-intents", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        success: false,
        message: "Stripe is not configured on the server",
      });
    }

    const { totalAmount, splits, currency = "aed" } = req.body;

    if (
      typeof totalAmount !== "number" ||
      !Array.isArray(splits) ||
      splits.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload: totalAmount and splits are required",
      });
    }

    const sum = splits.reduce((acc, part) => acc + (Number(part.amount) || 0), 0);

    if (sum !== totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Split amounts must add up to total amount",
      });
    }

    // Stripe expects the amount in the smallest currency unit (fils for AED)
    const toStripeAmount = (val) => Math.round(val * 100);

    const intents = [];

    for (const part of splits) {
      const amount = Number(part.amount);
      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Each split amount must be greater than zero",
        });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: toStripeAmount(amount),
        currency,
        metadata: {
          split_index: intents.length.toString(),
          total_amount: totalAmount.toString(),
        },
      });

      intents.push({
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount,
      });
    }

    res.json({
      success: true,
      totalAmount,
      currency,
      intents,
    });
  } catch (err) {
    console.error("Stripe split payment error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create split payments",
    });
  }
});

// Create a single PaymentIntent for partial card + cash split
router.post("/create-card-intent", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        success: false,
        message: "Stripe is not configured on the server",
      });
    }

    const { amount, currency = "aed" } = req.body;

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Card amount must be greater than zero",
      });
    }

    const stripeAmount = Math.round(numericAmount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency,
    });

    res.json({
      success: true,
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: numericAmount,
      currency,
    });
  } catch (err) {
    console.error("Stripe card+cash payment error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create card payment",
    });
  }
});

export default router;
