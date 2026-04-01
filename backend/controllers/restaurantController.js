import restaurantModel from "../models/restaurantModel.js";
import bcrypt from "bcrypt";

// ✅ GET LIST
export const listRestaurants = async (req, res) => {
  try {
    const restaurants = await restaurantModel.find().sort({ createdAt: -1 });
    res.json({ success: true, data: restaurants });
  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Error fetching restaurants" });
  }
};

// ✅ ADD RESTAURANT (supports JSON + multipart/form-data)
export const addRestaurant = async (req, res) => {
  try {
    let { name, email, password, address, location, avgPrepTime, lat, lng } = req.body;

    if (typeof location === "string") {
      try { location = JSON.parse(location); } catch { location = null; }
    }

    const finalLat = Number(location?.lat ?? lat);
    const finalLng = Number(location?.lng ?? lng);

    if (!name || !email || !password || !address?.trim()) {
      return res.json({ success: false, message: "Missing required fields" });
    }
    if (!Number.isFinite(finalLat) || !Number.isFinite(finalLng)) {
      return res.json({ success: false, message: "Invalid map location — set lat/lng on the map before submitting" });
    }

    const exists = await restaurantModel.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.json({ success: false, message: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const logoFilename = req.file?.filename || "";

    const restaurant = await restaurantModel.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      address,
      location: { lat: Number(finalLat), lng: Number(finalLng) },
      avgPrepTime: avgPrepTime ? Number(avgPrepTime) : 15,
      isActive: true,
      logo: logoFilename,
    });

    res.json({ success: true, message: "Restaurant added successfully", data: restaurant });
  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Error adding restaurant" });
  }
};

// ✅ REMOVE
export const removeRestaurant = async (req, res) => {
  try {
    const { id } = req.body;
    await restaurantModel.findByIdAndDelete(id);
    res.json({ success: true, message: "Restaurant removed" });
  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Error removing restaurant" });
  }
};

// ✅ TOGGLE ACTIVE
export const toggleActive = async (req, res) => {
  try {
    const { id } = req.body;
    const restaurant = await restaurantModel.findById(id);
    if (!restaurant) return res.json({ success: false, message: "Restaurant not found" });

    restaurant.isActive = !restaurant.isActive;
    await restaurant.save();

    res.json({
      success: true,
      message: restaurant.isActive ? "Restaurant activated" : "Restaurant deactivated",
    });
  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Error toggling status" });
  }
};

// ✅ EDIT RESTAURANT
export const editRestaurant = async (req, res) => {
  try {
    const { id, name, email, address, avgPrepTime } = req.body;

    if (!id) return res.json({ success: false, message: "Restaurant id is required" });

    const restaurant = await restaurantModel.findById(id);
    if (!restaurant) return res.json({ success: false, message: "Restaurant not found" });

    if (email && email.toLowerCase() !== restaurant.email) {
      const existing = await restaurantModel.findOne({ email: email.toLowerCase() });
      if (existing) return res.json({ success: false, message: "Email already in use by another restaurant" });
      restaurant.email = email.toLowerCase();
    }

    if (name)        restaurant.name        = name;
    if (address)     restaurant.address     = address;
    if (avgPrepTime) restaurant.avgPrepTime = Number(avgPrepTime);
    if (req.file)    restaurant.logo        = req.file.filename;

    await restaurant.save();
    res.json({ success: true, message: "Restaurant updated", data: restaurant });
  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Error updating restaurant" });
  }
};

// ✅ RESET PASSWORD
export const resetRestaurantPassword = async (req, res) => {
  try {
    const { id, newPassword } = req.body;

    if (!id)          return res.json({ success: false, message: "Restaurant id is required" });
    if (!newPassword) return res.json({ success: false, message: "New password is required" });
    if (newPassword.length < 6) return res.json({ success: false, message: "Password must be at least 6 characters" });

    const restaurant = await restaurantModel.findById(id);
    if (!restaurant) return res.json({ success: false, message: "Restaurant not found" });

    restaurant.password = await bcrypt.hash(newPassword, 10);
    await restaurant.save();

    res.json({ success: true, message: `Password reset for ${restaurant.name}` });
  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Error resetting password" });
  }
};