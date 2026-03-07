import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true }, // hashed
    role: {
      type: String,
      enum: ["superadmin", "restaurantadmin"],
      required: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "restaurant",
      default: null,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const adminModel = mongoose.models.admin || mongoose.model("admin", adminSchema);
export default adminModel;