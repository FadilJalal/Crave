import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "restaurant", required: true },
  from:         { type: String, enum: ["admin", "restaurant"], required: true },
  subject:      { type: String, default: "" },
  body:         { type: String, required: true },
  readByAdmin:  { type: Boolean, default: false },
  readByRestaurant: { type: Boolean, default: false },
  sentByEmail:  { type: Boolean, default: false },
  pinned:       { type: Boolean, default: false },
  favourited:   { type: Boolean, default: false },
}, { timestamps: true });

const messageModel = mongoose.models.message || mongoose.model("message", messageSchema);
export default messageModel;