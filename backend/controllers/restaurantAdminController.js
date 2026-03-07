import restaurantModel from "../models/restaurantModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

/* ================= RESTAURANT LOGIN ================= */
export const loginRestaurant = async (req, res) => {
  try {
    const { email, password } = req.body;

    const restaurant = await restaurantModel.findOne({ email: email.toLowerCase() });
    if (!restaurant) return res.json({ success: false, message: "Restaurant not found" });

    if (!restaurant.isActive) {
      return res.json({ success: false, message: "Restaurant is disabled" });
    }

    const ok = await bcrypt.compare(password, restaurant.password);
    if (!ok) return res.json({ success: false, message: "Wrong password" });

    const token = jwt.sign(
      { id: restaurant._id, role: "restaurant" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ success: true, token });
  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Login error" });
  }
};

/* ================= CREATE RESTAURANT (SUPER ADMIN) ================= */
export const createRestaurant = async (req, res) => {
  try {
    const { name, email, password, address, location, avgPrepTime } = req.body;

    if (!name || !email || !password || !address || !location?.lat || !location?.lng) {
      return res.json({ success: false, message: "Missing required fields" });
    }

    const exists = await restaurantModel.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.json({ success: false, message: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const restaurant = await restaurantModel.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      address,
      location: { lat: Number(location.lat), lng: Number(location.lng) },
      avgPrepTime: avgPrepTime ? Number(avgPrepTime) : 15,
      isActive: true,
    });

    res.json({ success: true, message: "Restaurant created", data: restaurant });
  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Create restaurant error" });
  }
};