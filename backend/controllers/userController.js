import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import userModel from "../models/userModel.js";

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.json({ success: false, message: "Email and password are required" });
    }

    const user = await userModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.json({ success: false, message: "User does not exist" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.json({ success: false, message: "Invalid credentials" });

    const token = createToken(user._id);
    res.json({ success: true, token });
  } catch (error) {
    console.error("[loginUser]", error.message);
    res.json({ success: false, message: "Login failed" });
  }
};

const registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password) {
      return res.json({ success: false, message: "All fields are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!validator.isEmail(normalizedEmail)) {
      return res.json({ success: false, message: "Please enter a valid email" });
    }
    if (password.length < 8) {
      return res.json({ success: false, message: "Password must be at least 8 characters" });
    }

    const exists = await userModel.findOne({ email: normalizedEmail });
    if (exists) return res.json({ success: false, message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new userModel({ name: name.trim(), email: normalizedEmail, password: hashedPassword });
    const user = await newUser.save();
    const token = createToken(user._id);
    res.json({ success: true, token });
  } catch (error) {
    console.error("[registerUser]", error.message);
    res.json({ success: false, message: "Registration failed" });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await userModel.findById(req.body.userId).select("name email phone savedAddresses");
    if (!user) return res.json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (error) {
    res.json({ success: false, message: "Failed to load profile" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { phone, address } = req.body;
    const update = {};
    if (phone !== undefined) update.phone = phone;

    if (address) {
      const user = await userModel.findById(req.body.userId).select("savedAddresses");
      const addresses = user.savedAddresses || [];
      // Check if identical address already saved
      const exists = addresses.some(a =>
        a.street === address.street &&
        a.area === address.area &&
        a.city === address.city &&
        a.building === address.building
      );
      if (!exists) {
        // Keep max 3 saved addresses, newest first
        update.savedAddresses = [address, ...addresses].slice(0, 3);
      }
    }

    await userModel.findByIdAndUpdate(req.body.userId, update);
    res.json({ success: true, message: "Profile updated" });
  } catch (error) {
    res.json({ success: false, message: "Failed to update profile" });
  }
};

// ── Address Management ─────────────────────────────────────────────
const getAddresses = async (req, res) => {
  try {
    const user = await userModel.findById(req.body.userId).select("savedAddresses");
    if (!user) return res.json({ success: false, message: "User not found" });
    res.json({ success: true, addresses: user.savedAddresses || [] });
  } catch (error) {
    res.json({ success: false, message: "Failed to load addresses" });
  }
};

const addAddress = async (req, res) => {
  try {
    const { address } = req.body;
    if (!address || !address.street || !address.city) {
      return res.json({ success: false, message: "Address, street, and city are required" });
    }
    const user = await userModel.findById(req.body.userId).select("savedAddresses");
    if (!user) return res.json({ success: false, message: "User not found" });
    const addresses = user.savedAddresses || [];
    // Prevent exact duplicates
    const exists = addresses.some(a =>
      a.street === address.street &&
      a.area === address.area &&
      a.city === address.city &&
      a.building === address.building
    );
    if (exists) return res.json({ success: false, message: "Address already exists" });
    addresses.unshift({ ...address, isDefault: addresses.length === 0 });
    await userModel.findByIdAndUpdate(req.body.userId, { savedAddresses: addresses });
    res.json({ success: true, addresses });
  } catch (error) {
    res.json({ success: false, message: "Failed to add address" });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const { addressIndex } = req.body;
    const user = await userModel.findById(req.body.userId).select("savedAddresses");
    if (!user) return res.json({ success: false, message: "User not found" });
    let addresses = user.savedAddresses || [];
    if (addressIndex < 0 || addressIndex >= addresses.length) {
      return res.json({ success: false, message: "Invalid address index" });
    }
    addresses.splice(addressIndex, 1);
    // If default was deleted, set first as default
    if (!addresses.some(a => a.isDefault) && addresses.length > 0) addresses[0].isDefault = true;
    await userModel.findByIdAndUpdate(req.body.userId, { savedAddresses: addresses });
    res.json({ success: true, addresses });
  } catch (error) {
    res.json({ success: false, message: "Failed to delete address" });
  }
};

const setDefaultAddress = async (req, res) => {
  try {
    const { addressIndex } = req.body;
    const user = await userModel.findById(req.body.userId).select("savedAddresses");
    if (!user) return res.json({ success: false, message: "User not found" });
    let addresses = user.savedAddresses || [];
    if (addressIndex < 0 || addressIndex >= addresses.length) {
      return res.json({ success: false, message: "Invalid address index" });
    }
    addresses = addresses.map((a, i) => ({ ...a, isDefault: i === addressIndex }));
    await userModel.findByIdAndUpdate(req.body.userId, { savedAddresses: addresses });
    res.json({ success: true, addresses });
  } catch (error) {
    res.json({ success: false, message: "Failed to set default address" });
  }
};

export { loginUser, registerUser, getProfile, updateProfile, getAddresses, addAddress, deleteAddress, setDefaultAddress };