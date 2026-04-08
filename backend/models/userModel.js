import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        phone: { type: String, default: "" },
        savedAddresses: { type: Array, default: [] },
        cartData: { type: Object, default: {} },
        stripeCustomerId: { type: String, default: null },
        savedCards: [
            {
                paymentMethodId: { type: String, required: true },
                brand: { type: String },
                last4: { type: String },
                expMonth: { type: Number },
                expYear: { type: Number },
                created: { type: Date, default: Date.now }
            }
        ]
}, { minimize: false })

// ── Performance Indexes ──────────────────────────────────────────────────────
userSchema.index({ email: 1 });

const userModel = mongoose.models.user || mongoose.model("user", userSchema);
export default userModel;