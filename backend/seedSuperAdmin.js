import mongoose from "mongoose";
import bcrypt from "bcrypt";
import "dotenv/config";
import adminModel from "./models/adminModel.js";

const run = async () => {
  await mongoose.connect(process.env.MONGO_URL);

  const email = "superadmin@tomato.com";
  const password = "super123";

  const existing = await adminModel.findOne({ email });
  if (existing) {
    console.log("SuperAdmin already exists");
    process.exit(0);
  }

  const hashed = await bcrypt.hash(password, 10);

  await adminModel.create({
    name: "Super Admin",
    email,
    password: hashed,
    role: "superadmin",
  });

  console.log("✅ SuperAdmin created:");
  console.log("Email:", email);
  console.log("Password:", password);
  process.exit(0);
};

run();