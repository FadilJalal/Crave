import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from "stripe";

// ✅ FIXED: lazy-init Stripe so a missing key doesn't crash the server at startup
const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set in .env");
  return new Stripe(key);
};

const currency = "usd";
const deliveryCharge = 5;
const frontend_URL = process.env.FRONTEND_URL || "http://localhost:5174";

// =====================================
// PLACE ORDER (Stripe Payment)
// =====================================
const placeOrder = async (req, res) => {
  try {
    if (!req.body.items || req.body.items.length === 0) {
      return res.json({ success: false, message: "Cart is empty" });
    }

    const restaurantId = req.body.items[0].restaurantId;
    if (!restaurantId) {
      return res.json({ success: false, message: "restaurantId missing in items" });
    }

    const newOrder = new orderModel({
      userId: req.body.userId,
      restaurantId,
      items: req.body.items,
      amount: req.body.amount,
      deliveryFee: deliveryCharge,
      address: req.body.address,
    });

    await newOrder.save();
    await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

    const line_items = req.body.items.map((item) => ({
      price_data: {
        currency,
        product_data: { name: item.name },
        unit_amount: item.price * 100,
      },
      quantity: item.quantity,
    }));

    line_items.push({
      price_data: {
        currency,
        product_data: { name: "Delivery Charge" },
        unit_amount: deliveryCharge * 100,
      },
      quantity: 1,
    });

    // ✅ Only call Stripe when actually needed — won't crash server on startup
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      success_url: `${frontend_URL}/verify?success=true&orderId=${newOrder._id}`,
      cancel_url: `${frontend_URL}/verify?success=false&orderId=${newOrder._id}`,
      line_items,
      mode: "payment",
    });

    res.json({ success: true, session_url: session.url });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error placing order" });
  }
};

// =====================================
// PLACE ORDER (Cash On Delivery)
// =====================================
const placeOrderCod = async (req, res) => {
  try {
    if (!req.body.items || req.body.items.length === 0) {
      return res.json({ success: false, message: "Cart is empty" });
    }

    const restaurantId = req.body.items[0].restaurantId;
    if (!restaurantId) {
      return res.json({ success: false, message: "restaurantId missing in items" });
    }

    const newOrder = new orderModel({
      userId: req.body.userId,
      restaurantId,
      items: req.body.items,
      amount: req.body.amount,
      deliveryFee: deliveryCharge,
      address: req.body.address,
      payment: true,
    });

    await newOrder.save();
    await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

    res.json({ success: true, message: "Order Placed Successfully" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error placing order" });
  }
};

// =====================================
// LIST ALL ORDERS (SUPER ADMIN ONLY)
// =====================================
const listOrders = async (req, res) => {
  try {
    if (req.admin?.role && req.admin.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const orders = await orderModel
      .find({})
      .populate("restaurantId", "name address location")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error fetching orders" });
  }
};

// =====================================
// USER ORDERS
// =====================================
const userOrders = async (req, res) => {
  try {
    const orders = await orderModel
      .find({ userId: req.body.userId })
      .populate("restaurantId", "name address location")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error fetching user orders" });
  }
};

// =====================================
// UPDATE STATUS (SUPER ADMIN ONLY)
// =====================================
const updateStatus = async (req, res) => {
  try {
    if (req.admin?.role && req.admin.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await orderModel.findByIdAndUpdate(req.body.orderId, { status: req.body.status });
    res.json({ success: true, message: "Status Updated" });
  } catch (error) {
    res.json({ success: false, message: "Error updating status" });
  }
};

// =====================================
// VERIFY STRIPE PAYMENT
// =====================================
const verifyOrder = async (req, res) => {
  const { orderId, success } = req.body;
  try {
    if (success === "true") {
      await orderModel.findByIdAndUpdate(orderId, { payment: true });
      res.json({ success: true, message: "Payment Successful" });
    } else {
      await orderModel.findByIdAndDelete(orderId);
      res.json({ success: false, message: "Payment Failed" });
    }
  } catch (error) {
    res.json({ success: false, message: "Verification Failed" });
  }
};

// =====================================
// RESTAURANT ADMIN: LIST OWN ORDERS
// =====================================
const listRestaurantOrders = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    if (!restaurantId) {
      return res.json({ success: false, message: "restaurantId missing in token" });
    }

    const orders = await orderModel
      .find({ restaurantId })
      .populate("restaurantId", "name address location")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error fetching restaurant orders" });
  }
};

// =====================================
// RESTAURANT ADMIN: UPDATE STATUS
// =====================================
const restaurantUpdateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const restaurantId = req.restaurantId;

    if (!restaurantId) {
      return res.json({ success: false, message: "restaurantId missing in token" });
    }

    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

    if (String(order.restaurantId) !== String(restaurantId)) {
      return res.status(403).json({ success: false, message: "Not your order" });
    }

    order.status = status;
    await order.save();

    res.json({ success: true, message: "Status Updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error updating status" });
  }
};

// =====================================
// GET SINGLE ORDER BY ID (owner only)
// =====================================
const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await orderModel
      .findById(orderId)
      .populate("restaurantId", "name address location image");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Only the order owner can view it
    if (String(order.userId) !== String(req.body.userId)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error fetching order" });
  }
};

export {
  placeOrder,
  placeOrderCod,
  listOrders,
  userOrders,
  updateStatus,
  verifyOrder,
  listRestaurantOrders,
  restaurantUpdateStatus,
  getOrderById,
};