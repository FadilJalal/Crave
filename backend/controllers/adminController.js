import adminModel from "../models/adminModel.js";
import restaurantModel from "../models/restaurantModel.js";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

/* ================= SUPER ADMIN LOGIN ================= */
export const superAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await adminModel.findOne({ email: email.toLowerCase() });
    if (!admin) return res.status(401).json({ success: false, message: "Admin not found" });

    if (admin.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Not a superadmin account" });
    }

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(401).json({ success: false, message: "Wrong password" });

    const token = jwt.sign(
      { id: admin._id, role: "superadmin" },
      process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ success: true, token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Login error" });
  }
};

/* ================= RESTAURANT LOGIN ================= */
export const loginRestaurant = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Normalize email to lowercase
    const restaurant = await restaurantModel.findOne({ email: email.toLowerCase() });
    
    if (!restaurant) {
      return res.status(401).json({ success: false, message: "Restaurant not found" });
    }

    // Check if the restaurant is active
    if (!restaurant.isActive) {
      return res.status(403).json({ success: false, message: "Restaurant is disabled" });
    }

    // Compare encrypted password
    const ok = await bcrypt.compare(password, restaurant.password);
    if (!ok) {
      return res.status(401).json({ success: false, message: "Wrong password" });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: restaurant._id, role: "restaurant" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ Return essential restaurant info for the frontend UI (Logo/Name)
    return res.json({
      success: true,
      token,
      restaurant: {
        _id: restaurant._id,
        name: restaurant.name,
        email: restaurant.email,
        logo: restaurant.logo || "", 
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Login error" });
  }
};

/* ================= DASHBOARD STATS ================= */
export const getAdminStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);

    const [totalRestaurants, totalOrders, totalUsers, todayOrders, allOrders, activeRestaurants] = await Promise.all([
      restaurantModel.countDocuments({}),
      orderModel.countDocuments({ status: { $ne: "Cancelled" } }),
      userModel.countDocuments({}),
      orderModel.countDocuments({ createdAt: { $gte: todayStart }, status: { $ne: "Cancelled" } }),
      orderModel.find({ status: { $ne: "Cancelled" } }, "amount"),
      restaurantModel.find({ "subscription.status": "active" }, "subscription.price"),
    ]);

    const totalRevenue = allOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const mrr = activeRestaurants.reduce((sum, r) => sum + (r.subscription?.price || 0), 0);

    return res.json({
      success: true,
      data: { totalRestaurants, totalOrders, totalUsers, todayOrders, totalRevenue: Math.round(totalRevenue), mrr },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Failed to load admin stats" });
  }
};