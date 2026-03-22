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

export { loginUser, registerUser, getProfile, updateProfile };