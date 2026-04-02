import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: "" },
    savedAddresses: { type: Array, default: [] },
    cartData:{type:Object,default:{}}
}, { minimize: false })

// ── Performance Indexes ──────────────────────────────────────────────────────
userSchema.index({ email: 1 });

const userModel = mongoose.models.user || mongoose.model("user", userSchema);
export default userModel;