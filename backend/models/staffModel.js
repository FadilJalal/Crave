import mongoose from "mongoose";

const staffSchema = new mongoose.Schema({
    name: { type: String, required: true },
    role: { type: String, required: true },
    hourlyWage: { type: Number, required: true },
    phone: { type: String, default: "" },
    status: { type: String, default: "Active", enum: ["Active", "On Leave", "Terminated"] },
    
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "restaurant",
        required: true
    },
    
    joinedAt: { type: Date, default: Date.now },
}, { strict: false });

staffSchema.index({ restaurantId: 1 });
staffSchema.index({ status: 1 });

const staffModel = mongoose.models.staff || mongoose.model("staff", staffSchema);
export default staffModel;
