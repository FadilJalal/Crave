import userModel from "../models/userModel.js";
import Stripe from "stripe";

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set in .env");
  return new Stripe(key);
};

// Save a new card for a user (attach to Stripe customer, store in DB)
export const saveCard = async (req, res) => {
  try {
    const { userId, paymentMethodId } = req.body;
    if (!userId || !paymentMethodId) return res.status(400).json({ success: false, message: "Missing userId or paymentMethodId" });
    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const stripe = getStripe();

    // Ensure Stripe customer exists
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name });
      stripeCustomerId = customer.id;
      user.stripeCustomerId = stripeCustomerId;
    }

    // Attach PaymentMethod to customer
    await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });
    await stripe.customers.update(stripeCustomerId, { invoice_settings: { default_payment_method: paymentMethodId } });

    // Get card details
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    const card = {
      paymentMethodId,
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
    };
    // Prevent duplicates
    user.savedCards = user.savedCards.filter(c => c.paymentMethodId !== paymentMethodId);
    user.savedCards.push(card);
    await user.save();
    res.json({ success: true, card });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all saved cards for a user
export const getSavedCards = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: "Missing userId" });
    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, cards: user.savedCards || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete a saved card
export const deleteCard = async (req, res) => {
  try {
    const { userId, paymentMethodId } = req.body;
    if (!userId || !paymentMethodId) return res.status(400).json({ success: false, message: "Missing userId or paymentMethodId" });
    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.savedCards = user.savedCards.filter(c => c.paymentMethodId !== paymentMethodId);
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
